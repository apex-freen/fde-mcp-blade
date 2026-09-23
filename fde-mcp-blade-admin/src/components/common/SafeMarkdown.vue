<template>
  <div class="markdown-body" v-html="safeHtml"></div>
</template>

<script setup>
/**
 * SafeMarkdown —— 安全的简易 Markdown 渲染（P4 加固 #1）
 *
 * 用于渲染「不可信输入」的 Markdown 内容（插件说明 / 固件说明 / 知识库文档等）。
 * 安全约定（1016 §5.1 第 1 项）：
 *  1. 禁用原始 HTML —— 所有 `<` `>` `&` `"` `'` 在解析前一律转义，任何内联 HTML 都不会被解释执行；
 *  2. 链接协议白名单 —— 仅放行 http: / https: / mailto:，`javascript:` / `data:` / `vbscript:` 等
 *     一律拒绝（只渲染链接文字，不产出 <a>）；
 *  3. 外链强制 target="_blank" + rel="noopener noreferrer"，阻断反向 tabnabbing；
 *  4. 属性注入免疫 —— href 生成发生在转义之后，引号已是实体，无法逃逸出属性值。
 */
import { computed } from 'vue'

const props = defineProps({
  content: { type: String, default: '' }
})

// ---------- 安全基元 ----------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 协议白名单；非白名单返回空串（调用方降级为纯文字） */
function safeHref(url) {
  const u = String(url || '').trim()
  if (/^(https?:|mailto:)/i.test(u)) return u
  return ''
}

// ---------- 简易 Markdown 渲染（先转义、后解析） ----------

function renderMarkdown(md) {
  if (!md) return ''
  // 第一步：全量转义 —— 之后所有步骤产出的标签是唯一可信 HTML
  let html = escapeHtml(md)

  // 链接 [text](url)（text/url 已被转义，引号是实体，属性无法逃逸）
  html = html.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (m, text, url) => {
    const href = safeHref(url)
    if (!href) return text
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
  })

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  // 引用
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  // 表格（简易处理）
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter((c) => c.trim() !== '')
    if (cells.every((c) => /^[\s-]+$/.test(c))) return ''
    return '<tr>' + cells.map((c) => `<td>${c.trim()}</td>`).join('') + '</tr>'
  })
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:8px 0;">$1</table>')
  // 有序 / 无序列表：按「连续行」分组包裹，避免跨类型互相嵌套
  html = html.replace(/(?:^\d+\. .+(?:\n|$))+/gm, (block) =>
    '<ol>' + block.replace(/^\d+\. (.+)$/gm, '<li>$1</li>').replace(/\n/g, '') + '</ol>')
  html = html.replace(/(?:^- .+(?:\n|$))+/gm, (block) =>
    '<ul>' + block.replace(/^- (.+)$/gm, '<li>$1</li>').replace(/\n/g, '') + '</ul>')
  // 段落（连续非标签行）
  html = html.replace(/^(?!<[a-z/])(.+)$/gm, '<p>$1</p>')
  return html
}

const safeHtml = computed(() => renderMarkdown(props.content))
</script>

<style lang="scss" scoped>
.markdown-body {
  line-height: 1.7;
  color: var(--color-text-1);
  word-break: break-word;

  h1 {
    font-size: 24px;
    font-weight: 600;
    margin: 16px 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-border-2);
  }

  h2 {
    font-size: 20px;
    font-weight: 600;
    margin: 14px 0 10px;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 12px 0 8px;
  }

  p {
    margin: 8px 0;
  }

  a {
    color: var(--color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  blockquote {
    margin: 8px 0;
    padding: 8px 12px;
    background: var(--color-fill-2);
    border-left: 4px solid var(--color-primary-light-2);
    color: var(--color-text-3);
  }

  table {
    width: 100%;
    margin: 12px 0;
    font-size: 14px;

    td {
      padding: 6px 10px;
      border: 1px solid var(--color-border-2);
    }

    tr:first-child td {
      font-weight: 600;
      background: var(--color-fill-1);
    }
  }

  ol,
  ul {
    margin: 8px 0;
    padding-left: 24px;

    li {
      margin: 4px 0;
      list-style: disc;
    }
  }

  ol li {
    list-style: decimal;
  }
}
</style>
