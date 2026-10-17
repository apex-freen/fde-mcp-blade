<template>
  <div class="ds">
    <!-- A 顶栏：品牌 / 周期 / 数据截至 / 刷新（Doc 37 §3.4） -->
    <header class="ds-top">
      <div class="ds-top-left">
        <span class="ds-brand">{{ t('layout.brandTitle') }}</span>
        <span class="ds-sep">·</span>
        <span class="ds-title">{{ t('menu.controllerReport') }}</span>
        <span class="ds-period">{{ periodText }}</span>
      </div>
      <div class="ds-top-right">
        <span class="ds-updated">{{ t('screen.updatedAt') }} {{ updatedText }}</span>
        <span v-if="failing" class="ds-failing">{{ t('screen.refreshFailed') }}</span>
        <button class="ds-btn" :disabled="loading" @click="refresh">{{ t('commonTable.refresh') }}</button>
      </div>
    </header>

    <!-- B 一页摘要：5 项指标（顺序固定 3 / 10 / 4 / 6 / 2，由后端给定） -->
    <section class="ds-kpis">
      <div v-for="item in summary" :key="item.code" class="ds-kpi">
        <div class="ds-kpi-value">{{ item.display || item.value }}</div>
        <div class="ds-kpi-label" :class="{ disabled: item.enabled === false }">{{ item.name }}</div>
      </div>
      <div v-if="!summary.length" class="ds-kpi">
        <div class="ds-kpi-value smaller">{{ t('screen.noData') }}</div>
        <div class="ds-kpi-label">{{ t('valueReport.summaryTitle') }}</div>
      </div>
    </section>

    <!-- C 五个区块：采纳与使用 / 质量与安全 / 效率与部署 / 指标定义（12 项）/ 下期建议 -->
    <section class="ds-main cols-5">
      <!-- 采纳与使用 -->
      <div class="ds-panel">
        <div class="ds-panel-head">{{ t('screen.adoptionBlock') }}</div>
        <div class="ds-panel-body">
          <div class="ds-stats">
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('valueReport.activeTokens') }}</div>
              <div class="ds-stat-value">{{ fmt(adoption.active_tokens) }}</div>
            </div>
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('valueReport.activeUsers') }}</div>
              <div class="ds-stat-value">{{ fmt(adoption.active_users) }}</div>
            </div>
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('valueReport.adoptionRate') }}</div>
              <div class="ds-stat-value">{{ fmtPct(adoption.adoption_rate) }}</div>
            </div>
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('valueReport.declaredCalls') }}</div>
              <div class="ds-stat-value">{{ fmt(adoption.declared_calls) }}</div>
            </div>
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('valueReport.equivalentManDays') }}</div>
              <div class="ds-stat-value">{{ fmt(adoption.equivalent_man_days) }}</div>
            </div>
          </div>
          <div class="ds-list">
            <div class="ds-list-title">{{ t('screen.topDepts') }}</div>
            <div v-for="(row, index) in topDepts" :key="`d-${index}`" class="ds-row two-col">
              <span class="ds-name">{{ row.name || '-' }}</span>
              <span class="ds-num">{{ fmt(row.calls) }}</span>
            </div>
            <div v-if="!topDepts.length" class="ds-empty left">{{ t('screen.noData') }}</div>
          </div>
          <div class="ds-list">
            <div class="ds-list-title">{{ t('screen.topPlugins') }}</div>
            <div v-for="(row, index) in topPlugins" :key="`p-${index}`" class="ds-row two-col">
              <span class="ds-name">{{ row.name || '-' }}</span>
              <span class="ds-num">{{ fmt(row.calls) }}</span>
            </div>
            <div v-if="!topPlugins.length" class="ds-empty left">{{ t('screen.noData') }}</div>
          </div>
        </div>
      </div>

      <!-- 质量与安全 -->
      <div class="ds-panel">
        <div class="ds-panel-head">{{ t('screen.qualityBlock') }}</div>
        <div class="ds-panel-body">
          <div class="ds-stats">
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('screen.successRate') }}</div>
              <div class="ds-stat-value strong">{{ fmtPct(quality.success_rate) }}</div>
            </div>
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('screen.successCalls') }}</div>
              <div class="ds-stat-value">{{ fmt(quality.success_calls) }}</div>
            </div>
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('screen.evaluatedCalls') }}</div>
              <div class="ds-stat-value">{{ fmt(quality.evaluated_calls) }}</div>
            </div>
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('screen.totalCalls') }}</div>
              <div class="ds-stat-value">{{ fmt(quality.total_calls) }}</div>
            </div>
          </div>
          <!-- 失败分类：error_breakdown 固定 8 个 key，其中 pending_approval 属「人工环节（待办）」，
               不是失败 → 从失败分类里摘出，见下方人工环节区块 -->
          <div class="err-breakdown">
            <div class="ds-list-title">{{ t('screen.errorBreakdown') }}</div>
            <div class="err-grid">
              <div v-for="item in failureItems" :key="item.key" class="err-cell">
                <span class="err-name">{{ item.label }}</span>
                <span class="err-num">{{ fmt(item.value) }}</span>
              </div>
            </div>
          </div>
          <!-- 人工环节（待办）：pending_approval = 待办次数，不是失败 -->
          <div class="ds-list">
            <div class="ds-list-title">{{ t('callOutcome.handoverTodo') }}</div>
            <div class="ds-row two-col">
              <span class="ds-name">{{ pendingItem.label }}</span>
              <span class="ds-num pending-num">{{ fmt(pendingItem.value) }}</span>
            </div>
          </div>
          <div class="ds-list">
            <div class="ds-list-title">{{ t('screen.handoverRate') }}</div>
            <div class="ds-row three-col">
              <span class="ds-name">{{ t('screen.handoverApprovals') }}</span>
              <span class="ds-num">{{ fmt(handover.approvals) }}</span>
              <span class="ds-num strong">{{ fmtPct(handover.handover_rate) }}</span>
            </div>
            <div class="ds-row two-col">
              <span class="ds-name">{{ t('screen.handoverEdited') }}</span>
              <span class="ds-num">{{ fmt(handover.edited) }}</span>
            </div>
            <div class="ds-row two-col">
              <span class="ds-name">{{ t('screen.correctionRate') }}</span>
              <span class="ds-num">{{ fmtPct(handover.correction_rate) }}</span>
            </div>
            <div class="ds-row two-col">
              <span class="ds-name">{{ t('screen.shadowPassRate') }}</span>
              <span class="ds-num">{{ fmtPct(shadow.pass_rate) }}</span>
            </div>
            <div class="ds-row two-col">
              <span class="ds-name">{{ t('screen.approved') }} / {{ t('screen.rejected') }}</span>
              <span class="ds-num">{{ fmt(approval.approved) }} / {{ fmt(approval.rejected) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 效率与部署 -->
      <div class="ds-panel">
        <div class="ds-panel-head">{{ t('screen.efficiencyBlock') }}</div>
        <div class="ds-panel-body">
          <div class="ds-stats">
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('screen.pluginOnlineHours') }}</div>
              <div class="ds-stat-value">
                {{ fmtDecimal(pluginOnline.avg_hours) }}<span class="unit">{{ t('screen.hourUnit') }}</span>
              </div>
            </div>
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('screen.deployTotal') }}</div>
              <div class="ds-stat-value">{{ fmt(deploy.total) }}</div>
            </div>
            <div class="ds-stat">
              <div class="ds-stat-label">{{ t('screen.hotRatio') }}</div>
              <div class="ds-stat-value">{{ fmtPct(deploy.hot_ratio) }}</div>
            </div>
          </div>
          <div class="ds-list">
            <div class="ds-list-title">{{ t('screen.deployTotal') }}</div>
            <div class="ds-row two-col">
              <span class="ds-name">install</span>
              <span class="ds-num">{{ fmt(deploy.install) }}</span>
            </div>
            <div class="ds-row two-col">
              <span class="ds-name">update</span>
              <span class="ds-num">{{ fmt(deploy.update) }}</span>
            </div>
            <div class="ds-row two-col">
              <span class="ds-name">uninstall</span>
              <span class="ds-num">{{ fmt(deploy.uninstall) }}</span>
            </div>
          </div>
          <div class="ds-list">
            <div class="ds-list-title">{{ t('screen.callTrendTitle') }}</div>
            <div class="ds-row four-col ds-row-head">
              <span class="ds-name">{{ t('screen.colDate') }}</span>
              <span class="ds-num">{{ t('screen.totalCalls') }}</span>
              <span class="ds-num">{{ t('screen.successCalls') }}</span>
              <span class="ds-num">{{ t('screen.successRate') }}</span>
            </div>
            <div v-for="(row, index) in callTrend" :key="`c-${index}`" class="ds-row four-col">
              <span class="ds-name">{{ row.date }}</span>
              <span class="ds-num">{{ fmt(row.calls) }}</span>
              <span class="ds-num strong">{{ fmt(row.success) }}</span>
              <span class="ds-num strong">{{ trendRate(row) }}</span>
            </div>
            <div v-if="!callTrend.length" class="ds-empty left">{{ t('screen.noData') }}</div>
          </div>
        </div>
      </div>

      <!-- 指标定义（12 项） -->
      <div class="ds-panel">
        <div class="ds-panel-head">{{ t('screen.metricsBlock') }}</div>
        <div class="ds-panel-body">
          <div class="metric-grid">
            <div
              v-for="item in metrics"
              :key="item.code"
              class="metric"
              :class="{ disabled: item.enabled === false }"
            >
              <div class="metric-name">
                <span class="metric-code">{{ item.code }}</span>{{ item.name }}
              </div>
              <div class="metric-value">{{ item.display || item.value }}</div>
            </div>
          </div>
          <div v-if="!metrics.length" class="ds-empty left">{{ t('screen.noData') }}</div>
        </div>
      </div>

      <!-- 下期建议 -->
      <div class="ds-panel">
        <div class="ds-panel-head">{{ t('valueReport.suggestionsTitle') }}</div>
        <div class="ds-panel-body">
          <div v-if="suggestions.length" class="ds-list">
            <div v-for="(text, index) in suggestions" :key="index" class="sg-row">
              <span class="sg-idx">{{ index + 1 }}</span>
              <span class="sg-text">{{ text }}</span>
            </div>
          </div>
          <div v-else class="ds-empty">{{ t('valueReport.noSuggestions') }}</div>
        </div>
      </div>
    </section>

    <!-- D 底栏：口径说明 + 数据截至 -->
    <footer class="ds-foot">
      <span class="ds-foot-text">{{ dataBoundaryText }}</span>
      <span class="ds-foot-text">{{ t('screen.updatedAt') }} {{ updatedFull }}</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getScreenReport } from '@/api/modules/gisScreen'
