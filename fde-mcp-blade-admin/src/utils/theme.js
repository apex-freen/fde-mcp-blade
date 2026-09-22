// ==========================================
// 主题应用
//
// 存储层（localStorage）保存的是"用户意图"，三态：
//   light / dark / auto（跟随系统）
// DOM 层只认"最终结果"：
//   html[data-theme='light' | 'dark']  → 消费 src/styles/tokens.scss 的语义令牌
//   body[arco-theme='dark']            → 驱动 Arco 组件自身的暗色令牌
//
// 之所以拆成两层：auto 需要监听系统偏好变化，而令牌层不该关心"为什么是暗色"。
// ==========================================

const MEDIA_DARK = '(prefers-color-scheme: dark)'

/** 用户意图：'light' | 'dark' | 'auto' */
let intent = 'light'
/** 已解析出的实际主题：'light' | 'dark' */
let resolvedTheme = 'light'
let mediaQuery = null

/** 把用户意图解析为实际主题（auto 时读系统偏好） */
export function resolveTheme(mode) {
  if (mode === 'auto') {
    return typeof window !== 'undefined' && window.matchMedia?.(MEDIA_DARK).matches ? 'dark' : 'light'
  }
  return mode === 'dark' ? 'dark' : 'light'
}

/**
 * 将主题落到 DOM。可重复调用（幂等）。
 * @param {'light'|'dark'|'auto'} mode
 * @returns {'light'|'dark'} 实际生效的主题
 */
export function applyTheme(mode) {
  intent = mode || 'light'
  resolvedTheme = resolveTheme(intent)

  const root = document.documentElement
  root.setAttribute('data-theme', resolvedTheme)
  // 让浏览器原生控件（滚动条 / 表单控件 / 默认背景）跟随，避免暗色下白底闪烁
  root.style.colorScheme = resolvedTheme

  const body = document.body
  if (body) {
    if (resolvedTheme === 'dark') body.setAttribute('arco-theme', 'dark')
    else body.removeAttribute('arco-theme')
  }
  return resolvedTheme
}

/** 当前已生效的实际主题 */
export function getResolvedTheme() {
  return resolvedTheme
}

/**
 * 初始化主题，并（只注册一次）监听系统偏好变化。
 * 仅在 mode === 'auto' 时响应系统切换，避免覆盖用户的手动选择。
 */
export function initTheme(mode) {
  applyTheme(mode)

  if (!mediaQuery && typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia(MEDIA_DARK)
    const onChange = () => {
      if (intent === 'auto') applyTheme('auto')
    }
    // Safari < 14 只有 addListener
    if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onChange)
    else if (mediaQuery.addListener) mediaQuery.addListener(onChange)
  }
  return resolvedTheme
}

export default { applyTheme, initTheme, resolveTheme, getResolvedTheme }
