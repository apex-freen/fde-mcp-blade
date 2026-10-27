# 第三方依赖与许可证

本文件记录随仓库分发部分的依赖。许可证以各包 `package.json` / `Cargo.toml` 声明为准，发版前复核。

## 管理台运行时依赖（`fde-mcp-blade-admin/`）

| 依赖 | 版本 | 许可证 | 用途 |
| --- | --- | --- | --- |
| vue | ^3.4.31 | MIT | 前端框架 |
| vue-router | ^4.4.0 | MIT | 路由 |
| pinia | ^2.2.0 | MIT | 状态管理 |
| vue-i18n | ^9.14.5 | MIT | 中英文国际化 |
| @arco-design/web-vue | ^2.56.0 | MIT | UI 组件库 |
| echarts | ^6.1.0 | Apache-2.0 | 数据大屏与图表 |
| axios | ^1.7.2 | MIT | HTTP 请求 |
| dayjs | ^1.11.11 | MIT | 时间处理 |
| qrcode | ^1.5.4 | MIT | 令牌二维码 |

## 管理台构建依赖

| 依赖 | 版本 | 许可证 | 用途 |
| --- | --- | --- | --- |
| vite | ^5.3.3 | MIT | 构建 |
| @vitejs/plugin-vue | ^5.0.5 | MIT | Vue 编译 |
| sass | ^1.77.8 | MIT | 样式预处理 |
| unplugin-auto-import | ^0.17.6 | MIT | 自动导入 |
| unplugin-vue-components | ^0.27.2 | MIT | 组件自动注册 |

## 运行时组件

| 组件 | 许可证 | 说明 |
| --- | --- | --- |
| MariaDB | GPL-2.0 | 独立进程，通过标准协议访问，不修改、不随产品分发源码 |
| Docker 基础镜像 | 以镜像声明为准 | 发布前记录镜像名称与摘要 |

## 不在本文件范围

Rust 运行时与核心引擎尚未开源，其依赖清单随核心源码开放时以 `Cargo.lock` 为准提供。

## 更新方式

- 前端：`npm ls --all` 导出依赖树，变更时同步本表；
- 后端（开源后）：`cargo metadata --format-version 1`；
- 每次发版前核对新增依赖的许可证。