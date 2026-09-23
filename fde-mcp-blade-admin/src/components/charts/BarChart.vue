<template>
  <BaseChart :option="composedOption" :height="height" :loading="loading" />
</template>

<script setup>
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import { chartSeries, commonTooltip, commonLegend, commonAxis, commonGrid } from './theme'
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
  horizontal: {
    type: Boolean,
    default: false
  },
  stack: {
    type: Boolean,
    default: false
  }
})

const appStore = useAppStore()

const composedOption = computed(() => {
  // ⚠️ 这一行是**响应式依赖**，不是冗余代码：
  //    ECharts 画在 canvas 上读不到 CSS 变量，配色必须在构图时用令牌解析成真实色值；
  //    而令牌随主题变化 —— 只有让本 computed 依赖 appStore.theme，
  //    切主题时 option 才会重算，BaseChart 的 watch 才会把新配色写进画布。
  appStore.theme

  const palette = chartSeries()
  const seriesData = props.series.map((s, index) => {
    const color = palette[index % palette.length]
    return {
      name: s.name,
      type: 'bar',
      data: s.data,
      stack: props.stack ? 'total' : undefined,
      barMaxWidth: 32,
      itemStyle: {
        color,
        borderRadius: props.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
      }
    }
  })

  const axis = commonAxis()

  return {
    tooltip: { ...commonTooltip() },
    legend: { ...commonLegend() },
    grid: { ...commonGrid },
    xAxis: props.horizontal
      ? { type: 'value', ...axis }
      : { type: 'category', data: props.categories, ...axis },
    yAxis: props.horizontal
      ? { type: 'category', data: props.categories, ...axis }
      : { type: 'value', ...axis },
    series: seriesData
  }
})
</script>
