// ⚠️ DEPRECATED · 2026-09-11
// ---------------------------------------------------------
// 后端 gis_auth 模块已整体下线（Doc 23），以下 `/biz/mobile/auth/user/*`
// 旧路径均已废弃：
//   - 授权列表  → 改用 `GET /biz/gis_grant/list`
//   - 授权日志  → 改用 `GET /biz/gis_grant_log`
//   - 操作日志  → 改用 `GET /biz/gis_cmd_log`
//
// 本文件暂时保留，不做任何功能变更。views 层目前未引用。
// ---------------------------------------------------------
// 授权相关接口
// 对应移动端 api.js: getGrantList, getGrantLogList 等

import { request } from '@/utils/request'

/**
 * 获取授权列表
 */
export function getGrantList(params) {
  return request({
    url: '/biz/mobile/auth/user/getGrantList',
    method: 'GET',
    params
  })
}

/**
 * 获取授权日志列表
 */
export function getGrantLogList(params) {
  return request({
    url: '/biz/mobile/auth/user/getGrantLogList',
    method: 'GET',
    params
  })
}

/**
 * 获取操作日志列表
 */
export function getCmdLogList(params) {
  return request({
    url: '/biz/mobile/auth/user/getCmdLogList',
    method: 'GET',
    params
  })
}
