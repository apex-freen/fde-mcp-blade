// ==========================================
// SSO / IAM 管理接口
// 对应后端：/biz/sso/*
// Doc 19 §1.4 ~ §1.7（日期 2026-09-11）
// 字段命名：全部 camelCase（serde rename_all）
// ==========================================

import { get, post, put, del } from '@/utils/request'

// ---------- 类型定义 ----------

/**
 * SSO 配置对象（GET /biz/sso/config 的响应 data）
 *
 * Doc 19 §1.5：oidcClientSecret 明文只进不出（GET 不回显，仅回 oidcClientSecretSet）
 *              sessionRefreshEnabled / sessionRefreshExpireHours 存 DB，优先于 config/local.toml
 *
 * @typedef {Object} SsoConfig
 * @property {boolean} ssoEnabled - SSO 功能总开关
 * @property {'ldap'|'oidc'} ssoMode - 当前启用的 SSO 模式
 * @property {boolean} localLoginEnabled - 是否允许本地密码登录
 *
 * @property {string} ldapUrl - LDAP 服务地址，如 "ldaps://ad.corp.com:636"
 * @property {boolean} ldapStarttls - 是否启用 STARTTLS
 * @property {string} ldapBaseDn - 搜索 Base DN，如 "DC=corp,DC=com"
 * @property {string} ldapUserDnTemplate - 用户 DN 模板，如 "{0}@corp.com"
 * @property {boolean} ldapFetchGroups - 是否拉取用户所属 AD 组
 * @property {boolean} ldapAutoLink - 是否自动关联现有账号
 * @property {number} ldapTimeoutSecs - 超时秒数，默认 10
 *
 * @property {boolean} oidcEnabled - OIDC 模式开关
 * @property {string} oidcClientId - OIDC Client ID
 * @property {boolean} oidcClientSecretSet - 【只读】GET 时返回 secret 是否已配置
 * @property {string} [oidcClientSecret] - 仅 PUT 可传，留空表示保持不变
 * @property {string} oidcDiscoveryUrl - OIDC Discovery URL
 * @property {string} oidcScope - 请求 scope，默认 "openid profile email"
 * @property {string} oidcUsernameClaim - 用户名 claim，默认 "preferred_username"
 * @property {string} oidcRedirectUri - 回调地址
 *
 * @property {boolean} jitEnabled - 是否启用 JIT 自动建档
 * @property {string} jitGroupName - JIT 用户默认组名
 * @property {number} jitDefaultRoleId - JIT 用户默认角色 ID
 *
 * @property {boolean} sessionRefreshEnabled - 会话刷新开关（DB 优先）
 * @property {number} sessionRefreshExpireHours - Refresh token 有效期小时，默认 168（7 天）
 */

/**
 * SSO 配置测试响应（POST /biz/sso/config/test 的 data 字段）
 *
 * Doc 19 §1.5：LDAP 测试 data 为文本字符串；OIDC 测试 data 为结构化对象
 *
 * @typedef {string|OidcDiscoveryResult} SsoTestResponse
 *
 * @typedef {Object} OidcDiscoveryResult
 * @property {string} issuer - IdP issuer 标识
 * @property {string} authorization_endpoint - 授权端点
 * @property {string} token_endpoint - Token 端点
 * @property {string} jwks_uri - 密钥集地址
 * @property {number} jwks_keys_count - RSA 密钥数量
 * @property {string} [end_session_endpoint] - 注销端点（可选）
 */

// ---------- SSO 配置管理（管理员） ----------

/**
 * 查询 SSO 配置
 *
 * @returns {Promise<import('@/utils/request').AjaxResult<SsoConfig>>}
 */
export function getSsoConfig() {
  return get('/biz/sso/config')
}

/**
 * 更新 SSO 配置
 *
 * Doc 19 §1.5：
 * - 未传字段保持原值；oidcClientSecret 留空表示保持不变
 * - oidcClientSecretSet 为只读字段，PUT 时不需要传
 * - 保存后对新登录立即生效（无需重启）
 *
 * @param {Partial<SsoConfig>} data
 */
