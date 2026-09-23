<template>
  <div class="mine-call-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <!-- 接口刻意不返回入参/出参 → 提前说明，避免用户当 bug 报（1016 §4.1 页 1） -->
      <a-alert type="info" style="margin-bottom: 16px">
        {{ $t('mine.callNotice') }}
      </a-alert>

      <!-- 筛选 -->
      <div class="table-toolbar">
        <a-space wrap>
          <a-input
            v-model="toolNameFilter"
            :placeholder="$t('profile.searchToolNamePlaceholder')"
            allow-clear
            style="width: 220px"
            @press-enter="handleSearch"
            @clear="handleSearch"
          />
          <a-select
            v-model="successFilter"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
            @change="handleSearch"
          >
            <a-option :value="true">{{ $t('commonTable.success') }}</a-option>
            <a-option :value="false">{{ $t('commonTable.failure') }}</a-option>
          </a-select>
          <!-- 结束日含当天（后端口径），传 YYYY-MM-DD -->
          <a-range-picker
            v-model="timeRange"
            value-format="YYYY-MM-DD"
            style="width: 240px"
            @change="handleSearch"
          />
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
        :scroll="{ x: 1640 }"
        row-key="log_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('profile.callTime')" data-index="created_time" :width="170" />
          <!-- 工具名（local_service_call）与插件名（biz-feishu-connector）是两回事 -->
          <a-table-column :title="$t('profile.toolNameLabel')" data-index="tool_name" :width="170" />
          <a-table-column :title="$t('profile.pluginNameLabel')" :width="190">
            <template #cell="{ record }">{{ record.plugin_name || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('profile.methodName')" :width="220">
            <template #cell="{ record }">{{ record.method_name || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('profile.objectType')" :width="120">
            <template #cell="{ record }">{{ record.cmd_type || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('hitl.riskLevel')" :width="110">
            <template #cell="{ record }">
              <a-tag v-if="riskInfo(record.risk_level)" :color="riskInfo(record.risk_level).color" size="small">
                {{ riskInfo(record.risk_level).label }}
              </a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('profile.resultLabel')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="record.success ? 'green' : 'red'" size="small">
                {{ record.success ? $t('commonTable.success') : $t('commonTable.failure') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('profile.resultCode')" :width="110">
            <template #cell="{ record }">{{ record.result_code || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('profile.resultMsg')" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ record.result_msg || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('profile.elapsedMs')" :width="110">
            <template #cell="{ record }">{{ elapsedText(record.elapsed_ms) }}</template>
          </a-table-column>
          <!-- 进了人工环节才有 approval_id，可跳授权待办详情 -->
          <a-table-column :title="$t('profile.approvalNo')" :width="140">
            <template #cell="{ record }">
              <a-button
                v-if="record.approval_id !== null && record.approval_id !== undefined"
                type="text"
                size="small"
                @click="goApproval(record.approval_id)"
              >
                {{ record.approval_id }}
              </a-button>
              <span v-else>-</span>
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
 * 我的调用（1016 §4.1 页 1；后端菜单 component = workspace/mine/call/index）
 * - 数据源 GET /biz/gis_mine/cmd/list（个人域，不挂权限点，服务端按登录人过滤）
 * - 筛选：工具名（模糊）/ 成败 / 时间范围（YYYY-MM-DD，结束日含当天）
 * - 排序后端固定「最新在前」，前端不传排序参数
 * - ⚠️ 接口刻意不返回入参/出参 → 页面顶部必须说明「查看入参请到审计中心」
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getMineCmdList } from '@/api/modules/gisMine'
import { useRiskLevelDict } from '@/constants/riskLevel'

const { t } = useI18n()
const router = useRouter()
const { riskLevelMap } = useRiskLevelDict()

// ==================== 筛选 ====================
const toolNameFilter = ref('')
const successFilter = ref(undefined)
const timeRange = ref([])

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  toolNameFilter.value = ''
  successFilter.value = undefined
  timeRange.value = []
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
    if (toolNameFilter.value) params.tool_name = toolNameFilter.value
    if (successFilter.value === true || successFilter.value === false) params.success = successFilter.value
    const range = timeRange.value || []
    if (range.length === 2 && range[0] && range[1]) {
      params.begin_time = range[0]
      params.end_time = range[1]
    }
    const res = await getMineCmdList(params)
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
function riskInfo(level) {
  if (!level) return null
  if (level === 'auth') return { label: t('hitl.riskAuth'), color: 'red' }
  return riskLevelMap.value[level] || { label: level, color: 'gray' }
}

function elapsedText(val) {
  if (val === null || val === undefined || val === '') return '-'
  return `${val} ms`
}

function goApproval(approvalId) {
  if (approvalId === null || approvalId === undefined) return
  router.push(`/workspace/approval/index?approval_id=${approvalId}`)
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.mine-call-page {
  .table-toolbar {
    margin-bottom: 16px;
  }
}
</style>
