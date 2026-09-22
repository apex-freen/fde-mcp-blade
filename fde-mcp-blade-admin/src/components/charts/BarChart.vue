<template>
  <BaseChart :option="composedOption" :height="height" :loading="loading" />
</template>

<script setup>
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import { CHART_SERIES, commonTooltip, commonLegend, commonAxis, commonGrid } from './theme'

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

const composedOption = computed(() => {
  const seriesData = props.series.map((s, index) => {
    const color = CHART_SERIES[index % CHART_SERIES.length]
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

  return {
    tooltip: { ...commonTooltip },
    legend: { ...commonLegend },
    grid: { ...commonGrid },
    xAxis: props.horizontal
      ? { type: 'value', ...commonAxis }
      : { type: 'category', data: props.categories, ...commonAxis },
    yAxis: props.horizontal
      ? { type: 'category', data: props.categories, ...commonAxis }
      : { type: 'value', ...commonAxis },
    series: seriesData
  }
})
</script>
