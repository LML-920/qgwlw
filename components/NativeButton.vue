<script>
import { h } from 'vue';
export default {
  inheritAttrs: false,
  render() { return h('button', { type: 'button', 'data-native-button': '', ...this.$attrs }, this.$slots.default?.()); }
};
</script>
