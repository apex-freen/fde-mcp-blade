<template>
  <div class="mine-token-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-alert type="info" style="margin-bottom: 16px">
        {{ $t('mine.tokenNotice') }}
      </a-alert>

      <!-- 筛选 -->
      <div class="table-toolbar">
        <a-space>
          <a-select
            v-model="statusFilter"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
            @change="handleSearch"
          >
            <a-option value="active">{{ $t('token.active') }}</a-option>
            <a-option value="revoked">{{ $t('token.revoked') }}</a-option>
          </a-select>
          <a-button @click="handleReset">
            <template #icon><icon-refresh /></template>
            {{ $t('commonTable.reset') }}
          </a-button>
        </a-space>
      </div>

      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('token.id')" data-index="id" :width="70" />
          <a-table-column :title="$t('token.tokenName')" data-index="token_name" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ record.token_name || '—' }}</template>
          </a-table-column>
          <a-table-column :title="$t('token.tokenPrefix')" data-index="token_prefix" :width="200" :ellipsis="true" />
          <a-table-column :title="$t('commonTable.status')" data-index="status" :width="110">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'active' ? 'green' : 'red'" size="small">
                {{ record.status === 'active' ? $t('token.active') : $t('token.revoked') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('token.expiresAt')" :width="180">
            <template #cell="{ record }">
              {{ record.expires_at || $t('token.permanentValid') }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('token.issuedAt')" data-index="issued_at" :width="180" />
          <a-table-column :title="$t('commonTable.operation')" :width="110" fixed="right">
            <template #cell="{ record }">
              <!-- 自助撤销：仅 active 可见；只作用于本人令牌（服务端按登录人过滤，非本人 403） -->
              <a-popconfirm
                v-if="record.status === 'active'"
                :content="$t('mine.tokenRevokeConfirm')"
                type="warning"
                @ok="handleRevoke(record)"
              >
                <a-button status="danger" type="text" size="small" :loading="revokingId === record.id">
                  {{ $t('mine.tokenRevoke') }}
                </a-button>
              </a-popconfirm>
              <span v-else>—</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
/**
 * 我的令牌（1016 §4.1 页 3 / P4 §5.1 第 7 项）
 * - 数据源 GET /biz/gis_mine/token/list（个人域，不挂权限点，服务端按登录人过滤）
 * - 核心动作：自助撤销 DELETE /biz/gis_mine/token/{id}（仅 active 显示，popconfirm 二次确认）
 * - 展示约束：库里只存 token_jti + token_prefix → **永不提供「查看 / 复制令牌」**
 * - 撤销成功后重拉列表（撤销立即生效，进黑名单）
 */
import { ref, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { getMineTokenList, revokeMineToken } from '@/api/modules/gisMine'

const { t } = useI18n()

// ==================== 筛选 ====================
const statusFilter = ref(undefined)

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  statusFilter.value = undefined
  pagination.current = 1
  fetchList()
}

// ==================== 表格 ====================
const loading = ref(false)
const tableData = ref([])
const revokingId = ref(null)
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})

function handlePageChange(page) {
  pagination.current = page
  fetchList()
}

function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.current = 1
  fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize
    }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await getMineTokenList(params)
    const data = res?.data || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

// ==================== 自助撤销 ====================
async function handleRevoke(record) {
  revokingId.value = record.id
  try {
    await revokeMineToken(record.id)
    Message.success(t('mine.tokenRevokeSuccess'))
    // 撤销后立即生效 → 重拉列表
    fetchList()
  } catch (e) {
    // 错误已由拦截器提示（403 非本人 / 404 不存在 / 200 幂等）
  } finally {
    revokingId.value = null
  }
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.mine-token-page {
  .table-toolbar {
    margin-bottom: 16px;
  }
}
</style>
