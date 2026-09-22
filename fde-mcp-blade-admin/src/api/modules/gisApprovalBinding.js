// ==========================================
// 授权人绑定配置（gis_approval_binding）
// 对应后端：/biz/gis_approval_binding/*
// 文档：41 HITL 前端对接文档 §12.1
// 页面：1056 授权人绑定 /controller/settings/approval/binding/index（权限点 37，仅决定菜单显隐）
// 说明：审批链路的 resolve_approver() 按三级匹配查这张表：
//   1. operation_type = 方法名（如 dify.doc.upload）
//   2. operation_type = 工具名:方法名（如 local_service_call:dify.doc.upload）
//   3. operation_type = 工具名（如 local_service_call）
//   三级都没命中 → 回退管理员（第一个拥有 admin 角色且未停用的用户，65 文档 §6.1）
// ==========================================

import { del, get, post, put } from '@/utils/request'

/**
 * 绑定列表
 * @param {{operation_type?: string, status?: string, page?: number, page_size?: number}} params
 *   operation_type 为精确匹配；status：0 启用 / 1 禁用
 */
export function getBindingList(params = {}) {
  return get('/biz/gis_approval_binding/list', params)
}

/**
 * 绑定详情
 * @param {number} id - binding_id（不存在 → HTTP 400 + code=404）
 */
export function getBindingDetail(id) {
  return get(`/biz/gis_approval_binding/${id}`)
}

/**
 * 新建绑定
 * @param {Object} data
 * @param {string} data.operation_type - 必填，方法名 / 工具名:方法名 / 工具名
 * @param {string} data.approver_type - 必填，user（按人）/ role（按角色，当前只取第一个 id）
 * @param {Array<number|string>} data.approver_ids - 必填，如 [1] 或 ['1','7']
 * @param {string} [data.operation_name] - 显示名，如「重启设备」
 * @param {number} [data.order_index] - 多人顺序审批未启用，先传 0
 * @param {string} [data.description]
 * @param {string} [data.status] - 0 启用（默认）/ 1 禁用
 * @param {string} [data.created_by]
 */
export function createBinding(data) {
  return post('/biz/gis_approval_binding/create', data)
}

/**
 * 更新绑定（operation_type / approver_type / approver_ids 必填）
 * @param {number} id - binding_id
 */
export function updateBinding(id, data) {
  return put(`/biz/gis_approval_binding/${id}`, data)
}

/**
 * 删除绑定（逻辑删除 data_sta='D'）
 * @param {number} id - binding_id
 */
export function deleteBinding(id) {
  return del(`/biz/gis_approval_binding/${id}`)
}
