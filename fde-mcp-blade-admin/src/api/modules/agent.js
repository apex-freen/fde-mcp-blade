// ==========================================
// 智能体相关接口
// ==========================================

import { request } from '@/utils/request'
import env from '@/config/env'
import { getToken } from '@/utils/auth'

// ========== 智能体 CRUD（管理后台） ==========

/**
 * 获取智能体列表（分页）
 */
export function getAgentPageList(params = {}) {
  return request({
    url: '/biz/gisAgent/list',
    method: 'GET',
    params
  })
}

/**
 * 获取所有智能体（下拉选择用，不分页）
 */
export function getAgentAllList(params = {}) {
  return request({
    url: '/biz/gisAgent/list',
    method: 'GET',
    params: { ...params, page_size: 999 }
  })
}

/**
 * 获取智能体详情
 */
export function getAgentDetail(id) {
  return request({
    url: `/biz/gisAgent/${id}`,
    method: 'GET'
  })
}

/**
 * 创建智能体
 */
export function createAgent(data) {
  return request({
    url: '/biz/gisAgent',
    method: 'POST',
    data
  })
}

/**
 * 更新智能体
 */
export function updateAgent(data) {
  return request({
    url: '/biz/gisAgent',
    method: 'PUT',
    data
  })
}

/**
 * 删除智能体
 */
export function deleteAgent(id) {
  return request({
    url: `/biz/gisAgent/${id}`,
    method: 'DELETE'
  })
}

// ========== MCP 工具绑定 ==========

/**
 * 查询智能体绑定的插件/MCP Server 列表
 */
export function getAgentPlugins(agentId) {
  return request({
    url: `/biz/gisAgent/${agentId}/plugins`,
    method: 'GET'
  })
}

/**
 * 绑定 MCP Server 到智能体
 * @param {number} agentId
 * @param {object} data - 标准 mcpServers 配置，如 { mcpServers: { name: { url, headers } } }
 */
export function bindAgentPlugins(agentId, data) {
  return request({
    url: `/biz/gisAgent/${agentId}/plugins`,
    method: 'POST',
    data
  })
}

/**
 * 更新智能体绑定的插件配置
 * @param {number} agentId
 * @param {number} pluginId
 * @param {object} data - { pluginName, description, config }，config 为单个 server 连接配置
 */
export function updateAgentPlugin(agentId, pluginId, data) {
  return request({
    url: `/biz/gisAgent/${agentId}/plugins/${pluginId}`,
    method: 'PUT',
    data
  })
}

/**
 * 解绑智能体的插件
 */
export function unbindAgentPlugin(agentId, pluginId) {
  return request({
    url: `/biz/gisAgent/${agentId}/plugins/${pluginId}`,
    method: 'DELETE'
  })
}

// ========== SSE 流式对话 ==========

/**
 * SSE 流式对话 — 使用原生 fetch + ReadableStream
 *
 * @param {Object} options
 * @param {string} options.message    - 用户消息（必填）
 * @param {string} [options.model]    - LLM 模型名称，如 deepseek-chat
 * @param {string} [options.provider] - LLM 提供商：deepseek / openai / ollama
 * @param {string} [options.session_no] - 已有会话编号，传入则继续对话
 * @param {number} [options.agent_id] - 智能体ID，传入后自动使用 agent 配置
 * @param {AbortSignal} [options.signal] - 用于中断请求的 AbortSignal
 * @returns {Promise<ReadableStream>} SSE 事件流
 */
export function agentChatSSE({ message, model, provider, session_no, agent_id, signal } = {}) {
  const token = getToken()
  const body = { message }
  if (model) body.model = model
  if (provider) body.provider = provider
  if (session_no) body.session_no = session_no
  if (agent_id) body.agent_id = agent_id

  return fetch(`${env.baseURL}/biz/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body),
    signal
  }).then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.msg || `请求失败 (${response.status})`)
      }).catch(() => {
        throw new Error(`请求失败 (${response.status})`)
      })
    }
    return response.body
  })
}
