<template>
  <a-modal
    :visible="visible"
    :title="$t('mcpPermission.selectUserTitle')"
    :ok-text="$t('mcpPermission.confirmGrant')"
    :cancel-text="$t('commonTable.cancel')"
    :ok-button-props="{ disabled: !canGrant, loading: granting }"
    :cancel-button-props="{ disabled: granting }"
    :closable="!granting"
    :mask-closable="!granting"
    width="640px"
    unmount-on-close
    @ok="handleGrant"
    @cancel="handleClose"
  >
    <!-- 授权对象 -->
    <div class="target-bar">
      <template v-if="targetType === 'device'">
        <span class="label">{{ $t('mcpPermission.deviceName') }}：</span>
        <span>{{ target?.eqp_name }}</span>
        <span class="label" style="margin-left: 16px">{{ $t('mcpPermission.ip') }}：</span>
        <span>{{ target?.eqp_client_id }}</span>
      </template>
      <template v-else>
        <span class="label">{{ $t('mcpPermission.methodName') }}：</span>
        <span>{{ target?.name }}</span>
        <span class="label" style="margin-left: 16px">Title：</span>
        <span>{{ target?.title || '-' }}</span>
      </template>
    </div>

    <a-form :model="form" layout="vertical" style="margin-top: 16px">
      <a-form-item :label="$t('mcpPermission.copyTargetUsers')">
        <a-select
          v-model="userIds"
          multiple
          allow-search
          allow-clear
          :loading="userLoading"
          :placeholder="$t('mcpPermission.selectUsersPlaceholder')"
          :options="userOptions"
          :max-tag-count="6"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item>
        <div class="grant-preview">
          <div class="tip">{{ grantScopeTip }}</div>
          <div class="tip">{{ $t('mcpPermission.grantedUserTip') }}</div>
          <div v-if="granting" class="progress">
            {{ $t('mcpPermission.grantToUsersProgress', { done: doneCount, total: totalCount }) }}
          </div>
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
// 反向视角：按对象（设备 / 插件服务）给多个用户授权
// 范围约定：本入口只做「整对象授权」——授予该设备全部功能 / 该插件全部方法（fun_key='*'）；
//          单个功能的精细授权仍走「按用户授权」视角。
// 已授权的用户在选择器里置灰并标记，避免重复授权（后端对重复授权会 400）。
// 性能说明：后端暂无批量写入接口，这里串行逐条 create（见 62 §五 Q7）。
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import {
  AGENT_ID_DEFAULT,
  OUT_AGENT_ID_DEFAULT
} from '@/api/modules/mcpPermission'
import { useGrantOperator } from '../composables/useGrantShared'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // device = 设备类；service = 服务类
  targetType: { type: String, default: 'device' },
  // 对象记录：device 用 eqp_id / eqp_name / eqp_client_id；service 用 name / title / server_url
  target: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'done'])

const { t } = useI18n()
const operator = useGrantOperator()

const form = reactive({})
const userIds = ref([])
const userOptions = ref([])
const userLoading = ref(false)
const grantedUserIds = ref([])

const granting = ref(false)
const doneCount = ref(0)
const totalCount = ref(0)

const hasServerUrl = computed(() =>
  props.targetType !== 'service' || !!props.target?.server_url
)

const canGrant = computed(() =>
  userIds.value.length > 0 && !granting.value && hasServerUrl.value
)

const grantScopeTip = computed(() =>
  props.targetType === 'device'
    ? t('mcpPermission.confirmGrantToUsersDevice')
    : t('mcpPermission.confirmGrantToUsersService')
)

// 已授权该对象的用户 id
// grant_sta / eqp_id / target_name 均由服务端过滤，返回即目标集合
async function fetchGrantedUserIds() {
  const params = {
    grant_sta: '1',
    grant_type: props.targetType,
    page: 1,
    page_size: 1000,
    order_by: 'grant_id',
    is_asc: true
  }
  if (props.targetType === 'device') params.eqp_id = props.target?.eqp_id
  else params.target_name = props.target?.name

  try {
    const res = await api.mcpPermission.getGrantList(params)
    const data = res?.data || res || {}
    grantedUserIds.value = (data.rows || []).map(g => g.gis_user_id)
  } catch (e) {
    grantedUserIds.value = []
  }
}

// 用户下拉：仅启用用户；已授权的置灰并加标记
async function fetchUsers() {
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
    userOptions.value = rows.map(u => {
      const granted = grantedUserIds.value.includes(u.user_id)
      const name = u.nick_name ? `${u.nick_name}（${u.user_name}）` : u.user_name
      return {
        label: granted ? `${name} · ${t('mcpPermission.alreadyGranted')}` : name,
        value: u.user_id,
        disabled: granted
      }
    })
  } catch (e) {
    Message.error(t('mcpPermission.fetchUserFailed'))
  } finally {
    userLoading.value = false
  }
}

function buildCreatePayload(userId) {
  const op = operator.value
  const payload = {
    gis_user_id: userId,
    gis_agent_id: AGENT_ID_DEFAULT,
    out_agent_id: OUT_AGENT_ID_DEFAULT,
    grant_type: props.targetType,
    eqp_fun_id: 0,
    fun_key: '*',
    grant_user_id: op.id,
    // grant_user_role 已移除（65 文档 §6.1）：不再作为入参，后端按登录人实时查 RBAC
    created_by: op.name,
    updated_by: op.name
  }
  if (props.targetType === 'device') {
    payload.target_name = ''
    payload.eqp_id = props.target.eqp_id
    payload.eqp_name = props.target.eqp_name
    payload.eqp_client_id = props.target.eqp_client_id
  } else {
    payload.target_name = props.target.name
    payload.eqp_id = 0
    payload.eqp_name = props.target.name
    payload.eqp_client_id = ''
  }
  return payload
}

async function runGrant() {
  granting.value = true
  doneCount.value = 0
  totalCount.value = userIds.value.length

  let success = 0
  let fail = 0

  try {
    for (const userId of userIds.value) {
      try {
        await api.mcpPermission.grantAll(buildCreatePayload(userId))
        success++
      } catch (e) {
        fail++
      }
      doneCount.value++
    }

    const summary = t('mcpPermission.grantToUsersDone', { success, fail })
    if (fail > 0) Message.warning(summary)
    else Message.success(summary)

    emit('done')
    emit('update:visible', false)
  } finally {
    granting.value = false
  }
}

function handleGrant() {
  if (!hasServerUrl.value) {
    Message.warning(t('mcpPermission.noServiceUrl'))
    return
  }
  if (userIds.value.length === 0) {
    Message.warning(t('mcpPermission.selectUsersRequired'))
    return
  }
  runGrant()
}

function handleClose() {
  if (granting.value) return
  emit('update:visible', false)
}

// 打开时重置并加载：先拿已授权用户，再生成下拉选项
watch(
  () => props.visible,
  async (val) => {
    if (!val) return
    userIds.value = []
    grantedUserIds.value = []
    doneCount.value = 0
    totalCount.value = 0
    if (!hasServerUrl.value) return
    await fetchGrantedUserIds()
    await fetchUsers()
  }
)
</script>

<style scoped>
.target-bar {
  padding: 10px 12px;
  background: var(--color-fill-2);
  border-radius: 6px;
}

.target-bar .label {
  color: var(--color-text-3);
  margin-right: 4px;
}

.grant-preview {
  line-height: 22px;
}

.grant-preview .tip {
  color: var(--color-text-3);
  font-size: 12px;
}

.grant-preview .progress {
  color: var(--color-text-3);
  font-size: 12px;
}
</style>
