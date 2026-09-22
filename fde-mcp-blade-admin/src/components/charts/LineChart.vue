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
  area: {
    type: Boolean,
    default: false
  },
  smooth: {
    type: Boolean,
    default: true
  }
})

const composedOption = computed(() => {
  const seriesData = props.series.map((s, index) => {
    const color = CHART_SERIES[index % CHART_SERIES.length]
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
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: color + '40' },
                  { offset: 1, color: color + '05' }
                ]
              }
            }
          }
        : {})
    }
  })

  return {
    tooltip: { ...commonTooltip },
    legend: { ...commonLegend },
    grid: { ...commonGrid },
    xAxis: {
      type: 'category',
      data: props.categories,
      ...commonAxis,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      ...commonAxis
    },
    series: seriesData
  }
})
</script>
