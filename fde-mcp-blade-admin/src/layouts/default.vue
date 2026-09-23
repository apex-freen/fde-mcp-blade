<template>
  <!-- 数据大屏（/screen/*）：不渲染侧边栏与顶栏，整屏交给页面自己排版（Doc 37 §2.2） -->
  <div v-if="isScreenMode" class="screen-shell">
    <router-view v-slot="{ Component, route: screenRoute }">
      <component :is="Component" :key="screenRoute.path" />
    </router-view>
  </div>

  <div v-else class="app-layout">
    <!-- ==================== 侧边导航 ==================== -->
    <aside class="side" :class="{ 'side-hidden': appStore.sidebarCollapsed }">
      <div class="side-head" @click="handleBrandClick">
        <img class="side-logo" :src="logoMark" alt="FDE MCP Blade" />
        <div class="side-name">{{ t('layout.brandTitle') }}</div>
        <div class="side-env">{{ envBadge }}</div>
      </div>

      <nav class="side-nav">
        <div v-for="(group, gi) in userStore.menuList" :key="group.key" class="grp">
          <!-- 一级：有子项 → 分组标题（不可折叠，与 v1 设计一致） -->
          <div v-if="hasChildren(group)" class="grp-head" :class="'g-' + groupTone(gi)">
            <i class="grp-bar"></i>
            <span class="grp-label">{{ getMenuTitle(group) }}</span>
          </div>
          <!-- 一级：无子项 → 直接就是页面 -->
          <button v-else class="nav-item" :class="{ on: isActive(group) }" @click="go(group)">
            <NavIcon :item="group" />
            <span class="nav-label">{{ getMenuTitle(group) }}</span>
          </button>

          <!-- 二级 / 三级 -->
          <template v-for="lv2 in group.children || []" :key="lv2.key">
            <div v-if="hasChildren(lv2)" class="sub">
              <button class="sub-head" @click="toggleSub(lv2.key)">
                <span class="sub-label">{{ getMenuTitle(lv2) }}</span>
                <icon-down class="sub-chev" :class="{ open: isSubOpen(lv2.key) }" />
              </button>
              <div v-show="isSubOpen(lv2.key)" class="sub-body">
                <button
                  v-for="lv3 in lv2.children"
                  :key="lv3.key"
                  class="nav-item lv3"
                  :class="{ on: isActive(lv3) }"
                  @click="go(lv3)"
                >
                  <NavIcon :item="lv3" />
                  <span class="nav-label">{{ getMenuTitle(lv3) }}</span>
                </button>
              </div>
            </div>
            <button v-else class="nav-item" :class="{ on: isActive(lv2) }" @click="go(lv2)">
              <NavIcon :item="lv2" />
              <span class="nav-label">{{ getMenuTitle(lv2) }}</span>
            </button>
          </template>
        </div>
      </nav>

      <div class="side-foot">
        <a-dropdown trigger="click" position="tl">
          <div class="user">
            <div class="user-avatar">{{ userInitial }}</div>
            <div class="user-info">
              <b>{{ userStore.userName }}</b>
              <span>{{ userSubtitle }}</span>
            </div>
            <icon-up class="user-chev" />
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
    </aside>

    <!-- ==================== 主区 ==================== -->
    <div class="main-area">
      <header class="top">
        <button
          class="tb-ic"
          :title="appStore.sidebarCollapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')"
          @click="appStore.toggleSidebar"
        >
          <icon-menu-unfold v-if="appStore.sidebarCollapsed" />
          <icon-menu-fold v-else />
        </button>

        <a-breadcrumb class="breadcrumb">
          <a-breadcrumb-item v-for="(item, index) in breadcrumbList" :key="index">
            {{ item }}
          </a-breadcrumb-item>
        </a-breadcrumb>

        <!-- 搜索入口：命令面板在 M4 接入，当前给出明确反馈，不做"点了没反应"的假 UI -->
        <div class="tb-search" @click="handleSearchClick">
          <icon-search />
          <span class="tb-search-text">{{ t('layout.searchPlaceholder') }}</span>
          <span class="kbd">{{ kbdHint }}</span>
        </div>

        <!-- 待办红点：数据源 gis_approval_request/pending，且仅权限点 7 才发起请求 -->
        <a-tooltip v-if="canSeeApproval" :content="t('layout.notificationPending')">
          <button class="tb-ic" @click="handleBellClick">
            <icon-notification />
            <span v-if="pendingCount > 0" class="tb-dot">{{ pendingText }}</span>
          </button>
        </a-tooltip>

        <div class="seg" role="group" :aria-label="t('common.language')">
          <button :class="{ on: appStore.locale === 'zh-CN' }" @click="appStore.setLocale('zh-CN')">
            中
          </button>
          <button :class="{ on: appStore.locale === 'en-US' }" @click="appStore.setLocale('en-US')">
            EN
          </button>
        </div>

        <div class="seg" role="group">
          <button
            :class="{ on: appStore.theme === 'light' }"
            :title="t('layout.themeLight')"
            @click="appStore.setTheme('light')"
          >
            <icon-sun />
          </button>
          <button
            :class="{ on: appStore.theme === 'dark' }"
            :title="t('layout.themeDark')"
            @click="appStore.setTheme('dark')"
          >
            <icon-moon />
          </button>
          <button
            :class="{ on: appStore.theme === 'auto' }"
            :title="t('layout.themeAuto')"
            @click="appStore.setTheme('auto')"
          >
            <icon-desktop />
          </button>
        </div>
      </header>

      <!-- 功能模块简介栏 -->
      <div v-if="pageDescription" class="page-description">
        <icon-info-circle class="page-description-icon" />
        <span>{{ pageDescription }}</span>
      </div>

      <!-- 小屏提示：配置类页面（管理中心）在 ≤860px 只给提示，不做移动端表单适配（1016 §5.1 第 6 项） -->
      <a-alert v-if="isSmallScreen && isConfigRoute" type="warning" class="sm-hint">
        {{ t('layout.smallScreenHint') }}
      </a-alert>

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

    <!-- ==================== 小屏底部 Tab（1016 §5.1 第 6 项） ==================== -->
    <nav v-if="!isScreenMode" class="mobile-tabbar" :class="{ show: isSmallScreen }">
      <button
        v-for="tab in mobileTabs"
        :key="tab.key"
        class="mtab"
        :class="{ on: tab.key === activeTabKey }"
        @click="go(tab.path)"
      >
        <NavIcon :item="tab.icon" />
        <span class="mtab-label">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
// 图标通过 ArcoVueIcon 全局注册，无需单独导入
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { api } from '@/api'
import logoMark from '@/assets/brand/logo-mark.svg'
import NavIcon from '@/components/common/NavIcon.vue'

const { t, tm, te } = useI18n()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

// 数据大屏路由：/screen 前缀 → 隐藏侧边栏 / 顶栏（Doc 37 §2.2）
const isScreenMode = computed(() => route.path.startsWith('/screen'))

// 环境标（纯标识，不做 i18n：DEV / TEST / PROD 是通用缩写，与 design-preview 一致）
const envBadge = computed(() => {
  const m = (import.meta.env.MODE || '').toLowerCase()
  if (m.startsWith('dev')) return 'DEV'
  if (m.startsWith('test')) return 'TEST'
  return 'PROD'
})

// ⌘K 还是 Ctrl K：按平台给提示，不做想当然的 mac 化
const kbdHint = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'

const userInitial = computed(() => (userStore.userName || '?').charAt(0).toUpperCase())
const userSubtitle = computed(() => userStore.roles?.[0] || t('common.user'))

function getMenuTitle(item) {
  if (item.i18nKey && te(item.i18nKey)) {
    return t(item.i18nKey)
  }
  return item.title || ''
}

const hasChildren = (item) => Array.isArray(item?.children) && item.children.length > 0

// ==================== 菜单选中 / 展开 ====================
const selectedKey = ref('')
const openSubs = ref([])

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

/** 当前路由在菜单树上的祖先链（level2 的 key 列表），用于自动展开所在分组 */
function findAncestorKeys(menuList, path) {
  const trail = []
  function traverse(items) {
    for (const item of items) {
      if (item.path === path) return true
      if (item.children && item.children.length) {
        trail.push(item.key)
        if (traverse(item.children)) return true
        trail.pop()
      }
    }
    return false
  }
  traverse(menuList)
  return trail
}

