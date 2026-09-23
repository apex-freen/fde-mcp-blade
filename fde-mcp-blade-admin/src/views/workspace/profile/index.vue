<template>
  <div class="profile-page">
    <!-- 1016 §4.1 v1.x：个人中心 3 个明细 Tab 已迁出为独立页
         （mine/call、mine/grant、mine/token、mine/message，后端菜单制），
         本页只留账号资料与安全设置。 -->
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
  </div>
</template>

<script setup>
/**
 * 个人中心（1016 §4.1）：只留账号资料与安全设置。
 * 明细列表（我的调用/授权/令牌/消息）已迁出为独立菜单页，勿在本地重建。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
// ⚠️ 编辑资料走 updateUserProfile（PUT /biz/gis_user/{id}/profile，仅本人、只认 2 字段），
//    不要换回 updateGisUser —— 那是管理员的整表单提交接口，会 403 / 422。
import { getGisUserById, updateUserProfile, changePassword } from '@/api/modules/gisUser'
import { isSuperAdmin } from '@/utils/permission'

const { t } = useI18n()
const userStore = useUserStore()
const appStore = useAppStore()

// ---------- 当前用户数据 ----------
const userInfo = computed(() => userStore.userInfo || {})

// 超级管理员由后端下发的哨兵值判定（roles 含 admin / permissions 含 *:*:*），
// 此时后端无需返回全部角色名，这里统一收敛成一个标识
const roles = computed(() => {
  if (isSuperAdmin()) return [t('profile.superAdmin')]
  return userStore.roles || []
})

const fullUser = ref({})

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

.pref-item {
  margin-bottom: 16px;
}

.pref-label {
  font-size: 14px;
  color: var(--color-text-2);
  margin-bottom: 8px;
}
</style>
