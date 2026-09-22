<template>
  <div class="fde">
    <!-- A 顶栏：品牌 / 客户 / 周期 / 数据截至 / 刷新（Doc 37 §6.2） -->
    <header class="fde-top">
      <div class="top-left">
        <span class="brand">{{ t('layout.brandTitle') }}</span>
        <span class="sep">·</span>
        <span class="page-title">{{ t('fdeScreen.title') }}</span>
        <span v-if="customerName" class="customer">{{ customerName }}</span>
      </div>
      <div class="top-right">
        <span class="chip">{{ periodLabel }}</span>
        <span class="chip">
          <i class="dot sys"></i>{{ t('fdeScreen.sourceSystem') }}
          <i class="dot decl"></i>{{ t('fdeScreen.sourceDeclared') }}
        </span>
        <span class="updated">{{ t('fdeScreen.updatedAt') }} {{ updatedTime }}</span>
        <span v-if="failing" class="failing">{{ t('fdeScreen.refreshFailed') }}</span>
        <button class="refresh" :disabled="loading" @click="refresh">{{ t('fdeScreen.refresh') }}</button>
      </div>
    </header>

    <!-- B ①~⑤ 核心 KPI -->
    <section class="fde-kpis">
      <div class="kpi">
        <div class="kpi-label">{{ t('fdeScreen.kpiEquivalent') }}</div>
        <div class="kpi-value">
          {{ fmt(hero.equivalent_man_days) }}<span class="unit">{{ t('fdeScreen.unitManDays') }}</span>
        </div>
      </div>

      <div class="kpi">
        <div class="kpi-label">
          {{ t('fdeScreen.kpiSaving') }}<span class="tag">{{ t('fdeScreen.estimate') }}</span>
        </div>
        <div v-if="priceNotConfigured" class="kpi-value smaller muted">
          {{ t('fdeScreen.priceNotConfigured') }}
        </div>
        <div v-else class="kpi-value">¥{{ fmtDecimal(hero.est_cost) }}</div>
      </div>

      <div class="kpi">
        <div class="kpi-label">{{ t('fdeScreen.kpiCalls') }}</div>
        <div class="kpi-value">
          {{ fmt(hero.total_calls) }}<span class="slash">/</span>{{ fmtPct(hero.success_rate) }}
        </div>
      </div>

      <div class="kpi">
        <div class="kpi-label">{{ t('fdeScreen.kpiAdoption') }}</div>
        <div class="kpi-value">{{ fmtPct(hero.adoption_rate) }}</div>
      </div>

      <div class="kpi">
        <div class="kpi-label">{{ t('fdeScreen.kpiCoverage') }}</div>
        <div class="coverage">
          <div v-for="item in coverageItems" :key="item.key" class="cov">
            <b>{{ fmt(item.value) }}</b>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- C ⑥ 价值趋势 / ⑦ 场景价值榜 / ⑧ 成本与预算健康度 -->
    <section class="fde-row">
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title"><i class="idx">⑥</i>{{ t('fdeScreen.blockTrend') }}</span>
        </div>
        <div class="panel-body">
          <div v-if="hasTrend" class="chart-wrap">
            <BaseChart :option="trendOption" height="100%" />
          </div>
          <div v-else class="empty">{{ t('fdeScreen.noData') }}</div>
          <div v-if="trendNote" class="note">{{ trendNote }}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-title"><i class="idx">⑦</i>{{ t('fdeScreen.blockSceneRank') }}</span>
        </div>
        <div class="panel-body">
          <template v-if="sceneRank.length">
            <div class="rank-head">
              <span class="c-idx">#</span>
              <span class="c-name">{{ t('fdeScreen.colScene') }}</span>
              <span class="c-num">{{ t('fdeScreen.colCalls') }}</span>
              <span class="c-num">{{ t('fdeScreen.colSuccessRate') }}</span>
              <span class="c-num">{{ t('fdeScreen.colManDays') }}</span>
            </div>
            <div v-for="(row, index) in sceneRank" :key="`${row.name}-${index}`" class="rank-row">
              <span class="c-idx">{{ index + 1 }}</span>
              <span class="c-name" :title="row.plugin_title || row.name">{{ row.plugin_title || row.name || '-' }}</span>
              <span class="c-num">{{ fmt(row.calls) }}</span>
              <span class="c-num">{{ fmtPct(row.success_rate) }}</span>
              <span class="c-num strong">{{ fmt(row.equivalent_man_days) }}</span>
            </div>
          </template>
          <div v-else class="empty">{{ t('fdeScreen.noData') }}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-title"><i class="idx">⑧</i>{{ t('fdeScreen.blockCost') }}</span>
        </div>
        <div class="panel-body">
          <div class="stat-row">
            <div class="stat">
              <div class="stat-label">{{ t('fdeScreen.estTokens') }}<span class="tag">{{ t('fdeScreen.estimate') }}</span></div>
              <div class="stat-value">{{ fmt(cost.est_tokens) }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">{{ t('fdeScreen.estCost') }}<span class="tag">{{ t('fdeScreen.estimate') }}</span></div>
              <div class="stat-value">
                <template v-if="cost.price_configured === false">
                  <span class="muted">{{ t('fdeScreen.priceNotConfigured') }}</span>
                </template>
                <template v-else>¥{{ fmtDecimal(cost.est_cost) }}</template>
              </div>
            </div>
            <div class="stat">
              <div class="stat-label">{{ t('fdeScreen.budgetPeriod') }}</div>
              <div class="stat-value">{{ cost.budget_period || '-' }}</div>
            </div>
          </div>

          <div class="budget-state" :class="`s-${cost.budget_state || 'ok'}`">
            {{ budgetStateText(cost.budget_state, cost.budget_blocked) }}
          </div>

          <div v-if="budgetItems.length" class="budget-list">
            <div v-for="(item, index) in budgetItems" :key="`${item.scope_type}-${item.scope_id}-${index}`" class="budget-row">
              <span class="b-name">{{ scopeText(item) }}</span>
              <span class="b-usage">{{ fmt(item.used_tokens) }} / {{ item.token_limit == null ? t('fdeScreen.notSet') : fmt(item.token_limit) }}</span>
              <span class="b-state" :class="`s-${item.state || 'ok'}`">{{ budgetStateText(item.state, item.block_enabled) }}</span>
            </div>
          </div>
          <div v-else class="empty small">{{ t('fdeScreen.noBudget') }}</div>

          <div v-if="cost.cost_note" class="note">{{ cost.cost_note }}</div>
        </div>
      </div>
    </section>

    <!-- D ⑨ 采纳与使用深度 / ⑩ 质量与稳定性 / ⑪ 价值证明 -->
    <section class="fde-row">
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title"><i class="idx">⑨</i>{{ t('fdeScreen.blockAdoption') }}</span>
        </div>
        <div class="panel-body">
          <div class="stat-row wrap">
            <div class="stat">
              <div class="stat-label">{{ t('fdeScreen.activeTokens') }}</div>
              <div class="stat-value">{{ fmt(adoption.active_tokens) }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">{{ t('fdeScreen.activeUsers') }}</div>
              <div class="stat-value">{{ fmt(adoption.active_users) }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">{{ t('fdeScreen.adoptionRate') }}</div>
              <div class="stat-value">{{ fmtPct(adoption.adoption_rate) }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">{{ t('fdeScreen.declaredCalls') }}</div>
              <div class="stat-value">{{ fmt(adoption.declared_calls) }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">{{ t('fdeScreen.equivalentManDays') }}</div>
              <div class="stat-value">{{ fmt(adoption.equivalent_man_days) }}</div>
            </div>
          </div>

          <div class="two-col">
            <div class="mini">
              <div class="mini-title">{{ t('fdeScreen.topDepts') }}</div>
              <div v-for="(row, index) in topDepts" :key="`d-${index}`" class="mini-row">
                <span class="m-name" :title="row.name">{{ row.name || '-' }}</span>
                <span class="m-num">{{ fmt(row.calls) }}</span>
              </div>
              <div v-if="!topDepts.length" class="empty small">{{ t('fdeScreen.noData') }}</div>
            </div>
            <div class="mini">
              <div class="mini-title">{{ t('fdeScreen.topPlugins') }}</div>
              <div v-for="(row, index) in topPlugins" :key="`p-${index}`" class="mini-row">
                <span class="m-name" :title="row.name">{{ row.name || '-' }}</span>
                <span class="m-num">{{ fmt(row.calls) }}</span>
              </div>
              <div v-if="!topPlugins.length" class="empty small">{{ t('fdeScreen.noData') }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-title"><i class="idx">⑩</i>{{ t('fdeScreen.blockQuality') }}</span>
        </div>
        <div class="panel-body">
          <div class="quality-top">
            <div class="quality-rate">
              <div class="stat-label">{{ t('fdeScreen.successRate') }}</div>
              <div class="stat-value big">{{ fmtPct(quality.success_rate) }}</div>
            </div>
            <div class="quality-counts">
              <div class="qc"><span>{{ t('fdeScreen.successCalls') }}</span><b>{{ fmt(quality.success_calls) }}</b></div>
              <div class="qc"><span>{{ t('fdeScreen.evaluatedCalls') }}</span><b>{{ fmt(quality.evaluated_calls) }}</b></div>
              <div class="qc"><span>{{ t('fdeScreen.totalCalls') }}</span><b>{{ fmt(quality.total_calls) }}</b></div>
            </div>
          </div>

          <div class="err-row">
            <div v-for="item in errorItems" :key="item.key" class="err">
              <span class="err-label">{{ item.label }}</span>
              <span class="err-value">{{ fmt(item.value) }}</span>
            </div>
          </div>

          <div class="fail-title">{{ t('fdeScreen.failureTop') }}</div>
          <div v-if="failureTop.length" class="fail-list">
            <div v-for="(row, index) in failureTop" :key="`f-${index}`" class="fail-row">
              <span class="f-name" :title="`${row.plugin}.${row.method}`">{{ row.plugin }} · {{ row.method }}</span>
              <span class="f-num">{{ row.failed }}/{{ row.calls }}</span>
              <span class="f-rate">{{ fmtPct(row.fail_rate) }}</span>
            </div>
          </div>
          <div v-else class="empty small">{{ t('fdeScreen.failureTopEmpty') }}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">
            <i class="idx">⑪</i>{{ t('fdeScreen.blockProof') }}
            <i class="dot decl"></i><span class="proof-source">{{ t('fdeScreen.sourceDeclared') }}</span>
          </span>
        </div>
        <div class="panel-body">
          <div class="proof-grid">
            <div v-for="item in proofItems" :key="item.key" class="proof">
              <div class="proof-label">{{ item.label }}</div>
              <div v-if="item.value === null" class="proof-value pending">{{ t('fdeScreen.pending') }}</div>
              <div v-else class="proof-value">{{ item.value }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- E 底栏：口径图例 + 口径说明 + 数据截至 -->
    <footer class="fde-foot">
      <div class="legend">
        <span>{{ t('fdeScreen.legend') }}：</span>
        <i class="dot sys"></i><span>{{ t('fdeScreen.sourceSystem') }}</span>
        <i class="dot decl"></i><span>{{ t('fdeScreen.sourceDeclared') }}</span>
        <span class="sep">·</span>
        <span>{{ t('fdeScreen.legendEstimate') }}</span>
      </div>
      <div v-if="dataBoundaryText" class="boundary">{{ dataBoundaryText }}</div>
      <div class="foot-right">{{ t('fdeScreen.updatedAt') }} {{ updatedAtFull }}</div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { BaseChart } from '@/components/charts'
import { getScreenFde } from '@/api/modules/gisScreen'
import { useScreenPolling, buildScreenQuery } from '@/composables/screen'
import { formatThousands, formatPercent } from '@/utils/format'

const { t } = useI18n()
const route = useRoute()

const data = ref(null)

// 大屏区间由 URL query 决定（Doc 37 §2.2-3），未传时后端按 month 处理
const screenQuery = computed(() => buildScreenQuery(route.query))

const { loading, failing, refresh } = useScreenPolling(async () => {
  const res = await getScreenFde(screenQuery.value)
  data.value = res?.data || res || null
})

// ---------- 区块取值 ----------
const meta = computed(() => data.value?.meta || {})
const hero = computed(() => data.value?.hero || {})
const trend = computed(() => data.value?.trend || {})
const cost = computed(() => data.value?.cost || {})
const adoption = computed(() => data.value?.adoption || {})
const quality = computed(() => data.value?.quality || {})

const customerName = computed(() => meta.value.customer_name || '')
const updatedAtFull = computed(() => meta.value.generated_at || '-')
const updatedTime = computed(() => {
  const value = meta.value.generated_at || ''
  return value.includes(' ') ? value.split(' ')[1] : (value || '-')
})

// 口径说明：三屏统一由 meta.data_boundary 下发（Doc 37 一·注）
const dataBoundaryText = computed(() => {
  const list = meta.value.data_boundary
  if (!Array.isArray(list) || !list.length) return ''
  return `${t('screen.dataBoundary')}：${list.join(' · ')}`
})

const periodLabel = computed(() => {
  const period = meta.value.period
  if (period === 'custom') {
    const start = (meta.value.start_time || '').slice(0, 10)
    const end = (meta.value.end_time || '').slice(0, 10)
    return start && end ? `${start} ~ ${end}` : t('fdeScreen.periodCustom')
  }
  const map = { week: 'periodWeek', month: 'periodMonth', quarter: 'periodQuarter' }
  return t(`fdeScreen.${map[period] || 'periodMonth'}`)
})

// ②/⑧ 未配置单价：est_cost 按 0 计，界面必须提示「未配置单价」，不得显示 ¥0
const priceNotConfigured = computed(() => hero.value.price_configured === false)

const coverageItems = computed(() => {
  const coverage = hero.value.coverage || {}
  return [
    { key: 'depts', value: coverage.depts, label: t('fdeScreen.coverageDepts') },
    { key: 'plugins', value: coverage.plugins, label: t('fdeScreen.coveragePlugins') },
    { key: 'mcp_tools', value: coverage.mcp_tools, label: t('fdeScreen.coverageMcpTools') },
    { key: 'users', value: coverage.users, label: t('fdeScreen.coverageUsers') }
  ]
})

const sceneRank = computed(() => (Array.isArray(data.value?.scene_rank) ? data.value.scene_rank : []))
const budgetItems = computed(() => (Array.isArray(cost.value.budget_items) ? cost.value.budget_items : []))
const topDepts = computed(() => (adoption.value.top_depts || []).slice(0, 3))
const topPlugins = computed(() => (adoption.value.top_plugins || []).slice(0, 3))
const failureTop = computed(() => (Array.isArray(quality.value.failure_top) ? quality.value.failure_top : []))

const trendNote = computed(() => trend.value.equivalent_note || '')

const errorItems = computed(() => {
  const breakdown = quality.value.error_breakdown || {}
  return [
    { key: 'param_error', value: breakdown.param_error, label: t('fdeScreen.errorParam') },
    { key: 'perm_denied', value: breakdown.perm_denied, label: t('fdeScreen.errorPerm') },
    { key: 'system_error', value: breakdown.system_error, label: t('fdeScreen.errorSystem') }
  ]
})

// ⑪ 价值证明：必须保留 4 个指标位，null → 灰色「待接入」（§6.5，不使用 '-'）
const proofItems = computed(() => {
  const phase2 = data.value?.phase2 || {}
  const raw = [
    { key: 'handover_rate', label: t('fdeScreen.handoverRate'), value: formatPercent(phase2.handover_rate) },
    { key: 'cycle_compression', label: t('fdeScreen.cycleCompression'), value: formatPercent(phase2.cycle_compression) },
    { key: 'asset_count', label: t('fdeScreen.assetCount'), value: formatThousands(phase2.asset_count) },
    {
      key: 'ttv',
      label: t('fdeScreen.ttv'),
      value: phase2.ttv == null ? '-' : `${phase2.ttv} ${t('fdeScreen.unitDays')}`
    }
  ]
  return raw.map((item) => ({ ...item, value: item.value === '-' ? null : item.value }))
})

// ---------- ⑥ 价值趋势：人天 + 调用量双轴（同一点内 calls 含失败、人天只算成功） ----------
const trendPoints = computed(() => (Array.isArray(trend.value.points) ? trend.value.points : []))
const hasTrend = computed(() => trendPoints.value.length > 0)

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
      { type: 'value', name: t('fdeScreen.chartManDays'), nameTextStyle, axisLabel, splitLine },
      {
        type: 'value',
        name: t('fdeScreen.chartCalls'),
        nameTextStyle,
        axisLabel,
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: t('fdeScreen.chartManDays'),
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        symbolSize: 6,
        data: points.map((p) => p.equivalent_man_days),
        itemStyle: { color: NEON_BLUE, borderColor: '#081226', borderWidth: 1.5 },
        lineStyle: { width: 3, color: NEON_BLUE, shadowBlur: 14, shadowColor: 'rgba(77,141,255,0.85)' },
        areaStyle: { color: areaFade('rgba(77,141,255,0.40)', 'rgba(77,141,255,0)') }
      },
      {
        name: t('fdeScreen.chartCalls'),
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbolSize: 6,
        data: points.map((p) => p.calls),
        itemStyle: { color: NEON_GREEN, borderColor: '#081226', borderWidth: 1.5 },
        lineStyle: { width: 3, color: NEON_GREEN, shadowBlur: 14, shadowColor: 'rgba(63,224,168,0.85)' }
      }
    ]
  }
})

// ---------- 格式化 ----------
function fmt(value) {
  return formatThousands(value)
}

function fmtPct(value) {
  return formatPercent(value)
}

// 金额保留两位小数（大屏不自行换算单位）
function fmtDecimal(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(2) : '-'
}

// 预算三态文案：block + 未启用熔断 = 只是告警，不能写成「已被熔断」（§3.5#5）
function budgetStateText(state, blocked) {
  if (state === 'block') {
    return blocked ? t('fdeScreen.stateBlockedOn') : t('fdeScreen.stateBlockedOff')
  }
  if (state === 'warn') return t('fdeScreen.stateWarn')
  if (state === 'ok') return t('fdeScreen.stateOk')
  return '-'
}

function scopeText(item) {
  const scope = { global: t('fdeScreen.scopeGlobal'), dept: t('fdeScreen.scopeDept'), token: t('fdeScreen.scopeToken') }
  const type = scope[item.scope_type] || item.scope_type || ''
  return type ? `${type} · ${item.scope_name || '-'}` : (item.scope_name || '-')
}
</script>

<style lang="scss" scoped>
// 深色大屏：基准 1920×1080，2560×1440 等比放大（Doc 37 §3.6）
// --s 为缩放倍数，字号最小 14px @1080p，两种分辨率下均不出现纵向滚动条
// 霓虹视觉层与 .ds-* 共用 styles/screen-theme.scss，避免两套大屏样式漂移
@use '@/styles/screen-theme.scss' as tech;

@keyframes fde-top-flow {
  0% {
    background-position: 0% 0;
  }

  100% {
    background-position: 200% 0;
  }
}

.fde {
  --s: 1;
  height: 100%;
  padding: calc(12px * var(--s)) calc(20px * var(--s));
  display: grid;
  grid-template-rows:
    calc(72px * var(--s))
    calc(172px * var(--s))
    calc(316px * var(--s))
    minmax(0, 1fr)
    calc(52px * var(--s));
  gap: calc(12px * var(--s));
  overflow: hidden;
  color: #e6edf7;
  font-size: calc(14px * var(--s));

  @media (min-width: 2200px) {
    --s: 1.3333;
  }
}

// ---------- A 顶栏 ----------
.fde-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(16px * var(--s));
  padding: 0 calc(8px * var(--s));
  border-bottom: 1px solid tech.$line-soft;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(-1px * var(--s));
    height: 2px;
    background: linear-gradient(
      90deg,
      rgba(53, 230, 255, 0) 0%,
      rgba(53, 230, 255, 0.75) 18%,
      rgba(77, 141, 255, 0.9) 50%,
      rgba(53, 230, 255, 0.75) 82%,
      rgba(53, 230, 255, 0) 100%
    );
    background-size: 200% 100%;
    animation: fde-top-flow 9s linear infinite;
    pointer-events: none;
  }
}

.top-left {
  display: flex;
  align-items: baseline;
  gap: calc(10px * var(--s));
  min-width: 0;
}

.brand {
  position: relative;
  padding-left: calc(22px * var(--s));
  font-size: calc(22px * var(--s));
  font-weight: 600;
  letter-spacing: calc(1.5px * var(--s));
  color: tech.$t1;
  text-shadow: 0 0 calc(20px * var(--s)) rgba(53, 230, 255, 0.5);

  &::before {
    content: '';
    position: absolute;
    left: calc(4px * var(--s));
    top: 50%;
    width: calc(10px * var(--s));
    height: calc(10px * var(--s));
    background: linear-gradient(135deg, tech.$c-cyan 0%, tech.$c-blue 100%);
    box-shadow: 0 0 calc(14px * var(--s)) rgba(53, 230, 255, 0.95);
    transform: translateY(-50%) rotate(45deg);
  }
}

.sep {
  color: rgba(77, 141, 255, 0.55);
}

.page-title {
  font-size: calc(20px * var(--s));
  letter-spacing: calc(1px * var(--s));
  color: #d8e8ff;
}

.customer {
  margin-left: calc(8px * var(--s));
  padding: calc(2px * var(--s)) calc(14px * var(--s));
  border: 1px solid rgba(53, 230, 255, 0.42);
  border-radius: calc(3px * var(--s));
  background: rgba(24, 48, 96, 0.42);
  box-shadow: 0 0 calc(14px * var(--s)) calc(-6px * var(--s)) rgba(53, 230, 255, 0.85);
  font-size: calc(15px * var(--s));
  color: tech.$c-cyan;
}

.top-right {
  display: flex;
  align-items: center;
  gap: calc(14px * var(--s));
  flex-shrink: 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: calc(6px * var(--s));
  padding: calc(4px * var(--s)) calc(13px * var(--s));
  color: #cfe0f5;
  font-size: calc(14px * var(--s));
  @include tech.glass-chip;

  border-radius: calc(3px * var(--s));
}

.dot {
  width: calc(9px * var(--s));
  height: calc(9px * var(--s));
  border-radius: 50%;
  display: inline-block;
  margin: 0 calc(4px * var(--s));

  &.sys {
    background: tech.$c-cyan;
    box-shadow: 0 0 calc(10px * var(--s)) rgba(53, 230, 255, 0.9);
  }

  &.decl {
    border: 2px solid tech.$c-amber;
    background: transparent;
    box-shadow: 0 0 calc(10px * var(--s)) rgba(255, 192, 97, 0.6);
  }
}

.updated {
  color: tech.$t2;
  font-variant-numeric: tabular-nums;
}

.failing {
  color: tech.$c-amber;
  text-shadow: 0 0 calc(14px * var(--s)) rgba(255, 192, 97, 0.7);
}

.refresh {
  padding: calc(6px * var(--s)) calc(18px * var(--s));
  font-size: calc(14px * var(--s));
  letter-spacing: calc(0.5px * var(--s));
  cursor: pointer;
  @include tech.neon-button;

  &:disabled {
    cursor: default;
  }
}

// ---------- B KPI ----------
.fde-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr 1fr 1.6fr;
  gap: calc(12px * var(--s));
  min-width: 0;
}

