<template>
  <div class="dashboard-page">
    <!-- ==================== 页头 ==================== -->
    <header class="page-head">
      <div class="ph-main">
        <h1 class="ph-title">{{ greeting }}</h1>
        <div class="ph-meta">
          <span>{{ todayText }}</span>
          <span class="sp" />
          <span v-if="generatedAt">{{ $t('workspace.generatedAt', { time: generatedAt }) }}</span>
        </div>
      </div>
      <div class="ph-actions">
        <a-button :loading="refreshing" @click="refreshAll">
          <template #icon><icon-refresh /></template>
          {{ $t('common.refresh') }}
        </a-button>
        <a-button type="primary" @click="goApproval()">
          <template #icon><icon-check-circle /></template>
          {{ $t('workspace.todoTitle') }}
        </a-button>
      </div>
    </header>

    <!-- ==================== 指标卡 ==================== -->
    <div class="kpi-row">
      <div class="card kpi">
        <div class="kpi-lb">
          <span class="kpi-ico i-blue"><icon-bar-chart /></span>
          {{ $t('workspace.callsTotal') }}
        </div>
        <div class="kpi-val">{{ statText(cmdData.total) }}</div>
        <div class="kpi-ft">{{ $t('workspace.kpiHint', { days: trendDays }) }}</div>
      </div>

      <div class="card kpi">
        <div class="kpi-lb">
          <span class="kpi-ico i-green"><icon-check-circle /></span>
          {{ $t('workspace.callsSuccessRate') }}
        </div>
        <div class="kpi-val">{{ rateText(cmdData.success_rate) }}</div>
        <div class="kpi-ft">
          <span class="d g-green">{{ $t('workspace.callsSuccess') }} {{ statText(cmdData.success) }}</span>
          <span class="d g-red">{{ $t('workspace.callsFailed') }} {{ statText(cmdData.failed) }}</span>
        </div>
      </div>

      <div class="card kpi">
        <div class="kpi-lb">
          <span class="kpi-ico i-violet"><icon-safe /></span>
          {{ $t('workspace.myGrant') }}
        </div>
        <div class="kpi-val">{{ statText(grantData.active) }}</div>
        <div class="kpi-ft">
          <span class="d g-muted">{{ $t('workspace.statTotal') }} {{ statText(grantData.total) }}</span>
          <span class="d g-muted">{{ $t('workspace.statRevoked') }} {{ statText(grantData.revoked) }}</span>
        </div>
      </div>

      <div class="card kpi warn">
        <div class="kpi-lb">
          <span class="kpi-ico i-amber"><icon-clock-circle /></span>
          {{ $t('workspace.pendingMine') }}
        </div>
        <div class="kpi-val">{{ statText(todoTotal) }}</div>
        <div class="kpi-ft">
          <span class="link" @click="goApproval()">{{ $t('workspace.viewAll') }}</span>
        </div>
      </div>
    </div>

    <!-- ==================== 主栅格：调用趋势 + 待办 ==================== -->
    <div class="grid-main">
      <!-- 我的调用 -->
      <section class="card">
        <div class="card-hd">
          <span class="bar b-blue" />
          <h3>{{ $t('workspace.myCalls') }}</h3>
          <span class="hint">{{ $t('workspace.callsTrend', { days: trendDays }) }}</span>
          <a-tooltip v-if="degradedReason('cmd')" :content="degradedReason('cmd')">
            <icon-info-circle class="reason-icon" />
          </a-tooltip>
          <div class="more" @click="goDrill('cmd')">
            {{ $t('commonTable.details') }}
            <icon-right />
          </div>
        </div>
        <div class="card-bd">
          <a-empty v-if="isDegraded('cmd')" :description="$t('commonTable.noData')" />
          <template v-else>
            <div class="stat-strip">
              <div class="stat-cell">
                <div class="stat-value">{{ statText(cmdData.total) }}</div>
                <div class="stat-label">{{ $t('workspace.callsTotal') }}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-value" :style="{ color: 'var(--ink-green)' }">
                  {{ statText(cmdData.success) }}
                </div>
                <div class="stat-label">{{ $t('workspace.callsSuccess') }}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-value" :style="{ color: 'var(--ink-red)' }">
                  {{ statText(cmdData.failed) }}
                </div>
                <div class="stat-label">{{ $t('workspace.callsFailed') }}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-value">{{ rateText(cmdData.success_rate) }}</div>
                <div class="stat-label">{{ $t('workspace.callsSuccessRate') }}</div>
              </div>
            </div>
            <!-- trend 只返回有调用的那天，日期轴由前端补齐（缺失日补 0） -->
            <BarChart :categories="trendCategories" :series="trendSeries" height="220px" />
          </template>
        </div>
      </section>

      <!-- 我要做什么 -->
      <section class="card">
        <div class="card-hd">
          <span class="bar b-amber" />
          <h3>{{ $t('workspace.todoTitle') }}</h3>
          <span class="hint">{{ todoTotal }}</span>
          <div class="more" @click="goApproval()">
            {{ $t('workspace.viewAll') }}
            <icon-right />
          </div>
        </div>
        <div class="card-bd">
          <div v-if="todoLoading" class="todo-empty">{{ $t('common.loading') }}</div>
          <div v-else-if="!todoList.length" class="todo-empty">{{ todoEmptyText }}</div>
          <div v-else class="todo-list">
            <div
              v-for="record in todoList"
              :key="record.approval_id"
              class="trow"
              @click="handleTodoClick(record)"
            >
              <span class="tico" :class="riskIconClass(record.risk_level)">
                <component :is="riskIcon(record.risk_level)" />
              </span>
              <div class="tx">
                <b>{{ record.tool_display_name || record.tool_name || '-' }}</b>
                <span>{{ record.target_name || record.created_time || '-' }}</span>
              </div>
              <span v-if="riskInfo(record.risk_level)" class="pill" :class="riskPillClass(record.risk_level)">
                {{ riskInfo(record.risk_level).label }}
              </span>
              <icon-right class="arw" />
            </div>
          </div>
          <div v-if="todoList.length" class="todo-all" @click="goApproval()">
            {{ $t('workspace.viewAll') }} →
          </div>
        </div>
      </section>
    </div>

    <!-- ==================== 次栅格：授权 + 消息 ==================== -->
    <div class="grid-two">
      <section class="card">
        <div class="card-hd">
          <span class="bar b-violet" />
          <h3>{{ $t('workspace.myGrant') }}</h3>
          <a-tooltip v-if="degradedReason('grant')" :content="degradedReason('grant')">
            <icon-info-circle class="reason-icon" />
          </a-tooltip>
          <a-button type="text" size="mini" :loading="cardLoading.grant" @click="refreshCard('grant')">
            <template #icon><icon-refresh /></template>
          </a-button>
        </div>
        <div class="card-bd">
          <a-empty v-if="isDegraded('grant')" :description="$t('commonTable.noData')" />
          <template v-else>
            <div class="stat-grid">
              <div class="stat-cell">
                <div class="stat-value" :style="{ color: 'var(--ink-green)' }">
                  {{ statText(grantData.active) }}
                </div>
                <div class="stat-label">{{ $t('workspace.statActive') }}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-value">{{ statText(grantData.total) }}</div>
                <div class="stat-label">{{ $t('workspace.statTotal') }}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-value">{{ statText(grantData.revoked) }}</div>
                <div class="stat-label">{{ $t('workspace.statRevoked') }}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-value" :style="{ color: 'var(--ink-amber)' }">
                  {{ statText(grantData.expiring_soon) }}
                </div>
                <div class="stat-label">
                  {{ $t('workspace.statExpiring') }}
                  <template v-if="grantData.expiring_soon_days">
                    （{{ $t('workspace.withinDays', { days: grantData.expiring_soon_days }) }}）
                  </template>
                </div>
              </div>
            </div>
            <template v-if="grantTypeRows.length">
              <div class="section-subtitle">{{ $t('workspace.grantByType') }}</div>
              <a-space wrap>
                <a-tag v-for="row in grantTypeRows" :key="row.grant_type" size="small" color="arcoblue">
                  {{ row.grant_type }} · {{ row.active }}
                </a-tag>
              </a-space>
            </template>
          </template>
        </div>
      </section>

      <section class="card">
        <div class="card-hd">
          <span class="bar b-teal" />
          <h3>{{ $t('workspace.messageTitle') }}</h3>
          <a-tooltip v-if="degradedReason('message')" :content="degradedReason('message')">
            <icon-info-circle class="reason-icon" />
          </a-tooltip>
          <a-button type="text" size="mini" :loading="cardLoading.message" @click="refreshCard('message')">
            <template #icon><icon-refresh /></template>
          </a-button>
        </div>
        <div class="card-bd">
          <a-empty v-if="isDegraded('message') || !messageItems.length" :description="$t('commonTable.noData')" />
          <div v-else class="msg-list">
            <div
              v-for="item in messageItems"
              :key="item.message_id"
              class="msg-item"
              @click="goRoute(item.biz_ref_route)"
            >
              <div class="msg-head">
                <span class="msg-title">{{ item.title || '-' }}</span>
                <span class="msg-time">{{ item.created_time || '' }}</span>
              </div>
              <div class="msg-content">{{ item.content || '' }}</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ==================== 三卡：申请 / 令牌 / 单据 ==================== -->
    <div class="grid-three">
      <section v-for="card in statCards" :key="card.key" class="card">
        <div class="card-hd">
          <span class="bar" :class="cardBarClass(card.key)" />
          <h3>{{ card.title }}</h3>
          <a-tooltip v-if="card.degraded && card.reason" :content="card.reason">
            <icon-info-circle class="reason-icon" />
          </a-tooltip>
          <div class="hd-actions">
            <a-button
              v-if="card.drillTab"
              type="text"
              size="mini"
              @click="goDrill(card.drillTab)"
            >
              {{ $t('workspace.viewAll') }}
              <template #icon><icon-right /></template>
            </a-button>
            <a-button
              v-if="card.refreshable"
              type="text"
              size="mini"
              :loading="cardLoading[card.key]"
              @click="refreshCard(card.key)"
            >
              <template #icon><icon-refresh /></template>
            </a-button>
          </div>
        </div>
        <div class="card-bd">
          <a-empty v-if="card.degraded || !card.stats.length" :description="$t('commonTable.noData')" />
          <div v-else class="stat-grid">
            <div v-for="stat in card.stats" :key="stat.label" class="stat-cell">
              <div class="stat-value" :style="stat.color ? { color: stat.color } : undefined">
                {{ statText(stat.value) }}
              </div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import {
  IconUser,
  IconExclamationCircle,
  IconLock,
  IconSafe,
  IconClockCircle
} from '@arco-design/web-vue/es/icon'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'
import { useRiskLevelDict } from '@/constants/riskLevel'
import { BarChart } from '@/components/charts'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const { riskLevelMap } = useRiskLevelDict()

