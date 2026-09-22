<template>
  <div style="margin-top: 16px">
    <!-- Docker 环境提示 -->
    <a-alert v-if="isDocker" type="info">
      <template #title>蓝牙功能依赖宿主机硬件</template>
      Docker 环境下容器无法直接访问蓝牙设备。如需使用蓝牙功能，请在宿主机上进行配置，
      或通过 <code>--device /dev/bus/usb</code> 等方式将蓝牙设备映射到容器中。
    </a-alert>

    <template v-else>
      <a-spin :loading="loading" style="width: 100%">
        <a-form :model="form" layout="vertical" style="max-width: 600px">
          <a-alert type="info" style="margin-bottom: 16px">
            蓝牙配置为预留功能，暂未实现完整扫描和设备管理。
          </a-alert>

          <a-form-item field="enabled" label="启用蓝牙">
            <a-switch v-model="form.enabled">
              <template #checked>已启用</template>
              <template #unchecked>未启用</template>
            </a-switch>
          </a-form-item>
          <a-form-item field="name" label="蓝牙名称">
            <a-input v-model="form.name" placeholder="如 GIS-Gateway" />
          </a-form-item>
          <a-form-item field="discoverable" label="可被发现">
            <a-switch v-model="form.discoverable">
              <template #checked>允许其他设备发现</template>
              <template #unchecked>不可发现</template>
            </a-switch>
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-spin>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Message } from '@arco-design/web-vue'
import { useUserStore } from '@/stores/user'
import { getBluetoothConfig, updateBluetoothConfig } from '@/api/modules/gisSettings'

const userStore = useUserStore()
const { isDocker } = storeToRefs(userStore)

const loading = ref(false)
const saving = ref(false)
const form = reactive({
  enabled: false,
  name: '',
  discoverable: false
})

const loadConfig = async () => {
  if (isDocker.value) return
  loading.value = true
  try {
    const res = await getBluetoothConfig()
    Object.assign(form, {
      enabled: res.data.enabled ?? false,
      name: res.data.name || '',
      discoverable: res.data.discoverable ?? false
    })
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await updateBluetoothConfig({ ...form })
    Message.success('蓝牙配置已保存')
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
