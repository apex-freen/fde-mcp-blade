// ==========================================
// i18n 国际化配置
// ==========================================

import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

const LOCALE_KEY = 'apex_locale'
const COLOR_MODE_KEY = 'apex_color_mode'

export const getStoredLocale = () => {
  try {
    return localStorage.getItem(LOCALE_KEY) || 'zh-CN'
  } catch {
    return 'zh-CN'
  }
}

export const setStoredLocale = (locale) => {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // ignore
  }
}

export const getStoredColorMode = () => {
  try {
    return localStorage.getItem(COLOR_MODE_KEY) || 'light'
  } catch {
    return 'light'
  }
}

export const setStoredColorMode = (mode) => {
  try {
    localStorage.setItem(COLOR_MODE_KEY, mode)
  } catch {
    // ignore
  }
}

const i18n = createI18n({
  legacy: false,
  locale: getStoredLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export default i18n
