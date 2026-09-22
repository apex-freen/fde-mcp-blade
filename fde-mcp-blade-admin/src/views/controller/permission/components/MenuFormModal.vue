<template>
  <a-modal
    v-model:visible="visibleModel"
    :title="isEdit ? '编辑菜单' : '新增菜单'"
    :ok-text="'确定'"
    :cancel-text="'取消'"
    width="680px"
    :on-before-ok="handleSubmit"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <!-- 上级菜单：编辑态只读 -->
      <a-form-item field="parentId" label="上级菜单">
        <a-tree-select
          v-model="formData.parentId"
          :data="parentTreeData"
          :disabled="isEdit"
          placeholder="请选择上级菜单"
          allow-clear
          style="width: 100%"
        />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="menuName" label="菜单名称">
            <a-input v-model="formData.menuName" placeholder="请输入菜单名称" allow-clear />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="menuType" label="菜单类型">
            <a-radio-group v-model="formData.menuType">
              <a-radio value="M">目录</a-radio>
              <a-radio value="C">菜单</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="path" label="路由地址">
            <a-input
              v-model="formData.path"
              placeholder="目录如 /audit，菜单如 user/index"
              :disabled="isEdit"
              allow-clear
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="routeName" label="路由名称">
            <a-input v-model="formData.routeName" placeholder="请输入路由名称" allow-clear />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 组件路径：仅菜单类型为 C 时显示 -->
      <a-form-item v-if="formData.menuType === 'C'" field="component" label="组件路径">
        <a-input
          v-model="formData.component"
          placeholder="相对 views 的路径，如 controller/user/index"
          :disabled="isEdit"
          allow-clear
        />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="query" label="路由参数">
            <a-input v-model="formData.query" placeholder="请输入路由参数" allow-clear />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="icon" label="菜单图标">
            <a-input v-model="formData.icon" placeholder="请输入图标名称" allow-clear />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="isFrame" label="是否外链">
            <a-radio-group v-model="formData.isFrame">
              <a-radio value="0">是</a-radio>
              <a-radio value="1">否</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="isCache" label="是否缓存">
            <a-radio-group v-model="formData.isCache">
              <a-radio value="0">缓存</a-radio>
              <a-radio value="1">不缓存</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="visible" label="显示状态">
            <a-radio-group v-model="formData.visible">
              <a-radio value="0">显示</a-radio>
              <a-radio value="1">隐藏</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="status" label="菜单状态">
            <a-radio-group v-model="formData.status">
              <a-radio value="0">正常</a-radio>
              <a-radio value="1">停用</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item field="redirect" label="重定向">
            <a-input v-model="formData.redirect" placeholder="请输入重定向地址" allow-clear />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item field="alwaysShow" label="是否总是显示">
            <a-radio-group v-model="formData.alwaysShow">
              <a-radio :value="0">否</a-radio>
              <a-radio :value="1">是</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
      </a-row>

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
      </a-row>

      <!-- 关联权限点：目录不挂权限点，置空并禁用 -->
      <a-form-item field="permissionId" label="关联权限点">
        <a-select
          v-model="formData.permissionId"
          :options="permissionOptions"
          :disabled="formData.menuType === 'M'"
          placeholder="请选择关联权限点"
          allow-search
          allow-clear
        />
      </a-form-item>
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
  // 编辑时传入的菜单记录，null 表示新增
  record: {
    type: Object,
    default: null
  },
  // 新增子级时预置的上级菜单 ID
  parentId: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:visible', 'success'])

const userStore = useUserStore()

const visibleModel = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const isEdit = computed(() => !!props.record)

// 当前登录用户名称，用于 createdBy / updatedBy
const currentUserName = computed(() => {
  const info = userStore.userInfo || {}
  return info.user_name || info.userName || info.username || ''
})

// ==================== 表单 ====================
const formRef = ref(null)

const getDefaultFormData = () => ({
  menuId: undefined,
  parentId: 0,
  menuName: '',
  menuType: 'C',
  path: '',
  component: '',
  routeName: '',
  query: '',
  isFrame: '1',
  isCache: '0',
  visible: '0',
  status: '0',
  icon: '',
  redirect: '',
  alwaysShow: 0,
  sortOrder: 0,
  permissionId: undefined
})

const formData = reactive(getDefaultFormData())

// 组件路径仅在菜单类型为 C 时必填
const formRules = computed(() => ({
  menuName: [{ required: true, message: '请输入菜单名称' }],
  menuType: [{ required: true, message: '请选择菜单类型' }],
  component:
    formData.menuType === 'C' ? [{ required: true, message: '请输入组件路径' }] : []
}))

// 目录类型不挂权限点，切换为目录时清空已选项
watch(
  () => formData.menuType,
  (val) => {
    if (val === 'M') {
      formData.permissionId = undefined
    }
  }
)

// ==================== 数据源 ====================
const parentTreeData = ref([])
const permissionOptions = ref([])

