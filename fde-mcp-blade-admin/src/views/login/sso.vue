<template>
  <div class="sso-callback-page">
    <div class="sso-card">
      <div v-if="loading" class="sso-loading">
        <a-spin :dot="60" />
        <p class="sso-hint">{{ t('ssoCallback.exchanging') }}</p>
      </div>
      <div v-else-if="success" class="sso-success">
        <icon-check-circle class="sso-icon sso-icon-success" />
        <p class="sso-hint">{{ t('ssoCallback.success') }}</p>
      </div>
      <div v-else class="sso-error">
        <icon-close-circle class="sso-icon sso-icon-error" />
        <p class="sso-hint">{{ errorMsg || t('ssoCallback.failed') }}</p>
        <a-button type="primary" size="large" long @click="goLogin">
          {{ t('ssoCallback.backToLogin') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const success = ref(false)
const errorMsg = ref('')

async function handleCallback() {
  const code = route.query.code
  const backendError = route.query.error

  if (backendError) {
    errorMsg.value = decodeURIComponent(backendError)
    loading.value = false
    return
  }

  if (!code) {
    errorMsg.value = t('ssoCallback.noCode')
    loading.value = false
    return
  }

  try {
    await userStore.ssoLogin(code)
    await userStore.fetchUserInfo()
    success.value = true
    loading.value = false

    // 延迟一下让用户看到成功提示
    setTimeout(() => {
      const redirect = (route.query.redirect && route.query.redirect !== '/') ? route.query.redirect : '/'
      router.replace(redirect)
    }, 800)
  } catch (err) {
    errorMsg.value = err?.msg || t('ssoCallback.exchangeFailed')
    loading.value = false
  }
}

function goLogin() {
  router.replace('/login')
}

onMounted(() => {
  handleCallback()
})
</script>

<style lang="scss" scoped>
.sso-callback-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f5ff 0%, #e8f3ff 50%, #f0f5ff 100%);
}

.sso-card {
  width: 360px;
  padding: 40px 32px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.sso-hint {
  margin: 16px 0 0;
  color: #86909c;
  font-size: 14px;
}

.sso-icon {
  font-size: 48px;

  &.sso-icon-success {
    color: #00b42a;
  }

  &.sso-icon-error {
    color: #f53f3f;
  }
}

.sso-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
</style>