// 工作台接口只查"当前登录人"，严禁传 user_id；
// 也严禁改接 /biz/gis_cmd_log、/biz/gis_grant_log、/biz/gis_token_log、/biz/gis_screen/*（都会 403）
const CARD_KEYS = ['message', 'approval', 'cmd', 'grant', 'token', 'doc']
const TODO_PAGE_SIZE = 5

// ==================== 页头 ====================
const greeting = computed(() => {
  const hour = new Date().getHours()
  const key = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return t('workspace.greeting', { greet: t(`workspace.${key}`), name: userStore.userName })
})

const todayText = computed(() => dayjs().format('YYYY-MM-DD'))

const refreshing = ref(false)
async function refreshAll() {
  refreshing.value = true
  try {
    await Promise.all([fetchOverview(), fetchTodos()])
  } finally {
    refreshing.value = false
  }
}

// ==================== 卡片统一外壳 { data, degraded, reason } ====================
function emptyCard() {
  return { data: null, degraded: false, reason: '' }
}

// overview 里的卡与单卡接口的卡结构一致，共用这一个归一化函数
function normalizeCard(raw) {
  if (!raw || typeof raw !== 'object') {
    return { data: null, degraded: true, reason: '' }
  }
  return {
    data: raw.data ?? null,
    degraded: raw.degraded === true,
    reason: raw.reason || ''
  }
}

