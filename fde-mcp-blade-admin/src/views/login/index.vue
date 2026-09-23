<template>
  <div class="login-page">
    <!-- ==================== 左：品牌面板（恒定深色） ==================== -->
    <aside class="brand">
      <div class="brand-top">
        <img class="mark" :src="logoMark" alt="FDE MCP Blade" />
        <div class="name">{{ t('login.brandName') }}</div>
        <div class="tag">{{ envBadge }}</div>
      </div>

      <div class="hero">
        <div class="eyebrow">{{ t('login.eyebrow') }}</div>
        <h1>
          {{ t('login.heroLine1') }}<br />
          <em>{{ t('login.heroLine2') }}</em>
        </h1>
        <p>
          {{ t('login.desc1') }}<br />
          {{ t('login.desc2') }}
        </p>
      </div>

      <!-- 双向流示意：上行 Agent / 中枢 / 下行企业系统 -->
      <div class="flow">
        <svg viewBox="0 0 640 220" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="bladeGrad" x1="0" y1="0" x2="640" y2="0">
              <stop offset="0" style="stop-color: var(--c-blue)" />
              <stop offset="1" style="stop-color: var(--c-violet)" />
            </linearGradient>
            <linearGradient id="wireGrad" x1="0" y1="0" x2="0" y2="220">
              <stop offset="0" style="stop-color: var(--c-blue)" stop-opacity=".55" />
              <stop offset="1" style="stop-color: var(--c-violet)" stop-opacity=".55" />
            </linearGradient>
          </defs>

          <!-- 上行：Agent 节点 -->
          <g style="fill: var(--brand-node-fill); stroke: var(--brand-node-line)">
            <rect x="30" y="10" width="112" height="30" rx="8" />
            <rect x="176" y="10" width="112" height="30" rx="8" />
            <rect x="322" y="10" width="112" height="30" rx="8" />
            <rect x="468" y="10" width="142" height="30" rx="8" />
          </g>
          <g style="fill: var(--brand-label)" class="flow-mono" text-anchor="middle">
            <text x="86" y="30">Claude</text>
            <text x="232" y="30">Cursor</text>
            <text x="378" y="30">Dify</text>
            <text x="539" y="30">Custom Agent</text>
          </g>

          <!-- 连线 -->
          <g stroke="url(#wireGrad)" stroke-width="1.4" stroke-dasharray="4 5" opacity=".8">
            <path d="M86 40v26M232 40v26M378 40v26M539 40v26" />
            <path d="M86 128v26M232 128v26M378 128v26M539 128v26" />
          </g>

          <!-- 中枢 -->
          <rect
            x="4"
            y="66"
            width="632"
            height="62"
            rx="16"
            style="fill: var(--c-blue-soft)"
            stroke="url(#bladeGrad)"
            stroke-width="1.6"
          />
          <rect
            x="4"
            y="66"
            width="632"
            height="62"
            rx="16"
            fill="none"
            style="stroke: var(--c-violet)"
            stroke-opacity=".28"
            stroke-width="1.6"
            stroke-dasharray="3 7"
          />
          <text
            x="30"
            y="103"
            style="fill: var(--brand-hero)"
            font-size="15"
            font-weight="700"
            letter-spacing=".4"
          >
            FDE MCP Blade
          </text>
          <circle cx="600" cy="97" r="3" style="fill: var(--brand-accent)">
            <animate attributeName="opacity" values="1;.2;1" dur="1.8s" repeatCount="indefinite" />
          </circle>

          <!-- 下行：企业系统节点 -->
          <g style="fill: var(--brand-node-fill); stroke: var(--brand-node-line)">
            <rect x="30" y="154" width="112" height="30" rx="8" />
            <rect x="176" y="154" width="112" height="30" rx="8" />
            <rect x="322" y="154" width="112" height="30" rx="8" />
            <rect x="468" y="154" width="142" height="30" rx="8" />
          </g>
          <g style="fill: var(--brand-label)" class="flow-mono" text-anchor="middle">
            <text x="86" y="174">ERP</text>
            <text x="232" y="174">OA / Approval</text>
            <text x="378" y="174">Database</text>
            <text x="539" y="174">Private Systems</text>
          </g>

          <!-- 流动光点 -->
          <circle r="2.6" style="fill: var(--brand-accent)">
            <animateMotion dur="2.6s" repeatCount="indefinite" path="M86 42v24" />
          </circle>
          <circle r="2.6" style="fill: var(--brand-accent)">
            <animateMotion dur="2.6s" begin=".7s" repeatCount="indefinite" path="M378 42v24" />
          </circle>
          <circle r="2.6" style="fill: var(--brand-accent-2)">
            <animateMotion dur="2.6s" begin=".4s" repeatCount="indefinite" path="M232 128v24" />
          </circle>
          <circle r="2.6" style="fill: var(--brand-accent-2)">
            <animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite" path="M539 128v24" />
          </circle>
        </svg>
      </div>

      <div class="caps">
        <div class="cap b"><i></i>{{ t('login.capPlugin') }}</div>
        <div class="cap v"><i></i>{{ t('login.capSecurity') }}</div>
        <div class="cap t"><i></i>{{ t('login.capAudit') }}</div>
        <div class="cap a"><i></i>{{ t('login.capDocker') }}</div>
      </div>

      <div class="brand-foot">
        <span class="dot"></span>
        <span>{{ t('login.footOnPrem') }}</span>
        <span class="sep"></span>
        <span>{{ envBadge }}</span>
      </div>
    </aside>

    <!-- ==================== 右：表单面板 ==================== -->
    <main class="auth">
      <div class="auth-top">
        <div class="seg" role="group">
          <button
            type="button"
            :class="{ on: appStore.theme === 'light' }"
            :title="t('layout.themeLight')"
            @click="appStore.setTheme('light')"
          >
            <icon-sun />
          </button>
          <button
            type="button"
            :class="{ on: appStore.theme === 'dark' }"
            :title="t('layout.themeDark')"
            @click="appStore.setTheme('dark')"
          >
            <icon-moon />
          </button>
          <button
            type="button"
            :class="{ on: appStore.theme === 'auto' }"
            :title="t('layout.themeAuto')"
            @click="appStore.setTheme('auto')"
          >
            <icon-desktop />
          </button>
        </div>
        <div class="seg" role="group">
          <button
            type="button"
            :class="{ on: appStore.locale === 'zh-CN' }"
            @click="appStore.setLocale('zh-CN')"
          >
            中
          </button>
          <button
            type="button"
            :class="{ on: appStore.locale === 'en-US' }"
            @click="appStore.setLocale('en-US')"
          >
            EN
          </button>
        </div>
      </div>

      <div class="form-wrap">
        <h2>{{ t('login.title') }}</h2>
        <p class="sub">{{ t('login.subtitle') }}</p>

        <a-form
          ref="formRef"
          class="login-form"
          :model="formData"
          :rules="rules"
          layout="vertical"
          @submit="handleSubmit"
        >
          <!-- 登录方式：分段控件（与 v1 的 seg 语言一致，不再用 radio 按钮组） -->
          <div class="seg-type" role="group" :aria-label="t('login.loginType')">
            <button
              type="button"
              :class="{ on: formData.loginType === 'local' }"
              @click="formData.loginType = 'local'"
            >
              {{ t('login.loginTypeLocal') }}
            </button>
            <button
              type="button"
              :class="{ on: formData.loginType === 'ldap' }"
              @click="formData.loginType = 'ldap'"
            >
              {{ t('login.loginTypeLdap') }}
            </button>
          </div>

          <a-form-item field="username" :label="usernameLabel">
            <a-input
              v-model="formData.username"
              :placeholder="usernamePlaceholder"
              allow-clear
              autocomplete="username"
            >
              <template #prefix><icon-user /></template>
            </a-input>
          </a-form-item>

          <a-form-item field="password" :label="t('login.password')">
            <a-input-password
              v-model="formData.password"
              :placeholder="t('login.passwordPlaceholder')"
              autocomplete="current-password"
            >
              <template #prefix><icon-lock /></template>
            </a-input-password>
          </a-form-item>

          <!-- 验证码仅本地密码登录需要 -->
          <a-form-item
            v-if="formData.loginType === 'local'"
            field="captcha"
            :label="t('login.captcha')"
          >
            <div class="captcha-row">
              <a-input
                v-model="formData.captcha"
                :placeholder="t('login.captchaPlaceholder')"
                allow-clear
              >
                <template #prefix><icon-safe /></template>
              </a-input>
              <button
                type="button"
                class="captcha-box"
                :title="t('login.captcha')"
                @click="refreshCaptcha"
              >
                {{ captchaCode }}
              </button>
            </div>
          </a-form-item>

          <div class="row-mid">
            <a-checkbox v-if="formData.loginType === 'local'" v-model="formData.remember">
              {{ t('login.rememberMe') }}
            </a-checkbox>
            <span v-else></span>
            <a class="link" href="javascript:;">{{ t('login.forgotPassword') }}</a>
          </div>

          <a-button
            class="submit-btn"
            type="primary"
            size="large"
            long
            html-type="submit"
            :loading="loading"
          >
            {{ loading ? t('login.logining') : t('login.loginBtn') }}
          </a-button>
        </a-form>

        <!-- SSO 企业单点登录入口 -->
        <div class="divider">{{ t('login.orUse') }}</div>
        <button type="button" class="sso-btn" @click="handleSsoLogin">
          <icon-safe />
          {{ t('login.ssoLogin') }}
        </button>

        <div class="sec-note">
          <icon-safe />
          <span>{{ t('login.securityNote') }}</span>
        </div>

        <div class="form-footer">
          {{ t('login.agreeText') }}<a href="javascript:;">{{ t('login.serviceTerms') }}</a
          >{{ t('login.andText') }}<a href="javascript:;">{{ t('login.privacyPolicy') }}</a>
        </div>
      </div>

      <div class="auth-foot">
        <span>{{ envBadge }}</span>
        <span class="sep"></span>
        <span>{{ t('login.copyright') }}</span>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
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

