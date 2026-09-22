// ==========================================
// 成本策略 CRUD 接口
// 对应后端：/biz/gis_cost_policy*
// Doc 19 §8.5
// ==========================================

import { request, get, post } from '@/utils/request'

/**
 * 查询成本策略列表
 *
 * Doc 19 §8.5：包含 global / dept / token 三种 scope
 */
export function getCostPolicyList() {
  return get('/biz/gis_cost_policy')
}

/**
 * 创建或更新成本策略（幂等 upsert，按 scope_type + scope_id）
 *
 * Doc 19 §8.5
 * @param {Object} data
 * @param {'global'|'dept'|'token'} data.scope_type - global 时 scope_id 强制 0
 * @param {number} data.scope_id - dept 时为 dept_id，token 时为 token_id
 * @param {number} data.input_price - 元/千 token
 * @param {number} data.output_price - 元/千 token
 * @param {number} data.monthly_token_limit
 * @param {number} data.monthly_cost_limit
 * @param {number} [data.warn_ratio] - 默认 0.8
 * @param {boolean} [data.block_enabled]
 * @param {string} [data.status] - "1" 正常
 */
export function createOrUpdateCostPolicy(data) {
  return post('/biz/gis_cost_policy', data)
}

/**
 * 删除成本策略
 *
 * Doc 19 §8.5：DELETE 带 query params（非 path param）
 * @param {'global'|'dept'|'token'} scopeType
 * @param {number} scopeId
 */
export function deleteCostPolicy(scopeType, scopeId) {
  return request({
    url: '/biz/gis_cost_policy/delete',
    method: 'DELETE',
    params: { scope_type: scopeType, scope_id: scopeId }
  })
}

/**
 * 查询预算总览（可按自然月过滤）
 *
 * Doc 19 §8.5：与 panel/budget 同源，这里直接走 cost_policy 模块路径
 * @param {string} period - 自然月 YYYY-MM
 */
export function getCostBudget(period) {
  return get('/biz/gis_cost_policy/budget', { period })
}
