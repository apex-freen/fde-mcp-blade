<template>
  <div class="ws-device-detail">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-spin :loading="loading" style="width: 100%">
        <a-empty v-if="loadError" :description="loadError">
          <a-button type="primary" @click="goBack">{{ $t('workspace.backToList') }}</a-button>
        </a-empty>

        <template v-else>
          <div class="detail-header">
            <div class="detail-title">
              {{ detail.user_eqp_name || detail.eqp_name || '-' }}
              <a-tag :color="statusInfo(detail.eqp_sta).color" size="small">{{ statusInfo(detail.eqp_sta).text }}</a-tag>
            </div>
            <a-button @click="goBack">
              <template #icon><icon-left /></template>
              {{ $t('workspace.backToList') }}
            </a-button>
          </div>

          <!-- 设备信息 -->
          <a-descriptions :column="2" bordered size="small" class="block">
            <a-descriptions-item :label="$t('eqp.eqpId')">{{ detail.eqp_id ?? '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('eqp.eqpName')">{{ detail.eqp_name || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('eqp.userEqpName')">{{ detail.user_eqp_name || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('eqp.eqpType')">{{ detail.eqp_type || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('eqp.eqpIp')">{{ detail.eqp_ip || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('eqp.eqpArea')">{{ detail.eqp_area || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('eqp.clientId')">{{ detail.eqp_client_id || '-' }}</a-descriptions-item>
            <!-- eqp_pwd 后端明文返回，展示必须打码 -->
            <a-descriptions-item :label="$t('eqp.eqpPwd')">
              <a-tooltip v-if="detail.eqp_pwd" :content="$t('workspace.passwordMaskHint')">
                <span class="pwd-mask">{{ PWD_MASK }}</span>
              </a-tooltip>
              <span v-else>-</span>
            </a-descriptions-item>
            <a-descriptions-item :label="$t('eqp.eqpDesc')">{{ detail.eqp_desc || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('eqp.userEqpDesc')">{{ detail.user_eqp_desc || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('commonTable.createTime')">{{ detail.created_time || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('workspace.updatedTime')">{{ detail.updated_time || '-' }}</a-descriptions-item>
          </a-descriptions>

          <!-- 设备功能列表 -->
          <div class="block">
            <div class="section-title">{{ $t('eqp.funList') }}</div>
            <a-table
              :data="funList"
              :loading="funLoading"
              :pagination="funPagination"
              :scroll="{ x: 1080 }"
              row-key="eqp_fun_id"
              size="small"
              @page-change="handleFunPageChange"
              @page-size-change="handleFunPageSizeChange"
            >
              <template #columns>
                <a-table-column :title="$t('eqp.funName')" :width="200">
                  <template #cell="{ record }">
                    <div class="cell-main">{{ record.fun_name || '-' }}</div>
                    <div v-if="record.fun_desc" class="cell-sub">{{ record.fun_desc }}</div>
                  </template>
                </a-table-column>
                <a-table-column :title="$t('eqp.funKey')" data-index="fun_key" :width="180" />
                <a-table-column :title="$t('eqp.riskLevel')" :width="130">
                  <template #cell="{ record }">
                    <a-tag v-if="riskInfo(record.risk_level)" :color="riskInfo(record.risk_level).color" size="small">
                      {{ riskInfo(record.risk_level).label }}
                    </a-tag>
                    <span v-else>-</span>
                  </template>
                </a-table-column>
                <!-- role：'1' 仅管理员可操作 / '0' 所有人 -->
                <a-table-column :title="$t('workspace.operationRole')" :width="150">
                  <template #cell="{ record }">{{ roleText(record.role) }}</template>
                </a-table-column>
                <a-table-column :title="$t('eqp.version')" data-index="version" :width="100" />
                <a-table-column :title="$t('eqp.params')" :width="110">
                  <template #cell="{ record }">
                    <a-tooltip v-if="record.fun_params" position="left">
                      <template #content>
                        <pre class="tip-json">{{ formatJson(record.fun_params) }}</pre>
                      </template>
                      <a-button type="text" size="small">{{ $t('eqp.params') }}</a-button>
                    </a-tooltip>
                    <span v-else>-</span>
                  </template>
                </a-table-column>
              </template>
              <template #empty>
                <a-empty :description="funError || $t('commonTable.noData')" />
              </template>
            </a-table>
          </div>
        </template>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'
import { EQP_STATUS_MAP } from '@/api/modules/gisEqp'
import { useRiskLevelDict } from '@/constants/riskLevel'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { riskLevelMap } = useRiskLevelDict()

const eqpId = route.params.id

// 设备密码打码占位（不渲染明文）
const PWD_MASK = '••••••'

const loading = ref(false)
const loadError = ref('')
const detail = ref({})

const funLoading = ref(false)
const funError = ref('')
const funList = ref([])
const funPagination = reactive({
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

function riskInfo(level) {
  if (!level) return null
  return riskLevelMap.value[level] || { label: level, color: 'gray' }
}

function roleText(role) {
  if (role === null || role === undefined || role === '') return '-'
  return String(role) === '1' ? t('workspace.roleAdminOnly') : t('workspace.roleAll')
}

function formatJson(val) {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'string') {
    try {
      return JSON.stringify(JSON.parse(val), null, 2)
    } catch {
      return val
    }
  }
  try {
    return JSON.stringify(val, null, 2)
  } catch {
    return String(val)
  }
}

async function fetchDetail() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.gisEqp.getGisEqpDetail(eqpId)
    detail.value = res?.data || res || {}
  } catch (e) {
    console.error('获取设备详情失败:', e)
    detail.value = {}
    loadError.value = t('eqp.fetchFailed')
  } finally {
    loading.value = false
  }
}

async function fetchFunList() {
  funLoading.value = true
  funError.value = ''
  try {
    const res = await api.gisEqp.getEqpFunList({
      eqp_id: eqpId,
      page: funPagination.current,
      page_size: funPagination.pageSize
    })
    const data = res?.data || {}
    funList.value = data.rows || []
    funPagination.total = data.total || 0
  } catch (e) {
    console.error('获取设备功能列表失败:', e)
    funList.value = []
    funPagination.total = 0
    funError.value = t('workspace.funFetchFailed')
  } finally {
    funLoading.value = false
  }
}

function handleFunPageChange(page) {
  funPagination.current = page
  fetchFunList()
}

function handleFunPageSizeChange(size) {
  funPagination.pageSize = size
  funPagination.current = 1
  fetchFunList()
}

function goBack() {
  router.push('/workspace/device/index')
}

onMounted(() => {
  if (eqpId === undefined || eqpId === null || eqpId === '') {
    loadError.value = t('workspace.missingId')
    return
  }
  fetchDetail()
  fetchFunList()
})
</script>

<style lang="scss" scoped>
.ws-device-detail {
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .detail-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .block {
    margin-bottom: 20px;
  }

  .section-title {
    font-weight: 600;
    color: var(--color-text-1);
    margin-bottom: 8px;
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

  .tip-json {
    max-width: 420px;
    max-height: 240px;
    overflow: auto;
    margin: 0;
    font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>