// 把后端菜单树统一转换为 a-tree-select 需要的 key/title/children 结构
const normalizeTree = (list) =>
  (list || []).map((item) => {
    const key = item.menuId ?? item.menu_id ?? item.id ?? item.value
    const title = item.menuName ?? item.menu_name ?? item.label ?? item.title ?? String(key)
    const children =
      item.children && item.children.length ? normalizeTree(item.children) : undefined
    return { key, title, children }
  })

// 上级菜单树（仅启用项），编辑时排除自身及子孙
const fetchParentTree = async () => {
  try {
    const params = isEdit.value && props.record?.menuId ? { menuId: props.record.menuId } : undefined
    const res = await api.gisMenu.getGisMenuTreeSelect(params)
    parentTreeData.value = [{ key: 0, title: '顶级菜单' }, ...normalizeTree(res.data || [])]
  } catch (e) {
    console.error('获取上级菜单树失败:', e)
    parentTreeData.value = [{ key: 0, title: '顶级菜单' }]
  }
}

// 递归收集「挂在菜单下」的页面级权限点，作为「关联权限点」下拉选项
// 权限树为「大类(menu:*) → 目录(menu:*) → 页面(perm) → 动作码(perm)」：
//   - 大类/目录：permissionId 为 null，不进下拉
//   - 页面：父节点是 menu:*，进下拉
//   - 动作码：父节点是权限点（无菜单挂靠），不进下拉
const collectMenuPermissions = (nodes, parentIsMenu, out = []) => {
  (nodes || []).forEach((node) => {
    const hasId = node.permissionId !== null && node.permissionId !== undefined
    if (hasId && parentIsMenu) {
      out.push({
        label: `${node.label || node.code}（${node.code}）`,
        value: node.permissionId
      })
    }
    const isMenuNode = !hasId && String(node.key || '').startsWith('menu:')
    collectMenuPermissions(node.children || [], isMenuNode, out)
  })
  return out
}

// 权限点下拉选项
const fetchPermissionOptions = async () => {
  try {
    const res = await api.gisPermission.getGisPermissionTree()
    permissionOptions.value = collectMenuPermissions(res.data || [], false)
  } catch (e) {
    console.error('获取权限点列表失败:', e)
  }
}

// ==================== 初始化 ====================
const initForm = () => {
  Object.assign(formData, getDefaultFormData())
  if (props.record) {
    Object.assign(formData, {
      menuId: props.record.menuId,
      parentId: props.record.parentId ?? 0,
      menuName: props.record.menuName || '',
      menuType: props.record.menuType || 'C',
      path: props.record.path || '',
      component: props.record.component || '',
      routeName: props.record.routeName || '',
      query: props.record.query || '',
      isFrame: String(props.record.isFrame ?? '1'),
      isCache: String(props.record.isCache ?? '0'),
      visible: String(props.record.visible ?? '0'),
      status: String(props.record.status ?? '0'),
      icon: props.record.icon || '',
      redirect: props.record.redirect || '',
      alwaysShow: Number(props.record.alwaysShow ?? 0),
      sortOrder: props.record.sortOrder ?? 0,
      permissionId: props.record.permissionId ?? undefined
    })
  } else {
    formData.parentId = props.parentId ?? 0
  }
  formRef.value?.clearValidate?.()
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      initForm()
      fetchParentTree()
      fetchPermissionOptions()
    }
  }
)

// ==================== 提交 ====================
// 字段类型按后端 DTO 区分，不能一刀切：
//   isFrame / isCache  → 整数（i8），传字符串会报 expected i8
//   visible / status   → 字符串，传数字会报 expected a string
// 单选控件的值本来就是字符串，所以只有前两个需要转数字。
const toInt = (value, fallback) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

// 返回 boolean：false 时弹窗保持打开（配合 on-before-ok）
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch (e) {
    return false
  }

  try {
    const data = {
      parentId: formData.parentId ?? 0,
      menuName: formData.menuName,
      menuType: formData.menuType,
      path: formData.path || undefined,
      // 组件路径仅菜单类型 C 需要
      component: formData.menuType === 'C' ? formData.component || undefined : undefined,
      routeName: formData.routeName || undefined,
      query: formData.query || undefined,
      isFrame: toInt(formData.isFrame, 1),
      isCache: toInt(formData.isCache, 0),
      visible: String(formData.visible ?? '0'),
      status: String(formData.status ?? '0'),
      icon: formData.icon || undefined,
      redirect: formData.redirect || undefined,
      alwaysShow: toInt(formData.alwaysShow, 0),
      sortOrder: toInt(formData.sortOrder, 0),
      // 目录不挂权限点，传 null
      permissionId: formData.menuType === 'C' ? formData.permissionId ?? null : null
    }

    if (isEdit.value) {
      if (currentUserName.value) data.updatedBy = currentUserName.value
      await api.gisMenu.updateGisMenu(formData.menuId, data)
      Message.success('编辑成功')
    } else {
      if (currentUserName.value) data.createdBy = currentUserName.value
      await api.gisMenu.createGisMenu(data)
      Message.success('新增成功')
    }

    emit('success')
    return true
  } catch (e) {
    console.error('提交失败:', e)
    Message.error(e?.msg || e?.data?.msg || '提交失败')
    return false
  }
}
</script>
