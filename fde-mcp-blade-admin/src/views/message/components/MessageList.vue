<template>
  <div class="message-list">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="event_key" :label="$t('message.eventKey')">
          <a-select v-model="searchForm.event_key" :placeholder="$t('commonTable.all')" allow-clear style="width: 200px">
            <a-option v-for="ev in eventOptions" :key="ev.key" :value="ev.key">{{ ev.title }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="time_range" :label="$t('message.timeRange')">
          <a-space>
            <a-range-picker v-model="timeRange" value-format="YYYY-MM-DD" style="width: 260px" />
            <a-button-group size="small">
              <a-button @click="setRecent(7)">{{ $t('message.last7Days') }}</a-button>
              <a-button @click="setRecent(30)">{{ $t('message.last30Days') }}</a-button>
            </a-button-group>
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ $t('commonTable.search') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('commonTable.reset') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 表格区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="table-toolbar">
        <a-space>
          <a-button v-if="showChannelConfig" @click="channelVisible = true">
            <template #icon><icon-settings /></template>
            {{ $t('message.channelConfig') }}
          </a-button>
          <a-button type="primary" :loading="exportLoading" @click="handleExport">
            <template #icon><icon-download /></template>
            {{ $t('commonTable.export') }}
          </a-button>
        </a-space>
      </div>

      <a-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :row-class="rowClass"
        row-key="message_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
        @row-click="handleRowClick"
      >
        <template #empty>
          <a-empty :description="emptyText || $t('message.noData')" />
        </template>
        <template #columns>
          <a-table-column :title="$t('message.eventLevel')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="eventLevelMap[record.event_level]?.color || 'gray'" size="small">
                {{ eventLevelMap[record.event_level]?.label || record.event_level || '-' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('message.eventKey')" data-index="event_key" :width="180" :ellipsis="true" />
          <a-table-column :title="$t('message.title')" :width="260">
            <template #cell="{ record }">
              <span class="cell-title">{{ record.title }}</span>
              <a-tag v-if="record.system_flag === '1'" color="purple" size="small" class="system-tag">
                {{ $t('message.systemEvent') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('message.content')" data-index="content" :width="360" :ellipsis="true" />
          <a-table-column :title="$t('message.deliverStatus')" :width="140">
            <template #cell="{ record }">
              <a-tooltip v-if="record.deliver_note" :content="record.deliver_note">
                <a-tag :color="deliverStatusMap[record.deliver_status]?.color || 'gray'" size="small">
                  {{ deliverStatusMap[record.deliver_status]?.label || record.deliver_status || '-' }}
                </a-tag>
              </a-tooltip>
              <a-tag v-else :color="deliverStatusMap[record.deliver_status]?.color || 'gray'" size="small">
                {{ deliverStatusMap[record.deliver_status]?.label || record.deliver_status || '-' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('message.createdAt')" data-index="created_time" :width="180" />
          <a-table-column :title="$t('commonTable.operation')" :width="90" fixed="right">
            <template #cell="{ record }">
              <a-button
                type="text"
                size="small"
                :disabled="!record.biz_ref_route"
                @click="handleJump(record)"
              >
                {{ $t('message.view') }}
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 通知插件配置（仅「全部消息」页展示入口） -->
    <NotificationChannelModal v-if="showChannelConfig" v-model:visible="channelVisible" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { useMessageDict } from '@/constants/messageDict'
import { downloadBlob, buildExportFilename, extractBlobErrorMsg } from '@/utils/download'
import NotificationChannelModal from './NotificationChannelModal.vue'

const props = defineProps({
  // 列表接口（三页路径不同，过滤口径由服务端固定）
  listApi: { type: Function, required: true },
  // 导出接口（与列表参数一致，不传分页）
  exportApi: { type: Function, required: true },
  // 导出文件名前缀，如 gis_message_all
  exportPrefix: { type: String, required: true },
  // 是否展示「通知插件」配置入口
  showChannelConfig: { type: Boolean, default: false },
  // 自定义空态文案
  emptyText: { type: String, default: '' }
})

const router = useRouter()
const { t } = useI18n()
const { eventLevelMap, deliverStatusMap } = useMessageDict()

// ==================== 搜索 ====================
const searchForm = reactive({
  event_key: undefined
})
const timeRange = ref([])
// 事件键候选取自后端事件字典（§3.3），不硬编码文案
const eventOptions = ref([])

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  searchForm.event_key = undefined
  timeRange.value = []
  pagination.current = 1
  fetchList()
}

// 快捷时间范围（替代「已读/未读」的聚焦方式）
function setRecent(days) {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (days - 1))
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  timeRange.value = [fmt(start), fmt(end)]
  handleSearch()
}

// ==================== 表格 ====================
const loading = ref(false)
const tableData = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})
const columns = []

function rowClass(record) {
  return record.biz_ref_route ? 'clickable-row' : ''
}

function handlePageChange(page) {
  pagination.current = page
  fetchList()
}

function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.current = 1
  fetchList()
}

function buildQuery(withPaging = true) {
  const params = {}
  if (searchForm.event_key) {
    params.event_key = searchForm.event_key
  }
  const [start, end] = timeRange.value || []
  if (start) params.start = start
  if (end) params.end = end
  if (withPaging) {
    params.page = pagination.current
    params.page_size = pagination.pageSize
  }
  return params
}

async function fetchList() {
  loading.value = true
  try {
    const res = await props.listApi(buildQuery(true))
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error('获取消息列表失败:', e)
  } finally {
    loading.value = false
  }
}

// 事件键候选（可选接口，失败降级为无候选项，不阻塞页面）
async function fetchEvents() {
  try {
    const res = await api.gisMessage.getMessageEvents()
    const list = res?.data?.rows || res?.data || []
    eventOptions.value = (Array.isArray(list) ? list : []).map(item => ({
      key: item.key || item.event_key,
      title: item.title || item.key || item.event_key
    }))
  } catch {
    eventOptions.value = []
  }
}

// ==================== 跳转 ====================
function handleJump(record) {
  if (!record?.biz_ref_route) return
  router.push(record.biz_ref_route).catch(() => {
    Message.error(t('message.jumpFailed'))
  })
}

function handleRowClick(record) {
  handleJump(record)
}

// ==================== 导出 ====================
const exportLoading = ref(false)

async function handleExport() {
  exportLoading.value = true
  try {
    // 导出不传分页参数
    const res = await props.exportApi(buildQuery(false))
    downloadBlob(res, buildExportFilename(props.exportPrefix))
    Message.success(t('message.exportSuccess'))
  } catch (e) {
    // 导出失败返回的是 JSON（如「超过上限 10000」），需从 blob 中解析出后端 msg
    Message.error(await extractBlobErrorMsg(e, t('message.exportFailed')))
  } finally {
    exportLoading.value = false
  }
}

const channelVisible = ref(false)

onMounted(() => {
  fetchList()
  fetchEvents()
})
</script>

<style lang="scss" scoped>
.message-list {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: flex-end;
  }

  .cell-title {
    margin-right: 6px;
  }

  .system-tag {
    vertical-align: middle;
  }

  :deep(.clickable-row) {
    cursor: pointer;
  }
}
</style>
