/**
 * 一屏自适应缩放 — 核心算法（框架无关）
 *
 * 两种模式：
 *   'contain'     一屏展示，内容不溢出，用 min(scaleX, scaleY)
 *   'fixed-width' 固定视觉宽度，内容可滚动，反向补高
 *
 * 配套前提：H5 使用 postcss-px-to-viewport（或同类）做移动端适配。
 * createScaler / 指令默认会注入基础宽高样式，保证测量与缩放生效。
 *
 * 图片等异步内容会改变 offsetHeight：默认用 ResizeObserver / 图片 load
 * 在尺寸稳定后再 refresh，避免首屏偶发「量矮了 → scale 偏大」。
 */

import { applyBaseStyles, removeBaseStyles } from './baseStyles.js'

// ---------- helpers ----------

function resolveEl(el) {
  if (!el) return null
  if (typeof el === 'string') return document.querySelector(el)
  if (el instanceof HTMLElement) return el
  // Vue ref / React ref
  if (el.value instanceof HTMLElement) return el.value
  if (el.current instanceof HTMLElement) return el.current
  return null
}

// ---------- scale calculation ----------

export function calculateScale({
  sourceWidth,
  sourceHeight,
  targetWidth = (typeof window !== 'undefined' ? window.innerWidth : 1920),
  targetHeight = (typeof window !== 'undefined' ? window.innerHeight : 1080),
  mode = 'contain',
  visualWidth = 450,     // fixed-width 模式下的目标视觉宽度
}) {
  if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) return 1

  let scale

  if (mode === 'fixed-width') {
    // 只用视口宽：视口比目标宽才缩小，否则 1:1（保持清晰）
    scale = targetWidth > visualWidth ? visualWidth / targetWidth : 1
  } else {
    const sx = targetWidth / sourceWidth
    const sy = targetHeight / sourceHeight
    scale = Math.min(sx, sy)
  }

  return scale
}

// ---------- apply / read ----------

/** 页面 scale 变化时抛出，供 ECharts.resize / 业务监听 */
export const SCALE_CHANGE_EVENT = 'one-screen-scale-change'

export function applyScale(el, scale, origin = 'top center') {
  const target = resolveEl(el)
  if (!target) return
  target.style.transform = `scale(${scale})`
  target.style.transformOrigin = origin
  // 供业务 / v-compensate 做反缩放（继承到子树）
  const inv = scale > 0 ? 1 / scale : 1
  target.style.setProperty('--one-screen-scale', String(scale))
  target.style.setProperty('--one-screen-inverse-scale', String(inv))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SCALE_CHANGE_EVENT, { detail: { scale, inverseScale: inv, el: target } })
    )
  }
}

