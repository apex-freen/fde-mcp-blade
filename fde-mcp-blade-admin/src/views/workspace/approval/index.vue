<template>
  <div class="hitl-approval-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <!-- 页签：待办 / 已处理 -->
      <a-tabs v-model:active-key="activeTab" @change="handleTabChange">
        <a-tab-pane key="pending" :title="pendingTabTitle">
          <div class="toolbar">
            <a-button :loading="loading" @click="fetchPending">
              <template #icon><icon-refresh /></template>
              {{ $t('commonTable.refresh') }}
            </a-button>
          </div>
        </a-tab-pane>
        <a-tab-pane key="handled" :title="$t('hitl.tabHandled')">
          <a-form :model="handledFilter" layout="inline">
            <a-form-item field="status" :label="$t('hitl.statusFilter')">
              <a-select
                v-model="handledFilter.status"
                multiple
                :placeholder="$t('hitl.all')"
                allow-clear
                style="width: 260px"
              >
                <a-option v-for="opt in handledStatusOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </a-option>
              </a-select>
            </a-form-item>
            <a-form-item field="range" :label="$t('hitl.dateRange')">
              <a-range-picker
                v-model="handledRange"
                value-format="YYYY-MM-DD"
                style="width: 240px"
                @change="handleHandledSearch"
              />
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handleHandledSearch">
                  <template #icon><icon-search /></template>
                  {{ $t('commonTable.search') }}
                </a-button>
                <a-button @click="handleHandledReset">
                  <template #icon><icon-refresh /></template>
                  {{ $t('commonTable.reset') }}
                </a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-tab-pane>
      </a-tabs>

      <!-- 列表 -->
      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1520 }"
        :row-class="rowClass"
        row-key="approval_id"
        @row-click="handleRowClick"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('hitl.approvalId')" data-index="approval_id" :width="80" />
          <a-table-column :title="$t('hitl.requestId')" data-index="request_id" :width="190" :ellipsis="true" />
          <a-table-column :title="$t('hitl.requester')" :width="110">
            <template #cell="{ record }">{{ record.requester_name || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('hitl.toolName')" :width="210">
            <template #cell="{ record }">
              <div class="cell-main">{{ record.tool_display_name || record.tool_name || '-' }}</div>
              <div v-if="showToolSub(record)" class="cell-sub">{{ record.tool_name }}</div>
            </template>
          </a-table-column>
          <!-- 对象名：service = 插件名、device = 设备名；改造前的老单为 null，做空值兜底（57 §八#7） -->
          <a-table-column :title="$t('hitl.targetName')" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ record.target_name || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('hitl.riskLevel')" :width="120">
            <template #cell="{ record }">
              <a-tag v-if="riskInfo(record.risk_level)" :color="riskInfo(record.risk_level).color" size="small">
                {{ riskInfo(record.risk_level).label }}
              </a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('hitl.applyTime')" data-index="created_time" :width="165" />
          <a-table-column :title="$t('hitl.expiresAt')" data-index="expires_at" :width="165" />
          <a-table-column :title="$t('hitl.status')" :width="190">
            <template #cell="{ record }">
              <a-tooltip :content="statusTip(record)" :disabled="!statusTip(record)" position="left">
                <a-tag :color="statusInfo(record).color" size="small">{{ statusInfo(record).text }}</a-tag>
              </a-tooltip>
            </template>
          </a-table-column>
          <a-table-column :title="$t('hitl.operation')" :width="180" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="small" @click.stop="openDetail(record.approval_id)">
                {{ $t('commonTable.details') }}
              </a-button>
              <a-tooltip v-if="record.masked_snippet" position="left">
                <template #content>
                  <div class="tip-hint">{{ $t('hitl.maskedPreviewHint') }}</div>
                  <pre class="tip-json">{{ formatJson(record.masked_snippet) }}</pre>
                </template>
                <a-button type="text" size="small" @click.stop>{{ $t('hitl.maskedPreview') }}</a-button>
              </a-tooltip>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty :description="activeTab === 'pending' ? $t('hitl.noPending') : $t('hitl.noHandled')" />
        </template>
      </a-table>
    </a-card>

    <!-- 详情抽屉 -->
    <a-drawer
      v-model:visible="detailVisible"
      :title="$t('hitl.detailTitle')"
      :width="880"
      :footer="false"
      unmount-on-close
    >
      <a-spin :loading="detailLoading" style="width: 100%">
        <!-- 申请信息 -->
        <div class="section">
          <div class="section-title">{{ $t('hitl.sectionApply') }}</div>
          <a-descriptions :column="2" bordered size="small" layout="inline-horizontal">
            <a-descriptions-item :label="$t('hitl.approvalId')">{{ detail.approval_id ?? '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.requestId')">{{ detail.request_id || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.toolName')">
              {{ detail.tool_display_name || detail.tool_name || '-' }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('bizObject.method')">{{ methodName || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.targetName')">{{ detail.target_name || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.riskLevel')">
              <a-tag v-if="riskInfo(detail.risk_level)" :color="riskInfo(detail.risk_level).color" size="small">
                {{ riskInfo(detail.risk_level).label }}
              </a-tag>
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.requester')">
              {{ detail.requester_name || '-' }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.applyTime')">{{ detail.created_time || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.expiresAt')">{{ detail.expires_at || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.handoverReason')">
              {{ detail.handover_reason || '-' }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.approveReason')">
              {{ detail.approve_reason || '-' }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.approvedAt')">{{ detail.approved_at || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('hitl.status')">
              <a-tag :color="statusInfo(detail).color" size="small">{{ statusInfo(detail).text }}</a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 明文参数（默认只读，可切换为编辑） -->
        <div class="section">
          <div class="section-header">
            <div>
              <span class="section-title">{{ $t('hitl.sectionParams') }}</span>
              <span class="hint">{{ $t('hitl.paramsReadonlyHint') }}</span>
            </div>
            <div v-if="canEdit" class="edit-toggle">
              <span class="hint">{{ $t('hitl.editToggle') }}</span>
              <a-switch v-model="editMode" size="small" :disabled="effect === 'grant'" />
            </div>
          </div>
          <a-alert v-if="canEdit && effect === 'grant'" type="info" class="block-gap">
            {{ $t('hitl.editDisabledOnGrant') }}
          </a-alert>
          <pre v-if="!editMode" class="json-block">{{ paramsDisplay }}</pre>
          <template v-else>
            <a-textarea
              v-model="paramText"
              class="json-editor"
              :auto-size="{ minRows: 8, maxRows: 18 }"
            />
            <a-alert v-if="paramText && !paramsParsed.ok" type="error" class="block-gap">
              {{ $t('hitl.paramInvalidJson') }}
            </a-alert>
            <div class="field-row">
              <span class="field-label">{{ $t('hitl.editReason') }}</span>
              <a-input
                v-model="editReason"
                :placeholder="$t('hitl.editReasonPlaceholder')"
                style="width: 460px"
                allow-clear
              />
            </div>
            <div v-if="editedFields.length" class="field-row">
              <span class="field-label">{{ $t('hitl.editedFields') }}</span>
              <a-space wrap>
                <a-tag v-for="f in editedFields" :key="f" color="orange" size="small">{{ f }}</a-tag>
              </a-space>
            </div>
          </template>
        </div>

        <!-- 打码预览（列表侧快照，单向不可逆） -->
        <div v-if="detail.masked_snippet" class="section">
          <div class="section-title">{{ $t('hitl.maskedPreview') }}</div>
          <div class="hint">{{ $t('hitl.maskedPreviewHint') }}</div>
          <pre class="json-block">{{ formatJson(detail.masked_snippet) }}</pre>
        </div>

        <!-- 执行结果回显（批准响应即终态，无需轮询） -->
        <div v-if="showResult" class="section">
          <div class="section-title">{{ $t('hitl.sectionResult') }}</div>
          <a-descriptions :column="1" bordered size="small" layout="inline-horizontal">
            <a-descriptions-item v-if="resultView.effect" :label="$t('hitl.effectLabel')">
              {{ resultView.effect === 'grant' ? $t('hitl.effectGrant') : $t('hitl.effectOnce') }}
            </a-descriptions-item>
            <a-descriptions-item v-if="grantHoursText" :label="$t('hitl.grantHours')">
              {{ grantHoursText }}
            </a-descriptions-item>
            <a-descriptions-item v-if="resultView.exec_status" :label="$t('hitl.execStatus')">
              <a-tag :color="execColor(resultView.exec_status)" size="small">
                {{ execLabel(resultView.exec_status) }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item v-if="hasExecLogId" :label="$t('hitl.execLogId')">
              {{ resultView.exec_log_id }}
            </a-descriptions-item>
            <a-descriptions-item v-if="resultEditedFields.length" :label="$t('hitl.editedFields')">
              {{ resultEditedFields.join(', ') }}
            </a-descriptions-item>
            <a-descriptions-item v-if="resultView.reject_reason" :label="$t('hitl.rejectReason')">
              {{ resultView.reject_reason }}
            </a-descriptions-item>
          </a-descriptions>
          <a-alert v-if="overrideApplied" type="success" class="block-gap">{{ $t('hitl.overrideApplied') }}</a-alert>
          <div v-if="resultView.exec_note" class="note-block">
            <div class="section-subtitle">{{ $t('hitl.execNote') }}</div>
            <pre class="json-block">{{ resultView.exec_note }}</pre>
          </div>
        </div>

        <!-- 操作区（仅待办且为本人审批人的单可操作） -->
        <div v-if="canOperate" class="section action-section">
          <div class="section-title">{{ $t('hitl.effectLabel') }}</div>
          <a-radio-group v-model="effect">
            <a-radio value="once">{{ $t('hitl.effectOnce') }}</a-radio>
            <!-- 【授权一段时间】仅对「设备 / 服务」类审批单可见（57 §5.2），其它类型只留【仅执行本次】与【拒绝】 -->
            <a-radio v-if="canGrant" value="grant">{{ $t('hitl.effectGrant') }}</a-radio>
          </a-radio-group>
          <div class="hint">{{ effect === 'once' ? $t('hitl.onceHint') : $t('hitl.grantHint') }}</div>
          <a-alert v-if="!canGrant" type="info" class="block-gap">
            {{ $t('hitl.grantUnavailable', { type: detail.cmd_type || '-' }) }}
          </a-alert>
          <div v-if="effect === 'grant'" class="field-row">
            <span class="field-label">{{ $t('hitl.grantHours') }}</span>
            <a-select
              v-model="grantHours"
              :placeholder="$t('hitl.grantHoursPlaceholder')"
              style="width: 180px"
            >
              <a-option v-for="h in grantHoursOptions" :key="h" :value="h">{{ grantHoursLabel(h) }}</a-option>
            </a-select>
          </div>
          <div class="field-row">
            <span class="field-label">{{ $t('hitl.approveReason') }}</span>
            <a-select v-model="approveReason" style="width: 220px">
              <a-option v-for="r in approveReasonOptions" :key="r" :value="r">{{ r }}</a-option>
            </a-select>
          </div>
          <a-alert v-if="showGrantMissing" type="warning" class="block-gap">
            {{ grantMissingText }}
          </a-alert>
          <div class="action-buttons">
            <a-button
              :type="effect === 'once' ? 'primary' : 'outline'"
              :loading="submitting"
              :disabled="submitting"
              @click="submitOnce"
            >
              {{ onceButtonLabel }}
            </a-button>
            <a-button
              v-if="canGrant"
              :type="effect === 'grant' ? 'primary' : 'outline'"
              :loading="submitting"
              :disabled="submitting"
              @click="submitGrant"
            >
              {{ $t('hitl.actionGrant') }}
            </a-button>
            <a-button status="danger" :disabled="submitting" @click="openReject">
              {{ $t('hitl.actionReject') }}
            </a-button>
          </div>
        </div>
        <div v-else-if="detail.status === 'pending' && isExpired(detail.expires_at)" class="section">
          <a-alert type="warning">{{ $t('hitl.expireGrayHint') }}</a-alert>
        </div>
      </a-spin>
    </a-drawer>

    <!-- 拒绝理由 -->
    <a-modal
      v-model:visible="rejectVisible"
      :title="$t('hitl.actionReject')"
      :ok-text="$t('hitl.submit')"
      :cancel-text="$t('hitl.cancel')"
      @before-ok="submitReject"
    >
      <a-form :model="rejectForm" layout="vertical">
        <a-form-item field="reason" :label="$t('hitl.rejectReason')">
          <a-textarea
            v-model="rejectForm.reason"
            :placeholder="$t('hitl.rejectReasonPlaceholder')"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            :max-length="512"
            show-word-limit
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, h } from 'vue'
import { useRoute } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'
import { useRiskLevelDict } from '@/constants/riskLevel'

const { t } = useI18n()
const route = useRoute()
const userStore = useUserStore()
const { riskLevelMap } = useRiskLevelDict()

// 批准原因枚举（后端固定 6 值，无对应 i18n 文案，直接展示枚举值）
const approveReasonOptions = ['risk_review', 'capability_gap', 'data_quality', 'policy_compliance', 'business_judgement', 'other']

// ==================== 当前登录人 ====================
const currentUserId = computed(() => {
  const info = userStore.userInfo || {}
  const id = info.userId ?? info.user_id
  return id === undefined || id === null || id === '' ? null : Number(id)
})

// ==================== 表格（两个页签共用一套列） ====================
const activeTab = ref('pending')
const loading = ref(false)
const pendingRows = ref([])
const handledRows = ref([])
const tableData = computed(() => (activeTab.value === 'pending' ? pendingRows.value : handledRows.value))

const pendingPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})
const handledPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})
const pagination = computed(() => (activeTab.value === 'pending' ? pendingPagination : handledPagination))
const pendingTabTitle = computed(() =>
  pendingPagination.total ? `${t('hitl.tabPending')} (${pendingPagination.total})` : t('hitl.tabPending')
)

// 已处理筛选：只按 status（approved / rejected / timeout / cancelled），不按 exec_status
const handledFilter = reactive({ status: [] })
const handledRange = ref([])
const handledStatusOptions = computed(() => [
  { value: 'approved', label: t('hitl.approveSuccess') },
  { value: 'rejected', label: t('hitl.statusRejected') },
  { value: 'timeout', label: t('hitl.statusTimeout') },
  { value: 'cancelled', label: t('hitl.statusCancelled') }
])

function currentPagination() {
  return activeTab.value === 'pending' ? pendingPagination : handledPagination
}

function handleTabChange() {
  if (activeTab.value === 'pending') {
    fetchPending()
  } else {
    fetchHandled()
  }
}

function handlePageChange(page) {
  currentPagination().current = page
  fetchCurrent()
}

function handlePageSizeChange(size) {
  const p = currentPagination()
  p.pageSize = size
  p.current = 1
  fetchCurrent()
}

function fetchCurrent() {
  return activeTab.value === 'pending' ? fetchPending() : fetchHandled()
}

async function fetchPending() {
  loading.value = true
  try {
    const res = await api.gisApprovalRequest.getPendingApprovals({
      page: pendingPagination.current,
      page_size: pendingPagination.pageSize
    })
    const data = res?.data || res || {}
    pendingRows.value = data.rows || []
    pendingPagination.total = data.total || 0
  } catch (e) {
    handleRequestError(e, 'hitl.fetchFailed')
  } finally {
    loading.value = false
  }
}

async function fetchHandled() {
  loading.value = true
  try {
    const params = {
      page: handledPagination.current,
      page_size: handledPagination.pageSize
    }
    if (handledFilter.status?.length) {
      params.status = handledFilter.status.join(',')
    }
    const range = handledRange.value || []
    if (range.length === 2 && range[0] && range[1]) {
      params.start = range[0]
      params.end = range[1]
    }
    const res = await api.gisApprovalRequest.getHandledApprovals(params)
    const data = res?.data || res || {}
    handledRows.value = data.rows || []
    handledPagination.total = data.total || 0
  } catch (e) {
    handleRequestError(e, 'hitl.fetchFailed')
  } finally {
    loading.value = false
  }
}

function handleHandledSearch() {
  handledPagination.current = 1
  fetchHandled()
}

function handleHandledReset() {
  handledFilter.status = []
  handledRange.value = []
  handledPagination.current = 1
  fetchHandled()
}

function handleRowClick(record) {
  openDetail(record?.approval_id)
}

// ==================== 状态 / 风险 / 时间展示 ====================
function isExpired(time) {
  if (!time) return false
  const d = dayjs(time)
  return d.isValid() ? d.isBefore(dayjs()) : false
}

function rowClass(record) {
  return record.status !== 'pending' || isExpired(record.expires_at) ? 'row-disabled' : ''
}

// 41 号 §六 状态映射（status='approved' 时用 exec_status 区分 ok / failed / skipped）
function statusInfo(record) {
  const status = record?.status
  const exec = record?.exec_status
  if (status === 'pending') {
    return isExpired(record?.expires_at)
      ? { text: t('hitl.statusPendingExpired'), color: 'gray' }
      : { text: t('hitl.statusPending'), color: 'arcoblue' }
  }
  if (status === 'approved') {
    if (exec === 'failed') return { text: t('hitl.statusApprovedFailed'), color: 'orangered' }
    if (exec === 'skipped') return { text: t('hitl.statusApprovedSkipped'), color: 'green' }
    return { text: t('hitl.statusApprovedOk'), color: 'green' }
  }
  if (status === 'rejected') return { text: t('hitl.statusRejected'), color: 'red' }
  if (status === 'timeout') return { text: t('hitl.statusTimeout'), color: 'gray' }
  if (status === 'cancelled') return { text: t('hitl.statusCancelled'), color: 'gray' }
  return { text: status || '-', color: 'gray' }
}

// 列表状态列的悬浮说明（41 §六：失败原因 / 超时与撤回说明 / 拒绝理由都要能看到）
function statusTip(record) {
  if (!record) return ''
  if (record.status === 'pending' && isExpired(record.expires_at)) return t('hitl.expireGrayHint')
  // 执行失败必须展示 exec_note 原文
  if (record.status === 'approved' && record.exec_status === 'failed' && record.exec_note) {
    return record.exec_note
  }
  // 已授权但本次不执行 / 已超时 / 已撤回：exec_note 就是给人看的唯一说明
  if (record.exec_note && ['approved', 'timeout', 'cancelled'].includes(record.status)) {
    return record.exec_note
  }
  if (record.status === 'rejected' && record.reject_reason) return record.reject_reason
  return ''
}

function riskInfo(level) {
  if (!level) return null
  if (level === 'auth') return { label: t('hitl.riskAuth'), color: 'red' }
  return riskLevelMap.value[level] || { label: level, color: 'gray' }
}

function showToolSub(record) {
  return !!record?.tool_name && !!record?.tool_display_name && record.tool_name !== record.tool_display_name
}

function execLabel(exec) {
  if (exec === 'ok') return t('hitl.execOk')
  if (exec === 'failed') return t('hitl.execFailed')
  if (exec === 'skipped') return t('hitl.execSkipped')
  return exec || '-'
}

function execColor(exec) {
  if (exec === 'failed') return 'orangered'
  if (exec === 'skipped') return 'green'
  return 'green'
}

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

// ==================== 详情（明文 params / config / requester_has_grant） ====================
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref({})
const actionResult = ref(null)

const currentApprovalId = computed(() => detail.value?.approval_id)

async function openDetail(id) {
  if (id === undefined || id === null || id === '') return
  actionResult.value = null
  detail.value = {}
  detailVisible.value = true
  await fetchDetail(id)
}

async function fetchDetail(id) {
  detailLoading.value = true
  try {
    const res = await api.gisApprovalRequest.getApprovalDetail(id)
    const data = res?.data || res || {}
    detail.value = data
    resetActionForm(data)
  } catch (e) {
    handleRequestError(e, 'hitl.fetchFailed')
    // 首次加载失败（如被 403 / 404）时不展示空抽屉；刷新失败则保留原内容
    if (!detail.value?.approval_id) {
      detailVisible.value = false
    }
  } finally {
    detailLoading.value = false
  }
}

// 详情 + 本次动作响应（响应独有 params_override_applied / exec_log_id）
// 响应里为 null 的字段不覆盖详情，避免把详情独有的内容冲掉
const resultView = computed(() => {
  const merged = { ...(detail.value || {}) }
  Object.entries(actionResult.value || {}).forEach(([key, val]) => {
    if (val !== null && val !== undefined) merged[key] = val
  })
  return merged
})

const showResult = computed(() => {
  const r = resultView.value
  return (!!r.status && r.status !== 'pending') || !!r.exec_status || !!r.exec_note || !!r.reject_reason
})

const hasExecLogId = computed(() => resultView.value?.exec_log_id !== null && resultView.value?.exec_log_id !== undefined)
const overrideApplied = computed(() => resultView.value?.params_override_applied === true)

const resultEditedFields = computed(() => {
  const val = resultView.value?.edited_fields
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : [val]
    } catch {
      return val.split(',').map(s => s.trim()).filter(Boolean)
    }
  }
  return []
})

