const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.XIAOMI_PROXY_PORT || process.env.DEEPSEEK_PROXY_PORT || 8787);
const XIAOMI_MODEL = process.env.XIAOMI_MODEL || process.env.MIMO_MODEL || 'mimo-v2.5-pro';
const XIAOMI_API_URL = process.env.XIAOMI_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions';
const ONENET_PRODUCT_ID = process.env.ONENET_PRODUCT_ID || '0TC2zqK8BU';
const ONENET_DEVICE_NAME = process.env.ONENET_DEVICE_NAME || 'ESP32S3';
const ONENET_COMMAND_ATTEMPTS = 1;
const ONENET_COMMAND_TIMEOUT_MS = 12000;
const configPath = path.join(__dirname, 'config', 'xiaomi.private.js');
const configText = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
const apiKeyMatch = configText.match(/apiKey:\s*['"]([^'"]+)['"]/);
const apiKey = process.env.MIMO_API_KEY || process.env.XIAOMI_API_KEY || (apiKeyMatch && apiKeyMatch[1]);
const onenetConfigPath = path.join(__dirname, 'config', 'onenet.private.js');

if (!apiKey) {
	console.error('Xiaomi MiMo API key not found. Set MIMO_API_KEY or create config/xiaomi.private.js');
	process.exit(1);
}

function sendJson(res, statusCode, payload) {
	res.writeHead(statusCode, {
		'Content-Type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type'
	});
	res.end(JSON.stringify(payload));
}

function readOnenetAuth() {
	if (process.env.ONENET_AUTH) return process.env.ONENET_AUTH.trim();
	if (!fs.existsSync(onenetConfigPath)) return '';
	const text = fs.readFileSync(onenetConfigPath, 'utf8');
	const match = text.match(/(?:authorization|auth|token):\s*['"]([^'"]+)['"]/i);
	return match && match[1] ? match[1].trim() : '';
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
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

async function queryOnenet() {
	const auth = readOnenetAuth();
	if (!auth) {
		return {
			statusCode: 500,
			payload: { code: -1, msg: '本地代理缺少 OneNET Authorization，请配置 config/onenet.private.js' }
		};
	}

	const url = new URL('https://iot-api.heclouds.com/thingmodel/query-device-property');
	url.searchParams.set('product_id', ONENET_PRODUCT_ID);
	url.searchParams.set('device_name', ONENET_DEVICE_NAME);

	const response = await fetch(url, {
		method: 'GET',
		headers: {
			Authorization: auth,
			'Content-Type': 'application/json'
		}
	});
	const payload = await response.json();
	return { statusCode: response.status, payload };
}

async function setOnenetDesired() {
	const auth = readOnenetAuth();
	if (!auth) {
		return {
			statusCode: 500,
			payload: { code: -1, msg: '本地代理缺少 OneNET Authorization，请配置 config/onenet.private.js' }
		};
	}

	let lastPayload = null;
	let lastStatus = 500;

	for (let attempt = 1; attempt <= ONENET_COMMAND_ATTEMPTS; attempt += 1) {
		try {
			const response = await fetchWithTimeout('https://iot-api.heclouds.com/thingmodel/set-device-desired-property', {
				method: 'POST',
				headers: {
					Authorization: auth,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					product_id: ONENET_PRODUCT_ID,
					device_name: ONENET_DEVICE_NAME,
					params: { Leave: 'true' }
				})
			}, ONENET_COMMAND_TIMEOUT_MS);
			lastStatus = response.status;
			lastPayload = await response.json();
			if (response.ok && lastPayload && lastPayload.code === 0) return { statusCode: response.status, payload: lastPayload };
		} catch (err) {
			lastStatus = 504;
			lastPayload = { code: -1, msg: err.name === 'AbortError' ? 'OneNET 请求超时' : (err.message || 'OneNET command failed') };
		}
		if (attempt < ONENET_COMMAND_ATTEMPTS) await sleep(700 * attempt);
	}

	return {
		statusCode: lastStatus,
		payload: {
			...(lastPayload || {}),
			code: lastPayload && lastPayload.code !== undefined ? lastPayload.code : -1,
			msg: (lastPayload && (lastPayload.msg || lastPayload.error)) || 'OneNET command failed',
			attempts: ONENET_COMMAND_ATTEMPTS
		}
	};
}

