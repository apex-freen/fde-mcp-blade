<template>
  <div style="margin-top: 16px">
    <!-- Docker 环境提示 -->
    <a-alert v-if="isDocker" type="warning" style="margin-bottom: 16px">
      当前运行在 Docker 环境下，网络配置依赖宿主机，请直接修改宿主机网络设置。
    </a-alert>

    <template v-else>
      <a-tabs v-model:active-key="activeSubTab" type="line">
        <!-- 有线网络 -->
        <a-tab-pane key="wired" title="有线网络">
          <a-spin :loading="loading" style="width: 100%">
            <a-form :model="wiredForm" layout="vertical" style="max-width: 600px; margin-top: 16px">
              <a-form-item field="is_dhcp" label="联网方式">
                <a-radio-group v-model="wiredForm.is_dhcp">
                  <a-radio :value="true">DHCP 自动获取</a-radio>
                  <a-radio :value="false">静态 IP</a-radio>
                </a-radio-group>
              </a-form-item>
              <template v-if="!wiredForm.is_dhcp">
                <a-form-item field="ip" label="IP 地址">
                  <a-input v-model="wiredForm.ip" placeholder="如 192.168.1.100" />
                </a-form-item>
                <a-form-item field="netmask" label="子网掩码">
                  <a-input v-model="wiredForm.netmask" placeholder="如 255.255.255.0" />
                </a-form-item>
                <a-form-item field="gateway" label="网关">
                  <a-input v-model="wiredForm.gateway" placeholder="如 192.168.1.1" />
                </a-form-item>
              </template>
              <a-form-item field="dns" label="DNS 服务器">
                <a-input v-model="wiredForm.dns" placeholder="如 8.8.8.8" />
              </a-form-item>
              <a-form-item>
                <a-space>
                  <a-button type="primary" :loading="saving" @click="handleSaveWired">保存</a-button>
                </a-space>
              </a-form-item>
            </a-form>
          </a-spin>
        </a-tab-pane>

        <!-- 无线网络 -->
        <a-tab-pane key="wireless" title="无线网络">
          <a-spin :loading="loading" style="width: 100%">
            <a-descriptions
              v-if="wirelessInfo.ssid"
              :column="1"
              bordered
              size="small"
              style="margin-bottom: 16px; max-width: 600px"
            >
              <a-descriptions-item label="已连接 WiFi">{{ wirelessInfo.ssid }}</a-descriptions-item>
              <a-descriptions-item label="IP 地址">{{ wirelessInfo.ip || '-' }}</a-descriptions-item>
              <a-descriptions-item label="连接状态">
                <a-tag :color="wirelessInfo.is_active ? 'green' : 'gray'" size="small">
                  {{ wirelessInfo.is_active ? '已激活' : '未激活' }}
                </a-tag>
              </a-descriptions-item>
            </a-descriptions>

            <a-form :model="wirelessForm" layout="vertical" style="max-width: 600px">
              <a-form-item field="is_dhcp" label="IP 分配方式">
                <a-radio-group v-model="wirelessForm.is_dhcp">
                  <a-radio :value="true">DHCP 自动获取</a-radio>
                  <a-radio :value="false">静态 IP</a-radio>
                </a-radio-group>
              </a-form-item>
              <template v-if="!wirelessForm.is_dhcp">
                <a-form-item field="ip" label="IP 地址">
                  <a-input v-model="wirelessForm.ip" placeholder="如 192.168.1.101" />
                </a-form-item>
                <a-form-item field="netmask" label="子网掩码">
                  <a-input v-model="wirelessForm.netmask" placeholder="如 255.255.255.0" />
                </a-form-item>
                <a-form-item field="gateway" label="网关">
                  <a-input v-model="wirelessForm.gateway" placeholder="如 192.168.1.1" />
                </a-form-item>
              </template>
              <a-form-item field="dns" label="DNS 服务器">
                <a-input v-model="wirelessForm.dns" placeholder="如 8.8.8.8" />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" :loading="saving" @click="handleSaveWireless">保存 IP 配置</a-button>
              </a-form-item>
            </a-form>

            <a-divider />

            <div class="sub-title" style="margin-bottom: 12px">WiFi 列表</div>
            <a-space style="margin-bottom: 12px">
              <a-button @click="handleScanWifi" :loading="scanning">
                <template #icon><icon-search /></template>
                扫描 WiFi
              </a-button>
            </a-space>
            <a-table
              :columns="wifiColumns"
              :data="wifiList"
              :pagination="false"
              :bordered="{ wrapper: true, cell: true }"
              row-key="ssid"
            >
              <template #signal="{ record }">
                <a-tag :color="signalColor(record.signal)" size="small">{{ record.signal }}%</a-tag>
              </template>
              <template #operations="{ record }">
                <a-button type="text" size="small" @click="handleConnectWifi(record)">连接</a-button>
              </template>
            </a-table>
          </a-spin>
        </a-tab-pane>
      </a-tabs>
    </template>

    <!-- WiFi 连接弹窗 -->
    <a-modal
      v-model:visible="wifiModalVisible"
      title="连接 WiFi"
      :ok-loading="connecting"
      @ok="handleWifiSubmit"
      @cancel="wifiModalVisible = false"
    >
      <a-form :model="wifiForm" layout="vertical">
        <a-form-item field="ssid" label="WiFi 名称">
          <a-input v-model="wifiForm.ssid" disabled />
        </a-form-item>
        <a-form-item field="security" label="安全类型">
          <a-input v-model="wifiForm.security" disabled />
        </a-form-item>
        <a-form-item v-if="wifiForm.security !== 'NONE'" field="password" label="密码" required>
          <a-input-password v-model="wifiForm.password" placeholder="请输入 WiFi 密码" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Message } from '@arco-design/web-vue'
