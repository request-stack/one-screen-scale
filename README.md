# one-screen-scale

基于 CSS `transform: scale()` 的一屏自适应方案。框架无关核心 + Vue 3 / React 开箱即用。

## 为什么用这个

- 🎯 **真正的"一屏"** — 内容不溢出、不滚动（contain 模式）
- 🧩 **零依赖核心** — 纯 JS，不绑定任何框架
- ⚡ **指令 / Hook 开箱即用** — Vue 3 和 React 都支持；挂载时自动注入基础宽高样式
- 🖥️ **Canvas 友好** — 通过反缩放补偿，ECharts 等 canvas 内容保持清晰

## 主要面向场景

面向已经用 **postcss-px-to-viewport**（或同类方案）做移动端适配的 H5 页面：

| 模式 | 用途 | 效果 |
|------|------|------|
| `contain`（默认） | 活动页 / 一屏落地页 | 任意设备完整展示一屏；高屏左右留白；极小视口仍能看到完整页；**PC 与手机看到的是同一张 H5** |
| `fixed-width` | 规则页 / 长表单 | 固定视觉宽度，内容可纵向滚动 |

不必再单独开发一套 PC 页。

## 页面怎么配合

指令会**自动注入**下列基础样式（可用 `injectBaseStyles: false` 关闭）：

**contain — 一屏**

```css
width: 100vw;
min-height: 100vh;
min-height: 100dvh;
```

算法用元素的 `offsetWidth / offsetHeight` 和视口比：`scale = min(视口宽/内容宽, 视口高/内容高)`。  
所以 **内容高度必须能被正确量出来**，PC 上（px→vw 后）通常会高于视口，scale 才会小于 1。

### ⚠️ contain 使用禁忌（否则 PC 看起来像「没缩放」）

1. **禁止用 `height: 100vh` / `100dvh` 锁死根节点高度**  
   只能用插件注入的 **`min-height`**。写成 `height: 100vh` 后，`offsetHeight ≈ 视口高` → `scaleY ≈ 1` → 整页几乎不缩。

2. **禁止把撑高页面的大图 / 主视觉设为 `position: absolute`（或脱离文档流）**  
   绝对定位不参与父级高度计算。常见错误：棋盘/海报 `position: absolute` + 外层 `flex: 1; min-height: 0` 去「填满一屏」→ 根节点高度仍被锁在视口上。  
   **正确做法：大图留在文档流里**（`position: relative` / 默认 static，`width: 100%; height: auto`），用图片自身比例撑开整页高度。

3. **避免「整页 flex 填视口、子项 `flex:1; min-height:0`」当唯一高度来源**  
   那会把布局收成刚好一屏，同样量不出「内容高于视口」。一屏裁切用 `overflow: hidden` 即可，高度仍交给内容。

**对照**

| 写法 | 结果 |
|------|------|
| `min-height: 100vh` + 大图在文档流 | ✅ PC/手机构图一致，contain 正常缩小 |
| `height: 100vh` 锁死 | ❌ PC scale≈1 |
| 大图 `absolute` + flex 填满视口 | ❌ 量不到真实内容高，PC 不缩 |

图片异步加载导致偶发量矮：插件默认 `observeContent: true`，会在尺寸变化后自动 `refresh`。

**fixed-width — 长滚动**

#### 什么时候用

规则页、协议、长表单这种内容比一屏高、需要上下滚动的页面。手机上看是正常宽度；PC 上视口更宽时，只把页面缩到一条手机宽（默认视觉宽 450），两边留白，不要把字拉得很大。

`contain` 不适合这种页：它要整页塞进一屏，长文会被缩得很小。

#### 插件做了什么，页面还要做什么

指令做两件事：

1. 按视口把根节点缩小，并把根节点的宽高写进行内样式。
2. 滚动条会跟着缩小。Chrome 里只把滚动条改窄、不写滑块颜色，滑块会直接消失。所以指令会给根节点和里面的滚动区域一起补上宽度和滑块颜色，看起来大约 6px。**滚动条样式不用再写。**

指令不知道标题要不要钉在上面、正文从哪里开始滚。这两件事是页面布局，必须自己写。只加 `v-fit-screen="{ mode: 'fixed-width' }"`、不写下边的结构，页面不会滚。

#### 怎么写

根节点做成纵向弹性盒，自己不滚动。标题高度固定。剩下的高度全部交给滚动区，由滚动区 `overflow-y: auto` 滚动。

