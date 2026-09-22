<template>
  <div class="hitl-page">
    <!-- 授权人绑定区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div class="section-title">
          <icon-user-group />
          <span>授权人绑定</span>
          <a-tag color="arcoblue" size="small">必须先绑定授权人</a-tag>
        </div>
      </template>
      <template #extra>
        <a-button type="primary" @click="handleAddApprover">
          <template #icon><icon-plus /></template>
          添加授权人
        </a-button>
      </template>

      <a-table
        :columns="approverColumns"
        :data="approverList"
        :pagination="{ pageSize: 5, showTotal: true, showJumper: true }"
        :bordered="{ wrapper: true, cell: true }"
        row-key="id"
      >
        <template #status="{ record }">
          <a-tag :color="record.status === 'active' ? 'green' : 'gray'" size="small">
            {{ record.status === 'active' ? '启用' : '停用' }}
          </a-tag>
        </template>
        <template #notifyChannels="{ record }">
          <a-space wrap>
            <a-tag v-for="ch in record.notify_channels" :key="ch" size="small" color="arcoblue">
              {{ channelLabel(ch) }}
            </a-tag>
          </a-space>
        </template>
        <template #operations="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="handleEditApprover(record)">编辑</a-button>
            <a-popconfirm content="确认移除该授权人？" @ok="handleRemoveApprover(record)">
              <a-button type="text" size="small" status="danger">移除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 预授权配置区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div class="section-title">
          <icon-safe />
          <span>预授权配置</span>
          <a-tag color="orange" size="small">定义哪些操作需要 HITL 审批</a-tag>
        </div>
      </template>
      <template #extra>
        <a-space>
          <a-button @click="handleAddRule">
            <template #icon><icon-plus /></template>
            添加规则
          </a-button>
          <a-button type="primary" :loading="saving" @click="handleSaveRules">
            <template #icon><icon-save /></template>
            保存配置
          </a-button>
        </a-space>
      </template>

      <a-alert type="info" style="margin-bottom: 16px">
        预授权规则决定了智能体执行哪些操作时需要暂停并请求人工审批。未命中任何规则的操作将直接放行。
      </a-alert>

      <a-table
        :columns="ruleColumns"
        :data="ruleList"
        :pagination="false"
        :bordered="{ wrapper: true, cell: true }"
        row-key="id"
      >
        <template #enabled="{ record }">
          <a-switch v-model="record.enabled" />
        </template>
        <template #riskLevel="{ record }">
          <a-tag :color="riskColor(record.risk_level)" size="small">
            {{ riskLabel(record.risk_level) }}
          </a-tag>
        </template>
        <template #actions="{ record }">
          <a-space>
            <a-button type="text" size="small" @click="handleEditRule(record)">编辑</a-button>
            <a-popconfirm content="确认删除该规则？" @ok="handleRemoveRule(record)">
              <a-button type="text" size="small" status="danger">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 授权人编辑弹窗 -->
    <a-modal
      v-model:visible="approverModalVisible"
      :title="approverForm.id ? '编辑授权人' : '添加授权人'"
      :ok-loading="approverSaving"
      @ok="handleApproverSubmit"
      @cancel="approverModalVisible = false"
    >
      <a-form :model="approverForm" :rules="approverRules" layout="vertical">
        <a-form-item field="name" label="授权人姓名">
          <a-input v-model="approverForm.name" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item field="phone" label="手机号">
          <a-input v-model="approverForm.phone" placeholder="用于短信通知" />
        </a-form-item>
        <a-form-item field="email" label="邮箱">
          <a-input v-model="approverForm.email" placeholder="用于邮件通知" />
        </a-form-item>
        <a-form-item field="notify_channels" label="通知渠道">
          <a-checkbox-group v-model="approverForm.notify_channels">
            <a-checkbox value="sms">短信</a-checkbox>
            <a-checkbox value="email">邮件</a-checkbox>
            <a-checkbox value="webhook">Webhook</a-checkbox>
            <a-checkbox value="app">APP 推送</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item field="status" label="状态">
          <a-switch v-model="approverForm.status" :checked-value="'active'" :unchecked-value="'inactive'">
            <template #checked>启用</template>
            <template #unchecked>停用</template>
          </a-switch>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 规则编辑弹窗 -->
    <a-modal
      v-model:visible="ruleModalVisible"
      :title="ruleForm.id ? '编辑规则' : '添加规则'"
      :ok-loading="ruleSaving"
      @ok="handleRuleSubmit"
      @cancel="ruleModalVisible = false"
    >
      <a-form :model="ruleForm" :rules="ruleRules" layout="vertical">
        <a-form-item field="name" label="规则名称">
          <a-input v-model="ruleForm.name" placeholder="如：敏感文件删除审批" />
        </a-form-item>
        <a-form-item field="fun_key" label="触发功能 (fun_key)">
          <a-input v-model="ruleForm.fun_key" placeholder="对应后端方法名，如 file_delete" />
        </a-form-item>
        <a-form-item field="risk_level" label="风险等级">
          <a-select v-model="ruleForm.risk_level">
            <a-option value="low">低</a-option>
            <a-option value="medium">中</a-option>
            <a-option value="high">高</a-option>
            <a-option value="critical">紧急</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="approvers" label="指定授权人">
          <a-select
            v-model="ruleForm.approvers"
            multiple
            placeholder="可多选，留空则通知所有启用授权人"
          >
            <a-option
              v-for="item in approverList"
              :key="item.id"
              :value="item.id"
              :label="item.name"
            />
          </a-select>
        </a-form-item>
        <a-form-item field="timeout" label="审批超时（分钟）">
          <a-input-number v-model="ruleForm.timeout" :min="1" :max="1440" />
        </a-form-item>
        <a-form-item field="timeout_action" label="超时处理">
          <a-radio-group v-model="ruleForm.timeout_action">
            <a-radio value="reject">自动拒绝</a-radio>
            <a-radio value="approve">自动通过</a-radio>
            <a-radio value="escalate">升级通知</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item field="enabled" label="启用">
          <a-switch v-model="ruleForm.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Message } from '@arco-design/web-vue'

