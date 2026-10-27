<template>
  <!-- 1075 §四：技能草稿区（只放未发布内容，发布后才影响线上技能） -->
  <a-drawer
    v-model:visible="innerVisible"
    :width="720"
    :title="t('skillLib.draftTitle', { name: skill?.name || '' })"
    :footer="false"
  >
    <div class="draft-toolbar">
      <span class="audience">{{ t('skillLib.draftAudience', { count: audienceCount }) }}</span>
      <a-button type="primary" size="small" :loading="creating" @click="openCreate">
        <template #icon><icon-plus /></template>
        {{ t('skillLib.draftNew') }}
      </a-button>
    </div>

    <a-spin :loading="loading" style="width: 100%">
      <a-empty v-if="!drafts.length" :description="t('skillLib.draftEmpty')" />
      <div v-else class="draft-list">
        <div v-for="d in drafts" :key="d.draft_id" class="draft-item">
          <div class="draft-head">
            <span class="draft-id">{{ d.draft_id }}</span>
            <a-tag v-if="d.base_changed" color="red" size="small">
              {{ t('skillLib.draftBaseChanged') }}
            </a-tag>
            <a-tag v-else-if="!d.base_exists" color="orange" size="small">
              {{ t('skillLib.draftBaseMissing') }}
            </a-tag>
          </div>
          <div class="draft-note">{{ d.note || '-' }}</div>
          <div class="draft-meta">
            {{ t('skillLib.draftCreatedBy') }}: {{ d.created_by || '-' }}
            · {{ t('skillLib.draftUpdatedBy') }}: {{ d.updated_by || '-' }}
            · {{ d.updated_time || '-' }}
          </div>
          <a-alert v-if="d.base_changed" type="error" class="draft-warn">
            {{ t('skillLib.draftBaseChangedTip') }}
          </a-alert>
          <a-space size="mini" wrap>
            <a-button size="mini" @click="openView(d)">{{ t('skillLib.draftView') }}</a-button>
            <a-button size="mini" @click="openEdit(d)">{{ t('skillLib.draftEdit') }}</a-button>
            <a-button
              size="mini"
              type="primary"
              :disabled="d.base_changed"
              @click="openPublish(d)"
            >
              {{ t('skillLib.draftPublish') }}
            </a-button>
            <a-button v-if="d.base_changed" size="mini" @click="openRebase">
              {{ t('skillLib.draftRebase') }}
            </a-button>
            <a-button size="mini" status="danger" @click="confirmDiscard(d)">
              {{ t('skillLib.draftDiscard') }}
            </a-button>
          </a-space>
        </div>
      </div>
    </a-spin>

    <!-- 正文查看 -->
    <a-modal v-model:visible="viewVisible" :title="t('skillLib.draftViewTitle')" width="720px" :footer="false">
      <a-spin :loading="viewLoading" style="width: 100%">
        <pre class="source-pre">{{ viewContent || '—' }}</pre>
      </a-spin>
    </a-modal>

    <!-- 发布确认：展示影响人数 / 备注 / 创建人 / 更新时间 -->
    <a-modal
      v-model:visible="publishVisible"
      :title="t('skillLib.draftPublishTitle')"
      :ok-loading="publishing"
      :ok-text="t('skillLib.draftPublish')"
      :ok-button-props="{ disabled: !!publishTarget?.base_changed }"
      @before-ok="handlePublish"
    >
      <div class="publish-line">
        {{ t('skillLib.draftPublishAudience', { count: audienceCount }) }}
      </div>
      <div class="publish-line">{{ t('skillLib.draftNote') }}: {{ publishTarget?.note || '-' }}</div>
      <div class="publish-line">
        {{ t('skillLib.draftCreatedBy') }}: {{ publishTarget?.created_by || '-' }}
        · {{ t('skillLib.draftUpdated') }}: {{ publishTarget?.updated_time || '-' }}
      </div>
      <a-alert v-if="publishTarget?.base_changed" type="error" class="draft-warn">
        {{ t('skillLib.draftBaseChangedTip') }}
      </a-alert>
    </a-modal>

    <!-- 新建 / 修订草稿 -->
    <DraftEditorModal
      v-model:visible="editorVisible"
      :skill="skill"
      :draft="editorDraft"
      :initial-content="editorContent"
      :initial-note="editorNote"
      @saved="loadDrafts"
    />
  </a-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import {
  getSkillSource,
  getSkillDraftList,
  getSkillDraftSource,
  publishSkillDraft,
  discardSkillDraft
} from '@/api/modules/gisSkill'
import DraftEditorModal from './DraftEditorModal.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 技能行：{ scope, dept_id?, org_name?, name }
  skill: { type: Object, default: null }
})
const emit = defineEmits(['update:visible', 'published'])

