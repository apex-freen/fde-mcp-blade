// ==========================================
// HTTP 请求封装（Axios）
// 参考移动端 request.js 逻辑，保持一致的行为
// ==========================================

import axios from 'axios'
import { Message, Modal } from '@arco-design/web-vue'
import { getToken, getRefreshToken, setToken, setRefreshToken, clearAuth } from './auth'
import env from '@/config/env'

// 创建 Axios 实例
const service = axios.create({
  baseURL: env.baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求计数器（用于 loading）
let requestCount = 0
let loadingInstance = null

function showLoading() {
  requestCount++
  // 如需全局 loading，可在此处启用
}

function hideLoading() {
  requestCount--
  if (requestCount <= 0) {
    requestCount = 0
    if (loadingInstance) {
      loadingInstance.close()
      loadingInstance = null
    }
  }
}

// ---------- 401 自动 Refresh 机制 ----------
// 标记当前是否正在 refresh（防止并发重复请求）
let isRefreshing = false
// 等待 refresh 完成的请求队列
let refreshSubscribers = []

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback)
}

function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach(cb => cb(newToken))
  refreshSubscribers = []
}

/**
 * 这些路径的 401 不触发自动 refresh（本身就是 auth 链路）
 */
const NO_REFRESH_PATHS = ['/login', '/logout', '/refresh', '/sso/exchange']

function shouldSkipRefresh(url) {
  return NO_REFRESH_PATHS.some(p => url?.includes(p))
}

/**
 * 执行一次 refresh 请求（用原生 axios 避免走自己的拦截器）
 */
async function tryRefreshToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return null
  }
  try {
    const resp = await axios.request({
      baseURL: env.baseURL,
      url: '/refresh',
      method: 'POST',
      data: { refreshToken },
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    })
    const data = resp.data?.data || resp.data
    const newToken = data?.token
    const newRefreshToken = data?.refreshToken
    if (newToken) {
      setToken(newToken)
      if (newRefreshToken) {
        setRefreshToken(newRefreshToken)
      } else {
        setRefreshToken('')
      }
      return newToken
    }
    return null
  } catch (_) {
    return null
  }
}

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 显示 loading（可选，通过 config.showLoading 控制）
    if (config.showLoading !== false) {
      showLoading()
    }

    // 自动带上 Token
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    hideLoading()
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    hideLoading()

    const { status, data } = response

    // 1. 成功处理 (2xx)
    if (status >= 200 && status < 300) {
      // 如果后端返回了业务 code 码
      if (data.code !== undefined && data.code !== 200) {
        // 业务错误
        if (data.showError !== false) {
          Message.error(data.msg || '业务请求失败')
        }
        return Promise.reject(data)
      }
      return data
    }

    return data
  },
  async (error) => {
    hideLoading()

    const { response, message } = error

    if (!response) {
      // 网络错误
      Message.error('网络连接失败，请检查网络')
      return Promise.reject(error)
    }

    const { status, data } = response

    // 2. Token 失效处理 (401) — 优先尝试 refresh
    if (status === 401) {
      // 如果是 auth 链路本身（login/logout/refresh/sso），不尝试 refresh
      if (shouldSkipRefresh(error.config?.url)) {
        clearAuth()
        Message.warning('登录已过期，请重新登录')
        setTimeout(() => {
          window.location.href = '/login'
        }, 1000)
        return Promise.reject(error)
      }

      // 没有 refreshToken 直接清登录态
      if (!getRefreshToken()) {
        clearAuth()
        Message.warning('登录已过期，请重新登录')
        setTimeout(() => {
          window.location.href = '/login'
        }, 1000)
        return Promise.reject(error)
      }

      // 正在 refresh → 等待队列，等 refresh 完成后重试
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            error.config.headers.Authorization = `Bearer ${newToken}`
            resolve(service(error.config))
          })
        })
      }

      isRefreshing = true
      const newToken = await tryRefreshToken()
      isRefreshing = false

      if (newToken) {
        onTokenRefreshed(newToken)
        // 用新 token 重试当前请求
        error.config.headers.Authorization = `Bearer ${newToken}`
        return service(error.config)
      } else {
        // refresh 失败 → 清登录态跳登录页
        onTokenRefreshed(null) // 让等待队列都失败
        clearAuth()
        Message.warning('登录已过期，请重新登录')
        setTimeout(() => {
          window.location.href = '/login'
        }, 1000)
        return Promise.reject(error)
      }
    }

    // 3. 其他错误处理
    const errorMsg = data?.msg || message || `服务器异常(${status})`
    if (error.config?.showError !== false) {
      Message.error(errorMsg)
    }

    return Promise.reject(error)
  }
)

/**
 * 通用请求方法
 * @param {Object} options - 请求配置
 * @param {boolean} options.showLoading - 是否显示 loading（默认 true）
 * @param {boolean} options.showError - 是否自动弹出错误提示（默认 true）
 */
export function request(options) {
  return service(options)
}

// 便捷方法
export function get(url, params, options = {}) {
  return request({ url, method: 'GET', params, ...options })
}

export function post(url, data, options = {}) {
  return request({ url, method: 'POST', data, ...options })
}

export function put(url, data, options = {}) {
  return request({ url, method: 'PUT', data, ...options })
}

export function del(url, data, options = {}) {
  return request({ url, method: 'DELETE', data, ...options })
}

export default service
