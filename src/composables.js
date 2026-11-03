/**
 * Vue 3 Composable
 *   useFitScreen(ref, options) → { scale, inverseScale, refresh }
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createScaler, SCALE_CHANGE_EVENT } from './core.js'

export function useFitScreen(targetRef, options = {}) {
  const scale = ref(1)
  const inverseScale = ref(1)

  let scaler = null
  let onScale = null

  function setup(el) {
    if (!el) return
    scaler = createScaler(el, options)
    const s = scaler.start()
    scale.value = s
    inverseScale.value = s > 0 ? 1 / s : 1

    // 图片加载等导致的重算不经过 window.resize，跟页面缩放事件走
    onScale = (event) => {
      if (event.detail?.el !== el) return
      scale.value = event.detail.scale
      inverseScale.value = event.detail.inverseScale
    }
    window.addEventListener(SCALE_CHANGE_EVENT, onScale)
  }

  function teardown() {
    if (onScale) {
      window.removeEventListener(SCALE_CHANGE_EVENT, onScale)
      onScale = null
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
    inverseScale.value = s > 0 ? 1 / s : 1
  }

  return { scale, inverseScale, refresh }
}
