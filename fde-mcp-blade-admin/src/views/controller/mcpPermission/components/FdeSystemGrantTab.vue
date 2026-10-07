<template>
  <div class="fde-system-grant-tab">
    <!-- 按用户授权：选中用户后进入「系统功能授权」抽屉 -->
    <GrantUserTable
      :action-text="$t('mcpPermission.systemGrant')"
      @grant="openGrantDrawer"
    />

    <a-drawer
      v-model:visible="drawerVisible"
      :title="`${$t('mcpPermission.systemGrant')} - ${currentUser?.nick_name || currentUser?.user_name || ''}`"
      width="1000px"
      unmount-on-close
      @cancel="() => (drawerVisible = false)"
    >
      <div class="user-info-bar">
        <a-space size="large">
          <div>
            <span class="label">{{ $t('mcpPermission.usernameLabel') }}：</span>
            <span>{{ currentUser?.user_name }}</span>
          </div>
          <div>
            <span class="label">{{ $t('mcpPermission.nicknameLabel') }}：</span>
            <span>{{ currentUser?.nick_name }}</span>
          </div>
          <div>
            <span class="label">{{ $t('mcpPermission.coreRoleLabel') }}：</span>
            <span>{{ currentUser?.group_name }}</span>
          </div>
        </a-space>
      </div>

      <!-- 语义提示（1050 §三） -->
      <a-alert type="info" class="fde-semantics-alert">
        <div>{{ $t('mcpPermission.fdeTipInstant') }}</div>
        <div>{{ $t('mcpPermission.fdeTipListDef') }}</div>
        <div>{{ $t('mcpPermission.fdeTipDisabled') }}</div>
        <div>{{ $t('mcpPermission.fdeTipSeparate') }}</div>
      </a-alert>

      <div class="tab-toolbar">
        <a-input
          v-model="search"
          :placeholder="$t('mcpPermission.searchGroupTool')"
          allow-clear
          style="width: 260px"
        >
          <template #prefix><icon-search /></template>
        </a-input>
      </div>

      <a-spin :loading="loading" dot>
        <!-- 组表：行=工具组，展开=该组工具表 -->
        <a-table
          :data="groupTableData"
          :pagination="false"
          row-key="key"
          size="small"
          table-layout="fixed"
          :expanded-keys="expandedKeys"
          @expanded-change="handleExpandedChange"
        >
          <template #columns>
            <a-table-column :title="$t('mcpPermission.domain')" data-index="domain" :width="130" :ellipsis="true" />
            <a-table-column :title="$t('mcpPermission.groupName')" data-index="name" :width="130" />
            <a-table-column :title="$t('mcpPermission.description')" data-index="description" :ellipsis="true" />
            <a-table-column :title="$t('mcpPermission.wholeGroup')" :width="110">
              <template #cell="{ record }">
                <a-checkbox
                  :model-value="isWhole(record.key)"
                  :indeterminate="isIndeterminate(record)"
                  :disabled="!record.requires_grant || !(record.tools || []).length"
                  @change="() => toggleWhole(record)"
                >
                  {{ $t('mcpPermission.wholeGroup') }}
                </a-checkbox>
              </template>
            </a-table-column>
            <a-table-column :title="$t('mcpPermission.toolCount')" :width="80">
              <template #cell="{ record }">{{ (record.tools || []).length }}</template>
            </a-table-column>
            <a-table-column :title="$t('mcpPermission.operation')" :width="110" fixed="right">
              <template #cell="{ record }">
                <a-tag v-if="!record.requires_grant" color="arcoblue" size="small">
                  {{ $t('mcpPermission.loginOnly') }}
                </a-tag>
                <a-tag v-else-if="!(record.tools || []).length" color="gray" size="small">
                  {{ $t('mcpPermission.notOpen') }}
                </a-tag>
                <a-button v-else type="text" size="small" @click="toggleExpand(record)">
                  {{ $t('mcpPermission.viewTools') }}
                </a-button>
              </template>
            </a-table-column>
          </template>

          <!-- 展开行：工具表（授权 / 风险 / 启停 / 下线，互不影响） -->
          <template #expand-row="{ record: group }">
            <div class="expanded-tools">
              <a-table
                :data="group.tools || []"
                :pagination="false"
                row-key="name"
                size="small"
                table-layout="fixed"
                :row-class="toolRowClass"
              >
                <template #columns>
                  <a-table-column :title="$t('mcpPermission.toolAction')" :width="150">
                    <template #cell="{ record: tool }">
                      <span class="tool-action">{{ tool.action || tool.name }}</span>
                      <a-tooltip v-if="tool.description" :content="tool.description">
                        <icon-info-circle class="tool-info" />
                      </a-tooltip>
                    </template>
                  </a-table-column>
                  <a-table-column :title="$t('mcpPermission.toolName')" data-index="name" :width="190" :ellipsis="true" />
                  <a-table-column :title="$t('mcpPermission.grant')" :width="80">
                    <template #cell="{ record: tool }">
                      <a-checkbox
                        :model-value="isToolChecked(group.key, tool)"
                        :disabled="tool.status === '1' || isWhole(group.key) || !group.requires_grant"
                        @change="() => toggleTool(group, tool)"
                      />
                    </template>
                  </a-table-column>
                  <a-table-column :title="$t('mcpPermission.riskLevel')" :width="210">
                    <template #cell="{ record: tool }">
                      <a-select
                        :model-value="tool.risk"
                        :loading="tool._riskLoading"
                        size="small"
                        class="tool-risk-select"
                        @change="(v) => handleToolRiskChange(tool, v)"
                      >
                        <a-option v-for="opt in riskOptions" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </a-option>
                      </a-select>
                    </template>
                  </a-table-column>
                  <a-table-column :title="$t('mcpPermission.statusToggle')" :width="90">
                    <template #cell="{ record: tool }">
                      <a-switch
                        :model-value="tool.status === '0'"
                        :loading="tool._statusLoading"
                        size="small"
                        @change="(v) => handleToolStatusChange(tool, v)"
                      />
                    </template>
                  </a-table-column>
                  <a-table-column :title="$t('mcpPermission.operation')" :width="90">
                    <template #cell="{ record: tool }">
                      <a-button
                        type="text"
                        size="small"
                        status="danger"
                        :disabled="tool._statusLoading"
                        @click="handleToolDelete(tool)"
                      >
                        {{ $t('mcpPermission.toolOffline') }}
                      </a-button>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
            </div>
          </template>
        </a-table>

        <a-empty v-if="!loading && groupTableData.length === 0" :description="$t('mcpPermission.noGroup')" style="padding: 40px 0" />
      </a-spin>

      <template #footer>
        <a-space>
          <a-button @click="() => (drawerVisible = false)">{{ $t('commonTable.cancel') }}</a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">
            {{ $t('mcpPermission.saveGrant') }}
          </a-button>
        </a-space>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
