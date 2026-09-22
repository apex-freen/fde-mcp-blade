<template>
  <a-drawer
    v-model:visible="visibleModel"
    :title="drawerTitle"
    width="560px"
    unmount-on-close
  >
    <!-- 已选数量统计（不含大类/目录分组节点） -->
    <div class="assign-header">已选 {{ checkedCount }} 项</div>

    <div class="permission-tree-container">
      <div v-if="loading" style="padding: 40px; text-align: center">
        <a-spin dot />
      </div>
      <a-empty v-else-if="treeData.length === 0" description="暂无权限点数据" />
      <a-tree
        v-else
        v-model:checked-keys="checkedKeys"
        :data="treeData"
        checkable
        :default-expand-all="true"
      />
    </div>

    <template #footer>
      <a-space>
        <a-button @click="visibleModel = false">取消</a-button>
        <a-button type="primary" :loading="saving" @click="handleSubmit">保存</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // 当前分配权限的权限组记录
  role: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

const visibleModel = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const drawerTitle = computed(() => `分配权限 - ${props.role?.name || ''}`)

// ==================== 数据 ====================
const loading = ref(false)
const saving = ref(false)
const treeData = ref([])
const checkedKeys = ref([])

// permissionId -> { code, parentPermissionId }：用于保存时剔除"动作码"冗余项
const nodeMeta = ref({})

// 分组节点（大类/目录）的 key 前缀：menu:{menu_id} / group:unclassified
const isGroupKey = (key) => {
  const k = String(key)
  return k.startsWith('menu:') || k.startsWith('group:')
}

// 已勾选的权限点数量（排除分组节点）
const checkedCount = computed(
  () => checkedKeys.value.filter((key) => !isGroupKey(key)).length
)

// 把后端权限点树递归转换为 a-tree 需要的结构（2026-09-14 起为「大类 → 目录 → 页面 → 动作码」）
//   - permissionId == null 的是分组节点（大类/目录）→ 不可勾选
//   - 有 permissionId 的节点以其 id 为 key
//   - 同时记录每个权限点的父级权限点，供保存时过滤动作码
const buildTree = (nodes, parentPerm) =>
  (nodes || []).map((node) => {
    const hasId = node.permissionId !== null && node.permissionId !== undefined
    // parentPerm 只在"有权限点的节点"处更新，因此动作码拿到的就是它的宿主页面
    const nextParent = hasId
      ? { permissionId: node.permissionId, code: node.code }
      : parentPerm
    const children = buildTree(node.children || [], nextParent)

    if (hasId) {
      nodeMeta.value[node.permissionId] = {
        code: node.code,
        parentPermissionId: parentPerm?.permissionId ?? null
      }
    }

    return {
      key: hasId ? node.permissionId : node.key,
      title: node.code ? `${node.label || node.key}（${node.code}）` : node.label || node.key,
      checkable: hasId,
      isLeaf: children.length === 0,
      children
    }
  })

// 打开抽屉时并发获取权限点树 + 该权限组已勾选的权限点
const loadData = async () => {
  loading.value = true
  checkedKeys.value = []
  nodeMeta.value = {}
  try {
    const [treeRes, assignedRes] = await Promise.all([
      api.gisPermission.getGisPermissionTree(),
      props.role?.roleId
        ? api.gisRolePermission.getPermissionsByRole(props.role.roleId)
        : Promise.resolve(null)
    ])
    treeData.value = buildTree(treeRes?.data || [])
    // 该接口的响应体存在口径差异：旧版文档为权限点 ID 数组 [1,2,3]，
    // 「26 号文档」§4.3 为对象数组 [{ permissionId }]。两种都兼容，
    // 避免读不到时把已分配权限当成空、保存后误清空。口径确认后可去掉兼容分支。
    const assigned = Array.isArray(assignedRes?.data) ? assignedRes.data : []
    checkedKeys.value = assigned
      .map((item) => (item && typeof item === 'object' ? item.permissionId : item))
      .filter((id) => id !== undefined && id !== null)
  } catch (e) {
    console.error('获取权限数据失败:', e)
    treeData.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) loadData()
  }
)

// ==================== 保存 ====================
const handleSubmit = async () => {
  if (!props.role?.roleId) return

  // 1) 过滤掉分组节点（menu:* / group:*），只留权限点 id
  const checkedIds = checkedKeys.value
    .filter((key) => !isGroupKey(key))
    .map((key) => Number(key))

  // 2) 剔除"动作码"：后端鉴权是前缀匹配（页面码已隐含其下动作码），
  //    勾选页面时 a-tree 会级联勾上动作码，提交会把冗余数据写进角色授权表
  const checkedSet = new Set(checkedIds)
  const permissionIds = checkedIds.filter((id) => {
    const meta = nodeMeta.value[id]
    if (!meta || meta.parentPermissionId === null) return true // 页面级权限点
    return !checkedSet.has(meta.parentPermissionId) // 宿主页面已勾选 → 动作码冗余，丢弃
  })

  saving.value = true
  try {
    await api.gisRolePermission.assignPermissionsToRole({
      roleId: props.role.roleId,
      permissionIds,
      createdBy: userStore.userInfo?.userName || userStore.userInfo?.username
    })
    Message.success('权限分配成功')
    visibleModel.value = false
    emit('success')
  } catch (e) {
    console.error('分配权限失败:', e)
    Message.error(e?.msg || e?.data?.msg || '分配权限失败')
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.assign-header {
  margin-bottom: $space-3;
  color: var(--color-text-2);
}

.permission-tree-container {
  max-height: 480px;
  overflow-y: auto;
  padding: $space-3;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
}
</style>
