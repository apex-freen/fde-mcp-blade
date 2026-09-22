<template>
  <div class="approval-binding-page">
    <!-- 规则说明 -->
    <a-alert type="info" show-icon style="margin-top: 16px">
      <div>{{ $t('approvalBinding.tip') }}</div>
      <div class="alert-sub">{{ $t('approvalBinding.matchHint') }}</div>
    </a-alert>

    <!-- 汇总条：一眼看出还有多少操作会落到管理员 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="summary-bar">
        <div class="stat">
          <div class="num">{{ summary.authTotal }}</div>
          <div class="label">{{ $t('approvalBinding.statTotal') }}</div>
        </div>
        <div class="stat">
          <div class="num ok">{{ summary.bound }}</div>
          <div class="label">{{ $t('approvalBinding.statBound') }}</div>
        </div>
        <div class="stat">
          <div class="num danger">{{ summary.unbound }}</div>
          <div class="label">{{ $t('approvalBinding.statUnbound') }}</div>
        </div>
        <div class="stat">
          <div class="num warn">{{ summary.invalid }}</div>
          <div class="label">{{ $t('approvalBinding.statInvalid') }}</div>
        </div>
        <a-button :loading="loading" @click="loadAll">
          <template #icon><icon-refresh /></template>
          {{ $t('commonTable.refresh') }}
        </a-button>
      </div>
      <div class="summary-tip">{{ $t('approvalBinding.unboundTip') }}</div>
    </a-card>

    <!-- 主体：插件 → 授权后执行(auth)的方法 → 绑定 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="main-layout">
        <!-- 左：插件列表 -->
        <div class="plugin-pane">
          <div class="pane-title">{{ $t('approvalBinding.pluginPane') }}</div>
          <div class="plugin-list">
            <div
              v-for="p in pluginStats"
              :key="p.name"
              class="plugin-item"
              :class="{ active: p.name === activePlugin }"
              @click="activePlugin = p.name"
            >
              <div class="plugin-text">
                <div class="plugin-name">{{ p.name }}</div>
                <div class="plugin-title">{{ p.title || '-' }}</div>
              </div>
              <a-tag :color="badgeColor(p)" size="small">{{ p.bound }}/{{ p.authTotal }}</a-tag>
            </div>
            <a-empty v-if="!pluginStats.length" :description="$t('commonTable.noData')" />
          </div>
        </div>

        <!-- 右：方法清单 -->
        <div class="method-pane">
          <div class="table-toolbar">
            <a-space wrap>
              <a-input
                v-model="keyword"
                :placeholder="$t('approvalBinding.searchMethod')"
                allow-clear
                style="width: 220px"
              />
              <a-radio-group v-model="riskFilter" type="button" size="small">
                <a-radio value="auth">{{ $t('approvalBinding.filterAuth') }}</a-radio>
                <a-radio value="all">{{ $t('approvalBinding.filterAll') }}</a-radio>
              </a-radio-group>
              <a-checkbox v-model="onlyUnbound">{{ $t('approvalBinding.onlyUnbound') }}</a-checkbox>
            </a-space>
          </div>

          <a-table
            :data="methodRows"
            :loading="loading"
            :pagination="false"
            row-key="rowKey"
            size="small"
          >
            <template #columns>
              <a-table-column :title="$t('approvalBinding.methodName')" data-index="methodName" :width="200" :ellipsis="true" />
              <a-table-column :title="$t('approvalBinding.methodDesc')" data-index="description" :width="180" :ellipsis="true">
                <template #cell="{ record: row }">{{ row.description || '-' }}</template>
              </a-table-column>
              <a-table-column :title="$t('approvalBinding.riskLevel')" :width="110">
                <template #cell="{ record: row }">
                  <a-tag v-if="riskLevelMap[row.risk_level]" :color="riskLevelMap[row.risk_level].color" size="small">
                    {{ riskLevelMap[row.risk_level].label }}
                  </a-tag>
                  <span v-else>-</span>
                </template>
              </a-table-column>
              <a-table-column :title="$t('approvalBinding.approver')" :width="280" :ellipsis="true">
                <template #cell="{ record: row }">
                  <span v-if="!row.needApproval" class="text-muted">{{ $t('approvalBinding.noApprovalNeeded') }}</span>
                  <template v-else-if="row.effective">
                    <a-tag size="small">{{ row.effective.level }}</a-tag>
                    <span>{{ approverText(row.effective.record) }}</span>
                    <span v-if="row.effectiveInvalid" class="text-warn">{{ $t('approvalBinding.approverInvalidHint') }}</span>
                  </template>
                  <template v-else>
                    <span class="text-danger">{{ $t('approvalBinding.unboundHint') }}</span>
                    <span v-if="row.ownBinding" class="text-warn">（{{ $t('approvalBinding.ownDisabled') }}）</span>
                  </template>
                </template>
              </a-table-column>
              <a-table-column :title="$t('commonTable.operation')" :width="150" fixed="right">
                <template #cell="{ record: row }">
                  <a-space v-if="row.needApproval" size="mini">
                    <a-button v-if="row.ownBinding" type="text" size="small" @click="openMethodEdit(row)">
                      {{ $t('approvalBinding.rebind') }}
                    </a-button>
                    <a-button v-else type="text" size="small" @click="openMethodBind(row)">
                      {{ $t('approvalBinding.bind') }}
                    </a-button>
                    <a-button
                      v-if="row.ownBinding"
                      type="text"
                      size="small"
                      status="danger"
                      @click="handleDelete(row.ownBinding)"
                    >
                      {{ $t('approvalBinding.unbind') }}
                    </a-button>
                  </a-space>
                  <span v-else>-</span>
                </template>
              </a-table-column>
            </template>
            <template #empty>{{ $t('commonTable.noData') }}</template>
          </a-table>
        </div>
      </div>
    </a-card>

    <!-- 兜底：全局绑定 / 工具级绑定 / 插件已不存在的历史绑定 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>{{ $t('approvalBinding.fallbackTitle') }}</template>
      <template #extra>
        <a-button type="primary" size="small" @click="openFallbackAdd">
          <template #icon><icon-plus /></template>
          {{ $t('approvalBinding.addFallback') }}
        </a-button>
      </template>

      <div class="fallback-hint">{{ $t('approvalBinding.fallbackHint') }}</div>

      <a-table
        :data="fallbackRows"
        :loading="loading"
        :pagination="false"
        row-key="binding_id"
        size="small"
      >
        <template #columns>
          <a-table-column :title="$t('approvalBinding.scope')" :width="200">
            <template #cell="{ record }">
              <a-tag :color="record.scopeType === 'orphan' ? 'red' : 'gray'" size="small">
                {{ record.scopeLabel }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('approvalBinding.operationType')" data-index="operation_type" :width="240" :ellipsis="true" />
          <a-table-column :title="$t('approvalBinding.methodDesc')" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ liveDescription(record.operation_type) }}</template>
          </a-table-column>
          <a-table-column :title="$t('approvalBinding.approver')" :width="240" :ellipsis="true">
            <template #cell="{ record }">
              <a-tag v-if="record.approver_type === 'role'" color="red" size="small">
                {{ $t('approvalBinding.roleNotEffective') }}
              </a-tag>
              <span>{{ approverText(record) }}</span>
              <span v-if="approverInvalid(record)" class="text-warn">{{ $t('approvalBinding.approverInvalidHint') }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('approvalBinding.status')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status === '1' ? 'orange' : 'green'" size="small">
                {{ record.status === '1' ? $t('approvalBinding.statusDisabled') : $t('approvalBinding.statusEnabled') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('approvalBinding.description')" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ record.description || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="140" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button type="text" size="small" @click="openFallbackEdit(record)">{{ $t('commonTable.edit') }}</a-button>
                <a-button type="text" size="small" status="danger" @click="handleDelete(record)">{{ $t('commonTable.delete') }}</a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
        <template #empty>{{ $t('commonTable.noData') }}</template>
      </a-table>
    </a-card>

    <!-- 绑定弹窗：插件级方法绑定 / 全局兜底绑定共用 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="modalTitle"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      :ok-loading="saving"
      width="620px"
      unmount-on-close
      @ok="handleSave"
      @cancel="modalVisible = false"
    >
      <a-form :model="form" layout="vertical">
        <!-- 插件级：绑定对象由所选方法带入，不可手输 -->
        <a-form-item v-if="modalMode === 'method'" :label="$t('approvalBinding.methodScopeLabel')">
          <a-input :model-value="`${form.target_name} · ${form.operation_type}`" disabled />
          <template #extra>
            <div class="form-hint">{{ $t('approvalBinding.operationTypeReadonly') }}</div>
          </template>
        </a-form-item>

        <!-- 兜底绑定：operation_type 需手输（工具名没有清单可查） -->
        <template v-else>
          <a-form-item v-if="form.target_name" :label="$t('approvalBinding.scope')">
            <a-input :model-value="form.target_name" disabled />
          </a-form-item>
          <a-form-item field="operation_type" :label="$t('approvalBinding.operationType')" required>
            <a-input
              v-model="form.operation_type"
              :placeholder="$t('approvalBinding.operationTypePlaceholder')"
            />
            <template #extra>
              <div class="form-hint">{{ $t('approvalBinding.operationTypeFallbackHint') }}</div>
            </template>
          </a-form-item>
        </template>

        <a-form-item field="approver_ids" :label="$t('approvalBinding.approverIds')" required>
          <a-select
            v-model="form.approver_ids"
            multiple
            allow-search
            allow-clear
            :loading="optionLoading"
            :placeholder="$t('approvalBinding.approverIdsPlaceholder')"
            :max-tag-count="6"
            style="width: 100%"
          >
            <a-option v-for="u in userOptions" :key="u.value" :value="u.value">{{ u.label }}</a-option>
          </a-select>
          <template #extra>
            <div class="form-hint">{{ $t('approvalBinding.approverTypeHint') }}</div>
          </template>
        </a-form-item>

        <a-form-item field="status" :label="$t('approvalBinding.status')">
          <a-radio-group v-model="form.status">
            <a-radio value="0">{{ $t('approvalBinding.statusEnabled') }}</a-radio>
            <a-radio value="1">{{ $t('approvalBinding.statusDisabled') }}</a-radio>
          </a-radio-group>
          <template #extra>
            <div class="form-hint">{{ $t('approvalBinding.statusHint') }}</div>
          </template>
        </a-form-item>

        <!-- 审批顺序：多人顺序审批未启用，保留字段避免编辑时被 PUT 全量覆盖清掉 -->
        <a-form-item v-if="isEdit" field="order_index" :label="$t('approvalBinding.orderIndex')">
          <a-input-number v-model="form.order_index" :min="0" :precision="0" style="width: 160px" />
          <template #extra>
            <div class="form-hint">{{ $t('approvalBinding.orderIndexHint') }}</div>
          </template>
        </a-form-item>

        <a-form-item field="description" :label="$t('approvalBinding.description')">
          <a-textarea
            v-model="form.description"
            :placeholder="$t('approvalBinding.descriptionPlaceholder')"
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
// 审批人绑定（1056）：配置「哪些操作必须找谁审批」
//
// 2026-09-17 重构（后端 N1/N2 交付后）：
//   1. 页面结构改为「插件列表 → 该插件下 risk_level='auth' 的方法 → 绑定审批人」，
//      operation_type 由所选方法自动带入，不再手输（手输拼错会静默回退管理员）；
//   2. 绑定表新增 target_name（插件名，空 = 全局绑定），匹配改为四级：
//      ① 插件名+方法名 → ② 全局+方法名 → ③ 全局+工具名:方法名 → ④ 全局+工具名（见 62 §9.8④）；
//   3. 绑定列表支持 operation_type 多值 / target_name 过滤 / page_size 1000，
//      因此初始化一次拉全量绑定，在前端与插件方法清单 join，不做 N+1（见 62 §9.3）；
//   4. 插件身份一律以目录名为准 = 列表出参的 manifest.name（见 62 §9.9），不要用 info.title。
//
// 只在有「授权后执行(auth)」标记的方法上做绑定要求：normal / risk / disable 不经过审批。
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'
import { RISK_LEVEL_MAP } from '@/constants/riskLevel'

const { t } = useI18n()
const userStore = useUserStore()
const riskLevelMap = RISK_LEVEL_MAP

// 服务类调用的执行工具名，四级匹配的 ③④ 级用它（41 §12.1）
const SERVICE_TOOL = 'local_service_call'
// 已知的工具名（用于把「全局绑定」标成工具级，便于识别粗粒度兜底）
const KNOWN_TOOLS = [SERVICE_TOOL, 'device_call']
// 绑定表行数极少，一次拉全（62 §9.3 推荐用法）
const PAGE_SIZE = 1000

const operatorName = computed(() => userStore.userName || 'admin')

// ==================== 数据源 ====================
const loading = ref(false)
const optionLoading = ref(false)

// 视图状态
const activePlugin = ref('') // 左栏选中的插件（插件名 = 目录名）
const keyword = ref('') // 方法名 / 描述 关键字
const riskFilter = ref('auth') // auth = 只看「授权后执行」；all = 全部风险等级
const onlyUnbound = ref(false) // 只看未绑定（会回退管理员）的方法

const plugins = ref([]) // { name, title, methods: [{ name, description, risk_level }] }
const bindings = ref([])
const users = ref([])

// 插件列表：兼容嵌套 manifest / info 与平铺两种形状，只取需要的字段
function normalizePlugins(raw) {
  const list = Array.isArray(raw) ? raw : raw?.rows || []
  return list
    .map((p) => {
      const manifest = p?.manifest || {}
      const info = p?.info || {}
      const methods = p?.methods || manifest.methods || []
      return {
        // 插件标识 = 目录名 = 出参的 manifest.name（62 §9.9）
        name: p?.name || manifest.name || '',
        title: info.title || p?.title || '',
        methods: methods
          .map((m) => ({
            name: m?.name || '',
            description: m?.description || '',
            risk_level: m?.risk_level || ''
          }))
          .filter((m) => m.name)
      }
    })
    .filter((p) => p.name)
}

async function loadAll() {
  loading.value = true
  try {
    const [svcRes, bindRes] = await Promise.all([
      api.pluginService.getServiceList(),
      api.gisApprovalBinding.getBindingList({ page: 1, page_size: PAGE_SIZE })
    ])
    plugins.value = normalizePlugins(svcRes?.data || svcRes)
    const bindData = bindRes?.data || bindRes || {}
    bindings.value = bindData.rows || []
    if (!activePlugin.value && plugins.value.length) {
      activePlugin.value = plugins.value[0].name
    }
  } catch (e) {
    console.error(t('approvalBinding.fetchFailed') + ':', e)
    Message.error(t('approvalBinding.fetchFailed'))
  } finally {
    loading.value = false
  }
}

// 只刷绑定（绑定变更后用，避免重复拉插件清单）
async function reloadBindings() {
  const res = await api.gisApprovalBinding.getBindingList({ page: 1, page_size: PAGE_SIZE })
  const data = res?.data || res || {}
  bindings.value = data.rows || []
}

async function fetchUsers() {
  optionLoading.value = true
  try {
    const res = await api.gisUser.getGisUserAll()
    const data = res?.data || res || []
    users.value = Array.isArray(data) ? data : data.rows || []
  } catch (e) {
    console.error(t('approvalBinding.fetchFailed') + ':', e)
  } finally {
    optionLoading.value = false
  }
}

const userOptions = computed(() =>
  users.value.map((u) => ({
    value: u.user_id,
    label: u.nick_name && u.user_name ? `${u.nick_name}（${u.user_name}）` : u.nick_name || u.user_name || String(u.user_id)
  }))
)

// ==================== 绑定命中计算 ====================
// 解析审批人时只认「status='0' 且 approver_type='user'」的绑定（41 §12.1）：
// 禁用的绑定、以及历史「按角色」绑定都不参与解析，等同于没配
const activeBindings = computed(() =>
  bindings.value.filter((b) => b.status !== '1' && b.approver_type !== 'role')
)

function parseApproverIds(val) {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return [val]
    }
  }
  return []
}

function normalizeIds(ids) {
  return (ids || []).map((id) => {
    if (typeof id === 'number') return id
    const s = String(id).trim()
    return /^-?\d+$/.test(s) ? Number(s) : s
  })
}

// 审批人展示：优先用出参 approver_users（41 §12.1），回退到本地映射
function approverText(record) {
  const list = record?.approver_users
  if (Array.isArray(list) && list.length) {
    return list.map((u) => u.real_name || u.nick_name || u.user_name || String(u.user_id)).join('、')
  }
  const ids = parseApproverIds(record?.approver_ids)
  if (!ids.length) return '-'
  return ids
    .map((id) => {
      const u = users.value.find((x) => String(x.user_id) === String(id))
      return u ? u.nick_name || u.user_name || String(id) : String(id)
    })
    .join('、')
}

// 审批人全部停用 → 后端解析时会跳过、最终回退管理员，这里同样按「未生效」提示
function approverInvalid(record) {
  const list = record?.approver_users
  if (!Array.isArray(list) || !list.length) return false
  return list.every((u) => String(u.status) === '1')
}

// 四级匹配（62 §9.8④）：返回实际会命中的绑定与命中层级
function effectiveBinding(pluginName, methodName) {
  const list = activeBindings.value
  const pluginLevel = list.find((b) => b.target_name === pluginName && b.operation_type === methodName)
  if (pluginLevel) return { record: pluginLevel, level: t('approvalBinding.levelPlugin') }

  const globals = list.filter((b) => !b.target_name)
  let hit = globals.find((b) => b.operation_type === methodName)
  if (hit) return { record: hit, level: t('approvalBinding.levelGlobalMethod') }

  hit = globals.find((b) => b.operation_type === `${SERVICE_TOOL}:${methodName}`)
  if (hit) return { record: hit, level: t('approvalBinding.levelGlobalToolMethod') }

  hit = globals.find((b) => b.operation_type === SERVICE_TOOL)
  if (hit) return { record: hit, level: t('approvalBinding.levelGlobalTool') }

  return null
}

function effectiveCount(plugin) {
  let bound = 0
  let invalid = 0
  plugin.methods
    .filter((m) => m.risk_level === 'auth')
    .forEach((m) => {
      const eff = effectiveBinding(plugin.name, m.name)
      if (!eff) return
      if (approverInvalid(eff.record)) invalid++
      else bound++
    })
  return { bound, invalid }
}

// ==================== 插件列表 / 汇总 ====================
const pluginStats = computed(() =>
  plugins.value
    .map((plugin) => {
      const authTotal = plugin.methods.filter((m) => m.risk_level === 'auth').length
      const { bound, invalid } = effectiveCount(plugin)
      return {
        name: plugin.name,
        title: plugin.title,
        authTotal,
        bound,
        invalid,
        unbound: authTotal - bound
      }
    })
    // 没配完的排前面，便于逐个补
    .sort((a, b) => b.unbound - a.unbound || a.name.localeCompare(b.name))
)

function badgeColor(p) {
  if (p.authTotal === 0) return 'gray'
  if (p.unbound === 0) return 'green'
  if (p.bound === 0) return 'red'
  return 'orange'
}

const summary = computed(() =>
  pluginStats.value.reduce(
    (acc, p) => ({
      authTotal: acc.authTotal + p.authTotal,
      bound: acc.bound + p.bound,
      unbound: acc.unbound + p.unbound,
      invalid: acc.invalid + p.invalid
    }),
    { authTotal: 0, bound: 0, unbound: 0, invalid: 0 }
  )
)

const currentPlugin = computed(() => plugins.value.find((p) => p.name === activePlugin.value) || null)

const methodRows = computed(() => {
  const plugin = currentPlugin.value
  if (!plugin) return []
  const kw = keyword.value.trim().toLowerCase()

  return plugin.methods
    .filter((m) => riskFilter.value === 'all' || m.risk_level === 'auth')
    .map((m) => {
      const needApproval = m.risk_level === 'auth'
      const eff = needApproval ? effectiveBinding(plugin.name, m.name) : null
      const effInvalid = eff ? approverInvalid(eff.record) : false
      return {
        rowKey: `${plugin.name}::${m.name}`,
        methodName: m.name,
        description: m.description,
        risk_level: m.risk_level,
        needApproval,
        effective: eff,
        effectiveInvalid: effInvalid,
        // 该方法自己的插件级绑定（含禁用），决定按钮是「绑定」还是「改绑/解绑」
        ownBinding: bindings.value.find((b) => b.target_name === plugin.name && b.operation_type === m.name) || null
      }
    })
    .filter((row) => {
      if (kw && !`${row.methodName} ${row.description}`.toLowerCase().includes(kw)) return false
      if (onlyUnbound.value) return row.needApproval && !(row.effective && !row.effectiveInvalid)
      return true
    })
})

// ==================== 兜底绑定（全局 / 工具级 / 插件已不存在） ====================
const pluginNameSet = computed(() => new Set(plugins.value.map((p) => p.name)))

function scopeOf(binding) {
  const tn = binding.target_name
  if (tn) {
    return pluginNameSet.value.has(tn)
      ? { type: 'plugin', label: t('approvalBinding.scopePlugin', { name: tn }) }
      : { type: 'orphan', label: t('approvalBinding.scopeOrphan', { name: tn }) }
  }
  const ot = binding.operation_type || ''
  if (ot.includes(':')) return { type: 'toolMethod', label: t('approvalBinding.scopeToolMethod') }
  if (KNOWN_TOOLS.includes(ot)) return { type: 'tool', label: t('approvalBinding.scopeTool') }
  return { type: 'method', label: t('approvalBinding.scopeMethod') }
}

const fallbackRows = computed(() =>
  bindings.value
    .filter((b) => !b.target_name || !pluginNameSet.value.has(b.target_name))
    .map((b) => {
      const scope = scopeOf(b)
      return { ...b, scopeType: scope.type, scopeLabel: scope.label }
    })
)

// 方法名 → 描述：描述不落库，列表里实时从插件清单取（同一方法名在多个插件出现时取首个）
const methodIndex = computed(() => {
  const map = {}
  plugins.value.forEach((p) => {
    p.methods.forEach((m) => {
      if (!map[m.name]) map[m.name] = m.description || ''
    })
  })
  return map
})

function liveDescription(operationType) {
  const ot = operationType || ''
  if (!ot) return '-'
  // 「工具名:方法名」按方法名取；纯工具名（local_service_call / device_call）取不到描述
  const key = ot.includes(':') ? ot.slice(ot.indexOf(':') + 1) : ot
  return methodIndex.value[key] || '-'
}

// ==================== 弹窗：绑定 / 改绑 ====================
const modalVisible = ref(false)
const modalMode = ref('method') // method = 插件级方法绑定；fallback = 全局兜底绑定
const isEdit = ref(false)
const saving = ref(false)
const currentId = ref(null)

const getDefaultForm = () => ({
  operation_type: '',
  target_name: '',
  approver_ids: [],
  order_index: 0,
  description: '',
  status: '0'
})

const form = reactive(getDefaultForm())

const modalTitle = computed(() => {
  if (isEdit.value) return t('approvalBinding.edit')
  return modalMode.value === 'method' ? t('approvalBinding.bind') : t('approvalBinding.addFallback')
})

function fillForm(record) {
  Object.assign(form, getDefaultForm(), {
    operation_type: record.operation_type || '',
    target_name: record.target_name || '',
    approver_ids: normalizeIds(parseApproverIds(record.approver_ids)),
    order_index: record.order_index ?? 0,
    description: record.description || '',
    status: String(record.status ?? '0')
  })
}

// 给某个方法新建插件级绑定：operation_type 与 target_name 都由所选方法带入
function openMethodBind(row) {
  modalMode.value = 'method'
  isEdit.value = false
  currentId.value = null
  Object.assign(form, getDefaultForm(), {
    operation_type: row.methodName,
    target_name: currentPlugin.value?.name || ''
  })
  modalVisible.value = true
}

function openMethodEdit(row) {
  modalMode.value = 'method'
  isEdit.value = true
  currentId.value = row.ownBinding.binding_id
  fillForm(row.ownBinding)
  modalVisible.value = true
}

function openFallbackAdd() {
  modalMode.value = 'fallback'
  isEdit.value = false
  currentId.value = null
  Object.assign(form, getDefaultForm())
  modalVisible.value = true
}

function openFallbackEdit(record) {
  modalMode.value = 'fallback'
  isEdit.value = true
  currentId.value = record.binding_id
  fillForm(record)
  modalVisible.value = true
}

async function handleSave() {
  if (!form.operation_type || !form.operation_type.trim()) {
    Message.warning(t('approvalBinding.operationTypeRequired'))
    return
  }
  if (!form.approver_ids || !form.approver_ids.length) {
    Message.warning(t('approvalBinding.approverIdsRequired'))
    return
  }
  const opType = form.operation_type.trim()
  const pluginName = form.target_name || ''
  const payload = {
    operation_type: opType,
    // operation_name 只做展示、不参与判定（41 §12.1）：
    //   插件级写「插件名:方法名」，比只写方法名更易读；
    //   兜底绑定没有插件名，直接等于 operation_type。
    // 后端该列是 varchar(64)，插件名+方法名可能超长，这里按列宽截断避免保存失败。
    operation_name: (pluginName ? `${pluginName}:${opType}` : opType).slice(0, 64),
    // PUT 是「全量覆盖」：target_name 不传会被改回全局绑定，务必恒定带上（62 §9.8③）
    target_name: pluginName,
    approver_type: 'user',
    approver_ids: normalizeIds(form.approver_ids),
    order_index: Number(form.order_index) || 0,
    description: form.description || '',
    status: form.status || '0'
  }
  saving.value = true
  try {
    if (isEdit.value) {
      payload.updated_by = operatorName.value
      await api.gisApprovalBinding.updateBinding(currentId.value, payload)
      Message.success(t('approvalBinding.updateSuccess'))
    } else {
      payload.created_by = operatorName.value
      await api.gisApprovalBinding.createBinding(payload)
      Message.success(t('approvalBinding.createSuccess'))
    }
    modalVisible.value = false
    await reloadBindings()
  } catch (e) {
    console.error(t('approvalBinding.saveFailed') + ':', e)
  } finally {
    saving.value = false
  }
}

// ==================== 解绑 / 删除 ====================
function handleDelete(record) {
  Modal.confirm({
    title: t('commonTable.delete'),
    content: t('approvalBinding.deleteConfirm'),
    okText: t('commonTable.confirm'),
    cancelText: t('commonTable.cancel'),
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await api.gisApprovalBinding.deleteBinding(record.binding_id)
        Message.success(t('approvalBinding.deleteSuccess'))
        await reloadBindings()
      } catch (e) {
        console.error(t('approvalBinding.saveFailed') + ':', e)
      }
    }
  })
}

