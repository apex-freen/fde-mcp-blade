<template>
  <div class="mcp-grant-page">
    <!-- 视角切换：按用户授权（默认）/ 按服务授权 -->
    <div class="view-switch">
      <a-radio-group v-model="viewMode" type="button" size="small">
        <a-radio value="byUser">{{ $t('mcpPermission.viewByUser') }}</a-radio>
        <a-radio value="byTarget">{{ $t('mcpPermission.viewByService') }}</a-radio>
      </a-radio-group>
    </div>

    <!-- 按用户授权：选中用户后进入服务授权抽屉 -->
    <GrantUserTable
      v-if="viewMode === 'byUser'"
      :action-text="$t('mcpPermission.serviceGrant')"
      @grant="openGrantDrawer"
    />

    <!-- 按服务授权：先选插件，再给多个用户一次授权 -->
    <a-card v-else :bordered="false" style="margin-top: 16px">
      <div class="tab-toolbar">
        <a-input
          v-model="targetSearch"
          :placeholder="$t('mcpPermission.searchService')"
          allow-clear
          style="width: 260px"
        >
          <template #prefix><icon-search /></template>
        </a-input>
      </div>

      <a-spin :loading="targetLoading" dot>
        <a-table
          :data="filteredTargets"
          :pagination="false"
          row-key="name"
          size="small"
          table-layout="fixed"
        >
          <template #columns>
            <a-table-column :title="$t('mcpPermission.methodName')" data-index="name" :width="180" :ellipsis="true" />
            <a-table-column title="Title" data-index="title" :width="160" :ellipsis="true" />
            <a-table-column title="Service Type" data-index="serviceType" :width="120" :ellipsis="true" />
            <a-table-column :title="$t('commonTable.serviceUrl')" data-index="server_url" :width="160" :ellipsis="true" />
            <a-table-column :title="$t('mcpPermission.methodCount')" :width="100">
              <template #cell="{ record }">{{ record.totalCount }}</template>
            </a-table-column>
            <a-table-column :title="$t('mcpPermission.grantedUserCount')" :width="130">
              <template #cell="{ record }">
                <a-tag :color="(record.grantedUserCount || 0) > 0 ? 'green' : 'gray'">
                  {{ record.grantedUserCount || 0 }}
                </a-tag>
              </template>
            </a-table-column>
            <a-table-column :title="$t('mcpPermission.operation')" :width="150">
              <template #cell="{ record }">
                <a-button type="primary" size="small" @click="openTargetGrant(record)">
                  <template #icon><icon-user-add /></template>
                  {{ $t('mcpPermission.grantToUsers') }}
                </a-button>
              </template>
            </a-table-column>
          </template>
        </a-table>
        <a-empty v-if="filteredTargets.length === 0" :description="$t('mcpPermission.noService')" style="padding: 40px 0" />
      </a-spin>
    </a-card>

    <!-- 按服务授权：选择用户（整服务授权） -->
    <GrantTargetUsersModal
      v-model:visible="targetModalVisible"
      target-type="service"
      :target="currentTarget"
      @done="loadTargetView"
    />

    <!-- 服务授权抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :title="`${$t('mcpPermission.serviceGrant')} - ${currentUser?.nick_name || currentUser?.user_name || ''}`"
      width="1000px"
      :footer="false"
      unmount-on-close
    >
      <!-- 用户信息 -->
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

      <div class="drawer-content">
        <div class="tab-toolbar">
          <a-input
            v-model="serviceSearch"
            :placeholder="$t('mcpPermission.searchService')"
            allow-clear
            style="width: 260px"
          >
            <template #prefix><icon-search /></template>
          </a-input>
        </div>

        <div class="table-wrapper">
          <a-spin :loading="serviceLoading" dot>
            <a-table
              :data="filteredServices"
              :pagination="false"
              row-key="name"
              size="small"
              table-layout="fixed"
              :expanded-keys="serviceExpandedKeys"
              @expanded-change="handleServiceExpandedChange"
            >
              <template #columns>
                <a-table-column :title="$t('mcpPermission.methodName')" data-index="name" :width="180" :ellipsis="true" />
                <a-table-column title="Title" data-index="title" :width="160" :ellipsis="true" />
                <a-table-column title="Service Type" data-index="serviceType" :width="120" :ellipsis="true" />
                <a-table-column :title="$t('commonTable.serviceUrl')" data-index="server_url" :width="160" :ellipsis="true" />
                <a-table-column :title="$t('mcpPermission.grantedTotal')" :width="130">
                  <template #cell="{ record }">
                    <a-tag :color="record.grantedCount > 0 ? 'green' : 'gray'">
                      {{ record.grantedCount }}/{{ record.totalCount }}
                    </a-tag>
                  </template>
                </a-table-column>
                <a-table-column :title="$t('mcpPermission.operation')" :width="170">
                  <template #cell="{ record }">
                    <a-space size="mini" wrap>
                      <a-button
                        type="text"
                        size="small"
                        :type="serviceExpandedKeys.includes(record.name) ? 'primary' : 'text'"
                        @click="handleToggleServiceExpand(record)"
                      >
                        {{ $t('mcpPermission.viewMethod') }}
                      </a-button>
                      <a-button
                        type="primary"
                        size="small"
                        :disabled="record.totalCount === 0 || record.grantedCount === record.totalCount"
                        @click="handleGrantAllService(record)"
                      >
                        {{ $t('mcpPermission.grantAll') }}
                      </a-button>
                      <a-button
                        size="small"
                        status="warning"
                        :disabled="record.grantedCount === 0"
                        @click="handleRevokeAllService(record)"
                      >
                        {{ $t('mcpPermission.revokeAll') }}
                      </a-button>
                    </a-space>
                  </template>
                </a-table-column>
              </template>
              <!-- 展开行：方法详情 -->
              <template #expand-row="{ record }">
                <div class="expanded-methods">
                  <a-table
                    :data="record.methodList || []"
                    :pagination="false"
                    size="small"
                    row-key="name"
                    table-layout="fixed"
                  >
                    <template #columns>
                      <a-table-column :title="$t('mcpPermission.methodName')" data-index="name" :width="140" />
                      <a-table-column :title="$t('mcpPermission.methodKey')" data-index="name" :width="160" :ellipsis="true" />
                      <a-table-column :title="$t('mcpPermission.riskLevel')" :width="90">
                        <template #cell="{ record: method }">
                          <a-tag v-if="riskLevelMap[method.risk_level]" :color="riskLevelMap[method.risk_level].color" size="small">
                            {{ riskLevelMap[method.risk_level].label }}
                          </a-tag>
                          <span v-else>-</span>
                        </template>
                      </a-table-column>
                      <a-table-column :title="$t('mcpPermission.grantStatus')" :width="80">
                        <template #cell="{ record: method }">
                          <a-tag :color="method._granted ? 'green' : 'gray'" size="small">
                            {{ method._granted ? $t('mcpPermission.granted') : $t('mcpPermission.notGranted') }}
                          </a-tag>
                        </template>
                      </a-table-column>
                      <a-table-column :title="$t('mcpPermission.validPeriod')" :width="180" :ellipsis="true">
                        <template #cell="{ record: method }">
                          <span v-if="method._granted && (method._grantStartedTime || method._grantExpiredTime)" style="font-size:12px">
                            {{ formatGrantTime(method._grantStartedTime) }}~{{ formatGrantTime(method._grantExpiredTime) }}
                          </span>
                          <span v-else>-</span>
                        </template>
                      </a-table-column>
                      <a-table-column :title="$t('mcpPermission.operation')" :width="80">
                        <template #cell="{ record: method }">
                          <template v-if="method._granted">
                            <a-button type="text" size="small" status="danger" @click="handleRevokeSingleMethod(record, method)">{{ $t('mcpPermission.revoke') }}</a-button>
                          </template>
                          <template v-else>
                            <a-button type="text" size="small" status="success" @click="handleGrantSingleMethod(record, method)">{{ $t('mcpPermission.grant') }}</a-button>
                          </template>
                        </template>
                      </a-table-column>
                    </template>
                  </a-table>
                </div>
              </template>
            </a-table>
            <a-empty v-if="filteredServices.length === 0" :description="$t('mcpPermission.noService')" style="padding: 40px 0" />
          </a-spin>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
