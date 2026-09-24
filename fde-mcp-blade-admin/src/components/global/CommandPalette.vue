<template>
  <Teleport to="body">
    <transition name="cp-fade">
      <div v-if="visible" class="cp-mask" @click.self="close">
        <div class="cp-panel" role="dialog" :aria-label="t('palette.title')">
          <div class="cp-input-row">
            <icon-search class="cp-search-ic" />
            <input
              ref="inputRef"
              v-model="query"
              class="cp-input"
              type="text"
              :placeholder="t('palette.placeholder')"
              @keydown="onKeydown"
            />
            <span class="cp-esc">Esc</span>
          </div>

          <div class="cp-list" ref="listRef">
            <!-- 快捷动作（1016 §4.1 页 7） -->
            <template v-if="!query">
              <div class="cp-group">{{ t('palette.groupActions') }}</div>
              <div
                v-for="(act, i) in actions"
                :key="'a-' + act.path"
                class="cp-item"
                :class="{ on: i === activeIndex }"
                @mouseenter="activeIndex = i"
                @click="go(act.path)"
              >
                <component :is="act.icon" class="cp-ic" />
                <span class="cp-title">{{ t(act.label) }}</span>
                <icon-right class="cp-arrow" />
              </div>
            </template>

            <!-- 菜单搜索结果 -->
            <div class="cp-group">{{ t('palette.groupMenu') }}</div>
            <template v-if="filteredMenus.length">
              <div
                v-for="(m, i) in filteredMenus"
                :key="'m-' + m.path"
                class="cp-item"
                :class="{ on: actionOffset + i === activeIndex }"
                @mouseenter="activeIndex = actionOffset + i"
                @click="go(m.path)"
              >
                <icon-apps class="cp-ic" />
                <span class="cp-title">{{ m.crumbs }}</span>
              </div>
            </template>
            <div v-else class="cp-empty">{{ t('commonTable.noData') }}</div>
          </div>

          <div class="cp-foot">
            <span><b>↑</b><b>↓</b> {{ t('palette.navHint') }}</span>
            <span><b>Enter</b> {{ t('palette.openHint') }}</span>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
/**
 * Cmd+K 命令面板（1016 §4.1 页 7，本地版）
 * - 全局覆盖层，挂在 layouts/default.vue；触发：Ctrl/Cmd + K、顶栏搜索按钮
 * - 数据源：本地菜单树（userStore.menuList，已按 hidden 过滤）+ 少量快捷动作
 * - 不接后端搜索接口（1017 §2.4 排期中），后续可扩展自然语言查询
 * - 键盘：↑/↓ 选择、Enter 跳转、Esc 关闭
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { resolveMenuTitle } from '@/utils/menu-i18n'

const { t, te } = useI18n()
const router = useRouter()
const userStore = useUserStore()

const visible = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputRef = ref(null)
const listRef = ref(null)

// ==================== 快捷动作 ====================
const actions = [
  { path: '/workspace/mine/token/index', label: 'palette.actToken', icon: 'icon-safe' },
  { path: '/controller/capability/shadow/index', label: 'palette.actShadow', icon: 'icon-experiment' },
  { path: '/audit/export/index', label: 'palette.actAuditExport', icon: 'icon-download' }
]

// ==================== 菜单扁平化（叶子 + 面包屑） ====================
// 标题走 resolveMenuTitle：跟随语言切换；rawTitle 保留后端中文，供中英双语检索命中
const menuLeaves = computed(() => {
  const out = []
  const walk = (items, parents) => {
    for (const it of items || []) {
      if (it.external_url) continue
      const title = resolveMenuTitle(it, t, te)
      const rawTitle = it.title || ''
      const crumbs = [...parents, title].join(' › ')
      if (it.children?.length) {
        walk(it.children, [...parents, title])
      } else if (it.path) {
        out.push({ path: it.path, title, rawTitle, crumbs })
      }
    }
  }
  walk(userStore.menuList, [])
  return out
})

const filteredMenus = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return menuLeaves.value
    .filter((m) => `${m.title} ${m.rawTitle} ${m.crumbs} ${m.path}`.toLowerCase().includes(q))
    .slice(0, 20)
})

const actionOffset = computed(() => (query.value ? 0 : actions.length))

// ==================== 打开 / 关闭 / 选择 ====================
function open() {
  query.value = ''
  activeIndex.value = 0
  visible.value = true
  nextTick(() => inputRef.value?.focus())
}

function close() {
  visible.value = false
}

function go(path) {
  if (!path) return
  visible.value = false
  router.push(path).catch(() => {})
}

function onKeydown(e) {
  const total = (query.value ? filteredMenus.value.length : actions.length + filteredMenus.value.length) || 0
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (total) activeIndex.value = (activeIndex.value + 1) % total
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (total) activeIndex.value = (activeIndex.value - 1 + total) % total
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const hit = allItems.value[activeIndex.value]
    if (hit) go(hit.path)
  } else if (e.key === 'Escape') {
    close()
  }
}

// 统一索引：快捷动作在前、菜单在后
const allItems = computed(() => {
  const acts = query.value ? [] : actions.map((a) => ({ path: a.path }))
  return [...acts, ...filteredMenus.value]
})

function onGlobalKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    visible.value ? close() : open()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.cp-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: var(--color-mask-bg);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
}

.cp-panel {
  width: min(560px, calc(100vw - 32px));
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  box-shadow: var(--shadow2-center, 0 12px 40px 0 rgba(0, 0, 0, 0.18));
  overflow: hidden;
}

.cp-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-1);
}

.cp-search-ic {
  color: var(--color-text-3);
}

.cp-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--color-text-1);
}

.cp-esc {
  font-size: 10.5px;
  color: var(--color-text-3);
  border: 1px solid var(--color-border-2);
  border-radius: 5px;
  padding: 1px 5px;
}

.cp-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.cp-group {
  padding: 6px 8px 4px;
  font-size: 11px;
  color: var(--color-text-3);
}

.cp-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-1);
  font-size: 13.5px;

  &.on {
    background: var(--color-fill-2);
  }
}

.cp-ic {
  flex: none;
  color: var(--color-text-3);
}

.cp-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cp-arrow {
  flex: none;
  color: var(--color-text-4);
}

.cp-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--color-text-3);
  font-size: 13px;
}

.cp-foot {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  border-top: 1px solid var(--color-border-1);
  font-size: 11px;
  color: var(--color-text-3);

  b {
    display: inline-block;
    min-width: 18px;
    text-align: center;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    padding: 0 3px;
    margin-right: 3px;
    font-weight: 400;
  }
}

.cp-fade-enter-active,
.cp-fade-leave-active {
  transition: opacity 0.15s;
}

.cp-fade-enter-from,
.cp-fade-leave-to {
  opacity: 0;
}
</style>
