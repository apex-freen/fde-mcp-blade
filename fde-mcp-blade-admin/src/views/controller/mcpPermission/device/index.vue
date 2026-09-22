<template>
  <div class="mcp-grant-page">
    <!-- 视角切换：按用户授权（默认）/ 按设备授权 -->
    <div class="view-switch">
      <a-radio-group v-model="viewMode" type="button" size="small">
        <a-radio value="byUser">{{ $t('mcpPermission.viewByUser') }}</a-radio>
        <a-radio value="byTarget">{{ $t('mcpPermission.viewByDevice') }}</a-radio>
      </a-radio-group>
    </div>

    <!-- 按用户授权：选中用户后进入设备授权抽屉 -->
    <GrantUserTable
      v-if="viewMode === 'byUser'"
      :action-text="$t('mcpPermission.deviceGrant')"
      @grant="openGrantDrawer"
    />

    <!-- 按设备授权：先选设备，再给多个用户一次授权 -->
    <a-card v-else :bordered="false" style="margin-top: 16px">
      <div class="tab-toolbar">
        <a-input
          v-model="targetSearch"
          :placeholder="$t('mcpPermission.searchDevice')"
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
          row-key="eqp_id"
          size="small"
          table-layout="fixed"
        >
          <template #columns>
            <a-table-column :title="$t('mcpPermission.deviceName')" data-index="eqp_name" :width="200" />
            <a-table-column :title="$t('mcpPermission.ip')" data-index="eqp_client_id" :width="240" :ellipsis="true" />
            <a-table-column :title="$t('mcpPermission.funCount')" :width="100">
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
        <a-empty v-if="filteredTargets.length === 0" :description="$t('mcpPermission.noDevice')" style="padding: 40px 0" />
      </a-spin>
    </a-card>

    <!-- 按设备授权：选择用户（整机授权） -->
    <GrantTargetUsersModal
      v-model:visible="targetModalVisible"
      target-type="device"
      :target="currentTarget"
      @done="loadTargetView"
    />

    <!-- 设备授权抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :title="`${$t('mcpPermission.deviceGrant')} - ${currentUser?.nick_name || currentUser?.user_name || ''}`"
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
            v-model="deviceSearch"
            :placeholder="$t('mcpPermission.searchDevice')"
            allow-clear
            style="width: 260px"
          >
            <template #prefix><icon-search /></template>
          </a-input>
        </div>

        <div class="table-wrapper">
          <a-spin :loading="deviceLoading" dot>
            <a-table
              :data="filteredDevices"
              :pagination="false"
              row-key="eqp_id"
              size="small"
              table-layout="fixed"
              :expanded-keys="deviceExpandedKeys"
              @expanded-change="handleDeviceExpandedChange"
            >
              <template #columns>
                <a-table-column :title="$t('mcpPermission.deviceName')" data-index="eqp_name" :width="200" />
                <a-table-column :title="$t('mcpPermission.ip')" data-index="eqp_client_id" :width="240" :ellipsis="true" />
                <a-table-column :title="$t('mcpPermission.grantedTotal')" :width="130">
                  <template #cell="{ record }">
                    <a-tag :color="record.grantedCount > 0 ? 'green' : 'gray'">
                      {{ record.grantedCount }}/{{ record.totalCount }}
                    </a-tag>
                  </template>
                </a-table-column>
                <a-table-column :title="$t('mcpPermission.operation')" :width="330">
                  <template #cell="{ record }">
                    <a-space size="mini" wrap>
                      <a-button
                        type="text"
                        size="small"
                        :type="deviceExpandedKeys.includes(record.eqp_id) ? 'primary' : 'text'"
                        @click="handleToggleDeviceExpand(record)"
                      >
                        {{ $t('mcpPermission.viewFun') }}
                      </a-button>
                      <a-button
                        type="primary"
                        size="small"
                        :disabled="record.totalCount === 0 || record.grantedCount === record.totalCount"
                        @click="handleGrantAllDevice(record)"
                      >
                        {{ $t('mcpPermission.grantAll') }}
                      </a-button>
                      <a-button
                        size="small"
                        status="warning"
                        :disabled="record.grantedCount === 0"
                        @click="handleRevokeAllDevice(record)"
                      >
                        {{ $t('mcpPermission.revokeAll') }}
                      </a-button>
                    </a-space>
                  </template>
                </a-table-column>
              </template>
              <!-- 展开行：功能详情 -->
              <template #expand-row="{ record }">
                <div class="expanded-methods">
                  <a-table
                    :data="record.funList || []"
                    :pagination="false"
                    size="small"
                    row-key="eqp_fun_id"
                    table-layout="fixed"
                  >
                    <template #columns>
                      <a-table-column :title="$t('mcpPermission.funName')" data-index="fun_name" :width="140" />
                      <a-table-column :title="$t('mcpPermission.funKey')" data-index="fun_key" :width="160" :ellipsis="true" />
                      <a-table-column :title="$t('mcpPermission.riskLevel')" :width="90">
                        <template #cell="{ record: fun }">
                          <a-tag v-if="riskLevelMap[fun.risk_level]" :color="riskLevelMap[fun.risk_level].color" size="small">
                            {{ riskLevelMap[fun.risk_level].label }}
                          </a-tag>
                          <span v-else>-</span>
                        </template>
                      </a-table-column>
                      <a-table-column :title="$t('mcpPermission.grantStatus')" :width="80">
                        <template #cell="{ record: fun }">
                          <a-tag :color="fun._granted ? 'green' : 'gray'" size="small">
                            {{ fun._granted ? $t('mcpPermission.granted') : $t('mcpPermission.notGranted') }}
                          </a-tag>
                        </template>
                      </a-table-column>
                      <a-table-column :title="$t('mcpPermission.validPeriod')" :width="180" :ellipsis="true">
                        <template #cell="{ record: fun }">
                          <span v-if="fun._granted && (fun._grantStartedTime || fun._grantExpiredTime)" style="font-size:12px">
                            {{ formatGrantTime(fun._grantStartedTime) }}~{{ formatGrantTime(fun._grantExpiredTime) }}
                          </span>
                          <span v-else>-</span>
                        </template>
                      </a-table-column>
                      <a-table-column :title="$t('mcpPermission.operation')" :width="80">
                        <template #cell="{ record: fun }">
                          <template v-if="fun._granted">
                            <a-button type="text" size="small" status="danger" @click="handleRevokeSingleFun(record, fun)">{{ $t('mcpPermission.revoke') }}</a-button>
                          </template>
                          <template v-else>
                            <a-button type="text" size="small" status="success" @click="handleGrantSingleFun(record, fun)">{{ $t('mcpPermission.grant') }}</a-button>
                          </template>
                        </template>
                      </a-table-column>
                    </template>
                  </a-table>
                </div>
              </template>
            </a-table>
            <a-empty v-if="filteredDevices.length === 0" :description="$t('mcpPermission.noDevice')" style="padding: 40px 0" />
          </a-spin>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
