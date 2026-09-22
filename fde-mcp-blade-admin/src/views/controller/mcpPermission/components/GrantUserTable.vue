<template>
  <div class="grant-user-table">
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
          <a-table-column :title="$t('commonTable.operation')" :width="260" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini" wrap>
                <a-button
                  type="primary"
                  size="small"
                  :disabled="record.status === '1'"
                  @click="emit('grant', record)"
                >
                  <template #icon><icon-safe /></template>
                  {{ buttonText }}
                </a-button>
                <a-button
                  size="small"
                  :disabled="record.status === '1'"
                  @click="openCopy(record)"
                >
                  <template #icon><icon-copy /></template>
                  {{ $t('mcpPermission.copyGrant') }}
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 权限复制：以某个用户为模板，把其永久授权复制给其他用户 -->
    <CopyGrantModal v-model:visible="copyVisible" :source-user="copySource" />
  </div>
</template>

<script setup>
// 用户列表（搜索 + 分页 + 「授权」「复制权限」入口）
// 设备类授权页与服务类授权页共用，点击「授权」后由父页面打开对应抽屉；
// 「复制权限」在本组件内自闭环（复制的是该用户的全部永久授权，与当前页面维度无关）
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import CopyGrantModal from './CopyGrantModal.vue'

const props = defineProps({
  // 操作列按钮文案，为空时回落到「MCP授权」
  actionText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['grant'])

const { t } = useI18n()

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

const buttonText = computed(() => props.actionText || t('mcpPermission.mcpGrant'))

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

// ========== 权限复制 ==========
const copyVisible = ref(false)
const copySource = ref(null)

function openCopy(user) {
  copySource.value = user
  copyVisible.value = true
}

onMounted(() => {
  fetchUserList()
})
</script>
