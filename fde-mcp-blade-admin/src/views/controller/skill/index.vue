<template>
  <div class="skill-page">
    <!-- 说明区块（107 §一之三，可折叠） -->
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
        <a-space size="small">
          <a-select v-model="filter.scope" style="width: 130px" @change="loadList">
            <a-option value="">{{ t('skillLib.scopeAll') }}</a-option>
            <a-option value="system">{{ t('skillLib.scopeSystem') }}</a-option>
            <a-option value="dept">{{ t('skillLib.scopeDept') }}</a-option>
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
          <a-button v-if="isAdmin" type="primary" @click="openCreate">
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
        size="small"
      >
        <template #columns>
          <a-table-column :title="t('skillLib.colName')" data-index="name" :width="180" />
          <a-table-column :title="t('skillLib.colDesc')" data-index="description" ellipsis />
          <a-table-column :title="t('skillLib.colScope')" :width="130">
            <template #cell="{ record }">
              <a-tag :color="record.scope === 'system' ? 'purple' : 'arcoblue'" size="small">
                {{ record.scope === 'system' ? t('skillLib.scopeSystem') : t('skillLib.scopeDept') }}
              </a-tag>
              <span v-if="record.scope === 'dept'" class="dept-hint">Dept {{ record.dept_id ?? '-' }}</span>
            </template>
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
          <a-table-column :title="t('skillLib.colTools')" :width="90">
            <template #cell="{ record }">{{ (record.allowed_tools || []).length }}</template>
          </a-table-column>
          <a-table-column :title="t('skillLib.colPath')" data-index="dir_path" :width="220" ellipsis />
          <a-table-column :title="t('commonTable.operation')" :width="230" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click="openView(record)">
                {{ t('skillLib.view') }}
              </a-button>
              <template v-if="isAdmin && !record.disabled">
                <a-button type="text" size="mini" @click="openEdit(record)">
                  {{ t('skillLib.edit') }}
                </a-button>
                <a-button type="text" size="mini" @click="openRename(record)">
                  {{ t('skillLib.rename') }}
                </a-button>
                <a-popconfirm
                  :content="t('skillLib.disableConfirm')"
                  position="br"
                  @ok="handleDisable(record)"
                >
                  <a-button type="text" size="mini" status="warning" @click.stop>
                    {{ t('skillLib.disable') }}
                  </a-button>
                </a-popconfirm>
              </template>
              <a-popconfirm
                v-if="isAdmin && record.disabled"
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

    <!-- 查看（只读）弹窗：107 §6.1 所有人可用；接口侧仅管理员（§5.5），非管理员由后端 403 -->
    <a-modal v-model:visible="viewVisible" :title="t('skillLib.viewTitle')" width="720px" :footer="false">
      <a-spin :loading="sourceLoading" style="width: 100%">
        <pre class="source-pre">{{ viewContent || '—' }}</pre>
      </a-spin>
    </a-modal>

    <!-- 编辑弹窗（仅管理员） -->
    <a-modal
      v-model:visible="editVisible"
      :title="t('skillLib.editTitle', { name: editing?.name || '' })"
      width="860px"
      :ok-loading="saving"
      :ok-text="t('skillLib.save')"
      @before-ok="handleSave"
    >
      <a-spin :loading="sourceLoading" style="width: 100%">
        <a-alert v-if="saveConflict" type="warning" class="conflict-alert">
          {{ t('skillLib.saveConflict') }}
          <a-button type="text" size="mini" @click="reloadSource">{{ t('skillLib.reload') }}</a-button>
        </a-alert>
        <textarea
          v-model="editContent"
          class="source-editor"
          spellcheck="false"
          :placeholder="t('skillLib.contentPlaceholder')"
        />
      </a-spin>
    </a-modal>

    <!-- 新建弹窗（仅管理员） -->
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
            <a-radio-group v-model="createForm.scope">
              <a-radio value="system">{{ t('skillLib.scopeSystem') }}</a-radio>
              <a-radio value="dept">{{ t('skillLib.scopeDept') }}</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item v-if="createForm.scope === 'dept'" :label="t('skillLib.formDept')" required>
            <a-select v-model="createForm.dept_id" style="width: 200px">
              <a-option v-for="d in deptList" :key="d.deptId" :value="d.deptId">
                {{ d.deptName }}
              </a-option>
            </a-select>
          </a-form-item>
        </a-space>
        <a-form-item :label="t('skillLib.formName')" required :help="t('skillLib.nameRule')">
          <a-input v-model="createForm.name" :max-length="64" :placeholder="t('skillLib.namePlaceholder')" allow-clear @input="onNameInput" />
        </a-form-item>
        <a-form-item :label="t('skillLib.formDesc')" required>
          <a-input v-model="createForm.description" :placeholder="t('skillLib.descPlaceholder')" allow-clear @input="onDescInput" />
        </a-form-item>
        <a-form-item :label="t('skillLib.formContent')">
          <textarea v-model="createForm.content" class="source-editor" spellcheck="false" @input="onContentInput" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 重命名弹窗（仅管理员） -->
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
import { Message } from '@arco-design/web-vue'
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

