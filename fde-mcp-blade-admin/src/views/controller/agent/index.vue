<template>
  <div class="agent-mgmt-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form layout="inline" :model="searchForm">
        <a-form-item :label="$t('agentManage.agentName')">
          <a-input
            v-model="searchForm.agentName"
            :placeholder="$t('agentManage.searchName')"
            allow-clear
            style="width: 200px"
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

    <!-- 表格 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="table-toolbar">
        <a-button type="primary" @click="handleAdd">
          <template #icon><icon-plus /></template>
          {{ $t('commonTable.add') }}
        </a-button>
      </div>

      <a-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="gisAgentId"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="'ID'" data-index="gisAgentId" :width="70" />
          <a-table-column :title="$t('agentManage.agentName')" data-index="agentName" :width="160" />
          <a-table-column :title="$t('agentManage.bindUser')" :width="140">
            <template #cell="{ record }">
              {{ getUserName(record.userId) }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('agentManage.description')" data-index="agentDescription" :width="200" ellipsis tooltip />
          <a-table-column :title="$t('agentManage.mcpTools')" :width="220">
            <template #cell="{ record }">
              <a-space v-if="(agentPluginsMap[record.gisAgentId] || []).length" wrap size="mini">
                <a-tag v-for="name in agentPluginsMap[record.gisAgentId]" :key="name" color="arcoblue">{{ name }}</a-tag>
              </a-space>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('agentManage.modelProvider')" :width="140">
            <template #cell="{ record }">
              {{ getProviderDisplay(record.modelProvider) }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('agentManage.modelName')" :width="160">
            <template #cell="{ record }">
              {{ getModelDisplay(record.modelName) }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('agentManage.temperature')" data-index="temperature" :width="80" />
          <a-table-column :title="$t('agentManage.maxTokens')" data-index="maxTokens" :width="100" />
          <a-table-column :title="$t('agentManage.createdTime')" :width="170">
            <template #cell="{ record }">
              {{ record.createdTime ? formatDateTime(record.createdTime) : '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="240" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('commonTable.edit') }}
                </a-button>
                <a-button type="text" size="small" @click="handleBindPlugins(record)">
                  <template #icon><icon-link /></template>
                  {{ $t('agentManage.bindPlugins') }}
                </a-button>
                <a-popconfirm
                  :content="$t('agentManage.deleteConfirm')"
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

    <!-- 创建/编辑弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? $t('agentManage.editTitle') : $t('agentManage.createTitle')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      width="560px"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="agentName" :label="$t('agentManage.agentName')">
              <a-input v-model="formData.agentName" :placeholder="$t('agentManage.agentNamePlaceholder')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="userId" :label="$t('agentManage.bindUser')">
              <!-- 远程搜索下拉：数据源是 picker，不是本地全量列表（见 script 段实现纪律） -->
              <a-select
                v-model="formData.userId"
                :placeholder="$t('agentManage.bindUserPlaceholder')"
                allow-clear
                allow-search
                :loading="userLoading"
                :filter-option="false"
                :search-delay="300"
                :options="userOptions"
                :fallback-option="userFallbackOption"
                @search="handleUserSearch"
                @popup-visible-change="handleUserPopupToggle"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item field="agentDescription" :label="$t('agentManage.description')">
          <a-input v-model="formData.agentDescription" :placeholder="$t('agentManage.descriptionPlaceholder')" />
        </a-form-item>
        <a-form-item field="systemPrompt" :label="$t('agentManage.systemPrompt')">
          <a-textarea
            v-model="formData.systemPrompt"
            :placeholder="$t('agentManage.systemPromptPlaceholder')"
            :auto-size="{ minRows: 3, maxRows: 6 }"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="modelProvider" :label="$t('agentManage.modelProvider')">
              <a-select
                v-model="formData.modelProvider"
                allow-clear
                :placeholder="$t('agentManage.modelProviderPlaceholder')"
                @change="handleProviderChange"
              >
                <a-option
                  v-for="p in enabledLlmProviders"
                  :key="p.providerCode"
                  :value="p.providerCode"
                >
                  {{ p.providerName }}
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="modelName" :label="$t('agentManage.modelName')">
              <a-select
                v-model="formData.modelName"
                allow-clear
                :placeholder="$t('agentManage.modelNamePlaceholder')"
              >
                <a-option
                  v-for="m in enabledLlmModels"
                  :key="m.modelCode"
                  :value="m.modelCode"
                >
                  {{ m.modelName }}
                </a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="$t('agentManage.temperature')">
              <a-input-number
                v-model="formData.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                :precision="1"
                placeholder="0.7"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="$t('agentManage.maxTokens')">
              <a-input-number v-model="formData.max_tokens" :min="1" :max="131072" placeholder="2048" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- MCP 工具绑定弹窗 -->
    <a-modal
      v-model:visible="pluginsModalVisible"
      :title="$t('agentManage.bindPluginsTitle') + currentAgent?.agentName"
      :footer="false"
      width="640px"
      @cancel="pluginsModalVisible = false"
    >
      <p style="color: var(--color-text-3); margin-bottom: 12px">
        {{ $t('agentManage.bindPluginsDesc') }}
      </p>

      <!-- 已绑定列表 -->
      <div v-if="boundPlugins.length > 0" class="plugin-list">
        <div v-for="p in boundPlugins" :key="p.plugin_id" class="plugin-item">
          <div class="plugin-item-info">
            <span class="plugin-item-name">{{ p.plugin_name }}</span>
            <span v-if="p.description" class="plugin-item-desc">{{ p.description }}</span>
          </div>
          <a-space size="mini">
            <a-button type="text" size="small" @click="handleEditPlugin(p)">
              <template #icon><icon-edit /></template>
              {{ $t('commonTable.edit') }}
            </a-button>
            <a-popconfirm :content="$t('agentManage.unbindConfirm')" position="br" @ok="handleUnbindPlugin(p)">
              <a-button type="text" size="small" status="danger">
                <template #icon><icon-delete /></template>
                {{ $t('agentManage.unbind') }}
              </a-button>
            </a-popconfirm>
          </a-space>
        </div>
      </div>
      <a-empty v-else :description="$t('agentManage.noPlugins')" style="margin: 16px 0" />

      <a-divider />

      <!-- 新增 MCP Server（粘贴整体 mcpServers 配置） -->
      <template v-if="!isEditing">
        <a-form layout="vertical" :model="addForm">
          <a-form-item :label="$t('agentManage.mcpServersConfig')">
            <a-textarea
              v-model="addForm.mcpServersText"
              :placeholder="$t('agentManage.mcpServersPlaceholder')"
              :auto-size="{ minRows: 6, maxRows: 16 }"
            />
          </a-form-item>
        </a-form>
        <a-button type="primary" long :loading="saving" @click="handleAddServers">
          <template #icon><icon-plus /></template>
          {{ $t('agentManage.addServer') }}
        </a-button>
      </template>

      <!-- 编辑单个 MCP Server -->
      <template v-else>
        <a-form layout="vertical" :model="editForm">
          <a-form-item :label="$t('agentManage.pluginName')">
            <a-input v-model="editForm.pluginName" :placeholder="$t('agentManage.pluginNamePlaceholder')" />
          </a-form-item>
          <a-form-item :label="$t('agentManage.pluginDescription')">
            <a-input v-model="editForm.description" :placeholder="$t('agentManage.pluginDescriptionPlaceholder')" />
          </a-form-item>
          <a-form-item :label="$t('agentManage.mcpConfig')">
            <a-textarea
              v-model="editForm.configText"
              :placeholder="$t('agentManage.mcpConfigPlaceholder')"
              :auto-size="{ minRows: 6, maxRows: 16 }"
            />
          </a-form-item>
        </a-form>
        <a-space>
          <a-button type="primary" :loading="saving" @click="handleSaveEdit">
            {{ $t('commonTable.save') }}
          </a-button>
          <a-button @click="handleCancelEdit">
            {{ $t('commonTable.cancel') }}
          </a-button>
        </a-space>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconLink,
  IconDelete
} from '@arco-design/web-vue/es/icon'

const { t } = useI18n()

// 格式化日期时间
const formatDateTime = (str) => {
  if (!str) return '-'
  return str.replace('T', ' ').split('+')[0].split('.')[0]
}

// ==================== 搜索 ====================
const searchForm = reactive({
  agentName: ''
})

const handleSearch = () => {
  pagination.current = 1
  fetchList()
}

const handleReset = () => {
  searchForm.agentName = ''
  pagination.current = 1
  fetchList()
}

// ==================== 表格 ====================
const loading = ref(false)
const tableData = ref([])
const columns = []
const agentPluginsMap = reactive({})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50]
})

const handlePageChange = (page) => {
  pagination.current = page
  fetchList()
}

const handlePageSizeChange = (size) => {
  pagination.pageSize = size
  pagination.current = 1
  fetchList()
}

const fetchPluginsForRows = async (rows) => {
  const results = await Promise.all(rows.map(async (row) => {
    try {
      const pluginRes = await api.agent.getAgentPlugins(row.gisAgentId)
      const names = (pluginRes.data || []).map(p => p.plugin_name).filter(Boolean)
      return [row.gisAgentId, names]
    } catch (e) {
      return [row.gisAgentId, []]
    }
  }))
  results.forEach(([id, names]) => {
    agentPluginsMap[id] = names
  })
}

const fetchList = async () => {
  loading.value = true
  try {
    const params = {
      page_num: pagination.current,
      page_size: pagination.pageSize
    }
    if (searchForm.agentName) params.agent_name = searchForm.agentName

    const res = await api.agent.getAgentPageList(params)
    const rows = res.rows || res.data?.rows || []
    tableData.value = rows
    pagination.total = res.total || res.data?.total || 0
    fetchPluginsForRows(rows)
  } catch (e) {
    console.error('获取列表失败:', e)
  } finally {
    loading.value = false
  }
}

// ==================== 用户下拉（picker 远程搜索）====================
//
// 数据源 = GET /biz/gis_user/picker（不挂权限点、登录即可），
// 替代原 getGisUserList({ page_size: 999 }) —— 原写法被后端静默夹到 100 条，
// 用户数超 100 时第 100 条之后的人搜不到。
// ⚠️ 本页在本版菜单中隐藏，但仍按 picker 一并改造，避免留下同一个坑。
// 四条实现纪律同 1016 §5.1.1（filter-option=false / 空串回首页 / 丢弃过期响应 / 缓存只增不减）。
const userCache = new Map()      // user_id -> 完整用户对象（表格列 getUserName 也读它）
const userOptions = ref([])      // a-select 用的 { label, value }
const userLoading = ref(false)
let userFetchSeq = 0

const userLabel = (u) => `${u.nick_name || u.user_name}(${u.user_id})`

const toUserOption = (u) => {
  userCache.set(u.user_id, u)
  return { label: userLabel(u), value: u.user_id }
}

// 已选值不在当前结果页时的标签兜底（Arco fallback-option）
const userFallbackOption = (value) => {
  if (value === undefined || value === null || value === '') return { value, label: '' }
  const u = userCache.get(value)
  return { value, label: u ? userLabel(u) : `#${value}` }
}

const fetchUserOptions = async (keyword = '') => {
  const seq = ++userFetchSeq
  userLoading.value = true
  try {
    const res = await api.gisUser.getGisUserPicker({ keyword, page: 1, page_size: 100 })
    if (seq !== userFetchSeq) return
    userOptions.value = (res.rows || res.data?.rows || []).map(toUserOption)
  } catch (e) {
    console.error('获取用户列表失败:', e)
  } finally {
    if (seq === userFetchSeq) userLoading.value = false
  }
}

const handleUserSearch = (v) => fetchUserOptions(v || '')
const handleUserPopupToggle = (visible) => {
  if (visible) fetchUserOptions('')
}

// 表格列：user_id → 显示名。命中缓存用昵称，未命中回落原始 ID
// （覆盖范围与旧行为一致：后端本来就只返回前 100 条）
const getUserName = (userId) => {
  if (userId === undefined || userId === null || userId === '') return '-'
  const u = userCache.get(userId)
  return u ? (u.nick_name || u.user_name) : String(userId)
}

// ==================== LLM 供应商/模型选项 ====================
const llmProviders = ref([])
const llmModels = ref([])

const fetchLlmOptions = async () => {
  try {
    const [pRes, mRes] = await Promise.all([
      api.llm.getLlmProviders(),
      api.llm.getLlmModels()
    ])
    llmProviders.value = pRes.data || []
    llmModels.value = mRes.data || []
  } catch (e) {
    console.error('获取 LLM 选项失败:', e)
  }
}

const enabledLlmProviders = computed(() =>
  llmProviders.value.filter(p => p.status === '1')
)

const enabledLlmModels = computed(() => {
  const provider = llmProviders.value.find(p => p.providerCode === formData.modelProvider)
  if (!provider) return llmModels.value.filter(m => m.status === '1')
  return llmModels.value.filter(m => m.status === '1' && m.llmProviderId === provider.llmProviderId)
})

const handleProviderChange = () => {
  formData.modelName = ''
}

const getProviderDisplay = (code) => {
  if (!code) return '-'
  const p = llmProviders.value.find(item => item.providerCode === code)
  return p ? p.providerName : code
}

const getModelDisplay = (code) => {
  if (!code) return '-'
  const m = llmModels.value.find(item => item.modelCode === code)
  return m ? m.modelName : code
}

// ==================== 创建/编辑 ====================
const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const getDefaultFormData = () => ({
  gisAgentId: undefined,
  agentName: '',
  agentDescription: '',
  systemPrompt: '',
  modelProvider: '',
  modelName: '',
  temperature: 0.7,
  maxTokens: 2048,
  userId: undefined
})

const formData = reactive(getDefaultFormData())

const formRules = {
  agentName: [{ required: true, message: t('agentManage.nameRequired') }],
  modelProvider: [{ required: true, message: t('agentManage.modelProviderRequired') }],
  modelName: [{ required: true, message: t('agentManage.modelNameRequired') }]
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(formData, getDefaultFormData())
  modalVisible.value = true
  if (userOptions.value.length === 0) fetchUserOptions()
}

const handleEdit = (record) => {
  isEdit.value = true
  Object.assign(formData, getDefaultFormData(), {
    gisAgentId: record.gisAgentId,
    agentName: record.agentName || '',
    agentDescription: record.agentDescription || '',
    systemPrompt: record.systemPrompt || '',
    modelProvider: record.modelProvider || '',
    modelName: record.modelName || '',
    temperature: Number(record.temperature) || 0.7,
    maxTokens: Number(record.maxTokens) || 2048,
    userId: record.userId || undefined
  })
  modalVisible.value = true
  if (userOptions.value.length === 0) fetchUserOptions()
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch (e) {
    return
  }

  try {
    const data = {
      agentName: formData.agentName,
      agentDescription: formData.agentDescription || '',
      systemPrompt: formData.systemPrompt || '',
      modelProvider: formData.modelProvider || '',
      modelName: formData.modelName || '',
      temperature: String(formData.temperature ?? 0.7),
      maxTokens: Number(formData.maxTokens ?? 2048),
      userId: formData.userId || undefined
    }

    if (isEdit.value) {
      data.gisAgentId = formData.gisAgentId
      await api.agent.updateAgent(data)
      Message.success(t('agentManage.updateSuccess'))
    } else {
      await api.agent.createAgent(data)
      Message.success(t('agentManage.createSuccess'))
    }

    modalVisible.value = false
    fetchList()
  } catch (e) {
    console.error('提交失败:', e)
    Message.error(e?.msg || t('common.error'))
  }
}

// ==================== 删除 ====================
const handleDelete = async (record) => {
  try {
    await api.agent.deleteAgent(record.gisAgentId)
    Message.success(t('agentManage.deleteSuccess'))
    fetchList()
  } catch (e) {
    console.error('删除失败:', e)
    Message.error(e?.msg || t('common.error'))
  }
}

// ==================== MCP 工具绑定 ====================
const pluginsModalVisible = ref(false)
const currentAgent = ref(null)
const boundPlugins = ref([])
const isEditing = ref(false)
const saving = ref(false)

const addForm = reactive({
  mcpServersText: '{\n  "mcpServers": {}\n}'
})

const editForm = reactive({
  pluginId: null,
  pluginName: '',
  description: '',
  configText: ''
})

const parsePluginConfig = (config) => {
  if (!config) return {}
  if (typeof config === 'string') {
    try { return JSON.parse(config) } catch { return {} }
  }
  return config
}

const fetchBoundPlugins = async (agentId) => {
  try {
    const res = await api.agent.getAgentPlugins(agentId)
    boundPlugins.value = (res.data || []).map(p => ({
      ...p,
      config_obj: parsePluginConfig(p.config)
    }))
  } catch (e) {
    boundPlugins.value = []
  }
}

const resetAddForm = () => {
  addForm.mcpServersText = '{\n  "mcpServers": {}\n}'
}

const resetEditForm = () => {
  isEditing.value = false
  editForm.pluginId = null
  editForm.pluginName = ''
  editForm.description = ''
  editForm.configText = ''
}

const handleBindPlugins = async (record) => {
  currentAgent.value = record
  resetAddForm()
  resetEditForm()
  pluginsModalVisible.value = true
  await fetchBoundPlugins(record.gisAgentId)
}

const handleAddServers = async () => {
  let config
  try {
    config = JSON.parse(addForm.mcpServersText)
  } catch (e) {
    Message.error(t('agentManage.configInvalid'))
    return
  }
  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    Message.error(t('agentManage.mcpServersRequired'))
    return
  }

  saving.value = true
  try {
    await api.agent.bindAgentPlugins(currentAgent.value.gisAgentId, config)
    Message.success(t('agentManage.bindSuccess'))
    resetAddForm()
    await fetchBoundPlugins(currentAgent.value.gisAgentId)
  } catch (e) {
    console.error('绑定失败:', e)
    Message.error(e?.msg || t('common.error'))
  } finally {
    saving.value = false
  }
}

