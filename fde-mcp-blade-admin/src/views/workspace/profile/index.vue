<template>
  <div class="profile-page">
    <a-tabs v-model:active-key="activeTab" class="profile-tabs" @change="handleTabChange">
      <!-- ① 账号资料：本次未改动 -->
      <a-tab-pane key="profile" :title="$t('profile.tabAccount')">
        <a-row :gutter="16">
          <!-- 左栏 -->
          <a-col :span="14">
            <!-- 账户信息 -->
            <a-card :bordered="false" :title="$t('profile.accountInfo')">
              <a-descriptions :column="1" bordered size="medium">
                <a-descriptions-item :label="$t('profile.username')">
                  {{ fullUser.user_name || userInfo.userName || '-' }}
                </a-descriptions-item>
                <a-descriptions-item :label="$t('profile.nickname')">
                  {{ fullUser.nick_name || userInfo.nickName || '-' }}
                </a-descriptions-item>
                <a-descriptions-item :label="$t('profile.groupName')">
                  {{ fullUser.group_name || '-' }}
                </a-descriptions-item>
                <a-descriptions-item :label="$t('profile.permLevel')">
                  {{ fullUser.user_perm_level || '-' }}
                </a-descriptions-item>
                <a-descriptions-item :label="$t('profile.accountStatus')">
                  <template v-if="fullUser.status === '0'">
                    <a-tag color="green">{{ $t('profile.normal') }}</a-tag>
                  </template>
                  <template v-else-if="fullUser.status === '1'">
                    <a-tag color="red">{{ $t('profile.disabled') }}</a-tag>
                  </template>
                  <template v-else>
                    -
                  </template>
                </a-descriptions-item>
                <a-descriptions-item :label="$t('profile.roles')">
                  <a-space wrap>
                    <a-tag v-for="role in roles" :key="role" color="arcoblue">{{ role }}</a-tag>
                  </a-space>
                </a-descriptions-item>
                <a-descriptions-item :label="$t('profile.createdTime')">
                  {{ fullUser.created_time || '-' }}
                </a-descriptions-item>
              </a-descriptions>
            </a-card>

            <!-- 修改密码 -->
            <a-card :bordered="false" :title="$t('profile.changePassword')" style="margin-top: 16px">
              <a-form
                ref="passwordFormRef"
                :model="passwordForm"
                :rules="passwordRules"
                layout="vertical"
                style="max-width: 400px"
              >
                <a-form-item field="oldPassword" :label="$t('profile.oldPassword')">
                  <a-input-password
                    v-model="passwordForm.oldPassword"
                    :placeholder="$t('profile.oldPasswordPlaceholder')"
                    autocomplete="current-password"
                  />
                </a-form-item>
                <a-form-item field="newPassword" :label="$t('profile.newPassword')">
                  <a-input-password
                    v-model="passwordForm.newPassword"
                    :placeholder="$t('profile.newPasswordPlaceholder')"
                    autocomplete="new-password"
                  />
                </a-form-item>
                <a-form-item field="confirmPassword" :label="$t('profile.confirmPassword')">
                  <a-input-password
                    v-model="passwordForm.confirmPassword"
                    :placeholder="$t('profile.confirmPasswordPlaceholder')"
                    autocomplete="new-password"
                  />
                </a-form-item>
                <a-form-item>
                  <a-button
                    type="primary"
                    :loading="passwordLoading"
                    @click="handleChangePassword"
                  >
                    {{ $t('profile.changePasswordBtn') }}
                  </a-button>
                </a-form-item>
              </a-form>
            </a-card>
          </a-col>

          <!-- 右栏 -->
          <a-col :span="10">
            <!-- 编辑资料 -->
            <a-card :bordered="false" :title="$t('profile.editProfile')">
              <a-form
                ref="profileFormRef"
                :model="profileForm"
                :rules="profileRules"
                layout="vertical"
              >
                <!-- 长度上限前端自己拦：昵称 ≤64、简介 ≤255（不靠后端 422 兜底） -->
                <a-form-item field="nick_name" :label="$t('profile.nickname')">
                  <a-input
                    v-model="profileForm.nick_name"
                    :placeholder="$t('profile.nicknamePlaceholder')"
                    :max-length="64"
                    show-word-limit
                  />
                </a-form-item>
                <a-form-item field="user_desc" :label="$t('profile.userDesc')">
                  <a-textarea
                    v-model="profileForm.user_desc"
                    :placeholder="$t('profile.descPlaceholder')"
                    :max-length="255"
                    show-word-limit
                    :auto-size="{ minRows: 2, maxRows: 5 }"
                  />
                </a-form-item>
                <a-form-item>
                  <a-button
                    type="primary"
                    :loading="profileLoading"
                    @click="handleSaveProfile"
                  >
                    {{ $t('profile.saveProfile') }}
                  </a-button>
                </a-form-item>
              </a-form>
            </a-card>

            <!-- 偏好设置 -->
            <a-card :bordered="false" :title="$t('profile.preferences')" style="margin-top: 16px">
              <div class="pref-item">
                <div class="pref-label">{{ $t('profile.language') }}</div>
                <a-select v-model="locale" :style="{ width: '100%' }" @change="onLocaleChange">
                  <a-option value="zh-CN">{{ $t('common.chinese') }}</a-option>
                  <a-option value="en-US">{{ $t('common.english') }}</a-option>
                </a-select>
              </div>
              <div class="pref-item">
                <div class="pref-label">{{ $t('profile.theme') }}</div>
                <a-select v-model="theme" :style="{ width: '100%' }" @change="onThemeChange">
                  <a-option value="light">{{ $t('profile.themeLight') }}</a-option>
                  <a-option value="dark">{{ $t('profile.themeDark') }}</a-option>
                  <a-option value="auto">{{ $t('profile.themeAuto') }}</a-option>
                </a-select>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </a-tab-pane>

      <!-- ② 我的授权 -->
      <a-tab-pane key="grant" :title="$t('profile.tabGrant')">
        <a-card :bordered="false">
          <a-form :model="grantFilter" layout="inline" class="filter-bar">
            <a-form-item field="status" :label="$t('profile.grantSta')">
              <a-select
                v-model="grantFilter.status"
                :placeholder="$t('commonTable.all')"
                allow-clear
                style="width: 160px"
              >
                <a-option value="1">{{ $t('profile.granted') }}</a-option>
                <a-option value="2">{{ $t('workspace.statRevoked') }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item field="grant_type" :label="$t('profile.grantType')">
              <a-select
                v-model="grantFilter.grant_type"
                :placeholder="$t('commonTable.all')"
                allow-clear
                style="width: 160px"
              >
                <a-option value="device">device</a-option>
                <a-option value="service">service</a-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handleGrantSearch">
                  <template #icon><icon-search /></template>
                  {{ $t('commonTable.search') }}
                </a-button>
                <a-button @click="handleGrantReset">
                  <template #icon><icon-refresh /></template>
                  {{ $t('commonTable.reset') }}
                </a-button>
              </a-space>
            </a-form-item>
          </a-form>

          <a-table
            :data="grantRows"
            :loading="grantLoading"
            :pagination="grantPagination"
            :scroll="{ x: 1240 }"
            row-key="grant_id"
            @page-change="handleGrantPageChange"
            @page-size-change="handleGrantPageSizeChange"
          >
            <template #columns>
              <a-table-column :title="$t('profile.grantId')" data-index="grant_id" :width="90" />
              <a-table-column :title="$t('profile.grantType')" data-index="grant_type" :width="110" />
              <a-table-column :title="$t('profile.grantObject')" :width="200">
                <template #cell="{ record }">
                  <div class="cell-main">{{ record.target_name || record.eqp_name || '-' }}</div>
                  <div v-if="subEqpName(record)" class="cell-sub">{{ record.eqp_name }}</div>
                </template>
              </a-table-column>
              <a-table-column :title="$t('eqp.funKey')" data-index="fun_key" :width="200" :ellipsis="true" />
              <a-table-column :title="$t('profile.grantSta')" :width="110">
                <template #cell="{ record }">
                  <a-tag :color="record.grant_sta === '1' ? 'green' : 'gray'" size="small">
                    {{ record.grant_sta === '1' ? $t('profile.granted') : $t('workspace.statRevoked') }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="$t('profile.grantStartedTime')" :width="170">
                <template #cell="{ record }">{{ record.grant_started_time || '-' }}</template>
              </a-table-column>
              <!-- 到期时间为 null = 永久 -->
              <a-table-column :title="$t('profile.expiresAt')" :width="150">
                <template #cell="{ record }">{{ expiresText(record.grant_expired_time) }}</template>
              </a-table-column>
            </template>
            <template #empty>
              <a-empty :description="grantError || $t('commonTable.noData')" />
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- ③ 我的调用 -->
      <a-tab-pane key="cmd" :title="$t('profile.tabCmd')">
        <a-card :bordered="false">
          <a-form :model="cmdFilter" layout="inline" class="filter-bar">
            <a-form-item field="tool_name" :label="$t('profile.toolNameLabel')">
              <!-- 模糊匹配的是「工具名」（如 local_service_call），不是插件名 -->
              <a-input
                v-model="cmdFilter.tool_name"
                :placeholder="$t('profile.searchToolNamePlaceholder')"
                allow-clear
                style="width: 220px"
                @press-enter="handleCmdSearch"
              />
            </a-form-item>
            <a-form-item field="success" :label="$t('profile.resultLabel')">
              <a-select
                v-model="cmdFilter.success"
                :placeholder="$t('commonTable.all')"
                allow-clear
                style="width: 140px"
              >
                <a-option :value="true">{{ $t('commonTable.success') }}</a-option>
                <a-option :value="false">{{ $t('commonTable.failure') }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item field="range" :label="$t('profile.callTime')">
              <!-- 结束日含当天（后端口径），传 YYYY-MM-DD -->
              <a-range-picker
                v-model="cmdRange"
                value-format="YYYY-MM-DD"
                style="width: 240px"
                @change="handleCmdSearch"
              />
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handleCmdSearch">
                  <template #icon><icon-search /></template>
                  {{ $t('commonTable.search') }}
                </a-button>
                <a-button @click="handleCmdReset">
                  <template #icon><icon-refresh /></template>
                  {{ $t('commonTable.reset') }}
                </a-button>
              </a-space>
            </a-form-item>
          </a-form>

          <a-table
            :data="cmdRows"
            :loading="cmdLoading"
            :pagination="cmdPagination"
            :scroll="{ x: 1640 }"
            row-key="log_id"
            @page-change="handleCmdPageChange"
            @page-size-change="handleCmdPageSizeChange"
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
              <a-empty :description="cmdError || $t('commonTable.noData')" />
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>

      <!-- ④ 我的令牌：只读（拿不到令牌本身，不做复制、不做撤销） -->
      <a-tab-pane key="token" :title="$t('profile.tabToken')">
        <a-card :bordered="false">
          <a-form :model="tokenFilter" layout="inline" class="filter-bar">
            <a-form-item field="status" :label="$t('profile.tokenStatusLabel')">
              <a-select
                v-model="tokenFilter.status"
                :placeholder="$t('commonTable.all')"
                allow-clear
                style="width: 160px"
              >
                <a-option value="active">{{ $t('workspace.statActive') }}</a-option>
                <a-option value="revoked">{{ $t('workspace.statRevoked') }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handleTokenSearch">
                  <template #icon><icon-search /></template>
                  {{ $t('commonTable.search') }}
                </a-button>
                <a-button @click="handleTokenReset">
                  <template #icon><icon-refresh /></template>
                  {{ $t('commonTable.reset') }}
                </a-button>
              </a-space>
            </a-form-item>
          </a-form>

          <a-table
            :data="tokenRows"
            :loading="tokenLoading"
            :pagination="tokenPagination"
            :scroll="{ x: 1180 }"
            row-key="token_jti"
            @page-change="handleTokenPageChange"
            @page-size-change="handleTokenPageSizeChange"
          >
            <template #columns>
              <a-table-column :title="$t('profile.tokenName')" :width="160">
                <template #cell="{ record }">{{ record.token_name || '-' }}</template>
              </a-table-column>
              <!-- 只存前缀，令牌本身只在签发时返回一次 -->
              <a-table-column :title="$t('profile.tokenPrefix')" :width="180">
                <template #cell="{ record }">{{ record.token_prefix || '-' }}</template>
              </a-table-column>
              <a-table-column :title="$t('profile.tokenType')" :width="120">
                <template #cell="{ record }">{{ record.token_type || '-' }}</template>
              </a-table-column>
              <a-table-column :title="$t('profile.tokenStatusLabel')" :width="110">
                <template #cell="{ record }">
                  <a-tag :color="record.status === 'active' ? 'green' : 'gray'" size="small">
                    {{ record.status === 'active' ? $t('workspace.statActive') : $t('workspace.statRevoked') }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="$t('workspace.tokenMaxRisk')" :width="140">
                <template #cell="{ record }">
                  <a-tag v-if="riskInfo(record.max_risk_level)" :color="riskInfo(record.max_risk_level).color" size="small">
                    {{ riskInfo(record.max_risk_level).label }}
                  </a-tag>
                  <span v-else>-</span>
                </template>
              </a-table-column>
              <a-table-column :title="$t('profile.timeUnit')" :width="130">
                <template #cell="{ record }">{{ timeUnitText(record.token_time_unit) }}</template>
              </a-table-column>
              <!-- 到期时间为 null = 永久 -->
              <a-table-column :title="$t('profile.expiresAt')" :width="150">
                <template #cell="{ record }">{{ expiresText(record.expires_at) }}</template>
              </a-table-column>
              <a-table-column :title="$t('profile.issuedAt')" data-index="issued_at" :width="170" />
            </template>
            <template #empty>
              <a-empty :description="tokenError || $t('commonTable.noData')" />
            </template>
          </a-table>
        </a-card>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
// ⚠️ 编辑资料走 updateUserProfile（PUT /biz/gis_user/{id}/profile，仅本人、只认 2 字段），
//    不要换回 updateGisUser —— 那是管理员的整表单提交接口，会 403 / 422。
import { getGisUserById, updateUserProfile, changePassword } from '@/api/modules/gisUser'
import { api } from '@/api'
import { isSuperAdmin } from '@/utils/permission'
import { useRiskLevelDict } from '@/constants/riskLevel'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const { riskLevelMap } = useRiskLevelDict()

// ---------- 当前用户数据 ----------
const userInfo = computed(() => userStore.userInfo || {})

// 超级管理员由后端下发的哨兵值判定（roles 含 admin / permissions 含 *:*:*），
// 此时后端无需返回全部角色名，这里统一收敛成一个标识
const roles = computed(() => {
  if (isSuperAdmin()) return [t('profile.superAdmin')]
  return userStore.roles || []
})

const fullUser = ref({})

// ==================== 页签 ====================
// 支持从工作台带 ?tab=cmd|grant|token 进来；非法值一律回落到「账号资料」
const TAB_KEYS = ['profile', 'grant', 'cmd', 'token']
const activeTab = ref('profile')
const loadedTabs = reactive({ grant: false, cmd: false, token: false })

function handleTabChange(key) {
  if (key === 'profile' || loadedTabs[key]) return
  loadedTabs[key] = true
  if (key === 'grant') fetchGrantList()
  if (key === 'cmd') fetchCmdList()
  if (key === 'token') fetchTokenList()
}

// ==================== 明细列表 · 公共 ====================
// 三个列表共用 page / page_size（默认 20，上限 100），排序由后端固定，前端不传排序参数
const DEFAULT_PAGE_SIZE = 20

function createPagination() {
  return reactive({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    showTotal: true,
    showPageSize: true,
    pageSizeOptions: [10, 20, 50, 100]
  })
}

// 三个列表接口出参都是 {code,msg,data:{total,rows}}（不是顶层 {total,rows}）
function pickRows(res) {
  const data = res?.data || {}
  return { rows: data.rows || [], total: data.total || 0 }
}

function riskInfo(level) {
  if (!level) return null
  if (level === 'auth') return { label: t('hitl.riskAuth'), color: 'red' }
  return riskLevelMap.value[level] || { label: level, color: 'gray' }
}

// 到期时间为 null / 空 = 永久
function expiresText(val) {
  return val ? val : t('profile.permanent')
}

function elapsedText(val) {
  if (val === null || val === undefined || val === '') return '-'
  return `${val} ms`
}

function timeUnitText(unit) {
  if (unit === 'permanent') return t('profile.timeUnitPermanent')
  if (unit === 'monthly') return t('profile.timeUnitMonthly')
  if (unit === 'custom') return t('profile.timeUnitCustom')
  return unit || '-'
}

function subEqpName(record) {
  return !!record?.target_name && !!record?.eqp_name && record.target_name !== record.eqp_name
}

// ==================== 我的授权 ====================
const grantFilter = reactive({ status: undefined, grant_type: undefined })
const grantRows = ref([])
const grantLoading = ref(false)
const grantError = ref('')
const grantPagination = createPagination()

async function fetchGrantList() {
  grantLoading.value = true
  grantError.value = ''
  try {
    const params = { page: grantPagination.current, page_size: grantPagination.pageSize }
    if (grantFilter.status) params.status = grantFilter.status
    if (grantFilter.grant_type) params.grant_type = grantFilter.grant_type
    const { rows, total } = pickRows(await api.gisMine.getMineGrantList(params))
    grantRows.value = rows
    grantPagination.total = total
  } catch (e) {
    console.error('获取我的授权失败:', e)
    grantRows.value = []
    grantPagination.total = 0
    grantError.value = t('profile.listFetchFailed')
  } finally {
    grantLoading.value = false
  }
}

function handleGrantSearch() {
  grantPagination.current = 1
  fetchGrantList()
}

function handleGrantReset() {
  grantFilter.status = undefined
  grantFilter.grant_type = undefined
  handleGrantSearch()
}

function handleGrantPageChange(page) {
  grantPagination.current = page
  fetchGrantList()
}

function handleGrantPageSizeChange(size) {
  grantPagination.pageSize = size
  handleGrantSearch()
}

// ==================== 我的调用 ====================
const cmdFilter = reactive({ success: undefined, tool_name: '' })
const cmdRange = ref([])
const cmdRows = ref([])
const cmdLoading = ref(false)
const cmdError = ref('')
const cmdPagination = createPagination()

async function fetchCmdList() {
  cmdLoading.value = true
  cmdError.value = ''
  try {
    const params = { page: cmdPagination.current, page_size: cmdPagination.pageSize }
    if (cmdFilter.tool_name) params.tool_name = cmdFilter.tool_name
    if (cmdFilter.success === true || cmdFilter.success === false) params.success = cmdFilter.success
    const range = cmdRange.value || []
    if (range.length === 2 && range[0] && range[1]) {
      params.begin_time = range[0]
      params.end_time = range[1]
    }
    const { rows, total } = pickRows(await api.gisMine.getMineCmdList(params))
    cmdRows.value = rows
    cmdPagination.total = total
  } catch (e) {
    console.error('获取我的调用失败:', e)
    cmdRows.value = []
    cmdPagination.total = 0
    cmdError.value = t('profile.listFetchFailed')
  } finally {
    cmdLoading.value = false
  }
}

function handleCmdSearch() {
  cmdPagination.current = 1
  fetchCmdList()
}

function handleCmdReset() {
  cmdFilter.success = undefined
  cmdFilter.tool_name = ''
  cmdRange.value = []
  handleCmdSearch()
}

function handleCmdPageChange(page) {
  cmdPagination.current = page
  fetchCmdList()
}

function handleCmdPageSizeChange(size) {
  cmdPagination.pageSize = size
  handleCmdSearch()
}

function goApproval(approvalId) {
  if (approvalId === null || approvalId === undefined) return
  router.push(`/workspace/approval/index?approval_id=${approvalId}`)
}

// ==================== 我的令牌 ====================
const tokenFilter = reactive({ status: undefined })
const tokenRows = ref([])
const tokenLoading = ref(false)
const tokenError = ref('')
const tokenPagination = createPagination()

async function fetchTokenList() {
  tokenLoading.value = true
  tokenError.value = ''
  try {
    const params = { page: tokenPagination.current, page_size: tokenPagination.pageSize }
    if (tokenFilter.status) params.status = tokenFilter.status
    const { rows, total } = pickRows(await api.gisMine.getMineTokenList(params))
    tokenRows.value = rows
    tokenPagination.total = total
  } catch (e) {
    console.error('获取我的令牌失败:', e)
    tokenRows.value = []
    tokenPagination.total = 0
    tokenError.value = t('profile.listFetchFailed')
  } finally {
    tokenLoading.value = false
  }
}

function handleTokenSearch() {
  tokenPagination.current = 1
  fetchTokenList()
}

function handleTokenReset() {
  tokenFilter.status = undefined
  handleTokenSearch()
}

function handleTokenPageChange(page) {
  tokenPagination.current = page
  fetchTokenList()
}

function handleTokenPageSizeChange(size) {
  tokenPagination.pageSize = size
  handleTokenSearch()
}

// ---------- 编辑资料 ----------
const profileFormRef = ref(null)
const profileLoading = ref(false)

const profileForm = reactive({
  nick_name: '',
  user_desc: ''
})

// 昵称：必填 + trim 后不能为空（长度 ≤64 由 input 的 max-length 拦）
const profileRules = {
  nick_name: [
    { required: true, message: t('profile.nicknameRequired') },
    {
      validator: (value, cb) => {
        if (!String(value ?? '').trim()) return cb(t('profile.nicknameRequired'))
        cb()
      }
    }
  ]
}

async function handleSaveProfile() {
  try {
    await profileFormRef.value.validate()
  } catch {
    return
  }

  profileLoading.value = true
  try {
    // 🔴 只传这 2 个字段（PUT /biz/gis_user/{id}/profile，后端已收紧为「仅本人可改」）：
    //  · 传白名单外字段 → 422（不是 400）；group_name / user_name / user_perm_level
    //    以前是回填值顺手上传，user_perm_level 首发即 422 —— 已全部删掉，别再改回去；
    //  · 两个都不传 → 400「没有需要更新的字段」；
    //  · user_desc 传空串 = 清空简介（服务端落 NULL），这是允许的；
    //  · 字段名是 snake_case，与本模块 password / settings 的 camelCase 不一致，不要统一。
    await updateUserProfile(userInfo.value.userId, {
      nick_name: profileForm.nick_name.trim(),
      user_desc: profileForm.user_desc
    })
    // 刷新 store 中的用户信息
    await userStore.fetchUserInfo()
    Message.success(t('profile.saveProfileSuccess'))
  } catch {
    Message.error(t('common.error'))
  } finally {
    profileLoading.value = false
  }
}

// ---------- 修改密码 ----------
const passwordFormRef = ref(null)
const passwordLoading = ref(false)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (value, callback) => {
  if (!value) {
    callback(t('profile.confirmPasswordRequired'))
  } else if (value !== passwordForm.newPassword) {
    callback(t('profile.passwordMismatch'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: t('profile.oldPasswordRequired') }],
  newPassword: [
    { required: true, message: t('profile.newPasswordRequired') },
    { minLength: 6, message: t('profile.passwordRule') }
  ],
  confirmPassword: [{ validator: validateConfirmPassword }]
}

async function handleChangePassword() {
  try {
    await passwordFormRef.value.validate()
  } catch {
    return
  }

  passwordLoading.value = true
  try {
    await changePassword(userInfo.value.userId, {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })
    Message.success(t('profile.changePasswordSuccess'))
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    const msg = error?.response?.data?.msg || error?.msg || t('profile.changePasswordError')
    Message.error(msg)
  } finally {
    passwordLoading.value = false
  }
}

// ---------- 偏好设置 ----------
const theme = ref(appStore.theme || 'light')
const locale = ref(appStore.locale || 'zh-CN')

function onThemeChange(val) {
  appStore.setTheme(val)
}

function onLocaleChange(val) {
  appStore.setLocale(val)
}

onMounted(async () => {
  // 支持 ?tab=grant|cmd|token 直达；非法值回落「账号资料」
  const queryTab = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab
  if (TAB_KEYS.includes(queryTab)) activeTab.value = queryTab
  if (activeTab.value !== 'profile') handleTabChange(activeTab.value)

  const userId = userInfo.value.userId
  if (userId) {
    try {
      const res = await getGisUserById(userId)
      fullUser.value = res.data || res
      // 初始化编辑表单
      profileForm.nick_name = fullUser.value.nick_name || userInfo.value.nickName || ''
      profileForm.user_desc = fullUser.value.user_desc || ''
    } catch {
      // 失败时回退到 store 数据
      fullUser.value = { ...userInfo.value }
      profileForm.nick_name = userInfo.value.nickName || ''
      profileForm.user_desc = ''
    }
  }
})
</script>

<style scoped>
.profile-page {
  padding: 16px;
}

.filter-bar {
  margin-bottom: 16px;
}

.pref-item {
  margin-bottom: 16px;
}

.pref-label {
  font-size: 14px;
  color: var(--color-text-2);
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
</style>
