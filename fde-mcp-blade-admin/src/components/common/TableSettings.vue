<template>
  <a-popover trigger="click" position="br" content-class="table-settings-popover">
    <a-tooltip :content="$t('tableSettings.title')">
      <a-button size="small">
        <template #icon><icon-settings /></template>
      </a-button>
    </a-tooltip>
    <template #content>
      <div class="ts-panel">
        <div class="ts-title">{{ $t('tableSettings.density') }}</div>
        <a-radio-group v-model="densityProxy" size="mini" type="button">
          <a-radio value="mini">{{ $t('tableSettings.compact') }}</a-radio>
          <a-radio value="small">{{ $t('tableSettings.cozy') }}</a-radio>
          <a-radio value="large">{{ $t('tableSettings.relaxed') }}</a-radio>
        </a-radio-group>
        <a-divider style="margin: 10px 0" />
        <div class="ts-title">{{ $t('tableSettings.displayColumns') }}</div>
        <a-checkbox-group v-model="visibleKeysProxy" direction="vertical" class="ts-cols">
          <a-checkbox v-for="col in columns" :key="col.key" :value="col.key">
            {{ col.label }}
          </a-checkbox>
        </a-checkbox-group>
      </div>
    </template>
  </a-popover>
</template>

<script setup>
/**
 * TableSettings —— 表格「列自定义 + 密度」设置面板（P4 加固 #4）
 *
 * 纯受控组件：状态由 useTableSettings hook 持有并持久化。
 * - columns: [{ key, label }]（label 已翻译，页面里用 computed 包一层以跟随语言切换）
 * - hiddenKeys: 被隐藏列的 key 数组（勾选框显示的是「可见列」，反向换算）
 */
import { computed } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  hiddenKeys: { type: Array, default: () => [] },
  density: { type: String, default: 'large' }
})

const emit = defineEmits(['update:hiddenKeys', 'update:density'])

// 勾选模型 = 可见列 keys；与 hiddenKeys 互为补集
const visibleKeysProxy = computed({
  get() {
    return props.columns.filter((c) => !props.hiddenKeys.includes(c.key)).map((c) => c.key)
  },
  set(visibleKeys) {
    emit('update:hiddenKeys', props.columns.filter((c) => !visibleKeys.includes(c.key)).map((c) => c.key))
  }
})

const densityProxy = computed({
  get() { return props.density },
  set(v) { emit('update:density', v) }
})
</script>

<style lang="scss" scoped>
.ts-panel {
  width: 200px;
  max-height: 320px;
  overflow: auto;

  .ts-title {
    font-size: 12px;
    color: var(--color-text-3);
    margin-bottom: 6px;
  }

  .ts-cols {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
}
</style>
