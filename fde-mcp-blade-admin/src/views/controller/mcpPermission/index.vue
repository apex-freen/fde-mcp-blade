<template>
  <div class="mcp-permission-page">
    <!-- 用户搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="user_name" :label="$t('mcpPermission.username')">
          <a-input
            v-model="searchForm.user_name"
            :placeholder="$t('mcpPermission.usernamePlaceholder')"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item field="nick_name" :label="$t('mcpPermission.nickname')">
          <a-input
            v-model="searchForm.nick_name"
            :placeholder="$t('mcpPermission.nicknamePlaceholder')"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item field="status" :label="$t('mcpPermission.status')">
          <a-select
            v-model="searchForm.status"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
          >
            <a-option value="0">{{ $t('commonTable.normal') }}</a-option>
            <a-option value="1">{{ $t('commonTable.disabled') }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ $t('commonTable.search') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('commonTable.reset') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 用户表格 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-table
        :columns="userColumns"
        :data="userTableData"
        :loading="userLoading"
        :pagination="userPagination"
        row-key="user_id"
        @page-change="handleUserPageChange"
        @page-size-change="handleUserPageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('mcpPermission.username')" data-index="user_name" :width="140" />
          <a-table-column :title="$t('mcpPermission.nickname')" data-index="nick_name" :width="140" />
          <a-table-column :title="$t('mcpPermission.coreRole')" data-index="group_name" :width="120" />
          <a-table-column :title="$t('mcpPermission.status')" data-index="status" :width="100">
            <template #cell="{ record }">
              <a-tag :color="record.status === '0' ? 'green' : 'red'">
                {{ record.status === '0' ? $t('commonTable.normal') : $t('commonTable.disabled') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('mcpPermission.createTime')" data-index="created_time" :width="180">
            <template #cell="{ record }">
              {{ record.created_time ? record.created_time.replace('T', ' ').split('+')[0] : '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="160" fixed="right">
            <template #cell="{ record }">
              <a-button
                type="primary"
                size="small"
                :disabled="record.status === '1'"
                @click="openGrantDrawer(record)"
              >
                <template #icon><icon-safe /></template>
                {{ $t('mcpPermission.mcpGrant') }}
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- MCP 授权抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      :title="`${$t('mcpPermission.mcpGrant')} - ${currentUser?.nick_name || currentUser?.user_name || ''}`"
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

      <!-- Tab 切换 -->
      <div class="drawer-content">
      <a-tabs v-model:active-key="activeTab" style="margin-top: 16px">
        <!-- 设备授权 -->
        <a-tab-pane key="device" :title="$t('mcpPermission.deviceGrant')">
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
        </a-tab-pane>
        <a-tab-pane key="service" :title="$t('mcpPermission.serviceGrant')">
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
        </a-tab-pane>
      </a-tabs>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'
import {
  RISK_LEVEL_OPTIONS,
  RISK_LEVEL_MAP
} from '@/constants/riskLevel'
import {
  AGENT_ID_DEFAULT,
  OUT_AGENT_ID_DEFAULT
} from '@/api/modules/mcpPermission'

const { t } = useI18n()
const userStore = useUserStore()
const riskLevelMap = RISK_LEVEL_MAP

// ========== 用户列表 ==========
const userLoading = ref(false)
const userTableData = ref([])
const userPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})
const searchForm = reactive({
  user_name: '',
  nick_name: '',
  status: ''
})

const userColumns = []

async function fetchUserList() {
  userLoading.value = true
  try {
    const res = await api.gisUser.getGisUserList({
      ...searchForm,
      page: userPagination.current,
      page_size: userPagination.pageSize,
      order_by: 'user_id',
      is_asc: true
    })
    const data = res?.data || res || {}
    userTableData.value = data.rows || []
    userPagination.total = data.total || 0
  } catch (e) {
    Message.error(t('mcpPermission.fetchUserFailed'))
  } finally {
    userLoading.value = false
  }
}

function handleSearch() {
  userPagination.current = 1
  fetchUserList()
}

function handleReset() {
  searchForm.user_name = ''
  searchForm.nick_name = ''
  searchForm.status = ''
  userPagination.current = 1
  fetchUserList()
}

function handleUserPageChange(page) {
  userPagination.current = page
  fetchUserList()
}

function handleUserPageSizeChange(size) {
  userPagination.pageSize = size
  userPagination.current = 1
  fetchUserList()
}

// ========== 授权抽屉 ==========
const drawerVisible = ref(false)
const currentUser = ref(null)
const activeTab = ref('device')

// 设备相关
const deviceLoading = ref(false)
const deviceList = ref([])
const deviceSearch = ref('')
const deviceExpandedKeys = ref([])

// 服务相关
const serviceLoading = ref(false)
const serviceList = ref([])
const serviceSearch = ref('')
const serviceExpandedKeys = ref([])

// 用户已有的授权记录（grant_id 映射）
const userGrants = ref([])

const filteredDevices = computed(() => {
  if (!deviceSearch.value) return deviceList.value
  const kw = deviceSearch.value.toLowerCase()
  return deviceList.value.filter(
    d => d.eqp_name.toLowerCase().includes(kw) || d.eqp_client_id.toLowerCase().includes(kw)
  )
})

const filteredServices = computed(() => {
  if (!serviceSearch.value) return serviceList.value
  const kw = serviceSearch.value.toLowerCase()
  return serviceList.value.filter(
    s => (s.title || s.name || '').toLowerCase().includes(kw)
  )
})

// 获取当前登录用户信息（作为操作人）
function getOperator() {
  const info = userStore.userInfo || {}
  return {
    id: info.userId || info.user_id || 1,
    name: info.userName || info.user_name || info.nickName || 'admin'
  }
}

// 打开授权抽屉
async function openGrantDrawer(user) {
  currentUser.value = user
  drawerVisible.value = true
  activeTab.value = 'device'
  deviceSearch.value = ''
  serviceSearch.value = ''

  // 并行加载设备列表和授权列表
  await Promise.all([
    fetchDeviceList(),
    fetchServiceList(),
    fetchUserGrants()
  ])
}

// 获取该用户的所有授权记录
async function fetchUserGrants() {
  try {
    const res = await api.mcpPermission.getGrantList({
      gis_user_id: currentUser.value.user_id,
      page: 1,
      page_size: 1000,
      order_by: 'grant_id',
      is_asc: true
    })
    const data = res?.data || res || {}
    userGrants.value = data.rows || []
    // 标记设备/服务的已授权状态
    markGrantStatus()
  } catch (e) {
    console.error(t('mcpPermission.fetchGrantFailed'), e)
  }
}

// 标记设备和服务的授权状态
function markGrantStatus() {
  const grants = userGrants.value

  // 设备授权统计
  deviceList.value.forEach(device => {
    const deviceGrants = grants.filter(
      g => g.grant_type === 'device' && g.eqp_id === device.eqp_id && g.grant_sta === '1'
    )
    device.grantedCount = deviceGrants.length
    // 标记功能列表的授权状态
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

  // 服务授权统计
  serviceList.value.forEach(plugin => {
    const serviceGrants = grants.filter(
      g => g.grant_type === 'service' &&
        (g.eqp_name === plugin.name || g.eqp_name === plugin.title) &&
        g.grant_sta === '1'
    )
    plugin.grantedCount = serviceGrants.length
    // 标记方法列表的授权状态
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

// ========== 设备列表 ==========
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

    // 为每个设备获取功能列表
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
    markGrantStatus()
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

// ========== 服务列表 ==========
async function fetchServiceList() {
  serviceLoading.value = true
  try {
    const res = await api.pluginService.getServiceList()
    const rawList = res?.data || res || []
    const plugins = Array.isArray(rawList) ? rawList.filter(p => p && (p.name || p.manifest?.name)) : []

    // 为每个插件获取方法列表
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
    markGrantStatus()
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

// 格式化授权时间（null 显示为 "永久"）
function formatGrantTime(time) {
  if (!time) return t('mcpPermission.permanent')
  const d = new Date(time)
  if (isNaN(d.getTime())) return '-'
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ========== 授权操作 ==========

// 设备 - 全部授权
async function handleGrantAllDevice(device) {
  const op = getOperator()
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
        await fetchUserGrants()
      } catch (e) {
        Message.error(e?.msg || t('mcpPermission.batchGrantFailed'))
      }
    }
  })
}

// 设备 - 全部取消
async function handleRevokeAllDevice(device) {
  const op = getOperator()
  Modal.confirm({
    title: t('mcpPermission.confirmRevokeAllTitle'),
    content: t('mcpPermission.confirmRevokeAllDevice'),
    okText: t('mcpPermission.confirmCancel'),
    cancelText: t('commonTable.cancel'),
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await api.mcpPermission.revokeAll({
          // 2026-09-17 契约：撤销范围只认「该用户 + 该对象」，gis_user_id 必传
          gis_user_id: currentUser.value.user_id,
          grant_type: 'device',
          eqp_id: device.eqp_id,
          eqp_client_id: device.eqp_client_id,
          updated_by: op.name
        })
        Message.success(t('mcpPermission.batchRevokeSuccess'))
        await fetchUserGrants()
      } catch (e) {
        Message.error(e?.msg || t('mcpPermission.batchRevokeFailed'))
      }
    }
  })
}

// 设备 - 单个功能授权
async function handleGrantSingleFun(device, fun) {
  const op = getOperator()
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
    await fetchUserGrants()
  } catch (e) {
    Message.error(e?.msg || t('mcpPermission.grantFailed'))
  }
}

// 设备 - 单个功能取消
async function handleRevokeSingleFun(device, fun) {
  const op = getOperator()
  try {
    await api.mcpPermission.revokeGrant(fun._grantId, op.name)
    Message.success(t('mcpPermission.revokeSuccess'))
    await fetchUserGrants()
  } catch (e) {
    Message.error(e?.msg || t('mcpPermission.revokeFailed'))
  }
}

// 服务 - 全部授权
async function handleGrantAllService(plugin) {
  const op = getOperator()
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
        await api.mcpPermission.grantAll({
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
        await fetchUserGrants()
      } catch (e) {
        Message.error(e?.msg || t('mcpPermission.batchGrantFailed'))
      }
    }
  })
}

// 服务 - 全部取消
// 不再要求插件配了服务地址：eqp_client_id 已不参与服务侧匹配
async function handleRevokeAllService(plugin) {
  const op = getOperator()
  Modal.confirm({
    title: t('mcpPermission.confirmRevokeAllTitle'),
    content: t('mcpPermission.confirmRevokeAllService'),
    okText: t('mcpPermission.confirmCancel'),
    cancelText: t('commonTable.cancel'),
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await api.mcpPermission.revokeAll({
          // 2026-09-17 契约：撤销只认「该用户 + 插件名（target_name）」，
          // eqp_client_id 已不参与服务侧匹配
          gis_user_id: currentUser.value.user_id,
          grant_type: 'service',
          eqp_id: 0,
          target_name: plugin.name,
          updated_by: op.name
        })
        Message.success(t('mcpPermission.batchRevokeSuccess'))
        await fetchUserGrants()
      } catch (e) {
        Message.error(e?.msg || t('mcpPermission.batchRevokeFailed'))
      }
    }
  })
}

// 服务 - 单个方法授权
async function handleGrantSingleMethod(plugin, method) {
  const op = getOperator()
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
    await api.mcpPermission.createGrant({
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
    await fetchUserGrants()
  } catch (e) {
    Message.error(e?.msg || t('mcpPermission.grantFailed'))
  }
}

// 服务 - 单个方法取消
async function handleRevokeSingleMethod(plugin, method) {
  const op = getOperator()
  try {
    await api.mcpPermission.revokeGrant(method._grantId, op.name)
    Message.success(t('mcpPermission.revokeSuccess'))
    await fetchUserGrants()
  } catch (e) {
    Message.error(e?.msg || t('mcpPermission.revokeFailed'))
  }
}

// 初始化
fetchUserList()
</script>

<style scoped>
.mcp-permission-page {
  padding: 0;
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
  margin-bottom: 16px;
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
