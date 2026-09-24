# FDE MCP Blade Admin

FDE MCP Blade —— 边缘 MCP 双向中控中枢的管理控制台（Web 端）。

> 向上为 Agent 提供工具，向下调度企业系统插件；内置插件引擎、五层安全、RBAC 与全链路审计，纯本地交付。

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | Vue 3.4 + Vite 5 |
| UI 组件库 | Arco Design Vue 2.56 |
| 状态管理 | Pinia 2 |
| 路由 | Vue Router 4 |
| 国际化 | vue-i18n 9（中英双语，键必须一一对应） |
| 图表 | ECharts 6 |
| HTTP | Axios 1 |
| 样式 | Sass + CSS Variables |

## 目录结构

```
fde-mcp-blade-admin/
├── src/
│   ├── api/          # 接口层（按业务模块拆分，注释放接口口径）
│   ├── assets/       # 静态资源（brand/ 下为品牌图形）
│   ├── components/   # 公共组件
│   ├── config/       # 前端配置（theme / features 等）
│   ├── layouts/      # 布局
│   ├── locales/      # i18n 词典（zh-CN / en-US）
│   ├── router/       # 路由
│   ├── stores/       # Pinia
│   ├── styles/       # 全局样式与设计令牌
│   ├── utils/        # 工具函数
│   └── views/        # 页面
├── public/           # 免构建静态资源（favicon 等）
├── .env.example      # 环境变量模板
└── vite.config.js
```

## 四大模块

| 模块 | 内容 | 可见角色 |
|---|---|---|
| 使用中心 | 工作台、智能体、设备 | user + admin |
| 管理中心 | 用户、授权、令牌、文件、插件中心、固件下载 | admin |
| 审计中心 | 操作审计、授权审计、令牌审计 | admin |
| 设置中心 | 设备信息、网络、MQTT、蓝牙、固件升级、关机/重启 | admin |

## 快速开始

```bash
# 1. 依赖（Node >= 18，推荐 20/22）
npm install

# 2. 环境变量
cp .env.example .env.development
#    按需修改 VITE_API_TARGET 为可达的后端地址

# 3. 启动
npm run dev          # http://127.0.0.1:5173/
```

## 构建

```bash
npm run build        # 默认（development 模式）
npm run build:test   # 测试环境
npm run build:prod   # 生产环境
npm run preview      # 预览构建产物
```

产物输出到 `dist/`。

## 环境变量

| 变量 | 说明 |
|---|---|
| `VITE_APP_TITLE` | 应用标题 |
| `VITE_API_BASE_URL` | 请求前缀，须与 vite 代理 key 一致（默认 `/prod-api`） |
| `VITE_API_TARGET` | 【开发】vite 代理目标，缺省回退 `http://127.0.0.1:80` |
| `VITE_CLOUD_BASE_URL` | 云端平台 API 地址 |
| `VITE_USE_MOCK` | 是否启用 mock |

> `.env.*` 不入库（含环境专属地址）。修改后需重启 dev server。

## 开发约定

- **权限是页面级**：权限点只控制菜单可见性，安全边界由服务端数据范围校验保证。
- **接口判定只认 `code`**：`msg` / `degraded.reason` 一律 opaque 直渲，不做字符串匹配、不做翻译映射。
- **禁止硬编码颜色**：一律走 `styles/` 下的设计令牌。
- **离线优先**：不引外链、不使用 web font（内网离线环境红线）。
- **i18n 中英键必须相等**：新增文案须同步补 `zh-CN` 与 `en-US`。

## 许可

见仓库根目录 [LICENSE](../LICENSE)（Apache 2.0）。
