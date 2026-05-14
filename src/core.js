/**
 * 一屏自适应缩放 — 核心算法（框架无关）
 *
 * 两种模式：
 *   'contain'     一屏展示，内容不溢出，用 min(scaleX, scaleY)
 *   'fixed-width' 固定视觉宽度，内容可滚动，反向补高
 */

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
  screenWidth = (typeof window !== 'undefined' ? window.screen.width : 1920),     // fixed-width 模式下的设备屏幕宽度
}) {
  if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) return 1

  let scale

  if (mode === 'fixed-width') {
    if(screenWidth < visualWidth){
      scale = 1
    }else{
      scale = visualWidth / Math.max(targetWidth, screenWidth)
    }
  } else {
    const sx = targetWidth / sourceWidth
    const sy = targetHeight / sourceHeight
    scale = Math.min(sx, sy)
  }

  return scale
}

// ---------- apply / read ----------

export function applyScale(el, scale, origin = 'top center') {
  const target = resolveEl(el)
  if (!target) return
  target.style.transform = `scale(${scale})`
  target.style.transformOrigin = origin
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
    autoResize = true
  } = options

  let currentScale = 1
  let handler = null

  function compute() {
    const sw = target.offsetWidth
    const sh = target.offsetHeight
    const tw = window.innerWidth
    const th = window.innerHeight

    return calculateScale({
      sourceWidth: sw,
      sourceHeight: sh,
      targetWidth: tw,
      targetHeight: th,
      mode,
      visualWidth,
      screenWidth: window.screen.width
    })
  }

  function refresh() {
    const next = compute()
    if (next !== currentScale) {
      currentScale = next
      applyScale(target, next, origin)

      // fixed-width 模式：反向补偿高度
      if (mode === 'fixed-width' && next > 0) {
        target.style.width = `${Math.max(window.innerWidth, window.screen.width)}px`
        target.style.height = `${Math.round(window.innerHeight / next)}px`
      }
    }
    return currentScale
  }

  function start() {
    refresh()
    if (autoResize) {
      handler = () => refresh()
      window.addEventListener('resize', handler)
    }
    return currentScale
  }

  function stop() {
    if (handler) {
      window.removeEventListener('resize', handler)
      handler = null
    }
  }

  return { start, stop, refresh, getScale: () => currentScale }
}