import { useScreenPolling, buildScreenQuery, screenPeriodLabel, screenUpdatedTime } from '@/composables/screen'
import { formatThousands, formatPercent } from '@/utils/format'
import { useFailCategoryDict } from '@/constants/failCategory'

const { t } = useI18n()
const { failCategoryOptions } = useFailCategoryDict()
const route = useRoute()

const data = ref(null)

// 区间由 URL query 决定，未传时默认 month（Doc 37 §2.2-3）
const screenQuery = computed(() => buildScreenQuery(route.query))

const { loading, failing, refresh } = useScreenPolling(async () => {
  const res = await getScreenReport(screenQuery.value)
  data.value = res?.data || res || null
})

const meta = computed(() => data.value?.meta || {})
const summary = computed(() => data.value?.summary || [])
const metrics = computed(() => data.value?.metrics || [])
const suggestions = computed(() => data.value?.suggestions || [])
const adoption = computed(() => data.value?.adoption || {})
const quality = computed(() => data.value?.quality || {})
const handover = computed(() => quality.value.handover || {})
const shadow = computed(() => quality.value.shadow || {})
const approval = computed(() => quality.value.approval || {})
const efficiency = computed(() => data.value?.efficiency || {})
const pluginOnline = computed(() => efficiency.value.plugin_online || {})
const deploy = computed(() => efficiency.value.deploy || {})
// 日粒度由后端固定（Doc 35 §8.2：GROUP BY DATE，不随 period 变化），取末 7 天
const callTrend = computed(() => (efficiency.value.call_trend || []).slice(-7))
const topDepts = computed(() => (adoption.value.top_depts || []).slice(0, 5))
const topPlugins = computed(() => (adoption.value.top_plugins || []).slice(0, 5))

