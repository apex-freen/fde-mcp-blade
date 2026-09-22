#!/usr/bin/env node
/**
 * 前端质量门禁（三条）
 *
 *   1. i18n 中英键必须一一对应（项目红线：不允许单边新增文案）
 *   2. .vue 内禁止硬编码颜色字面量（走 scripts/color-baseline.js 基线收敛）
 *   3. 禁止加载外部网络资源（内网离线红线；源码里的说明性链接不算）
 *
 * 用法：
 *   npm run check              # 报告模式，只统计不阻断（退出码 0）
 *   npm run check:strict       # 门禁模式，有违规即 exit 1
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import COLOR_BASELINE from './color-baseline.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')
const STRICT = process.argv.includes('--strict')

/** 内网离线白名单：这些域名允许出现 */
const ALLOWED_HOSTS = ['api.agent-plat.com']
/** 允许 private / 回环地址（内网联调） */
const isInternalHost = (h) =>
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(h) ||
  h.endsWith('.local') ||
  /^10\./.test(h) ||
  /^192\.168\./.test(h) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(h)

const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-ssr', '.git', '.uploads'])

// ──────────────────────────────────────────────────────────── 基础设施

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    statSync(full).isDirectory() ? walk(full, out) : out.push(full)
  }
  return out
}

const rel = (f) => relative(ROOT, f).replace(/\\/g, '/')

/** 逐行匹配，支持多命中；可选 lineFilter 精确过滤 */
function grep(files, re, lineFilter = () => true) {
  const hits = []
  for (const f of files) {
    readFileSync(f, 'utf8')
      .split(/\r?\n/)
      .forEach((text, i) => {
        if (!lineFilter(text)) return
        re.lastIndex = 0
        let m
        while ((m = re.exec(text)) !== null) {
          hits.push({ file: rel(f), line: i + 1, text: text.trim() })
          if (!re.lastIndex) break // 防零宽匹配死循环
          if (!re.global) break
        }
      })
  }
  return hits
}

function flatten(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out.push(key)
  }
  return out
}

let failed = 0
const section = (n, t) => console.log(`\n${'─'.repeat(66)}\n${n}. ${t}\n${'─'.repeat(66)}`)
const ok = (msg) => console.log(`   ✅ ${msg}`)
const bad = (msg) => {
  failed++
  console.log(`   ✗  ${msg}`)
}
const sample = (arr, n, fmt) => {
  arr.slice(0, n).forEach((x) => console.log(`   ✗  ${fmt(x)}`))
  if (arr.length > n) console.log(`      … 另有 ${arr.length - n} 处`)
}

// ──────────────────────────────────────────── 1. i18n 中英键一致性
section(1, 'i18n 中英键一致性')
const zh = (await import(pathToFileURL(join(SRC, 'locales/zh-CN.js')).href)).default
const en = (await import(pathToFileURL(join(SRC, 'locales/en-US.js')).href)).default
const zhKeys = new Set(flatten(zh))
const enKeys = new Set(flatten(en))
const onlyZh = [...zhKeys].filter((k) => !enKeys.has(k))
const onlyEn = [...enKeys].filter((k) => !zhKeys.has(k))
console.log(`   zh-CN ${zhKeys.size} 键 / en-US ${enKeys.size} 键`)
if (onlyZh.length || onlyEn.length) {
  bad(`键不一致：en 缺 ${onlyZh.length} 个、zh 缺 ${onlyEn.length} 个`)
  sample(onlyZh, 10, (k) => `en-US 缺: ${k}`)
  sample(onlyEn, 10, (k) => `zh-CN 缺: ${k}`)
} else ok(`键完全对应（${zhKeys.size} 对）`)

// ──────────────────────────────────────────── 2. 硬编码颜色字面量
section(2, '.vue 内硬编码颜色字面量')
const allFiles = walk(SRC)
const vueFiles = allFiles.filter((f) => extname(f) === '.vue')
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g
const colorHits = grep(vueFiles, HEX)
const colorByFile = colorHits.reduce((m, h) => ((m[h.file] = (m[h.file] || 0) + 1), m), {})
console.log(`   .vue ${vueFiles.length} 个，命中 ${colorHits.length} 处 / ${Object.keys(colorByFile).length} 个文件`)
console.log(`   基线登记 ${Object.keys(COLOR_BASELINE).length} 个文件（技术债，允许保留）`)

