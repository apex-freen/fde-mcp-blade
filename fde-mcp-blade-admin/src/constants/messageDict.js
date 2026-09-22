// ==========================================
// 消息中心字典常量
// 文档：72 消息中心 · 前端对接 §四
// 用于 message/notification、message/risk、message/all 三页共用
// ==========================================

import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

// ========== 基础常量（value / color，不含 label） ==========

// 消息级别：todo 待办需处理 / alert 告警 / notice 通知 / risk 风险留痕
const EVENT_LEVEL_BASE = [
  { value: 'todo', color: 'red' },
  { value: 'alert', color: 'orange' },
  { value: 'notice', color: 'arcoblue' },
  { value: 'risk', color: 'gray' }
]

// 外发状态：none 未尝试（正常）/ pending 投递中 / sent 已通知 / failed 失败 / skipped 跳过
const DELIVER_STATUS_BASE = [
  { value: 'none', color: 'gray' },
  { value: 'pending', color: 'arcoblue' },
  { value: 'sent', color: 'green' },
  { value: 'failed', color: 'red' },
  { value: 'skipped', color: 'gray' }
]

// ========== 静态常量（label 为中文，向后兼容） ==========

export const EVENT_LEVEL_OPTIONS = [
  { value: 'todo', label: '待办', color: 'red' },
  { value: 'alert', label: '告警', color: 'orange' },
  { value: 'notice', label: '通知', color: 'arcoblue' },
  { value: 'risk', label: '风险留痕', color: 'gray' }
]

export const EVENT_LEVEL_MAP = EVENT_LEVEL_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {})

export const DELIVER_STATUS_OPTIONS = [
  { value: 'none', label: '未开启通知', color: 'gray' },
  { value: 'pending', label: '通知中', color: 'arcoblue' },
  { value: 'sent', label: '已通知', color: 'green' },
  { value: 'failed', label: '通知失败', color: 'red' },
  { value: 'skipped', label: '已跳过', color: 'gray' }
]

export const DELIVER_STATUS_MAP = DELIVER_STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {})

// ========== i18n 标签映射 ==========

const EVENT_LEVEL_LABEL_KEYS = {
  todo: 'levelTodo',
  alert: 'levelAlert',
  notice: 'levelNotice',
  risk: 'levelRisk'
}

const DELIVER_STATUS_LABEL_KEYS = {
  none: 'deliverNone',
  pending: 'deliverPending',
  sent: 'deliverSent',
  failed: 'deliverFailed',
  skipped: 'deliverSkipped'
}

// ========== 基于 i18n 的动态 composable ==========

export function useMessageDict() {
  const { t } = useI18n()

  const buildOptions = (base, labelKeys) => {
    return computed(() => base.map(item => ({
      ...item,
      label: t(`message.${labelKeys[item.value]}`)
    })))
  }

  const buildMap = (options) => {
    return computed(() => options.value.reduce((acc, item) => {
      acc[item.value] = item
      return acc
    }, {}))
  }

  const eventLevelOptions = buildOptions(EVENT_LEVEL_BASE, EVENT_LEVEL_LABEL_KEYS)
  const eventLevelMap = buildMap(eventLevelOptions)
  const deliverStatusOptions = buildOptions(DELIVER_STATUS_BASE, DELIVER_STATUS_LABEL_KEYS)
  const deliverStatusMap = buildMap(deliverStatusOptions)

  return {
    eventLevelOptions,
    eventLevelMap,
    deliverStatusOptions,
    deliverStatusMap
  }
}
