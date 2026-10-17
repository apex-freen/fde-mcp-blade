<template>
  <div class="biz-dashboard-page">
    <!-- 筛选区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <!-- 入口 2：按单据号直达（不参与筛选，直接打开单据时间线） -->
      <template #extra>
        <a-space :size="8">
          <a-input
            v-model="directId"
            :placeholder="$t('bizObject.docIdPlaceholder')"
            allow-clear
            style="width: 240px"
            @press-enter="handleDirectJump"
          />
          <a-tooltip :content="$t('bizObject.directJumpHint')">
            <a-button @click="handleDirectJump">
              <template #icon><icon-arrow-right /></template>
              {{ $t('bizObject.directJump') }}
            </a-button>
          </a-tooltip>
        </a-space>
      </template>
      <a-form :model="filter" layout="inline">
        <a-form-item field="time_range" :label="$t('bizObject.timeRange')">
          <a-range-picker v-model="timeRange" style="width: 260px" @change="handleTimeChange" />
        </a-form-item>
        <a-form-item field="biz_scene" :label="$t('bizObject.scene')">
          <a-select
            v-model="filter.biz_scene"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 160px"
          >
            <a-option v-for="opt in sceneOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="stall_days" :label="$t('bizObject.stallDays')">
          <a-input-number
            v-model="filter.stall_days"
            :min="1"
            :max="365"
            :precision="0"
            style="width: 120px"
          />
        </a-form-item>
        <a-form-item field="stalled" :label="$t('bizObject.stallFilter')">
          <a-select
            v-model="filter.stalled"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
          >
            <a-option :value="true">{{ $t('bizObject.stallOnly') }}</a-option>
            <a-option :value="false">{{ $t('bizObject.stallExclude') }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="status" :label="$t('bizObject.statusFilter')">
          <a-select
            v-model="filter.status"
            :placeholder="$t('bizObject.statusAll')"
            allow-clear
            style="width: 140px"
          >
            <a-option value="open">{{ $t('bizObject.statusOpen') }}</a-option>
            <a-option value="in_progress">{{ $t('bizObject.statusInProgress') }}</a-option>
            <a-option value="done">{{ $t('bizObject.statusDone') }}</a-option>
            <a-option value="failed">{{ $t('bizObject.statusFailed') }}</a-option>
            <a-option value="cancelled">{{ $t('bizObject.statusCancelled') }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ $t('commonTable.search') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('commonTable.reset') }}
            </a-button>
            <a-button :loading="scanLoading" @click="handleScan">
              <template #icon><icon-scan /></template>
              {{ $t('bizObject.scanNow') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 汇总卡片 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic :value="summary.total_docs || 0">
            <template #title>{{ $t('bizObject.docTotal') }}</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic :value="summary.stalled_total || 0">
            <template #title>{{ $t('bizObject.stalledTotal') }}</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic :value="summary.cancelled_total || 0">
            <template #title>{{ $t('bizObject.cancelledTotal') }}</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card :bordered="false">
          <a-statistic :value="summary.unassigned_calls || 0">
            <template #title>
              <span>{{ $t('bizObject.unassignedCalls') }}</span>
              <a-tooltip :content="$t('bizObject.unassignedHint')">
                <icon-question-circle class="hint-icon" />
              </a-tooltip>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 场景维度 -->
    <a-card :bordered="false" style="margin-top: 16px" :title="$t('bizObject.sceneTable')">
      <a-table
        :columns="sceneColumns"
        :data="sceneList"
        :loading="summaryLoading"
        :pagination="false"
        row-key="biz_scene"
      >
        <template #columns>
          <a-table-column :title="$t('bizObject.scene')" :width="160">
            <template #cell="{ record }">{{ sceneLabel(record) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.sceneTotal')" data-index="total" :width="90" />
          <a-table-column :title="$t('bizObject.openCnt')" :width="90">
            <template #cell="{ record }">{{ numOrDash(record.open_cnt) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.inProgressCnt')" :width="90">
            <template #cell="{ record }">{{ numOrDash(record.in_progress_cnt) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.doneCnt')" :width="90">
            <template #cell="{ record }">{{ numOrDash(record.done_cnt) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.failedCnt')" :width="90">
            <template #cell="{ record }">{{ numOrDash(record.failed_cnt) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.cancelledCnt')" :width="90">
            <template #cell="{ record }">{{ numOrDash(record.cancelled_cnt) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.stalledCnt')" :width="90">
            <template #cell="{ record }">{{ numOrDash(record.stalled_cnt) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.avgActualMinutes')" :width="140">
            <template #cell="{ record }">{{ minutesText(record.avg_actual_minutes) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.baselineMinutes')" :width="120">
            <template #cell="{ record }">{{ minutesText(record.baseline_minutes) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.compressionRate')" :width="140">
            <template #cell="{ record }">
              <!-- 基线未采集（null）时显示「待接入」，绝不显示 0% -->
              <a-tooltip v-if="record.compression_rate === null || record.compression_rate === undefined" :content="$t('bizObject.baselinePendingHint')">
                <span class="pending-text">{{ $t('bizObject.baselinePending') }}</span>
              </a-tooltip>
              <span v-else class="compression-text">{{ formatRate(record.compression_rate) }}</span>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty :description="$t('bizObject.noData')" />
        </template>
      </a-table>
    </a-card>

    <!-- 入口 1 / 4：单据列表（全量可见单据，点击行或「查看」进详情） -->
    <a-card :bordered="false" style="margin-top: 16px" :title="$t('bizObject.docList')">
      <DocListTable
        :rows="docListData"
        :loading="docListLoading"
        :pagination="docPagination"
        @page-change="(page) => handlePageChange('doc', page)"
        @page-size-change="(size) => handlePageSizeChange('doc', size)"
        @view="goDetail"
      />
    </a-card>

    <!-- 入口 3：停摆清单（= 单据列表 + stalled=true，按静默天数倒序） -->
    <a-card :bordered="false" style="margin-top: 16px" :title="$t('bizObject.stallList')">
      <DocListTable
        :rows="stallListData"
        :loading="stallListLoading"
        :pagination="stallPagination"
        show-silent-days
        @page-change="(page) => handlePageChange('stall', page)"
        @page-size-change="(size) => handlePageSizeChange('stall', size)"
        @view="goDetail"
      />
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@/api'
import DocListTable from './components/DocListTable.vue'

const { t } = useI18n()
const router = useRouter()

// ==================== 筛选 ====================
const filter = reactive({
  begin_time: '',
  end_time: '',
  biz_scene: undefined,
  stall_days: 7,
  stalled: undefined,
  status: undefined
})
const timeRange = ref([])
// 「按单据号直达」输入（与筛选无关，仅用于跳转详情）
const directId = ref('')

function pad(n) {
  return String(n).padStart(2, '0')
}

// 只传 YYYY-MM-DD
function formatDate(val) {
  if (!val) return ''
  // 日期选择器直接给出的是字符串，避免走 Date 解析产生时区偏移
  if (typeof val === 'string') return val.slice(0, 10)
  const d = val instanceof Date ? val : new Date(val)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function handleTimeChange(values) {
  if (values && values.length === 2) {
    filter.begin_time = formatDate(values[0])
    filter.end_time = formatDate(values[1])
  } else {
    filter.begin_time = ''
    filter.end_time = ''
  }
}

// 顶部筛选统一写成一组参数，summary 与 list 共用
function buildFilterParams() {
  const params = { stall_days: filter.stall_days || 7 }
  if (filter.begin_time) params.begin_time = filter.begin_time
  if (filter.end_time) params.end_time = filter.end_time
  if (filter.biz_scene) params.biz_scene = filter.biz_scene
  if (filter.stalled !== undefined && filter.stalled !== null && filter.stalled !== '') {
    params.stalled = filter.stalled
  }
  // 状态筛选（含本次新增的 cancelled 一档）
  if (filter.status) params.status = filter.status
  return params
}

// 看板汇总只接受 begin_time / end_time / stall_days（38 号 §3.1），不传 biz_scene / stalled
function buildSummaryParams() {
  const params = { stall_days: filter.stall_days || 7 }
  if (filter.begin_time) params.begin_time = filter.begin_time
  if (filter.end_time) params.end_time = filter.end_time
  return params
}

function handleSearch() {
  docPagination.current = 1
  stallPagination.current = 1
  fetchSummary()
  fetchAllLists()
}

function handleReset() {
  filter.begin_time = ''
  filter.end_time = ''
  filter.biz_scene = undefined
  filter.stall_days = 7
  filter.stalled = undefined
  filter.status = undefined
  timeRange.value = []
  docPagination.current = 1
  stallPagination.current = 1
  fetchSummary()
  fetchAllLists()
}

// 入口 2：按单据号直达详情；单据不可见时由详情页给出「资源不存在」空态
function handleDirectJump() {
  const id = directId.value.trim()
  if (!id) {
    Message.warning(t('bizObject.docIdRequired'))
    return
  }
  goDetail({ biz_object_id: id })
}

// ==================== 汇总 ====================
const summaryLoading = ref(false)
const summary = ref({ total_docs: 0, stalled_total: 0, unassigned_calls: 0, scenes: [] })
const sceneList = computed(() => summary.value.scenes || [])

const sceneOptions = computed(() =>
  (summary.value.scenes || []).map(s => ({
    value: s.biz_scene,
    label: s.scene_name || s.biz_scene
  }))
)

async function fetchSummary() {
  summaryLoading.value = true
  try {
    const res = await api.gisBizObject.getBizSummary(buildSummaryParams())
    const data = res?.data || res || {}
    summary.value = data
  } catch (e) {
    console.error(t('bizObject.fetchFailed') + ':', e)
    summary.value = { total_docs: 0, stalled_total: 0, unassigned_calls: 0, scenes: [] }
  } finally {
    summaryLoading.value = false
  }
}

// ==================== 单据列表 / 停摆清单（共用一份取数逻辑） ====================
function createPagination() {
  return reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: true,
    showPageSize: true,
    pageSizeOptions: [10, 20, 50, 100]
  })
}

// 单据列表：全量可见单据
const docListLoading = ref(false)
const docListData = ref([])
const docPagination = createPagination()

// 停摆清单：单据列表 + stalled=true，按静默天数倒序
const stallListLoading = ref(false)
const stallListData = ref([])
const stallPagination = createPagination()

const LIST_STATES = {
  doc: {
    loading: docListLoading,
    rows: docListData,
    pagination: docPagination,
    orderBy: 'last_call_time',
    forceStalled: false
  },
  stall: {
    loading: stallListLoading,
    rows: stallListData,
    pagination: stallPagination,
    orderBy: 'silent_days',
    forceStalled: true
  }
}

async function fetchList(kind) {
  const state = LIST_STATES[kind]
  state.loading.value = true
  try {
    const params = {
      ...buildFilterParams(),
      page: state.pagination.current,
      page_size: state.pagination.pageSize,
      order_by: state.orderBy,
      is_asc: false
    }
    // 停摆清单默认只看停摆（stalled=true）；用户显式选择停摆、或按状态筛选时以其为准
    // （否则「作废」等已结束单据会被 stalled=true 过滤掉，筛选形同虚设）
    if (state.forceStalled && params.stalled === undefined && !params.status) params.stalled = true
    const res = await api.gisBizObject.getBizList(params)
    const data = res?.data || res || {}
    state.rows.value = data.rows || []
    state.pagination.total = data.total || 0
  } catch (e) {
    console.error(t('bizObject.fetchFailed') + ':', e)
    state.rows.value = []
    state.pagination.total = 0
  } finally {
    state.loading.value = false
  }
}

function fetchAllLists() {
  fetchList('doc')
  fetchList('stall')
}

function handlePageChange(kind, page) {
  LIST_STATES[kind].pagination.current = page
  fetchList(kind)
}

function handlePageSizeChange(kind, size) {
  const state = LIST_STATES[kind]
  state.pagination.pageSize = size
  state.pagination.current = 1
  fetchList(kind)
}

// ==================== 立即巡检 ====================
const scanLoading = ref(false)

async function handleScan() {
  scanLoading.value = true
  try {
    const res = await api.gisBizObject.scanStallAlert({ stall_days: filter.stall_days || 7 })
    const data = res?.data || res || {}
    Message.success(
      t('bizObject.scanSuccess', {
        opened: data.opened ?? 0,
        resolved: data.resolved ?? 0
      })
    )
    docPagination.current = 1
    stallPagination.current = 1
    fetchSummary()
    fetchAllLists()
  } catch (e) {
    console.error(t('bizObject.fetchFailed') + ':', e)
  } finally {
    scanLoading.value = false
  }
}

// ==================== 展示辅助 ====================
const sceneColumns = []

function sceneLabel(record) {
  return record?.scene_name || record?.biz_scene || '-'
}

function numOrDash(val) {
  return val === null || val === undefined || val === '' ? '-' : val
}

function minutesText(val) {
  if (val === null || val === undefined || val === '') return '-'
  return `${val} ${t('bizObject.minutes')}`
}

function formatRate(val) {
  const n = Number(val)
  if (Number.isNaN(n)) return '-'
  return `${n.toFixed(2)}%`
}

function goDetail(record) {
  router.push('/workspace/biz/detail/' + encodeURIComponent(record.biz_object_id))
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchSummary()
  fetchAllLists()
})
</script>

<style lang="scss" scoped>
.biz-dashboard-page {
  .hint-icon {
    margin-left: 4px;
    color: var(--color-text-3);
    cursor: help;
  }
  .pending-text {
    color: var(--color-text-3);
    cursor: help;
  }
  .compression-text {
    color: var(--color-text-1);
  }
}
</style>
