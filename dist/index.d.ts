// ===== 核心 =====

export interface ScaleOptions {
  sourceWidth: number
  sourceHeight: number
  targetWidth?: number
  targetHeight?: number
  mode?: 'contain' | 'fixed-width'
  visualWidth?: number
}

export interface ScalerOptions {
  mode?: 'contain' | 'fixed-width'
  visualWidth?: number
  origin?: string
  autoResize?: boolean
  /**
   * 是否自动注入模式所需基础样式（默认 true）
   * - contain: width:100vw; min-height:100vh/100dvh
   * - fixed-width: 暂不注入（宽高由 refresh 行内补偿）
   */
  injectBaseStyles?: boolean
  /**
   * 内容尺寸变化时自动重算（默认 true）。
   * 监听 ResizeObserver / 内部图片 load 等，避免图未加载完就测量导致 scale 偏大。
   */
  observeContent?: boolean
}

export interface ScalerInstance {
  start: () => number
  stop: () => void
  refresh: () => number
  getScale: () => number
}

export const BASE_CLASS: {
  contain: string
  'fixed-width': string
  compensate: string
}

export const SCALE_CHANGE_EVENT: 'one-screen-scale-change'
export const CANVAS_RESIZE_EVENT: 'one-screen-scale-canvas-resize'

export function calculateScale(options: ScaleOptions): number
export function applyScale(el: HTMLElement | string, scale: number, origin?: string): void
export function getPageScale(el?: HTMLElement | string): number
export function getInverseScale(el?: HTMLElement | string): number
export function createScaler(el: HTMLElement | string, options?: ScalerOptions): ScalerInstance
export function ensureBaseStyleSheet(): HTMLStyleElement | null
export function applyBaseStyles(el: HTMLElement, mode?: 'contain' | 'fixed-width'): string | null
export function removeBaseStyles(el: HTMLElement): void
export function applyCompensateStyles(el: HTMLElement): string | null
export function removeCompensateStyles(el: HTMLElement): void

// ===== 组件反缩放补偿（仅抵消页面 v-fit-screen 的 scale；不处理浏览器 Ctrl+/-） =====

export interface CompensateRefreshDetail {
  scale: number
  inverseScale: number
  el: HTMLElement
}

export interface CompensateOptions {
  /**
   * 补偿后通知子树 canvas 重绘：探测 ECharts / Chart.js，
   * 并对每个 &lt;canvas&gt; 派发 CANVAS_RESIZE_EVENT。
   */
  resizeCanvas?: boolean
  /** @deprecated 请用 resizeCanvas；传入 echarts 模块时仍表示开启 + 注入库 */
  echarts?: boolean | { getInstanceByDom?: (el: Element) => { resize: (opts?: object) => void } | undefined }
  echartsLib?: { getInstanceByDom?: (el: Element) => { resize: (opts?: object) => void } | undefined }
  onRefresh?: (detail: CompensateRefreshDetail) => void
}

export interface CompensateInstance {
  refresh: () => void
  stop: () => void
}

export function resolvePageScale(fromEl?: HTMLElement | null): number
export function applyCompensateTransform(el: HTMLElement): {
  scale: number
  inverseScale: number
}
export function clearCompensateTransform(el: HTMLElement): void
export function resizeCanvasUnder(el: HTMLElement, echartsLib?: CompensateOptions['echartsLib']): number
/** @deprecated 请用 resizeCanvasUnder */
export function resizeEchartsUnder(el: HTMLElement, echartsLib?: CompensateOptions['echartsLib']): number
export function createCompensate(
  el: HTMLElement,
  options?: CompensateOptions | (() => CompensateOptions)
): CompensateInstance
/** 全局注入 echarts，供 resizeCanvas 探测（无需每个调用传模块） */
export function setCompensateEcharts(echarts: CompensateOptions['echartsLib'] | null): void

// ===== Vue =====

import type { Ref, Directive } from 'vue'

export const vFitScreen: Directive<HTMLElement, ScalerOptions | undefined>
/**
 * 第三方组件反缩放。修饰符 `.resize-canvas` 或 `{ resizeCanvas: true }` 通知子树 canvas 重绘。
 */
export const vCompensate: Directive<
  HTMLElement,
  CompensateOptions | 'resize-canvas' | 'resizeCanvas' | 'echarts' | undefined
>
export const vFitCompensate: Directive<
  HTMLElement,
  CompensateOptions | 'resize-canvas' | 'resizeCanvas' | 'echarts' | undefined
>

export function useFitScreen(
  targetRef: Ref<HTMLElement | null> | HTMLElement,
  options?: ScalerOptions
): {
  scale: Ref<number>
  inverseScale: Ref<number>
  refresh: () => void
}