const cards = reactive({
  message: emptyCard(),
  approval: emptyCard(),
  cmd: emptyCard(),
  grant: emptyCard(),
  token: emptyCard(),
  doc: emptyCard()
})

const cardLoading = reactive({
  message: false,
  approval: false,
  cmd: false,
  grant: false,
  token: false
})

const days = ref(7)
const generatedAt = ref('')

// 逐卡判空：degraded=true（取数失败或本期不提供）一律按「暂无数据」渲染，不整页报错
function isDegraded(key) {
  const card = cards[key]
  return !!card && card.degraded === true
}

function degradedReason(key) {
  const card = cards[key]
  if (!card || !card.degraded) return ''
  return card.reason || t('workspace.notReady')
}

// 首屏只调 1 个接口
async function fetchOverview() {
  try {
    const res = await api.gisMine.getMineOverview({ days: days.value })
    const data = res?.data || {}
    if (data.days) days.value = Number(data.days) || days.value
    generatedAt.value = data.generated_at || ''
    CARD_KEYS.forEach((key) => {
      cards[key] = normalizeCard(data[key])
    })
  } catch (e) {
    console.error('获取工作台总览失败:', e)
    // 单点失败也不能白屏：全部卡片降级为「暂无数据」
    CARD_KEYS.forEach((key) => {
      cards[key] = { data: null, degraded: true, reason: t('workspace.loadFailed') }
    })
  }
}

