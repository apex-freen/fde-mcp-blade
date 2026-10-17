// ==========================================
// 业务单据链路（gis_biz_object）
// 对应后端：/biz/gis_biz_object*
// 文档：38 biz_object_id 前端对接文档 §二 / §三
// 页面：单据生命周期看板 + 单据时间线详情（落点见交付说明）
// 说明：
//   - 5 个接口只校验登录 JWT，无权限点；菜单可见性另由页面权限决定；
//   - 全部只读，停摆告警只提示、不改单据状态；
//   - 分页：page 默认 1，page_size 默认 10（按 [1,100] 截断），越界返回空数组但 total 真实；
//   - 时间出参统一 YYYY-MM-DD HH:MM:SS，入参 begin_time/end_time 支持 YYYY-MM-DD 或带时分秒。
// ==========================================

import { get, post } from '@/utils/request'

/**
 * 看板汇总（场景维度 + 总计 + 未归单据调用数）
 * @param {{begin_time?: string, end_time?: string, stall_days?: number}} params
 *   begin_time / end_time 按单据开始时间过滤；stall_days 缺省 7，范围 1~365
 */
export function getBizSummary(params = {}) {
  return get('/biz/gis_biz_object/summary', params)
}

/**
 * 单据列表
 * @param {Object} params
 * @param {string} [params.biz_object_id] - 模糊匹配
 * @param {string} [params.biz_scene] - 精确匹配
 * @param {string} [params.status] - open / in_progress / done / failed / cancelled
 * @param {boolean} [params.stalled] - true 只看停摆 / false 只看未停摆 / 不传 = 全部
 * @param {number} [params.stall_days] - 停摆阈值（天），缺省 7
 * @param {string} [params.begin_time] / [params.end_time]
 * @param {number} [params.page] / [params.page_size] - 默认 1 / 10
 * @param {string} [params.order_by] - biz_object_id / biz_scene / status / current_stage /
 *   started_time / last_call_time（默认）/ ended_time / call_count / silent_days
 * @param {boolean} [params.is_asc] - 默认 false（倒序）
 */
export function getBizList(params = {}) {
  return get('/biz/gis_biz_object', params)
}

/**
 * 单据详情（节点计划 plan + 端到端时间线 timeline，时间线最多 500 行）
 * 不存在或不可见 → HTTP 400 + code=404
 * @param {string} bizObjectId - 单据号，如 WO-2026-0915-0001
 * @param {{stall_days?: number}} params
 */
export function getBizDetail(bizObjectId, params = {}) {
  return get(`/biz/gis_biz_object/${bizObjectId}`, params)
}

/**
 * 单次调用详情（1065 新增，时间线行下钻）
 * 鉴权 = 单据可见性 + log_id 必须属于该单据；log_id 不属于该单据 → HTTP 400 + code=404
 * request_params / response_body / result_msg 均已在落库前完成 PII 打码，可直接展示
 * @param {string} bizObjectId - 单据号
 * @param {number|string} logId - 时间线行的 log_id
 */
export function getBizCallDetail(bizObjectId, logId) {
  return get(`/biz/gis_biz_object/${bizObjectId}/call/${logId}`)
}

/**
 * 停摆告警列表
 * @param {Object} params
 * @param {string} [params.biz_object_id] - 模糊匹配
 * @param {string} [params.biz_scene]
 * @param {string} [params.status] - open（停摆中未处理）/ resolved（已恢复或已处理）
 * @param {boolean} [params.notified] - true 只看已推送 / false 只看未推送
 * @param {number} [params.page] / [params.page_size]
 * @param {string} [params.order_by] - created_time（默认）/ silent_days / stall_days / resolved_time
 * @param {boolean} [params.is_asc] - 默认 false（新告警在前）
 */
export function getStallAlertList(params = {}) {
  return get('/biz/gis_biz_object/stall_alert/list', params)
}

/**
 * 手动触发一次停摆巡检（值班 / 演示；与每日 09:00 定时任务同一实现，幂等）
 * @param {{stall_days?: number}} data - 缺省 7
 * @returns data = { opened, resolved, stall_days }
 */
export function scanStallAlert(data = {}) {
  return post('/biz/gis_biz_object/stall_alert/scan', data)
}

/**
 * 单据作废（B4，1060 新增）
 * @param {string} bizObjectId - 单据号
 * @param {{reason: string}} data - reason 必填非空（会落到留痕表，可审计）
 * 行为：status='cancelled' + 写入 ended_time
 * 失败：已在终态（done/failed/cancelled）→ 400；原因空 → 400；单据不可见 → 403
 */
export function closeBizObject(bizObjectId, data) {
  return post(`/biz/gis_biz_object/${bizObjectId}/close`, data)
}
