// ==========================================
// 定时任务接口（monitor/job）
// 后端为 Quartz 风格调度，调用目标为 Rust 侧标识
// ⚠️ 列表返回 { total, rows }（无 code/msg 外层包裹）
// ⚠️ 详情额外手工拼了 { code, msg, data }
// ⚠️ 导出返回 xlsx 二进制
// ==========================================

import { get, post, put, del, request } from '@/utils/request'

/**
 * 分页列表（按 jobId 倒序）
 * @param {Object} params - { pageNum, pageSize, jobName, jobGroup, status }
 */
export function getJobList(params) {
  return get('/monitor/job/list', params)
}

/**
 * 任务详情
 * @param {number|string} jobId
 */
export function getJobDetail(jobId) {
  return get(`/monitor/job/${jobId}`)
}

/**
 * 新增任务
 * @param {Object} data - camelCase 字段
 */
export function createJob(data) {
  return post('/monitor/job', data)
}

/**
 * 修改任务（需带 jobId）
 * @param {Object} data
 */
export function updateJob(data) {
  return put('/monitor/job', data)
}

/**
 * 删除任务（jobIds 支持逗号分隔批量，如 "1,2,3"）
 * @param {string} jobIds
 */
export function deleteJob(jobIds) {
  return del(`/monitor/job/${jobIds}`)
}

/**
 * 启用 / 暂停任务
 * @param {number|string} jobId
 * @param {string} status - '0' 正常 / '1' 暂停
 */
export function changeJobStatus(jobId, status) {
  return put('/monitor/job/changeStatus', { jobId, status })
}

/**
 * 立即执行一次
 * @param {number|string} jobId
 */
export function runJob(jobId) {
  return put(`/monitor/job/run/${jobId}`)
}

/**
 * 导出 xlsx（需权限点 controller:job）
 * @param {Object} params - 同列表筛选参数，分页忽略
 */
export function exportJob(params) {
  return request({
    url: '/monitor/job/export',
    method: 'POST',
    data: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    showLoading: false
  })
}