// ==================== 初始化 ====================
onMounted(() => {
  loadAll()
  fetchUsers()
})
</script>

<style lang="scss" scoped>
.approval-binding-page {
  .alert-sub {
    margin-top: 4px;
    color: var(--color-text-3);
    font-size: 12px;
  }

  .summary-bar {
    display: flex;
    align-items: center;
    gap: 48px;
  }

  .summary-bar .stat .num {
    font-size: 22px;
    font-weight: 600;
    line-height: 1.2;

    &.ok {
      color: rgb(var(--success-6));
    }
    &.danger {
      color: rgb(var(--danger-6));
    }
    &.warn {
      color: rgb(var(--warning-6));
    }
  }

  .summary-bar .stat .label {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .summary-tip {
    margin-top: 8px;
    color: var(--color-text-3);
    font-size: 12px;
  }

  .main-layout {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .plugin-pane {
    width: 260px;
    flex: none;
    border-right: 1px solid var(--color-border-2);
    padding-right: 12px;
  }

  .pane-title {
    margin-bottom: 8px;
    font-weight: 600;
  }

  .plugin-list {
    max-height: 520px;
    overflow-y: auto;
  }

  .plugin-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: var(--color-fill-2);
    }

    &.active {
      background: var(--color-fill-2);
      box-shadow: inset 2px 0 0 rgb(var(--primary-6));
    }
  }

  .plugin-item .plugin-text {
    min-width: 0;
  }

  .plugin-item .plugin-name {
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .plugin-item .plugin-title {
    color: var(--color-text-3);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .method-pane {
    flex: 1;
    min-width: 0;
  }

  .table-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  .fallback-hint {
    margin-bottom: 12px;
    color: var(--color-text-3);
    font-size: 12px;
  }

  .form-hint {
    font-size: 12px;
    color: var(--color-text-3);
    line-height: 1.5;
  }

  .text-muted {
    color: var(--color-text-3);
  }

  .text-warn {
    color: rgb(var(--warning-6));
    font-size: 12px;
  }

  .text-danger {
    color: rgb(var(--danger-6));
  }
}
</style>
