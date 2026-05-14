/**
 * Vue 3 Composable
 *   useFitScreen(ref, options) → { scale, inverseScale, refresh }
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createScaler, getInverseScale } from './core.js'

export function useFitScreen(targetRef, options = {}) {
  const scale = ref(1)
  const inverseScale = ref(1)

  let scaler = null
  let onResize = null

  function setup(el) {
    if (!el) return
    scaler = createScaler(el, options)
    const s = scaler.start()
    scale.value = s
    inverseScale.value = getInverseScale(el)

    onResize = () => {
      scale.value = scaler?.getScale?.() ?? 1
      inverseScale.value = getInverseScale(el)
    }
    window.addEventListener('resize', onResize)
  }

  function teardown() {
    if (onResize) {
      window.removeEventListener('resize', onResize)
      onResize = null
    }
    scaler?.stop()
    scaler = null
  }

  // 处理 ref 初始有值的情况
  onMounted(() => {
    const el = targetRef?.value ?? targetRef
    setup(el)
  })

  // 处理 ref 延迟赋值的情况（异步挂载）
  if (targetRef && typeof targetRef === 'object' && 'value' in targetRef) {
    watch(
      () => targetRef.value,
      (el) => {
        if (el && !scaler) setup(el)
      }
    )
  }

  onUnmounted(() => {
    teardown()
  })

  const refresh = () => {
    const el = targetRef?.value ?? targetRef
    if (!el || !scaler) return
    const s = scaler.refresh()
    scale.value = s
    inverseScale.value = getInverseScale(el)
  }

  return { scale, inverseScale, refresh }
}
