<template>
  <div class="pre-approval-page">
    <!-- 说明 -->
    <a-alert type="info" show-icon style="margin-top: 16px">
      <div>{{ $t('preApproval.tip') }}</div>
      <div class="alert-sub">{{ $t('preApproval.scopeHint') }}</div>
    </a-alert>
    <a-alert type="warning" show-icon style="margin-top: 8px">
      {{ $t('preApproval.hitlHint') }}
    </a-alert>

    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="gis_user_id" :label="$t('preApproval.grantedUser')">
          <a-select
            v-model="searchForm.gis_user_id"
            :placeholder="$t('commonTable.all')"
            :loading="optionLoading"
            allow-search
            allow-clear
            style="width: 180px"
          >
            <a-option v-for="u in userList" :key="u.user_id" :value="u.user_id">
              {{ userLabel(u) }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="grant_type" :label="$t('preApproval.grantType')">
          <a-select
            v-model="searchForm.grant_type"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 160px"
          >
            <a-option value="service">{{ $t('preApproval.grantTypeService') }}</a-option>
            <a-option value="device">{{ $t('preApproval.grantTypeDevice') }}</a-option>
            <!-- 已隐藏：grant_type 不再有 hitl（57 文档 §四），来源改由下方 grant_source 筛选
            <a-option value="hitl">{{ $t('preApproval.grantTypeHitl') }}</a-option>
            -->
          </a-select>
        </a-form-item>
        <!-- 插件名筛选用 target_name：审批页产生的授权行没有 eqp_client_id，只能靠它筛到（57 §5.1） -->
        <a-form-item field="target_name" :label="$t('preApproval.targetName')">
          <a-input
            v-model="searchForm.target_name"
            :placeholder="$t('preApproval.targetNamePlaceholder')"
            allow-clear
            style="width: 180px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="eqp_name" :label="$t('preApproval.eqpName')">
          <a-input
            v-model="searchForm.eqp_name"
            :placeholder="$t('preApproval.eqpNamePlaceholder')"
            allow-clear
            style="width: 180px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="fun_key" :label="$t('preApproval.funKey')">
          <a-input
            v-model="searchForm.fun_key"
            :placeholder="$t('preApproval.funKeyPlaceholder')"
            allow-clear
            style="width: 180px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="grant_sta" :label="$t('preApproval.grantSta')">
          <a-select
            v-model="searchForm.grant_sta"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
          >
            <a-option value="0">{{ $t('preApproval.staNotGranted') }}</a-option>
            <a-option value="1">{{ $t('preApproval.staGranted') }}</a-option>
            <a-option value="2">{{ $t('preApproval.staRevoked') }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="grant_source" :label="$t('preApproval.grantSource')">
          <a-select
            v-model="searchForm.grant_source"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
          >
            <a-option value="manual">{{ $t('preApproval.grantSourceManual') }}</a-option>
            <a-option value="hitl">{{ $t('preApproval.grantSourceHitl') }}</a-option>
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

    <!-- 表格区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="table-toolbar">
        <a-button type="primary" @click="handleAdd">
          <template #icon><icon-plus /></template>
          {{ $t('preApproval.create') }}
        </a-button>
        <a-button :loading="loading" @click="fetchList">
          <template #icon><icon-refresh /></template>
          {{ $t('commonTable.refresh') }}
        </a-button>
      </div>

      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1820 }"
        row-key="grant_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <!-- 被授权人直接取列表出参 gis_user_name，不要靠 gis_user_id 反查（41 §12.2）：
               用户下拉走 /biz/gis_user/all 且受数据权限过滤，反查会漏人 -->
          <a-table-column :title="$t('preApproval.grantedUser')" :width="190">
            <template #cell="{ record }">
              <div class="cell-main">{{ record.gis_user_name || record.gis_user_id || '-' }}</div>
              <div v-if="contactLine(record)" class="cell-sub">{{ contactLine(record) }}</div>
            </template>
          </a-table-column>
          <a-table-column :title="$t('preApproval.grantType')" :width="130">
            <template #cell="{ record }">
              <a-tag :color="grantTypeColor(record.grant_type)" size="small">
                {{ grantTypeLabel(record.grant_type) }}
              </a-tag>
            </template>
          </a-table-column>
          <!-- 对象名：service 行取 target_name（插件名），device 行 target_name 为空则回落 eqp_name（设备名） -->
          <a-table-column :title="$t('preApproval.eqpName')" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ record.target_name || record.eqp_name || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('preApproval.eqpClientId')" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ record.eqp_client_id || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('preApproval.funKey')" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ record.fun_key || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('preApproval.grantSta')" :width="110">
            <template #cell="{ record }">
              <a-tag :color="grantStaColor(record.grant_sta)" size="small">
                {{ grantStaLabel(record.grant_sta) }}
              </a-tag>
            </template>
          </a-table-column>
          <!-- 来源：manual = 手工配置，hitl = 审批页产生（57 §5.1，仅供展示与筛选，不参与授权判定） -->
          <a-table-column :title="$t('preApproval.grantSource')" :width="110">
            <template #cell="{ record }">
              <a-tag v-if="record.grant_source" :color="record.grant_source === 'hitl' ? 'purple' : 'gray'" size="small">
                {{ grantSourceLabel(record.grant_source) }}
              </a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('preApproval.grantUserName')" :width="130" :ellipsis="true">
            <template #cell="{ record }">{{ userLabelById(record.grant_user_id) }}</template>
          </a-table-column>
          <a-table-column :title="$t('preApproval.startedTime')" :width="170">
            <template #cell="{ record }">{{ record.grant_started_time || $t('preApproval.immediate') }}</template>
          </a-table-column>
          <a-table-column :title="$t('preApproval.expiredTime')" :width="170">
            <template #cell="{ record }">{{ record.grant_expired_time || $t('preApproval.neverExpire') }}</template>
          </a-table-column>
          <a-table-column :title="$t('preApproval.createdAt')" data-index="created_time" :width="170" />
          <a-table-column :title="$t('preApproval.operation')" :width="100" fixed="right">
            <template #cell="{ record }">
              <a-button
                v-if="record.grant_sta === '1'"
                type="text"
                size="small"
                status="danger"
                @click="handleRevoke(record)"
              >
                {{ $t('preApproval.revoke') }}
              </a-button>
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
        <template #empty>{{ $t('commonTable.noData') }}</template>
      </a-table>
    </a-card>

    <!-- 新建授权弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="$t('preApproval.create')"
      :ok-text="$t('commonTable.save')"
      :cancel-text="$t('commonTable.cancel')"
      :ok-loading="saving"
      width="640px"
      unmount-on-close
      @ok="handleSave"
      @cancel="modalVisible = false"
    >
      <!-- 本页只写临时授权：明确告知永久授权的去处 -->
      <a-alert type="info" style="margin-bottom: 16px">
        <div>{{ $t('preApproval.tempOnlyHint') }}</div>
        <div class="alert-sub">{{ $t('preApproval.duplicateHint') }}</div>
      </a-alert>

      <a-form :model="form" layout="vertical">
        <a-form-item field="gis_user_id" :label="$t('preApproval.grantedUser')" required>
          <a-select
            v-model="form.gis_user_id"
            :placeholder="$t('preApproval.grantedUserPlaceholder')"
            :loading="optionLoading"
            allow-search
            allow-clear
          >
            <a-option v-for="u in userList" :key="u.user_id" :value="u.user_id">
              {{ userLabel(u) }}
            </a-option>
          </a-select>
        </a-form-item>

        <a-form-item field="grant_type" :label="$t('preApproval.grantType')" required>
          <a-radio-group v-model="form.grant_type" @change="handleGrantTypeChange">
            <a-radio value="service">{{ $t('preApproval.grantTypeService') }}</a-radio>
            <a-radio value="device">{{ $t('preApproval.grantTypeDevice') }}</a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- service：先选插件（写入 target_name），再选该插件的方法（写入 fun_key）（57 §5.1） -->
        <template v-if="isService">
          <a-form-item field="plugin_name" :label="$t('preApproval.plugin')" required>
            <a-select
              v-model="form.plugin_name"
              :placeholder="$t('preApproval.pluginPlaceholder')"
              :loading="pluginLoading"
              allow-search
              allow-clear
              @change="handlePluginChange"
            >
              <a-option v-for="name in pluginList" :key="name" :value="name">{{ name }}</a-option>
            </a-select>
          </a-form-item>

          <a-form-item field="fun_key" :label="$t('preApproval.method')" required>
            <a-select
              v-model="form.fun_key"
              :placeholder="$t('preApproval.methodPlaceholder')"
              :loading="methodLoading"
              :disabled="!form.plugin_name"
              allow-search
              allow-clear
            >
              <a-option v-for="name in methodList" :key="name" :value="name">{{ name }}</a-option>
            </a-select>
          </a-form-item>
        </template>

        <!-- device：设备与功能都改为下拉选择，eqp_name / eqp_client_id / eqp_id / eqp_fun_id
             由选择自动带入，避免手填 ID 出错 -->
        <template v-else>
          <a-form-item field="eqp_id" :label="$t('preApproval.device')" required>
            <a-select
              v-model="form.eqp_id"
              :placeholder="$t('preApproval.devicePlaceholder')"
              :loading="deviceLoading"
              allow-search
              allow-clear
              @change="handleDeviceChange"
            >
              <a-option v-for="d in deviceList" :key="d.eqp_id" :value="d.eqp_id">
                {{ deviceLabel(d) }}
              </a-option>
            </a-select>
          </a-form-item>

          <a-form-item field="fun_key" :label="$t('preApproval.funKey')" required>
            <a-select
              v-model="form.fun_key"
              :placeholder="$t('preApproval.deviceFunPlaceholder')"
              :loading="funLoading"
              :disabled="!form.eqp_id"
              allow-search
              allow-clear
              @change="handleFunChange"
            >
              <a-option v-for="f in funList" :key="f.eqp_fun_id" :value="f.fun_key">
                {{ funLabel(f) }}
              </a-option>
            </a-select>
          </a-form-item>
        </template>

        <a-form-item :label="$t('preApproval.grantUserName')">
          <a-input :model-value="`${operatorName} (admin)`" disabled />
        </a-form-item>

        <!-- 本页只写临时授权：生效时间与到期时间都必填，不允许"立即生效 + 永久" -->
        <a-form-item field="grant_started_time" :label="$t('preApproval.startedTime')" required>
          <a-date-picker
            v-model="form.grant_started_time"
            :placeholder="$t('preApproval.startedTimePlaceholder')"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            allow-clear
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item field="grant_expired_time" :label="$t('preApproval.expiredTime')" required>
          <a-date-picker
            v-model="form.grant_expired_time"
            :placeholder="$t('preApproval.expiredTimePlaceholder')"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            allow-clear
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'

const { t } = useI18n()
const userStore = useUserStore()

// 当前登录用户 = 授权操作人（是否管理员由后端按登录人实时查 RBAC 判定，65 文档 §6.1）
const operatorId = computed(() => {
  const info = userStore.userInfo || {}
  return info.userId || info.user_id || 1
})
const operatorName = computed(() => userStore.userName || 'admin')

// ==================== 用户下拉 ====================
// 注意：/biz/gis_user/all 返回 snake_case（user_id / user_name / nick_name）
const userList = ref([])
const optionLoading = ref(false)

const userMap = computed(() => {
  const map = {}
  userList.value.forEach((u) => {
    map[String(u.user_id)] = u
  })
  return map
})

function userLabel(u) {
  if (!u) return '-'
  if (u.nick_name && u.user_name) return `${u.nick_name} (${u.user_name})`
  return u.nick_name || u.user_name || String(u.user_id)
}

function userLabelById(id) {
  if (id === undefined || id === null || id === '') return '-'
  const u = userMap.value[String(id)]
  return u ? userLabel(u) : String(id)
}

// 被授权人联系方式：手机号 / 邮箱由列表出参直接给出（41 §12.2），缺失则不占位
function contactLine(record) {
  return [record.gis_user_phone, record.gis_user_email].filter(Boolean).join(' · ')
}

async function fetchUsers() {
  optionLoading.value = true
  try {
    const res = await api.gisUser.getGisUserAll()
    const data = res?.data || res || []
    userList.value = Array.isArray(data) ? data : data.rows || []
  } catch (e) {
    console.error(t('preApproval.fetchFailed') + ':', e)
  } finally {
    optionLoading.value = false
  }
}

// ==================== 插件 / 方法下拉（57 §5.1：先插件、后方法） ====================
const pluginList = ref([])
const methodList = ref([])
const pluginLoading = ref(false)
const methodLoading = ref(false)

async function fetchPlugins() {
  pluginLoading.value = true
  try {
    const res = await api.pluginService.getServiceList()
    const data = res?.data || res || []
    const raw = Array.isArray(data) ? data : data.rows || []
    // 插件名可能落在 manifest.name 或 name 上（与插件管理页保持一致）
    pluginList.value = raw
      .map((p) => p?.manifest?.name || p?.name)
      .filter(Boolean)
      .sort()
  } catch (e) {
    console.error(t('preApproval.fetchFailed') + ':', e)
    pluginList.value = []
  } finally {
    pluginLoading.value = false
  }
}

async function fetchMethods(pluginName) {
  methodList.value = []
  if (!pluginName) return
  methodLoading.value = true
  try {
    const res = await api.pluginService.getServiceDetail(pluginName)
    const data = res?.data || res || {}
    // 方法名即授权行的 fun_key（HITL 闸门按它匹配）
    methodList.value = (data.methods || []).map((m) => m?.name).filter(Boolean)
  } catch (e) {
    console.error(t('preApproval.fetchFailed') + ':', e)
  } finally {
    methodLoading.value = false
  }
}

// ==================== 设备 / 设备功能下拉 ====================
// 设备类授权不再手填 eqp_id / eqp_fun_id / eqp_client_id，避免填错；
// 选中设备后带入设备名与 clientId，再选功能带入功能键与 eqp_fun_id
const deviceList = ref([])
const funList = ref([])
const deviceLoading = ref(false)
const funLoading = ref(false)

function deviceLabel(d) {
  if (!d) return '-'
  return d.eqp_client_id ? `${d.eqp_name}（${d.eqp_client_id}）` : d.eqp_name
}

function funLabel(f) {
  if (!f) return '-'
  return f.fun_name ? `${f.fun_name}（${f.fun_key}）` : f.fun_key
}

async function fetchDevices() {
  deviceLoading.value = true
  try {
    const res = await api.gisEqp.getGisEqpList({
      page: 1,
      page_size: 100,
      order_by: 'eqp_id',
      is_asc: true
    })
    const data = res?.data || res || {}
    deviceList.value = data.rows || []
  } catch (e) {
    console.error(t('preApproval.fetchFailed') + ':', e)
    deviceList.value = []
  } finally {
    deviceLoading.value = false
  }
}

async function fetchFuns(eqpId) {
  funList.value = []
  if (!eqpId) return
  funLoading.value = true
  try {
    const res = await api.gisEqp.getEqpFunList({
      eqp_id: eqpId,
      page: 1,
      page_size: 100,
      order_by: 'eqp_fun_id',
      is_asc: true
    })
    const data = res?.data || res || {}
    funList.value = data.rows || []
  } catch (e) {
    console.error(t('preApproval.fetchFailed') + ':', e)
  } finally {
    funLoading.value = false
  }
}

// 换设备：带入设备名与 clientId，清掉上一个设备的功能选择并重新拉功能
function handleDeviceChange(eqpId) {
  const device = deviceList.value.find((d) => d.eqp_id === eqpId)
  form.eqp_name = device?.eqp_name || ''
  form.eqp_client_id = device?.eqp_client_id || ''
  form.fun_key = ''
  form.eqp_fun_id = 0
  fetchFuns(eqpId)
}

// 选功能：带入 eqp_fun_id
function handleFunChange(funKey) {
  const fun = funList.value.find((f) => f.fun_key === funKey)
  form.eqp_fun_id = fun?.eqp_fun_id || 0
}

// ==================== 搜索 ====================
const searchForm = reactive({
  gis_user_id: undefined,
  grant_type: undefined,
  target_name: '',
  eqp_name: '',
  fun_key: '',
  grant_sta: undefined,
  grant_source: undefined
})

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  Object.assign(searchForm, {
    gis_user_id: undefined,
    grant_type: undefined,
    target_name: '',
    eqp_name: '',
    fun_key: '',
    grant_sta: undefined,
    grant_source: undefined
  })
  handleSearch()
}

