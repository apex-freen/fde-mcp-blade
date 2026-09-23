// ==========================================
// ECharts 通用主题配置
//
// ⚠️ 与 DOM 样式的关键区别：ECharts 画在 canvas 上，**读不到 CSS 变量**
//    （`color: 'var(--c-blue)'` 会直接失效）。所以这里统一走
//    `@/config/theme` 的 `readToken()`，在**构图那一刻**把令牌解析成真实色值。
//
// 因此本文件导出的是**函数**而不是常量：
//   - 常量在模块加载时求值一次，主题切换后不会更新；
//   - 函数在每次 setOption 前求值，配合图表组件里对 `appStore.theme` 的依赖，
//     切主题即可重绘（见 BarChart / LineChart / PieChart）。
//
// M3 视觉落地前的旧值（品牌紫 #6d5ce7 一套浅色系配色）已作废 —— 那是老 Apex 品牌，
// 且暗色主题下会画出白底 tooltip + 深灰轴线，与页面完全脱节。
// ==========================================

import { readToken } from '@/config/theme'

// 静态兜底（取不到令牌时用，与 tokens.scss 亮色值一致）
const FALLBACK = {
  blue: '#4d7cfe',
  violet: '#8b5cf6',
  teal: '#14b8a6',
  amber: '#f59e0b',
  green: '#22c55e',
  red: '#ef4444',
  text: '#0e1729',
  text2: '#5a6683',
  text3: '#94a1b8',
  text4: '#c3cbda',
  line: 'rgba(15, 23, 42, 0.08)',
  lineSoft: 'rgba(15, 23, 42, 0.05)',
  card: '#ffffff',
  blueTint: 'rgba(77, 124, 254, 0.06)'
}

const tok = (name, fb) => readToken(name, fb)

/** 品牌色（每次调用实时取令牌） */
export const brandColors = () => ({
  primary: tok('--c-blue', FALLBACK.blue),
  violet: tok('--c-violet', FALLBACK.violet),
  teal: tok('--c-teal', FALLBACK.teal),
  warning: tok('--c-amber', FALLBACK.amber),
  success: tok('--c-green', FALLBACK.green),
  danger: tok('--c-red', FALLBACK.red),
  info: tok('--text-3', FALLBACK.text3)
})

/** 图表序列色板（多系列图表按序取用） */
export const chartSeries = () => {
  const c = brandColors()
  return [c.primary, c.violet, c.teal, c.warning, c.danger, c.info]
}

/** 风险等级配色（normal / risk / auth / disable，与 riskLevel 词典一致） */
export const riskColors = () => ({
  normal: tok('--ink-green', '#15803d'),
  risk: tok('--c-amber', FALLBACK.amber),
  auth: tok('--c-red', FALLBACK.red),
  disable: tok('--text-4', FALLBACK.text4)
})

/** 给 6 位 hex 加透明度；取不到 hex（如已带 alpha 的 rgba）时原样返回 */
export function withAlpha(color, alpha) {
  const hex = String(color || '').trim()
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 通用 tooltip（跟随主题） */
export const commonTooltip = () => ({
  trigger: 'axis',
  backgroundColor: tok('--card', FALLBACK.card),
  borderColor: tok('--line', FALLBACK.line),
  borderWidth: 1,
  textStyle: {
    color: tok('--text', FALLBACK.text),
    fontSize: 13
  },
  axisPointer: {
    type: 'shadow',
    shadowStyle: {
      color: tok('--c-blue-tint', FALLBACK.blueTint)
    }
  }
})

/** 通用 legend（跟随主题） */
export const commonLegend = () => ({
  top: 0,
  textStyle: {
    color: tok('--text-2', FALLBACK.text2),
    fontSize: 13
  },
  itemWidth: 12,
  itemHeight: 12,
  itemGap: 20
})

/** 通用坐标轴（跟随主题） */
export const commonAxis = () => ({
  axisLine: {
    lineStyle: { color: tok('--line', FALLBACK.line) }
  },
  axisTick: { show: false },
  axisLabel: {
    color: tok('--text-3', FALLBACK.text3),
    fontSize: 12
  },
  splitLine: {
    lineStyle: {
      color: tok('--line-soft', FALLBACK.lineSoft),
      type: 'dashed'
    }
  }
})

/** 通用网格（与主题无关） */
export const commonGrid = {
  top: 40,
  right: 24,
  bottom: 24,
  left: 48,
  containLabel: true
}

/**
 * 常用语义色一次性取用（供 `.vue` 组件内部使用，避免在 `.vue` 里写兜底字面量）
 *
 * 返回：{ text, text2, text3, text4, line, lineSoft, card }
 */
export function uiTokens() {
  return {
    text: tok('--text', FALLBACK.text),
    text2: tok('--text-2', FALLBACK.text2),
    text3: tok('--text-3', FALLBACK.text3),
    text4: tok('--text-4', FALLBACK.text4),
    line: tok('--line', FALLBACK.line),
    lineSoft: tok('--line-soft', FALLBACK.lineSoft),
    card: tok('--card', FALLBACK.card)
  }
}

/**
 * ECharts showLoading 取色（跟随主题）
 *
 * 放在这里而不是组件里：`.vue` 内禁止颜色字面量（CI 门禁扫 `.vue`），
 * 兜底字面量统一收在本 `.js`。
 */
export function loadingColors() {
  const card = tok('--card', FALLBACK.card)
  return {
    color: tok('--c-blue', FALLBACK.blue),
    textColor: tok('--text-3', FALLBACK.text3),
    maskColor: withAlpha(card, 0.72)
  }
}

/** 合并配置的辅助函数 */
export function mergeOption(base, override = {}) {
  return { ...base, ...override }
}

// ---------------------------------------------------------------- 兼容导出
// ⚠️ 这几个是「模块加载时的快照」，主题切换不会更新 —— 仅为不打断旧引用而保留。
//    新代码请用上面的函数版本（BarChart / LineChart / PieChart 已全部切换）。
export const BRAND_COLORS = brandColors()
export const CHART_SERIES = chartSeries()
export const RISK_COLORS = riskColors()
