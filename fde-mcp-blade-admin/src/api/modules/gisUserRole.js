// ==========================================
// gis_user_role（用户-角色/权限组关联）模块接口
// 接口前缀：/biz/gis_user_role
// 字段风格：camelCase（见「26 接口字段命名调整说明」）
// 注意：用户 ID 的取值来自 gis_user，该模块本身仍是下划线（user_id）
// ==========================================

import { get, post } from '@/utils/request'

/**
 * 根据用户 ID 查询已分配的权限组
 * @param {number} userId - 用户 ID
 * @returns data 为对象数组，每项含 { userRoleId, userId, roleId, assignedBy }
 */
export function getRolesByUser(userId) {
  return get(`/biz/gis_user_role/by_user/${userId}`)
}

/**
 * 为用户分配权限组（先删后插，全量替换）
 * @param {Object} data - 分配数据
 * @param {number} data.userId - 用户 ID
 * @param {number[]} data.roleIds - 权限组 ID 数组
 * @param {string} [data.assignedBy] - 操作人
 */
export function assignRolesToUser(data) {
  return post('/biz/gis_user_role/assign', data)
}
