<template>
  <!-- 工作台 › 部门工作流：部门负责人自助维护本部门工作流
       口径：scope 固定 dept、manageable_only=true，部门范围由后端 dept_options 下发。
       编辑即回草稿，需重新发布才对智能体生效。 -->
  <div class="dept-workflow-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="page-head">
        <div v-if="deptOptions.length > 1" class="dept-picker">
          <span class="dept-label">{{ t('deptWorkflow.dept') }}</span>
          <a-select
            v-model="selectedDept"
            :placeholder="t('deptWorkflow.selectDept')"
            allow-search
            style="width: 220px"
            @change="handleDeptChange"
          >
            <a-option v-for="d in deptOptions" :key="d.dept_id" :value="String(d.dept_id)">
              {{ d.dept_name }}
            </a-option>
          </a-select>
        </div>
        <div v-else-if="selectedDept" class="dept-current">
          {{ t('deptWorkflow.dept') }}：{{ selectedDeptName }}
        </div>
        <div class="head-actions">
          <a-button :loading="loading" @click="loadList">
            <template #icon><icon-refresh /></template>
            {{ t('commonTable.refresh') }}
          </a-button>
          <a-button type="primary" :disabled="!selectedDept" @click="openCreate">
            <template #icon><icon-plus /></template>
            {{ t('workflow.create') }}
          </a-button>
        </div>
      </div>

      <!-- 无可管理部门：不继续请求列表 -->
      <a-alert v-if="!deptLoading && !deptOptions.length" type="warning" :show-icon="true">
        {{ t('deptWorkflow.noManageableDept') }}
      </a-alert>

      <template v-else>
        <a-tabs v-model:active-key="tabKey" @change="handleSearch">
          <a-tab-pane key="all" :title="t('workflow.statusAll')" />
          <a-tab-pane key="draft" :title="t('workflow.statusDraft')" />
          <a-tab-pane key="published" :title="t('workflow.statusPublished')" />
          <a-tab-pane key="disabled" :title="t('workflow.statusDisabled')" />
        </a-tabs>

        <div class="table-toolbar">
          <a-space size="small" wrap>
            <a-input
              v-model="filter.keyword"
              :placeholder="t('workflow.keywordPlaceholder')"
              allow-clear
              style="width: 220px"
              @press-enter="handleSearch"
            />
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ t('commonTable.search') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ t('commonTable.reset') }}
            </a-button>
          </a-space>
        </div>

        <a-table
          :data="list"
          :loading="loading"
          :pagination="pagination"
          row-key="code"
          :bordered="false"
          :scroll="{ x: '100%' }"
          size="small"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        >
          <template #columns>
            <a-table-column :title="t('workflow.colCode')" data-index="code" :width="150" fixed="left" />
            <a-table-column :title="t('workflow.colName')" data-index="name" :width="160" />
            <a-table-column :title="t('workflow.colStatus')" :width="100">
              <template #cell="{ record }">
                <a-tag :color="statusColor(record.status)" size="small">{{ statusText(record.status) }}</a-tag>
              </template>
            </a-table-column>
            <a-table-column :title="t('workflow.colVersion')" :width="100">
              <template #cell="{ record }">{{ record.current_version ?? '-' }}</template>
            </a-table-column>
            <a-table-column :title="t('workflow.colStageCount')" :width="90">
              <template #cell="{ record }">{{ record.stage_count ?? '-' }}</template>
            </a-table-column>
            <a-table-column :title="t('workflow.colScope')" :width="160">
              <template #cell="{ record }">
                <a-tag color="arcoblue" size="small">{{ scopeText(record.scope) }}</a-tag>
                <span class="sub-hint">{{ deptName(record.scope_ref) }}</span>
              </template>
            </a-table-column>
            <a-table-column :title="t('commonTable.operation')" :width="230" fixed="right">
              <template #cell="{ record }">
                <a-button v-if="record.can_manage" type="text" size="mini" @click="openEdit(record)">
                  {{ t('workflow.edit') }}
                </a-button>
                <a-button
                  v-if="record.can_manage && record.status !== 'published'"
                  type="text"
                  size="mini"
                  @click="handlePublish(record)"
                >
                  {{ t('workflow.publish') }}
                </a-button>
                <a-button
                  v-if="record.can_manage && record.status === 'published'"
                  type="text"
                  size="mini"
                  status="warning"
                  @click="handleDisable(record)"
                >
                  {{ t('workflow.disable') }}
                </a-button>
                <a-button
                  v-if="record.can_manage"
                  type="text"
                  size="mini"
                  status="danger"
                  @click="handleDelete(record)"
                >
                  {{ t('workflow.delete') }}
                </a-button>
              </template>
            </a-table-column>
          </template>
          <template #empty>
            <a-empty
              :description="selectedDept ? t('workflow.emptyList') : t('deptWorkflow.selectDeptFirst')"
            />
          </template>
        </a-table>
      </template>
    </a-card>

    <!-- 新建 / 编辑：基础信息 + 节点编排 -->
    <a-modal
      v-model:visible="formVisible"
      :title="isEdit ? t('workflow.editTitle', { name: form.name || form.code }) : t('workflow.createTitle')"
      width="1080px"
      :ok-loading="saving"
      :ok-text="t('commonTable.confirm')"
      unmount-on-close
      @before-ok="handleSubmit"
    >
      <a-form :model="form" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="t('workflow.formCode')" required :help="t('workflow.codeRule')">
              <a-input
                ref="codeInputRef"
                v-model="form.code"
                :disabled="isEdit"
                :placeholder="t('workflow.codePlaceholder')"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="t('workflow.formName')" required>
              <a-input v-model="form.name" :placeholder="t('workflow.namePlaceholder')" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="t('workflow.formPrefix')">
              <a-input
                v-model="form.prefix"
                :disabled="form.biz_no_source === 'external'"
                :placeholder="t('workflow.prefixPlaceholder')"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="t('workflow.formDescription')">
              <a-input v-model="form.description" :placeholder="t('workflow.descPlaceholder')" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="t('workflow.formTriggerHint')" :help="t('workflow.triggerHintRule')">
              <a-input
                v-model="form.trigger_hint"
                :max-length="255"
                :placeholder="t('workflow.triggerHintPlaceholder')"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item :label="t('deptWorkflow.bizNoSource')" required>
              <a-radio-group v-model="form.biz_no_source" type="button">
                <a-radio value="system">{{ t('deptWorkflow.bizNoSourceSystem') }}</a-radio>
                <a-radio value="external">{{ t('deptWorkflow.bizNoSourceExternal') }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="t('deptWorkflow.enforceMode')" required>
              <a-radio-group v-model="form.enforce_mode" type="button">
                <a-radio value="shadow">{{ t('deptWorkflow.enforceShadow') }}</a-radio>
                <a-radio value="enforce">{{ t('deptWorkflow.enforceEnforce') }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="t('workflow.formScope')">
              <a-input :model-value="selectedDeptName" disabled />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">{{ t('workflow.formStages') }}</a-divider>

        <div class="stage-list">
          <a-empty v-if="!form.stages.length" :description="t('deptWorkflow.stageEmpty')" />
          <div v-for="(stage, index) in form.stages" :key="stage._uid" class="stage-card">
            <div class="stage-head">
              <span class="stage-seq">{{ index + 1 }}</span>
              <span class="stage-title">{{ stage.name || t('workflow.untitledNode') }}</span>
              <a-button size="mini" status="danger" @click="removeStage(index)">
                <template #icon><icon-delete /></template>
              </a-button>
            </div>
            <a-row :gutter="12">
              <a-col :span="8">
                <a-form-item :label="t('workflow.stageCode')" required>
                  <a-input v-model="stage.stage" :placeholder="t('deptWorkflow.stageCodePlaceholder')" allow-clear />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item :label="t('workflow.stageName')" required>
                  <a-input v-model="stage.name" allow-clear />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item :label="t('workflow.manualMinutes')" :help="t('workflow.manualMinutesHint')">
                  <a-input-number
                    v-model="stage.manual_minutes"
                    :min="0"
                    :precision="0"
                    allow-clear
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item :label="t('workflow.stageNote')">
              <a-textarea
                v-model="stage.note"
                :placeholder="t('workflow.stageNotePlaceholder')"
                :max-length="512"
                show-word-limit
                :auto-size="{ minRows: 2, maxRows: 4 }"
                allow-clear
              />
            </a-form-item>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item :label="t('deptWorkflow.stageMethods')">
                  <a-select
                    v-model="stage.methods"
                    mode="multiple"
                    allow-create
                    allow-search
                    :placeholder="t('deptWorkflow.stageMethodsPlaceholder')"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item :label="t('deptWorkflow.stageTools')">
                  <a-select
                    v-model="stage.tools"
                    mode="multiple"
                    allow-search
                    :fallback-option="toolFallback"
                    :placeholder="t('deptWorkflow.stageToolsPlaceholder')"
                  >
                    <a-option v-for="tool in systemTools" :key="tool.value" :value="tool.value">
                      {{ tool.label || tool.value }}
                    </a-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
          </div>
          <a-button type="dashed" long @click="addStage">
            <template #icon><icon-plus /></template>
            {{ t('deptWorkflow.addStage') }}
          </a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'

const { t } = useI18n()

// ---------- 枚举展示 ----------
const STATUS_MAP = {
  draft: { key: 'statusDraft', color: 'gray' },
  published: { key: 'statusPublished', color: 'green' },
  disabled: { key: 'statusDisabled', color: 'red' }
}
const SCOPE_MAP = {
  org: { key: 'scopeOrg', color: 'cyan' },
  dept: { key: 'scopeDept', color: 'arcoblue' },
  user: { key: 'scopeUser', color: 'purple' }
}

function statusText(s) {
  return STATUS_MAP[s] ? t(`workflow.${STATUS_MAP[s].key}`) : s || '-'
}
function statusColor(s) {
  return STATUS_MAP[s]?.color || 'gray'
}
function scopeText(s) {
  return SCOPE_MAP[s] ? t(`workflow.${SCOPE_MAP[s].key}`) : s || '-'
}

// ---------- 部门 ----------
const deptOptions = ref([])
const deptLoading = ref(false)
const selectedDept = ref('')

const selectedDeptName = computed(() => deptName(selectedDept.value))
function deptName(deptId) {
  if (deptId === undefined || deptId === null || deptId === '') return '-'
  const d = deptOptions.value.find(x => String(x.dept_id) === String(deptId))
  return d?.dept_name || String(deptId)
}

async function loadDeptOptions() {
  deptLoading.value = true
  try {
    const res = await api.gisWorkflow.getDeptOptions()
    const data = res?.data ?? res
    deptOptions.value = Array.isArray(data) ? data.filter(d => d && d.dept_id !== undefined) : []
    // 只有一个部门时自动选中并加载列表；多个部门必须由用户选择
    if (deptOptions.value.length === 1) {
      selectedDept.value = String(deptOptions.value[0].dept_id)
      loadList()
    }
  } catch (_) {
    deptOptions.value = []
  } finally {
    deptLoading.value = false
  }
}

function handleDeptChange() {
  pagination.current = 1
  loadList()
}

// ---------- 列表 ----------
const tabKey = ref('all')
const filter = reactive({ keyword: '' })
const loading = ref(false)
const list = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})

