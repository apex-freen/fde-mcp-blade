// ==========================================
// 风险等级共享常量
// 用于插件方法和设备功能的风险等级标识
// 操作模式语义：直接执行 / 执行并记录 / 授权后执行 / 禁用功能
// ==========================================

import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const RISK_LEVEL_BASE = [
  { value: 'disable', color: 'gray' },
  { value: 'normal', color: 'green' },
  { value: 'risk', color: 'orange' },
  { value: 'auth', color: 'red' }
]

// 向后兼容：旧常量（label 为中文）
export const RISK_LEVEL_OPTIONS = [
  { value: 'disable', label: '禁用功能', color: 'gray' },
  { value: 'normal', label: '直接执行', color: 'green' },
  { value: 'risk', label: '执行并记录', color: 'orange' },
  { value: 'auth', label: '授权后执行', color: 'red' }
]

export const RISK_LEVEL_MAP = RISK_LEVEL_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {})

// 基于 i18n 的动态 composable（推荐在组件中使用）
export function useRiskLevelDict() {
  const { t } = useI18n()

  const riskLevelOptions = computed(() =>
    RISK_LEVEL_BASE.map(item => ({
      ...item,
      label: t(`riskLevel.${item.value}`)
    }))
  )

  const riskLevelMap = computed(() =>
    riskLevelOptions.value.reduce((acc, item) => {
      acc[item.value] = item
      return acc
    }, {})
  )

  return {
    riskLevelOptions,
    riskLevelMap
  }
}
