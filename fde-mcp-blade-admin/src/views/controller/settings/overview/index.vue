<template>
  <div class="overview-page">
    <!-- 设备信息卡片 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div class="section-title">
          <icon-storage />
          <span>{{ $t('settingsOverview.deviceInfo') }}</span>
        </div>
      </template>
      <template #extra>
        <a-button type="text" size="small" @click="handleEditDevice">
          <template #icon><icon-edit /></template>
          {{ $t('settingsOverview.edit') }}
        </a-button>
      </template>

      <a-spin :loading="deviceLoading" style="width: 100%">
        <a-descriptions :column="3" bordered>
          <a-descriptions-item :label="$t('settingsOverview.deviceName')">{{ deviceInfo.device_name || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="$t('settingsOverview.deviceId')">{{ deviceInfo.device_id || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="$t('settingsOverview.firmwareVersion')">{{ deviceInfo.firmware_version || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="$t('settingsOverview.deviceDesc')">{{ deviceInfo.device_desc || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="$t('settingsOverview.deviceArea')">{{ deviceInfo.device_area || '-' }}</a-descriptions-item>
          <a-descriptions-item :label="$t('settingsOverview.devicePassword')">******</a-descriptions-item>
        </a-descriptions>
      </a-spin>
    </a-card>

    <!-- 系统监控卡片 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div class="section-title">
          <icon-dashboard />
          <span>{{ $t('settingsOverview.systemMonitor') }}</span>
          <a-tag :color="healthInfo.is_online ? 'green' : 'red'" size="small">
            {{ healthInfo.is_online ? $t('settingsOverview.online') : $t('settingsOverview.offline') }}
          </a-tag>
        </div>
      </template>
      <template #extra>
        <a-button type="text" size="small" @click="loadHealth">
          <template #icon><icon-refresh /></template>
          {{ $t('settingsOverview.refresh') }}
        </a-button>
      </template>

      <a-spin :loading="healthLoading" style="width: 100%">
        <a-alert v-if="isDocker" type="info" style="margin-bottom: 16px">
          {{ $t('settingsOverview.dockerAlert') }}
        </a-alert>
        <a-row :gutter="16">
          <a-col :span="6" v-for="metric in metrics" :key="metric.label">
            <a-card :bordered="false" class="metric-card">
              <div class="metric-label">{{ metric.label }}</div>
              <div class="metric-value">
                {{ metric.value }}<span class="metric-unit">{{ metric.unit }}</span>
              </div>
              <a-progress
                v-if="metric.percent !== null"
                :percent="metric.percent"
                :color="metric.percent > 80 ? '#f53f3f' : metric.percent > 60 ? '#ff7d00' : '#00b42a'"
                :show-text="false"
                size="mini"
              />
              <div v-if="metric.percent !== null" class="metric-foot">{{ metric.percent }}% {{ $t('settingsOverview.used') }}</div>
              <div v-else class="metric-foot metric-foot--muted">{{ $t('settingsOverview.reserved') }}</div>
            </a-card>
          </a-col>
        </a-row>

        <a-divider />

        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item :label="$t('settingsOverview.memoryUsedTotal')">
            {{ formatBytes(healthInfo.memory_used) }} / {{ formatBytes(healthInfo.memory_total) }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('settingsOverview.diskUsedTotal')">
            {{ formatBytes(healthInfo.disk_used) }} / {{ formatBytes(healthInfo.disk_total) }}
          </a-descriptions-item>
          <a-descriptions-item :label="$t('settingsOverview.uptime')">{{ formatUptime(healthInfo.uptime_seconds) }}</a-descriptions-item>
          <a-descriptions-item :label="$t('settingsOverview.onlineStatus')">
            <a-tag :color="healthInfo.is_online ? 'green' : 'red'" size="small">
              {{ healthInfo.is_online ? $t('settingsOverview.online') : $t('settingsOverview.offline') }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </a-spin>
    </a-card>

    <!-- 设备信息编辑弹窗 -->
    <a-modal
      v-model:visible="deviceModalVisible"
      :title="$t('settingsOverview.editDeviceTitle')"
      :ok-loading="deviceSaving"
      @ok="handleDeviceSubmit"
      @cancel="deviceModalVisible = false"
    >
      <a-form :model="deviceForm" layout="vertical">
        <a-form-item field="device_name" :label="$t('settingsOverview.deviceName')" required>
          <a-input v-model="deviceForm.device_name" />
        </a-form-item>
        <a-form-item field="device_desc" :label="$t('settingsOverview.deviceDesc')">
          <a-input v-model="deviceForm.device_desc" />
        </a-form-item>
        <a-form-item field="device_area" :label="$t('settingsOverview.deviceArea')">
          <a-input v-model="deviceForm.device_area" />
        </a-form-item>
        <a-form-item field="device_password" :label="$t('settingsOverview.devicePassword')">
          <a-input-password v-model="deviceForm.device_password" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { getDeviceInfo, updateDeviceInfo, getSystemHealth } from '@/api/modules/gisSettings'

const { t } = useI18n()
const userStore = useUserStore()
const { isDocker } = storeToRefs(userStore)

// ============ 设备信息 ============
const deviceLoading = ref(false)
const deviceInfo = ref({})
const deviceModalVisible = ref(false)
const deviceSaving = ref(false)
const deviceForm = reactive({
  device_name: '',
  device_desc: '',
  device_area: '',
  device_password: '',
  device_id: '',
  firmware_version: ''
})

const loadDeviceInfo = async () => {
  deviceLoading.value = true
  try {
    const res = await getDeviceInfo()
    deviceInfo.value = res.data || {}
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    deviceLoading.value = false
  }
}

const handleEditDevice = () => {
  Object.assign(deviceForm, {
    device_name: deviceInfo.value.device_name || '',
    device_desc: deviceInfo.value.device_desc || '',
    device_area: deviceInfo.value.device_area || '',
    device_password: deviceInfo.value.device_password || '',
    device_id: deviceInfo.value.device_id || '',
    firmware_version: deviceInfo.value.firmware_version || ''
  })
  deviceModalVisible.value = true
}

const handleDeviceSubmit = async () => {
  if (!deviceForm.device_name) {
    Message.warning(t('settingsOverview.nameRequired'))
    return
  }
  deviceSaving.value = true
  try {
    await updateDeviceInfo({ ...deviceForm })
    Message.success(t('settingsOverview.updateSuccess'))
    deviceModalVisible.value = false
    loadDeviceInfo()
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    deviceSaving.value = false
  }
}

// ============ 系统监控 ============
const healthLoading = ref(false)
const healthInfo = ref({})

const metrics = computed(() => [
  { label: 'CPU', value: healthInfo.value.cpu_usage ?? '--', unit: '%', percent: healthInfo.value.cpu_usage },
  { label: 'Memory', value: healthInfo.value.memory_usage ?? '--', unit: '%', percent: healthInfo.value.memory_usage },
  { label: 'Disk', value: healthInfo.value.disk_usage ?? '--', unit: '%', percent: healthInfo.value.disk_usage },
  { label: t('settingsOverview.onlineStatus'), value: healthInfo.value.is_online ? t('settingsOverview.online') : t('settingsOverview.offline'), unit: '', percent: null }
])

const loadHealth = async () => {
  healthLoading.value = true
  try {
    const res = await getSystemHealth()
    healthInfo.value = res.data || {}
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    healthLoading.value = false
  }
}

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
  return (bytes / 1073741824).toFixed(1) + ' GB'
}

const formatUptime = (seconds) => {
  if (seconds === null || seconds === undefined) return '-'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}天 ${h}小时`
  if (h > 0) return `${h}小时 ${m}分钟`
  return `${m}分钟`
}

onMounted(() => {
  loadDeviceInfo()
  loadHealth()
})
</script>

<style scoped>
.overview-page {
  padding: 0 0 24px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title svg {
  font-size: 18px;
}
.metric-card {
  text-align: center;
}
.metric-label {
  font-size: 13px;
  color: var(--color-text-2);
  margin-bottom: 8px;
}
.metric-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}
.metric-unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-3);
  margin-left: 4px;
}
.metric-foot {
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 8px;
}
.metric-foot--muted {
  color: var(--color-text-4);
}
</style>
