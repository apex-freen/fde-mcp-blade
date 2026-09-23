// ==========================================
// 技能库接口（gis_skill 模块，107 文档 §四/§五）
// 接口前缀：/biz/gis_skill/*
// 口径（107 §一）：
//   · 目录是唯一真相源：页面写入与手工放文件完全等价，实时生效
//   · 仅管理员可写（新建/编辑/停用/恢复/改名），其他角色只读；
//     即使前端漏挡，后端一律 403
//   · 不做上传 zip、不做真删（一律移入停用区，可恢复）
// 行标识：列表可能存在跨部门同名 → 用 (scope, dept_id, name) 三元组做 key，
//        不要用 name 单独做 key（107 §5.4）
// ==========================================

import { get, post, put } from '@/utils/request'

/**
 * 技能列表
 * @param {Object} [params]
 * @param {string} [params.scope] - system / dept；不传=当前用户可见全部
 * @param {boolean} [params.disabled] - 默认 false（活技能）；true=只看停用区
 * @returns {Promise<{data: Array<{name,description,scope,dept_id?,dir_path,disabled,version?,author?,risk?,category?,manual_avg_minutes?,allowed_tools?}>}>}
 */
export function getSkillList(params) {
  return get('/biz/gis_skill/list', params)
}

/**
 * 读取技能源码（仅管理员；非管理员 403）
 * @param {Object} data
 * @param {string} data.scope - system / dept
 * @param {number} [data.dept_id] - scope=dept 时必填
 * @param {string} data.name - 技能名
 * @returns {Promise<{data: {content: string, content_hash: string}}>}
 * content_hash 是乐观锁：保存时必须原样回传（107 §5.5）
 */
export function getSkillSource(data) {
  return post('/biz/gis_skill/source', data)
}

/**
 * 保存技能源码（仅管理员）。成功后技能立即生效（无需同步/重启）。
 * 400 常见 msg（107 §5.6，opaque 直渲即可）：
 *   · hash 不匹配 →「技能文件已被其他方式修改，请重新加载后再保存」→ 提示冲突，不清用户编辑内容
 *   · frontmatter name 与技能名不一致 / 技能名不合法 / content 非法 SKILL.md 等
 * @param {Object} data - { scope, dept_id?, name, content, content_hash }
 */
export function saveSkillSource(data) {
  return put('/biz/gis_skill/source', data)
}

/**
 * 新建技能（仅管理员）。技能名不单独传：从 content 的 frontmatter name 解析，
 * 目录名 = 该 name。重名/双向遮蔽会被 400 拒绝（107 §5.7）
 * @param {Object} data - { scope, dept_id?, content }
 */
export function createSkill(data) {
  return post('/biz/gis_skill/create', data)
}

/**
 * 移入停用区（仅管理员，不真删）
 * @param {Object} data - { scope, dept_id?, name }
 */
export function disableSkill(data) {
  return post('/biz/gis_skill/disable', data)
}

/**
 * 从停用区恢复（仅管理员）。入参与 disable 相同
 * @param {Object} data - { scope, dept_id?, name }
 */
export function enableSkill(data) {
  return post('/biz/gis_skill/enable', data)
}

/**
 * 重命名（仅管理员）。后端同时改目录名与 frontmatter 的 name
 * @param {Object} data - { scope, dept_id?, old_name, new_name }
 */
export function renameSkill(data) {
  return post('/biz/gis_skill/rename', data)
}
