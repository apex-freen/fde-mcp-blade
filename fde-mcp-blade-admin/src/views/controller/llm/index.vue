<template>
  <div class="llm-mgmt-page">
    <a-card :bordered="false">
      <a-alert type="info" :title="$t('llm.introTitle')" closable style="margin-bottom: 16px">
        <ul class="intro-list">
          <li>{{ $t('llm.introSupported') }}</li>
          <li>{{ $t('llm.introOthers') }}</li>
          <li>{{ $t('llm.introNote') }}</li>
        </ul>
      </a-alert>

      <a-tabs v-model:active-key="activeTab">
        <!-- 供应商 Tab -->
        <a-tab-pane key="provider" :title="$t('llm.providerTab')">
          <div class="table-toolbar">
            <a-button type="primary" @click="handleAddProvider">
              <template #icon><icon-plus /></template>
              {{ $t('llm.addProvider') }}
            </a-button>
          </div>

          <a-table
            :data="providerList"
            :loading="providerLoading"
            :pagination="false"
            row-key="llmProviderId"
          >
            <template #columns>
              <a-table-column title="ID" data-index="llmProviderId" :width="70" />
              <a-table-column :title="$t('llm.providerCode')" data-index="providerCode" :width="130" />
              <a-table-column :title="$t('llm.providerName')" data-index="providerName" :width="150" />
              <a-table-column :title="$t('llm.apiBase')" data-index="apiBase" :width="220" ellipsis tooltip />
              <a-table-column :title="$t('llm.status')" :width="90">
                <template #cell="{ record }">
                  <a-tag :color="record.status === '1' ? 'green' : 'red'">
                    {{ record.status === '1' ? $t('llm.enabled') : $t('llm.disabled') }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="$t('llm.isDefault')" :width="80">
                <template #cell="{ record }">
                  <a-tag v-if="record.isDefault === '1'" color="arcoblue">{{ $t('llm.default') }}</a-tag>
                  <span v-else>-</span>
                </template>
              </a-table-column>
              <a-table-column :title="$t('llm.sort')" data-index="sort" :width="70" />
              <a-table-column :title="$t('commonTable.operation')" :width="150" fixed="right">
                <template #cell="{ record }">
                  <a-space size="mini">
                    <a-button type="text" size="small" @click="handleEditProvider(record)">
                      <template #icon><icon-edit /></template>
                      {{ $t('commonTable.edit') }}
                    </a-button>
                    <a-popconfirm
                      :content="$t('llm.deleteConfirm')"
                      position="br"
                      @ok="handleDeleteProvider(record)"
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
        </a-tab-pane>

        <!-- 模型 Tab -->
        <a-tab-pane key="model" :title="$t('llm.modelTab')">
          <div class="table-toolbar">
            <a-space>
              <a-select
                v-model="modelFilterProviderId"
                :placeholder="$t('llm.provider')"
                allow-clear
                style="width: 220px"
                @change="fetchModels"
              >
                <a-option
                  v-for="p in providerList"
                  :key="p.llmProviderId"
                  :value="p.llmProviderId"
                >
                  {{ p.providerName }}
                </a-option>
              </a-select>
              <a-button type="primary" @click="handleAddModel">
                <template #icon><icon-plus /></template>
                {{ $t('llm.addModel') }}
              </a-button>
            </a-space>
          </div>

          <a-table
            :data="modelList"
            :loading="modelLoading"
            :pagination="false"
            row-key="llmModelId"
          >
            <template #columns>
              <a-table-column title="ID" data-index="llmModelId" :width="70" />
              <a-table-column :title="$t('llm.provider')" :width="140">
                <template #cell="{ record }">
                  {{ getProviderName(record.llmProviderId) }}
                </template>
              </a-table-column>
              <a-table-column :title="$t('llm.modelCode')" data-index="modelCode" :width="160" />
              <a-table-column :title="$t('llm.modelName')" data-index="modelName" :width="180" />
              <a-table-column :title="$t('llm.status')" :width="90">
                <template #cell="{ record }">
                  <a-tag :color="record.status === '1' ? 'green' : 'red'">
                    {{ record.status === '1' ? $t('llm.enabled') : $t('llm.disabled') }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="$t('llm.isDefault')" :width="80">
                <template #cell="{ record }">
                  <a-tag v-if="record.isDefault === '1'" color="arcoblue">{{ $t('llm.default') }}</a-tag>
                  <span v-else>-</span>
                </template>
              </a-table-column>
              <a-table-column :title="$t('llm.sort')" data-index="sort" :width="70" />
              <a-table-column :title="$t('commonTable.operation')" :width="150" fixed="right">
                <template #cell="{ record }">
                  <a-space size="mini">
                    <a-button type="text" size="small" @click="handleEditModel(record)">
                      <template #icon><icon-edit /></template>
                      {{ $t('commonTable.edit') }}
                    </a-button>
                    <a-popconfirm
                      :content="$t('llm.deleteConfirm')"
                      position="br"
                      @ok="handleDeleteModel(record)"
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
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 供应商编辑弹窗 -->
    <a-modal
      v-model:visible="providerModalVisible"
      :title="isProviderEdit ? $t('llm.editProvider') : $t('llm.addProvider')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      @ok="handleSaveProvider"
      @cancel="providerModalVisible = false"
    >
      <a-form :model="providerForm" layout="vertical">
        <a-form-item field="providerCode" :label="$t('llm.providerCode')">
          <a-input v-model="providerForm.providerCode" :placeholder="$t('llm.providerCodePlaceholder')" />
        </a-form-item>
        <a-form-item field="providerName" :label="$t('llm.providerName')">
          <a-input v-model="providerForm.providerName" :placeholder="$t('llm.providerNamePlaceholder')" />
        </a-form-item>
        <a-form-item field="apiBase" :label="$t('llm.apiBase')">
          <a-input v-model="providerForm.apiBase" :placeholder="$t('llm.apiBasePlaceholder')" />
        </a-form-item>
        <a-form-item field="apiKey" :label="$t('llm.apiKey')">
          <a-input v-model="providerForm.apiKey" :placeholder="$t('llm.apiKeyPlaceholder')" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="$t('llm.status')">
              <a-select v-model="providerForm.status">
                <a-option value="1">{{ $t('llm.enabled') }}</a-option>
                <a-option value="0">{{ $t('llm.disabled') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('llm.isDefault')">
              <a-select v-model="providerForm.isDefault">
                <a-option value="0">{{ $t('llm.no') }}</a-option>
                <a-option value="1">{{ $t('llm.yes') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('llm.sort')">
              <a-input-number v-model="providerForm.sort" :min="0" :precision="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 模型编辑弹窗 -->
    <a-modal
      v-model:visible="modelModalVisible"
      :title="isModelEdit ? $t('llm.editModel') : $t('llm.addModel')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      @ok="handleSaveModel"
      @cancel="modelModalVisible = false"
    >
      <a-form :model="modelForm" layout="vertical">
        <a-form-item field="llmProviderId" :label="$t('llm.provider')">
          <a-select v-model="modelForm.llmProviderId" :placeholder="$t('llm.provider')">
            <a-option
              v-for="p in providerList"
              :key="p.llmProviderId"
              :value="p.llmProviderId"
            >
              {{ p.providerName }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="modelCode" :label="$t('llm.modelCode')">
          <a-input v-model="modelForm.modelCode" :placeholder="$t('llm.modelCodePlaceholder')" />
        </a-form-item>
        <a-form-item field="modelName" :label="$t('llm.modelName')">
          <a-input v-model="modelForm.modelName" :placeholder="$t('llm.modelNamePlaceholder')" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="$t('llm.status')">
              <a-select v-model="modelForm.status">
                <a-option value="1">{{ $t('llm.enabled') }}</a-option>
                <a-option value="0">{{ $t('llm.disabled') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('llm.isDefault')">
              <a-select v-model="modelForm.isDefault">
                <a-option value="0">{{ $t('llm.no') }}</a-option>
                <a-option value="1">{{ $t('llm.yes') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="$t('llm.sort')">
              <a-input-number v-model="modelForm.sort" :min="0" :precision="0" style="width: 100%" />
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

const activeTab = ref('provider')

// ==================== 供应商 ====================
const providerList = ref([])
const providerLoading = ref(false)
const providerModalVisible = ref(false)
const isProviderEdit = ref(false)

const getDefaultProviderForm = () => ({
  llmProviderId: undefined,
  providerCode: '',
  providerName: '',
  apiBase: '',
  apiKey: '',
  status: '1',
  isDefault: '0',
  sort: 1
})

const providerForm = reactive(getDefaultProviderForm())

const fetchProviders = async () => {
  providerLoading.value = true
  try {
    const res = await api.llm.getLlmProviders()
    providerList.value = res.data || []
  } catch (e) {
    providerList.value = []
  } finally {
    providerLoading.value = false
  }
}

const getProviderName = (id) => {
  const p = providerList.value.find(item => item.llmProviderId === id)
  return p ? p.providerName : '-'
}

const handleAddProvider = () => {
  isProviderEdit.value = false
  Object.assign(providerForm, getDefaultProviderForm())
  providerModalVisible.value = true
}

const handleEditProvider = (record) => {
  isProviderEdit.value = true
  Object.assign(providerForm, getDefaultProviderForm(), {
    llmProviderId: record.llmProviderId,
    providerCode: record.providerCode || '',
    providerName: record.providerName || '',
    apiBase: record.apiBase || '',
    apiKey: record.apiKey || '',
    status: record.status ?? '1',
    isDefault: record.isDefault ?? '0',
    sort: Number(record.sort ?? 1)
  })
  providerModalVisible.value = true
}

const handleSaveProvider = async () => {
  const data = {
    providerCode: providerForm.providerCode,
    providerName: providerForm.providerName,
    apiBase: providerForm.apiBase,
    apiKey: providerForm.apiKey,
    status: providerForm.status,
    isDefault: providerForm.isDefault,
    sort: Number(providerForm.sort ?? 1)
  }
  try {
    if (isProviderEdit.value) {
      data.llmProviderId = providerForm.llmProviderId
      await api.llm.updateLlmProvider(providerForm.llmProviderId, data)
      Message.success(t('commonTable.success'))
    } else {
      await api.llm.createLlmProvider(data)
      Message.success(t('commonTable.success'))
    }
    providerModalVisible.value = false
    fetchProviders()
  } catch (e) {
    console.error('保存供应商失败:', e)
    Message.error(e?.msg || t('common.error'))
  }
}

const handleDeleteProvider = async (record) => {
  try {
    await api.llm.deleteLlmProvider(record.llmProviderId)
    Message.success(t('commonTable.success'))
    fetchProviders()
    fetchModels()
  } catch (e) {
    console.error('删除供应商失败:', e)
    Message.error(e?.msg || t('common.error'))
  }
}

// ==================== 模型 ====================
const modelList = ref([])
const modelLoading = ref(false)
const modelFilterProviderId = ref(undefined)
const modelModalVisible = ref(false)
const isModelEdit = ref(false)

const getDefaultModelForm = () => ({
  llmModelId: undefined,
  llmProviderId: undefined,
  modelCode: '',
  modelName: '',
  status: '1',
  isDefault: '0',
  sort: 1
})

const modelForm = reactive(getDefaultModelForm())

const fetchModels = async () => {
  modelLoading.value = true
  try {
    const params = {}
    if (modelFilterProviderId.value) params.providerId = modelFilterProviderId.value
    const res = await api.llm.getLlmModels(params)
    modelList.value = res.data || []
  } catch (e) {
    modelList.value = []
  } finally {
    modelLoading.value = false
  }
}

const handleAddModel = () => {
  isModelEdit.value = false
  Object.assign(modelForm, getDefaultModelForm())
  if (modelFilterProviderId.value) modelForm.llmProviderId = modelFilterProviderId.value
  modelModalVisible.value = true
}

const handleEditModel = (record) => {
  isModelEdit.value = true
  Object.assign(modelForm, getDefaultModelForm(), {
    llmModelId: record.llmModelId,
    llmProviderId: record.llmProviderId,
    modelCode: record.modelCode || '',
    modelName: record.modelName || '',
    status: record.status ?? '1',
    isDefault: record.isDefault ?? '0',
    sort: Number(record.sort ?? 1)
  })
  modelModalVisible.value = true
}

const handleSaveModel = async () => {
  const data = {
    llmProviderId: modelForm.llmProviderId,
    modelCode: modelForm.modelCode,
    modelName: modelForm.modelName,
    status: modelForm.status,
    isDefault: modelForm.isDefault,
    sort: Number(modelForm.sort ?? 1)
  }
  try {
    if (isModelEdit.value) {
      data.llmModelId = modelForm.llmModelId
      await api.llm.updateLlmModel(modelForm.llmModelId, data)
      Message.success(t('commonTable.success'))
    } else {
      await api.llm.createLlmModel(data)
      Message.success(t('commonTable.success'))
    }
    modelModalVisible.value = false
    fetchModels()
  } catch (e) {
    console.error('保存模型失败:', e)
    Message.error(e?.msg || t('common.error'))
  }
}

const handleDeleteModel = async (record) => {
  try {
    await api.llm.deleteLlmModel(record.llmModelId)
    Message.success(t('commonTable.success'))
    fetchModels()
  } catch (e) {
    console.error('删除模型失败:', e)
    Message.error(e?.msg || t('common.error'))
  }
}

onMounted(() => {
  fetchProviders()
  fetchModels()
})
</script>

<style scoped>
.llm-mgmt-page {
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