async function loadList() {
  if (!selectedDept.value) {
    list.value = []
    pagination.total = 0
    return
  }
  loading.value = true
  try {
    const params = {
      scope: 'dept',
      manageable_only: true,
      scope_ref: selectedDept.value,
      page: pagination.current,
      page_size: pagination.pageSize
    }
    if (filter.keyword) params.keyword = filter.keyword
    if (tabKey.value !== 'all') params.status = tabKey.value
    const res = await api.gisWorkflow.getWorkflowList(params)
    const data = res?.data || res || {}
    list.value = data.rows || []
    pagination.total = data.total || 0
  } catch (_) {
    list.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  loadList()
}
function handleReset() {
  filter.keyword = ''
  tabKey.value = 'all'
  pagination.current = 1
  loadList()
}
function handlePageChange(page) {
  pagination.current = page
  loadList()
}
function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.current = 1
  loadList()
}

// ---------- 系统工具（节点 tools 可选项） ----------
const systemTools = ref([])
const toolsLoading = ref(false)

async function loadSystemTools() {
  if (toolsLoading.value) return
  toolsLoading.value = true
  try {
    const res = await api.gisWorkflow.getSystemTools()
    const data = res?.data ?? res
    systemTools.value = Array.isArray(data) ? data.filter(x => x && x.value) : []
  } catch (_) {
    systemTools.value = []
  } finally {
    toolsLoading.value = false
  }
}