// 单卡刷新：走对应细接口，回来后替换同一张卡（渲染逻辑与 overview 共用）
const CARD_LOADERS = {
  message: () => api.gisMine.getMineMessage(),
  approval: () => api.gisMine.getMineApproval(),
  cmd: () => api.gisMine.getMineCmd({ days: days.value }),
  grant: () => api.gisMine.getMineGrant(),
  token: () => api.gisMine.getMineToken()
}

async function refreshCard(key) {
  const loader = CARD_LOADERS[key]
  if (!loader || cardLoading[key]) return
  cardLoading[key] = true
  try {
    const res = await loader()
    cards[key] = normalizeCard(res?.data ?? res)
  } catch (e) {
    console.error('刷新工作台卡片失败:', key, e)
    cards[key] = { data: null, degraded: true, reason: t('workspace.loadFailed') }
  } finally {
    cardLoading[key] = false
  }
}

// ==================== 我要做什么（已有接口，取 data.total + 列表） ====================
const todoLoading = ref(false)
const todoList = ref([])
const todoTotal = ref(0)
const todoError = ref('')
const todoForbidden = ref(false)

const todoEmptyText = computed(() => {
  if (todoForbidden.value) return t('workspace.todoNoPermission')
  if (todoError.value) return t('workspace.loadFailed')
  return t('workspace.todoEmpty')
})

function riskInfo(level) {
  if (!level) return null
  if (level === 'auth') return { label: t('hitl.riskAuth'), color: 'red' }
  return riskLevelMap.value[level] || { label: level, color: 'gray' }
}

// 待办行左侧图标：按风险档给不同的底/色
function riskIcon(level) {
  if (level === 'auth') return h(IconLock)
  if (level === 'risk' || level === 'high') return h(IconExclamationCircle)
  if (level === 'medium') return h(IconSafe)
  return h(IconUser)
}

function riskIconClass(level) {
  if (level === 'auth') return 't-violet'
  if (level === 'risk' || level === 'high') return 't-amber'
  if (level === 'medium') return 't-blue'
  return 't-blue'
}