.kpi {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(10px * var(--s));
  padding: calc(18px * var(--s)) calc(20px * var(--s));
  @include tech.kpi-card;
}

.kpi-label {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: calc(6px * var(--s));
  color: tech.$t2;
  font-size: calc(15px * var(--s));
}

.kpi-value {
  position: relative;
  z-index: 1;
  font-size: calc(42px * var(--s));
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  @include tech.value-num;

  &.smaller {
    font-size: calc(22px * var(--s));
    font-weight: 400;
    text-shadow: none;
  }

  .unit {
    margin-left: calc(6px * var(--s));
    font-size: calc(17px * var(--s));
    color: tech.$t2;
    font-weight: 400;
    text-shadow: none;
  }

  .slash {
    margin: 0 calc(6px * var(--s));
    color: rgba(77, 141, 255, 0.5);
    text-shadow: none;
  }
}

.muted {
  color: tech.$t2 !important;
}

.tag {
  padding: calc(1px * var(--s)) calc(7px * var(--s));
  border: 1px solid rgba(255, 192, 97, 0.32);
  border-radius: calc(3px * var(--s));
  background: rgba(255, 192, 97, 0.14);
  color: tech.$c-amber;
  font-size: calc(12px * var(--s));
}

.coverage {
  display: flex;
  gap: calc(18px * var(--s));
}

