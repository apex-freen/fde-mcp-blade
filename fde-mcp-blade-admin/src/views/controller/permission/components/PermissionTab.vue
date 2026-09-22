<template>
  <div class="permission-tab">
    <!-- 说明文案：权限点为受控维护 -->
    <a-alert type="info" style="margin-bottom: 16px">
      权限点由后端与前端页面路径绑定，code 不可修改；新增/删除请走前后端对齐流程。
    </a-alert>

    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="module" label="所属模块">
          <a-select
            v-model="searchForm.module"
            placeholder="全部"
            allow-clear
            style="width: 180px"
          >
            <a-option v-for="(label, key) in MODULE_LABELS" :key="key" :value="key">
              {{ label }}
            </a-option>
          </a-select>
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

    <!-- 权限点表格（不提供新增 / 删除） -->
    <a-table
      :data="tableData"
      :loading="loading"
      :pagination="pagination"
      row-key="permissionId"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <template #columns>
        <a-table-column title="权限码" data-index="code" :width="220" :ellipsis="true" />
        <a-table-column title="中文名称" data-index="name" />
        <a-table-column title="所属模块" data-index="module" :width="120">
          <template #cell="{ record }">
            {{ MODULE_LABELS[record.module] || record.module }}
          </template>
        </a-table-column>
        <a-table-column title="前端路由" data-index="path" :ellipsis="true" />
        <a-table-column title="排序" data-index="sortOrder" :width="70" />
        <a-table-column title="状态" data-index="status" :width="90">
          <template #cell="{ record }">
            <a-tag :color="record.status === '0' ? 'green' : 'red'">
              {{ record.status === '0' ? '启用' : '禁用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="100" fixed="right">
          <template #cell="{ record }">
            <a-button type="text" size="small" @click="handleEdit(record)">
              <template #icon><icon-edit /></template>
              编辑
            </a-button>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <!-- 编辑权限点弹窗 -->
    <PermissionFormModal v-model:visible="modalVisible" :record="currentRecord" @success="fetchPermissionList" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { api } from '@/api'
import { IconSearch, IconRefresh, IconEdit } from '@arco-design/web-vue/es/icon'
import PermissionFormModal from './PermissionFormModal.vue'

// 模块中文名称映射
const MODULE_LABELS = {
  workspace: '使用中心',
  controller: '管理后台',
  audit: '审计中心',
  message: '消息中心'
}

// 列表兼容取值：后端返回 res.data = { total, list }
const pickList = (res) => res?.data?.list || res?.data?.rows || res?.rows || (Array.isArray(res?.data) ? res.data : []) || []
const pickTotal = (res) => res?.data?.total ?? res?.total ?? 0

// ==================== 搜索相关 ====================
const searchForm = reactive({
  module: undefined,
  status: undefined
})

const handleSearch = () => {
  pagination.current = 1
  fetchPermissionList()
}

const handleReset = () => {
  searchForm.module = undefined
  searchForm.status = undefined
  pagination.current = 1
  fetchPermissionList()
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
  fetchPermissionList()
}

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  fetchPermissionList()
}

// 获取权限点列表
const fetchPermissionList = async () => {
  loading.value = true
  try {
    const res = await api.gisPermission.getGisPermissionList({
      module: searchForm.module,
      status: searchForm.status,
      page: pagination.current,
      pageSize: pagination.pageSize
    })
    tableData.value = pickList(res)
    pagination.total = pickTotal(res)
  } catch (e) {
    console.error('获取权限点列表失败:', e)
  } finally {
    loading.value = false
  }
}

// ==================== 编辑 ====================
const modalVisible = ref(false)
const currentRecord = ref(null)

const handleEdit = (record) => {
  currentRecord.value = record
  modalVisible.value = true
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchPermissionList()
})
</script>
