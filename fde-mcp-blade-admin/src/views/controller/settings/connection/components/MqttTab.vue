<template>
  <a-spin :loading="loading" style="width: 100%">
    <div style="margin-top: 16px">
      <a-alert type="info" style="margin-bottom: 16px">
        本页配置设备自身运行的 MQTT Broker 服务（本地 MQTT），供局域网内设备连接使用。<br>
        <strong>端口开放提醒：</strong>Docker 宿主机或本地设备需手动配置防火墙，开放服务端口（默认 <code>1883</code>，或您在此指定的端口）。<br>
        <strong>安全说明：</strong>出于系统安全策略，本系统不会自动添加防火墙规则，请管理员根据实际网络环境手动放行端口。
      </a-alert>

      <a-alert type="warning" style="margin-top: 16px">
        <template #icon><icon-lock /></template>
        MQTT 服务配置暂未开放，如需修改请联系系统管理员。
      </a-alert>
    </div>

    <!--
    <a-form :model="form" layout="vertical" style="max-width: 600px; margin-top: 16px">
      <a-form-item field="port" label="服务端口" required>
        <a-input-number v-model="form.port" :min="1" :max="65535" placeholder="如 1883" />
      </a-form-item>
      <a-form-item field="username" label="用户名" required>
        <a-input v-model="form.username" placeholder="连接用户名" />
      </a-form-item>
      <a-form-item field="password" label="密码" required>
        <a-input-password v-model="form.password" placeholder="连接密码" />
      </a-form-item>

      <a-form-item>
        <a-space>
          <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
        </a-space>
      </a-form-item>
    </a-form>
    -->
  </a-spin>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { getMqttServer, updateMqttServer } from '@/api/modules/gisSettings'

const loading = ref(false)
const saving = ref(false)
const form = reactive({
  port: 1883,
  username: '',
  password: ''
})

const loadConfig = async () => {
  loading.value = true
  try {
    const res = await getMqttServer()
    Object.assign(form, {
      port: res.data.port ?? 1883,
      username: res.data.username || '',
      password: res.data.password || ''
    })
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!form.port || !form.username || !form.password) {
    Message.warning('请填写完整配置')
    return
  }
  saving.value = true
  try {
    await updateMqttServer({ ...form })
    Message.success('本地 MQTT 服务配置已保存')
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
})
</script>
