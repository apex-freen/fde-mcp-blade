<template>
  <div class="skill-page">
    <!-- 说明区块（可折叠） -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="help-head" @click="helpOpen = !helpOpen">
        <icon-down v-if="helpOpen" />
        <icon-right v-else />
        <span class="help-title">{{ t('skillLib.helpTitle') }}</span>
      </div>
      <div v-show="helpOpen" class="help-body">
        <p>{{ t('skillLib.helpWhat') }}</p>
        <p class="help-sub">{{ t('skillLib.helpWhereTitle') }}</p>
        <pre class="help-pre">{{ t('skillLib.helpWhere') }}</pre>
        <p class="help-sub">{{ t('skillLib.helpReqTitle') }}</p>
        <pre class="help-pre">{{ t('skillLib.helpReq') }}</pre>
      </div>
    </a-card>

    <!-- 列表 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="table-toolbar">
        <a-space size="small" wrap>
          <!-- 1042 §5.1：多域切换 system/org/dept；本部门技能页（mode=dept）固定 dept -->
          <a-select
            v-if="!isDeptMode"
            v-model="filter.scope"
            style="width: 130px"
            @change="onScopeChange"
          >
            <a-option value="">{{ t('skillLib.scopeAll') }}</a-option>
            <a-option value="system">{{ t('skillLib.scopeSystem') }}</a-option>
            <a-option value="org">{{ t('skillLib.scopeOrg') }}</a-option>
            <a-option value="dept">{{ t('skillLib.scopeDept') }}</a-option>
          </a-select>
          <a-select
            v-if="!isDeptMode && filter.scope === 'org'"
            v-model="filter.orgName"
            style="width: 180px"
            allow-clear
            :placeholder="t('skillLib.filterOrg')"
            @change="applyFilter"
          >
            <a-option v-for="o in orgOptions" :key="o" :value="o">{{ o }}</a-option>
          </a-select>
          <a-select
            v-if="!isDeptMode && filter.scope === 'dept'"
            v-model="filter.deptId"
            style="width: 180px"
            allow-clear
            :placeholder="t('skillLib.filterDept')"
            @change="applyFilter"
          >
            <a-option v-for="d in deptIdOptions" :key="d" :value="d">{{ deptLabel(d) }}</a-option>
          </a-select>
          <a-select v-if="!isDeptMode" v-model="filter.status" style="width: 130px" @change="applyFilter">
            <a-option value="">{{ t('skillLib.statusAll') }}</a-option>
            <a-option value="draft">{{ t('skillLib.statusDraft') }}</a-option>
            <a-option value="published">{{ t('skillLib.statusPublished') }}</a-option>
            <a-option value="archived">{{ t('skillLib.statusArchived') }}</a-option>
          </a-select>
          <a-checkbox v-model="filter.disabled" @change="loadList">
            {{ t('skillLib.showDisabled') }}
          </a-checkbox>
        </a-space>
        <a-space size="small">
          <a-button :loading="loading" @click="loadList">
            <template #icon><icon-refresh /></template>
            {{ t('commonTable.refresh') }}
          </a-button>
          <a-button v-if="canCreate" type="primary" @click="openCreate">
            <template #icon><icon-plus /></template>
            {{ t('skillLib.create') }}
          </a-button>
        </a-space>
      </div>

      <a-table
        :data="pagedList"
        :loading="loading"
        :pagination="pagination"
        :row-key="rowKey"
        :bordered="false"
        :scroll="{ x: 2100 }"
        size="small"
      >
        <template #columns>
          <a-table-column :title="t('skillLib.colName')" data-index="name" :width="180" fixed="left" />
          <a-table-column :title="t('skillLib.colDesc')" data-index="description" :width="220" ellipsis />
          <a-table-column :title="t('skillLib.colScope')" :width="150">
            <template #cell="{ record }">
              <a-tag :color="scopeColor(record.scope)" size="small">{{ scopeText(record.scope) }}</a-tag>
              <span class="sub-hint">{{ belongsText(record) }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colStatus')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)" size="small">{{ statusText(record.status) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colConfidentiality')" :width="100">
            <template #cell="{ record }">
              <a-tag v-if="record.confidentiality" :color="confColor(record.confidentiality)" size="small">
                {{ confText(record.confidentiality) }}
              </a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colOwner')" :width="100">
            <template #cell="{ record }">{{ record.owner || '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colReviewDate')" :width="120">
            <template #cell="{ record }">{{ record.review_date || '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colTags')" :width="160" ellipsis>
            <template #cell="{ record }">{{ record.tags || '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colVersion')" :width="80">
            <template #cell="{ record }">{{ record.version || '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colRisk')" :width="90">
            <template #cell="{ record }">{{ record.risk || '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colMinutes')" :width="110">
            <template #cell="{ record }">{{ record.manual_avg_minutes ?? '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colLicense')" :width="100">
            <template #cell="{ record }">{{ record.license || '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colCompatibility')" :width="120" ellipsis>
            <template #cell="{ record }">{{ record.compatibility || '-' }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colTools')" :width="90">
            <template #cell="{ record }">{{ (record.allowed_tools || []).length }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colPath')" data-index="dir_path" :width="220" ellipsis />
          <a-table-column :title="t('commonTable.operation')" :width="230" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click="openView(record)">
                {{ t('skillLib.view') }}
              </a-button>
              <!-- 1042 §五/§七：写按钮一律按服务端 can_manage 判定，不按 scope 猜 -->
              <template v-if="record.can_manage && !record.disabled">
                <a-button type="text" size="mini" @click="openEdit(record)">
                  {{ t('skillLib.edit') }}
                </a-button>
                <a-button type="text" size="mini" @click="openRename(record)">
                  {{ t('skillLib.rename') }}
                </a-button>
                <a-popconfirm
                  :content="t('skillLib.disableConfirm') + ' ' + t('skillLib.backupInline')"
                  position="br"
                  @ok="handleDisable(record)"
                >
                  <a-button type="text" size="mini" status="warning" @click.stop>
                    {{ t('skillLib.disable') }}
                  </a-button>
                </a-popconfirm>
              </template>
              <span v-else-if="!record.can_manage && !record.disabled" class="readonly-hint">
                {{ t('skillLib.readonlyHint') }}
              </span>
              <a-popconfirm
                v-if="record.can_manage && record.disabled"
                :content="t('skillLib.enableConfirm')"
                position="br"
                @ok="handleEnable(record)"
              >
                <a-button type="text" size="mini" status="success" @click.stop>
                  {{ t('skillLib.enable') }}
                </a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty :description="filter.disabled ? t('skillLib.emptyDisabled') : t('skillLib.emptyList')" />
        </template>
      </a-table>
    </a-card>

    <!-- 查看（只读）弹窗 -->
    <a-modal v-model:visible="viewVisible" :title="t('skillLib.viewTitle')" width="720px" :footer="false">
      <a-spin :loading="sourceLoading" style="width: 100%">
        <pre class="source-pre">{{ viewContent || '—' }}</pre>
      </a-spin>
    </a-modal>

    <!-- 编辑弹窗（写权限按 can_manage） -->
    <a-modal
      v-model:visible="editVisible"
      :title="t('skillLib.editTitle', { name: editing?.name || '' })"
      width="860px"
      :ok-loading="saving"
      :ok-text="t('skillLib.save')"
      @before-ok="handleSave"
    >
      <a-spin :loading="sourceLoading" style="width: 100%">
        <a-alert v-if="saveConflict" type="warning" class="editor-alert">
          {{ t('skillLib.saveConflict') }}
          <a-button type="text" size="mini" @click="reloadSource">{{ t('skillLib.reload') }}</a-button>
        </a-alert>
        <a-alert v-if="editLint.errors.length" type="error" class="editor-alert">
          <div class="lint-title">{{ t('skillLib.lintTitle') }}</div>
          <div v-for="(e, i) in editLint.errors" :key="'e' + i" class="lint-line">· {{ e }}</div>
        </a-alert>
        <a-alert v-if="editLint.warnings.length" type="warning" class="editor-alert">
          <div class="lint-title">{{ t('skillLib.warnTitle') }}</div>
          <div v-for="(w, i) in editLint.warnings" :key="'w' + i" class="lint-line">· {{ w }}</div>
        </a-alert>
        <textarea
          v-model="editContent"
          class="source-editor"
          spellcheck="false"
          :placeholder="t('skillLib.contentPlaceholder')"
        />
      </a-spin>
    </a-modal>

    <!-- 新建弹窗 -->
    <a-modal
      v-model:visible="createVisible"
      :title="t('skillLib.create')"
      width="860px"
      :ok-loading="creating"
      :ok-text="t('skillLib.create')"
      @before-ok="handleCreate"
    >
      <a-form :model="createForm" layout="vertical">
        <a-space size="large" class="create-row">
          <a-form-item :label="t('skillLib.formScope')" required>
            <a-radio-group v-model="createForm.scope" :disabled="isDeptMode" @change="syncTemplate">
              <a-radio value="system">{{ t('skillLib.scopeSystem') }}</a-radio>
              <a-radio value="org">{{ t('skillLib.scopeOrg') }}</a-radio>
              <a-radio value="dept">{{ t('skillLib.scopeDept') }}</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item
            v-if="createForm.scope === 'org'"
            :label="t('skillLib.formOrgName')"
            required
            :help="t('skillLib.orgNameHint')"
          >
            <a-input
              v-model="createForm.org_name"
              style="width: 240px"
              :max-length="32"
              :placeholder="t('skillLib.orgNamePlaceholder')"
              allow-clear
            />
          </a-form-item>
          <a-form-item v-if="createForm.scope === 'dept'" :label="t('skillLib.formDept')" required>
            <a-select v-model="createForm.dept_id" style="width: 200px">
              <a-option v-for="d in createDeptOptions" :key="d.deptId" :value="d.deptId">
                {{ d.deptName }}
              </a-option>
            </a-select>
          </a-form-item>
        </a-space>
        <a-form-item :label="t('skillLib.formName')" required :help="t('skillLib.nameRule')">
          <a-input
            v-model="createForm.name"
            :max-length="64"
            :placeholder="t('skillLib.namePlaceholder')"
            allow-clear
            @input="onNameInput"
          />
        </a-form-item>
        <a-form-item :label="t('skillLib.formDesc')" required>
          <a-input
            v-model="createForm.description"
            :placeholder="t('skillLib.descPlaceholder')"
            allow-clear
            @input="onDescInput"
          />
        </a-form-item>
        <a-form-item :label="t('skillLib.formContent')" :help="t('skillLib.contentHint')">
          <a-alert v-if="createLint.errors.length" type="error" class="editor-alert">
            <div class="lint-title">{{ t('skillLib.lintTitle') }}</div>
            <div v-for="(e, i) in createLint.errors" :key="'ce' + i" class="lint-line">· {{ e }}</div>
          </a-alert>
          <a-alert v-if="createLint.warnings.length" type="warning" class="editor-alert">
            <div class="lint-title">{{ t('skillLib.warnTitle') }}</div>
            <div v-for="(w, i) in createLint.warnings" :key="'cw' + i" class="lint-line">· {{ w }}</div>
          </a-alert>
          <textarea v-model="createForm.content" class="source-editor" spellcheck="false" @input="onContentInput" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 重命名弹窗 -->
    <a-modal
      v-model:visible="renameVisible"
      :title="t('skillLib.rename')"
      :ok-loading="renaming"
      :ok-text="t('commonTable.confirm')"
      @before-ok="handleRename"
    >
      <a-form layout="vertical">
        <a-form-item :label="t('skillLib.oldName')">
          <a-input :model-value="renamingFrom?.name" disabled />
        </a-form-item>
        <a-form-item :label="t('skillLib.newName')" required :help="t('skillLib.nameRule')">
          <a-input v-model="renameTarget" :max-length="64" :placeholder="t('skillLib.namePlaceholder')" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { useUserStore } from '@/stores/user'
