<template>
  <div class="workflow-page">
    <!-- 说明区块（可折叠） -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="help-head" @click="helpOpen = !helpOpen">
        <icon-down v-if="helpOpen" />
        <icon-right v-else />
        <span class="help-title">{{ t('workflow.helpTitle') }}</span>
      </div>
      <div v-show="helpOpen" class="help-body">
        <p>{{ t('workflow.helpWhat') }}</p>
        <a-alert type="warning" style="margin-top: 8px">
          {{ t('workflow.helpTip') }}
        </a-alert>
      </div>
    </a-card>

    <!-- 列表 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="table-toolbar">
        <a-space size="small" wrap>
          <a-input
            v-model="filter.keyword"
            :placeholder="t('workflow.keywordPlaceholder')"
            allow-clear
            style="width: 200px"
            @press-enter="handleSearch"
          />
          <!-- 不传 status = 全部（管理台语义，含草稿/停用） -->
          <a-select v-model="filter.status" style="width: 150px" @change="handleSearch">
            <a-option value="">{{ t('workflow.statusAll') }}</a-option>
            <a-option value="draft">{{ t('workflow.statusDraft') }}</a-option>
            <a-option value="published">{{ t('workflow.statusPublished') }}</a-option>
            <a-option value="disabled">{{ t('workflow.statusDisabled') }}</a-option>
          </a-select>
          <a-button type="primary" @click="handleSearch">
            <template #icon><icon-search /></template>
            {{ t('commonTable.search') }}
          </a-button>
          <a-button @click="handleReset">
            <template #icon><icon-refresh /></template>
            {{ t('commonTable.reset') }}
          </a-button>
        </a-space>
        <a-space size="small">
          <a-button :loading="loading" @click="loadList">
            <template #icon><icon-refresh /></template>
            {{ t('commonTable.refresh') }}
          </a-button>
          <a-button @click="openImport">
            <template #icon><icon-upload /></template>
            {{ t('workflow.import') }}
          </a-button>
          <a-button type="primary" @click="openCreate">
            <template #icon><icon-plus /></template>
            {{ t('workflow.create') }}
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
          <a-table-column :title="t('workflow.colCode')" data-index="code" :width="135" fixed="left" />
          <a-table-column :title="t('workflow.colName')" data-index="name" :width="144" />
          <a-table-column :title="t('workflow.colStatus')" :width="110">
            <template #cell="{ record }">
              <a-tooltip :content="statusHint(record.status)">
                <a-tag :color="statusColor(record.status)" size="small">{{ statusText(record.status) }}</a-tag>
              </a-tooltip>
            </template>
          </a-table-column>
          <a-table-column :title="t('workflow.colScope')" :width="130">
            <template #cell="{ record }">
              <a-tag :color="scopeColor(record.scope)" size="small">{{ scopeText(record.scope) }}</a-tag>
              <span v-if="record.scope_ref" class="sub-hint">{{ record.scope_ref }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="t('workflow.colStageCount')" :width="90">
            <template #cell="{ record }">{{ record.stage_count ?? '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('workflow.colVersion')" :width="100">
            <template #cell="{ record }">{{ record.current_version ?? '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('workflow.colDesc')" data-index="description" :width="180" ellipsis :tooltip="true" />
          <a-table-column :title="t('commonTable.operation')" :width="297" fixed="right">
            <template #cell="{ record }">
              <!-- can_manage 由服务端判定，前端直接用它控按钮显隐 -->
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
              <a-button type="text" size="mini" @click="handleExport(record)">
                {{ t('workflow.export') }}
              </a-button>
              <a-button type="text" size="mini" @click="openChangelog(record)">
                {{ t('workflow.changelog') }}
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
          <a-empty :description="t('workflow.emptyList')" />
        </template>
      </a-table>
    </a-card>

    <!-- 新建 / 编辑弹窗（拖拽 + 下拉） -->
    <a-modal
      v-model:visible="formVisible"
      :title="isEdit ? t('workflow.editTitle', { name: form.name || form.code }) : t('workflow.createTitle')"
      width="1180px"
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
              <a-input v-model="form.prefix" :placeholder="t('workflow.prefixPlaceholder')" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="t('workflow.formDescription')">
              <a-input v-model="form.description" :placeholder="t('workflow.descPlaceholder')" allow-clear />
            </a-form-item>
          </a-col>
          <!-- 触发语料：只写「用户可能怎么说」，与 description（这是什么）各司其职 -->
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
          <a-col :span="12">
            <a-form-item :label="t('workflow.formScope')">
              <a-space>
                <!-- 可见域：单选 + 下拉（不手填部门/用户 ID） -->
                <a-radio-group v-model="form.scope" type="button" @change="onScopeChange">
                  <a-radio value="org">{{ t('workflow.scopeOrg') }}</a-radio>
                  <a-radio value="dept">{{ t('workflow.scopeDept') }}</a-radio>
                  <a-radio value="user">{{ t('workflow.scopeUser') }}</a-radio>
                </a-radio-group>
                <a-select
                  v-if="form.scope === 'dept'"
                  v-model="form.scope_ref"
                  :placeholder="t('workflow.deptPlaceholder')"
                  :loading="deptLoading"
                  allow-search
                  allow-clear
                  style="width: 220px"
                >
                  <a-option v-for="d in deptOptions" :key="d.value" :value="d.value">{{ d.label }}</a-option>
                </a-select>
                <a-select
                  v-if="form.scope === 'user'"
                  v-model="form.scope_ref"
                  :placeholder="t('workflow.userPlaceholder')"
                  :loading="userLoading"
                  :filter-option="false"
                  :fallback-option="userFallback"
                  allow-search
                  allow-clear
                  style="width: 220px"
                  @search="fetchUsers"
                  @dropdown-visible-change="(v) => v && fetchUsers('')"
                >
                  <a-option v-for="u in userOptions" :key="u.value" :value="u.value">{{ u.label }}</a-option>
                </a-select>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left">{{ t('workflow.formStages') }}</a-divider>
        <p class="drag-hint">{{ t('workflow.dragHint') }}</p>

        <div class="editor">
          <!-- 左：能力库（① 插件方法 ② 系统工具；可搜索、可拖） -->
          <div class="pane pane-lib">
            <div class="pane-title">{{ t('workflow.libTitle') }}</div>
            <a-input
              v-model="libKeyword"
              :placeholder="t('workflow.libSearchPlaceholder')"
              allow-clear
              size="small"
            />
            <a-spin :loading="libLoading" style="width: 100%">
              <div class="lib-list">
                <!-- ① 插件 → 方法 两级树 -->
                <div class="lib-group-title">{{ t('workflow.libPluginGroup') }}</div>
                <div v-for="p in filteredPlugins" :key="p.name" class="lib-plugin">
                  <div class="lib-plugin-head" @click="togglePlugin(p.name)">
                    <icon-down v-if="isExpanded(p.name)" />
                    <icon-right v-else />
                    <span class="lib-plugin-name">{{ p.name }}</span>
                    <span class="lib-plugin-count">{{ p.methods.length }}</span>
                  </div>
                  <div v-show="isExpanded(p.name)" class="lib-methods">
                    <div
                      v-for="m in p.methods"
                      :key="p.name + '.' + m.name"
                      class="lib-method"
                      draggable="true"
                      :title="m.description || m.name"
                      @dragstart="onMethodDragStart(p.name, m, $event)"
                      @dragend="onDragEnd"
                    >
                      {{ m.name }}
                    </div>
                  </div>
                </div>

                <!-- ② 系统工具（平铺 + 搜索）；拖进来落到节点的 tools，不是 methods -->
                <div class="lib-group-title">{{ t('workflow.libToolGroup') }}</div>
                <div
                  v-for="tl in filteredTools"
                  :key="tl.value"
                  class="lib-tool"
                  draggable="true"
                  :title="tl.value"
                  @dragstart="onToolDragStart(tl, $event)"
                  @dragend="onDragEnd"
                >
                  <span class="lib-tool-label">{{ tl.label || tl.value }}</span>
                  <a-tag v-if="tl.risk_level" size="mini" :color="riskColor(tl.risk_level)">
                    {{ riskText(tl.risk_level) }}
                  </a-tag>
                </div>

                <a-empty
                  v-if="!filteredPlugins.length && !filteredTools.length"
                  :description="t('workflow.libEmpty')"
                />
              </div>
            </a-spin>
          </div>

          <!-- 中：画布（拖方法进来生成节点，节点可拖动排序） -->
          <div class="pane pane-canvas" @dragover.prevent @drop="onCanvasDrop">
            <div class="pane-title">{{ t('workflow.canvasTitle') }}</div>
            <div v-if="!form.stages.length" class="canvas-empty">
              <a-empty :description="t('workflow.canvasEmpty')" />
            </div>
            <div
              v-for="(node, index) in form.stages"
              :key="node._uid"
              class="node-card"
              :class="{ active: selectedIndex === index }"
              draggable="true"
              @dragstart="onNodeDragStart(index, $event)"
              @dragend="onDragEnd"
              @dragover.prevent
              @drop.stop="onNodeDrop(index)"
              @click="selectedIndex = index"
            >
              <div class="node-head">
                <span class="node-seq">{{ index + 1 }}</span>
                <span class="node-name">{{ node.name || node.stage || t('workflow.untitledNode') }}</span>
                <a-button size="mini" status="danger" @click.stop="removeStage(index)">
                  <template #icon><icon-delete /></template>
                </a-button>
              </div>
              <div class="node-methods">
                <a-tag v-for="m in node.methods" :key="m" size="small" color="arcoblue">{{ m }}</a-tag>
                <a-tag v-for="tl in node.tools" :key="tl" size="small" color="purple">{{ tl }}</a-tag>
                <span v-if="!node.methods.length && !node.tools.length" class="muted-text">
                  {{ t('workflow.noMethods') }}
                </span>
              </div>
            </div>
          </div>

          <!-- 右：节点属性 -->
          <div class="pane pane-props">
            <div class="pane-title">{{ t('workflow.propsTitle') }}</div>
            <div v-if="!selected" class="props-empty">
              <a-empty :description="t('workflow.propsEmpty')" />
            </div>
            <a-form v-else :model="selected" layout="vertical">
              <a-form-item :label="t('workflow.stageName')" required>
                <a-input v-model="selected.name" allow-clear />
              </a-form-item>
              <a-form-item
                :label="t('workflow.stageCode')"
                :help="selected._locked ? t('workflow.stageCodeLocked') : t('workflow.stageAutoHint')"
              >
                <a-input v-model="selected.stage" :disabled="selected._locked" allow-clear />
              </a-form-item>
              <a-form-item :label="t('workflow.manualMinutes')" :help="t('workflow.manualMinutesHint')">
                <a-input-number
                  v-model="selected.manual_minutes"
                  :min="0"
                  :precision="0"
                  allow-clear
                  style="width: 100%"
                />
              </a-form-item>
              <!-- 节点说明 note：纯给智能体看的「为什么这么安排」，不参与任何判定 -->
              <a-form-item :label="t('workflow.stageNote')">
                <a-textarea
                  v-model="selected.note"
                  :placeholder="t('workflow.stageNotePlaceholder')"
                  :max-length="512"
                  show-word-limit
                  :auto-size="{ minRows: 3, maxRows: 6 }"
                  allow-clear
                />
              </a-form-item>
              <a-form-item :label="t('workflow.methodList')">
                <a-space wrap size="mini">
                  <a-tag
                    v-for="m in selected.methods"
                    :key="m"
                    closable
                    size="small"
                    @close="removeMethodFromStage(selectedIndex, m)"
                  >
                    {{ m }}
                  </a-tag>
                  <span v-if="!selected.methods.length" class="muted-text">{{ t('workflow.noMethods') }}</span>
                </a-space>
              </a-form-item>
              <a-form-item :label="t('workflow.toolList')">
                <a-space wrap size="mini">
                  <a-tag
                    v-for="tl in selected.tools"
                    :key="tl"
                    closable
                    size="small"
                    color="purple"
                    @close="removeToolFromStage(selectedIndex, tl)"
                  >
                    {{ tl }}
                  </a-tag>
                  <span v-if="!selected.tools.length" class="muted-text">{{ t('workflow.noTools') }}</span>
                </a-space>
              </a-form-item>
            </a-form>
          </div>
        </div>
      </a-form>
    </a-modal>

    <!-- 导入弹窗 -->
    <a-modal
      v-model:visible="importVisible"
      :title="t('workflow.importTitle')"
      :ok-loading="importing"
      :ok-text="t('workflow.import')"
      unmount-on-close
      @before-ok="handleImport"
    >
      <a-form :model="importForm" layout="vertical">
        <a-form-item :label="t('workflow.importFile')">
          <input type="file" accept=".json,application/json" @change="onImportFile" />
        </a-form-item>
        <a-form-item :label="t('workflow.importOrPaste')">
          <a-textarea
            v-model="importForm.content"
            :placeholder="t('workflow.importContentPlaceholder')"
            :auto-size="{ minRows: 6, maxRows: 12 }"
          />
        </a-form-item>
        <a-form-item :label="t('workflow.importConflict')">
          <a-radio-group v-model="importForm.conflict">
            <a-radio value="skip">{{ t('workflow.conflictSkip') }}</a-radio>
            <a-radio value="overwrite">{{ t('workflow.conflictOverwrite') }}</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 变更历史抽屉 -->
    <a-drawer
      v-model:visible="changelogVisible"
      :title="t('workflow.changelogTitle', { name: changelogTarget?.name || changelogTarget?.code || '' })"
      width="720px"
      :footer="false"
    >
      <a-table
        :data="changelogRows"
        :loading="changelogLoading"
        :pagination="changelogPagination"
        row-key="log_id"
        size="small"
        :bordered="false"
        @page-change="handleChangelogPageChange"
      >
        <template #columns>
          <a-table-column :title="t('workflow.logVersion')" :width="80">
            <template #cell="{ record }">v{{ record.version }}</template>
          </a-table-column>
          <a-table-column :title="t('workflow.logType')" :width="110">
            <template #cell="{ record }">
              <a-tag :color="changeColor(record.change_type)" size="small">
                {{ changeText(record.change_type) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('workflow.logNote')" data-index="change_note" :width="200" ellipsis :tooltip="true" />
          <a-table-column :title="t('workflow.logOperator')" :width="100">
            <template #cell="{ record }">{{ record.operator || '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('workflow.logTime')" data-index="created_time" :width="170" />
          <a-table-column :title="t('workflow.logSnapshot')" :width="90">
            <template #cell="{ record }">
              <a-link @click="openSnapshot(record)">{{ t('commonTable.details') }}</a-link>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty :description="t('workflow.logEmpty')" />
        </template>
      </a-table>
    </a-drawer>

    <!-- 快照弹窗 -->
    <a-modal
      v-model:visible="snapshotVisible"
      :title="t('workflow.snapshotTitle', { version: snapshotVersion })"
      width="760px"
      :footer="false"
    >
      <a-tabs>
        <a-tab-pane key="before" :title="t('workflow.snapshotBefore')">
          <pre class="snapshot-pre">{{ snapshotBefore }}</pre>
        </a-tab-pane>
        <a-tab-pane key="after" :title="t('workflow.snapshotAfter')">
          <pre class="snapshot-pre">{{ snapshotAfter }}</pre>
        </a-tab-pane>
      </a-tabs>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'
import { getDeptList } from '@/api/modules/gisUserDept'
import { RISK_LEVEL_MAP } from '@/constants/riskLevel'
import { downloadBlob } from '@/utils/download'

const { t } = useI18n()

const helpOpen = ref(false)

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
const CHANGE_MAP = {
  create: { key: 'changeCreate', color: 'green' },
  publish: { key: 'changePublish', color: 'arcoblue' },
  disable: { key: 'changeDisable', color: 'red' },
  update_scene: { key: 'changeUpdateScene', color: 'orange' },
  update_stage: { key: 'changeUpdateStage', color: 'orange' },
  update_binding: { key: 'changeUpdateBinding', color: 'orange' },
  import: { key: 'changeImport', color: 'purple' },
  delete: { key: 'changeDelete', color: 'gray' }
}

function statusText(s) { return STATUS_MAP[s] ? t(`workflow.${STATUS_MAP[s].key}`) : s || '-' }
function statusColor(s) { return STATUS_MAP[s]?.color || 'gray' }
function statusHint(s) {
  if (s === 'draft') return t('workflow.statusDraftHint')
  if (s === 'published') return t('workflow.statusPublishedHint')
  return ''
}
function scopeText(s) { return SCOPE_MAP[s] ? t(`workflow.${SCOPE_MAP[s].key}`) : s || '-' }
function scopeColor(s) { return SCOPE_MAP[s]?.color || 'gray' }
function changeText(c) { return t(`workflow.${CHANGE_MAP[c]?.key || 'changeUnknown'}`) }
function changeColor(c) { return CHANGE_MAP[c]?.color || 'gray' }

// ---------- 列表 ----------
const filter = reactive({ keyword: '', status: '' })
const loading = ref(false)
const list = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50]
})

