<template>
  <div class="tab-inner">
    <a-alert v-if="!config.ssoEnabled || config.ssoMode !== 'oidc'" type="warning" class="alert-hint">
      {{ t('ssoConfig.oidcDisabledHint') }}
    </a-alert>

    <a-form layout="vertical" :model="config">
      <a-form-item :label="t('ssoConfig.oidcEnabled')">
        <a-switch v-model="config.oidcEnabled" />
      </a-form-item>

      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item :label="t('ssoConfig.oidcClientId')" required>
            <a-input v-model="config.oidcClientId" :placeholder="t('ssoConfig.oidcClientIdPlaceholder')" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="t('ssoConfig.oidcClientSecret')">
            <a-input-password
              v-model="config.oidcClientSecret"
              :placeholder="config.oidcClientSecretSet ? t('ssoConfig.oidcClientSecretChangePlaceholder') : t('ssoConfig.oidcClientSecretPlaceholder')"
            />
            <span class="form-hint">
              {{ config.oidcClientSecretSet
                ? t('ssoConfig.oidcClientSecretSetHint')
                : t('ssoConfig.oidcClientSecretNotSetHint') }}
            </span>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item :label="t('ssoConfig.oidcDiscoveryUrl')" required>
        <a-input v-model="config.oidcDiscoveryUrl" :placeholder="t('ssoConfig.oidcDiscoveryUrlPlaceholder')" />
        <span class="form-hint">{{ t('ssoConfig.oidcDiscoveryUrlHint') }}</span>
      </a-form-item>

      <a-row :gutter="24">
        <a-col :span="8">
          <a-form-item :label="t('ssoConfig.oidcScope')">
            <a-input v-model="config.oidcScope" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item :label="t('ssoConfig.oidcUsernameClaim')">
            <a-input v-model="config.oidcUsernameClaim" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item :label="t('ssoConfig.oidcRedirectUri')">
            <a-input v-model="config.oidcRedirectUri" :placeholder="t('ssoConfig.oidcRedirectUriPlaceholder')" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <a-space class="tab-footer">
      <a-button type="primary" :loading="saving" @click="handleSave">
        {{ t('commonTable.save') }}
      </a-button>
      <a-button :loading="testing" @click="handleTest">
        {{ t('ssoConfig.testConnection') }}
      </a-button>
    </a-space>

    <!-- OIDC 测试结果：结构化 Discovery 响应 -->
    <div v-if="testResult" class="test-result" :class="{ success: testResult.success, error: !testResult.success }">
      <template v-if="testResult.success">
        <icon-check-circle class="result-icon success" />
        <strong>{{ t('ssoConfig.oidcTestSuccess') }}</strong>
        <a-descriptions :column="1" size="small" bordered class="desc-list">
          <a-descriptions-item :label="t('ssoConfig.issuer')">{{ testResult.data?.issuer }}</a-descriptions-item>
          <a-descriptions-item :label="t('ssoConfig.authorizationEndpoint')">{{ testResult.data?.authorization_endpoint }}</a-descriptions-item>
          <a-descriptions-item :label="t('ssoConfig.tokenEndpoint')">{{ testResult.data?.token_endpoint }}</a-descriptions-item>
          <a-descriptions-item :label="t('ssoConfig.jwksUri')">{{ testResult.data?.jwks_uri }}</a-descriptions-item>
          <a-descriptions-item :label="t('ssoConfig.jwksKeysCount')">{{ testResult.data?.jwks_keys_count }}</a-descriptions-item>
          <a-descriptions-item v-if="testResult.data?.end_session_endpoint" :label="t('ssoConfig.endSessionEndpoint')">
            {{ testResult.data.end_session_endpoint }}
          </a-descriptions-item>
        </a-descriptions>
      </template>
      <template v-else>
        <icon-close-circle class="result-icon error" />
        <strong>{{ t('ssoConfig.testFailed') }}</strong>
        <div class="error-msg">{{ testResult.message }}</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { updateSsoConfig, testSsoConfig } from '@/api/modules/sso'

const { t } = useI18n()
const config = inject('ssoConfig')
const loadConfig = inject('loadSsoConfig')
const saving = ref(false)
const testing = ref(false)
const testResult = ref(null)

async function handleSave() {
  saving.value = true
  try {
    await updateSsoConfig({
      oidcEnabled: config.oidcEnabled,
      oidcClientId: config.oidcClientId,
      oidcClientSecret: config.oidcClientSecret || undefined, // 空串=保持不变
      oidcDiscoveryUrl: config.oidcDiscoveryUrl,
      oidcScope: config.oidcScope,
      oidcUsernameClaim: config.oidcUsernameClaim,
      oidcRedirectUri: config.oidcRedirectUri
    })
    Message.success(t('ssoSaveSuccess'))
    config.oidcClientSecret = '' // 清空密码框（不影响后端已存值）
    await loadConfig()
  } catch (_) { /* request.js 已弹错 */ }
  finally { saving.value = false }
}

async function handleTest() {
  testing.value = true
  testResult.value = null
  try {
    const res = await testSsoConfig({
      target: 'oidc',
      config: {
        oidcClientId: config.oidcClientId,
        oidcClientSecret: config.oidcClientSecret || undefined,
        oidcDiscoveryUrl: config.oidcDiscoveryUrl
      }
    })
    // OIDC 测试响应：data 为 OidcDiscoveryResult 结构化对象（Doc 19 §1.5）
    testResult.value = { success: res.code === 200, data: res.data, message: '' }
  } catch (err) {
    testResult.value = { success: false, message: err?.msg || t('ssoConfig.testFailed'), data: null }
  } finally { testing.value = false }
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
.test-result {
  margin-top: 12px;
  padding: 16px;
  border-radius: $radius-sm;

  &.success {
    background: $color-bg-muted;

    .result-icon.success { color: $color-success; }
  }
  &.error {
    background: #FFECE8;
    color: $color-danger;

    .result-icon.error { color: $color-danger; }
  }
  .result-icon {
    margin-right: 8px;
    font-size: 16px;
  }
  .desc-list {
    margin-top: 12px;
    background: $color-bg-card;
  }
  .error-msg {
    margin-top: 8px;
    font-size: $font-size-sm;
    word-break: break-all;
  }
}
</style>
