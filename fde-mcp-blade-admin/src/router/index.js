import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuards } from './guards'

// 静态路由：仅公共页面 + 兜底
// 业务菜单路由全部由后端 GET /getRouters 下发后在守卫中动态注册
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录',
      public: true
    }
  },
  {
    path: '/sso',
    name: 'SsoCallback',
    component: () => import('@/views/login/sso.vue'),
    meta: {
      title: '单点登录中',
      public: true
    }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', public: true }
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无访问权限', public: true }
  },

  // 兜底：必须用 component，不能用 redirect —— redirect 在守卫之前解析，
  // 守卫就看不到用户真正想访问的地址，无法完成「拉菜单 → 重进」的补救
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFoundCatchAll',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', public: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

setupRouterGuards(router)

export default router
