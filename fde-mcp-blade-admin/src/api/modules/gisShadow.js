// ==========================================
// 影子演练接口（gis_shadow 模块，Doc 47 §9）
// 接口前缀：/biz/gis_shadow
// 影子演练为宿主能力：开关住在实例配置，拦截/记录/审批/执行全由宿主完成
// 安全约定：重放用的原始参数加密存储，任何接口都不返回，前端只有 params_masked 视图
// ==========================================

import { get, post } from '@/utils/request'

/**
 * 查询影子演练记录列表
 * @param {Object} [params]
 * @param {string} [params.plugin_name] - 按插件筛选
 * @param {string} [params.status] - pending / approved / rejected / failed
 * @param {number} [params.limit] - 默认 100，上限 500
 */
export function getShadowList(params) {
  return get('/biz/gis_shadow', params)
}

/**
 * 查询各插件影子开关 + 各状态计数
 * @param {Object} [params]
 * @param {string} [params.plugin_name] - 按插件筛选
 */
export function getShadowStatus(params) {
  return get('/biz/gis_shadow/status', params)
}

/**
 * 批准记录（由宿主真实执行一次，可能耗时较久）
 * @param {string} recordId - 记录 id（形如 sh-…）
 * @param {Object} [data]
 * @param {string} [data.note] - 审批备注
 * @param {string} [data.approver] - 审批人
 */
export function approveShadow(recordId, data) {
  return post(`/biz/gis_shadow/${recordId}/approve`, data, { showLoading: true })
}

/**
 * 驳回记录（不执行）
 * @param {string} recordId - 记录 id（形如 sh-…）
 * @param {Object} [data]
 * @param {string} [data.note] - 审批备注
 * @param {string} [data.approver] - 审批人
 */
export function rejectShadow(recordId, data) {
  return post(`/biz/gis_shadow/${recordId}/reject`, data, { showLoading: true })
}

/**
 * 开关某插件的影子模式（写入实例配置）
 * @param {Object} data
 * @param {string} data.plugin_name - 插件名称
 * @param {boolean} data.shadow_mode - 是否开启影子模式
 */
export function setShadowMode(data) {
  return post('/biz/gis_shadow/mode', data, { showLoading: true })
}
