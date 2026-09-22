// ==========================================
// 页面简介文案（顶部「功能模块简介栏」）
// 菜单与权限已由后端 gis_menu 驱动，此处仅保留页面说明文案，
// 按路由 path 索引，与菜单、权限无关
// 注意：key 必须与 gis_menu 展开后的真实路由保持一致
// ==========================================

export const pageDescMap = {
  // 审计中心
  '/audit/stats/index': { descriptionKey: 'routeDesc.audit:stats' },
  '/audit/operation_log/index': { descriptionKey: 'routeDesc.audit:operation_log' },
  '/audit/grant_log/index': { descriptionKey: 'routeDesc.audit:grant_log' },
  '/audit/token_log/index': { descriptionKey: 'routeDesc.audit:token_log' },
  '/audit/risk/index': { description: '监控和查看系统风险告警信息' },
  '/audit/export/index': { description: '导出审计日志和统计报表' },

  // 使用中心
  '/workspace/dashboard/index': { description: '系统概览与快捷操作入口' },
  '/workspace/agent/index': { description: '查看和管理所有智能体' },
  '/workspace/agent/chat': { description: '与智能体进行实时对话' },
  '/workspace/agent/detail/:id': { description: '查看智能体详细信息' },
  '/workspace/device/index': { description: '查看和管理所有设备' },
  '/workspace/device/detail/:id': { description: '查看设备详细信息和参数控制' },
  '/workspace/approval/index': { description: '处理待审批的授权请求' },
  '/workspace/biz/index': { description: '单据生命周期看板：场景维度单据数、停摆与周期压缩率' },
  '/workspace/biz/detail/:biz_object_id': { description: '单据端到端时间线：节点计划与每次调用' },
  '/workspace/profile/index': { description: '管理个人信息和账户安全' },

  // 管理后台（2026-09-14 结构调整：32 个页面归入 9 个目录，路径前缀随之变化）
  // 组织与权限
  '/controller/org/user/index': { descriptionKey: 'routeDesc.controller:user:index' },
  '/controller/org/dept/index': { descriptionKey: 'routeDesc.controller:dept' },
  '/controller/org/permission/index': { description: '管理系统菜单、权限点与权限组' },
  '/controller/org/sso/config': { descriptionKey: 'routeDesc.controller:sso:config' },
  // 授权与访问控制
  '/controller/access/mcp_permission/index': { descriptionKey: 'routeDesc.controller:mcp_permission' },
  // 2026-09-17 拆分：设备类授权 / 服务类授权（旧 mcp_permission 页待后端新菜单上线后下线）
  '/controller/access/mcp_device_permission/index': { descriptionKey: 'routeDesc.controller:mcp_permission:device' },
  '/controller/access/mcp_service_permission/index': { descriptionKey: 'routeDesc.controller:mcp_permission:service' },
  '/controller/access/token/index': { descriptionKey: 'routeDesc.controller:token' },
  '/controller/access/hitl/index': { description: 'Human-In-The-Loop：智能体发起请求后，由指定人员审批授权后方可执行' },
  '/controller/settings/approval/binding/index': { description: '配置「哪类操作由谁审批」，供审批链路解析审批人' },
  '/controller/settings/pre/approval/index': { description: '授权记录总台账：查看谁被授予了哪个设备功能 / 插件方法，可写入限时授权、可撤销单条授权' },
  // 平台能力
  '/controller/capability/pii/index': { descriptionKey: 'routeDesc.controller:pii' },
  '/controller/capability/vector/index': { descriptionKey: 'routeDesc.controller:vector' },
  '/controller/capability/report/index': { descriptionKey: 'routeDesc.controller:report' },
  '/controller/capability/cost/index': { descriptionKey: 'routeDesc.controller:cost' },
  // 2026-09-17 对齐补录（清单 #30 / #31，菜单 1078 / 1077）
  '/controller/capability/shadow/index': {
    description: '影子演练：演练期只记录不执行，管理员批准后才真实发送'
  },
  '/controller/capability/milestone/index': { description: '管理项目里程碑与计划节点' },
  // 内容管理
  '/controller/content/file/index': { description: '浏览和管理本地文件资源' },
  '/controller/content/recycle/index': { description: '查看和恢复已删除的资源' },
  '/controller/content/announcement/index': { description: '发布和管理系统公告' },
  // 日志与调度
  '/controller/log/operlog/index': { descriptionKey: 'routeDesc.controller:operlog' },
  '/controller/log/logininfor/index': { descriptionKey: 'routeDesc.controller:logininfor' },
  '/controller/log/job/index': { descriptionKey: 'routeDesc.controller:job' },
  // 智能体管理（路径不变）
  '/controller/agent/index': { descriptionKey: 'routeDesc.controller:agent:index' },
  '/controller/agent/llm/index': { descriptionKey: 'routeDesc.controller:llm' },
  '/controller/agent/asr/index': { descriptionKey: 'routeDesc.controller:asr' },
  '/controller/agent/tts/index': { descriptionKey: 'routeDesc.controller:tts' },
  // 设备配置（路径不变）
  '/controller/eqp/index': { descriptionKey: 'routeDesc.controller:eqp' },
  '/controller/eqp/firmware/index': { descriptionKey: 'routeDesc.controller:eqp_firmware' },
  // 插件配置（仅「插件注册表」路径前缀变化）
  '/controller/plugin/index': { descriptionKey: 'routeDesc.controller:plugin' },
  '/controller/plugin/doc': { descriptionKey: 'routeDesc.controller:plugin:doc' },
  '/controller/plugin/center': { description: '浏览和下载功能插件到本地安装' },
  '/controller/plugin/registry/index': { descriptionKey: 'routeDesc.controller:plugin_registry' },
  // 2026-09-17 对齐补录（清单 #47，菜单 1067，需权限点 controller:plugin:secret）
  '/controller/plugin/secret': { description: '管理插件密钥箱：密钥录入、启停与引用状态' },
  // 系统设置（路径不变）
  '/controller/settings/overview': { descriptionKey: 'routeDesc.controller:settings:overview' },
  '/controller/settings/connection': { descriptionKey: 'routeDesc.controller:settings:connection' },
  '/controller/settings/maintenance': { descriptionKey: 'routeDesc.controller:settings:maintenance' },
  '/controller/settings/config': { descriptionKey: 'routeDesc.controller:settings:config' },

  // 消息中心
  '/message/notification/index': { description: '查看系统推送的通知消息' },
  '/message/risk/index': { description: '查看安全风险提醒消息' },
  '/message/all/index': { description: '查看所有类型的消息记录' },

  // 数据大屏（2026-09-17 对齐补录，清单 #56 / #57 / #58，菜单 1075 / 1074 / 1076）
  // 注意：大屏走整屏模式（layouts/default.vue 的 screen-shell 分支），不渲染顶部简介栏，
  //       因此这三条当前不会显示；补录是为了 URL 与菜单一一对应，将来大屏若加简介栏即可生效
  '/screen/cost/index': { description: '成本面板大屏：调用量、估算成本与预算健康度' },
  '/screen/report/index': { description: '价值报告大屏：采纳与使用、质量与安全、效率与部署' },
  '/screen/fde/index': { description: 'FDE 价值大屏：人天、调用量、覆盖度与价值证明' }
}

export default pageDescMap
