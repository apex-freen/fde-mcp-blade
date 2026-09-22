<template>
  <a-modal
    :visible="visible"
    :title="$t('mcpPermission.copyGrant')"
    :ok-text="$t('mcpPermission.copyConfirm')"
    :cancel-text="$t('commonTable.cancel')"
    :ok-button-props="{ disabled: !canCopy, loading: copying }"
    :cancel-button-props="{ disabled: copying }"
    :closable="!copying"
    :mask-closable="!copying"
    width="640px"
    unmount-on-close
    @ok="handleCopy"
    @cancel="handleClose"
  >
    <!-- 源用户 -->
    <div class="copy-source">
      <span class="label">{{ $t('mcpPermission.copySourceLabel') }}：</span>
      <span>{{ sourceUser?.user_name }}（{{ sourceUser?.nick_name }}）</span>
    </div>

    <a-form :model="form" layout="vertical" style="margin-top: 16px">
      <a-form-item :label="$t('mcpPermission.copyDimension')">
        <a-checkbox-group v-model="dimensions">
          <a-checkbox value="device">{{ $t('mcpPermission.deviceGrant') }}</a-checkbox>
          <a-checkbox value="service">{{ $t('mcpPermission.serviceGrant') }}</a-checkbox>
        </a-checkbox-group>
      </a-form-item>

      <a-form-item :label="$t('mcpPermission.copyTargetUsers')">
        <a-select
          v-model="targetUserIds"
          multiple
          allow-search
          allow-clear
          :loading="userLoading"
          :placeholder="$t('mcpPermission.copyTargetPlaceholder')"
          :options="targetUserOptions"
          :max-tag-count="6"
          style="width: 100%"
        />
      </a-form-item>

      <!-- 预览：将复制多少条、跳过多少条 -->
      <a-form-item>
        <div class="copy-preview">
          <div v-if="sourceLoading">{{ $t('commonTable.loading') }}</div>
          <template v-else>
            <div v-if="copyableGrants.length > 0">
              {{ $t('mcpPermission.copyPreview', { device: deviceCount, service: serviceCount }) }}
            </div>
            <div v-else class="warn">{{ $t('mcpPermission.copyNoSource') }}</div>
            <div v-if="skippedByExpiry > 0" class="warn">
              {{ $t('mcpPermission.copySkipExpired', { n: skippedByExpiry }) }}
            </div>
            <div class="tip">{{ $t('mcpPermission.copyAppendTip') }}</div>
            <div v-if="copying" class="progress">
              {{ $t('mcpPermission.copyProgress', { done: doneCount, total: totalCount }) }}
            </div>
          </template>
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
// 权限复制：把源用户的「永久授权」复制给一个或多个目标用户
// 约定（见 60/61 文档）：
//   1. 只复制永久授权（grant_expired_time 为空），带到期时间的一律跳过并在弹窗内提示；
//   2. 只追加不覆盖：目标用户已有的同对象同功能授权跳过，绝不删除已有授权；
//   3. 逐行原样复制：后端不存在通配行（整机/整服务授权就是每个功能、每个方法一行），
//      因此 fun_key / eqp_fun_id 都带真实值，直接搬过去即可；
//   4. 目标用户不含源用户本人；仅可复制到启用状态的用户。
// 性能说明：后端暂未提供批量写入接口，这里是「串行逐条 create」+ 进度提示；
//          拿到 POST /biz/gis_grant/batch_create 后可整体替换（见 62 §五 Q7）。
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import { api } from '@/api'
import {
  AGENT_ID_DEFAULT,
  OUT_AGENT_ID_DEFAULT
} from '@/api/modules/mcpPermission'
import {
  useGrantOperator,
  fetchGrantsOfUser,
  grantRowKey
} from '../composables/useGrantShared'

const props = defineProps({
  visible: { type: Boolean, default: false },
  sourceUser: { type: Object, default: null }
})

const emit = defineEmits(['update:visible'])

const { t } = useI18n()
const operator = useGrantOperator()

// 单次写入条数的提示阈值
const LARGE_COPY_THRESHOLD = 100

const form = reactive({})
const dimensions = ref(['device', 'service'])
const targetUserIds = ref([])

const userLoading = ref(false)
const targetUserOptions = ref([])

const sourceLoading = ref(false)
const sourceGrants = ref([])
const skippedByExpiry = ref(0)

const copying = ref(false)
const doneCount = ref(0)
const totalCount = ref(0)

// 勾选维度内可复制的授权行
const copyableGrants = computed(() =>
  sourceGrants.value.filter(g => dimensions.value.includes(g.grant_type))
)
const deviceCount = computed(() => copyableGrants.value.filter(g => g.grant_type === 'device').length)
const serviceCount = computed(() => copyableGrants.value.filter(g => g.grant_type === 'service').length)
const canCopy = computed(() =>
  copyableGrants.value.length > 0 && targetUserIds.value.length > 0 && !copying.value
)

