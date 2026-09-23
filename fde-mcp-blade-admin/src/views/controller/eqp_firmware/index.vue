<template>
  <div class="eqp-firmware-doc-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <!-- 语言切换 -->
      <div class="lang-switch">
        <a-radio-group v-model="lang" type="button">
          <a-radio value="zh">{{ $t('eqpFirmware.chinese') }}</a-radio>
          <a-radio value="en">{{ $t('eqpFirmware.english') }}</a-radio>
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
const contentZh = ref(`# 固件说明

## 1. 简介

本固件为 FDE MCP Blade 的物联网设备端固件，目前已支持 **ESP32-S3** 和 **ESP32-C3** 两款芯片平台，未来还将逐步加入更多物联网芯片框架支持（如 ESP32-C6、ESP32-P4 等），覆盖更广泛的硬件生态。

### 支持平台
| 芯片平台 | 状态 | 说明 |
|----------|------|------|
| ESP32-S3 | 已支持 | 高性能双核，适用于边缘计算与 AI 推理场景 |
| ESP32-C3 | 已支持 | 低功耗单核，适用于传感器采集与轻量交互场景 |
| 更多平台 | 规划中 | 持续扩展，敬请期待 |

### 源码仓库
- **中文仓库（Gitee）**：[https://gitee.com/freen/apex-esp32-s3-v6](https://gitee.com/freen/apex-esp32-s3-v6)
- **英文仓库（GitHub）**：[https://github.com/apex-freen/apex-esp32-s3-v6](https://github.com/apex-freen/apex-esp32-s3-v6)

## 2. 固件版本
| 版本号 | 发布日期 | 说明 |
|--------|----------|------|
| v1.0.0 | 待补充 | 初始版本，支持 ESP32-S3 / ESP32-C3 基础功能 |
| v1.1.0 | 待补充 | 性能优化 |

## 3. 升级方式

请先仔细阅读本文档，按文档说明进行操作。如文档无法解决您的问题，欢迎加入官方交流群获取帮助。

### 官方交流群
- **QQ 群号**：882419824
- **入群答案**：APEX智能体设备

## 4. 注意事项
- 升级过程中请勿断电
- 请确保设备电量充足（建议 > 50%）
- 升级完成后设备将自动重启
`)

// 英文说明
const contentEn = ref(`# Firmware Documentation

## 1. Introduction

This firmware is the IoT device-side firmware for FDE MCP Blade. It currently supports both **ESP32-S3** and **ESP32-C3** chip platforms, with plans to gradually add support for more IoT chip frameworks (such as ESP32-C6, ESP32-P4, etc.), covering a broader hardware ecosystem.

### Supported Platforms
| Chip Platform | Status | Description |
|---------------|--------|-------------|
| ESP32-S3 | Supported | High-performance dual-core, suitable for edge computing and AI inference |
| ESP32-C3 | Supported | Low-power single-core, suitable for sensor data acquisition and lightweight interaction |
| More Platforms | Planned | Continuously expanding, stay tuned |

### Source Code Repositories
- **Chinese (Gitee)**：[https://gitee.com/freen/apex-esp32-s3-v6](https://gitee.com/freen/apex-esp32-s3-v6)
- **English (GitHub)**：[https://github.com/apex-freen/apex-esp32-s3-v6](https://github.com/apex-freen/apex-esp32-s3-v6)

## 2. Firmware Versions
| Version | Release Date | Notes |
|---------|--------------|-------|
| v1.0.0 | TBD | Initial release, supports ESP32-S3 / ESP32-C3 basic features |
| v1.1.0 | TBD | Performance improvements |

## 3. Upgrade Methods

Please read this documentation carefully and follow the instructions. If you encounter issues that cannot be resolved through the documentation, feel free to join the official community group for assistance.

### Official Community Group
- **QQ Group**：882419824
- **Join Answer**：APEX智能体设备

## 4. Important Notes
- Do not power off during the upgrade process
- Ensure sufficient battery level (recommended > 50%)
- The device will restart automatically after the upgrade is complete
`)

const md = computed(() => (lang.value === 'zh' ? contentZh.value : contentEn.value))
</script>

<style lang="scss" scoped>
.eqp-firmware-doc-page {
  .lang-switch {
    margin-bottom: 16px;
  }
}
</style>
