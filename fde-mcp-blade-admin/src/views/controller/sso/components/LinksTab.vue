<template>
  <div class="tab-inner">
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
      row-key="authId"
      :bordered="false"
      size="small"
    >
      <template #columns>
        <a-table-column title="ID" data-index="authId" :width="80" />
        <a-table-column :title="t('ssoLinks.provider')" data-index="provider" :width="100">
          <template #cell="{ record }">
            <a-tag :color="record.provider === 'ldap' ? 'arcoblue' : 'purple'">
              {{ record.provider?.toUpperCase() }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column :title="t('ssoLinks.userId')" data-index="userId" :width="100" />
        <a-table-column :title="t('ssoLinks.subject')" data-index="subject" />
        <a-table-column :title="t('ssoLinks.idpUserName')" data-index="idpUserName" />
        <a-table-column :title="t('ssoLinks.email')" data-index="email" />
        <a-table-column :title="t('ssoLinks.linkType')" data-index="linkType" :width="120">
          <template #cell="{ record }">
            {{ record.linkType === 'auto' ? t('ssoLinks.linkTypeAuto') : t('ssoLinks.linkTypeManual') }}
          </template>
        </a-table-column>
        <a-table-column :title="t('ssoLinks.lastLoginTime')" data-index="lastLoginTime" :width="180" />
        <a-table-column :title="t('commonTable.operation')" :width="120" fixed="right">
          <template #cell="{ record }">
            <a-popconfirm :content="t('ssoLinks.confirmUnbind')" position="br" @ok="handleDelete(record)">
              <a-button type="text" status="danger" size="mini">
                {{ t('ssoLinks.unbind') }}
              </a-button>
            </a-popconfirm>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <!-- 新建/编辑绑定弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="t('ssoLinks.createTitle')"
      :footer="false"
      :mask-closable="false"
      unmount-on-close
    >
      <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
        <a-form-item :field="['provider']" :label="t('ssoLinks.provider')">
          <a-select v-model="formData.provider" :options="providerOptions" />
        </a-form-item>
        <a-form-item :field="['userId']" :label="t('ssoLinks.userId')">
          <a-input-number v-model="formData.userId" :min="1" style="width: 100%" />
          <span class="form-hint">{{ t('ssoLinks.userIdHint') }}</span>
        </a-form-item>
        <a-form-item :field="['subject']" :label="t('ssoLinks.subject')">
          <a-input v-model="formData.subject" :placeholder="t('ssoLinks.subjectPlaceholder')" />
          <span class="form-hint">{{ t('ssoLinks.subjectHint') }}</span>
        </a-form-item>
        <a-form-item :field="['idpUserName']" :label="t('ssoLinks.idpUserName')">
          <a-input v-model="formData.idpUserName" />
        </a-form-item>
        <a-form-item :field="['email']" :label="t('ssoLinks.email')">
          <a-input v-model="formData.email" />
        </a-form-item>
        <a-form-item :field="['displayName']" :label="t('ssoLinks.displayName')">
          <a-input v-model="formData.displayName" />
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
import { getSsoLinks, createSsoLink, deleteSsoLink } from '@/api/modules/sso'

const { t } = useI18n()

const loading = ref(false)
const list = ref([])

const modalVisible = ref(false)
const submitting = ref(false)
const formRef = ref()
const formData = reactive({
  provider: 'ldap',
  userId: undefined,
  subject: '',
  idpUserName: '',
  email: '',
  displayName: ''
})
const providerOptions = [
  { label: 'LDAP', value: 'ldap' },
  { label: 'OIDC', value: 'oidc' }
]
const rules = {
  provider: [{ required: true, message: t('ssoLinks.providerRequired') }],
  subject: [{ required: true, message: t('ssoLinks.subjectRequired') }]
}

async function loadData() {
  loading.value = true
  try {
    const res = await getSsoLinks()
    const data = res.data || res
    list.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* request.js 已弹错 */ }
  finally { loading.value = false }
}

function openCreate() {
  Object.assign(formData, {
    provider: 'ldap',
    userId: undefined,
    subject: '',
    idpUserName: '',
    email: '',
    displayName: ''
  })
  modalVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch { return }
  submitting.value = true
  try {
    await createSsoLink({ ...formData })
    Message.success(t('ssoLinks.createSuccess'))
    modalVisible.value = false
    await loadData()
  } catch (_) { /* request.js 已弹错 */ }
  finally { submitting.value = false }
}

async function handleDelete(record) {
  try {
    await deleteSsoLink(record.authId)
    Message.success(t('ssoLinks.unbindSuccess'))
    await loadData()
  } catch (_) { /* request.js 已弹错 */ }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.tab-inner {
  padding: 16px 0 0;
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
