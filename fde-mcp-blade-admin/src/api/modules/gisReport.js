// ==========================================
// 价值报告 + 成本使用率面板接口
// 对应后端：/biz/gis_report/*, /biz/gis_report/panel/*
// Doc 19 §5 ~ §8
// ==========================================

import { get } from '@/utils/request'

/**
 * 报告通用 Query 参数
 * @typedef {Object} ReportParams
 * @property {'week'|'month'|'quarter'|'custom'} period - 统计区间（默认 month）
 * @property {string} [start] - custom 时起始日期 YYYY-MM-DD
 * @property {string} [end] - custom 时结束日期 YYYY-MM-DD
 * @property {number} [dept_id] - 下钻过滤：部门（仅影响调用日志派生指标）
 * @property {string} [plugin_name] - 下钻过滤：插件名
 */

// ---------- 价值报告 ----------

/**
 * 获取完整价值报告
 *
 * Doc 19 §5.1：包含 meta / summary / efficiency / quality / adoption / suggestions / metrics
 * @param {ReportParams} params
 */
export function getReport(params = {}) {
  return get('/biz/gis_report/report', params)
}

/**
 * 获取全部指标定义（12 项）
 *
 * Doc 19 §5.2
 */
export function getReportMetrics() {
  return get('/biz/gis_report/metrics')
}

/**
 * 获取 5 项汇总指标（#3、#10、#4、#6、#2）
 *
 * Doc 19 §5.3
 */
export function getReportSummary() {
  return get('/biz/gis_report/summary')
}

/**
 * 导出报告文件流
 *
 * Doc 19 §5.4：xlsx（默认）/ csv / json；PDF 不支持
 * @param {'xlsx'|'csv'|'json'} format
 * @param {ReportParams} params
 */
export function exportReport(format = 'xlsx', params = {}) {
  return get('/biz/gis_report/export', { ...params, format }, { responseType: 'blob' })
}

// ---------- 成本使用率面板 ----------

/**
 * 面板汇总卡片数据
 *
 * Doc 19 §8.1：total_calls / success_rate / est_tokens / est_cost / price_configured / equivalent_man_days 等
 * @param {ReportParams} params
 */
export function getPanelSummary(params = {}) {
  return get('/biz/gis_report/panel/summary', params)
}

/**
 * 面板趋势图数据
 *
 * Doc 19 §8.2
 * @param {'dept'|'plugin'} groupBy
 * @param {ReportParams} params
 */
export function getPanelTrend(groupBy = 'dept', params = {}) {
  return get('/biz/gis_report/panel/trend', { ...params, group_by: groupBy })
}

/**
 * 排行榜数据
 *
 * Doc 19 §8.3：plugins / agents / failures 三类；failures 仅样本 ≥ 3
 * @param {number} limit
 */
export function getPanelRanking(limit = 10) {
  return get('/biz/gis_report/panel/ranking', { limit })
}

/**
 * 预算总览（按 scope_type 聚合）
 *
 * Doc 19 §8.4 / §8.5：period 为自然月 YYYY-MM，如 2026-09
 * @param {string} period
 */
export function getPanelBudget(period) {
  return get('/biz/gis_report/panel/budget', { period })
}
