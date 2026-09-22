// ==========================================
// 数据大屏 · 三屏聚合接口
// 对应后端：/biz/gis_screen/{report,cost,fde}（独立模块，非后台报表接口）
// Doc 37 §一 / §三；Doc 35 §三
// ==========================================

import { get } from '@/utils/request'

/**
 * 大屏通用 Query 参数
 * @typedef {Object} ScreenParams
 * @property {'week'|'month'|'quarter'|'custom'} [period] - 统计区间，默认 month（滚动天数）
 * @property {string} [start] - custom 时传 YYYY-MM-DD；缺失时后端兜底为 now-30d
 * @property {string} [end] - custom 时传 YYYY-MM-DD；缺失时后端兜底为 now
 * @property {number} [dept_id] - 部门过滤
 * @property {string} [plugin_name] - 插件过滤
 * @property {'dept'|'plugin'} [group_by] - 趋势分组维度，默认 dept
 * @property {number} [limit] - 排行条数 1~50，默认 10
 */

// 三屏各自「首屏只发 1 个请求」，服务端已完成全部聚合，前端不得并发多接口拼页面。
// 大屏为轮询场景，失败提示由页面右上角自绘，因此统一关闭全局错误 toast。

/**
 * 屏 1 · 价值报告聚合接口
 *
 * Doc 37 §4.1：data 与后台 `/biz/gis_report/report` 逐字段相等
 * @param {ScreenParams} params
 */
export function getScreenReport(params = {}) {
  return get('/biz/gis_screen/report', params, { showError: false })
}

/**
 * 屏 2 · 成本面板聚合接口
 *
 * Doc 37 §5.1：data 含 meta / summary / trend / ranking / budget
 * @param {ScreenParams} params
 */
export function getScreenCost(params = {}) {
  return get('/biz/gis_screen/cost', params, { showError: false })
}

/**
 * 屏 3 · FDE 价值聚合接口
 *
 * Doc 37 §6.3：data 含 meta / hero / trend / scene_rank / cost / adoption / quality / phase2
 * @param {ScreenParams} params
 */
export function getScreenFde(params = {}) {
  return get('/biz/gis_screen/fde', params, { showError: false })
}