// 风险标签配色（色调底 + 亮字 pill，与设计稿一致）
function riskPillClass(level) {
  if (level === 'auth') return 'p-violet'
  if (level === 'risk' || level === 'high') return 'p-amber'
  if (level === 'medium') return 'p-blue'
  return 'p-gray'
}

// 卡片头部色条：按卡片语义取色
function cardBarClass(key) {
  if (key === 'approval') return 'b-amber'
  if (key === 'token') return 'b-blue'
  return 'b-teal'
}

async function fetchTodos() {
  todoLoading.value = true
  todoError.value = ''
  todoForbidden.value = false
  try {
    const res = await api.gisApprovalRequest.getPendingApprovals({ page: 1, page_size: TODO_PAGE_SIZE })
    const data = res?.data || res || {}
    todoList.value = data.rows || []
    todoTotal.value = data.total || 0
  } catch (e) {
    console.error('获取待办事项失败:', e)
    todoList.value = []
    todoTotal.value = 0
    // 无权限点 7 的用户会 403：按「暂无数据」降级，不当页面异常
    if (e?.response?.status === 403 || e?.code === 403) {
      todoForbidden.value = true
    } else {
      todoError.value = t('workspace.loadFailed')
    }
  } finally {
    todoLoading.value = false
  }
}

function handleTodoClick(record) {
  goApproval(record?.approval_id)
}

function goApproval(approvalId) {
  const query = approvalId ? `?approval_id=${approvalId}` : ''
  router.push(`/workspace/approval/index${query}`)
}

// ==================== 我的调用 ====================
const cmdData = computed(() => cards.cmd?.data || {})
const trendDays = computed(() => Number(cmdData.value.days) || days.value)

const trendCategories = computed(() => {
  const list = []
  for (let i = trendDays.value - 1; i >= 0; i--) {
    list.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'))
  }
  return list
})

const trendSeries = computed(() => {
  const map = new Map((cmdData.value.trend || []).map((row) => [row.stat_day, row]))
  return [
    {
      name: t('workspace.callsTrendTotal'),
      data: trendCategories.value.map((d) => map.get(d)?.total ?? 0)
    },
    {
      name: t('workspace.callsTrendSuccess'),
      data: trendCategories.value.map((d) => map.get(d)?.success ?? 0)
    }
  ]
})

// success_rate 是百分数，直接加 % 展示
function rateText(val) {
  if (val === null || val === undefined || val === '') return '-'
  return `${val}%`
}

function statText(val) {
  if (val === null || val === undefined || val === '') return '-'
  return String(val)
}

// ==================== 我获得的授权 ====================
const grantData = computed(() => cards.grant?.data || {})
const grantTypeRows = computed(() => grantData.value.by_type || [])

// ==================== 我发起的申请 / 我的令牌 / 我的单据 ====================
const approvalData = computed(() => cards.approval?.data || {})
const tokenData = computed(() => cards.token?.data || {})

function riskLabel(level) {
  if (!level) return '-'
  if (level === 'auth') return t('hitl.riskAuth')
  return riskLevelMap.value[level]?.label || level
}

const statCards = computed(() => [
  {
    key: 'approval',
    title: t('workspace.myApproval'),
    refreshable: true,
    degraded: isDegraded('approval'),
    reason: degradedReason('approval'),
    stats: [
      { label: t('workspace.statPending'), value: approvalData.value.pending, color: 'var(--ink-amber)' },
      { label: t('workspace.statApproved'), value: approvalData.value.approved, color: 'var(--ink-green)' },
      { label: t('workspace.statRejected'), value: approvalData.value.rejected, color: 'var(--ink-red)' },
      { label: t('workspace.statTimeout'), value: approvalData.value.timeout },
      { label: t('workspace.statCancelled'), value: approvalData.value.cancelled }
    ]
  },
  {
    key: 'token',
    title: t('workspace.myToken'),
    refreshable: true,
    // 下钻到个人中心的「我的令牌」Tab
    drillTab: 'token',
    degraded: isDegraded('token'),
    reason: degradedReason('token'),
    stats: [
      { label: t('workspace.statActive'), value: tokenData.value.active, color: 'var(--ink-green)' },
      { label: t('workspace.statRevoked'), value: tokenData.value.revoked },
      {
        label: t('workspace.statExpiring'),
        value: tokenData.value.expiring_soon,
        color: 'var(--ink-amber)'
      },
      { label: t('workspace.tokenMaxRisk'), value: riskLabel(tokenData.value.max_risk_level) }
    ]
  },
  {
    key: 'doc',
    title: t('workspace.myDoc'),
    // 「我的单据」本期固定空态：不做接口、不刷新
    refreshable: false,
    degraded: true,
    reason: degradedReason('doc'),
    stats: []
  }
])

