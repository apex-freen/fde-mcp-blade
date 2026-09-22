// ==========================================
// 应用状态管理
// ==========================================

import { defineStore } from 'pinia'
import env from '@/config/env'
import i18n, { getStoredLocale, setStoredLocale, getStoredColorMode, setStoredColorMode } from '@/locales'
import { updateGisUserSettings } from '@/api/modules/gisUser'
import { useUserStore } from '@/stores/user'

export const useAppStore = defineStore('app', {
  state: () => ({
    title: env.title,
    sidebarCollapsed: false,
    theme: getStoredColorMode(),
    isLoading: false,
    locale: getStoredLocale()
  }),

  actions: {
    /**
     * 切换侧边栏折叠状态
     */
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    /**
     * 设置侧边栏状态
     */
    setSidebarCollapsed(collapsed) {
      this.sidebarCollapsed = collapsed
    },

    /**
     * 设置全局 loading
     */
    setLoading(loading) {
      this.isLoading = loading
    },

    /**
     * 设置语言
     */
    async setLocale(locale) {
      this.locale = locale
      i18n.global.locale.value = locale
      setStoredLocale(locale)
      // 同步到后端用户 settings
      const userStore = useUserStore()
      const userId = userStore.userInfo?.userId
      if (userId) {
        try {
          await updateGisUserSettings(userId, { language: locale })
        } catch (e) {
          // 静默失败，不影响本地状态
        }
      }
    },

    /**
     * 切换语言
     */
    toggleLocale() {
      const newLocale = this.locale === 'zh-CN' ? 'en-US' : 'zh-CN'
      this.setLocale(newLocale)
    },

    /**
     * 设置颜色模式
     */
    async setTheme(theme) {
      this.theme = theme
      setStoredColorMode(theme)
      // 同步到后端用户 settings
      const userStore = useUserStore()
      const userId = userStore.userInfo?.userId
      if (userId) {
        try {
          await updateGisUserSettings(userId, { colorMode: theme })
        } catch (e) {
          // 静默失败，不影响本地状态
        }
      }
    },

    /**
     * 切换颜色模式
     */
    toggleTheme() {
      const newTheme = this.theme === 'light' ? 'dark' : 'light'
      this.setTheme(newTheme)
    }
  }
})
