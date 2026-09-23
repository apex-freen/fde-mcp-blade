<template>
  <div class="capabilities-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        {{ $t('cap.title') }}
      </template>
      <template #extra>
        <a-button size="small" :loading="capStore.loaded === false" @click="refresh">
          <template #icon><icon-refresh /></template>
          {{ $t('commonTable.refresh') }}
        </a-button>
      </template>

      <!-- 接口失败提示：仅提示「按默认能力展示」，不当作错误阻塞（降级纪律） -->
      <a-alert v-if="capStore.failed" type="warning" style="margin-bottom: 16px">
        {{ $t('cap.degradedHint') }}
      </a-alert>

      <!-- 版本信息：单字段 null = 未注入，按「有则显示」，不是错误 -->
      <a-descriptions :column="2" bordered size="medium" class="cap-meta">
        <a-descriptions-item :label="$t('cap.product')">
          {{ capStore.product || '—' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('cap.edition')">
          {{ capStore.edition || '—' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('cap.version')">
          {{ capStore.version || '—' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('cap.buildTime')">
          {{ capStore.buildTime || '—' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('cap.imageTag')">
          {{ capStore.imageTag || '—' }}
        </a-descriptions-item>
        <!-- image_digest 后端待定：不预设存在，有则显示 -->
        <a-descriptions-item v-if="capStore.imageDigest" :label="$t('cap.imageDigest')">
          <span class="digest">{{ capStore.imageDigest }}</span>
        </a-descriptions-item>
      </a-descriptions>

      <h4 class="cap-sub">{{ $t('cap.modulesTitle') }}</h4>
      <a-table
        :data="moduleRows"
        :loading="!capStore.loaded"
        :pagination="false"
        row-key="key"
        size="medium"
      >
        <template #columns>
          <a-table-column :title="$t('cap.moduleKey')" data-index="key" :width="240" />
          <a-table-column :title="$t('cap.moduleName')" :width="260">
            <template #cell="{ record }">{{ moduleName(record) }}</template>
          </a-table-column>
          <a-table-column :title="$t('cap.moduleEnabled')" :width="140">
            <template #cell="{ record }">
              <a-tag v-if="record.enabled === true" color="green" size="small">
                {{ $t('cap.enabled') }}
              </a-tag>
              <a-tag v-else-if="record.enabled === false" color="gray" size="small">
                {{ $t('cap.disabled') }}
              </a-tag>
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column :title="$t('cap.moduleNote')" :width="360">
            <template #cell="{ record }">{{ moduleNote(record.key) }}</template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty :description="$t('commonTable.noData')" />
        </template>
      </a-table>

      <div class="cap-foot">{{ $t('cap.footNote') }}</div>
    </a-card>
  </div>
</template>

<script setup>
/**
 * 能力总览（1016 §4.1 页 5）
 * - 数据源 GET /biz/capabilities（要求登录、不要求权限码），经 capabilitiesStore 读取
 * - store 在路由守卫里 fire-and-forget 拉取；本页若还没拉到再补一次（永不 reject）
 * - 🔴 单字段 null = 未注入（build_time / image_tag / image_digest），按「有则显示」渲染，
 *   不报错、不整块隐藏；任何字段拿不到都不影响其它字段展示
 * - modules[].name 是后端中文硬编码文案（非 i18n key）→ 用 key 查词典、name 仅兜底直渲
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCapabilitiesStore } from '@/stores/capabilities'

const { t, te } = useI18n()
const capStore = useCapabilitiesStore()

function refresh() {
  capStore.fetchCapabilities()
}

const moduleRows = computed(() =>
  capStore.modules.map((m) => ({
    key: m.key,
    name: m.name,
    enabled: m.enabled
  }))
)

// key → i18n 词典；词典没有该 key → 兜底用后端 name 直渲
function moduleName(record) {
  const i18nKey = `cap.module.${record.key.replace(/\./g, '_')}`
  if (te(i18nKey)) return t(i18nKey)
  return record.name || record.key
}

// 已定案的口径注释（1016 §4.1 页 5 / v1.6），如实展示给客户看
function moduleNote(key) {
  const i18nKey = `cap.note.${key.replace(/\./g, '_')}`
  return te(i18nKey) ? t(i18nKey) : ''
}
</script>

<style lang="scss" scoped>
.capabilities-page {
  .cap-meta {
    margin-bottom: 20px;
  }

  .digest {
    font-family: monospace;
    font-size: 12px;
    word-break: break-all;
  }

  .cap-sub {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .cap-foot {
    margin-top: 12px;
    font-size: 12px;
    color: var(--color-text-3);
  }
}
</style>
