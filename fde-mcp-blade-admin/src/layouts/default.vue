<template>
  <!-- 数据大屏（/screen/*）：不渲染侧边栏与顶栏，整屏交给页面自己排版（Doc 37 §2.2） -->
  <div v-if="isScreenMode" class="screen-shell">
    <router-view v-slot="{ Component, route: screenRoute }">
      <component :is="Component" :key="screenRoute.path" />
    </router-view>
  </div>

  <div v-else class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
      <div class="sidebar-brand" @click="handleBrandClick">
        <img class="brand-logo" :src="logoMark" alt="FDE MCP Blade" />
        <span v-if="!appStore.sidebarCollapsed" class="brand-title">{{ t('layout.brandTitle') }}</span>
      </div>
      <a-menu
        class="sidebar-menu"
        :selected-keys="selectedKeys"
        v-model:open-keys="openKeys"
        theme="light"
      >
        <template v-for="group in userStore.menuList" :key="group.key">
          <a-sub-menu v-if="group.children && group.children.length" :key="group.key">
            <template #title>
              <span class="menu-group-title">{{ getMenuTitle(group) }}</span>
            </template>
            <template v-for="item in group.children" :key="item.key">
              <a-sub-menu v-if="item.children && item.children.length" :key="item.key">
                <template #title>{{ getMenuTitle(item) }}</template>
                <a-menu-item
                  v-for="sub in item.children"
                  :key="sub.key"
                  @click="handleMenuItemClick(sub)"
                >
                  {{ getMenuTitle(sub) }}
                </a-menu-item>
              </a-sub-menu>
              <a-menu-item v-else :key="item.key" @click="handleMenuItemClick(item)">
                {{ getMenuTitle(item) }}
              </a-menu-item>
            </template>
          </a-sub-menu>
          <a-menu-item v-else :key="group.key" @click="handleMenuItemClick(group)">
            {{ getMenuTitle(group) }}
          </a-menu-item>
        </template>
      </a-menu>
    </aside>

    <!-- 主内容区 -->
    <div class="main-area">
      <!-- 顶部栏 -->
      <header class="header">
        <div class="header-top">
          <div class="header-left">
            <a-button type="text" class="collapse-btn" @click="appStore.toggleSidebar">
              <template #icon><icon-menu-fold v-if="!appStore.sidebarCollapsed" /><icon-menu-unfold v-else /></template>
            </a-button>
            <a-breadcrumb class="breadcrumb">
              <a-breadcrumb-item v-for="(item, index) in breadcrumbList" :key="index">
                {{ item }}
              </a-breadcrumb-item>
            </a-breadcrumb>
          </div>
          <div class="header-right">
          <a-tooltip :content="t('common.search')">
            <a-button type="text" class="header-btn">
              <template #icon><icon-search /></template>
            </a-button>
          </a-tooltip>
          <a-tooltip :content="t('common.help')">
            <a-button type="text" class="header-btn">
              <template #icon><icon-question-circle /></template>
            </a-button>
          </a-tooltip>
          <a-badge :count="3" :dot="true">
            <a-tooltip :content="t('common.notification')">
              <a-button type="text" class="header-btn">
                <template #icon><icon-notification /></template>
              </a-button>
            </a-tooltip>
          </a-badge>

          <a-dropdown>
            <a-tooltip :content="t('common.language')">
              <a-button type="text" class="header-btn lang-btn">
                <template #icon><icon-language /></template>
                <span class="lang-text">{{ appStore.locale === 'zh-CN' ? '中' : 'EN' }}</span>
              </a-button>
            </a-tooltip>
            <template #content>
              <a-doption @click="appStore.setLocale('zh-CN')">
                <template #icon><icon-check v-if="appStore.locale === 'zh-CN'" /></template>
                {{ t('common.chinese') }}
              </a-doption>
              <a-doption @click="appStore.setLocale('en-US')">
                <template #icon><icon-check v-if="appStore.locale === 'en-US'" /></template>
                {{ t('common.english') }}
              </a-doption>
            </template>
          </a-dropdown>

          <a-dropdown>
            <div class="user-info">
              <a-avatar :size="32" :style="{ background: 'linear-gradient(135deg, #165DFF, #4080FF)' }">
                {{ userStore.userName.charAt(0).toUpperCase() }}
              </a-avatar>
              <span class="user-name">{{ userStore.userName }}</span>
              <icon-down />
            </div>
            <template #content>
              <a-doption @click="handleProfileClick">
                <template #icon><icon-user /></template>
                {{ t('common.profile') }}
              </a-doption>
              <a-doption @click="handleLogout">
                <template #icon><icon-poweroff /></template>
                {{ t('common.logout') }}
              </a-doption>
            </template>
          </a-dropdown>
          </div>
        </div>
        <!-- 功能模块简介栏 -->
        <div class="page-description" v-if="pageDescription">
          <icon-info-circle class="page-description-icon" />
          <span>{{ pageDescription }}</span>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="content">
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <div :key="route.path" class="page-wrapper">
              <component :is="Component" />
            </div>
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
// 图标通过 ArcoVueIcon 全局注册，无需单独导入
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import logoMark from '@/assets/brand/logo-mark.svg'

const { t, tm, te } = useI18n()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

// 数据大屏路由：/screen 前缀 → 隐藏侧边栏 / 顶栏（Doc 37 §2.2）
const isScreenMode = computed(() => route.path.startsWith('/screen'))

function getMenuTitle(item) {
  if (item.i18nKey && te(item.i18nKey)) {
    return t(item.i18nKey)
  }
  return item.title || ''
}

const selectedKeys = ref([])
const openKeys = ref([])

function findParentKeys(menuList, path) {
  const keys = []
  function traverse(items) {
    for (const item of items) {
      if (item.path === path) {
        return keys
      }
      if (item.children && item.children.length) {
        keys.push(item.key)
        const found = traverse(item.children)
        if (found) return keys
        keys.pop()
      }
    }
    return null
  }
  traverse(menuList)
  return keys
}

function findMenuKeyByPath(menuList, path) {
  function traverse(items) {
    for (const item of items) {
      if (item.path === path) {
        return item.key
      }
      if (item.children && item.children.length) {
        const found = traverse(item.children)
        if (found) return found
      }
    }
    return null
  }
  return traverse(menuList)
}

function updateMenuState() {
  if (userStore.menuList.length > 0) {
    const menuKey = findMenuKeyByPath(userStore.menuList, route.path)
    selectedKeys.value = menuKey ? [menuKey] : []
    openKeys.value = findParentKeys(userStore.menuList, route.path)
  }
}

function findMenuItemByPath(menuList, path) {
  function traverse(items) {
    for (const item of items) {
      if (item.path === path) {
        return item
      }
      if (item.children && item.children.length) {
        const found = traverse(item.children)
        if (found) return found
      }
    }
    return null
  }
  return traverse(menuList)
}

// 面包屑
const breadcrumbList = computed(() => {
  const matched = route.matched.filter(item => item.meta?.title)
  return matched.map(item => {
    const menuItem = findMenuItemByPath(userStore.menuList, item.path)
    if (menuItem?.i18nKey && te(menuItem.i18nKey)) {
      return t(menuItem.i18nKey)
    }
    return item.meta.title
  })
})

// 功能模块简介（优先使用 i18n key，兼容旧 description 字段）
const pageDescription = computed(() => {
  const key = route.meta?.descriptionKey
  if (key) return t(key)
  return route.meta?.description || ''
})

watch(
  () => userStore.menuList,
  () => {
    updateMenuState()
  },
  { immediate: true, deep: true }
)

watch(
  () => route.path,
  () => {
    updateMenuState()
  },
  { immediate: true }
)

function handleMenuItemClick(item) {
  // 支持外链：若菜单项配置了 external_url，则在新标签页打开
  if (item && item.external_url) {
    window.open(item.external_url, '_blank', 'noopener,noreferrer')
    return
  }
  const path = typeof item === 'string' ? item : item?.path
  if (path && path !== route.path) {
    router.push(path)
  }
}

function handleBrandClick() {
  // 默认首页由后端菜单树第一个可访问菜单决定
  router.push(userStore.firstMenuPath || '/')
}

function handleProfileClick() {
  router.push('/workspace/profile/index')
}

function handleLogout() {
  Modal.confirm({
    title: t('layout.confirmLogout'),
    content: t('layout.confirmLogoutContent'),
    okText: t('layout.confirmLogoutOk'),
    cancelText: t('layout.confirmLogoutCancel'),
    onOk: async () => {
      await userStore.logout()
      router.push('/login')
      Message.success(t('layout.logoutSuccess'))
    }
  })
}
</script>

<style lang="scss" scoped>
// 数据大屏容器：深空渐变底 + 网格 + 扫描线，整屏不出现页面级滚动条（Doc 37 §3.6）
// 背景只是「舞台」，不承载信息；三层径向渐变制造纵深，网格层中心清晰、四周淡出
.screen-shell {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #050a16;
  background-image:
    radial-gradient(58vw 62vh at 10% -10%, rgba(53, 230, 255, 0.18), transparent 62%),
    radial-gradient(52vw 56vh at 92% -6%, rgba(77, 141, 255, 0.22), transparent 60%),
    radial-gradient(70vw 60vh at 50% 118%, rgba(139, 92, 246, 0.16), transparent 66%),
    linear-gradient(180deg, #071026 0%, #060c1c 46%, #04080f 100%);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, rgba(90, 150, 255, 0.06) 0 1px, transparent 1px 48px),
      repeating-linear-gradient(90deg, rgba(90, 150, 255, 0.06) 0 1px, transparent 1px 48px);
    -webkit-mask-image: radial-gradient(
      circle at 50% 45%,
      #000 0%,
      rgba(0, 0, 0, 0.5) 58%,
      transparent 100%
    );
    mask-image: radial-gradient(circle at 50% 45%, #000 0%, rgba(0, 0, 0, 0.5) 58%, transparent 100%);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.02) 0 1px,
      transparent 1px 3px
    );
    pointer-events: none;
  }
}

.app-layout {
  display: flex;
  height: 100vh;
  width: 100%;
  background: $color-bg;
}

.sidebar {
  width: $sidebar-width;
  background: $color-bg-card;
  border-right: 1px solid $color-border-light;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  flex-shrink: 0;

  &.collapsed {
    width: $sidebar-width-collapsed;
  }
}

.sidebar-brand {
  height: $header-height;
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: 0 $space-5;
  cursor: pointer;
  border-bottom: 1px solid $color-border-light;
  flex-shrink: 0;
}

.brand-logo {
  width: 32px;
  height: 32px;
  display: block;
  flex-shrink: 0;
}

.brand-title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $color-text;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border: none;
  padding: $space-2 0;
}

.menu-group-title {
  font-weight: 500;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.header {
  background: $color-bg-card;
  border-bottom: 1px solid $color-border-light;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.header-top {
  height: $header-height;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-6;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.collapse-btn {
  font-size: 18px;
}

.breadcrumb {
  font-size: $font-size-base;
}

.page-description {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-sm;
  color: $color-text-tertiary;
  padding: $space-2 $space-6;
  background: $color-bg;
  border-top: 1px solid $color-border-light;
  line-height: 1.4;

  &-icon {
    flex-shrink: 0;
    font-size: 14px;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.header-btn {
  font-size: 16px;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lang-text {
  font-size: 12px;
  font-weight: 500;
}

.user-info {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-1 $space-3;
  border-radius: $radius;
  cursor: pointer;
  transition: background 0.15s;
  margin-left: $space-2;

  &:hover {
    background: $color-bg-hover;
  }
}

.user-name {
  font-size: $font-size-base;
  font-weight: 500;
  color: $color-text;
}

.content {
  flex: 1;
  padding: $space-6;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
