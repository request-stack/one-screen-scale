// ===== React =====

import type { RefObject } from 'react'

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
   * 内容尺寸变化时自动重算（默认 true）
   */
  observeContent?: boolean
}

export interface CompensateOptions {
  /** 补偿后通知子树 canvas 重绘（ECharts / Chart.js / 自定义事件） */
  resizeCanvas?: boolean
  /** @deprecated 请用 resizeCanvas */
  echarts?: boolean | { getInstanceByDom?: (el: Element) => { resize: (opts?: object) => void } | undefined }
  echartsLib?: { getInstanceByDom?: (el: Element) => { resize: (opts?: object) => void } | undefined }
  onRefresh?: (detail: { scale: number; inverseScale: number; el: HTMLElement }) => void
}

export function useFitScreen(
  targetRef: RefObject<HTMLElement | null> | HTMLElement,
  options?: ScalerOptions
): {
  scale: number
  inverseScale: number
  refresh: () => void
}

/**
 * 对应 Vue `v-compensate`：抵消页面 scale 的组件反缩放。
 * 节点晚于首次 effect 出现时会自动补挂；`resizeCanvas` 变化会重建监听。
 */
export function useCompensate(
  targetRef: RefObject<HTMLElement | null> | HTMLElement,
  options?: CompensateOptions
): {
  refresh: () => void
}
