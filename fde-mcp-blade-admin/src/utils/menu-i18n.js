// ==========================================
// 菜单标题国际化解析（唯一出口）
//
// 背景：菜单标题由后端 getRouters 下发（gis_menu 驱动），
// 前端不维护「中文标题 → key」的映射表。约定：
//   后端节点带 meta.i18nKey（扁平 `menu.xxx`），前端 te() 命中则用译文，
//   未命中回退后端 meta.title（中文）。
//
// 为什么单独抽一个函数：
//   1. 侧边栏 / 面包屑 / 命令面板三处都要解析，逻辑必须一致；
//   2. 后端 i18n_key 的写法有过两种口径（`menu.auditOperationLog` 与
//      `menu.audit.operationLog`），这里做兼容归并，避免因口径不一致
//      导致「以为配了英文、实际还在显示中文」；
//   3. 解析结果直接返回字符串，调用方不需要关心键是否存在。
//
// 契约：词典键为扁平一级 `menu.<name>`（name 首字母小写驼峰），
//       与 src/locales/{zh-CN,en-US}.js 的 menu 段一一对应。
// ==========================================

/**
 * 把多级 / snake_case 键折叠成词典里的扁平驼峰键
 *   menu.audit.operationLog          → menu.auditOperationLog
 *   menu.audit.operation_log         → menu.auditOperationLog
 *   menu.controller.settings.config  → menu.controllerSettingsConfig
 * 已符合口径（≤2 段且首段小写）时返回空串，表示「不需要折叠」
 */
function toCamel(seg) {
  return String(seg)
    .split('_')
    .filter(Boolean)
    .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
    .join('')
}

function flattenMenuKey(key) {
  const parts = String(key).split('.').filter(Boolean)
  if (parts.length <= 2) return ''
  const [head, ...rest] = parts
  return `${head}.${rest
    .map((seg, i) => {
      const camel = toCamel(seg)
      if (!camel) return ''
      return i === 0 ? camel : camel.charAt(0).toUpperCase() + camel.slice(1)
    })
    .join('')}`
}

/**
 * 从菜单节点 / 路由 meta 上取 i18nKey
 * 兼容两种位置：item.i18nKey（菜单树）与 item.meta.i18nKey（原始 RouterVo）
 */
export function getMenuI18nKey(item) {
  if (!item) return ''
  const key = item.i18nKey || item.meta?.i18nKey
  return typeof key === 'string' ? key.trim() : ''
}

/**
 * 解析菜单标题
 * @param {object} item   菜单节点（需含 i18nKey / title）或 { i18nKey, title }
 * @param {Function} t    vue-i18n 的 t
 * @param {Function} te   vue-i18n 的 te
 * @returns {string} 译文；词典未命中时回退 item.title（后端中文），永不返回 undefined
 */
export function resolveMenuTitle(item, t, te) {
  const key = getMenuI18nKey(item)
  if (key) {
    if (te(key)) return t(key)
    const flat = flattenMenuKey(key)
    if (flat && te(flat)) return t(flat)
    if (import.meta.env?.DEV) {
      console.warn(`[menu-i18n] 词典缺少键 "${key}"，已回退后端中文标题。请确认 locales 的 menu 段与后端 i18n_key 口径一致。`)
    }
  }
  return item?.title || ''
}
