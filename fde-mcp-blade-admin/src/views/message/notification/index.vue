<template>
  <MessageList
    :list-api="api.gisMessage.getNotificationList"
    :export-api="api.gisMessage.exportNotification"
    export-prefix="gis_message_notification"
  />
</template>

<script setup>
// 系统通知：event_level IN ('todo','alert','notice')，权限码 message:notification
import { api } from '@/api'
import MessageList from '../components/MessageList.vue'
</script>
