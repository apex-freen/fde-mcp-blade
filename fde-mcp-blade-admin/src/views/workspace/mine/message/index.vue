<template>
  <div class="mine-message-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-alert type="info" style="margin-bottom: 16px">
        {{ $t('mine.messageNotice') }}
      </a-alert>

      <!-- 筛选：event_level 主筛；本版不做已读/未读（1017 §2.1） -->
      <div class="table-toolbar">
        <a-space>
          <a-select
            v-model="levelFilter"
            :placeholder="$t('commonTable.all')"
            allow-clear
            style="width: 160px"
            @change="handleSearch"
          >
            <a-option v-for="lv in LEVELS" :key="lv.value" :value="lv.value">
              {{ $t(lv.label) }}
            </a-option>
          </a-select>
          <a-button @click="handleReset">
            <template #icon><icon-refresh /></template>
            {{ $t('commonTable.reset') }}
          </a-button>
        </a-space>
      </div>

      <!-- 消息列表：行点击用 biz_ref_route 跳转（后端给的，前端不自己拼路由） -->
      <a-spin :loading="loading" style="display: block; width: 100%">
        <div v-if="rows.length" class="msg-list">
          <div
            v-for="item in rows"
            :key="item.message_id"
            class="msg-item"
            :class="{ clickable: !!item.biz_ref_route }"
            @click="goDetail(item)"
          >
            <div class="msg-head">
              <a-tag :color="levelInfo(item.event_level).color" size="small">
                {{ $t(levelInfo(item.event_level).label) }}
              </a-tag>
              <span class="msg-title">{{ item.title || '—' }}</span>
              <span class="msg-time">{{ item.created_time || '' }}</span>
            </div>
            <div class="msg-content">{{ item.content || '' }}</div>
            <div v-if="item.biz_ref_route" class="msg-go">
              {{ $t('mine.messageGoDetail') }}
              <icon-right />
            </div>
          </div>
        </div>
        <a-empty v-else-if="!loading" :description="$t('commonTable.noData')" />
      </a-spin>

      <div v-if="rows.length" class="pager">
        <a-pagination
          :current="pagination.current"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          show-total
          show-page-size
          :page-size-options="[10, 20, 50, 100]"
          @change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        />
      </div>
    </a-card>
  </div>
</template>

<script setup>
/**
 * 我的消息（1016 §4.1 页 4）
 * - 数据源 GET /biz/gis_mine/message/list（个人域，不挂权限点；字段与首屏卡片一致，渲染函数复用）
 * - event_level 主筛 todo/alert/notice/risk；排序后端固定，前端不传
 * - 行点击用 rows[].biz_ref_route 直接跳转，**不自己拼路由**（1017 §2.1）
 * - 与顶级「消息中心」分工：本页=我的收件视图（个人域），消息中心=系统消息台账（管理员视角）
 * - 本版不做已读/未读
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getMineMessageList } from '@/api/modules/gisMine'

const { t } = useI18n()
const router = useRouter()

const LEVELS = [
  { value: 'todo', label: 'mine.levelTodo' },
  { value: 'alert', label: 'mine.levelAlert' },
  { value: 'notice', label: 'mine.levelNotice' },
  { value: 'risk', label: 'mine.levelRisk' }
]

function levelInfo(level) {
  const found = LEVELS.find((l) => l.value === level)
  if (!found) return { label: 'mine.levelNotice', color: 'gray' }
  const colors = { todo: 'arcoblue', alert: 'orange', notice: 'gray', risk: 'red' }
  return { label: found.label, color: colors[found.value] }
}

// ==================== 筛选 ====================
const levelFilter = ref(undefined)

function handleSearch() {
  pagination.current = 1
  fetchList()
}

function handleReset() {
  levelFilter.value = undefined
  pagination.current = 1
  fetchList()
}

// ==================== 列表 ====================
const loading = ref(false)
const rows = ref([])
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

function handlePageChange(page) {
  pagination.current = page
  fetchList()
}

function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.current = 1
  fetchList()
}

async function fetchList() {
  loading.value = true
  try {
    const params = { page: pagination.current, page_size: pagination.pageSize }
    if (levelFilter.value) params.event_level = levelFilter.value
    const res = await getMineMessageList(params)
    const data = res?.data || {}
    rows.value = data.rows || []
    pagination.total = data.total || 0
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

function goDetail(item) {
  if (!item.biz_ref_route) return
  // 后端下发的完整路由，直接用
  router.push(item.biz_ref_route).catch(() => {})
}

onMounted(fetchList)
</script>

<style lang="scss" scoped>
.mine-message-page {
  .table-toolbar {
    margin-bottom: 16px;
  }

  .msg-list {
    display: flex;
    flex-direction: column;
  }

  .msg-item {
    padding: 12px 8px;
    border-bottom: 1px solid var(--color-border-1);
    transition: background-color 0.15s;

    &:hover {
      background: var(--color-fill-1);
    }

    &.clickable {
      cursor: pointer;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .msg-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .msg-title {
    flex: 1;
    font-weight: 500;
    color: var(--color-text-1);
  }

  .msg-time {
    font-size: 12px;
    color: var(--color-text-3);
    white-space: nowrap;
  }

  .msg-content {
    margin-top: 6px;
    font-size: 13px;
    color: var(--color-text-2);
    word-break: break-word;
  }

  .msg-go {
    margin-top: 6px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    color: rgb(var(--arcoblue-6));
  }

  .pager {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
