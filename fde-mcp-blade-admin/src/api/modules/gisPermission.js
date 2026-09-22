// ==========================================
// gis_permission（权限码管理）模块接口
// 接口前缀：/biz/gis_permission
// 字段风格：camelCase（见「26 接口字段命名调整说明」）
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 获取权限码列表（分页）
 * @param {Object} params - 查询参数
 * @param {string} [params.module] - 按模块筛选：workspace/controller/audit/message
 * @param {string} [params.status] - 按状态筛选：0=启用 1=禁用
 * @param {number} [params.page] - 页码，从 1 开始
 * @param {number} [params.pageSize] - 每页数量
 * @param {string} [params.orderBy] - 排序字段，值仍是数据库列名（下划线）
 * @param {boolean} [params.isAsc] - 是否升序
 */
export function getGisPermissionList(params) {
  return get('/biz/gis_permission/list', params)
}

/**
 * 获取权限树（以 gis_menu 为骨架递归生成，用于权限组授权勾选）
 *
 * 2026-09-14 起为三级结构：大类 → 目录 → 页面（→ 动作码），响应为递归同构节点：
 *   [{ key, label, permissionId, code, children }]
 *   - key：`menu:{menu_id}`（大类/目录）/ `perm:{permission_id}`（权限点）/ `group:unclassified`（兜底分组）
 *   - permissionId === null 表示分组节点，不可授权
 *   - 已移除字段：module / path / status / sortOrder / created* / updated*（需要时走 getGisPermissionList）
 */
export function getGisPermissionTree() {
  return get('/biz/gis_permission/tree')
}

/**
 * 获取权限码详情
 * @param {number} permissionId - 权限码 ID
 */
export function getGisPermissionById(permissionId) {
  return get(`/biz/gis_permission/${permissionId}`)
}

/**
 * 创建权限码
 * @param {Object} data - 权限码数据
 * @param {string} data.code - 权限码，如 workspace:agent
 * @param {string} data.name - 中文名称
 * @param {string} data.module - 所属模块
 * @param {string} [data.path] - 前端路由 path
 * @param {number} [data.sortOrder] - 排序
 * @param {string} [data.createdBy] - 创建人
 */
export function createGisPermission(data) {
  return post('/biz/gis_permission/create', data)
}

/**
 * 更新权限码
 * @param {number} permissionId - 权限码 ID
 * @param {Object} data - 权限码数据（不含 code）
 */
export function updateGisPermission(permissionId, data) {
  return put(`/biz/gis_permission/${permissionId}`, data)
}

/**
 * 删除权限码（软删除）
 * @param {number} permissionId - 权限码 ID
 */
export function deleteGisPermission(permissionId) {
  return del(`/biz/gis_permission/${permissionId}`)
}
