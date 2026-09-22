<template>
  <div class="ds">
    <!-- A 顶栏 -->
    <header class="ds-top">
      <div class="ds-top-left">
        <span class="ds-brand">{{ t('layout.brandTitle') }}</span>
        <span class="ds-sep">·</span>
        <span class="ds-title">{{ t('menu.controllerCost') }}</span>
        <span class="ds-period">{{ periodText }}</span>
      </div>
      <div class="ds-top-right">
        <span class="ds-updated">{{ t('screen.updatedAt') }} {{ updatedText }}</span>
        <span v-if="failing" class="ds-failing">{{ t('screen.refreshFailed') }}</span>
        <button class="ds-btn" :disabled="loading" @click="refresh">{{ t('commonTable.refresh') }}</button>
      </div>
    </header>

    <!-- B 顶部大数字卡 -->
    <section class="ds-kpis cols-6">
      <div class="ds-kpi">
        <div class="ds-kpi-value">{{ fmt(summary.total_calls) }}</div>
        <div class="ds-kpi-label">{{ t('costPanel.totalCalls') }}</div>
      </div>
      <div class="ds-kpi">
        <div class="ds-kpi-value">{{ fmtPct(summary.success_rate) }}</div>
        <div class="ds-kpi-label">{{ t('costPanel.successRate') }}</div>
      </div>
      <div class="ds-kpi">
        <div class="ds-kpi-value">{{ fmt(summary.est_tokens) }}</div>
        <div class="ds-kpi-label">
          {{ t('costPanel.estTokens') }}<span class="ds-tag">{{ t('screen.estimate') }}</span>
        </div>
      </div>
      <div class="ds-kpi">
        <div class="ds-kpi-value">{{ summary.price_configured === false ? '-' : fmtMoney(summary.est_cost) }}</div>
        <div class="ds-kpi-label">
          {{ t('costPanel.estCost') }}
          <span class="ds-tag">
            {{ summary.price_configured === false ? t('costPanel.priceNotConfigured') : t('screen.estimate') }}
          </span>
        </div>
      </div>
      <div class="ds-kpi">
        <div class="ds-kpi-value">
          {{ fmt(summary.equivalent_man_days) }}<span class="unit">{{ t('screen.manDays') }}</span>
        </div>
        <div class="ds-kpi-label">{{ t('valueReport.equivalentManDays') }}</div>
      </div>
      <div class="ds-kpi">
        <div class="ds-kpi-value">
          {{ fmt(summary.active_tokens) }}<span class="unit">/{{ fmt(summary.active_users) }}</span>
        </div>
        <div class="ds-kpi-label">{{ t('valueReport.activeTokens') }} / {{ t('valueReport.activeUsers') }}</div>
      </div>
    </section>

    <!-- C 趋势 / 排行 / 预算 -->
    <section class="ds-main">
      <div class="ds-panel">
        <div class="ds-panel-head">
          {{ t('costPanel.trendTitle') }}
          <span class="ds-panel-sub">{{ t('screen.byDay') }}</span>
        </div>
        <div class="ds-panel-body">
          <div class="ds-chart">
            <BaseChart v-if="hasTrend" :option="trendOption" height="100%" />
            <div v-else class="ds-empty">{{ t('screen.noData') }}</div>
          </div>
          <div v-if="trendNotes" class="ds-note">{{ trendNotes }}</div>
        </div>
      </div>

      <div class="ds-panel">
        <div class="ds-panel-head">{{ t('screen.rankTitle') }}</div>
        <div class="ds-panel-body">
          <div class="rk-cols">
            <div class="rk-col">
              <div class="ds-list-title">{{ t('screen.rankPlugins') }}</div>
              <div v-for="(row, index) in ranking.plugins" :key="`p-${index}`" class="rk-row">
                <span class="ds-name">{{ row.plugin_title || row.name || '-' }}</span>
                <span class="ds-num">{{ fmt(row.calls) }}</span>
              </div>
              <div v-if="!ranking.plugins.length" class="ds-empty left">{{ t('screen.noData') }}</div>
            </div>
            <div class="rk-col">
              <div class="ds-list-title">{{ t('screen.rankAgents') }}</div>
              <div v-for="(row, index) in ranking.agents" :key="`a-${index}`" class="rk-row">
                <span class="ds-name">{{ row.name || `#${row.token_id}` }}</span>
                <span class="ds-num">{{ fmt(row.calls) }}</span>
              </div>
              <div v-if="!ranking.agents.length" class="ds-empty left">{{ t('screen.noData') }}</div>
            </div>
            <div class="rk-col">
              <div class="ds-list-title">{{ t('screen.rankFailures') }}</div>
              <div v-for="(row, index) in ranking.failures" :key="`f-${index}`" class="rk-row">
                <span class="ds-name">{{ row.plugin }} · {{ row.method }}</span>
                <span class="ds-num">{{ row.failed }}/{{ row.calls }}</span>
              </div>
              <div v-if="!ranking.failures.length" class="ds-empty left">{{ t('screen.noData') }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="ds-panel">
        <div class="ds-panel-head">
          {{ t('screen.budgetTitle') }}
          <span class="ds-panel-sub">{{ budget.period || '-' }}</span>
        </div>
        <div class="ds-panel-body">
          <div v-if="budgetItems.length" class="ds-list">
            <div
              v-for="(item, index) in budgetItems"
              :key="`${item.scope_type}-${item.scope_id}-${index}`"
              class="ds-row"
            >
              <span class="ds-name">{{ scopeLabel(item.scope_type) }} · {{ item.scope_name || '-' }}</span>
              <span class="ds-num">
                {{ fmt(item.used_tokens) }} /
                {{ item.token_limit == null ? t('screen.notSetBudget') : fmt(item.token_limit) }}
              </span>
              <span class="ds-state" :class="stateClass(item.state)">{{ stateLabel(item) }}</span>
            </div>
          </div>
          <div v-else class="ds-empty left">{{ t('screen.noData') }}</div>
          <div v-if="budget.estimate_note" class="ds-note">{{ budget.estimate_note }}</div>
        </div>
      </div>
    </section>

    <!-- D 底栏：估算口径 + 口径说明 + 数据截至 -->
    <footer class="ds-foot">
      <span class="ds-foot-text">{{ summary.cost_note }}</span>
      <span class="ds-foot-text">{{ summary.estimate_note }}</span>
      <span v-if="dataBoundaryText" class="ds-foot-text">{{ dataBoundaryText }}</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BaseChart } from '@/components/charts'