// MCP 服务类授权（原「MCP权限管理」的服务 Tab 独立成页）
// 两个视角：按用户授权（默认）、按服务授权（选插件 → 给多个用户整服务授权）
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'
import { RISK_LEVEL_MAP } from '@/constants/riskLevel'
import {
  AGENT_ID_DEFAULT,
  OUT_AGENT_ID_DEFAULT
} from '@/api/modules/gisGrant'
import GrantUserTable from '../components/GrantUserTable.vue'
import GrantTargetUsersModal from '../components/GrantTargetUsersModal.vue'
import { useGrantShared } from '../composables/useGrantShared'

const { t } = useI18n()
const riskLevelMap = RISK_LEVEL_MAP

const {
  drawerVisible,
  currentUser,
  userGrants,
  operator,
  openDrawer,
  fetchUserGrants,
  formatGrantTime
} = useGrantShared()

const serviceLoading = ref(false)
const serviceList = ref([])
const serviceSearch = ref('')
const serviceExpandedKeys = ref([])

// ========== 视角切换（按用户 / 按服务） ==========
const viewMode = ref('byUser')
const targetLoading = ref(false)
const targetSearch = ref('')
const targetModalVisible = ref(false)
const currentTarget = ref(null)

const filteredTargets = computed(() => {
  if (!targetSearch.value) return serviceList.value
  const kw = targetSearch.value.toLowerCase()
  return serviceList.value.filter(
    s => (s.title || s.name || '').toLowerCase().includes(kw)
  )
})

