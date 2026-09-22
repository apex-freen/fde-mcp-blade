// ==========================================
// 登录日志接口（monitor/logininfor）
// ⚠️ 列表返回 { total, rows }（无 code/msg 外层包裹）
// ⚠️ 时间筛选参数名为 RuoYi 风格：params[beginTime] / params[endTime]
// ⚠️ 导出返回 xlsx 二进制
// ⚠️ unlock（解锁用户）后端为占位实现，前端不接入
// ==========================================

import { get, del, request } from '@/utils/request'

/**
 * 分页列表（按 loginTime 倒序）
 * @param {Object} params - { pageNum, pageSize, ipaddr, userName, status, 'params[beginTime]', 'params[endTime]' }
 */
export function getLogininforList(params) {
  return get('/monitor/logininfor/list', params)
}

/**
 * 删除登录日志（infoIds 支持逗号分隔批量，如 "100,101"）
 * @param {string} infoIds
 */
export function deleteLogininfor(infoIds) {
  return del(`/monitor/logininfor/${infoIds}`)
}

/**
 * 清空登录日志
 */
export function cleanLogininfor() {
  return del('/monitor/logininfor/clean')
}

/**
 * 导出 xlsx（需权限点 controller:logininfor）
 * @param {Object} params - 同列表筛选参数，分页忽略
 */
export function exportLogininfor(params) {
  return request({
    url: '/monitor/logininfor/export',
    method: 'POST',
    data: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    showLoading: false
  })
}
