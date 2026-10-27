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
 * 把 JSON 字符串 / 对象拍平成 [{ path, value }]，用于表格 / 表单式展示
 * - 嵌套对象用 a.b 展开，数组用 [0] 展开
 * - 非 JSON 文本返回 null，由调用方按纯文本处理
 */
export function toJsonRows(value) {
  if (value === null || value === undefined || value === '') return []
  const { ok, data } = parseJsonValue(value)
  if (!ok) return null
  if (typeof data !== 'object' || data === null) return null
  const rows = []
  flattenToRows(data, '', rows)
  return rows
}

/**
 * 把 JSON 字符串 / 对象转成逐行的「字段: 值」纯文本
 * - 嵌套对象用 a.b 展开，数组用 [0] 展开
 * - 非 JSON 文本原样返回，避免日志片段被吞掉
 */
export function formatJsonAsText(value) {
  if (value === null || value === undefined || value === '') return '-'
  const { ok, data } = parseJsonValue(value)
  if (!ok) return typeof value === 'string' ? value : String(value)
  if (typeof data !== 'object' || data === null) return String(data)
  const rows = []
  flattenToRows(data, '', rows)
  return rows.length ? rows.map((row) => `${row.path}: ${row.value}`).join('\n') : '-'
}

function parseJsonValue(value) {
  if (typeof value !== 'string') return { ok: true, data: value }
  try {
    return { ok: true, data: JSON.parse(value) }
  } catch {
    return { ok: false, data: value }
  }
}

function flattenToRows(node, prefix, rows) {
  if (node === null || node === undefined) {
    rows.push({ path: prefix || '-', value: '-' })
    return
  }
  if (Array.isArray(node)) {
    if (!node.length) {
      rows.push({ path: prefix || '-', value: '[]' })
      return
    }
    node.forEach((item, index) => flattenToRows(item, `${prefix}[${index}]`, rows))
    return
  }
  if (typeof node === 'object') {
    const keys = Object.keys(node)
    if (!keys.length) {
      rows.push({ path: prefix || '-', value: '{}' })
      return
    }
    keys.forEach((key) => flattenToRows(node[key], prefix ? `${prefix}.${key}` : key, rows))
    return
  }
  rows.push({ path: prefix, value: node === '' ? '-' : String(node) })
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