// ==================== 表格 ====================
const loading = ref(false)
const tableData = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
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
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize
    }
    Object.keys(searchForm).forEach((key) => {
      const val = searchForm[key]
      if (val !== '' && val !== undefined && val !== null) {
        params[key] = val
      }
    })
    const res = await api.gisGrant.getGrantList(params)
    const data = res?.data || res || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    console.error(t('preApproval.fetchFailed') + ':', e)
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function grantTypeLabel(type) {
  if (type === 'service') return t('preApproval.grantTypeService')
  if (type === 'device') return t('preApproval.grantTypeDevice')
  // 兜底：grant_type 已不再新增 hitl，仅用于历史行展示（57 §四）
  if (type === 'hitl') return t('preApproval.grantTypeHitl')
  return type || '-'
}

function grantTypeColor(type) {
  if (type === 'service') return 'arcoblue'
  if (type === 'device') return 'cyan'
  // 兜底：同上，仅历史行
  if (type === 'hitl') return 'purple'
  return 'gray'
}

function grantStaLabel(sta) {
  if (sta === '0' || sta === 0) return t('preApproval.staNotGranted')
  if (sta === '1' || sta === 1) return t('preApproval.staGranted')
  if (sta === '2' || sta === 2) return t('preApproval.staRevoked')
  return sta === undefined || sta === null || sta === '' ? '-' : String(sta)
}