async function loadList() {
  loading.value = true
  try {
    const params = { page: pagination.current, page_size: pagination.pageSize }
    if (filter.keyword) params.keyword = filter.keyword
    if (filter.status) params.status = filter.status
    const res = await api.gisWorkflow.getWorkflowList(params)
    const data = res?.data || res || {}
    list.value = data.rows || []
    pagination.total = data.total || 0
  } catch (_) {
    // request.js 已统一弹错
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
  filter.status = ''
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

// ---------- 能力库（① 插件 → 方法 ② 系统工具） ----------
// 插件方法：GET /biz/gis_service（Vec<PluginManifest>）+ GET /biz/gis_service/{plugin}（完整方法）
// 系统工具：GET /biz/gis_workflow/system_tools（后端已过滤掉工作流引擎自身工具）
const plugins = ref([])
const systemTools = ref([])
const libLoading = ref(false)
const libKeyword = ref('')
const expandedPlugins = ref([])

function riskColor(level) {
  return RISK_LEVEL_MAP[level]?.color || 'gray'
}
function riskText(level) {
  return RISK_LEVEL_MAP[level] ? t(`riskLevel.${level}`) : level || ''
}

async function loadCapabilities() {
  libLoading.value = true
  try {
    const [svcRes, toolRes] = await Promise.all([
      api.pluginService.getServiceList().catch(() => null),
      api.gisWorkflow.getSystemTools().catch(() => null)
    ])

    // ① 插件 → 方法
    const raw = svcRes?.data || svcRes || []
    const list = Array.isArray(raw) ? raw : []
    const result = await Promise.all(
      list.map(async (p) => {
        const name = p.name || p.manifest?.name || ''
        if (!name) return null
        let methods = Array.isArray(p.methods) ? p.methods : []
        if (!methods.length) {
          const detailRes = await api.pluginService
            .getServiceDetail(name)
            .catch(() => ({ data: { methods: [] } }))
          const detail = detailRes?.data || detailRes || {}
          methods = detail.methods || []
        }
        return {
          name,
          methods: methods
            .filter(m => m && m.name)
            .map(m => ({ name: m.name, description: m.description || '' }))
        }
      })
    )
    plugins.value = result.filter(p => p && p.methods.length)

    // ② 系统工具
    const tools = toolRes?.data || toolRes || []
    systemTools.value = Array.isArray(tools) ? tools.filter(x => x && x.value) : []
  } catch (_) {
    // 能力库拉取失败不阻断表单，仅提示为空
    plugins.value = []
    systemTools.value = []
  } finally {
    libLoading.value = false
  }
}

const filteredPlugins = computed(() => {
  const kw = libKeyword.value.trim().toLowerCase()
  if (!kw) return plugins.value
  return plugins.value
    .map((p) => {
      const pluginHit = p.name.toLowerCase().includes(kw)
      return {
        name: p.name,
        methods: p.methods.filter(
          m => pluginHit || m.name.toLowerCase().includes(kw) || (m.description || '').toLowerCase().includes(kw)
        )
      }
    })
    .filter(p => p.methods.length)
})

const filteredTools = computed(() => {
  const kw = libKeyword.value.trim().toLowerCase()
  if (!kw) return systemTools.value
  return systemTools.value.filter(
    tl => (tl.value || '').toLowerCase().includes(kw) || (tl.label || '').toLowerCase().includes(kw)
  )
})

function isExpanded(name) {
  return !!libKeyword.value.trim() || expandedPlugins.value.includes(name)
}
function togglePlugin(name) {
  const i = expandedPlugins.value.indexOf(name)
  if (i >= 0) expandedPlugins.value.splice(i, 1)
  else expandedPlugins.value.push(name)
}

// ---------- 拖拽 ----------
let dragState = null

function onDragEnd() {
  dragState = null
}
function onMethodDragStart(pluginName, method, e) {
  dragState = {
    type: 'method',
    value: `${pluginName}.${method.name}`,
    methodName: method.name,
    description: method.description
  }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', dragState.value)
  }
}
function onToolDragStart(tool, e) {
  dragState = { type: 'tool', value: tool.value, label: tool.label || tool.value }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', tool.value)
  }
}
function onNodeDragStart(index, e) {
  dragState = { type: 'node', index }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'node')
  }
}

