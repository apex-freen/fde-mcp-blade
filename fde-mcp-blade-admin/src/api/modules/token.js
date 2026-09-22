// ==========================================
// 令牌管理接口
// 接口前缀：/biz/tokens
// ==========================================

import { get, post, del } from '@/utils/request'

/**
 * 创建令牌
 * @param {Object} data - { token_name, token_time_unit, expiration_hours?, target_user_id }
 */
export function createToken(data) {
  return post('/biz/tokens', data)
}

/**
 * 查询令牌列表（分页）
 * @param {Object} params - { page, page_size, user_name? }
 */
export function getTokenList(params) {
  return get('/biz/tokens', params)
}

/**
 * 撤销令牌
 * @param {number} id - 令牌 ID
 */
export function revokeToken(id) {
  return del(`/biz/tokens/${id}`)
}
