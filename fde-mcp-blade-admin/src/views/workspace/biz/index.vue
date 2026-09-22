<template>
  <div class="biz-dashboard-page">
    <!-- 筛选区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
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
      <a-col :span="8">
        <a-card :bordered="false">
          <a-statistic :value="summary.total_docs || 0">
            <template #title>{{ $t('bizObject.docTotal') }}</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card :bordered="false">
          <a-statistic :value="summary.stalled_total || 0">
            <template #title>{{ $t('bizObject.stalledTotal') }}</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
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

    <!-- 停摆清单 -->
    <a-card :bordered="false" style="margin-top: 16px" :title="$t('bizObject.stallList')">
      <a-table
        :columns="listColumns"
        :data="listData"
        :loading="listLoading"
        :pagination="pagination"
        row-key="biz_object_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('bizObject.bizObjectId')" data-index="biz_object_id" :width="180" :ellipsis="true" />
          <a-table-column :title="$t('bizObject.scene')" :width="130">
            <template #cell="{ record }">{{ sceneLabel(record) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.statusLabel')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)" size="small">{{ statusLabel(record.status) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.currentStage')" :width="120">
            <template #cell="{ record }">{{ record.stage_name || record.current_stage || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.startedTime')" data-index="started_time" :width="180" />
          <a-table-column :title="$t('bizObject.lastCallTime')" :width="180">
            <template #cell="{ record }">{{ record.last_call_time || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.callCount')" :width="100">
            <template #cell="{ record }">{{ numOrDash(record.call_count) }}</template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.stalled')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.stalled ? 'red' : 'gray'" size="small">
                {{ record.stalled ? $t('bizObject.yes') : $t('bizObject.no') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('bizObject.silentDays')" :width="110">
            <template #cell="{ record }">{{ numOrDash(record.silent_days) }}</template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="90" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="small" @click="goDetail(record)">
                {{ $t('bizObject.detail') }}
              </a-button>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty :description="$t('bizObject.noData')" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@/api'

const { t } = useI18n()
const router = useRouter()

// ==================== 筛选 ====================
const filter = reactive({
  begin_time: '',
  end_time: '',
  biz_scene: undefined,
  stall_days: 7,
  stalled: undefined
})
const timeRange = ref([])

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
  pagination.current = 1
  fetchSummary()
  fetchList()
}

function handleReset() {
  filter.begin_time = ''
  filter.end_time = ''
  filter.biz_scene = undefined
  filter.stall_days = 7
  filter.stalled = undefined
  timeRange.value = []
  pagination.current = 1
  fetchSummary()
  fetchList()
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

// ==================== 停摆清单 ====================
const listLoading = ref(false)
const listData = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})

async function fetchList() {
  listLoading.value = true
  try {
    // 停摆清单默认只看停摆（stalled=true）；用户在顶部显式选择时以其为准
    const params = {
      stalled: true,
      ...buildFilterParams(),
      page: pagination.current,
      page_size: pagination.pageSize,
      order_by: 'silent_days',
      is_asc: false
    }
    const res = await api.gisBizObject.getBizList(params)
    const data = res?.data || res || {}
    listData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error(t('bizObject.fetchFailed') + ':', e)
    listData.value = []
    pagination.total = 0
  } finally {
    listLoading.value = false
  }
}

function handlePageChange(page) {
  pagination.current = page
  fetchList()
}

function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.current = 1
  fetchList()
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
    pagination.current = 1
    fetchSummary()
    fetchList()
  } catch (e) {
    console.error(t('bizObject.fetchFailed') + ':', e)
  } finally {
    scanLoading.value = false
  }
}

// ==================== 展示辅助 ====================
const sceneColumns = []
const listColumns = []

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

const STATUS_MAP = {
  open: { key: 'statusOpen', color: 'orange' },
  in_progress: { key: 'statusInProgress', color: 'arcoblue' },
  done: { key: 'statusDone', color: 'green' },
  failed: { key: 'statusFailed', color: 'red' },
  cancelled: { key: 'statusCancelled', color: 'gray' }
}

function statusLabel(status) {
  const item = STATUS_MAP[status]
  return item ? t(`bizObject.${item.key}`) : status || '-'
}

function statusColor(status) {
  return STATUS_MAP[status]?.color || 'gray'
}

function goDetail(record) {
  router.push('/workspace/biz/detail/' + encodeURIComponent(record.biz_object_id))
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchSummary()
  fetchList()
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
