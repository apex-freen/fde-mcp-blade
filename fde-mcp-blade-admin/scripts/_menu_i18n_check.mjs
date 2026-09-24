// 临时验证：菜单标题解析（resolveMenuTitle）在真实词典下的行为
const base = 'file:///E:/apex_fontend/fde-mcp-blade/fde-mcp-blade-admin/src/'
const { resolveMenuTitle } = await import(base + 'utils/menu-i18n.js')
const zh = (await import(base + 'locales/zh-CN.js')).default.menu
const en = (await import(base + 'locales/en-US.js')).default.menu

const dict = { 'zh-CN': zh, 'en-US': en }
let locale = 'en-US'
const lookup = (k) => {
  const m = /^menu\.(.+)$/.exec(k)
  if (!m) return undefined
  return Object.prototype.hasOwnProperty.call(dict[locale], m[1]) ? dict[locale][m[1]] : undefined
}
const te = (k) => lookup(k) !== undefined
const t = (k) => (lookup(k) === undefined ? k : lookup(k))

const cases = [
  ['扁平键（当前词典口径）', { i18nKey: 'menu.auditOperationLog', title: '操作审计' }, 'Operation Audit'],
  ['嵌套键（文档 §3.1 示例口径）', { i18nKey: 'menu.audit.operationLog', title: '操作审计' }, 'Operation Audit'],
  ['三级嵌套键', { i18nKey: 'menu.controller.settings.capabilities', title: '能力总览' }, 'Capability Overview'],
  ['嵌套 + snake_case 键', { i18nKey: 'menu.audit.operation_log', title: '操作审计' }, 'Operation Audit'],
  ['meta 内嵌 i18nKey', { meta: { i18nKey: 'menu.controllerShadow' }, title: '影子演练' }, 'Shadow Drills'],
  ['键不存在 → 回退中文', { i18nKey: 'menu.notExist', title: '某菜单' }, '某菜单'],
  ['无 i18nKey → 回退中文', { title: '某菜单' }, '某菜单'],
  ['空节点 → 空串', null, '']
]

let total = 0
let pass = 0
for (const [name, item, expect] of cases) {
  total++
  const got = resolveMenuTitle(item, t, te)
  const ok = got === expect
  if (ok) pass++
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + ' → "' + got + '"' + (ok ? '' : ' (期望 "' + expect + '")'))
}
total++
locale = 'zh-CN'
const zhGot = resolveMenuTitle({ i18nKey: 'menu.auditOperationLog', title: '操作审计' }, t, te)
if (zhGot === '操作审计') pass++
console.log((zhGot === '操作审计' ? 'PASS' : 'FAIL') + ' | 切回 zh-CN → "' + zhGot + '"')

// 词典键集对称性
const zk = Object.keys(zh)
const ek = Object.keys(en)
const diff = zk.filter((k) => !ek.includes(k)).concat(ek.filter((k) => !zk.includes(k)))
console.log('menu 词典键数 zh=' + zk.length + ' en=' + ek.length + ' 差异=' + JSON.stringify(diff))

console.log('\n' + pass + '/' + total + ' 通过')
process.exit(pass === total ? 0 : 1)
