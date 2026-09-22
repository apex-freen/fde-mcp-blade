<template>
  <div class="permission-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-tabs v-model:active-key="activeTab" type="rounded">
        <a-tab-pane key="menu" title="菜单">
          <MenuTab />
        </a-tab-pane>
        <a-tab-pane key="permission" title="权限点">
          <PermissionTab />
        </a-tab-pane>
        <a-tab-pane key="role" title="权限组">
          <RoleTab />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MenuTab from './components/MenuTab.vue'
import PermissionTab from './components/PermissionTab.vue'
import RoleTab from './components/RoleTab.vue'

// 当前激活的 Tab：menu 菜单 / permission 权限点 / role 权限组
const activeTab = ref('menu')
</script>

<style lang="scss" scoped>
.permission-page {
  padding: 0 0 24px;
}
</style>
