// ==========================================
// 插件服务接口（gis_service 模块）
// 接口前缀：/biz/gis_service
// 管理插件服务的增删改查及方法风险等级配置
// ==========================================

import { request } from '@/utils/request'

/**
 * 获取插件服务列表（包含已禁用插件）
 */
export function getServiceList() {
  return request({
    url: '/biz/gis_service',
    method: 'GET'
  })
}

/**
 * 获取插件详情（包含所有方法，包括已禁用插件）
 * @param {string} pluginName - 插件名称
 */
export function getServiceDetail(pluginName) {
  return request({
    url: `/biz/gis_service/${pluginName}`,
    method: 'GET'
  })
}

/**
 * 获取插件配置管理专用数据（Doc 47 §4.3）
 * 返回：{ plugin_name, config(生效配置), config_help(字段说明), missing_keys, disabled, serverUrl }
 * config 为生效值（实例值优先，缺键用模板默认值补全）；密钥类字段为 ${key} 占位符，属正常状态
 * @param {string} pluginName - 插件名称
 */
export function getServiceConfig(pluginName) {
  return request({
    url: `/biz/gis_service/${pluginName}/config`,
    method: 'GET',
    showLoading: false
  })
}

/**
 * 部分更新插件（启用/禁用、重命名、修改 serverUrl、修改 config）
 * 统一 PATCH 接口，按需传入要修改的字段
 * @param {string} pluginName - 插件名称
 * @param {object} data - { disabled?, new_name?, serverUrl?, config? }
 */
export function updateService(pluginName, data) {
  return request({
    url: `/biz/gis_service/${pluginName}`,
    method: 'PATCH',
    data,
    showLoading: true
  })
}

/**
 * 更新插件方法的 risk_level（仅此字段可修改）
 * @param {string} pluginName - 插件名称
 * @param {string} methodName - 方法名称
 * @param {string} riskLevel - 风险等级（normal/risk/auth/disable）
 */
export function updateServiceMethod(pluginName, methodName, riskLevel) {
  return request({
    url: `/biz/gis_service/${pluginName}/methods/${methodName}`,
    method: 'PUT',
    data: { risk_level: riskLevel },
    showLoading: true
  })
}

/**
 * 获取插件 Web 页面状态（批量）
 * 返回 { [插件名]: { has_web_ui, title } }，前端据此决定是否显示"打开控制台"按钮
 */
export function getPluginWebStatus() {
  return request({
    url: '/biz/plugin_web/status',
    method: 'GET',
    showLoading: false
  })
}

/**
 * 删除插件（删除整个插件目录，不可恢复）
 * @param {string} pluginName - 插件名称
 */
export function deleteService(pluginName) {
  return request({
    url: `/biz/gis_service/${pluginName}`,
    method: 'DELETE',
    showLoading: true
  })
}