const filteredServices = computed(() => {
  if (!serviceSearch.value) return serviceList.value
  const kw = serviceSearch.value.toLowerCase()
  return serviceList.value.filter(
    s => (s.title || s.name || '').toLowerCase().includes(kw)
  )
})

// 按服务授权视角：插件列表（含方法数）+ 每个插件的已授权用户数
async function loadTargetView() {
  targetLoading.value = true
  try {
    await fetchServiceList()
    await fetchGrantedUserCounts()
  } finally {
    targetLoading.value = false
  }
}

// 已授权用户数：一次拉全部服务类生效授权，按插件名去重统计用户
async function fetchGrantedUserCounts() {
  try {
    const res = await api.gisGrant.getGrantList({
      grant_type: 'service',
      grant_sta: '1',
      page: 1,
      page_size: 1000,
      order_by: 'grant_id',
      is_asc: true
    })
    const data = res?.data || res || {}
    const userSets = {}
    ;(data.rows || []).forEach(g => {
      // 服务类的对象名：target_name 与 eqp_name 均为插件名，取其一即可
      const key = g.target_name || g.eqp_name
      if (!key) return
      if (!userSets[key]) userSets[key] = new Set()
      userSets[key].add(g.gis_user_id)
    })
    serviceList.value.forEach(plugin => {
      const set = userSets[plugin.name]
      plugin.grantedUserCount = set ? set.size : 0
    })
  } catch (e) {
    // 已授权用户数属辅助信息，取不到不影响授权操作，静默
    serviceList.value.forEach(plugin => {
      plugin.grantedUserCount = plugin.grantedUserCount || 0
    })
  }
}

function openTargetGrant(record) {
  currentTarget.value = record
  targetModalVisible.value = true
}

watch(viewMode, (val) => {
  if (val === 'byTarget') loadTargetView()
})

// 打开抽屉：先取授权记录，再加载插件方法（服务列表到位后才能标记授权状态）
async function openGrantDrawer(user) {
  openDrawer(user)
  serviceSearch.value = ''
  serviceExpandedKeys.value = []
  await fetchUserGrants('service')
  await fetchServiceList()
  markServiceGrant()
}

