<template>
  <div class="ws-agent-detail">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-spin :loading="loading" style="width: 100%">
        <!-- 加载失败（含无权限 / 不存在） -->
        <a-empty v-if="loadError" :description="loadError">
          <a-button type="primary" @click="goBack">{{ $t('workspace.backToList') }}</a-button>
        </a-empty>

        <template v-else>
          <!-- 头部 -->
          <div class="detail-header">
            <div class="detail-header-left">
              <a-avatar :size="48" :image-url="detail.agentIconUrl || undefined">
                <icon-robot />
              </a-avatar>
              <div>
                <div class="detail-title">
                  {{ detail.agentName || '-' }}
                  <a-tag v-if="detail.agentSta" color="arcoblue" size="small">{{ detail.agentSta }}</a-tag>
                </div>
                <div v-if="detail.agentDescription" class="detail-sub">{{ detail.agentDescription }}</div>
              </div>
            </div>
            <a-button @click="goBack">
              <template #icon><icon-left /></template>
              {{ $t('workspace.backToList') }}
            </a-button>
          </div>

          <!-- 基本信息 -->
          <a-descriptions :column="2" bordered size="small" class="block">
            <a-descriptions-item :label="$t('eqp.eqpId')">{{ detail.gisAgentId ?? '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('agentManage.agentName')">{{ detail.agentName || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('agentManage.modelProvider')">{{ detail.modelProvider || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('agentManage.modelName')">{{ detail.modelName || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('agentManage.temperature')">
              {{ temperatureText(detail.temperature) }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('agentManage.maxTokens')">{{ detail.maxTokens ?? '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('agentManage.createdTime')">{{ detail.createdTime || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('workspace.updatedTime')">{{ detail.updatedTime || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('agentManage.bindUser')" :span="2">
              {{ detail.userId ?? '-' }}
            </a-descriptions-item>
          </a-descriptions>

          <!-- 系统提示词 -->
          <div class="block">
            <div class="section-title">{{ $t('agentManage.systemPrompt') }}</div>
            <pre class="text-block">{{ detail.systemPrompt || '-' }}</pre>
          </div>

          <!-- 已绑定插件 -->
          <div class="block">
            <div class="section-title">{{ $t('workspace.agentPlugins') }}</div>
            <a-table
              :data="pluginList"
              :loading="pluginLoading"
              :pagination="false"
              :scroll="{ x: 1080 }"
              row-key="plugin_id"
              size="small"
            >
              <template #columns>
                <a-table-column :title="$t('agentManage.pluginName')" :width="200">
                  <template #cell="{ record }">
                    <div class="cell-main">{{ record.plugin_name || '-' }}</div>
                    <div v-if="record.description" class="cell-sub">{{ record.description }}</div>
                  </template>
                </a-table-column>
                <a-table-column :title="$t('workspace.pluginType')" :width="110">
                  <template #cell="{ record }">
                    <a-tag v-if="record.plugin_type" size="small" color="arcoblue">{{ record.plugin_type }}</a-tag>
                    <span v-else>-</span>
                  </template>
                </a-table-column>
                <a-table-column :title="$t('commonTable.status')" :width="110">
                  <template #cell="{ record }">
                    <a-tag v-if="record.status" size="small" :color="pluginStatusColor(record.status)">
                      {{ record.status }}
                    </a-tag>
                    <span v-else>-</span>
                  </template>
                </a-table-column>
                <a-table-column :title="$t('workspace.pluginVisibility')" :width="100">
                  <template #cell="{ record }">{{ visibilityText(record.is_public) }}</template>
                </a-table-column>
                <a-table-column :title="$t('eqp.version')" data-index="plugin_version" :width="100" />
                <a-table-column :title="$t('workspace.pluginAuthor')" data-index="author" :width="140" />
                <a-table-column :title="$t('commonTable.createTime')" data-index="created_time" :width="170" />
              </template>
              <template #empty>
                <a-empty :description="pluginError || $t('agentManage.noPlugins')" />
              </template>
            </a-table>
          </div>
        </template>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const agentId = route.params.id

const loading = ref(false)
const loadError = ref('')
const detail = ref({})

const pluginLoading = ref(false)
const pluginError = ref('')
const pluginList = ref([])

// 温度后端是字符串，能转数字就按数字展示
function temperatureText(val) {
  if (val === null || val === undefined || val === '') return '-'
  const n = Number(val)
  return Number.isFinite(n) ? String(n) : String(val)
}

// is_public：'0' 私有 / '1' 公开
function visibilityText(val) {
  if (val === null || val === undefined || val === '') return '-'
  return String(val) === '1' ? t('workspace.public') : t('workspace.private')
}

// 插件状态枚举：draft / created / published / disabled
function pluginStatusColor(status) {
  if (status === 'published') return 'green'
  if (status === 'disabled') return 'gray'
  if (status === 'draft') return 'orange'
  return 'arcoblue'
}

async function fetchDetail() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.agent.getAgentDetail(agentId)
    detail.value = res?.data || res || {}
  } catch (e) {
    console.error('获取智能体详情失败:', e)
    detail.value = {}
    loadError.value = t('agentManage.fetchFailed')
  } finally {
    loading.value = false
  }
}

async function fetchPlugins() {
  pluginLoading.value = true
  pluginError.value = ''
  try {
    const res = await api.agent.getAgentPlugins(agentId)
    pluginList.value = res?.data || []
  } catch (e) {
    console.error('获取智能体插件失败:', e)
    pluginList.value = []
    pluginError.value = t('workspace.pluginFetchFailed')
  } finally {
    pluginLoading.value = false
  }
}

function goBack() {
  router.push('/workspace/agent/index')
}

onMounted(() => {
  if (agentId === undefined || agentId === null || agentId === '') {
    loadError.value = t('workspace.missingId')
    return
  }
  fetchDetail()
  fetchPlugins()
})
</script>

<style lang="scss" scoped>
.ws-agent-detail {
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .detail-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .detail-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .detail-sub {
    color: var(--color-text-3);
    font-size: 12px;
    margin-top: 4px;
  }

  .block {
    margin-bottom: 20px;
  }

  .section-title {
    font-weight: 600;
    color: var(--color-text-1);
    margin-bottom: 8px;
  }

  .text-block {
    background: var(--color-fill-2);
    border-radius: 4px;
    padding: 12px;
    margin: 0;
    font-family: 'SF Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 260px;
    overflow-y: auto;
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
}
</style>
