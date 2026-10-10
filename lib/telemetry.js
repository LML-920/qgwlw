
	const IS_LOCAL_XIAOMI = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
	const XIAOMI_ANALYZE_URL = IS_LOCAL_XIAOMI ? 'http://127.0.0.1:8787/analyze' : '/.netlify/functions/xiaomi-analyze';
	const XIAOMI_CHAT_URL = IS_LOCAL_XIAOMI ? 'http://127.0.0.1:8787/chat' : '/.netlify/functions/xiaomi-chat';
	const ONENET_QUERY_URL = 'https://iot-api.heclouds.com/thingmodel/query-device-property';
	const ONENET_SET_DESIRED_URL = 'https://iot-api.heclouds.com/thingmodel/set-device-desired-property';
	const ONENET_PRODUCT_ID = '0TC2zqK8BU';
	const ONENET_DEVICE_NAME = 'ESP32S3';
	const ONENET_AUTH_KEY = 'UU/bwXd9gVUzaYNL14V3jRXXIVXL4QuFA8Vrm4FpKxk';

	export default {
		data() {
			return {
				temp: '',
				humi: '',
				heartRate: '',
				bloodOxygen: '',
				MQ2: '',
				MQ7: '',
				area: '',
				sstatus: '',
				help: '',
				updateTime: '',
				isOnenetConnected: false,
				onenetErrorMessage: '',
				onenetFailCount: 0,
				onenetMaxFailCount: 3,
				isFetchingOnenet: false,
				isAlarm: false,
				lastAlarmState: false,
				alarmMessage: '',
				tempBgColor: '',
				humiBgColor: '',
				mq2BgColor: '',
				mq7BgColor: '',
				areaColor: '',
				token: '',
				onenetAuthToken: '',
				onenetAuthExpireAt: 0,
				timer: null,
				isSending: false,
				aiEnabled: true,
				isAiAnalyzing: false,
				aiAnalyzeCooldown: 45000,
				aiLastAnalyzeAt: 0,
				aiDecision: null,
				aiChatVisible: false,
				aiQuestion: '',
				aiAnswer: '',
				aiChatMessages: [],
				aiChatScrollTop: 0,
				aiChatStorageKey: 'xiaomiAiChatMessages',
				aiQuickQuestions: [
					'人员经过了哪些矿洞？',
					'最近一次跌倒是什么时候？',
					'当前风险等级是多少？',
					'最近有哪些异常？'
				],
				isAiChatting: false,
				showModal: false,
				historyModalVisible: false,
				activeHistoryKey: 'temp',
				sensorHistoryMaxRecords: 7200,
				personHistoryMaxRecords: 86400,
				historyRecords: {
					temp: [],
					humi: [],
					heartRate: [],
					bloodOxygen: [],
					MQ2: [],
					MQ7: [],
					area: [],
					sstatus: []
				}
			}
		},
		computed: {
			areaText() {
				switch (String(this.area)) {
					case '0': return '人员未进入矿洞';
					case '1': return '一号矿洞';
					case '2': return '二号矿洞';
					case '3': return '三号矿洞';
					case '4': return '四号矿洞';
					default: return '未知位置';
				}
			},
			sstatusText() {
				return String(this.sstatus) === '0' ? '人员正常' : '人员跌倒，需要救援';
			},
			isBraceletWorn() {
				return Number(this.heartRate) > 0 && Number(this.bloodOxygen) > 0;
			},
			braceletText() {
				return this.isBraceletWorn ? '人员已佩戴安全手环' : '人员未佩戴安全手环';
			},
			braceletColor() {
				return this.isBraceletWorn ? '#22c55e' : '#f59e0b';
			},
			activeHistoryConfig() {
				return this.getHistoryConfig(this.activeHistoryKey);
			},
			activeHistoryRows() {
				const rows = this.historyRecords[this.activeHistoryKey] || [];
				return rows.slice().reverse();
			},
			historyValues() {
				const rows = this.historyRecords[this.activeHistoryKey] || [];
				return rows.map(item => Number(item.value)).filter(value => !Number.isNaN(value));
			},
			historyMax() {
				if (this.historyValues.length === 0) return '--';
				return Math.max(...this.historyValues);
			},
			historyMin() {
				if (this.historyValues.length === 0) return '--';
				return Math.min(...this.historyValues);
			},
			historyChartPoints() {
				const rows = this.historyRecords[this.activeHistoryKey] || [];
				return this.buildChartPoints(rows);
			},
			historySvgPoints() {
				return this.historyChartPoints.map(point => ({
					x: Number(point.left.replace('%', '')),
					y: Number(point.top.replace('%', ''))
				}));
			},
			historyPolylinePoints() {
				return this.historySvgPoints.map(point => `${point.x},${point.y}`).join(' ');
			}
		},
		onLoad() {
			this.loadHistory();
			this.loadAiChatMessages();
			this.checkOnenetStatus();
			this.watchNetworkChange();
		},
		onShow() {
			this.fetchDevData();
			if (this.timer) clearInterval(this.timer);
			this.timer = setInterval(() => {
				this.fetchDevData();
			}, 1000);
			setTimeout(() => {
				this.checkOnenetStatus();
			}, 500);
		},
		onUnload() {
			if (this.timer) clearInterval(this.timer);
			uni.offNetworkStatusChange();
		},
		methods: {
			getHistoryConfig(key) {
				const configs = {
					temp: { name: '温度', unit: '℃', value: this.temp, max: 60 },
					humi: { name: '湿度', unit: '%', value: this.humi, max: 100 },
					heartRate: { name: '心率', unit: 'bpm', value: this.heartRate, max: 180 },
					bloodOxygen: { name: '血氧', unit: '%', value: this.bloodOxygen, max: 100 },
					MQ2: { name: '可燃气体', unit: '%', value: this.MQ2, max: 100 },
					MQ7: { name: '一氧化碳', unit: '%', value: this.MQ7, max: 100 },
					area: { name: '人员位置', unit: '', value: this.area, max: 4 },
					sstatus: { name: '人员状态', unit: '', value: this.sstatus, max: 1 }
				};
				return configs[key] || configs.temp;
			},
			openHistory(key) {
				this.activeHistoryKey = key;
				this.historyModalVisible = true;
			},
			closeHistory() {
				this.historyModalVisible = false;
			},
			loadHistory() {
				try {
					const saved = uni.getStorageSync('sensorHistoryRecords');
					if (saved) {
						this.historyRecords = {
							...this.historyRecords,
							...saved
						};
					}
				} catch (err) {
					console.warn('history storage warning:', err);
				}
			},
			saveHistory() {
				try {
					uni.setStorageSync('sensorHistoryRecords', this.historyRecords);
					if (typeof localStorage !== 'undefined') {
						localStorage.setItem('deepseekPersonnelHistory', JSON.stringify({
							savedAt: this.formatTime(new Date()),
							records: this.historyRecords
						}));
					}
				} catch (err) {
					console.warn('history storage warning:', err);
				}
			},
			recordHistory() {
				const now = this.formatTime(new Date());
				['temp', 'humi', 'heartRate', 'bloodOxygen', 'MQ2', 'MQ7', 'area', 'sstatus'].forEach(key => {
					const config = this.getHistoryConfig(key);
					const value = Number(config.value || 0);
					if (Number.isNaN(value)) return;
					const records = this.historyRecords[key];
					const last = records[records.length - 1];
					if (last && last.value === value && last.time === now) return;
					records.push({ time: now, value, text: this.formatHistoryValue(key, value) });
					const maxRecords = key === 'area' || key === 'sstatus' ? this.personHistoryMaxRecords : this.sensorHistoryMaxRecords;
					while (records.length > maxRecords) records.shift();
				});
				this.saveHistory();
			},
			formatHistoryValue(key, value) {
				if (key === 'area') return this.getAreaTextByValue(String(value));
				if (key === 'sstatus') return value === 1 ? '人员跌倒/异常' : '人员正常';
				return value;
			},
			formatHistorySummaryValue(key, value) {
				if (value === '--') return '--';
				if (key === 'area' || key === 'sstatus') return this.formatHistoryValue(key, Number(value));
				const config = this.getHistoryConfig(key);
				return `${value}${config.unit}`;
			},
			getAreaTextByValue(value) {
				switch (value) {
					case '0': return '未进入矿洞';
					case '1': return '一号矿洞';
					case '2': return '二号矿洞';
					case '3': return '三号矿洞';
					case '4': return '四号矿洞';
					default: return '未知位置';
				}
			},
			buildChartPoints(rows) {
				if (!rows || rows.length === 0) return [];
				const config = this.activeHistoryConfig;
				const visibleRows = rows.slice(-20);
				const values = visibleRows.map(item => Number(item.value) || 0);
				const minValue = Math.min(...values);
				const maxValue = Math.max(...values, config.max * 0.25, 1);
				const range = Math.max(maxValue - minValue, 1);
				const count = visibleRows.length;
				return visibleRows.map((item, index) => {
					const value = Math.max(0, Number(item.value) || 0);
					const x = count === 1 ? 50 : 5 + index / (count - 1) * 90;
					const y = 88 - Math.min((value - minValue) / range * 76, 76);
					return {
						left: x + '%',
						top: y + '%'
					};
				});
			},
			showEvacuationModal() {
				if (this.isSending) return;
				this.showModal = true;
			},
			cancelEvacuation() {
				this.showModal = false;
			},
			confirmEvacuation() {
				if (this.isSending) return;
				this.showModal = false;
				this.sendEvacuationCmd();
			},
			checkOnenetStatus() {
				uni.getNetworkType({
					success: (res) => {
						console.log('缃戠粶绫诲瀷妫€娴嬬粨鏋滐細', res.networkType);
						if (res.networkType === 'none') {
							this.isOnenetConnected = false;
							this.onenetErrorMessage = '当前网络不可用';
						}
					},
					fail: (err) => {
						console.error('缃戠粶妫€娴嬪け璐ワ細', err);
					}
				});
			},
			watchNetworkChange() {
				uni.onNetworkStatusChange((res) => {
					console.log('缃戠粶鐘舵€佸彉鍖栵細', res);
					if (!res.isConnected) {
						this.isOnenetConnected = false;
						this.onenetErrorMessage = '当前网络不可用';
					}
				});
			},
			checkOnenetAccessibility() {
				uni.request({
					url: 'https://iot-api.heclouds.com',
					method: 'HEAD',
					timeout: 5000,
					success: () => {
						if (!this.isOnenetConnected) {
							console.log('铏界劧妫€娴嬩笉鍒癢IFI绫诲瀷锛屼絾ONENET骞冲彴鍙闂紝鏍囪涓哄凡杩炴帴');
							this.isOnenetConnected = true;
						}
					},
					fail: () => {
						console.log('ONENET骞冲彴涓嶅彲璁块棶');
						this.isOnenetConnected = false;
					}
				});
			},
			getOnenetPropertyList(payload) {
				const result = [];
				const visited = new Set();
				const scan = (node, fallbackIdentifier = '') => {
					if (!node || result.length > 200) return;
					if (typeof node !== 'object') {
						if (fallbackIdentifier && this.getOnenetFieldByIdentifier(fallbackIdentifier)) {
							result.push({ identifier: fallbackIdentifier, value: node });
						}
						return;
					}
					if (visited.has(node)) return;
					visited.add(node);

					if (Array.isArray(node)) {
						node.forEach(item => scan(item, fallbackIdentifier));
						return;
					}

					const identifier = this.getOnenetItemIdentifier(node) || fallbackIdentifier;
					if (identifier && this.getOnenetFieldByIdentifier(identifier) && this.hasOnenetItemValue(node)) {
						result.push({ identifier, value: this.getOnenetItemValue(node), time: node.time || node.timestamp || node.update_time });
					}

					Object.keys(node).forEach(key => {
						const value = node[key];
						if (this.getOnenetFieldByIdentifier(key)) {
							result.push({ identifier: key, value: this.getOnenetItemValue({ value }) });
							return;
						}
						if (['data', 'list', 'properties', 'property', 'params', 'items', 'datastreams', 'property_list'].includes(String(key).toLowerCase())) {
							scan(value, identifier);
							return;
						}
						if (value && typeof value === 'object') scan(value, identifier);
					});
				};
				scan(payload);
				return result;
			},
			getOnenetItemIdentifier(item) {
				return String(item.identifier || item.property_id || item.propertyId || item.id || item.name || item.code || item.key || '').trim();
			},
			hasOnenetItemValue(item) {
				return item && (
					item.value !== undefined ||
					item.property_value !== undefined ||
					item.current_value !== undefined ||
					item.currentValue !== undefined ||
					item.val !== undefined
				);
			},
			getOnenetItemValue(item) {
				const unwrap = value => {
					if (value && typeof value === 'object') {
						if (value.value !== undefined && value.value !== null) return unwrap(value.value);
						if (value.property_value !== undefined && value.property_value !== null) return unwrap(value.property_value);
						if (value.current_value !== undefined && value.current_value !== null) return unwrap(value.current_value);
						if (value.currentValue !== undefined && value.currentValue !== null) return unwrap(value.currentValue);
						if (value.val !== undefined && value.val !== null) return unwrap(value.val);
					}
					return value;
				};
				if (item.value !== undefined && item.value !== null) return unwrap(item.value);
				if (item.property_value !== undefined && item.property_value !== null) return item.property_value;
				if (item.current_value !== undefined && item.current_value !== null) return item.current_value;
				if (item.currentValue !== undefined && item.currentValue !== null) return item.currentValue;
				if (item.val !== undefined && item.val !== null) return item.val;
				return '';
			},
			normalizeOnenetIdentifier(identifier) {
				return String(identifier || '').toLowerCase().replace(/[^a-z0-9]/g, '');
			},
			getOnenetFieldByIdentifier(identifier) {
				const fieldMap = {
					temperature: 'temp',
					humidity: 'humi',
					heartrate: 'heartRate',
					bloodoxygen: 'bloodOxygen',
					mq2: 'MQ2',
					mq7: 'MQ7',
					nfc: 'area',
					area: 'area',
					mpu6050: 'sstatus',
					sstatus: 'sstatus',
					status: 'sstatus',
					help: 'help'
				};
				return fieldMap[this.normalizeOnenetIdentifier(identifier)] || '';
			},
			applyOnenetProperty(identifier, value) {
				const val = value === '' || value === undefined || value === null ? '0' : String(value);
				const field = this.getOnenetFieldByIdentifier(identifier);
				if (!field) return false;
				this[field] = val;
				return true;
			},
			markOnenetSuccess() {
				this.onenetFailCount = 0;
				this.isOnenetConnected = true;
				this.onenetErrorMessage = '';
			},
			markOnenetFailure(message, payload) {
				this.onenetFailCount += 1;
				this.onenetErrorMessage = this.onenetFailCount >= this.onenetMaxFailCount
					? message
					: `云端重连中 ${this.onenetFailCount}/${this.onenetMaxFailCount}`;
				if (this.onenetFailCount >= this.onenetMaxFailCount) {
					this.isOnenetConnected = false;
				}
				if (payload) console.warn('OneNET query failed:', payload);
			},
			base64ToBytes(base64) {
				const binary = atob(base64);
				const bytes = new Uint8Array(binary.length);
				for (let i = 0; i < binary.length; i += 1) {
					bytes[i] = binary.charCodeAt(i);
				}
				return bytes;
			},
			bytesToBase64(bytes) {
				let binary = '';
				const chunkSize = 0x8000;
				for (let i = 0; i < bytes.length; i += chunkSize) {
					binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
				}
				return btoa(binary);
			},
			async getOnenetAuth() {
				if (!ONENET_AUTH_KEY) return '';
				if (ONENET_AUTH_KEY.indexOf('version=') === 0) return ONENET_AUTH_KEY;
				const now = Math.floor(Date.now() / 1000);
				if (this.onenetAuthToken && this.onenetAuthExpireAt - now > 300) return this.onenetAuthToken;
				if (typeof crypto === 'undefined' || !crypto.subtle) return ONENET_AUTH_KEY;

				const version = '2022-05-01';
				const method = 'sha1';
				const et = String(now + 3600 * 24 * 7);
				const res = `products/${ONENET_PRODUCT_ID}`;
				const signText = `${et}\n${method}\n${res}\n${version}`;
				const key = await crypto.subtle.importKey(
					'raw',
					this.base64ToBytes(ONENET_AUTH_KEY),
					{ name: 'HMAC', hash: 'SHA-1' },
					false,
					['sign']
				);
				const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signText));
				const sign = this.bytesToBase64(new Uint8Array(signature));
				this.onenetAuthToken = `version=${version}&res=${encodeURIComponent(res)}&et=${et}&method=${method}&sign=${encodeURIComponent(sign)}`;
				this.onenetAuthExpireAt = Number(et);
				return this.onenetAuthToken;
			},
			async fetchDevData() {
				if (this.isFetchingOnenet) return;
				const authorization = await this.getOnenetAuth();
				if (!authorization) {
					this.markOnenetFailure('缺少 OneNET Authorization');
					this.isFetchingOnenet = false;
					return;
				}
				this.isFetchingOnenet = true;
				uni.request({
					url: ONENET_QUERY_URL,
					method: 'GET',
					data: {
						product_id: ONENET_PRODUCT_ID,
						device_name: ONENET_DEVICE_NAME
					},
					header: {
						'Authorization': authorization,
						'Content-Type': 'application/json'
					},
					timeout: 10000,
					success: (res) => {
						const payload = res.data || {};
						
						if (payload.error) {
							this.markOnenetFailure(payload.error, payload);
							return;
						}
						if (payload.code !== undefined && Number(payload.code) !== 0) {
							this.markOnenetFailure(payload.msg || payload.error || 'OneNET 返回异常', payload);
							return;
						}
						const properties = this.getOnenetPropertyList(payload);
						let appliedCount = 0;
						properties.forEach(item => {
							const identifier = this.getOnenetItemIdentifier(item);
							const value = this.getOnenetItemValue(item);
							if (this.applyOnenetProperty(identifier, value)) appliedCount += 1;
						});
						if (appliedCount === 0) {
							this.markOnenetFailure('没有解析到设备属性', payload);
							return;
						}
						this.markOnenetSuccess();
						this.updateTime = this.formatTime(new Date());
						this.captureSensorTimestamp(properties);
                        if (!this.staleReadings) {
                            this.recordHistory();
                            this.recordAlarmEvents();
                        }
						this.setColorGradient();
						this.checkAlarmThreshold();
					},
					fail: (err) => {
						console.error('request error:', err);
						this.markOnenetFailure(err && err.errMsg ? err.errMsg : '请求 OneNET 失败');
					},
					complete: () => {
						this.isFetchingOnenet = false;
					}
				});
			},
			formatTime(date) {
				const year = date.getFullYear();
				const month = (date.getMonth() + 1).toString().padStart(2, '0');
				const day = date.getDate().toString().padStart(2, '0');
				const hour = date.getHours().toString().padStart(2, '0');
				const minute = date.getMinutes().toString().padStart(2, '0');
				const second = date.getSeconds().toString().padStart(2, '0');
				return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
			},
			setColorGradient() {
				const tempVal = Number(this.temp);
				if (tempVal < 25) {
					this.tempBgColor = 'linear-gradient(135deg, #e3f2fd, #bbdefb)';
				} else if (tempVal < 40) {
					this.tempBgColor = 'linear-gradient(135deg, #fff8e1, #ffecb3)';
				} else {
					this.tempBgColor = 'linear-gradient(135deg, #ffebee, #ffcdd2)';
				}

				const humiVal = Number(this.humi);
				if (humiVal < 30) {
					this.humiBgColor = 'linear-gradient(135deg, #e8f5e9, #c8e6c9)';
				} else if (humiVal < 70) {
					this.humiBgColor = 'linear-gradient(135deg, #e3f2fd, #bbdefb)';
				} else {
					this.humiBgColor = 'linear-gradient(135deg, #bbdefb, #90caf9)';
				}

				const mq2Val = Number(this.MQ2);
				if (mq2Val < 30) {
					this.mq2BgColor = 'linear-gradient(135deg, #e8f5e9, #c8e6c9)';
				} else if (mq2Val < 60) {
					this.mq2BgColor = 'linear-gradient(135deg, #fff8e1, #ffecb3)';
				} else {
					this.mq2BgColor = 'linear-gradient(135deg, #ffebee, #ffcdd2)';
				}

				const mq7Val = Number(this.MQ7);
				if (mq7Val < 30) {
					this.mq7BgColor = 'linear-gradient(135deg, #e8f5e9, #c8e6c9)';
				} else if (mq7Val < 60) {
					this.mq7BgColor = 'linear-gradient(135deg, #fff8e1, #ffecb3)';
				} else {
					this.mq7BgColor = 'linear-gradient(135deg, #ffebee, #ffcdd2)';
				}

				const areaVal = Number(this.area);
				const areaColors = ['#9e9e9e', '#43a047', '#1e88e5', '#f57c00', '#e53935'];
				this.areaColor = areaColors[areaVal] || areaColors[0];
			},
			checkAlarmThreshold() {
				const tempVal = Number(this.temp);
				const heartRateVal = Number(this.heartRate);
				const bloodOxygenVal = Number(this.bloodOxygen);
				const mq2Val = Number(this.MQ2);
				const mq7Val = Number(this.MQ7);
				const alarmList = [];

				if (tempVal >= 40) alarmList.push('温度超过安全阈值');
				if (heartRateVal > 0 && (heartRateVal < 50 || heartRateVal > 120)) alarmList.push('心率异常');
				if (bloodOxygenVal > 0 && bloodOxygenVal < 90) alarmList.push('血氧偏低');
				if (mq2Val >= 60) alarmList.push('可燃气体超过安全阈值');
				if (mq7Val >= 60) alarmList.push('一氧化碳超过安全阈值');
				if (this.sstatus === '1') alarmList.push('人员跌倒/状态异常');
				if (this.help === '1') alarmList.push('人员主动求救');

				const previousAlarmState = this.isAlarm;
				this.isAlarm = alarmList.length > 0;
				this.alarmMessage = alarmList.join('、');
				const alarmTriggered = this.isAlarm !== previousAlarmState;
				this.lastAlarmState = this.isAlarm;
				return alarmTriggered;
			},
			buildSensorSnapshot() {
				return {
					time: this.updateTime || this.formatTime(new Date()),
					temperature: Number(this.temp || 0),
					humidity: Number(this.humi || 0),
					heartRate: Number(this.heartRate || 0),
					bloodOxygen: Number(this.bloodOxygen || 0),
					mq2: Number(this.MQ2 || 0),
					mq7: Number(this.MQ7 || 0),
					area: this.area,
					personStatus: this.sstatus,
					help: this.help,
					localAlarm: this.isAlarm,
					localAlarmMessage: this.alarmMessage,
					modelInfo: {
						provider: 'Xiaomi MiMo',
						proxyEndpoint: XIAOMI_ANALYZE_URL
					},
					historyStats: this.buildHistoryStats(),
					recentHistory: this.buildRecentHistory(),
					eventHistory: this.buildEventHistory()
				};
			},
			buildHistoryStats() {
				const areaRows = this.historyRecords.area || [];
				const statusRows = this.historyRecords.sstatus || [];
				return {
					areaRecords: areaRows.length,
					statusRecords: statusRows.length,
					firstAreaTime: areaRows[0] ? areaRows[0].time : '',
					lastAreaTime: areaRows[areaRows.length - 1] ? areaRows[areaRows.length - 1].time : '',
					firstStatusTime: statusRows[0] ? statusRows[0].time : '',
					lastStatusTime: statusRows[statusRows.length - 1] ? statusRows[statusRows.length - 1].time : ''
				};
			},
			buildRecentHistory() {
				const history = {};
				['temp', 'humi', 'heartRate', 'bloodOxygen', 'MQ2', 'MQ7', 'area', 'sstatus'].forEach(key => {
					const limit = key === 'area' || key === 'sstatus' ? 600 : 180;
					history[key] = (this.historyRecords[key] || []).slice(-limit);
				});
				return history;
			},
			buildCompactRecentHistory() {
				const history = {};
				['temp', 'humi', 'heartRate', 'bloodOxygen', 'MQ2', 'MQ7', 'area', 'sstatus'].forEach(key => {
					history[key] = (this.historyRecords[key] || []).slice(-20);
				});
				return history;
			},
			buildChatSnapshot() {
				const history = {};
				['temp', 'humi', 'heartRate', 'bloodOxygen', 'MQ2', 'MQ7', 'area', 'sstatus'].forEach(key => {
					const limit = key === 'area' || key === 'sstatus' ? 200 : 60;
					history[key] = (this.historyRecords[key] || []).slice(-limit);
				});
				return {
					...this.buildSensorSnapshot(),
					recentHistory: history,
					eventHistory: this.buildEventHistory().slice(-160)
				};
			},
			buildEventHistory() {
				const events = [];
				const areaRows = this.historyRecords.area || [];
				const statusRows = this.historyRecords.sstatus || [];
				let lastAreaValue = null;
				let lastStatusValue = null;

				areaRows.forEach(row => {
					const areaValue = String(row.value);
					if (areaValue === lastAreaValue) return;
					lastAreaValue = areaValue;
					events.push({
						time: row.time,
						type: 'area',
						value: row.value,
						text: row.text || this.getAreaTextByValue(String(row.value))
					});
				});

				statusRows.forEach(row => {
					const statusValue = String(row.value);
					if (statusValue === lastStatusValue) return;
					lastStatusValue = statusValue;
					events.push({
						time: row.time,
						type: 'status',
						value: row.value,
						text: row.text || this.formatHistoryValue('sstatus', Number(row.value))
					});
				});

				return events
					.filter(event => event.time)
					.sort((a, b) => String(a.time).localeCompare(String(b.time)))
					.slice(-300);
			},
			formatAiList(items) {
				if (!items || items.length === 0) return '暂无明显异常';
				return items.join('、');
			},
			shouldAnalyzeWithAi(force = false) {
				if (!this.aiEnabled || this.isAiAnalyzing) return false;
				if (force) return true;
				return false;
			},
			getAiErrorMessage(res, fallback = 'AI 调用失败') {
				const data = res && res.data;
				if (!data) return fallback;
				if (typeof data === 'string') return data;
				const detail = data.detail;
				const detailMessage = detail && detail.error && (detail.error.message || detail.error);
				return data.error || data.message || detailMessage || fallback;
			},
			analyzeDataWithXiaomi(force = false) {
				if (!this.shouldAnalyzeWithAi(force)) return;

				const snapshot = {
					...this.buildSensorSnapshot(),
					recentHistory: this.buildCompactRecentHistory(),
					eventHistory: this.buildEventHistory().slice(-40)
				};
				this.isAiAnalyzing = true;
				this.aiLastAnalyzeAt = Date.now();

				uni.request({
					url: XIAOMI_ANALYZE_URL,
					method: 'POST',
					header: {
						'Content-Type': 'application/json'
					},
					data: {
						snapshot
					},
					timeout: 30000,
					success: (res) => {
						const decision = res.data && res.data.decision;

						if (!decision) {
							console.warn('Xiaomi MiMo AI decision parse failed:', res.data);
							this.aiDecision = {
								riskLevel: 'watch',
								confidence: 0,
								summary: 'AI 分析失败',
								reason: this.getAiErrorMessage(res, '小米 MiMo 没有返回有效分析结果'),
								abnormalItems: [],
								trend: '暂无 AI 趋势结论',
								suggestion: '请检查小米 MiMo API Key、模型配置和网络'
							};
							return;
						}

						this.aiDecision = decision;
						console.log('Xiaomi MiMo AI decision:', decision);
					},
					fail: (err) => {
						console.error('Xiaomi MiMo AI request failed:', err);
						this.aiDecision = {
							riskLevel: 'watch',
							confidence: 0,
							summary: 'AI 请求失败',
							reason: '无法连接小米 MiMo 服务。' + (err && err.errMsg ? err.errMsg : ''),
							abnormalItems: [],
							trend: '暂无 AI 趋势结论',
							suggestion: '请稍后重试；本地运行请保持小米代理开启，线上请等待 Netlify 部署完成'
						};
					},
					complete: () => {
						this.isAiAnalyzing = false;
					}
				});
			},
			openAiChat() {
				this.aiChatVisible = true;
				this.scrollAiChatToBottom();
			},
			closeAiChat() {
				this.aiChatVisible = false;
			},
			loadAiChatMessages() {
				try {
					const saved = uni.getStorageSync(this.aiChatStorageKey);
					this.aiChatMessages = Array.isArray(saved) ? saved.slice(-80) : [];
				} catch (err) {
					this.aiChatMessages = [];
				}
			},
			saveAiChatMessages() {
				try {
					uni.setStorageSync(this.aiChatStorageKey, this.aiChatMessages.slice(-80));
				} catch (err) {
					console.warn('AI chat storage warning:', err);
				}
			},
			pushAiChatMessage(role, content) {
				this.aiChatMessages.push({
					role,
					content,
					time: this.formatTime(new Date()).slice(11, 16)
				});
				if (this.aiChatMessages.length > 80) this.aiChatMessages.shift();
				this.saveAiChatMessages();
				this.scrollAiChatToBottom();
			},
			clearAiChat() {
				this.aiChatMessages = [];
				this.aiAnswer = '';
				this.saveAiChatMessages();
				this.scrollAiChatToBottom();
			},
			scrollAiChatToBottom() {
				this.$nextTick(() => {
					this.aiChatScrollTop = 0;
					this.$nextTick(() => {
						this.aiChatScrollTop = 999999;
					});
				});
			},
			askAiQuickQuestion(question) {
				if (this.isAiChatting) return;
				this.aiQuestion = question;
				this.askAiQuestion();
			},
			askAiQuestion() {
				const question = (this.aiQuestion || '').trim();
				if (!question || this.isAiChatting) return;

				this.isAiChatting = true;
				this.aiAnswer = 'AI 正在查询历史数据...';
				this.aiQuestion = '';
				this.pushAiChatMessage('user', question);
				const loadingIndex = this.aiChatMessages.length;
				this.aiChatMessages.push({
					role: 'assistant',
					content: '正在分析...',
					time: this.formatTime(new Date()).slice(11, 16)
				});
				this.scrollAiChatToBottom();

				uni.request({
					url: XIAOMI_CHAT_URL,
					method: 'POST',
					header: {
						'Content-Type': 'application/json'
					},
					data: {
						question,
						snapshot: this.buildChatSnapshot()
					},
					timeout: 45000,
					success: (res) => {
						const answer = res.data && res.data.answer;
						if (!answer || !answer.answer) {
							this.aiAnswer = this.getAiErrorMessage(res, 'AI 暂时没有返回有效回答。');
							this.aiChatMessages.splice(loadingIndex, 1, {
								...this.aiChatMessages[loadingIndex],
								content: this.aiAnswer
							});
							this.saveAiChatMessages();
							this.scrollAiChatToBottom();
							return;
						}
						this.aiAnswer = answer.answer || '暂无可用回答';
						this.aiChatMessages.splice(loadingIndex, 1, {
							...this.aiChatMessages[loadingIndex],
							content: this.aiAnswer
						});
						this.saveAiChatMessages();
						this.scrollAiChatToBottom();
					},
					fail: (err) => {
						this.aiAnswer = 'AI 对话暂时超时，请稍后重试；如果是本地页面，请确认小米 MiMo 代理窗口保持开启。' + (err && err.errMsg ? '\n' + err.errMsg : '');
						this.aiChatMessages.splice(loadingIndex, 1, {
							...this.aiChatMessages[loadingIndex],
							content: this.aiAnswer
						});
						this.saveAiChatMessages();
						this.scrollAiChatToBottom();
					},
					complete: () => {
						this.isAiChatting = false;
					}
				});
			},
			parseXiaomiDecision(content) {
				if (!content || typeof content !== 'string') return null;

				try {
					return JSON.parse(content);
				} catch (err) {
					const match = content.match(/\{[\s\S]*\}/);
					if (!match) return null;
					try {
						return JSON.parse(match[0]);
					} catch (jsonErr) {
						return null;
					}
				}
			},
			async setEvacuationDesired() {
				const authorization = await this.getOnenetAuth();
				if (!authorization) {
					uni.showModal({ title: '发送失败', content: '代码里的 OneNET 密钥还没填写。', showCancel: false });
					return false;
				}

				return new Promise(resolve => {
					uni.request({
						url: ONENET_SET_DESIRED_URL,
						method: 'POST',
						header: {
							'Authorization': authorization,
							'Content-Type': 'application/json'
						},
						data: {
							product_id: ONENET_PRODUCT_ID,
							device_name: ONENET_DEVICE_NAME,
							params: { Leave: 'true' }
						},
						timeout: 10000,
						success: (res) => {
							if (res.data && res.data.code === 0) {
								resolve(true);
							} else {
								const message = (res.data && (res.data.msg || res.data.error)) || '未知错误';
								uni.showModal({ title: '指令下发失败', content: '平台返回：' + message, showCancel: false });
								resolve(false);
							}
						},
						fail: (err) => {
							uni.showModal({
								title: '发送失败',
								content: '请检查 OneNET、网络和设备名称。' + (err && err.errMsg ? '\n' + err.errMsg : ''),
								showCancel: false
							});
							resolve(false);
						}
					});
				});
			},
			async sendEvacuationCmd() {
				if (this.isSending) return;

				this.isSending = true;
				uni.showLoading({ title: '发送指令中...', mask: true });
				try {
					const ok = await this.setEvacuationDesired();
					uni.hideLoading();
					if (ok) {
						this.markOnenetSuccess();
						uni.showToast({ title: '撤离指令已提交云平台', icon: 'none', duration: 2500 });
					}
				} catch (err) {
					uni.hideLoading();
					uni.showModal({
						title: '发送失败',
						content: '撤离指令发送异常。' + (err && err.message ? '\n' + err.message : ''),
						showCancel: false
					});
				} finally {
					this.isSending = false;
				}
			}
		}
	}


