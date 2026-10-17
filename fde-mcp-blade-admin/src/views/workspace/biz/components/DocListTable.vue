<template>
  <!-- 单据列表表格：「单据列表」与「停摆清单」共用（停摆清单 = 本表 + stalled=true） -->
  <a-table
    :columns="columns"
    :data="rows"
    :loading="loading"
    :pagination="pagination"
    row-key="biz_object_id"
    :scroll="{ x: '100%' }"
    class="doc-list-table"
    @row-click="handleRowClick"
    @page-change="$emit('page-change', $event)"
    @page-size-change="$emit('page-size-change', $event)"
  >
    <template #columns>
      <a-table-column :title="$t('bizObject.bizObjectId')" :width="153" :ellipsis="true" :tooltip="true">
        <template #cell="{ record }">{{ record.biz_object_id }}</template>
      </a-table-column>
      <a-table-column :title="$t('bizObject.scene')" :width="130">
        <template #cell="{ record }">{{ record.scene_name || record.biz_scene || '-' }}</template>
      </a-table-column>
      <a-table-column :title="$t('bizObject.statusLabel')" :width="100">
        <template #cell="{ record }">
          <a-tag :color="statusColor(record.status)" size="small">{{ statusLabel(record.status) }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column :title="$t('bizObject.currentStage')" :width="120">
        <template #cell="{ record }">{{ record.stage_name || record.current_stage || '-' }}</template>
      </a-table-column>
      <a-table-column :title="$t('bizObject.startedTime')" :width="153">
        <template #cell="{ record }">{{ record.started_time || '-' }}</template>
      </a-table-column>
      <a-table-column :title="$t('bizObject.lastCallTime')" :width="154">
        <template #cell="{ record }">{{ record.last_call_time || '-' }}</template>
      </a-table-column>
      <a-table-column :title="$t('bizObject.callCount')" :width="100">
        <template #cell="{ record }">{{ numOrDash(record.call_count) }}</template>
      </a-table-column>
      <a-table-column :title="$t('bizObject.stalled')" :width="90">
        <template #cell="{ record }">
          <a-tag :color="record.stalled ? 'red' : 'gray'" size="small">
            {{ record.stalled ? $t('bizObject.yes') : $t('bizObject.no') }}
          </a-tag>
        </template>
      </a-table-column>
      <a-table-column v-if="showSilentDays" :title="$t('bizObject.silentDays')" :width="110">
        <template #cell="{ record }">{{ numOrDash(record.silent_days) }}</template>
      </a-table-column>
      <a-table-column :title="$t('commonTable.operation')" :width="90" fixed="right">
        <template #cell="{ record }">
          <a-button type="text" size="small" @click.stop="emitView(record)">
            {{ $t('bizObject.detail') }}
          </a-button>
        </template>
      </a-table-column>
    </template>
    <template #empty>
      <a-empty :description="$t('bizObject.noData')" />
    </template>
  </a-table>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  // 分页对象由父级持有（父子共享同一 reactive 对象）
  pagination: { type: Object, required: true },
  showSilentDays: { type: Boolean, default: false }
})

const emit = defineEmits(['view', 'page-change', 'page-size-change'])

const { t } = useI18n()

// 列由 #columns 插槽声明，这里保持空数组（与页面既有写法一致）
const columns = []

// 列表里每一行都必须能点进详情（后端已保证列表与详情可见性一致）
function handleRowClick(record) {
  emitView(record)
}

function emitView(record) {
  if (!record?.biz_object_id) return
  emit('view', record)
}

const STATUS_MAP = {
  open: { key: 'statusOpen', color: 'orange' },
  in_progress: { key: 'statusInProgress', color: 'arcoblue' },
  done: { key: 'statusDone', color: 'green' },
  failed: { key: 'statusFailed', color: 'red' },
  cancelled: { key: 'statusCancelled', color: 'gray' }
}

function statusLabel(status) {
  const item = STATUS_MAP[status]
  return item ? t(`bizObject.${item.key}`) : status || '-'
}

function statusColor(status) {
  return STATUS_MAP[status]?.color || 'gray'
}

function numOrDash(val) {
  return val === null || val === undefined || val === '' ? '-' : val
}
</script>

<style lang="scss" scoped>
.doc-list-table {
  :deep(.arco-table-tr) {
    cursor: pointer;
  }
}
</style>
