const configuredModel = process.env.XIAOMI_MODEL || process.env.MIMO_MODEL || 'mimo-v2.6-flash';
// Migrate old deployment settings as well as the code default.
const legacyModels = ['mimo-v2-flash', 'mimo-v2-pro', 'mimo-v2-omni', 'mimo-v2.5', 'mimo-v2.5-pro'];
const XIAOMI_MODEL = legacyModels.includes(configuredModel) ? 'mimo-v2.6-flash' : configuredModel;
const XIAOMI_API_URL = process.env.XIAOMI_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions';

function json(statusCode, payload) {
	return {
		statusCode,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Allow-Methods': 'POST, OPTIONS'
		},
		body: JSON.stringify(payload)
	};
}

function parseModelJson(content) {
	try {
		return JSON.parse(content);
	} catch (err) {
		const match = typeof content === 'string' && content.match(/\{[\s\S]*\}/);
		try {
			return match ? JSON.parse(match[0]) : null;
		} catch (err) {
			return null;
		}
	}
}

async function readJsonResponse(response) {
	const text = await response.text();
	try {
		return text ? JSON.parse(text) || {} : {};
	} catch (err) {
		return { raw: text };
	}
}

function getXiaomiApiKey() {
	return process.env.MIMO_API_KEY || process.env.XIAOMI_API_KEY || '';
}

function isModelQuestion(question) {
	return /模型|大模型|api|API|小米|MiMo|mimo|Xiaomi|DeepSeek|deepseek/i.test(question || '');
}

function buildFallbackDecision(snapshot, reason, code) {
	const temp = Number(snapshot.temperature || 0);
	const heartRate = Number(snapshot.heartRate || 0);
	const bloodOxygen = Number(snapshot.bloodOxygen || 0);
	const mq2 = Number(snapshot.mq2 || 0);
	const mq7 = Number(snapshot.mq7 || 0);
	const abnormalItems = [];

	if (temp >= 40) abnormalItems.push(`温度 ${temp}`);
	if (mq2 >= 60) abnormalItems.push(`可燃气体 ${mq2}`);
	if (mq7 >= 60) abnormalItems.push(`一氧化碳 ${mq7}`);
	if (bloodOxygen > 0 && bloodOxygen < 90) abnormalItems.push(`血氧 ${bloodOxygen}`);
	if (heartRate > 0 && (heartRate < 50 || heartRate > 120)) abnormalItems.push(`心率 ${heartRate}`);
	if (String(snapshot.personStatus) === '1') abnormalItems.push('人员跌倒/状态异常');
	if (String(snapshot.help) === '1') abnormalItems.push('人员主动求救');

	const riskLevel = abnormalItems.length > 0 ? 'danger' : 'safe';
	return {
		source: 'local-threshold',
		model: XIAOMI_MODEL,
		errorCode: code,
		riskLevel,
		confidence: 60,
		summary: riskLevel === 'danger'
			? '云端 AI 未返回有效结果，本地阈值判断存在风险。'
			: '云端 AI 未返回有效结果，本地阈值判断当前未见明显风险。',
		reason: `${reason} 当前值：温度 ${temp}、心率 ${heartRate}、血氧 ${bloodOxygen}、MQ2 ${mq2}、MQ7 ${mq7}。`,
		abnormalItems,
		trend: '当前结果仅来自本地阈值，暂无云端 AI 趋势结论。',
		suggestion: riskLevel === 'danger'
			? '请现场复核传感器和人员状态，必要时立即处置。'
			: '继续监测，稍后可再次点击 AI 分析。'
	};
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal
		});
		return { response, result: await readJsonResponse(response) };
	} finally {
		clearTimeout(timer);
	}
}

function buildMessages({ isChat, question, snapshot }) {
	return [
		{
			role: 'system',
			content: isChat ? [
				'You are a helpful Chinese AI assistant embedded in a mine safety IoT dashboard.',
				'When the question asks about mine dashboard data, worker history, sensor values, alarms, locations, or falls, answer only from the provided snapshot.',
				'In eventHistory, type="area" records location changes and type="status" records personnel status changes. Report exact recorded times when asked, and never invent missing history.',
				`This proxy is currently configured to call Xiaomi MiMo model "${XIAOMI_MODEL}".`,
				'Return only JSON with schema: {"answer":"Chinese answer","evidence":[],"confidence":0-100}. Keep the answer concise.'
			].join(' ') : [
				'You are a conservative mine safety IoT data analyst.',
				'Analyze current sensor values and recent trend data, then return only JSON.',
				'Use this schema: {"riskLevel":"safe|watch|danger","confidence":0-100,"summary":"one Chinese sentence","reason":"specific Chinese analysis with key values","abnormalItems":["item 1","item 2"],"trend":"Chinese trend summary","suggestion":"short Chinese handling suggestion"}.',
				'Treat heartRate=0 and bloodOxygen=0 as bracelet not worn or no valid vital-sign sample.',
				'Hard thresholds: temperature >= 40 danger, MQ2 >= 60 danger, MQ7 >= 60 danger, bloodOxygen > 0 and < 90 danger, heartRate > 0 and (<50 or >120) watch/danger, personStatus=1 danger, help=1 danger.',
				'Only analyze the data. Do not generate device-control commands.'
			].join(' ')
		},
		{
			role: 'user',
			content: JSON.stringify(isChat ? {
				question,
				connectedModel: {
					provider: 'Xiaomi MiMo',
					model: XIAOMI_MODEL
				},
				snapshot
			} : snapshot)
		}
	];
}

