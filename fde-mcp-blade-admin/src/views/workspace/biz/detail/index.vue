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
          <a-space :size="8">
            <a-button v-if="canCancel" status="danger" @click="openCancel">
              {{ $t('bizObject.cancelDoc') }}
            </a-button>
            <a-button @click="backToList">
              <template #icon><icon-left /></template>
              {{ $t('bizObject.backToList') }}
            </a-button>
          </a-space>
        </div>

        <a-descriptions :column="3" layout="inline-horizontal" style="margin-top: 16px">
          <a-descriptions-item :label="$t('bizObject.startedTime')">
            {{ doc.started_time || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.lastCallTime')">
            {{ doc.last_call_time || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.endedTime')">
            {{ doc.ended_time || '-' }}
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

      <!-- 节点计划：hit_count 只算成功次数 → 「是否达成」只看它；待审批 / 失败单独计数 -->
      <a-card :bordered="false" style="margin-top: 16px" :title="$t('bizObject.plan')" :loading="loading">
        <div v-if="planList.length" class="stage-plan">
          <div
            v-for="(item, index) in planList"
            :key="item.stage || index"
            class="stage-item"
            :class="`stage-${stageState(item)}`"
          >
            <div class="stage-head">
              <span class="stage-seq">{{ item.seq }}</span>
              <span class="stage-name">{{ item.name || item.stage || '-' }}</span>
            </div>
            <div class="stage-line">
              {{ $t('bizObject.stageManualMinutes') }}: {{ numOrDash(item.manual_minutes) }}
            </div>
            <div class="stage-line">
              {{
                $t('bizObject.stageHitSummary', {
                  ok: item.hit_count ?? 0,
                  pending: item.hit_pending ?? 0,
                  failed: item.hit_failed ?? 0
                })
              }}
            </div>
            <a-tag :color="stageInfo(item).color" size="small" class="stage-tag">
              {{ $t(`bizObject.${stageInfo(item).key}`) }}
            </a-tag>
          </div>
        </div>
        <a-empty v-else :description="$t('bizObject.noData')" />
      </a-card>

      <!-- 调用时间线 -->
      <a-card
        :bordered="false"
        style="margin-top: 16px"
        :title="$t('bizObject.timeline')"
        class="timeline-card"
      >
        <template #extra>
          <span class="hint-text">{{ $t('bizObject.rowClickHint') }}</span>
        </template>
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
          :scroll="{ x: '100%' }"
          @row-click="openCallDetail"
        >
          <template #columns>
            <a-table-column :title="$t('bizObject.time')" data-index="created_time" :width="145" />
            <a-table-column :title="$t('bizObject.user')" :width="110">
              <template #cell="{ record }">{{ record.user_name || '-' }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.tool')" :width="80" :ellipsis="true" :tooltip="true">
              <template #cell="{ record }">{{ toolLabel(record) }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.method')" :width="80" :ellipsis="true" :tooltip="true">
              <template #cell="{ record }">{{ record.method_name || '-' }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.currentStage')" :width="120">
              <template #cell="{ record }">
                <!-- stage 为空 = 工作流引擎句柄调用（流程外动作），不再是「未分配节点」 -->
                <span :class="{ 'muted-text': !record.stage_name }">{{ nodeLabel(record) }}</span>
              </template>
            </a-table-column>
            <a-table-column :title="$t('commonTable.status')" :width="130">
              <template #cell="{ record }">
                <!-- 审批结论优先（驳回不会产生新行，只能靠 approval_status 表达）；无审批环节 → 回落执行结果 -->
                <a-tooltip :content="rowStatus(record).tip" :disabled="!rowStatus(record).tip">
                  <a-tag :color="rowStatus(record).color" size="small">
                    {{ rowStatus(record).label }}
                  </a-tag>
                </a-tooltip>
              </template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.resultCode')" :width="110">
              <template #cell="{ record }">
                <span :class="{ 'blocked-code': isBlocked(record) }">{{ record.result_code ?? '-' }}</span>
              </template>
            </a-table-column>
            <a-table-column
              :title="$t('bizObject.resultMsg')"
              :width="80"
              :ellipsis="true"
              :tooltip="true"
            >
              <template #cell="{ record }">{{ record.result_msg || '-' }}</template>
            </a-table-column>
            <!-- error_type 与 error.data.category 同一套字典，按字典渲染；未知值回落显示原始值 -->
            <a-table-column :title="$t('bizObject.errorType')" :width="140">
              <template #cell="{ record }">{{ failCategoryLabel(record.error_type) }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.elapsed')" :width="100">
              <template #cell="{ record }">{{ elapsedText(record.elapsed_ms) }}</template>
            </a-table-column>
            <a-table-column :title="$t('bizObject.handoverTag')" :width="130" fixed="right">
              <template #cell="{ record }">
                <div v-if="record._handover" class="handover-cell">
                  <a-tag color="orange" size="small">{{ $t('bizObject.handoverTag') }}</a-tag>
                  <a-tag v-if="record._replay" color="arcoblue" size="small">
                    {{ $t('bizObject.replayTag') }}
                  </a-tag>
                  <a-link v-if="record._hasApproval" @click.stop="goApproval(record._approvalId)">
                    {{ $t('bizObject.approvalNo') }} #{{ record._approvalId }}
                  </a-link>
                  <!-- 待人工审批 → 允许撤回；本人限定与 pending 校验最终由后端判定（非本人 403、非 pending 409） -->
                  <a-button
                    v-if="canCancelApproval(record)"
                    type="text"
                    size="small"
                    status="danger"
                    @click.stop="openCancelApproval(record)"
                  >
                    {{ $t('bizObject.approvalCancel') }}
                  </a-button>
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

    <!-- 作废（必填原因，二次确认） -->
    <a-modal
      v-model:visible="cancelVisible"
      :title="$t('bizObject.cancelTitle')"
      :ok-loading="cancelLoading"
      :ok-text="$t('bizObject.cancelDoc')"
      unmount-on-close
      @before-ok="handleCancel"
    >
      <a-alert type="warning" style="margin-bottom: 12px">
        {{ $t('bizObject.cancelConfirmHint') }}
      </a-alert>
      <a-form :model="cancelForm" layout="vertical">
        <a-form-item :label="$t('bizObject.cancelReason')" required>
          <a-textarea
            v-model="cancelForm.reason"
            :placeholder="$t('bizObject.cancelReasonPlaceholder')"
            :auto-size="{ minRows: 3, maxRows: 6 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <!-- 撤回审批申请（仅待人工审批的单可撤；原因选填，≤512） -->
    <a-modal
      v-model:visible="cancelApprovalVisible"
      :title="$t('bizObject.approvalCancelTitle')"
      :ok-loading="cancelApprovalLoading"
      :ok-text="$t('bizObject.approvalCancel')"
      unmount-on-close
      @before-ok="handleCancelApproval"
    >
      <a-alert type="warning" style="margin-bottom: 12px">
        {{ $t('bizObject.approvalCancelHint') }}
      </a-alert>
      <a-form :model="cancelApprovalForm" layout="vertical">
        <a-form-item :label="$t('bizObject.approvalCancelReason')">
          <a-textarea
            v-model="cancelApprovalForm.reason"
            :placeholder="$t('bizObject.approvalCancelReasonPlaceholder')"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            :max-length="512"
            show-word-limit
          />
        </a-form-item>
      </a-form>
    </a-modal>
    <!-- 单次调用详情（§3.7 下钻：时间线行点击） -->
    <a-drawer
      v-model:visible="callVisible"
      :title="$t('bizObject.callDetailTitle')"
      :width="720"
      :footer="false"
      unmount-on-close
    >
      <a-spin :loading="callLoading" style="width: 100%">
        <a-descriptions :column="2" bordered size="small" layout="inline-horizontal">
          <a-descriptions-item :label="$t('bizObject.time')">
            {{ callDetail.created_time || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.user')">
            {{ callDetail.user_name || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.tool')">
            {{ callDetail.tool_name || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.plugin')">
            {{ callDetail.plugin_name || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.method')">
            {{ callDetail.method_name || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.currentStage')">
            {{ callDetail.stage_name || callDetail.stage || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('commonTable.status')">
            <a-tag :color="rowStatus(callDetail).color" size="small">
              {{ rowStatus(callDetail).label }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.approvalExecStatus')">
            {{ approvalExecLabel(callDetail.approval_exec_status) }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.resultCode')">
            {{ callDetail.result_code ?? '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.errorType')">
            {{ failCategoryLabel(callDetail.error_type) }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.elapsed')">
            {{ elapsedText(callDetail.elapsed_ms) }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.riskLevel')">
            <a-tag v-if="riskInfo(callDetail.risk_level)" :color="riskInfo(callDetail.risk_level).color" size="small">
              {{ riskInfo(callDetail.risk_level).label }}
            </a-tag>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.cmdType')">
            {{ callDetail.cmd_type || '-' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="callDetail.approval_id != null" :label="$t('bizObject.approvalNo')">
            <a-link @click="goApproval(callDetail.approval_id)">#{{ callDetail.approval_id }}</a-link>
          </a-descriptions-item>
          <a-descriptions-item v-if="callDetail.reject_reason" :label="$t('bizObject.rejectReason')" :span="2">
            {{ callDetail.reject_reason }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('bizObject.traceId')" :span="2">
            {{ callDetail.trace_id || '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <div class="call-section">
          <div class="call-section-title">{{ $t('bizObject.resultMsg') }}</div>
          <pre class="json-block">{{ callDetail.result_msg || '-' }}</pre>
        </div>
        <div class="call-section">
          <div class="call-section-title">{{ $t('bizObject.callRequestParams') }}</div>
          <pre class="json-block">{{ formatJson(callDetail.request_params) }}</pre>
        </div>
        <div class="call-section">
          <div class="call-section-title">{{ $t('bizObject.callResponseBody') }}</div>
          <pre class="json-block">{{ formatJson(callDetail.response_body) }}</pre>
        </div>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { useFailCategoryDict } from '@/constants/failCategory'
import { useRiskLevelDict } from '@/constants/riskLevel'
import { useCallOutcomeDict } from '@/constants/callOutcome'

const { t } = useI18n()
const { failCategoryLabel } = useFailCategoryDict()
const { riskLevelMap } = useRiskLevelDict()
const { callOutcome } = useCallOutcomeDict()
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
  // 流程外动作行：灰底 + 小字号，与业务节点主线区分
  if (isOffFlow(record)) classes.push('off-flow-row')
  return classes
}

// 流程外动作：stage 为空的工作流引擎句柄调用（不代表任何业务节点，不进 plan[]）
// 中文名按 tool_name 映射，未命中回退原始 tool_name
const OFF_FLOW_TOOL_KEYS = {
  biz_create: 'offFlowBizCreate',
  biz_query: 'offFlowBizQuery',
  biz_next: 'offFlowBizNext',
  biz_finish: 'offFlowBizFinish'
}

function isOffFlow(record) {
  return !record?.stage
}

function toolLabel(record) {
  const key = OFF_FLOW_TOOL_KEYS[record?.tool_name]
  return key ? t(`bizObject.${key}`) : record?.tool_name || '-'
}

function nodeLabel(record) {
  if (record?.stage_name) return record.stage_name
  if (isOffFlow(record)) return t('bizObject.offFlowAction')
  return t('bizObject.stageUnmapped')
}

const timelineTruncated = computed(() => (timeline.value || []).length >= 500)

// ==================== 单次调用详情（下钻，§3.7） ====================
const callVisible = ref(false)
const callLoading = ref(false)
const callDetail = ref({})
// 防止快速点行时旧响应覆盖新响应
let callSeq = 0

async function openCallDetail(record) {
  const logId = record?.log_id
  if (logId === null || logId === undefined || logId === '') return
  const seq = ++callSeq
  callDetail.value = {}
  callVisible.value = true
  callLoading.value = true
  try {
    const res = await api.gisBizObject.getBizCallDetail(bizObjectId, logId)
    if (seq !== callSeq) return
    callDetail.value = res?.data || res || {}
  } catch (_) {
    // request.js 已统一弹错（log_id 不属于该单据 → 404）
    if (seq === callSeq) callDetail.value = {}
  } finally {
    if (seq === callSeq) callLoading.value = false
  }
}

// ==================== 行状态（审批结论优先） ====================
// approval_status 有值 → 按审批结论渲染；为 null（无审批环节）→ 回落「成功/待审批/失败」三态。
// 注意：驳回不会产生新行（只有批准会重放出第二行），所以「被驳回」只能靠 approval_status 表达。
function rowStatus(record) {
  const status = record?.approval_status
  if (!status) return callOutcome(record)
  const tip = record?.result_msg || ''
  if (status === 'rejected') {
    // 驳回理由优先展示
    return { color: 'red', label: t('bizObject.approvalRejected'), tip: record?.reject_reason || tip }
  }
  if (status === 'approved') {
    return record?.success === true
      ? { color: 'green', label: t('bizObject.approvalApprovedDone'), tip }
      : { color: 'orange', label: t('bizObject.approvalApprovedBlocked'), tip }
  }
  if (status === 'pending') {
    return { color: 'gray', label: t('bizObject.approvalPending'), tip: tip || t('callOutcome.pendingTip') }
  }
  if (status === 'timeout') {
    return { color: 'orange', label: t('bizObject.approvalTimeout'), tip }
  }
  // cancelled：审批单被撤销，本次未执行 —— 既不是成功也不是失败
  return { color: 'gray', label: t('bizObject.approvalCancelled'), tip }
}

// 批准后自动重放的执行状态（approval_exec_status）
const APPROVAL_EXEC_KEYS = {
  pending: 'approvalExecPending',
  ok: 'approvalExecOk',
  failed: 'approvalExecFailed',
  skipped: 'approvalExecSkipped'
}

function approvalExecLabel(value) {
  const key = APPROVAL_EXEC_KEYS[value]
  return key ? t(`bizObject.${key}`) : value || '-'
}

// ==================== 节点计划（hit_count = 成功次数） ====================
// 达成只看 hit_count；否则看待审批 / 失败；三者皆 0 → 未达成（空心）
const STAGE_INFO = {
  done: { key: 'stageDone', color: 'green' },
  pending: { key: 'stagePending', color: 'arcoblue' },
  failed: { key: 'stageFailed', color: 'red' },
  empty: { key: 'stageNotReached', color: 'gray' }
}

function stageState(item) {
  if (Number(item?.hit_count) > 0) return 'done'
  if (Number(item?.hit_pending) > 0) return 'pending'
  if (Number(item?.hit_failed) > 0) return 'failed'
  return 'empty'
}

function stageInfo(item) {
  return STAGE_INFO[stageState(item)]
}

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

// 入参 / 出参：字符串形态的 JSON 尽量格式化，非 JSON 原样展示
function formatJson(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'string') {
    try {
      return JSON.stringify(JSON.parse(val), null, 2)
    } catch {
      return val
    }
  }
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

function riskInfo(level) {
  if (!level) return null
  return riskLevelMap.value[level] || { label: level, color: 'gray' }
}

// ==================== 作废（B4） ====================
// 能看见该单据即可作废（叠加工作流可见域）+ 管理员；已在终态的不再展示入口
const TERMINAL_STATUS = ['done', 'failed', 'cancelled']
const canCancel = computed(
  () => !!doc.value.biz_object_id && !TERMINAL_STATUS.includes(doc.value.status)
)

const cancelVisible = ref(false)
const cancelLoading = ref(false)
const cancelForm = reactive({ reason: '' })

function openCancel() {
  cancelForm.reason = ''
  cancelVisible.value = true
}

async function handleCancel(done) {
  const reason = cancelForm.reason.trim()
  if (!reason) {
    Message.warning(t('bizObject.cancelReasonRequired'))
    done(false)
    return
  }
  cancelLoading.value = true
  try {
    await api.gisBizObject.closeBizObject(bizObjectId, { reason })
    Message.success(t('bizObject.cancelOk'))
    done(true)
    // 成功后刷新详情（状态与 ended_time 会变化）
    fetchDetail()
  } catch (_) {
    // request.js 已统一弹错（含终态 / 不可见等 400/403）
    done(false)
  } finally {
    cancelLoading.value = false
  }
}

// ==================== 撤回审批申请 ====================
// 仅「待人工审批」的行可撤；是否本人发起由后端判定（非本人 403、非 pending 409）
const cancelApprovalVisible = ref(false)
const cancelApprovalLoading = ref(false)
const cancelApprovalTarget = ref(null)
const cancelApprovalForm = reactive({ reason: '' })

function canCancelApproval(record) {
  return !!record?._hasApproval && record.approval_status === 'pending'
}

function openCancelApproval(record) {
  cancelApprovalTarget.value = record
  cancelApprovalForm.reason = ''
  cancelApprovalVisible.value = true
}

async function handleCancelApproval(done) {
  const approvalId = cancelApprovalTarget.value?._approvalId
  if (approvalId === null || approvalId === undefined) {
    done(false)
    return
  }
  cancelApprovalLoading.value = true
  try {
    await api.gisApprovalRequest.cancelApproval(approvalId, { reason: cancelApprovalForm.reason.trim() })
    Message.success(t('bizObject.approvalCancelOk'))
    done(true)
    // 撤回成功后刷新详情（该行 approval_status 变为 cancelled）
    fetchDetail()
  } catch (_) {
    // request.js 已统一弹错（非本人 403 / 非 pending 409）
    done(false)
  } finally {
    cancelApprovalLoading.value = false
  }
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

    // 只有「已达成」（hit_count > 0）是实心；待审批 / 失败 / 未达成一律空心，靠色相区分
    &.stage-pending,
    &.stage-failed,
    &.stage-empty {
      border-style: dashed;
      background: transparent;
    }

    &.stage-pending .stage-seq {
      background: rgb(var(--primary-6));
    }

    &.stage-failed .stage-seq {
      background: $color-danger;
    }

    &.stage-empty .stage-seq {
      background: var(--color-fill-3);
      color: var(--color-text-3);
    }
  }

  .stage-tag {
    margin-top: 6px;
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

  .handover-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .hint-text {
    font-size: $font-size-xs;
    color: var(--color-text-3);
  }

  .call-section {
    margin-top: 16px;
  }

  .call-section-title {
    margin-bottom: 6px;
    font-size: $font-size-sm;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .json-block {
    margin: 0;
    padding: 12px;
    max-height: 300px;
    overflow: auto;
    background: var(--color-fill-2);
    border-radius: 4px;
    font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

// 时间线整行可点：下钻单次调用详情
.timeline-card :deep(.arco-table-tr) {
  cursor: pointer;
}

:deep(.same-approval-row) td:first-child {
  border-left: 3px solid rgb(var(--warning-6));
}

:deep(.blocked-row) {
  background: var(--color-fill-1);
}

// 流程外动作（stage 为空的工作流句柄调用）：灰底 + 小字号 + 虚线左边，不与业务节点主线同级
:deep(.off-flow-row) td {
  background: var(--color-fill-1);
  color: var(--color-text-3);
  font-size: 12px;
}

:deep(.off-flow-row) td:first-child {
  border-left: 3px dashed var(--color-border-3);
}
</style>
