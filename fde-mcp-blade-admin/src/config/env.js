// ==========================================
// 环境变量统一入口
// 通过 import.meta.env 读取 .env.* 配置
// ==========================================

export const env = {
  // 应用标题
  title: import.meta.env.VITE_APP_TITLE || '智能体工具中枢',

  // API 基础路径
  baseURL: import.meta.env.VITE_API_BASE_URL || '/prod-api',

  // API 代理目标（仅开发环境使用）
  apiTarget: import.meta.env.VITE_API_TARGET || 'http://127.0.0.1:80',

  // 云端平台 API 地址（GIS/云端外部服务，独立于主后端）
  cloudBaseURL: import.meta.env.VITE_CLOUD_BASE_URL || 'https://api.agent-plat.com',

  // 是否使用 Mock
  useMock: import.meta.env.VITE_USE_MOCK === 'true',

  // 运行环境
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
}

export default env
