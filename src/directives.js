/**
 * Vue 3 指令
 *   v-fit-screen   页面级缩放
 *   v-compensate   组件级反缩放补偿
 */
import { createScaler } from './core.js'

// ---- v-fit-screen ----

export const vFitScreen = {
  mounted(el, binding) {
    const options = binding.value || {}
    const scaler = createScaler(el, options)
    scaler.start()
    el.__fitScreenScaler = scaler
  },

  updated(el, binding) {
    const scaler = el.__fitScreenScaler
    if (scaler) {
      const options = binding.value || {}
      // 简单处理：重新 refresh
      scaler.refresh()
    }
  },

  unmounted(el) {
    const scaler = el.__fitScreenScaler
    if (scaler) {
      scaler.stop()
      delete el.__fitScreenScaler
    }
  }
}