// 画布空白处放下：方法 / 工具 → 追加为新节点；节点 → 移到末尾
function onCanvasDrop() {
  if (dragState?.type === 'method') {
    addStageFromMethod(dragState)
  } else if (dragState?.type === 'tool') {
    addStageFromTool(dragState)
  } else if (dragState?.type === 'node') {
    moveNode(dragState.index, form.stages.length - 1)
  }
  dragState = null
}

// 放到某个节点上：方法 / 工具 → 追加到该节点；节点 → 重排
function onNodeDrop(targetIndex) {
  if (dragState?.type === 'method') {
    addMethodToStage(targetIndex, dragState)
  } else if (dragState?.type === 'tool') {
    addToolToStage(targetIndex, dragState)
  } else if (dragState?.type === 'node') {
    moveNode(dragState.index, targetIndex)
  }
  dragState = null
}

// ---------- 节点编排 ----------
const formVisible = ref(false)
const saving = ref(false)
const isEdit = ref(false)
const selectedIndex = ref(-1)
let uidSeq = 0

const form = reactive({
  code: '',
  name: '',
  description: '',
  trigger_hint: '',
  prefix: '',
  scope: 'org',
  scope_ref: null,
  stages: []
})

const selected = computed(() => form.stages[selectedIndex.value] || null)

