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

      <!-- Markdown 渲染区域（SafeMarkdown：转义 HTML + 链接协议白名单 + noopener） -->
      <SafeMarkdown :content="md" />
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

插件系统是 FDE MCP Blade 的核心扩展机制，允许用户通过安装各类服务插件来扩展平台功能。插件涵盖音乐播放、文件管理、智能家居、AI 服务等多种场景，支持按需安装、独立启停、灵活配置。

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

The plugin system is the core extension mechanism of FDE MCP Blade, allowing users to extend platform functionality by installing various service plugins. Plugins cover scenarios such as music playback, file management, smart home, and AI services, with support for on-demand installation, independent start/stop, and flexible configuration.

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

const md = computed(() => (lang.value === 'zh' ? contentZh.value : contentEn.value))
</script>

<style lang="scss" scoped>
.plugin-doc-page {
  .lang-switch {
    margin-bottom: 16px;
  }
}
</style>
