<template>
  <div class="cloud-settings-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div class="section-title">
          <icon-cloud />
          <span>云端设置</span>
        </div>
      </template>

      <a-spin :loading="loading" style="width: 100%">
        <a-alert type="info" style="margin-bottom: 16px">
          云端设置用于管理设备与云端的连接：保存云端令牌，并通过开关控制云端连接的启停。
        </a-alert>

        <a-form :model="form" layout="vertical" style="max-width: 620px">
          <a-form-item label="云端开关">
            <a-space>
              <a-switch
                v-model="form.sys_cloud_enabled"
                :loading="switching"
                @change="handleToggle"
              />
              <span class="switch-hint">
                {{ form.sys_cloud_enabled ? '已开启，设备将与云端保持连接' : '已关闭，设备不会连接云端' }}
              </span>
            </a-space>
          </a-form-item>

          <a-form-item label="MCP 连接状态">
            <a-tag :color="state.mcp_is_connected ? 'green' : 'gray'" size="small">
              {{ state.mcp_is_connected ? '已连接' : '未连接' }}
            </a-tag>
          </a-form-item>

          <a-form-item label="云端令牌">
            <a-input
              v-model="form.server_token"
              placeholder="登录云端平台后回填的令牌"
              allow-clear
            />
            <template #extra>
              <a-button type="text" size="mini" @click="loginModalVisible = true">
                <template #icon><icon-refresh /></template>
                获取令牌 / 重新登录
              </a-button>
            </template>
          </a-form-item>

          <a-form-item>
            <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
          </a-form-item>
        </a-form>
      </a-spin>
    </a-card>

    <CloudLoginModal v-model="loginModalVisible" @success="handleLoginSuccess" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  getCloudConfig, updateCloudConfig,
  connectCloud, disconnectCloud
} from '@/api/modules/gisSettings'
import CloudLoginModal from '@/components/cloud/CloudLoginModal.vue'

const loading = ref(false)
const saving = ref(false)
const switching = ref(false)
const loginModalVisible = ref(false)

// 仅展示用状态：MCP 连接（mqtt_is_connected 云端 MQTT 已停用，恒 false，此处不展示）
const state = reactive({
  mcp_is_connected: false
})

// 可编辑 / 可提交字段
const form = reactive({
  server_token: '',
  sys_cloud_enabled: false
})

const loadConfig = async () => {
  loading.value = true
  try {
    const res = await getCloudConfig()
    const d = res.data || {}
    form.server_token = d.server_token || ''
    form.sys_cloud_enabled = d.sys_cloud_enabled ?? false
    state.mcp_is_connected = d.mcp_is_connected ?? false
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    // 该接口会同时写开关，必须带上当前值，避免误改开关状态
    await updateCloudConfig({
      server_token: form.server_token,
      sys_cloud_enabled: form.sys_cloud_enabled
    })
    Message.success('云端令牌已保存')
    loadConfig()
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    saving.value = false
  }
}

// 获取令牌成功：回填到输入框并保存（保存时会带上当前开关值）
const handleLoginSuccess = async (token) => {
  form.server_token = token
  await handleSave()
}

const handleToggle = async (value) => {
  switching.value = true
  try {
    if (value) {
      await connectCloud()
      Message.success('云端连接已启动')
    } else {
      await disconnectCloud()
      Message.success('云端连接已停止')
    }
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    switching.value = false
    // 无论成败都回拉真实状态，避免开关与实际不一致
    loadConfig()
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
.switch-hint {
  color: var(--color-text-3);
  font-size: 13px;
}
</style>
