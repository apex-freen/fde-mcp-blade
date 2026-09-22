<template>
  <div class="tab-inner">
    <a-form layout="vertical" :model="config">
      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item :label="t('ssoConfig.ssoEnabled')">
            <a-switch v-model="config.ssoEnabled" />
            <span class="form-hint">{{ t('ssoConfig.ssoEnabledHint') }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('ssoConfig.localLoginEnabled')">
            <a-switch v-model="config.localLoginEnabled" />
            <span class="form-hint">{{ t('ssoConfig.localLoginEnabledHint') }}</span>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item :label="t('ssoConfig.ssoMode')">
        <a-radio-group v-model="config.ssoMode" type="button">
          <a-radio value="ldap">{{ t('ssoConfig.modeLdap') }}</a-radio>
          <a-radio value="oidc">{{ t('ssoConfig.modeOidc') }}</a-radio>
        </a-radio-group>
        <div class="form-hint">{{ t('ssoConfig.ssoModeHint') }}</div>
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
      ssoEnabled: config.ssoEnabled,
      localLoginEnabled: config.localLoginEnabled,
      ssoMode: config.ssoMode
    })
    Message.success(t('ssoSaveSuccess'))
    await loadConfig()
  } catch (_) {
    // request.js 已自动弹错
  } finally {
    saving.value = false
  }
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
</style>
