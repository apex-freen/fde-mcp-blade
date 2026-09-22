// ==========================================
// gis_role（权限组/角色管理）模块接口
// 接口前缀：/biz/gis_role
// 字段风格：camelCase（见「26 接口字段命名调整说明」）
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 获取权限组列表（分页）
 * @param {Object} params - 查询参数
 * @param {string} [params.name] - 角色名称
 * @param {string} [params.roleKey] - 角色标识
 * @param {string} [params.status] - 状态：0=启用 1=禁用
 * @param {number} [params.page] - 页码，从 1 开始
 * @param {number} [params.pageSize] - 每页数量
 * @param {string} [params.orderBy] - 排序字段，值仍是数据库列名（下划线），如 sort_order
 * @param {boolean} [params.isAsc] - 是否升序
 */
export function getGisRoleList(params) {
  return get('/biz/gis_role/list', params)
}

/**
 * 获取所有启用的权限组（无分页，下拉选择用）
 */
export function getGisRoleAll() {
  return get('/biz/gis_role/all')
}

/**
 * 获取权限组详情（含已分配的权限码 ID）
 * @param {number} roleId - 权限组 ID
 */
export function getGisRoleById(roleId) {
  return get(`/biz/gis_role/${roleId}`)
}

/**
 * 创建权限组
 * @param {Object} data - 权限组数据
 * @param {string} data.name - 权限组名称
 * @param {string} data.roleKey - 角色标识，必填且全局唯一（/getInfo 的 roles 返回的就是它）
 * @param {string} [data.description] - 描述
 * @param {number} [data.sortOrder] - 排序
 * @param {string} [data.status] - 状态：0=启用 1=禁用
 * @param {string} [data.dataScope] - 数据范围：1全部 / 2自定义 / 3本部门 / 4本部门及以下 / 5仅本人
 * @param {string} [data.createdBy] - 创建人
 */
export function createGisRole(data) {
  return post('/biz/gis_role/create', data)
}

/**
 * 更新权限组
 * @param {number} roleId - 权限组 ID
 * @param {Object} data - 权限组数据，roleKey 必填
 */
export function updateGisRole(roleId, data) {
  return put(`/biz/gis_role/${roleId}`, data)
}

/**
 * 删除权限组（软删除）
 * @param {number} roleId - 权限组 ID
 */
export function deleteGisRole(roleId) {
  return del(`/biz/gis_role/${roleId}`)
}