const addedFiles = Object.keys(colorByFile).filter((f) => !(f in COLOR_BASELINE))
const regressedFiles = Object.entries(COLOR_BASELINE).filter(
  ([f, n]) => f in colorByFile && colorByFile[f] > n
)
if (addedFiles.length) {
  bad(`有 ${addedFiles.length} 个文件新增了硬编码颜色（不在基线内）`)
  sample(addedFiles, 10, (f) => `${f}（${colorByFile[f]} 处）`)
} else ok('无基线外的新增硬编码颜色')

if (regressedFiles.length) {
  bad(`有 ${regressedFiles.length} 个文件硬编码数量比基线增加`)
  regressedFiles.forEach(([f, n]) => console.log(`   ✗  ${f}: 基线 ${n} → 实际 ${colorByFile[f]}`))
}

const clearedFiles = Object.entries(COLOR_BASELINE).filter(([f]) => !(f in colorByFile))
if (clearedFiles.length) console.log(`   ℹ️  已清零可移出基线：${clearedFiles.map(([f]) => f).join(', ')}`)

// ──────────────────────────────────────────── 3. 外部网络资源
section(3, '外部资源加载（离线红线）')
// 只匹配「真的会发起网络请求」的写法，源码注释 / 说明文案不算
const LOAD_PATTERNS = [
  /(?:src|href)\s*=\s*["'`]https?:\/\/[^\s"'`<>]+/g, // <script src>/<link href>/<img src>
  /url\(\s*["']?https?:\/\/[^\s)"']+/g, // css url()
  /@import\s+(?:url\()?\s*["']https?:\/\/[^\s"')]+/g, // css @import
  /(?:^|[\s(])from\s*["']https?:\/\/[^\s"']+/g, // js import ... from
  /import\s*\(\s*["']https?:\/\/[^\s"')]+/g // 动态 import()
]
const isComment = (t) => /^\s*(\/\/|\/\*|\*|<!--)/.test(t) || /<!--.*-->/.test(t)
const loadFiles = allFiles.filter((f) =>
  ['.vue', '.js', '.ts', '.html', '.css', '.scss'].includes(extname(f))
)

const loadHits = []
for (const re of LOAD_PATTERNS) {
  for (const h of grep(loadFiles, new RegExp(re.source, re.flags), (t) => !isComment(t))) {
    const urls = h.text.match(/https?:\/\/[^\s"'`)]+/g) || []
    const offending = urls.filter((u) => {
      try {
        const { hostname } = new URL(u)
        return !ALLOWED_HOSTS.includes(hostname) && !isInternalHost(hostname)
      } catch {
        return false
      }
    })
    if (offending.length) loadHits.push({ ...h, url: offending[0] })
  }
}
if (loadHits.length) {
  bad(`发现 ${loadHits.length} 处外部资源加载`)
  sample(loadHits, 10, (h) => `${h.file}:${h.line}  ${h.url}`)
} else ok('无外部资源加载')

// 3b. 提示：i18n 文案里的外链（离线环境点不开，属产品判断，不阻断）
const copyHits = grep(
  allFiles.filter((f) => rel(f).startsWith('src/locales/')),
  /https?:\/\/[^\s"'`]+/g
)
if (copyHits.length) {
  const hosts = [...new Set(copyHits.map((h) => { try { return new URL(h.text.match(/https?:\/\/[^\s"'`]+/)[0]).host } catch { return '?' } }))]
  console.log(`   ℹ️  另有 ${copyHits.length} 处外链出现在 i18n 文案里（离线环境点不开），域名：${hosts.join(', ')}`)
}

// ──────────────────────────────────────────── 汇总
console.log(`\n${'═'.repeat(66)}`)
if (!failed) {
  console.log('✅ 三条门禁全部通过')
  process.exit(0)
}
console.log(`❌ ${failed} 项未通过${STRICT ? '（strict 模式，退出码 1）' : '（报告模式，不阻断构建）'}`)
process.exit(STRICT ? 1 : 0)
