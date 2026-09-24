// ==========================================
// RouterVo（后端 GET /getRouters）→ vue-router 路由记录 / 侧边栏菜单树
// 后端字段为若依标准结构：
//   { name, path, hidden, redirect, component, alwaysShow,
//     meta: { title, icon, noCache, link }, children[] }
// ==========================================

import { defineComponent, h, markRaw } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import { resolveViewComponent } from './component-map'
import { pageDescMap } from '@/config/page-desc'

// 主布局
const Layout = () => import('@/layouts/default.vue')

// 目录容器：只渲染子路由
// 注意：render 函数里必须传 RouterView 组件本身；写成 h('router-view') 会被当成
//      原生元素渲染（渲染出一个空的 <router-view> 标签），子路由永远不显示
// markRaw：路由记录会被存进 Pinia state，组件对象不能变成响应式代理
const ParentView = markRaw(defineComponent({
  name: 'ParentView',
  render: () => h(RouterView)
}))

// 外链容器：iframe 内嵌
const InnerLink = markRaw(defineComponent({
  name: 'InnerLink',
  setup() {
    const route = useRoute()
    return () =>
      h('iframe', {
        src: route.meta?.link || route.path,
        style: 'width: 100%; height: 100%; border: 0'
      })
  }
}))

// 组件未命中时的兜底页面
const NotFoundPage = () => import('@/views/error/404.vue')

function joinPath(parentPath, path) {
  if (!path) return parentPath || ''
  if (path.startsWith('/')) return path
  const base = (parentPath || '').replace(/\/+$/, '')
  return `${base}/${path}`.replace(/\/{2,}/g, '/')
}

function normalizePath(path) {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

function buildRouteName(node, path) {
  if (node.name) return node.name
  return path.replace(/^\//, '').replace(/[^\w]/g, '_') || 'Root'
}

function buildMeta(node, path) {
  const meta = { ...(node.meta || {}) }
  meta.hidden = !!node.hidden
  if (meta.title === undefined) meta.title = ''
  // 菜单国际化：后端约定放在 meta.i18nKey（1017 §3.1）。
  // 兼容节点级 i18nKey 写法，统一收口到 meta，供面包屑与页面标题使用。
  if (!meta.i18nKey && node.i18nKey) meta.i18nKey = node.i18nKey

  const desc = pageDescMap[path]
  if (desc?.descriptionKey) meta.descriptionKey = desc.descriptionKey
  if (desc?.description) meta.description = desc.description

  return meta
}

function resolveComponent(node, hasChildren) {
  const key = node.component
  if (key === 'Layout') return Layout
  if (key === 'ParentView') return ParentView
  if (key === 'InnerLink') return InnerLink
  if (key) {
    const view = resolveViewComponent(key)
    if (view) return view
    console.warn(`[router] 菜单组件未找到：component="${key}"，path="${joinPath('', node.path)}"`)
    return NotFoundPage
  }
  // 无组件：有子级当目录，否则兜底 404
  return hasChildren ? ParentView : NotFoundPage
}

function transformNode(node, parentPath, isTop) {
  const path = joinPath(parentPath, node.path)
  const rawChildren = Array.isArray(node.children) ? node.children : []
  const meta = buildMeta(node, path)
  const name = buildRouteName(node, path)
  const component = resolveComponent(node, rawChildren.length > 0)

  const children = rawChildren
    .map((child) => transformNode(child, path, false))
    .filter(Boolean)

  // 顶层叶子页面：套一层 Layout，保证侧边栏布局
  if (isTop && component !== Layout) {
    return {
      path,
      name,
      component: Layout,
      meta: {},
      children: [{ path: '', name: `${name}Index`, component, meta }]
    }
  }

  const record = { path, name, component, meta }

  if (children.length > 0) {
    record.children = children
    // 目录未显式指定重定向时，默认落到第一个子菜单
    // 注意：后端对目录会自动填 "noRedirect"，该值表示「不重定向」，不是路径
    const explicitRedirect = node.redirect && node.redirect !== 'noRedirect' ? node.redirect : ''
    record.redirect = explicitRedirect || children[0].path
  } else if (node.redirect && node.redirect !== 'noRedirect') {
    record.redirect = node.redirect
  }

  return record
}

/**
 * RouterVo[] → vue-router 路由记录[]
 */
export function transformRouters(routers = []) {
  if (!Array.isArray(routers)) return []
  return routers.map((node) => transformNode(node, '', true)).filter(Boolean)
}

/**
 * RouterVo[] → 侧边栏菜单树（过滤 hidden 项）
 * 输出结构与 layouts/default.vue 渲染所需字段对齐
 * 注意：子级 path 是相对路径，必须逐层拼接成完整路径，
 *      否则菜单项指向 /stats/index 这类缺失父级前缀的地址
 */
export function toMenuTree(routers = [], parentPath = '') {
  if (!Array.isArray(routers)) return []

  const result = []
  routers.forEach((node) => {
    if (node.hidden) return

    const fullPath = joinPath(parentPath, node.path)
    const rawChildren = Array.isArray(node.children) ? node.children : []
    const children = toMenuTree(rawChildren, fullPath)
    // 目录下没有可见子项时，整块隐藏
    if (rawChildren.length > 0 && children.length === 0) return

    const path = normalizePath(fullPath)
    result.push({
      key: path || node.name,
      title: node.meta?.title || '',
      // 🔴 必须透传 i18nKey：侧边栏/面包屑/命令面板靠它取译文（utils/menu-i18n.js）。
      //    漏掉这一行 → getMenuTitle() 永远拿不到 key → 切英文时菜单恒为后端中文标题。
      i18nKey: node.meta?.i18nKey || node.i18nKey || '',
      icon: node.meta?.icon || '',
      path,
      external_url: node.meta?.link || '',
      children
    })
  })
  return result
}

/**
 * 取菜单树中第一个可访问的叶子路径（登录后的默认首页）
 */
export function findFirstMenuPath(menuList = []) {
  for (const item of menuList) {
    if (item.children?.length) {
      const childPath = findFirstMenuPath(item.children)
      if (childPath) return childPath
      continue
    }
    if (item.path && !item.external_url) return item.path
  }
  return ''
}
