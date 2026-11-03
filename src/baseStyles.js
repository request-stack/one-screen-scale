/**
 * 指令挂载时注入的「适配生效」基础样式。
 *
 * 前提：页面用了 postcss-px-to-viewport（或同类）把设计稿 px 转成 vw。
 *
 * - contain：宽拉满视口 + 最小一屏高，高度由内容撑开
 * - fixed-width：宽高由 refresh 行内补偿，暂不注入
 * - compensate：第三方组件反缩放（抵消页面 scale，ECharts / Element Plus 等）
 */

export const STYLE_ELEMENT_ID = 'one-screen-scale-base-styles'

export const BASE_CLASS = {
  contain: 'one-screen-scale--contain',
  'fixed-width': 'one-screen-scale--fixed-width',
  compensate: 'one-screen-scale--compensate',
}

const BASE_CSS = `
.${BASE_CLASS.contain} {
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
}
/* fixed-width：占位 class，样式先不注入 */
.${BASE_CLASS['fixed-width']} {
}
/*
 * 纯 CSS 反缩放（可选）。v-compensate 指令已改为 JS 行内写入同一公式，更稳。
 * ECharts/Canvas：请用 offsetWidth 量布局盒，勿用 getBoundingClientRect。
 */
.${BASE_CLASS.compensate} {
  transform: scale(var(--one-screen-inverse-scale, 1));
  transform-origin: top left;
  width: calc(100% * var(--one-screen-scale, 1));
  height: calc(100% * var(--one-screen-scale, 1));
}
`.trim()

/** 向 document 注入 / 同步基础样式表（已存在则更新内容，便于本地迭代） */
export function ensureBaseStyleSheet() {
  if (typeof document === 'undefined') return null
  let styleEl = document.getElementById(STYLE_ELEMENT_ID)
  if (styleEl) {
    styleEl.textContent = BASE_CSS
    return styleEl
  }

  styleEl = document.createElement('style')
  styleEl.id = STYLE_ELEMENT_ID
  styleEl.textContent = BASE_CSS
  document.head.appendChild(styleEl)
  return styleEl
}

/**
 * 给缩放根节点挂上对应模式的 class。
 * @returns {string | null} 本次加上的 class，便于 stop 时移除
 */
export function applyBaseStyles(el, mode = 'contain') {
  if (!el || typeof el.classList === 'undefined') return null
  ensureBaseStyleSheet()

  const nextClass = BASE_CLASS[mode] || BASE_CLASS.contain
  // 切换模式时清掉另一套页面级 class（不动 compensate）
  ;[BASE_CLASS.contain, BASE_CLASS['fixed-width']].forEach((cls) => {
    if (cls !== nextClass) el.classList.remove(cls)
  })
  el.classList.add(nextClass)
  return nextClass
}

/** 移除本库注入的页面级基础 class（不含 compensate） */
export function removeBaseStyles(el) {
  if (!el || typeof el.classList === 'undefined') return
  el.classList.remove(BASE_CLASS.contain, BASE_CLASS['fixed-width'])
}

/** 挂上反缩放补偿 class */
export function applyCompensateStyles(el) {
  if (!el || typeof el.classList === 'undefined') return null
  ensureBaseStyleSheet()
  el.classList.add(BASE_CLASS.compensate)
  return BASE_CLASS.compensate
}

/** 移除反缩放补偿 class */
export function removeCompensateStyles(el) {
  if (!el || typeof el.classList === 'undefined') return
  el.classList.remove(BASE_CLASS.compensate)
}
