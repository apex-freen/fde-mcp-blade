<template>
  <div class="token-index-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="user_name" :label="$t('token.username')">
          <a-input
            v-model="searchForm.user_name"
            :placeholder="$t('token.usernamePlaceholder')"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item field="status" :label="$t('token.status')">
          <a-select
            v-model="searchForm.status"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
          >
            <a-option value="active">{{ $t('token.active') }}</a-option>
            <a-option value="revoked">{{ $t('token.revoked') }}</a-option>
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
          {{ $t('token.createToken') }}
        </a-button>
      </div>

      <a-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('token.id')" data-index="id" :width="70" />
          <a-table-column :title="$t('token.tokenPrefix')" data-index="token_prefix" :width="180" />
          <a-table-column :title="$t('token.tokenName')" data-index="token_name" :width="160" />
          <a-table-column :title="$t('token.bindUser')" data-index="user_name" :width="130" />
          <a-table-column :title="$t('token.timeType')" :width="120">
            <template #cell="{ record }">
              <a-tag v-if="record.token_time_unit === 'permanent'" color="arcoblue">{{ $t('token.permanent') }}</a-tag>
              <a-tag v-else-if="record.token_time_unit === 'monthly'" color="purple">{{ $t('token.monthly') }}</a-tag>
              <a-tag v-else color="orange">{{ $t('token.custom') }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.status')" data-index="status" :width="100">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'active' ? 'green' : 'red'">
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
          <a-table-column :title="$t('commonTable.operation')" :width="220" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-tooltip :content="$t('token.regenerateHint')">
                  <a-button
                    type="text"
                    size="small"
                    :disabled="record.status === 'revoked'"
                    @click="handleRegenerate(record)"
                  >
                    <template #icon><icon-sync /></template>
                    {{ $t('token.regenerate') }}
                  </a-button>
                </a-tooltip>
                <a-popconfirm
                  v-if="record.status === 'active'"
                  :content="$t('token.revokeConfirm')"
                  position="br"
                  @ok="handleRevoke(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    <template #icon><icon-stop /></template>
                    {{ $t('token.revoke') }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 创建令牌弹窗 -->
    <a-modal
      v-model:visible="createModalVisible"
      :title="isRegenerate ? $t('token.regenerateTitle') : $t('token.createTitle')"
      :ok-text="$t('token.confirmCreate')"
      :cancel-text="$t('token.cancel')"
      width="520px"
      @ok="handleCreateSubmit"
      @cancel="createModalVisible = false"
    >
      <a-form
        ref="createFormRef"
        :model="createForm"
        :rules="createFormRules"
        layout="vertical"
      >
        <a-form-item field="token_name" :label="$t('token.tokenNameLabel')">
          <a-input v-model="createForm.token_name" :placeholder="$t('token.tokenNamePlaceholder')" />
        </a-form-item>
        <a-form-item field="target_user_id" :label="$t('token.bindUserLabel')">
          <!-- 远程搜索下拉：数据源是 picker，不是本地全量列表（见 script 段的实现纪律） -->
          <a-select
            v-model="createForm.target_user_id"
            :placeholder="$t('token.bindUserPlaceholder')"
            :loading="userSelectLoading"
            allow-search
            :filter-option="false"
            :search-delay="300"
            :options="userOptions"
            :fallback-option="userFallbackOption"
            @search="handleUserSearch"
            @popup-visible-change="handleUserPopupToggle"
          />
        </a-form-item>
        <!-- 所选绑定用户非云端用户时提前警示 -->
        <a-alert
          v-if="selectedBindUser && selectedBindUser.enable_cloud !== '1'"
          type="warning"
          style="margin-bottom: 16px"
        >
          {{ $t('token.nonCloudWarning') }}
        </a-alert>
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

    <!-- 创建成功弹窗：展示完整令牌 + MCP 配置 + 二维码 -->
    <a-modal
      v-model:visible="successModalVisible"
      :title="$t('token.createSuccessTitle')"
      :ok-text="$t('token.savedClose')"
      :cancel-text="$t('token.close')"
      :hide-cancel="false"
      :simple-footer="false"
      :mask-closable="false"
      unmount-on-close
      width="1200px"
      @ok="successModalVisible = false"
      @cancel="successModalVisible = false"
    >
      <template #footer>
        <a-space>
          <a-button @click="successModalVisible = false">{{ $t('token.close') }}</a-button>
          <a-button type="primary" @click="handleCopyToken">{{ $t('token.copyToken') }}</a-button>
          <a-button type="primary" status="warning" @click="handleCopyMcpConfig('local')">{{ $t('token.copyMcpConfigLocal') }}</a-button>
          <a-button type="primary" status="warning" @click="handleCopyMcpConfig('cloud')" :disabled="!createdTokenInfo.mcpCloudQrCode">{{ $t('token.copyMcpConfigCloud') }}</a-button>
          <a-button type="primary" status="success" @click="handleDownloadQrCode(qrCanvasRef, 'local')">{{ $t('token.downloadQrCodeLocal') }}</a-button>
          <a-button type="primary" status="success" @click="handleDownloadQrCode(cloudQrCanvasRef, 'cloud')" :disabled="!createdTokenInfo.mcpCloudQrCode">{{ $t('token.downloadQrCodeCloud') }}</a-button>
          <a-button type="primary" status="success" @click="successModalVisible = false">{{ $t('token.savedClose') }}</a-button>
        </a-space>
      </template>
      <div style="padding: 8px 0">
        <a-alert type="warning" style="margin-bottom: 16px">
          <span style="font-weight: 600">{{ $t('token.warningText') }}</span>{{ $t('token.saveNow') }}
        </a-alert>

        <!-- 三列布局：令牌信息 / 本地 MCP / 云端 MCP -->
        <div class="token-modal-layout">
          <!-- 第一列：令牌信息 -->
          <a-form :model="{}" layout="vertical" class="token-modal-col">
            <div class="token-modal-section-title">{{ $t('token.tokenInfo') }}</div>
            <a-form-item :label="$t('token.tokenNameLabel')">
              <a-input :model-value="createdTokenInfo.token_name" readonly />
            </a-form-item>
            <a-form-item :label="$t('token.tokenPrefix')">
              <a-input :model-value="createdTokenInfo.token_prefix" readonly />
            </a-form-item>
            <a-form-item :label="$t('token.bindUserLabel')">
              <a-input :model-value="createdTokenInfo.user_name" readonly />
            </a-form-item>
            <a-form-item :label="$t('token.expiresAt')">
              <a-input :model-value="createdTokenInfo.expires_at || $t('token.permanentValid')" readonly />
            </a-form-item>
            <a-form-item :label="$t('token.tokenLabel')">
              <a-textarea
                :model-value="createdTokenInfo.token"
                readonly
                :auto-size="{ minRows: 4, maxRows: 4 }"
                style="font-family: monospace; font-size: 12px"
              />
            </a-form-item>
          </a-form>

          <!-- 第二列：本地 MCP -->
          <div class="token-modal-col">
            <div class="token-modal-section-title">{{ $t('token.mcpConfigLocal') }}</div>
            <div class="token-modal-col-label">{{ $t('token.mcpConfigJson') }}</div>
            <a-textarea
              :model-value="mcpConfigJsonText"
              readonly
              :auto-size="{ minRows: 8, maxRows: 8 }"
              style="font-family: monospace; font-size: 12px"
            />
            <a-alert v-if="mcpUrlAdapted" type="success" style="margin-top: 8px">
              {{ $t('token.mcpUrlAdapted') }}
            </a-alert>
            <div class="token-modal-qr-box">
              <div class="token-modal-qr-label">{{ $t('token.qrCodeLocalTitle') }}</div>
              <div class="token-modal-qr-wrapper">
                <canvas ref="qrCanvasRef" width="512" height="512"></canvas>
              </div>
            </div>
          </div>

          <!-- 第三列：云端 MCP -->
          <div class="token-modal-col">
            <div class="token-modal-section-title">{{ $t('token.mcpConfigCloud') }}</div>
            <template v-if="createdTokenInfo.mcpCloudQrCode">
              <div class="token-modal-col-label">{{ $t('token.mcpConfigJson') }}</div>
              <a-textarea
                :model-value="cloudMcpConfigJsonText"
                readonly
                :auto-size="{ minRows: 8, maxRows: 8 }"
                style="font-family: monospace; font-size: 12px"
              />
              <div class="token-modal-qr-box">
                <div class="token-modal-qr-label">{{ $t('token.qrCodeCloudTitle') }}</div>
                <div class="token-modal-qr-wrapper">
                  <canvas ref="cloudQrCanvasRef" width="320" height="320"></canvas>
                </div>
              </div>
            </template>
            <a-empty v-else :description="$t('token.cloudUnavailable')" />
          </div>
        </div>
        <div class="token-modal-qr-tip">{{ $t('token.qrCodeHint') }}</div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'
import QRCode from 'qrcode'

const { t } = useI18n()

// ==================== 搜索相关 ====================
const searchForm = reactive({
  user_name: '',
  status: undefined
})

const handleSearch = () => {
  pagination.current = 1
  fetchTokenList()
}

const handleReset = () => {
  searchForm.user_name = ''
  searchForm.status = undefined
  pagination.current = 1
  fetchTokenList()
}

// ==================== 表格相关 ====================
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

const columns = []

const handlePageChange = (page) => {
  pagination.current = page
  fetchTokenList()
}

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  fetchTokenList()
}

const fetchTokenList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize
    }
    if (searchForm.user_name) {
      params.user_name = searchForm.user_name
    }
    const res = await api.token.getTokenList(params)
    let rows = res.rows || res.data?.rows || []
    const total = res.total || res.data?.total || 0

    // 前端按状态筛选（后端未提供 status 参数）
    if (searchForm.status) {
      rows = rows.filter((r) => r.status === searchForm.status)
    }

    tableData.value = rows
    pagination.total = searchForm.status ? rows.length : total
  } catch (e) {
    console.error(t('token.fetchFailed') + ':', e)
  } finally {
    loading.value = false
  }
}