const grantHoursText = computed(() => {
  const r = resultView.value
  if (r?.effect !== 'grant' || r?.grant_hours === null || r?.grant_hours === undefined) return ''
  return grantHoursLabel(r.grant_hours)
})

const methodName = computed(() => {
  const p = detail.value?.params
  return p?.arguments?.method_name || p?.method_name || detail.value?.masked_snippet?.method_name || ''
})

const showGrantMissing = computed(() => detail.value?.requester_has_grant === false)
const grantMissingText = computed(() =>
  methodName.value ? t('hitl.grantMissing', { method: methodName.value }) : t('hitl.grantMissingShort')
)

// 详情参数区：默认只读，编辑基于详情返回的明文 params
const paramsDisplay = computed(() => (detail.value?.params === null || detail.value?.params === undefined ? '-' : formatJson(detail.value.params)))

const isApprover = computed(() => {
  const approverId = detail.value?.approver_id
  return approverId !== undefined && approverId !== null && currentUserId.value !== null && Number(approverId) === currentUserId.value
})
const canOperate = computed(
  () => isApprover.value && detail.value?.status === 'pending' && !isExpired(detail.value?.expires_at)
)
const canEdit = computed(() => canOperate.value && !(detail.value?.params === null || detail.value?.params === undefined))

// ==================== 生效方式 / 授权时长 / 批准原因 ====================
// 【授权一段时间】的可见性：看单据的「对象类型」cmd_type（57 §5.2）
// 为 service / device 时才有确定的授权对象；其它类型只留【仅执行本次】与【拒绝】
// cmd_type 在列表、详情、批准响应里都有下发
const GRANTABLE_TYPES = ['service', 'device']
const canGrant = computed(() => GRANTABLE_TYPES.includes(detail.value?.cmd_type))

