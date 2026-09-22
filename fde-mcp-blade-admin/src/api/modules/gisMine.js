// ==========================================
// 工作台 · 个人视图（gis_mine）
// 对应后端：/biz/gis_mine/*
// 文档：103 使用中心前端对接 §4.1（2026-09-22 后端已实现并实测）
// 页面：1018 工作台 /workspace/dashboard/index
// 说明：
//   - 6 个接口**都不挂页面级权限点**，登录即可用；
//   - 服务端强制按当前登录人过滤，**不要传 user_id**（传了也不生效）；
//   - 首屏优先只调 overview（1 个请求），单卡刷新再调对应细接口；
//   - 单张卡与 overview 里的同名卡结构完全一致，都是 { data, degraded, reason }，
//     前端可以用同一个渲染函数处理。
// ==========================================

import { get } from '@/utils/request'

/**
 * 工作台首屏：一次返回全部卡片（后端内部并发查 5 个域）
 * @param {{days?: number}} [params] days 为趋势天数，缺省 7，范围 1~90（只影响「我的调用」卡）
 * @returns data = { user_id, generated_at, days, message, approval, cmd, grant, token, doc }
 *          其中 message/approval/cmd/grant/token/doc 均为 { data, degraded, reason }
 */
export function getMineOverview(params = {}) {
  return get('/biz/gis_mine/overview', params)
}

/**
 * 有什么消息（items 最多 10 条，created_time 倒序；total 是全部条数）
 * 点击跳转直接用 items[].biz_ref_route，前端不要自己拼路由
 */
export function getMineMessage() {
  return get('/biz/gis_mine/message')
}

/**
 * 我的调用：total / success / failed / success_rate / trend[] / days
 * success_rate 是百分数（81.34 表示 81.34%）；无调用时为 null
 * trend 只返回有调用的那天，缺失日期需前端自行补 0
 * @param {{days?: number}} [params]
 */
export function getMineCmd(params = {}) {
  return get('/biz/gis_mine/cmd', params)
}

/**
 * 我发起的授权申请：按状态分组计数（total / pending / approved / rejected / timeout / cancelled）
 */
export function getMineApproval() {
  return get('/biz/gis_mine/approval')
}

/**
 * 我获得的授权：total / active / revoked / expiring_soon / by_type[] / expiring_soon_days
 */
export function getMineGrant() {
  return get('/biz/gis_mine/grant')
}

/**
 * 我名下的令牌：total / active / revoked / expiring_soon / max_risk_level / expiring_soon_days
 * max_risk_level ∈ normal / risk / auth，无有效令牌时为 null
 */
export function getMineToken() {
  return get('/biz/gis_mine/token')
}

// ========== 个人中心 3 个明细列表（103 §4.8.1） ==========
// 均不挂页面级权限点、服务端强制按当前登录人过滤（不要传 user_id）；
// 出参统一 {code, msg, data:{total, rows}}；
// 分页共用 page / page_size（默认 20，最大 100）；
// 排序由后端固定（授权/令牌"有效优先"、调用"最新在前"）——前端不要传排序参数。

/**
 * 我的授权列表
 * @param {{status?: '1'|'2', grant_type?: string, page?: number, page_size?: number}} params
 *   status：'1' 已授权 / '2' 已撤销；grant_type：device / service …
 */
export function getMineGrantList(params = {}) {
  return get('/biz/gis_mine/grant/list', params)
}

/**
 * 我的调用列表
 * 注：不返回调用入参/出参（刻意为之），要看得走审计中心
 * @param {{success?: boolean, tool_name?: string, begin_time?: string, end_time?: string, page?: number, page_size?: number}} params
 *   tool_name 为**工具名**（如 local_service_call）模糊匹配，不是插件名；
 *   begin_time / end_time 为 YYYY-MM-DD，结束日含当天
 */
export function getMineCmdList(params = {}) {
  return get('/biz/gis_mine/cmd/list', params)
}

/**
 * 我的令牌列表
 * 注：库里只存 token_jti 与 token_prefix，拿不到令牌本身 → 本页只读，不做复制与撤销
 * @param {{status?: 'active'|'revoked', page?: number, page_size?: number}} params
 */
export function getMineTokenList(params = {}) {
  return get('/biz/gis_mine/token/list', params)
}
