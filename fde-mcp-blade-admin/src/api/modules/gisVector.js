// ==========================================
// 本地向量检索 / 知识库接口
// 对应后端：/biz/gis_vector/*
// Doc 19 §4
// ==========================================

import { get, post } from '@/utils/request'

// ---------- 索引管理 ----------

/**
 * 触发知识库同步（107 文档 §5.1，仅管理员）
 *
 * 无入参；语义为「同步全部库（内置 + 各部门）」——扫描 knowledge_lib/system/
 * 与 knowledge_lib/dept_<部门ID>/ 下的小写 .md 整体手动同步（不做单文件同步/上传）。
 * 返回 { scanned, changed }，两条语义必须体现在 UI 上（107 §5.1）：
 *   · scanned=0 → 大概率 embedding 模型未就绪（后端不报错只记告警）→ 警告
 *   · changed=0 且 scanned>0 → 正常幂等 →「已是最新，本次无变更」
 *   · changed>0 →「已同步，新增/更新 N 个文档」
 * 注意：这是「重新同步」，不是「重建索引」（rebuild 只补算向量、不扫新文档）
 */
export function syncSystemKnowledge() {
  return post('/biz/gis_vector/sync_system', {}, { showLoading: true })
}

/**
 * 查询当前身份可见的全部知识库（多库：system 内置 / dept 部门 / user 个人）
 *
 * 返回 [{ index_id, index_name, scope, owner_id, source_type, doc_count, chunk_count, status }]；
 * 前端以此作为「知识库选择器」的数据源，不要再用固定 index_id=1。
 */
export function getVectorIndexList() {
  return get('/biz/gis_vector/index_list')
}

/**
 * 查询索引下的文档列表
 *
 * Doc 19 §4.2：index_id 必填；page_size 上限 200
 * @param {number} indexId
 * @param {number} page
 * @param {number} pageSize
 */
export function getVectorDocList(indexId, page = 1, pageSize = 20) {
  return get('/biz/gis_vector/doc_list', { index_id: indexId, page, page_size: pageSize })
}

// ---------- 检索 & 重建 ----------

/**
 * 向量语义搜索
 *
 * Doc 19 §4.2；Doc 1040 §3.3 起返回体由数组改为对象：
 *   data = { hits: VectorHit[], low_confidence, suggest_no_answer, expanded_query }
 * 调用方须取 `res.data.hits`（原来是 `res.data` 直接就是数组）。
 * @param {Object} data - { query, index_id?, top_k? (默认 5, 上限 20) }
 */
export function vectorSearch(data) {
  return post('/biz/gis_vector/search', data)
}

/**
 * 重建索引（重新装载向量）
 *
 * Doc 19 §4.2：system 索引需 admin，user 索引需 owner
 * Doc 1040 §八：force_rechunk=true 会先删掉该索引的文档与切块，再重新扫描 →
 * 重新切块并重算向量（切块算法 / embedding 模型变更后必须用它）；
 * 不传或传 false 时行为与原来一致（只补算向量）。
 * 全量重算 embedding 慢且吃 CPU，单独放宽超时。
 * @param {number} indexId
 * @param {boolean} forceRechunk
 */
export function rebuildVectorIndex(indexId, forceRechunk = false) {
  return post(
    '/biz/gis_vector/rebuild',
    { index_id: indexId, force_rechunk: !!forceRechunk },
    { timeout: 300000 }
  )
}

// ==========================================
// A 检索侧增强（Doc 1040 §三，仅管理员；别名的读接口对所有登录用户开放）
// ==========================================

/**
 * 读取检索设置（未初始化时后端返回默认值 0.45 / 0.55 / 0.30 / 3）
 */
export function getKbSettings() {
  return get('/biz/gis_vector/kb_settings')
}

/**
 * 保存检索设置（保存后立即生效）
 * @param {Object} data - { min_score, low_conf_score, hybrid_weight, candidate_factor }
 */
export function saveKbSettings(data) {
  return post('/biz/gis_vector/kb_settings/save', data)
}

