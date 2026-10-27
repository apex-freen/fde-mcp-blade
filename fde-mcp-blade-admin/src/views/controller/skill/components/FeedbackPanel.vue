<template>
  <!-- 1075 §六：技能反馈（列表 / 筛选 / 处理 / 转草稿） -->
  <a-card :bordered="false">
    <div class="table-toolbar">
      <a-space size="small" wrap>
        <a-select v-model="filter.family" style="width: 140px" @change="applyFilter">
          <a-option value="">{{ t('skillLib.fbFamilyAll') }}</a-option>
          <a-option value="business">{{ t('skillLib.fbFamilyBusiness') }}</a-option>
          <a-option value="plugin">{{ t('skillLib.fbFamilyPlugin') }}</a-option>
        </a-select>
        <a-select v-model="filter.scope" style="width: 130px" @change="applyFilter">
          <a-option value="">{{ t('skillLib.fbScopeAll') }}</a-option>
          <a-option value="org">{{ t('skillLib.scopeOrg') }}</a-option>
          <a-option value="dept">{{ t('skillLib.scopeDept') }}</a-option>
          <a-option value="user">{{ t('skillLib.fbScopeUser') }}</a-option>
          <a-option value="plugin">{{ t('skillLib.fbScopePlugin') }}</a-option>
          <a-option value="workflow">{{ t('skillLib.fbScopeWorkflow') }}</a-option>
        </a-select>
        <a-select v-model="filter.status" style="width: 130px" @change="applyFilter">
          <a-option value="">{{ t('skillLib.fbStatusAll') }}</a-option>
          <a-option value="open">{{ t('skillLib.fbStatusOpen') }}</a-option>
          <a-option value="handled">{{ t('skillLib.fbStatusHandled') }}</a-option>
          <a-option value="ignored">{{ t('skillLib.fbStatusIgnored') }}</a-option>
        </a-select>
        <a-input
          v-model="filter.skillName"
          style="width: 180px"
          :placeholder="t('skillLib.fbSkillNamePlaceholder')"
          allow-clear
          @press-enter="applyFilter"
          @clear="applyFilter"
        />
        <a-button @click="applyFilter">{{ t('commonTable.search') }}</a-button>
        <a-button @click="resetFilter">{{ t('commonTable.reset') }}</a-button>
      </a-space>
      <a-button :loading="loading" @click="loadList">
        <template #icon><icon-refresh /></template>
        {{ t('commonTable.refresh') }}
      </a-button>
    </div>

    <a-table
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      row-key="feedback_id"
      :bordered="false"
      :scroll="{ x: '100%' }"
      size="small"
    >
      <template #columns>
        <a-table-column title="ID" data-index="feedback_id" :width="70" />
        <a-table-column :title="t('skillLib.colName')" :width="160" ellipsis>
          <template #cell="{ record }">
            <span>{{ record.skill_name }}</span>
            <a-tag :color="scopeColor(record.skill_scope)" size="small" class="fb-tag">
              {{ scopeText(record.skill_scope) }}
            </a-tag>
            <span v-if="record.skill_scope === 'dept'" class="sub-hint">{{ deptLabel(record.dept_id) }}</span>
          </template>
        </a-table-column>
        <a-table-column :title="t('skillLib.fbType')" :width="110">
          <template #cell="{ record }">
            <a-tag :color="typeColor(record.feedback_type)" size="small">{{ typeText(record.feedback_type) }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column :title="t('skillLib.fbDetail')" data-index="detail" ellipsis />
        <a-table-column :title="t('skillLib.fbUser')" data-index="user_name" :width="110" />
        <a-table-column :title="t('skillLib.fbTime')" data-index="created_time" :width="170" />
        <a-table-column :title="t('skillLib.fbStatus')" :width="100">
          <template #cell="{ record }">
            <a-tag :color="statusColor(record.status)" size="small">{{ statusText(record.status) }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column :title="t('skillLib.fbHandledBy')" :width="120">
          <template #cell="{ record }">{{ record.handled_by || '-' }}</template>
        </a-table-column>
        <a-table-column :title="t('skillLib.fbHandleNote')" :width="160" ellipsis>
          <template #cell="{ record }">{{ record.handle_note || '-' }}</template>
        </a-table-column>
        <a-table-column :title="t('commonTable.operation')" :width="150" fixed="right">
          <template #cell="{ record }">
            <a-button type="text" size="mini" @click="openHandle(record)">{{ t('skillLib.fbHandle') }}</a-button>
            <a-button
              v-if="canConvert(record)"
              type="text"
              size="mini"
              @click="openConvert(record)"
            >
              {{ t('skillLib.fbConvert') }}
            </a-button>
          </template>
        </a-table-column>
      </template>
      <template #empty>
        <a-empty :description="t('skillLib.fbEmpty')" />
      </template>
    </a-table>

    <!-- 处理反馈 -->
    <a-modal
      v-model:visible="handleVisible"
      :title="t('skillLib.fbHandleTitle')"
      :ok-loading="handling"
      :ok-text="t('skillLib.fbHandle')"
      @before-ok="submitHandle"
    >
      <a-form layout="vertical">
        <a-form-item :label="t('skillLib.fbHandleStatus')" required>
          <a-radio-group v-model="handleForm.status">
            <a-radio value="handled">{{ t('skillLib.fbStatusHandled') }}</a-radio>
            <a-radio value="ignored">{{ t('skillLib.fbStatusIgnored') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="t('skillLib.fbHandleNote')">
          <a-input v-model="handleForm.note" :max-length="255" show-word-limit allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 转草稿：以线上正文为底稿，创建成功后把反馈标记为已处理 -->
    <DraftEditorModal
      v-model:visible="convertVisible"
      :skill="convertSkill"
      :draft="null"
      :initial-content="convertContent"
      :initial-note="convertNote"
      @saved="onDraftSaved"
    />
  </a-card>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { getDeptList } from '@/api/modules/gisUserDept'
import {
  getSkillList,
  getSkillSource,
  getSkillFeedbackList,
  handleSkillFeedback
} from '@/api/modules/gisSkill'
import DraftEditorModal from './DraftEditorModal.vue'

const { t } = useI18n()

const SCOPE_COLORS = { org: 'cyan', dept: 'arcoblue', user: 'gray', plugin: 'purple', workflow: 'orange' }
const SCOPE_TEXTS = {
  org: 'skillLib.scopeOrg',
  dept: 'skillLib.scopeDept',
  user: 'skillLib.fbScopeUser',
  plugin: 'skillLib.fbScopePlugin',
  workflow: 'skillLib.fbScopeWorkflow'
}
const TYPE_COLORS = { stale: 'orange', tool_missing: 'red', permission: 'purple', other: 'gray' }
const TYPE_TEXTS = {
  stale: 'skillLib.fbTypeStale',
  tool_missing: 'skillLib.fbTypeToolMissing',
  permission: 'skillLib.fbTypePermission',
  other: 'skillLib.fbTypeOther'
}
const STATUS_COLORS = { open: 'orange', handled: 'green', ignored: 'gray' }
const STATUS_TEXTS = {
  open: 'skillLib.fbStatusOpen',
  handled: 'skillLib.fbStatusHandled',
  ignored: 'skillLib.fbStatusIgnored'
}

function scopeColor(s) { return SCOPE_COLORS[s] || 'gray' }
function scopeText(s) { return t(SCOPE_TEXTS[s] || 'skillLib.scopeUnknown') }
function typeColor(v) { return TYPE_COLORS[v] || 'gray' }
function typeText(v) { return t(TYPE_TEXTS[v] || 'skillLib.fbTypeOther') }
function statusColor(v) { return STATUS_COLORS[v] || 'gray' }
function statusText(v) { return t(STATUS_TEXTS[v] || 'skillLib.fbStatusOpen') }

// ---------- 部门名称 ----------
const deptList = ref([])
function deptLabel(id) {
  const d = deptList.value.find(x => x.deptId === id)
  return d ? d.deptName : `Dept ${id ?? '-'}`
}
async function loadDepts() {
  try {
    const res = await getDeptList({ showError: false })
    const data = res?.data ?? res
    deptList.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) {
    // 部门下拉失败不阻断页面
  }
}

// ---------- 列表 ----------
const filter = reactive({ family: '', scope: '', status: '', skillName: '' })
const rows = ref([])
const total = ref(0)
const page = ref(1)
const PAGE_SIZE = 20
const loading = ref(false)

const pagination = computed(() => ({
  total: total.value,
  current: page.value,
  pageSize: PAGE_SIZE,
  showTotal: true,
  onChange: (v) => { page.value = v; loadList() }
}))

function applyFilter() {
  page.value = 1
  loadList()
}

function resetFilter() {
  filter.family = ''
  filter.scope = ''
  filter.status = ''
  filter.skillName = ''
  applyFilter()
}

async function loadList() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: PAGE_SIZE }
    if (filter.family) params.family = filter.family
    if (filter.scope) params.scope = filter.scope
    if (filter.status) params.status = filter.status
    if (filter.skillName.trim()) params.skill_name = filter.skillName.trim()
    const res = await getSkillFeedbackList(params)
    const data = res?.data || res
    rows.value = data?.rows || []
    total.value = data?.total || 0
  } catch (_) {
    // request.js 已弹错
  } finally {
    loading.value = false
  }
}

// ---------- 处理 ----------
const handleVisible = ref(false)
const handling = ref(false)
const handleTarget = ref(null)
const handleForm = reactive({ status: 'handled', note: '' })

function openHandle(record) {
  handleTarget.value = record
  handleForm.status = 'handled'
  handleForm.note = ''
  handleVisible.value = true
}

async function submitHandle(done) {
  if (!handleTarget.value) {
    done(false)
    return
  }
  handling.value = true
  try {
    await handleSkillFeedback({
      feedback_id: handleTarget.value.feedback_id,
      status: handleForm.status,
      handle_note: handleForm.note
    })
    Message.success(t('skillLib.fbHandleOk'))
    done(true)
    await loadList()
  } catch (_) {
    done(false)
  } finally {
    handling.value = false
  }
}

// ---------- 转草稿 ----------
// 1075 §6.3：org/dept 可转；plugin/workflow/user 不可转
function canConvert(record) {
  return record.skill_scope === 'org' || record.skill_scope === 'dept'
}

const convertVisible = ref(false)
const convertSkill = ref(null)
const convertContent = ref('')
const convertNote = ref('')
const convertRecord = ref(null)

function toList(res) {
  const data = res?.data ?? res
  return Array.isArray(data) ? data : (data?.list || [])
}

async function openConvert(record) {
  let orgName = ''
  if (record.skill_scope === 'org') {
    // 反馈表只存 skill_scope / dept_id，没有 org_name → 从技能列表按 name 反查
    const list = toList(await getSkillList({ scope: 'org' }))
    const hit = list.find(s => s.scope === 'org' && s.name === record.skill_name)
    if (!hit?.org_name) {
      Message.warning(t('skillLib.fbOrgNotFound'))
      return
    }
    orgName = hit.org_name
  }
  const payload = { scope: record.skill_scope, name: record.skill_name }
  if (record.skill_scope === 'dept') payload.dept_id = record.dept_id
  if (record.skill_scope === 'org') payload.org_name = orgName
  try {
    const src = await getSkillSource(payload)
    const content = (src?.data || src)?.content || ''
    convertRecord.value = record
    convertSkill.value = payload
    convertContent.value = `${content}\n\n<!-- 技能反馈 #${record.feedback_id}: ${record.detail || ''} -->\n`
    convertNote.value = `feedback:${record.feedback_id}`
    convertVisible.value = true
  } catch (_) {
    // request.js 已弹错
  }
}

async function onDraftSaved(result) {
  const record = convertRecord.value
  if (!record) return
  try {
    await handleSkillFeedback({
      feedback_id: record.feedback_id,
      status: 'handled',
      handle_note: `feedback -> draft ${result?.draft_id || ''}`.trim()
    })
    Message.success(t('skillLib.fbConvertOk'))
    await loadList()
  } catch (_) {
    // 草稿已创建，反馈标记失败只提示，由用户手动再处理
  }
}

onMounted(() => {
  loadList()
  loadDepts()
})
</script>

<style lang="scss" scoped>
.table-toolbar {
  margin-bottom: $space-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  flex-wrap: wrap;
}

.fb-tag {
  margin-left: 6px;
}

.sub-hint {
  margin-left: 6px;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}
</style>
