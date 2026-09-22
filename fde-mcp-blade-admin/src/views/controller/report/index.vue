<template>
  <div class="report-page">
    <!-- 筛选栏 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-form :model="filters" layout="inline" class="filter-bar">
        <a-form-item :label="t('valueReport.period')">
          <a-radio-group v-model="filters.period" type="button" @change="handlePeriodChange">
            <a-radio value="week">{{ t('valueReport.periodWeek') }}</a-radio>
            <a-radio value="month">{{ t('valueReport.periodMonth') }}</a-radio>
            <a-radio value="quarter">{{ t('valueReport.periodQuarter') }}</a-radio>
            <a-radio value="custom">{{ t('valueReport.periodCustom') }}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="filters.period === 'custom'" :label="t('valueReport.customRange')">
          <a-range-picker
            v-model="filters.range"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </a-form-item>
        <a-form-item :label="t('valueReport.dept')">
          <a-select
            v-model="filters.dept_id"
            :placeholder="t('valueReport.allDepts')"
            allow-clear
            style="width: 180px"
          >
            <a-option v-for="d in deptOptions" :key="d.deptId" :value="d.deptId">
              {{ d.deptName }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('valueReport.plugin')">
          <a-select
            v-model="filters.plugin_name"
            :placeholder="t('valueReport.allPlugins')"
            allow-clear
            style="width: 200px"
          >
            <a-option v-for="p in pluginOptions" :key="p.plugin_name" :value="p.plugin_name">
              {{ p.plugin_title || p.plugin_name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" :loading="loading" @click="loadReport">
              <template #icon><icon-search /></template>
              {{ t('commonTable.search') }}
            </a-button>
            <a-dropdown @select="handleExport">
              <a-button :loading="!!exporting">
                <template #icon><icon-download /></template>
                {{ t('valueReport.export') }}
              </a-button>
              <template #content>
                <a-doption value="xlsx">Excel (.xlsx)</a-doption>
                <a-doption value="csv">CSV (.csv)</a-doption>
                <a-doption value="json">JSON (.json)</a-doption>
              </template>
            </a-dropdown>
          </a-space>
        </a-form-item>
      </a-form>
      <div class="drill-hint">{{ t('valueReport.drillHint') }}</div>
    </a-card>

    <!-- 汇总指标 -->
    <div v-if="summary.length" class="kpi-row">
      <a-card v-for="item in summary" :key="item.code" :bordered="false" class="kpi-card">
        <div class="kpi-value">{{ item.display || item.value }}</div>
        <div class="kpi-title">{{ item.name }}</div>
      </a-card>
    </div>

    <!-- 采纳概况 -->
    <a-card
      v-if="report"
      :bordered="false"
      style="margin-top: 16px"
      :title="t('valueReport.adoptionTitle')"
    >
      <a-descriptions :column="3" bordered size="medium">
        <a-descriptions-item :label="t('valueReport.activeTokens')">
          {{ adoption.active_tokens ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('valueReport.activeUsers')">
          {{ adoption.active_users ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('valueReport.adoptionRate')">
          {{ adoption.adoption_rate != null ? adoption.adoption_rate + '%' : '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('valueReport.equivalentManDays')">
          {{ adoption.equivalent_man_days ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('valueReport.declaredCalls')">
          {{ adoption.declared_calls ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="t('valueReport.generatedAt')">
          {{ report.meta?.generated_at ?? '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <!-- 全部指标 -->
    <a-card :bordered="false" style="margin-top: 16px" :title="t('valueReport.metricsTitle')">
      <a-table
        :data="metrics"
        :loading="loading"
        :pagination="false"
        row-key="code"
        :bordered="false"
        size="small"
      >
        <template #columns>
          <a-table-column :title="t('valueReport.metricCode')" data-index="code" :width="70" />
          <a-table-column :title="t('valueReport.metricName')" data-index="name" :width="180" />
          <a-table-column :title="t('valueReport.metricCategory')" data-index="category" :width="100" />
          <a-table-column :title="t('valueReport.metricShow')" :width="220">
            <template #cell="{ record }">
              {{ record.display || record.value }}
            </template>
          </a-table-column>
          <a-table-column :title="t('valueReport.metricDefinition')" data-index="definition" />
        </template>
      </a-table>
    </a-card>

    <!-- 优化建议 -->
    <a-card :bordered="false" style="margin-top: 16px" :title="t('valueReport.suggestionsTitle')">
      <ul v-if="suggestions.length" class="suggestion-list">
        <li v-for="(s, i) in suggestions" :key="i">{{ s }}</li>
      </ul>
      <a-empty v-else :description="t('valueReport.noSuggestions')" />
    </a-card>

    <!-- 原始区块数据（efficiency / quality / adoption 嵌套结构） -->
    <a-card :bordered="false" style="margin-top: 16px">
      <a-collapse :bordered="false">
        <a-collapse-item v-for="sec in rawSections" :key="sec.key" :header="sec.title">
          <pre class="raw-json">{{ formatJson(sec.data) }}</pre>
        </a-collapse-item>
      </a-collapse>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { getReport, exportReport } from '@/api/modules/gisReport'
import { getDeptList } from '@/api/modules/gisUserDept'
import { getPluginRegistry } from '@/api/modules/gisSystemPlugin'

const { t } = useI18n()

const loading = ref(false)
const exporting = ref('')
const report = ref(null)

const deptOptions = ref([])
const pluginOptions = ref([])

const filters = reactive({
  period: 'month',
  range: [],
  dept_id: undefined,
  plugin_name: undefined
})

const summary = computed(() => report.value?.summary || [])
const metrics = computed(() => report.value?.metrics || [])
const suggestions = computed(() => report.value?.suggestions || [])
const adoption = computed(() => report.value?.adoption || {})

/**
 * efficiency / quality / adoption 的嵌套结构在接口文档中未给出完整字段，
 * 因此以原始 JSON 呈现，避免猜错字段渲染出错误语义
 */
const rawSections = computed(() => {
  if (!report.value) return []
  return [
    { key: 'efficiency', title: t('valueReport.sectionEfficiency'), data: report.value.efficiency },
    { key: 'quality', title: t('valueReport.sectionQuality'), data: report.value.quality },
    { key: 'adoption', title: t('valueReport.sectionAdoption'), data: report.value.adoption }
  ].filter(s => s.data)
})

function formatJson(data) {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function buildQuery() {
  const q = { period: filters.period }
  if (filters.period === 'custom' && filters.range?.length === 2) {
    q.start = filters.range[0]
    q.end = filters.range[1]
  }
  if (filters.dept_id !== undefined && filters.dept_id !== null) q.dept_id = filters.dept_id
  if (filters.plugin_name) q.plugin_name = filters.plugin_name
  return q
}

function handlePeriodChange(val) {
  if (val !== 'custom') {
    filters.range = []
    loadReport()
  }
}

async function loadReport() {
  loading.value = true
  try {
    const res = await getReport(buildQuery())
    report.value = res.data || res
  } catch (_) {
    report.value = null
  } finally { loading.value = false }
}

async function handleExport(format) {
  exporting.value = format
  try {
    const blob = await exportReport(format, buildQuery())
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.download = `value_report_${Date.now()}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (_) {
    Message.error(t('valueReport.exportFailed'))
  } finally { exporting.value = '' }
}

/** 筛选项的数据源复用既有接口，失败时不阻塞报告主流程 */
async function loadFilterOptions() {
  try {
    const res = await getDeptList()
    const data = res.data || res
    deptOptions.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* 静默 */ }

  try {
    const res = await getPluginRegistry()
    const data = res.data || res
    pluginOptions.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* 静默 */ }
}

onMounted(() => {
  loadFilterOptions()
  loadReport()
})
</script>

<style lang="scss" scoped>
.filter-bar {
  row-gap: $space-2;
}

.drill-hint {
  margin-top: $space-2;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.kpi-row {
  margin-top: $space-4;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: $space-4;
}

.kpi-card {
  :deep(.arco-card-body) {
    padding: $space-5;
  }
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: $color-text;
}

.kpi-title {
  margin-top: $space-1;
  font-size: $font-size-sm;
  color: $color-text-tertiary;
}

.suggestion-list {
  margin: 0;
  padding-left: $space-5;
  color: $color-text-secondary;
  line-height: 1.8;

  li + li {
    margin-top: $space-1;
  }
}

.raw-json {
  margin: 0;
  padding: $space-3;
  background: $color-bg-muted;
  border-radius: $radius;
  font-family: 'JetBrains Mono', monospace;
  font-size: $font-size-xs;
  line-height: 1.6;
  max-height: 420px;
  overflow: auto;
}
</style>