.cov {
  display: flex;
  flex-direction: column;
  gap: calc(2px * var(--s));

  b {
    font-size: calc(30px * var(--s));
    @include tech.value-num;

    text-shadow: 0 0 calc(14px * var(--s)) rgba(53, 230, 255, 0.3);
  }

  span {
    font-size: calc(14px * var(--s));
    color: tech.$t2;
  }
}

// ---------- C / D 区块 ----------
.fde-row {
  display: grid;
  grid-template-columns: 1.25fr 1fr 1.15fr;
  gap: calc(12px * var(--s));
  min-height: 0;
}

.panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  @include tech.panel;
}

.panel-head {
  flex-shrink: 0;
  padding: calc(13px * var(--s)) calc(16px * var(--s)) calc(9px * var(--s));
  @include tech.panel-head;
}

.panel-title {
  display: inline-flex;
  align-items: center;
  gap: calc(6px * var(--s));
  font-size: calc(17px * var(--s));
  font-weight: 600;
  color: tech.$t1;
}

.idx {
  font-style: normal;
  color: tech.$c-cyan;
  text-shadow: 0 0 calc(12px * var(--s)) rgba(53, 230, 255, 0.85);
}

.proof-source {
  color: tech.$t3;
  font-size: calc(13px * var(--s));
  font-weight: 400;
}

