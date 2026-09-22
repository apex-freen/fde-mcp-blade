<template>
  <div class="tab-inner">
    <a-alert type="info" class="alert-hint" :content="t('ssoRoleRules.hint')" />

    <!-- 工具栏 -->
    <div class="table-toolbar">
      <a-button type="primary" @click="openCreate">
        <template #icon><icon-plus /></template>
        {{ t('commonTable.add') }}
      </a-button>
      <a-button @click="loadData" :loading="loading">
        <template #icon><icon-refresh /></template>
        {{ t('commonTable.refresh') }}
      </a-button>
    </div>

    <a-table
      :data="list"
      :loading="loading"
      :pagination="false"
      row-key="ruleId"
      :bordered="false"
      size="small"
    >
      <template #columns>
        <a-table-column title="ID" data-index="ruleId" :width="80" />
        <a-table-column :title="t('ssoRoleRules.provider')" data-index="provider" :width="100">
          <template #cell="{ record }">
            <a-tag :color="record.provider === 'ldap' ? 'arcoblue' : 'purple'">
              {{ record.provider?.toUpperCase() }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column :title="t('ssoRoleRules.idpGroup')" data-index="idpGroup" />
        <a-table-column :title="t('ssoRoleRules.roleId')" data-index="roleId" :width="100" />
        <a-table-column :title="t('ssoRoleRules.autoAssign')" data-index="autoAssign" :width="120">
          <template #cell="{ record }">
            <a-tag :color="record.autoAssign ? 'green' : 'gray'">
              {{ record.autoAssign ? t('commonTable.yes') : t('commonTable.no') }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column :title="t('ssoRoleRules.sortOrder')" data-index="sortOrder" :width="100" />
        <a-table-column :title="t('ssoRoleRules.status')" data-index="status" :width="100">
          <template #cell="{ record }">
            <a-tag :color="record.status === '0' ? 'green' : 'gray'">
              {{ record.status === '0' ? t('commonTable.normal') : t('commonTable.disabled') }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column :title="t('commonTable.operation')" :width="160" fixed="right">
          <template #cell="{ record }">
            <a-button type="text" size="mini" @click="openEdit(record)">
              {{ t('commonTable.edit') }}
            </a-button>
            <a-popconfirm :content="t('ssoRoleRules.confirmDelete')" position="br" @ok="handleDelete(record)">
              <a-button type="text" status="danger" size="mini">
                {{ t('commonTable.delete') }}
              </a-button>
            </a-popconfirm>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <!-- 新建/编辑弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? t('ssoRoleRules.editTitle') : t('ssoRoleRules.createTitle')"
      :footer="false"
      :mask-closable="false"
      unmount-on-close
    >
      <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
        <a-form-item :field="['provider']" :label="t('ssoRoleRules.provider')">
          <a-select v-model="formData.provider" :options="providerOptions" :disabled="isEdit" />
        </a-form-item>
        <a-form-item :field="['idpGroup']" :label="t('ssoRoleRules.idpGroup')">
          <a-input v-model="formData.idpGroup" :placeholder="t('ssoRoleRules.idpGroupPlaceholder')" :disabled="isEdit" />
          <span class="form-hint">{{ t('ssoRoleRules.idpGroupHint') }}</span>
        </a-form-item>
        <a-form-item :field="['roleId']" :label="t('ssoRoleRules.roleId')">
          <a-input-number v-model="formData.roleId" :min="1" style="width: 100%" />
          <span class="form-hint">{{ t('ssoRoleRules.roleIdHint') }}</span>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :field="['sortOrder']" :label="t('ssoRoleRules.sortOrder')">
              <a-input-number v-model="formData.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :field="['status']" :label="t('ssoRoleRules.status')">
              <a-radio-group v-model="formData.status" type="button">
                <a-radio value="0">{{ t('commonTable.normal') }}</a-radio>
                <a-radio value="1">{{ t('commonTable.disabled') }}</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item :field="['autoAssign']" :label="t('ssoRoleRules.autoAssign')">
          <a-switch v-model="formData.autoAssign" />
        </a-form-item>
      </a-form>
      <div class="modal-footer">
        <a-button @click="modalVisible = false">{{ t('commonTable.cancel') }}</a-button>
        <a-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ t('commonTable.confirm') }}
        </a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { getSsoRoleRules, createSsoRoleRule, updateSsoRoleRule, deleteSsoRoleRule } from '@/api/modules/sso'

const { t } = useI18n()

const loading = ref(false)
const list = ref([])

const modalVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()
const formData = reactive({
  ruleId: undefined,
  provider: 'ldap',
  idpGroup: '',
  roleId: undefined,
  autoAssign: true,
  sortOrder: 0,
  status: '0'
})
const providerOptions = [
  { label: 'LDAP', value: 'ldap' },
  { label: 'OIDC', value: 'oidc' }
]
const rules = {
  provider: [{ required: true, message: t('ssoRoleRules.providerRequired') }],
  idpGroup: [{ required: true, message: t('ssoRoleRules.idpGroupRequired') }],
  roleId: [{ required: true, message: t('ssoRoleRules.roleIdRequired') }]
}

async function loadData() {
  loading.value = true
  try {
    const res = await getSsoRoleRules()
    const data = res.data || res
    list.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* request.js 已弹错 */ }
  finally { loading.value = false }
}

function openCreate() {
  isEdit.value = false
  Object.assign(formData, {
    ruleId: undefined,
    provider: 'ldap',
    idpGroup: '',
    roleId: undefined,
    autoAssign: true,
    sortOrder: 0,
    status: '0'
  })
  modalVisible.value = true
}

function openEdit(record) {
  isEdit.value = true
  Object.assign(formData, {
    ruleId: record.ruleId,
    provider: record.provider,
    idpGroup: record.idpGroup,
    roleId: record.roleId,
    autoAssign: record.autoAssign,
    sortOrder: record.sortOrder,
    status: record.status
  })
  modalVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch { return }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateSsoRoleRule(formData.ruleId, formData)
      Message.success(t('ssoRoleRules.editSuccess'))
    } else {
      await createSsoRoleRule(formData)
      Message.success(t('ssoRoleRules.createSuccess'))
    }
    modalVisible.value = false
    await loadData()
  } catch (_) { /* request.js 已弹错 */ }
  finally { submitting.value = false }
}

async function handleDelete(record) {
  try {
    await deleteSsoRoleRule(record.ruleId)
    Message.success(t('ssoRoleRules.deleteSuccess'))
    await loadData()
  } catch (_) { /* request.js 已弹错 */ }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.tab-inner {
  padding: 16px 0 0;
}
.alert-hint {
  margin-bottom: 16px;
}
.table-toolbar {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
}
.form-hint {
  display: block;
  margin-top: 4px;
  color: $color-text-tertiary;
  font-size: 12px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
