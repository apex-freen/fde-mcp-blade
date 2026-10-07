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
          <a-descriptions-item label="云端 Token">
            <span v-if="config.server_token" :title="config.server_token">
              {{ config.server_token.substring(0, 8) }}...
            </span>
            <span v-else style="color: var(--color-text-4)">未获取</span>
          </a-descriptions-item>
          <a-descriptions-item label="云端开关">
            <a-tag :color="config.sys_cloud_enabled ? 'green' : 'gray'" size="small">
              {{ config.sys_cloud_enabled ? '已开启' : '已关闭' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="MCP 连接">
            <a-tag :color="config.mcp_is_connected ? 'green' : 'gray'" size="small">
              {{ config.mcp_is_connected ? '已连接' : '未连接' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <div style="margin-top: 16px">
          <template v-if="config.server_token && config.sys_cloud_enabled">
            <a-popconfirm content="确认断开云端连接？断开后设备将无法与云端通信。" @ok="handleDisconnect">
              <a-button status="warning" :loading="disconnecting">
                <template #icon><icon-link-break /></template>
                断开连接
              </a-button>
            </a-popconfirm>
          </template>
          <template v-else-if="config.server_token && !config.sys_cloud_enabled">
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

    <CloudLoginModal v-model="loginModalVisible" @success="handleLoginSuccess" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  getCloudConfig, cloudTokenLogin,
  connectCloud, disconnectCloud
} from '@/api/modules/gisSettings'
import CloudLoginModal from '@/components/cloud/CloudLoginModal.vue'

// ============ 本地后端配置 ============
const loading = ref(false)
const connecting = ref(false)
const disconnecting = ref(false)
const connectError = ref('')
// 连接失败即提供「重新登录」入口（msg 是 opaque 文案，不做字符串匹配判断失败类型）
const showRelogin = ref(false)

const config = reactive({
  server_token: '',
  sys_cloud_enabled: false,
  mcp_is_connected: false
})

const statusTag = computed(() => {
  if (!config.server_token) {
    return { text: '未配置', color: 'gray' }
  }
  if (config.sys_cloud_enabled) {
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
      server_token: d.server_token || '',
      sys_cloud_enabled: d.sys_cloud_enabled ?? false,
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

const openLoginModal = () => {
  loginModalVisible.value = true
}

// 登录成功：回填云端令牌到本地后端，并自动尝试连接
const handleLoginSuccess = async (token) => {
  config.server_token = token
  try {
    await cloudTokenLogin(token)
    await handleConnect()
  } catch (e) {
    // 错误已由拦截器提示
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
</style>
