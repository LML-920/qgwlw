import { DEFAULT_AVATARS, DEFAULT_EMPLOYEES, EMPLOYEE_STORAGE_KEY, normalizeEmployees, nextEmployeeId, validAvatar } from './personnel.js';

const navigation = [
  { id: 'overview', label: '监控总览', english: 'OVERVIEW', icon: 'grid', description: '人员、环境与现场风险，一屏掌握。' },
  { id: 'personnel', label: '人员监测', english: 'PERSONNEL', icon: 'users', description: '关注每一位作业人员的状态与安全。' },
  { id: 'alarms', label: '报警中心', english: 'ALARM CENTER', icon: 'bell', description: '聚合异常事件，跟踪确认与恢复状态。' },
  { id: 'ai', label: 'AI 研判', english: 'SAFETY INTELLIGENCE', icon: 'spark', description: '让监测数据成为可理解的安全信息。' },
  { id: 'employees', label: '员工管理', english: 'EMPLOYEE MANAGEMENT', icon: 'folder', description: '管理人员档案，建立清晰的作业身份。' },
  { id: 'devices', label: '设备中心', english: 'DEVICE CENTER', icon: 'device', description: '查看基站、头盔与手环的接入关系。' }
];
export default {
  data() {
    return {
      navigation, activePage: 'overview', selectedEmployeeId: 'EMP-001', sidebarOpen: false,
      workers: DEFAULT_EMPLOYEES.map(item => ({ ...item })), avatars: DEFAULT_AVATARS,
      searchText: '', teamFilter: '', statusFilter: '', alarmFilter: 'all',
      selectedTrend: 'heartRate', environmentTrend: 'temp', clockNow: Date.now(), clockTimer: null,
      employeeEditorOpen: false, employeeDraft: null, editorError: '', photoLoading: false,
      toastMessage: '', toastTimer: null, alarmEvents: [], alarmStorageKey: 'mine-safe-alarms-v1',
      sensorTimestamp: 0, historyRange: 'recent'
    };
  },
  computed: {
    currentPage() { return this.navigation.find(page => page.id === this.activePage) || this.navigation.find(page => page.id === 'overview'); },
    clockText() { return new Date(this.clockNow).toLocaleTimeString('zh-CN', { hour12: false }); },
    dateText() { return new Date(this.clockNow).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '.'); },
    selectedEmployee() { return this.workers.find(worker => worker.id === this.selectedEmployeeId) || this.workers[0]; },
    boundEmployee() { return this.workers.find(worker => worker.device === 'ESP32S3'); },
    hasReadings() { return Boolean(this.updateTime); },
    staleReadings() { return this.sensorTimestamp > 0 && this.clockNow - this.sensorTimestamp > 30000; },
    readableCount() { return this.isOnenetConnected && this.hasReadings && !this.staleReadings ? 1 : 0; },
    pendingCount() { return this.alarmEvents.filter(event => !event.acknowledged).length; },
    riskLabel() { return !this.hasReadings ? '等待数据' : this.isAlarm ? '发现异常' : this.staleReadings || !this.isOnenetConnected ? '待核实' : '未见阈值异常'; },
    overviewWorkers() { return [this.boundEmployee, ...this.workers.filter(worker => !worker.device)].filter(Boolean).slice(0, 2); },
    teams() { return [...new Set(this.workers.map(worker => worker.team))]; },
    filteredWorkers() {
      const search = this.searchText.trim().toLowerCase();
      return this.workers.filter(worker => (!search || `${worker.name} ${worker.id} ${worker.role} ${worker.team}`.toLowerCase().includes(search)) && (!this.teamFilter || worker.team === this.teamFilter) && (!this.statusFilter || (this.statusFilter === 'bound' ? worker.device : !worker.device)));
    },
    selectedHasReadings() { return Boolean(this.selectedEmployee?.device && this.hasReadings); },
    selectedMetrics() {
      return [
        { key: 'heartRate', label: '心率', unit: 'bpm', icon: 'heart', color: '#fb8d9a', value: this.heartRate },
        { key: 'bloodOxygen', label: '血氧饱和度', unit: '%', icon: 'droplet', color: '#78b6ee', value: this.bloodOxygen },
        { key: 'temp', label: '环境温度', unit: '℃', icon: 'temp', color: '#efbb74', value: this.temp },
        { key: 'humi', label: '环境湿度', unit: '%', icon: 'droplet', color: '#7ad8d3', value: this.humi },
        { key: 'MQ2', label: '气体监测 · MQ2', unit: '原始读数', icon: 'gas', color: '#aa9ae5', value: this.MQ2 },
        { key: 'MQ7', label: '气体监测 · MQ7', unit: '原始读数', icon: 'gas', color: '#94bca6', value: this.MQ7 }
      ];
    },
    trendMetric() { return this.selectedMetrics.find(metric => metric.key === this.selectedTrend) || this.selectedMetrics[0]; },
    trendRows() { const rows = this.hasReadings ? this.historyRecords[this.selectedTrend] || [] : []; return ['heartRate', 'bloodOxygen'].includes(this.selectedTrend) ? rows.filter(row => Number(row.value) > 0) : rows; },
    selectedTrendRows() { return this.selectedHasReadings ? this.trendRows : []; },
    recentEvents() { return this.hasReadings ? this.buildEventHistory().slice(-5).reverse() : []; },
    filteredAlarms() { return this.alarmEvents.filter(event => this.alarmFilter === 'all' || (this.alarmFilter === 'pending' ? !event.acknowledged : !event.active)).slice().reverse(); },
    recentAlarms() { return this.alarmEvents.slice(-3).reverse(); },
    activeAlarmSpecs() {
      if (!this.hasReadings) return [];
      return [
        { key: 'temp', label: '环境温度异常', detail: `温度 ${this.temp} ℃`, active: Number(this.temp) >= 40, level: 'warning' },
        { key: 'heartRate', label: '心率异常', detail: `心率 ${this.heartRate} bpm`, active: Number(this.heartRate) > 0 && (Number(this.heartRate) < 50 || Number(this.heartRate) > 120), level: 'warning' },
        { key: 'bloodOxygen', label: '血氧偏低', detail: `血氧 ${this.bloodOxygen} %`, active: Number(this.bloodOxygen) > 0 && Number(this.bloodOxygen) < 90, level: 'warning' },
        { key: 'MQ2', label: 'MQ2 读数超阈值', detail: `原始读数 ${this.MQ2}`, active: Number(this.MQ2) >= 60, level: 'danger' },
        { key: 'MQ7', label: 'MQ7 读数超阈值', detail: `原始读数 ${this.MQ7}`, active: Number(this.MQ7) >= 60, level: 'danger' },
        { key: 'fall', label: '检测到跌倒', detail: '人员姿态异常，请核查现场', active: String(this.sstatus) === '1', level: 'danger' },
        { key: 'help', label: '人员主动求助', detail: '已收到设备求助信号', active: String(this.help) === '1', level: 'danger' }
      ].filter(item => item.active);
    },
    aiRiskText() { return { safe: '低风险', watch: '需关注', danger: '高风险' }[this.aiDecision?.riskLevel] || '等待研判'; },
    overviewSubtitle() { return this.isAlarm ? '当前存在异常指标，请优先核查报警人员。' : '连接作业人员、现场终端与智能研判，让安全状态清晰可见。'; }
  },
  onLoad() {
    try { const stored = uni.getStorageSync(EMPLOYEE_STORAGE_KEY); if (stored) this.workers = normalizeEmployees(stored); } catch { this.notify('员工档案读取失败，已加载默认档案'); }
    try {
      const stored = uni.getStorageSync(this.alarmStorageKey);
      if (Array.isArray(stored)) this.alarmEvents = stored.filter(event => event && typeof event.id === 'string' && typeof event.label === 'string').slice(-200);
    } catch { this.alarmEvents = []; }
    this.clockTimer = setInterval(() => { this.clockNow = Date.now(); }, 1000);
  },
  onUnload() { clearInterval(this.clockTimer); clearTimeout(this.toastTimer); },
  methods: {
    captureSensorTimestamp(properties) {
      const timestamps = properties.map(item => item.time || item.timestamp || item.update_time).map(value => {
        if (!value) return 0;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? (numeric < 100000000000 ? numeric * 1000 : numeric) : Date.parse(value);
      }).filter(value => Number.isFinite(value) && value > 0 && value <= Date.now() + 60000);
      this.sensorTimestamp = timestamps.length ? Math.max(...timestamps) : 0;
    },
    navigate(page) { this.activePage = page; this.sidebarOpen = false; this.searchText = ''; this.teamFilter = ''; this.statusFilter = ''; },
    openEmployee(worker) { this.selectedEmployeeId = worker.id; this.navigate('personnel'); },
    workerState(worker) {
      if (!worker.device) return { label: '未绑定设备', tone: 'muted' };
      if (!this.hasReadings) return { label: '等待设备数据', tone: 'warning' };
      if (this.staleReadings) return { label: '数据已过期', tone: 'warning' };
      if (!this.isOnenetConnected) return { label: '云端连接中断', tone: 'warning' };
      return this.isAlarm ? { label: '异常待核查', tone: 'danger' } : { label: '云端数据可读', tone: 'success' };
    },
    displayMetric(worker, value, unit = '') { return worker?.device && this.hasReadings && Number(value) > 0 ? `${value}${unit}` : '—'; },
    metricValue(metric, selected = false) { return (selected ? this.selectedHasReadings : this.hasReadings) && metric.value !== '' && metric.value != null && (!['heartRate', 'bloodOxygen'].includes(metric.key) || Number(metric.value) > 0) ? metric.value : '—'; },
    workerLocation(worker) { return worker.device && this.hasReadings ? this.areaText : '暂无区域记录'; },
    notify(message) { this.toastMessage = message; clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { this.toastMessage = ''; }, 4000); },
    editEmployee(worker = null) {
      if (!worker && this.workers.length >= 100) { this.notify('当前最多支持 100 份员工档案'); return; }
      this.employeeDraft = worker ? { ...worker } : { id: nextEmployeeId(this.workers), name: '', role: '作业人员', team: '采掘一班', avatar: this.avatars[this.workers.length % 4], device: '' };
      this.editorError = ''; this.employeeEditorOpen = true;
    },
    closeEmployeeEditor() { this.employeeEditorOpen = false; this.employeeDraft = null; this.editorError = ''; },
    saveEmployee() {
      const draft = this.employeeDraft;
      if (!draft || this.photoLoading) return;
      if (!draft.name.trim()) { this.editorError = '请填写员工姓名'; return; }
      if (!draft.team.trim()) { this.editorError = '请填写所属班组'; return; }
      if (!validAvatar(draft.avatar)) { this.editorError = '请选择有效的头像'; return; }
      const next = this.workers.some(worker => worker.id === draft.id) ? this.workers.map(worker => worker.id === draft.id ? { ...draft } : worker) : [...this.workers, { ...draft }];
      const normalized = normalizeEmployees(next);
      try { uni.setStorageSync(EMPLOYEE_STORAGE_KEY, normalized); } catch { this.editorError = '浏览器存储空间不足，档案未保存。请缩小照片后重试。'; return; }
      this.workers = normalized;
      this.closeEmployeeEditor();
      this.notify('员工档案已保存到当前浏览器');
    },
    async uploadPortrait(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = '';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { this.editorError = '请上传 JPG、PNG 或 WebP 图片'; return; }
      if (file.size > 5 * 1024 * 1024) { this.editorError = '照片不能超过 5 MB'; return; }
      const draft = this.employeeDraft;
      this.photoLoading = true; this.editorError = '';
      try {
        const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = dataUrl; });
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 320;
        const ctx = canvas.getContext('2d'); const size = Math.min(image.width, image.height);
        ctx.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 320, 320);
        if (this.employeeEditorOpen && this.employeeDraft === draft) draft.avatar = canvas.toDataURL('image/jpeg', .86);
      } catch { this.editorError = '无法读取这张照片，请换一张图片重试'; }
      finally { this.photoLoading = false; }
    },
    recordAlarmEvents() {
      const specs = this.activeAlarmSpecs;
      const keys = new Set(specs.map(item => item.key));
      this.alarmEvents.forEach(event => { if (event.active && !keys.has(event.key)) { event.active = false; event.recoveredAt = this.updateTime; } });
      specs.forEach(spec => {
        if (!this.alarmEvents.some(event => event.active && event.key === spec.key)) this.alarmEvents.push({ ...spec, id: `${spec.key}-${Date.now()}-${this.alarmEvents.length}`, time: this.updateTime, employeeId: this.boundEmployee?.id || 'EMP-001', employeeName: this.boundEmployee?.name || '01 号员工', areaText: this.areaText, acknowledged: false, active: true });
      });
      this.alarmEvents = this.alarmEvents.slice(-200);
      this.saveAlarmEvents();
    },
    saveAlarmEvents() { try { uni.setStorageSync(this.alarmStorageKey, this.alarmEvents); } catch { /* Monitoring continues if browser storage is full. */ } },
    acknowledgeAlarm(event) { event.acknowledged = true; event.acknowledgedAt = this.formatTime(new Date()); this.saveAlarmEvents(); this.notify('已记录本次报警确认'); },
    analyzeCurrentEmployee() { if (!this.hasReadings || !this.isOnenetConnected || this.staleReadings) { this.notify('请等待设备提供有效数据后再进行 AI 研判'); return; } this.analyzeDataWithXiaomi(true); },
    async toggleFullscreen() {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { this.notify('当前浏览器不支持全屏显示'); }
    },
    async refreshTelemetry() { if (this.isFetchingOnenet) return; await this.fetchDevData(); },
    openMetricHistory(key) { this.openHistory(key); },
    exportEmployees() {
      const data = this.workers.map(({ avatar, ...worker }) => ({ ...worker, avatar: avatar.startsWith('data:') ? '已上传照片（仅保存在本浏览器）' : avatar }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = '矿安智联-员工档案.json'; anchor.click(); URL.revokeObjectURL(url);
    }
  }
};