// ============ 授权人绑定 ============
const approverList = ref([
  { id: 1, name: '张三', phone: '138****0001', email: 'zhangsan@example.com', status: 'active', notify_channels: ['sms', 'app'] },
  { id: 2, name: '李四', phone: '139****0002', email: 'lisi@example.com', status: 'active', notify_channels: ['sms', 'email'] }
])

const approverColumns = [
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '手机号', dataIndex: 'phone', width: 150 },
  { title: '邮箱', dataIndex: 'email' },
  { title: '通知渠道', slotName: 'notifyChannels', width: 220 },
  { title: '状态', slotName: 'status', width: 100 },
  { title: '操作', slotName: 'operations', width: 140, fixed: 'right' }
]

const channelLabel = (ch) => ({ sms: '短信', email: '邮件', webhook: 'Webhook', app: 'APP' }[ch] || ch)

const approverModalVisible = ref(false)
const approverSaving = ref(false)
const approverForm = reactive({
  id: null, name: '', phone: '', email: '', notify_channels: ['sms'], status: 'active'
})
const approverRules = {
  name: [{ required: true, message: '请输入姓名' }],
  phone: [{ required: true, message: '请输入手机号' }]
}

const resetApproverForm = () => {
  approverForm.id = null
  approverForm.name = ''
  approverForm.phone = ''
  approverForm.email = ''
  approverForm.notify_channels = ['sms']
  approverForm.status = 'active'
}

const handleAddApprover = () => {
  resetApproverForm()
  approverModalVisible.value = true
}

const handleEditApprover = (record) => {
  Object.assign(approverForm, JSON.parse(JSON.stringify(record)))
  approverModalVisible.value = true
}

