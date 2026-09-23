<template>
  <div class="connection-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-tabs v-model:active-key="activeTab" type="rounded">
        <a-tab-pane v-for="tab in tabs" :key="tab.key" :title="tab.title">
          <component :is="tab.component" />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import NetworkTab from './components/NetworkTab.vue'
import MqttTab from './components/MqttTab.vue'
import BluetoothTab from './components/BluetoothTab.vue'
import CloudTab from './components/CloudTab.vue'
import { FEATURES } from '@/config/features'
import { useCapabilitiesStore } from '@/stores/capabilities'

const { t } = useI18n()
const capabilitiesStore = useCapabilitiesStore()

const activeTab = ref('network')

/**
 * Tab 清单 —— 三个显隐判据，**分属两个不同的问题，不要混**：
 *
 * 1. 蓝牙 / MQTT Tab → 由 `FEATURES` 决定（**不是** capabilities）
 *    「本版发不发这个入口」是产品决策；`/capabilities` 回答的是「后端有没有这个能力」。
 *    后端已定案 `hardware.mqtt` **恒 true**（本地 broker 是产品内置），绑它 Tab 反而
 *    会显示出来，与「本版收起 MQTT 配置」相反。详见 1016 §3.2 第三步 (c)。
 *    硬件线重开时只翻 `src/config/features.js` 的两个布尔值，不动本文件。
 *
 * 2. 云端 Tab → 由 `capabilities` 的 `integration.cloud.enabled` 决定
 *    ⚠️ 注意兜底值取 `true`（「**有则显示**」），不是 false：
 *      - 接口未上线 / 请求失败 → 拿不到真相，**不因此隐藏功能**（1016 §5.3 第 13 项 ④）；
 *      - 拿到且显式 `false`（云端凭据未配置）→ 隐藏（1016 §562 / 1015 §575
 *        「未配置则隐藏」，那里说的 default false 指**后端字段值**，不是前端兜底）。
 *
 * 顺序保持 network → mqtt → bluetooth → cloud，硬件线重开时 UI 与改造前完全一致。
 */
const tabs = computed(() => {
  const list = [{ key: 'network', title: t('settingsConnection.network'), component: NetworkTab }]

  if (FEATURES.connectionMqttTab) {
    list.push({ key: 'mqtt', title: t('settingsConnection.mqtt'), component: MqttTab })
  }
  if (FEATURES.connectionBluetoothTab) {
    list.push({ key: 'bluetooth', title: t('settingsConnection.bluetooth'), component: BluetoothTab })
  }
  if (capabilitiesStore.moduleEnabled('integration.cloud', true)) {
    list.push({ key: 'cloud', title: t('settingsConnection.cloud'), component: CloudTab })
  }

  return list
})
</script>

<style scoped>
.connection-page {
  padding: 0 0 24px;
}
</style>