const { t } = useI18n()
const userStore = useUserStore()

// 管理员判定（107 D4：仅管理员可写）。role_key='admin' 旁路放行（107 §3.2）；
// mock 场景角色名是「管理员组」，两者都认
const isAdmin = computed(() => {
  const rs = userStore.roles || []
  return rs.includes('admin') || rs.includes('管理员组')
})

// ---------- 列表 ----------
const loading = ref(false)
const list = ref([])
const filter = reactive({ scope: '', disabled: false })
const page = ref(1)
const PAGE_SIZE = 10

const filteredList = computed(() =>
  list.value.filter((s) => (filter.scope ? s.scope === filter.scope : true))
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

// 跨部门允许同名 → (scope, dept_id, name) 三元组做行 key（107 §5.4）
function rowKey(record) {
  return `${record.scope}|${record.dept_id ?? 0}|${record.name}`
}

async function loadList() {
  page.value = 1
  loading.value = true
  try {
    const res = await getSkillList({ disabled: filter.disabled })
    const data = res.data || res
    list.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* request.js 已弹错 */ }
  finally { loading.value = false }
}

// ---------- 部门下拉（新建到部门用，数据源 107 §四：GET /biz/gis_user_dept） ----------
const deptList = ref([])
async function loadDepts() {
  if (!isAdmin.value || deptList.value.length) return
  try {
    const res = await getDeptList()
    const data = res.data || res
    deptList.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* 部门拉取失败不阻断页面 */ }
}

// ---------- 查看（只读） ----------
const viewVisible = ref(false)
const viewContent = ref('')
const sourceLoading = ref(false)

async function fetchSource(record) {
  const payload = { scope: record.scope, name: record.name }
  if (record.scope === 'dept') payload.dept_id = record.dept_id
  const res = await getSkillSource(payload)
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

// ---------- 编辑（仅管理员；content_hash 乐观锁） ----------
const editVisible = ref(false)
const editContent = ref('')
const editing = ref(null)
const editHash = ref('')
const saving = ref(false)
const saveConflict = ref(false)

async function openEdit(record) {
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

// 保存前基础预校验（107 §5.6 建议：最终以后端校验为准）
function preValidate(content) {
  const lines = content.split('\n')
  if ((lines[0] || '').trim() !== '---') return t('skillLib.errFrontmatter')
  const end = lines.indexOf('---', 1)
  if (end === -1) return t('skillLib.errFrontmatter')
  const head = lines.slice(1, end).join('\n')
  if (!/(^|\n)\s*name\s*:/.test(head)) return t('skillLib.errNameMissing')
  if (!/(^|\n)\s*description\s*:/.test(head)) return t('skillLib.errDescMissing')
  if (!lines.slice(end + 1).join('\n').trim()) return t('skillLib.errBodyEmpty')
  return ''
}

async function handleSave(done) {
  const content = editContent.value
  const err = preValidate(content)
  if (err) { Message.warning(err); done(false); return }
  saving.value = true
  try {
    const payload = { scope: editing.value.scope, name: editing.value.name, content, content_hash: editHash.value }
    if (editing.value.scope === 'dept') payload.dept_id = editing.value.dept_id
    await saveSkillSource(payload)
    Message.success(t('skillLib.saveOk'))
    // 成功后重拉 5.5 更新 hash（107 §6.1 保存流程③）
    const src = await fetchSource(editing.value)
    editHash.value = src?.content_hash || ''
    saveConflict.value = false
    done(true)
  } catch (e) {
    // 冲突/校验失败：不清用户已编辑内容（107 §5.6），给出「重新加载」入口
    const msg = e?.message || e?.msg || ''
    if (/已被其他方式修改|重新加载/.test(msg)) saveConflict.value = true
    done(false)
  } finally { saving.value = false }
}

// ---------- 新建（仅管理员） ----------
const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive({ scope: 'system', dept_id: undefined, name: '', description: '', content: '' })
let contentTouched = false

function buildTemplate() {
  return `---\nname: ${createForm.name || 'my-skill'}\ndescription: ${createForm.description || '...'}\nmetadata:\n  version: 1.0.0\n---\n\n# ${createForm.name || '技能标题'}\n`
}

function openCreate() {
  Object.assign(createForm, { scope: 'system', dept_id: undefined, name: '', description: '', content: '' })
  contentTouched = false
  createVisible.value = true
  loadDepts()
}

// name/description 变化时同步模板（用户手动改过正文则不覆盖）
function syncTemplate() {
  if (!contentTouched) createForm.content = buildTemplate()
}

function onNameInput() { syncTemplate() }
function onDescInput() { syncTemplate() }
function onContentInput() { contentTouched = true }

const NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

async function handleCreate(done) {
  if (!NAME_RE.test(createForm.name)) { Message.warning(t('skillLib.nameInvalid')); done(false); return }
  if (!createForm.description.trim()) { Message.warning(t('skillLib.errDescMissing')); done(false); return }
  const err = preValidate(createForm.content)
  if (err) { Message.warning(err); done(false); return }
  creating.value = true
  try {
    const payload = { scope: createForm.scope, content: createForm.content }
    if (createForm.scope === 'dept') {
      if (!createForm.dept_id) { Message.warning(t('skillLib.deptRequired')); done(false); return }
      payload.dept_id = createForm.dept_id
    }
    await createSkill(payload)
    Message.success(t('skillLib.createOk'))
    done(true)
    await loadList()
  } catch (_) { done(false) }
  finally { creating.value = false }
}

// ---------- 停用 / 恢复（仅管理员，不真删） ----------
async function handleDisable(record) {
  try {
    const payload = { scope: record.scope, name: record.name }
    if (record.scope === 'dept') payload.dept_id = record.dept_id
    await disableSkill(payload)
    Message.success(t('skillLib.disableOk'))
    await loadList()
  } catch (_) { /* request.js 已弹错 */ }
}

async function handleEnable(record) {
  try {
    const payload = { scope: record.scope, name: record.name }
    if (record.scope === 'dept') payload.dept_id = record.dept_id
    await enableSkill(payload)
    Message.success(t('skillLib.enableOk'))
    await loadList()
  } catch (_) { /* request.js 已弹错 */ }
}

// ---------- 重命名（仅管理员） ----------
const renameVisible = ref(false)
const renaming = ref(false)
const renamingFrom = ref(null)
const renameTarget = ref('')

function openRename(record) {
  renamingFrom.value = record
  renameTarget.value = ''
  renameVisible.value = true
}

async function handleRename(done) {
  const next = renameTarget.value.trim()
  if (next === renamingFrom.value.name) { Message.warning(t('skillLib.sameName')); done(false); return }
  if (!NAME_RE.test(next)) { Message.warning(t('skillLib.nameInvalid')); done(false); return }
  renaming.value = true
  try {
    const payload = { scope: renamingFrom.value.scope, old_name: renamingFrom.value.name, new_name: next }
    if (renamingFrom.value.scope === 'dept') payload.dept_id = renamingFrom.value.dept_id
    await renameSkill(payload)
    Message.success(t('skillLib.renameOk'))
    done(true)
    await loadList()
  } catch (_) { done(false) }
  finally { renaming.value = false }
}

onMounted(loadList)
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

.dept-hint {
  margin-left: 6px;
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

.conflict-alert {
  margin-bottom: $space-3;
}

.create-row {
  flex-wrap: wrap;
}
</style>