// 环境标（与顶栏同一个口径；DEV / TEST / PROD 是通用缩写，不做 i18n）
const envBadge = computed(() => {
  const m = (import.meta.env.MODE || '').toLowerCase()
  if (m.startsWith('dev')) return 'DEV'
  if (m.startsWith('test')) return 'TEST'
  return 'PROD'
})

const formData = reactive({
  username: 'admin',
  password: '',
  captcha: '',
  remember: true,
  loginType: 'local'
})

// LDAP 方式下标签与占位改用域账号口径
const usernameLabel = computed(() =>
  formData.loginType === 'ldap' ? t('login.ldapUsername') : t('login.username')
)
const usernamePlaceholder = computed(() =>
  formData.loginType === 'ldap'
    ? t('login.ldapUsernamePlaceholder')
    : t('login.usernamePlaceholder')
)

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
// ============================================================
// 版式来源：design-preview/login.html（v1 设计）
// 左 57% 恒定深色品牌面板 + 右表单面板，整屏分栏，不再是居中卡片
// 全部取色走 tokens.scss，本文件不出现颜色字面量
// ============================================================

.login-page {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 100vh;
  background: var(--bg);
}

// ---------------- 左：品牌面板 ----------------
.brand {
  position: relative;
  width: 57%;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 44px 56px 36px;
  background: linear-gradient(150deg, var(--brand-1) 0%, var(--brand-2) 62%, var(--brand-3) 100%);
  color: var(--brand-text);

  // 网格底纹
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(var(--brand-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--brand-line) 1px, transparent 1px);
    background-size: 56px 56px;
    -webkit-mask-image: radial-gradient(120% 90% at 30% 20%, black 20%, transparent 78%);
    mask-image: radial-gradient(120% 90% at 30% 20%, black 20%, transparent 78%);
  }

  // 氛围光
  &::after {
    content: '';
    position: absolute;
    width: 720px;
    height: 720px;
    right: -260px;
    top: -240px;
    pointer-events: none;
    background: radial-gradient(
      circle,
      var(--c-blue-soft) 0%,
      var(--tint-violet) 42%,
      transparent 70%
    );
    filter: blur(12px);
  }

  > * {
    position: relative;
    z-index: 2;
  }
}