export function getPageScale(el) {
  const target = resolveEl(el)
  if (!target) return 1

  const style = window.getComputedStyle(target)
  const t = style.transform
  if (!t || t === 'none') return 1

  // matrix(a, b, c, d, e, f) — 2d
  const m2 = t.match(/matrix\(([^,]+),\s*[^,]+,\s*[^,]+,\s*([^,]+)/)
  if (m2) return (parseFloat(m2[1]) + parseFloat(m2[2])) / 2

  // matrix3d — 3d
  const m3 = t.match(/matrix3d\(([^,]+),[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,([^,]+)\)/)
  if (m3) return (parseFloat(m3[1]) + parseFloat(m3[2])) / 2

  // scale(x, y) or scale(s)
  const sm = t.match(/scale\(([^)]+)\)/)
  if (sm) {
    const vals = sm[1].split(',').map(v => parseFloat(v.trim()))
    return vals.length >= 2 ? (vals[0] + vals[1]) / 2 : vals[0]
  }

  return 1
}

export function getInverseScale(el = '.share-page') {
  const s = getPageScale(el)
  return s > 0 ? 1 / s : 1
}

// ---------- scaler instance ----------

export function createScaler(el, options = {}) {
  const target = resolveEl(el)
  if (!target) throw new Error('[one-screen-scale] element not found')

  const {
    mode = 'contain',
    visualWidth = 450,
    origin = 'top center',
    autoResize = true,
    /** 是否自动注入模式所需的宽高基础样式，默认 true */
    injectBaseStyles = true,
    /**
     * 内容尺寸变化时自动重算（图片 load、字体、DOM 撑高）。
     * 解决刷新偶发「图未加载完就测量 → scale 偏大」。
     */
    observeContent = true,
  } = options

  let currentScale = 1
  let resizeHandler = null
  let loadHandler = null
  let windowLoadHandler = null
  let rafId = 0
  let unlockRaf = 0
  let ro = null
  let refreshing = false
  let lastMeasured = { w: 0, h: 0 }
  // start / stop 各加一，用来丢掉停掉之后才回来的字体、帧回调
  let session = 0

  // fixed-width 会改 inline width/height，stop 时还原
  const savedInline = {
    width: target.style.width,
    height: target.style.height,
    transform: target.style.transform,
    transformOrigin: target.style.transformOrigin,
  }

  function compute() {
    const sw = target.offsetWidth
    const sh = target.offsetHeight
    const tw = document.documentElement.clientWidth || window.innerWidth
    const th = window.innerHeight

    lastMeasured = { w: sw, h: sh }

    return calculateScale({
      sourceWidth: sw,
      sourceHeight: sh,
      targetWidth: tw,
      targetHeight: th,
      mode,
      visualWidth,
    })
  }

  function refresh() {
    refreshing = true
    const next = compute()
    currentScale = next
    // 始终写入，保证首次 scale=1 时也带上 transform-origin
    applyScale(target, next, origin)

    // fixed-width 模式：反向补偿高度（视觉宽固定，布局宽仍用视口宽再缩小）
    if (mode === 'fixed-width' && next > 0) {
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth
      const nextW = `${viewportWidth}px`
      const nextH = `${Math.round(window.innerHeight / next)}px`
      // 值不变不写，避免 ResizeObserver 死循环
      if (target.style.width !== nextW) target.style.width = nextW
      if (target.style.height !== nextH) target.style.height = nextH
    }
    // 等布局提交后再放开，避免 RO 回调里立刻重入
    const token = session
    cancelAnimationFrame(unlockRaf)
    unlockRaf = requestAnimationFrame(() => {
      if (token !== session) return
      refreshing = false
    })
    return currentScale
  }

  function scheduleRefresh() {
    if (refreshing) return
    cancelAnimationFrame(rafId)
    const token = session
    rafId = requestAnimationFrame(() => {
      if (token !== session) return
      // 尺寸没变就跳过（fixed-width 改 height 触发的 RO）
      const w = target.offsetWidth
      const h = target.offsetHeight
      if (w === lastMeasured.w && h === lastMeasured.h && target.style.transform) {
        // 视口变化仍需算：由 window.resize 路径直接 refresh
        return
      }
      refresh()
    })
  }

  function onWindowResize() {
    refresh()
  }

  function start() {
    session += 1
    const token = session
    // 复用同一实例 start 时，上一次 stop 之后留下的锁要清掉
    refreshing = false
    if (injectBaseStyles) {
      applyBaseStyles(target, mode)
    }
    // 注入样式后再量尺寸
    refresh()

    if (autoResize) {
      resizeHandler = onWindowResize
      window.addEventListener('resize', resizeHandler)
    }

    if (observeContent && typeof window !== 'undefined') {
      // 1) 子树布局尺寸变化（图片解码后撑高最常见）
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => scheduleRefresh())
        ro.observe(target)
      }

      // 2) 捕获阶段听内部 img/video 的 load（含后插入的节点）
      loadHandler = (e) => {
        const t = e.target
        if (t && (t.tagName === 'IMG' || t.tagName === 'VIDEO' || t.tagName === 'IFRAME')) {
          scheduleRefresh()
        }
      }
      target.addEventListener('load', loadHandler, true)
      target.addEventListener('error', loadHandler, true)

      // 3) 字体就绪。stop 之后 session 变了，这次回调直接丢掉
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready
          .then(() => {
            if (token !== session) return
            scheduleRefresh()
          })
          .catch(() => {})
      }

      // 4) 整页资源 load（缓存命中时可能已 complete）
      if (document.readyState === 'complete') {
        scheduleRefresh()
      } else {
        windowLoadHandler = () => scheduleRefresh()
        window.addEventListener('load', windowLoadHandler, { once: true })
      }

      // 5) 再等两帧，覆盖首屏同步布局抖动
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scheduleRefresh())
      })
    }

    return currentScale
  }

  function stop() {
    session += 1
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
    }
    if (loadHandler) {
      target.removeEventListener('load', loadHandler, true)
      target.removeEventListener('error', loadHandler, true)
      loadHandler = null
    }
    if (windowLoadHandler) {
      window.removeEventListener('load', windowLoadHandler)
      windowLoadHandler = null
    }
    if (ro) {
      ro.disconnect()
      ro = null
    }
    cancelAnimationFrame(rafId)
    cancelAnimationFrame(unlockRaf)
    rafId = 0
    unlockRaf = 0

    if (injectBaseStyles) {
      removeBaseStyles(target)
    }
    target.style.width = savedInline.width
    target.style.height = savedInline.height
    target.style.transform = savedInline.transform
    target.style.transformOrigin = savedInline.transformOrigin
    target.style.removeProperty('--one-screen-scale')
    target.style.removeProperty('--one-screen-inverse-scale')
  }

  return { start, stop, refresh, getScale: () => currentScale }
}

export {
  applyBaseStyles,
  removeBaseStyles,
  applyCompensateStyles,
  removeCompensateStyles,
  ensureBaseStyleSheet,
  BASE_CLASS,
} from './baseStyles.js'