.panel-body {
  flex: 1;
  min-height: 0;
  padding: calc(12px * var(--s)) calc(16px * var(--s));
  display: flex;
  flex-direction: column;
  gap: calc(10px * var(--s));
  overflow: hidden;
}

.chart-wrap {
  flex: 1;
  min-height: 0;
}

.note {
  flex-shrink: 0;
  font-size: calc(12px * var(--s));
  color: tech.$t3;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: tech.$t3;

  &.small {
    flex: none;
    justify-content: flex-start;
    font-size: calc(13px * var(--s));
  }
}

// ---------- ⑦ 场景价值榜 ----------
.rank-head,
.rank-row {
  display: grid;
  grid-template-columns: calc(30px * var(--s)) minmax(0, 1fr) calc(80px * var(--s)) calc(70px * var(--s)) calc(80px * var(--s));
  align-items: center;
  gap: calc(8px * var(--s));
}

.rank-head {
  flex-shrink: 0;
  color: tech.$t3;
  font-size: calc(13px * var(--s));
  padding-bottom: calc(6px * var(--s));
  border-bottom: 1px solid tech.$line;
}

.rank-row {
  flex-shrink: 0;
  padding: calc(9px * var(--s)) 0;
  border-bottom: 1px dashed rgba(120, 170, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }
}

