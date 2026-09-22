// ==========================================
// PII 检测与脱敏配置接口
// 对应后端：/biz/gis_pii_settings、/biz/gis_pii_override
// Doc 19 §2 / Doc 09.2 §5
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 查询 PII 脱敏运行期配置
 *
 * Doc 09.2 §3：global_enabled / enabled_types / block_types / strong_only /
 * mask_keep / raw_outbound_enabled / extra_types / custom_types
 * 字段 snake_case；提交时建议整对象回填后再改，避免漏字段被重置
 */
export function getPiiSettings() {
  return get('/biz/gis_pii_settings')
}

/**
 * 更新 PII 脱敏配置（立即生效，后端写审计 config_change）
 *
 * @param {Object} data
 * @param {boolean} data.global_enabled - 启用 PII 检测
 * @param {boolean} data.raw_outbound_enabled - 允许获同意用户原文直发云端
 * @param {string[]} data.enabled_types - 检测的敏感信息类型
 * @param {string[]} data.block_types - 命中即阻断的类型
 * @param {boolean} data.strong_only - 只处理高置信命中
 * @param {Object} data.mask_keep - 打码保留位数，如 { mobile_cn: { first: 3, last: 4 } }
 * @param {Array<{ type_id: string, pattern: string }>} data.custom_types - 自定义字面串类型（包含匹配）
 * @param {string[]} [data.extra_types] - 旧字段：前端不展示，原值回传
 */
export function updatePiiSettings(data) {
  return put('/biz/gis_pii_settings', data)
}

/**
 * 例外名单三级点选 + 配置选项（页面初始化调一次即可，后端有 30s 缓存）
 *
 * 返回 data.categories[].subjects[].methods[] 完整三级树，
 * 每个节点自带可提交的 scope_kind + scope_key；另有 pii_types / modes / directions
 */
export function getPiiOverrideOptions() {
  return get('/biz/gis_pii_override/options')
}

/**
 * 例外名单列表（分页）
 *
 * @param {Object} params
 * @param {number} params.page
 * @param {number} params.page_size
 * @param {string} [params.scope_kind] - 作用范围筛选
 * @param {number} [params.enabled] - 状态筛选：1 启用 / 0 停用
 * @param {string} [params.keyword] - 对象名模糊
 */
export function getPiiOverrideList(params) {
  return get('/biz/gis_pii_override/list', params)
}

/**
 * 新增例外
 *
 * @param {Object} data
 * @param {string} data.scope_kind - tool_type / tool / plugin / plugin_method / device / device_fun
 * @param {string} data.scope_key - 所选节点自带
 * @param {Object} data.policy_json - 策略配置（键不存在的 = 跟随全局）
 * @param {string} data.remark - 备注
 */
export function createPiiOverride(data) {
  return post('/biz/gis_pii_override/create', data)
}

/**
 * 更新例外（可只传要改的字段，含 enabled）
 */
export function updatePiiOverride(id, data) {
  return put(`/biz/gis_pii_override/${id}`, data)
}

/**
 * 删除例外（删除后该对象按全局设置执行）
 */
export function deletePiiOverride(id) {
  return del(`/biz/gis_pii_override/${id}`)
}
