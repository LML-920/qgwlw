<template>
  <div class="mine-map">
    <div class="mine-map-viewport">
      <div class="mine-map-scene" :style="{ transform: `scale(${zoom})` }">
        <img class="mine-map-background" src="/static/mine-map.png" alt="四个矿洞通过井下巷道连接的概念示意图" />
        <div class="mine-map-shade"></div>
        <svg class="mine-map-routes" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><path d="M500 570L500 340L260 340L260 160M500 340L760 340L760 160M260 340L260 475M760 340L760 475" fill="none" stroke="#4aacf4" stroke-width="2" stroke-dasharray="5 8" opacity=".45"/></svg>
        <NativeButton v-for="region in regions" :key="region.id" :class="['mine-region', { selected: selectedArea === region.id, occupied: recordedArea === region.id }]" :style="{ left: region.x + '%', top: region.y + '%' }" @click="selectedArea = region.id" :aria-label="`${region.name}，${recordedArea === region.id ? worker.name + '最近记录在此' : '暂无人员记录'}`">
          <span class="mine-region-code">ZONE / 0{{ region.id }}</span><strong>{{ region.name }}</strong><small><i :class="{ lit: recordedArea === region.id }"></i>{{ recordedArea === region.id ? '最近记录 1 人' : '暂无人员记录' }}</small>
        </NativeButton>
        <NativeButton class="mine-command-post" @click="commandOpen = !commandOpen" :aria-expanded="commandOpen" aria-label="查看井口指挥所"><span class="command-post-icon"><AppIcon name="device"/></span><span><strong>指挥所</strong><small>P4 基站 · 数据网页端</small></span><i :class="{ connected }"></i></NativeButton>
        <NativeButton v-if="recordedArea !== null" :class="['mine-worker-pin', { alarm, stale }]" :style="workerPosition" @click="$emit('employee', worker)" :aria-label="`查看${worker.name}，${locationText}`"><span class="mine-worker-photo"><img :src="worker.avatar" :alt="worker.name"/><i></i></span><span class="mine-worker-label"><strong>{{ worker.name }}</strong><small>{{ stale ? '上次记录' : 'NFC 最近位置' }}</small></span></NativeButton>
      </div>
      <div class="map-compass"><span>N</span><svg viewBox="0 0 30 40" aria-hidden="true"><path d="M15 2L25 31L15 25L5 31Z" fill="#bdd7ed"/><path d="M15 2V25L25 31Z" fill="#4d7797"/></svg></div>
      <div class="mine-map-legend"><span><i class="legend-person"></i>人员位置记录</span><span><i class="legend-alarm"></i>异常待核查</span><span><i class="legend-station"></i>矿安基站</span></div>
      <div class="map-zoom"><NativeButton @click="zoom = Math.min(1.6, zoom + .15)" :disabled="zoom >= 1.6" aria-label="放大矿洞地图"><AppIcon name="plus"/></NativeButton><NativeButton @click="zoom = Math.max(1, zoom - .15)" :disabled="zoom <= 1" aria-label="缩小矿洞地图"><span>−</span></NativeButton><NativeButton @click="zoom = 1" aria-label="复位矿洞地图"><AppIcon name="expand"/></NativeButton></div>
      <div class="map-concept-note">矿洞区域示意 · 非真实矿区地图</div>
      <div v-if="commandOpen" class="map-command-detail"><div><strong><AppIcon name="shield"/>井口指挥所</strong><NativeButton @click="commandOpen = false" aria-label="关闭指挥所信息"><AppIcon name="close"/></NativeButton></div><p>现场汇聚 · 云端监测 · 辅助研判</p><NativeButton @click="$emit('navigate', 'devices')"><AppIcon name="device"/><span><strong>P4 基站端</strong><small>头盔与手环数据汇聚</small></span><AppIcon name="arrow"/></NativeButton><NativeButton @click="$emit('navigate', 'personnel')"><AppIcon name="grid"/><span><strong>数据网页端</strong><small>人员监测与矿洞区域记录</small></span><AppIcon name="arrow"/></NativeButton></div>
    </div>
    <div class="mine-map-detail"><span class="map-area-summary"><AppIcon name="pin"/><strong>{{ selectedRegion.name }}</strong><span>{{ recordedArea === selectedArea ? worker.name + ' · 最近记录在此' : '暂无人员记录' }}</span></span><small>{{ recordedArea === null ? '等待有效 NFC 区域数据' : locationText + (stale ? ' · 上次记录' : ' · NFC 区域记录') }}</small></div>
  </div>
</template>
<script>
import AppIcon from './AppIcon.vue';
import NativeButton from './NativeButton.vue';
export default {
  components: { AppIcon, NativeButton },
  emits: ['employee', 'navigate'],
  props: { worker: { type: Object, required: true }, area: { default: '' }, hasReadings: Boolean, stale: Boolean, alarm: Boolean, connected: Boolean },
  data() { return { zoom: 1, commandOpen: false, selectedArea: 1, regions: [{ id: 1, name: '一号矿洞', x: 24, y: 22 }, { id: 2, name: '二号矿洞', x: 75, y: 22 }, { id: 3, name: '三号矿洞', x: 24, y: 69 }, { id: 4, name: '四号矿洞', x: 75, y: 69 }] }; },
  computed: {
    recordedArea() { const value = String(this.area); return this.hasReadings && /^[0-4]$/.test(value) ? Number(value) : null; },
    selectedRegion() { return this.regions.find(region => region.id === this.selectedArea); },
    locationText() { return this.recordedArea === 0 ? '矿洞外 / 井口区域' : this.regions.find(region => region.id === this.recordedArea)?.name || '暂无区域记录'; },
    workerPosition() { const region = this.regions.find(item => item.id === this.recordedArea); return { left: `${region ? region.x + 6 : 50}%`, top: `${region ? region.y + 16 : 75}%` }; }
  },
  watch: { recordedArea: { immediate: true, handler(value) { if (value > 0) this.selectedArea = value; } } }
};
</script>
