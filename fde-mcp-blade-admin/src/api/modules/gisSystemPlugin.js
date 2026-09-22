// ==========================================
// 插件注册表 & 生命周期接口
// 对应后端：/biz/gis_system_plugin*
// Doc 19 §6
// ==========================================

import { get, post } from '@/utils/request'

/**
 * 查询插件注册表（当前状态）
 *
 * Doc 19 §6：返回插件全量信息 + 运行时状态
 */
export function getPluginRegistry() {
  return get('/biz/gis_system_plugin')
}

/**
 * 查询插件生命周期事件日志
 *
 * Doc 19 §6
 * @param {Object} params - { plugin_name?, action?, begin_time?, end_time?, limit? (默认 200) }
 */
export function getPluginLog(params = {}) {
  return get('/biz/gis_system_plugin/log', params)
}

/**
 * 手动触发磁盘对账（扫描插件目录）
 *
 * Doc 19 §6：返回 { scanned, installed, updated, missing }
 */
export function syncPlugins() {
  return post('/biz/gis_system_plugin/sync')
}
