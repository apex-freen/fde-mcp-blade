// ==========================================
// 授权记录（gis_grant）
// 对应后端：/biz/gis_grant/*
// 文档：57 授权模型前端对接（41 §12.2 为旧版）
// 页面：1057 预授权配置 /controller/settings/pre/approval/index（权限点 38，仅决定菜单显隐）
// 关键约束：
//   1. grant_user_role 不再由前端传（65 文档 §6.1）：后端按登录人实时查 RBAC 判定是否管理员，
//      前端传什么都影响不了鉴权结果；响应/列表里该字段是「主导角色快照」；
//   2. 重复授权会被拒（同用户 + 同对象 + 同功能已有 grant_sta='1' → 400）；
//   3. 授权模型（57 文档）：
//      - grant_type 只有 device / service，不再出现 hitl（历史行可能仍有）；
//      - target_name = 对象名：service = 插件名；device = 空（设备名在 eqp_name）；
//      - grant_source = 来源：manual（手工配置）/ hitl（审批页产生）；
//        仅供展示与筛选，不参与授权判定；
//      - eqp_client_id 为设备专用，service 传空串（历史行旧值保留、判定不再读取）；
//   4. order_by 只支持列名，不要传任意 SQL。
// ==========================================

import { get, post, put } from '@/utils/request'

// ========== 常量 ==========
//
// 双主体约定的默认值（原 mcpPermission.js 迁入，2026-09-22 合并重复封装）：
// gis_agent_id 固定 0；out_agent_id 在 create / grant_all 里仍是必填字段，
// 但后端不参与任何判定，统一传空串；revoke_all 已从入参移除该字段（传了会被忽略）。
export const AGENT_ID_DEFAULT = 0
export const OUT_AGENT_ID_DEFAULT = ''

/**
 * 授权列表
 * @param {Object} params - 全部可选：
 *   gis_user_id / out_agent_id / grant_type / target_name（插件名）/ grant_source（manual|hitl）/
 *   eqp_id / eqp_client_id / eqp_name / fun_key /
 *   grant_sta / grant_user_id / grant_user_role（主导角色快照，如 admin / common）/ page（默认 1）/ page_size（默认 10）/
 *   order_by（默认 grant_id）/ is_asc（默认 false）
 *
 * ⚠️ 按 eqp_client_id 筛不到审批页产生的授权行（其为空），按插件名传 target_name 才筛得到（57 §5.1）
 */
export function getGrantList(params = {}) {
  return get('/biz/gis_grant/list', params)
}

/**
 * 授权详情
 * @param {number} grantId - 不存在 → 400 授权记录不存在
 */
export function getGrantDetail(grantId) {
  return get(`/biz/gis_grant/${grantId}`)
}

/**
 * 新建授权
 * @param {Object} data
 * @param {number} data.gis_user_id - 必填，被授权人（必须是存在且未停用的系统用户）
 * @param {string} data.grant_type - 必填，device（设备功能）/ service（插件方法）
 * @param {string} data.target_name - **service 必填**：插件名（如 biz-feishu-connector）；
 *                                    device 传空串（设备名在 eqp_name）
 * @param {string} data.eqp_name - 必填，展示名：device = 设备名；service = 插件名
 * @param {string} data.eqp_client_id - device 必填 = 设备 clientId；service 传空串
 * @param {string} data.fun_key - 必填，设备功能键 / 插件方法名（HITL 闸门就是用它匹配）
 * @param {string} [data.grant_user_role] - 已废弃入参：不再由前端传，服务端按登录人主导角色自动填充（65 文档 §6.1）
 * @param {number} data.grant_user_id - 必填，授权操作人 ID
 * @param {number} data.gis_agent_id - 已弃用，固定传 0
 * @param {string} data.out_agent_id - 已弃用，固定传 ''
 * @param {number} data.eqp_id - service 类型固定传 0
 * @param {number} data.eqp_fun_id - service 类型固定传 0
 * @param {string} [data.grant_started_time] - 空 = 立即生效
 * @param {string} [data.grant_expired_time] - 空 = 永久
 * @param {string} [data.created_by]
 *
 * 注：grant_source 由后端写 manual，前端不必传（57 §三#3）
 */
export function createGrant(data) {
  return post('/biz/gis_grant/create', data)
}

/**
 * 修改授权状态
 * @param {number} grantId
 * @param {{grant_id: number, grant_sta: string, updated_by?: string}} data - grant_sta ∈ 0/1/2
 */
export function updateGrantStatus(grantId, data) {
  return put(`/biz/gis_grant/${grantId}/status`, data)
}

/**
 * 撤销授权（grant_sta='2'；撤销后 HITL 闸门立刻重新拦截）
 * @param {number} grantId
 * @param {{updated_by?: string}} data
 */
export function revokeGrant(grantId, data = {}) {
  return put(`/biz/gis_grant/${grantId}/revoke`, data)
}

/**
 * 批量授权（某设备全部功能 / 某服务全部方法）
 * @param {Object} data - 同 create；service 类型必填 target_name（插件名），
 *                        eqp_client_id 不再需要携带 @插件名（57 §三#4）
 */
export function grantAll(data) {
  return post('/biz/gis_grant/grant_all', data)
}

/**
 * 批量撤销
 * @param {{out_agent_id: string, grant_type: string, eqp_id: number,
 *          target_name?: string, eqp_client_id?: string, updated_by?: string}} data
 *   service 类型建议传 target_name（插件名）；文档将本接口标为「无变化」（57 §三#7），
 *   后端实际匹配字段未明确，故与 eqp_client_id 同时传以兼容
 * @returns data = 被撤销的 grant_id 数组（可能为 []）
 */
export function revokeAll(data) {
  return post('/biz/gis_grant/revoke_all', data)
}