import { getScreenCost } from '@/api/modules/gisScreen'
import { useScreenPolling, buildScreenQuery, screenPeriodLabel, screenUpdatedTime } from '@/composables/screen'
import { formatThousands, formatPercent } from '@/utils/format'

const { t } = useI18n()
const route = useRoute()

const data = ref(null)

const screenQuery = computed(() => buildScreenQuery(route.query))

const { loading, failing, refresh } = useScreenPolling(async () => {
  const res = await getScreenCost(screenQuery.value)
  data.value = res?.data || res || null
})

const meta = computed(() => data.value?.meta || {})
const summary = computed(() => data.value?.summary || {})
const trend = computed(() => data.value?.trend || {})
const budget = computed(() => data.value?.budget || {})
const ranking = computed(() => {
  const rank = data.value?.ranking || {}
  return {
    plugins: (rank.plugins || []).slice(0, 6),
    agents: (rank.agents || []).slice(0, 6),
    failures: (rank.failures || []).slice(0, 6)
  }
})
const budgetItems = computed(() => budget.value.items || [])
const trendPoints = computed(() => (Array.isArray(trend.value.points) ? trend.value.points : []))
const hasTrend = computed(() => trendPoints.value.length > 0)

const periodText = computed(() => screenPeriodLabel(meta.value, t))
const updatedText = computed(() => screenUpdatedTime(meta.value))

// 图注：趋势固定按日（Doc 35 §8.2），叠加接口下发的成本口径文案
const trendNotes = computed(() =>
  [t('screen.byDay'), trend.value.cost_note, trend.value.equivalent_note].filter(Boolean).join(' · ')
)

const dataBoundaryText = computed(() => {
  const list = meta.value.data_boundary
  if (!Array.isArray(list) || !list.length) return ''
  return `${t('screen.dataBoundary')}：${list.join(' · ')}`
})

