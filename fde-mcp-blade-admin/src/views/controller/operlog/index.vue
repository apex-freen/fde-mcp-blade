<template>
  <div class="operlog-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="title" :label="$t('operlog.title')">
          <a-input
            v-model="searchForm.title"
            :placeholder="$t('operlog.titlePlaceholder')"
            allow-clear
            style="width: 180px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="operName" :label="$t('operlog.operName')">
          <a-input
            v-model="searchForm.operName"
            :placeholder="$t('operlog.operNamePlaceholder')"
            allow-clear
            style="width: 160px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="businessType" :label="$t('operlog.businessType')">
          <a-select
            v-model="searchForm.businessType"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
          >
            <a-option v-for="opt in businessTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="status" :label="$t('operlog.status')">
          <a-select
            v-model="searchForm.status"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 120px"
          >
            <a-option :value="0">{{ $t('operlog.normal') }}</a-option>
            <a-option :value="1">{{ $t('operlog.abnormal') }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="timeRange" :label="$t('operlog.timeRange')">
          <a-range-picker
            v-model="dateRange"
            value-format="YYYY-MM-DD"
            :placeholder="[$t('operlog.startDate'), $t('operlog.endDate')]"
            allow-clear
            style="width: 260px"
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
          <a-popconfirm
            :content="$t('operlog.batchDeleteConfirm', { count: selectedKeys.length })"
            position="br"
            :disabled="!selectedKeys.length"
            @ok="handleBatchDelete"
          >
            <a-button status="danger" :disabled="!selectedKeys.length">
              <template #icon><icon-delete /></template>
              {{ $t('operlog.batchDelete') }}
            </a-button>
          </a-popconfirm>
          <a-popconfirm
            :content="$t('operlog.cleanConfirm')"
            position="br"
            @ok="handleClean"
          >
            <a-button status="danger">
              <template #icon><icon-delete /></template>
              {{ $t('operlog.clean') }}
            </a-button>
          </a-popconfirm>
        </a-space>
        <a-space>
          <a-button :loading="loading" @click="fetchList">
            <template #icon><icon-refresh /></template>
            {{ $t('commonTable.refresh') }}
          </a-button>
          <a-button v-if="canExport" :loading="exportLoading" @click="handleExport">
            <template #icon><icon-download /></template>
            {{ $t('commonTable.export') }}
          </a-button>
        </a-space>
      </div>

      <a-table
        v-model:selectedKeys="selectedKeys"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :row-selection="{ type: 'checkbox', showCheckedAll: true }"
        row-key="operId"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('operlog.operId')" data-index="operId" :width="90" />
          <a-table-column :title="$t('operlog.title')" data-index="title" :width="160" :ellipsis="true" />
          <a-table-column :title="$t('operlog.businessType')" :width="110">
            <template #cell="{ record }">
              <a-tag :color="businessTypeColor(record.businessType)" size="small">
                {{ businessTypeLabel(record.businessType) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('operlog.requestMethod')" data-index="requestMethod" :width="110" />
          <a-table-column :title="$t('operlog.operName')" data-index="operName" :width="120" />
          <a-table-column :title="$t('operlog.operUrl')" data-index="operUrl" :width="220" :ellipsis="true" />
          <a-table-column :title="$t('operlog.operIp')" data-index="operIp" :width="140" />
          <a-table-column :title="$t('operlog.status')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status === 0 ? 'green' : 'red'" size="small">
                {{ record.status === 0 ? $t('operlog.normal') : $t('operlog.abnormal') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('operlog.operTime')" :width="180">
            <template #cell="{ record }">
              {{ formatDateTime(record.operTime) }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('operlog.costTime')" :width="100">
            <template #cell="{ record }">
              <span :class="record.costTime > 1000 ? 'slow-warn' : ''">{{ record.costTime }}ms</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="90" fixed="right">
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
      :title="$t('operlog.detail')"
      width="680px"
      :footer="false"
      unmount-on-close
    >
      <a-descriptions :data="detailData" :column="1" bordered layout="inline-horizontal" />
      <div v-if="detailRecord" class="json-section">
        <div class="json-label">{{ $t('operlog.operParam') }}</div>
        <pre class="json-block">{{ formatJson(detailRecord.operParam) }}</pre>
        <div class="json-label">{{ $t('operlog.jsonResult') }}</div>
        <pre class="json-block">{{ formatJson(detailRecord.jsonResult) }}</pre>
        <template v-if="detailRecord.errorMsg">
          <div class="json-label">{{ $t('operlog.errorMsg') }}</div>
          <pre class="json-block error-block">{{ detailRecord.errorMsg }}</pre>
        </template>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { hasPermission } from '@/utils/permission'
import { downloadBlob, getFilenameFromHeaders } from '@/utils/download'

const { t } = useI18n()

// 导出接口需权限点 controller:operlog（页面级码，与菜单一致）
const canExport = computed(() => hasPermission('controller:operlog'))

// 业务类型枚举（0 其它 / 1 新增 / 2 修改 / 3 删除 / 4 授权 / 5 导出 / 6 导入 / 7 强退 / 8 生成代码 / 9 清空数据）
const BUSINESS_TYPE_BASE = [
  { value: 0, key: 'businessType0', color: 'gray' },
  { value: 1, key: 'businessType1', color: 'green' },
  { value: 2, key: 'businessType2', color: 'arcoblue' },
  { value: 3, key: 'businessType3', color: 'red' },
  { value: 4, key: 'businessType4', color: 'purple' },
  { value: 5, key: 'businessType5', color: 'orange' },
  { value: 6, key: 'businessType6', color: 'cyan' },
  { value: 7, key: 'businessType7', color: 'gold' },
  { value: 8, key: 'businessType8', color: 'magenta' },
  { value: 9, key: 'businessType9', color: 'darkgreen' }
]

const businessTypeOptions = computed(() =>
  BUSINESS_TYPE_BASE.map((item) => ({ value: item.value, label: t(`operlog.${item.key}`) }))
)

function businessTypeLabel(type) {
  const item = BUSINESS_TYPE_BASE.find((o) => o.value === type)
  return item ? t(`operlog.${item.key}`) : String(type ?? '-')
}

function businessTypeColor(type) {
  return BUSINESS_TYPE_BASE.find((o) => o.value === type)?.color || 'gray'
}

function operatorTypeLabel(type) {
  if (type === 1) return t('operlog.operatorType1')
  if (type === 2) return t('operlog.operatorType2')
  return t('operlog.operatorType0')
}

// operTime 为 ISO8601 无时区字符串（2026-09-13T21:15:59），仅做展示层替换
function formatDateTime(val) {
  if (!val) return '-'
  return String(val).replace('T', ' ')
}

// ==================== 搜索 ====================
const searchForm = reactive({
  title: '',
  operName: '',
  businessType: undefined,
  status: undefined
})
const dateRange = ref([])

const buildFilterParams = () => {
  const params = {}
  Object.keys(searchForm).forEach((key) => {
    const val = searchForm[key]
    if (val !== '' && val !== undefined && val !== null) {
      params[key] = val
    }
  })
  const [beginTime, endTime] = dateRange.value || []
  if (beginTime) params['params[beginTime]'] = beginTime
  if (endTime) params['params[endTime]'] = endTime
  return params
}

function handleSearch() {
  pagination.current = 1
  selectedKeys.value = []
  fetchList()
}

function handleReset() {
  searchForm.title = ''
  searchForm.operName = ''
  searchForm.businessType = undefined
  searchForm.status = undefined
  dateRange.value = []
  handleSearch()
}

// ==================== 表格 ====================
const loading = ref(false)
const tableData = ref([])
const selectedKeys = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})

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
    const res = await api.gisOperlog.getOperlogList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      ...buildFilterParams()
    })
    // 列表接口直接返回 { total, rows }
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error('获取系统操作日志失败:', e)
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// ==================== 删除 / 清空 ====================
async function handleBatchDelete() {
  if (!selectedKeys.value.length) {
    Message.warning(t('operlog.selectRequired'))
    return
  }
  try {
    await api.gisOperlog.deleteOperlog(selectedKeys.value.join(','))
    Message.success(t('commonTable.success'))
    selectedKeys.value = []
    fetchList()
  } catch (e) {
    console.error('删除系统操作日志失败:', e)
  }
}

async function handleClean() {
  try {
    await api.gisOperlog.cleanOperlog()
    Message.success(t('commonTable.success'))
    selectedKeys.value = []
    pagination.current = 1
    fetchList()
  } catch (e) {
    console.error('清空系统操作日志失败:', e)
  }
}

// ==================== 导出 ====================
const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    const res = await api.gisOperlog.exportOperlog(buildFilterParams())
    const blob = res instanceof Blob ? res : res?.data || res
    const filename = getFilenameFromHeaders(res?.headers, 'operlog.xlsx')
    downloadBlob(blob, filename)
  } catch (e) {
    console.error('导出系统操作日志失败:', e)
    Message.error(t('common.error'))
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
    { label: t('operlog.operId'), value: record.operId },
    { label: t('operlog.title'), value: record.title || '-' },
    { label: t('operlog.businessType'), value: businessTypeLabel(record.businessType) },
    { label: t('operlog.method'), value: record.method || '-' },
    { label: t('operlog.requestMethod'), value: record.requestMethod || '-' },
    { label: t('operlog.operatorType'), value: operatorTypeLabel(record.operatorType) },
    { label: t('operlog.operName'), value: record.operName || '-' },
    { label: t('operlog.deptName'), value: record.deptName || '-' },
    { label: t('operlog.operUrl'), value: record.operUrl || '-' },
    { label: t('operlog.operIp'), value: record.operIp || '-' },
    { label: t('operlog.operLocation'), value: record.operLocation || '-' },
    { label: t('operlog.status'), value: record.status === 0 ? t('operlog.normal') : t('operlog.abnormal') },
    { label: t('operlog.costTime'), value: `${record.costTime}ms` },
    { label: t('operlog.operTime'), value: formatDateTime(record.operTime) }
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

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.operlog-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: space-between;
    align-items: center;
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
  .error-block {
    color: rgb(var(--red-6));
  }
}
</style>