function updateMenuState() {
  if (userStore.menuList.length === 0) return
  selectedKey.value = findMenuKeyByPath(userStore.menuList, route.path) || ''
  // 只增不减：用户手动展开的分组不会因为切路由被收起来
  const ancestors = findAncestorKeys(userStore.menuList, route.path)
  openSubs.value = [...new Set([...openSubs.value, ...ancestors])]
}

const isActive = (item) => !!item?.key && item.key === selectedKey.value
const isSubOpen = (key) => openSubs.value.includes(key)

function toggleSub(key) {
  openSubs.value = isSubOpen(key)
    ? openSubs.value.filter((k) => k !== key)
    : [...openSubs.value, key]
}

/** 分组彩条取色：按顺序循环 蓝 → 紫 → 青 → 琥珀（与 v1 四中心配色对应） */
const TONES = ['blue', 'violet', 'teal', 'amber']
const groupTone = (index) => TONES[index % TONES.length]

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

// ==================== 待办红点（1016 §5.1 第 2 项）====================
// 数据源：GET /biz/gis_approval_request/pending 的 total。
//
// 🔴 必须只对**持有权限点 7（workspace:approval:pending）**的账号发起：
//    该接口挂在该权限点上，无权限账号调用会 403；而且它本来就看不到「授权待办」
//    菜单，给它渲染红点没有意义。所以这里是「先判权限，再发请求」，
//    不是「先请求，失败再隐藏」——后者会在控制台留下一串 403。
const APPROVAL_PERM = 'workspace:approval:pending'
const pendingCount = ref(0)