.c-idx {
  color: tech.$c-cyan;
  font-family: tech.$num-font;
  font-weight: 600;
  text-shadow: 0 0 calc(10px * var(--s)) rgba(53, 230, 255, 0.7);
}

.c-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #dbe7f7;
}

.c-num {
  text-align: right;
  color: #c3d3e8;
  font-family: tech.$num-font;
  font-variant-numeric: tabular-nums;

  &.strong {
    color: tech.$c-green;
    font-weight: 600;
    text-shadow: 0 0 calc(12px * var(--s)) rgba(63, 224, 168, 0.55);
  }
}

// ---------- ⑧ 成本与预算 ----------
.stat-row {
  display: flex;
  gap: calc(20px * var(--s));

  &.wrap {
    flex-wrap: wrap;
    gap: calc(14px * var(--s)) calc(24px * var(--s));
  }
}

.stat {
  min-width: 0;

  .stat-label {
    display: flex;
    align-items: center;
    gap: calc(4px * var(--s));
    font-size: calc(13px * var(--s));
    color: tech.$t2;
  }

  .stat-value {
    margin-top: calc(2px * var(--s));
    font-size: calc(24px * var(--s));
    @include tech.value-num;

    text-shadow: 0 0 calc(14px * var(--s)) rgba(53, 230, 255, 0.3);
  }
}

