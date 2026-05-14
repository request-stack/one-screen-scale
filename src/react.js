/**
 * React hook
 *   useFitScreen(ref, options) → { scale, inverseScale, refresh }
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import { createScaler } from './core.js'

export function useFitScreen(targetRef, options = {}) {
  const [scale, setScale] = useState(1)
  const [inverseScale, setInverseScale] = useState(1)
  const scalerRef = useRef(null)

  useEffect(() => {
    const el = targetRef?.current ?? targetRef
    if (!el) return

    const scaler = createScaler(el, options)
    scalerRef.current = scaler
    const s = scaler.start()
    setScale(s)
    setInverseScale(s > 0 ? 1 / s : 1)

    const onResize = () => {
      const s = scaler.getScale()
      setScale(s)
      setInverseScale(s > 0 ? 1 / s : 1)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      scaler.stop()
      scalerRef.current = null
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
