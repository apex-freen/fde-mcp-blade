<template>
  <div class="operation-log-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="risk_level" :label="$t('auditLog.riskLevel')">
          <a-select v-model="searchForm.risk_level" :placeholder="$t('commonTable.all')" allow-clear style="width: 140px">
            <a-option v-for="opt in riskLevelOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="cmd_type" :label="$t('auditLog.cmdType')">
          <a-select v-model="searchForm.cmd_type" :placeholder="$t('commonTable.all')" allow-clear style="width: 140px">
            <a-option v-for="opt in cmdTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="user_name" :label="$t('auditLog.username')">
          <a-input v-model="searchForm.user_name" :placeholder="$t('commonTable.searchPlaceholder')" allow-clear style="width: 160px" />
        </a-form-item>
        <a-form-item field="tool_name" :label="$t('auditLog.toolName')">
          <a-input v-model="searchForm.tool_name" :placeholder="$t('commonTable.searchPlaceholder')" allow-clear style="width: 160px" />
        </a-form-item>
        <a-form-item field="fun_key" :label="$t('auditLog.funKey')">
          <a-input v-model="searchForm.fun_key" :placeholder="$t('commonTable.searchPlaceholder')" allow-clear style="width: 160px" />
        </a-form-item>
        <a-form-item field="eqp_client_id" :label="$t('auditLog.deviceClientId')">
          <a-input v-model="searchForm.eqp_client_id" :placeholder="$t('auditLog.deviceClientId')" allow-clear style="width: 180px" />
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
        </a-space>
      </div>

      <a-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="log_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('auditLog.logId')" data-index="log_id" :width="80" />
          <a-table-column :title="$t('auditLog.riskLevel')" :width="100">
            <template #cell="{ record }">
              <a-tag v-if="riskLevelMap[record.risk_level]" :color="riskLevelMap[record.risk_level].color" size="small">
                {{ riskLevelMap[record.risk_level].label }}
              </a-tag>
              <span v-else>{{ record.risk_level || '-' }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('auditLog.cmdType')" :width="110">
            <template #cell="{ record }">
              <a-tag color="arcoblue" size="small">{{ cmdTypeLabel(record.cmd_type) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('auditLog.username')" :width="120">
            <template #cell="{ record }">
              {{ record.user_name }}
              <a-tag v-if="record.is_admin" color="purple" size="small">{{ $t('auditLog.isAdmin') }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('auditLog.toolName')" data-index="tool_name" :width="140" :ellipsis="true" />
          <a-table-column :title="$t('auditLog.funKey')" data-index="fun_key" :width="150" :ellipsis="true" />
          <a-table-column :title="$t('auditLog.deviceClientId')" data-index="eqp_client_id" :width="180" :ellipsis="true" />
          <a-table-column :title="$t('auditLog.elapsed')" :width="90">
            <template #cell="{ record }">
              <span :class="record.elapsed_ms > 1000 ? 'slow-warn' : ''">{{ record.elapsed_ms }}ms</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.status')" :width="80">
            <template #cell="{ record }">
              <a-tag :color="record.success ? 'green' : 'red'" size="small">
                {{ record.success ? $t('commonTable.success') : $t('commonTable.failure') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('auditLog.time')" data-index="created_time" :width="180" />
          <a-table-column :title="$t('commonTable.operation')" :width="80" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="small" @click="showDetail(record)">
                {{ $t('commonTable.details') }}
              </a-button>
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
        <div class="json-label">{{ $t('auditLog.requestParams') }}</div>
        <pre class="json-block">{{ formatJson(detailRecord.request_params) }}</pre>
        <div class="json-label">{{ $t('auditLog.responseBody') }}</div>
        <pre class="json-block">{{ formatJson(detailRecord.response_body) }}</pre>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { useAuditLogDict } from '@/constants/auditDict'
import { downloadBlob, getFilenameFromHeaders } from '@/utils/download'

const { t } = useI18n()
const { riskLevelOptions, riskLevelMap, cmdTypeOptions } = useAuditLogDict()

// ==================== 搜索 ====================
const searchForm = reactive({
  risk_level: undefined,
  cmd_type: undefined,
  user_name: '',
  tool_name: '',
  fun_key: '',
  eqp_client_id: '',
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
    cmd_type: undefined,
    user_name: '',
    tool_name: '',
    fun_key: '',
    eqp_client_id: '',
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
    // 只传有值的参数
    Object.keys(searchForm).forEach(key => {
      const val = searchForm[key]
      if (val !== '' && val !== undefined && val !== null) {
        params[key] = val
      }
    })
    const res = await api.auditLog.getCmdLogList(params)
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error('Failed to fetch operation log:', e)
  } finally {
    loading.value = false
  }
}

function cmdTypeLabel(type) {
  const opt = cmdTypeOptions.value.find(o => o.value === type)
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
    const res = await api.auditLog.exportCmdLog(params)
    const filename = getFilenameFromHeaders(res?.headers, 'gis_cmd_log.xlsx')
    downloadBlob(res?.data || res, filename)
    Message.success(t('auditLog.exportSuccess'))
  } catch (e) {
    console.error('Export failed:', e)
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
    { label: t('auditLog.cmdType'), value: cmdTypeLabel(record.cmd_type) },
    { label: t('auditLog.tokenId'), value: record.token_id || '-' },
    { label: t('auditLog.tokenJti'), value: record.token_jti || '-' },
    { label: t('auditLog.userId'), value: record.user_id },
    { label: t('auditLog.username'), value: record.user_name },
    { label: t('auditLog.isAdmin'), value: record.is_admin ? t('auditLog.yes') : t('auditLog.no') },
    { label: t('auditLog.toolName'), value: record.tool_name || '-' },
    { label: t('auditLog.funKey'), value: record.fun_key || '-' },
    { label: t('auditLog.deviceClientIdShort'), value: record.eqp_id || '-' },
    { label: t('auditLog.deviceClientId'), value: record.eqp_client_id || '-' },
    { label: t('auditLog.execStatus'), value: record.success ? t('commonTable.success') : t('commonTable.failure') },
    { label: t('auditLog.elapsed'), value: record.elapsed_ms },
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
.operation-log-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: flex-end;
  }
  .slow-warn {
    color: rgb(var(--orange-6));
    font-weight: 600;
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