import { getDeptList } from '@/api/modules/gisUserDept'
import {
  getSkillList,
  getSkillSource,
  saveSkillSource,
  createSkill,
  disableSkill,
  enableSkill,
  renameSkill
} from '@/api/modules/gisSkill'

// 1042 §五：两个入口共用同一组件，靠 mode 收敛差异
//   mode='admin' → 管理后台 › 技能库（全部可见域）
//   mode='dept'  → 使用中心 › 本部门技能（固定 scope=dept，自助维护）
const props = defineProps({
  mode: { type: String, default: 'admin' }
})
const isDeptMode = computed(() => props.mode === 'dept')
const isAdminMode = computed(() => !isDeptMode.value)

const { t } = useI18n()
const userStore = useUserStore()

// 说明区块折叠
const helpOpen = ref(false)

// 管理员判定（用于「新建」按钮与部门下拉的兜底；写权限最终看接口 can_manage）
const isAdmin = computed(() => {
  const rs = userStore.roles || []
  return rs.includes('admin') || rs.includes('管理员组')
})

const NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

// 角色/元数据枚举展示
const SCOPE_COLORS = { system: 'purple', org: 'cyan', dept: 'arcoblue' }
const SCOPE_TEXTS = { system: 'skillLib.scopeSystem', org: 'skillLib.scopeOrg', dept: 'skillLib.scopeDept' }
const STATUS_COLORS = { published: 'green', draft: 'gray', archived: 'orange' }
const STATUS_TEXTS = { published: 'skillLib.statusPublished', draft: 'skillLib.statusDraft', archived: 'skillLib.statusArchived' }
const CONF_COLORS = { public: 'green', internal: 'arcoblue', confidential: 'red' }
const CONF_TEXTS = { public: 'skillLib.confPublic', internal: 'skillLib.confInternal', confidential: 'skillLib.confConfidential' }

