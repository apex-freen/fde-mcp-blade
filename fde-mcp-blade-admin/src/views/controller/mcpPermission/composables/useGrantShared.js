// ==========================================
// MCP 授权（设备类 / 服务类）两个页面的共用逻辑
// 内容：抽屉与当前被授权用户、该用户的授权记录、操作人、授权时间格式化
// ==========================================

import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'

// 当前登录用户，作为授权操作的执行人（授权页、复制权限弹窗、反向授权弹窗都用它）
export function useGrantOperator() {
  const userStore = useUserStore()
  return computed(() => {
    const info = userStore.userInfo || {}
    return {
      id: info.userId || info.user_id || 1,
      name: info.userName || info.user_name || info.nickName || 'admin'
    }
  })
}

// 拉取某个用户的生效授权记录（按用户维度，供复制权限、反向授权使用）
// - grantType 传了就只取该维度
// - grant_type / grant_sta 服务端已生效，这里不再做客户端兜底过滤
// - 出参：授权行数组
export async function fetchGrantsOfUser(userId, grantType) {
  const params = {
    gis_user_id: userId,
    grant_sta: '1',
    page: 1,
    page_size: 1000,
    order_by: 'grant_id',
    is_asc: true
  }
  if (grantType) params.grant_type = grantType
  const res = await api.gisGrant.getGrantList(params)
  const data = res?.data || res || {}
  return data.rows || []
}

// 授权行的唯一标识：同类型 + 同对象 + 同功能 视为同一条授权（用于幂等去重）
export function grantRowKey(grant) {
  return [grant.grant_type, grant.eqp_id || 0, grant.eqp_name || '', grant.fun_key || ''].join('|')
}

export function useGrantShared() {
  const { t } = useI18n()

  // 抽屉
  const drawerVisible = ref(false)
  const currentUser = ref(null)

  // 当前用户在本次页面维度下的全部授权记录（未按类型过滤，供页面各自筛选）
  const userGrants = ref([])

  const operator = useGrantOperator()

  // 打开抽屉：清空上一次的授权记录，避免串数据
  function openDrawer(user) {
    currentUser.value = user
    userGrants.value = []
    drawerVisible.value = true
  }

  // 拉取该用户在指定维度（device / service）下的生效授权记录
  // grant_type / grant_sta 服务端已生效，返回即目标维度，不再做客户端兜底过滤
  async function fetchUserGrants(grantType) {
    try {
      const res = await api.gisGrant.getGrantList({
        gis_user_id: currentUser.value.user_id,
        grant_type: grantType,
        grant_sta: '1',
        page: 1,
        page_size: 1000,
        order_by: 'grant_id',
        is_asc: true
      })
      const data = res?.data || res || {}
      userGrants.value = data.rows || []
    } catch (e) {
      console.error(t('mcpPermission.fetchGrantFailed'), e)
      userGrants.value = []
    }
    return userGrants.value
  }

  // 格式化授权时间（null 显示为「永久」）
  function formatGrantTime(time) {
    if (!time) return t('mcpPermission.permanent')
    const d = new Date(time)
    if (isNaN(d.getTime())) return '-'
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return {
    drawerVisible,
    currentUser,
    userGrants,
    operator,
    openDrawer,
    fetchUserGrants,
    formatGrantTime
  }
}
