// ==========================================
// 工作流建模（gis_workflow，1060 文档 §三）
// 接口前缀：/biz/gis_workflow（RESTful）
// 口径（1060 §二 / §三）：
//   · 集合 GET/POST /biz/gis_workflow；单资源 GET/PUT/DELETE /biz/gis_workflow/{code}
//   · import 是静态路径，注册在 {code} 之前 —— 前端拼接时不要编码
//   · 列表已按可见域过滤；can_manage 由服务端判定，前端直接用它控按钮，不要按 scope 猜
//   · 编辑即回草稿（A4）：编辑成功后 status 变 draft，需重新「发布」才生效
//   · 列表类接口一次最多返回 200 条（服务端 clamp），分页遍历
// ==========================================

import { get, post, put, del } from '@/utils/request'

/**
 * 工作流列表（A1）
 * @param {Object} [params]
 * @param {string} [params.keyword] - 编码 / 名称模糊匹配
 * @param {string} [params.status] - draft / published / disabled；不传 = 全部
 * @param {string} [params.scope] - org / dept / user；部门工作流页固定传 dept
 * @param {boolean} [params.manageable_only] - true 时只返回当前用户可管理项
 * @param {string} [params.scope_ref] - 可见域对象（部门工作流页 = 部门 ID）
 * @param {number} [params.page] / [params.page_size] - 默认 1 / 10
 * @returns {Promise<{data: {total: number, rows: WorkflowListItem[]}}>}
 * WorkflowListItem：code / name / description / trigger_hint / status / prefix / enforce_mode /
 *   scope / scope_ref / current_version / stage_count / can_manage
 * trigger_hint：触发语料（“用户可能怎么说”，多个用 “/” 分隔，可空）
 * enforce_mode：已废弃（闸门改为声明制），列表返回值忽略、不参与判定
 */
export function getWorkflowList(params = {}) {
  return get('/biz/gis_workflow', params)
}

/**
 * 当前用户可管理的部门（部门工作流页）
 * 部门负责人：只返回 leader_user_id = 当前用户的部门；管理员：返回全部生效部门
 * @returns {Promise<{data: Array<{dept_id: number|string, dept_name: string}>}>}
 */
export function getDeptOptions() {
  return get('/biz/gis_workflow/dept_options')
}

/**
 * 系统工具清单（1060 · 3a）
 * 供编辑器左栏「系统工具」分组使用；后端已过滤掉工作流引擎自身的工具
 * （local_service_discover/functions/call、biz_create/biz_query/biz_next、workflow_list/get）
 * @returns {Promise<{data: SystemToolRow[]}>}
 * SystemToolRow：value（绑定值，写进节点 tools，即 MCP 工具名）/ label（展示名）/
 *   group（@fde_system / @kb / @skill）/ risk_level（normal / risk / auth）
 */
export function getSystemTools() {
  return get('/biz/gis_workflow/system_tools')
}

/**
 * 新建工作流（A2）
 * @param {Object} data - { code, name, description?, trigger_hint?, prefix?, scope?, scope_ref?, stages }
 *   · description = “这是什么”（与 trigger_hint 各司其职，不要混写）
 *   · trigger_hint = “什么时候用”，自然语言触发语料，多个样例用 “/” 分隔，≤255 字符；不传或空 = 后端不渲染
 *   · enforce_mode 已废弃：不要传（传值只接受 shadow / enforce，不传后端默认 shadow）
 * stages：{ stage, seq, name, manual_minutes, note, methods: ['<插件>.<方法>'], tools: ['<系统工具value>'] }
 *   · methods 与 tools 并列、不混装；两者都是入口判定（声明制）的依据，均可不传（= 空数组）
 *   · note：节点级说明（多行文本，≤512 字符，纯给智能体看，不参与任何判定）；空 = null
 * @returns {Promise<{data: {revived: boolean, version: number}}>}
 * revived=true 表示编码此前被逻辑删除过，本次是复活式重建（版本号在原基础 +1）
 */
export function createWorkflow(data) {
  return post('/biz/gis_workflow', data)
}

/**
 * 工作流详情（A3）
 * ⚠️ 字段名差异：工作流实体里的编码字段叫 biz_scene（等同列表里的 code）
 * @param {string} code
 * @returns {Promise<{data: {workflow, stages, bindings}}>}
 * 回填：节点用 stages 渲染；bindings 按 match_type 分流（'plugin_method' → methods，'tool' → tools）
 */
export function getWorkflowDetail(code) {
  return get(`/biz/gis_workflow/${code}`)
}

/**
 * 修改工作流（A4）：请求体与「新建」完全一致（含 stages，整体覆盖 = 全量重建）
 * ⚠️ 编辑即回草稿：编辑已发布/已停用的工作流后 status 自动变 draft，需重新发布才生效
 * @param {string} code
 * @param {Object} data - 同 createWorkflow
 */
export function updateWorkflow(code, data) {
  return put(`/biz/gis_workflow/${code}`, data)
}

/**
 * 发布（A5）：仅 draft / disabled 可发布；成功后 current_version +1 且立即对智能体生效
 * @param {string} code
 */
export function publishWorkflow(code) {
  return post(`/biz/gis_workflow/${code}/publish`)
}

/**
 * 停用（A6）：不再对智能体暴露，入口判定对其停止生效；已产生单据不受影响
 * @param {string} code
 */
export function disableWorkflow(code) {
  return post(`/biz/gis_workflow/${code}/disable`)
}

/**
 * 删除（A7）：逻辑删除；published/disabled 且已有单据时会被 400 守卫拦下（改用「停用」）
 * @param {string} code
 */
export function deleteWorkflow(code) {
  return del(`/biz/gis_workflow/${code}`)
}

/**
 * 导出（A8）：只含定义，不含运行数据 / 单据 / 留痕
 * @param {string} code
 * @returns {Promise<{data: {content: string}}>} content 是字符串形式的 JSON
 */
export function exportWorkflow(code) {
  return get(`/biz/gis_workflow/${code}/export`)
}

/**
 * 导入（A9）：静态路径，勿编码
 * @param {Object} data - { content: string, conflict?: 'skip' | 'overwrite' }
 * 导入新建的工作流一律落 draft，需要再「发布」
 */
export function importWorkflow(data) {
  return post('/biz/gis_workflow/import', data)
}

/**
 * 变更历史（A10）
 * @param {string} code
 * @param {{page?: number, page_size?: number}} [params]
 * @returns {Promise<{data: {total: number, rows: ChangeLogRow[]}}>}
 * ChangeLogRow：log_id / workflow_code / version / change_type / change_note /
 *   before_snapshot / after_snapshot / operator / created_time
 * change_type：create / publish / disable / update_scene / update_stage / update_binding / import / delete
 */
export function getWorkflowChangelog(code, params = {}) {
  return get(`/biz/gis_workflow/${code}/changelog`, params)
}
