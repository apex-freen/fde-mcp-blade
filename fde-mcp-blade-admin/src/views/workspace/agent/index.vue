<template>
  <div class="ws-agent-list">
    <a-card :bordered="false" style="margin-top: 16px">
      <!-- 查询：agentName 为精确匹配，不是模糊（103 文档 §4.2） -->
      <a-form :model="searchForm" layout="inline" class="search-bar">
        <a-form-item field="agentName" :label="$t('agentManage.agentName')">
          <a-input
            v-model="searchForm.agentName"
            :placeholder="$t('workspace.exactMatchPlaceholder')"
            allow-clear
            style="width: 260px"
            @press-enter="handleSearch"
          />
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

      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1180 }"
        row-key="gisAgentId"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('agentManage.agentName')" :width="240">
            <template #cell="{ record }">
              <div class="agent-cell">
                <a-avatar :size="32" :image-url="record.agentIconUrl || undefined">
                  <icon-robot />
                </a-avatar>
                <div class="agent-cell-text">
                  <div class="cell-main">{{ record.agentName || '-' }}</div>
                  <div v-if="record.agentDescription" class="cell-sub" :title="record.agentDescription">
                    {{ record.agentDescription }}
                  </div>
                </div>
              </div>
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.status')" :width="110">
            <template #cell="{ record }">
              <a-tag v-if="record.agentSta" color="arcoblue" size="small">{{ record.agentSta }}</a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('agentManage.modelName')" :width="200">
            <template #cell="{ record }">
              <div class="cell-main">{{ record.modelName || '-' }}</div>
              <div v-if="record.modelProvider" class="cell-sub">{{ record.modelProvider }}</div>
            </template>
          </a-table-column>
          <!-- temperature 后端是字符串，展示前需自行转数字（103 文档 §4.2） -->
          <a-table-column :title="$t('agentManage.temperature')" :width="100">
            <template #cell="{ record }">{{ temperatureText(record.temperature) }}</template>
          </a-table-column>
          <a-table-column :title="$t('agentManage.maxTokens')" data-index="maxTokens" :width="120" />
          <a-table-column :title="$t('commonTable.createTime')" data-index="createdTime" :width="170" />
          <a-table-column :title="$t('commonTable.operation')" :width="110" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="small" @click.stop="goDetail(record.gisAgentId)">
                {{ $t('commonTable.details') }}
              </a-button>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty :description="loadError || $t('commonTable.noData')" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'

const { t } = useI18n()
const router = useRouter()

const searchForm = reactive({ agentName: '' })
const loading = ref(false)
const loadError = ref('')
const tableData = ref([])

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})

// 温度：后端下发的是字符串，能转数字就按数字展示
function temperatureText(val) {
  if (val === null || val === undefined || val === '') return '-'
  const n = Number(val)
  return Number.isFinite(n) ? String(n) : String(val)
}

async function fetchList() {
  loading.value = true
  loadError.value = ''
  try {
    // 分页参数是 pageNum / pageSize（不是 page / page_size）
    const params = {
      pageNum: pagination.current,
      pageSize: pagination.pageSize
    }
    if (searchForm.agentName) params.agentName = searchForm.agentName

    // 注意：本接口响应是顶层 { total, rows }，没有 code/msg 包裹，不能套通用解析
    const res = await api.agent.getAgentPageList(params)
    tableData.value = res?.rows || []
    pagination.total = res?.total || 0
  } catch (e) {
    console.error('获取智能体列表失败:', e)
    tableData.value = []
    pagination.total = 0
    loadError.value = t('agentManage.fetchFailed')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  searchForm.agentName = ''
  pagination.current = 1
  fetchList()
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

function goDetail(id) {
  if (id === undefined || id === null) return
  router.push(`/workspace/agent/detail/${id}`)
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.ws-agent-list {
  .search-bar {
    margin-bottom: 16px;
  }

  .agent-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .agent-cell-text {
    min-width: 0;
  }

  .cell-main {
    color: var(--color-text-1);
    line-height: 1.4;
  }

  .cell-sub {
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
