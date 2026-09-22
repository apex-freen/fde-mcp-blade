<template>
  <div class="vector-page">
    <!-- 语义检索 -->
    <a-card :bordered="false" style="margin-top: 16px" :title="t('vectorKb.searchTitle')">
      <a-form :model="searchForm" layout="inline" class="search-bar">
        <a-form-item :label="t('vectorKb.query')">
          <a-input
            v-model="searchForm.query"
            :placeholder="t('vectorKb.queryPlaceholder')"
            allow-clear
            style="width: 380px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item :label="t('vectorKb.indexScope')">
          <a-select
            v-model="searchForm.index_id"
            :placeholder="t('vectorKb.allIndexes')"
            allow-clear
            style="width: 200px"
          >
            <a-option v-for="idx in indexList" :key="idx.index_id" :value="idx.index_id">
              {{ idx.index_name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('vectorKb.topK')">
          <a-input-number v-model="searchForm.top_k" :min="1" :max="20" style="width: 100px" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="searching" @click="handleSearch">
            <template #icon><icon-search /></template>
            {{ t('vectorKb.searchBtn') }}
          </a-button>
        </a-form-item>
      </a-form>

      <div v-if="searchResults.length" class="search-results">
        <div v-for="hit in searchResults" :key="hit.chunk_id" class="hit-item">
          <div class="hit-head">
            <span class="hit-title">{{ hit.title || hit.source_uri }}</span>
            <a-tag color="arcoblue">{{ t('vectorKb.score') }} {{ formatScore(hit.score) }}</a-tag>
            <a-tag color="gray">{{ hit.index_name }}</a-tag>
          </div>
          <div class="hit-text">{{ hit.text }}</div>
          <div class="hit-source">{{ hit.source_uri }}</div>
        </div>
      </div>
      <a-empty v-else-if="searched && !searching" :description="t('vectorKb.searchEmpty')" />
    </a-card>

    <!-- 索引列表 -->
    <a-card :bordered="false" style="margin-top: 16px" :title="t('vectorKb.indexTitle')">
      <div class="table-toolbar">
        <a-button :loading="indexLoading" @click="loadIndexes">
          <template #icon><icon-refresh /></template>
          {{ t('commonTable.refresh') }}
        </a-button>
        <span v-if="selectedIndex" class="selected-hint">
          {{ t('vectorKb.selectedIndex') }}：{{ selectedIndex.index_name }}
        </span>
      </div>

      <a-table
        :data="indexList"
        :loading="indexLoading"
        :pagination="false"
        row-key="index_id"
        :bordered="false"
        size="small"
        :row-class="rowClass"
        @row-click="handleRowClick"
      >
        <template #columns>
          <a-table-column :title="t('vectorKb.indexId')" data-index="index_id" :width="80" />
          <a-table-column :title="t('vectorKb.indexName')" data-index="index_name" :width="180" />
          <a-table-column :title="t('vectorKb.scope')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.scope === 'system' ? 'purple' : 'arcoblue'">{{ record.scope }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.sourceType')" data-index="source_type" :width="120" />
          <a-table-column :title="t('vectorKb.modelCode')" data-index="model_code" :width="170" />
          <a-table-column :title="t('vectorKb.dim')" data-index="dim" :width="70" />
          <a-table-column :title="t('vectorKb.chunkSetting')" :width="130">
            <template #cell="{ record }">
              {{ record.chunk_size ?? '-' }} / {{ record.chunk_overlap ?? '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.docCount')" data-index="doc_count" :width="80" />
          <a-table-column :title="t('vectorKb.chunkCount')" data-index="chunk_count" :width="90" />
          <a-table-column :title="t('vectorKb.status')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'ready' ? 'green' : 'orange'">{{ record.status }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('commonTable.operation')" :width="200" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click.stop="handleViewDocs(record)">
                {{ t('vectorKb.viewDocs') }}
              </a-button>
              <a-popconfirm
                :content="t('vectorKb.confirmRebuild')"
                position="br"
                @ok="handleRebuild(record)"
              >
                <a-button type="text" size="mini" @click.stop>
                  {{ t('vectorKb.rebuild') }}
                </a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 文档列表 -->
    <a-card :bordered="false" style="margin-top: 16px" :title="t('vectorKb.docTitle')">
      <template v-if="selectedIndex">
        <a-table
          :data="docList"
          :loading="docLoading"
          :pagination="false"
          row-key="doc_id"
          :bordered="false"
          size="small"
        >
          <template #columns>
            <a-table-column :title="t('vectorKb.docId')" data-index="doc_id" :width="80" />
            <a-table-column :title="t('vectorKb.docTitle2')" data-index="title" :width="200" />
            <a-table-column :title="t('vectorKb.sourceUri')" data-index="source_uri" />
            <a-table-column :title="t('vectorKb.contentHash')" :width="140">
              <template #cell="{ record }">
                <span class="mono">{{ shortHash(record.content_hash) }}</span>
              </template>
            </a-table-column>
            <a-table-column :title="t('vectorKb.createdBy')" data-index="created_by" :width="110" />
            <a-table-column :title="t('vectorKb.createdTime')" data-index="created_time" :width="170" />
          </template>
        </a-table>

        <div class="doc-pager">
          <a-button size="small" :disabled="docPage <= 1 || docLoading" @click="changePage(-1)">
            {{ t('vectorKb.prevPage') }}
          </a-button>
          <span class="page-indicator">
            {{ t('vectorKb.pageIndicator', { page: docPage }) }}
          </span>
          <a-button size="small" :disabled="!hasNextPage || docLoading" @click="changePage(1)">
            {{ t('vectorKb.nextPage') }}
          </a-button>
        </div>
      </template>
      <a-empty v-else :description="t('vectorKb.noIndexSelected')" />
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import {
  getVectorIndexList,
  getVectorDocList,
  vectorSearch,
  rebuildVectorIndex
} from '@/api/modules/gisVector'

const { t } = useI18n()

const DOC_PAGE_SIZE = 20

// ---------- 索引 ----------
const indexLoading = ref(false)
const indexList = ref([])
const selectedIndex = ref(null)

// ---------- 文档 ----------
const docLoading = ref(false)
const docList = ref([])
const docPage = ref(1)
// 后端 doc_list 未返回 total，用"本页满页"推断是否还有下一页
const hasNextPage = computed(() => docList.value.length >= DOC_PAGE_SIZE)

// ---------- 检索 ----------
const searching = ref(false)
const searched = ref(false)
const searchResults = ref([])
const searchForm = reactive({
  query: '',
  index_id: undefined,
  top_k: 5
})

function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(4) : '-'
}

function shortHash(hash) {
  return hash ? `${hash.slice(0, 8)}…` : '-'
}

function rowClass(record) {
  return selectedIndex.value?.index_id === record.index_id ? 'row-active' : ''
}

async function loadIndexes() {
  indexLoading.value = true
  try {
    const res = await getVectorIndexList()
    const data = res.data || res
    indexList.value = Array.isArray(data) ? data : (data?.list || [])
    // 列表刷新后同步选中项引用，避免高亮丢失
    if (selectedIndex.value) {
      const fresh = indexList.value.find(i => i.index_id === selectedIndex.value.index_id)
      selectedIndex.value = fresh || null
    }
  } catch (_) { /* request.js 已弹错 */ }
  finally { indexLoading.value = false }
}

async function loadDocs() {
  if (!selectedIndex.value) return
  docLoading.value = true
  try {
    const res = await getVectorDocList(selectedIndex.value.index_id, docPage.value, DOC_PAGE_SIZE)
    const data = res.data || res
    docList.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (_) { /* request.js 已弹错 */ }
  finally { docLoading.value = false }
}

function handleRowClick(record) {
  selectedIndex.value = record
  docPage.value = 1
  loadDocs()
}

function handleViewDocs(record) {
  handleRowClick(record)
}

function changePage(delta) {
  const next = docPage.value + delta
  if (next < 1) return
  docPage.value = next
  loadDocs()
}

async function handleRebuild(record) {
  try {
    const res = await rebuildVectorIndex(record.index_id)
    const count = res.data ?? res
    Message.success(t('vectorKb.rebuildSuccess', { count }))
    await loadIndexes()
  } catch (_) { /* request.js 已弹错 */ }
}

async function handleSearch() {
  if (!searchForm.query.trim()) {
    Message.warning(t('vectorKb.queryRequired'))
    return
  }
  searching.value = true
  try {
    const payload = { query: searchForm.query, top_k: searchForm.top_k }
    if (searchForm.index_id !== undefined && searchForm.index_id !== null) {
      payload.index_id = searchForm.index_id
    }
    const res = await vectorSearch(payload)
    const data = res.data || res
    searchResults.value = Array.isArray(data) ? data : (data?.list || [])
    searched.value = true
  } catch (_) {
    searchResults.value = []
    searched.value = true
  } finally { searching.value = false }
}

onMounted(loadIndexes)
</script>

<style lang="scss" scoped>
.search-bar {
  row-gap: $space-2;
}

.search-results {
  margin-top: $space-4;
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.hit-item {
  padding: $space-3;
  background: $color-bg-muted;
  border-radius: $radius;
}

.hit-head {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.hit-title {
  font-weight: 600;
  color: $color-text;
}

.hit-text {
  margin-top: $space-2;
  color: $color-text-secondary;
  font-size: $font-size-sm;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.hit-source {
  margin-top: $space-2;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
  word-break: break-all;
}

.table-toolbar {
  margin-bottom: $space-3;
  display: flex;
  align-items: center;
  gap: $space-2;
}

.selected-hint {
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: $font-size-xs;
}

.doc-pager {
  margin-top: $space-4;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: $space-3;
}

.page-indicator {
  color: $color-text-secondary;
  font-size: $font-size-sm;
}

:deep(.row-active) td {
  background: $color-primary-lighter;
}
</style>
