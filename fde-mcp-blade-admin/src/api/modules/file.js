// ⚠️ DEPRECATED · 2026-09-11
// ---------------------------------------------------------
// 后端 gis_auth 模块已整体下线（Doc 23），以下 `/biz/mobile/auth/localFiles/*`、
// `/biz/mobile/auth/localDevice/getUploadKnowledgeFileControllerFun` 旧路径均已废弃：
//   - 文件管理  → 改用 src/api/modules/localFileManager.js（待建）
//   - 备份恢复  → 改用 src/api/modules/localDevice.js（待建）
//   - 知识库上传 → 已整体停用（Coze 依赖移除）
//
// 本文件暂时保留，不做任何功能变更。views 层目前未引用。
// ---------------------------------------------------------
// 文件管理相关接口
// 对应移动端 api.js: getLocalFiles, getBackupToU 等

import { request } from '@/utils/request'

/**
 * 获取本地文件列表
 */
export function getLocalFiles({ path }) {
  return request({
    url: `/biz/mobile/auth/localFiles/list?path=${path}`,
    method: 'GET'
  })
}

/**
 * 创建文件夹
 */
export function getLocalFilesMkdir(data) {
  return request({
    url: '/biz/mobile/auth/localFiles/mkdir',
    method: 'POST',
    data
  })
}

/**
 * 复制文件
 */
export function getLocalFilesCp(data) {
  return request({
    url: '/biz/mobile/auth/localFiles/cp',
    method: 'POST',
    data
  })
}

/**
 * 移动/剪切文件
 */
export function getLocalFilesMv(data) {
  return request({
    url: '/biz/mobile/auth/localFiles/mv',
    method: 'POST',
    data
  })
}

/**
 * 删除文件
 */
export function getLocalFilesDel({ path }) {
  return request({
    url: `/biz/mobile/auth/localFiles/del?path=${path}`,
    method: 'GET'
  })
}

/**
 * 备份到 U 盘
 */
export function getBackupToU(data) {
  return request({
    url: '/biz/mobile/auth/localFiles/getBackupToU',
    method: 'POST',
    data
  })
}

/**
 * 移除 U 盘
 */
export function postRemoveU() {
  return request({
    url: '/biz/mobile/auth/localFiles/postRemoveU',
    method: 'POST'
  })
}

/**
 * 更新控制台知识库
 */
export function getUploadKnowledgeFile() {
  return request({
    url: '/biz/mobile/auth/localDevice/getUploadKnowledgeFileControllerFun',
    method: 'GET',
    showLoading: true
  })
}
