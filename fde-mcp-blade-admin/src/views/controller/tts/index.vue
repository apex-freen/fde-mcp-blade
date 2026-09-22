<template>
  <div class="tts-mgmt-page">
    <a-card :bordered="false">
      <a-alert type="info" :title="$t('tts.introTitle')" closable style="margin-bottom: 16px">
        <ul class="intro-list">
          <li>{{ $t('tts.introSupported') }}</li>
          <li>{{ $t('tts.introOthers') }}</li>
          <li>{{ $t('tts.introNote') }}</li>
        </ul>
      </a-alert>

      <div class="table-toolbar">
        <a-button type="primary" @click="handleAdd">
          <template #icon><icon-plus /></template>
          {{ $t('tts.addProvider') }}
        </a-button>
      </div>

      <a-table
        :data="providerList"
        :loading="loading"
        :pagination="false"
        row-key="ttsProviderId"
      >
        <template #columns>
          <a-table-column title="ID" data-index="ttsProviderId" :width="70" />
          <a-table-column :title="$t('tts.providerCode')" data-index="providerCode" :width="130" />
          <a-table-column :title="$t('tts.providerName')" data-index="providerName" :width="180" />
          <a-table-column :title="$t('tts.voice')" data-index="voice" :width="110" />
          <a-table-column :title="$t('tts.format')" data-index="format" :width="90" />
          <a-table-column :title="$t('tts.status')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status === '1' ? 'green' : 'red'">
                {{ record.status === '1' ? $t('tts.enabled') : $t('tts.disabled') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('tts.isDefault')" :width="80">
            <template #cell="{ record }">
              <a-tag v-if="record.isDefault === '1'" color="arcoblue">{{ $t('tts.default') }}</a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('tts.sort')" data-index="sort" :width="70" />
          <a-table-column :title="$t('commonTable.operation')" :width="150" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('commonTable.edit') }}
                </a-button>
                <a-popconfirm
                  :content="$t('tts.deleteConfirm')"
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
      :title="isEdit ? $t('tts.editProvider') : $t('tts.addProvider')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      @ok="handleSave"
      @cancel="modalVisible = false"
    >
      <a-form :model="formData" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="providerCode" :label="$t('tts.providerCode')">
              <a-input v-model="formData.providerCode" :placeholder="$t('tts.providerCodePlaceholder')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="providerName" :label="$t('tts.providerName')">
              <a-input v-model="formData.providerName" :placeholder="$t('tts.providerNamePlaceholder')" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item :label="$t('tts.apiBase')">
          <a-input v-model="formData.apiBase" :placeholder="$t('tts.apiBasePlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('tts.accessKeyId')">
          <a-input v-model="formData.accessKeyId" :placeholder="$t('tts.accessKeyIdPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('tts.accessKeySecret')">
          <a-input v-model="formData.accessKeySecret" :placeholder="$t('tts.accessKeySecretPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('tts.apiKey')">
          <a-input v-model="formData.apiKey" :placeholder="$t('tts.apiKeyPlaceholder')" />
        </a-form-item>
        <a-form-item :label="$t('tts.appKey')">
          <a-input v-model="formData.appKey" :placeholder="$t('tts.appKeyPlaceholder')" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="$t('tts.voice')">
              <a-input v-model="formData.voice" :placeholder="$t('tts.voicePlaceholder')" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('tts.format')">
              <a-input v-model="formData.format" :placeholder="$t('tts.formatPlaceholder')" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('tts.sampleRate')">
              <a-input-number v-model="formData.sampleRate" :min="0" :precision="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item :label="$t('tts.extra')">
          <a-textarea
            v-model="formData.extraText"
            :placeholder="$t('tts.extraPlaceholder')"
            :auto-size="{ minRows: 2, maxRows: 5 }"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="$t('tts.status')">
              <a-select v-model="formData.status">
                <a-option value="1">{{ $t('tts.enabled') }}</a-option>
                <a-option value="0">{{ $t('tts.disabled') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('tts.isDefault')">
              <a-select v-model="formData.isDefault">
                <a-option value="0">{{ $t('tts.no') }}</a-option>
                <a-option value="1">{{ $t('tts.yes') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('tts.sort')">
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
  ttsProviderId: undefined,
  providerCode: '',
  providerName: '',
  apiBase: '',
  apiKey: '',
  appKey: '',
  accessKeyId: '',
  accessKeySecret: '',
  voice: '',
  format: '',
  sampleRate: 16000,
  extraText: '',
  status: '1',
  isDefault: '0',
  sort: 1
})

const formData = reactive(getDefaultForm())

const fetchList = async () => {
  loading.value = true
  try {
    const res = await api.tts.getTtsProviders()
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
    ttsProviderId: record.ttsProviderId,
    providerCode: record.providerCode || '',
    providerName: record.providerName || '',
    apiBase: record.apiBase || '',
    apiKey: record.apiKey || '',
    appKey: record.appKey || '',
    accessKeyId: record.accessKeyId || '',
    accessKeySecret: record.accessKeySecret || '',
    voice: record.voice || '',
    format: record.format || '',
    sampleRate: Number(record.sampleRate ?? 16000),
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
      Message.error(t('tts.extraInvalid'))
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
    voice: formData.voice,
    format: formData.format,
    sampleRate: Number(formData.sampleRate ?? 16000),
    status: formData.status,
    isDefault: formData.isDefault,
    sort: Number(formData.sort ?? 1)
  }
  if (extra !== undefined) data.extra = extra

  try {
    if (isEdit.value) {
      data.ttsProviderId = formData.ttsProviderId
      await api.tts.updateTtsProvider(formData.ttsProviderId, data)
      Message.success(t('commonTable.success'))
    } else {
      await api.tts.createTtsProvider(data)
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
    await api.tts.deleteTtsProvider(record.ttsProviderId)
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
.tts-mgmt-page {
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
