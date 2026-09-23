<template>
  <BaseChart :option="composedOption" :height="height" :loading="loading" />
</template>

<script setup>
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import {
  chartSeries,
  withAlpha,
  commonTooltip,
  commonLegend,
  commonAxis,
  commonGrid
} from './theme'
import { useAppStore } from '@/stores/app'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  series: {
    type: Array,
    default: () => []
  },
  height: {
    type: String,
    default: '320px'
  },
  loading: {
    type: Boolean,
    default: false
  },
  area: {
    type: Boolean,
    default: false
  },
  smooth: {
    type: Boolean,
    default: true
  }
})

const appStore = useAppStore()

const composedOption = computed(() => {
  // ⚠️ 响应式依赖（同 BarChart）：让切主题时 option 重算，画布随之重绘
  appStore.theme

  const palette = chartSeries()
  const seriesData = props.series.map((s, index) => {
    const color = palette[index % palette.length]
    return {
      name: s.name,
      type: 'line',
      data: s.data,
      smooth: props.smooth,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color },
      itemStyle: { color },
      ...(props.area
        ? {
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                // 用 withAlpha 而不是 `color + '40'`：后者只在 hex 上成立，
                // 令牌一旦解析成 rgb()/rgba() 就会拼出非法色值
                colorStops: [
                  { offset: 0, color: withAlpha(color, 0.28) },
                  { offset: 1, color: withAlpha(color, 0.02) }
                ]
              }
            }
          }
        : {})
    }
  })

  const axis = commonAxis()

  return {
    tooltip: { ...commonTooltip() },
    legend: { ...commonLegend() },
    grid: { ...commonGrid },
    xAxis: {
      type: 'category',
      data: props.categories,
      ...axis,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      ...axis
    },
    series: seriesData
  }
})
</script>
