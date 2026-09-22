// ==========================================
// HITL 人工审批单（gis_approval_request）
// 对应后端：/biz/gis_approval_request/*
// 文档：41 HITL 前端对接文档 §三 / 57 授权模型前端对接
// 页面：1016 待办审批 /workspace/approval/index
// 说明：
//   - 8 个接口均要求权限点 7（workspace:approval:pending），超管天然放行；
//   - 列表接口 data = { total, rows }，字段 snake_case；
//   - 列表 / 详情 / 批准响应都会下发 cmd_type（对象类型：service / device / …）与
//     target_name（对象名），【授权一段时间】按钮的可见性就看 cmd_type（57 §三#9、§5.2）；
//     改造前建的老单 target_name 为 null，展示需做空值兜底（57 §八#7）；
//   - 错误语义见 41 号 §七（400/401/403 带 {code,msg,data}，422 为纯文本）。
//
// 本模块统一关闭拦截器自动弹错（showError:false）：错误提示由 1016 审批页统一处理。
// 原因：422 的响应体是纯文本，拦截器取不到 data.msg，只能兜底成 axios 的英文串，
// 会与页面自己的 422 兜底重复弹窗；页面处理则能给出「请求参数不合法」（41 §七）。
// ==========================================

import { get, post } from '@/utils/request'

// 所有请求统一关闭拦截器自动弹错，由调用页负责提示
const OPTS = { showError: false }

/**
 * 待办列表（approver_id = 当前登录人 且 status='pending'）
 * 排序：created_time DESC, approval_id DESC
 * @param {{page?: number, page_size?: number}} params - 默认 1 / 10，page_size 按 [1,100] 截断
 */
export function getPendingApprovals(params = {}) {
  return get('/biz/gis_approval_request/pending', params, OPTS)
}

/**
 * 已处理列表（当前登录人处理过的单，带 effect / exec_status / exec_note 等执行结果）
 * 排序：updated_time DESC, approval_id DESC
 * @param {{status?: string, start?: string, end?: string, page?: number, page_size?: number}} params
 *   status 逗号分隔多值：approved / rejected / timeout / cancelled，缺省 = 全部非 pending
 *   start / end 为 YYYY-MM-DD，按 updated_time 过滤（含当天）
 */
export function getHandledApprovals(params = {}) {
  return get('/biz/gis_approval_request/handled', params, OPTS)
}

/**
 * 审批单详情（明文 params + requester_has_grant + config + cmd_type + target_name）
 * 已处理的单也可查；仅超管 / 申请人本人 / 该单审批人可看（其他人 403）
 * @param {number} id - approval_id
 */
export function getApprovalDetail(id) {
  return get(`/biz/gis_approval_request/${id}`, undefined, OPTS)
}

/**
 * 按业务单号查状态（给外部调用方用，前端一般不用）
 * @param {string} requestId - 形如 hitl-1789488531936-bfaba3
 */
export function getApprovalStatus(requestId) {
  return get(`/biz/gis_approval_request/status/${requestId}`, undefined, OPTS)
}

/**
 * 批准（once = 服务端按生效参数重放本次调用；grant = 写限时授权、本次不执行）
 * 注：对 cmd_type 非 service / device 的单传 effect='grant' 会被后端 400 拒绝（57 §六）
 * @param {number} id - approval_id
 * @param {Object} data
 * @param {'once'|'grant'} [data.effect] - 缺省 once
 * @param {number} [data.grant_hours] - 仅 grant 生效；缺省 2，0 = 永久，合法范围 0 或 1~720
 * @param {string} [data.approve_reason] - risk_review / capability_gap / data_quality /
 *                                         policy_compliance / business_judgement / other
 * @param {Object} [data.params_override] - 改参后批准：修改后的完整参数对象（仅 effect=once）
 * @param {string} [data.edit_reason] - 传 params_override 时必填
 * @param {string[]} [data.edited_fields] - 被修改的字段路径，如 ['arguments.file_path']（前端自算）
 */
export function approveApproval(id, data = {}) {
  return post(`/biz/gis_approval_request/${id}/approve`, data, OPTS)
}

/**
 * 拒绝（reason 必填；后端也校验：空/纯空格 400，超 512 字 400）
 * @param {number} id - approval_id
 * @param {{reason: string}} data
 */
export function rejectApproval(id, data) {
  return post(`/biz/gis_approval_request/${id}/reject`, data, OPTS)
}

/**
 * 撤回（仅申请人本人，超管可代撤；仅 pending 的单可撤回）
 * @param {number} id - approval_id
 * @param {{reason?: string}} data - 撤回原因，≤500 字
 */
export function cancelApproval(id, data = {}) {
  return post(`/biz/gis_approval_request/${id}/cancel`, data, OPTS)
}

/**
 * 手工建单（后台 / 联调 / 线下审批发起，不依赖智能体调用）
 * @param {Object} data
 * @param {number} data.requester_id - 必填，申请人（批准后重放也以该身份执行）
 * @param {string} data.tool_name - 必填，如 local_service_call / device_call
 * @param {string} [data.requester_name]
 * @param {Object} [data.arguments] - 建议与智能体调用时同构
 * @param {string} [data.risk_level] - 缺省 auth
 * @param {number} [data.approver_id] - 缺省按绑定表解析 → 回退管理员
 * @param {number} [data.expires_hours] - 缺省取系统参数 hitl_expires_hours（默认 24）
 * @param {string} [data.handover_reason] / [data.handover_note]
 */
export function createApproval(data) {
  return post('/biz/gis_approval_request', data, OPTS)
}