function newStage(fields = {}) {
  return {
    _uid: ++uidSeq,
    stage: '',
    name: '',
    manual_minutes: null,
    note: '',
    methods: [],
    tools: [],
    _locked: false,
    ...fields
  }
}

// 方法名 → 节点编码：转小写下划线，并保证工作流内唯一
function toSnake(name) {
  return String(name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}
function genStageCode(methodName) {
  const base = toSnake(methodName) || 'stage'
  const used = new Set(form.stages.map(s => s.stage))
  let code = base
  let i = 2
  while (used.has(code)) code = `${base}_${i++}`
  return code
}
function shortText(text, len = 24) {
  const s = String(text || '').trim().split(/[\n。.]/)[0]
  return s.length > len ? s.slice(0, len) : s
}

// 拖一个插件方法进画布 = 新建节点
function addStageFromMethod(d) {
  form.stages.push(
    newStage({
      stage: genStageCode(d.methodName),
      name: shortText(d.description) || d.methodName,
      methods: [d.value]
    })
  )
  selectedIndex.value = form.stages.length - 1
}

// 拖一个系统工具进画布 = 新建节点（落到 tools，不是 methods）
function addStageFromTool(d) {
  form.stages.push(
    newStage({
      stage: genStageCode(d.value),
      name: shortText(d.label) || d.value,
      tools: [d.value]
    })
  )
  selectedIndex.value = form.stages.length - 1
}

// 同一方法/工具可绑到多个节点（正常用法，不拦）；仅在同一节点内不重复写
function addMethodToStage(index, d) {
  const stage = form.stages[index]
  if (!stage || stage.methods.includes(d.value)) return
  stage.methods.push(d.value)
  selectedIndex.value = index
}

function addToolToStage(index, d) {
  const stage = form.stages[index]
  if (!stage || stage.tools.includes(d.value)) return
  stage.tools.push(d.value)
  selectedIndex.value = index
}

function moveNode(from, to) {
  if (from === to || from < 0 || from >= form.stages.length) return
  const arr = form.stages
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  selectedIndex.value = to
}

function removeStage(index) {
  form.stages.splice(index, 1)
  if (selectedIndex.value >= form.stages.length) selectedIndex.value = form.stages.length - 1
}
function removeMethodFromStage(index, methodKey) {
  const stage = form.stages[index]
  if (!stage) return
  const i = stage.methods.indexOf(methodKey)
  if (i >= 0) stage.methods.splice(i, 1)
}
function removeToolFromStage(index, toolValue) {
  const stage = form.stages[index]
  if (!stage) return
  const i = stage.tools.indexOf(toolValue)
  if (i >= 0) stage.tools.splice(i, 1)
}

// ---------- 部门 / 用户下拉 ----------
const deptOptions = ref([])
const deptLoading = ref(false)
let deptsLoaded = false

async function ensureDepts() {
  if (deptsLoaded) return
  deptsLoaded = true
  deptLoading.value = true
  try {
    const res = await getDeptList({ showError: false })
    const data = res?.data ?? res
    const arr = Array.isArray(data) ? data : (data?.list || [])
    deptOptions.value = arr
      .filter(d => d && d.deptId !== undefined && d.deptId !== null)
      .map(d => ({ label: d.deptName, value: d.deptId }))
  } catch (_) {
    deptsLoaded = false
  } finally {
    deptLoading.value = false
  }
}

const userOptions = ref([])
const userLoading = ref(false)
const userCache = new Map()
let userSeq = 0

function userLabel(u) {
  return `${u.user_name}（${u.nick_name || u.user_name}）`
}
function userFallback(value) {
  if (value === undefined || value === null || value === '') return { value, label: '' }
  const u = userCache.get(value)
  return { value, label: u ? userLabel(u) : `#${value}` }
}
async function fetchUsers(keyword = '') {
  const seq = ++userSeq
  userLoading.value = true
  try {
    const res = await api.gisUser.getGisUserPicker({ keyword, page: 1, page_size: 100 })
    if (seq !== userSeq) return
    const rows = res?.data?.rows || res?.rows || []
    userOptions.value = rows.map((u) => {
      userCache.set(u.user_id, u)
      return { label: userLabel(u), value: u.user_id }
    })
  } catch (_) {
    if (seq === userSeq) userOptions.value = []
  } finally {
    if (seq === userSeq) userLoading.value = false
  }
}

function onScopeChange() {
  form.scope_ref = null
  if (form.scope === 'dept') ensureDepts()
  if (form.scope === 'user') fetchUsers('')
}

// ---------- 新建 / 编辑 ----------
function resetForm() {
  form.code = ''
  form.name = ''
  form.description = ''
  form.trigger_hint = ''
  form.prefix = ''
  form.scope = 'org'
  form.scope_ref = null
  form.stages = []
  selectedIndex.value = -1
}

function openCreate() {
  isEdit.value = false
  resetForm()
  formVisible.value = true
  loadCapabilities()
}

async function openEdit(record) {
  isEdit.value = true
  resetForm()
  formVisible.value = true
  loadCapabilities()
  try {
    const res = await api.gisWorkflow.getWorkflowDetail(record.code)
    const data = res?.data || res || {}
    const wf = data.workflow || {}
    form.code = wf.biz_scene ?? record.code
    form.name = wf.name ?? record.name ?? ''
    form.description = wf.description ?? ''
    form.trigger_hint = wf.trigger_hint ?? ''
    form.prefix = wf.prefix ?? ''
    form.scope = wf.scope || 'org'
    form.scope_ref = wf.scope_ref ?? null
    if (form.scope === 'dept') ensureDepts()
    if (form.scope === 'user') fetchUsers('')
    const bindings = data.bindings || []
    const stages = (data.stages || []).slice().sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    // bindings 按 match_type 分流回填：'tool' → tools，其余（plugin_method）→ methods
    form.stages = stages.map(s =>
      newStage({
        stage: s.stage,
        name: s.name || '',
        manual_minutes: s.manual_minutes ?? null,
        note: s.note ?? '',
        methods: bindings
          .filter(b => b.stage === s.stage && b.match_type !== 'tool')
          .map(b => b.match_value),
        tools: bindings
          .filter(b => b.stage === s.stage && b.match_type === 'tool')
          .map(b => b.match_value),
        // 已有节点编码锁住：它要落进调用日志、要被引用校验
        _locked: true
      })
    )
    selectedIndex.value = form.stages.length ? 0 : -1
  } catch (_) {
    formVisible.value = false
  }
}

function buildPayload() {
  // enforce_mode 已废弃（闸门改为声明制）：不传，后端回落 shadow，返回里的值前端也忽略
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description?.trim() || null,
    // 触发语料：多个样例用 “/” 分隔；留空传 null（后端不渲染）
    trigger_hint: form.trigger_hint?.trim() || null,
    prefix: form.prefix?.trim() || null,
    scope: form.scope,
    scope_ref: form.scope === 'org' ? null : form.scope_ref,
    // 顺序写进 seq，从 1 开始；整体覆盖：要保留的节点都必须带上
    stages: form.stages.map((s, i) => ({
      stage: s.stage.trim(),
      seq: i + 1,
      name: s.name.trim(),
      manual_minutes:
        s.manual_minutes === '' || s.manual_minutes === null || s.manual_minutes === undefined
          ? null
          : Number(s.manual_minutes),
      // 说明为空时传 null（不是空串）
      note: s.note?.trim() || null,
      methods: s.methods || [],
      tools: s.tools || []
    }))
  }
}