.budget-state {
  flex-shrink: 0;
  align-self: flex-start;
  padding: calc(3px * var(--s)) calc(13px * var(--s));
  border: 1px solid rgba(63, 224, 168, 0.32);
  border-radius: calc(3px * var(--s));
  font-size: calc(14px * var(--s));
  background: rgba(63, 224, 168, 0.16);
  color: tech.$c-green;

  &.s-warn {
    border-color: rgba(255, 192, 97, 0.34);
    background: rgba(255, 192, 97, 0.16);
    color: tech.$c-amber;
  }

  &.s-block {
    border-color: rgba(255, 192, 97, 0.5);
    background: rgba(255, 192, 97, 0.24);
    color: #ffd28a;
  }
}

.budget-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.budget-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: calc(10px * var(--s));
  padding: calc(7px * var(--s)) 0;
  border-bottom: 1px dashed rgba(120, 170, 255, 0.1);
  font-size: calc(14px * var(--s));

  &:last-child {
    border-bottom: none;
  }
}

.b-name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #dbe7f7;
}

.b-usage {
  color: tech.$t2;
  font-family: tech.$num-font;
  font-variant-numeric: tabular-nums;
}

.b-state {
  padding: calc(1px * var(--s)) calc(9px * var(--s));
  border: 1px solid rgba(63, 224, 168, 0.3);
  border-radius: calc(3px * var(--s));
  color: tech.$c-green;
  background: rgba(63, 224, 168, 0.14);
  font-size: calc(13px * var(--s));

  &.s-warn {
    border-color: rgba(255, 192, 97, 0.32);
    color: tech.$c-amber;
    background: rgba(255, 192, 97, 0.16);
  }

  &.s-block {
    border-color: rgba(255, 192, 97, 0.48);
    color: #ffd28a;
    background: rgba(255, 192, 97, 0.24);
  }
}