const canSeeApproval = computed(() => (userStore.permissions || []).includes(APPROVAL_PERM))

const pendingText = computed(() => (pendingCount.value > 99 ? '99+' : String(pendingCount.value)))

async function fetchPendingCount() {
  if (!canSeeApproval.value) return
  try {
    // page_size 传 1：只要 total，不拉数据
    const res = await api.gisApprovalRequest.getPendingApprovals({ page: 1, page_size: 1 })
    const data = res?.data || res || {}
    pendingCount.value = Number(data.total) || 0
  } catch (e) {
    // 该模块统一 showError:false，这里静默；红点不是关键路径，失败就不显示
    pendingCount.value = 0
  }
}

// 菜单路径里找「授权待办」的落点：不写死 URL，跟着后端菜单走
const approvalPath = computed(() => {
  let hit = ''
  function traverse(items) {
    for (const item of items) {
      if (!hit && typeof item.path === 'string' && item.path.includes('/workspace/approval')) {
        hit = item.path
      }
      if (item.children?.length) traverse(item.children)
    }
  }
  traverse(userStore.menuList)
  return hit
})

function handleBellClick() {
  if (approvalPath.value) router.push(approvalPath.value)
}

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

watch(canSeeApproval, (ok) => {
  if (ok) fetchPendingCount()
})

onMounted(() => {
  fetchPendingCount()
})

// ==================== 小屏只读视图（1016 §5.1 第 6 项） ====================
// ≤860px：侧栏收起为底部 Tab（顶级菜单分组）；配置类页面（管理中心）提示用桌面端。
// 断点与既有 CSS 媒体查询（.tb-search 隐藏）保持一致。
const isSmallScreen = ref(false)
let smMql = null

function updateSmallScreen() {
  isSmallScreen.value = !!smMql?.matches
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    smMql = window.matchMedia('(max-width: 860px)')
    updateSmallScreen()
    if (smMql.addEventListener) smMql.addEventListener('change', updateSmallScreen)
    else smMql.addListener(updateSmallScreen)
  }
})

onUnmounted(() => {
  if (!smMql) return
  if (smMql.removeEventListener) smMql.removeEventListener('change', updateSmallScreen)
  else smMql.removeListener(updateSmallScreen)
})

const isConfigRoute = computed(() => route.path.startsWith('/controller'))

