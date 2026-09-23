<template>
  <BaseChart :option="composedOption" :height="height" :loading="loading" />
</template>

<script setup>
import { computed } from 'vue'
import BaseChart from './BaseChart.vue'
import { chartSeries, uiTokens } from './theme'
import { useAppStore } from '@/stores/app'

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
    default: null // null = 用当前主题的序列色板
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

const appStore = useAppStore()

const composedOption = computed(() => {
  // ⚠️ 响应式依赖（同 BarChart）：让切主题时 option 重算，画布随之重绘
  appStore.theme

  const palette = props.colors && props.colors.length ? props.colors : chartSeries()
  const { text, text2, text3, line, card } = uiTokens()

  const radius = props.donut ? ['45%', '70%'] : ['0%', '70%']

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: card,
      borderColor: line,
      borderWidth: 1,
      textStyle: { color: text, fontSize: 13 },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: text2, fontSize: 13 },
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
            textStyle: { fontSize: 22, fontWeight: 600, color: text },
            subtextStyle: { fontSize: 13, color: text3 }
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
          color: text2
        },
        labelLine: {
          show: !props.donut,
          lineStyle: { color: text3 }
        },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 600 },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: line
          }
        },
        data: props.data.map((item, index) => ({
          ...item,
          itemStyle: { color: palette[index % palette.length] }
        }))
      }
    ]
  }
})
</script>