const effect = ref('once')
const approveReason = ref('risk_review')
const grantHours = ref(undefined)
const grantHoursOptions = ref([])

watch(effect, (val) => {
  if (val === 'grant' && editMode.value) {
    editMode.value = false
    editReason.value = ''
  }
})

function grantHoursLabel(hours) {
  return Number(hours) === 0 ? t('hitl.grantHoursPermanent') : t('hitl.grantHoursOption', { hours })
}

function resetActionForm(data) {
  effect.value = 'once'
  approveReason.value = 'risk_review'
  editMode.value = false
  editReason.value = ''
  const config = data?.config || {}
  // 选项 / 缺省值 / 上限全部由详情下发的 config 决定，不写死（41 §五#11）
  // max_grant_hours = 0 表示不限；0（永久）是特殊值，不受上限约束
  const maxHours = Number(config.max_grant_hours)
  const hasMax = Number.isFinite(maxHours) && maxHours > 0
  const options = (Array.isArray(config.grant_hours_options) ? config.grant_hours_options : [])
    .map((h) => Number(h))
    .filter((h) => Number.isFinite(h) && (h === 0 || !hasMax || h <= maxHours))
  grantHoursOptions.value = options
  const fallback = Number(config.default_grant_hours)
  const fallbackOk =
    config.default_grant_hours !== undefined &&
    config.default_grant_hours !== null &&
    Number.isFinite(fallback) &&
    (fallback === 0 || !hasMax || fallback <= maxHours)
  grantHours.value = fallbackOk ? fallback : options.length ? options[0] : undefined
  // 编辑/对比必须以详情的明文 params 为基准，绝不能用 masked_snippet 回填
  originalParams.value = data?.params && typeof data.params === 'object' ? JSON.parse(JSON.stringify(data.params)) : null
  paramText.value = originalParams.value ? JSON.stringify(originalParams.value, null, 2) : ''
}

