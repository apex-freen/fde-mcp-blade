// ==========================================
// 参数配置接口（system/config）
// 数据源为 gis_sys_config（非 RuoYi 的 sys_config）
// ⚠️ 列表返回 { total, rows }（无 code/msg 外层包裹）
// ⚠️ detail 返回 { code, msg, data }
// ⚠️ configKey 取值接口的值放在 msg 字段（RuoYi 老写法）
// ⚠️ 导出返回 xlsx 二进制
// ==========================================

import { get, post, put, del, request } from '@/utils/request'

/**
 * 分页列表（按 createdTime 倒序）
 * @param {Object} params - { pageNum, pageSize, configKey, category, configType, status }
 */
export function getSysConfigList(params) {
  return get('/system/config/list', params)
}

/**
 * 配置详情（按主键 id）
 * @param {number|string} configId - gisSysConfigId
 */
export function getSysConfigDetail(configId) {
  return get(`/system/config/${configId}`)
}

/**
 * 按配置键取值（值在 msg 字段）
 * @param {string} configKey
 */
export function getSysConfigByKey(configKey) {
  return get(`/system/config/configKey/${configKey}`)
}

/**
 * 新增配置
 * @param {Object} data
 */
export function createSysConfig(data) {
  return post('/system/config', data)
}

/**
 * 修改配置（configKey 为定位键，不允许修改）
 * @param {Object} data
 */
export function updateSysConfig(data) {
  return put('/system/config', data)
}

/**
 * 删除配置（软删，configIds 支持逗号分隔批量）
 * @param {string} configIds
 */
export function deleteSysConfig(configIds) {
  return del(`/system/config/${configIds}`)
}

/**
 * 导出 xlsx（需权限点 controller:settings:config）
 * @param {Object} params - 同列表筛选参数，分页忽略
 */
export function exportSysConfig(params) {
  return request({
    url: '/system/config/export',
    method: 'POST',
    data: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    showLoading: false
  })
}
