// ===== 核心 =====

export interface ScaleOptions {
  sourceWidth: number
  sourceHeight: number
  targetWidth?: number
  targetHeight?: number
  mode?: 'contain' | 'fixed-width'
  visualWidth?: number
  screenWidth?: number
}

export interface ScalerOptions {
  mode?: 'contain' | 'fixed-width'
  visualWidth?: number
  origin?: string
  autoResize?: boolean
}

export interface ScalerInstance {
  start: () => number
  stop: () => void
  refresh: () => number
  getScale: () => number
}

export function calculateScale(options: ScaleOptions): number
export function applyScale(el: HTMLElement | string, scale: number, origin?: string): void
export function getPageScale(el?: HTMLElement | string): number
export function getInverseScale(el?: HTMLElement | string): number
export function createScaler(el: HTMLElement | string, options?: ScalerOptions): ScalerInstance

// ===== Vue =====

import type { Ref, Directive } from 'vue'

export const vFitScreen: Directive<HTMLElement, ScalerOptions>

export function useFitScreen(
  targetRef: Ref<HTMLElement | null> | HTMLElement,
  options?: ScalerOptions
): {
  scale: Ref<number>
  inverseScale: Ref<number>
  refresh: () => void
}