// ---------- ⑨ 采纳与使用深度 ----------
.two-col {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(16px * var(--s));
  overflow: hidden;
}

.mini {
  min-width: 0;
}

.mini-title {
  margin-bottom: calc(6px * var(--s));
  font-size: calc(13px * var(--s));
  color: tech.$t3;
  @include tech.list-title;
}

.mini-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(8px * var(--s));
  padding: calc(5px * var(--s)) 0;
  font-size: calc(14px * var(--s));

  .m-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: #dbe7f7;
  }

  .m-num {
    color: #c3d3e8;
    font-family: tech.$num-font;
    font-variant-numeric: tabular-nums;
  }
}

// ---------- ⑩ 质量与稳定性 ----------
.quality-top {
  display: flex;
  align-items: flex-end;
  gap: calc(24px * var(--s));
}

.quality-rate {
  .stat-label {
    font-size: calc(13px * var(--s));
    color: tech.$t2;
  }

  .stat-value {
    font-size: calc(40px * var(--s));
    line-height: 1.1;
    @include tech.value-num;

    color: tech.$c-green;
    text-shadow: 0 0 calc(20px * var(--s)) rgba(63, 224, 168, 0.55);

    &.big {
      font-size: calc(40px * var(--s));
    }
  }
}

.quality-counts {
  display: flex;
  gap: calc(18px * var(--s));
  padding-bottom: calc(6px * var(--s));

  .qc {
    display: flex;
    flex-direction: column;

    span {
      font-size: calc(13px * var(--s));
      color: tech.$t2;
    }

    b {
      font-size: calc(19px * var(--s));
      color: #dbe7f7;
      font-family: tech.$num-font;
      font-variant-numeric: tabular-nums;
    }
  }
}

