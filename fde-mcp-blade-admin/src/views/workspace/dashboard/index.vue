<template>
  <div class="dashboard-page">
    <!-- 问候 -->
    <div class="greeting">
      <div class="greeting-title">{{ greeting }}</div>
      <div class="greeting-sub">
        {{ $t('workspace.dashboardSubtitle') }}
        <span v-if="generatedAt">{{ $t('workspace.generatedAt', { time: generatedAt }) }}</span>
      </div>
    </div>

    <a-row :gutter="16">
      <!-- 我要做什么：用已有 /biz/gis_approval_request/pending（不新造接口） -->
      <a-col :span="16">
        <a-card :bordered="false" class="block-card">
          <template #title>
            <div class="card-title">
              <span class="card-title-text">
                {{ $t('workspace.todoTitle') }}
                <a-tag v-if="todoTotal" color="orangered" size="small">{{ todoTotal }}</a-tag>
              </span>
              <a-space size="small">
                <a-button type="text" size="small" :loading="todoLoading" @click="fetchTodos">
                  <template #icon><icon-refresh /></template>
                </a-button>
                <a-button type="text" size="small" @click="goApproval()">
                  {{ $t('workspace.viewAll') }}
                  <template #icon><icon-right /></template>
                </a-button>
              </a-space>
            </div>
          </template>
          <a-table
            :data="todoList"
            :loading="todoLoading"
            :pagination="false"
            row-key="approval_id"
            size="small"
            @row-click="handleTodoClick"
          >
            <template #columns>
              <a-table-column :title="$t('hitl.toolName')" :width="220">
                <template #cell="{ record }">
                  <div class="cell-main">{{ record.tool_display_name || record.tool_name || '-' }}</div>
                  <div v-if="record.target_name" class="cell-sub">{{ record.target_name }}</div>
                </template>
              </a-table-column>
              <a-table-column :title="$t('hitl.riskLevel')" :width="110">
                <template #cell="{ record }">
                  <a-tag v-if="riskInfo(record.risk_level)" :color="riskInfo(record.risk_level).color" size="small">
                    {{ riskInfo(record.risk_level).label }}
                  </a-tag>
                  <span v-else>-</span>
                </template>
              </a-table-column>
              <a-table-column :title="$t('hitl.applyTime')" data-index="created_time" :width="165" />
              <a-table-column :title="$t('hitl.expiresAt')" data-index="expires_at" :width="165" />
            </template>
            <template #empty>
              <a-empty :description="todoEmptyText" />
            </template>
          </a-table>
        </a-card>
      </a-col>

      <!-- 有什么消息：gis_mine/message，跳转直接用 biz_ref_route -->
      <a-col :span="8">
        <a-card :bordered="false" class="block-card">
          <template #title>
            <div class="card-title">
              <span class="card-title-text">
                {{ $t('workspace.messageTitle') }}
                <a-tooltip v-if="degradedReason('message')" :content="degradedReason('message')">
                  <icon-info-circle class="reason-icon" />
                </a-tooltip>
              </span>
              <a-button type="text" size="small" :loading="cardLoading.message" @click="refreshCard('message')">
                <template #icon><icon-refresh /></template>
              </a-button>
            </div>
          </template>
          <a-empty v-if="isDegraded('message')" :description="$t('commonTable.noData')" />
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
            <a-empty v-if="!messageItems.length" :description="$t('commonTable.noData')" />
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <!-- 我的调用：gis_mine/cmd -->
      <a-col :span="12">
        <a-card :bordered="false" class="block-card">
          <template #title>
            <div class="card-title">
              <span class="card-title-text">
                {{ $t('workspace.myCalls') }}
                <a-tooltip v-if="degradedReason('cmd')" :content="degradedReason('cmd')">
                  <icon-info-circle class="reason-icon" />
                </a-tooltip>
              </span>
              <a-space size="small">
                <a-button type="text" size="small" @click="goDrill('cmd')">
                  {{ $t('workspace.viewAll') }}
                  <template #icon><icon-right /></template>
                </a-button>
                <a-button type="text" size="small" :loading="cardLoading.cmd" @click="refreshCard('cmd')">
                  <template #icon><icon-refresh /></template>
                </a-button>
              </a-space>
            </div>
          </template>
          <a-empty v-if="isDegraded('cmd')" :description="$t('commonTable.noData')" />
          <template v-else>
            <div class="stat-grid">
              <div class="stat-cell">
                <div class="stat-value">{{ statText(cmdData.total) }}</div>
                <div class="stat-label">{{ $t('workspace.callsTotal') }}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-value" style="color: #00b42a">{{ statText(cmdData.success) }}</div>
                <div class="stat-label">{{ $t('workspace.callsSuccess') }}</div>
              </div>
              <div class="stat-cell">
                <div class="stat-value" style="color: #f53f3f">{{ statText(cmdData.failed) }}</div>
                <div class="stat-label">{{ $t('workspace.callsFailed') }}</div>
              </div>
              <div class="stat-cell">
                <!-- success_rate 是百分数（81.34 = 81.34%），不要再乘 100 -->
                <div class="stat-value">{{ rateText(cmdData.success_rate) }}</div>
                <div class="stat-label">{{ $t('workspace.callsSuccessRate') }}</div>
              </div>
            </div>
            <div class="section-subtitle">{{ $t('workspace.callsTrend', { days: trendDays }) }}</div>
            <!-- trend 只返回有调用的那天，日期轴由前端补齐（缺失日补 0） -->
            <BarChart :categories="trendCategories" :series="trendSeries" height="200px" />
          </template>
        </a-card>
      </a-col>

      <!-- 我获得的授权：gis_mine/grant -->
      <a-col :span="12">
        <a-card :bordered="false" class="block-card">
          <template #title>
            <div class="card-title">
              <span class="card-title-text">
                {{ $t('workspace.myGrant') }}
                <a-tooltip v-if="degradedReason('grant')" :content="degradedReason('grant')">
                  <icon-info-circle class="reason-icon" />
                </a-tooltip>
              </span>
              <a-space size="small">
                <a-button type="text" size="small" @click="goDrill('grant')">
                  {{ $t('workspace.viewAll') }}
                  <template #icon><icon-right /></template>
                </a-button>
                <a-button type="text" size="small" :loading="cardLoading.grant" @click="refreshCard('grant')">
                  <template #icon><icon-refresh /></template>
                </a-button>
              </a-space>
            </div>
          </template>
          <a-empty v-if="isDegraded('grant')" :description="$t('commonTable.noData')" />
          <template v-else>
            <div class="stat-grid">
              <div class="stat-cell">
                <div class="stat-value">{{ statText(grantData.active) }}</div>
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
                <div class="stat-value" style="color: #ff7d00">{{ statText(grantData.expiring_soon) }}</div>
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
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <!-- 我发起的申请 / 我的令牌 / 我的单据（统一外壳，同一套渲染） -->
      <a-col v-for="card in statCards" :key="card.key" :span="8">
        <a-card :bordered="false" class="block-card">
          <template #title>
            <div class="card-title">
              <span class="card-title-text">
                {{ card.title }}
                <a-tooltip v-if="card.degraded && card.reason" :content="card.reason">
                  <icon-info-circle class="reason-icon" />
                </a-tooltip>
              </span>
              <a-space v-if="card.drillTab || card.refreshable" size="small">
                <a-button v-if="card.drillTab" type="text" size="small" @click="goDrill(card.drillTab)">
                  {{ $t('workspace.viewAll') }}
                  <template #icon><icon-right /></template>
                </a-button>
                <a-button
                  v-if="card.refreshable"
                  type="text"
                  size="small"
                  :loading="cardLoading[card.key]"
                  @click="refreshCard(card.key)"
                >
                  <template #icon><icon-refresh /></template>
                </a-button>
              </a-space>
            </div>
          </template>
          <a-empty v-if="card.degraded || !card.stats.length" :description="$t('commonTable.noData')" />
          <div v-else class="stat-grid">
            <div v-for="stat in card.stats" :key="stat.label" class="stat-cell">
              <div class="stat-value" :style="stat.color ? { color: stat.color } : undefined">
                {{ statText(stat.value) }}
              </div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
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