// 系统功能授权（grant_type = fde_system）—— Doc 1050
// 授权单元两档：勾「整组」= 整组授权（fun_key 空）；只勾组内工具 = 单工具授权（fun_key = 工具名）。
// 数据来源 GET /biz/gis_grant/fde_groups（不写死）：现返回「全部已登记工具（含禁用）」，
//   · 授权：禁用行置灰、不可勾选；
//   · 管理：禁用行照常显示，启停开关可再启用（禁用后不从列表移除）。
// 提交采用「增量比对」：只撤销被取消的、只新增缺的，不做全删重建。
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'
import {
  AGENT_ID_DEFAULT,
  OUT_AGENT_ID_DEFAULT
} from '@/api/modules/gisGrant'
import GrantUserTable from './GrantUserTable.vue'
import { useGrantShared, useFdeRiskOptions } from '../composables/useGrantShared'

const { t } = useI18n()
const userStore = useUserStore()
// 风险等级选项（1050 §四，本页两个 Tab 通用）
const { riskOptions } = useFdeRiskOptions()
const operatorName = computed(() => {
  const info = userStore.userInfo || {}
  return info.userName || info.user_name || info.nickName || 'admin'
})

const {
  drawerVisible,
  currentUser,
  userGrants,
  operator,
  openDrawer,
  fetchUserGrants
} = useGrantShared()

const loading = ref(false)
const saving = ref(false)
const search = ref('')
const groups = ref([])
const expandedKeys = ref([])

// 当前勾选状态（desired）
const wholeMap = ref({})  // groupKey -> true（整组授权）
const toolMap = ref({})   // groupKey -> { toolName: true }（单工具授权）

// 后端已有记录基线（用于增量比对）
const baselineWhole = ref({}) // groupKey -> grant_id
const baselineTools = ref({}) // groupKey -> { toolName: grant_id }

// 组表数据：按关键字过滤后，按功能域排序（域内保持接口原顺序）
const groupTableData = computed(() => {
  const kw = search.value.trim().toLowerCase()
  const list = []
  groups.value.forEach((group, index) => {
    if (kw) {
      const hit =
        (group.name || '').toLowerCase().includes(kw) ||
        (group.domain || '').toLowerCase().includes(kw) ||
        (group.description || '').toLowerCase().includes(kw) ||
        (group.tools || []).some(tool =>
          (tool.name || '').toLowerCase().includes(kw) ||
          (tool.action || '').toLowerCase().includes(kw)
        )
      if (!hit) return
    }
    list.push({ group, index })
  })
  return list
    .sort((a, b) =>
      String(a.group.domain || '').localeCompare(String(b.group.domain || '')) || a.index - b.index
    )
    .map(item => item.group)
})

