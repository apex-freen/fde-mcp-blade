<template>
  <div class="intercept-log-table">
    <!-- 搜索区域 -->
    <a-form :model="searchForm" layout="inline">
      <a-form-item field="intercept_type" :label="$t('riskAlert.interceptType')">
        <a-select
          v-model="searchForm.intercept_type"
          :placeholder="$t('commonTable.all')"
          multiple
          allow-clear
          :max-tag-count="1"
          style="width: 220px"
        >
          <a-option v-for="opt in interceptTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-option>
        </a-select>
      </a-form-item>
      <a-form-item field="risk_level" :label="$t('auditLog.riskLevel')">
        <a-select v-model="searchForm.risk_level" :placeholder="$t('commonTable.all')" allow-clear style="width: 130px">
          <a-option v-for="opt in riskLevelOptions" :key="opt.value" :value="opt.value">
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
      row-key="id"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <template #empty>
        <a-empty :description="$t('riskAlert.interceptEmpty')" />
      </template>
      <template #columns>
        <a-table-column title="ID" data-index="id" :width="80" />
        <a-table-column :title="$t('riskAlert.interceptType')" :width="200">
          <template #cell="{ record }">
            <a-tag :color="interceptTypeMap[record.intercept_type]?.color || 'gray'" size="small">
              {{ interceptTypeMap[record.intercept_type]?.label || record.intercept_type || '-' }}
            </a-tag>
          </template>
        </a-table-column>
        <!-- 该表混装风险 / 频度 / 成本三类维度，单独标注避免笼统写成「风险」 -->
        <a-table-column :title="$t('riskAlert.dimension')" :width="90">
          <template #cell="{ record }">
            {{ dimensionLabel(record.intercept_type) }}
          </template>
        </a-table-column>
        <a-table-column :title="$t('auditLog.riskLevel')" :width="100">
          <template #cell="{ record }">
            <a-tag v-if="riskLevelMap[record.risk_level]" :color="riskLevelMap[record.risk_level].color" size="small">
              {{ riskLevelMap[record.risk_level].label }}
            </a-tag>
            <span v-else>{{ record.risk_level || '-' }}</span>
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
        <a-table-column :title="$t('riskAlert.reason')" data-index="reason" :width="240" :ellipsis="true" />
        <a-table-column :title="$t('riskAlert.occurredAt')" data-index="created_time" :width="180" />
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { useAuditLogDict } from '@/constants/auditDict'
import { downloadBlob, buildExportFilename, extractBlobErrorMsg } from '@/utils/download'

const { t } = useI18n()
const { riskLevelOptions, riskLevelMap, interceptTypeOptions, interceptTypeMap, interceptDimensionMap } = useAuditLogDict()

function dimensionLabel(type) {
  const dimension = interceptTypeMap.value[type]?.dimension
  return dimension ? interceptDimensionMap.value[dimension] || '-' : '-'
}

// ==================== 搜索 ====================
const searchForm = reactive({
  intercept_type: [],
  risk_level: undefined,
  user_name: '',
  tool_name: '',
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
    intercept_type: [],
    risk_level: undefined,
    user_name: '',
    tool_name: '',
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
    if (Array.isArray(val)) {
      // 拦截类型支持逗号分隔多值
      if (val.length) params[key] = val.join(',')
    } else if (val !== '' && val !== undefined && val !== null) {
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
    const res = await api.gisRiskInterceptLog.getRiskInterceptLogList(buildQuery(true))
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error('获取拦截记录失败:', e)
  } finally {
    loading.value = false
  }
}

// ==================== 导出 ====================
const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    const res = await api.gisRiskInterceptLog.exportRiskInterceptLog(buildQuery(false))
    downloadBlob(res, buildExportFilename('gis_risk_intercept_log'))
    Message.success(t('riskAlert.exportSuccess'))
  } catch (e) {
    // 超过 1 万行时返回 400 + JSON，需从 blob 中解析后端 msg
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
.intercept-log-table {
  .table-toolbar {
    margin: $space-4 0;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