// ==================== 改参 ====================
const editMode = ref(false)
const paramText = ref('')
const originalParams = ref(null)
const editReason = ref('')

const paramsParsed = computed(() => {
  const text = (paramText.value || '').trim()
  if (!text) return { ok: true, value: null }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, value: null }
  }
})

// 递归比较「原文 / 改后」，输出字段路径数组（嵌套用 . 连接，覆盖新增 / 删除 / 修改）
function diffParams(before, after, prefix = '') {
  const result = []
  const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    keys.forEach(key => {
      const path = prefix ? `${prefix}.${key}` : key
      const hasBefore = Object.prototype.hasOwnProperty.call(before, key)
      const hasAfter = Object.prototype.hasOwnProperty.call(after, key)
      if (!hasBefore || !hasAfter) {
        result.push(path)
      } else {
        result.push(...diffParams(before[key], after[key], path))
      }
    })
    return result
  }
  if (JSON.stringify(before) !== JSON.stringify(after) && prefix) {
    result.push(prefix)
  }
  return result
}

const editedFields = computed(() => {
  if (!originalParams.value || !paramsParsed.value.ok) return []
  return diffParams(originalParams.value, paramsParsed.value.value)
})

// 可提交的改后参数（必须是对象，空 / 非法 JSON / 标量都不允许提交）
const overrideParams = computed(() => {
  const parsed = paramsParsed.value
  return parsed.ok && parsed.value && typeof parsed.value === 'object' && !Array.isArray(parsed.value) ? parsed.value : null
})

