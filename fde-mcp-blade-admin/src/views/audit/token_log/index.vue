<template>
  <div class="token-log-page">
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
        <a-form-item field="action" :label="$t('auditLog.tokenAction')">
          <a-select v-model="searchForm.action" :placeholder="$t('commonTable.all')" allow-clear style="width: 140px">
            <a-option v-for="opt in tokenActionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="token_id" :label="$t('auditLog.tokenId')">
          <a-input-number v-model="searchForm.token_id" :placeholder="$t('auditLog.tokenId')" :min="1" allow-clear style="width: 140px" />
        </a-form-item>
        <a-form-item field="operator_name" :label="$t('auditLog.operator')">
          <a-input v-model="searchForm.operator_name" :placeholder="$t('commonTable.searchPlaceholder')" allow-clear style="width: 160px" />
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
        <template #columns>
          <a-table-column :title="$t('auditLog.logId')" data-index="id" :width="80" />
          <a-table-column :title="$t('auditLog.riskLevel')" :width="100">
            <template #cell="{ record }">
              <a-tag v-if="riskLevelMap[record.risk_level]" :color="riskLevelMap[record.risk_level].color" size="small">
                {{ riskLevelMap[record.risk_level].label }}
              </a-tag>
              <span v-else>{{ record.risk_level || '-' }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('auditLog.tokenAction')" :width="110">
            <template #cell="{ record }">
              <a-tag :color="record.action === 'create' ? 'green' : 'red'" size="small">
                {{ actionLabel(record.action) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('auditLog.tokenId')" data-index="token_id" :width="90" />
          <a-table-column :title="$t('auditLog.tokenJti')" data-index="token_jti" :width="200" :ellipsis="true" />
          <a-table-column :title="$t('auditLog.operator')" :width="120">
            <template #cell="{ record }">{{ record.operator_name || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('auditLog.operatorIp')" data-index="operator_ip" :width="140" />
          <a-table-column :title="$t('auditLog.detail')" data-index="detail" :width="260" :ellipsis="true" />
          <a-table-column :title="$t('auditLog.time')" data-index="created_at" :width="180" />
          <a-table-column :title="$t('commonTable.operation')" :width="80" fixed="right">
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
      :title="$t('auditStats.tokenLog')"
      width="600px"
      :footer="false"
      unmount-on-close
    >
      <a-descriptions :data="detailData" :column="1" bordered layout="inline-horizontal" />
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

const { t } = useI18n()
const { riskLevelOptions, riskLevelMap, tokenActionOptions } = useAuditLogDict()

// 令牌审计不涉及 disable 级别
const riskLevelFiltered = computed(() => riskLevelOptions.value.filter(o => o.value !== 'disable'))

// ==================== 搜索 ====================
const searchForm = reactive({
  risk_level: undefined,
  action: undefined,
  token_id: undefined,
  operator_name: '',
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
    action: undefined,
    token_id: undefined,
    operator_name: '',
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
    Object.keys(searchForm).forEach(key => {
      const val = searchForm[key]
      if (val !== '' && val !== undefined && val !== null) {
        params[key] = val
      }
    })
    const res = await api.auditLog.getTokenLogList(params)
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error(t('auditStats.fetchFailed'), e)
  } finally {
    loading.value = false
  }
}

function actionLabel(type) {
  const opt = tokenActionOptions.value.find(o => o.value === type)
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
    const res = await api.auditLog.exportTokenLog(params)
    const filename = getFilenameFromHeaders(res?.headers, 'gis_token_log.xlsx')
    downloadBlob(res?.data || res, filename)
    Message.success(t('auditLog.exportSuccess'))
  } catch (e) {
    console.error(t('auditLog.exportFailed'), e)
    Message.error(t('auditLog.exportFailed'))
  } finally {
    exportLoading.value = false
  }
}

// ==================== 详情 ====================
const detailVisible = ref(false)
const detailData = ref([])

function showDetail(record) {
  detailData.value = [
    { label: t('auditLog.logId'), value: record.id },
    { label: t('auditLog.riskLevel'), value: riskLevelMap.value[record.risk_level]?.label || record.risk_level },
    { label: t('auditLog.tokenAction'), value: actionLabel(record.action) },
    { label: t('auditLog.tokenId'), value: record.token_id },
    { label: t('auditLog.tokenJti'), value: record.token_jti || '-' },
    { label: t('auditLog.userId'), value: record.operator_id },
    { label: t('auditLog.operator'), value: record.operator_name || '-' },
    { label: t('auditLog.operatorIp'), value: record.operator_ip || '-' },
    { label: t('auditLog.detail'), value: record.detail || '-' },
    { label: t('commonTable.createTime'), value: record.created_at }
  ]
  detailVisible.value = true
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.token-log-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
