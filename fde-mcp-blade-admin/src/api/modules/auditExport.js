// ==========================================
// 审计中心 · 归档导出接口（audit_export）
// 文档：77 审计中心前端对接 §3.4
// 说明：响应为 xlsx 二进制流（单文件多 sheet）；失败时返回 HTTP 400 + JSON，
//       blob 模式下需用 extractBlobErrorMsg 读出文本再解析提示
// ==========================================

import { request } from '@/utils/request'

/**
 * 审计数据归档导出（Excel）
 * 权限码：audit:export（26）
 * @param {Object} params - 查询参数（全部必填）
 * @param {string} params.domains - 逗号分隔多选：cmd/grant/token/risk
 * @param {string} params.begin_time - 起始时间（YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS）
 * @param {string} params.end_time - 结束时间（YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS）
 */
export function exportAuditArchive(params) {
  return request({
    url: '/biz/audit_export/archive',
    method: 'GET',
    params,
    responseType: 'blob',
    showLoading: false,
    showError: false
  })
}