export function updateSsoConfig(data) {
  return put('/biz/sso/config', data)
}

/**
 * SSO 配置连接测试（LDAP 或 OIDC）
 *
 * Doc 19 §1.5：
 * - target 缺省 "ldap"；OIDC 测试执行 Discovery + JWKS 探测
 * - LDAP 测试响应：data 为文本（成功摘要 / 失败详情）
 * - OIDC 测试响应：data 为 OidcDiscoveryResult 结构化对象
 *
 * @param {Object} data
 * @param {'ldap'|'oidc'} [data.target] - 缺省 "ldap"
 * @param {Partial<SsoConfig>} [data.config] - 待测配置（可含未保存修改），缺省用已保存配置
 * @param {string} [data.username] - 仅 LDAP：探测账号（可选）
 * @param {string} [data.password] - 仅 LDAP：探测账号密码（可选）
 * @returns {Promise<import('@/utils/request').AjaxResult<SsoTestResponse>>}
 */
export function testSsoConfig(data) {
  return post('/biz/sso/config/test', data)
}

// ---------- 账号绑定（本人或管理员） ----------

/**
 * 查询账号绑定列表
 *
 * Doc 19 §1.6：管理员可指定 user_id，普通用户忽略该参数只看自己
 *
 * @param {number} [userId]
 * @returns {Promise<import('@/utils/request').AjaxResult<Array>>} 列表项含 authId/provider/subject/linkType/lastLoginTime 等
 */
export function getSsoLinks(userId) {
  return get('/biz/sso/links', userId ? { user_id: userId } : {})
}

/**
 * 手动绑定账号
 *
 * Doc 19 §1.6：非管理员强制绑自己（userId 被忽略），管理员必须给 userId
 *
 * @param {Object} data
 * @param {number} data.userId - 管理员必填
 * @param {string} data.provider - "ldap" / "oidc"，缺省 "ldap"
 * @param {string} data.subject - 身份标识，不能为空
 * @param {string} [data.idpUserName] - IdP 侧用户名
 * @param {string} [data.email]
 * @param {string} [data.displayName]
 */
export function createSsoLink(data) {
  return post('/biz/sso/links', data)
}

/**
 * 解绑账号
 *
 * Doc 19 §1.6：本人或管理员可操作，越权 403
 */
export function deleteSsoLink(authId) {
  return del(`/biz/sso/links/${authId}`)
}

// ---------- 组→角色建议规则（管理员） ----------
// Doc 19 §1.7：新增（组→角色建议规则，JIT/自动关联时 additive 追加）
// camelCase 字段

/**
 * 查询组→角色建议规则列表
 *
 * @param {'ldap'|'oidc'} [provider] - 可选过滤
 */
export function getSsoRoleRules(provider) {
  return get('/biz/sso/role_rules', provider ? { provider } : {})
}

/**
 * 新增组→角色建议规则
 *
 * Doc 19 §1.7：返回 data = 新 ruleId
 *
 * @param {Object} data
 * @param {'ldap'|'oidc'} data.provider
 * @param {string} data.idpGroup - AD 组 DN / OIDC 组名
 * @param {number} data.roleId - 本地角色 gis_role.role_id（必须存在，否则 400）
 * @param {boolean} [data.autoAssign] - 是否自动授予，默认 true
 * @param {number} [data.sortOrder] - 排序，默认 0
 * @param {'0'|'1'} [data.status] - '0' 正常 / '1' 停用，默认 '0'
 * @returns {Promise<import('@/utils/request').AjaxResult<number>>} data = 新 ruleId
 */
export function createSsoRoleRule(data) {
  return post('/biz/sso/role_rules', data)
}

/**
 * 更新组→角色建议规则
 *
 * @param {number} ruleId
 * @param {Object} data - 同 createSsoRoleRule
 */
export function updateSsoRoleRule(ruleId, data) {
  return put(`/biz/sso/role_rules/${ruleId}`, data)
}

/**
 * 删除组→角色建议规则（软删 data_sta='D'）
 */
export function deleteSsoRoleRule(ruleId) {
  return del(`/biz/sso/role_rules/${ruleId}`)
}
