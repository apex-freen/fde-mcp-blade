// ⚠️ DEPRECATED · 2026-09-11
// ---------------------------------------------------------
// 后端 gis_auth 模块已整体下线（Doc 23），以下 `/biz/mobile/auth/user/*`、
// `/biz/mobile/auth/mqttClient/*`、`/biz/mobile/auth/mqttServer/*` 旧路径均已废弃：
//   - 系统配置 / 初始化 → 改用 src/api/modules/gisSettings.js 对应路径
//   - MQTT 客户端/服务端 → 改用 src/api/modules/mqtt.js（待建）
//
// 本文件暂时保留，不做任何功能变更。views 层目前未引用。
// ---------------------------------------------------------
// 系统设置相关接口
// 对应移动端 api.js: MQTT 服务、系统配置等

import { request } from '@/utils/request'

// ========== 系统配置 ==========

/**
 * 系统设置（首次引导）
 */
export function postSystemSetup(data) {
  return request({
    url: '/biz/mobile/auth/user/postSystemSetup',
    method: 'POST',
    data
  })
}

/**
 * 获取系统配置
 */
export function getSystemConfig() {
  return request({
    url: '/biz/mobile/auth/user/getSystemConfig',
    method: 'GET'
  })
}

/**
 * 更新系统配置
 */
export function postUpdateSystemConfig(data) {
  return request({
    url: '/biz/mobile/auth/user/postUpdateSystemConfig',
    method: 'POST',
    data
  })
}

// ========== MQTT 服务 ==========

/**
 * MQTT 客户端停止
 */
export function getMqttClientStop() {
  return request({
    url: '/biz/mobile/auth/mqttClient/mqttClientStop',
    method: 'GET',
    showLoading: true
  })
}

/**
 * MQTT 客户端重启
 */
export function getMqttClientRestart() {
  return request({
    url: '/biz/mobile/auth/mqttClient/mqttClientRestart',
    method: 'GET',
    showLoading: true
  })
}

/**
 * MQTT 客户端更新
 */
export function postMqttClientUpdate(data) {
  return request({
    url: '/biz/mobile/auth/mqttClient/mqttClientUpdate',
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * MQTT 服务端更新
 */
export function postMqttServerUpdate(data) {
  return request({
    url: '/biz/mobile/auth/mqttServer/mqttServerUpdate',
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * 获取 MQTT 服务端客户端列表
 */
export function getMqttServerClientlist() {
  return request({
    url: '/biz/mobile/auth/mqttServer/getMqttServerClientlist',
    method: 'GET',
    showLoading: true
  })
}

/**
 * 根据 MQTT 客户端 ID 添加设备
 */
export function postAddEqpByMqttServerClientId(data) {
  return request({
    url: '/biz/mobile/auth/mqttServer/postAddEqpByMqttServerClientId',
    method: 'POST',
    data,
    showLoading: true
  })
}