function scopeColor(scope) { return SCOPE_COLORS[scope] || 'gray' }
function scopeText(scope) { return t(SCOPE_TEXTS[scope] || 'skillLib.scopeUnknown') }
function statusColor(status) { return STATUS_COLORS[status || 'published'] || 'gray' }
function statusText(status) { return t(STATUS_TEXTS[status || 'published'] || 'skillLib.statusPublished') }
function confColor(c) { return CONF_COLORS[c] || 'gray' }
function confText(c) { return t(CONF_TEXTS[c] || 'skillLib.confUnknown') }

// ---------- 列表 ----------
const loading = ref(false)
const list = ref([])
const filter = reactive({
  scope: isDeptMode.value ? 'dept' : '',
  orgName: undefined,
  deptId: undefined,
  status: '',
  disabled: false
})
const page = ref(1)
const PAGE_SIZE = 10

function toList(res) {
  const data = res?.data ?? res
  return Array.isArray(data) ? data : (data?.list || [])
}

// 1042 §5.1：org 域按 org_name、dept 域按 dept_id 分组/收窄（客户端二级筛选）
const filteredList = computed(() =>
  list.value.filter((s) => {
    if (filter.orgName && s.org_name !== filter.orgName) return false
    if (filter.deptId !== undefined && filter.deptId !== null && s.dept_id !== filter.deptId) return false
    if (filter.status && (s.status || 'published') !== filter.status) return false
    return true
  })
)
const pagedList = computed(() =>
  filteredList.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
)
const pagination = computed(() => ({
  total: filteredList.value.length,
  current: page.value,
  pageSize: PAGE_SIZE,
  showTotal: false,
  onChange: (v) => { page.value = v }
}))