const onceButtonLabel = computed(() => (editMode.value ? t('hitl.actionEdited') : t('hitl.actionOnce')))

const diffPreStyle = {
  background: 'var(--color-fill-2)',
  borderRadius: '4px',
  padding: '8px',
  margin: '4px 0 12px',
  fontSize: '12px',
  lineHeight: '1.6',
  maxHeight: '180px',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all'
}

function confirmEditedApprove() {
  Modal.confirm({
    title: t('hitl.editPreview'),
    width: 560,
    content: () =>
      h('div', [
        h('div', { style: 'font-weight:600;margin-bottom:4px' }, t('hitl.editOriginal')),
        h('pre', { style: diffPreStyle }, JSON.stringify(originalParams.value, null, 2)),
        h('div', { style: 'font-weight:600;margin-bottom:4px' }, t('hitl.editModified')),
        h('pre', { style: diffPreStyle }, JSON.stringify(overrideParams.value, null, 2)),
        h('div', { style: 'font-weight:600;margin-bottom:4px' }, t('hitl.editedFields')),
        h('div', editedFields.value.length ? editedFields.value.join(', ') : '-')
      ]),
    onOk: () => {
      doApprove({
        effect: 'once',
        approve_reason: approveReason.value,
        params_override: overrideParams.value,
        edit_reason: editReason.value.trim(),
        edited_fields: editedFields.value
      })
    }
  })
}