const handleApproverSubmit = async () => {
  if (!approverForm.name || !approverForm.phone) {
    Message.warning('请填写必填项')
    return
  }
  approverSaving.value = true
  await new Promise(r => setTimeout(r, 300))
  if (approverForm.id) {
    const idx = approverList.value.findIndex(i => i.id === approverForm.id)
    if (idx > -1) approverList.value[idx] = { ...approverForm }
    Message.success('授权人已更新')
  } else {
    approverList.value.push({ ...approverForm, id: Date.now() })
    Message.success('授权人已添加')
  }
  approverSaving.value = false
  approverModalVisible.value = false
}

const handleRemoveApprover = (record) => {
  approverList.value = approverList.value.filter(i => i.id !== record.id)
  Message.success('授权人已移除')
}

// ============ 预授权配置 ============
const ruleList = ref([
  { id: 1, name: '敏感文件删除', fun_key: 'file_delete', risk_level: 'high', approvers: [], timeout: 30, timeout_action: 'reject', enabled: true },
  { id: 2, name: '系统配置修改', fun_key: 'config_update', risk_level: 'medium', approvers: [], timeout: 60, timeout_action: 'reject', enabled: true }
])

const ruleColumns = [
  { title: '启用', slotName: 'enabled', width: 80 },
  { title: '规则名称', dataIndex: 'name', width: 180 },
  { title: '触发功能', dataIndex: 'fun_key', width: 160 },
  { title: '风险等级', slotName: 'riskLevel', width: 100 },
  { title: '超时(分钟)', dataIndex: 'timeout', width: 110 },
  { title: '超时处理', dataIndex: 'timeout_action', width: 120 },
  { title: '操作', slotName: 'actions', width: 140, fixed: 'right' }
]

const riskColor = (lvl) => ({ low: 'green', medium: 'orange', high: 'red', critical: 'rgb(217,48,37)' }[lvl] || 'gray')
const riskLabel = (lvl) => ({ low: '低', medium: '中', high: '高', critical: '紧急' }[lvl] || lvl)

const ruleModalVisible = ref(false)
const ruleSaving = ref(false)
const saving = ref(false)
const ruleForm = reactive({
  id: null, name: '', fun_key: '', risk_level: 'medium', approvers: [], timeout: 30, timeout_action: 'reject', enabled: true
})
const ruleRules = {
  name: [{ required: true, message: '请输入规则名称' }],
  fun_key: [{ required: true, message: '请输入触发功能' }]
}

const resetRuleForm = () => {
  ruleForm.id = null
  ruleForm.name = ''
  ruleForm.fun_key = ''
  ruleForm.risk_level = 'medium'
  ruleForm.approvers = []
  ruleForm.timeout = 30
  ruleForm.timeout_action = 'reject'
  ruleForm.enabled = true
}

const handleAddRule = () => {
  resetRuleForm()
  ruleModalVisible.value = true
}

const handleEditRule = (record) => {
  Object.assign(ruleForm, JSON.parse(JSON.stringify(record)))
  ruleModalVisible.value = true
}

const handleRuleSubmit = async () => {
  if (!ruleForm.name || !ruleForm.fun_key) {
    Message.warning('请填写必填项')
    return
  }
  ruleSaving.value = true
  await new Promise(r => setTimeout(r, 300))
  if (ruleForm.id) {
    const idx = ruleList.value.findIndex(i => i.id === ruleForm.id)
    if (idx > -1) ruleList.value[idx] = { ...ruleForm }
    Message.success('规则已更新')
  } else {
    ruleList.value.push({ ...ruleForm, id: Date.now() })
    Message.success('规则已添加')
  }
  ruleSaving.value = false
  ruleModalVisible.value = false
}

const handleRemoveRule = (record) => {
  ruleList.value = ruleList.value.filter(i => i.id !== record.id)
  Message.success('规则已删除')
}

const handleSaveRules = async () => {
  saving.value = true
  await new Promise(r => setTimeout(r, 500))
  saving.value = false
  Message.success('预授权配置已保存')
}
</script>

<style scoped>
.hitl-page {
  padding: 0 0 24px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title svg {
  font-size: 18px;
}
</style>
