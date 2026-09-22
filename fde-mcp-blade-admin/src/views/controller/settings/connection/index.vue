<template>
  <div class="connection-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-tabs v-model:active-key="activeTab" type="rounded">
        <a-tab-pane key="network" :title="$t('settingsConnection.network')">
          <NetworkTab />
        </a-tab-pane>
        <a-tab-pane key="mqtt" :title="$t('settingsConnection.mqtt')">
          <MqttTab />
        </a-tab-pane>
        <a-tab-pane key="bluetooth" :title="$t('settingsConnection.bluetooth')">
          <BluetoothTab />
        </a-tab-pane>
        <a-tab-pane key="cloud" :title="$t('settingsConnection.cloud')">
          <CloudTab />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import NetworkTab from './components/NetworkTab.vue'
import MqttTab from './components/MqttTab.vue'
import BluetoothTab from './components/BluetoothTab.vue'
import CloudTab from './components/CloudTab.vue'

const { t } = useI18n()
const activeTab = ref('network')
</script>

<style scoped>
.connection-page {
  padding: 0 0 24px;
}
</style>
