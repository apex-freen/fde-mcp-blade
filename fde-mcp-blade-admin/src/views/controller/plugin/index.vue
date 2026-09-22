<template>
  <div class="plugin-index-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="keyword" :label="$t('plugin.searchPlugin')">
          <a-input
            v-model="searchForm.keyword"
            :placeholder="$t('plugin.searchPlaceholder')"
            allow-clear
            style="width: 240px"
          >
            <template #prefix><icon-search /></template>
          </a-input>
        </a-form-item>
        <a-form-item :label="$t('plugin.includeDisabled')">
          <a-switch v-model="showDisabled" @change="onShowDisabledChange" />
        </a-form-item>
        <a-form-item>
          <a-button @click="refreshList">
            <template #icon><icon-refresh /></template>
            {{ $t('commonTable.refresh') }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 表格 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="table-toolbar">
        <span class="table-hint">{{ $t('plugin.installHint') }}</span>
        <span class="table-hint">{{ $t('plugin.totalPlugins') }} {{ filteredPlugins.length }} {{ $t('plugin.pluginsCount') }}</span>
      </div>

      <a-table
        :columns="columns"
        :data="filteredPlugins"
        :loading="loading"
        :pagination="false"
        row-key="name"
      >
        <template #columns>
          <a-table-column :title="$t('plugin.pluginName')" data-index="name" :width="200">
            <template #cell="{ record }">
              <a-tag v-if="record.disabled" color="gray" size="small" style="margin-right: 6px">{{ $t('plugin.disabled') }}</a-tag>
              <span>{{ record.name }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('plugin.title')" data-index="title" :width="180" />
          <a-table-column :title="$t('plugin.version')" data-index="version" :width="90" />
          <a-table-column :title="$t('plugin.runtime')" :width="90">
            <template #cell="{ record }">
              <a-tag>{{ record.runtime || '-' }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('plugin.status')" :width="70">
            <template #cell="{ record }">
              <a-switch
                size="small"
                :model-value="!record.disabled"
                @change="(val) => handleToggle(record, !val)"
              />
            </template>
          </a-table-column>
          <a-table-column :title="$t('plugin.methodCount')" :width="70" align="center">
            <template #cell="{ record }">
              {{ record.methodCount ?? '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="440" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button
                  v-if="webUiMap[record.name]?.has_web_ui"
                  type="text"
                  size="small"
                  status="success"
                  @click="openConsole(record)"
                >
                  <template #icon><icon-launch /></template>
                  {{ $t('plugin.openConsole') }}
                </a-button>
                <a-button
                  type="text"
                  size="small"
                  :type="selectedPlugin?.name === record.name ? 'primary' : 'text'"
                  @click="handleSelectPlugin(record)"
                >
                  <template #icon><icon-apps /></template>
                  {{ $t('plugin.viewMethod') }}
                </a-button>
                <a-button type="text" size="small" @click="handleEditUrl(record)">
                  <template #icon><icon-link /></template>
                  {{ $t('plugin.serviceUrl') }}
                </a-button>
                <a-button type="text" size="small" @click="handleEditConfig(record)">
                  <template #icon><icon-settings /></template>
                  {{ $t('plugin.config') }}
                </a-button>
                <a-popconfirm
                  :content="$t('plugin.renameConfirm')"
                  position="br"
                  @ok="handleRename(record)"
                >
                  <a-button type="text" size="small" status="warning">
                    <template #icon><icon-edit /></template>
                    {{ $t('plugin.rename') }}
                  </a-button>
                </a-popconfirm>
                <a-button
                  v-if="record.disabled"
                  type="text"
                  size="small"
                  status="success"
                  @click="handleToggle(record, false)"
                >
                  <template #icon><icon-poweroff /></template>
                  {{ $t('plugin.enable') }}
                </a-button>
                <a-button
                  v-else
                  type="text"
                  size="small"
                  status="warning"
                  @click="handleToggle(record, true)"
                >
                  <template #icon><icon-poweroff /></template>
                  {{ $t('plugin.disable') }}
                </a-button>
                <a-popconfirm
                  :content="$t('plugin.deleteConfirm')"
                  position="br"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    <template #icon><icon-delete /></template>
                    {{ $t('plugin.delete') }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 方法列表卡片 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="panel-title">
        <span>
          {{ $t('plugin.methodList') }}
          <span v-if="selectedPlugin" class="sub">
            - {{ selectedPlugin.title || selectedPlugin.name }}
          </span>
        </span>
      </div>

      <template v-if="selectedPlugin">
        <div class="plugin-actions">
          <a-space>
            <a-button
              size="small"
              :status="selectedPlugin.disabled ? 'success' : 'warning'"
              @click="handleToggle(selectedPlugin, !selectedPlugin.disabled)"
            >
              <template #icon><icon-poweroff /></template>
              {{ selectedPlugin.disabled ? $t('plugin.enablePlugin') : $t('plugin.disablePlugin') }}
            </a-button>
          </a-space>
        </div>
        <div class="methods-wrapper" :class="{ 'is-disabled': selectedPlugin.disabled }">
          <div v-if="selectedPlugin.disabled" class="disabled-mask">
            <span>{{ $t('plugin.disabled') }}</span>
          </div>
          <a-table
            :data="currentMethods"
            :loading="methodsLoading"
            :pagination="false"
            row-key="name"
            size="small"
          >
            <template #columns>
              <a-table-column :title="$t('plugin.methodName')" data-index="name" :width="220" />
              <a-table-column :title="$t('plugin.description')" data-index="description" :ellipsis="true" />
              <a-table-column :title="$t('plugin.riskLevel')" :width="120">
                <template #cell="{ record: method }">
                  <a-tag
                    v-if="riskLevelMap[method.risk_level]"
                    :color="riskLevelMap[method.risk_level].color"
                    size="small"
                  >
                    {{ riskLevelMap[method.risk_level].label }}
                  </a-tag>
                  <span v-else>-</span>
                </template>
              </a-table-column>
              <a-table-column :title="$t('commonTable.operation')" :width="80">
                <template #cell="{ record: method }">
                  <a-button
                    type="text"
                    size="small"
                    @click="handleEditMethod(selectedPlugin, method)"
                  >
                    {{ $t('plugin.edit') }}
                  </a-button>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else :description="$t('plugin.noPluginSelected')" style="padding: 60px 0" />
    </a-card>

    <!-- 服务地址弹窗 -->
    <a-modal
      v-model:visible="urlModalVisible"
      :title="$t('plugin.editServiceUrl')"
      :ok-text="$t('commonTable.confirm')"
      :cancel-text="$t('commonTable.cancel')"
      width="520px"
      @ok="handleUrlSubmit"
      @cancel="urlModalVisible = false"
    >
      <a-form ref="urlFormRef" :model="urlForm" layout="vertical">
        <a-form-item :label="$t('plugin.pluginName')">
          <a-input :model-value="urlTarget?.title || urlTarget?.name" readonly />
        </a-form-item>
        <a-form-item field="serverUrl" :label="$t('plugin.serviceUrlLabel')">
          <a-input
            v-model="urlForm.serverUrl"
            :placeholder="$t('plugin.serviceUrlPlaceholder')"
          />
          <div class="form-hint">{{ $t('plugin.serverUrlMigrateHint') }}</div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 插件配置弹窗（生效配置 + config_help 渲染，Doc 47 §4.3 / §5） -->
    <a-modal
      v-model:visible="configModalVisible"
      :title="$t('plugin.configTitle')"
      :ok-text="$t('plugin.saveConfig')"
      :cancel-text="$t('commonTable.cancel')"
      width="760px"
      :ok-loading="configSubmitting"
      unmount-on-close
      :on-before-ok="handleConfigSubmit"
      @cancel="configModalVisible = false"
    >
      <a-spin :loading="configLoading" style="width: 100%">
        <a-form :model="configForm" layout="vertical">
          <a-form-item :label="$t('plugin.pluginName')">
            <a-input :model-value="configTarget?.title || configTarget?.name" readonly />
          </a-form-item>

          <!-- 缺失键提示条：模板有、实例缺 -->
          <a-alert v-if="missingKeys.length" type="warning" class="config-alert">
            <div class="alert-row">
              <span>{{ $t('plugin.missingKeysTitle') }}{{ missingKeys.join('、') }}</span>
              <a-button
                type="text"
                size="mini"
                :loading="seedingMissing"
                @click="handleWriteMissingToInstance"
              >
                {{ $t('plugin.writeToInstance') }}
              </a-button>
            </div>
          </a-alert>

          <div class="section-title">{{ $t('plugin.configBasicSection') }}</div>
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item :label="$t('plugin.status')">
                <a-switch
                  size="small"
                  :model-value="!configForm.disabled"
                  @change="(val) => (configForm.disabled = !val)"
                />
              </a-form-item>
            </a-col>
            <a-col :span="16">
              <a-form-item :label="$t('plugin.serviceUrlLabel')">
                <a-input
                  v-model="configForm.serverUrl"
                  :placeholder="$t('plugin.serviceUrlPlaceholder')"
                />
                <div class="form-hint">{{ $t('plugin.serverUrlMigrateHint') }}</div>
              </a-form-item>
            </a-col>
          </a-row>

          <div class="section-title">{{ $t('plugin.configSection') }}</div>

          <!-- 无 config_help：回退为 JSON 编辑 -->
          <template v-if="!hasConfigHelp">
            <a-alert type="info" class="config-alert">{{ $t('plugin.configFallbackHint') }}</a-alert>
            <a-form-item field="configJson">
              <a-textarea
                v-model="configForm.configJson"
                :placeholder="$t('plugin.configPlaceholder')"
                :auto-size="{ minRows: 8, maxRows: 20 }"
                class="mono-input"
              />
            </a-form-item>
          </template>

          <!-- 有 config_help：按声明类型渲染控件，未声明的键按值类型推断 -->
          <template v-else>
            <a-empty
              v-if="!configFields.length"
              :description="$t('plugin.configEmpty')"
              style="padding: 24px 0"
            />
            <a-form-item v-for="f in configFields" :key="f.key">
              <template #label>
                <span class="field-label">
                  <span>{{ f.label }}</span>
                  <a-tag v-if="!f.declared" size="small" color="gray">
                    {{ $t('plugin.fieldNotDeclared') }}
                  </a-tag>
                  <span v-if="f.required" class="required-mark">*</span>
                </span>
              </template>

              <!-- 密钥类字段：只看状态，不回显值，配置中始终保留占位符 -->
              <div v-if="f.secret" class="secret-field">
                <div class="secret-row">
                  <a-tag :color="secretStatus(f.key).color" size="small">
                    {{ secretStatus(f.key).text }}
                  </a-tag>
                  <span class="secret-placeholder">{{ configForm.config[f.key] }}</span>
                  <span class="secret-badge">{{ $t('plugin.secretBadge') }}</span>
                </div>
                <a-space>
                  <a-input-password
                    v-model="secretInputs[f.key]"
                    :placeholder="$t('plugin.secretNewValuePlaceholder')"
                    size="small"
                    style="width: 280px"
                  />
                  <a-button size="small" @click="handleSaveSecret(f.key)">
                    {{ $t('plugin.saveSecret') }}
                  </a-button>
                </a-space>
                <div class="form-hint">{{ $t('plugin.secretKeyHint') }}</div>
              </div>

              <a-switch
                v-else-if="f.type === 'boolean'"
                :model-value="configForm.config[f.key] === true"
                @change="(val) => (configForm.config[f.key] = val)"
              />
              <a-input-number
                v-else-if="f.type === 'number'"
                v-model="configForm.config[f.key]"
                style="width: 100%"
              />
              <a-textarea
                v-else-if="f.type === 'array' || f.type === 'object'"
                v-model="jsonBuffers[f.key]"
                :auto-size="{ minRows: 3, maxRows: 10 }"
                class="mono-input"
              />
              <a-input v-else v-model="configForm.config[f.key]" />

              <div v-if="!f.secret && f.desc" class="form-hint">{{ f.desc }}</div>
            </a-form-item>
          </template>
        </a-form>
      </a-spin>
      <div v-if="configError" class="config-error">
        <a-alert type="error" :title="configError" />
      </div>
    </a-modal>

    <!-- 重命名弹窗 -->
    <a-modal
      v-model:visible="renameModalVisible"
      :title="$t('plugin.renameTitle')"
      :ok-text="$t('commonTable.confirm')"
      :cancel-text="$t('commonTable.cancel')"
      width="480px"
      @ok="handleRenameSubmit"
      @cancel="renameModalVisible = false"
    >
      <a-form ref="renameFormRef" :model="renameForm" layout="vertical">
        <a-form-item :label="$t('plugin.currentName')">
          <a-input :model-value="renameTarget?.name" readonly />
        </a-form-item>
        <a-form-item field="newName" :label="$t('plugin.newName')">
          <a-input
            v-model="renameForm.newName"
            :placeholder="$t('plugin.newNamePlaceholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑方法弹窗 -->
    <a-modal
      v-model:visible="methodModalVisible"
      :title="$t('plugin.editMethod')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      width="480px"
      @ok="handleMethodSubmit"
      @cancel="methodModalVisible = false"
    >
      <a-form ref="methodFormRef" :model="methodForm" layout="vertical">
        <a-form-item :label="$t('plugin.targetPlugin')">
          <a-input :model-value="methodTargetPlugin?.title || methodTargetPlugin?.name" readonly />
        </a-form-item>
        <a-form-item field="name" :label="$t('plugin.methodName')">
          <a-input v-model="methodForm.name" readonly />
        </a-form-item>
        <a-form-item field="risk_level" :label="$t('plugin.methodRiskLevel')">
          <a-select v-model="methodForm.risk_level" :placeholder="$t('plugin.riskLevelRequired')">
            <a-option
              v-for="opt in RISK_LEVEL_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              <a-tag :color="opt.color" size="small">{{ opt.label }}</a-tag>
            </a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'
import {
  RISK_LEVEL_OPTIONS,
  RISK_LEVEL_MAP
} from '@/constants/riskLevel'

const { t } = useI18n()
const riskLevelMap = RISK_LEVEL_MAP

// ==================== 搜索 ====================
const searchForm = reactive({
  keyword: ''
})
const showDisabled = ref(false)

// ==================== 表格 ====================
const loading = ref(false)
const columns = []

// 插件列表（后端现已包含已禁用插件）
const pluginList = ref([])

// 插件 Web 页面状态映射 { 插件名: { has_web_ui, title } }（来自 /biz/plugin_web/status）
const webUiMap = ref({})

// 选中的插件 + 方法列表
const selectedPlugin = ref(null)
const currentMethods = ref([])
const methodsLoading = ref(false)

// 过滤后的列表
const filteredPlugins = computed(() => {
  let list = showDisabled.value
    ? pluginList.value
    : pluginList.value.filter(p => !p.disabled)

  const kw = searchForm.keyword.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      p => p.name.toLowerCase().includes(kw) || (p.title || '').toLowerCase().includes(kw)
    )
  }
  return list
})

const onShowDisabledChange = () => {
  // 切换时无需额外操作
}

const handleSelectPlugin = async (plugin) => {
  selectedPlugin.value = plugin
  methodsLoading.value = true
  currentMethods.value = []
  try {
    const res = await api.pluginService.getServiceDetail(plugin.name)
    const data = res.data || res
    currentMethods.value = data.methods || []
    plugin.methodCount = currentMethods.value.length
    updatePluginInList(plugin)
  } catch (e) {
    console.error(t('plugin.loadDetailFailed') + ':', e)
    Message.error(e?.msg || t('plugin.loadDetailFailed'))
  } finally {
    methodsLoading.value = false
  }
}

// ==================== 打开控制台 ====================
const openConsole = (plugin) => {
  // 插件自带 web_ui 目录，通过主程序 /plugin-web/<插件名>/ 打开（通用机制，与具体插件无关）
  window.open(`/plugin-web/${encodeURIComponent(plugin.name)}/`, '_blank')
}

// ==================== 列表刷新 ====================
const refreshList = async () => {
  loading.value = true
  try {
    const res = await api.pluginService.getServiceList()
    const list = res.data || res || []
    pluginList.value = (Array.isArray(list) ? list : []).map(p => {
      // 兼容嵌套 manifest/info/runtime 格式
      const manifest = p.manifest || {}
      const info = p.info || {}
      const runtime = p.runtime || {}
      return {
        ...p,
        name: p.name || manifest.name || '',
        title: p.title || info.title || '',
        description: p.description || info.description || '',
        version: p.version || manifest.version || '',
        runtime: p.runtime || runtime.interpreter || '',
        disabled: p.disabled ?? manifest.disabled ?? false,
        serverUrl: p.serverUrl ?? manifest.serverUrl ?? '',
        methodCount: p.methods?.length ?? p.methodCount ?? '-'
      }
    })
    // 并行拉取插件 Web 页面状态（决定是否显示"打开控制台"按钮，静默失败）
    api.pluginService.getPluginWebStatus()
      .then(res2 => {
        webUiMap.value = res2.data || res2 || {}
      })
      .catch(e => {
        console.warn(t('plugin.fetchWebStatusFailed') + ':', e)
        webUiMap.value = {}
      })
  } catch (e) {
    console.error(t('plugin.fetchFailed') + ':', e)
    Message.error(t('plugin.fetchFailed'))
  } finally {
    loading.value = false
  }
}

// ==================== 启用/禁用 ====================
const handleToggle = (record, disabled) => {
  const title = disabled ? t('plugin.confirmDisableTitle') : t('plugin.confirmEnableTitle')
  const content = disabled
    ? `${t('plugin.confirmDisableContent')} [${record.name}]？`
    : `${t('plugin.confirmEnableContent')} [${record.name}]？`

  Modal.confirm({
    title,
    content,
    onOk: async () => {
      try {
        await api.pluginService.updateService(record.name, { disabled })
        Message.success(disabled ? t('plugin.disabled') : t('plugin.enabled'))
        // 更新列表中的状态
        record.disabled = disabled
        updatePluginInList(record)
        // 同步更新选中插件的状态
        if (selectedPlugin.value?.name === record.name) {
          selectedPlugin.value = { ...record, disabled }
        }
      } catch (e) {
        Message.error(e?.msg || t('plugin.operationFailed'))
      }
    }
  })
}

// ==================== 服务地址 ====================
const urlModalVisible = ref(false)
const urlTarget = ref(null)
const urlFormRef = ref(null)
const urlForm = reactive({ serverUrl: '' })

const handleEditUrl = async (record) => {
  urlTarget.value = record
  urlForm.serverUrl = record.serverUrl || ''
  urlModalVisible.value = true
}

const handleUrlSubmit = async () => {
  if (!urlForm.serverUrl.trim()) {
    Message.warning(t('plugin.serviceUrlRequired'))
    return
  }
  try {
    await api.pluginService.updateService(urlTarget.value.name, { serverUrl: urlForm.serverUrl.trim() })
    Message.success(t('plugin.updateSuccess'))
    urlTarget.value.serverUrl = urlForm.serverUrl.trim()
    updatePluginInList(urlTarget.value)
    urlModalVisible.value = false
  } catch (e) {
    Message.error(e?.msg || t('plugin.operationFailed'))
  }
}

// ==================== 插件配置（Doc 47 §4.3 / §5）====================
const configModalVisible = ref(false)
const configTarget = ref(null)
const configLoading = ref(false)
const configSubmitting = ref(false)
const seedingMissing = ref(false)
const configError = ref('')

const configForm = reactive({
  disabled: false,
  serverUrl: '',
  config: {},
  configJson: ''
})

// config_help：字段说明，决定控件类型 / 显示名 / 提示文案
const configHelp = ref({})
// 模板有、实例缺的键
const missingKeys = ref([])
// 数组 / 对象类字段的 JSON 缓冲（key -> JSON 文本）
const jsonBuffers = reactive({})
// 密钥类字段待写入密钥箱的新值（key -> 明文，保存后清空）
const secretInputs = reactive({})
// 保存前基线，用于只提交真正变更的字段（未传字段后端保持原值）
const baselineConfig = ref('')
const baselineDisabled = ref(false)
const baselineServerUrl = ref('')

const hasConfigHelp = computed(() => Object.keys(configHelp.value).length > 0)

const inferType = (value) => {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (Array.isArray(value)) return 'array'
  if (value !== null && typeof value === 'object') return 'object'
  return 'string'
}

// 已声明的键按 config_help 顺序在前，未声明的键在后（按值类型推断控件）
const configFields = computed(() => {
  const help = configHelp.value || {}
  const cfg = configForm.config || {}
  const declared = Object.keys(help).filter(k => Object.prototype.hasOwnProperty.call(cfg, k))
  const undeclared = Object.keys(cfg).filter(k => !Object.prototype.hasOwnProperty.call(help, k))
  return [...declared, ...undeclared].map((key) => {
    const h = help[key] || {}
    return {
      key,
      label: h.label || key,
      type: h.type || inferType(cfg[key]),
      secret: h.secret === true,
      required: h.required === true,
      desc: h.desc || '',
      declared: Object.prototype.hasOwnProperty.call(help, key)
    }
  })
})

// ---------- 密钥箱联动（§4.10：只回 has_value，永不返回值）----------
const pluginSecrets = ref([])

const loadSecrets = async (pluginName) => {
  try {
    const res = await api.gisSecret.getSecretList({ plugin_name: pluginName })
    const list = res.data || []
    pluginSecrets.value = Array.isArray(list) ? list : []
  } catch (e) {
    pluginSecrets.value = []
    // 密钥箱额外需要权限点 controller:plugin:secret
    if (String(e?.response?.status || e?.code || '') === '403') {
      Message.error(t('pluginSecret.noPermission'))
    }
  }
}

const secretStatus = (key) => {
  const found = pluginSecrets.value.find(s => s.secret_key === key)
  if (!found || !found.has_value) {
    return { text: t('plugin.secretNotConfigured'), color: 'red' }
  }
  if (String(found.status) === '0') {
    return { text: t('plugin.secretDisabled'), color: 'orange' }
  }
  return { text: t('plugin.secretConfigured'), color: 'green' }
}

const handleSaveSecret = async (key) => {
  const value = secretInputs[key]
  if (!value) {
    Message.warning(t('plugin.secretValueRequired'))
    return
  }
  const pluginName = configTarget.value?.name
  const found = pluginSecrets.value.find(s => s.secret_key === key)
  try {
    if (found) {
      await api.gisSecret.updateSecret(found.gis_secret_id, { secret_value: value })
    } else {
      await api.gisSecret.createSecret({
        plugin_name: pluginName,
        secret_key: key,
        secret_value: value
      })
    }
    Message.success(t('plugin.secretSaved'))
    secretInputs[key] = ''
    await loadSecrets(pluginName)
  } catch (e) {
    if (String(e?.response?.status || e?.code || '') === '403') {
      Message.error(t('pluginSecret.noPermission'))
      return
    }
    Message.error(e?.response?.data?.msg || e?.msg || t('plugin.secretSaveFailed'))
  }
}

// ---------- 生效值读取（/config 为扁平结构，列表/详情为 manifest 嵌套）----------
const flattenConfigData = (data = {}) => {
  const manifest = data.manifest || {}
  return {
    config: data.config || manifest.config,
    disabled: data.disabled ?? manifest.disabled,
    serverUrl: data.serverUrl ?? manifest.serverUrl
  }
}

// 用接口返回的生效值同步列表记录
const applyUpdatedManifest = (data) => {
  const record = configTarget.value
  if (!record) return
  const flat = flattenConfigData(data)
  if (typeof flat.disabled === 'boolean') record.disabled = flat.disabled
  if (flat.serverUrl !== undefined) record.serverUrl = flat.serverUrl
  updatePluginInList(record)
  if (selectedPlugin.value?.name === record.name) {
    selectedPlugin.value = {
      ...selectedPlugin.value,
      disabled: record.disabled,
      serverUrl: record.serverUrl
    }
  }
}

// 表单 → 提交体：数组 / 对象类字段从 JSON 缓冲解析，解析失败收集 errors
const buildConfig = () => {
  const out = {}
  const errors = {}
  Object.keys(configForm.config).forEach((key) => {
    const value = configForm.config[key]
    if (value !== null && typeof value === 'object') {
      const raw = jsonBuffers[key]
      try {
        out[key] = raw ? JSON.parse(raw) : (Array.isArray(value) ? [] : {})
      } catch (e) {
        errors[key] = `${key} ${t('plugin.fieldInvalidJson')}${e.message}`
      }
    } else {
      out[key] = value
    }
  })
  return { config: out, errors }
}

const resetConfigState = () => {
  configError.value = ''
  configHelp.value = {}
  missingKeys.value = []
  pluginSecrets.value = []
  Object.keys(jsonBuffers).forEach(k => delete jsonBuffers[k])
  Object.keys(secretInputs).forEach(k => delete secretInputs[k])
  Object.assign(configForm, { disabled: false, serverUrl: '', config: {}, configJson: '' })
}

const handleEditConfig = async (record) => {
  configTarget.value = record
  resetConfigState()
  configModalVisible.value = true
  configLoading.value = true
  try {
    // 表单初值取生效配置（§4.3），不取插件包里的模板值
    const res = await api.pluginService.getServiceConfig(record.name)
    const flat = flattenConfigData(res.data || {})
    const cfg = flat.config && typeof flat.config === 'object' ? { ...flat.config } : {}
    configForm.config = cfg
    configForm.serverUrl = flat.serverUrl ?? record.serverUrl ?? ''
    configForm.disabled = flat.disabled ?? record.disabled ?? false
    configForm.configJson = JSON.stringify(cfg, null, 2)
    const help = res.data?.config_help
    configHelp.value = help && typeof help === 'object' ? help : {}
    const missing = res.data?.missing_keys
    missingKeys.value = Array.isArray(missing) ? missing : []
    // 数组 / 对象类字段改用 JSON 缓冲编辑
    Object.keys(cfg).forEach((key) => {
      if (cfg[key] !== null && typeof cfg[key] === 'object') {
        jsonBuffers[key] = JSON.stringify(cfg[key], null, 2)
      }
    })
    baselineConfig.value = JSON.stringify(buildConfig().config)
    baselineDisabled.value = !!configForm.disabled
    baselineServerUrl.value = (configForm.serverUrl || '').trim()
    await loadSecrets(record.name)
  } catch (e) {
    console.error(t('plugin.configLoadFailed') + ':', e)
    Message.error(e?.msg || t('plugin.configLoadFailed'))
    configModalVisible.value = false
  } finally {
    configLoading.value = false
  }
}

// 把生效配置整体写入实例配置（缺失键随生效值一并落盘）
const handleWriteMissingToInstance = async () => {
  const built = buildConfig()
  const errKeys = Object.keys(built.errors)
  if (errKeys.length) {
    Message.error(built.errors[errKeys[0]])
    return
  }
  seedingMissing.value = true
  try {
    const res = await api.pluginService.updateService(configTarget.value.name, {
      config: built.config
    })
    Message.success(t('plugin.missingKeysWritten'))
    missingKeys.value = []
    baselineConfig.value = JSON.stringify(built.config)
    applyUpdatedManifest(res.data || {})
  } catch (e) {
    Message.error(e?.msg || t('plugin.operationFailed'))
  } finally {
    seedingMissing.value = false
  }
}

const handleConfigSubmit = async () => {
  configError.value = ''
  let config
  if (hasConfigHelp.value) {
    const built = buildConfig()
    const errKeys = Object.keys(built.errors)
    if (errKeys.length) {
      configError.value = built.errors[errKeys[0]]
      Message.error(configError.value)
      return false
    }
    config = built.config
  } else {
    // 无 config_help：回退为 JSON 编辑
    try {
      config = JSON.parse(configForm.configJson)
    } catch (e) {
      configError.value = `${t('plugin.jsonError')}${e.message}`
      return false
    }
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      configError.value = t('plugin.jsonObjectError')
      return false
    }
  }

  // config 为整体替换，只在确有变更时提交；未传字段后端保持原值
  const payload = {}
  if (JSON.stringify(config) !== baselineConfig.value) payload.config = config
  if (!!configForm.disabled !== baselineDisabled.value) payload.disabled = !!configForm.disabled
  const serverUrl = (configForm.serverUrl || '').trim()
  if (serverUrl !== baselineServerUrl.value) payload.serverUrl = serverUrl
  if (!Object.keys(payload).length) {
    Message.info(t('plugin.noChanges'))
    return false
  }

  configSubmitting.value = true
  try {
    const res = await api.pluginService.updateService(configTarget.value.name, payload)
    Message.success(t('plugin.configSaved'))
    applyUpdatedManifest(res.data || {})
    configModalVisible.value = false
    return true
  } catch (e) {
    configError.value = e?.msg || t('plugin.operationFailed')
    return false
  } finally {
    configSubmitting.value = false
  }
}

// ==================== 重命名 ====================
const renameModalVisible = ref(false)
const renameTarget = ref(null)
const renameFormRef = ref(null)
const renameForm = reactive({ newName: '' })

const handleRename = (record) => {
  renameTarget.value = record
  renameForm.newName = ''
  renameModalVisible.value = true
}

const handleRenameSubmit = async () => {
  const newName = renameForm.newName.trim()
  if (!newName) {
    Message.warning(t('plugin.renameRequired'))
    return
  }
  if (newName === renameTarget.value.name) {
    Message.warning(t('plugin.sameNameError'))
    return
  }
  try {
    await api.pluginService.updateService(renameTarget.value.name, { new_name: newName })
    Message.success(t('plugin.renameSuccess'))
    // 更新本地引用
    renameTarget.value.name = newName
    updatePluginInList(renameTarget.value)
    // 同步更新选中插件
    if (selectedPlugin.value?.name === renameTarget.value.name) {
      selectedPlugin.value = { ...selectedPlugin.value, name: newName }
    }
    // 刷新列表以同步
    await refreshList()
    renameModalVisible.value = false
  } catch (e) {
    Message.error(e?.msg || t('plugin.operationFailed'))
  }
}

// ==================== 删除 ====================
const handleDelete = async (record) => {
  try {
    await api.pluginService.deleteService(record.name)
    Message.success(t('plugin.deleted'))
    pluginList.value = pluginList.value.filter(p => p.name !== record.name)
    // 如果删除的是当前选中的插件，清空选中状态
    if (selectedPlugin.value?.name === record.name) {
      selectedPlugin.value = null
      currentMethods.value = []
    }
  } catch (e) {
    Message.error(e?.msg || t('plugin.operationFailed'))
  }
}

// ==================== 编辑方法 ====================
const methodModalVisible = ref(false)
const methodTargetPlugin = ref(null)
const methodOriginalName = ref('')
const methodFormRef = ref(null)
const methodForm = reactive({ name: '', risk_level: '' })

const handleEditMethod = (plugin, method) => {
  methodTargetPlugin.value = plugin
  methodOriginalName.value = method.name
  methodForm.name = method.name
  methodForm.risk_level = method.risk_level || ''
  methodModalVisible.value = true
}

const handleMethodSubmit = async () => {
  if (!methodForm.risk_level) {
    Message.warning(t('plugin.riskLevelRequired'))
    return
  }
  try {
    await api.pluginService.updateServiceMethod(
      methodTargetPlugin.value.name,
      methodOriginalName.value,
      methodForm.risk_level
    )
    Message.success(t('plugin.methodUpdated'))
    // 更新当前方法列表中的数据
    const idx = currentMethods.value.findIndex(m => m.name === methodOriginalName.value)
    if (idx >= 0) {
      currentMethods.value[idx] = {
        ...currentMethods.value[idx],
        risk_level: methodForm.risk_level
      }
    }
    updatePluginInList(methodTargetPlugin.value)
    methodModalVisible.value = false
  } catch (e) {
    Message.error(e?.msg || t('plugin.operationFailed'))
  }
}

// ==================== 工具函数 ====================
const updatePluginInList = (plugin) => {
  const idx = pluginList.value.findIndex(p => p.name === plugin.name)
  if (idx >= 0) {
    pluginList.value[idx] = { ...pluginList.value[idx], ...plugin }
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  refreshList()
})
</script>

<style lang="scss" scoped>
.plugin-index-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: $space-3;

    .table-hint {
      color: var(--color-text-3);
      font-size: 13px;
    }
  }

  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 14px;
    color: var(--color-text-1);

    .sub {
      font-weight: 400;
      color: var(--color-text-3);
      font-size: 13px;
      margin-left: 4px;
    }
  }

  .plugin-actions {
    margin-bottom: 12px;
  }

  .methods-wrapper {
    position: relative;

    &.is-disabled {
      .disabled-mask {
        display: flex;
      }
    }

    .disabled-mask {
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.7);
      z-index: 10;
      align-items: center;
      justify-content: center;
      border-radius: 4px;

      span {
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text-3);
        background: var(--color-fill-2);
        padding: 8px 20px;
        border-radius: 4px;
      }
    }
  }

  .config-error {
    margin-top: 8px;
  }

  // ---------- 插件配置弹窗 ----------
  .config-alert {
    margin-bottom: $space-4;

    .alert-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: $space-3;
    }
  }

  .section-title {
    margin: 0 0 $space-3;
    padding-left: $space-2;
    border-left: 3px solid rgb(var(--primary-6));
    font-weight: 600;
    font-size: 14px;
    color: var(--color-text-1);
  }

  .field-label {
    display: inline-flex;
    align-items: center;
    gap: $space-1;

    .required-mark {
      color: rgb(var(--danger-6));
    }
  }

  .form-hint {
    margin-top: 4px;
    color: var(--color-text-3);
    font-size: $font-size-xs;
    line-height: 1.5;
  }

  .mono-input {
    font-family: 'Consolas', 'Monaco', monospace;

    :deep(textarea) {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
    }
  }

  // 密钥类字段：只显示状态与占位符，不回显真实值
  .secret-field {
    .secret-row {
      display: flex;
      align-items: center;
      gap: $space-2;
      margin-bottom: $space-2;
    }

    .secret-placeholder {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      color: var(--color-text-2);
    }

    .secret-badge {
      color: var(--color-text-3);
      font-size: $font-size-xs;
    }
  }
}
</style>
