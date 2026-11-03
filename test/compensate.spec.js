import { describe, it, expect, beforeEach, vi } from 'vitest'
import { applyScale } from '../src/core.js'
import {
  resolvePageScale,
  applyCompensateTransform,
  createCompensate,
} from '../src/compensate.js'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('resolvePageScale / applyCompensateTransform', () => {
  it('reads --one-screen-scale from ancestor', () => {
    const page = document.createElement('div')
    const slot = document.createElement('div')
    const inner = document.createElement('div')
    slot.style.width = '400px'
    slot.style.height = '300px'
    slot.appendChild(inner)
    page.appendChild(slot)
    document.body.appendChild(page)

    applyScale(page, 0.5)
    expect(resolvePageScale(inner)).toBeCloseTo(0.5, 5)

    const { scale, inverseScale } = applyCompensateTransform(inner)
    expect(scale).toBeCloseTo(0.5, 5)
    expect(inverseScale).toBeCloseTo(2, 5)
    expect(inner.style.width).toBe('50%')
    expect(inner.style.transform).toBe('scale(2)')
  })

  it('createCompensate stop clears styles', () => {
    const page = document.createElement('div')
    const slot = document.createElement('div')
    const inner = document.createElement('div')
    slot.appendChild(inner)
    page.appendChild(slot)
    document.body.appendChild(page)
    applyScale(page, 0.4)

    const api = createCompensate(inner)
    expect(inner.style.width).toBe('40%')
    api.stop()
    expect(inner.style.width).toBe('')
  })

  it('reads onRefresh from a live options getter', () => {
    const page = document.createElement('div')
    const inner = document.createElement('div')
    page.appendChild(inner)
    document.body.appendChild(page)
    applyScale(page, 0.5)

    let seen = 0
    const options = { onRefresh: () => { seen += 1 } }
    const api = createCompensate(inner, () => options)
    expect(seen).toBe(1)

    options.onRefresh = () => { seen += 10 }
    api.refresh()
    expect(seen).toBe(11)
    api.stop()
  })

  it('stop cancels chart resize retries', () => {
    vi.useFakeTimers()
    const page = document.createElement('div')
    const inner = document.createElement('div')
    page.appendChild(inner)
    document.body.appendChild(page)
    applyScale(page, 0.5)

    const api = createCompensate(inner, { resizeCanvas: true })
    api.stop()
    expect(inner.style.width).toBe('')
    vi.runAllTimers()
    expect(inner.style.width).toBe('')
    vi.useRealTimers()
  })
})