// 底部 Tab = 顶级菜单分组；分组点击落到其第一个叶子页面（不写死 URL，跟着菜单树走）
const mobileTabs = computed(() =>
  (userStore.menuList || [])
    .map((group) => {
      let target = group
      let guard = 0
      while (hasChildren(target) && guard++ < 5) target = target.children[0]
      return { key: group.key, label: getMenuTitle(group), path: target.path || group.path, icon: group }
    })
    .filter((tab) => !!tab.path)
)

/** 当前路由所属的顶级分组 key（用于 Tab 选中态） */
function findRootKey(menuList, path) {
  function traverse(items, rootKey) {
    for (const item of items) {
      const rk = rootKey || item.key
      if (item.path === path) return rk
      if (item.children?.length) {
        const found = traverse(item.children, rk)
        if (found) return found
      }
    }
    return null
  }
  return traverse(menuList, null)
}

const activeTabKey = computed(() => findRootKey(userStore.menuList, route.path) || '')

// ==================== 交互 ====================
function go(item) {
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

function handleSearchClick() {
  // M4 会用 components/global/CommandPalette.vue 接管这里（Cmd+K）
  Message.info(t('layout.searchComingSoon'))
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
// 色值统一收在 tokens.scss 的 --ds-* 里，本文件不出现颜色字面量
.screen-shell {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: var(--ds-stage-base);
  background-image: var(--ds-stage-image);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, var(--ds-grid-line) 0 1px, transparent 1px 48px),
      repeating-linear-gradient(90deg, var(--ds-grid-line) 0 1px, transparent 1px 48px);
    -webkit-mask-image: radial-gradient(
      circle at 50% 45%,
      black 0%,
      rgba(0, 0, 0, 0.5) 58%,
      transparent 100%
    );
    mask-image: radial-gradient(circle at 50% 45%, black 0%, rgba(0, 0, 0, 0.5) 58%, transparent 100%);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      180deg,
      var(--ds-scan-line) 0 1px,
      transparent 1px 3px
    );
    pointer-events: none;
  }
}

.app-layout {
  display: flex;
  height: 100vh;
  width: 100%;
  background: var(--bg);
}

// ==================== 侧边导航 ====================
.side {
  width: var(--nav-w);
  flex: none;
  background: var(--nav);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition:
    width 0.24s ease,
    background-color 0.3s ease,
    border-color 0.3s ease;

  // 收起即完全隐藏。
  // 说明：老实现的"64px 图标条"其实是坏的 —— a-menu 没有传 :collapsed，
  // 窄栏里塞的还是完整文案，只会溢出。本版按"收起=让位给内容"处理。
  &.side-hidden {
    width: 0;
    border-right-color: transparent;
  }
}

.side-head {
  height: var(--top-h);
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  white-space: nowrap;
}

.side-logo {
  width: 28px;
  height: 28px;
  flex: none;
  display: block;
}

.side-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
}

.side-env {
  margin-left: auto;
  font-size: 10px;
  font-family: var(--mono);
  color: var(--c-green);
  background: var(--tint-green);
  border: 1px solid var(--line-strong);
  padding: 2px 6px;
  border-radius: 5px;
  letter-spacing: 0.3px;
  flex: none;
}

.side-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 10px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--line-strong);
    border-radius: 3px;
  }
}

.grp {
  margin-bottom: 14px;
}

.grp-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 8px 7px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-3);
  letter-spacing: 1.1px;
  white-space: nowrap;
}

.grp-bar {
  width: 3px;
  height: 11px;
  border-radius: 2px;
  flex: none;
}

.g-blue .grp-bar {
  background: var(--c-blue);
}

.g-violet .grp-bar {
  background: var(--c-violet);
}

.g-teal .grp-bar {
  background: var(--c-teal);
}

.g-amber .grp-bar {
  background: var(--c-amber);
}