const { t } = useI18n()

const innerVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const loading = ref(false)
const creating = ref(false)
const drafts = ref([])
const audienceCount = ref(0)

// 1075 §2.3：scope 专属字段必须显式传，不从当前登录人隐式推断
function skillPayload(extra = {}) {
  const p = { scope: props.skill?.scope, name: props.skill?.name, ...extra }
  if (props.skill?.scope === 'dept') p.dept_id = props.skill.dept_id
  if (props.skill?.scope === 'org') p.org_name = props.skill.org_name
  return p
}

async function loadDrafts() {
  if (!props.skill) return
  loading.value = true
  try {
    const res = await getSkillDraftList(skillPayload())
    const data = res?.data || res
    drafts.value = data?.drafts || []
    audienceCount.value = data?.audience_count ?? 0
  } catch (_) {
    // request.js 已弹错
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (v) => { if (v) loadDrafts() }
)
watch(
  () => props.skill,
  () => { if (props.visible) loadDrafts() }
)

// ---------- 新建 / 基于最新线上新建 ----------
async function openCreate() {
  if (!props.skill) return
  creating.value = true
  try {
    const src = await getSkillSource(skillPayload())
    editorDraft.value = null
    editorContent.value = src?.content || ''
    editorNote.value = ''
    editorVisible.value = true
  } catch (_) {
    // request.js 已弹错
  } finally {
    creating.value = false
  }
}

function openRebase() {
  openCreate()
}

// ---------- 查看 / 修订 ----------
const viewVisible = ref(false)
const viewLoading = ref(false)
const viewContent = ref('')

async function openView(draft) {
  viewVisible.value = true
  viewContent.value = ''
  viewLoading.value = true
  try {
    const res = await getSkillDraftSource(skillPayload({ draft_id: draft.draft_id }))
    viewContent.value = (res?.data || res)?.content || ''
  } catch (_) {
    viewVisible.value = false
  } finally {
    viewLoading.value = false
  }
}

const editorVisible = ref(false)
const editorDraft = ref(null)
const editorContent = ref('')
const editorNote = ref('')

async function openEdit(draft) {
  try {
    const res = await getSkillDraftSource(skillPayload({ draft_id: draft.draft_id }))
    editorDraft.value = draft
    editorContent.value = (res?.data || res)?.content || ''
    editorNote.value = draft.note || ''
    editorVisible.value = true
  } catch (_) {
    // request.js 已弹错
  }
}

// ---------- 发布 ----------
const publishVisible = ref(false)
const publishing = ref(false)
const publishTarget = ref(null)

function openPublish(draft) {
  if (draft.base_changed) return
  publishTarget.value = draft
  publishVisible.value = true
}

async function handlePublish(done) {
  if (!publishTarget.value) {
    done(false)
    return
  }
  publishing.value = true
  try {
    const res = await publishSkillDraft(skillPayload({ draft_id: publishTarget.value.draft_id }))
    const data = res?.data || res
    Message.success(t('skillLib.draftPublishOk', { count: data?.audience_count ?? audienceCount.value }))
    done(true)
    emit('published')
    await loadDrafts()
  } catch (_) {
    // 409 基线变化等由 request.js 展示 msg；不自动重试
    done(false)
  } finally {
    publishing.value = false
  }
}

// ---------- 丢弃 ----------
function confirmDiscard(draft) {
  Modal.warning({
    title: t('skillLib.draftDiscard'),
    content: t('skillLib.draftDiscardConfirm'),
    okText: t('skillLib.draftDiscard'),
    cancelText: t('commonTable.cancel'),
    onOk: async () => {
      try {
        await discardSkillDraft(skillPayload({ draft_id: draft.draft_id }))
        Message.success(t('skillLib.draftDiscardOk'))
        await loadDrafts()
      } catch (_) {
        // request.js 已弹错
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.draft-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  margin-bottom: $space-3;
}

.audience {
  color: $color-text-secondary;
  font-size: $font-size-xs;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.draft-item {
  padding: $space-3;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-bg-muted;
}

.draft-head {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-2;
}

.draft-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: $font-size-xs;
  color: $color-text-secondary;
}

.draft-note {
  font-size: $font-size-sm;
  color: $color-text;
  margin-bottom: $space-2;
  word-break: break-word;
}

.draft-meta {
  font-size: $font-size-xs;
  color: $color-text-tertiary;
  margin-bottom: $space-2;
}

.draft-warn {
  margin-bottom: $space-2;
}

.publish-line {
  margin-bottom: $space-2;
  font-size: $font-size-sm;
  color: $color-text;
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
</style>
