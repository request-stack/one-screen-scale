/**
 * Vue 3 指令
 *   v-fit-screen    页面级缩放
 *   v-compensate    组件级反缩放补偿（ECharts / Element Plus 等）
 */
import { createScaler } from './core.js'
import { createCompensate } from './compensate.js'

function readOptions(binding) {
  return binding.value && typeof binding.value === 'object' ? binding.value : {}
}

function mountScaler(el, binding) {
  const options = readOptions(binding)
  const scaler = createScaler(el, options)
  scaler.start()
  el.__fitScreenScaler = scaler
  el.__fitScreenOptionsKey = JSON.stringify({
    mode: options.mode || 'contain',
    visualWidth: options.visualWidth,
    origin: options.origin,
    autoResize: options.autoResize,
    injectBaseStyles: options.injectBaseStyles,
    observeContent: options.observeContent,
  })
}

function unmountScaler(el) {
  const scaler = el.__fitScreenScaler
  if (scaler) {
    scaler.stop()
    delete el.__fitScreenScaler
    delete el.__fitScreenOptionsKey
  }
}

// ---- v-fit-screen ----

export const vFitScreen = {
  mounted(el, binding) {
    mountScaler(el, binding)
  },

  updated(el, binding) {
    const options = readOptions(binding)
    const key = JSON.stringify({
      mode: options.mode || 'contain',
      visualWidth: options.visualWidth,
      origin: options.origin,
      autoResize: options.autoResize,
      injectBaseStyles: options.injectBaseStyles,
      observeContent: options.observeContent,
    })

    if (el.__fitScreenOptionsKey !== key) {
      unmountScaler(el)
      mountScaler(el, binding)
      return
    }

    el.__fitScreenScaler?.refresh()
  },

  unmounted(el) {
    unmountScaler(el)
  },
}

function readCompensateOptions(binding) {
  const value = binding?.value
  const modifiers = binding?.modifiers || {}
  const options = value && typeof value === 'object' ? { ...value } : {}
  // v-compensate.resize-canvas / .resizeCanvas / 旧名 .echarts
  if (
    modifiers.resizeCanvas ||
    modifiers['resize-canvas'] ||
    modifiers.echarts ||
    value === 'resize-canvas' ||
    value === 'resizeCanvas' ||
    value === 'echarts'
  ) {
    options.resizeCanvas = options.resizeCanvas || true
  }
  return options
}

function compensateOptionsKey(options) {
  return JSON.stringify({
    resizeCanvas: Boolean(options.resizeCanvas || options.echarts || options.echartsLib),
    hasLib: Boolean(
      (options.echarts && typeof options.echarts === 'object') || options.echartsLib
    ),
    hasOnRefresh: typeof options.onRefresh === 'function',
  })
}

/**
 * v-compensate — 挂在「被页面 scale 搞坏」的第三方组件外包一层。
 *
 * 原理与业务 WinRateChart 手写一致（JS 行内，非纯 CSS）：
 *   transform: scale(inverse); width/height: 100% * pageScale; origin: top left
 *
 * 用法：
 *   <div class="slot"><div v-compensate><Whatever /></div></div>
 *   <div class="slot"><div v-compensate.resize-canvas><Chart /></div></div>
 *
 * `.resize-canvas` / `{ resizeCanvas: true }`：补偿后通知子树 canvas 重绘
 * （探测 ECharts / Chart.js，并派发 one-screen-scale-canvas-resize）。
 */
function mountCompensate(el) {
  const api = createCompensate(el, () => el.__oneScreenCompensateOptions || {})
  el.__oneScreenCompensateApi = api
  el.__oneScreenCompensateKey = compensateOptionsKey(el.__oneScreenCompensateOptions || {})
}

export const vCompensate = {
  mounted(el, binding) {
    el.__oneScreenCompensateOptions = readCompensateOptions(binding)
    mountCompensate(el)
  },

  updated(el, binding) {
    const options = readCompensateOptions(binding)
    const key = compensateOptionsKey(options)
    el.__oneScreenCompensateOptions = options
    // resizeCanvas / 图表库变了才重建监听；onRefresh 每次 refresh 现读
    if (el.__oneScreenCompensateKey !== key) {
      el.__oneScreenCompensateApi?.stop()
      mountCompensate(el)
      return
    }
    el.__oneScreenCompensateApi?.refresh()
  },

  unmounted(el) {
    el.__oneScreenCompensateApi?.stop()
    delete el.__oneScreenCompensateApi
    delete el.__oneScreenCompensateKey
    delete el.__oneScreenCompensateOptions
  },
}

/** 别名，与早期注释里的命名一致 */
export const vFitCompensate = vCompensate