// ==================== 创建令牌弹窗 ====================
const createModalVisible = ref(false)
const isRegenerate = ref(false)
const createFormRef = ref(null)

const getDefaultCreateForm = () => ({
  token_name: '',
  target_user_id: undefined,
  token_time_unit: 'permanent',
  expiration_hours: 24
})

const createForm = reactive(getDefaultCreateForm())

const createFormRules = {
  token_name: [
    { required: true, message: t('token.nameRequired') }
  ],
  target_user_id: [
    { required: true, message: t('token.userRequired') }
  ],
  token_time_unit: [
    { required: true, message: t('token.timeUnitRequired') }
  ],
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

const handleAdd = () => {
  isRegenerate.value = false
  Object.assign(createForm, getDefaultCreateForm())
  createModalVisible.value = true
}

const handleRegenerate = async (record) => {
  isRegenerate.value = true

  // 令牌列表只回 `user_name`（无 user_id），要回填下拉必须反查 user_id。
  // ⚠️ 不能再用本地 userList.find —— 改远程搜索后本地不再持有全量列表。
  //    改为回 picker 按用户名精确匹配；查不到就留空，让用户自己重选
  //    （下拉已能搜到全量用户，不会卡住）。
  let targetUserId
  try {
    const res = await api.gisUser.getGisUserPicker({
      keyword: record.user_name,
      page: 1,
      page_size: 100
    })
    const hit = (res.rows || res.data?.rows || []).find((u) => u.user_name === record.user_name)
    if (hit) {
      targetUserId = hit.user_id
      userCache.set(hit.user_id, hit)   // 塞进缓存，保证标签能正常回显
    }
  } catch (e) {
    console.error('回填绑定用户失败:', e)
  }

  Object.assign(createForm, getDefaultCreateForm(), {
    token_name: record.token_name,
    target_user_id: targetUserId
  })
  createModalVisible.value = true
}

const handleCreateSubmit = async () => {
  try {
    await createFormRef.value?.validate()
  } catch (e) {
    return
  }

  try {
    const data = {
      token_name: createForm.token_name,
      token_time_unit: createForm.token_time_unit,
      target_user_id: createForm.target_user_id
    }
    if (createForm.token_time_unit === 'custom') {
      data.expiration_hours = createForm.expiration_hours || 24
    }

    const res = await api.token.createToken(data)
    const payload = res.data || res

    createModalVisible.value = false

    // MCP 地址归一化（见 normalizeMcpConfig 注释块）：按当前访问地址改写本地 MCP 的 host
    mcpUrlAdapted.value = false
    normalizeMcpConfig(payload)

    // 展示创建成功弹窗
    createdTokenInfo.value = {
      token: payload.token,
      token_prefix: payload.token_prefix,
      token_name: payload.token_name,
      user_name: payload.user_name,
      expires_at: payload.expires_at,
      mcp_config: payload.mcp_config || {},
      mcpLocalQrCode: payload.mcpLocalQrCode || '',
      mcpCloudQrCode: payload.mcpCloudQrCode || ''
    }
    successModalVisible.value = true

    nextTick(() => {
      renderQrCode()
    })

    fetchTokenList()
  } catch (e) {
    console.error(t('token.createFailed') + ':', e)
  }
}

// ==================== 创建成功弹窗 ====================
const successModalVisible = ref(false)
const qrCanvasRef = ref(null)
const cloudQrCanvasRef = ref(null)
const createdTokenInfo = ref({
  token: '',
  token_prefix: '',
  token_name: '',
  user_name: '',
  expires_at: null,
  mcp_config: {},
  mcpLocalQrCode: '',
  mcpCloudQrCode: ''
})

// ==================== MCP 地址归一化 ====================
// 后端拿不到外部访问拓扑（HTTPS 卸载、端口转发、反向代理端口），生成的 mcpLocal.url
// 可能与用户实际可达地址不一致。例：站点走 https://fde.agent-plat.com（443 反代 → 8018），
// 后端却生成 http://fde.agent-plat.com:8018/mcp —— 协议错、端口多余，贴进智能体连不上。
//
// 归一化规则：控制台能从哪个地址打开，同源的 /mcp 就从哪个地址可达 ——
// 直接以 window.location.origin 改写协议+域名+端口，保留路径与查询串。
//   - 本地部署 http://192.168.x.x:8018 控制台与 MCP 同源，origin 不变 → 无副作用；
//   - 反代/端口转发站点 https://fde.agent-plat.com → 自动变成 https://域名/mcp（无端口）；
//   - 云端配置（mcpCloud）指向云端中转、域名不同，不做改写；
//   - localhost / 127.0.0.1 访问（本地开发）跳过，避免覆盖后端下发的正确内网地址。
const mcpUrlAdapted = ref(false)

const rewriteOrigin = (raw) => {
  try {
    const u = new URL(raw)
    if (u.origin === window.location.origin) return raw
    return window.location.origin + u.pathname + u.search + u.hash
  } catch (e) {
    return raw
  }
}

const normalizeMcpConfig = (info) => {
  const loc = window.location
  // 本地开发（localhost 访问）不归一化
  if (loc.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(loc.hostname)) return
  // 后端结构是 mcpLocal.mcpServers.<server名>.url（可能还有别的包裹层），
  // 递归深改：凡是 mcpLocal 子树里挂了 http(s) url 属性的对象都按当前访问地址改写。
  // ⚠️ 只处理 mcpLocal；mcpCloud 指向云端中转、域名不同，不改写。
  const rewriteDeep = (node) => {
    if (!node || typeof node !== 'object') return
    for (const key of Object.keys(node)) {
      const v = node[key]
      if (!v || typeof v !== 'object') continue
      if (typeof v.url === 'string' && /^https?:\/\//i.test(v.url)) {
        const before = v.url
        v.url = rewriteOrigin(v.url)
        if (v.url !== before) mcpUrlAdapted.value = true
      }
      rewriteDeep(v)
    }
  }
  rewriteDeep(info.mcp_config?.mcpLocal)
  // 本地二维码内容若是 http(s) 链接，同样按当前访问地址改写
  if (info.mcpLocalQrCode && /^https?:\/\//i.test(info.mcpLocalQrCode)) {
    const before = info.mcpLocalQrCode
    info.mcpLocalQrCode = rewriteOrigin(info.mcpLocalQrCode)
    if (info.mcpLocalQrCode !== before) mcpUrlAdapted.value = true
  }
}

// MCP 配置 JSON 文本（格式化后的完整结构，供展示/复制）
const mcpConfigJsonText = computed(() => {
  const cfg = createdTokenInfo.value.mcp_config?.mcpLocal
  if (!cfg || Object.keys(cfg).length === 0) return ''
  return JSON.stringify(cfg, null, 2)
})

// 云端 MCP 配置 JSON 文本（格式化，供展示/复制；云端不可用时为空）
const cloudMcpConfigJsonText = computed(() => {
  const cfg = createdTokenInfo.value.mcp_config?.mcpCloud
  if (!cfg || Object.keys(cfg).length === 0) return ''
  return JSON.stringify(cfg, null, 2)
})

// 生成二维码：本地 + 云端各一张（编码后端返回的短引用 URL）
const renderQrCode = async () => {
  try {
    // 本地二维码：编码 mcpLocalQrCode
    if (qrCanvasRef.value && createdTokenInfo.value.mcpLocalQrCode) {
      await QRCode.toCanvas(qrCanvasRef.value, createdTokenInfo.value.mcpLocalQrCode, {
        width: qrCanvasRef.value.width,
        margin: 4,
        errorCorrectionLevel: 'L'
      })
    }
    // 云端二维码：编码 mcpCloudQrCode
    if (cloudQrCanvasRef.value && createdTokenInfo.value.mcpCloudQrCode) {
      await QRCode.toCanvas(cloudQrCanvasRef.value, createdTokenInfo.value.mcpCloudQrCode, {
        width: cloudQrCanvasRef.value.width,
        margin: 4,
        errorCorrectionLevel: 'L'
      })
    }
  } catch (e) {
    console.error('生成二维码失败:', e)
  }
}

// 下载二维码图片（tag: local=本地 / cloud=云端）
const handleDownloadQrCode = async (canvasRef, tag) => {
  if (!canvasRef?.value) return
  try {
    const link = document.createElement('a')
    link.download = `mcp-config-${tag}-${createdTokenInfo.value.token_prefix || 'apex'}.png`
    link.href = canvasRef.value.toDataURL('image/png')
    link.click()
    Message.success(t('token.qrDownloaded'))
  } catch (e) {
    console.error('下载二维码失败:', e)
    Message.error(t('common.error'))
  }
}

// 通用复制函数：优先使用 Clipboard API，失败则 fallback 到 execCommand
const copyTextToClipboard = async (text, successMsg, fallbackMsg) => {
  // 方式一：现代 Clipboard API（需要安全上下文 HTTPS/localhost）
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      Message.success(successMsg)
      return true
    } catch (e) {
      // 继续 fallback
    }
  }

  // 方式二：传统 execCommand + 临时 textarea（兼容 HTTP 等非安全上下文）
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.left = '-1000px'
    textarea.style.opacity = '0'
    textarea.readOnly = true
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (ok) {
      Message.success(successMsg)
      return true
    }
  } catch (e) {
    // 继续 fallback
  }

  // 方式三：都失败时，提示用户手动复制
  Message.info(fallbackMsg)
  return false
}