const periodText = computed(() => screenPeriodLabel(meta.value, t))
const updatedText = computed(() => screenUpdatedTime(meta.value))
const updatedFull = computed(() => meta.value.generated_at || '-')

// 口径说明：三屏统一由 meta.data_boundary 下发（Doc 37 一·注）
const dataBoundaryText = computed(() => {
  const list = meta.value.data_boundary
  if (!Array.isArray(list) || !list.length) return ''
  return `${t('screen.dataBoundary')}：${list.join(' · ')}`
})

const errorItems = computed(() => {
  const breakdown = quality.value.error_breakdown || {}
  return failCategoryOptions.value.map(item => ({
    key: item.value,
    label: item.label,
    value: breakdown[item.value]
  }))
})

// error_breakdown 的 8 个 key 里，pending_approval 是「待办次数」而不是失败：
// 从失败分类里摘出，归到「人工环节（待办）」（其余 7 个 key 才是失败类）
const failureItems = computed(() => errorItems.value.filter(item => item.key !== 'pending_approval'))
const pendingItem = computed(
  () => errorItems.value.find(item => item.key === 'pending_approval') || { key: 'pending_approval', label: '', value: 0 }
)

// 趋势成功率 = success ÷ evaluated（evaluated = 已评估，剔除人工接管行；
// 不能用 calls 当分母 —— calls 是真实调用总量，含人工接管行），与指标 3/7 同口径
function trendRate(row) {
  const evaluated = Number(row?.evaluated)
  if (!Number.isFinite(evaluated) || evaluated <= 0) return '-'
  const success = Number(row?.success) || 0
  return formatPercent((success / evaluated) * 100)
}

