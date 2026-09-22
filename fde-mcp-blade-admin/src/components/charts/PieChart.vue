<template>
  <BaseChart :option="composedOption" :height="height" :loading="loading" />
</template>

<script setup>
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import { CHART_SERIES } from './theme'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
    // 格式: [{ name: '普通', value: 120 }, { name: '风险', value: 30 }]
  },
  height: {
    type: String,
    default: '320px'
  },
  loading: {
    type: Boolean,
    default: false
  },
  colors: {
    type: Array,
    default: () => CHART_SERIES
  },
  donut: {
    type: Boolean,
    default: false
  },
  centerTitle: {
    type: String,
    default: ''
  },
  centerSubTitle: {
    type: String,
    default: ''
  }
})

const composedOption = computed(() => {
  const radius = props.donut ? ['45%', '70%'] : ['0%', '70%']

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#e5e6eb',
      borderWidth: 1,
      textStyle: { color: '#1d2129', fontSize: 13 },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#4e5969', fontSize: 13 },
      itemWidth: 10,
      itemHeight: 10
    },
    ...(props.centerTitle
      ? {
          title: {
            text: props.centerTitle,
            subtext: props.centerSubTitle,
            left: '32%',
            top: 'center',
            textAlign: 'center',
            textStyle: { fontSize: 22, fontWeight: 600, color: '#1d2129' },
            subtextStyle: { fontSize: 13, color: '#86909c' }
          }
        }
      : {}),
    series: [
      {
        type: 'pie',
        radius,
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: !props.donut,
          formatter: '{b}\n{d}%',
          fontSize: 12,
          color: '#4e5969'
        },
        labelLine: {
          show: !props.donut,
          lineStyle: { color: '#c9cdd4' }
        },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 600 },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.12)'
          }
        },
        data: props.data.map((item, index) => ({
          ...item,
          itemStyle: { color: props.colors[index % props.colors.length] }
        }))
      }
    ]
  }
})
</script>
