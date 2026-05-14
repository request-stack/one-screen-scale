// ===== React =====

import type { RefObject } from 'react'

export interface ScalerOptions {
  mode?: 'contain' | 'fixed-width'
  visualWidth?: number
  origin?: string
  autoResize?: boolean
}

export function useFitScreen(
  targetRef: RefObject<HTMLElement | null> | HTMLElement,
  options?: ScalerOptions
): {
  scale: number
  inverseScale: number
  refresh: () => void
}
