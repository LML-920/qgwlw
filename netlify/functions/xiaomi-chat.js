const { callXiaomi, json } = require('./xiaomi-common');

exports.handler = async event => {
	if (event.httpMethod === 'OPTIONS') return json(204, {});
	if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

	try {
		const body = event.body ? JSON.parse(event.body) : {};
		return await callXiaomi({
			isChat: true,
			question: body.question || '',
			snapshot: body.snapshot || {}
		});
	} catch (err) {
		return json(500, { error: err.message || 'Netlify function error' });
	}
};