.err-row {
  display: flex;
  gap: calc(10px * var(--s));
}

.err {
  flex: 1;
  min-width: 0;
  padding: calc(6px * var(--s)) calc(10px * var(--s));
  border: 1px solid tech.$line;
  border-radius: calc(3px * var(--s));
  background: rgba(24, 48, 96, 0.34);

  .err-label {
    display: block;
    font-size: calc(12px * var(--s));
    color: tech.$t3;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .err-value {
    font-size: calc(18px * var(--s));
    color: tech.$c-amber;
    font-family: tech.$num-font;
    font-weight: 600;
    text-shadow: 0 0 calc(12px * var(--s)) rgba(255, 192, 97, 0.5);
  }
}

.fail-title {
  flex-shrink: 0;
  font-size: calc(13px * var(--s));
  color: tech.$t3;
}

.fail-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.fail-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto calc(60px * var(--s));
  align-items: center;
  gap: calc(8px * var(--s));
  padding: calc(6px * var(--s)) 0;
  font-size: calc(14px * var(--s));
  border-bottom: 1px dashed rgba(120, 170, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }

  .f-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: #dbe7f7;
  }

  .f-num {
    color: tech.$t2;
    font-family: tech.$num-font;
    font-variant-numeric: tabular-nums;
  }

  .f-rate {
    text-align: right;
    color: tech.$c-amber;
    font-family: tech.$num-font;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 calc(10px * var(--s)) rgba(255, 192, 97, 0.45);
  }
}

// ---------- ⑪ 价值证明 ----------
.proof-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: calc(12px * var(--s));
}

.proof {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(6px * var(--s));
  padding: calc(14px * var(--s)) calc(16px * var(--s));
  border: 1px solid tech.$line;
  border-radius: calc(3px * var(--s));
  background: linear-gradient(180deg, rgba(24, 48, 96, 0.4) 0%, rgba(8, 17, 36, 0.28) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);

  &::before {
    content: '';
    position: absolute;
    left: calc(16px * var(--s));
    top: 0;
    width: calc(24px * var(--s));
    height: 2px;
    background: linear-gradient(90deg, tech.$c-cyan 0%, rgba(53, 230, 255, 0) 100%);
  }
}

.proof-label {
  font-size: calc(13px * var(--s));
  color: tech.$t2;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.proof-value {
  font-size: calc(26px * var(--s));
  @include tech.value-num;

  text-shadow: 0 0 calc(14px * var(--s)) rgba(53, 230, 255, 0.3);

  &.pending {
    font-size: calc(20px * var(--s));
    font-weight: 400;
    color: tech.$t3;
    text-shadow: none;
  }
}

// ---------- E 底栏 ----------
.fde-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(16px * var(--s));
  padding: 0 calc(8px * var(--s));
  border-top: 1px solid tech.$line-soft;
  color: tech.$t3;
  font-size: calc(14px * var(--s));

  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -1px;
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(53, 230, 255, 0) 0%,
      rgba(53, 230, 255, 0.55) 50%,
      rgba(53, 230, 255, 0) 100%
    );
    pointer-events: none;
  }
}

.legend {
  display: inline-flex;
  align-items: center;
  gap: calc(6px * var(--s));
  flex-shrink: 0;
}

// 口径说明：单行省略，不引入滚动条
.boundary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: tech.$t3;
}

.foot-right {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

// 顶栏流光属纯装饰，用户关闭动效时直接停掉
@media (prefers-reduced-motion: reduce) {
  .fde-top::after {
    animation: none;
  }
}
</style>
