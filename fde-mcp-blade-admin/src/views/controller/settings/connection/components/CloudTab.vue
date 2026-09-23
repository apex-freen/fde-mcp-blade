<template>
  <div style="margin-top: 16px">
    <a-alert type="info" style="margin-bottom: 16px">
      <template #icon><icon-cloud /></template>
      云端平台配置用于连接外部云端服务，实现设备数据与云端的同步交互。
    </a-alert>

    <!-- <a-alert type="warning">
      <template #icon><icon-tool /></template>
      云端平台配置功能正在开发中，敬请期待。
    </a-alert> -->

    
    <a-spin :loading="loading" style="width: 100%">
      <a-card :bordered="false" style="margin-bottom: 16px">
        <template #title>
          <div class="section-title">
            <icon-cloud />
            <span>云端平台配置</span>
            <a-tag :color="statusTag.color" size="small">{{ statusTag.text }}</a-tag>
          </div>
        </template>

        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="云端用户名">{{ config.server_username || '-' }}</a-descriptions-item>
          <a-descriptions-item label="云端密码">
            <span v-if="config.server_password">******</span>
            <span v-else style="color: var(--color-text-4)">未设置</span>
          </a-descriptions-item>
          <a-descriptions-item label="云端 Token">
            <span v-if="config.server_token" :title="config.server_token">
              {{ config.server_token.substring(0, 8) }}...
            </span>
            <span v-else style="color: var(--color-text-4)">未获取</span>
          </a-descriptions-item>
          <a-descriptions-item label="MQTT 连接">
            <a-tag :color="config.mqtt_is_connected ? 'green' : 'gray'" size="small">
              {{ config.mqtt_is_connected ? '已连接' : '未连接' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="MCP 连接">
            <a-tag :color="config.mcp_is_connected ? 'green' : 'gray'" size="small">
              {{ config.mcp_is_connected ? '已连接' : '未连接' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <div style="margin-top: 16px">
          <template v-if="config.server_token && config.mqtt_is_connected">
            <a-popconfirm content="确认断开云端连接？断开后设备将无法与云端通信。" @ok="handleDisconnect">
              <a-button status="warning" :loading="disconnecting">
                <template #icon><icon-link-break /></template>
                断开连接
              </a-button>
            </a-popconfirm>
          </template>
          <template v-else-if="config.server_token && !config.mqtt_is_connected">
            <a-space>
              <a-button type="primary" :loading="connecting" @click="handleConnect">
                <template #icon><icon-link /></template>
                连接云端
              </a-button>
              <a-button @click="openLoginModal">
                <template #icon><icon-refresh /></template>
                重新登录
              </a-button>
            </a-space>
          </template>
          <template v-else>
            <a-button type="primary" @click="openLoginModal">
              <template #icon><icon-user /></template>
              登录云端平台
            </a-button>
            <span style="margin-left: 12px; color: var(--color-text-3); font-size: 13px">
              请先登录以获取云端访问凭证
            </span>
          </template>
        </div>
      </a-card>

      <a-alert v-if="connectError" type="error" closable @close="connectError = ''">
        {{ connectError }}
        <a-button v-if="showRelogin" type="text" size="small" @click="openLoginModal">
          重新登录
        </a-button>
      </a-alert>
    </a-spin>

    <a-modal
      v-model:visible="loginModalVisible"
      :title="modalTitle"
      :width="420"
      :ok-loading="submitting"
      @ok="handleModalSubmit"
      @cancel="loginModalVisible = false"
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
   
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  getCloudConfig, updateCloudConfig,
  connectCloud, disconnectCloud
} from '@/api/modules/gisSettings'
import {
  getCloudCaptcha, sendCloudSms,
  cloudLogin, cloudRegister, cloudForgotPwd
} from '@/api/modules/cloudAuth'

// ============ 本地后端配置 ============
const loading = ref(false)
const connecting = ref(false)
const disconnecting = ref(false)
const connectError = ref('')
// 连接失败即提供「重新登录」入口（msg 是 opaque 文案，不做字符串匹配判断失败类型）
const showRelogin = ref(false)

const config = reactive({
  server_username: '',
  server_password: '',
  server_token: '',
  mqtt_is_connected: false,
  mcp_is_connected: false
})

const statusTag = computed(() => {
  if (!config.server_token) {
    return { text: '未配置', color: 'gray' }
  }
  if (config.mqtt_is_connected) {
    return { text: '已连接', color: 'green' }
  }
  return { text: '未连接', color: 'orange' }
})

const loadConfig = async () => {
  loading.value = true
  try {
    const res = await getCloudConfig()
    const d = res.data || {}
    Object.assign(config, {
      server_username: d.server_username || '',
      server_password: d.server_password || '',
      server_token: d.server_token || '',
      mqtt_is_connected: d.mqtt_is_connected ?? false,
      mcp_is_connected: d.mcp_is_connected ?? false
    })
    connectError.value = ''
    showRelogin.value = false
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  try {
    await updateCloudConfig({
      server_username: config.server_username,
      server_password: config.server_password,
      server_token: config.server_token,
      sys_cloud_enabled: true
    })
    Message.success('配置已保存')
    return true
  } catch (e) {
    return false
  }
}

const handleConnect = async () => {
  if (!config.server_token) {
    Message.warning('请先登录云端平台获取凭证')
    openLoginModal()
    return
  }
  connecting.value = true
  connectError.value = ''
  showRelogin.value = false
  try {
    await connectCloud()
    Message.success('云端连接成功')
    loadConfig()
  } catch (e) {
    // msg / message 一律 opaque 直渲；失败类型判断只认 code（此处无结构化失败码 → 统一给「重新登录」入口）
    const msg = e?.response?.data?.msg || e?.msg || e?.message || ''
    connectError.value = msg || '云端连接失败'
    showRelogin.value = true
  } finally {
    connecting.value = false
  }
}

const handleDisconnect = async () => {
  disconnecting.value = true
  try {
    await disconnectCloud()
    Message.success('云端连接已断开')
    loadConfig()
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    disconnecting.value = false
  }
}

// ============ 登录弹窗 ============
const loginModalVisible = ref(false)
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

const openLoginModal = () => {
  switchMode('login')
  loginModalVisible.value = true
}

const handleModalSubmit = async () => {
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

      // 回填 token 和用户名密码到配置
      config.server_username = loginForm.username
      config.server_password = loginForm.password
      config.server_token = res.data.token

      // 关闭弹窗
      loginModalVisible.value = false

      // 自动保存到本地后端
      const saved = await saveConfig()
      if (saved) {
        // 保存成功后自动尝试连接
        await handleConnect()
      }
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

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title svg {
  font-size: 18px;
}
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
