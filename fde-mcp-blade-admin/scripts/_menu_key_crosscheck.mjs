// 临时验证：后端 getRouters 实际下发的 i18nKey × 前端词典全量比对
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const data = JSON.parse(readFileSync(new URL('./_routers_dev.json', import.meta.url), 'utf-8'))
const en = (await import('../src/locales/en-US.js')).default.menu
const zh = (await import('../src/locales/zh-CN.js')).default.menu

// 与后端写入校验同源的格式契约：menu. + 小写字母开头的大驼峰
const RE = /^menu\.[a-z][a-zA-Z0-9]*$/

const keys = []
const badFormat = []
function walk(n) {
  const k = n.meta?.i18nKey
  if (typeof k === 'string' && k) {
    keys.push(k)
    if (!RE.test(k)) badFormat.push(k)
  }
  ;(n.children || []).forEach(walk)
}
;(data.data || []).forEach(walk)

const dup = keys.filter((k, i) => keys.indexOf(k) !== i)
const missEn = [...new Set(keys)].filter((k) => !(k.slice(5) in en))
const missZh = [...new Set(keys)].filter((k) => !(k.slice(5) in zh))
const onlyDict = Object.keys(en).filter((k) => !keys.includes('menu.' + k))

console.log('下发键总数(含重复):', keys.length, '| 去重:', new Set(keys).size)
console.log('格式不符(点分/大写开头等):', JSON.stringify(badFormat))
console.log('重复键:', JSON.stringify([...new Set(dup)]))
console.log('词典缺 en:', JSON.stringify(missEn))
console.log('词典缺 zh:', JSON.stringify(missZh))
console.log('词典有但后端未下发(admin 视角):', onlyDict.length, '个 →', JSON.stringify(onlyDict))
const ok = !badFormat.length && !dup.length && !missEn.length && !missZh.length
console.log(ok ? '\n✅ 全量比对通过' : '\n❌ 有缺口，见上')
process.exit(ok ? 0 : 1)
