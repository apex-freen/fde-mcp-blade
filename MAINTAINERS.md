# 维护者

## 当前维护者

| 角色 | 姓名 | 账号 | 负责范围 |
| --- | --- | --- | --- |
| 项目负责人 / 发布负责人 | APEX_F | Gitee / GitHub：freen | 版本发布、架构决策、核心运行时 |
| 管理台维护 | APEX_F | Gitee / GitHub：freen | Vue 3 管理台、国际化、构建检查 |
| 插件与集成维护 | APEX_F | Gitee / GitHub：freen | `service_plugins/`、插件开发标准 |
| 文档与示例 | APEX_F | Gitee / GitHub：freen | README、部署文档、示例 |

## 发布权限

- `master` 由维护者复核后合入；
- 发布标签与 Release 仅由发布负责人创建；
- 外部贡献通过 Fork + PR 合入，不直接授予写权限。

## 关键人备份

- 部署、升级、备份恢复与回滚步骤见 `fde-mcp-blade/README.zh-CN.md` 与 `install.sh` / `ops.sh` / `backup.sh`；
- 每次发布前，由第二人按文档独立完成一次部署与回滚；
- 备份维护人名单随发布更新到本文件。