<template>
  <a-modal
    v-model:visible="visibleModel"
    title="编辑权限点"
    :ok-text="'确定'"
    :cancel-text="'取消'"
    width="520px"
    :on-before-ok="handleSubmit"
  >
    <a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
      <!-- 权限码由后端与前端页面路径绑定，只读 -->
      <a-form-item field="code" label="权限码">
        <a-input v-model="formData.code" disabled />
      </a-form-item>

      <a-form-item field="name" label="中文名称">
        <a-input v-model="formData.name" placeholder="请输入中文名称" allow-clear />
      </a-form-item>

      <a-form-item field="module" label="所属模块">
        <a-select v-model="formData.module" placeholder="请选择所属模块" allow-clear>
          <a-option v-for="(label, key) in MODULE_LABELS" :key="key" :value="key">
            {{ label }}
          </a-option>
        </a-select>
      </a-form-item>

      <a-form-item field="path" label="前端路由">
        <a-input v-model="formData.path" placeholder="请输入前端路由" allow-clear />
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
            <a-radio-group v-model="formData.status">
              <a-radio value="0">启用</a-radio>
              <a-radio value="1">禁用</a-radio>
            </a-radio-group>
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

const userStore = useUserStore()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // 编辑的权限点记录（camelCase）
  record: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 模块中文名称映射
const MODULE_LABELS = {
  workspace: '使用中心',
  controller: '管理后台',
  audit: '审计中心',
  message: '消息中心'
}

const visibleModel = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// ==================== 表单 ====================
const formRef = ref(null)

const getDefaultFormData = () => ({
  permissionId: undefined,
  code: '',
  name: '',
  module: undefined,
  path: '',
  sortOrder: 0,
  status: '0'
})

const formData = reactive(getDefaultFormData())

const formRules = {
  name: [{ required: true, message: '请输入中文名称' }],
  module: [{ required: true, message: '请选择所属模块' }]
}

// ==================== 初始化 ====================
const initForm = () => {
  Object.assign(formData, getDefaultFormData())
  if (props.record) {
    Object.assign(formData, {
      permissionId: props.record.permissionId,
      code: props.record.code || '',
      name: props.record.name || '',
      module: props.record.module || undefined,
      path: props.record.path || '',
      sortOrder: props.record.sortOrder ?? 0,
      status: String(props.record.status ?? '0')
    })
  }
  formRef.value?.clearValidate?.()
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

  const permId = formData.permissionId
  try {
    // code 不可修改，不提交
    await api.gisPermission.updateGisPermission(permId, {
      name: formData.name,
      module: formData.module,
      path: formData.path || undefined,
      sortOrder: formData.sortOrder,
      status: formData.status,
      updatedBy: userStore.userInfo?.userName || userStore.userInfo?.username
    })
    Message.success('编辑成功')
    emit('success')
    return true
  } catch (e) {
    console.error('提交失败:', e)
    Message.error(e?.msg || e?.data?.msg || '提交失败')
    return false
  }
}
</script>
