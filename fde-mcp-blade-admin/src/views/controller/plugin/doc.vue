<template>
  <div class="plugin-doc-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <!-- 语言切换 -->
      <div class="lang-switch">
        <a-radio-group v-model="lang" type="button">
          <a-radio value="zh">{{ $t('pluginDoc.chinese') }}</a-radio>
          <a-radio value="en">{{ $t('pluginDoc.english') }}</a-radio>
        </a-radio-group>
      </div>

      <!-- Markdown 渲染区域 -->
      <div class="markdown-body" v-html="renderedContent"></div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const lang = ref('zh')

// 中文说明
const contentZh = ref(`# 插件说明

## 1. 简介

插件系统是智能体工具中枢的核心扩展机制，允许用户通过安装各类服务插件来扩展平台功能。插件涵盖音乐播放、文件管理、智能家居、AI 服务等多种场景，支持按需安装、独立启停、灵活配置。

### 源码仓库
- **中文仓库（Gitee）**：[https://gitee.com/freen/service-plugins](https://gitee.com/freen/service-plugins)
- **英文仓库（GitHub）**：[https://github.com/apex-freen/service-plugins](https://github.com/apex-freen/service-plugins)

## 2. 插件管理
- 在 **插件管理** 页面可以查看所有已安装的插件
- 支持启用 / 禁用、重命名、删除插件
- 可编辑插件的服务地址和配置（JSON 格式）

## 3. 插件中心

请先查阅本文档，按文档说明安装和配置插件。如文档无法解决您的问题，欢迎加入官方交流群获取帮助。

### 官方交流群
- **QQ 群号**：882419824
- **入群答案**：APEX智能体设备

## 4. 开发规范
1. 每个插件需包含 \`manifest.json\` 配置文件
2. 插件方法需声明风险等级（low / medium / high）
3. 建议提供中英双语的描述信息
`)

// 英文说明
const contentEn = ref(`# Plugin Documentation

## 1. Introduction

The plugin system is the core extension mechanism of the Agent Tool Hub (智能体工具中枢), allowing users to extend platform functionality by installing various service plugins. Plugins cover scenarios such as music playback, file management, smart home, and AI services, with support for on-demand installation, independent start/stop, and flexible configuration.

### Source Code Repositories
- **Chinese (Gitee)**：[https://gitee.com/freen/service-plugins](https://gitee.com/freen/service-plugins)
- **English (GitHub)**：[https://github.com/apex-freen/service-plugins](https://github.com/apex-freen/service-plugins)

## 2. Plugin Management
- View all installed plugins on the **Plugin Management** page
- Supports enable / disable, rename, and delete operations
- Edit plugin service URL and configuration (JSON format)

## 3. Plugin Center

Please read this documentation carefully and follow the instructions to install and configure plugins. If you encounter issues that cannot be resolved through the documentation, feel free to join the official community group for assistance.

### Official Community Group
- **QQ Group**：882419824
- **Join Answer**：APEX智能体设备

## 4. Development Guidelines
1. Each plugin must include a \`manifest.json\` configuration file
2. Plugin methods must declare a risk level (low / medium / high)
3. Bilingual (Chinese/English) descriptions are recommended
`)

// 简易 Markdown 渲染（占位实现，后续可替换为成熟的 markdown 渲染库）
const renderMarkdown = (md) => {
  if (!md) return ''
  let html = md
  // 转义 HTML 特殊字符
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ol>$1</ol>')
  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  // 段落（连续非标签行）
  html = html.replace(/^(?!<[a-z/])(.+)$/gm, '<p>$1</p>')
  return html
}

const renderedContent = computed(() => {
  const md = lang.value === 'zh' ? contentZh.value : contentEn.value
  return renderMarkdown(md)
})
</script>

<style lang="scss" scoped>
.plugin-doc-page {
  .lang-switch {
    margin-bottom: 16px;
  }

  .markdown-body {
    line-height: 1.7;
    color: var(--color-text-1);

    :deep(h1) {
      font-size: 24px;
      font-weight: 600;
      margin: 16px 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--color-border-2);
    }

    :deep(h2) {
      font-size: 20px;
      font-weight: 600;
      margin: 14px 0 10px;
    }

    :deep(h3) {
      font-size: 16px;
      font-weight: 600;
      margin: 12px 0 8px;
    }

    :deep(p) {
      margin: 8px 0;
    }

    :deep(blockquote) {
      margin: 8px 0;
      padding: 8px 12px;
      background: var(--color-fill-2);
      border-left: 4px solid var(--color-primary-light-2);
      color: var(--color-text-3);
    }

    :deep(table) {
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

    :deep(ol),
    :deep(ul) {
      margin: 8px 0;
      padding-left: 24px;

      li {
        margin: 4px 0;
        list-style: disc;
      }
    }

    :deep(ol) li {
      list-style: decimal;
    }
  }
}
</style>
