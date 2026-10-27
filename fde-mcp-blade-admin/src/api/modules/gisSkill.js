// ==========================================
// 技能库接口（gis_skill 模块，1042 / 1075 文档）
// 接口前缀：/biz/gis_skill/*
// 口径（1075）：
//   · system 已下线：只剩 org（组织级，org_name 标识）/ dept（部门级，dept_id 标识）
//   · 目录是唯一真相源：页面写入与手工放文件完全等价，实时生效
//   · 写权限：管理员（全部域）+ 本部门负责人（本部门）；前端以接口返回的
//     can_manage 为准，不按 scope 猜，后端一律兜底 403
//   · 草稿区只放未发布内容；停用区只放已下架技能；彻底删除仅管理员
// 行标识：跨部门/跨库可能同名 → 用 (scope, org_name, dept_id, name) 组合做 key
// ==========================================

import { get, post, put } from '@/utils/request'

/**
 * 技能列表
 * @param {Object} [params]
 * @param {string} [params.scope] - org / dept；不传=当前用户可见全部
 * @param {boolean} [params.disabled] - 默认 false（活技能）；true=只看停用区
 * @param {boolean} [params.with_stats] - 默认 false；true=附带近 30 天使用统计
 * @returns {Promise<{data: Array<SkillListItem>}>}
 * SkillListItem 字段：name / description / scope / dept_id? / org_name? / can_manage /
 *   shadowed_by? / load_count? / deny_count? / last_loaded_time? /
 *   dir_path / disabled / version? / author? / risk? / category? / license? /
 *   compatibility? / manual_avg_minutes?（字符串）/ owner? / status? /
 *   review_date? / confidentiality? / tags? / allowed_tools[]
 * ⚠️ dept_id / org_name / shadowed_by / 统计字段为 skip_serializing_if None：无值时字段不出现
 */
export function getSkillList(params) {
  return get('/biz/gis_skill/list', params)
}

/**
 * 读取技能源码（编辑前加载）
 * @param {Object} data
 * @param {string} data.scope - org / dept（system 已下线，传 system 会 400）
 * @param {string} [data.org_name] - scope=org 时必填
 * @param {number} [data.dept_id] - scope=dept 时必填
 * @param {string} data.name - 技能名
 * @returns {Promise<{data: {content: string, content_hash: string}}>}
 * content_hash 是乐观锁：保存时必须原样回传（1042 §3.2）
 */
export function getSkillSource(data) {
  return post('/biz/gis_skill/source', data)
}

/**
 * 保存技能源码。成功后技能立即生效（无需同步/重启）。
 * 失败 msg（1042 §3.3 / §九，opaque 直渲即可）：
 *   · hash 不匹配 →「技能文件已被其他方式修改，请重新加载后再保存」→ 提示冲突，不清用户编辑内容
 *   · 「技能校验失败: …」→ 按提示修 content
 *   · 「frontmatter 的 name(…) 必须与技能名(…) 一致」
 * @param {Object} data - { scope, org_name?, dept_id?, name, content, content_hash }
 */
export function saveSkillSource(data) {
  return put('/biz/gis_skill/source', data)
}

/**
 * 新建技能。技能名不单独传：从 content 的 frontmatter name 解析，目录名 = 该 name。
 * scope=org 且 org_name 是新库时后端自动建目录（无需「先建空库」）；
 * 重名（含 system/org 全局重名）会被 400 拒绝（1042 §3.4）
 * @param {Object} data - { scope, org_name?, dept_id?, content }
 * @returns {Promise<{data: {name, scope, org_name?, dir_path}}>}
 */
export function createSkill(data) {
  return post('/biz/gis_skill/create', data)
}

/**
 * 移入停用区（不真删，可恢复）
 * @param {Object} data - { scope, org_name?, dept_id?, name }
 */
export function disableSkill(data) {
  return post('/biz/gis_skill/disable', data)
}

/**
 * 从停用区恢复。入参与 disable 相同
 * @param {Object} data - { scope, org_name?, dept_id?, name }
 */
export function enableSkill(data) {
  return post('/biz/gis_skill/enable', data)
}

/**
 * 重命名。后端同时改目录名与 frontmatter 的 name
 * @param {Object} data - { scope, org_name?, dept_id?, old_name, new_name }
 */
export function renameSkill(data) {
  return post('/biz/gis_skill/rename', data)
}

/**
 * 彻底删除（仅管理员 / 仅停用区技能）
 * @param {Object} data - { scope, org_name?, dept_id?, name, confirm_name }
 * @returns {Promise<{data: {skill, purged, deleted_drafts}}>}
 * confirm_name 必须与 name 完全一致，否则 400
 */
export function purgeSkill(data) {
  return post('/biz/gis_skill/purge', data)
}

// ---------- 1075 §四：技能草稿区 ----------

/**
 * 草稿列表（按 draft_id 倒序）
 * @param {Object} params - { scope, org_name?, dept_id?, name }
 * @returns {Promise<{data: {skill, scope, dept_id?, org_name?, audience_count, drafts[]}}>}
 * drafts[]：draft_id / note / base_exists / base_hash / base_changed /
 *   content_hash / created_by / updated_by / created_time / updated_time
 */
export function getSkillDraftList(params) {
  return get('/biz/gis_skill/draft/list', params)
}

/**
 * 读取草稿正文
 * @param {Object} data - { scope, org_name?, dept_id?, name, draft_id }
 */
export function getSkillDraftSource(data) {
  return post('/biz/gis_skill/draft/source', data)
}

/**
 * 新建 / 修订草稿（不改线上技能）
 * 新建不传 draft_id；修订必须传 draft_id + content_hash
 * @param {Object} data - { scope, org_name?, dept_id?, name, draft_id?, content, content_hash?, note? }
 */
export function saveSkillDraft(data) {
  return post('/biz/gis_skill/draft/save', data)
}

/**
 * 发布草稿（会更新线上技能并删除草稿）
 * @param {Object} data - { scope, org_name?, dept_id?, name, draft_id }
 */
export function publishSkillDraft(data) {
  return post('/biz/gis_skill/draft/publish', data)
}

/**
 * 丢弃草稿（不可恢复，线上技能不受影响）
 * @param {Object} data - { scope, org_name?, dept_id?, name, draft_id }
 */
export function discardSkillDraft(data) {
  return post('/biz/gis_skill/draft/discard', data)
}

// ---------- 1075 §六：技能反馈 ----------

/**
 * 反馈列表（分页）
 * @param {Object} params - { family?, scope?, skill_name?, status?, page?, page_size? }
 * @returns {Promise<{data: {total, rows: GisSkillFeedback[]}}>}
 */
export function getSkillFeedbackList(params) {
  return get('/biz/gis_skill/feedback/list', params)
}

/**
 * 处理反馈
 * @param {Object} data - { feedback_id, status: 'handled'|'ignored', handle_note? }
 */
export function handleSkillFeedback(data) {
  return post('/biz/gis_skill/feedback/handle', data)
}
