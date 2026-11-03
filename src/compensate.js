/**
 * 组件级反缩放补偿（与业务 WinRateChart 手写公式一致）：
 *   transform: scale(inverse); width/height: 100% * pageScale; origin: top left
 *
 * 只抵消页面 v-fit-screen 的 scale；不处理浏览器 Ctrl+/-。
 */

import { SCALE_CHANGE_EVENT } from './core.js'

/** 子树 canvas 需要重绘时抛出（挂在每个 <canvas> 上） */
export const CANVAS_RESIZE_EVENT = 'one-screen-scale-canvas-resize'

/** @type {null | { getInstanceByDom?: (el: Element) => { resize: Function } | undefined }} */
let registeredEcharts = null

/** 业务可注入 echarts 模块（避免插件硬依赖）；供 resizeCanvas 探测 */
export function setCompensateEcharts(echarts) {
  registeredEcharts = echarts || null
}

function readCssVarScale(el) {
  if (!el || typeof getComputedStyle === 'undefined') return NaN
  const raw = getComputedStyle(el).getPropertyValue('--one-screen-scale').trim()
  if (!raw) return NaN
  const v = parseFloat(raw)
  return v > 0 ? v : NaN
}

function readTransformScale(el) {
  if (!el || typeof getComputedStyle === 'undefined') return NaN
  const t = getComputedStyle(el).transform
  if (!t || t === 'none') return NaN

  const m2 = t.match(/matrix\(([^,]+),\s*[^,]+,\s*[^,]+,\s*([^,]+)/)
  if (m2) return (parseFloat(m2[1]) + parseFloat(m2[2])) / 2

  const m3 = t.match(
    /matrix3d\(([^,]+),[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,([^,]+)\)/
  )
  if (m3) return (parseFloat(m3[1]) + parseFloat(m3[2])) / 2

  const sm = t.match(/scale\(([^)]+)\)/)
  if (sm) {
    const vals = sm[1].split(',').map((v) => parseFloat(v.trim()))
    return vals.length >= 2 ? (vals[0] + vals[1]) / 2 : vals[0]
  }
  return NaN
}

/** 从 fromEl 向上解析页面 scale（跳过已挂补偿的节点自身 transform） */
export function resolvePageScale(fromEl) {
  let node = fromEl
  while (node && node.nodeType === 1) {
    const fromVar = readCssVarScale(node)
    if (fromVar > 0) return fromVar
    node = node.parentElement
  }

  node = fromEl
  while (node && node.nodeType === 1) {
    if (!node.__oneScreenCompensate) {
      const fromTf = readTransformScale(node)
      if (fromTf > 0 && fromTf !== 1) return fromTf
    }
    node = node.parentElement
  }
  return 1
}

/**
 * 给槽位内层写入反缩放行内样式。父槽位需有明确宽高。
 * @returns {{ scale: number, inverseScale: number }}
 */
export function applyCompensateTransform(el) {
  if (!el) return { scale: 1, inverseScale: 1 }
  const scale = resolvePageScale(el)
  const inverseScale = scale > 0 ? 1 / scale : 1
  el.style.transform = `scale(${inverseScale})`
  el.style.transformOrigin = 'top left'
  el.style.width = `${100 * scale}%`
  el.style.height = `${100 * scale}%`
  el.style.overflow = 'visible'
  el.__oneScreenCompensate = true
  return { scale, inverseScale }
}

export function clearCompensateTransform(el) {
  if (!el) return
  el.style.transform = ''
  el.style.transformOrigin = ''
  el.style.width = ''
  el.style.height = ''
  el.style.overflow = ''
  delete el.__oneScreenCompensate
}

function resolveEchartsLib(bindingEcharts) {
  return (
    bindingEcharts ||
    registeredEcharts ||
    (typeof globalThis !== 'undefined' ? globalThis.echarts : null) ||
    null
  )
}

function boxSize(node) {
  const w = Math.max(1, Math.round(node?.offsetWidth || 0))
  const h = Math.max(1, Math.round(node?.offsetHeight || 0))
  return { width: w, height: h }
}

function tryEchartsResize(node, getInst) {
  if (!node || typeof getInst !== 'function') return false
  let inst
  try {
    inst = getInst(node)
  } catch {
    return false
  }
  if (!inst || typeof inst.resize !== 'function') return false
  const { width, height } = boxSize(node)
  try {
    inst.resize({ width, height })
    return true
  } catch {
    return false
  }
}

function tryChartJsResize(canvas) {
  const Chart = typeof globalThis !== 'undefined' ? globalThis.Chart : null
  const getChart = Chart?.getChart
  if (typeof getChart !== 'function') return false
  let chart
  try {
    chart = getChart(canvas)
  } catch {
    return false
  }
  if (!chart || typeof chart.resize !== 'function') return false
  try {
    chart.resize()
    return true
  } catch {
    return false
  }
}

/**
 * 补偿后通知子树 canvas 重绘：
 * - 探测 ECharts / Chart.js（若已加载）
 * - 每个 <canvas> 派发 CANVAS_RESIZE_EVENT，业务可自行监听重绘
 * 量尺寸用 offsetWidth（勿用 getBoundingClientRect）
 *
 * @returns {number} 成功调用已知图表库 resize 的次数
 */
export function resizeCanvasUnder(el, echartsLib) {
  if (!el) return 0

  const echarts = resolveEchartsLib(echartsLib)
  const getInst = echarts?.getInstanceByDom
  let count = 0

  const canvases = el.querySelectorAll ? el.querySelectorAll('canvas') : []
  for (const canvas of canvases) {
    const host = canvas.parentElement || canvas
    const { width, height } = boxSize(host)

    if (tryEchartsResize(canvas, getInst)) count += 1
    else if (tryEchartsResize(host, getInst)) count += 1

    if (tryChartJsResize(canvas)) count += 1

    try {
      canvas.dispatchEvent(
        new CustomEvent(CANVAS_RESIZE_EVENT, {
          bubbles: true,
          detail: { width, height, canvas, el },
        })
      )
    } catch {
      /* ignore */
    }
  }

  // ECharts 常挂在 div 上（不一定已有 canvas）
  if (typeof getInst === 'function') {
    const nodes = [el, ...el.querySelectorAll('div')]
    for (const node of nodes) {
      if (tryEchartsResize(node, getInst)) count += 1
    }
  }

  return count
}

/** @deprecated 请用 resizeCanvasUnder */
export function resizeEchartsUnder(el, echartsLib) {
  return resizeCanvasUnder(el, echartsLib)
}

function wantsResizeCanvas(options = {}) {
  return Boolean(
    options.resizeCanvas ||
      options.echarts || // 兼容旧名
      options.echartsLib
  )
}

function resolveBoundEcharts(options = {}) {
  if (typeof options.echarts === 'object') return options.echarts
  if (options.echartsLib) return options.echartsLib
  return undefined
}

/** options 可以是对象，也可以是返回最新对象的函数（指令 / hook 传 getter 用） */
function readLiveOptions(options) {
  const value = typeof options === 'function' ? options() : options
  return value && typeof value === 'object' ? value : {}
}

/**
 * @param {HTMLElement} el
 * @param {{
 *   resizeCanvas?: boolean,
 *   echarts?: boolean | object,
 *   echartsLib?: object,
 *   onRefresh?: Function
 * } | (() => object)} [options]
 */
export function createCompensate(el, options = {}) {
  if (!el) throw new Error('[one-screen-scale] compensate element required')

  const initial = readLiveOptions(options)
  const wantResize = wantsResizeCanvas(initial)
  let raf = 0
  let ro = null
  let mo = null
  let retryTimers = []
  let stopped = false

  const clearRetries = () => {
    retryTimers.forEach((id) => clearTimeout(id))
    retryTimers = []
  }

  const refresh = () => {
    if (stopped) return
    const live = readLiveOptions(options)
    const { scale, inverseScale } = applyCompensateTransform(el)
    if (typeof live.onRefresh === 'function') {
      try {
        live.onRefresh({ scale, inverseScale, el })
      } catch {
        /* user callback */
      }
    }
    if (wantsResizeCanvas(live)) {
      const lib = resolveBoundEcharts(live)
      const n = resizeCanvasUnder(el, lib)
      if (n === 0) {
        clearRetries()
        ;[50, 200].forEach((delay) => {
          const id = setTimeout(() => {
            if (stopped) return
            const next = readLiveOptions(options)
            resizeCanvasUnder(el, resolveBoundEcharts(next))
          }, delay)
          retryTimers.push(id)
        })
      }
    }
  }

  const schedule = () => {
    if (stopped) return
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      raf = 0
      if (stopped) return
      refresh()
    })
  }

  refresh()

  if (typeof window !== 'undefined') {
    window.addEventListener(SCALE_CHANGE_EVENT, schedule)
    window.addEventListener('resize', schedule)
  }

  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(schedule)
    if (el.parentElement) ro.observe(el.parentElement)
    ro.observe(el)
  }

  if (wantResize && typeof MutationObserver !== 'undefined') {
    mo = new MutationObserver(schedule)
    mo.observe(el, { childList: true, subtree: true })
  }

  const stop = () => {
    stopped = true
    cancelAnimationFrame(raf)
    clearRetries()
    raf = 0
    if (typeof window !== 'undefined') {
      window.removeEventListener(SCALE_CHANGE_EVENT, schedule)
      window.removeEventListener('resize', schedule)
    }
    ro?.disconnect()
    ro = null
    mo?.disconnect()
    mo = null
    clearCompensateTransform(el)
  }

  return { refresh, stop }
}
