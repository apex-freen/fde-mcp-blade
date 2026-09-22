<template>
  <div class="error-page">
    <a-result
      status="403"
      title="403"
      :sub-title="$t('error.title403')"
    >
      <template #extra>
        <a-space>
          <a-button @click="handleRelogin">
            <template #icon><icon-refresh /></template>
            {{ $t('error.relogin') }}
          </a-button>
          <a-button @click="goBack">{{ $t('error.goBack') }}</a-button>
          <a-button type="primary" @click="goHome">{{ $t('error.goHome') }}</a-button>
        </a-space>
      </template>
    </a-result>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { clearAuth } from '@/utils/auth'

const { t } = useI18n()
const router = useRouter()

function goBack() {
  router.back()
}

function goHome() {
  router.push('/')
}

function handleRelogin() {
  clearAuth()
  Message.success(t('error.authCleared'))
  router.replace('/login')
}
</script>

<style lang="scss" scoped>
.error-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-bg;
}
</style>
