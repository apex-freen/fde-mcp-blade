// ==========================================
// 通用格式化工具
// ==========================================

import dayjs from 'dayjs'

/**
 * 格式化日期时间
 */
export function formatDateTime(value, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!value) return '-'
  return dayjs(value).format(format)
}

/**
 * 格式化日期
 */
export function formatDate(value, format = 'YYYY-MM-DD') {
  return formatDateTime(value, format)
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

/**
 * 千分位数字格式化（空值 → '-'）
 */
export function formatThousands(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num.toLocaleString('en-US')
}

/**
 * 百分比格式化：固定两位小数、四舍五入（空值 → '-'）
 */
export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return `${num.toFixed(2)}%`
}

/**
 * 状态文本映射
 */
export function getStatusText(status) {
  const map = {
    online: '在线',
    offline: '离线',
    warning: '告警',
    active: '启用',
    disabled: '禁用',
    pending: '待处理',
    success: '成功',
    failed: '失败'
  }
  return map[status] || status || '-'
}
