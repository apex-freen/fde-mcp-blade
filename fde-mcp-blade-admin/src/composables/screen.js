// ==========================================
// 数据大屏公共逻辑（Doc 37 §2.2 / §3.4）
// ==========================================

import { ref, onMounted, onBeforeUnmount } from 'vue'

// 轮询间隔固定 60s（不做可配置项）
const BASE_INTERVAL = 60000
// 失败退避：连续失败 1~2 次仍按 60s，之后 2min → 5min（封顶）
const SLOW_INTERVAL = 120000
const MAX_INTERVAL = 300000

/**
 * 大屏轮询
 *
 * 约定（Doc 37 §3.4）：60s 轮询；页面不可见时暂停、恢复可见立即拉一次；
 * 失败时保留上次数据 + 置失败态，降频静默重试（不永久停止），任一次成功回到 60s。
 *
 * @param {() => Promise<void>} load 拉取逻辑（内部自行写入页面数据；失败请直接抛出）
 * @param {{ enabled?: boolean }} [options] enabled=false 时完全不轮询（后台模式复用同一组件时用）
 * @returns {{ loading: import('vue').Ref<boolean>, failing: import('vue').Ref<boolean>, refresh: () => Promise<void> }}
 */
export function useScreenPolling(load, options = {}) {
  const enabled = options.enabled !== false
  const loading = ref(false)
  const failing = ref(false)

  let timer = null
  let failCount = 0
  let disposed = false

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function nextDelay() {
    if (failCount <= 2) return BASE_INTERVAL
    if (failCount === 3) return SLOW_INTERVAL
    return MAX_INTERVAL
  }

  function schedule(delay) {
    clearTimer()
    // 页面不可见时不排期，恢复可见时由 visibilitychange 立即拉起
    if (!enabled || disposed || document.visibilityState !== 'visible') return
    timer = setTimeout(pull, delay)
  }

  async function pull() {
    if (!enabled || disposed || document.visibilityState !== 'visible') return
    loading.value = true
    try {
      await load()
      failCount = 0
      failing.value = false
    } catch (_) {
      failCount += 1
      failing.value = true
    } finally {
      loading.value = false
      schedule(nextDelay())
    }
  }

  function handleVisibilityChange() {
    clearTimer()
    if (document.visibilityState === 'visible') pull()
  }

  onMounted(() => {
    if (!enabled) return
    pull()
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onBeforeUnmount(() => {
    disposed = true
    clearTimer()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return { loading, failing, refresh: pull }
}

/**
 * 只取文档约定的 query 白名单，原样透传给聚合接口（Doc 37 §2.2-3）
 * 未传 period 时默认 month；custom 缺 start/end 由后端兜底，前端不拦
 */
export function buildScreenQuery(query = {}) {
  const allow = ['period', 'start', 'end', 'dept_id', 'plugin_name', 'group_by', 'limit']
  const result = {}
  allow.forEach((key) => {
    const value = query[key]
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value
    }
  })
  if (!result.period) result.period = 'month'
  return result
}

/**
 * 周期标签
 *
 * Doc 37 §3.1：`period=custom` 缺参时后端会兜底成近 30 天但 `period` 仍回显 custom，
 * 因此 custom 一律用 start_time / end_time 展示，不用 period 反推区间。
 */
export function screenPeriodLabel(meta = {}, t) {
  const period = meta.period
  if (period === 'custom') {
    const start = (meta.start_time || '').slice(0, 10)
    const end = (meta.end_time || '').slice(0, 10)
    return start && end ? `${start} ~ ${end}` : t('screen.periodCustom')
  }
  const map = { week: 'periodWeek', month: 'periodMonth', quarter: 'periodQuarter' }
  return t(`screen.${map[period] || 'periodMonth'}`)
}

/**
 * 「数据截至 HH:mm:ss」时间戳（Doc 37 §3.4）
 */
export function screenUpdatedTime(meta = {}) {
  const value = meta.generated_at || ''
  if (!value) return '-'
  return value.includes(' ') ? value.split(' ')[1] : value
}
