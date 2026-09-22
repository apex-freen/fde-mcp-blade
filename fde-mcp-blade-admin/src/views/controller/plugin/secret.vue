<template>
  <div class="plugin-secret-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="plugin_name" :label="$t('pluginSecret.searchPlugin')">
          <a-select
            v-model="searchForm.plugin_name"
            :placeholder="$t('pluginSecret.allPlugins')"
            :loading="pluginLoading"
            allow-clear
            allow-search
            style="width: 260px"
          >
            <a-option v-for="p in pluginList" :key="p.name" :value="p.name">
              {{ p.title || p.name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="secret_key" :label="$t('pluginSecret.secretKey')">
          <a-input
            v-model="searchForm.secret_key"
            :placeholder="$t('pluginSecret.secretKeySearchPlaceholder')"
            allow-clear
            style="width: 220px"
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
        <span class="table-hint">
          {{ $t('pluginSecret.totalSecrets') }} {{ secretList.length }} {{ $t('pluginSecret.secretsCount') }}
        </span>
        <a-button type="primary" @click="handleAdd">
          <template #icon><icon-plus /></template>
          {{ $t('pluginSecret.createSecret') }}
        </a-button>
      </div>

      <a-table
        :columns="columns"
        :data="secretList"
        :loading="loading"
        :pagination="false"
        row-key="gis_secret_id"
      >
        <template #columns>
          <a-table-column :title="$t('pluginSecret.pluginName')" data-index="plugin_name" :width="200" />
          <a-table-column :title="$t('pluginSecret.secretKey')" data-index="secret_key" :width="180" />
          <a-table-column :title="$t('pluginSecret.valueStatus')" :width="100">
            <template #cell="{ record }">
              <a-tag v-if="record.has_value" color="green" size="small">
                {{ $t('pluginSecret.configured') }}
              </a-tag>
              <a-tag v-else color="gray" size="small">
                {{ $t('pluginSecret.notConfigured') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('pluginSecret.description')" :ellipsis="true">
            <template #cell="{ record }">
              {{ record.description || '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.status')" :width="80">
            <template #cell="{ record }">
              <a-switch
                size="small"
                :model-value="record.status === '1'"
                @change="(val) => handleToggleStatus(record, val)"
              />
            </template>
          </a-table-column>
          <a-table-column :title="$t('pluginSecret.updatedTime')" :width="170">
            <template #cell="{ record }">
              {{ record.updated_time || '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="160" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('commonTable.edit') }}
                </a-button>
                <a-popconfirm
                  :content="$t('pluginSecret.deleteConfirmContent')"
                  position="br"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    <template #icon><icon-delete /></template>
                    {{ $t('commonTable.delete') }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 新建 / 编辑弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? $t('pluginSecret.editTitle') : $t('pluginSecret.createTitle')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      width="560px"
      unmount-on-close
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <a-form ref="formRef" :model="form" :rules="formRules" layout="vertical">
        <!-- 归属插件：新建可选，编辑只读（保存后不可改） -->
        <a-form-item field="plugin_name" :label="$t('pluginSecret.pluginName')">
          <a-input v-if="isEdit" :model-value="form.plugin_name" readonly />
          <a-select
            v-else
            v-model="form.plugin_name"
            :placeholder="$t('pluginSecret.pluginPlaceholder')"
            :loading="pluginLoading"
            allow-search
          >
            <a-option v-for="p in pluginList" :key="p.name" :value="p.name">
              {{ p.title || p.name }}
            </a-option>
          </a-select>
        </a-form-item>

        <!-- 键名：新建可填，编辑只读（保存后不可改） -->
        <a-form-item field="secret_key" :label="$t('pluginSecret.secretKey')">
          <a-input
            v-if="isEdit"
            :model-value="form.secret_key"
            readonly
          />
          <a-input
            v-else
            v-model="form.secret_key"
            :placeholder="$t('pluginSecret.secretKeyPlaceholder')"
            :max-length="64"
          />
          <template #extra>
            <span class="form-extra">{{ $t('pluginSecret.secretKeyHint') }}</span>
          </template>
        </a-form-item>

        <!-- 密钥值：只写不读，编辑态留空表示不修改 -->
        <a-form-item field="secret_value" :label="$t('pluginSecret.secretValue')">
          <a-input-password
            v-model="form.secret_value"
            :placeholder="isEdit ? $t('pluginSecret.secretValueEditPlaceholder') : $t('pluginSecret.secretValuePlaceholder')"
            :max-length="512"
            allow-clear
          />
        </a-form-item>

        <a-form-item field="description" :label="$t('pluginSecret.description')">
          <a-input
            v-model="form.description"
            :placeholder="$t('pluginSecret.descriptionPlaceholder')"
            :max-length="255"
            show-word-limit
          />
        </a-form-item>

        <!-- 状态仅在编辑态可改 -->
        <a-form-item v-if="isEdit" field="status" :label="$t('commonTable.status')">
          <a-select v-model="form.status">
            <a-option value="1">{{ $t('pluginSecret.statusEnabled') }}</a-option>
            <a-option value="0">{{ $t('pluginSecret.statusDisabled') }}</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'

const { t } = useI18n()

const columns = []

// ==================== 插件下拉数据源 ====================
const pluginList = ref([])
const pluginLoading = ref(false)

const fetchPluginList = async () => {
  pluginLoading.value = true
  try {
    const res = await api.pluginService.getServiceList()
    const list = res.data || res || []
    pluginList.value = (Array.isArray(list) ? list : []).map((p) => ({
      name: p.name || p.manifest?.name || '',
      title: p.title || p.info?.title || ''
    })).filter((p) => p.name)
  } catch (e) {
    console.error(t('pluginSecret.loadPluginFailed') + ':', e)
  } finally {
    pluginLoading.value = false
  }
}

// ==================== 错误提示（统一处理，含 403 定制文案）====================
const handleApiError = (e, fallback) => {
  const status = String(e?.response?.status || e?.code || '')
  const msg = e?.response?.data?.msg || e?.msg || ''
  // 401 由请求拦截器统一清理登录态并跳转，此处不重复提示
  if (status === '401') return
  if (status === '403') {
    Message.error(t('pluginSecret.noPermission'))
    return
  }
  Message.error(msg || fallback)
}

// ==================== 列表 ====================
const loading = ref(false)
const secretList = ref([])

const searchForm = reactive({
  plugin_name: undefined,
  secret_key: ''
})

const fetchSecretList = async () => {
  loading.value = true
  try {
    const params = {}
    if (searchForm.plugin_name) params.plugin_name = searchForm.plugin_name
    if (searchForm.secret_key.trim()) params.secret_key = searchForm.secret_key.trim()

    const res = await api.gisSecret.getSecretList(params)
    const list = res.data || []
    secretList.value = Array.isArray(list) ? list : []
  } catch (e) {
    console.error(t('pluginSecret.fetchFailed') + ':', e)
    handleApiError(e, t('pluginSecret.fetchFailed'))
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  fetchSecretList()
}

const handleReset = () => {
  searchForm.plugin_name = undefined
  searchForm.secret_key = ''
  fetchSecretList()
}

// ==================== 新建 / 编辑 ====================
const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const currentRecord = ref(null)

const getDefaultForm = () => ({
  plugin_name: undefined,
  secret_key: '',
  secret_value: '',
  description: '',
  status: '1'
})

const form = reactive(getDefaultForm())

const formRules = {
  plugin_name: [
    { required: true, message: t('pluginSecret.pluginRequired') }
  ],
  secret_key: [
    { required: true, message: t('pluginSecret.secretKeyRequired') },
    {
      match: /^[A-Za-z0-9._-]+$/,
      message: t('pluginSecret.secretKeyInvalid')
    }
  ],
  secret_value: [
    {
      validator: (value, cb) => {
        // 新建必填；编辑留空表示不修改（不做 trim，首尾空格是有效内容）
        if (!isEdit.value && !value) {
          cb(t('pluginSecret.secretValueRequired'))
        } else {
          cb()
        }
      }
    }
  ]
}

const handleAdd = () => {
  isEdit.value = false
  currentRecord.value = null
  Object.assign(form, getDefaultForm())
  modalVisible.value = true
}

const handleEdit = (record) => {
  isEdit.value = true
  currentRecord.value = record
  Object.assign(form, {
    plugin_name: record.plugin_name,
    secret_key: record.secret_key,
    // 值永不下发，输入框必须留空
    secret_value: '',
    description: record.description || '',
    status: record.status === '0' ? '0' : '1'
  })
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch (e) {
    return
  }

  if (isEdit.value) {
    await submitUpdate()
  } else {
    await submitCreate()
  }
}

// 新建：先按 (plugin_name, secret_key) 精确查重，命中则引导走更新
const submitCreate = async () => {
  const payload = {
    plugin_name: form.plugin_name,
    secret_key: form.secret_key,
    secret_value: form.secret_value
  }
  if (form.description) payload.description = form.description

  try {
    const res = await api.gisSecret.getSecretList({
      plugin_name: payload.plugin_name,
      secret_key: payload.secret_key
    })
    const list = res.data || []
    const exist = Array.isArray(list)
      ? list.find((item) => item.secret_key === payload.secret_key)
      : null
    if (exist) {
      Modal.confirm({
        title: t('pluginSecret.duplicateTitle'),
        content: t('pluginSecret.duplicateContent', {
          plugin: payload.plugin_name,
          key: payload.secret_key
        }),
        okText: t('pluginSecret.goUpdate'),
        cancelText: t('commonTable.cancel'),
        onOk: () => {
          modalVisible.value = false
          handleEdit(exist)
        }
      })
      return
    }
  } catch (e) {
    // 查重失败不阻断新建，交由后端唯一性校验兜底
    console.warn(t('pluginSecret.fetchFailed') + ':', e)
  }

  try {
    await api.gisSecret.createSecret(payload)
    Message.success(t('pluginSecret.createSuccess'))
    modalVisible.value = false
    fetchSecretList()
  } catch (e) {
    handleApiError(e, t('pluginSecret.createFailed'))
  }
}

// 编辑：PUT 缺省即不改，只提交用户实际改动的字段
const submitUpdate = async () => {
  const record = currentRecord.value
  const payload = {}

  if (form.secret_value) {
    payload.secret_value = form.secret_value
  }
  if (form.description !== (record.description || '')) {
    payload.description = form.description
  }
  if (form.status !== record.status) {
    payload.status = form.status
  }

  if (Object.keys(payload).length === 0) {
    Message.info(t('pluginSecret.noChange'))
    modalVisible.value = false
    return
  }

  try {
    await api.gisSecret.updateSecret(record.gis_secret_id, payload)
    Message.success(t('pluginSecret.updateSuccess'))
    modalVisible.value = false
    fetchSecretList()
  } catch (e) {
    handleApiError(e, t('pluginSecret.updateFailed'))
  }
}

// ==================== 启用 / 停用 ====================
const handleToggleStatus = (record, checked) => {
  const enable = checked === true
  const target = enable ? '1' : '0'

  Modal.confirm({
    title: enable
      ? t('pluginSecret.enableConfirmTitle')
      : t('pluginSecret.disableConfirmTitle'),
    content: enable
      ? t('pluginSecret.enableConfirmContent')
      : t('pluginSecret.disableConfirmContent'),
    onOk: async () => {
      try {
        await api.gisSecret.updateSecret(record.gis_secret_id, { status: target })
        Message.success(enable ? t('pluginSecret.statusEnabled') : t('pluginSecret.statusDisabled'))
        record.status = target
      } catch (e) {
        handleApiError(e, t('pluginSecret.updateFailed'))
      }
    }
  })
}

// ==================== 删除 ====================
const handleDelete = async (record) => {
  try {
    await api.gisSecret.deleteSecret(record.gis_secret_id)
    Message.success(t('pluginSecret.deleteSuccess'))
    fetchSecretList()
  } catch (e) {
    handleApiError(e, t('pluginSecret.deleteFailed'))
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchPluginList()
  fetchSecretList()
})
</script>

<style lang="scss" scoped>
.plugin-secret-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .table-hint {
      color: var(--color-text-3);
      font-size: 13px;
    }
  }

  .form-extra {
    color: var(--color-text-3);
    font-size: 12px;
  }
}
</style>