const handleEditPlugin = (plugin) => {
  isEditing.value = true
  editForm.pluginId = plugin.plugin_id
  editForm.pluginName = plugin.plugin_name || ''
  editForm.description = plugin.description || ''
  editForm.configText = JSON.stringify(plugin.config_obj || {}, null, 2)
}

const handleCancelEdit = () => {
  resetEditForm()
}

const handleSaveEdit = async () => {
  let config
  try {
    config = JSON.parse(editForm.configText)
  } catch (e) {
    Message.error(t('agentManage.configInvalid'))
    return
  }

  saving.value = true
  try {
    const data = {
      pluginName: editForm.pluginName.trim() || undefined,
      description: editForm.description || undefined,
      config
    }
    await api.agent.updateAgentPlugin(currentAgent.value.gisAgentId, editForm.pluginId, data)
    Message.success(t('agentManage.updateSuccess'))
    resetEditForm()
    await fetchBoundPlugins(currentAgent.value.gisAgentId)
  } catch (e) {
    console.error('更新插件失败:', e)
    Message.error(e?.msg || t('common.error'))
  } finally {
    saving.value = false
  }
}

const handleUnbindPlugin = async (plugin) => {
  try {
    await api.agent.unbindAgentPlugin(currentAgent.value.gisAgentId, plugin.plugin_id)
    Message.success(t('agentManage.unbindSuccess'))
    boundPlugins.value = boundPlugins.value.filter(p => p.plugin_id !== plugin.plugin_id)
  } catch (e) {
    console.error('解绑失败:', e)
    Message.error(e?.msg || t('common.error'))
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchList()
  fetchUserOptions()
  fetchLlmOptions()
})
</script>

<style scoped>
.agent-mgmt-page {
  padding-bottom: 24px;
}

.table-toolbar {
  margin-bottom: 16px;
}

.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plugin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-fill-2);
  border-radius: 6px;
}

.plugin-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.plugin-item-name {
  font-weight: 500;
}

.plugin-item-desc {
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
