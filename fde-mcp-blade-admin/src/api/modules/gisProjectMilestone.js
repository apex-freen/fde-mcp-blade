// ==========================================
// 项目里程碑接口（FDE 屏 ⑪ 的 TTV 数据源）
// 对应后端：/biz/gis_project_milestone/*
// Doc 37 §7.1
// ==========================================

import { get, post } from '@/utils/request'

/**
 * 里程碑列表
 *
 * Doc 37 §7.1：**只返回「已达成」的节点**，前端须按 stage 枚举自行补全 7 行；
 * 查询前后端会自动回填 first_plugin_online / first_success_call 两个 auto 节点。
 * @param {string} projectCode - 缺省 default（单客户部署固定值）
 */
export function getMilestoneList(projectCode = 'default') {
  return get('/biz/gis_project_milestone/list', { project_code: projectCode })
}

/**
 * TTV 汇总（只看首次价值实现时间）
 * @param {string} projectCode
 */
export function getMilestoneTtv(projectCode = 'default') {
  return get('/biz/gis_project_milestone/ttv', { project_code: projectCode })
}

/**
 * 人工录入里程碑（按 project_code + stage 幂等 upsert）
 *
 * Doc 37 §7.1：auto 节点（first_plugin_online / first_success_call）会被后端拒绝
 * @param {Object} data
 * @param {string} data.stage - kickoff / connected / first_report / first_value_confirmed / go_live
 * @param {string} [data.milestone_time] - YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss，缺省取当前时间
 * @param {string} [data.project_code] - 缺省 default
 * @param {string} [data.project_name] - 展示用
 * @param {string} [data.customer_name] - 展示用
 * @param {string} [data.evidence_ref] - 证据链接
 * @param {string} [data.remark] - 备注
 */
export function recordMilestone(data) {
  return post('/biz/gis_project_milestone/record', data)
}
