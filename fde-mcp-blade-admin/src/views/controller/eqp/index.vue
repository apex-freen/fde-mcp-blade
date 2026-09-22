<template>
  <div class="eqp-index-page">
    <!-- 搜索区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="searchForm" layout="inline">
        <a-form-item field="eqp_name" :label="$t('eqp.eqpName')">
          <a-input
            v-model="searchForm.eqp_name"
            :placeholder="$t('eqp.eqpNamePlaceholder')"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item field="eqp_ip" :label="$t('eqp.eqpIp')">
          <a-input
            v-model="searchForm.eqp_ip"
            :placeholder="$t('eqp.eqpIpPlaceholder')"
            allow-clear
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item field="data_sta" :label="$t('eqp.dataStatus')">
          <a-select
            v-model="searchForm.data_sta"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 140px"
          >
            <a-option value="A">{{ $t('eqp.valid') }}</a-option>
            <a-option value="D">{{ $t('eqp.deleted') }}</a-option>
            <a-option value="U">{{ $t('eqp.updated') }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="begin_time" :label="$t('eqp.beginTime')">
          <a-date-picker
            v-model="searchForm.begin_time"
            :placeholder="$t('eqp.timePlaceholder')"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            allow-clear
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item field="end_time" :label="$t('eqp.endTime')">
          <a-date-picker
            v-model="searchForm.end_time"
            :placeholder="$t('eqp.timePlaceholder')"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            allow-clear
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ $t('commonTable.search') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('commonTable.reset') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 表格区域 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="table-toolbar">
        <a-space>
          <!--
          <a-button type="primary" @click="handleAdd">
            <template #icon><icon-plus /></template>
            {{ $t('eqp.addDevice') }}
          </a-button>
          -->
          <a-button status="success" @click="openPendingDrawer">
            <template #icon><icon-import /></template>
            {{ $t('eqp.importFromMqtt') }}
          </a-button>
        </a-space>
      </div>

      <a-table
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="eqp_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column :title="$t('eqp.eqpId')" data-index="eqp_id" :width="70" />
          <a-table-column :title="$t('eqp.eqpName')" :width="150">
            <template #cell="{ record }">
              <span>
                {{ record.eqp_name || '-' }}
                <a-popover
                  v-if="record.eqp_desc || record.user_eqp_desc"
                  trigger="click"
                  position="bottom"
                >
                  <a-button type="text" size="mini" style="margin-left: 2px; padding: 0 4px">
                    <template #icon><icon-info-circle /></template>
                  </a-button>
                  <template #content>
                    <div style="max-width: 320px">
                      <div v-if="record.eqp_desc" style="margin-bottom: 8px">
                        <div style="font-weight: 600; font-size: 12px; color: var(--color-text-3); margin-bottom: 2px">{{ $t('eqp.eqpDesc') }}</div>
                        <div style="font-size: 13px; word-break: break-all">{{ record.eqp_desc }}</div>
                      </div>
                      <div v-if="record.user_eqp_desc">
                        <div style="font-weight: 600; font-size: 12px; color: var(--color-text-3); margin-bottom: 2px">{{ $t('eqp.userEqpDesc') }}</div>
                        <div style="font-size: 13px; word-break: break-all">{{ record.user_eqp_desc }}</div>
                      </div>
                    </div>
                  </template>
                </a-popover>
              </span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.userEqpName')" :width="130">
            <template #cell="{ record }">
              {{ record.user_eqp_name || '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.eqpIp')" data-index="eqp_ip" :width="210">
            <template #cell="{ record }">
              <span style="white-space: nowrap">
                {{ record.eqp_ip || '-' }}
                <a-tooltip
                  :content="$t('eqp.noIpHint')"
                  :disabled="!!record.eqp_ip"
                >
                  <a-button
                    type="text"
                    size="mini"
                    :disabled="!record.eqp_ip"
                    @click="handleDirectConnect(record.eqp_ip)"
                    style="margin-left: 4px"
                  >
                    <template #icon><icon-link /></template>
                    {{ $t('eqp.directConnect') }}
                  </a-button>
                </a-tooltip>
              </span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.clientId')" data-index="eqp_client_id" :width="160">
            <template #cell="{ record }">
              {{ record.eqp_client_id || '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.eqpType')" data-index="eqp_type" :width="100">
            <template #cell="{ record }">
              <a-tag v-if="record.eqp_type" size="small">{{ record.eqp_type }}</a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.eqpArea')" data-index="eqp_area" :width="100">
            <template #cell="{ record }">
              {{ record.eqp_area || '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.eqpStatus')" :width="100">
            <template #cell="{ record }">
              <a-tag v-if="record.eqp_sta === '0'" color="orange" size="small">{{ $t('eqp.pending') }}</a-tag>
              <a-tag v-else-if="record.eqp_sta === '1'" color="green" size="small">{{ $t('eqp.normal') }}</a-tag>
              <a-tag v-else-if="record.eqp_sta === '2'" color="red" size="small">{{ $t('eqp.forbidden') }}</a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.dataStatus')" :width="90">
            <template #cell="{ record }">
              <a-tag v-if="record.data_sta === 'A'" color="green" size="small">{{ $t('eqp.valid') }}</a-tag>
              <a-tag v-else-if="record.data_sta === 'D'" color="gray" size="small">{{ $t('eqp.deleted') }}</a-tag>
              <a-tag v-else-if="record.data_sta === 'U'" color="arcoblue" size="small">{{ $t('eqp.updated') }}</a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.createTime')" :width="170">
            <template #cell="{ record }">
              {{ formatDateTime(record.created_time) }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="380" fixed="right">
            <template #cell="{ record }">
              <a-space size="mini">
                <a-button
                  type="text"
                  size="small"
                  :type="selectedEqp?.eqp_id === record.eqp_id ? 'primary' : 'text'"
                  @click="handleSelectEqp(record)"
                >
                  <template #icon><icon-apps /></template>
                  {{ $t('eqp.viewFun') }}
                </a-button>
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('commonTable.edit') }}
                </a-button>
                <a-popconfirm
                  v-if="record.eqp_sta === '2'"
                  :content="$t('eqp.enableConfirm')"
                  position="br"
                  @ok="handleToggleDisable(record, '1')"
                >
                  <a-button type="text" size="small" status="success">
                    <template #icon><icon-check-circle /></template>
                    {{ $t('eqp.enableDevice') }}
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  v-else
                  :content="$t('eqp.disableConfirm')"
                  position="br"
                  @ok="handleToggleDisable(record, '2')"
                >
                  <a-button type="text" size="small" status="warning">
                    <template #icon><icon-close-circle /></template>
                    {{ $t('eqp.disableDevice') }}
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  :content="$t('eqp.deleteConfirm')"
                  position="br"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" size="small" status="danger">
                    <template #icon><icon-delete /></template>
                    {{ $t('commonTable.delete') }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 创建 / 编辑设备弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? $t('eqp.editDevice') : $t('eqp.addDevice')"
      :ok-text="$t('commonTable.confirm')"
      :cancel-text="$t('commonTable.cancel')"
      width="560px"
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="eqp_name" :label="isEdit ? $t('eqp.readonlyEqpName') : $t('eqp.eqpNameLabel')">
              <a-input v-model="formData.eqp_name" :placeholder="$t('eqp.nameRequired')" :disabled="isEdit" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="eqp_sta" :label="$t('eqp.eqpStaLabel')">
              <a-select v-model="formData.eqp_sta" :placeholder="$t('eqp.statusRequired')">
                <a-option value="0">{{ $t('eqp.pending') }}</a-option>
                <a-option value="1">{{ $t('eqp.normal') }}</a-option>
                <a-option value="2">{{ $t('eqp.forbidden') }}</a-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="eqp_ip" :label="$t('eqp.eqpIpLabel')">
              <a-input v-model="formData.eqp_ip" :placeholder="$t('eqp.eqpIp')" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="eqp_client_id" :label="$t('eqp.mqttClientId')">
              <a-input v-model="formData.eqp_client_id" :placeholder="$t('eqp.mqttClientId')" disabled />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="eqp_type" :label="$t('eqp.eqpTypeLabel')">
              <a-input v-model="formData.eqp_type" placeholder="如 mqtt" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="eqp_area" :label="$t('eqp.eqpAreaLabel')">
              <a-input v-model="formData.eqp_area" :placeholder="$t('eqp.eqpAreaPlaceholder')" />
            </a-form-item>
          </a-col>
        </a-row>
        <template v-if="isEdit">
          <a-divider orientation="left" style="margin: 0 0 12px; font-size: 12px; color: var(--color-text-3)">
            {{ $t('eqp.readonlyHint') }}
          </a-divider>
        </template>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item field="user_eqp_name" :label="$t('eqp.userEqpName')">
              <a-input v-model="formData.user_eqp_name" :placeholder="$t('eqp.userEqpNamePlaceholder')" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item field="eqp_pwd" :label="$t('eqp.eqpPwdLabel')">
              <a-input-password v-model="formData.eqp_pwd" :placeholder="$t('eqp.eqpPwdLabel')" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item field="user_eqp_desc" :label="$t('eqp.userEqpDesc')">
          <a-textarea
            v-model="formData.user_eqp_desc"
            :placeholder="$t('eqp.userEqpDescPlaceholder')"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            allow-clear
          />
        </a-form-item>
        <a-form-item field="eqp_desc" :label="isEdit ? $t('eqp.readonlyEqpDesc') : $t('eqp.eqpDescLabel')">
          <a-textarea
            v-model="formData.eqp_desc"
            :placeholder="$t('eqp.eqpDescLabel')"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            :disabled="isEdit"
            allow-clear
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 确认添加设备弹窗（带密码等可选字段） -->
    <a-modal
      v-model:visible="pendingConfirmVisible"
      :title="$t('eqp.confirmAddTitle')"
      :ok-text="$t('eqp.confirmAdd')"
      :cancel-text="$t('commonTable.cancel')"
      width="480px"
      @ok="handleConfirmPendingSubmit"
      @cancel="pendingConfirmVisible = false"
    >
      <a-alert type="info" style="margin-bottom: 16px">
        {{ $t('eqp.autoInfo') }}
      </a-alert>
      <a-form
        ref="pendingFormRef"
        :model="pendingForm"
        :rules="pendingFormRules"
        layout="vertical"
      >
        <a-form-item field="user_eqp_name" :label="$t('eqp.eqpNickname')">
          <a-input v-model="pendingForm.user_eqp_name" :placeholder="$t('eqp.nicknameDefault')" />
        </a-form-item>
        <a-form-item field="eqp_area" :label="$t('eqp.eqpAreaLabel')">
          <a-input v-model="pendingForm.eqp_area" :placeholder="$t('eqp.eqpAreaPlaceholder')" />
        </a-form-item>
        <a-form-item field="eqp_pwd" :label="$t('eqp.eqpPwdLabel')">
          <a-input-password v-model="pendingForm.eqp_pwd" :placeholder="$t('eqp.pwdSuggest')" />
          <template #extra>
            <span style="color: var(--color-warning-6); font-size: 12px;">
              {{ $t('eqp.pwdHint') }}
            </span>
          </template>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- MQTT 待确认设备抽屉 -->
    <a-drawer
      v-model:visible="pendingDrawerVisible"
      :title="$t('eqp.pendingTitle')"
      width="720px"
      :footer="false"
      @cancel="pendingDrawerVisible = false"
    >
      <a-alert type="info" style="margin-bottom: 16px">
        {{ $t('eqp.pendingAlert') }}
      </a-alert>

      <a-table
        :columns="pendingColumns"
        :data="pendingList"
        :loading="pendingLoading"
        :pagination="false"
        row-key="clientid"
      >
        <template #columns>
          <a-table-column :title="$t('eqp.clientId')" data-index="clientid" :width="180" />
          <a-table-column :title="$t('common.username')" data-index="username" :width="120">
            <template #cell="{ record }">
              {{ record.username || '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('eqp.eqpIp')" data-index="ip_address" :width="140">
            <template #cell="{ record }">
              {{ record.ip_address || '-' }}
            </template>
          </a-table-column>
          <a-table-column title="连接时间" :width="170">
            <template #cell="{ record }">
              {{ formatDateTime(record.connected_at) }}
            </template>
          </a-table-column>
          <a-table-column :title="$t('commonTable.operation')" :width="100" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="small" status="success" @click="handleConfirmPending(record)">
                <template #icon><icon-check /></template>
                {{ $t('eqp.confirmAdd') }}
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <a-empty v-if="!pendingLoading && pendingList.length === 0" :description="$t('eqp.noPending')" />
    </a-drawer>

    <!-- 设备功能列表卡片 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="panel-title">
        <span>
          {{ $t('eqp.funList') }}
          <span v-if="selectedEqp" class="sub">
            - {{ selectedEqp.eqp_name }}
          </span>
        </span>
      </div>

      <template v-if="selectedEqp">
        <div class="plugin-actions">
          <a-space>
            <a-tag v-if="EQP_STATUS_MAP[selectedEqp.eqp_sta]" :color="EQP_STATUS_MAP[selectedEqp.eqp_sta].color" size="small">
              {{ $t('eqp.eqpStatusLabel') }}：{{ EQP_STATUS_MAP[selectedEqp.eqp_sta].label }}
            </a-tag>
          </a-space>
        </div>
        <div class="methods-wrapper" :class="{ disabled: selectedEqp.eqp_sta === '2' }">
          <a-form :model="funSearchForm" layout="inline" style="margin-bottom: 12px">
            <a-form-item field="fun_name" :label="$t('eqp.searchFun')">
              <a-input
                v-model="funSearchForm.fun_name"
                :placeholder="$t('eqp.searchFunPlaceholder')"
                allow-clear
                style="width: 160px"
              />
            </a-form-item>
            <a-form-item field="risk_level" :label="$t('eqp.riskLevel')">
              <a-select
                v-model="funSearchForm.risk_level"
                :placeholder="$t('commonTable.all')"
                allow-clear
                style="width: 140px"
              >
                <a-option
                  v-for="opt in RISK_LEVEL_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </a-option>
              </a-select>
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" size="small" @click="handleFunSearch">
                  <template #icon><icon-search /></template>
                  {{ $t('eqp.search') }}
                </a-button>
                <a-button size="small" @click="handleFunReset">
                  <template #icon><icon-refresh /></template>
                  {{ $t('eqp.reset') }}
                </a-button>
              </a-space>
            </a-form-item>
          </a-form>

          <a-table
            :data="funTableData"
            :loading="funLoading"
            :pagination="funPagination"
            row-key="eqp_fun_id"
            size="small"
            @page-change="handleFunPageChange"
            @page-size-change="handleFunPageSizeChange"
          >
            <template #columns>
              <a-table-column :title="$t('eqp.funKey')" data-index="fun_key" :width="180" />
              <a-table-column :title="$t('eqp.funName')" data-index="fun_name" :width="140" />
              <a-table-column :title="$t('eqp.funDesc')" data-index="fun_desc" />
              <a-table-column :title="$t('eqp.riskLevel')" data-index="risk_level" :width="120">
                <template #cell="{ record }">
                  <risk-tag :level="record.risk_level" />
                </template>
              </a-table-column>
              <a-table-column :title="$t('eqp.version')" data-index="version" :width="80" />
              <a-table-column :title="$t('commonTable.operation')" :width="140" fixed="right">
                <template #cell="{ record }">
                  <a-space size="mini">
                    <a-popover
                      v-if="record.fun_params"
                      :arrow-style="{ display: 'none' }"
                      :content-style="{ padding: 0, maxWidth: '480px' }"
                    >
                      <template #content>
                        <json-viewer :data="parseJson(record.fun_params)" title="fun_params" />
                      </template>
                      <a-button type="text" size="small">
                        <template #icon><icon-code /></template>
                        {{ $t('eqp.params') }}
                      </a-button>
                    </a-popover>
                    <a-button type="text" size="small" @click="handleEditFunRiskLevel(record)">
                      <template #icon><icon-edit /></template>
                      {{ $t('eqp.editRisk') }}
                    </a-button>
                  </a-space>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div v-if="selectedEqp.eqp_sta === '2'" class="disabled-mask">
            <div class="disabled-mask-text">{{ $t('eqp.deviceDisabled') }}</div>
          </div>
        </div>
      </template>
      <a-empty v-else description="请选择上方设备查看功能" style="padding: 40px 0" />
    </a-card>

    <!-- 编辑风险等级弹窗 -->
    <a-modal
      v-model:visible="eqpFunModalVisible"
      :title="$t('eqp.editRiskLevel')"
      :ok-text="$t('commonTable.confirm')"
      :cancel-text="$t('commonTable.cancel')"
      width="520px"
      @ok="handleSubmitEqpFun"
      @cancel="eqpFunModalVisible = false"
    >
      <a-descriptions :column="1" bordered size="small" style="margin-bottom: 16px">
        <a-descriptions-item :label="$t('eqp.funKey')">{{ editingEqpFun?.fun_key }}</a-descriptions-item>
        <a-descriptions-item :label="$t('eqp.funName')">{{ editingEqpFun?.fun_name }}</a-descriptions-item>
        <a-descriptions-item :label="$t('eqp.funDesc')">{{ editingEqpFun?.fun_desc || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('eqp.version')">{{ editingEqpFun?.version }}</a-descriptions-item>
      </a-descriptions>
      <a-form :model="eqpFunForm" :rules="eqpFunFormRules" layout="vertical">
        <a-form-item field="risk_level" :label="$t('eqp.riskLevelLabel')">
          <a-radio-group v-model="eqpFunForm.risk_level">
            <a-radio
              v-for="opt in RISK_LEVEL_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              <risk-tag :level="opt.value" :show-label="true" />
            </a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, h, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal, Tag } from '@arco-design/web-vue'
import { api } from '@/api'
import {
  RISK_LEVEL_OPTIONS,
  RISK_LEVEL_MAP
} from '@/constants/riskLevel'
import {
  EQP_STATUS_MAP
} from '@/api/modules/gisEqp'

const { t } = useI18n()

// ========== 通用子组件：风险等级标签 ==========
const RiskTag = {
  name: 'RiskTag',
  props: {
    level: { type: String, default: 'normal' },
    showLabel: { type: Boolean, default: false }
  },
  setup(props) {
    const colorMap = {
      disable: 'gray',
      normal: 'green',
      risk: 'orange',
      auth: 'red'
    }
    const info = computed(() => RISK_LEVEL_MAP[props.level] || { label: props.level, color: 'gray' })
    return () => h(Tag, { color: colorMap[props.level] || 'gray' }, () => info.value.label)
  }
}

// ========== 通用子组件：JSON 查看器 ==========
const JsonViewer = {
  name: 'JsonViewer',
  props: {
    data: { type: [Object, Array, String], default: () => ({}) },
    title: { type: String, default: '' },
    bordered: { type: Boolean, default: true }
  },
  setup(props) {
    const expanded = ref(true)
    const parsed = computed(() => {
      if (typeof props.data === 'string') {
        try { return JSON.parse(props.data) } catch { return props.data }
      }
      return props.data
    })
    const formatted = computed(() => JSON.stringify(parsed.value, null, 2))
    return () => h('div', { class: 'json-viewer' + (props.bordered ? ' bordered' : '') }, [
      h('div', { class: 'json-header', onClick: () => expanded.value = !expanded.value }, [
        h('span', { class: 'json-title' }, props.title || 'JSON'),
        h('span', { class: 'json-toggle' }, expanded.value ? '▼' : '▶')
      ]),
      expanded.value && h('pre', { class: 'json-body' }, formatted.value)
    ])
  }
}

// ========== 工具函数 ==========
const parseJson = (str) => {
  if (!str) return {}
  try { return JSON.parse(str) } catch { return { _raw: str } }
}

// ==================== 搜索相关 ====================
const searchForm = reactive({
  eqp_name: '',
  eqp_ip: '',
  data_sta: undefined,
  begin_time: '',
  end_time: ''
})

const handleSearch = () => {
  pagination.current = 1
  fetchEqpList()
}

const handleReset = () => {
  searchForm.eqp_name = ''
  searchForm.eqp_ip = ''
  searchForm.data_sta = undefined
  searchForm.begin_time = ''
  searchForm.end_time = ''
  pagination.current = 1
  fetchEqpList()
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

const columns = []

const handlePageChange = (page) => {
  pagination.current = page
  fetchEqpList()
}

const handlePageSizeChange = (pageSize) => {
  pagination.pageSize = pageSize
  pagination.current = 1
  fetchEqpList()
}

const fetchEqpList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize,
      order_by: 'eqp_id',
      is_asc: false
    }
    if (searchForm.eqp_name) {
      params.eqp_name = searchForm.eqp_name
    }
    if (searchForm.eqp_ip) {
      params.eqp_ip = searchForm.eqp_ip
    }
    if (searchForm.data_sta) {
      params.data_sta = searchForm.data_sta
    }
    if (searchForm.begin_time) {
      params.begin_time = searchForm.begin_time
    }
    if (searchForm.end_time) {
      params.end_time = searchForm.end_time
    }

    const res = await api.gisEqp.getGisEqpList(params)
    tableData.value = res.rows || res.data?.rows || []
    pagination.total = res.total || res.data?.total || 0
  } catch (e) {
    console.error('获取设备列表失败:', e)
    Message.error(e.msg || e?.data?.msg || t('eqp.fetchFailed'))
  } finally {
    loading.value = false
  }
}

// ==================== 创建 / 编辑弹窗 ====================
const modalVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const getDefaultFormData = () => ({
  eqp_id: undefined,
  eqp_name: '',
  eqp_desc: '',
  eqp_pwd: '',
  eqp_ip: '',
  eqp_client_id: '',
  eqp_type: '',
  eqp_area: '',
  eqp_sta: '1',
  user_eqp_name: '',
  user_eqp_desc: ''
})

const formData = reactive(getDefaultFormData())

const formRules = {
  eqp_name: [{ required: true, message: t('eqp.nameRequired') }],
  eqp_sta: [{ required: true, message: t('eqp.statusRequired') }],
  eqp_area: [{ required: true, message: t('eqp.areaRequired') }]
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(formData, getDefaultFormData())
  modalVisible.value = true
}

const handleEdit = (record) => {
  isEdit.value = true
  Object.assign(formData, getDefaultFormData(), {
    eqp_id: record.eqp_id,
    eqp_name: record.eqp_name,
    eqp_desc: record.eqp_desc || '',
    eqp_pwd: record.eqp_pwd || '',
    eqp_ip: record.eqp_ip || '',
    eqp_client_id: record.eqp_client_id || '',
    eqp_type: record.eqp_type || '',
    eqp_area: record.eqp_area || '',
    eqp_sta: record.eqp_sta,
    user_eqp_name: record.user_eqp_name || '',
    user_eqp_desc: record.user_eqp_desc || ''
  })
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch (e) {
    return
  }

  try {
    if (isEdit.value) {
      // 编辑模式：只发送允许修改的字段（eqp_name/eqp_desc 不可修改）
      const updateData = {}
      if (formData.eqp_pwd !== undefined) updateData.eqp_pwd = formData.eqp_pwd || undefined
      if (formData.eqp_area !== undefined) updateData.eqp_area = formData.eqp_area || undefined
      if (formData.eqp_sta !== undefined) updateData.eqp_sta = formData.eqp_sta
      if (formData.user_eqp_name !== undefined) updateData.user_eqp_name = formData.user_eqp_name || undefined
      if (formData.user_eqp_desc !== undefined) updateData.user_eqp_desc = formData.user_eqp_desc || undefined
      await api.gisEqp.updateGisEqp(formData.eqp_id, updateData)
      Message.success(t('eqp.updateSuccess'))
    } else {
      const data = {
        eqp_name: formData.eqp_name,
        eqp_desc: formData.eqp_desc || undefined,
        eqp_pwd: formData.eqp_pwd || undefined,
        eqp_ip: formData.eqp_ip || undefined,
        eqp_client_id: formData.eqp_client_id || undefined,
        eqp_type: formData.eqp_type || undefined,
        eqp_area: formData.eqp_area || undefined,
        eqp_sta: formData.eqp_sta
      }
      await api.gisEqp.createGisEqp(data)
      Message.success(t('eqp.createSuccess'))
    }

    modalVisible.value = false
    fetchEqpList()
  } catch (e) {
    console.error('提交失败:', e)
    Message.error(e.msg || e?.data?.msg || t('common.error'))
  }
}

// ==================== 删除 ====================
const handleDelete = async (record) => {
  try {
    await api.gisEqp.deleteGisEqp(record.eqp_id)
    Message.success(t('eqp.deleteSuccess'))
    fetchEqpList()
  } catch (e) {
    console.error('删除设备失败:', e)
    Message.error(e.msg || e?.data?.msg || t('common.error'))
  }
}

// ==================== 禁用 / 启用设备 ====================
const handleToggleDisable = async (record, newStatus) => {
  try {
    await api.gisEqp.updateGisEqp(record.eqp_id, {
      eqp_sta: newStatus
    })
    Message.success(newStatus === '2' ? t('eqp.disabled') : t('eqp.enabled'))
    if (selectedEqp.value?.eqp_id === record.eqp_id) {
      selectedEqp.value = { ...record, eqp_sta: newStatus }
    }
    fetchEqpList()
  } catch (e) {
    console.error('更新设备状态失败:', e)
    Message.error(e.msg || e?.data?.msg || t('common.error'))
  }
}

// ==================== 待确认设备（MQTT 导入）====================
const pendingDrawerVisible = ref(false)
const pendingLoading = ref(false)
const pendingList = ref([])
const pendingColumns = []

const pendingConfirmVisible = ref(false)
const pendingConfirmRecord = ref(null)
const pendingFormRef = ref(null)
const pendingForm = reactive({
  user_eqp_name: '',
  eqp_area: '',
  eqp_pwd: ''
})

const pendingFormRules = {
  eqp_area: [{ required: true, message: t('eqp.areaRequired') }]
}

const openPendingDrawer = async () => {
  pendingDrawerVisible.value = true
  await fetchPendingList()
}

const fetchPendingList = async () => {
  pendingLoading.value = true
  try {
    const res = await api.gisEqp.getPendingEqpList()
    pendingList.value = res.data || []
  } catch (e) {
    console.error('获取待确认设备列表失败:', e)
    Message.error(e.msg || e?.data?.msg || t('eqp.fetchPendingFailed'))
  } finally {
    pendingLoading.value = false
  }
}

const handleConfirmPending = (record) => {
  pendingConfirmRecord.value = record
  pendingForm.user_eqp_name = record.username || record.clientid || ''
  pendingForm.eqp_area = ''
  pendingForm.eqp_pwd = ''
  pendingConfirmVisible.value = true
}

const handleConfirmPendingSubmit = async () => {
  try {
    await pendingFormRef.value?.validate()
  } catch (e) {
    return
  }

  try {
    const data = {
      client_id: pendingConfirmRecord.value.clientid,
      username: pendingConfirmRecord.value.username || undefined,
      user_eqp_name: pendingForm.user_eqp_name || undefined,
      eqp_area: pendingForm.eqp_area || undefined,
      eqp_pwd: pendingForm.eqp_pwd || undefined
    }
    await api.gisEqp.confirmPendingEqp(data)
    Message.success(t('eqp.importSuccess'))
    pendingConfirmVisible.value = false
    fetchPendingList()
    fetchEqpList()
  } catch (e) {
    console.error('确认添加设备失败:', e)
    Message.error(e.msg || e?.data?.msg || t('common.error'))
  }
}

// ==================== 设备直连 ====================
const handleDirectConnect = (ip) => {
  window.open(`http://${ip}/login`, '_blank')
}

// ==================== 工具函数 ====================
const formatDateTime = (val) => {
  if (!val) return '-'
  return String(val).replace('T', ' ').split('+')[0]
}

// ==================== 设备功能列表 ====================
const selectedEqp = ref(null)
const funLoading = ref(false)
const funTableData = ref([])

const funSearchForm = reactive({
  fun_name: '',
  risk_level: undefined
})

const funPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100]
})

const handleSelectEqp = (record) => {
  selectedEqp.value = record
  funPagination.current = 1
  fetchEqpFunList()
}

const fetchEqpFunList = async () => {
  if (!selectedEqp.value) return
  funLoading.value = true
  try {
    const params = {
      eqp_id: selectedEqp.value.eqp_id,
      fun_name: funSearchForm.fun_name || undefined,
      risk_level: funSearchForm.risk_level || undefined,
      page: funPagination.current,
      page_size: funPagination.pageSize,
      order_by: 'eqp_fun_id',
      is_asc: true
    }
    const res = await api.gisEqp.getEqpFunList(params)
    funTableData.value = res.rows || res.data?.rows || []
    funPagination.total = res.total || res.data?.total || 0
  } catch (e) {
    console.error('获取设备功能列表失败:', e)
    Message.error(e.msg || e?.data?.msg || t('eqp.fetchFailed'))
  } finally {
    funLoading.value = false
  }
}

const handleFunSearch = () => {
  funPagination.current = 1
  fetchEqpFunList()
}

const handleFunReset = () => {
  funSearchForm.fun_name = ''
  funSearchForm.risk_level = undefined
  funPagination.current = 1
  fetchEqpFunList()
}

const handleFunPageChange = (page) => {
  funPagination.current = page
  fetchEqpFunList()
}

const handleFunPageSizeChange = (pageSize) => {
  funPagination.pageSize = pageSize
  funPagination.current = 1
  fetchEqpFunList()
}

// ==================== 编辑风险等级 ====================
const eqpFunModalVisible = ref(false)
const editingEqpFun = ref(null)
const eqpFunForm = reactive({
  risk_level: 'normal'
})
const eqpFunFormRules = {
  risk_level: [{ required: true, message: t('eqp.riskLevelRequired') }]
}

const handleEditFunRiskLevel = (record) => {
  editingEqpFun.value = record
  eqpFunForm.risk_level = record.risk_level || 'normal'
  eqpFunModalVisible.value = true
}

const handleSubmitEqpFun = async () => {
  try {
    await api.gisEqp.updateEqpFunRiskLevel(
      editingEqpFun.value.eqp_fun_id,
      eqpFunForm.risk_level
    )
    Message.success(t('eqp.updateSuccess2'))
    eqpFunModalVisible.value = false
    fetchEqpFunList()
  } catch (e) {
    console.error('更新风险等级失败:', e)
    Message.error(e.msg || e?.data?.msg || t('common.error'))
  }
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchEqpList()
})
</script>

<style lang="scss" scoped>
.eqp-index-page {
  .table-toolbar {
    margin-bottom: $space-4;
    display: flex;
    justify-content: flex-end;
  }

  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 14px;
    color: var(--color-text-1);

    .sub {
      font-weight: 400;
      color: var(--color-text-3);
      font-size: 13px;
      margin-left: 4px;
    }
  }

  .plugin-actions {
    margin-bottom: 12px;
  }

  .methods-wrapper {
    position: relative;

    &.disabled {
      .disabled-mask {
        display: flex;
      }
    }

    .disabled-mask {
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.7);
      z-index: 10;
      align-items: center;
      justify-content: center;
      border-radius: 4px;

      .disabled-mask-text {
        font-size: 16px;
        font-weight: 600;
        color: var(--color-text-3);
        background: var(--color-fill-2);
        padding: 8px 20px;
        border-radius: 4px;
      }
    }
  }
}

:deep(.json-viewer) {
  font-family: "SFMono-Regular", Consolas, monospace;

  &.bordered {
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    overflow: hidden;
  }

  .json-header {
    padding: 8px 12px;
    background: var(--color-fill-2);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--color-text-2);
    user-select: none;

    &:hover {
      background: var(--color-fill-3);
    }

    .json-toggle {
      font-size: 10px;
      color: var(--color-text-4);
    }
  }

  .json-body {
    padding: 12px;
    margin: 0;
    max-height: 360px;
    overflow: auto;
    background: #1d2129;
    color: #e5e6eb;
    font-size: 12px;
    line-height: 1.6;
  }
}
</style>