// ==================== 动作提交 ====================
const submitting = ref(false)

function submitOnce() {
  if (!canOperate.value || submitting.value) return
  effect.value = 'once'
  if (!editMode.value) {
    doApprove({ effect: 'once', approve_reason: approveReason.value })
    return
  }
  if (!overrideParams.value) {
    Message.error(t('hitl.paramInvalidJson'))
    return
  }
  if (!editReason.value || !editReason.value.trim()) {
    Message.error(t('hitl.editReasonRequired'))
    return
  }
  confirmEditedApprove()
}

function submitGrant() {
  if (!canOperate.value || submitting.value) return
  // 兜底：不可授权的单即使被绕过 UI 触发，也不提交 effect=grant（后端同样会 400）
  if (!canGrant.value) {
    Message.warning(t('hitl.grantUnavailable', { type: detail.value?.cmd_type || '-' }))
    return
  }
  // 需先选时长再提交：首次点击切到 grant 并露出时长下拉，不直接提交
  if (effect.value !== 'grant') {
    effect.value = 'grant'
    Message.warning(t('hitl.grantHoursPlaceholder'))
    return
  }
  const hours = grantHours.value
  if (hours === undefined || hours === null || hours === '') {
    Message.warning(t('hitl.grantHoursPlaceholder'))
    return
  }
  const payload = { effect: 'grant', grant_hours: Number(hours), approve_reason: approveReason.value }
  if (Number(hours) === 0) {
    // 永久授权必须二次确认
    Modal.confirm({
      title: t('hitl.confirmTitle'),
      content: t('hitl.permanentConfirm'),
      onOk: () => doApprove(payload)
    })
    return
  }
  doApprove(payload)
}

