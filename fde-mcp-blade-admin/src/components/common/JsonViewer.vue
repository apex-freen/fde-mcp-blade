<template>
  <div class="json-viewer">
    <!-- 可解析为对象的 JSON：拍平成「字段 / 值」两列表格，不展示 JSON 符号 -->
    <a-table
      v-if="rows && rows.length"
      :data="rows"
      :pagination="false"
      :bordered="{ cell: true }"
      size="small"
      row-key="path"
    >
      <template #columns>
        <a-table-column :title="$t('common.fieldName')" data-index="path" :width="220">
          <template #cell="{ record }">
            <span class="jv-key">{{ record.path }}</span>
          </template>
        </a-table-column>
        <a-table-column :title="$t('common.fieldValue')">
          <template #cell="{ record }">
            <span class="jv-value">{{ record.value }}</span>
          </template>
        </a-table-column>
      </template>
    </a-table>
    <!-- 非 JSON 文本（日志、错误信息等）按原样展示 -->
    <pre v-else-if="plainText" class="jv-plain">{{ plainText }}</pre>
    <span v-else class="jv-empty">-</span>
  </div>
</template>

<script setup>
/**
 * JsonViewer —— 把 JSON 渲染成「字段 / 值」表格
 *
 * - 对象 / 数组：嵌套字段用 a.b 展开、数组用 [0] 展开，逐行渲染为两列表格
 * - 非 JSON 字符串：按纯文本原样展示（日志片段、错误信息不会被吞掉）
 * - 空值：展示 -
 */
import { computed } from 'vue'
import { toJsonRows } from '@/utils/format'

const props = defineProps({
  value: { type: [String, Object, Array, Number], default: undefined }
})

// null 表示不是可解析为对象的 JSON，交给纯文本分支
const rows = computed(() => toJsonRows(props.value))

const plainText = computed(() => {
  if (rows.value !== null) return ''
  if (props.value === null || props.value === undefined || props.value === '') return ''
  return typeof props.value === 'string' ? props.value : String(props.value)
})
</script>

<style lang="scss" scoped>
.json-viewer {
  // 外层列表给整行加了 pointer 光标，内嵌表格不应继承
  :deep(.arco-table-tr) {
    cursor: default;
  }

  .jv-key {
    color: var(--color-text-3);
    font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    word-break: break-all;
  }

  .jv-value {
    color: var(--color-text-1);
    white-space: pre-wrap;
    word-break: break-all;
  }

  .jv-plain {
    margin: 0;
    padding: 12px;
    background: var(--color-fill-2);
    border-radius: 4px;
    color: var(--color-text-1);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>
