// ==========================================
// 审计日志统一接口（audit_log）
// 对应后端 3 个只读审计日志模块：
//   - gis_cmd_log   操作审计（对应前端 operation_log 页面）
//   - gis_grant_log 授权审计（对应前端 grant_log 页面）
//   - gis_token_log 令牌审计（对应前端 token_log 页面）
// 接口前缀：/biz/gis_*_log
// 设计原则：日志只读，仅支持查询和导出
// ==========================================

import { get, request } from '@/utils/request'

// 字典常量统一从 constants 管理，此处再导出以保持向后兼容
export {
  RISK_LEVEL_OPTIONS,
  RISK_LEVEL_MAP,
  CMD_TYPE_OPTIONS,
  GRANT_ACTION_OPTIONS,
  GRANT_TYPE_OPTIONS,
  TOKEN_ACTION_OPTIONS,
  useAuditLogDict
} from '@/constants/auditDict'

/**
 * 获取操作日志列表（分页）
 * @param {Object} params - 查询参数
 * @param {string} [params.risk_level] - 风险等级（normal/risk/auth/disable）
 * @param {string} [params.cmd_type] - 指令类型（device/service/controller）
 * @param {number} [params.user_id] - 请求用户 ID
 * @param {string} [params.user_name] - 请求用户名（模糊查询）
 * @param {string} [params.tool_name] - 工具名称（精确查询）
 * @param {string} [params.fun_key] - 功能键（精确查询）
 * @param {number} [params.eqp_id] - 设备 ID
 * @param {string} [params.eqp_client_id] - 设备客户端 ID
 * @param {boolean} [params.success] - 是否成功
 * @param {string} [params.begin_time] - 开始时间
 * @param {string} [params.end_time] - 结束时间
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.page_size=10] - 每页大小
 * @param {string} [params.order_by='log_id'] - 排序字段
 * @param {boolean} [params.is_asc=false] - 是否升序
 */
export function getCmdLogList(params) {
  return get('/biz/gis_cmd_log', params)
}

/**
 * 获取操作日志详情
 * @param {number} logId - 日志 ID
 */
export function getCmdLogDetail(logId) {
  return get(`/biz/gis_cmd_log/${logId}`)
}

/**
 * 导出操作日志（Excel）
 * 触发浏览器下载 gis_cmd_log_YYYYMMDDHHMMSS.xlsx
 * @param {Object} params - 与列表接口相同的筛选参数
 * @param {Object} [options] - 额外请求配置（如 { showError: false } 由调用方自行处理错误提示）
 */
export function exportCmdLog(params, options = {}) {
  return request({
    url: '/biz/gis_cmd_log/export',
    method: 'GET',
    params,
    responseType: 'blob',
    showLoading: false,
    ...options
  })
}

// ========== gis_grant_log 授权审计接口 ==========

/**
 * 获取授权日志列表（分页）
 * @param {Object} params - 查询参数
 * @param {string} [params.risk_level] - 风险等级（normal/risk/auth）
 * @param {string} [params.action_type] - 操作类型（grant/revoke/batch_grant/batch_revoke）
 * @param {number} [params.operator_id] - 操作人 ID
 * @param {string} [params.operator_name] - 操作人名称（模糊查询）
 * @param {number} [params.gis_user_id] - 被授权用户 ID
 * @param {string} [params.out_agent_id] - 智能体外部 ID
 * @param {string} [params.grant_type] - 授权类型（device/service）
 * @param {number} [params.eqp_id] - 设备 ID
 * @param {string} [params.eqp_name] - 设备名称（模糊查询）
 * @param {string} [params.fun_key] - 功能键
 * @param {boolean} [params.success] - 是否成功
 * @param {string} [params.begin_time] - 开始时间
 * @param {string} [params.end_time] - 结束时间
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.page_size=10] - 每页大小
 * @param {string} [params.order_by='log_id'] - 排序字段
 * @param {boolean} [params.is_asc=false] - 是否升序
 */
export function getGrantLogList(params) {
  return get('/biz/gis_grant_log', params)
}

/**
 * 获取授权日志详情
 * @param {number} logId - 日志 ID
 */
export function getGrantLogDetail(logId) {
  return get(`/biz/gis_grant_log/${logId}`)
}

/**
 * 导出授权日志（Excel）
 * 触发浏览器下载 gis_grant_log_YYYYMMDDHHMMSS.xlsx
 * @param {Object} params - 与列表接口相同的筛选参数
 */
export function exportGrantLog(params) {
  return request({
    url: '/biz/gis_grant_log/export',
    method: 'GET',
    params,
    responseType: 'blob',
    showLoading: false
  })
}

// ========== gis_token_log 令牌审计接口 ==========

/**
 * 获取令牌日志列表（分页）
 * @param {Object} params - 查询参数
 * @param {string} [params.risk_level] - 风险等级（normal/risk/auth）
 * @param {number} [params.token_id] - 关联令牌 ID
 * @param {string} [params.action] - 操作类型（create/revoke）
 * @param {number} [params.operator_id] - 操作人 ID
 * @param {string} [params.operator_name] - 操作人名称（模糊查询）
 * @param {string} [params.begin_time] - 开始时间
 * @param {string} [params.end_time] - 结束时间
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.page_size=10] - 每页大小
 * @param {string} [params.order_by='id'] - 排序字段
 * @param {boolean} [params.is_asc=false] - 是否升序
 */
export function getTokenLogList(params) {
  return get('/biz/gis_token_log', params)
}

/**
 * 获取令牌日志详情
 * @param {number} id - 日志 ID
 */
export function getTokenLogDetail(id) {
  return get(`/biz/gis_token_log/${id}`)
}

/**
 * 导出令牌日志（Excel）
 * 触发浏览器下载 gis_token_log_YYYYMMDDHHMMSS.xlsx
 * @param {Object} params - 与列表接口相同的筛选参数
 */
export function exportTokenLog(params) {
  return request({
    url: '/biz/gis_token_log/export',
    method: 'GET',
    params,
    responseType: 'blob',
    showLoading: false
  })
}