const messageItems = computed(() => cards.message?.data?.items || [])

// 跳转直接用后端给的完整路由，前端不自己拼
function goRoute(route) {
  if (!route) return
  router.push(route).catch(() => {})
}

// 卡片下钻：跳到个人中心并定位到对应 Tab（工作台只放摘要，长列表在个人中心）
function goDrill(tab) {
  if (!tab) return
  router.push({ path: '/workspace/profile/index', query: { tab } })
}

onMounted(() => {
  fetchOverview()
  fetchTodos()
})
</script>

<style lang="scss" scoped>
.dashboard-page {
  // 页面骨架：与 design-preview v1 一致（页头 / 指标行 / 主栅格 / 次栅格 / 三卡）
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---------------- 通用卡片 ---------------- */
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  transition:
    border-color 0.2s,
    background 0.3s ease;

  &:hover {
    border-color: var(--line-strong);
  }
}

.card-hd {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 14px 16px 0;

  h3 {
    font-size: 13.5px;
    font-weight: 650;
    color: var(--text);
    letter-spacing: 0.1px;
    margin: 0;
  }

  .hint {
    font-size: 11px;
    color: var(--text-3);
    font-family: var(--mono);
  }

  .bar {
    width: 3px;
    height: 13px;
    border-radius: 2px;
    flex: none;
  }

  .more {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    font-weight: 600;
    color: var(--c-blue);
    cursor: pointer;

    :deep(svg) {
      width: 13px;
      height: 13px;
    }
  }

  .hd-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 2px;
  }
}

.card-bd {
  padding: 12px 16px 16px;
}

.b-blue {
  background: var(--c-blue);
}
.b-violet {
  background: var(--c-violet);
}
.b-teal {
  background: var(--c-teal);
}
.b-amber {
  background: var(--c-amber);
}

.reason-icon {
  color: var(--text-3);
  cursor: help;
}

/* ---------------- 页头 ---------------- */
.page-head {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  margin: 4px 0 6px;
}

.ph-title {
  font-size: 22px;
  font-weight: 750;
  letter-spacing: -0.3px;
  color: var(--text);
  margin: 0;
  line-height: 1.25;
}

.ph-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-3);

  .sp {
    width: 1px;
    height: 11px;
    background: var(--line-strong);
  }
}

.ph-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
  padding-bottom: 2px;
}

/* ---------------- 指标卡 ---------------- */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.kpi {
  padding: 15px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.kpi-lb {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--text-2);
}

.kpi-ico {
  width: 22px;
  height: 22px;
  border-radius: var(--r-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;

  :deep(svg) {
    width: 13px;
    height: 13px;
  }
}

.i-blue {
  background: var(--tint-blue);
  color: var(--ink-blue);
}
.i-green {
  background: var(--tint-green);
  color: var(--ink-green);
}
.i-violet {
  background: var(--tint-violet);
  color: var(--ink-violet);
}
.i-amber {
  background: var(--tint-amber);
  color: var(--ink-amber);
}

.kpi-val {
  font-size: 28px;
  font-weight: 750;
  letter-spacing: -1px;
  line-height: 1;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi-ft {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11.5px;
  color: var(--text-3);
  min-width: 0;

  .d {
    display: inline-flex;
    align-items: center;
    gap: 5px;

    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 2px;
      flex: none;
    }
  }

  .g-green::before {
    background: var(--c-green);
  }
  .g-red::before {
    background: var(--c-red);
  }
  .g-muted::before {
    background: var(--text-4);
  }

  .link {
    color: var(--c-blue);
    font-weight: 600;
    cursor: pointer;
  }
}

// 待办告警档：琥珀描边 + 顶部着色
.kpi.warn {
  border-color: rgba(var(--c-amber-rgb), 0.34);
  background:
    linear-gradient(180deg, rgba(var(--c-amber-rgb), 0.07), transparent 62%),
    var(--card);

  .kpi-val {
    color: var(--ink-amber);
  }
}

/* ---------------- 主栅格 ---------------- */
.grid-main {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}

.grid-three {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}

/* ---------------- 统计条目 ---------------- */
.stat-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  padding-bottom: 6px;
}

