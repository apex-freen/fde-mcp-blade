// ==========================================
// 插件密钥箱接口（gis_secret 模块）
// 接口前缀：/biz/gis_secret
// 值只写不读：响应不含 secret_value，仅返回 has_value
// 错误提示统一由页面处理（showError: false），便于 403 定制文案
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 查询密钥列表（plugin_name / secret_key 为精确匹配）
 * @param {Object} [params]
 * @param {string} [params.plugin_name] - 归属插件（manifest.name）
 * @param {string} [params.secret_key] - 密钥键名
 * @returns {Promise<{data: Array}>} data 为 GisSecretView[]（不含密钥值）
 */
export function getSecretList(params) {
  return get('/biz/gis_secret', params, { showError: false })
}

/**
 * 新建密钥
 * @param {Object} data
 * @param {string} data.plugin_name - 归属插件，保存后不可改
 * @param {string} data.secret_key - 键名，保存后不可改
 * @param {string} data.secret_value - 密钥值（不 trim，首尾空格保留）
 * @param {string} [data.description] - 用途说明
 */
export function createSecret(data) {
  return post('/biz/gis_secret', data, { showError: false, showLoading: true })
}

/**
 * 更新密钥（缺省字段表示不修改）
 * @param {number} id - gis_secret_id
 * @param {Object} data
 * @param {string} [data.secret_value] - 新密钥值
 * @param {string} [data.description] - 用途说明
 * @param {string} [data.status] - "1" 启用 / "0" 停用
 */
export function updateSecret(id, data) {
  return put(`/biz/gis_secret/${id}`, data, { showError: false, showLoading: true })
}

/**
 * 删除密钥（逻辑删除；同 (plugin_name, secret_key) 再次新建会复活原行）
 * @param {number} id - gis_secret_id
 */
export function deleteSecret(id) {
  return del(`/biz/gis_secret/${id}`, undefined, { showError: false, showLoading: true })
}