.brand-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
}

.mark {
  width: 38px;
  height: 38px;
  flex: none;
  display: block;
}

.brand-top .name {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: var(--brand-hero);
}

.brand-top .tag {
  margin-left: auto;
  font-size: 11.5px;
  font-family: var(--mono);
  color: var(--brand-text-2);
  letter-spacing: 0.6px;
  border: 1px solid var(--brand-node-line);
  padding: 4px 10px;
  border-radius: 999px;
}

.hero {
  margin-top: auto;
  padding-bottom: 34px;

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--brand-eyebrow);
    margin-bottom: 20px;

    &::before {
      content: '';
      width: 22px;
      height: 2px;
      border-radius: 2px;
      background: var(--brand-grad-flow);
    }
  }

  h1 {
    font-size: 46px;
    line-height: 1.1;
    letter-spacing: -1.2px;
    font-weight: 800;
    color: var(--brand-hero);
    margin: 0;

    em {
      font-style: normal;
      background: var(--brand-grad-text);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
  }

  p {
    margin: 18px 0 0;
    font-size: 15px;
    line-height: 1.75;
    color: var(--brand-text-2);
    max-width: 520px;
  }
}

.flow {
  margin: 34px 0 30px;
  width: 100%;
  max-width: 620px;
  flex: none;

  svg {
    display: block;
    width: 100%;
    height: auto;
  }
}

