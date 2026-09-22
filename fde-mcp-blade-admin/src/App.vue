<template>
  <a-config-provider :locale="locale">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn'
import env from '@/config/env'

// 设置页面标题
document.title = env.title

const locale = computed(() => zhCN)
</script>

<style lang="scss">
// 全局样式已在 main.js 中导入
</style>
