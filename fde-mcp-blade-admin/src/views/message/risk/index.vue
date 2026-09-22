<template>
  <MessageList
    :list-api="api.gisMessage.getRiskList"
    :export-api="api.gisMessage.exportRisk"
    export-prefix="gis_message_risk"
    :empty-text="$t('message.riskEmpty')"
  />
</template>

<script setup>
// 风险提醒：event_level = 'risk'，权限码 message:risk:reminder
// 本次无 risk 级事件，页面常态为空态（空态不代表接口异常）
import { api } from '@/api'
import MessageList from '../components/MessageList.vue'
</script>
