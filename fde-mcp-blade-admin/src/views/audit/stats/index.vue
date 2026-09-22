<template>
  <div class="audit-stats-page">
    <!-- 时间范围选择 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="{}" layout="inline">
        <a-form-item :label="$t('auditStats.timeRange')">
          <a-radio-group v-model="timeRange" type="button" @change="handleRangeChange">
            <a-radio value="today">{{ $t('auditStats.today') }}</a-radio>
            <a-radio value="7d">{{ $t('auditStats.last7Days') }}</a-radio>
            <a-radio value="30d">{{ $t('auditStats.last30Days') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item>
          <a-button :loading="loading" @click="fetchAllStats">
            <template #icon><icon-refresh /></template>
            {{ $t('auditStats.refresh') }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- KPI 卡片 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="6" v-for="kpi in kpiCards" :key="kpi.title">
        <a-card :bordered="false" class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-icon" :style="{ background: kpi.bgColor }">
              <component :is="kpi.icon" :style="{ color: kpi.iconColor }" :size="22" />
            </div>
            <div class="kpi-info">
              <div class="kpi-value">{{ kpi.value }}</div>
              <div class="kpi-title">{{ kpi.title }}</div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 图表区域 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <!-- 操作趋势 -->
      <a-col :span="16">
        <a-card :bordered="false" :title="$t('auditStats.operationTrend')">
          <LineChart
            :categories="trendCategories"
            :series="trendSeries"
            :loading="loading"
            :area="true"
            height="300px"
          />
        </a-card>
      </a-col>
      <!-- 风险等级分布 -->
      <a-col :span="8">
        <a-card :bordered="false" :title="$t('auditStats.riskDistribution')">
          <PieChart
            :data="riskDistribution"
            :loading="loading"
            donut
            center-title=""
            height="300px"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <!-- Top 5 用户 -->
      <a-col :span="12">
        <a-card :bordered="false" :title="$t('auditStats.top5Users')">
          <BarChart
            :categories="topUserNames"
            :series="topUserSeries"
            :loading="loading"
            horizontal
            height="280px"
          />
        </a-card>
      </a-col>
      <!-- Top 5 工具 -->
      <a-col :span="12">
        <a-card :bordered="false" :title="$t('auditStats.top5Tools')">
          <BarChart
            :categories="topToolNames"
            :series="topToolSeries"
            :loading="loading"
            horizontal
            height="280px"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 成功率概览 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="8">
        <a-card :bordered="false" :title="$t('auditStats.successRate')">
          <PieChart
            :data="successRateData"
            :loading="loading"
            donut
            :center-title="successRatePercent + '%'"
            :center-sub-title="$t('auditStats.successRateSub')"
            :colors="['#00b42a', '#f53f3f']"
            height="260px"
          />
        </a-card>
      </a-col>
      <a-col :span="16">
        <a-card :bordered="false" :title="$t('auditStats.cmdTypeDistribution')">
          <BarChart
            :categories="cmdTypeCategories"
            :series="cmdTypeSeries"
            :loading="loading"
            height="260px"
          />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'
import { LineChart, BarChart, PieChart, RISK_COLORS } from '@/components/charts'

const { t } = useI18n()

// ==================== 时间范围 ====================
const timeRange = ref('7d')
const loading = ref(false)

const rangeMap = {
  today: 1,
  '7d': 7,
  '30d': 30
}

function getTimeRange() {
  const days = rangeMap[timeRange.value] || 7
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)
  return {
    begin_time: formatTimeStr(start),
    end_time: formatTimeStr(end)
  }
}

function formatTimeStr(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ==================== 数据 ====================
const cmdLogData = ref([])
const grantLogData = ref([])
const tokenLogData = ref([])

// KPI 数据
const kpiCards = computed(() => [
  {
    title: t('auditStats.totalOperations'),
    value: cmdLogData.value.length,
    icon: 'icon-command',
    iconColor: '#6d5ce7',
    bgColor: 'rgba(109, 92, 231, 0.1)'
  },
  {
    title: t('auditStats.totalGrants'),
    value: grantLogData.value.length,
    icon: 'icon-safe',
    iconColor: '#0ea5e9',
    bgColor: 'rgba(14, 165, 233, 0.1)'
  },
  {
    title: t('auditStats.totalTokens'),
    value: tokenLogData.value.length,
    icon: 'icon-key',
    iconColor: '#00b42a',
    bgColor: 'rgba(0, 180, 42, 0.1)'
  },
  {
    title: t('auditStats.totalFailures'),
    value: countFailures(),
    icon: 'icon-exclamation-circle',
    iconColor: '#f53f3f',
    bgColor: 'rgba(245, 63, 63, 0.1)'
  }
])

function countFailures() {
  const cmdFails = cmdLogData.value.filter(r => r.success === false).length
  const grantFails = grantLogData.value.filter(r => r.success === false).length
  return cmdFails + grantFails
}

// 操作趋势（按日期分组）
const trendCategories = ref([])
const trendSeries = computed(() => [
  { name: t('auditStats.operationLog'), data: buildTrendData(cmdLogData.value, 'created_time') },
  { name: t('auditStats.grantLog'), data: buildTrendData(grantLogData.value, 'created_time') },
  { name: t('auditStats.tokenLog'), data: buildTrendData(tokenLogData.value, 'created_at') }
])

function buildTrendData(rows, timeField) {
  const dayCount = rangeMap[timeRange.value] || 7
  const result = new Array(dayCount).fill(0)
  rows.forEach(row => {
    const time = row[timeField]
    if (!time) return
    const d = new Date(time)
    const start = new Date()
    start.setDate(start.getDate() - (dayCount - 1))
    start.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((d - start) / (1000 * 60 * 60 * 24))
    if (diffDays >= 0 && diffDays < dayCount) {
      result[diffDays]++
    }
  })
  return result
}

function buildTrendCategories() {
  const dayCount = rangeMap[timeRange.value] || 7
  const cats = []
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const pad = n => String(n).padStart(2, '0')
    cats.push(`${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }
  trendCategories.value = cats
}

// 风险等级分布
const riskDistribution = computed(() => {
  const counts = { normal: 0, risk: 0, auth: 0, disable: 0 }
  ;[...cmdLogData.value, ...grantLogData.value, ...tokenLogData.value].forEach(row => {
    const level = row.risk_level
    if (counts[level] !== undefined) counts[level]++
  })
  return [
    { name: t('auditStats.normal'), value: counts.normal },
    { name: t('auditStats.risk'), value: counts.risk },
    { name: t('auditStats.auth'), value: counts.auth },
    { name: t('auditStats.disable'), value: counts.disable }
  ].filter(item => item.value > 0)
})

// Top 5 用户
const topUserNames = ref([])
const topUserSeries = computed(() => [
  { name: '操作次数', data: topUserData.value }
])
const topUserData = ref([])

function computeTopUsers() {
  const userCount = {}
  cmdLogData.value.forEach(row => {
    if (row.user_name) {
      userCount[row.user_name] = (userCount[row.user_name] || 0) + 1
    }
  })
  const sorted = Object.entries(userCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  topUserNames.value = sorted.map(item => item[0])
  topUserData.value = sorted.map(item => item[1])
}

// Top 5 工具
const topToolNames = ref([])
const topToolSeries = computed(() => [
  { name: '调用次数', data: topToolData.value }
])
const topToolData = ref([])

function computeTopTools() {
  const toolCount = {}
  cmdLogData.value.forEach(row => {
    if (row.tool_name) {
      toolCount[row.tool_name] = (toolCount[row.tool_name] || 0) + 1
    }
  })
  const sorted = Object.entries(toolCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  topToolNames.value = sorted.map(item => item[0])
  topToolData.value = sorted.map(item => item[1])
}

// 成功率
const successRateData = computed(() => {
  const total = cmdLogData.value.length
  const success = cmdLogData.value.filter(r => r.success === true).length
  const fail = total - success
  return [
    { name: t('commonTable.success'), value: success },
    { name: t('commonTable.failure'), value: fail }
  ].filter(item => item.value > 0)
})

const successRatePercent = computed(() => {
  const total = cmdLogData.value.length
  if (total === 0) return 0
  const success = cmdLogData.value.filter(r => r.success === true).length
  return Math.round((success / total) * 100)
})

// 指令类型分布
const cmdTypeCategories = computed(() => [
  t('auditStats.deviceCmd'),
  t('auditStats.serviceCall'),
  t('auditStats.controllerOp')
])
const cmdTypeSeries = computed(() => [
  {
    name: t('commonTable.operation'),
    data: [
      cmdLogData.value.filter(r => r.cmd_type === 'device').length,
      cmdLogData.value.filter(r => r.cmd_type === 'service').length,
      cmdLogData.value.filter(r => r.cmd_type === 'controller').length
    ]
  }
])

// ==================== 数据获取 ====================
// ⚠️ 已知问题（58 文档 §10.4，待修）：
//   三个日志接口的 page_size 在后端被强制 clamp(1, 100)，传 1000 实际只回 100 条。
//   而本页全部指标（KPI 总数、成功率、风险分布、Top5 用户/工具、操作趋势、指令类型分布）
//   都是由返回的 rows 在前端聚合的 → 记录数超过 100 条时数据即失真。
//   修法：后端补 GET /biz/audit/stats 聚合接口（后端推荐），前端改为直接取聚合结果；
//   在聚合接口就绪前，这里保持 page_size 为真实上限，避免"以为拉了 1000 条"的误解。
const LOG_PAGE_SIZE = 100

async function fetchAllStats() {
  loading.value = true
  const timeParams = getTimeRange()
  buildTrendCategories()
  try {
    const [cmdRes, grantRes, tokenRes] = await Promise.all([
      api.auditLog.getCmdLogList({ ...timeParams, page: 1, page_size: LOG_PAGE_SIZE }),
      api.auditLog.getGrantLogList({ ...timeParams, page: 1, page_size: LOG_PAGE_SIZE }),
      api.auditLog.getTokenLogList({ ...timeParams, page: 1, page_size: LOG_PAGE_SIZE })
    ])
    cmdLogData.value = cmdRes?.data?.rows || cmdRes?.rows || []
    grantLogData.value = grantRes?.data?.rows || grantRes?.rows || []
    tokenLogData.value = tokenRes?.data?.rows || tokenRes?.rows || []
    computeTopUsers()
    computeTopTools()
  } catch (e) {
    console.error(t('auditStats.fetchFailed'), e)
    Message.error(t('auditStats.fetchFailed'))
  } finally {
    loading.value = false
  }
}

function handleRangeChange() {
  fetchAllStats()
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchAllStats()
})
</script>

<style lang="scss" scoped>
.audit-stats-page {
  .kpi-card {
    :deep(.arco-card-body) {
      padding: 20px;
    }
  }

  .kpi-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .kpi-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .kpi-info {
    flex: 1;
    min-width: 0;
  }

  .kpi-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-1);
  }

  .kpi-title {
    font-size: 13px;
    color: var(--color-text-3);
    margin-top: 4px;
  }
}
</style>
