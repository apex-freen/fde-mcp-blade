<template>
  <MessageList
    :list-api="api.gisMessage.getAllList"
    :export-api="api.gisMessage.exportAll"
    export-prefix="gis_message_all"
    show-channel-config
  />
</template>

<script setup>
// 全部消息：无级别过滤，权限码 message:all
// 通知插件配置（读/写均使用 message:all）也挂在「全部消息」页，消息相关配置在消息中心内闭合
import { api } from '@/api'
import MessageList from '../components/MessageList.vue'
</script>
