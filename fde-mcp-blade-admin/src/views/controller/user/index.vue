<template>
  <!-- 左侧部门树 + 右侧搜索/表格（52 文档 §6.1），三段用 grid 定位，弹窗为 fixed 不参与布局 -->
  <div class="user-list-page">
    <a-card class="dept-card" :bordered="false">
      <div class="dept-card-title">{{ $t('user.deptFilter') }}</div>
      <a-spin :loading="deptLoading" style="width: 100%">
        <a-tree
          :data="deptTreeData"
          :selected-keys="selectedDeptKeys"
          block-node
          @select="handleDeptSelect"
        />
      </a-spin>
    </a-card>

    <!-- 搜索区域 -->
    <a-card class="search-card" :bordered="false">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="user_name" :label="$t('user.searchUser')">
          <a-input
            v-model="searchForm.user_name"
            :placeholder="$t('user.searchUserPlaceholder')"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item field="nick_name" :label="$t('user.nickname')">
          <a-input
            v-model="searchForm.nick_name"
            :placeholder="$t('user.nicknamePlaceholder')"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item field="user_phone" :label="$t('user.phone')">
          <a-input
            v-model="searchForm.user_phone"
            :placeholder="$t('user.phonePlaceholder')"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item field="status" :label="$t('commonTable.status')">
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

    <!-- 操作栏 + 表格 -->
    <a-card class="table-card" :bordered="false">
      <!-- 操作栏 -->
      <div class="table-toolbar">
        <a-button type="primary" @click="handleAdd">
          <template #icon><icon-plus /></template>
          {{ $t('user.addUser') }}
        </a-button>
      </div>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="user_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('user.username')" data-index="user_name" :width="120" />
          <!-- 姓名可空，为空时回退显示昵称；服务端不返回拼接值，前端自行回退（52 文档 §6.2） -->
          <a-table-column :title="$t('user.realName')" :width="120">
            <template #cell="{ record }">{{ record.real_name || record.nick_name || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('user.employeeNo')" :width="120">
            <template #cell="{ record }">{{ record.employee_no || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('user.nickname')" data-index="nick_name" :width="120" />
          <!-- 已隐藏：组名（group_name）列（保留代码，恢复时取消注释即可）
               65 文档 §5：后端已废弃 gis_user.group_name，不再参与任何权限/角色判定，
               也不要再把它当角色展示；建议下线该列 -->
          <!-- <a-table-column :title="$t('user.coreRole')" data-index="group_name" :width="100" /> -->
          <a-table-column :title="$t('user.enableCloud')" data-index="enable_cloud" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.enable_cloud === '1' ? 'arcoblue' : 'gray'">
                {{ record.enable_cloud === '1' ? $t('user.cloudTag') : $t('user.localTag') }}
              </a-tag>
            </template>
          </a-table-column>
          <!-- <a-table-column title="权限等级" data-index="user_perm_level" :width="100" /> -->
          <!-- 列表不返回部门名称，这里用部门接口做 dept_id → deptName 映射（52 文档 §4.1） -->
          <a-table-column :title="$t('user.dept')" :width="130">
            <template #cell="{ record }">{{ deptName(record.dept_id) }}</template>
          </a-table-column>
          <a-table-column :title="$t('user.phone')" :width="140">
            <template #cell="{ record }">{{ record.user_phone || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('user.email')" :width="190">
            <template #cell="{ record }">{{ record.user_email || '-' }}</template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.status')" data-index="status" :width="100">
            <template #cell="{ record }">
              <a-tag :color="record.status === '0' ? 'green' : 'red'">
                {{ record.status === '0' ? $t('commonTable.normal') : $t('commonTable.disabled') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.createTime')" data-index="created_time" :width="180">
            <template #cell="{ record }">
              {{ record.created_time ? record.created_time.replace('T', ' ').split('+')[0] : '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="420" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('commonTable.edit') }}
                </a-button>
                <!-- 已隐藏：智能体关联（保留代码，恢复时取消注释即可）
                <a-button type="text" size="small" @click="handleAgentAssociation(record)">
                  <template #icon><icon-robot /></template>
                  智能体关联
                </a-button>
                -->

                <a-button type="text" size="small" @click="handleAssignRole(record)">
                  <template #icon><icon-safe /></template>
                  分配权限组
                </a-button>

                <!-- 停用会立即撤销该用户全部登录会话（52 文档 §6.4#2），故必须二次确认 -->
                <a-popconfirm
                  v-if="record.status === '0'"
                  :content="$t('user.disableConfirm')"
                  position="br"
                  @ok="handleToggleStatus(record)"
                >
                  <a-button type="text" size="small" status="warning">
                    <template #icon><icon-lock /></template>
                    {{ $t('user.disableUser') }}
                  </a-button>
                </a-popconfirm>
                <a-button
                  v-else
                  type="text"
                  size="small"
                  status="success"
                  @click="handleToggleStatus(record)"
                >
                  <template #icon><icon-unlock /></template>
                  {{ $t('user.enableUser') }}
                </a-button>
                <a-button
                  v-if="hasPermission('controller:user:index')"
                  type="text"
                  size="small"
                  @click="handleResetPassword(record)"
                >
                  <template #icon><icon-refresh /></template>
                  重置密码
                </a-button>
                <!-- 已隐藏：删除（保留代码，恢复时取消注释即可）
                <a-popconfirm
                  :content="$t('user.deleteConfirm')"
                  position="br"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    <template #icon><icon-delete /></template>
                    {{ $t('commonTable.delete') }}
                  </a-button>
                </a-popconfirm>
                -->
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑用户弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? $t('user.editUser') : $t('user.addUser')"
      :ok-text="$t('commonTable.confirm')"
      :cancel-text="$t('commonTable.cancel')"
      width="520px"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
        @submit="handleSubmit"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="user_name" :label="$t('user.username')">
              <a-input v-model="formData.user_name" :placeholder="$t('user.searchUserPlaceholder')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="nick_name" :label="$t('user.nickname')">
              <a-input v-model="formData.nick_name" :placeholder="$t('user.nicknamePlaceholder')" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="real_name" :label="$t('user.realName')">
              <a-input v-model="formData.real_name" :placeholder="$t('user.realNamePlaceholder')" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="employee_no" :label="$t('user.employeeNo')">
              <!-- 工号唯一性由后端校验（非空重复返回 400「工号已存在」），前端只做提示 -->
              <a-input v-model="formData.employee_no" :placeholder="$t('user.employeeNoPlaceholder')" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="password" :label="$t('user.password')">
              <a-input-password
                v-model="formData.password"
                :placeholder="isEdit ? $t('user.passwordKeepHint') : $t('user.passwordRequired')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="confirmPassword" :label="$t('user.confirmPassword')">
              <a-input-password
                v-model="formData.confirmPassword"
                :placeholder="isEdit ? $t('user.passwordKeepHint') : $t('user.passwordRequired')"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <!-- 已隐藏：身份组名（group_name）表单项（保留代码，恢复时取消注释即可）
               65 文档 §5：后端已废弃 gis_user.group_name，不再参与任何权限/角色判定，
               身份改由「分配权限组」里的角色决定，表单不再要求填写 -->
          <!-- <a-col :span="12">
            <a-form-item field="group_name" :label="$t('user.groupName')">
              <a-select
                v-model="formData.group_name"
                :placeholder="$t('user.selectGroup')"
                allow-clear
              >
                <a-option value="admin">{{ $t('user.adminGroup') }}</a-option>
                <a-option value="user">{{ $t('user.userGroup') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col> -->
          <!-- 已隐藏：权限等级（保留代码，恢复时取消注释即可）
          <a-col :span="12">
            <a-form-item field="user_perm_level" :label="$t('user.permLevel')">
              <a-input v-model="formData.user_perm_level" :placeholder="$t('user.permLevelPlaceholder')" />
            </a-form-item>
          </a-col>
          -->
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="user_phone" :label="$t('user.phone')">
              <a-input v-model="formData.user_phone" :placeholder="$t('user.phonePlaceholder')" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="user_email" :label="$t('user.email')">
              <a-input v-model="formData.user_email" :placeholder="$t('user.emailPlaceholder')" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="dept_id" :label="$t('user.dept')">
              <!-- 「未分配」= 传 0（52 文档 §6.3）；已给出该选项，故不用 allow-clear -->
              <a-tree-select
                v-model="formData.dept_id"
                :data="deptSelectTreeData"
                :placeholder="$t('user.deptSelectPlaceholder')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="status" :label="$t('commonTable.status')">
              <a-radio-group v-model="formData.status">
                <a-radio value="0">{{ $t('commonTable.normal') }}</a-radio>
                <a-radio value="1">{{ $t('commonTable.disabled') }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="enable_cloud" :label="$t('user.enableCloud')">
              <a-switch
                v-model="formData.enable_cloud"
                :checked-value="'1'"
                :unchecked-value="'0'"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item field="user_desc" :label="$t('user.userDesc')">
          <a-textarea
            v-model="formData.user_desc"
            :placeholder="$t('user.userDescPlaceholder')"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            allow-clear
          />
        </a-form-item>
      </a-form>
    </a-modal>

    
    <!-- 重置密码弹窗（管理员重置，无需旧密码） -->
    <a-modal
      v-model:visible="resetPwdVisible"
      :title="`重置密码 - ${resetPwdTarget?.nick_name || resetPwdTarget?.user_name || ''}`"
      :ok-text="$t('commonTable.confirm')"
      :cancel-text="$t('commonTable.cancel')"
      width="440px"
      :mask-closable="false"
      :on-before-ok="handleResetPasswordSubmit"
    >
      <a-alert type="warning" style="margin-bottom: 16px">
        重置后旧密码立即失效，该用户将可以使用新密码登录。
      </a-alert>
      <a-form ref="resetPwdFormRef" :model="resetPwdForm" :rules="resetPwdRules" layout="vertical">
        <a-form-item field="newPassword" label="新密码">
          <a-input-password
            v-model="resetPwdForm.newPassword"
            placeholder="长度至少 6 位"
            allow-clear
          />
        </a-form-item>
        <a-form-item field="confirmPassword" label="确认新密码">
          <a-input-password
            v-model="resetPwdForm.confirmPassword"
            placeholder="请再次输入新密码"
            allow-clear
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 分配权限组弹窗 -->
    <a-modal
      v-model:visible="assignModalVisible"
      :title="`分配权限组 - ${currentUser?.nick_name || currentUser?.user_name}`"
      :ok-text="'确定'"
      :cancel-text="'取消'"
      width="480px"
      @ok="handleAssignSubmit"
      @cancel="assignModalVisible = false"
    >
      <div style="padding: 8px 0">
        <a-checkbox-group v-model="selectedRoleIds">
          <a-space direction="vertical" fill>
            <a-checkbox
              v-for="role in allRoles"
              :key="role.roleId"
              :value="role.roleId"
            >
              {{ role.name }}
              <span style="color: var(--color-text-3); margin-left: 8px">
                {{ role.description }}
              </span>
            </a-checkbox>
          </a-space>
        </a-checkbox-group>
      </div>
    </a-modal>

    <!-- 已隐藏：智能体关联（抽屉 + 创建弹窗，保留代码，恢复时取消整段注释即可）
    ===== 智能体关联抽屉 =====
    <a-drawer
      v-model:visible="agentDrawerVisible"
      :title="`智能体关联 - ${currentUser?.nick_name || currentUser?.user_name || ''}`"
      width="480px"
      @cancel="agentDrawerVisible = false"
    >
      <div style="margin-bottom: 16px">
        <a-button type="primary" @click="handleCreateAgentForUser">
          <template #icon><icon-plus /></template>
          为此用户创建智能体
        </a-button>
      </div>

      <a-table :data="userAgents" :loading="agentLoading" :pagination="false" row-key="gisAgentId">
        <template #columns>
          <a-table-column title="ID" data-index="gisAgentId" :width="60" />
          <a-table-column title="名称" data-index="agentName" :width="150" />
          <a-table-column title="模型" data-index="modelName" :width="120" />
          <a-table-column title="操作" :width="80">
            <template #cell="{ record }">
              <a-popconfirm content="确定解除关联？" @ok="handleUnbindAgent(record)">
                <a-button type="text" size="small" status="danger">解除关联</a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <a-empty v-if="!agentLoading && userAgents.length === 0" description="暂无关联的智能体" style="margin-top: 16px" />
    </a-drawer>

    ===== 为用户创建智能体弹窗 =====
    <a-modal
      v-model:visible="userAgentModalVisible"
      :title="`创建智能体 - ${currentUser?.nick_name || currentUser?.user_name || ''}`"
      width="480px"
      @ok="handleCreateAgentForUserSubmit"
      @cancel="userAgentModalVisible = false"
    >
      <a-form ref="userAgentFormRef" :model="userAgentForm" layout="vertical">
        <a-form-item field="agent_name" label="名称">
          <a-input v-model="userAgentForm.agent_name" placeholder="请输入智能体名称" />
        </a-form-item>
        <a-form-item field="agent_description" label="描述">
          <a-input v-model="userAgentForm.agent_description" placeholder="请输入描述" />
        </a-form-item>
        <a-form-item label="模型提供商">
          <a-select v-model="userAgentForm.model_provider">
            <a-option value="deepseek">DeepSeek</a-option>
            <a-option value="openai">OpenAI</a-option>
            <a-option value="ollama">Ollama</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="模型名称">
          <a-input v-model="userAgentForm.model_name" placeholder="deepseek-chat" />
        </a-form-item>
      </a-form>
    </a-modal>
    -->
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/permission'
import { IconEdit, IconLock, IconUnlock, IconDelete, IconSearch, IconRefresh, IconPlus, IconSafe, IconRobot } from '@arco-design/web-vue/es/icon'

const { t } = useI18n()
const userStore = useUserStore()

// ==================== 部门树（52 文档 §6.1） ====================
// 选中节点即按部门筛选；接口会自动包含该部门的全部子孙部门（§4.1）
const deptLoading = ref(false)
const deptFlatList = ref([])
const deptTreeData = ref([])
const selectedDeptKeys = ref([0])

const deptNameMap = computed(() => {
  const map = new Map()
  deptFlatList.value.forEach((item) => map.set(item.deptId, item.deptName))
  return map
})

// 列表不返回部门名称，表格「部门」列靠这张映射表（52 文档 §4.1）
function deptName(deptId) {
  if (deptId === null || deptId === undefined || deptId === 0) return t('user.deptUnassigned')
  return deptNameMap.value.get(deptId) || '-'
}

/**
 * 扁平部门列表 → a-tree 节点（按 orderNum 排序）
 * 停用部门置灰，不作为筛选入口（52 文档 §6.1）
 */
function toTreeNodes(list) {
  const build = (pid) =>
    list
      .filter((item) => (item.parentId ?? 0) === pid)
      .sort((a, b) => (a.orderNum ?? 0) - (b.orderNum ?? 0) || a.deptId - b.deptId)
      .map((item) => {
        const children = build(item.deptId)
        const node = { key: item.deptId, title: item.deptName, disabled: item.status === '1' }
        if (children.length) node.children = children
        return node
      })
  return [{ key: 0, title: t('user.deptAll'), children: build(0) }]
}

// 弹窗里的部门选择器：顶部「未分配」= key 0，与用户对象 dept_id 的语义一致（§6.3）
const deptSelectTreeData = computed(() => {
  const build = (pid) =>
    deptFlatList.value
      .filter((item) => (item.parentId ?? 0) === pid)
      .sort((a, b) => (a.orderNum ?? 0) - (b.orderNum ?? 0) || a.deptId - b.deptId)
      .map((item) => {
        const children = build(item.deptId)
        const node = { key: item.deptId, title: item.deptName, disabled: item.status === '1' }
        if (children.length) node.children = children
        return node
      })
  return [{ key: 0, title: t('user.deptUnassigned') }, ...build(0)]
})

const loadDeptTree = async () => {
  deptLoading.value = true
  try {
    const res = await api.gisUserDept.getDeptList()
    const data = res.data || res
    deptFlatList.value = Array.isArray(data) ? data : (data?.list || [])
    deptTreeData.value = toTreeNodes(deptFlatList.value)
  } catch (e) {
    console.error('获取部门列表失败:', e)
  } finally {
    deptLoading.value = false
  }
}

// 取消选中（再次点击已选节点）时回落到「全部」，避免「无选中但仍在筛选」的歧义
function handleDeptSelect(keys) {
  const key = keys.length ? keys[0] : 0
  selectedDeptKeys.value = [key]
  searchForm.dept_id = key === 0 ? undefined : key
  pagination.current = 1
  fetchUserList()
}

// ==================== 搜索相关 ====================
const searchForm = reactive({
  user_name: '',
  nick_name: '',
  user_phone: '',
  status: undefined,
  dept_id: undefined
})

const handleSearch = () => {
  pagination.current = 1
  fetchUserList()
}

const handleReset = () => {
  searchForm.user_name = ''
  searchForm.nick_name = ''
  searchForm.user_phone = ''
  searchForm.status = undefined
  searchForm.dept_id = undefined
  selectedDeptKeys.value = [0]
  pagination.current = 1
  fetchUserList()
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
  fetchUserList()
}

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  fetchUserList()
}

// 获取用户列表
const fetchUserList = async () => {
  loading.value = true
  try {
    const params = {
      user_name: searchForm.user_name || undefined,
      nick_name: searchForm.nick_name || undefined,
      user_phone: searchForm.user_phone || undefined,
      status: searchForm.status,
      // 部门筛选由左侧树驱动；选中「全部」时为 undefined（不传 = 不限部门）
      dept_id: searchForm.dept_id,
      page: pagination.current,
      page_size: pagination.pageSize,
      order_by: 'user_id',
      is_asc: true
    }
    const res = await api.gisUser.getGisUserList(params)
    // 兼容两种返回格式：rows/total 在最外层 或 在 data 里
    tableData.value = res.rows || res.data?.rows || []
    pagination.total = res.total || res.data?.total || 0
  } catch (e) {
    console.error('获取用户列表失败:', e)
  } finally {
    loading.value = false
  }
}

// ==================== 新增/编辑弹窗 ====================
const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const getDefaultFormData = () => ({
  user_id: undefined,
  user_name: '',
  nick_name: '',
  // 姓名、工号均为整字段替换语义，留空提交即清空（52 文档 §4.5）
  real_name: '',
  employee_no: '',
  password: '',
  confirmPassword: '',
  // 已隐藏该字段（表单项见上方注释）：group_name 已废弃、不参与任何判定，
  // 但新增/编辑接口仍按 String 写入该列，故保留默认值并继续提交，编辑时按详情回填
  group_name: '',
  // 已隐藏该字段（表单项见上方注释），但接口新增/编辑都要求传 String，
  // 故此处保留默认值 "0"（文档约定普通用户为 "0"），编辑时仍按详情回填
  user_perm_level: '0',
  user_phone: '',
  user_email: '',
  // 0 = 未分配，提交时按「传 0」处理（52 文档 §4.4）
  dept_id: 0,
  status: '0',
  enable_cloud: '0',
  user_desc: ''
})

const formData = reactive(getDefaultFormData())

const validateConfirmPassword = (value, cb) => {
  // 编辑时留空 = 不改密码，不做校验；填了就必须与密码一致
  if (isEdit.value && !formData.password) {
    cb()
    return
  }
  if (value !== formData.password) {
    cb(t('user.passwordMismatch'))
  } else {
    cb()
  }
}

const formRules = {
  user_name: [{ required: true, message: t('user.usernameRequired') }],
  nick_name: [{ required: true, message: t('user.nicknameRequired') }],
  password: [
    {
      validator: (value, cb) => {
        if (!isEdit.value && !value) {
          cb(t('user.passwordRequired'))
        } else if (value && value.length < 6) {
          // 后端同样要求 ≥ 6 位，前端先拦一道（52 文档 §6.3）
          cb(t('user.passwordMinLength'))
        } else {
          cb()
        }
      }
    }
  ],
  confirmPassword: [{ validator: validateConfirmPassword }],
  // 已隐藏：身份组名（group_name）表单项（保留规则，恢复表单项时取消注释即可）
  // group_name: [{ required: true, message: t('user.groupRequired') }],
  // 已隐藏：权限等级（保留规则，恢复表单项时取消注释即可）
  // user_perm_level: [{ required: true, message: t('user.permLevelRequired') }],
  // 邮箱非必填，填了才校验格式
  user_email: [
    {
      validator: (value, cb) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          cb(t('user.emailInvalid'))
        } else {
          cb()
        }
      }
    }
  ]
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(formData, getDefaultFormData())
  modalVisible.value = true
}

// 编辑是「整表单提交」语义：real_name / employee_no / user_email / dept_id 不回填就会被清空
// （52 文档 §4.5），因此打开弹窗时先拉一次详情拿全字段，失败才回落到列表行数据
const handleEdit = async (record) => {
  let detail = record
  try {
    const res = await api.gisUser.getGisUserById(record.user_id)
    detail = res.data || res
  } catch (e) {
    console.error('获取用户详情失败，回落到列表行数据:', e)
  }

  isEdit.value = true
  Object.assign(formData, getDefaultFormData(), {
    user_id: detail.user_id,
    user_name: detail.user_name,
    nick_name: detail.nick_name,
    real_name: detail.real_name || '',
    employee_no: detail.employee_no || '',
    group_name: detail.group_name,
    user_perm_level: detail.user_perm_level,
    user_phone: detail.user_phone || '',
    user_email: detail.user_email || '',
    dept_id: detail.dept_id ?? 0,
    status: detail.status,
    enable_cloud: detail.enable_cloud || '0',
    user_desc: detail.user_desc || ''
  })
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch (e) {
    return
  }

  try {
    const submitData = {
      user_name: formData.user_name,
      nick_name: formData.nick_name,
      group_name: formData.group_name,
      user_perm_level: formData.user_perm_level,
      user_phone: formData.user_phone || undefined,
      // 整字段替换：显式回传，空串 / 0 分别代表「未填」「未分配」，避免把已有值清掉
      real_name: formData.real_name || '',
      employee_no: formData.employee_no || '',
      user_email: formData.user_email || '',
      dept_id: Number(formData.dept_id) || 0,
      status: formData.status,
      enable_cloud: formData.enable_cloud,
      user_desc: formData.user_desc || undefined
    }

    if (isEdit.value) {
      // 编辑：只有填了密码才传
      if (formData.password) {
        submitData.password = formData.password
      }
      submitData.updated_by = userStore.userName
      await api.gisUser.updateGisUser(formData.user_id, submitData)
      Message.success(t('user.editSuccess'))
    } else {
      submitData.password = formData.password
      submitData.created_by = userStore.userName
      await api.gisUser.createGisUser(submitData)
      Message.success(t('user.addSuccess'))
    }

    modalVisible.value = false
    fetchUserList()
  } catch (e) {
    console.error('提交失败:', e)
  }
}

// ==================== 启用/停用 ====================
// ⚠️ 更新接口是整表单语义，real_name / employee_no / user_email / dept_id 必须一起回传，
// 否则单纯点一次「停用」就会把这些字段清空（52 文档 §4.5）
const handleToggleStatus = async (record) => {
  try {
    const newStatus = record.status === '0' ? '1' : '0'
    await api.gisUser.updateGisUser(record.user_id, {
      user_name: record.user_name,
      nick_name: record.nick_name,
      group_name: record.group_name,
      user_perm_level: record.user_perm_level,
      user_phone: record.user_phone || undefined,
      real_name: record.real_name || '',
      employee_no: record.employee_no || '',
      user_email: record.user_email || '',
      dept_id: record.dept_id ?? 0,
      user_desc: record.user_desc || undefined,
      status: newStatus,
      updated_by: userStore.userName
    })
    Message.success(newStatus === '0' ? t('user.enabled') : t('user.disabled'))
    fetchUserList()
  } catch (e) {
    console.error('状态切换失败:', e)
  }
}

// ==================== 删除（已隐藏，保留代码） ====================
/*
const handleDelete = async (record) => {
  try {
    await api.gisUser.deleteGisUser(record.user_id)
    Message.success(t('user.deleteSuccess'))
    fetchUserList()
  } catch (e) {
    console.error('删除失败:', e)
    Message.error(e.msg || e?.data?.msg || t('common.error'))
  }
}
*/

// ==================== 重置密码（管理员） ====================
// 与「用户自己改密码」是两个场景：本接口不需要旧密码
// 页面级权限：按钮与页面同码 controller:user:index（原 controller:user:reset_pwd 已废弃）
const resetPwdVisible = ref(false)
const resetPwdTarget = ref(null)
const resetPwdFormRef = ref(null)
const resetPwdForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

const resetPwdRules = {
  newPassword: [
    { required: true, message: '请输入新密码' },
    { minLength: 6, message: '新密码长度不能小于 6 位' }
  ],
  confirmPassword: [
    {
      validator: (value, cb) => {
        if (value !== resetPwdForm.newPassword) {
          cb('两次输入的密码不一致')
        } else {
          cb()
        }
      }
    }
  ]
}

const handleResetPassword = (record) => {
  resetPwdTarget.value = record
  resetPwdForm.newPassword = ''
  resetPwdForm.confirmPassword = ''
  resetPwdFormRef.value?.clearValidate?.()
  resetPwdVisible.value = true
}

// 返回 boolean：false 时弹窗保持打开（配合 on-before-ok）
const handleResetPasswordSubmit = async () => {
  try {
    await resetPwdFormRef.value?.validate()
  } catch (e) {
    return false
  }

  try {
    // 新密码只提交给后端：不回显、不写入任何前端日志
    await api.gisUser.adminResetPassword(resetPwdTarget.value.user_id, {
      newPassword: resetPwdForm.newPassword
    })
    Message.success('密码重置成功')
    resetPwdForm.newPassword = ''
    resetPwdForm.confirmPassword = ''
    // 重置后该用户 pwdLoginEnabled 会变为 '1'，刷新列表
    fetchUserList()
    return true
  } catch (e) {
    // 不打印 error 对象：其 config.data 中含明文新密码
    console.error('重置密码失败')
    return false
  }
}

// ==================== 分配权限组 ====================
const assignModalVisible = ref(false)
const currentUser = ref(null)
const allRoles = ref([])
const selectedRoleIds = ref([])

// 获取所有权限组
const fetchAllRoles = async () => {
  try {
    const res = await api.gisRole.getGisRoleAll()
    allRoles.value = res.data || []
  } catch (e) {
    console.error('获取权限组列表失败:', e)
  }
}

const handleAssignRole = async (record) => {
  currentUser.value = record
  selectedRoleIds.value = []
  assignModalVisible.value = true

  // 获取该用户已有的权限组
  try {
    const res = await api.gisUserRole.getRolesByUser(record.user_id)
    selectedRoleIds.value = (res.data || []).map((r) => r.roleId)
  } catch (e) {
    console.error('获取用户权限组失败:', e)
  }
}

const handleAssignSubmit = async () => {
  try {
    await api.gisUserRole.assignRolesToUser({
      userId: currentUser.value.user_id,
      roleIds: selectedRoleIds.value,
      assignedBy: userStore.userInfo?.userName || userStore.userInfo?.username
    })
    Message.success(t('common.success'))
    assignModalVisible.value = false
  } catch (e) {
    console.error('分配权限组失败:', e)
  }
}

// ==================== 智能体关联（已隐藏，保留代码） ====================
/*
const agentDrawerVisible = ref(false)
const agentLoading = ref(false)
const userAgents = ref([])
const userAgentModalVisible = ref(false)
const userAgentFormRef = ref(null)
const userAgentForm = reactive({
  agent_name: '',
  agent_description: '',
  model_provider: 'deepseek',
  model_name: 'deepseek-chat'
})

const handleAgentAssociation = async (record) => {
  currentUser.value = record
  agentDrawerVisible.value = true
  agentLoading.value = true
  try {
    const res = await api.agent.getAgentPageList({ page_size: 999 })
    const allAgents = res.rows || res.data?.rows || []
    userAgents.value = allAgents.filter(a => a.userId == record.user_id)
  } catch (e) {
    userAgents.value = []
  } finally {
    agentLoading.value = false
  }
}

const handleCreateAgentForUser = () => {
  userAgentForm.agent_name = ''
  userAgentForm.agent_description = ''
  userAgentForm.model_provider = 'deepseek'
  userAgentForm.model_name = 'deepseek-chat'
  userAgentModalVisible.value = true
}

const handleCreateAgentForUserSubmit = async () => {
  try {
    await api.agent.createAgent({
      agentName: userAgentForm.agent_name || `智能体-${currentUser.value.user_name}`,
      agentDescription: userAgentForm.agent_description || '',
      modelProvider: userAgentForm.model_provider,
      modelName: userAgentForm.model_name,
      userId: currentUser.value.user_id
    })
    Message.success('创建成功')
    userAgentModalVisible.value = false
    // 刷新列表
    const res = await api.agent.getAgentPageList({ page_size: 999 })
    const allAgents = res.rows || res.data?.rows || []
    userAgents.value = allAgents.filter(a => a.userId == currentUser.value.user_id)
  } catch (e) {
    console.error('创建失败:', e)
    Message.error(e?.msg || '创建失败')
  }
}

const handleUnbindAgent = async (record) => {
  try {
    await api.agent.updateAgent({
      gisAgentId: record.gisAgentId,
      agentName: record.agentName,
      agentDescription: record.agentDescription || '',
      systemPrompt: record.systemPrompt || '',
      modelProvider: record.modelProvider || 'deepseek',
      modelName: record.modelName || '',
      temperature: String(record.temperature ?? '0.7'),
      maxTokens: Number(record.maxTokens ?? 2048),
      userId: null
    })
    Message.success('已解除关联')
    userAgents.value = userAgents.value.filter(a => a.gisAgentId !== record.gisAgentId)
  } catch (e) {
    console.error('解绑失败:', e)
    Message.error(e?.msg || '解绑失败')
  }
}
*/

// ==================== 初始化 ====================
onMounted(() => {
  // 部门树先拉一次做缓存：左侧筛选 + 表格「部门」列的名称映射都依赖它
  loadDeptTree()
  fetchUserList()
  fetchAllRoles()
})
</script>

<style lang="scss" scoped>
// 左侧部门树 + 右侧搜索/表格：三段用 grid-area 定位，DOM 保持扁平
.user-list-page {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  grid-template-areas:
    'dept search'
    'dept table';
  grid-template-rows: auto auto;
  align-items: start;
  gap: 16px;
  margin-top: 16px;

  .dept-card {
    grid-area: dept;
    position: sticky;
    top: 0;
    // 部门多时不撑破视口，卡片内部滚动
    max-height: calc(100vh - 140px);
    overflow: auto;
  }

  .dept-card-title {
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-2);
  }

  .search-card {
    grid-area: search;
  }

  .table-card {
    grid-area: table;
  }

  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
