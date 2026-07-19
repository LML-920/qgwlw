const XIAOMI_MODEL = process.env.XIAOMI_MODEL || process.env.MIMO_MODEL || 'mimo-v2.5-pro';
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
		return match ? JSON.parse(match[0]) : null;
	}
}

async function readJsonResponse(response) {
	const text = await response.text();
	try {
		return text ? JSON.parse(text) : {};
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

function buildFallbackDecision(snapshot, reason) {
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
		riskLevel,
		confidence: 60,
		summary: riskLevel === 'danger'
			? '小米 MiMo 暂时繁忙，已先按本地阈值判断存在风险。'
			: '小米 MiMo 暂时繁忙，已先按本地阈值判断当前未见明显风险。',
		reason: `${reason} 当前值：温度 ${temp}、心率 ${heartRate}、血氧 ${bloodOxygen}、MQ2 ${mq2}、MQ7 ${mq7}。`,
		abnormalItems,
		trend: '云端模型未及时返回，趋势结论暂按本地最近数据保守处理。',
		suggestion: riskLevel === 'danger'
			? '请现场复核传感器和人员状态，必要时立即处置。'
			: '继续监测，稍后可再次点击 AI 分析。'
	};
}

async function fetchWithTimeout(url, options, timeoutMs) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, {
			...options,
			signal: controller.signal
		});
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

async function callXiaomi({ isChat, question, snapshot }) {
	const apiKey = getXiaomiApiKey();
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
	try {
		xiaomiRes = await fetchWithTimeout(XIAOMI_API_URL, {
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
				max_completion_tokens: isChat ? 900 : 420,
				stream: false,
				response_format: { type: 'json_object' },
				messages: buildMessages({ isChat, question, snapshot })
			})
		}, isChat ? 28000 : 9000);
	} catch (err) {
		if (!isChat && err && err.name === 'AbortError') {
			return json(200, {
				decision: buildFallbackDecision(snapshot || {}, '云端模型暂时繁忙，已启用本地阈值兜底分析。')
			});
		}
		throw err;
	}

	const result = await readJsonResponse(xiaomiRes);
	const content = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
	const parsed = parseModelJson(content);

	if (!xiaomiRes.ok || !parsed) {
		if (!isChat) {
			return json(200, {
				decision: buildFallbackDecision(snapshot || {}, '云端模型返回异常，已启用本地阈值兜底分析。')
			});
		}
		return json(502, { error: '小米 MiMo API 请求失败', detail: result });
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

module.exports = { callXiaomi, json };