.stat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}

.stat-cell {
  min-width: 66px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 11.5px;
  color: var(--text-3);
}

.section-subtitle {
  margin: 14px 0 6px;
  color: var(--text-2);
  font-size: 11.5px;
}

/* ---------------- 待办列表 ---------------- */
.todo-list {
  display: flex;
  flex-direction: column;
}

.trow {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 6px;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background 0.16s;

  &:hover {
    background: var(--hover);
  }

  .tico {
    width: 32px;
    height: 32px;
    border-radius: var(--r-sm);
    flex: none;
    display: grid;
    place-items: center;

    :deep(svg) {
      width: 15px;
      height: 15px;
    }
  }

  .tx {
    min-width: 0;
    flex: 1;

    b {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      font-size: 11px;
      color: var(--text-3);
    }
  }

  .arw {
    width: 14px;
    height: 14px;
    flex: none;
    color: var(--text-4);
  }
}

.t-blue {
  background: var(--tint-blue);
  color: var(--ink-blue);
}
.t-amber {
  background: var(--tint-amber);
  color: var(--ink-amber);
}
.t-violet {
  background: var(--tint-violet);
  color: var(--ink-violet);
}
.t-teal {
  background: var(--tint-teal);
  color: var(--ink-teal);
}

.todo-all {
  margin-top: 8px;
  padding: 9px;
  border-radius: var(--r-sm);
  background: var(--panel-2);
  border: 1px dashed var(--line-strong);
  text-align: center;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.18s;

  &:hover {
    color: var(--c-blue);
    border-color: rgba(var(--c-blue-rgb), 0.45);
  }
}

.todo-empty {
  padding: 26px 0;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-3);
}

/* ---------------- 风险 pill ---------------- */
.pill {
  font-size: 10px;
  font-weight: 700;
  padding: 1.5px 6px;
  border-radius: 5px;
  letter-spacing: 0.2px;
  flex: none;
  white-space: nowrap;
}

.p-blue {
  color: var(--ink-blue);
  background: var(--tint-blue);
}
.p-amber {
  color: var(--ink-amber);
  background: var(--tint-amber);
}
.p-violet {
  color: var(--ink-violet);
  background: var(--tint-violet);
}
.p-teal {
  color: var(--ink-teal);
  background: var(--tint-teal);
}
.p-gray {
  color: var(--text-2);
  background: var(--panel-2);
}

/* ---------------- 消息列表 ---------------- */
.msg-list {
  max-height: 260px;
  overflow-y: auto;
}

.msg-item {
  display: block;
  padding: 9px 8px;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background 0.16s;

  &:hover {
    background: var(--hover);

    .msg-title {
      color: var(--c-blue);
    }
  }
}

.msg-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.msg-title {
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-time {
  color: var(--text-3);
  font-size: 11px;
  font-family: var(--mono);
  white-space: nowrap;
  flex: none;
}

.msg-content {
  margin-top: 3px;
  color: var(--text-3);
  font-size: 11.5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------------- 响应式 ---------------- */
@media (max-width: 1280px) {
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid-main,
  .grid-two,
  .grid-three {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 860px) {
  .page-head {
    flex-wrap: wrap;
  }

  .kpi-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