```vue
<template>
  <div v-fit-screen="{ mode: 'fixed-width' }" class="rules-page">
    <header class="rules-header">标题</header>
    <div class="rules-scroll">
      <main>很长的正文...</main>
    </div>
  </div>
</template>

<style scoped>
.rules-page {
  display: flex;            /* 纵向排列标题和正文 */
  flex-direction: column;
  overflow: hidden;         /* 整页不滚，避免和内部滚动条抢 */
}

.rules-header {
  flex-shrink: 0;           /* 标题保持自己的高度，不被正文挤扁 */
}

.rules-scroll {
  flex: 1;                  /* 拿走标题下面的全部剩余高度 */
  min-height: 0;            /* 允许它比内容矮，否则 flex 子项不会出现滚动 */
  overflow-y: auto;         /* 正文超出这块区域时，在这里面滚 */
  overflow-x: hidden;
}
</style>
```

背景色、圆角按设计另写。三行滚动布局（`flex: 1`、`min-height: 0`、`overflow-y: auto`）不能省。

## 安装

```bash
npm install one-screen-scale
```

## 快速开始

### Vue 3 — 指令（最简）

```vue
<template>
  <!-- 一屏：自动注入 min-height:100vh + width:100vw -->
  <div v-fit-screen class="page">
    <h1>活动标题</h1>
    <p>页面内容...</p>
  </div>
</template>

<script setup>
import { vFitScreen } from 'one-screen-scale'
</script>
```

长滚动的完整结构见上面「fixed-width — 长滚动」：根节点 `display: flex; flex-direction: column; overflow: hidden`，滚动区 `flex: 1; min-height: 0; overflow-y: auto`。只写指令、不写这几行，页面不会滚。

### Vue 3 — `v-compensate`（第三方组件反缩放）

页面 `transform: scale` 后，ECharts 等常会尺寸偏小或量错。在槽位内再包一层即可（**JS 行内**写入）：

`width/height: 100% * pageScale` + `transform: scale(inverse)`，scale 读祖先 `--one-screen-scale`。

```vue
<template>
  <div v-fit-screen class="page">
    <div class="chart-slot">
      <div v-compensate.resize-canvas class="chart-inner">
        <div ref="chartEl" class="chart"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { vFitScreen, vCompensate, setCompensateEcharts } from 'one-screen-scale'

// 可选：全局注入 echarts，供 resizeCanvas 自动探测
setCompensateEcharts(echarts)
</script>
```

```css
.chart-slot { width: 100%; height: 300px; overflow: hidden; } /* 设计稿槽位，需明确宽高 */
.chart-inner, .chart { width: 100%; height: 100%; }
```

> **适用**：任意被页面 scale 搞小的区域，尤其 **canvas**——先反缩放，再用 `offsetWidth` 量盒（勿用 `getBoundingClientRect`）。  
> **`{ resizeCanvas: true }` / `.resize-canvas`**：补偿后通知子树 canvas 重绘（探测 ECharts / Chart.js，并在每个 `<canvas>` 上派发 `one-screen-scale-canvas-resize`）。  
> 只抵消页面 `v-fit-screen` 的 scale；**不处理**浏览器 Ctrl+/-。  
> **不适用**：`el-slider` 等依赖指针坐标 / 易被 overflow 裁切的控件。

### Vue 3 — Composable（需要拿到 scale 数值时）

```vue
<script setup>
import { ref } from 'vue'
import { useFitScreen } from 'one-screen-scale'

const pageRef = ref(null)
const { scale, inverseScale } = useFitScreen(pageRef)
</script>
```

### React

```jsx
import { useRef } from 'react'
import { useFitScreen, useCompensate } from 'one-screen-scale/react'

function App() {
  const pageRef = useRef(null)
  const chartInnerRef = useRef(null)
  const { scale, inverseScale } = useFitScreen(pageRef)
  // 需要通知子树 canvas 重绘时加 { resizeCanvas: true }
  useCompensate(chartInnerRef, { resizeCanvas: true })

  return (
    <div ref={pageRef} className="page">
      <div className="chart-slot" style={{ width: 350, height: 300 }}>
        <div ref={chartInnerRef} style={{ width: '100%', height: '100%' }}>
          <div id="chart" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  )
}
```

### 纯 JS / HTML

```js
import { createScaler, createCompensate } from 'one-screen-scale'

const page = document.querySelector('.page')
const scaler = createScaler(page, { mode: 'contain' })
scaler.start()

// 第三方组件反缩放（对应 Vue v-compensate / React useCompensate）
const inner = document.querySelector('.chart-inner')
const compensate = createCompensate(inner, { resizeCanvas: true })

// 销毁
compensate.stop()
scaler.stop() // 移除注入的 class，并还原本库写过的 inline 样式
```

## 两种模式