/**
 * 别名表列表（Doc 1040 §3.2）
 * 返回含停用的别名（前端据此展示状态 / 提供恢复入口）
 */
export function getAliasList() {
  return get('/biz/gis_vector/alias/list')
}

/**
 * 新增 / 编辑别名
 * @param {Object} data - { alias_id?, alias, canonical, status? }
 *   alias_id 不传或 0 = 新增；
 *   status 可选，只接受字符串 "0"（启用）/ "1"（停用），不传 = 不改；传布尔或其它值后端返回 400
 */
export function saveAlias(data) {
  return post('/biz/gis_vector/alias/save', data)
}

/**
 * 删除别名
 * @param {number} aliasId
 */
export function deleteAlias(aliasId) {
  return post('/biz/gis_vector/alias/delete', { alias_id: aliasId })
}

// ==========================================
// B 问答自检（Doc 1040 §四，仅管理员）
// ==========================================

/**
 * 探针列表（Doc 1040 §四）
 * 返回含停用的探针（前端据此展示状态 / 提供恢复入口）
 * @param {Object} params - { index_id?, doc_id? }
 */
export function getProbeList(params = {}) {
  return get('/biz/gis_vector/probe/list', params)
}

/**
 * 新增 / 编辑探针
 * @param {Object} data - { probe_id?, index_id, doc_id, question, status? }
 *   probe_id 不传或 0 = 新增；
 *   status 可选，只接受字符串 "0"（启用）/ "1"（停用），不传 = 不改；
 *   停用的探针不参与自检
 */
export function saveProbe(data) {
  return post('/biz/gis_vector/probe/save', data)
}

/**
 * 删除探针
 * @param {number} probeId
 */
export function deleteProbe(probeId) {
  return post('/biz/gis_vector/probe/delete', { probe_id: probeId })
}

/**
 * 立即自检
 *
 * 后端同步执行，可能十几秒，不能按默认超时处理（Doc 1040 §五）。
 * @param {number} indexId
 */
export function runProbes(indexId) {
  return post('/biz/gis_vector/probe/run', { index_id: indexId }, { timeout: 300000 })
}

/**
 * 最近一次自检汇总（从未自检返回 null）
 * @param {number} indexId
 */
export function getLastProbeRun(indexId) {
  return get('/biz/gis_vector/probe/last_run', { index_id: indexId })
}

/**
 * 某次自检的逐题明细
 * @param {number} runId
 * @param {boolean} onlyFailed
 */
export function getProbeResults(runId, onlyFailed = false) {
  return get('/biz/gis_vector/probe/results', { run_id: runId, only_failed: onlyFailed })
}

// ==========================================
// C 文档写入通道（Doc 1041 §3.6，仅管理员）
// ==========================================

/**
 * 新建 / 覆盖 / 编辑文档（1041 §3.6）
 *
 * 对同一个 path 是**覆盖**语义（幂等）；后端没有「改名」接口，
 * 改名 = 新建新文件 + 删除旧文件。
 *
 * path 规则（前端必须先校验，避免用户白填）：
 *   · 是**相对库目录**的路径，如 `制度流程/差旅报销.md`
 *   · 必须以小写 .md 结尾；不能以 / 开头；不能含 : ；不能含 .. / . / 空路径段（//）
 *   · 路径段不能以 `_` 或 `.` 开头（这类会被同步逻辑跳过）
 *   · 不要自己拼 `knowledge_lib/...` 前缀，后端会按所选库自动加
 *
 * content 可带 front-matter 元数据（title / status / owner / effective_date /
 *   review_date / confidentiality / tags），不写也可用（默认视为已发布）；
 *   status: draft 的文档入库但不可检索。
 * @param {Object} data - { index_id, path, content }
 * @returns {{ doc_id: number }}
 */
export function saveVectorDoc(data) {
  return post('/biz/gis_vector/doc/save', data)
}

/**
 * 读取文档原文（1041 §3.6：打开编辑器前调）
 * @param {number} docId
 * @returns {{ doc: Object, content: string }}
 */
