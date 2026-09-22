<template>
  <div class="cost-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <!-- 公共筛选 -->
      <a-form :model="filters" layout="inline" class="filter-bar">
        <a-form-item :label="t('costPanel.period')">
          <a-radio-group v-model="filters.period" type="button" @change="handlePeriodChange">
            <a-radio value="week">{{ t('costPanel.periodWeek') }}</a-radio>
            <a-radio value="month">{{ t('costPanel.periodMonth') }}</a-radio>
            <a-radio value="quarter">{{ t('costPanel.periodQuarter') }}</a-radio>
            <a-radio value="custom">{{ t('costPanel.periodCustom') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="filters.period === 'custom'" :label="t('costPanel.customRange')">
          <a-range-picker v-model="filters.range" value-format="YYYY-MM-DD" style="width: 260px" />
        </a-form-item>
        <a-form-item :label="t('costPanel.dept')">
          <a-select
            v-model="filters.dept_id"
            :placeholder="t('costPanel.allDepts')"
            allow-clear
            style="width: 170px"
          >
            <a-option v-for="d in deptOptions" :key="d.deptId" :value="d.deptId">
              {{ d.deptName }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="activeLoading" @click="reloadActiveTab">
            <template #icon><icon-refresh /></template>
            {{ t('commonTable.refresh') }}
          </a-button>
        </a-form-item>
      </a-form>

      <a-tabs v-model:active-key="activeTab" type="rounded" style="margin-top: 16px" @change="handleTabChange">
        <!-- 使用率面板 -->
        <a-tab-pane key="panel" :title="t('costPanel.tabPanel')">
          <a-spin :loading="panelLoading" style="display: block; width: 100%">
            <a-alert v-if="panelSummary.price_configured === false" type="warning" class="note-alert">
              {{ t('costPanel.priceNotConfigured') }}
            </a-alert>

            <a-row :gutter="16">
              <a-col :span="6">
                <a-card :bordered="false" class="kpi-card">
                  <div class="kpi-value">{{ panelSummary.total_calls ?? '-' }}</div>
                  <div class="kpi-title">{{ t('costPanel.totalCalls') }}</div>
                </a-card>
              </a-col>
              <a-col :span="6">
                <a-card :bordered="false" class="kpi-card">
                  <div class="kpi-value">
                    {{ panelSummary.success_rate != null ? panelSummary.success_rate + '%' : '-' }}
                  </div>
                  <div class="kpi-title">{{ t('costPanel.successRate') }}</div>
                </a-card>
              </a-col>
              <a-col :span="6">
                <a-card :bordered="false" class="kpi-card">
                  <div class="kpi-value">{{ formatNumber(panelSummary.est_tokens) }}</div>
                  <div class="kpi-title">{{ t('costPanel.estTokens') }}</div>
                </a-card>
              </a-col>
              <a-col :span="6">
                <a-card :bordered="false" class="kpi-card">
                  <div class="kpi-value">{{ panelSummary.est_cost ?? '-' }}</div>
                  <div class="kpi-title">{{ t('costPanel.estCost') }}</div>
                </a-card>
              </a-col>
            </a-row>

            <div class="note-text">
              <div v-if="panelSummary.cost_note">{{ panelSummary.cost_note }}</div>
              <div v-if="panelSummary.estimate_note">{{ panelSummary.estimate_note }}</div>
            </div>

            <!-- 趋势 -->
            <a-card :bordered="false" :title="t('costPanel.trendTitle')" class="inner-card">
              <template #extra>
                <a-space>
                  <a-radio-group v-model="trendMetric" type="button" size="small" @change="loadTrend">
                    <a-radio value="calls">{{ t('costPanel.metricCalls') }}</a-radio>
                    <a-radio value="est_tokens">{{ t('costPanel.metricTokens') }}</a-radio>
                    <a-radio value="est_cost">{{ t('costPanel.metricCost') }}</a-radio>
                  </a-radio-group>
                  <a-select v-model="trendGroupBy" size="small" style="width: 130px" @change="loadTrend">
                    <a-option value="dept">{{ t('costPanel.groupByDept') }}</a-option>
                    <a-option value="plugin">{{ t('costPanel.groupByPlugin') }}</a-option>
                  </a-select>
                </a-space>
              </template>
              <LineChart
                :categories="trendCategories"
                :series="trendSeries"
                :loading="trendLoading"
                :area="true"
                height="300px"
              />
            </a-card>

            <!-- 排行 -->
            <a-card :bordered="false" :title="t('costPanel.rankingTitle')" class="inner-card">
              <a-tabs type="line" size="small">
                <a-tab-pane key="plugins" :title="t('costPanel.rankPlugins')">
                  <a-table
                    :data="ranking.plugins"
                    :pagination="false"
                    row-key="name"
                    :bordered="false"
                    size="small"
                  >
                    <template #columns>
                      <a-table-column :title="t('costPanel.pluginName')" data-index="name" />
                      <a-table-column :title="t('costPanel.calls')" data-index="calls" :width="110" />
                      <a-table-column :title="t('costPanel.successRate')" :width="120">
                        <template #cell="{ record }">
                          {{ record.success_rate != null ? record.success_rate + '%' : '-' }}
                        </template>
                      </a-table-column>
                      <a-table-column :title="t('costPanel.estTokens')" :width="140">
                        <template #cell="{ record }">{{ formatNumber(record.est_tokens) }}</template>
                      </a-table-column>
                    </template>
                  </a-table>
                </a-tab-pane>

                <a-tab-pane key="agents" :title="t('costPanel.rankAgents')">
                  <a-table
                    :data="ranking.agents"
                    :pagination="false"
                    row-key="token_id"
                    :bordered="false"
                    size="small"
                  >
                    <template #columns>
                      <a-table-column :title="t('costPanel.token')" :width="220">
                        <template #cell="{ record }">{{ tokenLabel(record.token_id) }}</template>
                      </a-table-column>
                      <a-table-column :title="t('costPanel.calls')" data-index="calls" :width="110" />
                    </template>
                  </a-table>
                </a-tab-pane>

                <a-tab-pane key="failures" :title="t('costPanel.rankFailures')">
                  <a-table
                    :data="ranking.failures"
                    :pagination="false"
                    row-key="method"
                    :bordered="false"
                    size="small"
                  >
                    <template #columns>
                      <a-table-column :title="t('costPanel.pluginName')" data-index="plugin" :width="200" />
                      <a-table-column :title="t('costPanel.method')" data-index="method" />
                      <a-table-column :title="t('costPanel.calls')" data-index="calls" :width="90" />
                      <a-table-column :title="t('costPanel.failed')" data-index="failed" :width="90" />
                      <a-table-column :title="t('costPanel.failRate')" :width="100">
                        <template #cell="{ record }">
                          <a-tag color="red">{{ record.fail_rate }}%</a-tag>
                        </template>
                      </a-table-column>
                    </template>
                  </a-table>
                </a-tab-pane>
              </a-tabs>
            </a-card>
          </a-spin>
        </a-tab-pane>

        <!-- 预算总览 -->
        <a-tab-pane key="budget" :title="t('costPanel.tabBudget')">
          <div class="table-toolbar">
            <span class="toolbar-label">{{ t('costPanel.budgetMonth') }}</span>
            <a-date-picker
              v-model="budgetPeriod"
              mode="month"
              value-format="YYYY-MM"
              style="width: 150px"
              @change="loadBudget"
            />
          </div>

          <a-alert v-if="budget.estimate_note" type="info" class="note-alert">
            {{ budget.estimate_note }}
          </a-alert>

          <a-table
            :data="budget.items"
            :loading="budgetLoading"
            :pagination="false"
            row-key="scope_id"
            :bordered="false"
            size="small"
          >
            <template #columns>
              <a-table-column :title="t('costPanel.scopeType')" :width="100">
                <template #cell="{ record }">{{ scopeLabel(record.scope_type) }}</template>
              </a-table-column>
              <a-table-column :title="t('costPanel.scopeName')" :width="160">
                <template #cell="{ record }">{{ record.scope_name || '-' }}</template>
              </a-table-column>
              <a-table-column :title="t('costPanel.usedTokens')" :width="130">
                <template #cell="{ record }">{{ formatNumber(record.used_tokens) }}</template>
              </a-table-column>
              <a-table-column :title="t('costPanel.tokenLimit')" :width="130">
                <template #cell="{ record }">{{ formatNumber(record.token_limit) }}</template>
              </a-table-column>
              <a-table-column :title="t('costPanel.tokenRatio')" :width="160">
                <template #cell="{ record }">
                  <a-progress
                    :percent="normalizeRatio(record.token_ratio)"
                    :status="progressStatus(record.state)"
                    size="small"
                  />
                </template>
              </a-table-column>
              <a-table-column :title="t('costPanel.usedCost')" :width="110">
                <template #cell="{ record }">{{ record.used_cost ?? '-' }}</template>
              </a-table-column>
              <a-table-column :title="t('costPanel.costLimit')" :width="110">
                <template #cell="{ record }">{{ record.cost_limit ?? '-' }}</template>
              </a-table-column>
              <a-table-column :title="t('costPanel.state')" :width="110">
                <template #cell="{ record }">
                  <a-tag :color="stateColor(record.state)">{{ stateLabel(record.state) }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="t('costPanel.blockEnabled')" :width="110">
                <template #cell="{ record }">
                  {{ record.block_enabled ? t('costPanel.blockOn') : t('costPanel.blockOff') }}
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 成本策略 -->
        <a-tab-pane key="policy" :title="t('costPanel.tabPolicy')">
          <div class="table-toolbar">
            <a-button type="primary" @click="openPolicyModal()">
              <template #icon><icon-plus /></template>
              {{ t('costPanel.addPolicy') }}
            </a-button>
            <a-button :loading="policyLoading" @click="loadPolicies">
              <template #icon><icon-refresh /></template>
              {{ t('commonTable.refresh') }}
            </a-button>
            <span class="toolbar-label">{{ t('costPanel.priceUnitHint') }}</span>
          </div>

          <a-table
            :data="policyList"
            :loading="policyLoading"
            :pagination="false"
            row-key="id"
            :bordered="false"
            size="small"
          >
            <template #columns>
              <a-table-column :title="t('costPanel.scopeType')" :width="100">
                <template #cell="{ record }">{{ scopeLabel(record.scope_type) }}</template>
              </a-table-column>
              <a-table-column :title="t('costPanel.scopeId')" data-index="scope_id" :width="90" />
              <a-table-column :title="t('costPanel.inputPrice')" data-index="input_price" :width="110" />
              <a-table-column :title="t('costPanel.outputPrice')" data-index="output_price" :width="110" />
              <a-table-column :title="t('costPanel.monthlyTokenLimit')" :width="130">
                <template #cell="{ record }">{{ formatNumber(record.monthly_token_limit) }}</template>
              </a-table-column>
              <a-table-column :title="t('costPanel.monthlyCostLimit')" data-index="monthly_cost_limit" :width="120" />
              <a-table-column :title="t('costPanel.warnRatio')" data-index="warn_ratio" :width="100" />
              <a-table-column :title="t('costPanel.blockEnabled')" :width="110">
                <template #cell="{ record }">
                  <a-tag :color="record.block_enabled ? 'red' : 'gray'">
                    {{ record.block_enabled ? t('costPanel.blockOn') : t('costPanel.blockOff') }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="t('commonTable.operation')" :width="150" fixed="right">
                <template #cell="{ record }">
                  <a-button type="text" size="mini" @click="openPolicyModal(record)">
                    {{ t('commonTable.edit') }}
                  </a-button>
                  <a-popconfirm
                    :content="t('costPanel.confirmDeletePolicy')"
                    position="br"
                    @ok="handleDeletePolicy(record)"
                  >
                    <a-button type="text" status="danger" size="mini">
                      {{ t('commonTable.delete') }}
                    </a-button>
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 策略编辑弹窗 -->
    <a-modal
      v-model:visible="policyModalVisible"
      :title="isPolicyEdit ? t('costPanel.editPolicy') : t('costPanel.addPolicy')"
      :on-before-ok="handlePolicySubmit"
      :mask-closable="false"
      :ok-text="t('commonTable.confirm')"
      :cancel-text="t('commonTable.cancel')"
      unmount-on-close
    >
      <a-form ref="policyFormRef" :model="policyForm" :rules="policyRules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="scope_type" :label="t('costPanel.scopeType')">
              <a-select v-model="policyForm.scope_type" :disabled="isPolicyEdit">
                <a-option value="global">{{ t('costPanel.scopeGlobal') }}</a-option>
                <a-option value="dept">{{ t('costPanel.scopeDept') }}</a-option>
                <a-option value="token">{{ t('costPanel.scopeToken') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              field="scope_id"
              :label="t('costPanel.scopeId')"
              :help="policyForm.scope_type === 'global' ? t('costPanel.scopeIdGlobalHint') : ''"
            >
              <a-input-number
                v-model="policyForm.scope_id"
                :min="0"
                :disabled="isPolicyEdit || policyForm.scope_type === 'global'"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <!-- 单价口径与示例：放在输入框上方（Doc 19 §8.5：单位元/千 token） -->
        <div class="price-tip">{{ t('costPanel.priceUnitExample') }}</div>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="input_price" :label="t('costPanel.inputPrice')">
              <a-input-number v-model="policyForm.input_price" :min="0" :precision="6" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="output_price" :label="t('costPanel.outputPrice')">
              <a-input-number v-model="policyForm.output_price" :min="0" :precision="6" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="monthly_token_limit" :label="t('costPanel.monthlyTokenLimitInput')">
              <a-input-number
                v-model="policyForm.monthly_token_limit"
                :min="0"
                :precision="4"
                :step="0.1"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="monthly_cost_limit" :label="t('costPanel.monthlyCostLimit')">
              <a-input-number v-model="policyForm.monthly_cost_limit" :min="0" :precision="2" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="warn_ratio" :label="t('costPanel.warnRatio')">
              <a-input-number
                v-model="policyForm.warn_ratio"
                :min="0"
                :max="1"
                :step="0.05"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="block_enabled" :label="t('costPanel.blockEnabled')">
              <a-switch v-model="policyForm.block_enabled" />
              <span class="form-hint">{{ t('costPanel.blockEnabledHint') }}</span>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { Message } from '@arco-design/web-vue'
import { LineChart } from '@/components/charts'
import {
  getPanelSummary,
  getPanelTrend,
  getPanelRanking,
  getPanelBudget
} from '@/api/modules/gisReport'
import {
  getCostPolicyList,
  createOrUpdateCostPolicy,
  deleteCostPolicy
} from '@/api/modules/gisCostPolicy'
import { getDeptList } from '@/api/modules/gisUserDept'
import { getTokenList } from '@/api/modules/token'

const { t } = useI18n()

const activeTab = ref('panel')

const filters = reactive({
  period: 'month',
  range: [],
  dept_id: undefined
})

const deptOptions = ref([])

// ---------- 面板 ----------
const panelLoading = ref(false)
const panelSummary = ref({})

const trendLoading = ref(false)
const trendMetric = ref('calls')
const trendGroupBy = ref('dept')
const trendPoints = ref([])

const ranking = ref({ plugins: [], agents: [], failures: [] })
const tokenMap = ref({})

const trendCategories = computed(() => trendPoints.value.map(p => p.date))
const trendSeries = computed(() => [
  {
    name: t(`costPanel.metric${trendMetric.value === 'calls' ? 'Calls' : trendMetric.value === 'est_tokens' ? 'Tokens' : 'Cost'}`),
    data: trendPoints.value.map(p => p[trendMetric.value] ?? 0)
  }
])

const budgetLoading = ref(false)
const budgetPeriod = ref(dayjs().format('YYYY-MM'))
const budget = ref({ items: [] })

// ---------- 策略 ----------
const policyLoading = ref(false)
const policyList = ref([])
const policyModalVisible = ref(false)
const isPolicyEdit = ref(false)
const policyFormRef = ref()

const emptyPolicy = () => ({
  scope_type: 'global',
  scope_id: 0,
  input_price: 0,
  output_price: 0,
  monthly_token_limit: 0,
  monthly_cost_limit: 0,
  warn_ratio: 0.8,
  block_enabled: false,
  status: '1'
})
const policyForm = reactive(emptyPolicy())

// 表单里的「月度 token 限额」以「亿 token」为单位，提交/回填时按此换算成 token 原值
const TOKEN_UNIT = 1e8

const policyRules = {
  scope_type: [{ required: true, message: t('costPanel.scopeTypeRequired') }]
}

// 顶部刷新按钮的 loading 跟随当前激活 Tab
const activeLoading = computed(() => {
  if (activeTab.value === 'panel') return panelLoading.value
  if (activeTab.value === 'budget') return budgetLoading.value
  return policyLoading.value
})

function formatNumber(val) {
  if (val === null || val === undefined || val === '') return '-'
  return typeof val === 'number' ? val.toLocaleString() : val
}

function normalizeRatio(ratio) {
  if (typeof ratio !== 'number') return 0
  return Math.min(Math.max(Math.round(ratio * 100), 0), 100)
}

function progressStatus(state) {
  if (state === 'block') return 'danger'
  if (state === 'warn') return 'warning'
  return 'success'
}

function stateColor(state) {
  return { warn: 'orange', block: 'red' }[state] || 'green'
}

function stateLabel(state) {
  const map = {
    warn: t('costPanel.stateWarn'),
    block: t('costPanel.stateBlock')
  }
  return map[state] || t('costPanel.stateNormal')
}

function scopeLabel(scope) {
  const map = {
    global: t('costPanel.scopeGlobal'),
    dept: t('costPanel.scopeDept'),
    token: t('costPanel.scopeToken')
  }
  return map[scope] || scope
}

/** agents[].token_id 需映射为可读名称，映射失败时回退显示原始 ID */
function tokenLabel(tokenId) {
  return tokenMap.value[tokenId] || `#${tokenId}`
}

function buildQuery() {
  const q = { period: filters.period }
  if (filters.period === 'custom' && filters.range?.length === 2) {
    q.start = filters.range[0]
    q.end = filters.range[1]
  }
  if (filters.dept_id !== undefined && filters.dept_id !== null) q.dept_id = filters.dept_id
  return q
}

function handlePeriodChange(val) {
  if (val !== 'custom') {
    filters.range = []
    reloadActiveTab()
  }
}

async function loadPanel() {
  panelLoading.value = true
  try {
    const [summaryRes, rankingRes] = await Promise.all([
      getPanelSummary(buildQuery()),
      getPanelRanking(10)
    ])
    panelSummary.value = summaryRes.data || summaryRes || {}
    const rank = rankingRes.data || rankingRes || {}
    ranking.value = {
      plugins: rank.plugins || [],
      agents: rank.agents || [],
      failures: rank.failures || []
    }
  } catch (_) {
    panelSummary.value = {}
  } finally {
    panelLoading.value = false
  }
  await loadTrend()
}

async function loadTrend() {
  trendLoading.value = true
  try {
    const res = await getPanelTrend(trendGroupBy.value, buildQuery())
    const data = res.data || res || {}
    trendPoints.value = data.points || []
  } catch (_) {
    trendPoints.value = []
  } finally { trendLoading.value = false }
}

async function loadBudget() {
  budgetLoading.value = true
  try {
    const res = await getPanelBudget(budgetPeriod.value)
    budget.value = res.data || res || { items: [] }
  } catch (_) {
    budget.value = { items: [] }
  } finally { budgetLoading.value = false }
}

async function loadPolicies() {
  policyLoading.value = true
  try {
    const res = await getCostPolicyList()
    const data = res.data || res
    policyList.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* request.js 已弹错 */ }
  finally { policyLoading.value = false }
}

function openPolicyModal(record) {
  if (record) {
    isPolicyEdit.value = true
    Object.assign(policyForm, emptyPolicy(), {
      id: record.id,
      scope_type: record.scope_type,
      scope_id: record.scope_id,
      input_price: record.input_price,
      output_price: record.output_price,
      // 后端存 token 原值，表单项按「亿 token」回填
      monthly_token_limit: Number(record.monthly_token_limit || 0) / TOKEN_UNIT,
      monthly_cost_limit: record.monthly_cost_limit,
      warn_ratio: record.warn_ratio,
      block_enabled: record.block_enabled,
      status: record.status || '1'
    })
  } else {
    isPolicyEdit.value = false
    Object.assign(policyForm, emptyPolicy())
  }
  policyModalVisible.value = true
}

async function handlePolicySubmit() {
  try {
    await policyFormRef.value.validate()
  } catch {
    return false
  }
  try {
    // global 作用域后端强制 scope_id=0
    const payload = { ...policyForm }
    if (payload.scope_type === 'global') payload.scope_id = 0
    // 表单以「亿 token」为单位输入，提交前换算回 token 原值
    payload.monthly_token_limit = Math.round(Number(policyForm.monthly_token_limit || 0) * TOKEN_UNIT)
    delete payload.id
    await createOrUpdateCostPolicy(payload)
    Message.success(t('costPanel.saveSuccess'))
    await loadPolicies()
    return true
  } catch (_) {
    return false
  }
}

async function handleDeletePolicy(record) {
  try {
    await deleteCostPolicy(record.scope_type, record.scope_id)
    Message.success(t('costPanel.deleteSuccess'))
    await loadPolicies()
  } catch (_) { /* request.js 已弹错 */ }
}

function reloadActiveTab() {
  if (activeTab.value === 'panel') loadPanel()
  else if (activeTab.value === 'budget') loadBudget()
  else loadPolicies()
}

function handleTabChange(key) {
  if (key === 'budget' && budget.value.items.length === 0) loadBudget()
  if (key === 'policy' && policyList.value.length === 0) loadPolicies()
}

async function loadOptions() {
  try {
    const res = await getDeptList()
    const data = res.data || res
    deptOptions.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* 静默 */ }

  try {
    const res = await getTokenList({})
    const data = res.data || res
    const list = Array.isArray(data) ? data : (data?.list || [])
    const map = {}
    list.forEach(item => {
      const key = item.id ?? item.token_id
      if (key === undefined || key === null) return
      map[key] = item.token_name || item.name || item.remark || `#${key}`
    })
    tokenMap.value = map
  } catch (_) { /* 静默，回退显示原始 token_id */ }
}

onMounted(() => {
  loadOptions()
  loadPanel()
})
</script>

<style lang="scss" scoped>
.filter-bar {
  row-gap: $space-2;
}

.note-alert {
  margin-bottom: $space-4;
}

.note-text {
  margin: $space-3 0;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
  line-height: 1.8;
}

.kpi-card {
  :deep(.arco-card-body) {
    padding: $space-4;
  }
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: $color-text;
}

.kpi-title {
  margin-top: $space-1;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.inner-card {
  margin-top: $space-4;
  background: $color-bg-muted;
}

.table-toolbar {
  margin-bottom: $space-3;
  display: flex;
  align-items: center;
  gap: $space-2;
}

.toolbar-label {
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.form-hint {
  display: block;
  margin-top: $space-1;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

// 单价口径与示例（放在单价输入框上方）
.price-tip {
  margin-bottom: $space-3;
  padding: $space-2 $space-3;
  background: $color-bg-muted;
  border-radius: $radius;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
  line-height: 1.6;
}
</style>
