<template>
  <a-modal
    v-model:visible="visibleModel"
    :title="isEdit ? '编辑权限组' : '新增权限组'"
    :ok-text="'确定'"
    :cancel-text="'取消'"
    width="560px"
    :on-before-ok="handleSubmit"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <a-form-item field="name" label="权限组名称">
        <a-input v-model="formData.name" placeholder="请输入权限组名称" allow-clear />
      </a-form-item>

      <a-form-item field="roleKey" label="角色标识">
        <!-- 管理员角色的 role_key 是唯一的管理员判定依据，只读（65 文档 §2.2）；仍按原值回传，不改变已有数据 -->
        <a-input
          v-model="formData.roleKey"
          placeholder="如 auditor / operator，全局唯一"
          allow-clear
          :disabled="isAdminRole"
        />
        <template v-if="isAdminRole" #extra>
          管理员角色的角色标识不允许修改
        </template>
      </a-form-item>

      <a-form-item field="description" label="描述">
        <a-textarea
          v-model="formData.description"
          placeholder="请输入描述"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          allow-clear
        />
      </a-form-item>

      <a-form-item field="dataScope" label="数据范围">
        <a-select v-model="formData.dataScope" placeholder="请选择数据范围">
          <a-option v-for="(label, key) in DATA_SCOPE_OPTIONS" :key="key" :value="key">
            {{ label }}
          </a-option>
        </a-select>
      </a-form-item>

      <!-- 仅「自定义数据」时需要指定部门 -->
      <a-form-item v-if="formData.dataScope === '2'" field="deptIds" label="自定义部门">
        <a-tree-select
          v-model="formData.deptIds"
          :data="deptTreeData"
          :loading="deptLoading"
          multiple
          tree-checkable
          :max-tag-count="3"
          placeholder="请选择可见部门"
          allow-clear
          style="width: 100%"
        />
        <template #extra>
          <span v-if="deptLoadFailed" style="color: rgb(var(--danger-6))">
            已配置的部门加载失败，保存将以当前所选为准
          </span>
        </template>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="sortOrder" label="排序">
            <a-input-number
              v-model="formData.sortOrder"
              placeholder="请输入排序"
              :min="0"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="status" label="状态">
            <!-- 管理员角色不允许停用（65 文档 §2.2） -->
            <a-radio-group v-model="formData.status" :disabled="isAdminRole">
              <a-radio value="0">启用</a-radio>
              <a-radio value="1">禁用</a-radio>
            </a-radio-group>
            <template v-if="isAdminRole" #extra>
              管理员角色不允许停用
            </template>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // 编辑时传入的权限组记录（camelCase），null 表示新增
  record: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

const userStore = useUserStore()

const visibleModel = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const isEdit = computed(() => !!props.record)

// 是否为系统内置的管理员角色（65 文档 §2.2）：用 role_key 判断，不要用 name / roleId
const isAdminRole = computed(() => isEdit.value && props.record?.roleKey === 'admin')

// 数据范围选项（后端字段 dataScope）
const DATA_SCOPE_OPTIONS = {
  '1': '全部数据',
  '2': '自定义数据',
  '3': '本部门数据',
  '4': '本部门及以下',
  '5': '仅本人数据'
}

// ==================== 表单 ====================
const formRef = ref(null)

const getDefaultFormData = () => ({
  roleId: undefined,
  name: '',
  roleKey: '',
  description: '',
  dataScope: '1',
  deptIds: [],
  sortOrder: 0,
  status: '0'
})

const formData = reactive(getDefaultFormData())

const formRules = {
  name: [{ required: true, message: '请输入权限组名称' }],
  roleKey: [{ required: true, message: '请输入角色标识' }],
  dataScope: [{ required: true, message: '请选择数据范围' }]
}

// ==================== 部门树（仅「自定义数据」用） ====================
const deptTreeData = ref([])
const deptLoading = ref(false)
const deptLoadFailed = ref(false)