const server = http.createServer(async (req, res) => {
	const pathname = new URL(req.url, `http://127.0.0.1:${PORT}`).pathname;

	if (req.method === 'OPTIONS') {
		sendJson(res, 204, {});
		return;
	}

	if (req.method === 'POST' && pathname === '/onenet-query') {
		try {
			const result = await queryOnenet();
			sendJson(res, result.statusCode, result.payload);
		} catch (err) {
			sendJson(res, 500, { code: -1, msg: err.message || 'OneNET query failed' });
		}
		return;
	}

	if (req.method === 'POST' && pathname === '/onenet-set-desired') {
		try {
			const result = await setOnenetDesired();
			sendJson(res, result.statusCode, result.payload);
		} catch (err) {
			sendJson(res, 500, { code: -1, msg: err.message || 'OneNET command failed' });
		}
		return;
	}

	if (req.method !== 'POST' || !['/analyze', '/chat'].includes(pathname)) {
		sendJson(res, 404, { error: 'Not found' });
		return;
	}

	let rawBody = '';
	req.on('data', chunk => {
		rawBody += chunk;
	});

	req.on('end', async () => {
		try {
			const body = rawBody ? JSON.parse(rawBody) : {};
			const snapshot = body.snapshot || {};
			const question = body.question || '';
			const isChat = pathname === '/chat';

			if (isChat && /模型|大模型|api|API|小米|MiMo|mimo|Xiaomi|deepseek/i.test(question)) {
				sendJson(res, 200, {
					answer: {
						answer: `当前接入的是小米 MiMo API，调用模型是 ${XIAOMI_MODEL}。`,
						evidence: [],
						confidence: 100
					}
				});
				return;
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
								'You can answer normal user questions. When the question asks about mine dashboard data, worker history, sensor values, alarms, locations, or falls, answer only from the provided current snapshot and recentHistory/eventHistory data.',
								`This proxy is currently configured to call Xiaomi MiMo model "${XIAOMI_MODEL}". If asked what large model/API is connected, answer this directly.`,
								'In eventHistory, type="area" means worker mine-area/location changes, and type="status" means personnel status changes such as normal or fall/abnormal.',
								'Return only JSON with schema: {"answer":"Chinese answer","evidence":["optional very short evidence"],"confidence":0-100}.',
								'If asked where the worker has been, summarize the sequence of mine areas and times. If asked about falling, report exact recorded times from status history if available.',
								'If mine-related history data does not contain the requested record, say that no matching historical record is available. Do not invent times or locations that are not in the data.',
								'Keep answers concise. Put at most one short item in evidence, and leave evidence empty for ordinary non-data questions.'
							].join(' ') : [
								'You are a conservative mine safety IoT data analyst.',
								'Analyze current sensor values and recent trend data, then return only JSON.',
								'Use this schema: {"riskLevel":"safe|watch|danger","confidence":0-100,"summary":"one Chinese sentence","reason":"specific Chinese analysis with key values","abnormalItems":["item 1","item 2"],"trend":"Chinese trend summary","suggestion":"short Chinese handling suggestion"}.',
								'Treat heartRate=0 and bloodOxygen=0 as bracelet not worn or no valid vital-sign sample, not as cardiac arrest or hypoxia.',
								'Do not overreact to a single noisy value unless it crosses a hard safety threshold. Hard thresholds: temperature >= 40 danger, MQ2 >= 60 danger, MQ7 >= 60 danger, bloodOxygen > 0 and < 90 danger, heartRate > 0 and (<50 or >120) watch/danger based on severity, personStatus=1 danger, help=1 danger.',
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

			const result = await xiaomiRes.json();
			const content = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
			let decision = null;

			try {
				decision = JSON.parse(content);
			} catch (err) {
				const match = typeof content === 'string' && content.match(/\{[\s\S]*\}/);
				if (match) decision = JSON.parse(match[0]);
			}

			if (!xiaomiRes.ok || !decision) {
				sendJson(res, 502, { error: 'Xiaomi MiMo request failed', detail: result });
				return;
			}

			if (isChat) {
				sendJson(res, 200, {
					answer: {
						answer: decision.answer || '',
						evidence: Array.isArray(decision.evidence) ? decision.evidence.slice(0, 1) : [],
						confidence: Number(decision.confidence || 70)
					}
				});
				return;
			}

			sendJson(res, 200, {
				decision: {
					riskLevel: decision.riskLevel || 'watch',
					confidence: Number(decision.confidence || 70),
					summary: decision.summary || '',
					reason: decision.reason || '',
					abnormalItems: Array.isArray(decision.abnormalItems) ? decision.abnormalItems.slice(0, 5) : [],
					trend: decision.trend || '',
					suggestion: decision.suggestion || ''
				}
			});
		} catch (err) {
			sendJson(res, 500, { error: err.message || 'Proxy error' });
		}
	});
});

server.listen(PORT, '127.0.0.1', () => {
	console.log(`Xiaomi MiMo proxy listening on http://127.0.0.1:${PORT}`);
	console.log(`Xiaomi MiMo model: ${XIAOMI_MODEL}`);
	console.log(`OneNET device: ${ONENET_PRODUCT_ID}/${ONENET_DEVICE_NAME}`);
});
