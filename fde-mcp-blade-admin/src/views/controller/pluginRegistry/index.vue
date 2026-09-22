<template>
  <div class="plugin-registry-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-tabs v-model:active-key="activeTab" type="rounded" @change="handleTabChange">
        <!-- 插件注册表 -->
        <a-tab-pane key="registry" :title="t('pluginRegistry.tabRegistry')">
          <div class="table-toolbar">
            <a-button type="primary" :loading="syncing" @click="handleSync">
              <template #icon><icon-sync /></template>
              {{ t('pluginRegistry.sync') }}
            </a-button>
            <a-button :loading="registryLoading" @click="loadRegistry">
              <template #icon><icon-refresh /></template>
              {{ t('commonTable.refresh') }}
            </a-button>
            <span class="sync-hint">{{ t('pluginRegistry.syncHint') }}</span>
          </div>

          <a-table
            :data="registryList"
            :loading="registryLoading"
            :pagination="false"
            row-key="id"
            :bordered="false"
            size="small"
          >
            <template #columns>
              <a-table-column :title="t('pluginRegistry.pluginName')" data-index="plugin_name" :width="200" />
              <a-table-column :title="t('pluginRegistry.pluginTitle')" data-index="plugin_title" :width="160" />
              <a-table-column :title="t('pluginRegistry.pluginVersion')" data-index="plugin_version" :width="100" />
              <a-table-column :title="t('pluginRegistry.serviceType')" data-index="service_type" :width="150" />
              <a-table-column :title="t('pluginRegistry.scenario')" data-index="scenario" :width="110" />
              <a-table-column :title="t('pluginRegistry.status')" :width="100">
                <template #cell="{ record }">
                  <a-tag :color="record.status === 'enabled' ? 'green' : 'gray'">
                    {{ record.status ?? '-' }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="t('pluginRegistry.source')" data-index="source" :width="100" />
              <a-table-column :title="t('pluginRegistry.firstOnlineTime')" data-index="first_online_time" :width="170" />
              <a-table-column :title="t('pluginRegistry.lastUpdatedTime')" data-index="last_updated_time" :width="170" />
              <a-table-column :title="t('pluginRegistry.lastOperator')" :width="110">
                <template #cell="{ record }">
                  {{ record.last_operator ?? '-' }}
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 生命周期日志 -->
        <a-tab-pane key="log" :title="t('pluginRegistry.tabLog')">
          <a-form :model="logQuery" layout="inline" class="log-filter">
            <a-form-item :label="t('pluginRegistry.pluginName')">
              <a-input
                v-model="logQuery.plugin_name"
                :placeholder="t('pluginRegistry.pluginNamePlaceholder')"
                allow-clear
                style="width: 200px"
              />
            </a-form-item>
            <a-form-item :label="t('pluginRegistry.action')">
              <a-select
                v-model="logQuery.action"
                :placeholder="t('commonTable.all')"
                allow-clear
                style="width: 150px"
              >
                <a-option v-for="act in actionOptions" :key="act" :value="act">{{ act }}</a-option>
              </a-select>
            </a-form-item>
            <a-form-item :label="t('pluginRegistry.timeRange')">
              <a-range-picker
                v-model="logQuery.timeRange"
                show-time
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 340px"
              />
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" :loading="logLoading" @click="loadLog">
                  {{ t('commonTable.search') }}
                </a-button>
                <a-button @click="resetLogQuery">{{ t('commonTable.reset') }}</a-button>
              </a-space>
            </a-form-item>
          </a-form>

          <a-table
            :data="logList"
            :loading="logLoading"
            :pagination="false"
            row-key="log_id"
            :bordered="false"
            size="small"
          >
            <template #columns>
              <a-table-column :title="t('pluginRegistry.logId')" data-index="log_id" :width="80" />
              <a-table-column :title="t('pluginRegistry.pluginName')" data-index="plugin_name" :width="200" />
              <a-table-column :title="t('pluginRegistry.action')" :width="110">
                <template #cell="{ record }">
                  <a-tag :color="actionColor(record.action)">{{ record.action ?? '-' }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="t('pluginRegistry.versionChange')" :width="160">
                <template #cell="{ record }">
                  {{ record.old_version || '-' }} → {{ record.new_version || '-' }}
                </template>
              </a-table-column>
              <a-table-column :title="t('pluginRegistry.oldPluginName')" :width="180">
                <template #cell="{ record }">
                  {{ record.old_plugin_name ?? '-' }}
                </template>
              </a-table-column>
              <a-table-column :title="t('pluginRegistry.isHot')" :width="90">
                <template #cell="{ record }">
                  <a-tag :color="record.is_hot ? 'orange' : 'gray'">
                    {{ record.is_hot ? t('commonTable.yes') : t('commonTable.no') }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="t('pluginRegistry.operator')" :width="120">
                <template #cell="{ record }">
                  {{ record.operator_name || '-' }}
                </template>
              </a-table-column>
              <a-table-column :title="t('pluginRegistry.detail')" data-index="detail" />
              <a-table-column :title="t('pluginRegistry.createdTime')" data-index="created_time" :width="170" />
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { getPluginRegistry, getPluginLog, syncPlugins } from '@/api/modules/gisSystemPlugin'

const { t } = useI18n()

const activeTab = ref('registry')

// ---------- 注册表 ----------
const registryLoading = ref(false)
const registryList = ref([])
const syncing = ref(false)

async function loadRegistry() {
  registryLoading.value = true
  try {
    const res = await getPluginRegistry()
    const data = res.data || res
    registryList.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* request.js 已弹错 */ }
  finally { registryLoading.value = false }
}

async function handleSync() {
  syncing.value = true
  try {
    const res = await syncPlugins()
    const d = res.data || res || {}
    Message.success(
      t('pluginRegistry.syncResult', {
        scanned: d.scanned ?? 0,
        installed: d.installed ?? 0,
        updated: d.updated ?? 0,
        missing: d.missing ?? 0
      })
    )
    await loadRegistry()
  } catch (_) { /* request.js 已弹错 */ }
  finally { syncing.value = false }
}

// ---------- 生命周期日志 ----------
const logLoading = ref(false)
const logList = ref([])
const logQuery = reactive({
  plugin_name: '',
  action: undefined,
  timeRange: []
})

const actionOptions = ['install', 'update', 'uninstall', 'enable', 'disable', 'rename', 'reload']

function actionColor(action) {
  const map = {
    install: 'green',
    enable: 'arcoblue',
    update: 'orange',
    reload: 'cyan',
    rename: 'purple',
    disable: 'gray',
    uninstall: 'red'
  }
  return map[action] || 'gray'
}

async function loadLog() {
  logLoading.value = true
  try {
    const params = { limit: 200 }
    if (logQuery.plugin_name) params.plugin_name = logQuery.plugin_name
    if (logQuery.action) params.action = logQuery.action
    if (logQuery.timeRange?.length === 2) {
      params.begin_time = logQuery.timeRange[0]
      params.end_time = logQuery.timeRange[1]
    }
    const res = await getPluginLog(params)
    const data = res.data || res
    logList.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* request.js 已弹错 */ }
  finally { logLoading.value = false }
}

function resetLogQuery() {
  logQuery.plugin_name = ''
  logQuery.action = undefined
  logQuery.timeRange = []
  loadLog()
}

function handleTabChange(key) {
  if (key === 'log' && logList.value.length === 0) {
    loadLog()
  }
}

onMounted(loadRegistry)
</script>

<style lang="scss" scoped>
.table-toolbar {
  margin-bottom: $space-3;
  display: flex;
  align-items: center;
  gap: $space-2;
}

.sync-hint {
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.log-filter {
  margin-bottom: $space-4;
  row-gap: $space-2;
}
</style>
