// ==========================================
// 本地向量检索 / 知识库接口
// 对应后端：/biz/gis_vector/*
// Doc 19 §4
// ==========================================

import { get, post } from '@/utils/request'

// ---------- 索引管理 ----------

/**
 * 查询向量索引列表
 *
 * Doc 19 §4.2：system 索引全部可见，user 索引仅 owner 可见
 */
export function getVectorIndexList() {
  return get('/biz/gis_vector/index_list')
}

/**
 * 查询索引下的文档列表
 *
 * Doc 19 §4.2：index_id 必填；page_size 上限 200
 * @param {number} indexId
 * @param {number} page
 * @param {number} pageSize
 */
export function getVectorDocList(indexId, page = 1, pageSize = 20) {
  return get('/biz/gis_vector/doc_list', { index_id: indexId, page, page_size: pageSize })
}

// ---------- 检索 & 重建 ----------

/**
 * 向量语义搜索
 *
 * Doc 19 §4.2
 * @param {Object} data - { query, index_id?, top_k? (默认 5, 上限 20) }
 */
export function vectorSearch(data) {
  return post('/biz/gis_vector/search', data)
}

/**
 * 重建索引（重新装载向量）
 *
 * Doc 19 §4.2：system 索引需 admin，user 索引需 owner
 * @param {number} indexId
 */
export function rebuildVectorIndex(indexId) {
  return post('/biz/gis_vector/rebuild', { index_id: indexId })
}
