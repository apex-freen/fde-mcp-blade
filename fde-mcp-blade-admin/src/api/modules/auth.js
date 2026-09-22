// ==========================================
// 认证相关接口
// 对应后端：/login, /logout, /refresh, /sso/*, /biz/sso/*
// ==========================================

import { request } from '@/utils/request'
import env from '@/config/env'

/**
 * 登录接口（支持 loginType: local / ldap）
 *
 * Doc 19 §1.1：新增可选字段 loginType，响应可能包含 refreshToken
 */
export function login(data) {
  return request({
    url: '/login',
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * 获取用户信息
 */
export function getInfo() {
  return request({
    url: '/getInfo',
    method: 'GET'
  })
}

/**
 * 获取当前用户的菜单路由树（按权限点过滤）
 *
 * 返回 RouterVo[]，用于生成动态路由与侧边栏菜单
 */
export function getRouters() {
  return request({
    url: '/getRouters',
    method: 'GET'
  })
}

/**
 * 登出（后端 jti 撤销会话）
 *
 * Doc 19 §1.2：原为前端空实现，本轮后端已修复
 */
export function logout() {
  return request({
    url: '/logout',
    method: 'POST'
  })
}

/**
 * 刷新令牌（单次轮换）
 *
 * Doc 19 §1.3：未启用时返回 400
 */
export function refresh(refreshToken) {
  return request({
    url: '/refresh',
    method: 'POST',
    data: { refreshToken }
  })
}

/**
 * SSO 交换码换登录态
 *
 * Doc 19 §1.4：用一次性 sso_code 换 token，TTL 10 分钟
 */
export function exchangeSsoCode(code) {
  return request({
    url: '/sso/exchange',
    method: 'POST',
    data: { code }
  })
}

// ==========================================
// 废弃接口（后端 gis_auth 模块已下线）
// ==========================================

/**
 * @deprecated 已废弃，后端 `/biz/mobile/auth/loginGis` 已下线
 * GIS 登录改用 MQTT 模块的 `POST /biz/mqtt/client/login`
 */
export function loginGis(data) {
  console.warn('[DEPRECATED] loginGis 已废弃，请改用 mqtt/client/login')
  return request({
    url: '/biz/mobile/auth/loginGis',
    method: 'POST',
    data,
    showLoading: true
  })
}

// ==========================================
// GIS 云端接口（外部服务，不受 gis_auth 迁移影响）
// ==========================================

/**
 * 获取 GIS 服务器验证码
 */
export function getGisServerCodeImg() {
  return request({
    url: `${env.cloudBaseURL}/common/captchaImage`,
    method: 'GET'
  })
}

/**
 * GIS 服务器发送短信
 */
export function postGisServerSendSms(data) {
  return request({
    url: `${env.cloudBaseURL}/common/sendSms`,
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * GIS 服务器登录
 */
export function postGisServerLogin(data) {
  return request({
    url: `${env.cloudBaseURL}/login`,
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * GIS 服务器注册
 */
export function postGisServerRegister(data) {
  return request({
    url: `${env.cloudBaseURL}/register`,
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * GIS 服务器忘记密码
 */
export function postGisServerForget(data) {
  return request({
    url: `${env.cloudBaseURL}/forgotPwd`,
    method: 'POST',
    data,
    showLoading: true
  })
}
