<template>
  <div class="mine-token-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-alert type="info" style="margin-bottom: 16px">
        {{ $t('mine.tokenNotice') }}
      </a-alert>

      <!-- 筛选 -->
      <div class="table-toolbar">
        <a-space>
          <a-select
            v-model="statusFilter"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
            @change="handleSearch"
          >
            <a-option value="active">{{ $t('token.active') }}</a-option>
            <a-option value="revoked">{{ $t('token.revoked') }}</a-option>
          </a-select>
          <a-button @click="handleReset">
            <template #icon><icon-refresh /></template>
            {{ $t('commonTable.reset') }}
          </a-button>
        </a-space>
        <!-- 自助签发：个人域无独立签发接口，走管理台同一个 POST /biz/tokens，target_user_id 固定为本人 -->
        <a-button type="primary" @click="handleCreate">
          <template #icon><icon-plus /></template>
          {{ $t('token.createToken') }}
        </a-button>
      </div>

      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('token.id')" data-index="id" :width="70" />
          <a-table-column :title="$t('token.tokenName')" data-index="token_name" :width="180" :ellipsis="true">
            <template #cell="{ record }">{{ record.token_name || '—' }}</template>
          </a-table-column>
          <a-table-column :title="$t('token.tokenPrefix')" data-index="token_prefix" :width="200" :ellipsis="true" />
          <a-table-column :title="$t('commonTable.status')" data-index="status" :width="110">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'active' ? 'green' : 'red'" size="small">
                {{ record.status === 'active' ? $t('token.active') : $t('token.revoked') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('token.expiresAt')" :width="180">
            <template #cell="{ record }">
              {{ record.expires_at || $t('token.permanentValid') }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('token.issuedAt')" data-index="issued_at" :width="180" />
          <a-table-column :title="$t('commonTable.operation')" :width="110" fixed="right">
            <template #cell="{ record }">
              <!-- 自助撤销：仅 active 可见；只作用于本人令牌（服务端按登录人过滤，非本人 403） -->
              <a-popconfirm
                v-if="record.status === 'active'"
                :content="$t('mine.tokenRevokeConfirm')"
                type="warning"
                @ok="handleRevoke(record)"
              >
                <a-button status="danger" type="text" size="small" :loading="revokingId === record.id">
                  {{ $t('mine.tokenRevoke') }}
                </a-button>
              </a-popconfirm>
              <span v-else>—</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 创建令牌弹窗：个人域无「为谁签发」选择器，归属人恒为当前登录人 -->
    <a-modal
      v-model:visible="createModalVisible"
      :title="$t('token.createTitle')"
      :ok-text="$t('token.confirmCreate')"
      :cancel-text="$t('token.cancel')"
      width="520px"
      @ok="handleCreateSubmit"
      @cancel="createModalVisible = false"
    >
      <a-form ref="createFormRef" :model="createForm" :rules="createFormRules" layout="vertical">
        <a-form-item field="token_name" :label="$t('token.tokenNameLabel')">
          <a-input v-model="createForm.token_name" :placeholder="$t('token.tokenNamePlaceholder')" />
        </a-form-item>
        <a-form-item field="token_time_unit" :label="$t('token.tokenTimeUnit')">
          <a-radio-group v-model="createForm.token_time_unit">
            <a-radio value="permanent">{{ $t('token.permanentValid') }}</a-radio>
            <a-radio value="monthly">{{ $t('token.monthlyValid') }}</a-radio>
            <a-radio value="custom">{{ $t('token.customHours') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="createForm.token_time_unit === 'custom'"
          field="expiration_hours"
          :label="$t('token.validHours')"
        >
          <a-input-number
            v-model="createForm.expiration_hours"
            :min="1"
            :max="87600"
            :placeholder="$t('token.defaultHours')"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 创建成功弹窗：完整令牌只返回一次，关闭后无法再次查看（不展示二维码字段，1105 §十） -->
    <a-modal
      v-model:visible="successModalVisible"
      :title="$t('token.createSuccessTitle')"
      :ok-text="$t('token.savedClose')"
      :cancel-text="$t('token.close')"
      :mask-closable="false"
      unmount-on-close
      width="960px"
      @ok="successModalVisible = false"
      @cancel="successModalVisible = false"
    >
      <template #footer>
        <a-space>
          <a-button @click="successModalVisible = false">{{ $t('token.close') }}</a-button>
          <a-button type="primary" @click="handleCopyToken">{{ $t('token.copyToken') }}</a-button>
          <a-button
            type="primary"
            status="warning"
            :disabled="!mcpConfigJsonText"
            @click="handleCopyMcpConfig('local')"
          >
            {{ $t('token.copyMcpConfigLocal') }}
          </a-button>
          <a-button
            v-if="cloudMcpConfigJsonText"
            type="primary"
            status="warning"
            @click="handleCopyMcpConfig('cloud')"
          >
            {{ $t('token.copyMcpConfigCloud') }}
          </a-button>
          <a-button type="primary" status="success" @click="successModalVisible = false">
            {{ $t('token.savedClose') }}
          </a-button>
        </a-space>
      </template>
      <div style="padding: 8px 0">
        <a-alert type="warning" style="margin-bottom: 16px">{{ $t('mine.tokenOnceWarning') }}</a-alert>

        <!-- 两列布局：左列令牌、右列 MCP 配置（二维码字段按 1105 §十 暂不对外暴露） -->
        <div class="mine-token-layout">
          <!-- 左列：令牌信息 -->
          <div class="mine-token-col">
            <div class="mine-token-section-title">{{ $t('token.tokenInfo') }}</div>
            <a-form :model="{}" layout="vertical">
              <a-form-item :label="$t('token.tokenNameLabel')">
                <a-input :model-value="createdTokenInfo.token_name" readonly />
              </a-form-item>
              <a-form-item :label="$t('token.tokenPrefix')">
                <a-input :model-value="createdTokenInfo.token_prefix" readonly />
              </a-form-item>
              <a-form-item :label="$t('mine.tokenOwner')">
                <a-input :model-value="createdTokenInfo.user_name" readonly />
              </a-form-item>
              <a-form-item :label="$t('token.expiresAt')">
                <a-input :model-value="createdTokenInfo.expires_at || $t('token.permanentValid')" readonly />
              </a-form-item>
              <a-form-item :label="$t('token.tokenLabel')">
                <a-textarea
                  :model-value="createdTokenInfo.token"
                  readonly
                  :auto-size="{ minRows: 4, maxRows: 8 }"
                  style="font-family: monospace; font-size: 12px"
                />
              </a-form-item>
            </a-form>
          </div>

          <!-- 右列：MCP 配置 -->
          <div class="mine-token-col">
            <div class="mine-token-section-title">{{ $t('token.mcpConfigLocal') }}</div>
            <a-textarea
              :model-value="mcpConfigJsonText"
              readonly
              :auto-size="{ minRows: 6, maxRows: 14 }"
              style="font-family: monospace; font-size: 12px"
            />
            <a-alert v-if="mcpUrlAdapted" type="success" style="margin-top: 8px">
              {{ $t('token.mcpUrlAdapted') }}
            </a-alert>

            <template v-if="cloudMcpConfigJsonText">
              <div class="mine-token-section-title" style="margin-top: 20px">
                {{ $t('token.mcpConfigCloud') }}
              </div>
              <a-textarea
                :model-value="cloudMcpConfigJsonText"
                readonly
                :auto-size="{ minRows: 6, maxRows: 14 }"
                style="font-family: monospace; font-size: 12px"
              />
            </template>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
/**
 * 我的令牌（1016 §4.1 页 3 / P4 §5.1 第 7 项）
 * - 数据源 GET /biz/gis_mine/token/list（个人域，不挂权限点，服务端按登录人过滤）
 * - 核心动作：
 *     · 自助签发 —— 个人域**没有**独立签发接口，复用管理台 POST /biz/tokens；
 *       普通用户 target_user_id 只能是本人（填别人 → 400），故固定取当前登录人、无「为谁签发」选择器；
 *     · 自助撤销 DELETE /biz/gis_mine/token/{id}（仅 active 显示，popconfirm 二次确认）。
 * - 展示约束：库里只存 token_jti + token_prefix → 列表**永不提供「查看 / 复制令牌」**；
 *   完整令牌只在签发当次的成功弹窗里出现一次，关闭后无法找回（遗失只能撤销重签）。
 * - 二维码字段（mcpLocalQrCode / mcpCloudQrCode）按「扫码接入暂不对外暴露」不展示。
 * - 撤销成功后重拉列表（撤销立即生效，进黑名单）。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { getMineTokenList, revokeMineToken } from '@/api/modules/gisMine'
import { createToken } from '@/api/modules/token'
import { normalizeMcpConfig } from '@/utils/mcpConfig'
import { copyTextToClipboard } from '@/utils/clipboard'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const { t } = useI18n()

// ==================== 筛选 ====================
const statusFilter = ref(undefined)

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  statusFilter.value = undefined
  pagination.current = 1
  fetchList()
}

// ==================== 表格 ====================
const loading = ref(false)
const tableData = ref([])
const revokingId = ref(null)
const pagination = reactive({
  current: 1,
  pageSize: 20,
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
    if (statusFilter.value) params.status = statusFilter.value
    const res = await getMineTokenList(params)
    const data = res?.data || {}
    tableData.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

// ==================== 自助撤销 ====================
async function handleRevoke(record) {
  revokingId.value = record.id
  try {
    await revokeMineToken(record.id)
    Message.success(t('mine.tokenRevokeSuccess'))
    // 撤销后立即生效 → 重拉列表
    fetchList()
  } catch (e) {
    // 错误已由拦截器提示（403 非本人 / 404 不存在 / 200 幂等）
  } finally {
    revokingId.value = null
  }
}

// ==================== 自助签发 ====================
// 个人域刻意没有独立签发接口 → 与管理台共用 POST /biz/tokens。
// 普通用户 target_user_id 只能是本人（填别人 → 400「只能为自己创建令牌」），
// 故这里固定取当前登录人，不渲染「为谁签发」选择器。
const createModalVisible = ref(false)
const createFormRef = ref(null)

const getDefaultCreateForm = () => ({
  token_name: '',
  token_time_unit: 'permanent',
  expiration_hours: 24
})

const createForm = reactive(getDefaultCreateForm())

const createFormRules = {
  token_name: [{ required: true, message: t('token.nameRequired') }],
  token_time_unit: [{ required: true, message: t('token.timeUnitRequired') }],
  expiration_hours: [
    {
      validator: (value, cb) => {
        if (createForm.token_time_unit === 'custom' && (!value || value < 1)) {
          cb(t('token.hoursRequired'))
        } else {
          cb()
        }
      }
    }
  ]
}

// 创建成功弹窗：完整令牌只在这里出现一次
const successModalVisible = ref(false)
const createdTokenInfo = ref({
  token: '',
  token_prefix: '',
  token_name: '',
  user_name: '',
  expires_at: null,
  mcp_config: {}
})

// MCP 地址归一化（实现见 @/utils/mcpConfig）：是否命中反代/端口转发场景
const mcpUrlAdapted = ref(false)

// MCP 配置 JSON 文本（格式化后的完整结构，供展示/复制）
const mcpConfigJsonText = computed(() => {
  const cfg = createdTokenInfo.value.mcp_config?.mcpLocal
  if (!cfg || Object.keys(cfg).length === 0) return ''
  return JSON.stringify(cfg, null, 2)
})

const cloudMcpConfigJsonText = computed(() => {
  const cfg = createdTokenInfo.value.mcp_config?.mcpCloud
  if (!cfg || Object.keys(cfg).length === 0) return ''
  return JSON.stringify(cfg, null, 2)
})

function handleCreate() {
  Object.assign(createForm, getDefaultCreateForm())
  createModalVisible.value = true
}

async function handleCreateSubmit() {
  try {
    await createFormRef.value?.validate()
  } catch (e) {
    return
  }

  try {
    const data = {
      token_name: createForm.token_name,
      token_time_unit: createForm.token_time_unit,
      target_user_id: userStore.userInfo?.userId
    }
    if (createForm.token_time_unit === 'custom') {
      data.expiration_hours = createForm.expiration_hours || 24
    }

    const res = await createToken(data)
    const payload = res.data || res

    createModalVisible.value = false

    // 按当前访问地址归一化本地 MCP 地址（反代/端口转发场景）
    mcpUrlAdapted.value = normalizeMcpConfig(payload)

    createdTokenInfo.value = {
      token: payload.token,
      token_prefix: payload.token_prefix,
      token_name: payload.token_name,
      user_name: payload.user_name,
      expires_at: payload.expires_at,
      mcp_config: payload.mcp_config || {}
    }
    successModalVisible.value = true
    fetchList()
  } catch (e) {
    // 错误已由拦截器提示
  }
}

// 复制令牌（剪贴板实现见 @/utils/clipboard）
async function handleCopyToken() {
  if (!createdTokenInfo.value.token) {
    Message.warning(t('token.tokenEmpty'))
    return
  }
  await copyTextToClipboard(
    createdTokenInfo.value.token,
    t('token.copiedToken'),
    t('token.manualCopyToken')
  )
}

// 复制 MCP 配置 JSON（type: local=本地 / cloud=云端）
async function handleCopyMcpConfig(type) {
  const text = type === 'cloud' ? cloudMcpConfigJsonText.value : mcpConfigJsonText.value
  if (!text) {
    Message.warning(t('token.mcpEmpty'))
    return
  }
  await copyTextToClipboard(text, t('token.copiedMcp'), t('token.manualCopyMcp'))
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.mine-token-page {
  .table-toolbar {
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>

<!-- 全局样式：Modal 内容通过 Portal 挂载到 body，scoped 样式无法命中 -->
<style lang="scss">
.mine-token-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  align-items: flex-start;
}

.mine-token-col {
  min-width: 0;
}

.mine-token-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
  margin: 0 0 12px;
  padding-left: 8px;
  border-left: 3px solid var(--color-primary-5, #165dff);
}
</style>
