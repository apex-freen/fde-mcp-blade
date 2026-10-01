// ==========================================
// 剪贴板复制（兼容内网 HTTP 等非安全上下文）
//
// 三级降级：
//   1. Clipboard API —— 需安全上下文（HTTPS / localhost）；
//   2. execCommand('copy') + 临时 textarea —— 兼容内网 http 部署；
//   3. 都失败 → 提示用户手动选中复制。
//
// 复用点：管理台令牌页、「我的令牌」页（workspace/mine/token）的令牌 / MCP 配置复制。
// ==========================================

import { Message } from '@arco-design/web-vue'

/**
 * 复制文本到剪贴板
 * @param {string} text - 待复制文本
 * @param {string} successMsg - 成功提示
 * @param {string} fallbackMsg - 两种方式都失败时的提示（引导手动复制）
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyTextToClipboard(text, successMsg, fallbackMsg) {
  // 方式一：现代 Clipboard API（需要安全上下文 HTTPS/localhost）
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      Message.success(successMsg)
      return true
    } catch (e) {
      // 继续 fallback
    }
  }

  // 方式二：传统 execCommand + 临时 textarea（兼容 HTTP 等非安全上下文）
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.left = '-1000px'
    textarea.style.opacity = '0'
    textarea.readOnly = true
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (ok) {
      Message.success(successMsg)
      return true
    }
  } catch (e) {
    // 继续 fallback
  }

  // 方式三：都失败时，提示用户手动复制
  Message.info(fallbackMsg)
  return false
}
