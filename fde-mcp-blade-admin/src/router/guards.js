import { useUserStore } from '@/stores/user'
import { useCapabilitiesStore } from '@/stores/capabilities'
import { applyPageTitle } from '@/utils/page-title'

const whiteList = ['/login', '/sso', '/404', '/403']

// 首页重定向路由：菜单拉取后动态注册，不在静态路由里写死
const HOME_ROUTE_NAME = 'HomeRedirect'

// 已注册的动态路由名，登出时回收，避免同一标签页切换账号后残留上个账号的路由
let dynamicRouteNames = []

function registerMenuRoutes(router, routes) {
  routes.forEach((route) => {
    if (route.name && router.hasRoute(route.name)) return
    router.addRoute(route)
    if (route.name) dynamicRouteNames.push(route.name)
  })
}

// 根路径落地页 = 菜单树里第一个可访问页面
function registerHomeRedirect(router, path) {
  if (router.hasRoute(HOME_ROUTE_NAME)) router.removeRoute(HOME_ROUTE_NAME)
  router.addRoute({
    path: '/',
    name: HOME_ROUTE_NAME,
    redirect: path || '/403'
  })
}

function resetDynamicRoutes(router) {
  dynamicRouteNames.forEach((name) => {
    if (router.hasRoute(name)) router.removeRoute(name)
  })
  dynamicRouteNames = []
  if (router.hasRoute(HOME_ROUTE_NAME)) router.removeRoute(HOME_ROUTE_NAME)
}

export function setupRouterGuards(router) {
  router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()

    if (to.meta?.title) {
      // 标题跟随语言：i18nKey 命中词典用译文，否则回退后端中文 title（utils/page-title.js）
      applyPageTitle(to.meta)
    }

    // 登录态失效：回收动态路由（覆盖登出、token 过期两种场景）
    if (!userStore.isLoggedIn && dynamicRouteNames.length > 0) {
      resetDynamicRoutes(router)
    }

    if (whiteList.includes(to.path)) {
      next()
      return
    }

    if (!userStore.isLoggedIn) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 首次进入（或刷新）：拉用户信息 + 菜单 → 注册动态路由 → 重进原地址
    if (!userStore.routesLoaded) {
      try {
        if (!userStore.userInfo) {
          await userStore.fetchUserInfo()
        }
        // 能力清单：fire-and-forget，**绝不 await**
        // 理由（1016 §5.3 验证清单第 13 项 ④）：接口未上线/失败时不能阻塞登录与首屏，
        // 拿不到就按「有则显示」降级（见 stores/capabilities.js）
        const capabilitiesStore = useCapabilitiesStore()
        if (!capabilitiesStore.loaded) {
          capabilitiesStore.fetchCapabilities()
        }
        await userStore.fetchMenuRoutes()
        registerMenuRoutes(router, userStore.menuRoutes)
        registerHomeRedirect(router, userStore.firstMenuPath)
        // 只带 path/query/hash，不能写成 next({ ...to })：
        // 那会把兜底路由的 name 一起带过去，而 name 的解析优先级高于 path，
        // 会导致"重进"又落回兜底路由
        next({
          path: to.path,
          query: to.query,
          hash: to.hash,
          replace: true
        })
      } catch (error) {
        userStore.resetToken()
        next({
          path: '/login',
          query: { redirect: to.fullPath }
        })
      }
      return
    }

    next()
  })

  router.afterEach(() => {
    window.scrollTo(0, 0)
  })
}
