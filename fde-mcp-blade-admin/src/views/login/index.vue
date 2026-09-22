<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 左侧品牌区 -->
      <div class="login-left">
        <div class="brand-logo-row">
          <img class="brand-logo" :src="logoMark" alt="FDE MCP Blade" />
          <span class="brand-name">{{ $t('login.brandName') }}</span>
        </div>
        <div class="brand-hero">
          <h1 class="brand-slogan">{{ $t('login.slogan') }}</h1>
          <p class="brand-desc">
            {{ $t('login.desc1') }}<br />
            {{ $t('login.desc2') }}
          </p>
        </div>
        <div class="brand-footer">{{ $t('login.copyright') }}</div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="login-right">
        <div class="form-wrapper">
          <div class="lang-switcher">
            <a-dropdown>
              <a-button type="text" class="lang-btn">
                <template #icon><icon-language /></template>
                <span class="lang-text">{{ appStore.locale === 'zh-CN' ? '中' : 'EN' }}</span>
              </a-button>
              <template #content>
                <a-doption @click="appStore.setLocale('zh-CN')">
                  <template #icon><icon-check v-if="appStore.locale === 'zh-CN'" /></template>
                  {{ t('common.chinese') }}
                </a-doption>
                <a-doption @click="appStore.setLocale('en-US')">
                  <template #icon><icon-check v-if="appStore.locale === 'en-US'" /></template>
                  {{ t('common.english') }}
                </a-doption>
              </template>
            </a-dropdown>
          </div>
          <div class="form-header">
            <h2 class="form-title">{{ $t('login.title') }}</h2>
            <p class="form-subtitle">{{ $t('login.subtitle') }}</p>
          </div>

          <a-form
            ref="formRef"
            :model="formData"
            :rules="rules"
            layout="vertical"
            @submit="handleSubmit"
          >
            <!-- 登录方式切换 -->
            <a-form-item :label="$t('login.loginType')">
              <a-radio-group v-model="formData.loginType" type="button">
                <a-radio value="local">{{ $t('login.loginTypeLocal') }}</a-radio>
                <a-radio value="ldap">{{ $t('login.loginTypeLdap') }}</a-radio>
              </a-radio-group>
            </a-form-item>

            <a-form-item field="username" :label="formData.loginType === 'ldap' ? $t('login.ldapUsername') : $t('login.username')">
              <a-input
                v-model="formData.username"
                :placeholder="formData.loginType === 'ldap' ? $t('login.ldapUsernamePlaceholder') : $t('login.usernamePlaceholder')"
                size="large"
                allow-clear
              />
            </a-form-item>

            <a-form-item field="password" :label="$t('login.password')">
              <a-input-password
                v-model="formData.password"
                :placeholder="$t('login.passwordPlaceholder')"
                size="large"
              />
            </a-form-item>

            <!-- 验证码仅本地密码登录需要 -->
            <a-form-item v-if="formData.loginType === 'local'" field="captcha" :label="$t('login.captcha')">
              <div class="captcha-group">
                <a-input
                  v-model="formData.captcha"
                  :placeholder="$t('login.captchaPlaceholder')"
                  size="large"
                  allow-clear
                />
                <div class="captcha-box" @click="refreshCaptcha">
                  {{ captchaCode }}
                </div>
              </div>
            </a-form-item>

            <div class="form-options">
              <a-checkbox v-if="formData.loginType === 'local'" v-model="formData.remember">{{ $t('login.rememberMe') }}</a-checkbox>
              <span v-else></span>
              <a class="forgot-link" href="javascript:;">{{ $t('login.forgotPassword') }}</a>
            </div>

            <a-button
              type="primary"
              size="large"
              long
              html-type="submit"
              :loading="loading"
            >
              {{ loading ? $t('login.logining') : $t('login.loginBtn') }}
            </a-button>
          </a-form>

          <!-- SSO 企业单点登录入口 -->
          <div class="sso-divider">
            <span>{{ $t('login.orUse') }}</span>
          </div>
          <a-button
            class="sso-btn"
            size="large"
            long
            @click="handleSsoLogin"
          >
            <template #icon><icon-safe /></template>
            {{ $t('login.ssoLogin') }}
          </a-button>

          <div class="form-footer">
            {{ $t('login.agreeText') }}<a href="javascript:;">{{ $t('login.serviceTerms') }}</a>{{ $t('login.andText') }}
            <a href="javascript:;">{{ $t('login.privacyPolicy') }}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import env from '@/config/env'
import logoMark from '@/assets/brand/logo-mark.svg'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const formRef = ref()
const loading = ref(false)
const captchaCode = ref('')

const formData = reactive({
  username: 'admin',
  password: '',
  captcha: '',
  remember: true,
  loginType: 'local'
})

