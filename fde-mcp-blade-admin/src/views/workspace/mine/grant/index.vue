<template>
  <div class="mine-grant-page">
    <!-- KPI 摘要条（来自卡片接口 getMineGrant，与工作台 grant 卡同构） -->
    <div class="kpi-strip">
      <div v-for="k in kpis" :key="k.key" class="kpi">
        <div class="kpi-value" :class="k.cls">{{ k.value }}</div>
        <div class="kpi-label">{{ k.label }}</div>
      </div>
      <div v-if="kpiError" class="kpi-error">{{ kpiError }}</div>
    </div>

    <a-card :bordered="false" style="margin-top: 12px">
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
            <a-option value="1">{{ $t('profile.granted') }}</a-option>
            <a-option value="2">{{ $t('workspace.statRevoked') }}</a-option>
          </a-select>
          <a-select
            v-model="typeFilter"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
            @change="handleSearch"
          >
            <a-option value="device">device</a-option>
            <a-option value="service">service</a-option>
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
        :scroll="{ x: 1240 }"
        row-key="grant_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('profile.grantId')" data-index="grant_id" :width="90" />
          <a-table-column :title="$t('profile.grantType')" data-index="grant_type" :width="110" />
          <a-table-column :title="$t('profile.grantObject')" :width="200">
            <template #cell="{ record }">
              <div class="cell-main">{{ record.target_name || record.eqp_name || '-' }}</div>
              <div v-if="subEqpName(record)" class="cell-sub">{{ record.eqp_name }}</div>
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.funKey')" data-index="fun_key" :width="200" :ellipsis="true" />
          <a-table-column :title="$t('profile.grantSta')" :width="110">
            <template #cell="{ record }">
              <a-tag :color="record.grant_sta === '1' ? 'green' : 'gray'" size="small">
                {{ record.grant_sta === '1' ? $t('profile.granted') : $t('workspace.statRevoked') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('profile.grantStartedTime')" :width="170">
            <template #cell="{ record }">{{ record.grant_started_time || '-' }}</template>
          </a-table-column>
          <!-- 到期时间为 null = 永久 -->
          <a-table-column :title="$t('profile.expiresAt')" :width="190">
            <template #cell="{ record }">
              <a-space size="small">
                <span>{{ expiresText(record.grant_expired_time) }}</span>
                <!-- 即将到期：授权过期即失效，用户最需要提前知道（1016 §4.1 页 2） -->
                <a-tag v-if="isExpiringSoon(record)" color="orangered" size="small">
                  {{ $t('mine.expiringSoon') }}
                </a-tag>
              </a-space>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty :description="$t('commonTable.noData')" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
/**
 * 我的授权（1016 §4.1 页 2）
 * - 数据源 GET /biz/gis_mine/grant/list（个人域，不挂权限点，服务端按登录人过滤）
 * - KPI 条来自 GET /biz/gis_mine/grant（与工作台 grant 卡同构：{data, degraded, reason}）
 * - 排序后端固定「有效优先」，前端不传排序参数
 * - expiring_soon 在列表上有显著标识：到期时间落在卡片 expiring_soon_days 窗口内（缺省 7 天）
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getMineGrant, getMineGrantList } from '@/api/modules/gisMine'

const { t } = useI18n()

// ==================== KPI 摘要条 ====================
const grantCard = ref(null)
const kpiError = ref('')

const kpis = computed(() => {
  const d = grantCard.value || {}
  return [
    { key: 'total', value: d.total ?? '—', label: t('mine.grantTotal') },
    { key: 'active', value: d.active ?? '—', label: t('profile.granted'), cls: 'ok' },
    { key: 'revoked', value: d.revoked ?? '—', label: t('workspace.statRevoked'), cls: 'dim' },
    {
      key: 'expiring',
      value: d.expiring_soon ?? '—',
      label: t('mine.expiringSoon') + (d.expiring_soon_days ? `（${t('workspace.withinDays', { days: d.expiring_soon_days })}）` : ''),
      cls: 'warn'
    }
  ]
})

// 即将到期的天数窗口：优先用卡片下发的 expiring_soon_days，缺省 7
const expiringWindowDays = computed(() => {
  const d = grantCard.value
  return d && Number.isFinite(d.expiring_soon_days) && d.expiring_soon_days > 0 ? d.expiring_soon_days : 7
})

function isExpiringSoon(record) {
  if (record.grant_sta !== '1' || !record.grant_expired_time) return false
  const exp = new Date(record.grant_expired_time.replace(' ', 'T')).getTime()
  if (Number.isNaN(exp)) return false
  const now = Date.now()
  return exp > now && exp - now <= expiringWindowDays.value * 86400_000
}

async function fetchCard() {
  kpiError.value = ''
  try {
    const res = await getMineGrant()
    // 卡片结构 {data, degraded, reason}：degraded 时 data 为空 → KPI 显示 —，不当错误
    grantCard.value = res?.data?.degraded ? null : res?.data?.data || null
  } catch (e) {
    kpiError.value = ''
  }
}

// ==================== 筛选 ====================
const statusFilter = ref(undefined)
const typeFilter = ref(undefined)

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  statusFilter.value = undefined
  typeFilter.value = undefined
  pagination.current = 1
  fetchList()
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
    const params = { page: pagination.current, page_size: pagination.pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    if (typeFilter.value) params.grant_type = typeFilter.value
    const res = await getMineGrantList(params)
    const data = res?.data || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

// ==================== 展示工具 ====================
function expiresText(val) {
  return val ? val : t('profile.permanent')
}

function subEqpName(record) {
  return !!record?.target_name && !!record?.eqp_name && record.target_name !== record.eqp_name
}

onMounted(() => {
  fetchCard()
  fetchList()
})
</script>

<style lang="scss" scoped>
.mine-grant-page {
  .kpi-strip {
    display: flex;
    gap: 32px;
    padding: 14px 20px;
    margin-top: 16px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--r-lg, 8px);

    .kpi-value {
      font-size: 24px;
      font-weight: 600;
      line-height: 1.2;

      &.ok {
        color: rgb(var(--green-6));
      }

      &.warn {
        color: rgb(var(--orangered-6));
      }

      &.dim {
        color: var(--color-text-3);
      }
    }

    .kpi-label {
      margin-top: 4px;
      font-size: 12px;
      color: var(--color-text-3);
    }

    .kpi-error {
      align-self: center;
      font-size: 12px;
      color: var(--color-text-3);
    }
  }

  .table-toolbar {
    margin-bottom: 16px;
  }

  .cell-main {
    font-weight: 500;
  }

  .cell-sub {
    font-size: 12px;
    color: var(--color-text-3);
  }
}
</style>
