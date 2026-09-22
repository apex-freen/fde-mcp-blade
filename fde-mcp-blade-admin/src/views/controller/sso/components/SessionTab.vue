<template>
  <div class="tab-inner">
    <a-alert type="info" class="alert-hint" :content="t('ssoConfig.sessionRefreshHint')" />

    <a-form layout="vertical" :model="config">
      <a-form-item :label="t('ssoConfig.sessionRefreshEnabled')">
        <a-switch v-model="config.sessionRefreshEnabled" />
      </a-form-item>

      <a-form-item :label="t('ssoConfig.sessionRefreshExpireHours')">
        <a-input-number v-model="config.sessionRefreshExpireHours" :min="1" :max="720" style="width: 200px" />
        <span class="form-hint">{{ t('ssoConfig.sessionRefreshExpireHoursHint') }}</span>
      </a-form-item>
    </a-form>

    <a-space class="tab-footer">
      <a-button type="primary" :loading="saving" @click="handleSave">
        {{ t('commonTable.save') }}
      </a-button>
    </a-space>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { updateSsoConfig } from '@/api/modules/sso'

const { t } = useI18n()
const config = inject('ssoConfig')
const loadConfig = inject('loadSsoConfig')
const saving = ref(false)

async function handleSave() {
  saving.value = true
  try {
    await updateSsoConfig({
      sessionRefreshEnabled: config.sessionRefreshEnabled,
      sessionRefreshExpireHours: config.sessionRefreshExpireHours
    })
    Message.success(t('ssoSaveSuccess'))
    await loadConfig()
  } catch (_) { /* request.js 已弹错 */ }
  finally { saving.value = false }
}
</script>

<style lang="scss" scoped>
.tab-inner {
  padding: 16px 0 0;
}
.form-hint {
  display: block;
  margin-top: 4px;
  color: $color-text-tertiary;
  font-size: 12px;
}
.tab-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid $color-border;
}
.alert-hint {
  margin-bottom: 16px;
}
</style>
