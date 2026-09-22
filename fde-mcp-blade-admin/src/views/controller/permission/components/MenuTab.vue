<template>
  <div class="menu-tab">
    <!-- 工具栏 -->
    <div class="table-toolbar">
      <a-button type="primary" @click="handleAddRoot">
        <template #icon><icon-plus /></template>
        新增菜单
      </a-button>
    </div>

    <!-- 菜单树形表格 -->
    <a-table
      :data="tableData"
      :loading="loading"
      :pagination="false"
      row-key="menuId"
      :default-expand-all-rows="true"
    >
      <template #columns>
        <a-table-column title="菜单名称" data-index="menuName" :width="200" />
        <a-table-column title="类型" data-index="menuType" :width="90">
          <template #cell="{ record }">
            <a-tag v-if="record.menuType === 'M'" color="arcoblue">目录</a-tag>
            <a-tag v-else-if="record.menuType === 'C'" color="green">菜单</a-tag>
            <span v-else>—</span>
          </template>
        </a-table-column>
        <a-table-column title="路由地址" data-index="path" :ellipsis="true" />
        <a-table-column title="组件" data-index="component" :ellipsis="true" />
        <a-table-column title="关联权限点" :width="200">
          <template #cell="{ record }">
            {{ getPermissionCode(record.permissionId) }}
          </template>
        </a-table-column>
        <a-table-column title="排序" data-index="sortOrder" :width="70" />
        <a-table-column title="可见" data-index="visible" :width="80">
          <template #cell="{ record }">
            {{ record.visible === '0' ? '显示' : '隐藏' }}
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status" :width="80">
          <template #cell="{ record }">
            <a-tag :color="record.status === '0' ? 'green' : 'red'">
              {{ record.status === '0' ? '正常' : '停用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="220" fixed="right">
          <template #cell="{ record }">
            <a-space size="mini">
              <a-button
                v-if="record.menuType === 'M'"
                type="text"
                size="small"
                @click="handleAddChild(record)"
              >
                <template #icon><icon-plus /></template>
                新增子级
              </a-button>
              <a-button type="text" size="small" @click="handleEdit(record)">
                <template #icon><icon-edit /></template>
                编辑
              </a-button>
              <a-popconfirm content="确定要删除该菜单吗？" position="br" @ok="handleDelete(record)">
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

    <!-- 新增/编辑菜单弹窗 -->
    <MenuFormModal
      v-model:visible="modalVisible"
      :record="currentRecord"
      :parent-id="currentParentId"
      @success="fetchMenuList"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { IconPlus, IconEdit, IconDelete } from '@arco-design/web-vue/es/icon'
import MenuFormModal from './MenuFormModal.vue'

// ==================== 表格相关 ====================
const loading = ref(false)
const tableData = ref([])

// 权限点 ID -> code 映射（用于「关联权限点」列展示）
const permissionCodeMap = ref({})

// 获取菜单树列表（后端直接返回带 children 的树形数组，含停用项）
const fetchMenuList = async () => {
  loading.value = true
  try {
    const res = await api.gisMenu.getGisMenuList()
    tableData.value = res.data || []
  } catch (e) {
    console.error('获取菜单列表失败:', e)
  } finally {
    loading.value = false
  }
}

// 递归收集权限点 id -> code（权限树为「大类 → 目录 → 页面 → 动作码」，需按层递归）
const collectPermissionMap = (nodes, map = {}) => {
  (nodes || []).forEach((node) => {
    if (node.permissionId !== undefined && node.permissionId !== null) {
      map[node.permissionId] = node.code
    }
    collectPermissionMap(node.children || [], map)
  })
  return map
}

// 获取权限点树并扁平化为 permissionId -> code 的映射
const fetchPermissionMap = async () => {
  try {
    const res = await api.gisPermission.getGisPermissionTree()
    permissionCodeMap.value = collectPermissionMap(res.data || [])
  } catch (e) {
    console.error('获取权限点映射失败:', e)
  }
}

// 关联权限点展示：无关联显示 —
const getPermissionCode = (permissionId) => {
  if (permissionId === null || permissionId === undefined || permissionId === '') return '—'
  return permissionCodeMap.value[permissionId] || permissionId
}

// ==================== 新增/编辑 ====================
const modalVisible = ref(false)
const currentRecord = ref(null)
const currentParentId = ref(0)

// 新增顶级菜单
const handleAddRoot = () => {
  currentRecord.value = null
  currentParentId.value = 0
  modalVisible.value = true
}

// 新增子级菜单
const handleAddChild = (record) => {
  currentRecord.value = null
  currentParentId.value = record.menuId
  modalVisible.value = true
}

// 编辑菜单
const handleEdit = (record) => {
  currentRecord.value = record
  currentParentId.value = record.parentId ?? 0
  modalVisible.value = true
}

// ==================== 删除 ====================
const handleDelete = async (record) => {
  try {
    await api.gisMenu.deleteGisMenu(record.menuId)
    Message.success('删除成功')
    fetchMenuList()
  } catch (e) {
    console.error('删除失败:', e)
    Message.error(e?.msg || e?.data?.msg || '删除失败')
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchMenuList()
  fetchPermissionMap()
})
</script>

<style lang="scss" scoped>
.menu-tab {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
