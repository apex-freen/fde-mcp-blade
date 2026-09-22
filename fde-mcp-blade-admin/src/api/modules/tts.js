// ==========================================
// TTS 供应商管理接口
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 供应商列表
 */
export function getTtsProviders(params) {
  return get('/biz/tts/providers', params)
}

/**
 * 供应商详情
 */
export function getTtsProviderDetail(id) {
  return get(`/biz/tts/providers/${id}`)
}

/**
 * 新增供应商
 */
export function createTtsProvider(data) {
  return post('/biz/tts/providers', data)
}

/**
 * 修改供应商
 */
export function updateTtsProvider(id, data) {
  return put(`/biz/tts/providers/${id}`, data)
}

/**
 * 删除供应商
 */
export function deleteTtsProvider(id) {
  return del(`/biz/tts/providers/${id}`)
}
