<template>
  <div class="biz-detail-page">
    <!-- 单据不存在兜底（后端：HTTP 400 + code=404） -->
    <a-card v-if="notFound" :bordered="false" style="margin-top: 16px">
      <a-empty :description="$t('bizObject.docNotFound')">
        <a-button type="primary" @click="backToList">{{ $t('bizObject.backToList') }}</a-button>
      </a-empty>
    </a-card>

    <template v-else>
      <!-- 头部信息 -->
      <a-card :bordered="false" style="margin-top: 16px" :loading="loading">
        <div class="detail-header">
          <div class="header-main">
            <a-space :size="8" wrap>
              <span class="doc-id">{{ doc.biz_object_id || bizObjectId }}</span>
              <a-tag color="arcoblue" size="small">{{ sceneLabel }}</a-tag>
              <a-tag :color="statusColor(doc.status)" size="small">{{ statusLabel(doc.status) }}</a-tag>
            </a-space>
          </div>
          <a-button @click="backToList">
            <template #icon><icon-left /></template>
            {{ $t('bizObject.backToList') }}
          </a-button>
        </div>

        <a-descriptions :column="3" layout="inline-horizontal" style="margin-top: 16px">
          <a-descriptions-item :label="$t('bizObject.startedTime')">
            {{ doc.started_time || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.lastCallTime')">
            {{ doc.last_call_time || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.callCount')">
            {{ doc.call_count ?? '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.actualMinutes')">
            {{ minutesText(actualMinutes) }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.baselineMinutes')">
            {{ minutesText(baselineMinutes) }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.compressionRate')">
            <!-- 基线未采集（null）时显示「待接入」，绝不显示 0% -->
            <a-tooltip v-if="compressionRate === null || compressionRate === undefined" :content="$t('bizObject.baselinePendingHint')">
              <span class="pending-text">{{ $t('bizObject.baselinePending') }}</span>
            </a-tooltip>
            <span v-else>{{ formatRate(compressionRate) }}</span>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 节点计划 -->
      <a-card :bordered="false" style="margin-top: 16px" :title="$t('bizObject.plan')" :loading="loading">
        <div v-if="planList.length" class="stage-plan">
          <div
            v-for="(item, index) in planList"
            :key="item.stage || index"
            class="stage-item"
            :class="{ 'not-reached': !item.hit_count }"
          >
            <div class="stage-head">
              <span class="stage-seq">{{ item.seq }}</span>
              <span class="stage-name">{{ item.name || item.stage || '-' }}</span>
            </div>
            <div class="stage-line">
              {{ $t('bizObject.stageManualMinutes') }}: {{ numOrDash(item.manual_minutes) }}
            </div>
            <div class="stage-line">
              {{ $t('bizObject.stageHitCount') }}: {{ item.hit_count ?? 0 }}
            </div>
            <a-tag v-if="!item.hit_count" size="small" class="not-reached-tag">
              {{ $t('bizObject.stageNotReached') }}
            </a-tag>
          </div>
        </div>
        <a-empty v-else :description="$t('bizObject.noData')" />
      </a-card>

      <!-- 调用时间线 -->
      <a-card :bordered="false" style="margin-top: 16px" :title="$t('bizObject.timeline')">
        <a-alert v-if="timelineTruncated" type="warning" style="margin-bottom: 12px">
          {{ $t('bizObject.timelineTruncated') }}
        </a-alert>

        <a-table
          :columns="columns"
          :data="timelineRows"
          :loading="loading"
          :pagination="false"
          row-key="_rowKey"
          :row-class="timelineRowClass"
          :scroll="{ x: 1600 }"
        >
          <template #columns>
            <a-table-column :title="$t('bizObject.time')" data-index="created_time" :width="180" />
            <a-table-column :title="$t('bizObject.user')" :width="110">
              <template #cell="{ record }">{{ record.user_name || '-' }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.tool')" :width="160" :ellipsis="true" :tooltip="true">
              <template #cell="{ record }">{{ record.tool_name || '-' }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.method')" :width="180" :ellipsis="true" :tooltip="true">
              <template #cell="{ record }">{{ record.method_name || '-' }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.currentStage')" :width="120">
              <template #cell="{ record }">
                <span v-if="record.stage_name">{{ record.stage_name }}</span>
                <span v-else class="muted-text">{{ $t('bizObject.stageUnmapped') }}</span>
              </template>
            </a-table-column>
            <a-table-column :title="$t('commonTable.status')" :width="90">
              <template #cell="{ record }">
                <a-tag :color="record.success ? 'green' : 'red'" size="small">
                  {{ record.success ? $t('commonTable.success') : $t('commonTable.failure') }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.resultCode')" :width="110">
              <template #cell="{ record }">
                <span :class="{ 'blocked-code': isBlocked(record) }">{{ record.result_code ?? '-' }}</span>
              </template>
            </a-table-column>
            <a-table-column
              :title="$t('bizObject.resultMsg')"
              :width="220"
              :ellipsis="true"
              :tooltip="true"
            >
              <template #cell="{ record }">{{ record.result_msg || '-' }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.errorType')" :width="120">
              <template #cell="{ record }">{{ record.error_type || '-' }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.elapsed')" :width="100">
              <template #cell="{ record }">{{ elapsedText(record.elapsed_ms) }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.handoverTag')" :width="220" fixed="right">
              <template #cell="{ record }">
                <div v-if="record._handover" class="handover-cell">
                  <a-tag color="orange" size="small">{{ $t('bizObject.handoverTag') }}</a-tag>
                  <a-tag v-if="record._replay" color="arcoblue" size="small">
                    {{ $t('bizObject.replayTag') }}
                  </a-tag>
                  <a-link v-if="record._hasApproval" @click="goApproval(record._approvalId)">
                    {{ $t('bizObject.approvalNo') }} #{{ record._approvalId }}
                  </a-link>
                </div>
                <span v-else class="muted-text">-</span>
              </template>
            </a-table-column>
          </template>
          <template #empty>
            <a-empty :description="$t('bizObject.noData')" />
          </template>
        </a-table>
      </a-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const bizObjectId = route.params.biz_object_id
const stallDays = Number(route.query.stall_days) || 7

// ==================== 数据 ====================
const loading = ref(false)
const notFound = ref(false)
const doc = ref({})
const planList = ref([])
const timeline = ref([])
const actualMinutes = ref(null)
const baselineMinutes = ref(null)
const compressionRate = ref(null)

const columns = []

async function fetchDetail() {
  if (!bizObjectId) {
    notFound.value = true
    return
  }
  loading.value = true
  notFound.value = false
  try {
    const res = await api.gisBizObject.getBizDetail(bizObjectId, { stall_days: stallDays })
    const data = res?.data || res || {}
    doc.value = data.doc || {}
    planList.value = (data.plan || []).slice().sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    timeline.value = data.timeline || []
    actualMinutes.value = data.actual_minutes
    baselineMinutes.value = data.baseline_minutes
    compressionRate.value = data.compression_rate
  } catch (e) {
    // 错误文案已由 request.js 统一弹出，这里只做空态兜底
    const code = e?.response?.data?.code ?? e?.code
    if (code === 404) {
      notFound.value = true
    }
  } finally {
    loading.value = false
  }
}

// ==================== 时间线（人工介入渲染） ====================
const timelineRows = computed(() => {
  const rows = timeline.value || []

  // 按 approval_id 分组，用于识别「同一审批单的两条记录」
  const groups = new Map()
  rows.forEach((row, index) => {
    if (row.approval_id === null || row.approval_id === undefined) return
    const key = String(row.approval_id)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(index)
  })

  return rows.map((row, index) => {
    const hasApproval = row.approval_id !== null && row.approval_id !== undefined
    const group = hasApproval ? groups.get(String(row.approval_id)) : null
    const sameOrder = !!group && group.length > 1
    return {
      ...row,
      _rowKey: row.log_id ?? index,
      _hasApproval: hasApproval,
      _approvalId: row.approval_id,
      // approval_id 非空或 handover=true → 进入过人工环节
      _handover: hasApproval || row.handover === true,
      // 同一 approval_id 出现多行时，最后一行即「批准后重放那次」
      _replay: sameOrder && group[group.length - 1] === index,
      _sameOrder: sameOrder
    }
  })
})

// 「被拦下那次」：同审批单多行中的第一行，且返回码为 -32030
function isBlocked(record) {
  return record._sameOrder && String(record.result_code) === '-32030'
}

function timelineRowClass(record) {
  const classes = []
  if (record._sameOrder) classes.push('same-approval-row')
  if (isBlocked(record)) classes.push('blocked-row')
  return classes
}

const timelineTruncated = computed(() => (timeline.value || []).length >= 500)

// ==================== 展示辅助 ====================
const sceneLabel = computed(() => doc.value.scene_name || doc.value.biz_scene || '-')

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

function elapsedText(val) {
  if (val === null || val === undefined || val === '') return '-'
  return `${val} ms`
}

// ==================== 操作 ====================
function goApproval(approvalId) {
  router.push('/workspace/approval/index?approval_id=' + approvalId)
}

function backToList() {
  router.push('/workspace/biz/index')
}

onMounted(() => {
  fetchDetail()
})
</script>

<style lang="scss" scoped>
.biz-detail-page {
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .doc-id {
    font-size: $font-size-lg;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .pending-text {
    color: var(--color-text-3);
    cursor: help;
  }

  .muted-text {
    color: var(--color-text-3);
  }

  .blocked-code {
    color: $color-danger;
    font-weight: 600;
  }

  .stage-plan {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .stage-item {
    flex: 1 1 160px;
    min-width: 150px;
    padding: 12px;
    border: 1px solid var(--color-border-2);
    border-radius: 6px;
    background: var(--color-fill-1);

    &.not-reached {
      border-style: dashed;
      background: transparent;

      .stage-seq {
        background: var(--color-fill-3);
        color: var(--color-text-3);
      }
    }
  }

  .stage-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .stage-seq {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgb(var(--primary-6));
    color: #fff;
    font-size: $font-size-xs;
  }

  .stage-name {
    font-weight: 600;
    color: var(--color-text-1);
  }

  .stage-line {
    font-size: $font-size-xs;
    color: var(--color-text-2);
    line-height: 1.8;
  }

  .not-reached-tag {
    margin-top: 6px;
    color: var(--color-text-3);
    border-color: var(--color-border-3);
    background: transparent;
  }

  .handover-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
}

:deep(.same-approval-row) td:first-child {
  border-left: 3px solid rgb(var(--warning-6));
}

:deep(.blocked-row) {
  background: var(--color-fill-1);
}
</style>
