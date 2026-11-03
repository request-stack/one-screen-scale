/**
 * React hooks
 *   useFitScreen(ref, options) → { scale, inverseScale, refresh }
 *   useCompensate(ref, options) → { refresh }   // 对应 Vue v-compensate
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import { createScaler, SCALE_CHANGE_EVENT } from './core.js'
import { createCompensate } from './compensate.js'

function resolveElement(targetRef) {
  if (!targetRef) return null
  if (typeof HTMLElement !== 'undefined' && targetRef instanceof HTMLElement) return targetRef
  if (targetRef.current instanceof HTMLElement) return targetRef.current
  if (targetRef.value instanceof HTMLElement) return targetRef.value
  return null
}

/** ref 第一次 effect 时可能还是空的，等到节点出现再挂。卸载时停掉等待 */
function waitForElement(targetRef, onReady) {
  let raf = 0
  let timer = 0
  let frames = 0
  let settled = false

  const finish = () => {
    settled = true
    cancelAnimationFrame(raf)
    clearInterval(timer)
  }

  const tick = () => {
    if (settled) return
    const el = resolveElement(targetRef)
    if (el) {
      finish()
      onReady(el)
      return
    }
    frames += 1
    if (frames < 60) raf = requestAnimationFrame(tick)
    else if (!timer) timer = setInterval(tick, 200)
  }

  tick()
  return finish
}

export function useFitScreen(targetRef, options = {}) {
  const [scale, setScale] = useState(1)
  const [inverseScale, setInverseScale] = useState(1)
  const scalerRef = useRef(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    let detach = () => {}
    let disposed = false

    const cancelWait = waitForElement(targetRef, (el) => {
      if (disposed) return
      const scaler = createScaler(el, optionsRef.current)
      scalerRef.current = scaler
      const s = scaler.start()
      setScale(s)
      setInverseScale(s > 0 ? 1 / s : 1)

      const onScale = (event) => {
        if (event.detail?.el !== el) return
        setScale(event.detail.scale)
        setInverseScale(event.detail.inverseScale)
      }
      window.addEventListener(SCALE_CHANGE_EVENT, onScale)
      detach = () => {
        window.removeEventListener(SCALE_CHANGE_EVENT, onScale)
        scaler.stop()
        scalerRef.current = null
      }
    })

    return () => {
      disposed = true
      cancelWait()
      detach()
    }
  }, [targetRef])

  const refresh = useCallback(() => {
    const el = targetRef?.current ?? targetRef
    if (!el || !scalerRef.current) return
    const s = scalerRef.current.refresh()
    setScale(s)
    setInverseScale(s > 0 ? 1 / s : 1)
  }, [targetRef])

  return { scale, inverseScale, refresh }
}

/**
 * 第三方组件反缩放补偿（对应 Vue `v-compensate`）。
 * 挂在槽位内层 ref 上；父槽位需有明确宽高。
 *
 * @example
 *   const innerRef = useRef(null)
 *   useCompensate(innerRef, { resizeCanvas: true })
 */
export function useCompensate(targetRef, options = {}) {
  const apiRef = useRef(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const resizeFlag = Boolean(options?.resizeCanvas || options?.echarts || options?.echartsLib)
  const lib =
    (options && typeof options.echarts === 'object' && options.echarts) ||
    options?.echartsLib ||
    null

  useEffect(() => {
    let api = null
    let disposed = false

    const cancelWait = waitForElement(targetRef, (el) => {
      if (disposed) return
      api = createCompensate(el, () => optionsRef.current || {})
      apiRef.current = api
    })

    return () => {
      disposed = true
      cancelWait()
      api?.stop()
      apiRef.current = null
    }
  }, [targetRef, resizeFlag, lib])

  const refresh = useCallback(() => {
    apiRef.current?.refresh()
  }, [])

  return { refresh }
}
