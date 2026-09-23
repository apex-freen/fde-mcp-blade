<template>
  <svg
    class="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-for="(s, i) in shapes" :key="i">
      <path v-if="s[0] === 'p'" :d="s[1]" />
      <rect v-else-if="s[0] === 'r'" :x="s[1]" :y="s[2]" :width="s[3]" :height="s[4]" :rx="s[5]" />
      <circle v-else-if="s[0] === 'c'" :cx="s[1]" :cy="s[2]" :r="s[3]" />
      <line v-else-if="s[0] === 'l'" :x1="s[1]" :y1="s[2]" :x2="s[3]" :y2="s[4]" />
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { resolveNavIcon } from '@/config/nav-icons'

const props = defineProps({
  /** 菜单树节点（读 icon / path 两个字段） */
  item: { type: Object, default: () => ({}) }
})

const shapes = computed(() => resolveNavIcon(props.item))
</script>

<style scoped>
.nav-icon {
  width: 16px;
  height: 16px;
  flex: none;
  opacity: 0.85;
}
</style>
