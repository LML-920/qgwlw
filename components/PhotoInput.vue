<script>
import { h } from 'vue';
export default {
  inheritAttrs: false,
  emits: ['change'],
  render() { return h('input', { ...this.$attrs, type: 'file', onChange: event => this.$emit('change', event) }); }
};
</script>