| 模式 | 算法 | 效果 | 场景 |
|------|------|------|------|
| `contain`（默认） | `min(scaleX, scaleY)` | 内容完整可见，不溢出 | 活动页、落地页 |
| `fixed-width` | `visualWidth / innerWidth`（视口 ≤ visualWidth 时为 1） | 固定手机观感宽度，可滚动 | 规则页、长表单 |

```js
// contain（默认）
createScaler(el)

// fixed-width
createScaler(el, { mode: 'fixed-width', visualWidth: 450 })

// 自己写根节点宽高时关闭注入
createScaler(el, { injectBaseStyles: false })
```

## API

### 核心函数（框架无关）

```ts
calculateScale(options: ScaleOptions): number

applyScale(el: Element | string, scale: number, origin?: string): void

getPageScale(el?: Element | string): number
getInverseScale(el?: Element | string): number

createScaler(el: Element | string, options?: ScalerOptions): ScalerInstance

ensureBaseStyleSheet(): HTMLStyleElement | null
applyBaseStyles(el: HTMLElement, mode?: 'contain' | 'fixed-width'): string | null
removeBaseStyles(el: HTMLElement): void
applyCompensateStyles(el: HTMLElement): string | null
removeCompensateStyles(el: HTMLElement): void

SCALE_CHANGE_EVENT // 'one-screen-scale-change'，页面 scale 变化时 window 上触发

// 组件反缩放（仅抵消页面 scale）
resolvePageScale(fromEl?): number
applyCompensateTransform(el): { scale, inverseScale }
clearCompensateTransform(el): void
createCompensate(el, options?: CompensateOptions): { refresh, stop }
resizeCanvasUnder(el, echartsLib?): number
setCompensateEcharts(echarts): void   // 可选，供 resizeCanvas 探测 ECharts
CANVAS_RESIZE_EVENT                   // 'one-screen-scale-canvas-resize'
```

### ScalerInstance

```ts
{
  start(): number    // 注入基础样式 + 启动缩放 + 监听 resize
  stop(): void       // 停止监听，移除注入 class，还原 inline
  refresh(): number  // 手动重算
  getScale(): number
}
```

### ScalerOptions

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | `'contain' \| 'fixed-width'` | `'contain'` | 缩放模式 |
| `visualWidth` | `number` | `450` | fixed-width 模式目标视觉宽度 |
| `origin` | `string` | `'top center'` | transform-origin |
| `autoResize` | `boolean` | `true` | 自动监听窗口 resize |
| `injectBaseStyles` | `boolean` | `true` | 是否自动注入模式所需宽高样式 |
| `observeContent` | `boolean` | `true` | 内容尺寸变化（如图片加载撑高）时自动重算，避免偶发 scale 偏大 |

### Vue

```ts
vFitScreen: Directive<HTMLElement, ScalerOptions>
vCompensate: Directive<HTMLElement>       // 第三方反缩放
vFitCompensate: Directive<HTMLElement>  // 同上别名

useFitScreen(ref: Ref, options?: ScalerOptions): {
  scale: Ref<number>
  inverseScale: Ref<number>
  refresh: () => void
}
```

### React（`one-screen-scale/react`）

```ts
useFitScreen(ref, options?: ScalerOptions): { scale, inverseScale, refresh }
useCompensate(ref, options?: CompensateOptions): { refresh }  // 对应 v-compensate
```

### CompensateOptions

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `resizeCanvas` | `boolean` | — | **可选**。补偿后通知子树 canvas 重绘 |
| `onRefresh` | `(detail) => void` | — | 每次写入反缩放后回调 |
| `echarts` / `echartsLib` | — | — | 旧名，等价于开启 `resizeCanvas`；对象形式可传 echarts 模块 |

也可 `setCompensateEcharts(echarts)` 全局注入，方便自动探测。

## Canvas 模糊 / 偏小

CSS `transform: scale()` 会把 **所有 canvas** 一起缩小。先反缩放，再重绘：

| 环境 | 反缩放 | 通知 canvas 重绘 |
|------|--------|------------------|
| Vue | `v-compensate` | `v-compensate.resize-canvas` |
| React | `useCompensate(ref)` | `useCompensate(ref, { resizeCanvas: true })` |
| 纯 JS | `createCompensate(el)` | `createCompensate(el, { resizeCanvas: true })` |

`resizeCanvas` 会：探测已加载的 ECharts / Chart.js；并在每个 `<canvas>` 上派发事件，自研库可监听：

```js
canvas.addEventListener('one-screen-scale-canvas-resize', (e) => {
  const { width, height } = e.detail
  myChart.resize(width, height)
})
```

手写等价：`width/height: 100% * pageScale` + `transform: scale(1/pageScale)`，量尺寸用 `offsetWidth`。

## License

MIT
