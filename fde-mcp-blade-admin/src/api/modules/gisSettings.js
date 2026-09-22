// ==========================================
// 系统设置接口（gis_settings 模块）
// 接口前缀：/biz/gis_settings
// ==========================================

import { get, post, put } from '@/utils/request'

// ---------- 设备信息 ----------

/**
 * 查询设备基本信息
 * @returns {Promise} { device_name, device_desc, device_area, device_password, device_id, firmware_version }
 */
export function getDeviceInfo() {
  return get('/biz/gis_settings/device/info')
}

/**
 * 修改设备基本信息
 * @param {Object} data - { device_name, device_desc?, device_area?, device_password?, device_id, firmware_version }
 */
export function updateDeviceInfo(data) {
  return put('/biz/gis_settings/device/info', data)
}

// ---------- 主机名称（Docker 环境不可用） ----------

/**
 * 查询主机名称（Docker 环境下返回 400）
 */
export function getHostName() {
  return get('/biz/gis_settings/device/host_name')
}

/**
 * 修改主机名称（Docker 环境下返回 400）
 * @param {Object} data - { host_name }
 */
export function updateHostName(data) {
  return put('/biz/gis_settings/device/host_name', data)
}

// ---------- 系统健康 ----------

/**
 * 查询系统环境信息（是否 Docker 环境）
 * @returns {Promise} { is_docker }
 */
export function getEnvInfo() {
  return get('/biz/gis_settings/system/env_info')
}

/**
 * 查询系统健康状态
 * @returns {Promise} { cpu_usage, memory_usage, memory_total, memory_used, disk_usage, disk_total, disk_used, uptime_seconds, is_online }
 */
export function getSystemHealth() {
  return get('/biz/gis_settings/system/health')
}

// ---------- 有线网络（Docker 环境不可用） ----------

/**
 * 查询有线网络配置（Docker 环境下返回 400）
 */
export function getWiredLan() {
  return get('/biz/gis_settings/network/wired_lan')
}

/**
 * 修改有线网络配置（Docker 环境下返回 400）
 * @param {Object} data - { is_dhcp, ip?, netmask?, gateway?, dns? }
 */
export function updateWiredLan(data) {
  return put('/biz/gis_settings/network/wired_lan', data)
}

// ---------- 无线网络（Docker 环境不可用） ----------

/**
 * 查询无线网络配置（Docker 环境下返回 400）
 */
export function getWirelessLan() {
  return get('/biz/gis_settings/network/wireless_lan')
}

/**
 * 修改无线网络 IP 配置（Docker 环境下返回 400）
 * @param {Object} data - { is_dhcp, ip?, netmask?, gateway?, dns? }
 */
export function updateWirelessLan(data) {
  return put('/biz/gis_settings/network/wireless_lan', data)
}

/**
 * 扫描附近 WiFi 列表（Docker 环境下返回 400）
 * @returns {Promise} [{ ssid, signal, security }]
 */
export function scanWifi() {
  return get('/biz/gis_settings/network/wireless_lan/scan')
}

/**
 * 连接指定 WiFi（Docker 环境下返回 400）
 * @param {Object} data - { ssid, password?, security }
 */
export function connectWifi(data) {
  return post('/biz/gis_settings/network/wireless_lan/connect', data)
}

// ---------- 云端 MQTT 客户端 ----------

/**
 * 查询云端 MQTT 客户端配置
 * @returns {Promise} { server_addr, server_port, username, password, is_connected }
 */
export function getCloudConfig() {
  return get('/biz/gis_settings/network/cloud')
}

/**
 * 修改云端 MQTT 客户端配置
 * @param {Object} data - { server_addr, server_port, username, password }
 */
export function updateCloudConfig(data) {
  return put('/biz/gis_settings/network/cloud', data)
}

/**
 * 启动云端 MQTT 连接
 */
export function connectCloud() {
  return post('/biz/gis_settings/network/cloud/connect')
}

/**
 * 断开云端 MQTT 连接
 */
export function disconnectCloud() {
  return post('/biz/gis_settings/network/cloud/disconnect')
}

// ---------- 本地 MQTT 服务 ----------

/**
 * 查询本地 MQTT 服务配置
 * @returns {Promise} { port, username, password }
 */
export function getMqttServer() {
  return get('/biz/gis_settings/mqtt/server')
}

/**
 * 修改本地 MQTT 服务配置
 * @param {Object} data - { port, username, password }
 */
export function updateMqttServer(data) {
  return put('/biz/gis_settings/mqtt/server', data)
}

// ---------- 蓝牙（预留） ----------

/**
 * 查询蓝牙配置（预留）
 * @returns {Promise} { enabled, name, discoverable }
 */
export function getBluetoothConfig() {
  return get('/biz/gis_settings/bluetooth')
}

/**
 * 修改蓝牙配置（预留）
 * @param {Object} data - { enabled, name, discoverable }
 */
export function updateBluetoothConfig(data) {
  return put('/biz/gis_settings/bluetooth', data)
}

// ---------- 固件升级（预留） ----------

/**
 * 查询固件信息（预留）
 * @returns {Promise} { current_version, latest_version, has_upgrade }
 */
export function getFirmwareInfo() {
  return get('/biz/gis_settings/firmware')
}

/**
 * 执行固件升级（预留）
 * @param {Object} data - { version }
 */
export function upgradeFirmware(data) {
  return post('/biz/gis_settings/firmware/upgrade', data)
}

// ---------- 电源操作 ----------

/**
 * 执行关机
 */
export function shutdown() {
  return post('/biz/gis_settings/power/shutdown')
}

/**
 * 执行重启
 */
export function reboot() {
  return post('/biz/gis_settings/power/reboot')
}

// ---------- 数据备份恢复（预留） ----------

/**
 * 查询备份信息（预留）
 * @returns {Promise} { last_backup_time, backup_count }
 */
export function getBackupInfo() {
  return get('/biz/gis_settings/data/backup')
}

/**
 * 执行数据备份（预留）
 * @param {Object} data - { description? }
 */
export function createBackup(data) {
  return post('/biz/gis_settings/data/backup', data)
}

/**
 * 执行数据恢复（预留）
 * @param {Object} data - { backup_id }
 */
export function restoreBackup(data) {
  return post('/biz/gis_settings/data/restore', data)
}