function fmt(value) {
  return formatThousands(value)
}

function fmtPct(value) {
  return formatPercent(value)
}

function fmtDecimal(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(1) : '-'
}
</script>

<style lang="scss" scoped>
// ---------- 页面补充样式（.ds-* 为全局大屏公共样式） ----------
// 霓虹视觉层与 .ds-* 共用 styles/screen-theme.scss，避免两套大屏样式漂移
@use '@/styles/screen-theme.scss' as tech;

.ds-row.two-col {
  grid-template-columns: minmax(0, 1fr) auto;
}

.ds-row.three-col {
  grid-template-columns: minmax(0, 1fr) auto auto;
}

// 调用趋势：日期 / 调用总数 / 成功调用 / 成功率
.ds-row.four-col {
  grid-template-columns: minmax(0, 1fr) auto auto auto;
}

// 趋势表头：弱化，只做列名提示
.ds-row-head {
  padding-bottom: calc(2px * var(--s));
  font-size: calc(12px * var(--s));
  color: tech.$t3;

  .ds-num {
    color: tech.$t3;
  }
}

// pending（待审批/待办）既不是成功也不是失败 → 灰蓝，不用失败的琥珀色
.pending-num {
  color: tech.$t2;
}

// 失败分类 7 项（pending_approval 已归到人工环节）：2 列紧凑行式，避免挤占下方列表高度
.err-breakdown {
  flex-shrink: 0;
}

.err-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 calc(16px * var(--s));

  .err-cell {
    min-width: 0;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: calc(8px * var(--s));
    padding: calc(4px * var(--s)) 0;
    font-size: calc(14px * var(--s));
  }

  .err-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: tech.$t3;
  }

  .err-num {
    flex-shrink: 0;
    color: tech.$c-amber;
    font-family: tech.$num-font;
    font-variant-numeric: tabular-nums;
  }
}

.ds-stat-value.strong {
  color: tech.$c-green;
  text-shadow: 0 0 calc(12px * var(--s)) rgba(63, 224, 168, 0.55);
}

.ds-kpi-label.disabled {
  color: tech.$t3;
}

// 12 项指标：两列网格，字号最小 14px @1080p
.metric-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-content: start;
  gap: calc(8px * var(--s)) calc(10px * var(--s));
  overflow: hidden;
}

.metric {
  min-width: 0;
  padding: calc(5px * var(--s)) calc(9px * var(--s));
  border: 1px solid tech.$line;
  border-radius: calc(3px * var(--s));
  background: rgba(24, 48, 96, 0.32);

  &.disabled {
    opacity: 0.5;
  }

  .metric-name {
    display: flex;
    align-items: center;
    gap: calc(4px * var(--s));
    color: tech.$t2;
    font-size: calc(13px * var(--s));
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .metric-code {
    flex-shrink: 0;
    color: tech.$c-cyan;
    font-family: tech.$num-font;
    font-weight: 600;
  }

  .metric-value {
    margin-top: calc(2px * var(--s));
    color: tech.$t1;
    font-family: tech.$num-font;
    font-size: calc(16px * var(--s));
    font-weight: 600;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

// 下期建议
.sg-row {
  display: flex;
  gap: calc(10px * var(--s));
  padding: calc(7px * var(--s)) 0;
  border-bottom: 1px dashed rgba(120, 170, 255, 0.1);
  font-size: calc(14px * var(--s));
  line-height: 1.5;

  &:last-child {
    border-bottom: none;
  }
}

.sg-idx {
  flex-shrink: 0;
  width: calc(22px * var(--s));
  height: calc(22px * var(--s));
  border: 1px solid rgba(53, 230, 255, 0.45);
  border-radius: calc(3px * var(--s));
  background: rgba(53, 230, 255, 0.14);
  box-shadow: 0 0 calc(12px * var(--s)) calc(-4px * var(--s)) rgba(53, 230, 255, 0.9);
  color: tech.$c-cyan;
  font-family: tech.$num-font;
  font-size: calc(12px * var(--s));
  text-align: center;
  line-height: calc(20px * var(--s));
}

.sg-text {
  min-width: 0;
  color: #dbe7f7;
}
</style>
