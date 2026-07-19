<template>
	<view class="wrap" :class="{ 'alarm-active': isAlarm }">
		<!-- 鑳屾櫙绮掑瓙 -->
		<view class="bg-particles">
			<view class="particle" v-for="i in 20" :key="i" :style="{
				left: (i * 37 + 13) % 100 + '%',
				top: (i * 53 + 7) % 100 + '%',
				animationDelay: (i * 0.7) + 's',
				animationDuration: (3 + i % 4) + 's'
			}"></view>
		</view>

		<!-- 椤堕儴 -->
		<view class="header">
			<view class="header-glow"></view>
			<view class="header-content">
				<view class="title-wrap">
					<view class="title-icon">
						<view class="icon-hex">⛏</view>
					</view>
					<view class="title-group">
						<view class="title">矿洞智能安全监测系统</view>
						<view class="subtitle">MINE SAFETY MONITORING SYSTEM</view>
					</view>
				</view>
				<view class="status-bar">
					<view class="onenet-status" :class="{ connected: isOnenetConnected }">
						<view class="status-dot-ring">
							<view class="status-dot"></view>
						</view>
						<text>{{ isOnenetConnected ? '云端已连接' : (onenetErrorMessage || '云端已断开') }}</text>
					</view>
					<view class="update-time">
						<text class="time-icon">⏱</text>
						<text>{{ updateTime }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 鎶ヨ -->
		<view class="alarm-box" v-if="isAlarm">
			<view class="alarm-stripes"></view>
			<view class="alarm-content">
				<view class="alarm-icon-wrap">
						<view class="alarm-icon">⚠</view>
				</view>
				<view class="alarm-info">
					<view class="alarm-text">紧急报警：{{ alarmMessage }}</view>
					<view class="alarm-subtext">检测到危险指标，请立即处理</view>
				</view>
			</view>
		</view>

		<!-- 浜哄憳鐘舵€佸崱鐗?-->
		<view class="status-card">
			<view class="status-item" @click="openHistory('area')">
				<view class="status-icon-bg">
					<text class="si-icon">📍</text>
				</view>
				<view class="status-label">人员位置</view>
				<view class="status-value" :style="{ color: areaColor }">
					{{ areaText }}
				</view>
				<view class="status-bar-indicator" :style="{ background: areaColor }"></view>
			</view>
			<view class="status-item" @click="openHistory('sstatus')">
				<view class="status-icon-bg">
					<text class="si-icon">👷</text>
				</view>
				<view class="status-label">人员状态</view>
				<view class="status-value status-pulse" :class="{ danger: sstatus === '1' }">
					{{ sstatusText }}
				</view>
				<view class="status-bar-indicator" :style="{ background: sstatus === '1' ? '#ef4444' : '#22c55e' }"></view>
			</view>
			<view class="status-item bracelet-status" :class="{ offline: !isBraceletWorn }">
				<view class="status-icon-bg bracelet-icon-bg">
					<text class="si-icon">⌚</text>
				</view>
				<view class="status-label">手环状态</view>
				<view class="status-value" :style="{ color: braceletColor }">
					{{ braceletText }}
				</view>
				<view class="status-bar-indicator" :style="{ background: braceletColor }"></view>
			</view>
		</view>

		<!-- 浼犳劅鍣ㄦ暟鎹?-->
		<view class="section-title">
			<view class="section-line"></view>
			<text class="section-text">环境监测数据</text>
			<view class="section-line"></view>
		</view>

		<view class="dev-area">
			<view class="dev-card" :class="{ warning: temp >= 40 }" @click="openHistory('temp')">
				<view class="dev-card-glow" :style="{ background: temp >= 40 ? 'rgba(239,68,68,0.15)' : temp >= 25 ? 'rgba(251,191,36,0.1)' : 'rgba(34,197,94,0.1)' }"></view>
				<view class="dev-top">
					<view class="dev-icon-wrap" :style="{ background: temp >= 40 ? 'rgba(239,68,68,0.2)' : temp >= 25 ? 'rgba(251,191,36,0.2)' : 'rgba(34,197,94,0.2)' }">
						<image class="dev-icon" src="/static/temp.png" mode="aspectFit"></image>
					</view>
					<view class="dev-name">环境温度</view>
				</view>
				<view class="dev-value-wrap">
					<text class="dev-value">{{ temp }}</text>
					<text class="dev-unit">℃</text>
				</view>
				<view class="dev-threshold" v-if="temp >= 40">
					<text>⚠ 超过安全阈值 40℃</text>
				</view>
				<view class="dev-bar">
					<view class="dev-bar-fill" :style="{ width: Math.min(temp / 60 * 100, 100) + '%', background: temp >= 40 ? '#ef4444' : temp >= 25 ? '#f59e0b' : '#22c55e' }"></view>
				</view>
			</view>

			<view class="dev-card" @click="openHistory('humi')">
				<view class="dev-card-glow" :style="{ background: humi >= 70 ? 'rgba(59,130,246,0.12)' : humi < 30 ? 'rgba(251,191,36,0.1)' : 'rgba(34,197,94,0.1)' }"></view>
				<view class="dev-top">
					<view class="dev-icon-wrap" :style="{ background: humi >= 70 ? 'rgba(59,130,246,0.2)' : humi < 30 ? 'rgba(251,191,36,0.2)' : 'rgba(34,197,94,0.2)' }">
						<image class="dev-icon" src="/static/humi.png" mode="aspectFit"></image>
					</view>
					<view class="dev-name">环境湿度</view>
				</view>
				<view class="dev-value-wrap">
					<text class="dev-value">{{ humi }}</text>
					<text class="dev-unit">%</text>
				</view>
				<view class="dev-bar">
					<view class="dev-bar-fill" :style="{ width: Math.min(humi / 100 * 100, 100) + '%', background: humi >= 70 ? '#3b82f6' : humi < 30 ? '#f59e0b' : '#22c55e' }"></view>
				</view>
			</view>

			<view class="dev-card health-card" :class="{ warning: heartRate > 0 && (heartRate < 50 || heartRate > 120) }" @click="openHistory('heartRate')">
				<view class="dev-card-glow" :style="{ background: heartRate > 0 && (heartRate < 50 || heartRate > 120) ? 'rgba(239,68,68,0.15)' : 'rgba(244,63,94,0.12)' }"></view>
				<view class="dev-top">
					<view class="dev-icon-wrap vital-heart">
						<text class="vital-icon">♥</text>
					</view>
					<view class="dev-name">心率</view>
				</view>
				<view class="dev-value-wrap">
					<text class="dev-value">{{ heartRate }}</text>
					<text class="dev-unit">bpm</text>
				</view>
				<view class="dev-threshold" v-if="heartRate > 0 && (heartRate < 50 || heartRate > 120)">
					<text>⚠ 心率异常</text>
				</view>
				<view class="dev-bar">
					<view class="dev-bar-fill" :style="{ width: Math.min(heartRate / 180 * 100, 100) + '%', background: heartRate > 0 && (heartRate < 50 || heartRate > 120) ? '#ef4444' : '#f43f5e' }"></view>
				</view>
			</view>

			<view class="dev-card health-card" :class="{ warning: bloodOxygen > 0 && bloodOxygen < 90 }" @click="openHistory('bloodOxygen')">
				<view class="dev-card-glow" :style="{ background: bloodOxygen > 0 && bloodOxygen < 90 ? 'rgba(239,68,68,0.15)' : 'rgba(14,165,233,0.12)' }"></view>
				<view class="dev-top">
					<view class="dev-icon-wrap vital-oxygen">
						<text class="vital-icon">O₂</text>
					</view>
					<view class="dev-name">血氧</view>
				</view>
				<view class="dev-value-wrap">
					<text class="dev-value">{{ bloodOxygen }}</text>
					<text class="dev-unit">%</text>
				</view>
				<view class="dev-threshold" v-if="bloodOxygen > 0 && bloodOxygen < 90">
					<text>⚠ 血氧偏低</text>
				</view>
				<view class="dev-bar">
					<view class="dev-bar-fill" :style="{ width: Math.min(bloodOxygen, 100) + '%', background: bloodOxygen > 0 && bloodOxygen < 90 ? '#ef4444' : '#0ea5e9' }"></view>
				</view>
			</view>

			<view class="dev-card" :class="{ warning: MQ2 >= 60 }" @click="openHistory('MQ2')">
				<view class="dev-card-glow" :style="{ background: MQ2 >= 60 ? 'rgba(239,68,68,0.15)' : MQ2 >= 30 ? 'rgba(251,191,36,0.1)' : 'rgba(34,197,94,0.1)' }"></view>
				<view class="dev-top">
					<view class="dev-icon-wrap" :style="{ background: MQ2 >= 60 ? 'rgba(239,68,68,0.2)' : MQ2 >= 30 ? 'rgba(251,191,36,0.2)' : 'rgba(34,197,94,0.2)' }">
						<image class="dev-icon" src="/static/burn.png" mode="aspectFit"></image>
					</view>
					<view class="dev-name">可燃气体 (MQ2)</view>
				</view>
				<view class="dev-value-wrap">
					<text class="dev-value">{{ MQ2 }}</text>
					<text class="dev-unit">%</text>
				</view>
				<view class="dev-threshold" v-if="MQ2 >= 60">
					<text>⚠ 超过安全阈值 60%</text>
				</view>
				<view class="dev-bar">
					<view class="dev-bar-fill" :style="{ width: Math.min(MQ2 / 100 * 100, 100) + '%', background: MQ2 >= 60 ? '#ef4444' : MQ2 >= 30 ? '#f59e0b' : '#22c55e' }"></view>
				</view>
			</view>

			<view class="dev-card" :class="{ warning: MQ7 >= 60 }" @click="openHistory('MQ7')">
				<view class="dev-card-glow" :style="{ background: MQ7 >= 60 ? 'rgba(239,68,68,0.15)' : MQ7 >= 30 ? 'rgba(251,191,36,0.1)' : 'rgba(34,197,94,0.1)' }"></view>
				<view class="dev-top">
					<view class="dev-icon-wrap" :style="{ background: MQ7 >= 60 ? 'rgba(239,68,68,0.2)' : MQ7 >= 30 ? 'rgba(251,191,36,0.2)' : 'rgba(34,197,94,0.2)' }">
						<image class="dev-icon" src="/static/co.png" mode="aspectFit"></image>
					</view>
					<view class="dev-name">一氧化碳 (MQ7)</view>
				</view>
				<view class="dev-value-wrap">
					<text class="dev-value">{{ MQ7 }}</text>
					<text class="dev-unit">%</text>
				</view>
				<view class="dev-threshold" v-if="MQ7 >= 60">
					<text>⚠ 超过安全阈值 60%</text>
				</view>
				<view class="dev-bar">
					<view class="dev-bar-fill" :style="{ width: Math.min(MQ7 / 100 * 100, 100) + '%', background: MQ7 >= 60 ? '#ef4444' : MQ7 >= 30 ? '#f59e0b' : '#22c55e' }"></view>
				</view>
			</view>
		</view>

		<!-- 绱ф€ユ挙绂绘寜閽?-->
		<view class="ai-panel">
			<view class="ai-panel-glow"></view>
			<view class="ai-panel-head">
				<view class="ai-title-wrap">
					<view class="ai-icon">
						<text>AI</text>
					</view>
					<view>
						<view class="ai-kicker">MINE SAFETY COPILOT</view>
						<view class="ai-title">小米 MiMo 智能研判中心</view>
						<view class="ai-subtitle">仅手动分析数据，支持追问人员轨迹、跌倒时间和风险原因</view>
					</view>
				</view>
				<view class="ai-actions">
					<button class="ai-chat-btn" @click="openAiChat">
						<text class="ai-btn-mark">✦</text>
						<text>打开 AI 对话</text>
					</button>
					<button class="ai-analyze-btn" :disabled="isAiAnalyzing" @click="analyzeDataWithXiaomi(true)">
						{{ isAiAnalyzing ? '分析中...' : '立即 AI 分析' }}
					</button>
				</view>
			</view>
			<view class="ai-signal-row">
				<view class="ai-signal-pill">
					<text class="ai-signal-dot"></text>
					<text>云端推理已就绪</text>
				</view>
				<view class="ai-signal-pill">
					<text>历史轨迹 {{ historyRecords.area.length }} 条</text>
				</view>
				<view class="ai-signal-pill">
					<text>状态记录 {{ historyRecords.sstatus.length }} 条</text>
				</view>
			</view>
			<view class="ai-grid">
				<view class="ai-stat">
					<text class="ai-label">连接状态</text>
					<text class="ai-value success">小米 MiMo 已接入</text>
				</view>
				<view class="ai-stat">
					<text class="ai-label">风险等级</text>
					<text class="ai-value" :class="aiDecision && aiDecision.riskLevel === 'danger' ? 'danger' : ''">
						{{ aiDecision ? aiDecision.riskLevel : '等待分析' }}
					</text>
				</view>
				<view class="ai-stat">
					<text class="ai-label">分析状态</text>
					<text class="ai-value" :class="isAiAnalyzing ? '' : 'success'">
						{{ isAiAnalyzing ? '正在分析' : (aiDecision ? '已完成' : '等待分析') }}
					</text>
				</view>
			</view>
			<view class="ai-reason">
				{{ aiDecision && aiDecision.reason ? aiDecision.reason : '点击“立即 AI 分析”时，系统才会调用小米 MiMo 分析当前数据和近期趋势。' }}
			</view>
		</view>

		<view class="evacuation-section">
			<view class="evacuation-btn-wrap">
				<view class="btn-ripple-wrap">
					<view class="btn-ripple" v-if="!isSending"></view>
					<view class="btn-ripple delay" v-if="!isSending"></view>
					<button
						class="evacuation-btn"
						:class="{ sending: isSending }"
						@click="showEvacuationModal"
						:disabled="isSending"
					>
						<text class="btn-icon">⚠</text>
						<text>{{ isSending ? '指令发送中...' : '紧急撤离' }}</text>
					</button>
				</view>
				<view class="evacuation-hint" v-if="!isOnenetConnected">
					<text>云端监测重连中，撤离指令仍会强制尝试发送</text>
				</view>
			</view>
		</view>

		<!-- 搴曢儴 -->
		<view class="footer">
			<view class="footer-grid">
				<view class="footer-item">
					<text class="footer-label">系统</text>
					<text class="footer-val">矿工安全监测 © 2026</text>
				</view>
				<view class="footer-item">
					<text class="footer-label">赛事</text>
					<text class="footer-val accent">全国物联网大赛参赛作品</text>
				</view>
				<view class="footer-item">
					<text class="footer-label">刷新</text>
					<text class="footer-val">数据每秒自动刷新，实时阈值监测</text>
				</view>
			</view>
		</view>

		<!-- 绱ф€ユ挙绂荤‘璁ゅ脊绐?-->
		<view class="modal-overlay" v-if="showModal" @click="cancelEvacuation">
			<view class="modal-container" @click.stop>
				<view class="modal-bg-decor"></view>
				<view class="modal-header">
					<view class="modal-warn-icon">⚠</view>
					<text class="modal-title">紧急撤离确认</text>
				</view>
				<view class="modal-body">
					<text class="modal-desc">您即将向所有人员发送紧急撤离指令</text>
					<text class="modal-desc-sub">此操作将触发矿洞内警报设备，请确认是否执行</text>
					<view class="modal-info-box">
						<view class="modal-info-item">
							<text class="mi-label">当前区域</text>
							<text class="mi-value">{{ areaText }}</text>
						</view>
						<view class="modal-info-item">
							<text class="mi-label">人员状态</text>
							<text class="mi-value" :class="{ 'text-danger': sstatus === '1' }">{{ sstatusText }}</text>
						</view>
					</view>
				</view>
				<view class="modal-footer">
					<button class="modal-btn modal-btn-cancel" @click="cancelEvacuation">
						<text>否，暂不撤离</text>
					</button>
					<button class="modal-btn modal-btn-confirm" :disabled="isSending" @click.stop="confirmEvacuation">
						<text>是，立即撤离</text>
					</button>
				</view>
			</view>
		</view>

		<view class="history-overlay" v-if="historyModalVisible" @click="closeHistory">
			<view class="history-container" @click.stop>
				<button class="history-close" @click="closeHistory">×</button>
				<view class="history-header">
					<view>
						<view class="history-title">{{ activeHistoryConfig.name }}历史记录</view>
						<view class="history-subtitle">最近 {{ activeHistoryRows.length }} 条采样数据</view>
					</view>
				</view>
				<view class="history-summary">
					<view class="history-summary-item">
						<text class="history-label">当前</text>
						<text class="history-value">{{ formatHistorySummaryValue(activeHistoryKey, activeHistoryConfig.value) }}</text>
					</view>
					<view class="history-summary-item">
						<text class="history-label">最高</text>
						<text class="history-value">{{ formatHistorySummaryValue(activeHistoryKey, historyMax) }}</text>
					</view>
					<view class="history-summary-item">
						<text class="history-label">最低</text>
						<text class="history-value">{{ formatHistorySummaryValue(activeHistoryKey, historyMin) }}</text>
					</view>
				</view>
				<view class="history-chart">
					<view class="chart-grid"></view>
					<svg class="history-svg" viewBox="0 0 100 100" preserveAspectRatio="none" v-if="historySvgPoints.length > 0">
						<polyline class="history-polyline" :points="historyPolylinePoints"></polyline>
						<circle
							class="history-circle"
							v-for="(point, index) in historySvgPoints"
							:key="'point-' + index"
							:cx="point.x"
							:cy="point.y"
							r="1.45"
						></circle>
					</svg>
					<view class="history-empty" v-if="activeHistoryRows.length === 0">暂无历史数据</view>
				</view>
				<scroll-view class="history-list" scroll-y>
					<view class="history-row" v-for="(row, index) in activeHistoryRows" :key="index">
						<text class="history-row-time">{{ row.time }}</text>
						<text class="history-row-value">{{ row.text || row.value }}{{ row.text ? '' : activeHistoryConfig.unit }}</text>
					</view>
				</scroll-view>
			</view>
		</view>

		<view class="ai-chat-overlay" v-if="aiChatVisible" @click="closeAiChat">
			<view class="ai-chat-modal" @click.stop>
				<view class="ai-chat-orbit one"></view>
				<view class="ai-chat-orbit two"></view>
				<view class="ai-chat-head">
					<view>
						<view class="ai-chat-kicker">XIAOMI MIMO LIVE ASSISTANT</view>
						<view class="ai-chat-title">矿洞安全 AI 指挥舱</view>
						<view class="ai-chat-tip">对话记录会保留，可追问人员经过矿洞、跌倒时间、传感器异常和当前风险。</view>
					</view>
					<view class="ai-chat-head-actions">
						<button class="ai-chat-clear" @click="clearAiChat">清空</button>
						<button class="ai-chat-close" @click="closeAiChat">×</button>
					</view>
				</view>
				<view class="ai-chat-metrics">
					<view class="ai-chat-metric">
						<text class="metric-label">模型</text>
						<text class="metric-value">小米 MiMo</text>
					</view>
					<view class="ai-chat-metric">
						<text class="metric-label">位置历史</text>
						<text class="metric-value">{{ historyRecords.area.length }} 条</text>
					</view>
					<view class="ai-chat-metric">
						<text class="metric-label">状态历史</text>
						<text class="metric-value">{{ historyRecords.sstatus.length }} 条</text>
					</view>
				</view>
				<view class="ai-chat-quick-row">
					<button
						class="ai-chat-quick"
						v-for="item in aiQuickQuestions"
						:key="item"
						:disabled="isAiChatting"
						@click="askAiQuickQuestion(item)"
					>{{ item }}</button>
				</view>
				<scroll-view class="ai-chat-messages" scroll-y :scroll-top="aiChatScrollTop" scroll-with-animation>
					<view class="ai-chat-empty" v-if="aiChatMessages.length === 0">
						<view class="ai-chat-empty-title">等待你的第一条问题</view>
						<view class="ai-chat-empty-text">建议先问“人员经过了哪些矿洞”或“最近一次报警原因”。</view>
					</view>
					<view
						class="ai-chat-message"
						v-for="(message, index) in aiChatMessages"
						:key="index"
						:class="message.role === 'user' ? 'user' : 'assistant'"
					>
						<view class="ai-chat-bubble">
							<text>{{ message.content }}</text>
						</view>
						<view class="ai-chat-time">{{ message.time }}</view>
					</view>
				</scroll-view>
				<view class="ai-chat-form">
					<input class="ai-chat-input" v-model="aiQuestion" placeholder="输入你的问题" @confirm="askAiQuestion" />
					<button class="ai-chat-send" :disabled="isAiChatting" @click="askAiQuestion">
						{{ isAiChatting ? '思考中' : '发送' }}
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
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
						result.push({ identifier, value: this.getOnenetItemValue(node) });
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
						console.log('OneNET query:', payload);
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
						this.recordHistory();
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
						uni.showToast({ title: '紧急撤离指令发送成功', icon: 'success', duration: 2000 });
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
</script>

<style scoped>
	page {
		background: #0a0e17;
		min-height: 100vh;
		font-family: "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif;
		padding: 24rpx;
	}

	.wrap {
		max-width: 1200px;
		margin: 0 auto;
		position: relative;
	}

	/* ========== 鑳屾櫙绮掑瓙 ========== */
	.bg-particles {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.particle {
		position: absolute;
		width: 3rpx;
		height: 3rpx;
		background: rgba(79, 172, 254, 0.4);
		border-radius: 50%;
		animation: floatUp linear infinite;
	}

	@keyframes floatUp {
		0% {
			transform: translateY(0) scale(1);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			transform: translateY(-100vh) scale(0);
			opacity: 0;
		}
	}

	/* ========== 澶撮儴 ========== */
	.header {
		position: relative;
		background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9));
		border: 1px solid rgba(79, 172, 254, 0.15);
		border-radius: 28rpx;
		padding: 40rpx 36rpx;
		margin-bottom: 28rpx;
		overflow: hidden;
		z-index: 1;
		backdrop-filter: blur(20px);
	}

	.header-glow {
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(ellipse at 30% 50%, rgba(79, 172, 254, 0.08) 0%, transparent 60%);
		pointer-events: none;
	}

	.header-content {
		position: relative;
		z-index: 1;
	}

	.title-wrap {
		display: flex;
		align-items: center;
		gap: 20rpx;
		margin-bottom: 24rpx;
	}

	.icon-hex {
		font-size: 52rpx;
		filter: drop-shadow(0 0 12rpx rgba(79, 172, 254, 0.4));
	}

	.title-group {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.title {
		font-size: 44rpx;
		font-weight: 800;
		background: linear-gradient(135deg, #e0f2fe, #7dd3fc, #38bdf8);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		letter-spacing: 2rpx;
	}

	.subtitle {
		font-size: 22rpx;
		color: rgba(148, 163, 184, 0.7);
		letter-spacing: 4rpx;
		font-weight: 400;
	}

	.status-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 26rpx;
	}

	.onenet-status {
		display: flex;
		align-items: center;
		gap: 10rpx;
		color: #ef4444;
		font-size: 26rpx;
		transition: color 0.3s;
	}

	.onenet-status.connected {
		color: #22c55e;
	}

	.status-dot-ring {
		width: 20rpx;
		height: 20rpx;
		border-radius: 50%;
		border: 2rpx solid currentColor;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.6;
	}

	.status-dot {
		display: block;
		width: 10rpx;
		height: 10rpx;
		border-radius: 50%;
		background: currentColor;
		animation: dotPulse 2s infinite;
	}

	@keyframes dotPulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(0.6); }
	}

	.update-time {
		color: rgba(148, 163, 184, 0.7);
		font-size: 26rpx;
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.time-icon {
		font-size: 24rpx;
	}

	/* ========== 鎶ヨ鏉?========== */
	.alarm-box {
		position: relative;
		background: linear-gradient(135deg, #7f1d1d, #991b1b);
		border: 1px solid rgba(239, 68, 68, 0.4);
		border-radius: 24rpx;
		padding: 36rpx;
		margin-bottom: 28rpx;
		overflow: hidden;
		z-index: 1;
		animation: alarmShake 0.6s infinite alternate;
	}

	.alarm-stripes {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			-45deg,
			transparent,
			transparent 20rpx,
			rgba(255, 255, 255, 0.03) 20rpx,
			rgba(255, 255, 255, 0.03) 40rpx
		);
		pointer-events: none;
	}

	@keyframes alarmShake {
		0% { box-shadow: 0 0 30rpx rgba(239, 68, 68, 0.3), 0 0 60rpx rgba(239, 68, 68, 0.1); }
		100% { box-shadow: 0 0 60rpx rgba(239, 68, 68, 0.5), 0 0 120rpx rgba(239, 68, 68, 0.2); }
	}

	.alarm-content {
		position: relative;
		display: flex;
		align-items: center;
		gap: 24rpx;
		z-index: 1;
	}

	.alarm-icon-wrap {
		flex-shrink: 0;
		width: 80rpx;
		height: 80rpx;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.alarm-icon {
		font-size: 44rpx;
		animation: alarmIconShake 0.3s infinite alternate;
	}

	@keyframes alarmIconShake {
		0% { transform: rotate(-5deg) scale(1); }
		100% { transform: rotate(5deg) scale(1.1); }
	}

	.alarm-info {
		flex: 1;
	}

	.alarm-text {
		font-size: 36rpx;
		font-weight: 800;
		color: #fff;
		margin-bottom: 8rpx;
	}

	.alarm-subtext {
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.75);
	}

	/* ========== 浜哄憳鐘舵€佸崱鐗?========== */
	.status-card {
		display: flex;
		flex-wrap: wrap;
		gap: 24rpx;
		margin-bottom: 28rpx;
		position: relative;
		z-index: 1;
	}

	.status-item {
		flex: 1 1 220rpx;
		background: linear-gradient(135deg, rgba(17, 24, 39, 0.9), rgba(31, 41, 55, 0.8));
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16rpx;
		padding: 36rpx 28rpx;
		text-align: center;
		position: relative;
		overflow: hidden;
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		box-shadow: 0 18rpx 44rpx rgba(2, 6, 23, 0.18);
	}

	.status-item::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4rpx;
		background: linear-gradient(90deg, rgba(56, 189, 248, 0.85), rgba(34, 197, 94, 0.7));
	}

	.bracelet-status {
		border-color: rgba(34, 197, 94, 0.18);
		background: linear-gradient(135deg, rgba(6, 78, 59, 0.52), rgba(15, 23, 42, 0.86));
	}

	.bracelet-status.offline {
		border-color: rgba(245, 158, 11, 0.26);
		background: linear-gradient(135deg, rgba(120, 53, 15, 0.45), rgba(15, 23, 42, 0.86));
	}

	.status-item:active {
		transform: scale(0.97);
	}

	.status-icon-bg {
		width: 64rpx;
		height: 64rpx;
		border-radius: 18rpx;
		background: rgba(79, 172, 254, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16rpx;
	}

	.bracelet-icon-bg {
		background: rgba(34, 197, 94, 0.14);
		color: #86efac;
	}

	.si-icon {
		font-size: 32rpx;
	}

	.status-label {
		font-size: 26rpx;
		color: rgba(148, 163, 184, 0.8);
		margin-bottom: 12rpx;
		font-weight: 500;
	}

	.status-value {
		font-size: 40rpx;
		font-weight: 800;
		color: #e2e8f0;
		margin-bottom: 16rpx;
		transition: color 0.3s;
	}

	.status-pulse.danger {
		color: #ef4444;
		animation: textPulse 1s infinite alternate;
	}

	@keyframes textPulse {
		0% { opacity: 1; }
		100% { opacity: 0.5; }
	}

	.status-bar-indicator {
		height: 4rpx;
		border-radius: 4rpx;
		width: 60%;
		margin: 0 auto;
		opacity: 0.6;
	}

	/* ========== 鍖哄潡鏍囬 ========== */
	.section-title {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 24rpx;
		position: relative;
		z-index: 1;
	}

	.section-line {
		flex: 1;
		height: 1rpx;
		background: linear-gradient(90deg, transparent, rgba(79, 172, 254, 0.2), transparent);
	}

	.section-text {
		font-size: 26rpx;
		color: rgba(148, 163, 184, 0.8);
		letter-spacing: 4rpx;
		font-weight: 500;
		white-space: nowrap;
	}

	/* ========== 浼犳劅鍣ㄥ崱鐗?========== */
	.dev-area {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
		margin-bottom: 32rpx;
		position: relative;
		z-index: 1;
	}

	.dev-card {
		flex: 1 1 calc(50% - 10rpx);
		min-width: 280rpx;
		box-sizing: border-box;
		background: linear-gradient(145deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.76));
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16rpx;
		padding: 32rpx 28rpx;
		position: relative;
		overflow: hidden;
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		box-shadow: 0 18rpx 46rpx rgba(2, 6, 23, 0.2);
		cursor: pointer;
	}

	.dev-card::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4rpx;
		background: linear-gradient(90deg, rgba(34, 197, 94, 0.75), rgba(14, 165, 233, 0.72));
		opacity: 0.9;
	}

	.dev-card.health-card::before {
		background: linear-gradient(90deg, rgba(244, 63, 94, 0.78), rgba(14, 165, 233, 0.72));
	}

	.dev-card:active {
		transform: scale(0.97);
	}

	.dev-card.warning {
		border-color: rgba(239, 68, 68, 0.3);
		animation: cardWarnGlow 2s infinite alternate;
	}

	@keyframes cardWarnGlow {
		0% { box-shadow: 0 0 20rpx rgba(239, 68, 68, 0.1); }
		100% { box-shadow: 0 0 40rpx rgba(239, 68, 68, 0.25); }
	}

	.dev-card-glow {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
		transition: background 0.5s;
	}

	.dev-top {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 24rpx;
		position: relative;
		z-index: 1;
	}

	.dev-icon-wrap {
		width: 56rpx;
		height: 56rpx;
		border-radius: 16rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.dev-icon {
		width: 36rpx;
		height: 36rpx;
	}

	.vital-icon {
		color: #fff;
		font-size: 30rpx;
		font-weight: 800;
		line-height: 1;
	}

	.vital-heart {
		background: rgba(244, 63, 94, 0.22);
		color: #fb7185;
	}

	.vital-oxygen {
		background: rgba(14, 165, 233, 0.22);
		color: #38bdf8;
	}

	.dev-name {
		font-size: 28rpx;
		color: rgba(226, 232, 240, 0.85);
		font-weight: 600;
	}

	.dev-value-wrap {
		display: flex;
		align-items: baseline;
		gap: 8rpx;
		margin-bottom: 16rpx;
		position: relative;
		z-index: 1;
	}

	.dev-value {
		font-size: 68rpx;
		font-weight: 900;
		color: #f1f5f9;
		line-height: 1;
		letter-spacing: 0;
		font-variant-numeric: tabular-nums;
	}

	.dev-unit {
		font-size: 32rpx;
		color: rgba(148, 163, 184, 0.6);
		font-weight: 500;
	}

	.dev-threshold {
		margin-bottom: 14rpx;
		position: relative;
		z-index: 1;
	}

	.dev-threshold text {
		font-size: 24rpx;
		color: #ef4444;
		font-weight: 600;
		background: rgba(239, 68, 68, 0.1);
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
	}

	.dev-bar {
		height: 6rpx;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 6rpx;
		overflow: hidden;
		position: relative;
		z-index: 1;
	}

	.dev-bar-fill {
		height: 100%;
		border-radius: 6rpx;
		transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background 0.5s;
	}

	/* ========== 绱ф€ユ挙绂?========== */
	.ai-panel {
		position: relative;
		z-index: 1;
		background:
			radial-gradient(circle at 12% 18%, rgba(34, 211, 238, 0.22), transparent 34%),
			radial-gradient(circle at 88% 8%, rgba(34, 197, 94, 0.18), transparent 30%),
			linear-gradient(135deg, rgba(8, 47, 73, 0.84), rgba(15, 23, 42, 0.94));
		border: 1px solid rgba(125, 211, 252, 0.34);
		border-radius: 24rpx;
		padding: 34rpx;
		margin-bottom: 32rpx;
		box-shadow: 0 24rpx 70rpx rgba(2, 6, 23, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.ai-panel::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4rpx;
		background: linear-gradient(90deg, #38bdf8, #22c55e, #f59e0b);
	}

	.ai-panel-glow {
		position: absolute;
		inset: 18rpx;
		border: 1px solid rgba(125, 211, 252, 0.08);
		border-radius: 20rpx;
		pointer-events: none;
	}

	.ai-panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24rpx;
		margin-bottom: 26rpx;
	}

	.ai-actions {
		display: flex;
		gap: 16rpx;
		align-items: center;
	}

	.ai-title-wrap {
		display: flex;
		align-items: center;
		gap: 18rpx;
		min-width: 0;
	}

	.ai-icon {
		width: 76rpx;
		height: 76rpx;
		border-radius: 22rpx;
		background: linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(34, 197, 94, 0.22));
		color: #e0f2fe;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26rpx;
		font-weight: 900;
		border: 1px solid rgba(125, 211, 252, 0.42);
		box-shadow: 0 0 36rpx rgba(56, 189, 248, 0.22);
		flex-shrink: 0;
	}

	.ai-kicker {
		color: #67e8f9;
		font-size: 20rpx;
		font-weight: 900;
		letter-spacing: 0;
		margin-bottom: 4rpx;
	}

	.ai-title {
		color: #f8fafc;
		font-size: 40rpx;
		font-weight: 900;
	}

	.ai-subtitle {
		margin-top: 6rpx;
		color: rgba(203, 213, 225, 0.82);
		font-size: 25rpx;
	}

	.ai-analyze-btn {
		margin: 0;
		padding: 0 30rpx;
		height: 72rpx;
		line-height: 72rpx;
		border-radius: 18rpx;
		background: linear-gradient(135deg, #22c55e, #0ea5e9);
		color: #fff;
		font-size: 26rpx;
		font-weight: 800;
		border: 1px solid rgba(255, 255, 255, 0.16);
		white-space: nowrap;
		box-shadow: 0 16rpx 34rpx rgba(14, 165, 233, 0.24);
	}

	.ai-chat-btn {
		margin: 0;
		padding: 0 30rpx;
		height: 72rpx;
		line-height: 72rpx;
		border-radius: 18rpx;
		background: linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(8, 145, 178, 0.92));
		color: #ffffff;
		font-size: 26rpx;
		font-weight: 800;
		border: 1px solid rgba(125, 211, 252, 0.38);
		white-space: nowrap;
		box-shadow: 0 16rpx 42rpx rgba(6, 182, 212, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
	}

	.ai-btn-mark {
		font-size: 28rpx;
		color: #fef08a;
	}

	.ai-signal-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-bottom: 24rpx;
	}

	.ai-signal-pill {
		display: flex;
		align-items: center;
		gap: 10rpx;
		min-height: 46rpx;
		padding: 0 18rpx;
		border-radius: 999rpx;
		background: rgba(15, 23, 42, 0.58);
		border: 1px solid rgba(125, 211, 252, 0.16);
		color: rgba(226, 232, 240, 0.82);
		font-size: 22rpx;
	}

	.ai-signal-dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		background: #22c55e;
		box-shadow: 0 0 18rpx rgba(34, 197, 94, 0.95);
	}

	.ai-analyze-btn:disabled {
		background: #334155;
		color: rgba(226, 232, 240, 0.58);
	}

	.ai-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 18rpx;
		margin-bottom: 22rpx;
	}

	.ai-stat {
		background: rgba(15, 23, 42, 0.68);
		border: 1px solid rgba(125, 211, 252, 0.12);
		border-radius: 18rpx;
		padding: 22rpx;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	.ai-label {
		display: block;
		color: rgba(148, 163, 184, 0.72);
		font-size: 22rpx;
		margin-bottom: 8rpx;
	}

	.ai-value {
		display: block;
		color: #e2e8f0;
		font-size: 30rpx;
		font-weight: 800;
	}

	.ai-value.success {
		color: #22c55e;
	}

	.ai-value.danger {
		color: #ef4444;
	}

	.ai-reason {
		color: rgba(226, 232, 240, 0.82);
		font-size: 26rpx;
		line-height: 1.6;
		background: rgba(2, 6, 23, 0.28);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 14rpx;
		padding: 20rpx 22rpx;
	}

	.ai-chat-overlay {
		position: fixed;
		inset: 0;
		background:
			linear-gradient(135deg, rgba(2, 6, 23, 0.88), rgba(8, 47, 73, 0.74)),
			rgba(2, 6, 23, 0.78);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		padding: 32rpx;
	}

	.ai-chat-modal {
		width: 100%;
		max-width: 1100rpx;
		height: min(86vh, 1040rpx);
		background:
			radial-gradient(circle at 12% 4%, rgba(34, 211, 238, 0.22), transparent 34%),
			radial-gradient(circle at 90% 2%, rgba(245, 158, 11, 0.13), transparent 30%),
			linear-gradient(145deg, rgba(15, 23, 42, 0.99), rgba(2, 6, 23, 0.97));
		border: 1px solid rgba(125, 211, 252, 0.32);
		border-radius: 28rpx;
		padding: 30rpx;
		position: relative;
		box-shadow: 0 40rpx 120rpx rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.ai-chat-modal::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4rpx;
		background: linear-gradient(90deg, #38bdf8, #22c55e, #f59e0b);
	}

	.ai-chat-orbit {
		position: absolute;
		border-radius: 50%;
		border: 1px solid rgba(125, 211, 252, 0.1);
		pointer-events: none;
	}

	.ai-chat-orbit.one {
		width: 360rpx;
		height: 360rpx;
		right: -120rpx;
		top: -130rpx;
	}

	.ai-chat-orbit.two {
		width: 220rpx;
		height: 220rpx;
		left: -80rpx;
		bottom: 80rpx;
	}

	.ai-chat-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20rpx;
		margin-bottom: 20rpx;
		position: relative;
		z-index: 1;
	}

	.ai-chat-head-actions {
		display: flex;
		align-items: center;
		gap: 12rpx;
		flex-shrink: 0;
	}

	.ai-chat-close {
		width: 64rpx;
		height: 64rpx;
		border-radius: 18rpx;
		background: rgba(148, 163, 184, 0.16);
		color: #e2e8f0;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		border: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 34rpx;
	}

	.ai-chat-clear {
		margin: 0;
		height: 64rpx;
		line-height: 64rpx;
		border-radius: 18rpx;
		background: rgba(15, 23, 42, 0.78);
		color: #93c5fd;
		border: 1px solid rgba(147, 197, 253, 0.18);
		font-size: 24rpx;
		padding: 0 22rpx;
	}

	.ai-chat-kicker {
		color: #67e8f9;
		font-size: 20rpx;
		font-weight: 900;
		letter-spacing: 0;
		margin-bottom: 6rpx;
	}

	.ai-chat-title {
		color: #f8fafc;
		font-size: 46rpx;
		font-weight: 900;
		margin-bottom: 8rpx;
	}

	.ai-chat-tip {
		color: rgba(148, 163, 184, 0.78);
		font-size: 24rpx;
	}

	.ai-chat-metrics {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14rpx;
		margin-bottom: 16rpx;
	}

	.ai-chat-metric {
		background: rgba(15, 23, 42, 0.72);
		border: 1px solid rgba(125, 211, 252, 0.16);
		border-radius: 18rpx;
		padding: 18rpx 20rpx;
	}

	.metric-label {
		display: block;
		color: rgba(148, 163, 184, 0.72);
		font-size: 21rpx;
		margin-bottom: 6rpx;
	}

	.metric-value {
		display: block;
		color: #e0f2fe;
		font-size: 28rpx;
		font-weight: 900;
	}

	.ai-chat-quick-row {
		position: relative;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-bottom: 18rpx;
	}

	.ai-chat-quick {
		margin: 0;
		min-height: 54rpx;
		line-height: 54rpx;
		border-radius: 999rpx;
		background: rgba(8, 47, 73, 0.72);
		color: #bae6fd;
		border: 1px solid rgba(125, 211, 252, 0.22);
		font-size: 23rpx;
		padding: 0 20rpx;
	}

	.ai-chat-quick::after,
	.ai-chat-send::after {
		border: none;
	}

	.ai-chat-quick[disabled],
	.ai-chat-quick:disabled {
		background: rgba(8, 47, 73, 0.58) !important;
		color: rgba(186, 230, 253, 0.62) !important;
		border-color: rgba(125, 211, 252, 0.14) !important;
		opacity: 1;
	}

	.ai-chat-messages {
		position: relative;
		z-index: 1;
		flex: 1;
		min-height: 0;
		background:
			linear-gradient(rgba(148, 163, 184, 0.045) 1px, transparent 1px),
			linear-gradient(90deg, rgba(148, 163, 184, 0.045) 1px, transparent 1px),
			rgba(2, 6, 23, 0.42);
		background-size: 48rpx 48rpx;
		border: 1px solid rgba(148, 163, 184, 0.16);
		border-radius: 22rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
		box-sizing: border-box;
	}

	.ai-chat-empty {
		color: rgba(148, 163, 184, 0.78);
		font-size: 26rpx;
		line-height: 1.6;
		padding: 28rpx 4rpx;
		text-align: center;
	}

	.ai-chat-empty-title {
		color: #e0f2fe;
		font-size: 30rpx;
		font-weight: 900;
		margin-bottom: 8rpx;
	}

	.ai-chat-empty-text {
		color: rgba(148, 163, 184, 0.8);
		font-size: 24rpx;
	}

	.ai-chat-message {
		display: flex;
		flex-direction: column;
		margin-bottom: 22rpx;
	}

	.ai-chat-message.user {
		align-items: flex-end;
	}

	.ai-chat-message.assistant {
		align-items: flex-start;
	}

	.ai-chat-bubble {
		max-width: 82%;
		border-radius: 22rpx;
		padding: 20rpx 24rpx;
		font-size: 27rpx;
		line-height: 1.62;
		white-space: pre-wrap;
		box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.18);
	}

	.ai-chat-message.user .ai-chat-bubble {
		background: linear-gradient(135deg, #0ea5e9, #16a34a);
		color: #ffffff;
		border-bottom-right-radius: 6rpx;
		box-shadow: 0 14rpx 34rpx rgba(14, 165, 233, 0.22);
	}

	.ai-chat-message.assistant .ai-chat-bubble {
		background: rgba(15, 23, 42, 0.92);
		color: rgba(226, 232, 240, 0.94);
		border: 1px solid rgba(125, 211, 252, 0.18);
		border-bottom-left-radius: 6rpx;
	}

	.ai-chat-time {
		margin-top: 8rpx;
		color: rgba(148, 163, 184, 0.58);
		font-size: 20rpx;
	}

	.ai-chat-form {
		position: relative;
		z-index: 1;
		display: flex;
		gap: 16rpx;
		background: rgba(15, 23, 42, 0.56);
		border: 1px solid rgba(125, 211, 252, 0.12);
		border-radius: 22rpx;
		padding: 12rpx;
	}

	.ai-chat-input {
		flex: 1;
		height: 72rpx;
		border-radius: 18rpx;
		background: rgba(2, 6, 23, 0.58);
		border: 1px solid rgba(125, 211, 252, 0.2);
		color: #f8fafc;
		padding: 0 22rpx;
		font-size: 26rpx;
	}

	.ai-chat-send {
		margin: 0;
		height: 72rpx;
		line-height: 72rpx;
		border-radius: 18rpx;
		background: linear-gradient(135deg, #22c55e, #0ea5e9);
		color: #fff;
		font-weight: 800;
		padding: 0 38rpx;
		box-shadow: 0 14rpx 30rpx rgba(34, 197, 94, 0.22);
	}

	.ai-chat-send[disabled],
	.ai-chat-send:disabled {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.62), rgba(14, 165, 233, 0.62)) !important;
		color: rgba(255, 255, 255, 0.72) !important;
		opacity: 1;
	}

	.evacuation-section {
		position: relative;
		z-index: 1;
		margin-bottom: 32rpx;
	}

	.evacuation-btn-wrap {
		text-align: center;
	}

	.btn-ripple-wrap {
		position: relative;
		display: inline-block;
	}

	.btn-ripple {
		position: absolute;
		inset: -8rpx;
		border-radius: 120rpx;
		border: 2rpx solid rgba(239, 68, 68, 0.4);
		animation: rippleOut 2s infinite;
		pointer-events: none;
	}

	.btn-ripple.delay {
		animation-delay: 0.7s;
	}

	@keyframes rippleOut {
		0% {
			transform: scale(0.95);
			opacity: 0.8;
		}
		100% {
			transform: scale(1.12);
			opacity: 0;
		}
	}

	.evacuation-btn {
		position: relative;
		background: linear-gradient(135deg, #dc2626, #b91c1c);
		color: #fff;
		border-radius: 100rpx;
		padding: 32rpx 80rpx;
		font-size: 36rpx;
		font-weight: 800;
		border: 2rpx solid rgba(239, 68, 68, 0.4);
		letter-spacing: 6rpx;
		overflow: hidden;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.btn-icon {
		font-size: 36rpx;
	}

	.evacuation-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
		transition: left 0.6s;
	}

	.evacuation-btn:active {
		transform: scale(0.95);
		box-shadow: 0 0 50rpx rgba(239, 68, 68, 0.5);
	}

	.evacuation-btn:active::before {
		left: 100%;
	}

	.evacuation-btn:disabled {
		background: linear-gradient(135deg, #374151, #1f2937);
		border-color: rgba(255, 255, 255, 0.1);
		color: #6b7280;
	}

	.evacuation-btn.sending {
		animation: btnPulse 1s infinite alternate;
	}

	@keyframes btnPulse {
		0% { opacity: 0.7; }
		100% { opacity: 1; }
	}

	.evacuation-hint {
		margin-top: 16rpx;
		font-size: 24rpx;
		color: rgba(239, 68, 68, 0.6);
	}

	/* ========== 搴曢儴 ========== */
	.footer {
		position: relative;
		z-index: 1;
		background: linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(31, 41, 55, 0.6));
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 24rpx;
		padding: 28rpx 32rpx;
	}

	.footer-grid {
		display: flex;
		justify-content: space-around;
		gap: 20rpx;
	}

	.footer-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
	}

	.footer-label {
		font-size: 22rpx;
		color: rgba(148, 163, 184, 0.4);
		letter-spacing: 2rpx;
		text-transform: uppercase;
	}

	.footer-val {
		font-size: 24rpx;
		color: rgba(148, 163, 184, 0.6);
	}

	.footer-val.accent {
		background: linear-gradient(135deg, #7dd3fc, #38bdf8);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		font-weight: 600;
	}

	/* ========== 寮圭獥 ========== */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(8rpx);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		animation: overlayIn 0.3s ease;
		padding: 40rpx;
	}

	@keyframes overlayIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal-container {
		background: linear-gradient(135deg, #111827, #1e293b);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 32rpx;
		width: 100%;
		max-width: 680rpx;
		position: relative;
		overflow: hidden;
		animation: modalIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		box-shadow: 0 40rpx 100rpx rgba(0, 0, 0, 0.5);
	}

	@keyframes modalIn {
		from {
			transform: scale(0.85) translateY(40rpx);
			opacity: 0;
		}
		to {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}

	.modal-bg-decor {
		position: absolute;
		top: -60%;
		left: -30%;
		width: 160%;
		height: 160%;
		background: radial-gradient(ellipse at center, rgba(239, 68, 68, 0.1) 0%, transparent 60%);
		pointer-events: none;
	}

	.modal-header {
		position: relative;
		padding: 48rpx 44rpx 24rpx;
		text-align: center;
	}

	.modal-warn-icon {
		font-size: 64rpx;
		margin-bottom: 16rpx;
		display: block;
		animation: modalWarnPulse 1.5s infinite alternate;
	}

	@keyframes modalWarnPulse {
		0% { transform: scale(1); filter: drop-shadow(0 0 8rpx rgba(239, 68, 68, 0.3)); }
		100% { transform: scale(1.1); filter: drop-shadow(0 0 20rpx rgba(239, 68, 68, 0.6)); }
	}

	.modal-title {
		font-size: 40rpx;
		font-weight: 800;
		color: #f1f5f9;
		letter-spacing: 2rpx;
	}

	.modal-body {
		position: relative;
		padding: 24rpx 44rpx 36rpx;
		text-align: center;
	}

	.modal-desc {
		font-size: 30rpx;
		color: rgba(226, 232, 240, 0.9);
		display: block;
		margin-bottom: 8rpx;
		font-weight: 500;
	}

	.modal-desc-sub {
		font-size: 26rpx;
		color: rgba(148, 163, 184, 0.7);
		display: block;
		margin-bottom: 24rpx;
	}

	.modal-info-box {
		display: flex;
		gap: 16rpx;
		margin-top: 8rpx;
	}

	.modal-info-item {
		flex: 1;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16rpx;
		padding: 24rpx 18rpx;
	}

	.mi-label {
		font-size: 22rpx;
		color: rgba(148, 163, 184, 0.5);
		display: block;
		margin-bottom: 8rpx;
	}

	.mi-value {
		font-size: 28rpx;
		color: #e2e8f0;
		font-weight: 700;
	}

	.text-danger {
		color: #ef4444 !important;
	}

	.modal-footer {
		position: relative;
		display: flex;
		gap: 20rpx;
		padding: 0 44rpx 48rpx;
	}

	.modal-btn {
		flex: 1;
		border-radius: 20rpx;
		padding: 30rpx;
		font-size: 30rpx;
		font-weight: 700;
		border: none;
		transition: all 0.3s ease;
		letter-spacing: 1rpx;
	}

	.modal-btn:active {
		transform: scale(0.96);
	}

	.modal-btn-cancel {
		background: rgba(255, 255, 255, 0.06);
		color: rgba(226, 232, 240, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-btn-cancel:active {
		background: rgba(255, 255, 255, 0.12);
	}

	.modal-btn-confirm {
		background: linear-gradient(135deg, #dc2626, #b91c1c);
		color: #fff;
		border: 1px solid rgba(239, 68, 68, 0.4);
		box-shadow: 0 8rpx 30rpx rgba(220, 38, 38, 0.3);
	}

	.modal-btn-confirm:active {
		box-shadow: 0 4rpx 16rpx rgba(220, 38, 38, 0.4);
	}

	/* ========== 鍘嗗彶璁板綍寮圭獥 ========== */
	.history-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(8rpx);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9998;
		padding: 40rpx;
	}

	.history-container {
		width: 100%;
		max-width: 1200rpx;
		background: linear-gradient(135deg, #111827, #1e293b);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 28rpx;
		box-shadow: 0 40rpx 100rpx rgba(0, 0, 0, 0.5);
		padding: 42rpx;
		position: relative;
	}

	.history-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24rpx;
		margin-bottom: 28rpx;
		padding-right: 82rpx;
	}

	.history-title {
		font-size: 38rpx;
		font-weight: 800;
		color: #f8fafc;
	}

	.history-subtitle {
		margin-top: 6rpx;
		font-size: 24rpx;
		color: rgba(148, 163, 184, 0.72);
	}

	.history-close {
		position: absolute;
		top: 28rpx;
		right: 28rpx;
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		color: #e2e8f0;
		font-size: 42rpx;
		line-height: 58rpx;
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0;
	}

	.history-summary {
		display: flex;
		gap: 16rpx;
		margin-bottom: 24rpx;
	}

	.history-summary-item {
		flex: 1;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16rpx;
		padding: 22rpx 18rpx;
	}

	.history-label {
		display: block;
		font-size: 22rpx;
		color: rgba(148, 163, 184, 0.72);
		margin-bottom: 8rpx;
	}

	.history-value {
		font-size: 34rpx;
		font-weight: 800;
		color: #f8fafc;
	}

	.history-chart {
		height: 300rpx;
		position: relative;
		background: rgba(15, 23, 42, 0.72);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 18rpx;
		margin-bottom: 24rpx;
		overflow: hidden;
	}

	.chart-grid {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
		background-size: 25% 25%;
	}

	.history-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 2;
		overflow: visible;
	}

	.history-polyline {
		fill: none;
		stroke: #38bdf8;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
		filter: drop-shadow(0 0 6rpx rgba(56, 189, 248, 0.55));
	}

	.history-circle {
		fill: #38bdf8;
		stroke: rgba(15, 23, 42, 0.95);
		stroke-width: 0.8;
		vector-effect: non-scaling-stroke;
	}

	.history-empty {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(148, 163, 184, 0.72);
		font-size: 28rpx;
	}

	.history-list {
		max-height: 340rpx;
	}

	.history-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20rpx;
		padding: 18rpx 4rpx;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.history-row-time {
		font-size: 24rpx;
		color: rgba(148, 163, 184, 0.72);
	}

	.history-row-value {
		font-size: 28rpx;
		font-weight: 700;
		color: #f8fafc;
	}

	/* ========== 鍝嶅簲寮?========== */
	@media (max-width: 750rpx) {
		.status-card {
			flex-direction: column;
		}
		.dev-card {
			min-width: 100%;
		}
		.title {
			font-size: 36rpx;
		}
		.dev-value {
			font-size: 56rpx;
		}
		.footer-grid {
			flex-direction: column;
			gap: 16rpx;
		}
		.footer-item {
			flex-direction: row;
			gap: 12rpx;
		}
		.ai-panel-head {
			flex-direction: column;
			align-items: stretch;
		}
		.ai-analyze-btn {
			width: 100%;
		}
		.ai-actions {
			width: 100%;
			flex-direction: column;
		}
		.ai-chat-btn {
			width: 100%;
		}
		.ai-signal-row {
			flex-direction: column;
		}
		.ai-grid {
			grid-template-columns: 1fr;
		}
		.ai-chat-title {
			font-size: 38rpx;
		}
		.ai-chat-metrics {
			grid-template-columns: 1fr;
		}
		.ai-chat-quick-row {
			flex-direction: column;
		}
		.ai-chat-quick {
			width: 100%;
		}
		.ai-chat-form {
			flex-direction: column;
		}
		.ai-chat-modal {
			height: 86vh;
			padding: 24rpx;
		}
		.ai-chat-head {
			flex-direction: column;
			align-items: stretch;
		}
		.ai-chat-head-actions {
			justify-content: flex-end;
		}
		.ai-chat-bubble {
			max-width: 92%;
		}
		.modal-footer {
			flex-direction: column;
		}
	}
</style>
