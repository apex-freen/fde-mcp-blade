<template>
  <div class="logininfor-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="ipaddr" :label="$t('logininfor.ipaddr')">
          <a-input
            v-model="searchForm.ipaddr"
            :placeholder="$t('logininfor.ipPlaceholder')"
            allow-clear
            style="width: 170px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="userName" :label="$t('logininfor.userName')">
          <a-input
            v-model="searchForm.userName"
            :placeholder="$t('logininfor.userNamePlaceholder')"
            allow-clear
            style="width: 160px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="status" :label="$t('logininfor.status')">
          <a-select
            v-model="searchForm.status"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 120px"
          >
            <a-option value="0">{{ $t('logininfor.success') }}</a-option>
            <a-option value="1">{{ $t('logininfor.failed') }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="timeRange" :label="$t('logininfor.timeRange')">
          <a-range-picker
            v-model="dateRange"
            value-format="YYYY-MM-DD"
            :placeholder="[$t('logininfor.startDate'), $t('logininfor.endDate')]"
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
            :content="$t('logininfor.batchDeleteConfirm', { count: selectedKeys.length })"
            position="br"
            :disabled="!selectedKeys.length"
            @ok="handleBatchDelete"
          >
            <a-button status="danger" :disabled="!selectedKeys.length">
              <template #icon><icon-delete /></template>
              {{ $t('logininfor.batchDelete') }}
            </a-button>
          </a-popconfirm>
          <a-popconfirm
            :content="$t('logininfor.cleanConfirm')"
            position="br"
            @ok="handleClean"
          >
            <a-button status="danger">
              <template #icon><icon-delete /></template>
              {{ $t('logininfor.clean') }}
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
        row-key="infoId"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('logininfor.infoId')" data-index="infoId" :width="100" />
          <a-table-column :title="$t('logininfor.userName')" data-index="userName" :width="130" />
          <a-table-column :title="$t('logininfor.ipaddr')" data-index="ipaddr" :width="150" />
          <a-table-column :title="$t('logininfor.loginLocation')" data-index="loginLocation" :width="130" :ellipsis="true" />
          <a-table-column :title="$t('logininfor.browser')" data-index="browser" :width="130" :ellipsis="true" />
          <a-table-column :title="$t('logininfor.os')" data-index="os" :width="130" :ellipsis="true" />
          <a-table-column :title="$t('logininfor.status')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="record.status === '0' ? 'green' : 'red'">
                {{ record.status === '0' ? $t('logininfor.success') : $t('logininfor.failed') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('logininfor.msg')" data-index="msg" :width="180" :ellipsis="true" />
          <a-table-column :title="$t('logininfor.loginTime')" data-index="loginTime" :width="170" />
          <a-table-column :title="$t('commonTable.operation')" :width="90" fixed="right">
            <template #cell="{ record }">
              <a-popconfirm
                :content="$t('logininfor.deleteConfirm')"
                position="br"
                @ok="handleDelete(record)"
              >
                <a-button type="text" size="small" status="danger" @click.stop>
                  {{ $t('commonTable.delete') }}
                </a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
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

// 导出接口需权限点 controller:logininfor
const canExport = computed(() => hasPermission('controller:logininfor'))

// ==================== 搜索 ====================
const searchForm = reactive({
  ipaddr: '',
  userName: '',
  status: undefined
})
// 日期级筛选，后端按 params[beginTime] / params[endTime] 取值
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
  searchForm.ipaddr = ''
  searchForm.userName = ''
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
    const res = await api.gisLogininfor.getLogininforList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      ...buildFilterParams()
    })
    // 列表接口直接返回 { total, rows }
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error('获取登录日志失败:', e)
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// ==================== 删除 / 清空 ====================
async function handleDelete(record) {
  try {
    await api.gisLogininfor.deleteLogininfor(record.infoId)
    Message.success(t('commonTable.success'))
    fetchList()
  } catch (e) {
    console.error('删除登录日志失败:', e)
  }
}

async function handleBatchDelete() {
  if (!selectedKeys.value.length) {
    Message.warning(t('logininfor.selectRequired'))
    return
  }
  try {
    await api.gisLogininfor.deleteLogininfor(selectedKeys.value.join(','))
    Message.success(t('commonTable.success'))
    selectedKeys.value = []
    fetchList()
  } catch (e) {
    console.error('批量删除登录日志失败:', e)
  }
}

async function handleClean() {
  try {
    await api.gisLogininfor.cleanLogininfor()
    Message.success(t('commonTable.success'))
    selectedKeys.value = []
    pagination.current = 1
    fetchList()
  } catch (e) {
    console.error('清空登录日志失败:', e)
  }
}

// ==================== 导出 ====================
const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    const res = await api.gisLogininfor.exportLogininfor(buildFilterParams())
    const blob = res instanceof Blob ? res : res?.data || res
    const filename = getFilenameFromHeaders(res?.headers, 'logininfor.xlsx')
    downloadBlob(blob, filename)
  } catch (e) {
    console.error('导出登录日志失败:', e)
    Message.error(t('common.error'))
  } finally {
    exportLoading.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.logininfor-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