// 历史绑定值可能已不在清单里，仍原样展示，避免编辑时丢数据
function toolFallback(value) {
  return { value, label: value }
}

// ---------- 表单 ----------
const formVisible = ref(false)
const saving = ref(false)
const isEdit = ref(false)
const codeInputRef = ref(null)
let uidSeq = 0

const form = reactive({
  code: '',
  name: '',
  description: '',
  trigger_hint: '',
  prefix: '',
  biz_no_source: 'system',
  enforce_mode: 'shadow',
  stages: []
})

function newStage(fields = {}) {
  return {
    _uid: ++uidSeq,
    stage: '',
    name: '',
    manual_minutes: null,
    note: '',
    methods: [],
    tools: [],
    ...fields
  }
}

function addStage() {
  form.stages.push(newStage())
}

function removeStage(index) {
  form.stages.splice(index, 1)
}

function resetForm() {
  form.code = ''
  form.name = ''
  form.description = ''
  form.trigger_hint = ''
  form.prefix = ''
  form.biz_no_source = 'system'
  form.enforce_mode = 'shadow'
  form.stages = []
}

function openCreate() {
  if (!selectedDept.value) {
    Message.warning(t('deptWorkflow.deptRequired'))
    return
  }
  isEdit.value = false
  resetForm()
  formVisible.value = true
  loadSystemTools()
}

