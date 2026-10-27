<template>
  <!-- 1075 §4.4：草稿编辑器（新建不传 draft_id；修订必须带 draft_id + content_hash） -->
  <a-modal
    v-model:visible="innerVisible"
    :title="draft ? t('skillLib.draftEditTitle') : t('skillLib.draftCreateTitle')"
    width="860px"
    :ok-loading="saving"
    :ok-text="t('skillLib.save')"
    @before-ok="handleSave"
  >
    <a-form :model="form" layout="vertical">
      <a-form-item :label="t('skillLib.draftNote')" :help="t('skillLib.draftNoteHint')">
        <a-input v-model="form.note" :max-length="500" show-word-limit allow-clear />
      </a-form-item>
      <a-form-item :label="t('skillLib.formContent')">
        <textarea
          v-model="form.content"
          class="source-editor"
          spellcheck="false"
          :placeholder="t('skillLib.contentPlaceholder')"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { saveSkillDraft } from '@/api/modules/gisSkill'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // { scope, dept_id?, org_name?, name }
  skill: { type: Object, default: null },
  // 修订时传草稿元数据；新建传 null
  draft: { type: Object, default: null },
  initialContent: { type: String, default: '' },
  initialNote: { type: String, default: '' }
})
const emit = defineEmits(['update:visible', 'saved'])

const { t } = useI18n()

const innerVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const form = reactive({ content: '', note: '' })
const saving = ref(false)

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    form.content = props.initialContent || ''
    form.note = props.initialNote || ''
  }
)

async function handleSave(done) {
  if (!props.skill) {
    done(false)
    return
  }
  saving.value = true
  try {
    const payload = {
      scope: props.skill.scope,
      name: props.skill.name,
      content: form.content,
      note: form.note
    }
    if (props.skill.scope === 'dept') payload.dept_id = props.skill.dept_id
    if (props.skill.scope === 'org') payload.org_name = props.skill.org_name
    // 修订：必须回传 draft_id + 当前 content_hash（乐观锁）
    if (props.draft) {
      payload.draft_id = props.draft.draft_id
      payload.content_hash = props.draft.content_hash
    }
    const res = await saveSkillDraft(payload)
    Message.success(t('skillLib.draftSaveOk'))
    done(true)
    emit('saved', res?.data || res)
  } catch (_) {
    // request.js 已展示后端 msg（含 400 lint / 409 冲突）
    done(false)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.source-editor {
  width: 100%;
  min-height: max(160px, calc(80vh - 330px));
  max-height: 60vh;
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
</style>