// 标记插件与插件方法的授权状态
// 后端不存在通配行：整服务授权就是「每个方法一行」，fun_key 都是真实方法名，
// 所以已授权数按授权行数直接计；每个方法的已授权状态按 fun_key 匹配。
// 服务类 eqp_name 落库已统一为插件名（与 target_name 一致），不再比对 Title
function markServiceGrant() {
  const grants = userGrants.value

  serviceList.value.forEach(plugin => {
    const serviceGrants = grants.filter(
      g => g.eqp_name === plugin.name || g.target_name === plugin.name
    )
    plugin.grantedCount = serviceGrants.length
    if (plugin.methodList) {
      plugin.methodList.forEach(method => {
        const grant = serviceGrants.find(g => g.fun_key === method.name)
        method._granted = !!grant
        method._grantId = grant?.grant_id
        method._grantStartedTime = grant?.grant_started_time || null
        method._grantExpiredTime = grant?.grant_expired_time || null
      })
    }
  })
}

// 授权变更后：重新拉取授权记录并刷新授权状态
async function refreshGrantState() {
  await fetchUserGrants('service')
  markServiceGrant()
}

// 插件列表（含每个插件的方法列表）；是否标记授权状态由调用方决定
async function fetchServiceList() {
  serviceLoading.value = true
  try {
    const res = await api.pluginService.getServiceList()
    const rawList = res?.data || res || []
    const plugins = Array.isArray(rawList) ? rawList.filter(p => p && (p.name || p.manifest?.name)) : []

    serviceList.value = await Promise.all(
      plugins.map(async plugin => {
        const pluginName = plugin.manifest?.name || plugin.name
        const detailRes = await api.pluginService.getServiceDetail(pluginName)
          .catch(() => ({ data: { methods: [], manifest: {}, info: {} } }))
        const detail = detailRes?.data || detailRes || {}
        const manifest = detail.manifest || {}
        const info = detail.info || {}
        const methodList = detail.methods || []
        const serverUrl = manifest.serverUrl || ''
        return {
          ...plugin,
          name: manifest.name || plugin.name,
          title: info.title || plugin.title || '',
          serviceType: manifest.serviceType || '',
          server_url: serverUrl,
          methodList,
          totalCount: methodList.length,
          grantedCount: 0
        }
      })
    )
  } catch (e) {
    Message.error(t('mcpPermission.fetchServiceFailed'))
  } finally {
    serviceLoading.value = false
  }
}

function handleServiceExpandedChange(keys) {
  serviceExpandedKeys.value = keys
}

function handleToggleServiceExpand(record) {
  const key = record.name
  const idx = serviceExpandedKeys.value.indexOf(key)
  if (idx >= 0) {
    serviceExpandedKeys.value.splice(idx, 1)
  } else {
    serviceExpandedKeys.value.push(key)
  }
}

// 服务 - 全部授权
async function handleGrantAllService(plugin) {
  const op = operator.value
  const serverUrl = plugin.server_url
  if (!serverUrl) {
    Message.warning(t('mcpPermission.noServiceUrl'))
    return
  }
  Modal.confirm({
    title: t('mcpPermission.confirmGrantAllTitle'),
    content: t('mcpPermission.confirmGrantAllService'),
    okText: t('mcpPermission.confirmGrant'),
    cancelText: t('commonTable.cancel'),
    onOk: async () => {
      try {
        await api.gisGrant.grantAll({
          gis_user_id: currentUser.value.user_id,
          gis_agent_id: AGENT_ID_DEFAULT,
          out_agent_id: OUT_AGENT_ID_DEFAULT,
          grant_type: 'service',
          // 对象名：service 必填插件名（57 §三#4）；eqp_client_id 落库一律空串
          target_name: plugin.name,
          eqp_id: 0,
          eqp_name: plugin.name,
          eqp_client_id: '',
          eqp_fun_id: 0,
          fun_key: '*',
          grant_user_id: op.id,
          // grant_user_role 已移除（65 文档 §6.1）：不再作为入参，后端按登录人实时查 RBAC
          created_by: op.name,
          updated_by: op.name
        })
        Message.success(t('mcpPermission.batchGrantSuccess'))
        await refreshGrantState()
      } catch (e) {
        Message.error(e?.msg || t('mcpPermission.batchGrantFailed'))
      }
    }
  })
}

