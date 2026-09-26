# 贡献指南（Contributing）

感谢关注 FDE MCP Blade！无论你是 FDE、集成商还是学习者，欢迎参与共建——**你提的坑可能就是下个版本修的第一个**。

## 如何贡献

### 1. 提问题（Issue）

- **Bug**：请附环境信息（OS / Docker 版本 / 部署方式）、复现步骤、预期 vs 实际、相关日志片段（**务必脱敏**，不要贴令牌/密钥/真实客户数据）；
- **功能建议**：说明你的交付场景与期望效果，最好带上"现在是怎么做的、痛点在哪"；
- 好的第一步：看带 `good first issue` 标签的问题。

### 2. 提交代码（Pull Request）

1. Fork → 建分支：`git checkout -b feat/your-feature`；
2. Web 管理台（`fde-mcp-blade-admin/`，Vue 3.4 + Vite 5 + Arco Design）改动请先跑：
   ```bash
   npm run check        # i18n 键数相等 / 禁硬编码色 / 禁外部资源 三闸
   ```
3. 插件相关改动请遵循 [`service_plugins/plugin_develop_standard.md`](./service_plugins/plugin_develop_standard.md)；
4. Commit message 建议：`feat: xxx` / `fix: xxx` / `docs: xxx`，一句中文说清改动与原因；
5. PR 描述写清：改了什么、为什么、如何验证。

### 3. 写插件（无需动核心）

绝大多数接入需求**不需要改 Blade 核心**——照 `service_plugins/` 里的现成插件抄一个即可：`plugin.json` 声明方法、参数与风险等级（`normal` / `risk` / `auth` / `disable`），方法声明 `manual_avg_minutes` 即自动折算价值大屏等效人天。欢迎提 PR 把你的通用插件贡献回社区（注意脱敏：不含真实凭证与客户地址）。

## 约定

- **分支**：`master` 为主干，功能开发走 feature 分支；
- **协议**：提交即表示同意以 [Apache-2.0](./LICENSE) 开源你的贡献；
- **安全**：发现安全漏洞请**不要**公开提 issue，发邮件至 448004147@qq.com；
- **行为**：友好、直接、对事不对人。

## 交流

- QQ 群：`882419824`（开发者交流，响应及时）
- 在线体验：https://fde.agent-plat.com
