<template>
  <div class="pii-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-tabs v-model:active-key="activeTab" type="rounded">
        <!-- ① 全局设置 -->
        <a-tab-pane key="global" :title="t('piiSettings.globalTitle')">
          <a-alert type="info" style="margin-bottom: 16px">{{ t('piiSettings.conceptHint') }}</a-alert>

          <a-spin :loading="loading" style="display: block; width: 100%">
            <a-form :model="form" layout="vertical">
              <a-form-item :label="t('piiSettings.globalEnabled')">
                <a-switch v-model="form.global_enabled" @change="handleGlobalEnabledChange" />
                <span class="form-hint">{{ t('piiSettings.globalEnabledHint') }}</span>
              </a-form-item>

              <a-form-item :label="t('piiSettings.strongOnly')">
                <a-switch v-model="form.strong_only" />
                <span class="form-hint">{{ t('piiSettings.strongOnlyHint') }}</span>
              </a-form-item>

              <a-form-item :label="t('piiSettings.enabledTypes')">
                <a-checkbox-group v-model="form.enabled_types" :options="piiTypeOptions" />
                <span class="form-hint">{{ t('piiSettings.enabledTypesHint') }}</span>
                <span class="form-hint">{{ t('piiSettings.enabledTypesExtra') }}</span>
              </a-form-item>

              <a-form-item :label="t('piiSettings.blockTypes')">
                <a-checkbox-group v-model="form.block_types" :options="piiTypeOptions" />
                <span class="form-hint hint-danger">{{ t('piiSettings.blockTypesHint') }}</span>
              </a-form-item>

              <a-form-item :label="t('piiSettings.rawOutbound')">
                <a-switch v-model="form.raw_outbound_enabled" />
                <span class="form-hint">{{ t('piiSettings.rawOutboundHint') }}</span>
              </a-form-item>

              <a-form-item :label="t('piiSettings.customTypes')">
                <div class="custom-types">
                  <div v-for="(item, idx) in form.custom_types" :key="idx" class="custom-row">
                    <a-input
                      v-model="item.type_id"
                      :placeholder="t('piiSettings.typeIdPlaceholder')"
                      allow-clear
                    />
                    <a-input
                      v-model="item.pattern"
                      :placeholder="t('piiSettings.patternPlaceholder')"
                      allow-clear
                    />
                    <a-button type="text" status="danger" @click="removeCustom(idx)">
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </div>
                  <a-button type="dashed" long @click="addCustom">
                    <template #icon><icon-plus /></template>
                    {{ t('piiSettings.addCustom') }}
                  </a-button>
                </div>
                <span class="form-hint">{{ t('piiSettings.customTypesHint') }}</span>
              </a-form-item>

              <!-- 高级：打码保留位数（留空 = 按类型内置） -->
              <a-collapse :bordered="false" class="advanced-collapse">
                <a-collapse-item :header="t('piiSettings.advancedMaskKeep')" key="mask_keep">
                  <div class="mask-keep-grid">
                    <div v-for="tp in maskKeepTypes" :key="tp.value" class="mask-keep-row">
                      <span class="mask-keep-label">{{ tp.label }}</span>
                      <a-input-number
                        v-model="form.mask_keep[tp.value].first"
                        :placeholder="t('piiSettings.maskKeepFirst')"
                        :min="0"
                        allow-clear
                      />
                      <a-input-number
                        v-model="form.mask_keep[tp.value].last"
                        :placeholder="t('piiSettings.maskKeepLast')"
                        :min="0"
                        allow-clear
                      />
                    </div>
                  </div>
                  <span class="form-hint">{{ t('piiSettings.maskKeepHint') }}</span>
                </a-collapse-item>
              </a-collapse>
            </a-form>

            <div class="form-footer">
              <a-button type="primary" :loading="saving" @click="handleSave">
                {{ t('commonTable.save') }}
              </a-button>
            </div>
          </a-spin>
        </a-tab-pane>

        <!-- ② 例外名单 -->
        <a-tab-pane key="override" :title="t('piiSettings.exceptionTitle')">
          <a-form :model="searchForm" layout="inline" style="margin-bottom: 16px">
            <a-form-item field="scope_kind" :label="t('piiSettings.scopeKind')">
              <a-select
                v-model="searchForm.scope_kind"
                :placeholder="t('commonTable.all')"
                allow-clear
                style="width: 160px"
              >
                <a-option v-for="s in scopeKindOptions" :key="s.value" :value="s.value">
                  {{ s.label }}
                </a-option>
              </a-select>
            </a-form-item>
            <a-form-item field="enabled" :label="t('commonTable.status')">
              <a-select
                v-model="searchForm.enabled"
                :placeholder="t('commonTable.all')"
                allow-clear
                style="width: 140px"
              >
                <a-option :value="true">{{ t('commonTable.enable') }}</a-option>
                <a-option :value="false">{{ t('commonTable.disabled') }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item field="keyword" :label="t('piiSettings.object')">
              <a-input
                v-model="searchForm.keyword"
                :placeholder="t('piiSettings.keywordPlaceholder')"
                allow-clear
                style="width: 200px"
                @press-enter="handleSearch"
              />
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handleSearch">
                  <template #icon><icon-search /></template>
                  {{ t('commonTable.search') }}
                </a-button>
                <a-button @click="handleReset">
                  <template #icon><icon-refresh /></template>
                  {{ t('commonTable.reset') }}
                </a-button>
              </a-space>
            </a-form-item>
          </a-form>

          <div class="table-toolbar">
            <a-button type="primary" @click="handleAdd">
              <template #icon><icon-plus /></template>
              {{ t('piiSettings.addOverride') }}
            </a-button>
          </div>

          <a-table
            :columns="columns"
            :data="tableData"
            :loading="listLoading"
            :pagination="pagination"
            row-key="id"
            @page-change="handlePageChange"
            @page-size-change="handlePageSizeChange"
          >
            <template #columns>
              <a-table-column :title="t('piiSettings.scopeKind')" :width="110">
                <template #cell="{ record }">
                  <a-tag size="small">{{ scopeKindLabel(record.scope_kind) }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="t('piiSettings.object')" :width="300">
                <template #cell="{ record }">
                  <span>{{ record.scope_label }}</span>
                  <a-tooltip v-if="record.match === false" :content="t('piiSettings.matchMissTip')">
                    <a-tag color="red" size="small" style="margin-left: 6px">
                      {{ t('piiSettings.matchMiss') }}
                    </a-tag>
                  </a-tooltip>
                </template>
              </a-table-column>
              <a-table-column
                :title="t('piiSettings.policySummary')"
                data-index="policy_summary"
                :width="220"
              />
              <a-table-column :title="t('commonTable.status')" :width="90">
                <template #cell="{ record }">
                  <a-switch
                    :model-value="isRowEnabled(record)"
                    :loading="togglingId === record.id"
                    @change="(v) => handleToggleEnabled(record, v)"
                  />
                </template>
              </a-table-column>
              <a-table-column :title="t('piiSettings.remark')" data-index="remark" ellipsis tooltip />
              <a-table-column
                :title="t('piiSettings.updatedBy')"
                data-index="updated_by"
                :width="110"
              />
              <a-table-column
                :title="t('piiSettings.updatedTime')"
                data-index="updated_time"
                :width="170"
              />
              <a-table-column :title="t('commonTable.operation')" :width="160" fixed="right">
                <template #cell="{ record }">
                  <a-space size="mini">
                    <a-tooltip
                      :disabled="record.match !== false"
                      :content="t('piiSettings.matchMissTip')"
                    >
                      <a-button type="text" size="small" @click="handleEdit(record)">
                        <template #icon><icon-edit /></template>
                        {{ t('commonTable.edit') }}
                      </a-button>
                    </a-tooltip>
                    <a-popconfirm
                      :content="t('piiSettings.deleteOverrideConfirm')"
                      position="br"
                      @ok="handleDelete(record)"
                    >
                      <a-button type="text" size="small" status="danger">
                        <template #icon><icon-delete /></template>
                        {{ t('commonTable.delete') }}
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

    <!-- 新增 / 编辑例外 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="overrideForm.id ? t('piiSettings.editOverride') : t('piiSettings.addOverride')"
      :ok-text="t('commonTable.save')"
      :cancel-text="t('commonTable.cancel')"
      width="620px"
      unmount-on-close
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <a-form :model="overrideForm" layout="vertical">
        <!-- 三级点选：停在哪一级就是哪一级的例外 -->
        <template v-if="unresolvedScope">
          <a-form-item :label="t('piiSettings.object')">
            <a-input :model-value="unresolvedScope.scope_label" disabled />
            <span class="form-hint">{{ t('piiSettings.matchMissTip') }}</span>
          </a-form-item>
        </template>
        <template v-else>
          <a-form-item :label="t('piiSettings.categoryLabel')" required>
            <a-select
              v-model="overrideForm.categoryKey"
              :placeholder="t('piiSettings.categoryPlaceholder')"
              allow-search
              @change="handleCategoryChange"
            >
              <a-option v-for="c in categoryOptions" :key="c.scope_key" :value="c.scope_key">
                {{ c.label }}
              </a-option>
            </a-select>
          </a-form-item>

          <a-form-item :label="t('piiSettings.subjectLabel')">
            <a-select
              v-model="overrideForm.subjectKey"
              :placeholder="t('piiSettings.subjectPlaceholder')"
              allow-search
              :disabled="!overrideForm.categoryKey"
              @change="handleSubjectChange"
            >
              <a-option
                v-for="s in subjectOptions"
                :key="s.scope_kind + '/' + s.scope_key"
                :value="s.scope_key"
              >
                {{ s.label }}
              </a-option>
            </a-select>
          </a-form-item>

          <a-form-item v-if="methodOptions.length" :label="t('piiSettings.methodLabel')">
            <a-select
              v-model="overrideForm.methodKey"
              :placeholder="t('piiSettings.methodPlaceholder')"
              allow-search
              :disabled="!overrideForm.subjectKey"
            >
              <a-option
                v-for="m in methodOptions"
                :key="m.scope_kind + '/' + m.scope_key"
                :value="m.scope_key"
              >
                {{ m.label }}
              </a-option>
            </a-select>
          </a-form-item>
        </template>

        <a-divider style="margin: 4px 0 16px" />

        <a-form-item :label="t('piiSettings.modeLabel')">
          <a-select
            v-model="overrideForm.mode"
            :placeholder="t('piiSettings.modeFollowGlobal')"
            allow-clear
          >
            <a-option
              v-for="m in options.modes"
              :key="m.value"
              :value="m.value"
            >
              {{ m.label }}
            </a-option>
          </a-select>
          <span class="form-hint">{{ t('piiSettings.modeHint') }}</span>
        </a-form-item>

        <a-form-item :label="t('piiSettings.directionLabel')">
          <a-checkbox-group v-model="overrideForm.direction" :options="directionOptions" />
          <span class="form-hint">{{ t('piiSettings.directionHint') }}</span>
        </a-form-item>

        <a-form-item :label="t('piiSettings.exemptTypesLabel')">
          <a-checkbox-group v-model="overrideForm.exempt_types" :options="piiTypeOptions" />
          <span class="form-hint hint-danger">{{ t('piiSettings.exemptTypesHint') }}</span>
        </a-form-item>

        <a-form-item :label="t('piiSettings.enabledTypesLabel')">
          <a-checkbox-group v-model="overrideForm.enabled_types" :options="piiTypeOptions" />
          <span class="form-hint">{{ t('piiSettings.enabledTypesLabelHint') }}</span>
        </a-form-item>

        <a-form-item :label="t('piiSettings.remark')">
          <a-input
            v-model="overrideForm.remark"
            :placeholder="t('piiSettings.remarkPlaceholder')"
            allow-clear
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import {
  getPiiSettings,
  updatePiiSettings,
  getPiiOverrideOptions,
  getPiiOverrideList,
  createPiiOverride,
  updatePiiOverride,
  deletePiiOverride
} from '@/api/modules/gisPiiSettings'

const { t } = useI18n()

const columns = []

const activeTab = ref('global')

// ==================== 全局设置 ====================
const loading = ref(false)
const saving = ref(false)

// GET 返回的完整对象：提交时整对象回填，避免漏字段（如 extra_types）被重置
const rawSettings = ref({})

const form = reactive({
  global_enabled: true,
  strong_only: true,
  enabled_types: [],
  block_types: [],
  raw_outbound_enabled: false,
  custom_types: [],
  mask_keep: {}
})

// ==================== 选项（options 接口） ====================
const options = reactive({
  categories: [],
  pii_types: [],
  modes: [],
  directions: []
})

const piiTypeOptions = computed(() =>
  options.pii_types.map((i) => ({ label: i.label, value: i.value }))
)

const maskKeepTypes = computed(() => options.pii_types.filter((i) => i.value !== 'custom'))

const directionOptions = computed(() =>
  options.directions.map((i) => ({ label: i.label, value: i.value }))
)

const scopeKindOptions = computed(() => [
  { value: 'tool_type', label: t('piiSettings.scopeKindToolType') },
  { value: 'tool', label: t('piiSettings.scopeKindTool') },
  { value: 'plugin', label: t('piiSettings.scopeKindPlugin') },
  { value: 'plugin_method', label: t('piiSettings.scopeKindPluginMethod') },
  { value: 'device', label: t('piiSettings.scopeKindDevice') },
  { value: 'device_fun', label: t('piiSettings.scopeKindDeviceFun') }
])

function scopeKindLabel(kind) {
  return scopeKindOptions.value.find((i) => i.value === kind)?.label || kind
}

function ensureMaskKeepKeys() {
  maskKeepTypes.value.forEach((tp) => {
    if (!form.mask_keep[tp.value]) {
      form.mask_keep[tp.value] = { first: undefined, last: undefined }
    }
  })
}

async function loadOptions() {
  try {
    const res = await getPiiOverrideOptions()
    const data = res.data || res || {}
    options.categories = data.categories || []
    options.pii_types = data.pii_types || []
    options.modes = data.modes || []
    options.directions = data.directions || []
    ensureMaskKeepKeys()
  } catch (_) {
    /* request.js 已弹错 */
  }
}

async function loadSettings() {
  loading.value = true
  try {
    const res = await getPiiSettings()
    const data = res.data || res || {}
    rawSettings.value = data

    form.global_enabled = data.global_enabled ?? true
    form.strong_only = data.strong_only ?? true
    form.raw_outbound_enabled = data.raw_outbound_enabled ?? false
    form.block_types = Array.isArray(data.block_types) ? [...data.block_types] : []
    form.enabled_types = Array.isArray(data.enabled_types)
      ? [...data.enabled_types]
      : options.pii_types.filter((i) => i.default_on).map((i) => i.value)
    form.custom_types = Array.isArray(data.custom_types)
      ? data.custom_types.map((i) => ({ type_id: i.type_id ?? '', pattern: i.pattern ?? '' }))
      : []

    // 打码保留位数回填（留空 = 按类型内置）
    ensureMaskKeepKeys()
    Object.keys(data.mask_keep || {}).forEach((key) => {
      if (!form.mask_keep[key]) {
        form.mask_keep[key] = { first: undefined, last: undefined }
      }
      form.mask_keep[key].first = data.mask_keep[key]?.first
      form.mask_keep[key].last = data.mask_keep[key]?.last
    })
  } catch (_) {
    /* request.js 已弹错 */
  } finally {
    loading.value = false
  }
}

function handleGlobalEnabledChange(value) {
  if (value === false) {
    Modal.confirm({
      title: t('piiSettings.globalEnabled'),
      content: t('piiSettings.confirmDisableGlobal'),
      okText: t('commonTable.confirm'),
      cancelText: t('commonTable.cancel'),
      okButtonProps: { status: 'danger' },
      onOk: () => { form.global_enabled = false },
      onCancel: () => { form.global_enabled = true }
    })
  }
}

function addCustom() {
  form.custom_types.push({ type_id: '', pattern: '' })
}

function removeCustom(idx) {
  form.custom_types.splice(idx, 1)
}

function buildMaskKeep() {
  const result = {}
  Object.keys(form.mask_keep).forEach((key) => {
    const v = form.mask_keep[key] || {}
    const first = v.first ?? undefined
    const last = v.last ?? undefined
    if (first === undefined && last === undefined) return
    result[key] = {}
    if (first !== undefined) result[key].first = first
    if (last !== undefined) result[key].last = last
  })
  return result
}

async function handleSave() {
  // 只提交完整行；标识与匹配串只填其一的，提示后拦截
  const halfFilled = form.custom_types.some((i) => {
    const typeId = (i.type_id || '').trim()
    const pattern = (i.pattern || '').trim()
    return (typeId && !pattern) || (!typeId && pattern)
  })
  if (halfFilled) {
    Message.warning(t('piiSettings.customTypesInvalid'))
    return
  }
  const customTypes = form.custom_types.filter(
    (i) => (i.type_id || '').trim() && (i.pattern || '').trim()
  )

  saving.value = true
  try {
    // 整对象回填 + 覆盖本次可编辑字段（extra_types 等原值透传）
    const res = await updatePiiSettings({
      ...rawSettings.value,
      global_enabled: form.global_enabled,
      strong_only: form.strong_only,
      enabled_types: [...form.enabled_types],
      block_types: [...form.block_types],
      raw_outbound_enabled: form.raw_outbound_enabled,
      custom_types: customTypes,
      mask_keep: buildMaskKeep()
    })
    Message.success((res?.msg || t('piiSettings.saveSuccess')) + t('piiSettings.auditTip'))
    await loadSettings()
  } catch (_) {
    /* request.js 已弹错 */
  } finally {
    saving.value = false
  }
}

// ==================== 例外名单：列表 ====================
const listLoading = ref(false)
const tableData = ref([])
const togglingId = ref(null)

const searchForm = reactive({
  scope_kind: undefined,
  enabled: undefined,
  keyword: ''
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})

async function fetchList() {
  listLoading.value = true
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize
    }
    if (searchForm.scope_kind) params.scope_kind = searchForm.scope_kind
    if (searchForm.enabled !== undefined) params.enabled = searchForm.enabled
    if (searchForm.keyword) params.keyword = searchForm.keyword

    const res = await getPiiOverrideList(params)
    const data = res.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (_) {
    /* request.js 已弹错 */
  } finally {
    listLoading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  searchForm.scope_kind = undefined
  searchForm.enabled = undefined
  searchForm.keyword = ''
  pagination.current = 1
  fetchList()
}

function handlePageChange(page) {
  pagination.current = page
  fetchList()
}

function handlePageSizeChange(pageSize) {
  pagination.pageSize = pageSize
  pagination.current = 1
  fetchList()
}

// 列表行的 enabled 后端可能返回布尔或 0/1，统一判断
function isRowEnabled(record) {
  return record.enabled === true || record.enabled === 1
}

async function handleToggleEnabled(record, value) {
  togglingId.value = record.id
  try {
    // 后端 enabled 为布尔类型
    await updatePiiOverride(record.id, { enabled: !!value })
    record.enabled = !!value
    Message.success(t('piiSettings.overrideToggleSuccess'))
  } catch (_) {
    /* request.js 已弹错 */
  } finally {
    togglingId.value = null
  }
}

async function handleDelete(record) {
  try {
    await deletePiiOverride(record.id)
    Message.success(t('piiSettings.overrideDeleteSuccess') + t('piiSettings.auditTip'))
    if (tableData.value.length === 1 && pagination.current > 1) {
      pagination.current -= 1
    }
    fetchList()
  } catch (_) {
    /* request.js 已弹错 */
  }
}

// ==================== 例外名单：新增 / 编辑 ====================
const modalVisible = ref(false)
const unresolvedScope = ref(null)

// 例外表单（与全局设置的 form 分开，避免 enabled_types 等字段语义冲突）
const overrideForm = reactive({
  id: null,
  categoryKey: undefined,
  subjectKey: undefined,
  methodKey: undefined,
  mode: undefined,
  direction: [],
  exempt_types: [],
  enabled_types: [],
  remark: ''
})

const categoryOptions = computed(() => options.categories)
const currentCategory = computed(() =>
  options.categories.find((c) => c.scope_key === overrideForm.categoryKey)
)
const subjectOptions = computed(() => currentCategory.value?.subjects || [])
const currentSubject = computed(() =>
  subjectOptions.value.find((s) => s.scope_key === overrideForm.subjectKey)
)
const methodOptions = computed(() => currentSubject.value?.methods || [])

function handleCategoryChange() {
  overrideForm.subjectKey = undefined
  overrideForm.methodKey = undefined
}

function handleSubjectChange() {
  overrideForm.methodKey = undefined
}

function resetOverrideForm() {
  overrideForm.id = null
  overrideForm.categoryKey = undefined
  overrideForm.subjectKey = undefined
  overrideForm.methodKey = undefined
  overrideForm.mode = undefined
  overrideForm.direction = []
  overrideForm.exempt_types = []
  overrideForm.enabled_types = []
  overrideForm.remark = ''
  unresolvedScope.value = null
}

function handleAdd() {
  resetOverrideForm()
  modalVisible.value = true
  // 每次打开新增弹窗重新取一次，保证插件与设备清单最新
  loadOptions()
}

async function handleEdit(record) {
  resetOverrideForm()
  overrideForm.id = record.id
  overrideForm.remark = record.remark || ''

  // 保证插件 / 设备清单最新，再按 scope_kind + scope_key 在选项中定位
  await loadOptions()
  const found = findScopePath(record.scope_kind, record.scope_key)
  if (found) {
    overrideForm.categoryKey = found.category.scope_key
    overrideForm.subjectKey = found.subject?.scope_key
    overrideForm.methodKey = found.method?.scope_key
  } else {
    // 节点已不存在（match=false）：保留原始 scope，只允许改策略
    unresolvedScope.value = {
      scope_kind: record.scope_kind,
      scope_key: record.scope_key,
      scope_label: record.scope_label
    }
  }

  // policy_json 里没有的键 = 跟随全局，控件显示为空
  const policy = record.policy_json || {}
  overrideForm.mode = policy.mode || undefined
  overrideForm.direction = Array.isArray(policy.direction) ? [...policy.direction] : []
  overrideForm.exempt_types = Array.isArray(policy.exempt_types) ? [...policy.exempt_types] : []
  overrideForm.enabled_types = Array.isArray(policy.enabled_types) ? [...policy.enabled_types] : []

  modalVisible.value = true
}

function findScopePath(scopeKind, scopeKey) {
  for (const category of options.categories) {
    if (category.scope_kind === scopeKind && category.scope_key === scopeKey) {
      return { category, subject: null, method: null }
    }
    for (const subject of category.subjects || []) {
      if (subject.scope_kind === scopeKind && subject.scope_key === scopeKey) {
        return { category, subject, method: null }
      }
      for (const method of subject.methods || []) {
        if (method.scope_kind === scopeKind && method.scope_key === scopeKey) {
          return { category, subject, method }
        }
      }
    }
  }
  return null
}

// 取最深一级所选节点的 scope_kind + scope_key（直接透传，不拼字符串）
function resolveScope() {
  if (overrideForm.methodKey) {
    const m = methodOptions.value.find((i) => i.scope_key === overrideForm.methodKey)
    if (m) return { scope_kind: m.scope_kind, scope_key: m.scope_key }
  }
  if (overrideForm.subjectKey) {
    const s = subjectOptions.value.find((i) => i.scope_key === overrideForm.subjectKey)
    if (s) return { scope_kind: s.scope_kind, scope_key: s.scope_key }
  }
  if (overrideForm.categoryKey) {
    const c = categoryOptions.value.find((i) => i.scope_key === overrideForm.categoryKey)
    if (c) return { scope_kind: c.scope_kind, scope_key: c.scope_key }
  }
  return null
}

function buildPolicyJson() {
  const policy = {}
  if (overrideForm.mode) policy.mode = overrideForm.mode
  if (overrideForm.direction.length) policy.direction = [...overrideForm.direction]
  // 空数组 = 显式收窄（检测不到任何类型），与"未设置/跟随全局"语义不同
  if (overrideForm.exempt_types.length) policy.exempt_types = [...overrideForm.exempt_types]
  if (overrideForm.enabled_types.length) policy.enabled_types = [...overrideForm.enabled_types]
  return policy
}

function isConflictError(err) {
  const code = err?.code ?? err?.response?.data?.code ?? err?.response?.status
  return code === 409
}

// 冲突时按 (scope_kind, scope_key) 找到已存在的例外行，改走 PUT
async function findOverrideId(scope) {
  const res = await getPiiOverrideList({
    page: 1,
    page_size: 500,
    scope_kind: scope.scope_kind
  })
  const rows = (res.data || res || {}).rows || []
  return rows.find((r) => r.scope_kind === scope.scope_kind && r.scope_key === scope.scope_key)?.id
}

function confirmWeakPolicy(policy) {
  const isWeak = policy.mode === 'off' || (policy.exempt_types || []).length > 0
  if (!isWeak) return Promise.resolve(true)
  return new Promise((resolve) => {
    Modal.confirm({
      title: overrideForm.id ? t('piiSettings.editOverride') : t('piiSettings.addOverride'),
      content: t('piiSettings.confirmDisableGlobal'),
      okText: t('commonTable.confirm'),
      cancelText: t('commonTable.cancel'),
      okButtonProps: { status: 'danger' },
      onOk: () => resolve(true),
      onCancel: () => resolve(false)
    })
  })
}

async function handleSubmit() {
  const scope = unresolvedScope.value
    ? { scope_kind: unresolvedScope.value.scope_kind, scope_key: unresolvedScope.value.scope_key }
    : resolveScope()

  if (!scope) {
    Message.warning(t('piiSettings.scopeRequired'))
    return
  }

  const policy_json = buildPolicyJson()
  const payload = {
    scope_kind: scope.scope_kind,
    scope_key: scope.scope_key,
    policy_json,
    remark: overrideForm.remark
  }

  // 放宽类操作（off / 原文放行）二次确认
  const ok = await confirmWeakPolicy(policy_json)
  if (!ok) return

  try {
    if (overrideForm.id) {
      await updatePiiOverride(overrideForm.id, payload)
      Message.success(t('piiSettings.overrideUpdateSuccess') + t('piiSettings.auditTip'))
    } else {
      await createPiiOverride(payload)
      Message.success(t('piiSettings.overrideCreateSuccess') + t('piiSettings.auditTip'))
    }
    modalVisible.value = false
    fetchList()
  } catch (err) {
    if (!isConflictError(err)) return

    // 重复配置：提示是否覆盖，确认后改用 PUT 更新
    Modal.confirm({
      title: t('piiSettings.addOverride'),
      content: t('piiSettings.dupOverrideConfirm'),
      okText: t('commonTable.confirm'),
      cancelText: t('commonTable.cancel'),
      onOk: async () => {
        const id = await findOverrideId(scope)
        if (!id) {
          Message.error(err?.msg || err?.response?.data?.msg || '')
          return
        }
        await updatePiiOverride(id, payload)
        Message.success(t('piiSettings.overrideUpdateSuccess') + t('piiSettings.auditTip'))
        modalVisible.value = false
        fetchList()
      }
    })
  }
}

onMounted(async () => {
  await loadOptions()
  loadSettings()
  fetchList()
})
</script>

<style lang="scss" scoped>
.form-hint {
  display: block;
  margin-top: $space-1;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.hint-danger {
  color: var(--color-danger-6);
}

.custom-types {
  width: 100%;
  max-width: 720px;
}

.custom-row {
  display: grid;
  grid-template-columns: 200px 1fr 40px;
  gap: $space-2;
  margin-bottom: $space-2;
}

.advanced-collapse {
  width: 100%;
  max-width: 720px;
  margin-bottom: $space-4;

  :deep(.arco-collapse-item-content) {
    padding-left: 0;
    background: transparent;
  }
}

.mask-keep-grid {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.mask-keep-row {
  display: grid;
  grid-template-columns: 120px 1fr 1fr;
  gap: $space-2;
  align-items: center;
}

.mask-keep-label {
  color: $color-text-secondary;
  font-size: $font-size-sm;
}

.form-footer {
  margin-top: $space-6;
  padding-top: $space-4;
  border-top: 1px solid $color-border;
}

.table-toolbar {
  margin-bottom: $space-4;
  display: flex;
  justify-content: flex-end;
}
</style>
