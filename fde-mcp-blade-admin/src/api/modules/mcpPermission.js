// ==========================================
// MCP 权限管理相关接口（gis_grant 模块）
// 用于给用户授权 MCP 功能（设备类 / 服务类）
// ==========================================

import { request } from '@/utils/request'

// ========== 常量 ==========

// 授权状态
export const GRANT_STATUS_OPTIONS = [
  { value: '0', label: '未授权', color: 'gray' },
  { value: '1', label: '已授权', color: 'green' },
  { value: '2', label: '已撤销', color: 'red' }
]

export const GRANT_STATUS_MAP = GRANT_STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {})

// 授权类型
export const GRANT_TYPE_OPTIONS = [
  { value: 'device', label: '设备授权' },
  { value: 'service', label: '服务授权' }
]

// 双主体约定
// gis_agent_id 固定 0；
// out_agent_id 在 create / grant_all 里仍是必填字段，但后端不参与任何判定，统一传空串；
// revoke_all 已从入参中移除该字段（传了会被忽略）。
export const AGENT_ID_DEFAULT = 0
export const OUT_AGENT_ID_DEFAULT = ''

// ========== 授权接口 ==========

/**
 * 获取授权列表（分页）
 * @param {object} params - 查询参数
 *   grant_type / grant_sta 服务端已生效；page_size 上限 1000（2026-09-17 起）
 */
export function getGrantList(params) {
  return request({
    url: '/biz/gis_grant/list',
    method: 'GET',
    params
  })
}

/**
 * 获取授权详情
 * @param {number} grantId - 授权记录 ID
 */
export function getGrantDetail(grantId) {
  return request({
    url: `/biz/gis_grant/${grantId}`,
    method: 'GET'
  })
}

/**
 * 创建单个授权
 * @param {object} data - 授权数据
 *   service 类型必填 target_name（插件名），eqp_client_id 传空串（57 §三#3、§四）
 *   device 类型 target_name 传空串，设备名在 eqp_name、clientId 在 eqp_client_id
 */
export function createGrant(data) {
  return request({
    url: '/biz/gis_grant/create',
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * 更新授权状态
 * @param {number} grantId - 授权记录 ID
 * @param {object} data - { grant_sta, updated_by }
 */
export function updateGrantStatus(grantId, data) {
  return request({
    url: `/biz/gis_grant/${grantId}/status`,
    method: 'PUT',
    data,
    showLoading: true
  })
}

/**
 * 撤销单个授权
 * @param {number} grantId - 授权记录 ID
 * @param {string} updatedBy - 更新人
 */
export function revokeGrant(grantId, updatedBy) {
  return request({
    url: `/biz/gis_grant/${grantId}/revoke`,
    method: 'PUT',
    data: { updated_by: updatedBy },
    showLoading: true
  })
}

/**
 * 批量全部授权
 * @param {object} data - 授权数据
 *   service 类型必填 target_name（插件名）；eqp_client_id 不再需要带 @插件名，传空串即可（57 §三#4）
 */
export function grantAll(data) {
  return request({
    url: '/biz/gis_grant/grant_all',
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * 批量全部取消授权（整机 / 整服务）
 * @param {object} data - 撤销数据（2026-09-17 契约变更）
 *   gis_user_id 必传：撤销范围只认「该用户 + 该对象」，缺了直接 400；
 *   service 必传 target_name（插件名），它是服务侧唯一匹配字段；
 *   service 行 eqp_client_id 落库恒为空串，不再用它匹配，不要再传 host@plugin；
 *   out_agent_id 已从入参移除，带了也会被忽略。
 */
export function revokeAll(data) {
  return request({
    url: '/biz/gis_grant/revoke_all',
    method: 'POST',
    data,
    showLoading: true
  })
}

// 注意：授权日志接口（getGrantLogList / getGrantLogDetail）已迁移至
// src/api/modules/auditLog.js，统一管理所有审计日志接口