function failedCall({ isChat, snapshot, message, code, providerStatus, statusCode = 502 }) {
	if (!isChat) {
		return json(200, { decision: buildFallbackDecision(snapshot || {}, message, code) });
	}
	return json(statusCode, { error: message, code, providerStatus });
}

function providerError(status) {
	const messages = {
		400: ['INVALID_REQUEST', '小米 MiMo 请求参数或模型配置无效，请检查模型和请求格式。'],
		401: ['AUTHENTICATION_FAILED', '小米 MiMo 密钥无效或与接口地址不匹配，请检查 MIMO_API_KEY。'],
		402: ['INSUFFICIENT_BALANCE', '小米 MiMo 账户余额不足，请到小米开放平台检查余额。'],
		403: ['ACCESS_DENIED', '小米 MiMo 拒绝访问，请检查账户权限、地区限制或密钥状态。'],
		404: ['MODEL_NOT_FOUND', '小米 MiMo 接口或模型不可用，请检查接口地址和模型配置。'],
		421: ['CONTENT_BLOCKED', '小米 MiMo 内容审核拦截了本次请求，请调整问题后重试。'],
		429: ['RATE_LIMITED', '小米 MiMo 请求过于频繁或套餐额度已用尽，请稍后重试并检查额度。']
	};
	const [code, message] = messages[status] || ['PROVIDER_ERROR', `小米 MiMo 服务返回错误（HTTP ${status}），请稍后重试。`];
	return { code, message, providerStatus: status };
}

async function callXiaomi({ isChat, question, snapshot, apiKey = getXiaomiApiKey() }) {
	if (!apiKey) {
		return json(500, { error: 'Netlify 没有配置 MIMO_API_KEY 或 XIAOMI_API_KEY 环境变量。' });
	}

	if (isChat && isModelQuestion(question)) {
		return json(200, {
			answer: {
				answer: `当前接入的是小米 MiMo API，调用模型是 ${XIAOMI_MODEL}。`,
				evidence: [],
				confidence: 100
			}
		});
	}

	let xiaomiRes;
	let result;
	try {
		const fetched = await fetchJsonWithTimeout(XIAOMI_API_URL, {
			method: 'POST',
			headers: {
				'api-key': apiKey,
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: XIAOMI_MODEL,
				temperature: 0.1,
				top_p: 0.95,
				max_completion_tokens: 1024,
				thinking: { type: 'disabled' },
				stream: false,
				response_format: { type: 'json_object' },
				messages: buildMessages({ isChat, question, snapshot })
			})
		}, isChat ? 25000 : 20000);
		xiaomiRes = fetched.response;
		result = fetched.result;
	} catch (err) {
		const timedOut = err && err.name === 'AbortError';
		return failedCall({ isChat, snapshot,
			code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
			message: timedOut ? '小米 MiMo 请求超时，请稍后重试。' : '无法连接小米 MiMo 服务，请检查网络后重试。',
			statusCode: timedOut ? 504 : 502
		});
	}

	if (!xiaomiRes.ok) return failedCall({ isChat, snapshot, ...providerError(xiaomiRes.status) });
	const choice = result.choices && result.choices[0];
	if (choice && choice.finish_reason === 'length') {
		return failedCall({ isChat, snapshot, code: 'OUTPUT_TRUNCATED', message: '小米 MiMo 回答超出输出额度而被截断，请缩短问题后重试。' });
	}
	const content = choice && choice.message && choice.message.content;
	const parsed = parseModelJson(content);

	const valid = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (isChat
		? typeof parsed.answer === 'string' && parsed.answer.trim()
		: ['safe', 'watch', 'danger'].includes(parsed.riskLevel) && typeof parsed.summary === 'string' && parsed.summary.trim());
	if (!valid) {
		return failedCall({ isChat, snapshot, code: 'INVALID_RESPONSE', message: '小米 MiMo 未返回有效的 JSON 回答，请稍后重试。' });
	}

	if (isChat) {
		return json(200, {
			answer: {
				answer: parsed.answer || '',
				evidence: [],
				confidence: Number(parsed.confidence || 70)
			}
		});
	}

	return json(200, {
		decision: {
			source: 'xiaomi',
			model: XIAOMI_MODEL,
			riskLevel: parsed.riskLevel || 'watch',
			confidence: Number(parsed.confidence || 70),
			summary: parsed.summary || '',
			reason: parsed.reason || '',
			abnormalItems: Array.isArray(parsed.abnormalItems) ? parsed.abnormalItems.slice(0, 5) : [],
			trend: parsed.trend || '',
			suggestion: parsed.suggestion || ''
		}
	});
}

module.exports = { callXiaomi, json, XIAOMI_MODEL };
