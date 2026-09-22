<template>
  <div class="ws-device-list">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline" class="search-bar">
        <a-form-item field="eqp_name" :label="$t('eqp.eqpName')">
          <a-input
            v-model="searchForm.eqp_name"
            :placeholder="$t('workspace.exactMatchPlaceholder')"
            allow-clear
            style="width: 220px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="eqp_ip" :label="$t('eqp.eqpIp')">
          <a-input
            v-model="searchForm.eqp_ip"
            :placeholder="$t('eqp.eqpIpPlaceholder')"
            allow-clear
            style="width: 200px"
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
        :scroll="{ x: 1360 }"
        row-key="eqp_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('eqp.eqpId')" data-index="eqp_id" :width="80" />
          <a-table-column :title="$t('eqp.eqpName')" :width="220">
            <template #cell="{ record }">
              <div class="cell-main">{{ record.user_eqp_name || record.eqp_name || '-' }}</div>
              <div v-if="record.user_eqp_name" class="cell-sub">{{ record.eqp_name }}</div>
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.eqpType')" :width="100">
            <template #cell="{ record }">{{ record.eqp_type || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('eqp.eqpIp')" :width="140">
            <template #cell="{ record }">{{ record.eqp_ip || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('eqp.eqpArea')" :width="140">
            <template #cell="{ record }">{{ record.eqp_area || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('eqp.eqpStatus')" :width="110">
            <template #cell="{ record }">
              <a-tag :color="statusInfo(record.eqp_sta).color" size="small">{{ statusInfo(record.eqp_sta).text }}</a-tag>
            </template>
          </a-table-column>
          <!-- eqp_pwd 后端明文返回，展示必须打码（103 文档 §五#4） -->
          <a-table-column :title="$t('eqp.eqpPwd')" :width="120">
            <template #cell="{ record }">
              <a-tooltip v-if="record.eqp_pwd" :content="$t('workspace.passwordMaskHint')">
                <span class="pwd-mask">{{ PWD_MASK }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.createTime')" data-index="created_time" :width="170" />
          <a-table-column :title="$t('commonTable.operation')" :width="110" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="small" @click="goDetail(record.eqp_id)">
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
import { EQP_STATUS_MAP } from '@/api/modules/gisEqp'

const { t } = useI18n()
const router = useRouter()

// 设备密码打码占位（不渲染明文）
const PWD_MASK = '••••••'

// order_by / is_asc 后端没有默认值，不传直接报错，必须每次都带上（103 文档 §4.5）
const DEFAULT_ORDER_BY = 'created_time'
const DEFAULT_IS_ASC = false

const searchForm = reactive({ eqp_name: '', eqp_ip: '' })
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

// eqp_sta 后端两处口径不一致（0 待确认 / 1 正常 / 2 禁用 vs 2 待验证），
// 这里按 gisEqp 模块的枚举展示，联调时以实测为准
function statusInfo(sta) {
  const item = EQP_STATUS_MAP[String(sta)]
  if (item) return { text: item.label, color: item.color }
  return { text: sta === null || sta === undefined || sta === '' ? '-' : String(sta), color: 'gray' }
}

async function fetchList() {
  loading.value = true
  loadError.value = ''
  try {
    const params = {
      order_by: DEFAULT_ORDER_BY,
      is_asc: DEFAULT_IS_ASC,
      page: pagination.current,
      page_size: pagination.pageSize
    }
    if (searchForm.eqp_name) params.eqp_name = searchForm.eqp_name
    if (searchForm.eqp_ip) params.eqp_ip = searchForm.eqp_ip

    const res = await api.gisEqp.getGisEqpList(params)
    const data = res?.data || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error('获取设备列表失败:', e)
    tableData.value = []
    pagination.total = 0
    loadError.value = t('eqp.fetchFailed')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  searchForm.eqp_name = ''
  searchForm.eqp_ip = ''
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
  router.push(`/workspace/device/detail/${id}`)
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.ws-device-list {
  .search-bar {
    margin-bottom: 16px;
  }

  .cell-main {
    color: var(--color-text-1);
    line-height: 1.4;
  }

  .cell-sub {
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 1.4;
  }

  .pwd-mask {
    cursor: default;
    letter-spacing: 1px;
  }
}
</style>