// 调用次数（左轴）+ 估算成本（右轴）：calls 含失败、成本按配置单价估算
// 视觉：暗底霓虹——折线加 shadowBlur 发光，面积自上而下淡出（色值与 screen-theme.scss 对齐）
const NEON_BLUE = '#4D8DFF'
const NEON_GREEN = '#3FE0A8'

function areaFade(from, to) {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: from },
      { offset: 1, color: to }
    ]
  }
}

const trendOption = computed(() => {
  const points = trendPoints.value
  const axisLabel = { color: '#9DB2D0', fontSize: 12 }
  const nameTextStyle = { color: '#9DB2D0' }
  const splitLine = { lineStyle: { color: 'rgba(120,170,255,0.10)', type: 'dashed' } }
  const axisLine = { lineStyle: { color: 'rgba(120,170,255,0.28)' } }
  return {
    grid: { top: 34, left: 8, right: 8, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8,18,38,0.94)',
      borderColor: 'rgba(53,230,255,0.45)',
      textStyle: { color: '#E8F1FF' },
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(53,230,255,0.5)' } }
    },
    legend: { top: 0, right: 0, textStyle: { color: '#9DB2D0' }, itemWidth: 14, itemHeight: 8 },
    xAxis: {
      type: 'category',
      data: points.map((p) => p.date),
      axisLabel,
      axisLine,
      axisTick: { show: false }
    },
    yAxis: [
      { type: 'value', name: t('costPanel.metricCalls'), nameTextStyle, axisLabel, splitLine },
      {
        type: 'value',
        name: t('costPanel.metricCost'),
        nameTextStyle,
        axisLabel,
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: t('costPanel.metricCalls'),
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        symbolSize: 6,
        data: points.map((p) => p.calls),
        itemStyle: { color: NEON_BLUE, borderColor: '#081226', borderWidth: 1.5 },
        lineStyle: { width: 3, color: NEON_BLUE, shadowBlur: 14, shadowColor: 'rgba(77,141,255,0.85)' },
        areaStyle: { color: areaFade('rgba(77,141,255,0.40)', 'rgba(77,141,255,0)') }
      },
      {
        name: t('costPanel.metricCost'),
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbolSize: 6,
        data: points.map((p) => p.est_cost),
        itemStyle: { color: NEON_GREEN, borderColor: '#081226', borderWidth: 1.5 },
        lineStyle: { width: 3, color: NEON_GREEN, shadowBlur: 14, shadowColor: 'rgba(63,224,168,0.85)' }
      }
    ]
  }
})

// 预算三态：block 且未启用熔断只是告警，文案须与「已被熔断」区分（Doc 37 §3.5#5）
function stateLabel(item) {
  if (item.state === 'block') {
    return item.block_enabled ? t('screen.stateBlockedOn') : t('screen.stateBlockedOff')
  }
  if (item.state === 'warn') return t('costPanel.stateWarn')
  return t('costPanel.stateNormal')
}

function stateClass(state) {
  if (state === 'block') return 's-block'
  if (state === 'warn') return 's-warn'
  return ''
}

function scopeLabel(scope) {
  const map = {
    global: t('costPanel.scopeGlobal'),
    dept: t('costPanel.scopeDept'),
    token: t('costPanel.scopeToken')
  }
  return map[scope] || scope
}

function fmt(value) {
  return formatThousands(value)
}

function fmtPct(value) {
  return formatPercent(value)
}

// 金额保留两位小数（与 FDE 屏一致）
function fmtMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(2) : '-'
}
</script>

<style lang="scss" scoped>
// ---------- 页面补充样式（.ds-* 为全局大屏公共样式） ----------
.rk-cols {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: calc(14px * var(--s));
}

.rk-col {
  flex: 1;
  min-width: 0;
}

.rk-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(8px * var(--s));
  padding: calc(6px * var(--s)) 0;
  border-bottom: 1px dashed rgba(120, 170, 255, 0.1);
  font-size: calc(14px * var(--s));

  &:last-child {
    border-bottom: none;
  }
}
</style>
