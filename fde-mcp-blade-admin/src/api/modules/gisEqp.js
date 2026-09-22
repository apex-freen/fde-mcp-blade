// ==========================================
// 设备管理接口（gis_eqp 模块）
// 接口前缀：/biz/gis_eqp、/biz/gis_eqp_fun
// 包含：设备 CRUD、MQTT 导入、设备功能管理
// ==========================================

import { get, post, put, del } from '@/utils/request'

// ========== 设备状态枚举 ==========
/**
 * 0 - 待确认
 * 1 - 正常（已启用）
 * 2 - 禁用
 */
export const EQP_STATUS_OPTIONS = [
  { value: '0', label: '待确认', color: 'gold' },
  { value: '1', label: '正常', color: 'green' },
  { value: '2', label: '禁用', color: 'gray' }
]

export const EQP_STATUS_MAP = EQP_STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {})

/**
 * 查询设备列表（分页）
 * @param {Object} params - { eqp_name?, eqp_ip?, data_sta?, begin_time?, end_time?, page?, page_size?, order_by?, is_asc? }
 */
export function getGisEqpList(params) {
  return get('/biz/gis_eqp', params)
}

/**
 * 创建设备
 * @param {Object} data - { eqp_name, eqp_desc?, eqp_pwd?, eqp_ip?, eqp_client_id?, eqp_type?, eqp_area?, eqp_sta, created_by? }
 */
export function createGisEqp(data) {
  return post('/biz/gis_eqp', data)
}

/**
 * 获取设备详情
 * @param {number} eqp_id - 设备主键
 */
export function getGisEqpDetail(eqp_id) {
  return get(`/biz/gis_eqp/${eqp_id}`)
}

/**
 * 更新设备（部分更新，所有字段可选，不传则保留原值）
 * @param {number} eqp_id - 设备主键
 * @param {Object} data - { eqp_pwd?, eqp_area?, eqp_sta?, user_eqp_name?, user_eqp_desc? }
 *
 * 注意：eqp_name 和 eqp_desc 为设备原始名称/描述，不允许用户修改。
 *       用户可通过 user_eqp_name / user_eqp_desc 设置自定义名称/描述。
 */
export function updateGisEqp(eqp_id, data) {
  return put(`/biz/gis_eqp/${eqp_id}`, data)
}

/**
 * 删除设备（逻辑删除）
 * @param {number} eqp_id - 设备主键
 */
export function deleteGisEqp(eqp_id) {
  return del(`/biz/gis_eqp/${eqp_id}`)
}

/**
 * 获取待确认设备列表（MQTT 已连接但未注册）
 */
export function getPendingEqpList() {
  return get('/biz/gis_eqp/pending')
}

/**
 * 确认添加设备
 * @param {Object} data - { client_id, eqp_name?, eqp_area?, eqp_pwd? }
 */
export function confirmPendingEqp(data) {
  return post('/biz/gis_eqp/pending', data)
}

// ========== 设备功能管理（gis_eqp_fun）==========

/**
 * 获取设备功能列表（分页）
 * @param {Object} params - { eqp_id?, fun_name?, risk_level?, page?, page_size?, order_by?, is_asc? }
 */
export function getEqpFunList(params) {
  return get('/biz/gis_eqp_fun/list', params)
}

/**
 * 获取设备功能详情
 * @param {number} eqpFunId - 设备功能 ID
 */
export function getEqpFunDetail(eqpFunId) {
  return get(`/biz/gis_eqp_fun/${eqpFunId}`)
}

/**
 * 更新设备功能的 risk_level
 * @param {number} eqpFunId - 设备功能 ID
 * @param {string} riskLevel - 风险等级（normal/risk/auth/disable）
 */
export function updateEqpFunRiskLevel(eqpFunId, riskLevel) {
  return put(`/biz/gis_eqp_fun/${eqpFunId}`, { risk_level: riskLevel })
}
