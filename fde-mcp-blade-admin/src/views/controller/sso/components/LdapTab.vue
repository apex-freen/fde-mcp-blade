<template>
  <div class="tab-inner">
    <a-alert v-if="!config.ssoEnabled || config.ssoMode !== 'ldap'" type="warning" class="alert-hint">
      {{ t('ssoConfig.ldapDisabledHint') }}
    </a-alert>

    <a-form layout="vertical" :model="config">
      <a-row :gutter="24">
        <a-col :span="12">
          <a-form-item :label="t('ssoConfig.ldapUrl')" required>
            <a-input
              v-model="config.ldapUrl"
              :placeholder="t('ssoConfig.ldapUrlPlaceholder')"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item :label="t('ssoConfig.ldapTimeoutSecs')">
            <a-input-number v-model="config.ldapTimeoutSecs" :min="3" :max="60" style="width: 100%" />
            <span class="form-hint">{{ t('ssoConfig.ldapTimeoutUnit') }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item :label="t('ssoConfig.ldapStarttls')">
            <a-switch v-model="config.ldapStarttls" />
            <span class="form-hint">{{ t('ssoConfig.ldapStarttlsHint') }}</span>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item :label="t('ssoConfig.ldapBaseDn')" required>
        <a-input v-model="config.ldapBaseDn" :placeholder="t('ssoConfig.ldapBaseDnPlaceholder')" />
      </a-form-item>

      <a-form-item :label="t('ssoConfig.ldapUserDnTemplate')" required>
        <!-- 格式串为语言无关的配置模板，直接写死；放进 i18n 会被 {0} / @ 触发消息语法错误 -->
        <a-input v-model="config.ldapUserDnTemplate" placeholder="{0}@corp.com" />
        <span class="form-hint">
          <code>{0}</code>
          {{ t('ssoConfig.ldapUserDnTemplateHint') }}
        </span>
      </a-form-item>

      <a-row :gutter="24">
        <a-col :span="8">
          <a-form-item :label="t('ssoConfig.ldapFetchGroups')">
            <a-switch v-model="config.ldapFetchGroups" />
            <span class="form-hint">{{ t('ssoConfig.ldapFetchGroupsHint') }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item :label="t('ssoConfig.ldapAutoLink')">
            <a-switch v-model="config.ldapAutoLink" />
            <span class="form-hint">{{ t('ssoConfig.ldapAutoLinkHint') }}</span>
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

    <!-- 测试结果展示 -->
    <a-alert
      v-if="testResult"
      :type="testResult.success ? 'success' : 'error'"
      class="test-result"
      :content="testResult.message"
    />
  </div>
</template>

<script setup>
import { ref, inject, computed } from 'vue'
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
      ldapUrl: config.ldapUrl,
      ldapStarttls: config.ldapStarttls,
      ldapBaseDn: config.ldapBaseDn,
      ldapUserDnTemplate: config.ldapUserDnTemplate,
      ldapFetchGroups: config.ldapFetchGroups,
      ldapAutoLink: config.ldapAutoLink,
      ldapTimeoutSecs: config.ldapTimeoutSecs
    })
    Message.success(t('ssoSaveSuccess'))
    await loadConfig()
  } catch (_) { /* request.js 已弹错 */ }
  finally { saving.value = false }
}

async function handleTest() {
  testing.value = true
  testResult.value = null
  try {
    const res = await testSsoConfig({
      target: 'ldap',
      config: {
        ldapUrl: config.ldapUrl,
        ldapStarttls: config.ldapStarttls,
        ldapBaseDn: config.ldapBaseDn,
        ldapUserDnTemplate: config.ldapUserDnTemplate,
        ldapTimeoutSecs: config.ldapTimeoutSecs
      }
    })
    // LDAP 测试响应：data 为文本字符串（Doc 19 §1.5）
    const msg = typeof res.data === 'string' ? res.data : (res.data?.message || 'LDAP test OK')
    testResult.value = { success: res.code === 200, message: msg }
  } catch (err) {
    testResult.value = { success: false, message: err?.msg || t('ssoConfig.testFailed') }
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

  code {
    padding: 1px 4px;
    background: $color-bg-muted;
    border-radius: $radius-sm;
    font-family: 'JetBrains Mono', monospace;
  }
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
}
</style>