function grantStaColor(sta) {
  if (sta === '0' || sta === 0) return 'gray'
  if (sta === '1' || sta === 1) return 'green'
  if (sta === '2' || sta === 2) return 'red'
  return 'gray'
}

// grant_source：manual = 手工配置，hitl = 审批页产生（57 §四，仅供展示与筛选）
function grantSourceLabel(source) {
  if (source === 'manual') return t('preApproval.grantSourceManual')
  if (source === 'hitl') return t('preApproval.grantSourceHitl')
  return source || '-'
}

// ==================== 新建授权 ====================
const modalVisible = ref(false)
const saving = ref(false)

const isService = computed(() => form.grant_type === 'service')

const getDefaultForm = () => ({
  gis_user_id: undefined,
  grant_type: 'service',
  // service 专用：选中的插件名，提交时同时写入 target_name 与 eqp_name
  plugin_name: undefined,
  eqp_name: '',
  eqp_client_id: '',
  fun_key: '',
  eqp_id: 0,
  eqp_fun_id: 0,
  // 本页只做临时授权：生效时间默认「此刻」，到期时间必须由操作人显式选择
  grant_started_time: formatNow(),
  grant_expired_time: undefined
})

// 当前时间，格式与日期选择器的 value-format 一致
function formatNow() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const form = reactive(getDefaultForm())

