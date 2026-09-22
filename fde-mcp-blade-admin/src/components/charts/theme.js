// ==========================================
// ECharts 通用主题配置
// 所有图表共享的配色、字体、间距等设计规范
// ==========================================

// 品牌色系
export const BRAND_COLORS = {
  primary: '#6d5ce7',
  success: '#00b42a',
  warning: '#ff7d00',
  danger: '#f53f3f',
  info: '#0ea5e9',
  purple: '#86909c'
}

// 图表序列色板（用于多系列图表）
export const CHART_SERIES = [
  '#6d5ce7', // 品牌紫
  '#0ea5e9', // 天蓝
  '#00b42a', // 绿色
  '#ff7d00', // 橙色
  '#f53f3f', // 红色
  '#86909c'  // 灰色
]

// 风险等级配色
export const RISK_COLORS = {
  normal: '#86909c',
  risk: '#ff7d00',
  auth: '#f53f3f',
  disable: '#1d2129'
}

// 通用 tooltip 配置
export const commonTooltip = {
  trigger: 'axis',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  borderColor: '#e5e6eb',
  borderWidth: 1,
  textStyle: {
    color: '#1d2129',
    fontSize: 13
  },
  axisPointer: {
    type: 'shadow',
    shadowStyle: {
      color: 'rgba(109, 92, 231, 0.06)'
    }
  }
}

// 通用 legend 配置
export const commonLegend = {
  top: 0,
  textStyle: {
    color: '#4e5969',
    fontSize: 13
  },
  itemWidth: 12,
  itemHeight: 12,
  itemGap: 20
}

// 通用坐标轴配置
export const commonAxis = {
  axisLine: {
    lineStyle: { color: '#e5e6eb' }
  },
  axisTick: { show: false },
  axisLabel: {
    color: '#86909c',
    fontSize: 12
  },
  splitLine: {
    lineStyle: {
      color: '#f2f3f5',
      type: 'dashed'
    }
  }
}

// 通用网格配置
export const commonGrid = {
  top: 40,
  right: 24,
  bottom: 24,
  left: 48,
  containLabel: true
}

// 生成渐变色
export function createGradient(colorStart, colorEnd) {
  return new (Function.prototype.bind.apply(Function, [null, 'echarts', `
    return {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0, color: '${colorStart}' },
        { offset: 1, color: '${colorEnd}' }
      ]
    }
  `]))()
}

// 合并配置的辅助函数
export function mergeOption(base, override = {}) {
  return { ...base, ...override }
}
