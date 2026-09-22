// ==========================================
// 云端平台外部接口（直接请求云端域名，不走本地后端代理）
// 域名: https://api.agent-plat.com
// ==========================================

import axios from 'axios'
import { Message } from '@arco-design/web-vue'
import env from '@/config/env'

// 云端 API 基础地址
const CLOUD_BASE_URL = env.cloudBaseURL

// 创建独立的 axios 实例（不经过本地后端拦截器）
const cloudService = axios.create({
  baseURL: CLOUD_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 响应拦截器：统一处理云端接口错误
cloudService.interceptors.response.use(
  (response) => {
    const res = response.data
    // 云端接口返回格式：{ code, msg, data }
    if (res.code !== 200) {
      Message.error(res.msg || '云端请求失败')
      return Promise.reject(new Error(res.msg || '云端请求失败'))
    }
    return res
  },
  (error) => {
    const msg = error.response?.data?.msg || error.message || '云端网络错误'
    Message.error(msg)
    return Promise.reject(error)
  }
)

/**
 * 获取图形验证码
 * @returns {Promise} { img: 'base64...', uuid: 'xxx' }
 */
export function getCloudCaptcha() {
  return cloudService.get('/common/captchaImage')
}

/**
 * 发送短信验证码
 * @param {Object} data - { username, code, uuid, Scene }
 * @returns {Promise}
 */
export function sendCloudSms(data) {
  return cloudService.post('/common/sendSms', data)
}

/**
 * 云端登录
 * @param {Object} data - { username, password, code, uuid }
 * @returns {Promise} { token }
 */
export function cloudLogin(data) {
  return cloudService.post('/login', data)
}

/**
 * 云端注册
 * @param {Object} data - { username, password, code, uuid, code_sms, deviceId }
 * @returns {Promise} { token }
 */
export function cloudRegister(data) {
  return cloudService.post('/register', data)
}

/**
 * 云端忘记密码
 * @param {Object} data - { username, password, code, uuid, code_sms }
 * @returns {Promise} { token }
 */
export function cloudForgotPwd(data) {
  return cloudService.post('/forgotPwd', data)
}