// 目标用户下拉：仅启用用户，排除源用户本人
async function fetchTargetUsers() {
  userLoading.value = true
  try {
    const res = await api.gisUser.getGisUserList({
      status: '0',
      page: 1,
      page_size: 500,
      order_by: 'user_id',
      is_asc: true
    })
    const data = res?.data || res || {}
    const rows = data.rows || []
    targetUserOptions.value = rows
      .filter(u => u.user_id !== props.sourceUser?.user_id)
      .map(u => ({
        label: u.nick_name ? `${u.nick_name}（${u.user_name}）` : u.user_name,
        value: u.user_id
      }))
  } catch (e) {
    Message.error(t('mcpPermission.fetchUserFailed'))
  } finally {
    userLoading.value = false
  }
}

// 源用户可复制的授权：生效中且永久
async function fetchSourceGrants() {
  if (!props.sourceUser?.user_id) return
  sourceLoading.value = true
  try {
    const rows = await fetchGrantsOfUser(props.sourceUser.user_id)
    const permanent = rows.filter(g => !g.grant_expired_time)
    skippedByExpiry.value = rows.length - permanent.length
    sourceGrants.value = permanent
  } catch (e) {
    Message.error(t('mcpPermission.fetchGrantFailed'))
    sourceGrants.value = []
    skippedByExpiry.value = 0
  } finally {
    sourceLoading.value = false
  }
}

// 单条授权的写入体：把源行搬到目标用户名下，操作人记为当前登录用户
function buildCreatePayload(grant, targetUserId) {
  const op = operator.value
  const payload = {
    gis_user_id: targetUserId,
    gis_agent_id: AGENT_ID_DEFAULT,
    out_agent_id: OUT_AGENT_ID_DEFAULT,
    grant_type: grant.grant_type,
    eqp_id: grant.eqp_id || 0,
    eqp_name: grant.eqp_name,
    eqp_fun_id: grant.eqp_fun_id || 0,
    fun_key: grant.fun_key,
    grant_user_id: op.id,
    // grant_user_role 已移除（65 文档 §6.1）：不再作为入参，后端按登录人实时查 RBAC
    created_by: op.name,
    updated_by: op.name
  }
  if (grant.grant_type === 'service') {
    // service 必填插件名，eqp_client_id 落库传空串（57 §三#3）
    payload.target_name = grant.target_name || grant.eqp_name
    payload.eqp_client_id = ''
  } else {
    payload.target_name = ''
    payload.eqp_client_id = grant.eqp_client_id || ''
  }
  // 源授权若带未来生效时间则一并带上；到期时间不复制（已在源数据处过滤）
  if (grant.grant_started_time) payload.grant_started_time = grant.grant_started_time
  return payload
}

// 串行写入：逐目标用户、逐条授权，重复的跳过
async function runCopy() {
  copying.value = true
  doneCount.value = 0
  totalCount.value = copyableGrants.value.length * targetUserIds.value.length

  let success = 0
  let skip = 0
  let fail = 0

  try {
    for (const targetUserId of targetUserIds.value) {
      // 目标用户已有的生效授权，用于去重（后端对重复授权会 400）
      const existing = await fetchGrantsOfUser(targetUserId).catch(() => [])
      const existKeys = new Set(existing.map(grantRowKey))

      for (const grant of copyableGrants.value) {
        const key = grantRowKey(grant)
        if (existKeys.has(key)) {
          skip++
        } else {
          try {
            await api.mcpPermission.createGrant(buildCreatePayload(grant, targetUserId))
            existKeys.add(key)
            success++
          } catch (e) {
            fail++
          }
        }
        doneCount.value++
      }
    }

    const summary = t('mcpPermission.copyDone', { success, skip, fail })
    if (fail > 0) Message.warning(summary)
    else Message.success(summary)

    emit('update:visible', false)
  } finally {
    copying.value = false
  }
}

function handleCopy() {
  if (copyableGrants.value.length === 0) {
    Message.warning(t('mcpPermission.copyNoSource'))
    return
  }
  if (targetUserIds.value.length === 0) {
    Message.warning(t('mcpPermission.copyNoTarget'))
    return
  }
  const total = copyableGrants.value.length * targetUserIds.value.length
  if (total > LARGE_COPY_THRESHOLD) {
    Modal.confirm({
      title: t('mcpPermission.copyGrant'),
      content: t('mcpPermission.copyLargeConfirm', { n: total }),
      okText: t('mcpPermission.copyConfirm'),
      cancelText: t('commonTable.cancel'),
      onOk: () => runCopy()
    })
    return
  }
  runCopy()
}

function handleClose() {
  if (copying.value) return
  emit('update:visible', false)
}

// 每次打开重新取源授权与目标用户，避免复用上一次的数据
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    dimensions.value = ['device', 'service']
    targetUserIds.value = []
    sourceGrants.value = []
    skippedByExpiry.value = 0
    doneCount.value = 0
    totalCount.value = 0
    fetchTargetUsers()
    fetchSourceGrants()
  }
)
</script>

<style scoped>
.copy-source {
  padding: 10px 12px;
  background: var(--color-fill-2);
  border-radius: 6px;
}

.copy-source .label {
  color: var(--color-text-3);
  margin-right: 4px;
}

.copy-preview {
  line-height: 22px;
  color: var(--color-text-2);
}

.copy-preview .warn {
  color: rgb(var(--warning-6));
}

.copy-preview .tip {
  color: var(--color-text-3);
  font-size: 12px;
}

.copy-preview .progress {
  color: var(--color-text-3);
  font-size: 12px;
}
</style>
