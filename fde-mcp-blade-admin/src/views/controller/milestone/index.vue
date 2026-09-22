<template>
  <div class="milestone-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div class="section-title">
          <icon-calendar />
          <span>{{ t('milestone.title') }}</span>
          <a-tag color="arcoblue" size="small">
            {{ t('milestone.projectCode') }}：{{ PROJECT_CODE }}
          </a-tag>
        </div>
      </template>
      <template #extra>
        <a-space>
          <a-tag :color="ttvDays == null ? 'gray' : 'green'" size="small">
            {{ t('milestone.ttv') }}：{{ ttvText }}
          </a-tag>
          <a-button :loading="loading" @click="loadAll">
            <template #icon><icon-refresh /></template>
            {{ t('commonTable.refresh') }}
          </a-button>
        </a-space>
      </template>

      <a-alert type="info" class="hint">{{ t('milestone.hint') }}</a-alert>

      <!-- TTV 汇总：需求确认日 → 首次价值确认日 → TTV -->
      <div class="ttv-strip">
        <div class="ttv-item">
          <div class="ttv-label">{{ t('milestone.kickoffTime') }}</div>
          <div class="ttv-value">{{ ttv.kickoff_time || '-' }}</div>
        </div>
        <span class="ttv-arrow">→</span>
        <div class="ttv-item">
          <div class="ttv-label">{{ t('milestone.firstValueTime') }}</div>
          <div class="ttv-value">{{ ttv.first_value_time || '-' }}</div>
        </div>
        <span class="ttv-arrow">=</span>
        <div class="ttv-item">
          <div class="ttv-label">{{ t('milestone.ttv') }}</div>
          <div class="ttv-value" :class="{ pending: ttvDays == null }">{{ ttvText }}</div>
        </div>
      </div>

      <!-- 7 个节点纵向时间线；auto 节点只读 -->
      <a-spin :loading="loading" style="display: block; width: 100%">
        <a-timeline class="timeline">
          <a-timeline-item
            v-for="node in timeline"
            :key="node.stage"
            :dot-color="node.reached ? 'green' : 'gray'"
          >
            <div class="node" :class="{ reached: node.reached }">
              <div class="node-head">
                <span class="node-name">{{ node.label }}</span>
                <a-tag v-if="node.source === 'auto'" size="small" color="arcoblue">
                  {{ t('milestone.sourceAuto') }}
                </a-tag>
                <a-tag v-else-if="node.source === 'manual'" size="small" color="purple">
                  {{ t('milestone.sourceManual') }}
                </a-tag>
                <a-tag v-else size="small" color="gray">{{ t('milestone.notReached') }}</a-tag>
                <a-button
                  v-if="node.editable"
                  type="text"
                  size="small"
                  @click="openRecord(node)"
                >
                  {{ node.reached ? t('commonTable.edit') : t('milestone.record') }}
                </a-button>
              </div>
              <div class="node-meta">
                <span class="node-time">{{ node.milestone_time || t('milestone.notReached') }}</span>
                <span v-if="node.evidence_ref" class="node-extra">
                  {{ t('milestone.evidence') }}：{{ node.evidence_ref }}
                </span>
                <span v-if="node.remark" class="node-extra">{{ node.remark }}</span>
              </div>
            </div>
          </a-timeline-item>
        </a-timeline>
      </a-spin>
    </a-card>

    <!-- 录入 / 修改弹窗 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? t('milestone.editTitle') : t('milestone.recordTitle')"
      :ok-loading="saving"
      :ok-text="t('commonTable.confirm')"
      :cancel-text="t('commonTable.cancel')"
      unmount-on-close
      @ok="handleSubmit"
      @cancel="modalVisible = false"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item field="stage" :label="t('milestone.stage')">
          <a-input :model-value="stageLabel(form.stage)" disabled />
        </a-form-item>
        <a-form-item field="milestone_time" :label="t('milestone.milestoneTime')">
          <a-date-picker
            v-model="form.milestone_time"
            show-time
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item field="evidence_ref" :label="t('milestone.evidence')">
          <a-input
            v-model="form.evidence_ref"
            :placeholder="t('milestone.evidencePlaceholder')"
            allow-clear
          />
        </a-form-item>
        <a-form-item field="remark" :label="t('milestone.remark')">
          <a-textarea v-model="form.remark" :auto-size="{ minRows: 2, maxRows: 4 }" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { Message } from '@arco-design/web-vue'
import {
  getMilestoneList,
  getMilestoneTtv,
  recordMilestone
} from '@/api/modules/gisProjectMilestone'