function validate() {
  if (!form.code.trim()) return t('workflow.codeRequired')
  if (!form.name.trim()) return t('workflow.nameRequired')
  if (form.scope !== 'org' && !form.scope_ref) return t('workflow.scopeRefRequired')
  if (!form.stages.length) return t('workflow.noStages')
  for (const s of form.stages) {
    if (!s.stage.trim() || !s.name.trim()) return t('workflow.stageIncomplete')
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
      // 编辑即回草稿（A4）：改动不生效，必须重新发布
      Message.warning(t('workflow.saveDraftTip'))
    } else {
      const res = await api.gisWorkflow.createWorkflow(payload)
      const data = res?.data || res || {}
      Message.success(data.revived ? t('workflow.revivedHint') : t('workflow.createOk'))
    }
    done(true)
    loadList()
  } catch (_) {
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

// ---------- 导出（content 是字符串 JSON，给成 .json 下载） ----------
async function handleExport(record) {
  try {
    const res = await api.gisWorkflow.exportWorkflow(record.code)
    const content = (res?.data || res || {}).content || ''
    downloadBlob(new Blob([content], { type: 'application/json' }), `${record.code}.json`)
    Message.success(t('workflow.exportOk'))
  } catch (_) {
    // request.js 已统一弹错
  }
}

// ---------- 导入 ----------
const importVisible = ref(false)
const importing = ref(false)
const importForm = reactive({ content: '', conflict: 'skip' })

function openImport() {
  importForm.content = ''
  importForm.conflict = 'skip'
  importVisible.value = true
}

function onImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    importForm.content = String(reader.result || '')
  }
  reader.readAsText(file)
}

