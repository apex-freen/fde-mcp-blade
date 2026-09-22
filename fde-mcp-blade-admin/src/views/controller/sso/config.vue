<template>
  <div class="sso-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-spin :loading="loading" style="display: block; width: 100%">
        <a-tabs v-model:active-key="activeTab" type="rounded">
          <a-tab-pane key="basic" :title="t('ssoTabs.basic')">
            <BasicTab />
          </a-tab-pane>
          <a-tab-pane key="ldap" :title="t('ssoTabs.ldap')">
            <LdapTab />
          </a-tab-pane>
          <a-tab-pane key="oidc" :title="t('ssoTabs.oidc')">
            <OidcTab />
          </a-tab-pane>
          <a-tab-pane key="jit" :title="t('ssoTabs.jit')">
            <JitTab />
          </a-tab-pane>
          <a-tab-pane key="session" :title="t('ssoTabs.session')">
            <SessionTab />
          </a-tab-pane>
          <a-tab-pane key="links" :title="t('ssoTabs.links')">
            <LinksTab />
          </a-tab-pane>
          <a-tab-pane key="roleRules" :title="t('ssoTabs.roleRules')">
            <RoleRulesTab />
          </a-tab-pane>
        </a-tabs>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, provide } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { getSsoConfig } from '@/api/modules/sso'
import BasicTab from './components/BasicTab.vue'
import LdapTab from './components/LdapTab.vue'
import OidcTab from './components/OidcTab.vue'
import JitTab from './components/JitTab.vue'
import SessionTab from './components/SessionTab.vue'
import LinksTab from './components/LinksTab.vue'
import RoleRulesTab from './components/RoleRulesTab.vue'

const { t } = useI18n()
const activeTab = ref('basic')
const loading = ref(false)

/**
 * SSO 配置默认值（对应 Doc 19 §1.5 SsoConfig）
 * 子组件通过 inject('ssoConfig') 获取并直接修改
 */
const defaultConfig = () => ({
  ssoEnabled: false,
  ssoMode: 'ldap',
  localLoginEnabled: true,
  // LDAP
  ldapUrl: '',
  ldapStarttls: false,
  ldapBaseDn: '',
  ldapUserDnTemplate: '{0}',
  ldapFetchGroups: false,
  ldapAutoLink: false,
  ldapTimeoutSecs: 10,
  // OIDC
  oidcEnabled: false,
  oidcClientId: '',
  oidcClientSecretSet: false, // 只读
  oidcClientSecret: '',       // 仅 PUT 可传
  oidcDiscoveryUrl: '',
  oidcScope: 'openid profile email',
  oidcUsernameClaim: 'preferred_username',
  oidcRedirectUri: '',
  // JIT
  jitEnabled: false,
  jitGroupName: '',
  jitDefaultRoleId: 0,
  // 会话刷新
  sessionRefreshEnabled: false,
  sessionRefreshExpireHours: 168
})

const config = reactive(defaultConfig())

/**
 * 从后端加载 SSO 配置（GET /biz/sso/config）
 */
async function loadConfig() {
  loading.value = true
  try {
    const res = await getSsoConfig()
    const data = res.data || res
    if (data) {
      Object.assign(config, defaultConfig(), data)
    }
  } catch (e) {
    Message.error(t('ssoLoadFailed'))
  } finally {
    loading.value = false
  }
}

provide('ssoConfig', config)
provide('loadSsoConfig', loadConfig)

onMounted(() => {
  loadConfig()
})
</script>

<style lang="scss" scoped>
.sso-page {
  padding: 0 0 24px;
}
</style>
