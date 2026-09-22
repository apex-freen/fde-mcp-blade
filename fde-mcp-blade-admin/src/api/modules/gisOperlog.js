// ==========================================
// 系统操作日志接口（monitor/operlog，数据源 sys_oper_log）
// ⚠️ 列表返回 { total, rows }（TableDataInfo 裸结构，无 code/msg 包裹）
// ⚠️ 删除 / 清空 / 导出 返回 AjaxResult { code, msg, data }
// ⚠️ 时间筛选参数名为字面参数名 params[beginTime] / params[endTime]
// ⚠️ 导出为 POST + xlsx 二进制，且需权限点 controller:operlog
// ==========================================

import { get, del, request } from '@/utils/request'

/**
 * 分页列表（固定按 oper_time DESC 排序）
 * @param {Object} params
 * @param {string} [params.title] - 模块标题，LIKE 模糊匹配
 * @param {string} [params.operName] - 操作人，LIKE 模糊匹配
 * @param {number|string} [params.businessType] - 业务类型 0~9
 * @param {number|string} [params.status] - 0 正常 / 1 异常
 * @param {string} [params['params[beginTime]']] - 起始时间
 * @param {string} [params['params[endTime]']] - 结束时间
 * @param {number} [params.pageNum] - 默认 1
 * @param {number} [params.pageSize] - 默认 10
 */
export function getOperlogList(params) {
  return get('/monitor/operlog/list', params)
}

/**
 * 删除操作日志（operIds 支持逗号分隔批量，如 "1,2,3"）
 * @param {string} operIds
 */
export function deleteOperlog(operIds) {
  return del(`/monitor/operlog/${operIds}`)
}

/**
 * 清空操作日志
 */
export function cleanOperlog() {
  return del('/monitor/operlog/clean')
}

/**
 * 导出 xlsx（需权限点 controller:operlog，否则 403）
 * 页面级权限：与菜单同码；后端导出接口注解需同步改造（原为 audit:operation_log）
 * @param {Object} params - 同列表筛选参数，分页忽略
 */
export function exportOperlog(params) {
  return request({
    url: '/monitor/operlog/export',
    method: 'POST',
    data: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    showLoading: false
  })
}