async function handleImport(done) {
  if (!importForm.content.trim()) {
    Message.warning(t('workflow.importNeedFile'))
    done(false)
    return
  }
  importing.value = true
  try {
    await api.gisWorkflow.importWorkflow({
      content: importForm.content,
      conflict: importForm.conflict
    })
    Message.success(t('workflow.importOk'))
    done(true)
    loadList()
  } catch (_) {
    done(false)
  } finally {
    importing.value = false
  }
}

// ---------- 变更历史 ----------
const changelogVisible = ref(false)
const changelogLoading = ref(false)
const changelogTarget = ref(null)
const changelogRows = ref([])
const changelogTotal = ref(0)
const changelogPage = ref(1)
const CHANGELOG_PAGE_SIZE = 10

const changelogPagination = computed(() => ({
  total: changelogTotal.value,
  current: changelogPage.value,
  pageSize: CHANGELOG_PAGE_SIZE
}))

async function loadChangelog() {
  if (!changelogTarget.value) return
  changelogLoading.value = true
  try {
    const res = await api.gisWorkflow.getWorkflowChangelog(changelogTarget.value.code, {
      page: changelogPage.value,
      page_size: CHANGELOG_PAGE_SIZE
    })
    const data = res?.data || res || {}
    changelogRows.value = data.rows || []
    changelogTotal.value = data.total || 0
  } catch (_) {
    changelogRows.value = []
    changelogTotal.value = 0
  } finally {
    changelogLoading.value = false
  }
}