// ==================== 问候 ====================
const greeting = computed(() => {
  const hour = new Date().getHours()
  const key = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return t('workspace.greeting', { greet: t(`workspace.${key}`), name: userStore.userName })
})

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
      { label: t('workspace.statPending'), value: approvalData.value.pending, color: '#ff7d00' },
      { label: t('workspace.statApproved'), value: approvalData.value.approved, color: '#00b42a' },
      { label: t('workspace.statRejected'), value: approvalData.value.rejected, color: '#f53f3f' },
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
      { label: t('workspace.statActive'), value: tokenData.value.active, color: '#00b42a' },
      { label: t('workspace.statRevoked'), value: tokenData.value.revoked },
      {
        label: t('workspace.statExpiring'),
        value: tokenData.value.expiring_soon,
        color: '#ff7d00'
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
  .greeting {
    margin: 16px 0;
  }

  .greeting-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .greeting-sub {
    margin-top: 4px;
    color: var(--color-text-3);
    font-size: $font-size-xs;

    span {
      margin-left: 8px;
    }
  }

  .block-card {
    margin-bottom: 16px;
  }

  .card-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .card-title-text {
    display: inline-flex;
    align-items: center;
    gap: 6px;

    :deep(.arco-tag) {
      margin-left: 2px;
    }
  }

  .reason-icon {
    color: var(--color-text-3);
    cursor: help;
  }

  .stat-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 24px;
  }

  .stat-cell {
    min-width: 72px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-1);
    line-height: 1.4;
  }

  .stat-label {
    color: var(--color-text-3);
    font-size: $font-size-xs;
  }

  .section-subtitle {
    margin: 16px 0 4px;
    color: var(--color-text-2);
    font-size: $font-size-xs;
  }

  .msg-list {
    max-height: 320px;
    overflow-y: auto;
  }

  .msg-item {
    padding: 8px 0;
    border-bottom: 1px solid var(--color-neutral-2);
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }

    &:hover .msg-title {
      color: rgb(var(--primary-6));
    }
  }

  .msg-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .msg-title {
    color: var(--color-text-1);
    font-size: $font-size-base;
  }

  .msg-time {
    color: var(--color-text-3);
    font-size: $font-size-xs;
    white-space: nowrap;
  }

  .msg-content {
    margin-top: 2px;
    color: var(--color-text-3);
    font-size: $font-size-xs;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cell-main {
    color: var(--color-text-1);
    line-height: 1.4;
  }

  .cell-sub {
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 1.4;
  }
}
</style>