async function doApprove(payload) {
  if (submitting.value) return
  submitting.value = true
  try {
    const res = await api.gisApprovalRequest.approveApproval(currentApprovalId.value, payload)
    const data = res?.data || res || {}
    actionResult.value = data
    Message.success(data?.params_override_applied ? t('hitl.overrideApplied') : t('hitl.approveSuccess'))
    await afterAction()
  } catch (e) {
    handleRequestError(e, 'hitl.submitFailed')
  } finally {
    submitting.value = false
  }
}

// ==================== 拒绝 ====================
const rejectVisible = ref(false)
const rejectForm = reactive({ reason: '' })

function openReject() {
  if (!canOperate.value) return
  rejectForm.reason = ''
  rejectVisible.value = true
}

// 作为 before-ok：返回 false 时弹窗不关闭（理由必填的本地校验）
async function submitReject() {
  if (!canOperate.value) return false
  const reason = (rejectForm.reason || '').trim()
  if (!reason) {
    Message.warning(t('hitl.rejectReasonRequired'))
    return false
  }
  try {
    const res = await api.gisApprovalRequest.rejectApproval(currentApprovalId.value, { reason })
    const data = res?.data || res || {}
    actionResult.value = data
    Message.success(t('hitl.rejectSuccess'))
    await afterAction()
    return true
  } catch (e) {
    handleRequestError(e, 'hitl.submitFailed')
    return false
  }
}