function openChangelog(record) {
  changelogTarget.value = record
  changelogPage.value = 1
  changelogRows.value = []
  changelogVisible.value = true
  loadChangelog()
}

function handleChangelogPageChange(page) {
  changelogPage.value = page
  loadChangelog()
}

// ---------- 快照 ----------
const snapshotVisible = ref(false)
const snapshotVersion = ref(0)
const snapshotBefore = ref('')
const snapshotAfter = ref('')

function pretty(jsonStr) {
  if (!jsonStr) return '—'
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2)
  } catch (_) {
    return String(jsonStr)
  }
}

function openSnapshot(record) {
  snapshotVersion.value = record.version
  snapshotBefore.value = pretty(record.before_snapshot)
  snapshotAfter.value = pretty(record.after_snapshot)
  snapshotVisible.value = true
}

// ---------- 初始化 ----------
onMounted(() => {
  loadList()
})
</script>

<style lang="scss" scoped>
.help-head {
  display: flex;
  align-items: center;
  gap: $space-2;
  cursor: pointer;
  user-select: none;
}

.help-title {
  font-weight: 600;
  color: $color-text;
}

.help-body {
  margin-top: $space-3;
  font-size: $font-size-sm;
  color: $color-text-secondary;

  p {
    margin: 0;
    line-height: 1.7;
  }
}

