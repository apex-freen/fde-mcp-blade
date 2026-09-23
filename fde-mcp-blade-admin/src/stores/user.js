import { defineStore } from 'pinia'
import { login as apiLogin, getInfo as apiGetInfo, getRouters as apiGetRouters, logout as apiLogout, refresh as apiRefresh, exchangeSsoCode as apiExchangeSsoCode } from '@/api/modules/auth'
import { getEnvInfo as apiGetEnvInfo } from '@/api/modules/gisSettings'
import {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  getUserInfo,
  setUserInfo,
  removeUserInfo,
  getEnvInfo as getEnvInfoFromStorage,
  setEnvInfo,
  removeEnvInfo,
  clearAuth
} from '@/utils/auth'
import { transformRouters, toMenuTree, findFirstMenuPath } from '@/router/router-transform'
import { useAppStore } from '@/stores/app'
import { useCapabilitiesStore } from '@/stores/capabilities'

export const useUserStore = defineStore('user', {
  state: () => {
    const userInfo = getUserInfo() || null
    const permissions = userInfo?.permissions || []
    const roles = userInfo?.roles || []
    const envInfo = getEnvInfoFromStorage() || { is_docker: false }
    return {
      token: getToken() || '',
      refreshToken: getRefreshToken() || '',
      userInfo,
      roles,
      permissions,
      // 侧边栏菜单：由后端 GET /getRouters 下发后生成
      menuList: [],
      // 动态路由记录（守卫中注册到 router）
      menuRoutes: [],
      // 是否已完成菜单拉取与路由注册
      routesLoaded: false,
      // 登录后的默认落地页（菜单树第一个可访问叶子）
      firstMenuPath: '',
      envInfo
    }
  },

  getters: {
    isLoggedIn: (state) => !!state.token,
    hasRefreshToken: (state) => !!state.refreshToken,
    userName: (state) => state.userInfo?.userName || state.userInfo?.username || '未登录',
    avatar: (state) => state.userInfo?.avatar || '',
    isDocker: (state) => state.envInfo?.is_docker ?? false
  },

  actions: {
    /**
     * 本地登录（支持 loginType: local / ldap）
     *
     * Doc 19 §1.1：响应可能包含 refreshToken
     */
    async login(loginForm) {
      try {
        const res = await apiLogin(loginForm)
        const data = res.data || res
        const token = data?.token
        if (token) {
          this.token = token
          setToken(token)
        }
        const refreshToken = data?.refreshToken
        if (refreshToken) {
          this.refreshToken = refreshToken
          setRefreshToken(refreshToken)
        }
        return res
      } catch (error) {
        return Promise.reject(error)
      }
    },

    /**
     * SSO 回调换登录态
     *
     * Doc 19 §1.4：用一次性 sso_code 换 token
     */
    async ssoLogin(code) {
      try {
        const res = await apiExchangeSsoCode(code)
        const data = res.data || res
        const token = data?.token
        if (token) {
          this.token = token
          setToken(token)
        }
        const refreshToken = data?.refreshToken
        if (refreshToken) {
          this.refreshToken = refreshToken
          setRefreshToken(refreshToken)
        }
        return res
      } catch (error) {
        return Promise.reject(error)
      }
    },

    /**
     * 刷新 Token（单次轮换）
     *
     * Doc 19 §1.3：需启用 session.refresh_enabled 才有意义
     */
    async refreshTokenAction() {
      if (!this.refreshToken) {
        return null
      }
      try {
        const res = await apiRefresh(this.refreshToken)
        const data = res.data || res
        const token = data?.token
        const newRefreshToken = data?.refreshToken
        if (token) {
          this.token = token
          setToken(token)
        }
        if (newRefreshToken) {
          this.refreshToken = newRefreshToken
          setRefreshToken(newRefreshToken)
        } else {
          // 后端关闭 refresh 时可能不返回新 refreshToken
          this.refreshToken = ''
          removeRefreshToken()
        }
        return token
      } catch (error) {
        // refresh 失败视为登录态完全失效
        this.resetToken()
        return Promise.reject(error)
      }
    },

    async fetchUserInfo() {
      try {
        // 并发获取用户信息和环境信息
        const [userRes, envRes] = await Promise.all([
          apiGetInfo(),
          apiGetEnvInfo().catch(() => null)
        ])

        // 处理用户信息
        const payload = userRes.data || userRes
        const userInfo = {
          ...payload.user,
          roles: payload.roles || [],
          permissions: payload.permissions || []
        }
        this.userInfo = userInfo
        this.roles = payload.roles || []
        this.permissions = payload.permissions || []
        setUserInfo(userInfo)

        // 应用用户 settings（语言、颜色模式）
        const appStore = useAppStore()
        const settings = payload.user?.settings
        if (settings?.language) {
          appStore.setLocale(settings.language)
        }
        if (settings?.colorMode) {
          appStore.setTheme(settings.colorMode)
        }

        // 处理环境信息
        if (envRes?.data) {
          const envInfo = { is_docker: envRes.data.is_docker ?? false }
          this.envInfo = envInfo
          setEnvInfo(envInfo)
        }

        return userInfo
      } catch (error) {
        if (import.meta.env.DEV) {
          const mockData = {
            user: {
              userId: 1,
              userName: 'admin',
              nickName: '管理员',
              avatar: '',
              settings: {
                language: 'zh-CN',
                colorMode: 'light'
              }
            },
            roles: ['管理员组', '审计组'],
            permissions: [
              'workspace:dashboard',
              'workspace:agent',
              'workspace:agent:chat',
              'workspace:agent:detail',
              'workspace:device',
              'workspace:device:detail',
              'workspace:approval',
              'workspace:profile',
              'controller:user:index',
              'controller:user_permission',
              'controller:token',
              'controller:agent',
              'controller:file',
              'controller:eqp',
              'controller:eqp_firmware:center',
              'controller:eqp_firmware',
              'controller:plugin',
              'controller:plugin:center',
              'controller:plugin:doc',
              'controller:recycle',
              'controller:announcement',
              'audit:operation_log',
              'audit:grant_log',
              'audit:token_log',
              'audit:risk',
              'audit:stats',
              'audit:export',
              'message:notification',
              'message:risk',
              'message:all',
              'controller:hitl',
          'controller:settings:overview',
          'controller:settings:connection',
          'controller:settings:maintenance',
              'controller:mcp_permission',
          // Doc 19 / Doc 23 新增模块（开发环境 mock）
          'controller:sso:config',
          'controller:dept',
          'controller:plugin_registry',
          'controller:pii',
          'controller:vector',
          'controller:report',
          'controller:cost'
            ]
          }
          const userInfo = {
            ...mockData.user,
            roles: mockData.roles,
            permissions: mockData.permissions
          }
          this.userInfo = userInfo
          this.roles = mockData.roles
          this.permissions = mockData.permissions
          setUserInfo(userInfo)

          // 应用用户 settings（语言、颜色模式）
          const appStore = useAppStore()
          const settings = mockData.user?.settings
          if (settings?.language) {
            appStore.setLocale(settings.language)
          }
          if (settings?.colorMode) {
            appStore.setTheme(settings.colorMode)
          }

          return userInfo
        }
        return Promise.reject(error)
      }
    },

    /**
     * 拉取当前用户菜单路由树（GET /getRouters）
     *
     * 生成：
     *   menuRoutes   —— 待注册到 router 的动态路由记录
     *   menuList     —— 侧边栏渲染用的菜单树
     *   firstMenuPath—— 默认落地页
     */
    async fetchMenuRoutes() {
      const res = await apiGetRouters()
      const routers = Array.isArray(res?.data) ? res.data : []

      if (!Array.isArray(res?.data)) {
        console.warn('[menu] getRouters 的 data 不是数组，请检查接口返回结构：', res)
      }

      this.menuRoutes = transformRouters(routers)
      this.menuList = toMenuTree(routers)
      this.firstMenuPath = findFirstMenuPath(this.menuList)
      this.routesLoaded = true

      if (!this.firstMenuPath) {
        console.warn('[menu] 菜单树为空或没有可见叶子菜单，getRouters 返回：', routers)
      }

      return routers
    },

    /**
     * 登出（先调后端 jti 撤销，再清本地）
     *
     * Doc 19 §1.2：后端已修复为真实撤销，不再是空实现
     */
    async logout() {
      // 尝试通知后端撤销会话（带鉴权头），静默失败不影响本地清理
      if (this.token) {
        try {
          await apiLogout()
        } catch (_) {
          // 网络不通或 401 均静默忽略
        }
      }
      this.token = ''
      this.refreshToken = ''
      this.userInfo = null
      this.roles = []
      this.permissions = []
      this.menuList = []
      this.menuRoutes = []
      this.routesLoaded = false
      this.firstMenuPath = ''
      this.envInfo = { is_docker: false }
      // 能力清单随账号走，登出必须复位，避免残留上个账号的视图
      useCapabilitiesStore().reset()
      clearAuth()
    },

    resetToken() {
      this.token = ''
      this.refreshToken = ''
      this.menuList = []
      this.menuRoutes = []
      this.routesLoaded = false
      this.firstMenuPath = ''
      removeToken()
      removeRefreshToken()
      removeUserInfo()
    }
  }
})
