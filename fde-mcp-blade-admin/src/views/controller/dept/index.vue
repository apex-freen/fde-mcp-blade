<template>
  <div class="dept-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="table-toolbar">
        <a-button type="primary" @click="openCreate(0)">
          <template #icon><icon-plus /></template>
          {{ t('dept.addRoot') }}
        </a-button>
        <a-button :loading="loading" @click="loadData">
          <template #icon><icon-refresh /></template>
          {{ t('commonTable.refresh') }}
        </a-button>
      </div>

      <a-table
        :data="treeData"
        :loading="loading"
        :pagination="false"
        row-key="deptId"
        :default-expand-all-rows="true"
        :bordered="false"
      >
        <template #columns>
          <a-table-column :title="t('dept.deptName')" data-index="deptName" />
          <a-table-column :title="t('dept.orderNum')" data-index="orderNum" :width="90" />
          <a-table-column :title="t('dept.leader')" data-index="leader" :width="120" />
          <a-table-column :title="t('dept.phone')" data-index="phone" :width="140" />
          <a-table-column :title="t('dept.email')" data-index="email" :width="200" />
          <a-table-column :title="t('dept.status')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status === '0' ? 'green' : 'gray'">
                {{ record.status === '0' ? t('commonTable.normal') : t('commonTable.disabled') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('commonTable.operation')" :width="220" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click="openCreate(record.deptId)">
                {{ t('dept.addChild') }}
              </a-button>
              <a-button type="text" size="mini" @click="openEdit(record)">
                {{ t('commonTable.edit') }}
              </a-button>
              <a-popconfirm :content="t('dept.confirmDelete')" position="br" @ok="handleDelete(record)">
                <a-button type="text" status="danger" size="mini">
                  {{ t('commonTable.delete') }}
                </a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? t('dept.editTitle') : t('dept.createTitle')"
      :on-before-ok="handleSubmit"
      :mask-closable="false"
      :ok-text="t('commonTable.confirm')"
      :cancel-text="t('commonTable.cancel')"
      unmount-on-close
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item field="parentId" :label="t('dept.parentId')">
          <a-tree-select
            v-model="form.parentId"
            :data="parentTreeData"
            :placeholder="t('dept.parentIdPlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item field="deptName" :label="t('dept.deptName')">
          <a-input v-model="form.deptName" :placeholder="t('dept.deptNamePlaceholder')" allow-clear />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="orderNum" :label="t('dept.orderNum')">
              <a-input-number v-model="form.orderNum" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="status" :label="t('dept.status')">
              <a-radio-group v-model="form.status" type="button">
                <a-radio value="0">{{ t('commonTable.normal') }}</a-radio>
                <a-radio value="1">{{ t('commonTable.disabled') }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="leader" :label="t('dept.leader')">
              <a-input v-model="form.leader" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="phone" :label="t('dept.phone')">
              <a-input v-model="form.phone" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item field="email" :label="t('dept.email')">
          <a-input v-model="form.email" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { getDeptList, createDept, updateDept, deleteDept } from '@/api/modules/gisUserDept'
import { useUserStore } from '@/stores/user'

// 字段风格：camelCase（见「26 接口字段命名调整说明」）
// 响应：deptId / parentId / deptName / orderNum / ancestors / leader / phone / email / status

const { t } = useI18n()
const userStore = useUserStore()

const loading = ref(false)
const flatList = ref([])
const treeData = ref([])

const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

const emptyForm = () => ({
  deptId: undefined,
  parentId: 0,
  deptName: '',
  orderNum: 0,
  leader: '',
  phone: '',
  email: '',
  status: '0'
})
const form = reactive(emptyForm())

const rules = {
  deptName: [{ required: true, message: t('dept.deptNameRequired') }]
}

/**
 * 扁平列表 → 树（按 orderNum 排序）
 * 后端返回扁平结构，children 为空时删除，避免表格误显示展开箭头
 */
function buildTree(list) {
  const nodes = new Map()
  list.forEach(item => nodes.set(item.deptId, { ...item, children: [] }))

  const roots = []
  nodes.forEach(node => {
    const parent = node.parentId ? nodes.get(node.parentId) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  })

  const sortNodes = (arr) => {
    arr.sort((a, b) => (a.orderNum ?? 0) - (b.orderNum ?? 0) || a.deptId - b.deptId)
    arr.forEach(n => {
      if (n.children.length) sortNodes(n.children)
      else delete n.children
    })
  }
  sortNodes(roots)
  return roots
}

/**
 * 收集某部门的所有后代 ID（编辑时禁止把父级指向自己或后代，否则组树会成环）
 */
function collectDescendantIds(list, rootId) {
  const ids = new Set()
  const walk = (pid) => {
    list.forEach(item => {
      if (item.parentId === pid && !ids.has(item.deptId)) {
        ids.add(item.deptId)
        walk(item.deptId)
      }
    })
  }
  walk(rootId)
  return ids
}

const parentTreeData = computed(() => {
  const excluded = new Set()
  if (isEdit.value && form.deptId !== undefined) {
    excluded.add(form.deptId)
    collectDescendantIds(flatList.value, form.deptId).forEach(id => excluded.add(id))
  }
  const build = (pid) =>
    flatList.value
      .filter(item => (item.parentId ?? 0) === pid)
      .sort((a, b) => (a.orderNum ?? 0) - (b.orderNum ?? 0))
      .map(item => {
        const children = build(item.deptId)
        const node = {
          key: item.deptId,
          title: item.deptName,
          disabled: excluded.has(item.deptId)
        }
        if (children.length) node.children = children
        return node
      })
  return [{ key: 0, title: t('dept.rootDept'), children: build(0) }]
})

async function loadData() {
  loading.value = true
  try {
    const res = await getDeptList()
    const data = res.data || res
    flatList.value = Array.isArray(data) ? data : (data?.list || [])
    treeData.value = buildTree(flatList.value)
  } catch (_) { /* request.js 已弹错 */ }
  finally { loading.value = false }
}

function openCreate(parentId) {
  isEdit.value = false
  Object.assign(form, emptyForm(), { parentId: parentId ?? 0 })
  modalVisible.value = true
}

function openEdit(record) {
  isEdit.value = true
  Object.assign(form, emptyForm(), {
    deptId: record.deptId,
    parentId: record.parentId ?? 0,
    deptName: record.deptName,
    orderNum: record.orderNum ?? 0,
    leader: record.leader ?? '',
    phone: record.phone ?? '',
    email: record.email ?? '',
    status: record.status ?? '0'
  })
  modalVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return false
  }
  const operator = userStore.userInfo?.userName || userStore.userInfo?.username
  try {
    if (isEdit.value) {
      // deptId 放在 body 里，不在路径上
      await updateDept({ ...form, updatedBy: operator })
      Message.success(t('dept.editSuccess'))
    } else {
      await createDept({ ...form, createdBy: operator })
      Message.success(t('dept.createSuccess'))
    }
    await loadData()
    return true
  } catch (_) {
    return false
  }
}

async function handleDelete(record) {
  try {
    // 有子部门时后端会拒绝（业务码 400），错误提示由 request.js 统一弹出
    await deleteDept(record.deptId)
    Message.success(t('dept.deleteSuccess'))
    await loadData()
  } catch (_) { /* request.js 已弹错 */ }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.table-toolbar {
  margin-bottom: $space-3;
  display: flex;
  gap: $space-2;
}
</style>
