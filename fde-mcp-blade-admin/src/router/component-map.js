// ==========================================
// 视图组件注册表
// Vue 组件无法由后端下发，这里用 import.meta.glob
// 自动收集 views 下所有页面，与后端菜单的 component 字符串做映射
// ==========================================

const modules = import.meta.glob('../views/**/*.vue')

/**
 * 后端 component 字符串 → 视图组件
 * 支持三种写法：
 *   controller/user/index   → views/controller/user/index.vue
 *   controller/user         → views/controller/user/index.vue
 *   /controller/user/index  → views/controller/user/index.vue
 * @param {string} component - 后端下发的组件路径
 * @returns {Function|null} 懒加载组件，未命中返回 null
 */
export function resolveViewComponent(component) {
  if (!component) return null

  const key = String(component)
    .replace(/^\/+/, '')
    .replace(/\.vue$/, '')

  return modules[`../views/${key}.vue`] || modules[`../views/${key}/index.vue`] || null
}

export default modules
