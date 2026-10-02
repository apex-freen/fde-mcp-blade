// ==========================================
// 部门管理接口
// 对应后端：/biz/gis_user_dept*
// 字段风格：camelCase（见「26 接口字段命名调整说明」）
// ==========================================

import { get, post, put, del } from '@/utils/request'

// ---------- 部门 CRUD ----------

/**
 * 查询部门列表（扁平列表，前端自行组树）
 * 响应字段：deptId / parentId / deptName / orderNum / ancestors / leader / leaderUserId / phone / email / status
 * ⚠️ 1041 §5.6：请求体与响应体**都是 camelCase** —— 负责人字段是 `leaderUserId`（不是 leader_user_id）
 * @param {Object} [options] - 透传请求配置；部门负责人入口可传 { showError: false } 静默失败
 */
export function getDeptList(options = {}) {
  return get('/biz/gis_user_dept', undefined, options)
}

/**
 * 新增部门
 * @param {Object} data - { parentId, deptName, orderNum?, leader?, leaderUserId?, phone?, email?, status? ("0"正常 / "1"停用), createdBy? }
 *   leaderUserId 是「谁能管本部门知识库」的判权依据：不传 = 不改，0 = 清空，>0 = 设为该用户（1041 §5.6）
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
