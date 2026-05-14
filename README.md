# one-screen-scale

基于 CSS `transform: scale()` 的一屏自适应方案。框架无关核心 + Vue 3 / React 开箱即用。

## 为什么用这个

- 🎯 **真正的"一屏"** — 内容不溢出、不滚动（contain 模式）
- 🧩 **零依赖核心** — 纯 JS，不绑定任何框架
- ⚡ **指令 / Hook 开箱即用** — Vue 3 和 React 都支持
- 🖥️ **Canvas 友好** — 通过反缩放补偿，ECharts 等 canvas 内容保持清晰

## 安装

```bash
npm install one-screen-scale
```

## 快速开始

### Vue 3 — 指令（最简）

```vue
<template>
  <div v-fit-screen class="page">
    <h1>活动标题</h1>
    <p>页面内容...</p>
  </div>
</template>

<script setup>
import { vFitScreen } from 'one-screen-scale'
</script>
```

### Vue 3 — Composable（需要 scale 值，如 ECharts 补偿）

```vue
<template>
  <div ref="pageRef" class="page">
    <div :style="{ transform: `scale(${inverseScale})` }">
      <ECharts />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFitScreen } from 'one-screen-scale'

const pageRef = ref(null)
const { scale, inverseScale } = useFitScreen(pageRef)
// inverseScale 可用于子元素反缩放补偿
</script>
```

### React

```jsx
import { useRef } from 'react'
import { useFitScreen } from 'one-screen-scale/react'

function App() {
  const pageRef = useRef(null)
  const { scale, inverseScale } = useFitScreen(pageRef)

  return (
    <div ref={pageRef} className="page">
      <h1>活动标题</h1>
    </div>
  )
}
```

### 纯 JS / jQuery

```js
import { createScaler } from 'one-screen-scale'

const scaler = createScaler(document.querySelector('.page'), {
  mode: 'contain'
})
scaler.start()

// 销毁
scaler.stop()
```

## 两种模式

| 模式 | 算法 | 效果 | 场景 |
|------|------|------|------|
| `contain`（默认） | `min(scaleX, scaleY)` | 内容完整可见，不溢出 | 活动页、落地页 |
| `fixed-width` | `visualWidth / max(innerWidth, screenWidth)` | 固定手机观感宽度，可滚动 | 规则页、长表单 |

```js
// contain（默认）
createScaler(el)

// fixed-width
createScaler(el, { mode: 'fixed-width', visualWidth: 450 })
```

## API

### 核心函数（框架无关）

```ts
calculateScale(options: ScaleOptions): number

applyScale(el: Element | string, scale: number, origin?: string): void

getPageScale(el?: Element | string): number        // 默认查 .share-page
getInverseScale(el?: Element | string): number     // 1 / getPageScale()

createScaler(el: Element | string, options?: ScalerOptions): ScalerInstance
```

### ScalerInstance

```ts
{
  start(): number    // 启动缩放 + 监听 resize，返回当前 scale
  stop(): void       // 停止监听
  refresh(): number  // 手动重算
  getScale(): number // 获取当前 scale
}
```

### ScalerOptions

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | `'contain' \| 'fixed-width'` | `'contain'` | 缩放模式 |
| `visualWidth` | `number` | `450` | fixed-width 模式目标视觉宽度 |
| `origin` | `string` | `'top center'` | transform-origin |
| `autoResize` | `boolean` | `true` | 自动监听窗口 resize |

### Vue

```ts
// 指令
vFitScreen: Directive<HTMLElement, ScalerOptions>

// Composable
useFitScreen(ref: Ref, options?: ScalerOptions): {
  scale: Ref<number>
  inverseScale: Ref<number>
  refresh: () => void
}
```

### React

```ts
import { useFitScreen } from 'one-screen-scale/react'

useFitScreen(ref: RefObject, options?: ScalerOptions): {
  scale: number
  inverseScale: number
  refresh: () => void
}
```

## Canvas / ECharts 模糊问题

CSS `transform: scale()` 缩放的是位图，canvas 内容会变糊。解决办法：对 canvas 容器做反缩放补偿。

```js
// Vue composable 示例
const { inverseScale } = useFitScreen(pageRef)

// 在包裹层上应用反缩放
// <div :style="{ transform: `scale(${inverseScale})`, transformOrigin: 'top left' }">
```

反缩放后 canvas 以原生分辨率渲染，保持清晰。详情见 [Canvas 缩放补偿指南](https://github.com/nicepkg/one-screen-scale)。

## License

MIT
