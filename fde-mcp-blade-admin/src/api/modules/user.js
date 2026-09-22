// ⚠️ DEPRECATED · 2026-09-11
// ---------------------------------------------------------
// 后端 gis_auth 模块已整体下线（Doc 23），以下 `/biz/mobile/auth/user/*`
// 旧路径均已废弃：
//   - 用户 CRUD  → 改用 src/api/modules/gisUser.js（新式）
//   - 授权/日志  → 改用 src/api/modules/auditLog.js
//   - 工作区成员 → 已整体停用（Coze 依赖移除）
//
// 本文件暂时保留，不做任何功能变更。views 层目前未引用。
// ---------------------------------------------------------
// 用户相关接口
// 对应移动端 api.js: getUserList, postAddUser 等

import { request } from '@/utils/request'

/**
 * 获取用户列表
 */
export function getUserList() {
  return request({
    url: '/biz/mobile/auth/user/getUserList',
    method: 'GET'
  })
}

/**
 * 新增用户
 */
export function postAddUser(data) {
  return request({
    url: '/biz/mobile/auth/user/postAddUser',
    method: 'POST',
    data
  })
}

/**
 * 根据 ID 获取用户信息
 */
export function getGisUserById(gisUserId) {
  return request({
    url: `/biz/mobile/auth/user/${gisUserId}`,
    method: 'GET',
    showLoading: true
  })
}

/**
 * 编辑用户
 */
export function postEditUser(data) {
  return request({
    url: '/biz/mobile/auth/user/postEditUser',
    method: 'POST',
    data
  })
}

/**
 * 锁定用户
 */
export function postLockUser(data) {
  return request({
    url: '/biz/mobile/auth/user/postLockUser',
    method: 'POST',
    data
  })
}

/**
 * 解锁用户
 */
export function postUnlockUser(data) {
  return request({
    url: '/biz/mobile/auth/user/postUnlockUser',
    method: 'POST',
    data
  })
}

/**
 * 删除用户
 */
export function delDeleteUser(data) {
  return request({
    url: '/biz/mobile/auth/user/delDeleteUser',
    method: 'DELETE',
    data
  })
}

/**
 * 添加工作空间成员
 */
export function postWorkspaceAddMember(data) {
  return request({
    url: '/biz/mobile/auth/user/postWorkspaceAddMember',
    method: 'POST',
    data
  })
}

/**
 * 移除工作空间成员
 */
export function postWorkspaceRemoveMember(data) {
  return request({
    url: '/biz/mobile/auth/user/postWorkspaceRemoveMember',
    method: 'POST',
    data
  })
}
