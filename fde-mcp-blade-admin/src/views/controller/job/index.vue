<template>
  <div class="job-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="jobName" :label="$t('job.jobName')">
          <a-input
            v-model="searchForm.jobName"
            :placeholder="$t('commonTable.searchPlaceholder')"
            allow-clear
            style="width: 180px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="jobGroup" :label="$t('job.jobGroup')">
          <a-input
            v-model="searchForm.jobGroup"
            placeholder="DEFAULT"
            allow-clear
            style="width: 160px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="status" :label="$t('job.status')">
          <a-select
            v-model="searchForm.status"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 120px"
          >
            <a-option value="0">{{ $t('job.normal') }}</a-option>
            <a-option value="1">{{ $t('job.paused') }}</a-option>
          </a-select>
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
          <a-button type="primary" @click="handleAdd">
            <template #icon><icon-plus /></template>
            {{ $t('commonTable.add') }}
          </a-button>
          <a-popconfirm
            :content="$t('job.batchDeleteConfirm', { count: selectedKeys.length })"
            position="br"
            :disabled="!selectedKeys.length"
            @ok="handleBatchDelete"
          >
            <a-button status="danger" :disabled="!selectedKeys.length">
              <template #icon><icon-delete /></template>
              {{ $t('job.batchDelete') }}
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
        row-key="jobId"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('job.jobId')" data-index="jobId" :width="90" />
          <a-table-column :title="$t('job.jobName')" data-index="jobName" :width="180" :ellipsis="true" />
          <a-table-column :title="$t('job.jobGroup')" data-index="jobGroup" :width="110" />
          <a-table-column :title="$t('job.invokeTarget')" data-index="invokeTarget" :width="220" :ellipsis="true" />
          <a-table-column :title="$t('job.cronExpression')" data-index="cronExpression" :width="150" />
          <a-table-column :title="$t('job.status')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status === '0' ? 'green' : 'orange'">
                {{ record.status === '0' ? $t('job.normal') : $t('job.paused') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('job.remark')" data-index="remark" :width="180" :ellipsis="true" />
          <a-table-column :title="$t('commonTable.createTime')" data-index="createTime" :width="170" />
          <a-table-column :title="$t('commonTable.operation')" :width="280" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-popconfirm
                  :content="$t('job.runConfirm')"
                  position="br"
                  @ok="handleRun(record)"
                >
                  <a-button type="text" size="small" @click.stop>
                    {{ $t('job.runOnce') }}
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  :content="$t('job.changeStatusConfirm', { status: record.status === '0' ? $t('job.paused') : $t('job.normal') })"
                  position="br"
                  @ok="handleToggleStatus(record)"
                >
                  <a-button type="text" size="small" @click.stop>
                    {{ record.status === '0' ? $t('job.pauseAction') : $t('job.resumeAction') }}
                  </a-button>
                </a-popconfirm>
                <a-button type="text" size="small" @click="handleEdit(record)">
                  {{ $t('commonTable.edit') }}
                </a-button>
                <a-popconfirm
                  :content="$t('job.deleteConfirm')"
                  position="br"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    {{ $t('commonTable.delete') }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 新增 / 编辑弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? $t('job.editTitle') : $t('job.addTitle')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      :ok-loading="saving"
      width="620px"
      @ok="handleSave"
      @cancel="modalVisible = false"
    >
      <a-form :model="form" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="jobName" :label="$t('job.jobName')" required>
              <a-input v-model="form.jobName" :placeholder="$t('job.namePlaceholder')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="jobGroup" :label="$t('job.jobGroup')">
              <a-input v-model="form.jobGroup" :placeholder="$t('job.groupPlaceholder')" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item field="invokeTarget" :label="$t('job.invokeTarget')" required>
          <a-input v-model="form.invokeTarget" :placeholder="$t('job.invokeTargetPlaceholder')" />
        </a-form-item>
        <a-form-item field="cronExpression" :label="$t('job.cronExpression')" required>
          <a-input v-model="form.cronExpression" :placeholder="$t('job.cronPlaceholder')" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item field="misfirePolicy" :label="$t('job.misfirePolicy')">
              <a-select v-model="form.misfirePolicy">
                <a-option value="1">{{ $t('job.misfire1') }}</a-option>
                <a-option value="2">{{ $t('job.misfire2') }}</a-option>
                <a-option value="3">{{ $t('job.misfire3') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="concurrent" :label="$t('job.concurrent')">
              <a-select v-model="form.concurrent">
                <a-option value="0">{{ $t('job.concurrentAllow') }}</a-option>
                <a-option value="1">{{ $t('job.concurrentForbid') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="status" :label="$t('job.status')">
              <a-select v-model="form.status">
                <a-option value="0">{{ $t('job.normal') }}</a-option>
                <a-option value="1">{{ $t('job.paused') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item field="remark" :label="$t('job.remark')">
          <a-textarea v-model="form.remark" :placeholder="$t('job.remarkPlaceholder')" :auto-size="{ minRows: 2, maxRows: 4 }" />
        </a-form-item>
      </a-form>
    </a-modal>
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

// 导出接口需权限点 controller:job
const canExport = computed(() => hasPermission('controller:job'))

// ==================== 搜索 ====================
const searchForm = reactive({
  jobName: '',
  jobGroup: '',
  status: undefined
})

const buildFilterParams = () => {
  const params = {}
  Object.keys(searchForm).forEach((key) => {
    const val = searchForm[key]
    if (val !== '' && val !== undefined && val !== null) {
      params[key] = val
    }
  })
  return params
}

function handleSearch() {
  pagination.current = 1
  selectedKeys.value = []
  fetchList()
}

function handleReset() {
  searchForm.jobName = ''
  searchForm.jobGroup = ''
  searchForm.status = undefined
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
    const res = await api.gisJob.getJobList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      ...buildFilterParams()
    })
    // 列表接口直接返回 { total, rows }
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error('获取定时任务列表失败:', e)
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// ==================== 新增 / 编辑 ====================
const modalVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)

const getDefaultForm = () => ({
  jobId: undefined,
  jobName: '',
  jobGroup: 'DEFAULT',
  invokeTarget: '',
  cronExpression: '',
  misfirePolicy: '3',
  concurrent: '1',
  status: '0',
  remark: ''
})

const form = reactive(getDefaultForm())

function handleAdd() {
  isEdit.value = false
  Object.assign(form, getDefaultForm())
  modalVisible.value = true
}

function handleEdit(record) {
  isEdit.value = true
  Object.assign(form, getDefaultForm(), {
    jobId: record.jobId,
    jobName: record.jobName || '',
    jobGroup: record.jobGroup || 'DEFAULT',
    invokeTarget: record.invokeTarget || '',
    cronExpression: record.cronExpression || '',
    misfirePolicy: String(record.misfirePolicy ?? '3'),
    concurrent: String(record.concurrent ?? '1'),
    status: String(record.status ?? '0'),
    remark: record.remark || ''
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.jobName) {
    Message.warning(t('job.nameRequired'))
    return
  }
  if (!form.invokeTarget) {
    Message.warning(t('job.invokeTargetRequired'))
    return
  }
  if (!form.cronExpression) {
    Message.warning(t('job.cronRequired'))
    return
  }
  const data = {
    jobName: form.jobName,
    jobGroup: form.jobGroup || 'DEFAULT',
    invokeTarget: form.invokeTarget,
    cronExpression: form.cronExpression,
    misfirePolicy: form.misfirePolicy,
    concurrent: form.concurrent,
    status: form.status,
    remark: form.remark
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await api.gisJob.updateJob({ ...data, jobId: form.jobId })
    } else {
      await api.gisJob.createJob(data)
    }
    Message.success(t('commonTable.success'))
    modalVisible.value = false
    fetchList()
  } catch (e) {
    console.error('保存定时任务失败:', e)
    Message.error(e?.msg || t('common.error'))
  } finally {
    saving.value = false
  }
}

// ==================== 状态 / 执行 / 删除 ====================
async function handleToggleStatus(record) {
  const nextStatus = record.status === '0' ? '1' : '0'
  try {
    await api.gisJob.changeJobStatus(record.jobId, nextStatus)
    Message.success(t('job.statusChangeSuccess'))
    fetchList()
  } catch (e) {
    console.error('修改任务状态失败:', e)
  }
}

async function handleRun(record) {
  try {
    await api.gisJob.runJob(record.jobId)
    Message.success(t('job.runSuccess'))
  } catch (e) {
    console.error('执行任务失败:', e)
  }
}

async function handleDelete(record) {
  try {
    await api.gisJob.deleteJob(record.jobId)
    Message.success(t('commonTable.success'))
    fetchList()
  } catch (e) {
    console.error('删除任务失败:', e)
  }
}

async function handleBatchDelete() {
  if (!selectedKeys.value.length) {
    Message.warning(t('job.selectRequired'))
    return
  }
  try {
    await api.gisJob.deleteJob(selectedKeys.value.join(','))
    Message.success(t('commonTable.success'))
    selectedKeys.value = []
    fetchList()
  } catch (e) {
    console.error('批量删除任务失败:', e)
  }
}

// ==================== 导出 ====================
const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    const res = await api.gisJob.exportJob(buildFilterParams())
    const blob = res instanceof Blob ? res : res?.data || res
    const filename = getFilenameFromHeaders(res?.headers, 'job.xlsx')
    downloadBlob(blob, filename)
  } catch (e) {
    console.error('导出定时任务失败:', e)
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
.job-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
