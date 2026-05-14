import { describe, it, expect } from 'vitest'
import {
  calculateScale,
  applyScale,
  getPageScale,
  getInverseScale,
  createScaler
} from '../src/core.js'

describe('calculateScale', () => {
  it('contain mode: picks min(scaleX, scaleY)', () => {
    const s = calculateScale({
      sourceWidth: 750,
      sourceHeight: 1000,
      targetWidth: 375,
      targetHeight: 800,
      mode: 'contain',
      minScale: 0.1,
      maxScale: 10
    })
    // scaleX=0.5, scaleY=0.8 → min=0.5
    expect(s).toBeCloseTo(0.5, 2)
  })

  it('contain mode: clamped by minScale', () => {
    const s = calculateScale({
      sourceWidth: 750,
      sourceHeight: 1000,
      targetWidth: 200,
      targetHeight: 300,
      mode: 'contain',
      minScale: 0.5,
      maxScale: 10
    })
    expect(s).toBe(0.5)
  })

  it('fixed-width mode: scale = visualWidth / targetWidth', () => {
    const s = calculateScale({
      sourceWidth: 750,
      sourceHeight: 1000,
      targetWidth: 1920,
      targetHeight: 1080,
      mode: 'fixed-width',
      visualWidth: 450,
      minScale: 0.1,
      maxScale: 10
    })
    expect(s).toBeCloseTo(450 / 1920, 4)
  })

  it('fixed-width mode: clamped by maxScale', () => {
    const s = calculateScale({
      sourceWidth: 750,
      sourceHeight: 1000,
      targetWidth: 1920,
      targetHeight: 1080,
      mode: 'fixed-width',
      visualWidth: 450,
      minScale: 0.1,
      maxScale: 0.2
    })
    expect(s).toBe(0.2)
  })
})

describe('applyScale / getPageScale / getInverseScale', () => {
  it('apply and read back', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    applyScale(el, 0.5)
    expect(el.style.transform).toContain('scale(0.5)')
    expect(getPageScale(el)).toBeCloseTo(0.5, 2)
    expect(getInverseScale(el)).toBeCloseTo(2, 2)

    el.remove()
  })

  it('getPageScale returns 1 for unscaled element', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    expect(getPageScale(el)).toBe(1)
    el.remove()
  })
})

describe('createScaler', () => {
  it('creates and returns scale', () => {
    const el = document.createElement('div')
    el.style.width = '375px'
    el.style.height = '500px'
    document.body.appendChild(el)

    const scaler = createScaler(el, { mode: 'contain', autoResize: false, minScale: 0.1, maxScale: 10 })
    const s = scaler.start()
    expect(typeof s).toBe('number')
    expect(s).toBeGreaterThan(0)
    expect(scaler.getScale()).toBe(s)

    scaler.stop()
    el.remove()
  })
})
