import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateScale,
  applyScale,
  getPageScale,
  getInverseScale,
  createScaler,
  applyBaseStyles,
  removeBaseStyles,
  ensureBaseStyleSheet,
  BASE_CLASS,
} from '../src/core.js'
import { STYLE_ELEMENT_ID } from '../src/baseStyles.js'

beforeEach(() => {
  document.getElementById(STYLE_ELEMENT_ID)?.remove()
})

describe('calculateScale', () => {
  it('contain mode: picks min(scaleX, scaleY)', () => {
    const s = calculateScale({
      sourceWidth: 750,
      sourceHeight: 1000,
      targetWidth: 375,
      targetHeight: 800,
      mode: 'contain',
    })
    // scaleX=0.5, scaleY=0.8 → min=0.5
    expect(s).toBeCloseTo(0.5, 2)
  })

  it('contain mode: uses scaleY when it is smaller', () => {
    const s = calculateScale({
      sourceWidth: 750,
      sourceHeight: 1000,
      targetWidth: 750,
      targetHeight: 500,
      mode: 'contain',
    })
    // scaleX=1, scaleY=0.5 → min=0.5
    expect(s).toBeCloseTo(0.5, 2)
  })

  it('fixed-width mode: scale = visualWidth / targetWidth when viewport is wider', () => {
    const s = calculateScale({
      sourceWidth: 750,
      sourceHeight: 1000,
      targetWidth: 1920,
      targetHeight: 1080,
      mode: 'fixed-width',
      visualWidth: 450,
    })
    expect(s).toBeCloseTo(450 / 1920, 4)
  })

  it('fixed-width mode: scale = 1 when viewport is narrower than visualWidth', () => {
    const s = calculateScale({
      sourceWidth: 750,
      sourceHeight: 1000,
      targetWidth: 375,
      targetHeight: 800,
      mode: 'fixed-width',
      visualWidth: 450,
    })
    expect(s).toBe(1)
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

    const scaler = createScaler(el, { mode: 'contain', autoResize: false })
    const s = scaler.start()
    expect(typeof s).toBe('number')
    expect(s).toBeGreaterThan(0)
    expect(scaler.getScale()).toBe(s)

    scaler.stop()
    el.remove()
  })

  it('injects contain base class by default', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    const scaler = createScaler(el, { mode: 'contain', autoResize: false })
    scaler.start()

    expect(document.getElementById(STYLE_ELEMENT_ID)).toBeTruthy()
    expect(el.classList.contains(BASE_CLASS.contain)).toBe(true)
    expect(el.style.transformOrigin).toContain('top')

    scaler.stop()
    expect(el.classList.contains(BASE_CLASS.contain)).toBe(false)
    el.remove()
  })

  it('injects fixed-width base class', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    const scaler = createScaler(el, {
      mode: 'fixed-width',
      visualWidth: 450,
      autoResize: false,
    })
    scaler.start()

    expect(el.classList.contains(BASE_CLASS['fixed-width'])).toBe(true)
    const css = document.getElementById(STYLE_ELEMENT_ID).textContent
    expect(css).toContain('one-screen-scale--fixed-width *::-webkit-scrollbar')
    expect(css).toContain('calc(6px * var(--one-screen-inverse-scale, 1))')

    scaler.stop()
    expect(el.classList.contains(BASE_CLASS['fixed-width'])).toBe(false)
    el.remove()
  })

  it('skips base styles when injectBaseStyles is false', () => {
    const el = document.createElement('div')
    el.style.width = '375px'
    el.style.height = '500px'
    document.body.appendChild(el)

    const scaler = createScaler(el, {
      mode: 'contain',
      autoResize: false,
      injectBaseStyles: false,
    })
    scaler.start()

    expect(el.classList.contains(BASE_CLASS.contain)).toBe(false)

    scaler.stop()
    el.remove()
  })

  it('observeContent start/stop does not throw', () => {
    const el = document.createElement('div')
    el.style.width = '375px'
    el.style.height = '500px'
    document.body.appendChild(el)

    const scaler = createScaler(el, {
      mode: 'contain',
      autoResize: false,
      injectBaseStyles: false,
      observeContent: true,
    })
    expect(() => {
      scaler.start()
      el.style.height = '2000px'
      scaler.refresh()
      scaler.stop()
    }).not.toThrow()

    el.remove()
  })

  it('stop removes the scale custom properties', () => {
    const el = document.createElement('div')
    el.style.width = '375px'
    el.style.height = '500px'
    document.body.appendChild(el)

    const scaler = createScaler(el, {
      mode: 'contain',
      autoResize: false,
      injectBaseStyles: false,
      observeContent: false,
    })
    scaler.start()
    expect(el.style.getPropertyValue('--one-screen-scale')).not.toBe('')

    scaler.stop()
    expect(el.style.getPropertyValue('--one-screen-scale')).toBe('')
    expect(el.style.getPropertyValue('--one-screen-inverse-scale')).toBe('')
    el.remove()
  })
})

describe('applyBaseStyles', () => {
  it('switches class when mode changes', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    applyBaseStyles(el, 'contain')
    expect(el.classList.contains(BASE_CLASS.contain)).toBe(true)

    applyBaseStyles(el, 'fixed-width')
    expect(el.classList.contains(BASE_CLASS.contain)).toBe(false)
    expect(el.classList.contains(BASE_CLASS['fixed-width'])).toBe(true)

    removeBaseStyles(el)
    ensureBaseStyleSheet()
    el.remove()
  })
})
