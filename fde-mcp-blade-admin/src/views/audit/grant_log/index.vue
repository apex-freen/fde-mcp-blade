<template>
  <div class="grant-log-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="risk_level" :label="$t('auditLog.riskLevel')">
          <a-select v-model="searchForm.risk_level" :placeholder="$t('commonTable.all')" allow-clear style="width: 140px">
            <a-option v-for="opt in riskLevelFiltered" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="action_type" :label="$t('auditLog.actionType')">
          <a-select v-model="searchForm.action_type" :placeholder="$t('commonTable.all')" allow-clear style="width: 140px">
            <a-option v-for="opt in grantActionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="operator_name" :label="$t('auditLog.operator')">
          <a-input v-model="searchForm.operator_name" :placeholder="$t('auditLog.searchPlaceholder')" allow-clear style="width: 160px" />
        </a-form-item>
        <a-form-item field="grant_type" :label="$t('auditLog.grantType')">
          <a-select v-model="searchForm.grant_type" :placeholder="$t('commonTable.all')" allow-clear style="width: 140px">
            <a-option v-for="opt in grantTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="out_agent_id" :label="$t('auditLog.agentId')">
          <a-input v-model="searchForm.out_agent_id" :placeholder="$t('auditLog.agentId')" allow-clear style="width: 160px" />
        </a-form-item>
        <a-form-item field="eqp_name" :label="$t('auditLog.deviceClientIdShort')">
          <a-input v-model="searchForm.eqp_name" :placeholder="$t('auditLog.searchPlaceholder')" allow-clear style="width: 160px" />
        </a-form-item>
        <a-form-item field="fun_key" :label="$t('auditLog.funKey')">
          <a-input v-model="searchForm.fun_key" :placeholder="$t('auditLog.funKey')" allow-clear style="width: 160px" />
        </a-form-item>
        <a-form-item field="success" :label="$t('auditLog.execStatus')">
          <a-select v-model="searchForm.success" :placeholder="$t('commonTable.all')" allow-clear style="width: 120px">
            <a-option :value="true">{{ $t('commonTable.success') }}</a-option>
            <a-option :value="false">{{ $t('commonTable.failure') }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="time_range" :label="$t('auditLog.timeRange')">
          <a-range-picker
            v-model="timeRange"
            show-time
            style="width: 380px"
            @change="handleTimeChange"
          />
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
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 表格区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="table-toolbar">
        <a-space>
          <a-button type="primary" :loading="exportLoading" @click="handleExport">
            <template #icon><icon-download /></template>
            {{ $t('commonTable.export') }}
          </a-button>
          <TableSettings
            :columns="colDefs"
            v-model:hidden-keys="hiddenKeys"
            v-model:density="density"
          />
        </a-space>
      </div>

      <a-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :size="tableSize"
        :scroll="{ x: 1300, y: 480 }"
        :virtual-list-props="{ height: 480, threshold: 100 }"
        row-key="log_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column v-if="!isColHidden('log_id')" :title="$t('auditLog.logId')" data-index="log_id" :width="80" />
          <a-table-column v-if="!isColHidden('risk_level')" :title="$t('auditLog.riskLevel')" :width="100">
            <template #cell="{ record }">
              <a-tag v-if="riskLevelMap[record.risk_level]" :color="riskLevelMap[record.risk_level].color" size="small">
                {{ riskLevelMap[record.risk_level].label }}
              </a-tag>
              <span v-else>{{ record.risk_level || '-' }}</span>
            </template>
          </a-table-column>
          <a-table-column v-if="!isColHidden('action_type')" :title="$t('auditLog.actionType')" :width="110">
            <template #cell="{ record }">
              <a-tag :color="actionColor(record.action_type)" size="small">
                {{ actionLabel(record.action_type) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column v-if="!isColHidden('operator')" :title="$t('auditLog.operator')" :width="120">
            <template #cell="{ record }">{{ record.operator_name || '-' }}</template>
          </a-table-column>
          <a-table-column v-if="!isColHidden('grant_type')" :title="$t('auditLog.grantType')" :width="100">
            <template #cell="{ record }">
              <a-tag color="arcoblue" size="small">{{ grantTypeLabel(record.grant_type) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column v-if="!isColHidden('eqp_name')" :title="$t('auditLog.deviceClientIdShort')" data-index="eqp_name" :width="160" :ellipsis="true" />
          <a-table-column v-if="!isColHidden('fun_key')" :title="$t('auditLog.funKey')" data-index="fun_key" :width="150" :ellipsis="true" />
          <a-table-column v-if="!isColHidden('out_agent_id')" :title="$t('auditLog.agentId')" data-index="out_agent_id" :width="140" :ellipsis="true" />
          <a-table-column v-if="!isColHidden('success')" :title="$t('commonTable.status')" :width="80">
            <template #cell="{ record }">
              <a-tag :color="record.success ? 'green' : 'red'" size="small">
                {{ record.success ? $t('commonTable.success') : $t('commonTable.failure') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column v-if="!isColHidden('created_time')" :title="$t('auditLog.time')" data-index="created_time" :width="180" />
          <a-table-column v-if="!isColHidden('op')" :title="$t('commonTable.operation')" :width="80" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="small" @click="showDetail(record)">{{ $t('commonTable.details') }}</a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 详情抽屉 -->
    <a-drawer
      v-model:visible="detailVisible"
      :title="$t('auditLog.detail')"
      width="640px"
      :footer="false"
      unmount-on-close
    >
      <a-descriptions :data="detailData" :column="1" bordered layout="inline-horizontal" />
      <div v-if="detailRecord" class="json-section">
        <div class="json-label">{{ $t('auditLog.actionParams') }}</div>
        <pre class="json-block">{{ formatJson(detailRecord.action_params) }}</pre>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'
import { useAuditLogDict } from '@/constants/auditDict'
import { downloadBlob, getFilenameFromHeaders } from '@/utils/download'
import { useTableSettings } from '@/hooks/useTableSettings'

const { t } = useI18n()
const { riskLevelOptions, riskLevelMap, grantActionOptions, grantTypeOptions } = useAuditLogDict()

// 授权审计不涉及 disable 级别
const riskLevelFiltered = computed(() => riskLevelOptions.value.filter(o => o.value !== 'disable'))

// ==================== 搜索 ====================
const searchForm = reactive({
  risk_level: undefined,
  action_type: undefined,
  operator_name: '',
  grant_type: undefined,
  out_agent_id: '',
  eqp_name: '',
  fun_key: '',
  success: undefined,
  begin_time: '',
  end_time: ''
})
const timeRange = ref([])

function handleTimeChange(values) {
  if (values && values.length === 2) {
    searchForm.begin_time = formatTimeStr(values[0])
    searchForm.end_time = formatTimeStr(values[1])
  } else {
    searchForm.begin_time = ''
    searchForm.end_time = ''
  }
}

function formatTimeStr(val) {
  if (!val) return ''
  const d = new Date(val)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  Object.assign(searchForm, {
    risk_level: undefined,
    action_type: undefined,
    operator_name: '',
    grant_type: undefined,
    out_agent_id: '',
    eqp_name: '',
    fun_key: '',
    success: undefined,
    begin_time: '',
    end_time: ''
  })
  timeRange.value = []
  pagination.current = 1
  fetchList()
}

// ==================== 表格 ====================
const loading = ref(false)
const tableData = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})
const columns = []

// ==================== 表格显示设置（列自定义 + 密度） ====================
const colDefs = computed(() => [
  { key: 'log_id', label: t('auditLog.logId') },
  { key: 'risk_level', label: t('auditLog.riskLevel') },
  { key: 'action_type', label: t('auditLog.actionType') },
  { key: 'operator', label: t('auditLog.operator') },
  { key: 'grant_type', label: t('auditLog.grantType') },
  { key: 'eqp_name', label: t('auditLog.deviceClientIdShort') },
  { key: 'fun_key', label: t('auditLog.funKey') },
  { key: 'out_agent_id', label: t('auditLog.agentId') },
  { key: 'success', label: t('commonTable.status') },
  { key: 'created_time', label: t('auditLog.time') },
  { key: 'op', label: t('commonTable.operation') }
])
const { hiddenKeys, density, tableSize, isColHidden } = useTableSettings('audit_grant_log')

function handlePageChange(page) {
  pagination.current = page
  fetchList()
}

function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.current = 1
  fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize
    }
    Object.keys(searchForm).forEach(key => {
      const val = searchForm[key]
      if (val !== '' && val !== undefined && val !== null) {
        params[key] = val
      }
    })
    const res = await api.auditLog.getGrantLogList(params)
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error(t('mcpGrant.fetchGrantFailed') + ':', e)
  } finally {
    loading.value = false
  }
}

function actionLabel(type) {
  const opt = grantActionOptions.value.find(o => o.value === type)
  return opt ? opt.label : type || '-'
}

function actionColor(type) {
  if (type === 'grant' || type === 'batch_grant') return 'green'
  if (type === 'revoke' || type === 'batch_revoke') return 'red'
  return 'gray'
}

function grantTypeLabel(type) {
  const opt = grantTypeOptions.value.find(o => o.value === type)
  return opt ? opt.label : type || '-'
}

// ==================== 导出 ====================
const exportLoading = ref(false)

async function handleExport() {
  if (!searchForm.begin_time || !searchForm.end_time) {
    Message.warning(t('auditLog.exportHint'))
    return
  }
  exportLoading.value = true
  try {
    const params = {}
    Object.keys(searchForm).forEach(key => {
      const val = searchForm[key]
      if (val !== '' && val !== undefined && val !== null) {
        params[key] = val
      }
    })
    const res = await api.auditLog.exportGrantLog(params)
    const filename = getFilenameFromHeaders(res?.headers, 'gis_grant_log.xlsx')
    downloadBlob(res?.data || res, filename)
    Message.success(t('auditLog.exportSuccess'))
  } catch (e) {
    console.error(t('auditLog.exportFailed') + ':', e)
    Message.error(t('auditLog.exportFailed'))
  } finally {
    exportLoading.value = false
  }
}

// ==================== 详情 ====================
const detailVisible = ref(false)
const detailRecord = ref(null)
const detailData = ref([])

function showDetail(record) {
  detailRecord.value = record
  detailData.value = [
    { label: t('auditLog.logId'), value: record.log_id },
    { label: t('auditLog.riskLevel'), value: riskLevelMap.value[record.risk_level]?.label || record.risk_level },
    { label: t('auditLog.actionType'), value: actionLabel(record.action_type) },
    { label: t('auditLog.operator') + t('auditLog.userId'), value: record.operator_id },
    { label: t('auditLog.operator'), value: record.operator_name || '-' },
    { label: t('auditLog.grantedUser'), value: record.gis_user_id || '-' },
    { label: t('auditLog.agentId'), value: record.out_agent_id || '-' },
    { label: t('auditLog.grantType'), value: grantTypeLabel(record.grant_type) },
    { label: t('auditLog.deviceClientIdShort'), value: record.eqp_id || '-' },
    { label: t('auditLog.deviceClientIdShort'), value: record.eqp_name || '-' },
    { label: t('auditLog.funKey'), value: record.fun_key || '-' },
    { label: t('auditLog.grantRecordId'), value: record.grant_id || '-' },
    { label: t('auditLog.execStatus'), value: record.success ? t('commonTable.success') : t('commonTable.failure') },
    { label: t('commonTable.createTime'), value: record.created_time }
  ]
  detailVisible.value = true
}

function formatJson(str) {
  if (!str) return '-'
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.grant-log-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: flex-end;
  }
  .json-section {
    margin-top: 16px;
  }
  .json-label {
    font-weight: 600;
    margin-bottom: 8px;
    margin-top: 16px;
    color: var(--color-text-1);
  }
  .json-block {
    background: var(--color-fill-2);
    border-radius: 4px;
    padding: 12px;
    font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
