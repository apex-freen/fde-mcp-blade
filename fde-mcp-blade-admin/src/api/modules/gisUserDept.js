// ==========================================
// 部门管理接口
// 对应后端：/biz/gis_user_dept*
// 字段风格：camelCase（见「26 接口字段命名调整说明」）
// ==========================================

import { get, post, put, del } from '@/utils/request'

// ---------- 部门 CRUD ----------

/**
 * 查询部门列表（扁平列表，前端自行组树）
 * 响应字段：deptId / parentId / deptName / orderNum / ancestors / leader / phone / email / status
 */
export function getDeptList() {
  return get('/biz/gis_user_dept')
}

/**
 * 新增部门
 * @param {Object} data - { parentId, deptName, orderNum?, leader?, phone?, email?, status? ("0"正常 / "1"停用), createdBy? }
 */
export function createDept(data) {
  return post('/biz/gis_user_dept', data)
}

/**
 * 更新部门（部分更新，未传字段保持原值）
 * ⚠️ deptId 放在 body 里，不在路径上
 * @param {Object} data - 同上 + deptId，可只传部分字段
 */
export function updateDept(data) {
  return put('/biz/gis_user_dept/update', data)
}

/**
 * 删除部门（软删除）
 * ⚠️ 有子部门时会被后端拒绝（业务码 400）
 * @param {number} deptId
 */
export function deleteDept(deptId) {
  return del(`/biz/gis_user_dept/${deptId}`)
}
