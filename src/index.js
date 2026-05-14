// ---- 核心（框架无关） ----
export {
  calculateScale,
  applyScale,
  getPageScale,
  getInverseScale,
  createScaler
} from './core.js'

// ---- Vue 指令 ----
export { vFitScreen } from './directives.js'

// ---- Vue Composable ----
export { useFitScreen } from './composables.js'
