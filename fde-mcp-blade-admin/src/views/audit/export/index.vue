<template>
  <div class="audit-export-page">
    <!-- 导出表单 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="exportForm" layout="inline">
        <a-form-item field="domains" :label="$t('auditExport.domains')" :required="true">
          <a-select
            v-model="exportForm.domains"
            multiple
            allow-clear
            :max-tag-count="2"
            :placeholder="$t('auditExport.domainsPlaceholder')"
            style="width: 300px"
          >
            <a-option v-for="opt in domainOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="time_range" :label="$t('auditExport.timeRange')" :required="true">
          <a-space>
            <a-range-picker v-model="timeRange" value-format="YYYY-MM-DD" style="width: 260px" />
            <a-button-group size="small">
              <a-button @click="setRecent(7)">{{ $t('auditExport.last7Days') }}</a-button>
              <a-button @click="setRecent(30)">{{ $t('auditExport.last30Days') }}</a-button>
            </a-button-group>
          </a-space>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="exportLoading" @click="handleExport">
            <template #icon><icon-download /></template>
            {{ $t('auditExport.export') }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 导出说明 -->
    <a-card :bordered="false" style="margin-top: 16px" :title="$t('auditExport.hintTitle')">
      <ul class="hint-list">
        <li>{{ $t('auditExport.hintSheets') }}</li>
        <li>{{ $t('auditExport.hintLimit') }}</li>
        <li>{{ $t('auditExport.hintNotice') }}</li>
      </ul>
    </a-card>
  </div>
</template>

<script setup>
// 审计中心 · 审计导出（menu 1007，权限码 audit:export）
// 文档：77 审计中心前端对接 §3.4 / §5.2
// 接口返回的是 xlsx 二进制流（不是 JSON），失败时返回 400 + JSON（会被包成 blob）
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { api } from '@/api'
import { downloadBlob, buildExportFilename, extractBlobErrorMsg } from '@/utils/download'

const { t } = useI18n()

// 数据域（提交时用逗号拼接；展示用中文名）
const DOMAIN_KEYS = [
  { value: 'cmd', key: 'domainCmd' },
  { value: 'grant', key: 'domainGrant' },
  { value: 'token', key: 'domainToken' },
  { value: 'risk', key: 'domainRisk' }
]

const domainOptions = computed(() => DOMAIN_KEYS.map(item => ({
  value: item.value,
  label: t(`auditExport.${item.key}`)
})))

const exportForm = reactive({
  domains: ['cmd', 'grant']
})

// 时间范围默认近 7 天，避免一上来就查全表
const timeRange = ref([])

function setRecent(days) {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (days - 1))
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  timeRange.value = [fmt(start), fmt(end)]
}

setRecent(7)

// 时间跨度上限 31 天（含首尾两天），前端提前拦截，避免等后端报错
const MAX_SPAN_DAYS = 31

function spanDays(begin, end) {
  const b = new Date(`${begin}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  return Math.floor((e - b) / 86400000) + 1
}

const exportLoading = ref(false)

async function handleExport() {
  if (!exportForm.domains.length) {
    Message.warning(t('auditExport.domainsRequired'))
    return
  }
  const [beginTime, endTime] = timeRange.value || []
  if (!beginTime || !endTime) {
    Message.warning(t('auditExport.timeRangeRequired'))
    return
  }
  const days = spanDays(beginTime, endTime)
  if (days > MAX_SPAN_DAYS) {
    Message.warning(t('auditExport.spanExceeded', { n: days }))
    return
  }

  exportLoading.value = true
  try {
    const res = await api.auditExport.exportAuditArchive({
      domains: exportForm.domains.join(','),
      begin_time: beginTime,
      end_time: endTime
    })
    downloadBlob(res, buildExportFilename('audit_export'))
    Message.success(t('auditExport.exportSuccess'))
  } catch (e) {
    // 失败（如跨度超限、单域超 5 万行）返回的是 JSON，需从 blob 中解析出后端 msg
    Message.error(await extractBlobErrorMsg(e, t('auditExport.exportFailed')))
  } finally {
    exportLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.audit-export-page {
  .hint-list {
    margin: 0;
    padding-left: $space-5;
    color: var(--color-text-2);
    line-height: 2;

    li {
      font-size: 13px;
    }
  }
}
</style>
