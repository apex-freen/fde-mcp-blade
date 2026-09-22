// ==========================================
// gis_role_permission（角色-权限码关联）模块接口
// 接口前缀：/biz/gis_role_permission
// 字段风格：camelCase（见「26 接口字段命名调整说明」）
// ==========================================

import { get, post } from '@/utils/request'

/**
 * 根据角色 ID 查询已分配的权限码
 * @param {number} roleId - 权限组 ID
 * @returns data 为对象数组，每项含 { rolePermissionId, roleId, permissionId }
 */
export function getPermissionsByRole(roleId) {
  return get(`/biz/gis_role_permission/by_role/${roleId}`)
}

/**
 * 为权限组分配权限码（先删后插，全量替换）
 * @param {Object} data - 分配数据
 * @param {number} data.roleId - 权限组 ID
 * @param {number[]} data.permissionIds - 权限码 ID 数组
 * @param {string} [data.createdBy] - 操作人
 */
export function assignPermissionsToRole(data) {
  return post('/biz/gis_role_permission/assign', data)
}
