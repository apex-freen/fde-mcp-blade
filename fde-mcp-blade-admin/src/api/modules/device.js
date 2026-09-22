// ⚠️ DEPRECATED · 2026-09-11
// ---------------------------------------------------------
// 后端 gis_auth 模块已整体下线（Doc 23），以下 `/biz/mobile/auth/eqp/*`、
// `/biz/mobile/auth/localDevice/*` 旧路径均已废弃：
//   - 设备 CRUD  → 改用 src/api/modules/gisEqp.js
//   - 设备状态   → 改用 src/api/modules/gisEqp.js + gisSettings.js
//   - 网络配置   → 改用 src/api/modules/gisSettings.js
//   - 蓝牙       → 改用 src/api/modules/gisSettings.js（预留）
//   - 固件       → 改用 src/api/modules/gisSettings.js
//   - 关机/重启  → 改用 src/api/modules/gisSettings.js
//   - MQTT 客户端 → 改用 src/api/modules/mqtt.js（待建）
//
// 本文件暂时保留，不做任何功能变更。views 层目前未引用。
// ---------------------------------------------------------
// 设备相关接口
// 对应移动端 api.js: getEqpList, getEqpDetailByEqpId 等

import { request } from '@/utils/request'

/**
 * 获取设备列表
 */
export function getEqpList() {
  return request({
    url: '/biz/mobile/auth/eqp/getEqpList',
    method: 'GET'
  })
}

/**
 * 按区域分组获取设备列表
 */
export function getEqpListGroupByArea() {
  return request({
    url: '/biz/mobile/auth/eqp/getEqpListGroupByEqpArea',
    method: 'GET'
  })
}

/**
 * 获取设备详情
 */
export function getEqpDetailById(gisEqpId) {
  return request({
    url: `/biz/mobile/auth/eqp/getEqpDetailByEqpId/${gisEqpId}`,
    method: 'GET'
  })
}

/**
 * 更新设备
 */
export function putUpdateEqp(data) {
  return request({
    url: '/biz/mobile/auth/eqp/putUpdateEqp',
    method: 'PUT',
    data,
    showLoading: true
  })
}

/**
 * 授权设备给客户端
 */
export function authDeviceToClient(data) {
  return request({
    url: '/biz/mobile/auth/eqp/authPublicToClientId',
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * 删除设备
 */
export function delDeleteEqp(data) {
  return request({
    url: '/biz/mobile/auth/eqp/delDeleteEqp',
    method: 'DELETE',
    data,
    showLoading: true
  })
}

// ========== 本地设备状态 ==========

/**
 * 获取本地设备状态
 */
export function getDeviceStatus() {
  return request({
    url: '/biz/mobile/auth/localDevice/getDeviceStatus',
    method: 'GET'
  })
}

/**
 * 获取控制器信息
 */
export function getControllerInfo() {
  return request({
    url: '/biz/mobile/auth/localDevice/getControllerInfo',
    method: 'GET'
  })
}

/**
 * 更新控制器信息
 */
export function updateControllerInfo(data) {
  return request({
    url: '/biz/mobile/auth/localDevice/updateControllerInfo',
    method: 'POST',
    data
  })
}

/**
 * 获取节能模式状态
 */
export function getSavepower() {
  return request({
    url: '/biz/mobile/auth/localDevice/getSavepower',
    method: 'GET'
  })
}

// ========== 网络相关 ==========

/**
 * 获取当前有线网络
 */
export function getCurrentWiredLan() {
  return request({
    url: '/biz/mobile/auth/localDevice/getCurrentWiredLan',
    method: 'GET'
  })
}

/**
 * 获取当前无线网络
 */
export function getCurrentWirelessLan() {
  return request({
    url: '/biz/mobile/auth/localDevice/getCurrentWirelessLan',
    method: 'GET'
  })
}

/**
 * 更新有线网络
 */
export function postCurrentWiredLanUpdate(data) {
  return request({
    url: '/biz/mobile/auth/localDevice/postCurrentWiredLanUpdate',
    method: 'POST',
    data
  })
}

/**
 * 更新无线网络
 */
export function postCurrentWirelessLanUpdate(data) {
  return request({
    url: '/biz/mobile/auth/localDevice/postCurrentWirelessLanUpdate',
    method: 'POST',
    data
  })
}

/**
 * 连接 WiFi
 */
export function postConnectWifi(data) {
  return request({
    url: '/biz/mobile/auth/localDevice/connectWifi',
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * 扫描 WiFi
 */
export function getScanWifi() {
  return request({
    url: '/biz/mobile/auth/localDevice/scanWifi',
    method: 'GET',
    showLoading: true
  })
}

// ========== 蓝牙相关 ==========

/**
 * 扫描蓝牙设备
 */
export function getScanBt() {
  return request({
    url: '/biz/mobile/auth/localDevice/getScanBt',
    method: 'GET',
    showLoading: true
  })
}

/**
 * 获取蓝牙扫描结果
 */
export function getScanBtResult() {
  return request({
    url: '/biz/mobile/auth/localDevice/getScanBtResult',
    method: 'GET',
    showLoading: true
  })
}

/**
 * 添加蓝牙设备
 */
export function postAddBt(data) {
  return request({
    url: '/biz/mobile/auth/localDevice/addBt',
    method: 'POST',
    data,
    showLoading: true
  })
}

/**
 * 测试蓝牙声音
 */
export function postTestBtSoundByClientId(data) {
  return request({
    url: '/biz/mobile/auth/localDevice/testBtSoundByClientId',
    method: 'POST',
    data,
    showLoading: true
  })
}

// ========== 固件相关 ==========

/**
 * 获取网络固件信息
 */
export function getNetware() {
  return request({
    url: '/biz/mobile/auth/localDevice/getNetware',
    method: 'GET'
  })
}

/**
 * 更新固件
 */
export function postUpdateNetware(data) {
  return request({
    url: '/biz/mobile/auth/localDevice/postUpdateNetware',
    method: 'POST',
    data,
    showLoading: true
  })
}

// ========== 关机/重启 ==========

/**
 * 关机
 */
export function getShutdownController() {
  return request({
    url: '/biz/mobile/auth/localDevice/getShutdownController',
    method: 'GET',
    showLoading: true
  })
}

/**
 * 重启
 */
export function getRestartController() {
  return request({
    url: '/biz/mobile/auth/localDevice/getRestartController',
    method: 'GET',
    showLoading: true
  })
}