export function getVectorDocContent(docId) {
  return get('/biz/gis_vector/doc/content', { doc_id: docId })
}

/**
 * 删除文档（1041 §3.6）
 *
 * 会同时删除服务器上的文件，且不可恢复；删除后该文档的探针会变成「跳过」。
 * @param {Object} data - { index_id, doc_id }
 */
export function deleteVectorDoc(data) {
  return post('/biz/gis_vector/doc/delete', data)
}

/**
 * 自助开通部门知识库（1041 §3.11，后端新增）
 *
 * 后端行为：建目录 `knowledge_lib/dept_<部门ID>/` → 目录里没有 .md 时自动写一篇
 * 占位首页 README.md（status: published）→ 建库索引并入库。
 * 幂等：已开通（目录里已有文档）时**不覆盖**，返回同一个 index_id，重复点击不会建出重复的库。
 *
 * 权限：管理员可建任意部门；部门负责人只能建「我负责的部门」，否则 403。
 * @param {Object} [data] - { dept_id? }
 *   · 不传 = 我负责的第一个部门（部门负责人用）
 *   · 管理员**不传会报错，须显式指定 dept_id**
 * @returns {{ index_id: number }}
 */
export function createDeptKb(data = {}) {
  return post('/biz/gis_vector/dept_kb/create', data)
}

// ==========================================
// D 内容缺口分析 / 到期复审提醒（Doc 1041 §3.8 / §3.9，P1，跨库全局）
// ==========================================

/**
 * 内容缺口分析（1041 §3.9）
 *
 * 只统计**真实检索**（MCP 工具 + 管理台语义检索），**不含系统自检**。
 * ⚠️ 整个响应一律 **snake_case**，不做 camelCase 转换：
 *   · top_zero_hit / top_low_conf 元素 = query / count / last_time
 *   · never_hit_docs 元素 = doc_id / index_id / title / source_uri
 *   · bad_feedback_docs 元素 = doc_id / index_id / title / source_uri / bad_count / last_time
 * @param {Object} params - { days? 默认 30（1~365）, limit? 默认 20（1~100） }
 * @returns {{ days, total, zero_hit, low_conf, zero_hit_rate, avg_elapsed_ms,
 *             top_zero_hit, top_low_conf, never_hit_docs, bad_feedback_docs }}
 */
export function getInsightGaps(params = {}) {
  return get('/biz/gis_vector/insight/gaps', params)
}

/**
 * 到期复审提醒（1041 §3.8）
 *
 * 跨库全局提醒；给 index_id 时才只看某个库。只含已发布文档。
 * ⚠️ 管理员可不传 index_id；部门负责人**必须传**（不传会 403）。
 * @param {Object} params - { days? 默认 30（1~365）, index_id? }
 * @returns {{ days, overdue, due_soon, total, docs }}
 */
export function getReviewDue(params = {}) {
  return get('/biz/gis_vector/review/due', params)
}

// ==========================================
// E 反馈回路（Doc 1041 §3.10，P2，仅管理员）
// ==========================================

/**
 * 反馈明细列表（1041 §3.10，按时间倒序）
 *
 * 反馈由**智能体**通过 MCP 工具 kb_feedback 上报，前端只做查看与处理，
 * **不做「提交反馈」入口**；反馈也不会自动修改文档。
 * @param {Object} params - { status? 'open'（待处理）/ 'fixed'（已修订）/ 'ignored'（不处理），不传 = 全部；limit? 默认 50 }
 * @returns {Array<{ id, channel, user_id, user_name, query, index_id, doc_id,
 *                   verdict, note, status, handled_by, handled_time, created_time }>}
 */
export function getKbFeedbackList(params = {}) {
  return get('/biz/gis_vector/feedback/list', params)
}

/**
 * 处理反馈：标记已修订 / 不处理（1041 §3.10）
 * @param {Object} data - { id, status: 'fixed' | 'ignored' }
 */
export function handleKbFeedback(data) {
  return post('/biz/gis_vector/feedback/handle', data)
}