// 展开 / 收起
function handleExpandedChange(keys) {
  expandedKeys.value = keys
}

function toggleExpand(record) {
  const idx = expandedKeys.value.indexOf(record.key)
  if (idx >= 0) expandedKeys.value.splice(idx, 1)
  else expandedKeys.value.push(record.key)
}

// 禁用行置灰（授权不可勾，但管理可见）
function toolRowClass(record) {
  return record.status === '1' ? 'tool-row-disabled' : ''
}

// ========== 勾选状态读写 ==========
function isWhole(key) {
  return !!wholeMap.value[key]
}

function isToolChecked(groupKey, tool) {
  if (isWhole(groupKey)) return true
  return !!(toolMap.value[groupKey] && toolMap.value[groupKey][tool.name])
}

// 组呈半选态：只勾了组内部分/若干工具（未整组）
function isIndeterminate(group) {
  if (isWhole(group.key)) return false
  const sel = toolMap.value[group.key]
  return !!sel && Object.keys(sel).length > 0
}

// 勾/取消整组（整组 ⇄ 无；从半选点整组 → 收敛为整组）
function toggleWhole(group) {
  const key = group.key
  const nextWhole = { ...wholeMap.value }
  const nextTools = { ...toolMap.value }
  if (nextWhole[key]) {
    delete nextWhole[key]
    nextTools[key] = {}
  } else {
    nextWhole[key] = true
    // 收敛为整组：清掉单工具勾选（存量单工具授权会在保存时被撤销）
    nextTools[key] = {}
  }
  wholeMap.value = nextWhole
  toolMap.value = nextTools
}

// 勾/取消单个工具（整组态下禁用）
function toggleTool(group, tool) {
  const key = group.key
  if (isWhole(key)) return
  const cur = { ...(toolMap.value[key] || {}) }
  if (cur[tool.name]) delete cur[tool.name]
  else cur[tool.name] = true
  toolMap.value = { ...toolMap.value, [key]: cur }
}

// ========== 数据加载 ==========
async function fetchGroups() {
  loading.value = true
  try {
    const res = await api.gisGrant.getFdeGroups()
    const data = res?.data || res || []
    groups.value = Array.isArray(data) ? data : []
    expandedKeys.value = groups.value.map(g => g.key)
  } catch (e) {
    Message.error(t('mcpPermission.fetchGroupsFailed'))
  } finally {
    loading.value = false
  }
}

// 用后端已有授权记录建立基线，并同步初始勾选态
function buildBaseline(grants) {
  const whole = {}
  const tools = {}
  grants.forEach(g => {
    const key = g.target_name
    if (!key) return
    if (!g.fun_key) {
      whole[key] = g.grant_id
    } else {
      if (!tools[key]) tools[key] = {}
      tools[key][g.fun_key] = g.grant_id
    }
  })
  baselineWhole.value = whole
  baselineTools.value = tools

  const nextWhole = {}
  const nextTools = {}
  Object.keys(whole).forEach(k => { nextWhole[k] = true })
  Object.entries(tools).forEach(([k, toolGrants]) => {
    nextTools[k] = {}
    Object.keys(toolGrants).forEach(name => { nextTools[k][name] = true })
  })
  wholeMap.value = nextWhole
  toolMap.value = nextTools
}

async function reload() {
  // fde_groups 现返回全部已登记工具（含禁用），列表即为完整清单
  await Promise.all([
    fetchGroups(),
    fetchUserGrants('fde_system')
  ])
  buildBaseline(userGrants.value)
}

async function openGrantDrawer(user) {
  search.value = ''
  openDrawer(user)
  wholeMap.value = {}
  toolMap.value = {}
  await reload()
}

// ========== 增量提交（授权）==========
function buildCreatePayload(targetName, funKey) {
  const op = operator.value
  return {
    gis_user_id: currentUser.value.user_id,
    gis_agent_id: AGENT_ID_DEFAULT,
    out_agent_id: OUT_AGENT_ID_DEFAULT,
    grant_type: 'fde_system',
    target_name: targetName,
    // eqp_* 传 0 / 空串（1050 §六）
    eqp_id: 0,
    eqp_name: '',
    eqp_client_id: '',
    eqp_fun_id: 0,
    fun_key: funKey,
    grant_user_id: op.id,
    created_by: op.name,
    updated_by: op.name
  }
}

function buildDiff() {
  const toCreate = [] // { target_name, fun_key }
  const toRevoke = [] // grant_id

  groups.value.forEach(group => {
    const key = group.key
    const existingWholeId = baselineWhole.value[key]
    const existingTools = baselineTools.value[key] || {}

    if (isWhole(key)) {
      if (!existingWholeId) toCreate.push({ target_name: key, fun_key: '' })
      // 整组覆盖后，原有的单工具授权冗余，撤销
      Object.values(existingTools).forEach(gid => toRevoke.push(gid))
    } else {
      if (existingWholeId) toRevoke.push(existingWholeId)
      const desired = Object.keys(toolMap.value[key] || {})
      desired.forEach(name => {
        if (!existingTools[name]) toCreate.push({ target_name: key, fun_key: name })
      })
      Object.entries(existingTools).forEach(([name, gid]) => {
        if (!desired.includes(name)) toRevoke.push(gid)
      })
    }
  })

  return { toCreate, toRevoke }
}