// 分组下拉的可选项来自当前列表（不额外请求）
const orgOptions = computed(() => [...new Set(list.value.filter(s => s.scope === 'org' && s.org_name).map(s => s.org_name))])
const deptIdOptions = computed(() => [...new Set(list.value.filter(s => s.scope === 'dept' && s.dept_id != null).map(s => s.dept_id))])

// 跨部门/跨库允许同名 → (scope, org_name, dept_id, name) 做行 key
function rowKey(record) {
  return `${record.scope}|${record.org_name ?? ''}|${record.dept_id ?? 0}|${record.name}`
}

function belongsText(record) {
  if (record.scope === 'org') return record.org_name || ''
  if (record.scope === 'dept') return deptLabel(record.dept_id)
  return ''
}

function applyFilter() { page.value = 1 }

function onScopeChange() {
  filter.orgName = undefined
  filter.deptId = undefined
  loadList()
}

async function loadList() {
  page.value = 1
  loading.value = true
  try {
    // scope 走服务端过滤；本部门技能页固定 dept
    const params = { disabled: filter.disabled }
    const scope = isDeptMode.value ? 'dept' : filter.scope
    if (scope) params.scope = scope
    const res = await getSkillList(params)
    list.value = toList(res)
  } catch (_) { /* request.js 已弹错 */ }
  finally { loading.value = false }
}

