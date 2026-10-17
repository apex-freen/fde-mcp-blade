// ==========================================
// MCP 调用结果三态（call outcome）
//
// 项目红线：**不要用 success 布尔直接判「失败」**，按 outcome 三态渲染：
//   pending    ← error_type === 'pending_approval'
//                 或 handover === true && success === false && approval_id != null
//   succeeded  ← success === true
//   failed     ← 其余
//
// pending 语义 = 「已受理、等人工点头」，**不是失败**；
// 批准后系统会自动重放（时间线里会出现同一 approval_id 的第二行）。
//
// 统计提示：算「成功率」时不要逐行数 success，分母应为「已评估」（剔除 pending 行），
//           与报表口径（success ÷ evaluated）保持一致。
// ==========================================

import { useI18n } from 'vue-i18n'

export const CALL_OUTCOME = {
  pending: 'pending',
  succeeded: 'succeeded',
  failed: 'failed'
}

const OUTCOME_COLOR = {
  [CALL_OUTCOME.succeeded]: 'green',
  // 灰底：待办未决，既不是成功也不是失败
  [CALL_OUTCOME.pending]: 'gray',
  [CALL_OUTCOME.failed]: 'red'
}

/**
 * 判定单次调用的结果三态（纯函数，不依赖 i18n）
 * @param {Object} record - 调用日志行（success / error_type / handover / approval_id）
 * @returns {'succeeded'|'pending'|'failed'}
 */
export function resolveCallOutcome(record = {}) {
  const success = record?.success === true
  if (record?.error_type === 'pending_approval') return CALL_OUTCOME.pending
  const hasApproval = record?.approval_id !== null && record?.approval_id !== undefined
  if (record?.handover === true && !success && hasApproval) return CALL_OUTCOME.pending
  return success ? CALL_OUTCOME.succeeded : CALL_OUTCOME.failed
}

export function useCallOutcomeDict() {
  const { t } = useI18n()

  /**
   * 行级渲染：给一条调用记录 → { value, label, color, tip }
   * tip 优先用 result_msg（接口已打码，可直接展示）；
   * pending 且无 result_msg 时用「待审批」说明兜底。
   */
  function callOutcome(record) {
    const value = resolveCallOutcome(record)
    const tip =
      record?.result_msg ||
      (value === CALL_OUTCOME.pending ? t('callOutcome.pendingTip') : '')
    return {
      value,
      color: OUTCOME_COLOR[value],
      label: t(`callOutcome.${value}`),
      tip
    }
  }

  return { callOutcome }
}