const { t } = useI18n()

// 单客户部署固定值（Doc 37 §7.1）
const PROJECT_CODE = 'default'

// 7 个节点，顺序即流程顺序；auto 两个由后端自动回填、不接受人工录入
const STAGES = [
  { stage: 'kickoff', labelKey: 'stageKickoff', editable: true },
  { stage: 'connected', labelKey: 'stageConnected', editable: true },
  { stage: 'first_plugin_online', labelKey: 'stageFirstPluginOnline', editable: false },
  { stage: 'first_success_call', labelKey: 'stageFirstSuccessCall', editable: false },
  { stage: 'first_report', labelKey: 'stageFirstReport', editable: true },
  { stage: 'first_value_confirmed', labelKey: 'stageFirstValueConfirmed', editable: true },
  { stage: 'go_live', labelKey: 'stageGoLive', editable: true }
]

const loading = ref(false)
const list = ref([])
const ttv = ref({})

const modalVisible = ref(false)
const saving = ref(false)
const isEdit = ref(false)
const formRef = ref()

const form = reactive({
  stage: 'kickoff',
  milestone_time: '',
  evidence_ref: '',
  remark: ''
})

const rules = {
  milestone_time: [{ required: true, message: t('milestone.timeRequired') }]
}

function stageLabel(stage) {
  const found = STAGES.find((item) => item.stage === stage)
  return found ? t(`milestone.${found.labelKey}`) : stage
}

// 接口只返回已达成节点，这里按枚举补全 7 行（Doc 37 §7.1）
const timeline = computed(() =>
  STAGES.map((item) => {
    const hit = list.value.find((row) => row.stage === item.stage)
    return {
      stage: item.stage,
      label: t(`milestone.${item.labelKey}`),
      editable: item.editable,
      reached: !!hit,
      milestone_time: hit?.milestone_time || '',
      source: hit?.source || '',
      evidence_ref: hit?.evidence_ref || '',
      remark: hit?.remark || ''
    }
  })
)

const ttvDays = computed(() => {
  const value = ttv.value.ttv_days
  return value === null || value === undefined ? null : value
})

const ttvText = computed(() =>
  ttvDays.value == null ? t('milestone.pending') : `${ttvDays.value} ${t('milestone.dayUnit')}`
)

function openRecord(node) {
  isEdit.value = node.reached
  form.stage = node.stage
  form.milestone_time = node.milestone_time || dayjs().format('YYYY-MM-DD HH:mm:ss')
  form.evidence_ref = node.evidence_ref
  form.remark = node.remark
  modalVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch (_) {
    return
  }
  saving.value = true
  try {
    await recordMilestone({
      project_code: PROJECT_CODE,
      stage: form.stage,
      milestone_time: form.milestone_time,
      evidence_ref: form.evidence_ref,
      remark: form.remark
    })
    Message.success(t('milestone.saveSuccess'))
    modalVisible.value = false
    await loadAll()
  } finally {
    saving.value = false
  }
}

async function loadAll() {
  loading.value = true
  try {
    const [listRes, ttvRes] = await Promise.all([
      getMilestoneList(PROJECT_CODE),
      getMilestoneTtv(PROJECT_CODE)
    ])
    const listData = listRes?.data || listRes
    list.value = Array.isArray(listData) ? listData : (listData?.list || [])
    ttv.value = ttvRes?.data || ttvRes || {}
  } catch (_) {
    // request.js 已弹错，保留上次数据
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)
</script>

<style lang="scss" scoped>
.section-title {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.hint {
  margin-bottom: $space-4;
}

.ttv-strip {
  display: flex;
  align-items: center;
  gap: $space-5;
  margin-bottom: $space-5;
  padding: $space-4 $space-5;
  background: $color-bg-muted;
  border-radius: $radius-md;
}

.ttv-item {
  .ttv-label {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
  }

  .ttv-value {
    margin-top: $space-1;
    font-size: $font-size-xl;
    font-weight: 600;
    color: $color-text;

    &.pending {
      color: $color-text-quaternary;
    }
  }
}

.ttv-arrow {
  color: $color-text-quaternary;
  font-size: $font-size-lg;
}

.timeline {
  padding-left: $space-2;
  margin-bottom: 0;
}

.node {
  padding-bottom: $space-2;

  &.reached {
    .node-name {
      color: $color-text;
      font-weight: 500;
    }
  }
}

.node-head {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.node-name {
  color: $color-text-secondary;
}

.node-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-4;
  margin-top: $space-1;
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.node-time {
  min-width: 160px;
}

.node-extra {
  max-width: 520px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