// ---------- 部门下拉 ----------
const deptList = ref([])
function deptLabel(id) {
  const d = deptList.value.find(x => x.deptId === id)
  return d ? d.deptName : `Dept ${id ?? '-'}`
}
async function loadDepts() {
  if (deptList.value.length) return
  try {
    // 部门负责人入口可能无部门管理权限 → 静默失败，不弹错
    const res = await getDeptList({ showError: false })
    deptList.value = toList(res)
  } catch (_) { /* 部门拉取失败不阻断页面，写操作由后端兜底 */ }
}

// 部门负责人可管理的部门（从列表中 can_manage=true 的 dept 记录归纳）
const manageableDeptIds = computed(() => [
  ...new Set(list.value.filter(s => s.scope === 'dept' && s.can_manage && s.dept_id != null).map(s => s.dept_id))
])
// 本部门技能页兜底：直接展示部门全量下拉（后端会拦截非负责部门）
const createDeptOptions = computed(() => {
  if (isDeptMode.value && manageableDeptIds.value.length) {
    return deptList.value.filter(d => manageableDeptIds.value.includes(d.deptId))
  }
  return deptList.value
})

const canCreate = computed(() => (isAdminMode.value ? isAdmin.value : true))

// ---------- 请求载荷：按域补齐 scope 专属字段（1042 §3） ----------
function scopePayload(record, extra = {}) {
  const p = { scope: record.scope, name: record.name, ...extra }
  if (record.scope === 'dept') p.dept_id = record.dept_id
  if (record.scope === 'org') p.org_name = record.org_name
  return p
}

// ---------- 查看（只读） ----------
const viewVisible = ref(false)
const viewContent = ref('')
const sourceLoading = ref(false)

async function fetchSource(record) {
  const res = await getSkillSource(scopePayload(record))
  return res.data || res
}

async function openView(record) {
  viewVisible.value = true
  viewContent.value = ''
  sourceLoading.value = true
  try {
    const src = await fetchSource(record)
    viewContent.value = src?.content || ''
  } catch (_) { viewVisible.value = false }
  finally { sourceLoading.value = false }
}

