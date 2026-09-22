// ==========================================
// ASR 供应商管理接口
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 供应商列表
 */
export function getAsrProviders(params) {
  return get('/biz/asr/providers', params)
}

/**
 * 供应商详情
 */
export function getAsrProviderDetail(id) {
  return get(`/biz/asr/providers/${id}`)
}

/**
 * 新增供应商
 */
export function createAsrProvider(data) {
  return post('/biz/asr/providers', data)
}

/**
 * 修改供应商
 */
export function updateAsrProvider(id, data) {
  return put(`/biz/asr/providers/${id}`, data)
}

/**
 * 删除供应商
 */
export function deleteAsrProvider(id) {
  return del(`/biz/asr/providers/${id}`)
}
