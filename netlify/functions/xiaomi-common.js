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

function parseXiaomiJson(content) {
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
	return /模型|大模型|api|API|小米|MiMo|mimo|Xiaomi|DeepSeek|deepseek/.test(question || '');
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

	const xiaomiRes = await fetch(XIAOMI_API_URL, {
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
			stream: false,
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content: isChat ? [
						'You are a helpful Chinese AI assistant embedded in a mine safety IoT dashboard.',
						'You can answer normal user questions.',
						'When the question asks about mine dashboard data, worker history, sensor values, alarms, locations, or falls, answer only from the provided current snapshot and recentHistory/eventHistory data.',
						`This proxy is currently configured to call Xiaomi MiMo model "${XIAOMI_MODEL}". If asked what large model/API is connected, answer this directly.`,
						'In eventHistory, type="area" means worker mine-area/location changes, and type="status" means personnel status changes such as normal or fall/abnormal.',
						'If asked where the worker has been, summarize the sequence of mine areas and times.',
						'If asked about falling, report exact recorded times from status history if available.',
						'If mine-related history data does not contain the requested record, say that no matching historical record is available. Do not invent times or locations.',
						'Return only JSON with schema: {"answer":"Chinese answer","evidence":[],"confidence":0-100}. Keep the answer concise and keep evidence empty unless absolutely necessary.'
					].join(' ') : [
						'You are a conservative mine safety IoT data analyst.',
						'Analyze current sensor values and recent trend data, then return only JSON.',
						'Use this schema: {"riskLevel":"safe|watch|danger","confidence":0-100,"summary":"one Chinese sentence","reason":"specific Chinese analysis with key values","abnormalItems":["item 1","item 2"],"trend":"Chinese trend summary","suggestion":"short Chinese handling suggestion"}.',
						'Treat heartRate=0 and bloodOxygen=0 as bracelet not worn or no valid vital-sign sample, not as cardiac arrest or hypoxia.',
						'Do not overreact to a single noisy value unless it crosses a hard safety threshold.',
						'Hard thresholds: temperature >= 40 danger, MQ2 >= 60 danger, MQ7 >= 60 danger, bloodOxygen > 0 and < 90 danger, heartRate > 0 and (<50 or >120) watch/danger based on severity, personStatus=1 danger, help=1 danger.',
						'Only analyze the data. Do not generate device-control commands, do not decide to dispatch commands, and do not include fields such as shouldDispatch, commands, or Leave.'
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
			]
		})
	});

	const result = await readJsonResponse(xiaomiRes);
	const content = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
	const parsed = parseXiaomiJson(content);

	if (!xiaomiRes.ok || !parsed) {
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
