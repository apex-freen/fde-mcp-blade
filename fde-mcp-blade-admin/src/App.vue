<template>
  <a-config-provider :locale="locale">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn'
import enUS from '@arco-design/web-vue/es/locale/lang/en-us'
import env from '@/config/env'
import { useAppStore } from '@/stores/app'
import { applyPageTitle } from '@/utils/page-title'

// 设置页面标题（初始值；进入路由后由守卫按 meta 覆盖）
document.title = env.title

const appStore = useAppStore()
const route = useRoute()

// 🔴 Arco 组件库内置文案（分页「条/页」、日期选择器、表格空态、气泡确认按钮等）
//    必须跟随站点语言切换，写死 zhCN 会导致「切英文后组件内部仍是中文」。
const locale = computed(() => (appStore.locale === 'en-US' ? enUS : zhCN))

// 语言切换时不走路由守卫，需主动重刷一次标签页标题
watch(
  () => appStore.locale,
  () => applyPageTitle(route.meta)
)
</script>

<style lang="scss">
// 全局样式已在 main.js 中导入
</style>
