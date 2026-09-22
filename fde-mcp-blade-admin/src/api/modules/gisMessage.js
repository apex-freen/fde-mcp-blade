// ==========================================
// 消息中心接口（gis_message）
// 文档：72 消息中心 · 前端对接
// 口径说明：
//   - 站内消息是「共享事件流」：接口不传收件人参数，后端不做收件人过滤，有该页权限即看全量
//   - 本次不做已读/未读：列表无 read_status 参数，也没有标记已读接口
//   - 三页（系统通知 / 风险提醒 / 全部消息）是同一张表 + 不同级别过滤
//   - 列表排序由服务端固定 created_time DESC，不接受前端传排序字段
//   - 导出接口返回二进制文件流（非 JSON），失败时（如超 1 万行）返回 JSON
// ==========================================

import { get, put, request } from '@/utils/request'

// ========== 列表接口（三页各一个，权限码各自校验） ==========

/**
 * 系统通知列表（event_level IN todo/alert/notice）
 * 权限码：message:notification
 * @param {Object} params - { event_key, start, end, page, page_size }
 */
export function getNotificationList(params) {
  return get('/biz/gis_message/notification/list', params)
}

/**
 * 风险提醒列表（event_level = risk）
 * 权限码：message:risk:reminder
 * @param {Object} params - { event_key, start, end, page, page_size }
 */
export function getRiskList(params) {
  return get('/biz/gis_message/risk/list', params)
}

/**
 * 全部消息列表（无级别过滤）
 * 权限码：message:all
 * @param {Object} params - { event_key, start, end, page, page_size }
 */
export function getAllList(params) {
  return get('/biz/gis_message/all/list', params)
}

// ========== 导出接口（与对应列表参数完全一致，但不传 page / page_size） ==========
// 响应为 xlsx 文件流；失败时返回 JSON（HTTP 400），需用 extractBlobErrorMsg 解析提示

/** 导出系统通知 */
export function exportNotification(params) {
  return request({
    url: '/biz/gis_message/notification/export',
    method: 'GET',
    params,
    responseType: 'blob',
    showLoading: false,
    showError: false
  })
}

/** 导出风险提醒 */
export function exportRisk(params) {
  return request({
    url: '/biz/gis_message/risk/export',
    method: 'GET',
    params,
    responseType: 'blob',
    showLoading: false,
    showError: false
  })
}

/** 导出全部消息 */
export function exportAll(params) {
  return request({
    url: '/biz/gis_message/all/export',
    method: 'GET',
    params,
    responseType: 'blob',
    showLoading: false,
    showError: false
  })
}

// ========== 通知插件配置（权限码 message:all） ==========

/**
 * 读配置 + 候选插件
 * 候选由后端运行时探测给出，前端不要硬编码「飞书/钉钉/企微」
 * @returns {Promise<{ current, current_valid, channels: Array<{plugin,title,available,reason}> }>}
 */
export function getChannelOptions() {
  return get('/biz/gis_message/channel/options')
}

/**
 * 写配置
 * @param {string} channel - 插件名；空字符串表示不启用通知（正常状态）
 */
export function updateChannel(channel) {
  return put('/biz/gis_message/channel', { channel })
}

// ========== 事件字典 ==========

/**
 * 事件清单（key / level / title），供页面展示「事件类型」下拉或说明文案
 * 属可选装饰接口，失败时不弹提示，前端降级为无候选项
 */
export function getMessageEvents() {
  return get('/biz/gis_message/events', undefined, { showError: false })
}