// 服务 - 全部取消
// 不再要求插件配了服务地址：eqp_client_id 已不参与服务侧匹配，
// 撤销只认「该用户 + 插件名（target_name）」
async function handleRevokeAllService(plugin) {
  const op = operator.value
  Modal.confirm({
    title: t('mcpPermission.confirmRevokeAllTitle'),
    content: t('mcpPermission.confirmRevokeAllService'),
    okText: t('mcpPermission.confirmCancel'),
    cancelText: t('commonTable.cancel'),
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await api.gisGrant.revokeAll({
          // 撤销范围只认「该用户 + 该对象」，gis_user_id 必传
          gis_user_id: currentUser.value.user_id,
          grant_type: 'service',
          target_name: plugin.name,
          eqp_id: 0,
          updated_by: op.name
        })
        Message.success(t('mcpPermission.batchRevokeSuccess'))
        await refreshGrantState()
      } catch (e) {
        Message.error(e?.msg || t('mcpPermission.batchRevokeFailed'))
      }
    }
  })
}

// 服务 - 单个方法授权
async function handleGrantSingleMethod(plugin, method) {
  const op = operator.value
  const funKey = method.name || method.method_name || method.fun_key || ''
  if (!funKey) {
    Message.warning(t('mcpPermission.noFunKey'))
    return
  }
  const serverUrl = plugin.server_url
  if (!serverUrl) {
    Message.warning(t('mcpPermission.noServiceUrl'))
    return
  }
  try {
    await api.gisGrant.createGrant({
      gis_user_id: currentUser.value.user_id,
      gis_agent_id: AGENT_ID_DEFAULT,
      out_agent_id: OUT_AGENT_ID_DEFAULT,
      grant_type: 'service',
      // 对象名：service 必填插件名（57 §三#3）；eqp_client_id 落库一律空串
      target_name: plugin.name,
      eqp_id: 0,
      eqp_name: plugin.name,
      eqp_client_id: '',
      eqp_fun_id: 0,
      fun_key: funKey,
      grant_user_id: op.id,
      // grant_user_role 已移除（65 文档 §6.1）：不再作为入参，后端按登录人实时查 RBAC
      created_by: op.name,
      updated_by: op.name
    })
    Message.success(t('mcpPermission.grantSuccess'))
    await refreshGrantState()
  } catch (e) {
    Message.error(e?.msg || t('mcpPermission.grantFailed'))
  }
}

// 服务 - 单个方法取消
async function handleRevokeSingleMethod(plugin, method) {
  const op = operator.value
  try {
    await api.gisGrant.revokeGrant(method._grantId, { updated_by: op.name })
    Message.success(t('mcpPermission.revokeSuccess'))
    await refreshGrantState()
  } catch (e) {
    Message.error(e?.msg || t('mcpPermission.revokeFailed'))
  }
}
</script>

<style scoped>
.mcp-grant-page {
  padding: 0;
}

.view-switch {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.user-info-bar {
  padding: 12px 16px;
  background: var(--color-fill-2);
  border-radius: 6px;
}

.user-info-bar .label {
  color: var(--color-text-3);
  margin-right: 4px;
}

.tab-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: 16px 0;
}

.drawer-content {
  width: 90%;
  margin: 0 auto;
  overflow: hidden;
}

.drawer-content .table-wrapper {
  width: 100%;
  overflow: hidden;
  border-radius: 4px;
}

.expanded-methods {
  padding: 12px 16px;
  background: var(--color-fill-2);
  border-top: 1px solid var(--color-border-2);
}
</style>
