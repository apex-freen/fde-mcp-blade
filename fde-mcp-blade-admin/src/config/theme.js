// ==========================================
// 主题 / 颜色（JS 侧取色入口）
//
// 定位：**只给 canvas 类场景用**（ECharts 等无法消费 CSS 变量）。
//       DOM 样式一律走 src/styles/tokens.scss 的 CSS 令牌，不要引本文件。
//
// 取值优先级：运行期读 CSS 令牌（跟随亮/暗主题）→ 兜底静态值。
// 因此主题切换后，图表重新初始化即可拿到对应主题的颜色。
// ==========================================

/** 读取一个 CSS 令牌的当前值（跟随 data-theme） */
export function readToken(name, fallback = '') {
  if (typeof window === 'undefined' || !document?.documentElement) return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/** 静态兜底值（与 tokens.scss 的亮色值保持一致；仅供 SSR / 取不到令牌时使用） */
export const theme = {
  // 主色
  primaryColor: '#4d7cfe',

  // 功能色
  successColor: '#22c55e',
  warningColor: '#f59e0b',
  dangerColor: '#ef4444',

  // 模块主题色
  useCenterColor: '#4d7cfe', // 使用中心
  adminCenterColor: '#8b5cf6', // 管理中心
  auditCenterColor: '#14b8a6', // 审计中心
  settingCenterColor: '#f59e0b', // 设置中心

  // 中性色
  textColor: '#0e1729',
  textSecondaryColor: '#5a6683',
  textTertiaryColor: '#94a1b8',
  borderColor: 'rgba(15, 23, 42, 0.08)',
  bgColor: '#f3f6fc',
  cardBgColor: '#ffffff',
}

/** 主题感知的取色：优先令牌，令牌缺失时回退静态值 */
export const colors = {
  primary: () => readToken('--c-blue', theme.primaryColor),
  success: () => readToken('--c-green', theme.successColor),
  warning: () => readToken('--c-amber', theme.warningColor),
  danger: () => readToken('--c-red', theme.dangerColor),
  text: () => readToken('--text', theme.textColor),
  textSecondary: () => readToken('--text-2', theme.textSecondaryColor),
  textTertiary: () => readToken('--text-3', theme.textTertiaryColor),
  line: () => readToken('--line', theme.borderColor),
  bg: () => readToken('--bg', theme.bgColor),
  card: () => readToken('--card', theme.cardBgColor),
}

export default theme
