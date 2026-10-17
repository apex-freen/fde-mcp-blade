// ==========================================
// 失败分类字典（failure category）
// 与后端 error_type / error.data.category 同一套值：
//   · 执行期错误：content[0].text = '{"code":-32029,"category":"rate_limited",
//     "retryable":true,"retry_after_ms":30000,"message":"…","hint":"…"}'
//   · 协议级错误：error.data 为同一结构
// 展示顺序即后端字典顺序；报告类页面按固定 8 个指标位渲染（缺失 → '-'）
// ==========================================

import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const FAIL_CATEGORY_BASE = [
  'param_error',
  'precondition_error',
  'auth_error',
  'perm_denied',
  'pending_approval',
  'rate_limited',
  'dependency_error',
  'system_error'
]

// ========== 静态常量（label 为中文，向后兼容） ==========

export const FAIL_CATEGORY_OPTIONS = [
  { value: 'param_error', label: '参数错误' },
  { value: 'precondition_error', label: '前置条件不满足' },
  { value: 'auth_error', label: '未登录或令牌失效' },
  { value: 'perm_denied', label: '权限拒绝' },
  { value: 'pending_approval', label: '待人工审批' },
  { value: 'rate_limited', label: '限流或预算熔断' },
  { value: 'dependency_error', label: '上游依赖异常' },
  { value: 'system_error', label: '系统错误' }
]

export const FAIL_CATEGORY_MAP = FAIL_CATEGORY_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {})

// ========== 基于 i18n 的动态字典（推荐在组件中使用） ==========

export function useFailCategoryDict() {
  const { t } = useI18n()

  const failCategoryOptions = computed(() =>
    FAIL_CATEGORY_BASE.map(value => ({ value, label: t(`failCategory.${value}`) }))
  )

  const failCategoryMap = computed(() =>
    failCategoryOptions.value.reduce((acc, item) => {
      acc[item.value] = item
      return acc
    }, {})
  )

  // 未知值回落显示原始值，空值显示 '-'（与列表页既有展示口径一致）
  const failCategoryLabel = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    return failCategoryMap.value[value]?.label || value
  }

  return {
    failCategoryOptions,
    failCategoryMap,
    failCategoryLabel
  }
}