// 扁平部门列表 → 树（后端字段 camelCase：deptId / parentId / deptName / orderNum）
const buildDeptTree = (list) => {
  const build = (parentId) =>
    list
      .filter((item) => (item.parentId ?? 0) === parentId)
      .sort((a, b) => (a.orderNum ?? 0) - (b.orderNum ?? 0))
      .map((item) => {
        const node = { key: item.deptId, title: item.deptName }
        const children = build(item.deptId)
        if (children.length) node.children = children
        return node
      })
  return build(0)
}

const fetchDeptTree = async () => {
  deptLoading.value = true
  try {
    const res = await api.gisUserDept.getDeptList()
    const data = res?.data
    const list = Array.isArray(data) ? data : (data?.list || data?.rows || [])
    deptTreeData.value = buildDeptTree(list)
  } catch (e) {
    console.error('获取部门列表失败:', e)
    deptTreeData.value = []
  } finally {
    deptLoading.value = false
  }
}

// 编辑时回显已配置的自定义部门（接口返回部门 ID 数组）
const fetchAssignedDepts = async (roleId) => {
  deptLoadFailed.value = false
  try {
    const res = await api.gisRoleDept.getRoleDepts(roleId)
    formData.deptIds = Array.isArray(res?.data) ? res.data : []
  } catch (e) {
    console.error('获取权限组自定义部门失败:', e)
    deptLoadFailed.value = true
    formData.deptIds = []
  }
}

// ==================== 初始化 ====================
const initForm = async () => {
  Object.assign(formData, getDefaultFormData())
  if (props.record) {
    Object.assign(formData, {
      roleId: props.record.roleId,
      name: props.record.name || '',
      roleKey: props.record.roleKey || '',
      description: props.record.description || '',
      dataScope: String(props.record.dataScope ?? '1'),
      sortOrder: props.record.sortOrder ?? 0,
      status: String(props.record.status ?? '0')
    })
  }
  formRef.value?.clearValidate?.()

  fetchDeptTree()
  if (isEdit.value && formData.dataScope === '2') {
    await fetchAssignedDepts(formData.roleId)
  } else {
    formData.deptIds = []
    deptLoadFailed.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) initForm()
  }
)

// ==================== 提交 ====================
// 返回 boolean：false 时弹窗保持打开（配合 on-before-ok）
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch (e) {
    return false
  }

  // 数据范围选「自定义」时必须至少选一个部门
  if (formData.dataScope === '2' && (!formData.deptIds || formData.deptIds.length === 0)) {
    Message.warning('数据范围为「自定义数据」时，请至少选择一个部门')
    return false
  }

  const operator = userStore.userInfo?.userName || userStore.userInfo?.username
  const submitData = {
    name: formData.name,
    roleKey: formData.roleKey,
    description: formData.description || undefined,
    dataScope: formData.dataScope,
    sortOrder: formData.sortOrder,
    status: formData.status
  }

  try {
    let roleId = formData.roleId
    if (isEdit.value) {
      submitData.updatedBy = operator
      await api.gisRole.updateGisRole(roleId, submitData)
    } else {
      submitData.createdBy = operator
      const res = await api.gisRole.createGisRole(submitData)
      // 后端返回完整角色对象
      roleId = res?.data?.roleId
    }

    // 数据范围 = 自定义 → 同步部门关联（全量替换）
    if (formData.dataScope === '2') {
      if (roleId) {
        await api.gisRoleDept.assignRoleDepts({
          roleId,
          deptIds: formData.deptIds,
          createdBy: operator
        })
      } else {
        Message.warning('权限组已保存，但未拿到角色 ID，请重新编辑该权限组以保存自定义部门')
      }
    }

    Message.success(isEdit.value ? '编辑成功' : '新增成功')
    emit('success')
    return true
  } catch (e) {
    // 400 的 msg（如「管理员角色的角色标识不允许修改」）已由请求拦截器统一弹出，这里不再重复提示
    console.error('提交失败:', e)
    return false
  }
}
</script>
