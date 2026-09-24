// 临时验证：dev 后端真实 getRouters 返回 × 真实 toMenuTree × resolveMenuTitle
// 覆盖两种关键场景：61 个已配 key → 英文；19 个 null → 回退中文，不出现裸键/undefined
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const data = JSON.parse(readFileSync(new URL('./_routers_dev.json', import.meta.url), 'utf-8'))
const en = (await import('../src/locales/en-US.js')).default.menu
const zh = (await import('../src/locales/zh-CN.js')).default.menu

const dict = { 'zh-CN': zh, 'en-US': en }
let locale = 'en-US'
const lookup = (k) => {
  const m = /^menu\.(.+)$/.exec(k)
  return m && Object.prototype.hasOwnProperty.call(dict[locale], m[1]) ? dict[locale][m[1]] : undefined
}
const te = (k) => lookup(k) !== undefined
const t = (k) => (lookup(k) === undefined ? k : lookup(k))

const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' })
let failed = 0
try {
  const { toMenuTree } = await server.ssrLoadModule('/src/router/router-transform.js')
  const { resolveMenuTitle } = await server.ssrLoadModule('/src/utils/menu-i18n.js')

  const tree = toMenuTree(data.data || [])

  let nKey = 0
  let nNull = 0
  const problems = []
  const walk = (items) => {
    for (const it of items) {
      const title = resolveMenuTitle(it, t, te)
      if (it.i18nKey) {
        nKey++
        // 已配 key：英文态必须是译文（≠中文 title），且不能渲成裸键
        if (title === it.title && !/^[\x00-\x7F]*$/.test(title) === false) {
          // 中文 title 与英文不同的正常情况会走到这里之外
        }
        if (title === it.title || title === it.i18nKey || !title) {
          problems.push(`${it.path} key=${it.i18nKey} → "${title}"`)
        }
      } else {
        nNull++
        // null：必须原样回退中文 title，不允许 undefined / 裸键
        if (title !== it.title) problems.push(`${it.path} 无key → "${title}" (期望 "${it.title}")`)
      }
      if (it.children?.length) walk(it.children)
    }
  }
  walk(tree)

  locale = 'zh-CN'
  const zhSample = resolveMenuTitle(tree[0], t, te)
  const zhOk = zhSample === tree[0].title

  console.log(`有key=${nKey} null=${nNull}`)
  console.log('英文态异常:', problems.length ? '' : '无')
  problems.forEach((p) => console.log('  ❌', p))
  console.log(`切回中文（顶层 "${tree[0].title}"）→ "${zhSample}"`, zhOk ? 'OK' : 'FAIL')
  if (!zhOk) failed++
  failed += problems.length
  console.log(failed === 0 ? '\n✅ 真实数据端到端全部通过' : `\n❌ ${failed} 处异常`)
} finally {
  await server.close()
}
process.exit(failed === 0 ? 0 : 1)
