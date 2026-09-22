// ==========================================
// 审计日志字典常量
// 用于操作审计、授权审计、令牌审计三个页面的
// 风险等级、指令类型、授权类型等枚举值
// 与 API 接口完全分离，便于独立维护
// ==========================================

import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

// ========== 基础常量（value / color，不含 label） ==========

const RISK_LEVEL_BASE = [
  { value: 'normal', color: 'gray' },
  { value: 'risk', color: 'orange' },
  { value: 'auth', color: 'red' },
  { value: 'disable', color: 'dark' }
]

const CMD_TYPE_BASE = [
  { value: 'device' },
  { value: 'service' },
  { value: 'controller' }
]

const GRANT_ACTION_BASE = [
  { value: 'grant' },
  { value: 'revoke' },
  { value: 'batch_grant' },
  { value: 'batch_revoke' }
]

const GRANT_TYPE_BASE = [
  { value: 'device' },
  { value: 'service' }
]

const TOKEN_ACTION_BASE = [
  { value: 'create' },
  { value: 'revoke' }
]

// 拦截类型（gis_risk_intercept_log）：表名虽为「风险拦截」，实际混装风险 / 频度 / 成本三类维度
const INTERCEPT_TYPE_BASE = [
  { value: 'disable', color: 'red', dimension: 'risk' },
  { value: 'visibility', color: 'red', dimension: 'risk' },
  { value: 'rate_limit', color: 'orange', dimension: 'frequency' },
  { value: 'budget', color: 'purple', dimension: 'cost' },
  { value: 'budget_warn', color: 'gold', dimension: 'cost' }
]

// ========== 静态常量（label 为中文，向后兼容） ==========

export const RISK_LEVEL_OPTIONS = [
  { value: 'normal', label: '普通', color: 'gray' },
  { value: 'risk', label: '风险', color: 'orange' },
  { value: 'auth', label: '授权', color: 'red' },
  { value: 'disable', label: '禁用', color: 'dark' }
]

export const RISK_LEVEL_MAP = RISK_LEVEL_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {})

export const CMD_TYPE_OPTIONS = [
  { value: 'device', label: '设备指令' },
  { value: 'service', label: '服务调用' },
  { value: 'controller', label: '控制器操作' }
]

export const GRANT_ACTION_OPTIONS = [
  { value: 'grant', label: '单个授权' },
  { value: 'revoke', label: '单个撤销' },
  { value: 'batch_grant', label: '批量授权' },
  { value: 'batch_revoke', label: '批量撤销' }
]

export const GRANT_TYPE_OPTIONS = [
  { value: 'device', label: '设备授权' },
  { value: 'service', label: '服务授权' }
]

export const TOKEN_ACTION_OPTIONS = [
  { value: 'create', label: '创建令牌' },
  { value: 'revoke', label: '撤销令牌' }
]

export const INTERCEPT_TYPE_OPTIONS = [
  { value: 'disable', label: '禁用级（永不执行）', color: 'red', dimension: 'risk' },
  { value: 'visibility', label: '越权尝试（无可见性）', color: 'red', dimension: 'risk' },
  { value: 'rate_limit', label: '调用过于频繁', color: 'orange', dimension: 'frequency' },
  { value: 'budget', label: '月度预算熔断', color: 'purple', dimension: 'cost' },
  { value: 'budget_warn', label: '月度预算预警', color: 'gold', dimension: 'cost' }
]

export const INTERCEPT_TYPE_MAP = INTERCEPT_TYPE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {})

// ========== i18n 标签映射 ==========

const RISK_LEVEL_LABEL_KEYS = {
  normal: 'riskLevelNormal',
  risk: 'riskLevelRisk',
  auth: 'riskLevelAuth',
  disable: 'riskLevelDisable'
}

const CMD_TYPE_LABEL_KEYS = {
  device: 'cmdTypeDevice',
  service: 'cmdTypeService',
  controller: 'cmdTypeController'
}

const GRANT_ACTION_LABEL_KEYS = {
  grant: 'grantActionGrant',
  revoke: 'grantActionRevoke',
  batch_grant: 'grantActionBatchGrant',
  batch_revoke: 'grantActionBatchRevoke'
}

const GRANT_TYPE_LABEL_KEYS = {
  device: 'grantTypeDevice',
  service: 'grantTypeService'
}

const TOKEN_ACTION_LABEL_KEYS = {
  create: 'tokenActionCreate',
  revoke: 'tokenActionRevoke'
}

const INTERCEPT_TYPE_LABEL_KEYS = {
  disable: 'interceptDisable',
  visibility: 'interceptVisibility',
  rate_limit: 'interceptRateLimit',
  budget: 'interceptBudget',
  budget_warn: 'interceptBudgetWarn'
}

// 拦截维度（风险 / 频度 / 成本）
const INTERCEPT_DIMENSION_LABEL_KEYS = {
  risk: 'dimensionRisk',
  frequency: 'dimensionFrequency',
  cost: 'dimensionCost'
}

// ========== 基于 i18n 的动态 composable（推荐在组件中使用） ==========

export function useAuditLogDict() {
  const { t } = useI18n()

  const buildOptions = (base, labelKeys) => {
    return computed(() => base.map(item => ({
      ...item,
      label: t(`auditLog.${labelKeys[item.value]}`)
    })))
  }

  const buildMap = (options) => {
    return computed(() => options.value.reduce((acc, item) => {
      acc[item.value] = item
      return acc
    }, {}))
  }

  const riskLevelOptions = buildOptions(RISK_LEVEL_BASE, RISK_LEVEL_LABEL_KEYS)
  const riskLevelMap = buildMap(riskLevelOptions)
  const cmdTypeOptions = buildOptions(CMD_TYPE_BASE, CMD_TYPE_LABEL_KEYS)
  const grantActionOptions = buildOptions(GRANT_ACTION_BASE, GRANT_ACTION_LABEL_KEYS)
  const grantTypeOptions = buildOptions(GRANT_TYPE_BASE, GRANT_TYPE_LABEL_KEYS)
  const tokenActionOptions = buildOptions(TOKEN_ACTION_BASE, TOKEN_ACTION_LABEL_KEYS)
  const interceptTypeOptions = buildOptions(INTERCEPT_TYPE_BASE, INTERCEPT_TYPE_LABEL_KEYS)
  const interceptTypeMap = buildMap(interceptTypeOptions)

  // 拦截维度标签（风险 / 频度 / 成本），键为 dimension 值
  const interceptDimensionMap = computed(() => Object.keys(INTERCEPT_DIMENSION_LABEL_KEYS).reduce((acc, key) => {
    acc[key] = t(`auditLog.${INTERCEPT_DIMENSION_LABEL_KEYS[key]}`)
    return acc
  }, {}))

  return {
    riskLevelOptions,
    riskLevelMap,
    cmdTypeOptions,
    grantActionOptions,
    grantTypeOptions,
    tokenActionOptions,
    interceptTypeOptions,
    interceptTypeMap,
    interceptDimensionMap
  }
}