.table-toolbar {
  margin-bottom: $space-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  flex-wrap: wrap;
}

.sub-hint {
  margin-left: 6px;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.muted-text {
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.drag-hint {
  margin: 0 0 $space-2;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
  line-height: 1.6;
}

// ---------- 三栏编辑器 ----------
.editor {
  display: flex;
  gap: $space-3;
  height: 52vh;
  min-height: 320px;
}

.pane {
  display: flex;
  flex-direction: column;
  padding: $space-3;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-bg-muted;
  overflow: auto;
}

.pane-title {
  margin-bottom: $space-2;
  font-weight: 600;
  color: $color-text;
}

.pane-lib {
  width: 260px;
  flex: none;
}

.pane-canvas {
  flex: 1;
  min-width: 0;
}

.pane-props {
  width: 300px;
  flex: none;
}

// 能力库
.lib-list {
  margin-top: $space-2;
}

.lib-plugin-head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 2px;
  cursor: pointer;
  user-select: none;
  color: $color-text;
}

.lib-plugin-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lib-plugin-count {
  margin-left: auto;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.lib-methods {
  padding-left: $space-3;
}

.lib-method {
  padding: 4px 6px;
  margin-bottom: 2px;
  border-radius: $radius;
  background: var(--color-bg-2);
  color: $color-text-secondary;
  font-size: $font-size-sm;
  cursor: grab;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    background: var(--color-fill-2);
    color: $color-primary;
  }
}

.lib-group-title {
  margin: $space-2 0 4px;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $color-text-tertiary;

  &:first-child {
    margin-top: 0;
  }
}

.lib-tool {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  margin-bottom: 2px;
  border-radius: $radius;
  background: var(--color-bg-2);
  color: $color-text-secondary;
  font-size: $font-size-sm;
  cursor: grab;
  user-select: none;

  &:hover {
    background: var(--color-fill-2);
    color: $color-primary;
  }
}

.lib-tool-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 画布
.canvas-empty {
  margin-top: 40px;
}

.node-card {
  margin-bottom: $space-2;
  padding: $space-2 $space-3;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: var(--color-bg-2);
  cursor: grab;
  user-select: none;

  &:hover {
    border-color: $color-primary;
  }

  &.active {
    border-color: $color-primary;
    box-shadow: 0 0 0 1px rgb(var(--primary-6));
  }
}

.node-head {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.node-seq {
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

.node-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: $color-text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-methods {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.props-empty {
  margin-top: 40px;
}

.snapshot-pre {
  margin: 0;
  max-height: 50vh;
  overflow: auto;
  padding: $space-3;
  background: $color-bg-muted;
  border-radius: $radius;
  font-family: 'JetBrains Mono', monospace;
  font-size: $font-size-xs;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