function handleAdd() {
  Object.assign(form, getDefaultForm())
  methodList.value = []
  funList.value = []
  modalVisible.value = true
}

// 切换授权类型时清掉另一类专属字段，避免残留值被一起提交
function handleGrantTypeChange() {
  form.plugin_name = undefined
  methodList.value = []
  form.eqp_name = ''
  form.eqp_client_id = ''
  form.fun_key = ''
  form.eqp_id = 0
  form.eqp_fun_id = 0
  funList.value = []
}

// 换插件必须重选方法：fun_key 与插件是两个维度，不能沿用上一个插件的方法名
function handlePluginChange(pluginName) {
  form.fun_key = ''
  fetchMethods(pluginName)
}

async function handleSave() {
  if (form.gis_user_id === undefined || form.gis_user_id === null || form.gis_user_id === '') {
    Message.warning(t('preApproval.grantedUserRequired'))
    return
  }
  if (!form.grant_type) {
    Message.warning(t('preApproval.grantTypeRequired'))
    return
  }
  if (isService.value) {
    // service 必须选插件，选中值即 target_name（57 §三#3、§六）
    if (!form.plugin_name) {
      Message.warning(t('preApproval.targetNameRequired'))
      return
    }
  } else {
    if (!form.eqp_id) {
      Message.warning(t('preApproval.deviceRequired'))
      return
    }
    // 设备必须带 clientId，否则授权行落库不完整（后端 device 类型 eqp_client_id 必填）
    if (!form.eqp_client_id) {
      Message.warning(t('preApproval.deviceClientIdMissing'))
      return
    }
  }
  if (!form.fun_key || !form.fun_key.trim()) {
    Message.warning(t('preApproval.funKeyRequired'))
    return
  }
  // 本页只写临时授权：生效时间与到期时间必填，且到期必须晚于生效
  if (!form.grant_started_time) {
    Message.warning(t('preApproval.startedTimeRequired'))
    return
  }
  if (!form.grant_expired_time) {
    Message.warning(t('preApproval.expiredTimeRequired'))
    return
  }
  // 两个值都是定长补零的 'YYYY-MM-DD HH:mm:ss'，字符串比较等价于时间比较
  if (form.grant_expired_time <= form.grant_started_time) {
    Message.warning(t('preApproval.timeRangeInvalid'))
    return
  }

  const service = isService.value
  const payload = {
    gis_user_id: form.gis_user_id,
    gis_agent_id: 0,
    out_agent_id: '',
    grant_type: form.grant_type,
    // 对象名：service = 插件名；device = 空串（设备名在 eqp_name）
    target_name: service ? form.plugin_name : '',
    eqp_id: service ? 0 : Number(form.eqp_id) || 0,
    // 展示名：service 同样存插件名
    eqp_name: service ? form.plugin_name : form.eqp_name.trim(),
    // eqp_client_id 为设备专用，service 传空串
    eqp_client_id: service ? '' : form.eqp_client_id.trim(),
    eqp_fun_id: service ? 0 : Number(form.eqp_fun_id) || 0,
    fun_key: form.fun_key.trim(),
    grant_user_id: operatorId.value,
    // grant_user_role 已移除（65 文档 §6.1）：不再作为入参，后端按登录人实时查 RBAC
    created_by: operatorName.value,
    // 临时授权：两个时间都必传（永久授权不在本页产生）
    grant_started_time: form.grant_started_time,
    grant_expired_time: form.grant_expired_time
  }
  saving.value = true
  try {
    await api.gisGrant.createGrant(payload)
    Message.success(t('preApproval.createSuccess'))
    modalVisible.value = false
    fetchList()
  } catch (e) {
    console.error(t('preApproval.saveFailed') + ':', e)
  } finally {
    saving.value = false
  }
}

// ==================== 撤销 ====================
function handleRevoke(record) {
  Modal.confirm({
    title: t('preApproval.revoke'),
    content: t('preApproval.revokeConfirm'),
    okText: t('preApproval.revoke'),
    cancelText: t('commonTable.cancel'),
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await api.gisGrant.revokeGrant(record.grant_id, { updated_by: operatorName.value })
        Message.success(t('preApproval.revokeSuccess'))
        await fetchList()
      } catch (e) {
        console.error(t('preApproval.saveFailed') + ':', e)
      }
    }
  })
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchUsers()
  // 插件下拉：service 类型新建授权时用（57 §5.1）
  fetchPlugins()
  // 设备下拉：device 类型新建授权时用（功能下拉在选中设备后再拉）
  fetchDevices()
  fetchList()
})
</script>

<style lang="scss" scoped>
.pre-approval-page {
  .alert-sub {
    margin-top: 4px;
    color: var(--color-text-3);
    font-size: 12px;
  }

  .table-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $space-4;
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
