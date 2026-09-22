// ==========================================
// LLM 供应商 / 模型管理接口
// ==========================================

import { get, post, put, del } from '@/utils/request'

// ========== 供应商 ==========

/**
 * 供应商列表
 */
export function getLlmProviders(params) {
  return get('/biz/llm/providers', params)
}

/**
 * 供应商详情
 */
export function getLlmProviderDetail(id) {
  return get(`/biz/llm/providers/${id}`)
}

/**
 * 新增供应商
 */
export function createLlmProvider(data) {
  return post('/biz/llm/providers', data)
}

/**
 * 修改供应商
 */
export function updateLlmProvider(id, data) {
  return put(`/biz/llm/providers/${id}`, data)
}

/**
 * 删除供应商
 */
export function deleteLlmProvider(id) {
  return del(`/biz/llm/providers/${id}`)
}

// ========== 模型 ==========

/**
 * 模型列表（支持 ?providerId= 过滤）
 */
export function getLlmModels(params) {
  return get('/biz/llm/models', params)
}

/**
 * 模型详情
 */
export function getLlmModelDetail(id) {
  return get(`/biz/llm/models/${id}`)
}

/**
 * 新增模型
 */
export function createLlmModel(data) {
  return post('/biz/llm/models', data)
}

/**
 * 修改模型
 */
export function updateLlmModel(id, data) {
  return put(`/biz/llm/models/${id}`, data)
}

/**
 * 删除模型
 */
export function deleteLlmModel(id) {
  return del(`/biz/llm/models/${id}`)
}
