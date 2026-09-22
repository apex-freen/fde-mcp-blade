// ==========================================
// gis_role_dept（权限组-部门，自定义数据范围）模块接口
// 接口前缀：/biz/gis_role_dept
// 字段风格：camelCase（见「26 接口字段命名调整说明」）
// ==========================================

import { get, post } from '@/utils/request'

/**
 * 为权限组分配数据范围部门（先删后插，全量替换）
 * 仅在角色的 dataScope = "2"（自定义）时调用
 * @param {Object} data - 分配数据
 * @param {number} data.roleId - 权限组 ID
 * @param {number[]} data.deptIds - 部门 ID 数组
 * @param {string} [data.createdBy] - 操作人
 */
export function assignRoleDepts(data) {
  return post('/biz/gis_role_dept/assign', data)
}

/**
 * 查询权限组已关联的部门 ID（编辑角色时回显用）
 * @param {number} roleId - 权限组 ID
 * @returns data 为部门 ID 数组，如 [10, 11]
 */
export function getRoleDepts(roleId) {
  return get(`/biz/gis_role_dept/by_role/${roleId}`)
}
