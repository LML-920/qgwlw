const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../netlify/functions/xiaomi-common.js'), 'utf8');
const analysis = { riskLevel: 'safe', summary: '数据正常', reason: '未见异常', abnormalItems: [], confidence: 90 };
const completed = value => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] });

function load({ fetch, env = {}, timer = setTimeout } = {}) {
	const context = { module: { exports: {} }, process: { env: { MIMO_API_KEY: 'test-key', ...env } }, fetch, AbortController, setTimeout: timer, clearTimeout };
	vm.runInNewContext(source, context, { filename: 'xiaomi-common.js' });
	return context.module.exports;
}

function response(payload, status = 200) {
	return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload) };
}

test('analysis requests produce cloud results with thinking disabled and sufficient output budget', async () => {
	let sent;
	const api = load({ fetch: async (url, options) => {
		assert.equal(url, 'https://api.xiaomimimo.com/v1/chat/completions');
		sent = JSON.parse(options.body);
		return response(completed(analysis));
	} });
	const result = await api.callXiaomi({ isChat: false, snapshot: { temperature: 25 } });
	assert.equal(result.statusCode, 200);
	assert.equal(sent.model, 'mimo-v2.6-flash');
	assert.equal(sent.thinking.type, 'disabled');
	assert.equal(sent.max_completion_tokens, 1024);
	assert.equal(JSON.parse(result.body).decision.source, 'xiaomi');
});

test('old deployed model overrides migrate, while current custom models remain configurable', () => {
	assert.equal(load({ env: { XIAOMI_MODEL: 'mimo-v2.5-pro' } }).XIAOMI_MODEL, 'mimo-v2.6-flash');
	assert.equal(load({ env: { MIMO_MODEL: 'mimo-v2-flash' } }).XIAOMI_MODEL, 'mimo-v2.6-flash');
	assert.equal(load({ env: { XIAOMI_MODEL: 'mimo-v2.6-pro' } }).XIAOMI_MODEL, 'mimo-v2.6-pro');
});

test('successful chat returns the actual model answer', async () => {
	const api = load({ fetch: async () => response(completed({ answer: '你好', confidence: 95 })) });
	const result = await api.callXiaomi({ isChat: true, question: '你好', snapshot: {} });
	assert.equal(JSON.parse(result.body).answer.answer, '你好');
});

test('provider failures are distinguished without returning raw upstream payloads', async () => {
	for (const [status, code] of [[401, 'AUTHENTICATION_FAILED'], [402, 'INSUFFICIENT_BALANCE'], [429, 'RATE_LIMITED']]) {
		const api = load({ fetch: async () => response({ error: { message: 'upstream-secret' } }, status) });
		const result = await api.callXiaomi({ isChat: true, question: '你好', snapshot: {} });
		const body = JSON.parse(result.body);
		assert.equal(result.statusCode, 502);
		assert.equal(body.code, code);
		assert.equal(body.providerStatus, status);
		assert.ok(!result.body.includes('upstream-secret'));
	}
});

test('analysis fallback retains danger detection and shows the actual failure', async () => {
	const api = load({ fetch: async () => response({}, 402) });
	const result = await api.callXiaomi({ isChat: false, snapshot: { temperature: 45 } });
	const decision = JSON.parse(result.body).decision;
	assert.equal(decision.source, 'local-threshold');
	assert.equal(decision.riskLevel, 'danger');
	assert.equal(decision.errorCode, 'INSUFFICIENT_BALANCE');
	assert.match(decision.reason, /余额不足/);
	assert.ok(!decision.summary.includes('繁忙'));
});

test('empty, malformed, invalid-schema and truncated answers are rejected safely', async () => {
	for (const [content, finishReason, code] of [
		['', 'stop', 'INVALID_RESPONSE'],
		['bad {not valid json}', 'stop', 'INVALID_RESPONSE'],
		['{}', 'stop', 'INVALID_RESPONSE'],
		[JSON.stringify({ answer: 'partial' }), 'length', 'OUTPUT_TRUNCATED']
	]) {
		const api = load({ fetch: async () => response({ choices: [{ finish_reason: finishReason, message: { content } }] }) });
		const result = await api.callXiaomi({ isChat: true, question: '你好', snapshot: {} });
		assert.equal(JSON.parse(result.body).code, code);
	}
});

test('timeout remains active while reading the response body', async () => {
	const api = load({
		timer: callback => setTimeout(callback, 5),
		fetch: async (url, options) => ({ ok: true, status: 200, text: () => new Promise((resolve, reject) => {
			options.signal.addEventListener('abort', () => {
				const error = new Error('aborted body');
				error.name = 'AbortError';
				reject(error);
			}, { once: true });
		}) })
	});
	const result = await api.callXiaomi({ isChat: true, question: '你好', snapshot: {} });
	assert.equal(result.statusCode, 504);
	assert.equal(JSON.parse(result.body).code, 'TIMEOUT');
});

test('network failures are reported instead of masking them as busy', async () => {
	const api = load({ fetch: async () => { throw new TypeError('fetch failed'); } });
	const result = await api.callXiaomi({ isChat: true, question: '你好', snapshot: {} });
	assert.equal(JSON.parse(result.body).code, 'NETWORK_ERROR');
});
