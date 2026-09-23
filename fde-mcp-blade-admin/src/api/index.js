// ==========================================
// API 统一导出入口
// 所有模块的接口在此处统一导出，方便页面调用
// ==========================================

import * as auth from './modules/auth'
import * as agent from './modules/agent'
import * as token from './modules/token'
import * as gisUser from './modules/gisUser'
import * as gisRole from './modules/gisRole'
import * as gisPermission from './modules/gisPermission'
import * as gisMenu from './modules/gisMenu'
import * as gisUserRole from './modules/gisUserRole'
import * as gisRolePermission from './modules/gisRolePermission'
import * as gisRoleDept from './modules/gisRoleDept'
import * as pluginService from './modules/pluginService'
import * as gisSecret from './modules/gisSecret'
import * as gisEqp from './modules/gisEqp'
import * as auditLog from './modules/auditLog'
import * as llm from './modules/llm'
import * as asr from './modules/asr'
import * as tts from './modules/tts'
// Doc 19 / Doc 23 新增模块
import * as sso from './modules/sso'
import * as gisVector from './modules/gisVector'
import * as gisReport from './modules/gisReport'
import * as gisCostPolicy from './modules/gisCostPolicy'
import * as gisSystemPlugin from './modules/gisSystemPlugin'
import * as gisUserDept from './modules/gisUserDept'
import * as gisPiiSettings from './modules/gisPiiSettings'
// Doc 30 新增模块：定时任务 / 登录日志 / 参数配置
import * as gisJob from './modules/gisJob'
import * as gisLogininfor from './modules/gisLogininfor'
import * as gisSysConfig from './modules/gisSysConfig'
// 系统操作日志（sys_oper_log）
import * as gisOperlog from './modules/gisOperlog'
// Doc 38 / Doc 41：业务单据链路 / HITL 人工审批
import * as gisBizObject from './modules/gisBizObject'
import * as gisApprovalRequest from './modules/gisApprovalRequest'
import * as gisApprovalBinding from './modules/gisApprovalBinding'
import * as gisGrant from './modules/gisGrant'
// Doc 37：数据大屏 · 项目里程碑 / 三屏聚合接口
import * as gisProjectMilestone from './modules/gisProjectMilestone'
import * as gisScreen from './modules/gisScreen'
// Doc 47：影子演练（宿主能力）
import * as gisShadow from './modules/gisShadow'
// Doc 107：技能库（目录即真相源，仅管理员可写）
import * as gisSkill from './modules/gisSkill'
// Doc 72：消息中心 / 风险拦截记录
import * as gisMessage from './modules/gisMessage'
import * as gisRiskInterceptLog from './modules/gisRiskInterceptLog'
// Doc 103：工作台个人视图（gis_mine）
import * as gisMine from './modules/gisMine'
// Doc 77：审计中心 · 归档导出
import * as auditExport from './modules/auditExport'
// 能力清单（GET /biz/capabilities）—— 要求登录、不要求权限码
import * as capabilities from './modules/capabilities'

export const api = {
  auth,
  agent,
  token,
  gisUser,
  gisRole,
  gisPermission,
  gisMenu,
  gisUserRole,
  gisRolePermission,
  gisRoleDept,
  pluginService,
  gisSecret,
  gisEqp,
  auditLog,
  llm,
  asr,
  tts,
  // Doc 19 / Doc 23
  sso,
  gisVector,
  gisReport,
  gisCostPolicy,
  gisSystemPlugin,
  gisUserDept,
  gisPiiSettings,
  // Doc 30
  gisJob,
  gisLogininfor,
  gisSysConfig,
  gisOperlog,
  // Doc 38 / Doc 41
  gisBizObject,
  gisApprovalRequest,
  gisApprovalBinding,
  gisGrant,
  // Doc 37
  gisProjectMilestone,
  gisScreen,
  // Doc 47
  gisShadow,
  // Doc 107
  gisSkill,
  // Doc 72
  gisMessage,
  gisRiskInterceptLog,
  // Doc 103
  gisMine,
  // Doc 77
  auditExport,
  // 能力清单
  capabilities
}

export default api