.grp-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 36px;
  padding: 0 9px;
  margin-bottom: 1px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  font-family: var(--font);
  font-size: 13.2px;
  color: var(--text-2);
  text-align: left;
  cursor: pointer;
  transition: all 0.16s;

  &:hover {
    background: var(--hover);
    color: var(--text);
  }

  &.on {
    background: var(--c-blue-tint);
    color: var(--ink-blue);
    font-weight: 600;

    // 选中左条
    &::before {
      content: '';
      position: absolute;
      left: -10px;
      top: 9px;
      bottom: 9px;
      width: 3px;
      background: var(--c-blue);
      border-radius: 0 3px 3px 0;
    }
  }

  &.lv3 {
    padding-left: 20px;
  }
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin: 2px 0 4px;
}

.sub-head {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 6px 9px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  font-family: var(--font);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  cursor: pointer;
  transition: all 0.16s;

  &:hover {
    color: var(--text-2);
    background: var(--hover);
  }
}

.sub-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-chev {
  margin-left: auto;
  font-size: 11px;
  transition: transform 0.18s;

  &.open {
    transform: rotate(180deg);
  }
}

.sub-body {
  padding-top: 1px;
}

.side-foot {
  flex: none;
  border-top: 1px solid var(--line);
  padding: 10px;
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: background 0.16s;

  &:hover {
    background: var(--hover);
  }
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  flex: none;
  background: var(--grad-primary);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--on-primary);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;

  b {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    font-size: 10.5px;
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.user-chev {
  font-size: 12px;
  color: var(--text-3);
  flex: none;
}

// ==================== 顶栏 ====================
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.top {
  height: var(--top-h);
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
}

.tb-ic {
  position: relative;
  width: 34px;
  height: 34px;
  flex: none;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 17px;
  transition: all 0.16s;

  &:hover {
    background: var(--hover);
    color: var(--text);
  }
}

.tb-dot {
  position: absolute;
  top: 3px;
  right: 2px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  background: var(--c-red);
  color: var(--on-primary);
  font-size: 9.5px;
  font-weight: 700;
  font-family: var(--mono);
  border-radius: 999px;
  display: grid;
  place-items: center;
  border: 2px solid var(--panel);
  line-height: 1;
}

.breadcrumb {
  font-size: 13.5px;
  white-space: nowrap;
}

.tb-search {
  margin-left: auto;
  width: 250px;
  height: 34px;
  border-radius: 9px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  color: var(--text-3);
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.18s;

  &:hover {
    border-color: var(--line-strong);
  }

  :deep(svg) {
    width: 14px;
    height: 14px;
    flex: none;
  }
}

.tb-search-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kbd {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 10.5px;
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  padding: 1px 5px;
  color: var(--text-3);
  flex: none;
}

.seg {
  display: flex;
  flex: none;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 2px;
  gap: 1px;

  button {
    border: 0;
    background: transparent;
    color: var(--text-3);
    cursor: pointer;
    font-family: var(--font);
    font-size: 11.5px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 7px;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.16s;

    &:hover {
      color: var(--text-2);
    }

    &.on {
      background: var(--seg-on-bg);
      color: var(--text);
      box-shadow: var(--shadow-xs);
    }
  }
}

.page-description {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-3);
  padding: 8px 22px;
  background: var(--bg);
  border-bottom: 1px solid var(--line-soft);
  line-height: 1.4;
  flex: none;

  &-icon {
    flex-shrink: 0;
    font-size: 13px;
  }
}

.content {
  flex: 1;
  padding: 22px;
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

.sm-hint {
  margin: 0 22px 12px;
}

// 小屏底部 Tab：桌面端不渲染；≤860px 顶替侧栏（1016 §5.1 第 6 项）
.mobile-tabbar {
  display: none;
}

@media (max-width: 860px) {
  .tb-search {
    display: none;
  }

  .side {
    display: none;
  }

  .content {
    padding: 16px;
    padding-bottom: 76px;
  }

  .sm-hint {
    margin: 0 16px 12px;
  }

  .mobile-tabbar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 56px;
    z-index: 200;
    background: var(--color-bg-2);
    border-top: 1px solid var(--color-border-2);

    .mtab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      border: none;
      background: transparent;
      color: var(--color-text-3);
      font-size: 11px;
      cursor: pointer;
      padding: 4px 0;

      .mtab-label {
        max-width: 72px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      &.on {
        color: var(--color-primary);
      }
    }
  }
}
</style>