// 根据登录方式切换动态校验规则
const rules = {
  username: [{ required: true, message: t('login.usernameRequired') }],
  password: [{ required: true, message: t('login.passwordRequired') }],
  captcha: [
    {
      validator: (value, cb) => {
        if (formData.loginType === 'local' && !value) {
          cb(new Error(t('login.captchaRequired')))
        } else {
          cb()
        }
      }
    }
  ]
}

// 生成随机验证码
function refreshCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  captchaCode.value = result
}

async function handleSubmit({ values }) {
  // 本地登录需校验验证码（不区分大小写）
  if (values.loginType === 'local' && values.captcha.toUpperCase() !== captchaCode.value.toUpperCase()) {
    Message.error(t('login.captchaError'))
    refreshCaptcha()
    return
  }

  loading.value = true
  try {
    await userStore.login(values)
    await userStore.fetchUserInfo()

    Message.success(t('login.loginSuccess'))

    // 跳转回来源页面；根路径由后端菜单树决定默认落地页
    const redirect = (route.query.redirect && route.query.redirect !== '/') ? route.query.redirect : '/'
    router.push(redirect)
  } catch (error) {
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

/**
 * SSO 企业单点登录入口
 *
 * Doc 19 §1.4：302 跳转到后端 /sso/authorize，后端再重定向到 IdP
 */
function handleSsoLogin() {
  window.location.href = `${env.baseURL}/sso/authorize`
}

onMounted(() => {
  refreshCaptcha()
})
</script>

<style lang="scss" scoped>
.login-page {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #f0f5ff 0%, #e8f3ff 50%, #f0f5ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-6;
}

.login-container {
  width: 100%;
  max-width: 1000px;
  height: 560px;
  background: $color-bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  overflow: hidden;
}

.login-left {
  background: linear-gradient(135deg, #165DFF 0%, #0E42D2 100%);
  padding: $space-12;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -100px;
    right: -100px;
    width: 300px;
    height: 300px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 50%;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -80px;
    left: -60px;
    width: 240px;
    height: 240px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
  }
}

.brand-logo-row {
  display: flex;
  align-items: center;
  gap: $space-3;
  position: relative;
  z-index: 1;
}

.brand-logo {
  width: 44px;
  height: 44px;
  display: block;
}

.brand-name {
  font-size: $font-size-lg;
  font-weight: 600;
}

.brand-hero {
  position: relative;
  z-index: 1;
}

.brand-slogan {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 $space-4 0;
  line-height: 1.4;
}

.brand-desc {
  font-size: $font-size-base;
  opacity: 0.85;
  line-height: 1.8;
  margin: 0;
}

.brand-footer {
  position: relative;
  z-index: 1;
  font-size: $font-size-xs;
  opacity: 0.7;
}

.login-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space-10;
}

.form-wrapper {
  width: 100%;
  max-width: 360px;
}

.lang-switcher {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $space-4;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: $color-text-tertiary;

  &:hover {
    color: $color-primary;
  }
}

.lang-text {
  font-size: 12px;
  font-weight: 500;
}

.form-header {
  margin-bottom: $space-6;
}

.form-title {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 $space-2 0;
  color: $color-text;
}

.form-subtitle {
  font-size: $font-size-base;
  color: $color-text-tertiary;
  margin: 0;
}

.captcha-group {
  display: grid;
  grid-template-columns: 1fr 110px;
  gap: $space-3;
}

.captcha-box {
  height: 40px;
  background: $color-bg-muted;
  border: 1px solid $color-border;
  border-radius: $radius;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 4px;
  color: $color-primary;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;

  &:hover {
    background: $color-bg-hover;
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: $space-2 0 $space-6 0;
}

.forgot-link {
  color: $color-primary;
  font-size: $font-size-base;
  text-decoration: none;

  &:hover {
    color: $color-primary-hover;
  }
}

.sso-divider {
  display: flex;
  align-items: center;
  margin: $space-6 0 $space-3;
  gap: $space-3;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $color-border;
  }

  span {
    color: $color-text-tertiary;
    font-size: $font-size-xs;
  }
}

.sso-btn {
  border: 1px solid $color-primary;
  color: $color-primary;

  &:hover {
    // 主色是 CSS 变量，不能再用 rgba($color-primary, .05)（编译期取值），改走令牌
    background: var(--c-blue-soft);
  }
}

.form-footer {
  margin-top: $space-6;
  text-align: center;
  font-size: $font-size-xs;
  color: $color-text-tertiary;

  a {
    color: $color-primary;
    text-decoration: none;

    &:hover {
      color: $color-primary-hover;
    }
  }
}
</style>