.flow-mono {
  font-family: var(--mono);
  font-size: 11.5px;
}

.caps {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-bottom: auto;
  flex: none;
}

.cap {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--brand-label);
  background: var(--brand-node-fill);
  border: 1px solid var(--brand-node-line);
  padding: 7px 13px;
  border-radius: 999px;

  i {
    width: 6px;
    height: 6px;
    border-radius: 2px;
    flex: none;
  }

  &.b i {
    background: var(--c-blue);
  }

  &.v i {
    background: var(--c-violet);
  }

  &.t i {
    background: var(--c-teal);
  }

  &.a i {
    background: var(--c-amber);
  }
}

.brand-foot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 22px;
  margin-top: 28px;
  border-top: 1px solid var(--brand-line);
  font-size: 12px;
  color: var(--brand-text-3);
  flex: none;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c-green);
    box-shadow: 0 0 0 4px var(--tint-green);
    flex: none;
  }

  .sep {
    width: 1px;
    height: 12px;
    background: var(--brand-node-line);
  }
}

// ---------------- 右：表单面板 ----------------
.auth {
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--panel);
  padding: 34px 44px;
  transition: background-color 0.35s ease;
}

.auth-top {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex: none;
}

.seg {
  display: flex;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;

  button {
    border: 0;
    background: transparent;
    color: var(--text-3);
    cursor: pointer;
    font-family: var(--font);
    font-size: 12px;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s;

    &:hover {
      color: var(--text-2);
    }

    &.on {
      background: var(--seg-on-bg);
      color: var(--text);
      box-shadow: var(--shadow-xs);
    }
  }
}

.form-wrap {
  margin: auto;
  width: 100%;
  max-width: 376px;
  padding: 14px 0;

  h2 {
    font-size: 26px;
    font-weight: 750;
    letter-spacing: -0.5px;
    color: var(--text);
    margin: 0;
  }

  .sub {
    margin-top: 9px;
    font-size: 13.5px;
    color: var(--text-2);
    line-height: 1.6;
  }
}