// MCP 设备类授权（原「MCP权限管理」的设备 Tab 独立成页）
// 两个视角：按用户授权（默认）、按设备授权（选设备 → 给多个用户整机授权）
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'
import { RISK_LEVEL_MAP } from '@/constants/riskLevel'
import {
  AGENT_ID_DEFAULT,
  OUT_AGENT_ID_DEFAULT
} from '@/api/modules/mcpPermission'
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

const deviceLoading = ref(false)
const deviceList = ref([])
const deviceSearch = ref('')
const deviceExpandedKeys = ref([])

// ========== 视角切换（按用户 / 按设备） ==========
const viewMode = ref('byUser')
const targetLoading = ref(false)
const targetSearch = ref('')
const targetModalVisible = ref(false)
const currentTarget = ref(null)

const filteredTargets = computed(() => {
  if (!targetSearch.value) return deviceList.value
  const kw = targetSearch.value.toLowerCase()
  return deviceList.value.filter(
    d => (d.eqp_name || '').toLowerCase().includes(kw) || (d.eqp_client_id || '').toLowerCase().includes(kw)
  )
})

const filteredDevices = computed(() => {
  if (!deviceSearch.value) return deviceList.value
  const kw = deviceSearch.value.toLowerCase()
  return deviceList.value.filter(
    d => d.eqp_name.toLowerCase().includes(kw) || d.eqp_client_id.toLowerCase().includes(kw)
  )
})

// 按设备授权视角：设备列表（含功能数）+ 每台设备的已授权用户数
async function loadTargetView() {
  targetLoading.value = true
  try {
    await fetchDeviceList()
    await fetchGrantedUserCounts()
  } finally {
    targetLoading.value = false
  }
}

