<template>
  <div class="role-tab">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="name" label="权限组名称">
          <a-input
            v-model="searchForm.name"
            placeholder="请输入权限组名称"
            allow-clear
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item field="status" label="状态">
          <a-select
            v-model="searchForm.status"
            placeholder="全部"
            allow-clear
            style="width: 140px"
          >
            <a-option value="0">启用</a-option>
            <a-option value="1">禁用</a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              重置
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 操作栏 + 表格 -->
    <a-card :bordered="false">
      <div class="table-toolbar">
        <a-button type="primary" @click="handleAdd">
          <template #icon><icon-plus /></template>
          新增权限组
        </a-button>
      </div>

      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="roleId"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="权限组名称" data-index="name" :width="160" />
          <a-table-column title="角色标识" data-index="roleKey" :width="180" :ellipsis="true">
            <template #cell="{ record }">
              {{ record.roleKey || '-' }}
              <!-- 系统内置管理员角色：判定依据是 role_key='admin'（65 文档 §2.2） -->
              <a-tag v-if="isAdminRole(record)" color="arcoblue" size="small" style="margin-left: 6px">
                管理员
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="描述" data-index="description" :ellipsis="true" />
          <a-table-column title="数据范围" :width="130">
            <template #cell="{ record }">
              {{ DATA_SCOPE_LABELS[String(record.dataScope)] || '—' }}
            </template>
          </a-table-column>
          <a-table-column title="排序" data-index="sortOrder" :width="80" />
          <a-table-column title="状态" data-index="status" :width="110">
            <template #cell="{ record }">
              <!-- 管理员角色不允许停用（65 文档 §2.2）：状态只能由编辑弹窗修改，这里给出说明 -->
              <a-tooltip
                :content="'管理员角色不允许停用'"
                :disabled="!isAdminRole(record)"
              >
                <a-tag :color="record.status === '0' ? 'green' : 'red'">
                  {{ record.status === '0' ? '启用' : '禁用' }}
                </a-tag>
              </a-tooltip>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="240" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  编辑
                </a-button>
                <a-button type="text" size="small" @click="handleAssignPermission(record)">
                  <template #icon><icon-safe /></template>
                  分配权限
                </a-button>
                <!-- 管理员角色不允许删除（65 文档 §2.2）：删除按钮置灰，hover 给出原因 -->
                <a-tooltip v-if="isAdminRole(record)" content="管理员角色不允许删除">
                  <a-button type="text" size="small" status="danger" disabled>
                    <template #icon><icon-delete /></template>
                    删除
                  </a-button>
                </a-tooltip>
                <a-popconfirm
                  v-else
                  content="确定要删除该权限组吗？"
                  position="br"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    <template #icon><icon-delete /></template>
                    删除
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑权限组弹窗 -->
    <RoleFormModal v-model:visible="modalVisible" :record="currentRecord" @success="fetchRoleList" />

    <!-- 分配权限抽屉 -->
    <AssignPermissionDrawer v-model:visible="drawerVisible" :role="currentRole" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { IconSearch, IconRefresh, IconPlus, IconEdit, IconDelete, IconSafe } from '@arco-design/web-vue/es/icon'
import RoleFormModal from './RoleFormModal.vue'
import AssignPermissionDrawer from './AssignPermissionDrawer.vue'

// 数据范围中文映射（后端字段 dataScope）
const DATA_SCOPE_LABELS = {
  '1': '全部数据',
  '2': '自定义数据',
  '3': '本部门数据',
  '4': '本部门及以下',
  '5': '仅本人数据'
}

// 是否为系统内置的管理员角色（65 文档 §2.2）
// 判据用列表返回的 roleKey：不要用 name（中文名可改），也不要写死 roleId
const isAdminRole = (record) => record?.roleKey === 'admin'

// 列表兼容取值：数据可能在 data.list / data.rows / rows 中
const pickList = (res) => res?.data?.list || res?.data?.rows || res?.rows || (Array.isArray(res?.data) ? res.data : []) || []
const pickTotal = (res) => res?.data?.total ?? res?.total ?? 0

// ==================== 搜索相关 ====================
const searchForm = reactive({
  name: '',
  status: undefined
})

const handleSearch = () => {
  pagination.current = 1
  fetchRoleList()
}

const handleReset = () => {
  searchForm.name = ''
  searchForm.status = undefined
  pagination.current = 1
  fetchRoleList()
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

const handlePageChange = (page) => {
  pagination.current = page
  fetchRoleList()
}

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  fetchRoleList()
}

// 获取权限组列表
const fetchRoleList = async () => {
  loading.value = true
  try {
    const res = await api.gisRole.getGisRoleList({
      status: searchForm.status,
      page: pagination.current,
      pageSize: pagination.pageSize
    })
    let list = pickList(res)
    // 说明：后端暂未支持按权限组名称模糊查询，这里对当前页数据做本地过滤（简单处理）
    if (searchForm.name) {
      const keyword = searchForm.name.trim()
      list = list.filter((item) => (item.name || '').includes(keyword))
    }
    tableData.value = list
    pagination.total = pickTotal(res)
  } catch (e) {
    console.error('获取权限组列表失败:', e)
  } finally {
    loading.value = false
  }
}

// ==================== 新增/编辑 ====================
const modalVisible = ref(false)
const currentRecord = ref(null)

const handleAdd = () => {
  currentRecord.value = null
  modalVisible.value = true
}

const handleEdit = (record) => {
  currentRecord.value = record
  modalVisible.value = true
}

// ==================== 删除 ====================
// 管理员角色的删除按钮已置灰；后端仍是唯一权威，若返回 400 由请求拦截器
// 原样弹出 msg（如「管理员角色不允许删除」），这里不再重复提示（65 文档 §2.3）
const handleDelete = async (record) => {
  try {
    await api.gisRole.deleteGisRole(record.roleId)
    Message.success('删除成功')
    fetchRoleList()
  } catch (e) {
    console.error('删除失败:', e)
  }
}

// ==================== 分配权限 ====================
const drawerVisible = ref(false)
const currentRole = ref(null)

const handleAssignPermission = (record) => {
  currentRole.value = record
  drawerVisible.value = true
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchRoleList()
})
</script>

<style lang="scss" scoped>
.role-tab {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