const handleCopyToken = async () => {
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
const handleCopyMcpConfig = async (type) => {
  const text = type === 'cloud' ? cloudMcpConfigJsonText.value : mcpConfigJsonText.value
  if (!text) {
    Message.warning(t('token.mcpEmpty'))
    return
  }
  await copyTextToClipboard(
    text,
    t('token.copiedMcp'),
    t('token.manualCopyMcp')
  )
}

// ==================== 撤销令牌 ====================
const handleRevoke = async (record) => {
  try {
    await api.token.revokeToken(record.id)
    Message.success(t('token.revokeSuccess'))
    fetchTokenList()
  } catch (e) {
    console.error('撤销令牌失败:', e)
    Message.error(e.msg || e?.data?.msg || t('token.revokeFailed'))
  }
}

// ==================== 用户下拉（picker 远程搜索）====================
//
// 数据源 = GET /biz/gis_user/picker（不挂权限点、登录即可），
// 替代原先的 getGisUserList({ page_size: 999 }) —— 那个写法会被后端静默夹到 100 条，
// 用户数超 100 时第 100 条之后的人**根本搜不到**（静默截断缺陷）。
//
// 四条实现纪律（见 1016 §5.1.1）：
//   1. `:filter-option="false"` 必须显式写 —— 否则 Arco 会在服务端结果上再筛一次，
//      出现「明明搜到了、列表却是空」的诡异现象；
//   2. `@search` 收到空串要回「第一页列表」，不要返回空；
//   3. `userFetchSeq` 丢弃过期响应 —— 不做的话慢请求后返回会覆盖新结果；
//   4. `userCache` 会话级**只增不减** —— 已选用户不在当前结果页时，
//      标签（fallback-option）与 enable_cloud 判断都靠它兜住。
const userCache = new Map()      // user_id -> 完整用户对象（含 enable_cloud）
const userOptions = ref([])      // a-select 用的 { label, value }
const userSelectLoading = ref(false)
let userFetchSeq = 0

const userLabel = (u) => `${u.user_name}（${u.nick_name || u.user_name}）`

// 当前选中的绑定用户（enable_cloud === '1' 表示云端用户，用于非云端用户警示）
// ⚠️ 必须查 userCache 而非 userOptions：已选用户可能已被后续搜索挤出结果页
const selectedBindUser = computed(() => userCache.get(createForm.target_user_id))

const toUserOption = (u) => {
  userCache.set(u.user_id, u)
  return { label: userLabel(u), value: u.user_id }
}

// 已选值不在当前结果页时的标签兜底（Arco fallback-option）
const userFallbackOption = (value) => {
  if (value === undefined || value === null || value === '') return { value, label: '' }
  const u = userCache.get(value)
  return { value, label: u ? userLabel(u) : `#${value}` }
}

const fetchUsers = async (keyword = '') => {
  const seq = ++userFetchSeq
  userSelectLoading.value = true
  try {
    const res = await api.gisUser.getGisUserPicker({ keyword, page: 1, page_size: 100 })
    if (seq !== userFetchSeq) return
    userOptions.value = (res.rows || res.data?.rows || []).map(toUserOption)
  } catch (e) {
    console.error('获取用户列表失败:', e)
  } finally {
    if (seq === userFetchSeq) userSelectLoading.value = false
  }
}

const handleUserSearch = (v) => fetchUsers(v || '')
const handleUserPopupToggle = (visible) => {
  if (visible) fetchUsers('')
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchTokenList()
})
</script>

<style lang="scss" scoped>
.token-index-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: flex-end;
  }
}
</style>

<!-- 全局样式：Modal 内容通过 Portal 挂载到 body，scoped 样式无法命中，必须使用全局样式 -->
<style lang="scss">
.token-modal-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  align-items: flex-start;
}

.token-modal-col {
  min-width: 0;
}

.token-modal-col-label {
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-1);
  margin: 0 0 8px;
}

.token-modal-qr-box {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.token-modal-qr-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-2);
  margin-bottom: 8px;
}

.token-modal-section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-1);
  margin: 4px 0 12px;
  padding-left: 8px;
  border-left: 3px solid var(--color-primary-5, #165dff);
}

.token-modal-qr-wrapper {
  width: 320px;
  height: 320px;
  padding: 8px;
  border: 1px solid var(--color-border-2, #e5e6eb);
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  canvas {
    display: block;
    max-width: 100%;
    max-height: 100%;
  }
}

.token-modal-qr-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-3, #86909c);
  text-align: center;
}
</style>
