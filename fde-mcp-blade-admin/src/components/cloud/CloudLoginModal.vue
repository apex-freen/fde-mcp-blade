<template>
  <a-modal
    v-model:visible="visible"
    :title="modalTitle"
    :width="420"
    :ok-loading="submitting"
    @ok="handleSubmit"
  >
    <a-form :model="loginForm" layout="vertical">
      <a-form-item field="username" label="手机号" required>
        <a-input v-model="loginForm.username" placeholder="请输入手机号" />
      </a-form-item>
      <a-form-item field="password" label="密码" required>
        <a-input-password v-model="loginForm.password" :placeholder="isForget ? '请输入新密码' : '请输入密码'" />
      </a-form-item>
      <a-form-item field="code" label="图形验证码" required>
        <a-input v-model="loginForm.code" placeholder="请输入图形验证码">
          <template #suffix>
            <div class="captcha-box" @click="loadCaptcha">
              <img v-if="captchaImg" :src="captchaImg" class="captcha-img" />
              <a-spin v-else size="mini" />
            </div>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item v-if="isRegister || isForget" field="code_sms" label="短信验证码" required>
        <a-input v-model="loginForm.code_sms" placeholder="请输入短信验证码">
          <template #suffix>
            <a-button
              type="text"
              size="mini"
              :disabled="smsCountdown > 0"
              @click="handleSendSms"
            >
              {{ smsCountdown > 0 ? `${smsCountdown}s 后重试` : '获取验证码' }}
            </a-button>
          </template>
        </a-input>
      </a-form-item>
    </a-form>
    <div class="modal-footer">
      <template v-if="isLogin">
        <span>还没有账号？</span>
        <a-link @click="switchMode('register')">立即注册</a-link>
        <a-divider direction="vertical" />
        <a-link @click="switchMode('forget')">忘记密码</a-link>
      </template>
      <template v-else>
        <span>已有账号？</span>
        <a-link @click="switchMode('login')">去登录</a-link>
      </template>
    </div>
  </a-modal>
</template>

<script setup>
// ==========================================
// 云端平台登录弹窗（登录 / 注册 / 找回密码）
// 直连云端域名获取令牌，成功后通过 success 事件把 token 交给父组件回填
// 复用方：连接配置 · 云端配置 Tab、系统设置 · 云端设置页
// ==========================================
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  getCloudCaptcha, sendCloudSms,
  cloudLogin, cloudRegister, cloudForgotPwd
} from '@/api/modules/cloudAuth'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const submitting = ref(false)
const isLogin = ref(true)
const isRegister = ref(false)
const isForget = ref(false)

const modalTitle = computed(() => {
  if (isForget.value) return '找回密码'
  if (isRegister.value) return '新用户注册'
  return '登录云端平台'
})

const loginForm = reactive({
  username: '',
  password: '',
  code: '',
  code_sms: '',
  uuid: ''
})

// 图形验证码
const captchaImg = ref('')
const loadCaptcha = async () => {
  captchaImg.value = ''
  try {
    const res = await getCloudCaptcha()
    if (res.data?.img) {
      captchaImg.value = res.data.img
      loginForm.uuid = res.data.uuid
    }
  } catch (e) {
    // 错误已由拦截器提示
  }
}

// 短信验证码
const smsCountdown = ref(0)
let smsTimer = null
const handleSendSms = async () => {
  if (!loginForm.username) {
    Message.warning('请输入手机号')
    return
  }
  if (!loginForm.code) {
    Message.warning('请先输入图形验证码')
    return
  }
  try {
    await sendCloudSms({
      username: loginForm.username,
      code: loginForm.code,
      uuid: loginForm.uuid,
      Scene: isRegister.value ? 1 : 2
    })
    Message.success('短信验证码已发送')
    smsCountdown.value = 60
    smsTimer = setInterval(() => {
      smsCountdown.value--
      if (smsCountdown.value <= 0) {
        clearInterval(smsTimer)
        smsTimer = null
      }
    }, 1000)
  } catch (e) {
    // 错误已由拦截器提示，刷新验证码
    loadCaptcha()
    loginForm.code = ''
  }
}

const switchMode = (mode) => {
  isLogin.value = mode === 'login'
  isRegister.value = mode === 'register'
  isForget.value = mode === 'forget'
  loginForm.code = ''
  loginForm.code_sms = ''
  loadCaptcha()
}

// 打开时复位为登录态并刷新验证码
watch(visible, (v) => {
  if (v) {
    switchMode('login')
  }
})

const handleSubmit = async () => {
  // 基础校验
  if (!loginForm.username) {
    Message.warning('请输入手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(loginForm.username)) {
    Message.warning('手机号格式错误')
    return
  }
  if (!loginForm.password) {
    Message.warning('请输入密码')
    return
  }
  if (!loginForm.code) {
    Message.warning('请输入图形验证码')
    return
  }
  if ((isRegister.value || isForget.value) && !loginForm.code_sms) {
    Message.warning('请输入短信验证码')
    return
  }

  submitting.value = true
  try {
    let res
    const submitData = {
      username: loginForm.username,
      password: loginForm.password,
      code: loginForm.code,
      uuid: loginForm.uuid
    }

    if (isForget.value) {
      res = await cloudForgotPwd({ ...submitData, code_sms: loginForm.code_sms })
    } else if (isRegister.value) {
      res = await cloudRegister({ ...submitData, code_sms: loginForm.code_sms })
    } else {
      res = await cloudLogin(submitData)
    }

    // 登录/注册/找回密码 成功后都返回 token
    if (res.data?.token) {
      Message.success(isLogin.value ? '登录成功' : '操作成功，已自动登录')
      visible.value = false
      emit('success', res.data.token)
    } else {
      Message.warning('未获取到云端凭证，请重试')
      loadCaptcha()
    }
  } catch (e) {
    loadCaptcha()
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  if (smsTimer) clearInterval(smsTimer)
})
</script>

<style scoped>
.captcha-box {
  width: 100px;
  height: 36px;
  background: var(--color-fill-2);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.captcha-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.modal-footer {
  margin-top: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-3);
}
</style>
