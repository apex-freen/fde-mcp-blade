// 临时验证：真实 router-transform.toMenuTree × resolveMenuTitle 端到端
// 用 vite ssrLoadModule 加载（可解析 @ 别名与 .vue 依赖），构造模拟 getRouters 返回
import { createServer } from 'vite'

const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' })
let failed = 0
const check = (name, got, expect) => {
  const ok = JSON.stringify(got) === JSON.stringify(expect)
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} → ${JSON.stringify(got)}${ok ? '' : ' (期望 ' + JSON.stringify(expect) + ')'}`)
}

try {
  const { toMenuTree } = await server.ssrLoadModule('/src/router/router-transform.js')
  const { resolveMenuTitle } = await server.ssrLoadModule('/src/utils/menu-i18n.js')
  const en = (await server.ssrLoadModule('/src/locales/en-US.js')).default.menu
  const zh = (await server.ssrLoadModule('/src/locales/zh-CN.js')).default.menu

  // 模拟后端 getRouters（含 hidden 节点 / 目录节点 / meta 与节点级两种 i18nKey 写法）
  const routers = [
    {
      name: 'Audit',
      path: '/audit',
      component: 'Layout',
      meta: { title: '审计中心', i18nKey: 'menu.audit' },
      children: [
        {
          name: 'OperationLog',
          path: 'operation_log',
          component: 'audit/operation_log/index',
          meta: { title: '操作审计', i18nKey: 'menu.audit.operationLog' }
        },
        {
          name: 'HiddenDemo',
          path: 'hidden_demo',
          hidden: true,
          component: 'audit/risk/index',
          meta: { title: '隐藏页', i18nKey: 'menu.auditRisk' }
        }
      ]
    },
    {
      name: 'Shadow',
      path: '/controller/capability/shadow',
      component: 'controller/shadow/index.vue',
      i18nKey: 'menu.controllerShadow', // 节点级写法
      meta: { title: '影子演练' }
    }
  ]

  const tree = toMenuTree(routers)
  check('顶层节点透传 i18nKey', tree[0].i18nKey, 'menu.audit')
  check('子节点透传 i18nKey（文档嵌套口径）', tree[0].children[0].i18nKey, 'menu.audit.operationLog')
  check('hidden 节点仍被过滤', tree[0].children.length, 1)
  check('节点级 i18nKey 也能取到', tree[1].i18nKey, 'menu.controllerShadow')

  // 用真实词典做 t/te
  let locale = 'en-US'
  const dict = { 'zh-CN': zh, 'en-US': en }
  const lookup = (k) => {
    const m = /^menu\.(.+)$/.exec(k)
    return m && Object.prototype.hasOwnProperty.call(dict[locale], m[1]) ? dict[locale][m[1]] : undefined
  }
  const te = (k) => lookup(k) !== undefined
  const t = (k) => (lookup(k) === undefined ? k : lookup(k))

  check('菜单树 → 英文（一级）', resolveMenuTitle(tree[0], t, te), 'Audit Center')
  check('菜单树 → 英文（二级，嵌套键自动折叠）', resolveMenuTitle(tree[0].children[0], t, te), 'Operation Audit')
  check('菜单树 → 英文（节点级键）', resolveMenuTitle(tree[1], t, te), 'Shadow Drills')

  locale = 'zh-CN'
  check('切回中文（一级）', resolveMenuTitle(tree[0], t, te), '审计中心')
  check('切回中文（二级）', resolveMenuTitle(tree[0].children[0], t, te), '操作审计')

  console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
} finally {
  await server.close()
}
process.exit(failed === 0 ? 0 : 1)
