<template>
  <div class="shadow-page">
    <!-- 影子开关区（Doc 47 §9.6） -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="panel-title">{{ $t('pluginShadow.switchTitle') }}</div>
      <div class="panel-hint">{{ $t('pluginShadow.switchHint') }}</div>

      <a-spin :loading="switchLoading" style="width: 100%">
        <a-table
          v-if="plugins.length"
          :data="plugins"
          :pagination="false"
          row-key="plugin_name"
          size="small"
        >
          <template #columns>
            <a-table-column :title="$t('pluginShadow.pluginFilter')" data-index="plugin_name" :width="240" />
            <a-table-column :title="$t('pluginShadow.switchTitle')" :width="110">
              <template #cell="{ record }">
                <a-switch
                  size="small"
                  :model-value="record.shadow_mode === true"
                  :disabled="actionSubmitting"
                  @change="(val) => handleToggleShadow(record, val)"
                />
              </template>
            </a-table-column>
            <a-table-column :title="$t('pluginShadow.sideEffectMethods')">
              <template #cell="{ record }">
                <a-space v-if="record.side_effect_methods?.length" size="mini" wrap>
                  <a-tag v-for="m in record.side_effect_methods" :key="m" size="small">{{ m }}</a-tag>
                </a-space>
                <span v-else class="muted">{{ $t('pluginShadow.noSideEffectMethods') }}</span>
              </template>
            </a-table-column>
          </template>
        </a-table>
        <a-empty v-else :description="$t('pluginShadow.emptyRecords')" style="padding: 24px 0" />
      </a-spin>
    </a-card>

    <!-- 记录列表 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <!-- 状态计数 -->
      <div class="count-row">
        <div v-for="s in STATUS_OPTIONS" :key="s" class="count-item" :class="`is-${s}`">
          <span class="count-value">{{ counts[s] ?? 0 }}</span>
          <span class="count-label">{{ statusLabel(s) }}</span>
        </div>
      </div>

      <a-form :model="query" layout="inline" class="filter-bar">
        <a-form-item field="plugin_name" :label="$t('pluginShadow.pluginFilter')">
          <a-select
            v-model="query.plugin_name"
            :placeholder="$t('pluginShadow.allPlugins')"
            allow-clear
            allow-search
            style="width: 220px"
            @change="refreshRecords"
          >
            <a-option v-for="p in plugins" :key="p.plugin_name" :value="p.plugin_name">
              {{ p.plugin_name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="status" :label="$t('pluginShadow.statusFilter')">
          <a-select
            v-model="query.status"
            :placeholder="$t('pluginShadow.allStatus')"
            allow-clear
            style="width: 160px"
            @change="refreshRecords"
          >
            <a-option v-for="s in STATUS_OPTIONS" :key="s" :value="s">
              {{ statusLabel(s) }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button @click="refreshRecords">
            <template #icon><icon-refresh /></template>
            {{ $t('commonTable.refresh') }}
          </a-button>
        </a-form-item>
      </a-form>

      <div class="table-toolbar">
        <span class="table-hint">{{ $t('pluginShadow.pendingOnlyTip') }}</span>
        <span class="table-hint">
          {{ $t('pluginShadow.totalRecords') }} {{ records.length }} {{ $t('pluginShadow.recordsCount') }}
        </span>
      </div>

      <a-table
        :data="records"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 1600 }"
        row-key="record_id"
        size="small"
      >
        <template #columns>
          <a-table-column :title="$t('pluginShadow.recordId')" data-index="record_id" :width="150" />
          <a-table-column :title="$t('pluginShadow.pluginFilter')" data-index="plugin_name" :width="180" />
          <a-table-column :title="$t('pluginShadow.sourceMethod')" data-index="source_method" :width="200" />
          <a-table-column :title="$t('pluginShadow.site')" :width="90">
            <template #cell="{ record }">{{ record.site || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('pluginShadow.statusFilter')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)" size="small">
                {{ statusLabel(record.status) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('pluginShadow.paramsMasked')"
            data-index="params_masked"
            :width="240"
            :ellipsis="true"
          />
          <a-table-column :title="$t('pluginShadow.approver')" :width="100">
            <template #cell="{ record }">{{ record.approver || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('pluginShadow.approvedAt')" :width="160">
            <template #cell="{ record }">{{ formatTime(record.approved_at) }}</template>
          </a-table-column>
          <a-table-column :title="$t('pluginShadow.note')" data-index="note" :width="150" :ellipsis="true" />
          <a-table-column :title="$t('pluginShadow.result')" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ shortText(record.result) }}</template>
          </a-table-column>
          <a-table-column :title="$t('pluginShadow.recordTime')" :width="160">
            <template #cell="{ record }">{{ formatTime(record.record_ts) }}</template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="180" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button type="text" size="small" @click="handleViewParams(record)">
                  {{ $t('pluginShadow.viewParams') }}
                </a-button>
                <template v-if="record.status === 'pending'">
                  <a-button
                    type="text"
                    size="small"
                    status="success"
                    :disabled="actionSubmitting"
                    @click="handleAction(record, 'approve')"
                  >
                    {{ $t('pluginShadow.approve') }}
                  </a-button>
                  <a-button
                    type="text"
                    size="small"
                    status="danger"
                    :disabled="actionSubmitting"
                    @click="handleAction(record, 'reject')"
                  >
                    {{ $t('pluginShadow.reject') }}
                  </a-button>
                </template>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 参数只读视图（仅 params_masked，原始参数不返回） -->
    <a-modal
      v-model:visible="paramsModalVisible"
      :title="$t('pluginShadow.paramsMaskedTitle')"
      width="640px"
      :footer="false"
    >
      <a-alert type="info" class="params-alert">{{ $t('pluginShadow.paramsMaskedReadonly') }}</a-alert>
      <pre class="json-view">{{ prettyParams }}</pre>
    </a-modal>

    <!-- 批准 / 驳回（二次确认 + 备注） -->
    <a-modal
      v-model:visible="actionModalVisible"
      :title="actionMode === 'approve' ? $t('pluginShadow.approveConfirmTitle') : $t('pluginShadow.rejectConfirmTitle')"
      :ok-text="actionMode === 'approve' ? $t('pluginShadow.approve') : $t('pluginShadow.reject')"
      :ok-loading="actionSubmitting"
      :cancel-text="$t('commonTable.cancel')"
      width="560px"
      unmount-on-close
      :on-before-ok="handleActionSubmit"
      @cancel="actionModalVisible = false"
    >
      <a-alert
        :type="actionMode === 'approve' ? 'warning' : 'info'"
        class="params-alert"
      >
        {{ actionMode === 'approve' ? $t('pluginShadow.approveConfirmContent') : $t('pluginShadow.rejectConfirmContent') }}
      </a-alert>
      <div class="target-line">
        {{ $t('pluginShadow.sourceMethod') }}：<span class="mono">{{ actionTarget?.source_method }}</span>
      </div>
      <a-form :model="actionForm" layout="vertical">
        <a-form-item :label="$t('pluginShadow.note')">
          <a-textarea
            v-model="actionForm.note"
            :placeholder="$t('pluginShadow.notePlaceholder')"
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'

const { t } = useI18n()

// 状态枚举与流转：pending --approve--> approved / failed；pending --reject--> rejected
const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'failed']
const STATUS_COLOR = {
  pending: 'orange',
  approved: 'green',
  rejected: 'gray',
  failed: 'red'
}

const statusLabel = (status) => {
  if (!status) return '-'
  return t(`pluginShadow.status${status.charAt(0).toUpperCase()}${status.slice(1)}`)
}
const statusColor = (status) => STATUS_COLOR[status] || 'gray'

// ==================== 影子开关 + 计数 ====================
const switchLoading = ref(false)
const plugins = ref([])
const counts = ref({})

const refreshStatus = async () => {
  switchLoading.value = true
  try {
    const res = await api.gisShadow.getShadowStatus()
    const data = res.data || {}
    plugins.value = Array.isArray(data.plugins) ? data.plugins : []
    counts.value = data.counts || {}
  } catch (e) {
    plugins.value = []
    counts.value = {}
    handleApiError(e, t('pluginShadow.statusFetchFailed'))
  } finally {
    switchLoading.value = false
  }
}

const handleToggleShadow = (row, value) => {
  Modal.confirm({
    title: t('pluginShadow.switchTitle'),
    content: value ? t('pluginShadow.switchConfirmOn') : t('pluginShadow.switchConfirmOff'),
    onOk: async () => {
      try {
        await api.gisShadow.setShadowMode({
          plugin_name: row.plugin_name,
          shadow_mode: value
        })
        Message.success(value ? t('pluginShadow.shadowModeOn') : t('pluginShadow.shadowModeOff'))
        await refreshStatus()
      } catch (e) {
        handleApiError(e, t('pluginShadow.shadowModeFailed'))
      }
    }
  })
}

// ==================== 记录列表 ====================
const loading = ref(false)
const records = ref([])

// 默认按待批准过滤（§9.6）
const query = reactive({
  plugin_name: undefined,
  status: 'pending'
})

const refreshRecords = async () => {
  loading.value = true
  try {
    const params = {}
    if (query.plugin_name) params.plugin_name = query.plugin_name
    if (query.status) params.status = query.status
    const res = await api.gisShadow.getShadowList(params)
    const list = res.data || []
    records.value = Array.isArray(list) ? list : []
  } catch (e) {
    records.value = []
    handleApiError(e, t('pluginShadow.fetchFailed'))
  } finally {
    loading.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([refreshStatus(), refreshRecords()])
}

// ==================== 参数只读视图 ====================
const paramsModalVisible = ref(false)
const paramsRecord = ref(null)

const prettyParams = computed(() => {
  const raw = paramsRecord.value?.params_masked
  if (!raw) return '-'
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch (_) {
    return raw
  }
})

const handleViewParams = (record) => {
  paramsRecord.value = record
  paramsModalVisible.value = true
}

// ==================== 批准 / 驳回 ====================
const actionModalVisible = ref(false)
const actionMode = ref('approve')
const actionTarget = ref(null)
const actionSubmitting = ref(false)
const actionForm = reactive({ note: '' })

const handleAction = (record, mode) => {
  actionTarget.value = record
  actionMode.value = mode
  actionForm.note = ''
  actionModalVisible.value = true
}

const handleActionSubmit = async () => {
  const record = actionTarget.value
  const isApprove = actionMode.value === 'approve'
  const payload = actionForm.note.trim() ? { note: actionForm.note.trim() } : {}
  actionSubmitting.value = true
  try {
    if (isApprove) {
      await api.gisShadow.approveShadow(record.record_id, payload)
    } else {
      await api.gisShadow.rejectShadow(record.record_id, payload)
    }
    Message.success(isApprove ? t('pluginShadow.approveSuccess') : t('pluginShadow.rejectSuccess'))
    actionModalVisible.value = false
    await refreshAll()
    return true
  } catch (e) {
    handleApiError(e, isApprove ? t('pluginShadow.approveFailed') : t('pluginShadow.rejectFailed'))
    return false
  } finally {
    actionSubmitting.value = false
  }
}

// ==================== 工具 ====================
const handleApiError = (e, fallback) => {
  const status = String(e?.response?.status || e?.code || '')
  const msg = e?.response?.data?.msg || e?.msg || ''
  // 401 由请求拦截器统一处理登录失效，此处不重复提示
  if (status === '401') return
  if (status === '403') {
    Message.error(t('pluginShadow.noPermission'))
    return
  }
  Message.error(msg || fallback)
}

const formatTime = (value) => (value ? String(value).replace('T', ' ') : '-')

const shortText = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

onMounted(() => {
  refreshAll()
})
</script>

<style lang="scss" scoped>
.shadow-page {
  .panel-title {
    margin-bottom: $space-2;
    font-weight: 600;
    font-size: 14px;
    color: var(--color-text-1);
  }

  .panel-hint {
    margin-bottom: $space-4;
    color: var(--color-text-3);
    font-size: $font-size-xs;
    line-height: 1.5;
  }

  .muted {
    color: var(--color-text-3);
    font-size: $font-size-xs;
  }

  .count-row {
    display: flex;
    gap: $space-4;
    margin-bottom: $space-5;

    .count-item {
      flex: 1;
      padding: $space-3 $space-4;
      border-radius: $radius;
      background: var(--color-fill-1);
      display: flex;
      flex-direction: column;
      gap: 2px;

      .count-value {
        font-size: 22px;
        font-weight: 600;
        line-height: 1.2;
        color: var(--color-text-1);
      }

      .count-label {
        font-size: $font-size-xs;
        color: var(--color-text-3);
      }

      &.is-pending .count-value {
        color: rgb(var(--warning-6));
      }

      &.is-approved .count-value {
        color: rgb(var(--success-6));
      }

      &.is-failed .count-value {
        color: rgb(var(--danger-6));
      }
    }
  }

  .filter-bar {
    margin-bottom: $space-4;
  }

  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $space-3;

    .table-hint {
      color: var(--color-text-3);
      font-size: 13px;
    }
  }

  .params-alert {
    margin-bottom: $space-3;
  }

  .target-line {
    margin-bottom: $space-3;
    font-size: 13px;
    color: var(--color-text-2);
  }

  .mono {
    font-family: 'Consolas', 'Monaco', monospace;
  }

  .json-view {
    margin: 0;
    max-height: 420px;
    overflow: auto;
    padding: $space-3;
    border-radius: $radius;
    background: var(--color-fill-1);
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>
