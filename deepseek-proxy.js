const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.XIAOMI_PROXY_PORT || process.env.DEEPSEEK_PROXY_PORT || 8787);
const { callXiaomi, XIAOMI_MODEL } = require('./netlify/functions/xiaomi-common');
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

			const result = await callXiaomi({ isChat, question, snapshot, apiKey });
			sendJson(res, result.statusCode, JSON.parse(result.body));
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