async function openEdit(record) {
  isEdit.value = true
  resetForm()
  formVisible.value = true
  loadSystemTools()
  try {
    const res = await api.gisWorkflow.getWorkflowDetail(record.code)
    const data = res?.data || res || {}
    const wf = data.workflow || {}
    // 详情里的编码字段是 biz_scene
    form.code = wf.biz_scene ?? record.code
    form.name = wf.name ?? record.name ?? ''
    form.description = wf.description ?? ''
    form.trigger_hint = wf.trigger_hint ?? ''
    form.prefix = wf.prefix ?? ''
    form.biz_no_source = wf.biz_no_source || 'system'
    form.enforce_mode = wf.enforce_mode || 'shadow'

    const bindings = data.bindings || []
    const stages = (data.stages || []).slice().sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    // bindings 按 match_type 分流：plugin_method → methods，tool → tools
    form.stages = stages.map(s =>
      newStage({
        stage: s.stage,
        name: s.name || '',
        manual_minutes: s.manual_minutes ?? null,
        note: s.note ?? '',
        methods: bindings
          .filter(b => b.stage === s.stage && b.match_type === 'plugin_method')
          .map(b => b.match_value),
        tools: bindings
          .filter(b => b.stage === s.stage && b.match_type === 'tool')
          .map(b => b.match_value)
      })
    )
  } catch (_) {
    formVisible.value = false
  }
}

