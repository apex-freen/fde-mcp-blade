<template>
  <a-modal
    :visible="visible"
    :title="$t('message.channelConfigTitle')"
    :ok-text="$t('commonTable.save')"
    :cancel-text="$t('commonTable.cancel')"
    :on-before-ok="handleBeforeOk"
    unmount-on-close
    @update:visible="handleVisibleUpdate"
  >
    <a-spin :loading="loading" style="width: 100%">
      <a-alert v-if="!loading && currentInvalid" type="warning" style="margin-bottom: 16px">
        {{ invalidReason }}
      </a-alert>

      <div class="form-label">{{ $t('message.channelConfig') }}</div>
      <a-select v-model="selected" :placeholder="$t('message.channelPlaceholder')" style="width: 100%">
        <!-- 空字符串 = 不启用通知（正常状态，不是「关闭告警」） -->
        <a-option value="">{{ $t('message.channelNone') }}</a-option>
        <a-option
          v-for="ch in channels"
          :key="ch.plugin"
          :value="ch.plugin"
          :disabled="!ch.available"
        >
          {{ ch.title }}<span v-if="!ch.available" class="option-reason">（{{ ch.reason }}）</span>
        </a-option>
      </a-select>
      <div class="form-hint">{{ $t('message.channelNoneHint') }}</div>

      <a-empty v-if="!loading && channels.length === 0" :description="$t('message.channelEmpty')" />
    </a-spin>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible'])

const { t } = useI18n()

const loading = ref(false)
// 当前配置值（空字符串 = 未启用通知）
const current = ref('')
const currentInvalid = ref(false)
// 候选项来自后端运行时探测，前端不硬编码
const channels = ref([])
// 表单选中值（提交用 plugin）
const selected = ref('')

const invalidReason = computed(() => {
  const matched = channels.value.find(ch => ch.plugin === current.value)
  return matched?.reason
    ? t('message.channelInvalid', { reason: matched.reason })
    : t('message.channelInvalidGeneric')
})

function handleVisibleUpdate(val) {
  emit('update:visible', val)
}

async function fetchOptions() {
  loading.value = true
  try {
    const res = await api.gisMessage.getChannelOptions()
    const data = res?.data || res || {}
    current.value = data.current || ''
    currentInvalid.value = data.current_valid === false
    channels.value = data.channels || []
    selected.value = data.current || ''
  } catch (e) {
    console.error('获取通知插件配置失败:', e)
  } finally {
    loading.value = false
  }
}

// 保存失败返回 false，保持弹窗打开并由后端 msg 提示具体原因
async function handleBeforeOk() {
  try {
    await api.gisMessage.updateChannel(selected.value || '')
    Message.success(t('message.channelSaveSuccess'))
    return true
  } catch {
    return false
  }
}

watch(
  () => props.visible,
  val => {
    if (val) fetchOptions()
  }
)
</script>

<style lang="scss" scoped>
.form-label {
  margin-bottom: 8px;
  color: var(--color-text-1);
  font-weight: 600;
}

.form-hint {
  margin-top: 8px;
  color: var(--color-text-3);
  font-size: 12px;
  line-height: 1.6;
}

.option-reason {
  color: var(--color-text-3);
  font-size: 12px;
}
</style>
