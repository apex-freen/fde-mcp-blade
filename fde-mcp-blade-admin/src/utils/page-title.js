// ==========================================
// 浏览器标签页标题
//
// 跟随语言切换：`<菜单标题> - FDE MCP Blade`
// 标题取自路由 meta（i18nKey 命中词典 → 译文，否则回退后端中文 title），
// 与侧边栏 / 面包屑共用同一套解析规则（utils/menu-i18n.js）。
//
// 为什么单独成文件：guards.js（路由切换）与 App.vue（语言切换）两处都要刷新标题，
// 逻辑必须一致，且都需要访问 i18n 全局实例。
// ==========================================

import i18n from '@/locales'
import { resolveMenuTitle } from './menu-i18n'

const BRAND = 'FDE MCP Blade'

export function applyPageTitle(meta) {
  const title = resolveMenuTitle(
    { i18nKey: meta?.i18nKey, title: meta?.title },
    i18n.global.t,
    i18n.global.te
  )
  document.title = title ? `${title} - ${BRAND}` : BRAND
}