function buildPayload() {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description?.trim() || null,
    trigger_hint: form.trigger_hint?.trim() || null,
    biz_no_source: form.biz_no_source,
    // 沿用外部单号时不传前缀
    prefix: form.biz_no_source === 'system' ? form.prefix?.trim() || null : null,
    enforce_mode: form.enforce_mode,
    scope: 'dept',
    scope_ref: selectedDept.value,
    // 覆盖式更新：stages 必须完整提交，顺序写进 seq
    stages: form.stages.map((s, i) => ({
      stage: s.stage.trim(),
      seq: i + 1,
      name: s.name.trim(),
      manual_minutes:
        s.manual_minutes === '' || s.manual_minutes === null || s.manual_minutes === undefined
          ? null
          : Number(s.manual_minutes),
      note: s.note?.trim() || null,
      methods: s.methods || [],
      tools: s.tools || []
    }))
  }
}

function validate() {
  if (!selectedDept.value) return t('deptWorkflow.deptRequired')
  if (!form.code.trim()) return t('workflow.codeRequired')
  if (!form.name.trim()) return t('workflow.nameRequired')
  if (!form.stages.length) return t('workflow.noStages')
  const seen = new Set()
  for (const s of form.stages) {
    if (!s.stage.trim() || !s.name.trim()) return t('workflow.stageIncomplete')
    if (seen.has(s.stage.trim())) return t('deptWorkflow.duplicateStage', { stage: s.stage.trim() })
    seen.add(s.stage.trim())
  }
  return ''
}

async function handleSubmit(done) {
  const err = validate()
  if (err) {
    Message.warning(err)
    done(false)
    return
  }
  saving.value = true
  try {
    const payload = buildPayload()
    if (isEdit.value) {
      await api.gisWorkflow.updateWorkflow(payload.code, payload)
      // 编辑即回草稿：需重新发布才生效
      Message.warning(t('workflow.saveDraftTip'))
    } else {
      const res = await api.gisWorkflow.createWorkflow(payload)
      const data = res?.data || res || {}
      Message.success(data.revived ? t('workflow.revivedHint') : t('workflow.createOk'))
    }
    done(true)
    loadList()
  } catch (e) {
    // 编码重复时把焦点移回编码输入框
    const msg = e?.msg || e?.message || ''
    if (!isEdit.value && /重复|已存在|exist|duplicate/i.test(msg)) {
      codeInputRef.value?.focus?.()
    }
    done(false)
  } finally {
    saving.value = false
  }
}

// ---------- 发布 / 停用 / 删除 ----------
function handlePublish(record) {
  Modal.confirm({
    title: t('workflow.publishConfirmTitle'),
    content: t('workflow.publishConfirm'),
    okText: t('workflow.publish'),
    onOk: async () => {
      await api.gisWorkflow.publishWorkflow(record.code)
      Message.success(t('workflow.publishOk'))
      loadList()
    }
  })
}

function handleDisable(record) {
  Modal.confirm({
    title: t('workflow.disable'),
    content: t('workflow.disableConfirm'),
    okText: t('workflow.disable'),
    onOk: async () => {
      await api.gisWorkflow.disableWorkflow(record.code)
      Message.success(t('workflow.disableOk'))
      loadList()
    }
  })
}

function handleDelete(record) {
  Modal.confirm({
    title: t('workflow.delete'),
    content: t('workflow.deleteConfirm'),
    okText: t('workflow.delete'),
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      await api.gisWorkflow.deleteWorkflow(record.code)
      Message.success(t('workflow.deleteOk'))
      loadList()
    }
  })
}

// ---------- 初始化 ----------
onMounted(() => {
  loadDeptOptions()
})
</script>

<style lang="scss" scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  flex-wrap: wrap;
  margin-bottom: $space-3;
}

.dept-picker {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.dept-label {
  color: $color-text-secondary;
  font-size: $font-size-sm;
}

.dept-current {
  color: $color-text-secondary;
  font-size: $font-size-sm;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-left: auto;
}

.table-toolbar {
  margin-bottom: $space-3;
}

.sub-hint {
  margin-left: 6px;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.stage-list {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.stage-card {
  padding: $space-3;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-bg-muted;
}

.stage-head {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-2;
}

.stage-seq {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(var(--primary-6));
  color: var(--on-primary);
  font-size: $font-size-xs;
  flex: none;
}

.stage-title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: $color-text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
