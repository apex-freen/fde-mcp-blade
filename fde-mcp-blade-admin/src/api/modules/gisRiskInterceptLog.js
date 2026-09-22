// ==========================================
// 风险拦截记录接口（gis_risk_intercept_log）
// 文档：72 消息中心 · 前端对接 §6.3
// 说明：该表为「被拦下才写」的日志，当前可能为空，页面需做空态
// ==========================================

import { get, request } from '@/utils/request'

/**
 * 拦截记录列表（分页）
 * 权限码：audit:risk:alert（24）
 * @param {Object} params - 查询参数
 * @param {string} [params.intercept_type] - 拦截类型，支持逗号分隔多值
 * @param {string} [params.risk_level] - 风险等级（normal/risk/auth）
 * @param {number} [params.user_id] - 发起用户 ID
 * @param {string} [params.user_name] - 发起用户名（模糊）
 * @param {string} [params.tool_name] - 工具名
 * @param {string} [params.fun_key] - 功能键
 * @param {string} [params.begin_time] - 开始时间
 * @param {string} [params.end_time] - 结束时间
 * @param {number} [params.page] - 页码
 * @param {number} [params.page_size] - 每页条数
 */
export function getRiskInterceptLogList(params) {
  return get('/biz/gis_risk_intercept_log/list', params)
}

/**
 * 导出拦截记录（Excel）
 * 权限码：audit:export（26）
 * 响应为文件流，失败时（超 1 万行）返回 JSON，需用 extractBlobErrorMsg 解析提示
 * @param {Object} params - 与列表接口相同的筛选参数（不传分页）
 */
export function exportRiskInterceptLog(params) {
  return request({
    url: '/biz/gis_risk_intercept_log/export',
    method: 'GET',
    params,
    responseType: 'blob',
    showLoading: false,
    showError: false
  })
}
