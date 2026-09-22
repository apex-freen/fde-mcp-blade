<template>
  <div class="risk-call-table">
    <!-- 搜索区域 -->
    <a-form :model="searchForm" layout="inline">
      <a-form-item field="risk_level" :label="$t('auditLog.riskLevel')">
        <a-select v-model="searchForm.risk_level" :placeholder="$t('commonTable.all')" allow-clear style="width: 140px">
          <a-option v-for="opt in callRiskLevelOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-option>
        </a-select>
      </a-form-item>
      <a-form-item field="user_name" :label="$t('auditLog.username')">
        <a-input v-model="searchForm.user_name" :placeholder="$t('commonTable.searchPlaceholder')" allow-clear style="width: 150px" />
      </a-form-item>
      <a-form-item field="tool_name" :label="$t('auditLog.toolName')">
        <a-input v-model="searchForm.tool_name" :placeholder="$t('commonTable.searchPlaceholder')" allow-clear style="width: 150px" />
      </a-form-item>
      <a-form-item field="fun_key" :label="$t('auditLog.funKey')">
        <a-input v-model="searchForm.fun_key" :placeholder="$t('commonTable.searchPlaceholder')" allow-clear style="width: 150px" />
      </a-form-item>
      <a-form-item field="time_range" :label="$t('auditLog.timeRange')">
        <a-range-picker
          v-model="timeRange"
          show-time
          style="width: 360px"
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

    <!-- 表格区域 -->
    <div class="table-toolbar">
      <a-button type="primary" :loading="exportLoading" @click="handleExport">
        <template #icon><icon-download /></template>
        {{ $t('commonTable.export') }}
      </a-button>
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
      <template #empty>
        <a-empty :description="$t('riskAlert.callsEmpty')" />
      </template>
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
        <a-table-column :title="$t('auditLog.username')" :width="140">
          <template #cell="{ record }">
            {{ record.user_name || '-' }}
            <a-tag v-if="record.is_admin" color="purple" size="small">{{ $t('auditLog.isAdmin') }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column :title="$t('auditLog.toolName')" data-index="tool_name" :width="160" :ellipsis="true" />
        <a-table-column :title="$t('auditLog.funKey')" data-index="fun_key" :width="150" :ellipsis="true" />
        <a-table-column :title="$t('commonTable.status')" :width="90">
          <template #cell="{ record }">
            <a-tag :color="record.success ? 'green' : 'red'" size="small">
              {{ record.success ? $t('commonTable.success') : $t('commonTable.failure') }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column :title="$t('auditLog.time')" data-index="created_time" :width="180" />
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { useAuditLogDict } from '@/constants/auditDict'
import { downloadBlob, buildExportFilename, extractBlobErrorMsg } from '@/utils/download'

const { t } = useI18n()
const { riskLevelOptions, riskLevelMap, cmdTypeOptions } = useAuditLogDict()

// 该页聚焦风险调用，默认只看 risk；风险等级候选去掉 disable（不在 cmd_log 口径内）
const callRiskLevelOptions = computed(() => riskLevelOptions.value.filter(o => o.value !== 'disable'))

// ==================== 搜索 ====================
const searchForm = reactive({
  risk_level: 'risk',
  user_name: '',
  tool_name: '',
  fun_key: '',
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
    risk_level: 'risk',
    user_name: '',
    tool_name: '',
    fun_key: '',
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
  pageSize: 20,
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

function buildQuery(withPaging = true) {
  const params = {}
  Object.keys(searchForm).forEach(key => {
    const val = searchForm[key]
    if (val !== '' && val !== undefined && val !== null) {
      params[key] = val
    }
  })
  if (withPaging) {
    params.page = pagination.current
    params.page_size = pagination.pageSize
  }
  return params
}

async function fetchList() {
  loading.value = true
  try {
    const res = await api.auditLog.getCmdLogList(buildQuery(true))
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error('获取风险调用记录失败:', e)
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
  exportLoading.value = true
  try {
    const res = await api.auditLog.exportCmdLog(buildQuery(false), { showError: false })
    downloadBlob(res, buildExportFilename('gis_cmd_log'))
    Message.success(t('riskAlert.exportSuccess'))
  } catch (e) {
    // 失败时返回 JSON（非文件流），需从 blob 中解析后端 msg
    Message.error(await extractBlobErrorMsg(e, t('riskAlert.exportFailed')))
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.risk-call-table {
  .table-toolbar {
    margin: $space-4 0;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
