<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(path, index) in paths" :key="index" :d="path" />
  </svg>
</template>
<script>
const icons = {
  shield: ['M12 3 3.5 6.5v5c0 5 8.5 9.5 8.5 9.5s8.5-4.5 8.5-9.5v-5L12 3Z', 'm8 12 2.7 2.7L16 9'],
  grid: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M17 4a4 4 0 0 1 0 7M22 21v-2a4 4 0 0 0-3-3.87'],
  user: ['M20 21v-2a7 7 0 0 0-14 0v2', 'M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4'],
  spark: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z', 'M20 2v4M18 4h4'],
  device: ['M5 3h14v14H5zM9 21h6M12 17v4M8 7h8M8 11h5'],
  settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'm9 3-.5 3-2 .9L4 6l-2 3 2 2v2l-2 2 2 3 2.5-.9 2 .9.5 3h6l.5-3 2-.9 2.5.9 2-3-2-2v-2l2-2-2-3-2.5.9-2-.9L15 3H9Z'],
  arrow: ['M5 12h14m-5-5 5 5-5 5'],
  back: ['m15 5-7 7 7 7'],
  chevron: ['m9 5 7 7-7 7'],
  down: ['m6 9 6 6 6-6'],
  search: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15', 'm16 16 5 5'],
  plus: ['M12 5v14M5 12h14'],
  close: ['m6 6 12 12M6 18 18 6'],
  refresh: ['M20 7v5h-5M4 17v-5h5', 'M6 7a7 7 0 0 1 11-2l3 3M4 16l3 3a7 7 0 0 0 11-2'],
  expand: ['M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5'],
  pin: ['M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6'],
  heart: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z', 'M3 12h4l2-4 3 8 2-4h7'],
  temp: ['M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z', 'M12 8v10'],
  droplet: ['M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z'],
  gas: ['M4 16h12a4 4 0 1 0-3.5-6A5 5 0 1 0 4 16ZM7 20h1M12 20h1M17 20h1'],
  pulse: ['M2 12h5l3-8 4 16 3-8h5'],
  clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 7v5l3 2'],
  link: ['m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0'],
  helmet: ['M4 15v-3a8 8 0 0 1 16 0v3M2 15h20v4H2zM12 4v6'],
  watch: ['M6 7h12v10H6zM9 7V2h6v5M9 17v5h6v-5M12 9v3l2 1'],
  upload: ['M12 16V3m-4 4 4-4 4 4M4 15v6h16v-6'],
  edit: ['m16 3 5 5-12 12-6 1 1-6L16 3Z', 'm13 6 5 5'],
  check: ['m5 12 4 4L19 6'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 11v6M12 7h.01'],
  download: ['M12 3v13m-4-4 4 4 4-4M4 17v4h16v-4'],
  send: ['m22 2-7 20-4-9-9-4L22 2Z', 'm22 2-11 11'],
  exit: ['M9 3H3v18h6M10 12h11m-4-4 4 4-4 4'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  chart: ['M4 3v17h17M8 15l4-5 4 3 5-8'],
  folder: ['M3 7V4h6l3 3h9v13H3V7Z'],
  wifi: ['M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M9 16a5 5 0 0 1 6 0M12 20h.01']
};
export default { props: { name: { type: String, default: 'shield' } }, computed: { paths() { return icons[this.name] || icons.shield; } } };
</script>
<style scoped>svg { width: 20px; height: 20px; flex-shrink: 0; display: inline-block; vertical-align: middle; }</style>
