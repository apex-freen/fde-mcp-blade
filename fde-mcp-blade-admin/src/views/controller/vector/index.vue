<template>
  <div class="vector-page">
    <!-- 1041 §4.4：非管理员调用返回 403 → 整页显示「权限不足」 -->
    <a-result
      v-if="forbidden"
      status="403"
      :title="t('vectorKb.forbiddenTitle')"
      :subtitle="t('vectorKb.forbiddenDesc')"
      class="forbidden-block"
    />
    <template v-else>
    <!-- 知识库选择器（多库：system 内置 / org 组织 / dept 部门 / user 个人，数据来自 index_list）
         进入页面先拉 index_list；本页所有区块都以「当前选中的库」为准。
         1041 联调修正：部门知识库页只列 can_manage=true 的库（不可管理的库一旦被选中，
         按库接口必然 403） -->
    <a-card :bordered="false" style="margin-top: 16px" :title="t('vectorKb.selectorTitle')">
      <div class="kb-selector">
        <a-select
          v-model="selectedIndexId"
          :placeholder="t('vectorKb.selectKbPlaceholder')"
          :loading="indexLoading"
          :disabled="!selectableIndexes.length"
          style="width: 320px"
        >
          <a-option
            v-for="idx in selectableIndexes"
            :key="idx.index_id"
            :value="idx.index_id"
            :label="idx.index_name"
          >
            <span class="kb-opt">
              <span>{{ idx.index_name }}</span>
              <a-tag :color="scopeColor(idx.scope)" size="small">{{ scopeText(idx.scope) }}</a-tag>
            </span>
          </a-option>
        </a-select>
        <template v-if="selectedIndex">
          <a-tag :color="scopeColor(selectedIndex.scope)">{{ scopeText(selectedIndex.scope) }}</a-tag>
          <span class="selected-hint">
            {{
              t('vectorKb.kbStat', {
                docs: selectedIndex.doc_count ?? 0,
                chunks: selectedIndex.chunk_count ?? 0
              })
            }}
          </span>
        </template>
        <span v-else-if="!indexLoading && selectableIndexes.length" class="muted">
          {{ t('vectorKb.noKb') }}
        </span>
      </div>
      <!-- 1041 §4.4 / §3.11：一个可管理的库都没有 → 空态引导 + 自助开通；
           此时不发任何按库请求（doc_list / rebuild / probe / review/due） -->
      <div v-if="!indexLoading && !selectableIndexes.length" class="kb-empty">
        <a-empty :description="isAdminMode ? t('vectorKb.kbEmptyTitle') : t('vectorKb.kbEmptyTitleDept')" />
        <div class="section-tip">
          {{ isAdminMode ? t('vectorKb.kbEmptyDesc') : t('vectorKb.kbEmptyDescDept') }}
        </div>
        <a-button
          type="primary"
          class="kb-empty-action"
          :loading="creatingDeptKb"
          @click="handleCreateDeptKb"
        >
          <template #icon><icon-plus /></template>
          {{ t('vectorKb.createDeptKb') }}
        </a-button>
      </div>
      <div v-else class="section-tip">{{ t('vectorKb.selectorTip') }}</div>
      <!-- 1041 §3.1：can_manage=false 的库只读，写 / 重建 / 自检不可用 -->
      <div v-if="selectedIndex && !canManage" class="section-tip readonly-tip">
        {{ t('vectorKb.readonlyTip') }}
      </div>

      <!-- 库级操作（原先在「知识库列表」工具栏里）：提到顶部后与所选库同处一屏，
           且不再受下方分区切换影响，任何分区下都能点 -->
      <a-divider :margin="14" />
      <div class="table-toolbar">
        <a-button :loading="indexLoading" @click="loadIndexes()">
          <template #icon><icon-refresh /></template>
          {{ t('commonTable.refresh') }}
        </a-button>
        <!-- 重新同步（107 §6.2，仅管理员可见）：无入参，「同步全部库（内置 + 各部门）」。
             1041 §2.2：这是全局动作，只给管理员；部门知识库页不显示。
             注意按钮必须叫「重新同步」而不是「重建索引」——rebuild 只补算向量、不会扫出新文档（107 §八） -->
        <a-button v-if="isAdminMode && isAdmin" type="primary" :loading="syncing" @click="handleSync">
          <template #icon><icon-sync /></template>
          {{ t('vectorKb.sync') }}
        </a-button>
        <!-- 1042 附件：新建组织级库（仅管理员）。部门库由部门负责人自助开通，入口不在此 -->
        <a-button v-if="isAdminMode && isAdmin" :loading="creatingOrgKb" @click="handleCreateOrgKb">
          <template #icon><icon-plus /></template>
          {{ t('vectorKb.createOrgKb') }}
        </a-button>
        <!-- 重建 / 强制重建：作用于当前选中的那一个库；1041 §3.5 需 can_manage -->
        <a-popconfirm
          v-if="canManage"
          :content="t('vectorKb.confirmRebuild')"
          position="br"
          @ok="handleRebuild()"
        >
          <a-button :disabled="!selectedIndex">{{ t('vectorKb.rebuildCurrent') }}</a-button>
        </a-popconfirm>
        <!-- 个人库不支持强制重建：置灰并说明原因（tooltip 需要包一层 span 才能响应 hover） -->
        <a-tooltip
          v-if="canManage && !!selectedIndex && !canForceRebuild"
          :content="t('vectorKb.forceRebuildUserTip')"
        >
          <span>
            <a-button status="danger" disabled>{{ t('vectorKb.forceRebuildCurrent') }}</a-button>
          </span>
        </a-tooltip>
        <a-popconfirm
          v-else-if="canManage"
          :content="t('vectorKb.confirmForceRebuild')"
          position="br"
          @ok="handleRebuild(true)"
        >
          <a-button status="danger" :disabled="!selectedIndex">
            {{ t('vectorKb.forceRebuildCurrent') }}
          </a-button>
        </a-popconfirm>
      </div>
    </a-card>

    <!-- 一个可管理的库都没有时不显示分区（上方空态已给出唯一动作，避免一堆空表） -->
    <template v-if="selectableIndexes.length">
      <!-- 1043：按功能分区，避免单页无限拉长。
           用 tag 式分段切换 + v-show（不是 a-tabs），好处：切分区不发请求、不丢当前状态
           （检索结果、展开的探针行都保留） -->
      <div class="kb-tabbar">
        <a-radio-group v-model="activeTab" type="button">
          <a-radio value="docs">{{ t('vectorKb.tabDocs') }}</a-radio>
          <a-radio value="search">{{ t('vectorKb.tabSearch') }}</a-radio>
          <a-radio value="selfcheck">{{ t('vectorKb.tabSelfCheck') }}</a-radio>
          <a-radio v-if="isAdminMode && isAdmin" value="settings">{{ t('vectorKb.tabSettings') }}</a-radio>
          <a-radio v-if="isAdminMode && isAdmin" value="insight">{{ t('vectorKb.tabInsight') }}</a-radio>
        </a-radio-group>
      </div>

    <!-- 说明区块（107 §一之三，可折叠）：属「文档」分区 -->
    <a-card v-show="activeTab === 'docs'" :bordered="false" style="margin-top: 16px">
      <div class="help-head" @click="helpOpen = !helpOpen">
        <icon-down v-if="helpOpen" />
        <icon-right v-else />
        <span class="help-title">{{ t('vectorKb.helpTitle') }}</span>
      </div>
      <div v-show="helpOpen" class="help-body">
        <p>{{ t('vectorKb.helpWhat') }}</p>
        <p class="help-sub">{{ t('vectorKb.helpWhereTitle') }}</p>
        <pre class="help-pre">{{ t('vectorKb.helpWhere') }}</pre>
        <p class="help-sub">{{ t('vectorKb.helpReqTitle') }}</p>
        <pre class="help-pre">{{ t('vectorKb.helpReq') }}</pre>
        <p class="help-sub">{{ t('vectorKb.helpUpdateTitle') }}</p>
        <pre class="help-pre">{{ t('vectorKb.helpUpdate') }}</pre>
      </div>
    </a-card>

    <!-- ① 检索设置（1040 §三：A 检索侧增强，仅管理员可见可改；1041 §2.2：部门知识库页不展示） -->
    <a-card
      v-if="isAdminMode && isAdmin"
      v-show="activeTab === 'settings'"
      :bordered="false"
      style="margin-top: 16px"
      :title="t('vectorKb.settingsTitle')"
    >
      <a-form :model="settingsForm" layout="inline" class="search-bar">
        <a-form-item :label="t('vectorKb.minScore')">
          <a-input-number
            v-model="settingsForm.min_score"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="2"
            style="width: 120px"
          />
        </a-form-item>
        <a-form-item :label="t('vectorKb.lowConfScore')">
          <a-input-number
            v-model="settingsForm.low_conf_score"
            :min="0"
            :max="1"
            :step="0.01"
            :precision="2"
            style="width: 120px"
          />
        </a-form-item>
        <a-form-item :label="t('vectorKb.hybridWeight')">
          <a-input-number
            v-model="settingsForm.hybrid_weight"
            :min="0"
            :max="1"
            :step="0.05"
            :precision="2"
            style="width: 120px"
          />
        </a-form-item>
        <a-form-item :label="t('vectorKb.candidateFactor')">
          <a-input-number
            v-model="settingsForm.candidate_factor"
            :min="1"
            :max="10"
            :step="1"
            :precision="0"
            style="width: 110px"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="settingsSaving" @click="handleSaveSettings">
            {{ t('vectorKb.save') }}
          </a-button>
        </a-form-item>
      </a-form>
      <div class="section-tip">{{ t('vectorKb.settingsTip') }}</div>

      <a-divider :margin="14" />

      <div class="alias-head">
        <div class="alias-head-text">
          <span class="alias-title">{{ t('vectorKb.aliasTitle') }}</span>
          <span class="section-tip">{{ t('vectorKb.aliasTip') }}</span>
        </div>
        <a-button size="small" type="primary" @click="openAliasModal()">
          <template #icon><icon-plus /></template>
          {{ t('vectorKb.addAlias') }}
        </a-button>
      </div>

      <a-table
        :data="aliasList"
        :loading="aliasLoading"
        :pagination="false"
        row-key="alias_id"
        :bordered="false"
        size="small"
      >
        <template #columns>
          <a-table-column :title="t('vectorKb.aliasCol')" data-index="alias" :width="220" />
          <a-table-column :title="t('vectorKb.canonicalCol')" data-index="canonical" :width="220" />
          <a-table-column :title="t('vectorKb.status')" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status !== '1' ? 'green' : 'gray'" size="small">
                {{ record.status !== '1' ? t('vectorKb.enabled') : t('vectorKb.disabled') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('commonTable.operation')" :width="210">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click="openAliasModal(record)">
                {{ t('commonTable.edit') }}
              </a-button>
              <!-- 1040 §3.2：停用 / 恢复按钮提交时带 status（"0" 启用 / "1" 停用），alias 与 canonical 原样回传 -->
              <a-button type="text" size="mini" @click="handleToggleAlias(record)">
                {{ record.status !== '1' ? t('vectorKb.disabled') : t('vectorKb.restore') }}
              </a-button>
              <a-popconfirm
                :content="t('vectorKb.confirmDeleteAlias')"
                position="br"
                @ok="handleDeleteAlias(record)"
              >
                <a-button type="text" size="mini" status="danger" @click.stop>
                  {{ t('commonTable.delete') }}
                </a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 语义检索 -->
    <a-card
      v-show="activeTab === 'search'"
      :bordered="false"
      style="margin-top: 16px"
      :title="t('vectorKb.searchTitle')"
    >
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
        <!-- 检索范围 = 当前选中的知识库，不再单独选择 -->
        <a-form-item :label="t('vectorKb.indexScope')">
          <a-tag v-if="selectedIndex" :color="scopeColor(selectedIndex.scope)">
            {{ selectedIndex.index_name }}
          </a-tag>
          <span v-else class="muted">{{ t('vectorKb.noIndexSelected') }}</span>
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

      <!-- 1040 §3.3：低置信提示（结果为空时同样走这条，不写「知识库没有」这类绝对话术）
           注意：Arco Vue 的 a-alert 没有 content 属性，正文必须走默认插槽 -->
      <a-alert
        v-if="searched && !searching && searchLowConf"
        type="warning"
        class="block-gap"
      >
        {{ t('vectorKb.lowConfTip') }}
      </a-alert>
      <!-- 1040 §3.3：别名扩展生效时回显实际检索用的 query，便于排查 -->
      <div
        v-if="searched && !searching && searchExpanded && searchExpanded !== searchQuery"
        class="expanded-hint"
      >
        {{ t('vectorKb.expandedHint', { query: searchExpanded }) }}
      </div>

      <div v-if="searchResults.length" class="search-results">
        <div v-for="hit in searchResults" :key="hit.chunk_id" class="hit-item">
          <div class="hit-head">
            <span class="hit-title">{{ hit.title || hit.source_uri }}</span>
            <a-tag color="arcoblue">{{ t('vectorKb.score') }} {{ formatScore(hit.score) }}</a-tag>
            <a-tag v-if="hit.chunk_no !== undefined && hit.chunk_no !== null" color="gray">
              {{ chunkRangeText(hit) }}
            </a-tag>
            <a-tag color="gray">{{ hit.index_name }}</a-tag>
            <span class="hit-vec">{{ t('vectorKb.vecScore') }} {{ formatScore(hit.vec_score) }}</span>
          </div>
          <!-- R10：text 现在是「合并后的完整条目」（最长 4000 字）→ 默认限高，可展开 -->
          <div class="hit-text" :class="{ 'is-clamped': isHitLong(hit) && !isHitExpanded(hit) }">
            {{ hit.text }}
          </div>
          <a-button
            v-if="isHitLong(hit)"
            type="text"
            size="mini"
            class="hit-toggle"
            @click="toggleHitText(hit)"
          >
            {{ isHitExpanded(hit) ? t('vectorKb.collapse') : t('vectorKb.expand') }}
          </a-button>
          <!-- 1041 §4.3：hits[] 新增 4 个元数据字段，便于展示生效日期 / 密级 / 标签 -->
          <div
            v-if="hit.doc_status || hit.effective_date || hit.confidentiality || splitTags(hit.tags).length"
            class="hit-meta"
          >
            <a-tag v-if="hit.doc_status" :color="docStatusColor(hit.doc_status)" size="small">
              {{ docStatusText(hit.doc_status) }}
            </a-tag>
            <a-tag v-if="hit.confidentiality" :color="confColor(hit.confidentiality)" size="small">
              {{ confText(hit.confidentiality) }}
            </a-tag>
            <a-tag v-if="hit.effective_date" color="gray" size="small">
              {{ t('vectorKb.effectiveDate') }} {{ hit.effective_date }}
            </a-tag>
            <a-tag v-for="tg in splitTags(hit.tags)" :key="tg" color="gray" size="small">{{ tg }}</a-tag>
          </div>
          <div class="hit-source">{{ hit.source_uri }}</div>
        </div>
      </div>
      <a-empty v-else-if="searched && !searching" :description="t('vectorKb.searchEmpty')" />
    </a-card>

    <!-- 知识库列表（index_list：当前身份可见的全部库，点行即切换上方选择器）
         库级操作按钮已提到顶部选择器卡片，避免两处重复 -->
    <a-card
      v-show="activeTab === 'docs'"
      :bordered="false"
      style="margin-top: 16px"
      :title="t('vectorKb.indexTitle')"
    >
      <a-table
        :data="selectableIndexes"
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
          <a-table-column :title="t('vectorKb.indexName')" data-index="index_name" :width="220" />
          <a-table-column :title="t('vectorKb.scope')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="scopeColor(record.scope)">{{ scopeText(record.scope) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.ownerId')" :width="100">
            <template #cell="{ record }">
              {{ record.owner_id ?? '-' }}
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.sourceType')" data-index="source_type" :width="120" />
          <a-table-column :title="t('vectorKb.docCount')" data-index="doc_count" :width="90" />
          <a-table-column :title="t('vectorKb.chunkCount')" data-index="chunk_count" :width="90" />
          <a-table-column :title="t('vectorKb.status')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'ready' ? 'green' : 'orange'">{{ record.status }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('commonTable.operation')" :width="120" fixed="right">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click.stop="handleViewDocs(record)">
                {{ t('vectorKb.viewDocs') }}
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 文档列表（1041 §3.2 元数据列 + §3.6 写入通道） -->
    <a-card
      v-show="activeTab === 'docs'"
      :bordered="false"
      style="margin-top: 16px"
      :title="t('vectorKb.docTitle')"
    >
      <template #extra>
        <!-- 仅 can_manage=true 的库可写文档（1041 §3.1 / §3.3） -->
        <a-space v-if="selectedIndex && canManage">
          <a-button size="small" type="primary" @click="openCreateDoc()">
            <template #icon><icon-plus /></template>
            {{ t('vectorKb.newDoc') }}
          </a-button>
          <a-button size="small" :loading="docUploading" @click="triggerUpload">
            <template #icon><icon-upload /></template>
            {{ t('vectorKb.uploadDoc') }}
          </a-button>
          <!-- 上传 .md：本地读成文本后逐个调 doc/save（1041 §4.5） -->
          <input
            ref="uploadInput"
            type="file"
            accept=".md"
            multiple
            hidden
            @change="handleUploadFiles"
          />
        </a-space>
      </template>

      <template v-if="selectedIndex">
        <a-table
          :data="docList"
          :loading="docLoading"
          :pagination="false"
          row-key="doc_id"
          :bordered="false"
          size="small"
          :scroll="{ x: 2050 }"
        >
          <template #columns>
            <a-table-column :title="t('vectorKb.docId')" data-index="doc_id" :width="80" />
            <a-table-column :title="t('vectorKb.docTitle2')" data-index="title" :width="200" />
            <!-- 1041 §3.2：新增 6 个元数据列（空值显示 —） -->
            <a-table-column :title="t('vectorKb.docStatus')" :width="100">
              <template #cell="{ record }">
                <a-tag v-if="record.doc_status" :color="docStatusColor(record.doc_status)" size="small">
                  {{ docStatusText(record.doc_status) }}
                </a-tag>
                <span v-else class="muted">{{ t('vectorKb.emptyCell') }}</span>
              </template>
            </a-table-column>
            <a-table-column :title="t('vectorKb.owner')" :width="130">
              <template #cell="{ record }">{{ record.owner || t('vectorKb.emptyCell') }}</template>
            </a-table-column>
            <a-table-column :title="t('vectorKb.effectiveDate')" :width="120">
              <template #cell="{ record }">{{ record.effective_date || t('vectorKb.emptyCell') }}</template>
            </a-table-column>
            <a-table-column :title="t('vectorKb.reviewDate')" :width="120">
              <template #cell="{ record }">
                <!-- 1041 §3.2：复审日期已过期标红 -->
                <span :class="{ 'text-danger': isOverdue(record.review_date) }">
                  {{ record.review_date || t('vectorKb.emptyCell') }}
                </span>
              </template>
            </a-table-column>
            <a-table-column :title="t('vectorKb.confidentiality')" :width="90">
              <template #cell="{ record }">
                <a-tag v-if="record.confidentiality" :color="confColor(record.confidentiality)" size="small">
                  {{ confText(record.confidentiality) }}
                </a-tag>
                <span v-else class="muted">{{ t('vectorKb.emptyCell') }}</span>
              </template>
            </a-table-column>
            <a-table-column :title="t('vectorKb.tags')" :width="180">
              <template #cell="{ record }">
                <template v-if="splitTags(record.tags).length">
                  <a-tag
                    v-for="tg in splitTags(record.tags)"
                    :key="tg"
                    color="gray"
                    size="small"
                    class="tag-cell"
                  >
                    {{ tg }}
                  </a-tag>
                </template>
                <span v-else class="muted">{{ t('vectorKb.emptyCell') }}</span>
              </template>
            </a-table-column>
            <a-table-column :title="t('vectorKb.sourceUri')" data-index="source_uri" :width="300" :ellipsis="true" />
            <a-table-column :title="t('vectorKb.contentHash')" :width="140">
              <template #cell="{ record }">
                <span class="mono">{{ shortHash(record.content_hash) }}</span>
              </template>
            </a-table-column>
            <a-table-column :title="t('vectorKb.createdBy')" data-index="created_by" :width="110" />
            <a-table-column :title="t('vectorKb.createdTime')" data-index="created_time" :width="170" />
            <a-table-column :title="t('commonTable.operation')" :width="130" fixed="right">
              <template #cell="{ record }">
                <template v-if="canManage">
                  <a-button type="text" size="mini" @click="openEditDoc(record)">
                    {{ t('commonTable.edit') }}
                  </a-button>
                  <!-- 1041 §5.3.1：删除需二次确认 + 「先备份」提示 -->
                  <a-popconfirm
                    :content="t('vectorKb.docDeleteConfirm')"
                    position="br"
                    @ok="handleDeleteDoc(record)"
                  >
                    <a-button type="text" size="mini" status="danger">
                      {{ t('commonTable.delete') }}
                    </a-button>
                  </a-popconfirm>
                </template>
              </template>
            </a-table-column>
          </template>
          <template #empty>
            <a-empty :description="t('vectorKb.docEmptyList')" />
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
      <a-empty
        v-else
        :description="isAdminMode ? t('vectorKb.noIndexSelected') : t('vectorKb.kbEmptyTitleDept')"
      />
    </a-card>

    <!-- ② 问答自检（1040 §四：B 用探针问题验证每篇文档能不能被检索到；1041 §3.6 需 can_manage） -->
    <a-card
      v-if="selectedIndex && canManage"
      v-show="activeTab === 'selfcheck'"
      :bordered="false"
      style="margin-top: 16px"
      :title="t('vectorKb.probeTitle')"
    >
      <template #extra>
        <!-- 后端同步执行，可能十几秒；不要按超时处理（1040 §五） -->
        <a-button type="primary" :loading="probeRunning" @click="handleRunProbes">
          {{ probeRunning ? t('vectorKb.probeRunning') : t('vectorKb.probeRunNow') }}
        </a-button>
      </template>

      <div class="section-tip">{{ t('vectorKb.probeTip') }}</div>

      <!-- 最近一次自检 -->
      <div class="probe-summary">
        <template v-if="lastRun">
          <div class="probe-summary-line">
            <span>{{ lastRun.created_time }}</span>
            <span class="dot">·</span>
            <span>{{ triggerText(lastRun.trigger_type) }}</span>
            <span class="dot">·</span>
            <span>{{ formatElapsed(lastRun.elapsed_ms) }}</span>
            <span class="dot">·</span>
            <a-tag :color="lastRun.status === 'failed' ? 'red' : (lastRun.failed > 0 ? 'orange' : 'green')" size="small">
              {{ t('vectorKb.probePassedOf', { passed: lastRun.passed, total: lastRun.total }) }}
            </a-tag>
            <a-tag v-if="lastRun.status !== 'failed' && lastRun.failed === 0 && lastRun.total > 0" color="green" size="small">
              {{ t('vectorKb.probeAllPassed') }}
            </a-tag>
          </div>
          <div class="probe-summary-line muted">
            {{ t('vectorKb.probeDocStat', { total: lastRun.doc_total, bad: lastRun.doc_unrecallable }) }}
          </div>
        </template>
        <div v-else class="probe-summary-line muted">{{ t('vectorKb.probeNeverRun') }}</div>
      </div>

      <a-alert
        v-if="lastRun && lastRun.doc_unrecallable > 0"
        type="warning"
        class="block-gap"
        :title="t('vectorKb.probeWarnTitle', { count: lastRun.doc_unrecallable })"
      >
        <div v-for="d in lastRun.unrecallable_docs || []" :key="d.doc_id" class="unrecall-line">
          《{{ d.title }}》 {{ t('vectorKb.probeHitRate', { rate: d.hit_rate }) }}
        </div>
        <!-- 告警条里的「去强制重建」必须二次确认（1040 §八）；个人库不支持强制重建 -->
        <a-popconfirm
          v-if="canForceRebuild"
          :content="t('vectorKb.confirmForceRebuild')"
          position="br"
          @ok="handleRebuild(true)"
        >
          <a-button size="mini" status="danger" type="outline" class="block-gap-sm">
            {{ t('vectorKb.gotoForceRebuild') }}
          </a-button>
        </a-popconfirm>
      </a-alert>

      <!-- 按文档分组的探针 -->
      <!-- 注意：Arco 必须传 expandable 才会渲染展开列（只给 #expand-row 插槽不出现入口） -->
      <a-table
        v-if="probeDocs.length"
        :data="probeDocs"
        :loading="probeLoading"
        :pagination="false"
        row-key="doc_id"
        :bordered="false"
        size="small"
        class="block-gap"
        :expandable="{ width: 40 }"
        :expanded-keys="probeExpandedKeys"
        @expanded-change="handleProbeExpandedChange"
      >
        <template #columns>
          <a-table-column :title="t('vectorKb.docTitle2')" :width="300">
            <template #cell="{ record }">
              <span class="hit-title">{{ record.title }}</span>
              <a-tag v-if="record.removed" color="gray" size="small">{{ t('vectorKb.probeDocRemoved') }}</a-tag>
              <a-tag v-else-if="!record.hasManual" color="gray" size="small">
                {{ t('vectorKb.probeSourceAuto') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.probeCountCol')" :width="120">
            <template #cell="{ record }">
              {{ t('vectorKb.probeCount', { count: record.probes.length }) }}
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.probeColJudge')" :width="130">
            <template #cell="{ record }">
              <a-tag
                v-if="record.judged"
                :color="record.passed === record.judged ? 'green' : 'red'"
                size="small"
              >
                {{ t('vectorKb.probeHitOf', { passed: record.passed, total: record.judged }) }}
              </a-tag>
              <span v-else class="muted">{{ t('vectorKb.probeNoJudge') }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="t('commonTable.operation')" :width="190">
            <template #cell="{ record }">
              <a-button type="text" size="mini" @click="toggleProbeDetail(record)">
                {{ t('vectorKb.probeDetail') }}
              </a-button>
              <a-button type="text" size="mini" @click="openProbeModal(record)">
                {{ t('vectorKb.probeAdd') }}
              </a-button>
            </template>
          </a-table-column>
        </template>

        <template #expand-row="{ record }">
          <a-table
            :data="record.probes"
            :pagination="false"
            row-key="probe_id"
            :bordered="false"
            size="small"
            table-layout="fixed"
          >
            <template #columns>
              <a-table-column :title="t('vectorKb.probeColQuestion')" data-index="question" />
              <a-table-column :title="t('vectorKb.probeColJudge')" :width="100">
                <template #cell="{ record: p }">
                  <a-tag v-if="getProbeResult(p.probe_id)" :color="getProbeResult(p.probe_id).passed === '1' ? 'green' : 'red'" size="small">
                    {{ getProbeResult(p.probe_id).passed === '1' ? t('vectorKb.probePass') : t('vectorKb.probeFail') }}
                  </a-tag>
                  <span v-else class="muted">{{ t('vectorKb.probeNoJudge') }}</span>
                </template>
              </a-table-column>
              <a-table-column :title="t('vectorKb.probeColExpect')" :width="180" :ellipsis="true">
                <template #cell="{ record: p }">
                  {{ getProbeResult(p.probe_id)?.expect_title || '-' }}
                </template>
              </a-table-column>
              <a-table-column :title="t('vectorKb.probeColHit')" :width="180" :ellipsis="true">
                <template #cell="{ record: p }">
                  {{ getProbeResult(p.probe_id)?.hit_title || '-' }}
                </template>
              </a-table-column>
              <a-table-column :title="t('vectorKb.probeColRank')" :width="80">
                <template #cell="{ record: p }">
                  {{ getProbeResult(p.probe_id)?.hit_rank ?? '-' }}
                </template>
              </a-table-column>
              <a-table-column :title="t('vectorKb.probeColScore')" :width="100">
                <template #cell="{ record: p }">
                  {{ formatScore(getProbeResult(p.probe_id)?.top1_score) }}
                </template>
              </a-table-column>
              <a-table-column :title="t('vectorKb.probeColSource')" :width="90">
                <template #cell="{ record: p }">
                  <a-tag color="gray" size="small">{{ probeSourceText(p) }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="t('vectorKb.status')" :width="90">
                <template #cell="{ record: p }">
                  <a-tag :color="p.status !== '1' ? 'green' : 'gray'" size="small">
                    {{ p.status !== '1' ? t('vectorKb.enabled') : t('vectorKb.disabled') }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="t('commonTable.operation')" :width="210">
                <template #cell="{ record: p }">
                  <a-button type="text" size="mini" @click="openProbeModal(record, p)">
                    {{ t('commonTable.edit') }}
                  </a-button>
                  <!-- 1040 §4.1：停用 / 恢复探针 —— 带 status 提交，其余字段原样回传 -->
                  <a-button type="text" size="mini" @click="handleToggleProbe(p)">
                    {{ p.status !== '1' ? t('vectorKb.disabled') : t('vectorKb.restore') }}
                  </a-button>
                  <a-popconfirm
                    :content="t('vectorKb.probeDeleteConfirm')"
                    position="br"
                    @ok="handleDeleteProbe(p)"
                  >
                    <a-button type="text" size="mini" status="danger">
                      {{ t('commonTable.delete') }}
                    </a-button>
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </template>
      </a-table>
      <a-empty v-else-if="!probeLoading" class="block-gap" :description="t('vectorKb.probeEmpty')" />
    </a-card>

    <!-- 1041 §3.8 P1：到期复审提醒（管理员跨库；部门负责人只看本库，见 loadReviewDue）。
         联调修正：部门知识库页在没有可管理的库时不渲染，也不发请求 -->
    <a-card
      v-if="isAdminMode || !!selectedIndex"
      v-show="activeTab === 'selfcheck'"
      :bordered="false"
      style="margin-top: 16px"
      :title="t('vectorKb.reviewTitle')"
    >
      <template #extra>
        <a-space>
          <a-tag v-if="reviewTotal > 0" :color="reviewOverdue > 0 ? 'red' : 'orange'" size="small">
            {{ t('vectorKb.reviewBadge', { total: reviewTotal, overdue: reviewOverdue }) }}
          </a-tag>
          <a-button size="small" :loading="reviewLoading" @click="loadReviewDue">
            <template #icon><icon-refresh /></template>
          </a-button>
        </a-space>
      </template>
      <div class="section-tip">{{ t('vectorKb.reviewTip') }}</div>
      <div v-if="reviewTotal > 0" class="review-counts">
        <a-tag color="red" size="small">{{ t('vectorKb.reviewOverdueLabel', { count: reviewOverdue }) }}</a-tag>
        <a-tag color="orange" size="small">{{ t('vectorKb.reviewDueSoonLabel', { count: reviewDueSoon }) }}</a-tag>
      </div>
      <a-table
        v-if="reviewDocs.length"
        :data="reviewDocs"
        :loading="reviewLoading"
        :pagination="false"
        row-key="doc_id"
        :bordered="false"
        size="small"
        class="block-gap"
        :row-class="reviewRowClass"
        @row-click="openEditDoc"
      >
        <template #columns>
          <a-table-column :title="t('vectorKb.docTitle2')" data-index="title" :width="280" :ellipsis="true" />
          <a-table-column :title="t('vectorKb.owner')" :width="160">
            <template #cell="{ record }">{{ record.owner || t('vectorKb.emptyCell') }}</template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.reviewDate')" :width="140">
            <template #cell="{ record }">
              <!-- review_date < 今天 → 标红（1041 §4.2） -->
              <span :class="{ 'text-danger': isOverdue(record.review_date) }">
                {{ record.review_date || t('vectorKb.emptyCell') }}
              </span>
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.confidentiality')" :width="100">
            <template #cell="{ record }">
              <a-tag v-if="record.confidentiality" :color="confColor(record.confidentiality)" size="small">
                {{ confText(record.confidentiality) }}
              </a-tag>
              <span v-else class="muted">{{ t('vectorKb.emptyCell') }}</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <a-empty
        v-else-if="!reviewLoading"
        class="block-gap"
        :description="t('vectorKb.reviewEmpty', { days: REVIEW_DAYS })"
      />
    </a-card>

    <!-- 1041 §3.8 P1：内容缺口分析（跨库全局，不含系统自检；1041 §2.2 部门知识库页不展示） -->
    <a-card
      v-if="isAdminMode && isAdmin"
      v-show="activeTab === 'insight'"
      :bordered="false"
      style="margin-top: 16px"
      :title="t('vectorKb.gapTitle')"
    >
      <template #extra>
        <a-button size="small" :loading="gapLoading" @click="loadGaps">
          <template #icon><icon-refresh /></template>
        </a-button>
      </template>
      <div class="section-tip">{{ t('vectorKb.gapTip') }}</div>

      <div class="gap-kpi">
        <div class="kpi-card">
          <div class="kpi-value">{{ gapData?.total ?? 0 }}</div>
          <div class="kpi-label">{{ t('vectorKb.gapTotal') }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ gapData?.zero_hit ?? 0 }}</div>
          <div class="kpi-label">{{ t('vectorKb.gapZeroHit') }} {{ formatRate(gapData?.zero_hit_rate) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ gapData?.low_conf ?? 0 }}</div>
          <div class="kpi-label">{{ t('vectorKb.gapLowConf') }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ formatMs(gapData?.avg_elapsed_ms) }}</div>
          <div class="kpi-label">{{ t('vectorKb.gapAvgElapsed') }}</div>
        </div>
      </div>

      <!-- 1041 §4.2：total 很小时提示「样本不足」，不要误导管理员改内容 -->
      <a-alert
        v-if="gapData && (gapData.total ?? 0) < GAP_SAMPLE_MIN"
        type="info"
        class="block-gap"
      >
        {{
          t('vectorKb.gapSampleInsufficient', {
            days: gapData.days ?? GAP_DAYS,
            total: gapData.total ?? 0
          })
        }}
      </a-alert>

      <div
        v-if="
          gapZeroHit.length ||
          gapLowConf.length ||
          gapNeverHitDocs.length ||
          gapBadFeedbackDocs.length
        "
        class="gap-tables"
      >
        <div class="gap-table-block">
          <div class="gap-table-title">{{ t('vectorKb.gapZeroHitTable') }}</div>
          <a-table
            :data="gapZeroHit"
            :loading="gapLoading"
            :pagination="false"
            :row-key="r => r.query"
            :bordered="false"
            size="small"
          >
            <template #columns>
              <a-table-column :title="t('vectorKb.gapColQuery')" data-index="query" :ellipsis="true" />
              <a-table-column :title="t('vectorKb.gapColCount')" data-index="count" :width="80" />
              <a-table-column :title="t('vectorKb.gapColLastTime')" data-index="last_time" :width="170" />
              <a-table-column :title="t('commonTable.operation')" :width="120">
                <template #cell="{ record }">
                  <!-- 1041 §4.2：零命中问题可一键「去新建文档」，默认标题 = 该问题 -->
                  <a-button type="text" size="mini" @click="openCreateDoc(record.query)">
                    {{ t('vectorKb.gapCreateDoc') }}
                  </a-button>
                </template>
              </a-table-column>
            </template>
            <template #empty>
              <a-empty :description="t('vectorKb.gapEmpty', { days: GAP_DAYS })" />
            </template>
          </a-table>
        </div>

        <div class="gap-table-block">
          <div class="gap-table-title">{{ t('vectorKb.gapLowConfTable') }}</div>
          <a-table
            :data="gapLowConf"
            :loading="gapLoading"
            :pagination="false"
            :row-key="r => r.query"
            :bordered="false"
            size="small"
          >
            <template #columns>
              <a-table-column :title="t('vectorKb.gapColQuery')" data-index="query" :ellipsis="true" />
              <a-table-column :title="t('vectorKb.gapColCount')" data-index="count" :width="80" />
              <a-table-column :title="t('vectorKb.gapColLastTime')" data-index="last_time" :width="170" />
            </template>
            <template #empty>
              <a-empty :description="t('vectorKb.gapEmpty', { days: GAP_DAYS })" />
            </template>
          </a-table>
        </div>

        <div class="gap-table-block">
          <div class="gap-table-title">{{ t('vectorKb.gapNeverHitTable') }}</div>
          <a-table
            :data="gapNeverHitDocs"
            :loading="gapLoading"
            :pagination="false"
            row-key="doc_id"
            :bordered="false"
            size="small"
            @row-click="openEditDoc"
          >
            <template #columns>
              <a-table-column :title="t('vectorKb.docTitle2')" data-index="title" :width="280" :ellipsis="true" />
              <a-table-column :title="t('vectorKb.gapColSource')" data-index="source_uri" :ellipsis="true" />
            </template>
            <template #empty>
              <a-empty :description="t('vectorKb.gapEmpty', { days: GAP_DAYS })" />
            </template>
          </a-table>
        </div>

        <!-- 1041 §3.9：被点踩最多的文档（「问了但答得不好」） -->
        <div class="gap-table-block">
          <div class="gap-table-title">{{ t('vectorKb.gapBadFeedbackTable') }}</div>
          <a-table
            :data="gapBadFeedbackDocs"
            :loading="gapLoading"
            :pagination="false"
            row-key="doc_id"
            :bordered="false"
            size="small"
            @row-click="openEditDoc"
          >
            <template #columns>
              <a-table-column :title="t('vectorKb.docTitle2')" data-index="title" :width="280" :ellipsis="true" />
              <a-table-column :title="t('vectorKb.gapColSource')" data-index="source_uri" :ellipsis="true" />
              <a-table-column :title="t('vectorKb.gapColBadCount')" :width="120">
                <template #cell="{ record }">
                  <a-tag color="red" size="small">{{ record.bad_count ?? 0 }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column :title="t('vectorKb.gapColLastTime')" data-index="last_time" :width="170" />
            </template>
            <template #empty>
              <a-empty :description="t('vectorKb.gapEmpty', { days: GAP_DAYS })" />
            </template>
          </a-table>
        </div>
      </div>
      <a-empty
        v-else-if="!gapLoading"
        class="block-gap"
        :description="t('vectorKb.gapEmpty', { days: GAP_DAYS })"
      />
    </a-card>

    <!-- 1041 §3.10 P2：反馈回路（仅管理员；只查看与处理，不做提交入口） -->
    <a-card
      v-if="isAdminMode && isAdmin"
      v-show="activeTab === 'insight'"
      :bordered="false"
      style="margin-top: 16px"
      :title="t('vectorKb.feedbackTitle')"
    >
      <template #extra>
        <a-space>
          <a-select
            :model-value="feedbackStatus"
            style="width: 140px"
            size="small"
            @change="handleFeedbackStatusFilter"
          >
            <a-option value="open">{{ t('vectorKb.feedbackStatusOpen') }}</a-option>
            <a-option value="">{{ t('vectorKb.feedbackStatusAll') }}</a-option>
            <a-option value="fixed">{{ t('vectorKb.feedbackStatusFixed') }}</a-option>
            <a-option value="ignored">{{ t('vectorKb.feedbackStatusIgnored') }}</a-option>
          </a-select>
          <a-button size="small" :loading="feedbackLoading" @click="loadFeedback">
            <template #icon><icon-refresh /></template>
          </a-button>
        </a-space>
      </template>
      <div class="section-tip">{{ t('vectorKb.feedbackTip') }}</div>

      <a-table
        :data="feedbackList"
        :loading="feedbackLoading"
        :pagination="false"
        row-key="id"
        :bordered="false"
        size="small"
        class="block-gap"
        :scroll="{ x: 1250 }"
      >
        <template #columns>
          <a-table-column :title="t('vectorKb.feedbackColTime')" data-index="created_time" :width="170" />
          <a-table-column :title="t('vectorKb.feedbackColUser')" :width="140">
            <template #cell="{ record }">
              {{ record.user_name || record.user_id || t('vectorKb.emptyCell') }}
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.feedbackColQuery')" data-index="query" :ellipsis="true" />
          <a-table-column :title="t('vectorKb.feedbackColChannel')" :width="100">
            <template #cell="{ record }">
              <a-tag color="gray" size="small">{{ feedbackChannelText(record.channel) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.feedbackColVerdict')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="verdictColor(record.verdict)" size="small">{{ verdictText(record.verdict) }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.feedbackColTarget')" :width="150">
            <template #cell="{ record }">
              <span class="muted">#{{ record.index_id ?? '-' }}</span>
              <span v-if="record.doc_id" class="muted"> / #{{ record.doc_id }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.feedbackColNote')" data-index="note" :width="180" :ellipsis="true" />
          <a-table-column :title="t('vectorKb.feedbackColStatus')" :width="100">
            <template #cell="{ record }">
              <a-tag :color="feedbackStatusColor(record.status)" size="small">
                {{ feedbackStatusText(record.status) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column :title="t('vectorKb.feedbackColHandled')" :width="160">
            <template #cell="{ record }">
              <span v-if="record.handled_by || record.handled_time" class="muted">
                {{ record.handled_by || t('vectorKb.emptyCell') }}
                <template v-if="record.handled_time"> · {{ record.handled_time }}</template>
              </span>
              <span v-else class="muted">{{ t('vectorKb.emptyCell') }}</span>
            </template>
          </a-table-column>
          <a-table-column :title="t('commonTable.operation')" :width="190" fixed="right">
            <template #cell="{ record }">
              <template v-if="record.status === 'open'">
                <a-button type="text" size="mini" @click="handleFeedbackStatus(record, 'fixed')">
                  {{ t('vectorKb.feedbackMarkFixed') }}
                </a-button>
                <a-button type="text" size="mini" status="danger" @click="handleFeedbackStatus(record, 'ignored')">
                  {{ t('vectorKb.feedbackMarkIgnored') }}
                </a-button>
              </template>
            </template>
          </a-table-column>
        </template>
        <template #empty>
          <a-empty :description="t('vectorKb.feedbackEmpty')" />
        </template>
      </a-table>
    </a-card>
    <!-- /分区内容结束（以下为弹窗，不随分区显隐） -->
    </template>

    <!-- 新增 / 编辑别名（1040 §3.2） -->
    <a-modal
      v-model:visible="aliasModalVisible"
      :title="aliasForm.alias_id ? t('vectorKb.aliasEdit') : t('vectorKb.addAlias')"
      :on-before-ok="handleSaveAlias"
      :mask-closable="false"
      :ok-text="t('commonTable.confirm')"
      :cancel-text="t('commonTable.cancel')"
      unmount-on-close
    >
      <a-form :model="aliasForm" layout="vertical">
        <a-form-item :label="t('vectorKb.aliasCol')" required>
          <a-input
            v-model="aliasForm.alias"
            :max-length="64"
            show-word-limit
            :placeholder="t('vectorKb.aliasPlaceholder')"
          />
        </a-form-item>
        <a-form-item :label="t('vectorKb.canonicalCol')" required>
          <a-input
            v-model="aliasForm.canonical"
            :max-length="64"
            show-word-limit
            :placeholder="t('vectorKb.canonicalPlaceholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 新增 / 编辑探针（1040 §四） -->
    <a-modal
      v-model:visible="probeModalVisible"
      :title="probeForm.probe_id ? t('vectorKb.probeEdit') : t('vectorKb.probeAdd')"
      :on-before-ok="handleSaveProbe"
      :mask-closable="false"
      :ok-text="t('commonTable.confirm')"
      :cancel-text="t('commonTable.cancel')"
      unmount-on-close
    >
      <a-form :model="probeForm" layout="vertical">
        <a-form-item :label="t('vectorKb.docTitle2')">
          <a-input :model-value="probeForm.docTitle" readonly />
        </a-form-item>
        <a-form-item :label="t('vectorKb.probeQuestionLabel')" required>
          <a-textarea
            v-model="probeForm.question"
            :max-length="512"
            show-word-limit
            :auto-size="{ minRows: 3, maxRows: 6 }"
            :placeholder="t('vectorKb.probeQuestionPlaceholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 1041 §3.6 / §4.5：文档写入通道（新建 / 编辑；上传走 doc/save 逐文件提交）
         1043：改左右两栏 —— 左边「路径 + 正文」，右边元数据面板；
         原来把元数据预览挤在编辑器上方一行，字段一多就折行、很难读 -->
    <a-modal
      v-model:visible="docModalVisible"
      :title="docForm.mode === 'edit' ? t('vectorKb.editDoc') : t('vectorKb.newDocTitle')"
      :on-before-ok="handleSaveDoc"
      :mask-closable="false"
      :ok-text="t('commonTable.confirm')"
      :cancel-text="t('commonTable.cancel')"
      :width="1040"
      unmount-on-close
    >
      <a-form :model="docForm" layout="vertical">
        <!-- 1041 §5.3.1：编辑保存 = 覆盖，系统不留历史版本 → 必须先提示备份 -->
        <a-alert
          v-if="docForm.mode === 'edit'"
          type="warning"
          class="block-gap-sm"
        >
          {{ t('vectorKb.docOverwriteBackupTip') }}
        </a-alert>

        <a-row :gutter="16">
          <!-- 左栏：路径 + 正文 -->
          <a-col :span="17">
            <a-form-item
              :label="t('vectorKb.docPath')"
              required
              :help="docForm.mode === 'edit' ? t('vectorKb.pathEditLocked') : t('vectorKb.docPathTip')"
            >
              <a-input
                v-model="docForm.path"
                :disabled="docForm.mode === 'edit'"
                :placeholder="t('vectorKb.docPathPlaceholder')"
              />
            </a-form-item>
            <a-form-item :label="t('vectorKb.docContent')">
              <a-textarea
                v-model="docForm.content"
                class="doc-textarea"
                :auto-size="{ minRows: 18, maxRows: 30 }"
                :placeholder="t('vectorKb.docContentPlaceholder')"
              />
            </a-form-item>
          </a-col>

          <!-- 右栏：元数据面板（front-matter 解析结果，保存前可见；1041 §3.6） -->
          <a-col :span="7">
            <div class="doc-meta-panel">
              <div class="doc-meta-head">
                <span class="doc-meta-title">{{ t('vectorKb.frontMatterTip') }}</span>
                <a-button size="mini" @click="insertFrontMatterTemplate">
                  {{ t('vectorKb.frontMatterTemplate') }}
                </a-button>
              </div>

              <template v-if="fmParsed.has">
                <div class="doc-meta-row">
                  <span class="doc-meta-key">{{ t('vectorKb.docStatus') }}</span>
                  <a-tag :color="docStatusColor(fmParsed.status)" size="small">
                    {{ docStatusText(fmParsed.status) }}
                  </a-tag>
                </div>
                <div class="doc-meta-row">
                  <span class="doc-meta-key">{{ t('vectorKb.confidentiality') }}</span>
                  <a-tag
                    v-if="fmParsed.confidentiality"
                    :color="confColor(fmParsed.confidentiality)"
                    size="small"
                  >
                    {{ confText(fmParsed.confidentiality) }}
                  </a-tag>
                  <span v-else class="muted">{{ t('vectorKb.emptyCell') }}</span>
                </div>
                <div class="doc-meta-row">
                  <span class="doc-meta-key">{{ t('vectorKb.owner') }}</span>
                  <span class="doc-meta-val">{{ fmParsed.owner || t('vectorKb.emptyCell') }}</span>
                </div>
                <div class="doc-meta-row">
                  <span class="doc-meta-key">{{ t('vectorKb.effectiveDate') }}</span>
                  <span class="doc-meta-val">{{ fmParsed.effective_date || t('vectorKb.emptyCell') }}</span>
                </div>
                <div class="doc-meta-row">
                  <span class="doc-meta-key">{{ t('vectorKb.reviewDate') }}</span>
                  <span class="doc-meta-val">{{ fmParsed.review_date || t('vectorKb.emptyCell') }}</span>
                </div>
                <div class="doc-meta-row">
                  <span class="doc-meta-key">{{ t('vectorKb.tags') }}</span>
                  <span class="doc-meta-val">
                    <template v-if="splitTags(fmParsed.tags).length">
                      <a-tag
                        v-for="tg in splitTags(fmParsed.tags)"
                        :key="tg"
                        color="gray"
                        size="small"
                        class="tag-cell"
                      >
                        {{ tg }}
                      </a-tag>
                    </template>
                    <span v-else class="muted">{{ t('vectorKb.emptyCell') }}</span>
                  </span>
                </div>
                <div v-if="fmParsed.status === 'draft'" class="section-tip doc-meta-note">
                  {{ t('vectorKb.docDraftHint') }}
                </div>
              </template>
              <div v-else class="section-tip">{{ t('vectorKb.frontMatterNone') }}</div>

              <div class="section-tip doc-meta-foot">{{ t('vectorKb.docContentEmptyTip') }}</div>
            </div>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 1041 §3.11：管理员开通部门库时须显式选部门（dept_id 必传） -->
    <a-modal
      v-model:visible="createDeptKbModalVisible"
      :title="t('vectorKb.createDeptKbTitle')"
      :on-before-ok="doCreateDeptKb"
      :mask-closable="false"
      :ok-text="t('commonTable.confirm')"
      :cancel-text="t('commonTable.cancel')"
      unmount-on-close
    >
      <a-form :model="createDeptKbForm" layout="vertical">
        <a-form-item
          field="dept_id"
          :label="t('vectorKb.createDeptKbPickDept')"
          required
          :help="t('vectorKb.createDeptKbTip')"
        >
          <a-select
            v-model="createDeptKbForm.dept_id"
            :options="deptOptions"
            :loading="deptOptionsLoading"
            allow-search
            :placeholder="t('vectorKb.createDeptKbPickDept')"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 1042 附件：新建组织级库（仅管理员，库名必填） -->
    <a-modal
      v-model:visible="createOrgKbModalVisible"
      :title="t('vectorKb.createOrgKbTitle')"
      :on-before-ok="doCreateOrgKb"
      :mask-closable="false"
      :ok-text="t('commonTable.confirm')"
      :cancel-text="t('commonTable.cancel')"
      unmount-on-close
    >
      <a-form :model="createOrgKbForm" layout="vertical">
        <a-form-item
          field="org_name"
          :label="t('vectorKb.createOrgKbName')"
          required
          :help="t('vectorKb.createOrgKbTip')"
        >
          <a-input
            v-model="createOrgKbForm.org_name"
            :max-length="64"
            allow-clear
            :placeholder="t('vectorKb.createOrgKbPlaceholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Notification } from '@arco-design/web-vue'
import { useUserStore } from '@/stores/user'
import {
  getVectorIndexList,
  getVectorDocList,
  vectorSearch,
  rebuildVectorIndex,
  syncSystemKnowledge,
  getKbSettings,
  saveKbSettings,
  getAliasList,
  saveAlias,
  deleteAlias,
  getProbeList,
  saveProbe,
  deleteProbe,
  runProbes,
  getLastProbeRun,
  getProbeResults,
  saveVectorDoc,
  getVectorDocContent,
  deleteVectorDoc,
  getInsightGaps,
  getReviewDue,
  getKbFeedbackList,
  handleKbFeedback,
  createDeptKb,
  createOrgKb
} from '@/api/modules/gisVector'
import { getDeptList } from '@/api/modules/gisUserDept'

const { t } = useI18n()
const userStore = useUserStore()

// 1041 §2.1：两个菜单入口共用同一个页面组件，靠 mode 收敛差异，不写两套页面
//   mode='admin' → 管理中心 › 平台能力 › 向量知识库（全局区块齐全）
//   mode='dept'  → 工作台 › 部门知识库（无检索设置 / 别名表 / 内容缺口 / 反馈 / 重新同步）
const props = defineProps({
  mode: { type: String, default: 'admin' }
})
const isAdminMode = computed(() => props.mode !== 'dept')

// 管理员判定（107 D4：同步仅管理员；role_key='admin' 旁路放行）
// 1040 §3.4：kb_settings / alias/* / probe/* 全部仅管理员可用（后端 403）
const isAdmin = computed(() => {
  const rs = userStore.roles || []
  return rs.includes('admin') || rs.includes('管理员组')
})

// 1041 §4.4：非管理员调用返回 403 → 整页显示「权限不足」
const forbidden = ref(false)

/** 统一识别 403（HTTP 403 或被拦截器包成 {code:403} 两种形态） */
function markForbidden(err) {
  if (err?.response?.status === 403 || err?.code === 403) forbidden.value = true
}

// ---------- 说明区块 ----------
const helpOpen = ref(false)

// ---------- 1043 分区切换（tag 式）----------
// 用 v-show 而非 a-tabs：切分区不发请求、不丢当前状态（检索结果 / 展开的探针行都保留）
//   docs      文档（知识库列表 + 说明 + 文档列表）
//   search    检索（语义检索）
//   selfcheck 自检与复审（问答自检 + 待复审）
//   settings  设置（检索设置 + 别名表，仅管理员）
//   insight   分析与反馈（内容缺口 + 反馈，仅管理员）
const activeTab = ref('docs')

const DOC_PAGE_SIZE = 20
// 探针分组要给文档行显示标题，一次多取一些（doc_list 的 page_size 上限 200）
const PROBE_DOC_PAGE_SIZE = 200

/** AjaxResult → 数组（兼容 data 直接是数组 / data.list 两种形态） */
function toList(res) {
  const data = res?.data ?? res
  return Array.isArray(data) ? data : (data?.list || [])
}

// ---------- 知识库（多库：system 内置 / dept 部门 / user 个人） ----------
const indexLoading = ref(false)
const indexList = ref([])
// 当前选中的库：本页所有区块（检索 / 文档 / 自检 / 重建）都以它为准
const selectedIndex = ref(null)

// 选择器 v-model：用 id 反查列表里的库对象（只在可选范围内反查，避免选中不可管理的库）
const selectedIndexId = computed({
  get: () => selectedIndex.value?.index_id,
  set: (id) => {
    selectedIndex.value = selectableIndexes.value.find(i => i.index_id === id) || null
  }
})

const SCOPE_COLORS = { system: 'purple', org: 'cyan', dept: 'arcoblue', user: 'green' }
const SCOPE_TEXTS = {
  system: 'vectorKb.scopeSystem',
  org: 'vectorKb.scopeOrg',
  dept: 'vectorKb.scopeDept',
  user: 'vectorKb.scopeUser'
}

function scopeColor(scope) {
  return SCOPE_COLORS[scope] || 'gray'
}

function scopeText(scope) {
  return t(SCOPE_TEXTS[scope] || 'vectorKb.scopeUnknown')
}

// 1041 联调修正（§四）：can_manage 是唯一依据。
// 「部门知识库」页只列 / 只处理 can_manage=true 的库 —— 内置库(system) / 组织级库(org)
// 对非管理员一律 false，列出来一旦被选中，按库接口（doc_list / rebuild / probe / review/due）
// 必然 403，所以在选择器这一层就掐掉。
const selectableIndexes = computed(() =>
  isAdminMode.value ? indexList.value : indexList.value.filter(i => i.can_manage === true)
)

// 1041 §3.1 / §2.2：写文档 / 强制重建 / 立即自检的显隐**一律看接口返回的 can_manage**，
// 不按 scope 猜（同为 scope=dept，对负责人 true、对别人 false，看 scope 判断不出来）。
const canManage = computed(() => selectedIndex.value?.can_manage === true)

// 强制重建：需 can_manage；个人库无页面入口，仍排除
const canForceRebuild = computed(
  () => canManage.value && ['system', 'org', 'dept'].includes(selectedIndex.value?.scope)
)

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
const searchLowConf = ref(false)
const searchExpanded = ref('')
const searchQuery = ref('')
const searchForm = reactive({
  query: '',
  top_k: 5
})

function formatScore(score) {
  return typeof score === 'number' ? score.toFixed(4) : '-'
}

// ---------- R10：检索结果按「条目」聚合 ----------
// chunk_no = 条目首段、chunk_no_end = 条目末段（都从 0 起，展示时各 +1）；
// 两者相等 = 未合并，直接显示「第 N 段」，否则显示区间「第 N-M 段」。
function chunkRangeText(hit) {
  const from = hit.chunk_no + 1
  if (!(hit.chunk_no_end > hit.chunk_no)) return t('vectorKb.chunkNo', { no: from })
  return t('vectorKb.chunkRange', { from, to: hit.chunk_no_end + 1 })
}

// 合并后的条目正文最长 4000 字 → 超过阈值默认限高，可单条展开
const HIT_TEXT_MAX = 300
// chunk_id 取条目内最高分那一段的 id，天然唯一，用它做展开态的 key
const expandedHits = ref(new Set())

function isHitLong(hit) {
  return String(hit.text || '').length > HIT_TEXT_MAX
}

function isHitExpanded(hit) {
  return expandedHits.value.has(hit.chunk_id)
}

function toggleHitText(hit) {
  const next = new Set(expandedHits.value)
  if (next.has(hit.chunk_id)) next.delete(hit.chunk_id)
  else next.add(hit.chunk_id)
  expandedHits.value = next
}

function shortHash(hash) {
  return hash ? `${hash.slice(0, 8)}…` : '-'
}

function rowClass(record) {
  return selectedIndex.value?.index_id === record.index_id ? 'row-active' : ''
}

async function loadIndexes(preferIndexId) {
  indexLoading.value = true
  try {
    const res = await getVectorIndexList()
    indexList.value = toList(res)
    const selectable = selectableIndexes.value
    // 1041 联调修正 §三.1/§三.3：选中项只在「可选范围」里续命。
    // 一旦它不可管理 / 已消失 → 清空为 null，绝不回退到别的库，
    // 这样各区块不会发出按库请求（否则必然 403）。
    if (selectedIndex.value) {
      selectedIndex.value =
        selectable.find(i => i.index_id === selectedIndex.value.index_id) || null
    }
    // 默认选中：管理员优先内置库(system)；部门知识库页只有可管理的库，取第一个
    if (!selectedIndex.value) {
      selectedIndex.value = isAdminMode.value
        ? (selectable.find(i => i.scope === 'system') || selectable[0] || null)
        : (selectable[0] || null)
    }
    // 1041 §3.11：新建部门库后重新拉列表并直接进入该库
    if (typeof preferIndexId === 'number') {
      selectedIndex.value = selectable.find(i => i.index_id === preferIndexId) || selectedIndex.value
    }
  } catch (e) { markForbidden(e) }
  finally { indexLoading.value = false }
}

// ---------- 1041 §3.11：自助开通部门知识库 ----------
const creatingDeptKb = ref(false)
const createDeptKbModalVisible = ref(false)
// 管理员必须显式指定 dept_id → 弹窗里先选部门；部门负责人不传（后端取「我负责的第一个部门」）
const createDeptKbForm = reactive({ dept_id: undefined })
const deptOptions = ref([])
const deptOptionsLoading = ref(false)

async function loadDeptOptions() {
  deptOptionsLoading.value = true
  try {
    const res = await getDeptList()
    // 停用的部门后端会报错（记录不存在），这里先过滤掉
    deptOptions.value = toList(res)
      .filter(d => d.status === '0')
      .map(d => ({ label: d.deptName, value: d.deptId }))
  } catch (_) {
    deptOptions.value = []
  } finally { deptOptionsLoading.value = false }
}

/** 「创建本部门知识库」入口：部门负责人直接建，管理员先选部门 */
function handleCreateDeptKb() {
  if (!isAdmin.value) {
    doCreateDeptKb()
    return
  }
  createDeptKbForm.dept_id = undefined
  createDeptKbModalVisible.value = true
  loadDeptOptions()
}

/** @returns {Promise<boolean>} 供 a-modal 的 on-before-ok 使用 */
async function doCreateDeptKb() {
  const payload = {}
  if (isAdmin.value) {
    if (!createDeptKbForm.dept_id) {
      Message.warning(t('vectorKb.createDeptKbDeptRequired'))
      return false
    }
    payload.dept_id = createDeptKbForm.dept_id
  }
  creatingDeptKb.value = true
  try {
    const res = await createDeptKb(payload)
    const d = res.data || res
    Message.success(t('vectorKb.createDeptKbSuccess', { id: d?.index_id ?? '-' }))
    createDeptKbModalVisible.value = false
    await loadIndexes(d?.index_id)
    return true
  } catch (_) {
    // 403 = 不是该部门负责人（或部门不存在/停用），只弹错，不整页 403
    return false
  } finally { creatingDeptKb.value = false }
}

// ---------- 1042 附件：新建组织级库（仅管理员） ----------
const creatingOrgKb = ref(false)
const createOrgKbModalVisible = ref(false)
const createOrgKbForm = reactive({ org_name: '' })

/** 库名校验（前端先挡，后端也校验）：1~64 字符；不能以 _ 或 . 开头；不能含 / \ .. */
function validateOrgName(name) {
  const v = (name || '').trim()
  if (!v) return t('vectorKb.createOrgKbRequired')
  if (v.length > 64) return t('vectorKb.createOrgKbInvalid')
  if (v.startsWith('_') || v.startsWith('.')) return t('vectorKb.createOrgKbInvalid')
  if (v.includes('/') || v.includes('\\') || v.includes('..')) return t('vectorKb.createOrgKbInvalid')
  return ''
}

function handleCreateOrgKb() {
  createOrgKbForm.org_name = ''
  createOrgKbModalVisible.value = true
}

/** @returns {Promise<boolean>} 供 a-modal 的 on-before-ok 使用 */
async function doCreateOrgKb() {
  const name = createOrgKbForm.org_name.trim()
  const err = validateOrgName(name)
  if (err) {
    Message.warning(err)
    return false
  }
  creatingOrgKb.value = true
  try {
    // showError: false → 由本页按文档 §四 口径给文案，避免与拦截器重复弹错
    const res = await createOrgKb({ org_name: name }, { showError: false })
    const d = res.data || res
    Message.success(t('vectorKb.createOrgKbSuccess', { id: d?.index_id ?? '-' }))
    createOrgKbModalVisible.value = false
    // 重新拉 index_list 并选中新库（loadIndexes 的 preferIndexId 分支）
    await loadIndexes(d?.index_id)
    return true
  } catch (e) {
    const status = e?.response?.status ?? e?.code
    if (status === 403) Message.warning(t('vectorKb.createOrgKbForbidden'))
    else Message.error(e?.response?.data?.msg || e?.msg || t('vectorKb.createOrgKbFailed'))
    return false
  } finally { creatingOrgKb.value = false }
}

async function loadDocs() {
  if (!selectedIndex.value) return
  docLoading.value = true
  try {
    const res = await getVectorDocList(selectedIndex.value.index_id, docPage.value, DOC_PAGE_SIZE)
    const data = res.data || res
    docList.value = Array.isArray(data) ? data : (data?.list || [])
  } catch (e) { markForbidden(e) }
  finally { docLoading.value = false }
}

// ---------- 1041 §3.2 文档元数据列的展示口径 ----------

const DOC_STATUS_TEXT = {
  draft: 'vectorKb.docStatusDraft',
  published: 'vectorKb.docStatusPublished',
  archived: 'vectorKb.docStatusArchived'
}
// 草稿=灰、已发布=绿、已归档=蓝灰
const DOC_STATUS_COLOR = { draft: 'gray', published: 'green', archived: 'arcoblue' }

function docStatusText(status) {
  return t(DOC_STATUS_TEXT[status] || 'vectorKb.docStatusPublished')
}

function docStatusColor(status) {
  return DOC_STATUS_COLOR[status] || 'gray'
}

const CONF_TEXT = {
  public: 'vectorKb.confPublic',
  internal: 'vectorKb.confInternal',
  confidential: 'vectorKb.confConfidential'
}
const CONF_COLOR = { public: 'green', internal: 'arcoblue', confidential: 'red' }

function confText(level) {
  return level ? t(CONF_TEXT[level] || 'vectorKb.emptyCell') : t('vectorKb.emptyCell')
}

function confColor(level) {
  return CONF_COLOR[level] || 'gray'
}

/** tags 是逗号分隔字符串（兼容 front-matter 里的 [a, b] 写法） */
function splitTags(tags) {
  if (!tags) return []
  return String(tags)
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(s => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

function todayStr() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 复审日期已过期（review_date < 今天）→ 列表 / 提醒里标红 */
function isOverdue(dateStr) {
  if (!dateStr) return false
  return String(dateStr).slice(0, 10) < todayStr()
}

// ---------- 1041 §3.6 / §4.5 文档写入通道 ----------

const uploadInput = ref(null)
const docUploading = ref(false)
const docModalVisible = ref(false)
const docForm = reactive({ mode: 'create', index_id: undefined, doc_id: undefined, path: '', content: '' })

const DOC_NEW_PATH = '制度流程/新文档.md'

/** 从 source_uri 去掉库前缀（knowledge_lib/<域目录>/）还原出「相对库目录」的 path */
function pathFromSourceUri(uri) {
  if (!uri) return ''
  const s = String(uri).replace(/\\/g, '/')
  const m = s.match(/knowledge_lib\/[^/]+\/(.+)$/)
  return m ? m[1] : s
}

/**
 * 路径校验（1041 §3.6，前端先拦一道）：返回错误文案，合法则返回空串
 */
function validateDocPath(path) {
  const p = (path || '').trim().replace(/\\/g, '/')
  if (!p) return t('vectorKb.pathRequired')
  if (!p.endsWith('.md')) return t('vectorKb.pathInvalidMd')
  if (p.startsWith('/')) return t('vectorKb.pathInvalidAbs')
  if (p.includes(':')) return t('vectorKb.pathInvalidColon')
  if (p.includes('//')) return t('vectorKb.pathInvalidEmptySeg')
  const segs = p.split('/')
  if (segs.some(s => s === '..' || s === '.')) return t('vectorKb.pathInvalidDot')
  if (segs.some(s => s.startsWith('_') || s.startsWith('.'))) return t('vectorKb.pathInvalidPrefix')
  return ''
}

/** 解析正文开头的 front-matter（不写也能用，默认视为已发布） */
function parseFrontMatter(content) {
  const empty = {
    has: false,
    status: 'published',
    owner: '',
    effective_date: '',
    review_date: '',
    confidentiality: '',
    tags: ''
  }
  const m = String(content || '').match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return empty
  const body = m[1]
  const get = (key) => {
    const mm = body.match(new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`, 'mi'))
    return mm ? mm[1].trim().replace(/^["']|["']$/g, '') : ''
  }
  return {
    has: true,
    status: get('status') || 'published',
    owner: get('owner'),
    effective_date: get('effective_date'),
    review_date: get('review_date'),
    confidentiality: get('confidentiality'),
    tags: get('tags')
  }
}

const fmParsed = computed(() => parseFrontMatter(docForm.content))

function frontMatterTemplate(title = '') {
  return `---
title: ${title}
status: published
owner: 
effective_date: ${todayStr()}
review_date: 
confidentiality: internal
tags: []
---

# ${title || '正文标题'}
`
}

/** 打开「新建」（1041 §4.2：零命中榜可带默认标题 = 该问题） */
function openCreateDoc(title = '') {
  docForm.mode = 'create'
  docForm.index_id = selectedIndex.value?.index_id
  docForm.doc_id = undefined
  docForm.path = DOC_NEW_PATH
  docForm.content = frontMatterTemplate(title)
  docModalVisible.value = true
}

/** 打开「编辑」：先拉 doc/content 回填，path 沿用原路径（否则会变成新增一篇） */
async function openEditDoc(record) {
  if (!record?.doc_id) return
  try {
    const res = await getVectorDocContent(record.doc_id)
    const d = res.data || res
    const doc = d?.doc || {}
    docForm.mode = 'edit'
    docForm.index_id = doc.index_id ?? selectedIndex.value?.index_id
    docForm.doc_id = doc.doc_id ?? record.doc_id
    docForm.path = pathFromSourceUri(doc.source_uri || record.source_uri)
    docForm.content = d?.content ?? ''
    docModalVisible.value = true
  } catch (e) { markForbidden(e) }
}

function insertFrontMatterTemplate() {
  if (/^---\r?\n/.test(docForm.content)) return
  docForm.content = frontMatterTemplate() + docForm.content
}

async function handleSaveDoc() {
  const path = (docForm.path || '').trim().replace(/\\/g, '/')
  const pathErr = validateDocPath(path)
  if (pathErr) {
    Message.warning(pathErr)
    return false
  }
  if (!docForm.index_id) {
    Message.warning(t('vectorKb.noIndexSelected'))
    return false
  }
  // 正文为空仍允许保存（会得到一个空文档），只提示一次（1041 §4.5）
  if (!String(docForm.content || '').trim()) {
    Message.info(t('vectorKb.docContentEmptyTip'))
  }
  try {
    const res = await saveVectorDoc({ index_id: docForm.index_id, path, content: docForm.content })
    const d = res.data || res
    Message.success(t('vectorKb.docSaved', { id: d?.doc_id ?? '-' }))
    docModalVisible.value = false
    // 保存的是当前选中库的文档 → 刷新文档列表与探针分组
    if (selectedIndex.value?.index_id === docForm.index_id) {
      docPage.value = 1
      await loadDocs()
      if (canManage.value) await loadProbeData()
    }
    return true
  } catch (_) {
    return false
  }
}

async function handleDeleteDoc(record) {
  const indexId = record.index_id ?? selectedIndex.value?.index_id
  if (!indexId) return
  try {
    await deleteVectorDoc({ index_id: indexId, doc_id: record.doc_id })
    Message.success(t('vectorKb.docDeleted'))
    await loadDocs()
    // 删除后该文档的探针会变成「跳过」，刷新自检分组
    if (canManage.value) await loadProbeData()
  } catch (e) { markForbidden(e) }
}

function triggerUpload() {
  uploadInput.value?.click()
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'utf-8')
  })
}

/** 上传多个 .md：逐个调 doc/save，失败的单独提示，不整体回滚（1041 §4.5） */
async function handleUploadFiles(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return
  if (!selectedIndex.value) {
    Message.warning(t('vectorKb.noIndexSelected'))
    return
  }
  docUploading.value = true
  const failed = []
  let ok = 0
  for (const f of files) {
    const path = (f.name || '').trim().replace(/\\/g, '/')
    const pathErr = validateDocPath(path)
    if (pathErr) {
      failed.push(`${path || '(未命名)'}：${pathErr}`)
      continue
    }
    try {
      const content = await readFileText(f)
      await saveVectorDoc({ index_id: selectedIndex.value.index_id, path, content })
      ok++
    } catch (_) {
      failed.push(`${path}：${t('vectorKb.docSaveFailed')}`)
    }
  }
  docUploading.value = false
  if (failed.length) {
    Notification.warning({
      title: t('vectorKb.uploadDoc'),
      content: t('vectorKb.uploadPartialFailed', { files: failed.join('；') }),
      duration: 8000
    })
  } else {
    Message.success(t('vectorKb.uploadDone', { ok }))
  }
  docPage.value = 1
  await loadDocs()
  if (canManage.value) await loadProbeData()
}

// 点表格行 = 切换当前知识库（文档 / 自检由 selectedIndex 的 watch 统一重载）
function handleRowClick(record) {
  selectedIndex.value = record
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

/**
 * 重建当前选中的知识库
 * @param {boolean} force 1040 §八：true = 强制重建（删文档重切块重算向量），需二次确认
 */
async function handleRebuild(force = false) {
  const idx = selectedIndex.value
  if (!idx) return
  try {
    const res = await rebuildVectorIndex(idx.index_id, force)
    const count = res.data ?? res
    Message.success(t(force ? 'vectorKb.forceRebuildSuccess' : 'vectorKb.rebuildSuccess', { count }))
    await loadIndexes()
    // 1040 §八：重建成功后后端会自动跑一轮自检，刷新自检卡片即可
    if (selectedIndex.value?.index_id === idx.index_id) {
      await loadLastRun(idx.index_id)
    }
  } catch (_) { /* request.js 已弹错 */ }
}

// ---------- 重新同步（107 §5.1：scanned/changed 两条语义必须体现在 UI 上） ----------
const syncing = ref(false)

async function handleSync() {
  syncing.value = true
  try {
    const res = await syncSystemKnowledge()
    const d = res.data || res
    const scanned = d?.scanned ?? 0
    const changed = d?.changed ?? 0
    if (scanned === 0) {
      // 大概率 embedding 模型未就绪（后端按设计不报错只记告警）→ 警告而非成功
      Notification.warning({ title: t('vectorKb.sync'), content: t('vectorKb.syncZeroScanned'), duration: 6000 })
    } else if (changed === 0) {
      Message.info(t('vectorKb.syncNoChange'))
    } else {
      Message.success(t('vectorKb.syncChanged', { count: changed }))
    }
    // 同步成功后刷新索引与文档列表（107 §6.2）
    await loadIndexes()
    if (selectedIndex.value) {
      docPage.value = 1
      await loadDocs()
    }
  } catch (_) { /* request.js 已弹错 */ }
  finally { syncing.value = false }
}

async function handleSearch() {
  const query = searchForm.query.trim()
  if (!query) {
    Message.warning(t('vectorKb.queryRequired'))
    return
  }
  // 检索范围固定为当前选中的知识库（不再支持「全部库」）
  if (!selectedIndex.value) {
    Message.warning(t('vectorKb.noIndexSelected'))
    return
  }
  searching.value = true
  // 新一轮检索 → 清掉上一轮的展开态
  expandedHits.value = new Set()
  try {
    const payload = { query, top_k: searchForm.top_k, index_id: selectedIndex.value.index_id }
    const res = await vectorSearch(payload)
    // 1040 §3.3：data 由数组改为对象 { hits, low_confidence, suggest_no_answer, expanded_query }
    // R10：hits 是「条目」粒度，条数可能少于 top_k（几条并成一条），按实际返回渲染即可
    const d = res.data || res
    searchResults.value = Array.isArray(d?.hits) ? d.hits : []
    searchLowConf.value = d?.low_confidence === true
    searchExpanded.value = d?.expanded_query || query
    searchQuery.value = query
    searched.value = true
  } catch (_) {
    searchResults.value = []
    searchLowConf.value = false
    searchExpanded.value = ''
    searchQuery.value = query
    searched.value = true
  } finally { searching.value = false }
}

// ---------- ① 检索设置（1040 §3.1） ----------
const settingsSaving = ref(false)
const settingsForm = reactive({
  min_score: 0.45,
  low_conf_score: 0.55,
  hybrid_weight: 0.3,
  candidate_factor: 3
})

async function loadSettings() {
  try {
    const res = await getKbSettings()
    const d = res.data || res
    if (!d) return
    settingsForm.min_score = Number(d.min_score ?? 0.45)
    settingsForm.low_conf_score = Number(d.low_conf_score ?? 0.55)
    settingsForm.hybrid_weight = Number(d.hybrid_weight ?? 0.3)
    settingsForm.candidate_factor = Number(d.candidate_factor ?? 3)
  } catch (_) { /* request.js 已弹错；保留默认值展示（1040 §五） */ }
}

async function handleSaveSettings() {
  const payload = {
    min_score: Number(settingsForm.min_score),
    low_conf_score: Number(settingsForm.low_conf_score),
    hybrid_weight: Number(settingsForm.hybrid_weight),
    candidate_factor: Number(settingsForm.candidate_factor)
  }
  if (Object.values(payload).some(v => Number.isNaN(v))) {
    Message.warning(t('vectorKb.settingsInvalid'))
    return
  }
  settingsSaving.value = true
  try {
    await saveKbSettings(payload)
    Message.success(t('vectorKb.settingsSaved'))
  } catch (_) { /* request.js 已弹错 */ }
  finally { settingsSaving.value = false }
}

// ---------- ① 别名表（1040 §3.2） ----------
const aliasLoading = ref(false)
const aliasList = ref([])
const aliasModalVisible = ref(false)
const aliasForm = reactive({ alias_id: undefined, alias: '', canonical: '' })

async function loadAliases() {
  aliasLoading.value = true
  try {
    const res = await getAliasList()
    aliasList.value = toList(res)
  } catch (_) { /* request.js 已弹错 */ }
  finally { aliasLoading.value = false }
}

/** 打开别名弹窗：传 record = 编辑（回传 alias_id），不传 = 新增 */
function openAliasModal(record) {
  aliasForm.alias_id = record?.alias_id
  aliasForm.alias = record?.alias || ''
  aliasForm.canonical = record?.canonical || ''
  aliasModalVisible.value = true
}

async function handleSaveAlias() {
  const alias = aliasForm.alias.trim()
  const canonical = aliasForm.canonical.trim()
  if (!alias || !canonical) {
    Message.warning(t('vectorKb.aliasRequired'))
    return false
  }
  try {
    const payload = { alias, canonical }
    // 编辑带 alias_id；不带 status（1040 §3.2：不传 = 不改原状态）
    if (aliasForm.alias_id) payload.alias_id = aliasForm.alias_id
    await saveAlias(payload)
    Message.success(t('vectorKb.aliasSaved'))
    aliasModalVisible.value = false
    await loadAliases()
    return true
  } catch (_) {
    return false
  }
}

/**
 * 停用 / 恢复别名（1040 §3.2）
 * save 接口的 status 只接受字符串 "0"（启用）/ "1"（停用），传布尔或其它值后端返回 400；
 * alias / canonical 必填，原样回传。
 */
async function handleToggleAlias(record) {
  try {
    await saveAlias({
      alias_id: record.alias_id,
      alias: record.alias,
      canonical: record.canonical,
      status: record.status !== '1' ? '1' : '0'
    })
    await loadAliases()
  } catch (_) { /* request.js 已弹错 */ }
}

async function handleDeleteAlias(record) {
  try {
    await deleteAlias(record.alias_id)
    await loadAliases()
  } catch (_) { /* request.js 已弹错 */ }
}

// ---------- ② 问答自检（1040 §四） ----------
const probeLoading = ref(false)
const probeRunning = ref(false)
const probeList = ref([])
const probeResults = ref([])
const lastRun = ref(null)
const probeExpandedKeys = ref([])
// doc_id → 标题；用于给探针分组显示文档行
const probeDocTitles = ref(new Map())
// 文档清单是否取到：取不到时不把探针行判成「文档已移除」
const probeDocListOk = ref(false)

const probeModalVisible = ref(false)
const probeForm = reactive({
  probe_id: undefined,
  index_id: undefined,
  doc_id: undefined,
  docTitle: '',
  question: ''
})

// 最近一次自检的逐题明细，按 probe_id 索引
const probeResultMap = computed(() => {
  const map = {}
  for (const r of probeResults.value) map[r.probe_id] = r
  return map
})

function getProbeResult(probeId) {
  return probeResultMap.value[probeId] || null
}

/**
 * 明细里显示的来源：优先用当次自检的来源快照（1040 §4.3），
 * 它才是本次判定实际用的那一组；无结果时退回探针当前来源
 */
function probeSourceText(probe) {
  const source = getProbeResult(probe.probe_id)?.source || probe.source
  return source === 'manual' ? t('vectorKb.probeSourceManual') : t('vectorKb.probeSourceAuto')
}

/** 文档标题：优先取文档清单，其次取自检结果 / 不可召回清单（文档超过一页时兜底） */
function docTitleOf(docId) {
  const fromList = probeDocTitles.value.get(docId)
  if (fromList) return fromList
  const fromUnrecall = (lastRun.value?.unrecallable_docs || []).find(d => d.doc_id === docId)
  if (fromUnrecall?.title) return fromUnrecall.title
  const fromResult = probeResults.value.find(r => r.expect_doc_id === docId && r.expect_title)
  return fromResult?.expect_title || ''
}

// 探针按文档分组（1040 §二 的文档行）
const probeDocs = computed(() => {
  const groups = new Map()
  for (const p of probeList.value) {
    if (!groups.has(p.doc_id)) {
      groups.set(p.doc_id, {
        doc_id: p.doc_id,
        title: '',
        removed: false,
        hasManual: false,
        judged: 0,
        passed: 0,
        probes: []
      })
    }
    const g = groups.get(p.doc_id)
    g.probes.push(p)
    if (p.source === 'manual') g.hasManual = true
  }
  const list = []
  for (const g of groups.values()) {
    const title = docTitleOf(g.doc_id)
    // 1040 §五：文档已删除但探针还在 → 灰色标「文档已移除」，不计入分母、不参与判定
    g.removed = probeDocListOk.value && !probeDocTitles.value.has(g.doc_id)
    g.title = title || `#${g.doc_id}`
    // 1040 §4.2 判定口径：停用的探针不参与自检；有手写题只看手写题，只有自动题才用自动题
    const enabled = g.probes.filter(p => p.status !== '1')
    const manualEnabled = enabled.filter(p => p.source === 'manual')
    const judgedGroup = manualEnabled.length ? manualEnabled : enabled
    const results = judgedGroup.map(p => probeResultMap.value[p.probe_id]).filter(Boolean)
    g.judged = results.length
    g.passed = results.filter(r => r.passed === '1').length
    list.push(g)
  }
  return list
})

function triggerText(type) {
  const map = {
    manual: 'vectorKb.probeTriggerManual',
    sync: 'vectorKb.probeTriggerSync',
    rebuild: 'vectorKb.probeTriggerRebuild',
    schedule: 'vectorKb.probeTriggerSchedule'
  }
  return t(map[type] || 'vectorKb.probeTriggerManual')
}

function formatElapsed(ms) {
  return typeof ms === 'number' ? `${(ms / 1000).toFixed(1)}s` : '-'
}

function handleProbeExpandedChange(keys) {
  probeExpandedKeys.value = keys
}

/** 展开 / 收起某文档的探针明细（与表格最左侧的展开三角等价，纯为便于发现） */
function toggleProbeDetail(docGroup) {
  const key = docGroup.doc_id
  probeExpandedKeys.value = probeExpandedKeys.value.includes(key)
    ? probeExpandedKeys.value.filter(k => k !== key)
    : [...probeExpandedKeys.value, key]
}

function resetProbe() {
  probeList.value = []
  probeResults.value = []
  lastRun.value = null
  probeDocTitles.value = new Map()
  probeDocListOk.value = false
  probeExpandedKeys.value = []
}

async function loadProbeResults() {
  if (!lastRun.value?.run_id) {
    probeResults.value = []
    return
  }
  try {
    const res = await getProbeResults(lastRun.value.run_id)
    probeResults.value = toList(res)
  } catch (_) {
    probeResults.value = []
  }
}

/** 最近一次自检汇总（从未自检返回 null → 判定列显示「—」，1040 §五） */
async function loadLastRun(indexId) {
  try {
    const res = await getLastProbeRun(indexId)
    const d = res.data ?? res
    lastRun.value = d || null
  } catch (_) {
    lastRun.value = null
  }
  await loadProbeResults()
}

async function loadProbeData() {
  const idx = selectedIndex.value
  if (!idx) {
    resetProbe()
    return
  }
  probeLoading.value = true
  probeExpandedKeys.value = []
  try {
    try {
      const res = await getProbeList({ index_id: idx.index_id })
      probeList.value = toList(res)
    } catch (_) {
      probeList.value = []
    }
    try {
      const res = await getVectorDocList(idx.index_id, 1, PROBE_DOC_PAGE_SIZE)
      probeDocTitles.value = new Map(toList(res).map(d => [d.doc_id, d.title]))
      probeDocListOk.value = true
    } catch (_) {
      probeDocTitles.value = new Map()
      probeDocListOk.value = false
    }
    await loadLastRun(idx.index_id)
  } finally {
    probeLoading.value = false
  }
}

async function handleRunProbes() {
  if (!selectedIndex.value) return
  probeRunning.value = true
  try {
    const res = await runProbes(selectedIndex.value.index_id)
    const d = res.data || res
    lastRun.value = d || null
    Message.success(t('vectorKb.probeRunDone', { passed: d?.passed ?? 0, total: d?.total ?? 0 }))
    await loadProbeResults()
  } catch (_) { /* request.js 已弹错 */ }
  finally { probeRunning.value = false }
}

/**
 * 打开探针弹窗
 * @param {Object} docGroup 探针所在文档分组（决定 doc_id 与展示标题）
 * @param {Object} [probe] 传 = 编辑（回传 probe_id 并回填问题），不传 = 新增
 */
function openProbeModal(docGroup, probe) {
  probeForm.probe_id = probe?.probe_id
  probeForm.index_id = selectedIndex.value?.index_id
  probeForm.doc_id = docGroup.doc_id
  probeForm.docTitle = docGroup.title
  probeForm.question = probe?.question || ''
  probeModalVisible.value = true
}

async function handleSaveProbe() {
  const question = probeForm.question.trim()
  if (!question) {
    Message.warning(t('vectorKb.probeQuestionRequired'))
    return false
  }
  if (question.length > 512) {
    Message.warning(t('vectorKb.probeQuestionTooLong'))
    return false
  }
  try {
    const payload = {
      index_id: probeForm.index_id,
      doc_id: probeForm.doc_id,
      question
    }
    // 编辑带 probe_id；不带 status（1040 §4.1：不传 = 不改原状态）
    if (probeForm.probe_id) payload.probe_id = probeForm.probe_id
    await saveProbe(payload)
    Message.success(t('vectorKb.probeSaved'))
    probeModalVisible.value = false
    await loadProbeData()
    return true
  } catch (_) {
    // 1040 §六：文档不存在 / 不属于该知识库时，toast（request.js 已弹）+ 刷新探针列表
    await loadProbeData()
    return false
  }
}

async function handleDeleteProbe(record) {
  try {
    await deleteProbe(record.probe_id)
    await loadProbeData()
  } catch (_) { /* request.js 已弹错 */ }
}

/**
 * 停用 / 恢复探针（1040 §4.1）
 * save 接口的 status 只接受字符串 "0"（启用）/ "1"（停用），不传或空串 = 不改；
 * 停用的探针不参与自检，但仍会出现在 probe/list 里。其余字段原样回传。
 */
async function handleToggleProbe(record) {
  try {
    await saveProbe({
      probe_id: record.probe_id,
      index_id: record.index_id,
      doc_id: record.doc_id,
      question: record.question,
      status: record.status !== '1' ? '1' : '0'
    })
    await loadProbeData()
  } catch (_) { /* request.js 已弹错 */ }
}

// ---------- 1041 §3.9 P1：到期复审提醒（跨库全局，不跟随选择器） ----------
const REVIEW_DAYS = 30
const reviewLoading = ref(false)
const reviewDue = ref(null)

// 徽标数字 = overdue + due_soon（1041 §4.2 验收）
const reviewTotal = computed(() => reviewDue.value?.total ?? 0)
const reviewOverdue = computed(() => reviewDue.value?.overdue ?? 0)
const reviewDueSoon = computed(() => reviewDue.value?.due_soon ?? 0)
const reviewDocs = computed(() => (Array.isArray(reviewDue.value?.docs) ? reviewDue.value.docs : []))

function reviewRowClass(record) {
  return isOverdue(record.review_date) ? 'row-overdue' : ''
}

async function loadReviewDue() {
  reviewLoading.value = true
  try {
    // 1041 §3.8：管理员不传 index_id（跨库统计）；部门负责人**必须传**本库 index_id，否则 403
    const params = { days: REVIEW_DAYS }
    if (!isAdmin.value) {
      if (!selectedIndex.value) {
        reviewDue.value = null
        return
      }
      params.index_id = selectedIndex.value.index_id
    }
    const res = await getReviewDue(params)
    reviewDue.value = res.data || res || null
  } catch (e) {
    markForbidden(e)
    reviewDue.value = null
  } finally { reviewLoading.value = false }
}

// ---------- 1041 §3.8 P1：内容缺口分析（跨库全局，只统计真实检索） ----------
const GAP_DAYS = 30
const GAP_LIMIT = 20
// total 低于该值时提示「样本不足」，避免误导管理员改内容（1041 §4.2）
const GAP_SAMPLE_MIN = 10
const gapLoading = ref(false)
const gapData = ref(null)

const gapZeroHit = computed(() =>
  Array.isArray(gapData.value?.top_zero_hit) ? gapData.value.top_zero_hit : []
)
const gapLowConf = computed(() =>
  Array.isArray(gapData.value?.top_low_conf) ? gapData.value.top_low_conf : []
)
const gapNeverHitDocs = computed(() =>
  Array.isArray(gapData.value?.never_hit_docs) ? gapData.value.never_hit_docs : []
)
// 1041 §3.9：窗口内被点踩最多的文档（「问了但答得不好」，与 never_hit_docs 互补）
// 元素字段：doc_id / index_id / title / source_uri / bad_count / last_time
const gapBadFeedbackDocs = computed(() =>
  Array.isArray(gapData.value?.bad_feedback_docs) ? gapData.value.bad_feedback_docs : []
)

function formatRate(rate) {
  return typeof rate === 'number' ? `${Math.round(rate * 100)}%` : '—'
}

function formatMs(ms) {
  return typeof ms === 'number' ? `${ms.toFixed(1)} ms` : '—'
}

async function loadGaps() {
  gapLoading.value = true
  try {
    const res = await getInsightGaps({ days: GAP_DAYS, limit: GAP_LIMIT })
    gapData.value = res.data || res || null
  } catch (e) {
    markForbidden(e)
    gapData.value = null
  } finally { gapLoading.value = false }
}

// ---------- 1041 §3.10 P2：反馈回路（仅管理员，只查看与处理） ----------
const FEEDBACK_LIMIT = 50
const feedbackLoading = ref(false)
const feedbackList = ref([])
// 默认只看待处理（1041 §3.10）
const feedbackStatus = ref('open')

const FEEDBACK_STATUS_TEXT = {
  open: 'vectorKb.feedbackStatusOpen',
  fixed: 'vectorKb.feedbackStatusFixed',
  ignored: 'vectorKb.feedbackStatusIgnored'
}
const FEEDBACK_STATUS_COLOR = { open: 'orange', fixed: 'green', ignored: 'gray' }

function feedbackStatusText(status) {
  return t(FEEDBACK_STATUS_TEXT[status] || 'vectorKb.feedbackStatusOpen')
}

function feedbackStatusColor(status) {
  return FEEDBACK_STATUS_COLOR[status] || 'gray'
}

const VERDICT_TEXT = {
  useful: 'vectorKb.feedbackVerdictUseful',
  irrelevant: 'vectorKb.feedbackVerdictIrrelevant',
  wrong: 'vectorKb.feedbackVerdictWrong',
  outdated: 'vectorKb.feedbackVerdictOutdated'
}
const VERDICT_COLOR = { useful: 'green', irrelevant: 'gray', wrong: 'red', outdated: 'orange' }

function verdictText(verdict) {
  return verdict ? t(VERDICT_TEXT[verdict] || 'vectorKb.emptyCell') : t('vectorKb.emptyCell')
}

function verdictColor(verdict) {
  return VERDICT_COLOR[verdict] || 'gray'
}

function feedbackChannelText(channel) {
  if (channel === 'mcp') return t('vectorKb.feedbackChannelMcp')
  if (channel === 'http') return t('vectorKb.feedbackChannelHttp')
  return channel || t('vectorKb.emptyCell')
}

async function loadFeedback() {
  feedbackLoading.value = true
  try {
    const params = { limit: FEEDBACK_LIMIT }
    if (feedbackStatus.value) params.status = feedbackStatus.value
    const res = await getKbFeedbackList(params)
    feedbackList.value = toList(res)
  } catch (e) {
    markForbidden(e)
    feedbackList.value = []
  } finally { feedbackLoading.value = false }
}

/** 标记已修订 / 不处理（1041 §3.10：反馈不会自动改文档，只落状态） */
async function handleFeedbackStatus(record, status) {
  try {
    await handleKbFeedback({ id: record.id, status })
    Message.success(t('vectorKb.feedbackHandled'))
    await loadFeedback()
  } catch (_) { /* request.js 已弹错 */ }
}

function handleFeedbackStatusFilter(value) {
  feedbackStatus.value = value
  loadFeedback()
}

// 切换知识库时统一重载该库的文档与自检数据（含从未自检 / 无探针两种空态）
// 全局区块（检索设置 / 别名表 / 内容缺口 / 反馈）不跟随切换（1041 §3.7）；
// 待复审对部门负责人是「本库」口径，所以要跟着切（1041 §5.2 / §5.4）
watch(
  () => selectedIndex.value?.index_id,
  (id) => {
    if (!id) {
      docList.value = []
      resetProbe()
      return
    }
    docPage.value = 1
    loadDocs()
    if (canManage.value) loadProbeData()
    else resetProbe()
    loadReviewDue()
  }
)

onMounted(() => {
  loadIndexes()
  // 待复审两种身份都要拉（管理员跨库 / 部门负责人本库）
  loadReviewDue()
  if (isAdminMode.value && isAdmin.value) {
    loadSettings()
    loadAliases()
    loadGaps()
    loadFeedback()
  }
})
</script>

<style lang="scss" scoped>
.help-head {
  display: flex;
  align-items: center;
  gap: $space-2;
  cursor: pointer;
  user-select: none;
}

.help-title {
  font-weight: 600;
  color: $color-text;
}

.help-body {
  margin-top: $space-3;
  font-size: $font-size-sm;
  color: $color-text-secondary;

  p {
    margin: 0 0 $space-2;
    line-height: 1.7;
  }
}

.help-sub {
  font-weight: 600;
  color: $color-text;
}

.help-pre {
  margin: 0 0 $space-3;
  padding: $space-3;
  background: $color-bg-muted;
  border-radius: $radius;
  font-family: 'JetBrains Mono', monospace;
  font-size: $font-size-xs;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.search-bar {
  row-gap: $space-2;
}

.kb-selector {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-2;
}

.kb-opt {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.section-tip {
  color: $color-text-tertiary;
  font-size: $font-size-xs;
  line-height: 1.7;
}

.block-gap {
  margin-top: $space-4;
}

.block-gap-sm {
  margin-top: $space-3;
}

.muted {
  color: $color-text-tertiary;
}

.alias-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $space-3;
  margin-bottom: $space-3;
}

.alias-head-text {
  display: flex;
  flex-direction: column;
  gap: $space-1;
}

.alias-title {
  font-weight: 600;
  color: $color-text;
}

.expanded-hint {
  margin-top: $space-2;
  color: $color-text-tertiary;
  font-size: $font-size-xs;
  word-break: break-word;
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

.hit-vec {
  color: $color-text-tertiary;
  font-size: $font-size-xs;
}

.hit-text {
  margin-top: $space-2;
  color: $color-text-secondary;
  font-size: $font-size-sm;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

// R10：合并条目最长 4000 字 → 默认限高并做渐隐，点「展开全文」看全
.hit-text.is-clamped {
  max-height: 120px;
  overflow: hidden;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0) 100%);
}

.hit-toggle {
  height: auto;
  margin-top: $space-1;
  padding: 0;
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

.probe-summary {
  margin-top: $space-3;
}

.probe-summary-line {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-sm;
  color: $color-text-secondary;
  line-height: 1.8;
}

.dot {
  color: $color-text-quaternary;
}

.unrecall-line {
  font-size: $font-size-sm;
  line-height: 1.8;
}

:deep(.row-active) td {
  background: $color-primary-lighter;
}

// ---------- 1041 ----------
.forbidden-block {
  margin-top: $space-8;
}

.kb-empty {
  margin-top: $space-3;
  text-align: center;
}

.kb-empty-action {
  margin-top: $space-4;
}

.readonly-tip {
  margin-top: $space-2;
  color: $color-warning;
}

.hit-meta {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex-wrap: wrap;
  margin-top: $space-2;
}

.text-danger {
  color: $color-danger;
}

.tag-cell + .tag-cell {
  margin-left: $space-1;
}

// ---------- 1043 分区切换 ----------
.kb-tabbar {
  margin-top: $space-4;
}

// ---------- 1043 文档编辑器右栏：元数据面板 ----------
.doc-meta-panel {
  padding: $space-3;
  background: $color-bg-muted;
  border-radius: $radius;
}

.doc-meta-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  margin-bottom: $space-3;
}

.doc-meta-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $color-text;
}

.doc-meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $space-2;
  padding: $space-1 0;
  font-size: $font-size-sm;
}

.doc-meta-key {
  flex: none;
  color: $color-text-tertiary;
}

.doc-meta-val {
  color: $color-text;
  text-align: right;
  word-break: break-word;
}

.doc-meta-note {
  margin-top: $space-2;
}

.doc-meta-foot {
  margin-top: $space-3;
  padding-top: $space-2;
  border-top: 1px solid $color-border-light;
}

.doc-textarea {
  font-family: 'JetBrains Mono', monospace;
  font-size: $font-size-xs;
}

.review-counts {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-top: $space-2;
}

.gap-kpi {
  display: flex;
  align-items: stretch;
  gap: $space-3;
  flex-wrap: wrap;
  margin-top: $space-3;
}

.kpi-card {
  min-width: 150px;
  padding: $space-3 $space-4;
  background: $color-bg-muted;
  border-radius: $radius;
}

.kpi-value {
  font-size: $font-size-xxl;
  font-weight: 600;
  color: $color-text;
  line-height: $line-height-xxl;
}

.kpi-label {
  margin-top: $space-1;
  font-size: $font-size-xs;
  color: $color-text-tertiary;
}

.gap-tables {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  margin-top: $space-4;
}

.gap-table-block {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.gap-table-title {
  font-weight: 600;
  color: $color-text;
}

:deep(.row-overdue) td {
  background: var(--tint-red);
}
</style>
