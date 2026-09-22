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
 * 「选用户」下拉专用轻量接口（picker）
 *
 * 用途：全站 4 处「选人下拉」的唯一数据源，**替代原本拉 500/999 条再本地筛** 的做法。
 * 不挂权限点，**登录即可调用**（`/biz/gis_user/list` 挂的是 `controller:user:index`，
 * 该点当前无任何角色持有；picker 正是为了解耦这个诉求而存在）。
 *
 * ⚠️ 契约（后端 2026-09-22 定稿，缺口已全部闭合）：
 * - 入参：
 *   · `keyword`  可选。模糊匹配 `user_name` 或 `nick_name`，不传 = 不筛
 *   · `status`   可选。`'0'` 正常 / `'1'` 停用；**其它值（含空前缀）视为「不筛」**
 *   · `page`     默认 1
 *   · `page_size` 默认 100、**上限 100，超限静默夹取（不报 400）**
 * - 出参：`{ total, rows }`，每项 **6 个字段**：
 *   `user_id` / `user_name` / `nick_name` / `group_name` / `status` / `enable_cloud`
 *   · `enable_cloud` 为 `string|null`，`'1'` = 已启用云端（token 页「非云端用户」警示用它）
 *   · `group_name` 取值域**不受控、不参与任何权限判定** → 前端**只直渲，不做值→文案映射**，
 *     空值显示 `—`（SSO JIT 按 `sso_jit_group_name` 写入，可能是任意中文）
 * - 排序：`user_id ASC`
 * - ⚠️ 仍按**数据范围**过滤（可见部门 ∪ 本人）→ 下拉里找不到人先查角色数据范围，不是接口 bug
 * - ⚠️ 与 `/biz/gis_user/list` 的区别：picker **不含 `created_time`**（管理表格才需要）
 *
 * @param {Object} [params] - { keyword?, status?, page?, page_size? }
 */
export function getGisUserPicker(params = {}) {
  return get('/biz/gis_user/picker', params)
}

/**
 * 获取所有用户（无分页）
 *
 * ⚠️ 出参与 picker 同为 **6 字段** DTO（v1.9 定稿），实测调用点只读 3 个字段 → 零改动。
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
 * 修改**本人**资料（个人中心「编辑资料」专用）
 *
 * ⚠️ 与 updateGisUser 的区别：本接口后端已收紧为**仅本人可改**（传他人 id → 403），
 * 且只认这 2 个字段 —— **不要把 group_name / user_name / user_perm_level 再传进来**。
 *
 * 🔴 硬约束（防止后人改回去，2026-09-22 定稿）：
 * 1. 字段名是 **snake_case**（`nick_name` / `user_desc`）—— 与本模块 `password` / `settings`
 *    的 camelCase **不一致，不要"顺手统一"**；
 * 2. 传白名单以外的字段 → **422（不是 400）**；
 * 3. **两个字段都不传 → 400**「没有需要更新的字段」；
 * 4. `user_desc` 传**空串 = 清空简介**（服务端落 NULL）；
 * 5. 前端需自行校验（**不靠 422 兜底**）：昵称 trim 后非空且 ≤64；简介 ≤255。
 *
 * 不受影响：`GET /biz/gis_user/{id}`（读自己，放行）、
 *          `PUT /biz/gis_user/{id}/password`（改自己密码，字段名是 **camelCase**
 *          `{ oldPassword, newPassword }`）。
 *
 * @param {number} id - **登录人自己的 user_id**（传别人的 → 403）
 * @param {Object} data - 仅 { nick_name?: string, user_desc?: string }
 */
export function updateUserProfile(id, data) {
  return put(`/biz/gis_user/${id}/profile`, data)
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