// 提交成功后：刷新列表与详情（详情即终态，不做轮询）
async function afterAction() {
  const id = currentApprovalId.value
  if (id !== undefined && id !== null) {
    await fetchDetail(id)
  }
  await fetchPending()
  if (activeTab.value === 'handled') {
    await fetchHandled()
  }
}

// ==================== 错误兜底 ====================
// 本页用到的审批接口都带 showError:false（见 api/modules/gisApprovalRequest.js），
// 错误提示统一在这里出，避免与拦截器重复弹
function handleRequestError(e, fallbackKey) {
  console.error(t(fallbackKey) + ':', e)
  // 422 的响应体是纯文本（无 {code,msg,data}），取不到 msg，兜底为参数不合法（41 §七）
  if (e?.response?.status === 422) {
    Message.error(t('hitl.paramError'))
    return
  }
  Message.error(e?.msg || e?.response?.data?.msg || t(fallbackKey))
}

// ==================== 初始化 ====================
onMounted(async () => {
  await fetchPending()
  // 支持从单据时间线页跳转：?approval_id=123 自动打开详情
  const queryId = Array.isArray(route.query.approval_id) ? route.query.approval_id[0] : route.query.approval_id
  if (queryId) {
    openDetail(queryId)
  }
})
</script>

<style lang="scss" scoped>
.hitl-approval-page {
  .toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
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

  .tip-hint {
    color: var(--color-text-3);
    font-size: 12px;
    margin-bottom: 4px;
  }
  .tip-json {
    max-width: 420px;
    max-height: 240px;
    overflow: auto;
    margin: 0;
    font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .section {
    margin-bottom: 20px;
  }
  .section-title {
    font-weight: 600;
    color: var(--color-text-1);
    margin-bottom: 8px;
  }
  .section-subtitle {
    font-weight: 600;
    color: var(--color-text-2);
    margin-bottom: 4px;
  }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .edit-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hint {
    color: var(--color-text-3);
    font-size: 12px;
    margin-left: 8px;
  }
  .block-gap {
    margin-top: 8px;
    margin-bottom: 8px;
  }
  .field-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
  .field-label {
    color: var(--color-text-2);
    min-width: 72px;
  }
  .json-block {
    background: var(--color-fill-2);
    border-radius: 4px;
    padding: 12px;
    margin: 0;
    font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow-y: auto;
  }
  .json-editor {
    font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
  }
  .note-block {
    margin-top: 12px;
  }
  .action-section {
    padding-top: 12px;
    border-top: 1px solid var(--color-neutral-3);
  }
  .action-buttons {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  :deep(.row-disabled) td {
    color: var(--color-text-3);
    background: var(--color-fill-1);
  }
}
</style>