async function handleSave() {
  const { toCreate, toRevoke } = buildDiff()
  if (toCreate.length === 0 && toRevoke.length === 0) {
    Message.info(t('mcpPermission.grantNoChange'))
    return
  }
  saving.value = true
  try {
    // 先撤销、再新增，避免与新授权产生重复判定
    for (const gid of toRevoke) {
      await api.gisGrant.revokeGrant(gid, { updated_by: operator.value.name })
    }
    for (const item of toCreate) {
      await api.gisGrant.createGrant(buildCreatePayload(item.target_name, item.fun_key))
    }
    Message.success(
      t('mcpPermission.grantSaveSuccess', { create: toCreate.length, revoke: toRevoke.length })
    )
    await reload()
  } catch (e) {
    Message.error(e?.msg || t('mcpPermission.grantSaveFailed'))
    // 失败后回读服务端真实状态，避免本地勾选与后端不一致
    await reload().catch(() => {})
  } finally {
    saving.value = false
  }
}

// ========== 工具行就地管理：风险 / 启停 / 下线（1050 §二）==========
// 与「授权」互不影响；数据落在 gis_mcp_tool 表，改完即时生效。
// 更新前先取详情，按 §二 全量回传（display_name / sort_order / params_schema 原样带回，避免被清空）。
async function putTool(tool, patch) {
  const detailRes = await api.gisMcpTool.getMcpToolDetail(tool.tool_id)
  const d = detailRes?.data || detailRes || {}
  await api.gisMcpTool.updateMcpTool(tool.tool_id, {
    tool_name: d.tool_name ?? tool.name,
    display_name: d.display_name ?? '',
    category: 'fde_system',
    risk_level: patch.risk_level ?? d.risk_level ?? tool.risk,
    params_schema: d.params_schema ?? null,
    sort_order: d.sort_order ?? 0,
    status: patch.status ?? d.status ?? tool.status ?? '0',
    updated_by: operatorName.value
  })
}

async function handleToolRiskChange(tool, value) {
  if (!value || value === tool.risk) return
  tool._riskLoading = true
  try {
    await putTool(tool, { risk_level: value })
    tool.risk = value
    Message.success(t('mcpPermission.riskUpdateSuccess'))
  } catch (e) {
    Message.error(e?.msg || t('mcpPermission.riskUpdateFailed'))
  } finally {
    tool._riskLoading = false
  }
}

async function handleToolStatusChange(tool, checked) {
  const status = checked ? '0' : '1'
  if (status === tool.status) return
  tool._statusLoading = true
  try {
    await putTool(tool, { status })
    // 就地更新：禁用后不从列表移除，保留「再启用」入口
    tool.status = status
    Message.success(t('mcpPermission.toolStatusUpdated'))
  } catch (e) {
    Message.error(e?.msg || t('mcpPermission.toolStatusUpdateFailed'))
  } finally {
    tool._statusLoading = false
  }
}

// 下线（逻辑删除）：下线后该工具不再下发，并从清单移除
function handleToolDelete(tool) {
  Modal.confirm({
    title: t('mcpPermission.toolOfflineTitle'),
    content: t('mcpPermission.toolOfflineConfirm', { name: tool.action || tool.name }),
    okText: t('mcpPermission.toolOffline'),
    cancelText: t('commonTable.cancel'),
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await api.gisMcpTool.deleteMcpTool(tool.tool_id)
        Message.success(t('mcpPermission.toolOfflineSuccess'))
        await reload()
      } catch (e) {
        Message.error(e?.msg || t('mcpPermission.toolOfflineFailed'))
      }
    }
  })
}
</script>

<style scoped>
.user-info-bar {
  padding: 12px 16px;
  background: var(--color-fill-2);
  border-radius: 6px;
}

.user-info-bar .label {
  color: var(--color-text-3);
  margin-right: 4px;
}

.fde-semantics-alert {
  margin-top: 12px;
}

.tab-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: 16px 0;
}

.expanded-tools {
  padding: 8px 16px;
  background: var(--color-fill-2);
}

.expanded-tools :deep(.tool-row-disabled) {
  opacity: 0.55;
}

.tool-action {
  font-size: 13px;
  margin-right: 4px;
}

.tool-info {
  color: var(--color-text-3);
  cursor: help;
}

.tool-risk-select {
  width: 190px;
}
</style>
