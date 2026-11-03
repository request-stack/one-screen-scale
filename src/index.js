// ---- 核心（框架无关） ----
export {
  calculateScale,
  applyScale,
  getPageScale,
  getInverseScale,
  createScaler,
  applyBaseStyles,
  removeBaseStyles,
  applyCompensateStyles,
  removeCompensateStyles,
  ensureBaseStyleSheet,
  BASE_CLASS,
  SCALE_CHANGE_EVENT,
} from './core.js'

// ---- 组件反缩放补偿（仅抵消页面 scale） ----
export {
  resolvePageScale,
  applyCompensateTransform,
  clearCompensateTransform,
  resizeCanvasUnder,
  resizeEchartsUnder,
  createCompensate,
  setCompensateEcharts,
  CANVAS_RESIZE_EVENT,
} from './compensate.js'

// ---- Vue 指令 ----
export { vFitScreen, vCompensate, vFitCompensate } from './directives.js'

// ---- Vue Composable ----
export { useFitScreen } from './composables.js'
