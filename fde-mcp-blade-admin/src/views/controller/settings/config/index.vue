<template>
  <div class="sys-config-page">
    <a-alert type="info" :title="$t('sysConfig.intro')" closable style="margin-top: 16px">
      <div>{{ $t('sysConfig.introReadonly') }}</div>
    </a-alert>

    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="configKey" :label="$t('sysConfig.configKey')">
          <a-input
            v-model="searchForm.configKey"
            :placeholder="$t('commonTable.searchPlaceholder')"
            allow-clear
            style="width: 180px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="category" :label="$t('sysConfig.category')">
          <a-select
            v-model="searchForm.category"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 190px"
          >
            <a-option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="configType" :label="$t('sysConfig.configType')">
          <a-select
            v-model="searchForm.configType"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 130px"
          >
            <a-option value="string">string</a-option>
            <a-option value="number">number</a-option>
            <a-option value="json">json</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="status" :label="$t('sysConfig.status')">
          <a-select
            v-model="searchForm.status"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 120px"
          >
            <a-option value="1">{{ $t('sysConfig.enabled') }}</a-option>
            <a-option value="0">{{ $t('sysConfig.disabled') }}</a-option>
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
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="gisSysConfigId"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('sysConfig.gisSysConfigId')" data-index="gisSysConfigId" :width="90" />
          <a-table-column :title="$t('sysConfig.configKey')" data-index="configKey" :width="200" :ellipsis="true" />
          <a-table-column :title="$t('sysConfig.configValue')" :width="220" :ellipsis="true">
            <template #cell="{ record }">
              <span class="mono">{{ record.configValue || '-' }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('sysConfig.configType')" data-index="configType" :width="100" />
          <a-table-column :title="$t('sysConfig.category')" data-index="category" :width="130" />
          <a-table-column :title="$t('sysConfig.scope')" data-index="scope" :width="160" :ellipsis="true" />
          <a-table-column :title="$t('sysConfig.description')" data-index="description" :width="180" :ellipsis="true" />
          <a-table-column :title="$t('sysConfig.status')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status === '1' ? 'green' : 'red'">
                {{ record.status === '1' ? $t('sysConfig.enabled') : $t('sysConfig.disabled') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('sysConfig.updatedTime')" data-index="updatedTime" :width="170" />
          <a-table-column :title="$t('commonTable.operation')" :width="150" fixed="right">
            <template #cell="{ record }">
              <span v-if="record.readonly" class="readonly-text">
                <a-tag size="small">{{ $t('sysConfig.readonly') }}</a-tag>
              </span>
              <a-space v-else size="mini">
                <a-button type="text" size="small" @click="handleEdit(record)">
                  {{ $t('commonTable.edit') }}
                </a-button>
                <a-popconfirm
                  :content="$t('sysConfig.deleteConfirm')"
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
      :title="isEdit ? $t('sysConfig.editTitle') : $t('sysConfig.addTitle')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      :ok-loading="saving"
      width="620px"
      @ok="handleSave"
      @cancel="modalVisible = false"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item
          field="configKey"
          :label="$t('sysConfig.configKey')"
          :extra="isEdit ? $t('sysConfig.keyEditHint') : ''"
          required
        >
          <a-input
            v-model="form.configKey"
            :placeholder="$t('sysConfig.keyPlaceholder')"
            :disabled="isEdit"
          />
        </a-form-item>
        <a-form-item field="configValue" :label="$t('sysConfig.configValue')" required>
          <a-textarea
            v-model="form.configValue"
            :placeholder="$t('sysConfig.valuePlaceholder')"
            :auto-size="{ minRows: 2, maxRows: 6 }"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item field="configType" :label="$t('sysConfig.configType')">
              <a-select v-model="form.configType">
                <a-option value="string">string</a-option>
                <a-option value="number">number</a-option>
                <a-option value="json">json</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="category" :label="$t('sysConfig.category')" required>
              <a-select
                v-model="form.category"
                :placeholder="$t('sysConfig.categoryPlaceholder')"
                allow-create
                allow-search
              >
                <a-option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item field="status" :label="$t('sysConfig.status')">
              <a-select v-model="form.status">
                <a-option value="1">{{ $t('sysConfig.enabled') }}</a-option>
                <a-option value="0">{{ $t('sysConfig.disabled') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item field="description" :label="$t('sysConfig.description')" required>
          <a-input v-model="form.description" :placeholder="$t('sysConfig.descriptionPlaceholder')" />
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

// 导出接口需权限点 controller:settings:config
const canExport = computed(() => hasPermission('controller:settings:config'))

// 分类选项：与后端 scope 映射保持一致，另可自定义输入
const categoryOptions = computed(() => [
  { value: 'device', label: t('sysConfig.categoryDevice') },
  { value: 'mqtt_client', label: t('sysConfig.categoryMqttClient') },
  { value: 'mqtt_server', label: t('sysConfig.categoryMqttServer') },
  { value: 'mcp_cloud', label: t('sysConfig.categoryMcpCloud') },
  { value: 'cloud', label: t('sysConfig.categoryCloud') },
  { value: 'plat', label: t('sysConfig.categoryPlat') },
  { value: 'agent', label: t('sysConfig.categoryAgent') },
  { value: 'custom', label: t('sysConfig.categoryOther') }
])

// ==================== 搜索 ====================
const searchForm = reactive({
  configKey: '',
  category: undefined,
  configType: undefined,
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
  fetchList()
}

function handleReset() {
  searchForm.configKey = ''
  searchForm.category = undefined
  searchForm.configType = undefined
  searchForm.status = undefined
  handleSearch()
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
    const res = await api.gisSysConfig.getSysConfigList({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      ...buildFilterParams()
    })
    // 列表接口直接返回 { total, rows }
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error('获取参数配置失败:', e)
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
  configKey: '',
  configValue: '',
  configType: 'string',
  category: 'custom',
  description: '',
  status: '1'
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
    configKey: record.configKey || '',
    configValue: record.configValue ?? '',
    configType: record.configType || 'string',
    category: record.category || 'custom',
    description: record.description || '',
    status: String(record.status ?? '1')
  })
  modalVisible.value = true
}

async function handleSave() {
  if (!form.configKey) {
    Message.warning(t('sysConfig.keyRequired'))
    return
  }
  if (form.configValue === '' || form.configValue === undefined || form.configValue === null) {
    Message.warning(t('sysConfig.valueRequired'))
    return
  }
  if (!form.category) {
    Message.warning(t('sysConfig.categoryRequired'))
    return
  }
  if (!form.description) {
    Message.warning(t('sysConfig.descriptionRequired'))
    return
  }
  const data = {
    configKey: form.configKey,
    configValue: form.configValue,
    configType: form.configType,
    category: form.category,
    description: form.description,
    status: form.status
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await api.gisSysConfig.updateSysConfig(data)
    } else {
      await api.gisSysConfig.createSysConfig(data)
    }
    Message.success(t('commonTable.success'))
    modalVisible.value = false
    fetchList()
  } catch (e) {
    console.error('保存参数配置失败:', e)
    Message.error(e?.msg || t('common.error'))
  } finally {
    saving.value = false
  }
}

// ==================== 删除 ====================
async function handleDelete(record) {
  try {
    await api.gisSysConfig.deleteSysConfig(record.gisSysConfigId)
    Message.success(t('commonTable.success'))
    fetchList()
  } catch (e) {
    console.error('删除参数配置失败:', e)
  }
}

// ==================== 导出 ====================
const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    const res = await api.gisSysConfig.exportSysConfig(buildFilterParams())
    const blob = res instanceof Blob ? res : res?.data || res
    const filename = getFilenameFromHeaders(res?.headers, 'config.xlsx')
    downloadBlob(blob, filename)
  } catch (e) {
    console.error('导出参数配置失败:', e)
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
.sys-config-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .mono {
    font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
  }
  .readonly-text {
    color: var(--color-text-3);
  }
}
</style>
