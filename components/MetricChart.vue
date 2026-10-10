<template>
  <div class="trend-chart">
    <div v-if="!values.length" class="chart-empty"><span class="empty-line"></span><span>等待设备数据，连接后显示真实趋势</span></div>
    <template v-else>
      <div class="chart-scale"><span>{{ maxLabel }} {{ unit }}</span><span>{{ minLabel }} {{ unit }}</span></div>
      <svg viewBox="0 0 600 150" preserveAspectRatio="none" role="img" :aria-label="`${label}历史趋势，共${values.length}条记录`">
        <defs><linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" :stop-color="color" stop-opacity=".24"/><stop offset="100%" :stop-color="color" stop-opacity="0"/></linearGradient></defs>
        <path d="M0 20H600M0 65H600M0 110H600" stroke="#243142" stroke-width="1" stroke-dasharray="3 5"/>
        <path :d="areaPath" :fill="`url(#${gradientId})`"/>
        <polyline :points="points" fill="none" :stroke="color" stroke-width="2.2" vector-effect="non-scaling-stroke"/>
        <circle v-if="lastPoint" :cx="lastPoint.x" :cy="lastPoint.y" r="3.5" :fill="color"/>
      </svg>
      <div class="chart-time"><span>{{ firstTime }}</span><span>最近 {{ values.length }} 次采样</span><span>{{ lastTime }}</span></div>
    </template>
  </div>
</template>
<script>
export default {
  props: { rows: { type: Array, default: () => [] }, label: { type: String, default: '监测数据' }, unit: { type: String, default: '' }, color: { type: String, default: '#53d4ba' }, chartId: { type: String, default: 'metric' } },
  computed: {
    values() { return this.rows.slice(-60).filter(row => Number.isFinite(Number(row.value))); },
    min() { return Math.min(...this.values.map(row => Number(row.value))); },
    max() { return Math.max(...this.values.map(row => Number(row.value))); },
    minLabel() { return Number.isFinite(this.min) ? Number(this.min.toFixed(1)) : '—'; },
    maxLabel() { return Number.isFinite(this.max) ? Number(this.max.toFixed(1)) : '—'; },
    coordinates() { const span = Math.max(this.max - this.min, 2); return this.values.map((row, i) => ({ x: this.values.length === 1 ? 300 : 6 + i / (this.values.length - 1) * 588, y: 105 - (Number(row.value) - this.min) / span * 80 })); },
    points() { return this.coordinates.map(point => `${point.x},${point.y}`).join(' '); },
    areaPath() { const first = this.coordinates[0]; const last = this.lastPoint; return first ? `M${first.x} 140 L${this.coordinates.map(point => `${point.x} ${point.y}`).join(' L')} L${last.x} 140Z` : ''; },
    lastPoint() { return this.coordinates[this.coordinates.length - 1]; },
    firstTime() { return this.values[0]?.time?.slice(11, 19) || ''; },
    lastTime() { return this.values[this.values.length - 1]?.time?.slice(11, 19) || ''; },
    gradientId() { return `trend-gradient-${this.chartId}`; }
  }
};
</script>
<style scoped>
.trend-chart { position: relative; padding: 26px 0 0; min-height: 158px; }
svg { display: block; width: 100%; height: 150px; overflow: visible; }
.chart-scale { position: absolute; inset: 0 0 auto; display: flex; justify-content: space-between; color: #8093a9; font-size: 11px; }
.chart-time { display: flex; justify-content: space-between; color: #728399; font-size: 10px; gap: 8px; margin-top: 8px; font-family: 'Segoe UI', sans-serif; }
.chart-empty { height: 164px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; color: #788b9f; font-size: 12px; border-bottom: 1px dashed #293748; }
.empty-line { width: 65%; height: 1px; background: linear-gradient(90deg, transparent, #415164, transparent); }
</style>
