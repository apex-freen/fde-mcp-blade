// ==========================================
// MCP 工具（gis_mcp_tool）
// 对应后端：/biz/gis_mcp_tool/*
// 文档：1050 系统操作 MCP 化 · 前端对接 §五
// 用途：系统功能（category = "fde_system"）工具的风险等级 / 启停 / 排序 / 显示名配置
// 说明：
//   - risk_level ∈ normal / risk / auth / disable，修改后即时生效（后端实时查表），无需重启；
//   - 风险支持「组默认 + 单工具覆盖」，本页改的就是单工具覆盖值；
//   - status ∈ '0' 启用 / '1' 禁用。
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 工具列表
 * @param {Object} [params]
 * @param {string} [params.category] - 固定传 fde_system
 * @param {string} [params.risk_level] - normal / risk / auth / disable
 * @param {string} [params.status] - 0 启用 / 1 禁用
 * @param {number} [params.page] - 默认 1
 * @param {number} [params.page_size] - 默认 10
 * @returns 响应沿用 TableDataResponse（rows / total）
 */
export function getMcpToolList(params = {}) {
  return get('/biz/gis_mcp_tool/list', params)
}

/**
 * 工具详情
 * @param {number} toolId
 */
export function getMcpToolDetail(toolId) {
  return get(`/biz/gis_mcp_tool/${toolId}`)
}

/**
 * 新增工具
 * @param {Object} data - { tool_name, display_name, description, category, risk_level, params_schema, sort_order, status }
 */
export function createMcpTool(data) {
  return post('/biz/gis_mcp_tool/create', data)
}

/**
 * 修改工具
 * @param {number} toolId
 * @param {Object} data - 可部分字段
 */
export function updateMcpTool(toolId, data) {
  return put(`/biz/gis_mcp_tool/${toolId}`, data)
}

/**
 * 删除工具
 * @param {number} toolId
 */
export function deleteMcpTool(toolId) {
  return del(`/biz/gis_mcp_tool/${toolId}`)
}
