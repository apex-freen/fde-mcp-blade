// ==========================================
// Token / 登录态 管理工具
// ==========================================

const TOKEN_KEY = 'app_token'
const REFRESH_TOKEN_KEY = 'app_refresh_token'
const USER_INFO_KEY = 'user_info'
const ENV_INFO_KEY = 'env_info'

/**
 * 获取 Token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

/**
 * 设置 Token
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 移除 Token
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 获取 Refresh Token
 *
 * Doc 19 §1.3：仅当后端启用 session.refresh_enabled 时返回
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

/**
 * 设置 Refresh Token
 */
export function setRefreshToken(refreshToken) {
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

/**
 * 移除 Refresh Token
 */
export function removeRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  const info = localStorage.getItem(USER_INFO_KEY)
  return info ? JSON.parse(info) : null
}

/**
 * 设置用户信息
 */
export function setUserInfo(info) {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(info))
}

/**
 * 移除用户信息
 */
export function removeUserInfo() {
  localStorage.removeItem(USER_INFO_KEY)
}

/**
 * 获取环境信息
 */
export function getEnvInfo() {
  const info = localStorage.getItem(ENV_INFO_KEY)
  return info ? JSON.parse(info) : null
}

/**
 * 设置环境信息
 */
export function setEnvInfo(info) {
  localStorage.setItem(ENV_INFO_KEY, JSON.stringify(info))
}

/**
 * 移除环境信息
 */
export function removeEnvInfo() {
  localStorage.removeItem(ENV_INFO_KEY)
}

/**
 * 清除所有登录态
 */
export function clearAuth() {
  removeToken()
  removeRefreshToken()
  removeUserInfo()
  removeEnvInfo()
}

/**
 * 是否已登录
 */
export function isLoggedIn() {
  return !!getToken()
}
