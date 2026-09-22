<template>
  <div ref="chartRef" :style="{ width: '100%', height: height }" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, shallowRef } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  option: {
    type: Object,
    required: true
  },
  height: {
    type: String,
    default: '320px'
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const chartRef = ref(null)
const chartInstance = shallowRef(null)

function initChart() {
  if (!chartRef.value) return
  chartInstance.value = echarts.init(chartRef.value)
  chartInstance.value.setOption(props.option)
}

function resizeChart() {
  chartInstance.value?.resize()
}

watch(
  () => props.option,
  (newOption) => {
    if (chartInstance.value && newOption) {
      chartInstance.value.setOption(newOption, true)
    }
  },
  { deep: true }
)

watch(
  () => props.loading,
  (val) => {
    if (chartInstance.value) {
      if (val) {
        chartInstance.value.showLoading('default', {
          text: '加载中...',
          color: '#6d5ce7',
          textColor: '#999',
          maskColor: 'rgba(255, 255, 255, 0.6)'
        })
      } else {
        chartInstance.value.hideLoading()
      }
    }
  }
)

onMounted(() => {
  nextTick(() => {
    initChart()
    window.addEventListener('resize', resizeChart)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chartInstance.value?.dispose()
  chartInstance.value = null
})

defineExpose({
  getInstance: () => chartInstance.value,
  resize: resizeChart
})
</script>