// 已授权用户数：一次拉全部设备类生效授权，按 eqp_id 去重统计用户
async function fetchGrantedUserCounts() {
  try {
    const res = await api.mcpPermission.getGrantList({
      grant_type: 'device',
      grant_sta: '1',
      page: 1,
      page_size: 1000,
      order_by: 'grant_id',
      is_asc: true
    })
    const data = res?.data || res || {}
    const userSets = {}
    ;(data.rows || []).forEach(g => {
      if (!userSets[g.eqp_id]) userSets[g.eqp_id] = new Set()
      userSets[g.eqp_id].add(g.gis_user_id)
    })
    deviceList.value.forEach(device => {
      const set = userSets[device.eqp_id]
      device.grantedUserCount = set ? set.size : 0
    })
  } catch (e) {
    // 已授权用户数属辅助信息，取不到不影响授权操作，静默
    deviceList.value.forEach(device => {
      device.grantedUserCount = device.grantedUserCount || 0
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

// 打开抽屉：先取授权记录，再加载设备（设备列表到位后才能标记授权状态）
async function openGrantDrawer(user) {
  openDrawer(user)
  deviceSearch.value = ''
  deviceExpandedKeys.value = []
  await fetchUserGrants('device')
  await fetchDeviceList()
  markDeviceGrant()
}

// 标记设备与设备功能的授权状态
// 后端不存在通配行：整机授权就是「每个功能一行」，fun_key 都是真实功能键，
// 所以已授权数按授权行数直接计；每个功能的已授权状态按 eqp_fun_id 匹配
function markDeviceGrant() {
  const grants = userGrants.value

  deviceList.value.forEach(device => {
    const deviceGrants = grants.filter(g => g.eqp_id === device.eqp_id)
    device.grantedCount = deviceGrants.length
    if (device.funList) {
      device.funList.forEach(fun => {
        const grant = deviceGrants.find(g => g.eqp_fun_id === fun.eqp_fun_id)
        fun._granted = !!grant
        fun._grantId = grant?.grant_id
        fun._grantStartedTime = grant?.grant_started_time || null
        fun._grantExpiredTime = grant?.grant_expired_time || null
      })
    }
  })
}

// 授权变更后：重新拉取授权记录并刷新授权状态
async function refreshGrantState() {
  await fetchUserGrants('device')
  markDeviceGrant()
}

// 设备列表（含每个设备的功能列表）；是否标记授权状态由调用方决定
async function fetchDeviceList() {
  deviceLoading.value = true
  try {
    const res = await api.gisEqp.getGisEqpList({
      page: 1,
      page_size: 100,
      order_by: 'eqp_id',
      is_asc: true
    })
    const data = res?.data || res || {}
    const devices = data.rows || []

    deviceList.value = await Promise.all(
      devices.map(async device => {
        const funRes = await api.gisEqp.getEqpFunList({
          eqp_id: device.eqp_id,
          page: 1,
          page_size: 100,
          order_by: 'eqp_fun_id',
          is_asc: true
        }).catch(() => ({ data: { rows: [] } }))
        const funData = funRes?.data || funRes || {}
        const funList = funData.rows || []
        return {
          ...device,
          funList,
          totalCount: funList.length,
          grantedCount: 0
        }
      })
    )
  } catch (e) {
    Message.error(t('mcpPermission.fetchDeviceFailed'))
  } finally {
    deviceLoading.value = false
  }
}

function handleDeviceExpandedChange(keys) {
  deviceExpandedKeys.value = keys
}

function handleToggleDeviceExpand(record) {
  const key = record.eqp_id
  const idx = deviceExpandedKeys.value.indexOf(key)
  if (idx >= 0) {
    deviceExpandedKeys.value.splice(idx, 1)
  } else {
    deviceExpandedKeys.value.push(key)
  }
}

// 设备 - 全部授权
async function handleGrantAllDevice(device) {
  const op = operator.value
  Modal.confirm({
    title: t('mcpPermission.confirmGrantAllTitle'),
    content: t('mcpPermission.confirmGrantAllDevice'),
    okText: t('mcpPermission.confirmGrant'),
    cancelText: t('commonTable.cancel'),
    onOk: async () => {
      try {
        await api.mcpPermission.grantAll({
          gis_user_id: currentUser.value.user_id,
          gis_agent_id: AGENT_ID_DEFAULT,
          out_agent_id: OUT_AGENT_ID_DEFAULT,
          grant_type: 'device',
          eqp_id: device.eqp_id,
          eqp_name: device.eqp_name,
          eqp_client_id: device.eqp_client_id,
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

// 设备 - 全部取消
async function handleRevokeAllDevice(device) {
  const op = operator.value
  Modal.confirm({
    title: t('mcpPermission.confirmRevokeAllTitle'),
    content: t('mcpPermission.confirmRevokeAllDevice'),
    okText: t('mcpPermission.confirmCancel'),
    cancelText: t('commonTable.cancel'),
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await api.mcpPermission.revokeAll({
          // 撤销范围只认「该用户 + 该对象」，gis_user_id 必传
          gis_user_id: currentUser.value.user_id,
          grant_type: 'device',
          eqp_id: device.eqp_id,
          eqp_client_id: device.eqp_client_id,
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

// 设备 - 单个功能授权
async function handleGrantSingleFun(device, fun) {
  const op = operator.value
  try {
    await api.mcpPermission.createGrant({
      gis_user_id: currentUser.value.user_id,
      gis_agent_id: AGENT_ID_DEFAULT,
      out_agent_id: OUT_AGENT_ID_DEFAULT,
      grant_type: 'device',
      eqp_id: device.eqp_id,
      eqp_name: device.eqp_name,
      eqp_client_id: device.eqp_client_id,
      eqp_fun_id: fun.eqp_fun_id,
      fun_key: fun.fun_key,
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

// 设备 - 单个功能取消
async function handleRevokeSingleFun(device, fun) {
  const op = operator.value
  try {
    await api.mcpPermission.revokeGrant(fun._grantId, op.name)
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
