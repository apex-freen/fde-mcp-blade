// ==========================================
// 文件下载工具
// ==========================================

/**
 * 从 Blob 响应触发文件下载
 * @param {Blob} blob - 二进制数据
 * @param {string} filename - 文件名
 */
export function downloadBlob(blob, filename) {
  if (!blob) return
  const url = window.URL.createObjectURL(new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 根据响应头中的 Content-Disposition 提取文件名
 * @param {Object} headers - 响应头
 * @param {string} fallback - 默认文件名
 * @returns {string}
 */
export function getFilenameFromHeaders(headers, fallback = 'export.xlsx') {
  const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition']
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i)
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1])
      } catch {
        return match[1]
      }
    }
  }
  return fallback
}

/**
 * 生成导出文件名：<前缀>_<YYYYmmddHHMMSS>.xlsx
 * @param {string} prefix - 文件名前缀，如 gis_message_all
 * @returns {string}
 */
export function buildExportFilename(prefix) {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `${prefix}_${stamp}.xlsx`
}

/**
 * 解析「blob 模式」下导出接口的业务失败原因
 * 导出接口成功时返回文件流，失败时返回 JSON（HTTP 400，如「导出条数超过上限 10000」），
 * 因此 blob 模式下需要先读出文本再 JSON.parse，才能拿到后端 msg
 * @param {Object} error - 请求异常对象（含 response.data 为 Blob）
 * @param {string} fallback - 无法解析时的兜底提示
 * @returns {Promise<string>}
 */
export async function extractBlobErrorMsg(error, fallback = '导出失败') {
  const blob = error?.response?.data
  if (blob instanceof Blob) {
    try {
      const json = JSON.parse(await blob.text())
      if (json?.msg) return json.msg
    } catch {
      // 非 JSON 内容，忽略，走兜底提示
    }
  }
  return error?.response?.data?.msg || error?.message || fallback
}
