// ==========================================
// 技能库接口（gis_skill 模块，1042 文档）
// 接口前缀：/biz/gis_skill/*
// 口径（1042 §一）：
//   · 可见域三档：system（全局）/ org（组织级，org_name 标识）/ dept（部门级，dept_id 标识）
//   · 目录是唯一真相源：页面写入与手工放文件完全等价，实时生效
//   · 写权限：管理员（全部域）+ 本部门负责人（本部门）；前端以接口返回的
//     can_manage 为准，不按 scope 猜，后端一律兜底 403
//   · 不做上传 zip、不做真删（一律移入停用区，可恢复）、不做版本回滚
// 行标识：跨部门/跨库可能同名 → 用 (scope, org_name, dept_id, name) 组合做 key
// ==========================================

import { get, post, put } from '@/utils/request'

/**
 * 技能列表
 * @param {Object} [params]
 * @param {string} [params.scope] - system / org / dept；不传=当前用户可见全部
 * @param {boolean} [params.disabled] - 默认 false（活技能）；true=只看停用区
 * @returns {Promise<{data: Array<SkillListItem>}>}
 * SkillListItem 字段：name / description / scope / dept_id? / org_name? / can_manage /
 *   dir_path / disabled / version? / author? / risk? / category? / license? /
 *   compatibility? / manual_avg_minutes?（字符串）/ owner? / status? /
 *   review_date? / confidentiality? / tags? / allowed_tools[]
 * ⚠️ dept_id / org_name 为 skip_serializing_if None：不适用时该字段不出现
 */
export function getSkillList(params) {
  return get('/biz/gis_skill/list', params)
}

/**
 * 读取技能源码（编辑前加载）
 * @param {Object} data
 * @param {string} data.scope - system / org / dept
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
