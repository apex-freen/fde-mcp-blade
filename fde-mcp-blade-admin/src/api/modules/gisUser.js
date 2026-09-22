// ==========================================
// gis_user（用户管理）模块接口
// 接口前缀：/biz/gis_user
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 获取用户列表（分页）
 *
 * 列表不返回部门名称，表格里的「部门」列需用 gisUserDept.getDeptList() 做
 * dept_id → deptName 映射（52 文档 §4.1）。
 *
 * @param {Object} params - 查询参数
 * @param {number} [params.dept_id] - 部门筛选：查「该部门 + 其全部子孙部门」。
 *                                   不传 = 不限部门；传 0 = 忽略该条件
 * @param {string} [params.user_name] - 用户名，模糊查询
 * @param {string} [params.nick_name] - 用户昵称，模糊查询
 * @param {string} [params.real_name] - 真实姓名，模糊查询
 * @param {string} [params.group_name] - 组名，模糊查询
 * @param {string} [params.user_phone] - 手机号，模糊查询
 * @param {string} [params.status] - 账号状态（0-正常，1-停用），仅这两个值生效
 * @param {number} [params.page] - 页码，从 1 开始
 * @param {number} [params.page_size] - 每页大小，范围 1-100
 * @param {string} [params.order_by] - 排序字段
 * @param {boolean} [params.is_asc] - 是否升序（默认倒序）
 */
export function getGisUserList(params) {
  return get('/biz/gis_user/list', params)
}

/**
 * 获取所有用户（无分页）
 */
export function getGisUserAll() {
  return get('/biz/gis_user/all')
}

/**
 * 获取用户详情
 * @param {number} id - 用户 ID
 */
export function getGisUserById(id) {
  return get(`/biz/gis_user/${id}`)
}

/**
 * 创建用户
 * @param {Object} data - 用户数据
 * @param {string} [data.out_user_id] - 已废弃，不要传
 * @param {number} [data.gis_agent_id] - 绑定的智能体 ID
 * @param {string} data.group_name - 组名
 * @param {string} data.user_name - 用户名，唯一
 * @param {string} data.nick_name - 用户昵称
 * @param {string} [data.real_name] - 真实姓名（传空串按「未填」处理，存 null）
 * @param {string} [data.employee_no] - 工号；非空时全局唯一，重复返回 400「工号已存在」
 * @param {string} data.password - 用户密码（明文，服务端 Argon2 哈希）
 * @param {string} [data.user_phone] - 手机号
 * @param {string} [data.user_email] - 邮箱（传空串按「未填」处理，存 null）
 * @param {number} [data.dept_id] - 所属部门；不传或传 0 = 未分配（存 null）
 * @param {string} [data.user_desc] - 用户介绍
 * @param {string} data.user_perm_level - 用户权限等级
 * @param {string} [data.status] - 账号状态（0-正常，1-停用）
 * @param {string} [data.created_by] - 创建人
 */
export function createGisUser(data) {
  return post('/biz/gis_user/create', data)
}

/**
 * 更新用户
 *
 * ⚠️ 整表单提交语义：real_name / employee_no / user_email / dept_id / user_phone / user_desc
 * 不传即清空，调用前必须先用 getGisUserById 回填（52 文档 §4.5）。
 *
 * @param {number} id - 用户 ID
 * @param {Object} data - 用户数据，字段同 createGisUser；password 传空串 = 不改密码
 */
export function updateGisUser(id, data) {
  return put(`/biz/gis_user/${id}`, data)
}

/**
 * 删除用户（软删除）
 * @param {number} id - 用户 ID
 */
export function deleteGisUser(id) {
  return del(`/biz/gis_user/${id}`)
}

/**
 * 更新用户系统设置
 * @param {number} id - 用户 ID
 * @param {Object} settings - 设置对象
 * @param {string} [settings.language] - 系统语言（如 "zh-CN"、"en-US"）
 * @param {string} [settings.colorMode] - 系统颜色模式（"light"、"dark"、"auto"）
 */
export function updateGisUserSettings(id, settings) {
  return put(`/biz/gis_user/${id}/settings`, settings)
}

/**
 * 修改密码
 * @param {number} id - 用户 ID
 * @param {Object} data - 密码数据
 * @param {string} data.oldPassword - 当前密码
 * @param {string} data.newPassword - 新密码
 */
export function changePassword(id, data) {
  return put(`/biz/gis_user/${id}/password`, data)
}

/**
 * 管理员重置指定用户的密码（不需要旧密码）
 *
 * 与 changePassword 是两个场景：本接口由管理员调用，会同时把
 * pwd_login_enabled 置为 '1'（打开本地密码登录通道）并记录操作日志。
 * 权限点：controller:user:index（页面级码；原 controller:user:reset_pwd 已废弃，
 * 后端本接口注解需同步改造）
 *
 * @param {number} id - **被重置的目标用户 ID**（不是调用者自己）
 * @param {Object} data - { newPassword }，长度 ≥ 6
 */
export function adminResetPassword(id, data) {
  return put(`/biz/gis_user/${id}/adminResetPassword`, data)
}
