<template>
  <div class="asr-mgmt-page">
    <a-card :bordered="false">
      <a-alert type="info" :title="$t('asr.introTitle')" closable style="margin-bottom: 16px">
        <ul class="intro-list">
          <li>{{ $t('asr.introSupported') }}</li>
          <li>{{ $t('asr.introOthers') }}</li>
          <li>{{ $t('asr.introNote') }}</li>
        </ul>
      </a-alert>

      <div class="table-toolbar">
        <a-button type="primary" @click="handleAdd">
          <template #icon><icon-plus /></template>
          {{ $t('asr.addProvider') }}
        </a-button>
      </div>

      <a-table
        :data="providerList"
        :loading="loading"
        :pagination="false"
        row-key="asrProviderId"
      >
        <template #columns>
          <a-table-column title="ID" data-index="asrProviderId" :width="70" />
          <a-table-column :title="$t('asr.providerCode')" data-index="providerCode" :width="130" />
          <a-table-column :title="$t('asr.providerName')" data-index="providerName" :width="180" />
          <a-table-column :title="$t('asr.apiBase')" data-index="apiBase" :width="200" ellipsis tooltip />
          <a-table-column :title="$t('asr.status')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status === '1' ? 'green' : 'red'">
                {{ record.status === '1' ? $t('asr.enabled') : $t('asr.disabled') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('asr.isDefault')" :width="80">
            <template #cell="{ record }">
              <a-tag v-if="record.isDefault === '1'" color="arcoblue">{{ $t('asr.default') }}</a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('asr.sort')" data-index="sort" :width="70" />
          <a-table-column :title="$t('commonTable.operation')" :width="150" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('commonTable.edit') }}
                </a-button>
                <a-popconfirm
                  :content="$t('asr.deleteConfirm')"
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

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? $t('asr.editProvider') : $t('asr.addProvider')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      @ok="handleSave"
      @cancel="modalVisible = false"
    >
      <a-form :model="formData" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="providerCode" :label="$t('asr.providerCode')">
              <a-input v-model="formData.providerCode" :placeholder="$t('asr.providerCodePlaceholder')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="providerName" :label="$t('asr.providerName')">
              <a-input v-model="formData.providerName" :placeholder="$t('asr.providerNamePlaceholder')" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item :label="$t('asr.apiBase')">
          <a-input v-model="formData.apiBase" :placeholder="$t('asr.apiBasePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('asr.accessKeyId')">
          <a-input v-model="formData.accessKeyId" :placeholder="$t('asr.accessKeyIdPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('asr.accessKeySecret')">
          <a-input v-model="formData.accessKeySecret" :placeholder="$t('asr.accessKeySecretPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('asr.apiKey')">
          <a-input v-model="formData.apiKey" :placeholder="$t('asr.apiKeyPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('asr.appKey')">
          <a-input v-model="formData.appKey" :placeholder="$t('asr.appKeyPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('asr.extra')">
          <a-textarea
            v-model="formData.extraText"
            :placeholder="$t('asr.extraPlaceholder')"
            :auto-size="{ minRows: 2, maxRows: 5 }"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="$t('asr.status')">
              <a-select v-model="formData.status">
                <a-option value="1">{{ $t('asr.enabled') }}</a-option>
                <a-option value="0">{{ $t('asr.disabled') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('asr.isDefault')">
              <a-select v-model="formData.isDefault">
                <a-option value="0">{{ $t('asr.no') }}</a-option>
                <a-option value="1">{{ $t('asr.yes') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('asr.sort')">
              <a-input-number v-model="formData.sort" :min="0" :precision="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'
import {
  IconPlus,
  IconEdit,
  IconDelete
} from '@arco-design/web-vue/es/icon'

const { t } = useI18n()

const providerList = ref([])
const loading = ref(false)
const modalVisible = ref(false)
const isEdit = ref(false)

const getDefaultForm = () => ({
  asrProviderId: undefined,
  providerCode: '',
  providerName: '',
  apiBase: '',
  apiKey: '',
  appKey: '',
  accessKeyId: '',
  accessKeySecret: '',
  extraText: '',
  status: '1',
  isDefault: '0',
  sort: 1
})

const formData = reactive(getDefaultForm())

const fetchList = async () => {
  loading.value = true
  try {
    const res = await api.asr.getAsrProviders()
    providerList.value = res.data || []
  } catch (e) {
    providerList.value = []
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(formData, getDefaultForm())
  modalVisible.value = true
}

const handleEdit = (record) => {
  isEdit.value = true
  Object.assign(formData, getDefaultForm(), {
    asrProviderId: record.asrProviderId,
    providerCode: record.providerCode || '',
    providerName: record.providerName || '',
    apiBase: record.apiBase || '',
    apiKey: record.apiKey || '',
    appKey: record.appKey || '',
    accessKeyId: record.accessKeyId || '',
    accessKeySecret: record.accessKeySecret || '',
    extraText: record.extra ? JSON.stringify(record.extra, null, 2) : '',
    status: record.status ?? '1',
    isDefault: record.isDefault ?? '0',
    sort: Number(record.sort ?? 1)
  })
  modalVisible.value = true
}

const handleSave = async () => {
  let extra
  if (formData.extraText && formData.extraText.trim()) {
    try {
      extra = JSON.parse(formData.extraText)
    } catch (e) {
      Message.error(t('asr.extraInvalid'))
      return
    }
  }

  const data = {
    providerCode: formData.providerCode,
    providerName: formData.providerName,
    apiBase: formData.apiBase,
    apiKey: formData.apiKey,
    appKey: formData.appKey,
    accessKeyId: formData.accessKeyId,
    accessKeySecret: formData.accessKeySecret,
    status: formData.status,
    isDefault: formData.isDefault,
    sort: Number(formData.sort ?? 1)
  }
  if (extra !== undefined) data.extra = extra

  try {
    if (isEdit.value) {
      data.asrProviderId = formData.asrProviderId
      await api.asr.updateAsrProvider(formData.asrProviderId, data)
      Message.success(t('commonTable.success'))
    } else {
      await api.asr.createAsrProvider(data)
      Message.success(t('commonTable.success'))
    }
    modalVisible.value = false
    fetchList()
  } catch (e) {
    console.error('保存供应商失败:', e)
    Message.error(e?.msg || t('common.error'))
  }
}

const handleDelete = async (record) => {
  try {
    await api.asr.deleteAsrProvider(record.asrProviderId)
    Message.success(t('commonTable.success'))
    fetchList()
  } catch (e) {
    console.error('删除供应商失败:', e)
    Message.error(e?.msg || t('common.error'))
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.asr-mgmt-page {
  padding-bottom: 24px;
}

.table-toolbar {
  margin-bottom: 16px;
}

.intro-list {
  margin: 0;
  padding-left: 18px;
  color: var(--color-text-2);
  line-height: 1.8;
}
</style>
