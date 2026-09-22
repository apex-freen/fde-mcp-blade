// ==========================================
// 权限判定
// 与后端约定：
//   permissions 是「机器判定」字段，超管下发通配符 "*:*:*"
//   roles       现阶段是「展示」字段（gis_role 无 code 列，值为中文名），
//               不参与任何判权；将来补 role_code 后 "admin" 分支自动生效
// 前端不依赖 userId 之类的后端内部实现
// ==========================================

import { useUserStore } from '@/stores/user'

/** 全权限通配符（超管标识） */
export const ALL_PERMISSION = '*:*:*'

/** 超级管理员角色标识（预留：待 gis_role 增加 role_code 列后启用） */
export const SUPER_ADMIN_ROLE = 'admin'

/**
 * 当前登录用户是否超级管理员
 * 现阶段由 permissions 里的 "*:*:*" 命中
 */
export function isSuperAdmin() {
  const { roles, permissions } = useUserStore()
  return permissions.includes(ALL_PERMISSION) || roles.includes(SUPER_ADMIN_ROLE)
}

/**
 * 权限点判定（用于按钮级显隐）
 * 超管的 "*:*:*" 视为拥有全部权限
 * @param {string} code - 权限码，如 controller:user:reset_pwd
 */
export function hasPermission(code) {
  if (!code) return true
  const { permissions } = useUserStore()
  return permissions.includes(ALL_PERMISSION) || permissions.includes(code)
}