// ---------- SKILL.md 前端 lint（1042 §5.3 / §六） ----------
// errors 阻止保存，warnings 只提示；后端校验为准
function lint(content, expectedName) {
  const errors = []
  const warnings = []
  const lines = String(content || '').split('\n')
  if ((lines[0] || '').trim() !== '---') {
    errors.push(t('skillLib.lintFmStart'))
    return { errors, warnings }
  }
  const end = lines.indexOf('---', 1)
  if (end === -1) {
    errors.push(t('skillLib.lintFmUnclosed'))
    return { errors, warnings }
  }
  const head = lines.slice(1, end).join('\n')
  const body = lines.slice(end + 1).join('\n')

  // name
  const nameM = head.match(/^name\s*:\s*(.*)$/m)
  const fmName = nameM ? nameM[1].trim().replace(/^["']|["']$/g, '') : ''
  if (!fmName) errors.push(t('skillLib.lintNameMissing'))
  else {
    if (fmName.includes('--') || !NAME_RE.test(fmName)) errors.push(t('skillLib.lintNameFormat'))
    if (expectedName && fmName !== expectedName) {
      errors.push(t('skillLib.lintNameMismatch', { fm: fmName, dir: expectedName }))
    }
  }

  // description
  const descM = head.match(/^description\s*:\s*(.*)$/m)
  const desc = descM ? descM[1].trim() : ''
  if (!desc) errors.push(t('skillLib.lintDescMissing'))
  else {
    if (desc.length > 1024) errors.push(t('skillLib.lintDescTooLong'))
    if (!/use when/i.test(desc)) warnings.push(t('skillLib.warnDescNoTrigger'))
  }

  // allowed-tools：只认空格分隔字符串，缩进列表写法 → error
  const toolsIdx = lines.findIndex(l => /^\s*allowed[-_]tools\s*:/.test(l))
  if (toolsIdx !== -1) {
    const inline = lines[toolsIdx].replace(/^\s*allowed[-_]tools\s*:/, '').trim()
    if (!inline) {
      const next = lines.slice(toolsIdx + 1).find(l => l.trim() !== '')
      if (next && /^\s*-\s+/.test(next)) errors.push(t('skillLib.lintToolsIndented'))
    }
  }

  // 正文
  if (!body.trim()) errors.push(t('skillLib.errBodyEmpty'))
  else if (body.trim().length < 20) warnings.push(t('skillLib.warnBodyShort'))

  // metadata 治理字段（仅提醒）
  const metaIdx = lines.findIndex(l => /^metadata\s*:/.test(l))
  if (metaIdx !== -1) {
    const metaBlock = []
    for (let i = metaIdx + 1; i < lines.length; i++) {
      if (/^\S/.test(lines[i])) break
      metaBlock.push(lines[i])
    }
    const metaText = metaBlock.join('\n')
    const versionM = metaText.match(/^\s*version\s*:\s*(.*)$/m)
    if (versionM) {
      const v = versionM[1].trim().replace(/^["']|["']$/g, '')
      if (v && !/^\d+\.\d+\.\d+$/.test(v)) warnings.push(t('skillLib.warnVersionFormat'))
    }
    const reviewM = metaText.match(/^\s*review_date\s*:\s*(.*)$/m)
    if (reviewM) {
      const d = reviewM[1].trim().replace(/^["']|["']$/g, '')
      if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) warnings.push(t('skillLib.warnReviewDateFormat'))
    }
    const confM = metaText.match(/^\s*confidentiality\s*:\s*(.*)$/m)
    if (confM) {
      const c = confM[1].trim().replace(/^["']|["']$/g, '')
      if (c && !['public', 'internal', 'confidential'].includes(c)) warnings.push(t('skillLib.warnConfidentialityEnum'))
    }
    const statusM = metaText.match(/^\s*status\s*:\s*(.*)$/m)
    if (statusM) {
      const s = statusM[1].trim().replace(/^["']|["']$/g, '')
      if (s && !['draft', 'published', 'archived'].includes(s)) warnings.push(t('skillLib.warnStatusEnum'))
    }
  }

  return { errors, warnings }
}

// ---------- 备份提示（编辑 / 改名前） ----------
function warnBackup() {
  return new Promise((resolve) => {
    Modal.warning({
      title: t('skillLib.backupTitle'),
      content: t('skillLib.backupTip'),
      okText: t('commonTable.confirm'),
      hideCancel: true,
      onOk: () => resolve(true)
    })
  })
}

// ---------- 编辑 ----------
const editVisible = ref(false)
const editContent = ref('')
const editing = ref(null)
const editHash = ref('')
const saving = ref(false)
const saveConflict = ref(false)

const editLint = computed(() =>
  editing.value ? lint(editContent.value, editing.value.name) : { errors: [], warnings: [] }
)

async function openEdit(record) {
  await warnBackup()
  editing.value = record
  saveConflict.value = false
  editContent.value = ''
  editVisible.value = true
  await reloadSource()
}

async function reloadSource() {
  if (!editing.value) return
  sourceLoading.value = true
  try {
    const src = await fetchSource(editing.value)
    editContent.value = src?.content || ''
    editHash.value = src?.content_hash || ''
    saveConflict.value = false
  } catch (_) { /* request.js 已弹错 */ }
  finally { sourceLoading.value = false }
}

function errMsg(e) {
  return e?.response?.data?.msg || e?.msg || e?.message || ''
}

async function handleSave(done) {
  const content = editContent.value
  if (editLint.value.errors.length) {
    Message.warning(t('skillLib.lintBlocked'))
    done(false)
    return
  }
  saving.value = true
  try {
    const payload = scopePayload(editing.value, { content, content_hash: editHash.value })
    await saveSkillSource(payload)
    Message.success(t('skillLib.saveOk'))
    // 成功后重拉 hash（乐观锁）
    const src = await fetchSource(editing.value)
    editHash.value = src?.content_hash || ''
    saveConflict.value = false
    done(true)
  } catch (e) {
    // 冲突/校验失败：不清用户已编辑内容，给出「重新加载」入口
    if (/已被其他方式修改|重新加载/.test(errMsg(e))) saveConflict.value = true
    done(false)
  } finally { saving.value = false }
}

// ---------- 新建 ----------
const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive({
  scope: 'system',
  org_name: '',
  dept_id: undefined,
  name: '',
  description: '',
  content: ''
})
let contentTouched = false

// 1042 §5.3 推荐编辑模板
function buildTemplate() {
  const name = createForm.name || 'my-skill'
  const desc = (createForm.description || '').trim().replace(/[。.]$/, '')
  return [
    '---',
    `name: ${name}`,
    `description: ${desc || '<做什么>'}。Use when 用户要求「……」时取用本技能。`,
    'allowed-tools: ',
    'metadata:',
    '  version: "1.0.0"',
    '  author: <团队/人>',
    '  category: <分类>',
    '  owner: <责任人>',
    '  status: draft',
    '  review_date: 2027-01-01',
    '  confidentiality: internal',
    '  tags: <标签1,标签2>',
    '---',
    '',
    `# ${name}（一句话说明）`,
    '',
    '## 何时使用',
    '- ……',
    '',
    '## 操作步骤',
    '1. ……'
  ].join('\n')
}

function openCreate() {
  Object.assign(createForm, {
    scope: isDeptMode.value ? 'dept' : 'system',
    org_name: '',
    dept_id: undefined,
    name: '',
    description: '',
    content: buildTemplate()
  })
  // buildTemplate 依赖 name/description，重置后再生成一次以清掉残留
  createForm.content = buildTemplate()
  contentTouched = false
  createVisible.value = true
  loadDepts()
}

const createLint = computed(() => lint(createForm.content, null))

function syncTemplate() {
  if (!contentTouched) createForm.content = buildTemplate()
}
function onNameInput() { syncTemplate() }
function onDescInput() { syncTemplate() }
function onContentInput() { contentTouched = true }

async function handleCreate(done) {
  if (createForm.scope === 'org' && !createForm.org_name.trim()) {
    Message.warning(t('skillLib.orgNameRequired'))
    done(false)
    return
  }
  if (createForm.scope === 'dept' && !createForm.dept_id) {
    Message.warning(t('skillLib.deptRequired'))
    done(false)
    return
  }
  if (!createForm.name.trim()) { Message.warning(t('skillLib.nameInvalid')); done(false); return }
  if (!NAME_RE.test(createForm.name) || createForm.name.includes('--')) {
    Message.warning(t('skillLib.nameInvalid'))
    done(false)
    return
  }
  if (createLint.value.errors.length) { Message.warning(t('skillLib.lintBlocked')); done(false); return }
  creating.value = true
  try {
    // 技能名取自 content 的 frontmatter name，前端不单独传 name（1042 §3.4）
    const payload = { scope: createForm.scope, content: createForm.content }
    if (createForm.scope === 'org') payload.org_name = createForm.org_name.trim()
    if (createForm.scope === 'dept') payload.dept_id = createForm.dept_id
    await createSkill(payload)
    Message.success(t('skillLib.createOk'))
    done(true)
    await loadList()
  } catch (_) { done(false) }
  finally { creating.value = false }
}

// ---------- 停用 / 恢复 ----------
async function handleDisable(record) {
  try {
    await disableSkill(scopePayload(record))
    Message.success(t('skillLib.disableOk'))
    await loadList()
  } catch (_) { /* request.js 已弹错 */ }
}

async function handleEnable(record) {
  try {
    await enableSkill(scopePayload(record))
    Message.success(t('skillLib.enableOk'))
    await loadList()
  } catch (_) { /* request.js 已弹错 */ }
}

// ---------- 重命名 ----------
const renameVisible = ref(false)
const renaming = ref(false)
const renamingFrom = ref(null)
const renameTarget = ref('')

async function openRename(record) {
  await warnBackup()
  renamingFrom.value = record
  renameTarget.value = ''
  renameVisible.value = true
}

async function handleRename(done) {
  const next = renameTarget.value.trim()
  if (next === renamingFrom.value.name) { Message.warning(t('skillLib.sameName')); done(false); return }
  if (!NAME_RE.test(next) || next.includes('--')) { Message.warning(t('skillLib.nameInvalid')); done(false); return }
  renaming.value = true
  try {
    const payload = scopePayload(renamingFrom.value, { old_name: renamingFrom.value.name, new_name: next })
    delete payload.name
    await renameSkill(payload)
    Message.success(t('skillLib.renameOk'))
    done(true)
    await loadList()
  } catch (_) { done(false) }
  finally { renaming.value = false }
}

onMounted(() => {
  loadList()
  loadDepts()
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
    margin: 0 0 $space-2;
    line-height: 1.7;
  }
}

.help-sub {
  font-weight: 600;
  color: $color-text;
}

.help-pre {
  margin: 0 0 $space-3;
  padding: $space-3;
  background: $color-bg-muted;
  border-radius: $radius;
  font-family: 'JetBrains Mono', monospace;
  font-size: $font-size-xs;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
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

.readonly-hint {
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.source-pre {
  margin: 0;
  max-height: 60vh;
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

.source-editor {
  width: 100%;
  min-height: 46vh;
  padding: $space-3;
  background: $color-bg-muted;
  border: 1px solid $color-border;
  border-radius: $radius;
  font-family: 'JetBrains Mono', monospace;
  font-size: $font-size-xs;
  line-height: 1.7;
  color: $color-text;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: $color-primary;
  }
}

.editor-alert {
  margin-bottom: $space-3;
}

.lint-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.lint-line {
  font-size: $font-size-xs;
  line-height: 1.7;
}

.create-row {
  flex-wrap: wrap;
}
</style>