// 登录方式分段控件
.seg-type {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 3px;
  margin-top: 22px;

  button {
    border: 0;
    background: transparent;
    color: var(--text-3);
    cursor: pointer;
    font-family: var(--font);
    font-size: 12.5px;
    font-weight: 600;
    padding: 6px 8px;
    border-radius: var(--r-xs);
    transition: all 0.2s;

    &:hover {
      color: var(--text-2);
    }

    &.on {
      background: var(--seg-on-bg);
      color: var(--text);
      box-shadow: var(--shadow-xs);
    }
  }
}

// 表单细节：v1 的输入框是 46px 高、圆角 12、聚焦主色光环（令牌层已给光环）
.login-form {
  margin-top: 4px;

  :deep(.arco-form-item) {
    margin-bottom: 16px;
  }

  :deep(.arco-input-wrapper),
  :deep(.arco-input-inner-wrapper) {
    height: 46px;
    border-radius: var(--r-md);
    padding-left: 12px;
    padding-right: 12px;
  }

  :deep(.arco-input-prefix) {
    color: var(--text-3);
    padding-right: 8px;
    font-size: 16px;
  }

  :deep(.arco-input) {
    font-size: 14px;
  }
}

.captcha-row {
  display: grid;
  grid-template-columns: 1fr 110px;
  gap: 12px;
}

.captcha-box {
  height: 46px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--panel-2);
  color: var(--ink-blue);
  font-family: var(--mono);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;

  &:hover {
    border-color: var(--line-strong);
    color: var(--text);
  }
}

.row-mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.link {
  font-size: 13px;
  color: var(--c-blue);
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.submit-btn {
  height: 46px;
  margin-top: 20px;
  border-radius: var(--r-md);
  font-size: 14.5px;
  font-weight: 650;
  letter-spacing: 0.3px;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 16px;
  color: var(--text-3);
  font-size: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--line);
  }
}

.sso-btn {
  width: 100%;
  height: 44px;
  border-radius: var(--r-md);
  background: var(--panel-2);
  border: 1px solid var(--line-strong);
  color: var(--text-2);
  cursor: pointer;
  font-family: var(--font);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    border-color: var(--c-blue);
    color: var(--text);
    background: var(--panel);
  }
}

.sec-note {
  display: flex;
  gap: 9px;
  margin-top: 18px;
  padding: 11px 13px;
  border-radius: var(--r-sm);
  background: var(--panel-2);
  border: 1px solid var(--line);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-2);

  svg {
    width: 14px;
    height: 14px;
    flex: none;
    margin-top: 1px;
    color: var(--c-teal);
  }
}

.form-footer {
  margin-top: 16px;
  text-align: center;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--text-3);

  a {
    color: var(--text-2);
    text-decoration: none;

    &:hover {
      color: var(--c-blue);
    }
  }
}

.auth-foot {
  margin-top: auto;
  padding-top: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11.5px;
  font-family: var(--mono);
  color: var(--text-3);

  .sep {
    width: 1px;
    height: 11px;
    background: var(--line-strong);
  }
}

// ---------------- 小屏：改为上下堆叠 ----------------
@media (max-width: 980px) {
  .login-page {
    flex-direction: column;
  }

  .brand {
    width: 100%;
    min-height: auto;
    padding: 32px 26px 30px;
  }

  .hero {
    margin-top: 26px;
    padding-bottom: 22px;

    h1 {
      font-size: 32px;
    }

    p {
      font-size: 14px;
    }
  }

  .flow {
    margin: 22px 0 20px;
  }

  .caps {
    margin-bottom: 0;
  }

  .brand-foot {
    margin-top: 24px;
  }

  .auth {
    min-height: auto;
    padding: 28px 22px;
  }

  .form-wrap {
    max-width: none;
  }
}
</style>