import { useUserStore } from '@/stores/user'
import {
  getWiredLan, updateWiredLan,
  getWirelessLan, updateWirelessLan,
  scanWifi, connectWifi
} from '@/api/modules/gisSettings'

const userStore = useUserStore()
const { isDocker } = storeToRefs(userStore)

const activeSubTab = ref('wired')
const loading = ref(false)
const saving = ref(false)

// 有线网络
const wiredForm = reactive({
  is_dhcp: true, ip: '', netmask: '', gateway: '', dns: ''
})

// 无线网络
const wirelessInfo = ref({})
const wirelessForm = reactive({
  is_dhcp: true, ip: '', netmask: '', gateway: '', dns: ''
})

// WiFi 扫描
const scanning = ref(false)
const wifiList = ref([])
const wifiColumns = [
  { title: 'WiFi 名称', dataIndex: 'ssid' },
  { title: '信号强度', slotName: 'signal', width: 120 },
  { title: '安全类型', dataIndex: 'security', width: 120 },
  { title: '操作', slotName: 'operations', width: 100 }
]

// WiFi 连接弹窗
const wifiModalVisible = ref(false)
const connecting = ref(false)
const wifiForm = reactive({ ssid: '', password: '', security: '' })

const signalColor = (signal) => {
  if (signal >= 70) return 'green'
  if (signal >= 40) return 'orange'
  return 'red'
}

const loadWired = async () => {
  if (isDocker.value) return
  try {
    const res = await getWiredLan()
    Object.assign(wiredForm, {
      is_dhcp: res.data.is_dhcp ?? true,
      ip: res.data.ip || '',
      netmask: res.data.netmask || '',
      gateway: res.data.gateway || '',
      dns: res.data.dns || ''
    })
  } catch (e) {
    // 错误已由拦截器提示
  }
}

const loadWireless = async () => {
  if (isDocker.value) return
  try {
    const res = await getWirelessLan()
    wirelessInfo.value = res.data || {}
    Object.assign(wirelessForm, {
      is_dhcp: res.data.is_dhcp ?? true,
      ip: res.data.ip || '',
      netmask: res.data.netmask || '',
      gateway: res.data.gateway || '',
      dns: res.data.dns || ''
    })
  } catch (e) {
    // 错误已由拦截器提示
  }
}

const handleSaveWired = async () => {
  saving.value = true
  try {
    await updateWiredLan({ ...wiredForm })
    Message.success('有线网络配置已保存')
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    saving.value = false
  }
}

const handleSaveWireless = async () => {
  saving.value = true
  try {
    await updateWirelessLan({ ...wirelessForm })
    Message.success('无线网络 IP 配置已保存')
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    saving.value = false
  }
}

const handleScanWifi = async () => {
  scanning.value = true
  try {
    const res = await scanWifi()
    wifiList.value = res.data || []
    Message.success(`扫描完成，发现 ${wifiList.value.length} 个 WiFi`)
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    scanning.value = false
  }
}

const handleConnectWifi = (record) => {
  wifiForm.ssid = record.ssid
  wifiForm.security = record.security
  wifiForm.password = ''
  wifiModalVisible.value = true
}

const handleWifiSubmit = async () => {
  if (wifiForm.security !== 'NONE' && !wifiForm.password) {
    Message.warning('请输入密码')
    return
  }
  connecting.value = true
  try {
    await connectWifi({
      ssid: wifiForm.ssid,
      password: wifiForm.password,
      security: wifiForm.security
    })
    Message.success(`已连接到 ${wifiForm.ssid}`)
    wifiModalVisible.value = false
    loadWireless()
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    connecting.value = false
  }
}

onMounted(() => {
  loadWired()
  loadWireless()
})
</script>

<style scoped>
.sub-title {
  font-size: 14px;
  font-weight: 500;
}
</style>
