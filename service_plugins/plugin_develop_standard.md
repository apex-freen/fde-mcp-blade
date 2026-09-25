Rust ↔ Python 插件调用规范与开发标准
**适用范围**：所有MCP插件、所有Python脚本、所有业务模块（音乐、文件、工具、AI、控制类等）
**规范等级**：官方强制标准，所有新插件、现有插件迭代必须严格遵守，确保全局统一、无兼容性问题
**更新时间**：2026-04-19
# 一、Rust 调用 Python 插件的固定规则（全局统一，不可修改）
## 1.1 固定调用命令结构
Rust 执行 Python 脚本的命令格式固定，所有插件必须适配此格式，不允许修改Rust调用逻辑：
```bash
python3  脚本路径.py  {params_json}  {user_name}  {real_path}
```
## 1.2 固定传参顺序
Rust 代码中传参顺序固定，4个参数依次为：
```rust
Command::new(&func.exec_type)
    .arg(&func.exec_script)  // 1. 插件Python脚本的实际路径
    .arg(params_str)         // 2. 业务参数（JSON字符串格式）
    .arg(user_name)          // 3. 当前操作用户名
    .arg(&real_path)         // 4. 替换后的实际工作路径
```
## 1.3 Python 脚本参数接收位置
Python 脚本通过 sys.argv 获取参数，位置固定，与Rust传参顺序一一对应：
```python
sys.argv[0]   → 脚本自身文件名（无需处理，仅系统使用）
sys.argv[1]   → params_json   （业务参数，JSON字符串格式）
sys.argv[2]   → user_name     （当前登录用户名）
sys.argv[3]   → real_path     （插件工作的真实根路径，最重要）
```
# 二、参数意义与用途（所有插件通用）
| 参数名称 | 获取位置 | 来源 | 核心含义 | 通用用途 |
| -------- | -------- | ---- | -------- | -------- |
| params_json | sys.argv[1] | MQTT/HTTP 前端传入 | 业务操作所需的参数，JSON字符串格式 | 如加载歌单时传入{"playlist_file":"xxx.json"}，查询文件时传入{"file_name":"xxx.txt"} |
| user_name | sys.argv[2] | Rust 内部系统传入 | 当前登录的用户标识 | 用于用户权限校验、文件归属隔离、多用户数据区分 |
| real_path | sys.argv[3] | MCP插件JSON中 pathPattern 替换后 | 插件可操作的真实根目录 | 所有文件读写、目录操作必须在此路径内，禁止越权访问 |
# 三、Rust 执行逻辑说明（通用流程）
## 3.1 核心执行流程
1. Rust 接收 MQTT/HTTP 指令，根据指令中的 function_key 匹配对应的 MCP 插件；
2. 根据插件 JSON 中的 pathPattern，替换 {user_name} 为实际用户名，生成 real_path；
3. 将业务参数（function_params）序列化为 JSON 字符串（params_str）；
4. 按固定顺序拼接参数，异步执行 Python 脚本；
5. 读取 Python 脚本的标准输出（stdout），解析为统一 JSON 格式；
6. 将解析后的 JSON 结果返回给前端/MQTT客户端。
## 3.2 成功/失败判定标准
### 成功判定（同时满足）
- Python 脚本退出码为 0；
- 脚本标准输出（stdout）为合法 JSON；
- JSON 格式符合统一规范（包含 code:0、msg、data 字段）。
### 失败判定（满足任一）
- Python 脚本崩溃、异常退出 → Rust 报状态码 2；
- 脚本无任何输出 → Rust 解析失败；
- 输出内容非 JSON 格式 → Rust 解析失败；
- 脚本未捕获异常，直接退出 → Rust 报状态码 2。
# 四、Python 插件编写规范（所有脚本必须遵守）
## 4.1 固定开头模板（复制即用）
所有 Python 插件脚本必须以以下模板开头，确保参数接收、异常处理统一：
```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
import json

def main():
    try:
        # ========== 固定参数接收（所有脚本统一） ==========
        params_json = sys.argv[1]
 user_name   = sys.argv[2]
        real_path   = sys.argv[3]

        # ========== 业务逻辑编写（根据插件功能修改） ==========
        # 示例：解析业务参数
        # params = json.loads(params_json)
        # 示例：拼接文件路径
        # file_path = os.path.join(real_path, "test.json")

        # ========== 成功返回（统一格式） ==========
        print(json.dumps({
            "code": 0,
 "msg": "ok",
            "data": {}  # 替换为实际业务数据
        }, ensure_ascii=False))

    except Exception as e:
        # ========== 失败返回（统一格式） ==========
        print(json.dumps({
            "code": -1,
            "msg": str(e),  # 错误信息必须清晰，便于排查
 "data": None
        }, ensure_ascii=False))

if __name__ == "__main__":
    main()
```
## 4.2 统一返回格式（强制要求）
所有脚本的输出必须是唯一的 JSON 字符串，不允许输出任何无关内容，格式固定如下：
### 成功返回格式
```json
{
 "code": 0,
  "msg": "ok",
  "data": {
    // 业务数据，根据插件功能填写
    // 示例：歌单列表插件返回 {"playlists": ["xxx.json", "xxx.json"]}
    // 示例：文件查询插件返回 {"files": ["xxx.txt", "xxx.mp3"]}
  }
}
```
### 失败返回格式
```json
{
  "code": -1,
  "msg": "错误原因描述（清晰、具体，便于排查）",
  "data": null
}
```
## 4.3 路径规范（重中之重）
- 所有文件、目录操作，必须以 real_path 作为根路径，禁止超出此路径范围；
- 禁止手动拼接路径（如 /home/{user_name}/xxx），必须使用 os.path.join 拼接；
- 路径拼接示例（正确 vs 错误）：
```python
# 正确（推荐）
file_path = os.path.join(real_path, "data", "test.json")

# 错误（禁止）
file_path = "/home/" + user_name + "/media/data/test.json"
file_path = real_path + "/data/test.json"  # 避免直接拼接，防止路径分隔符问题
```
## 4.4 异常处理规范
- 所有业务逻辑必须放在 try-except 代码块内，确保无未捕获异常；
- 异常信息必须转换为字符串，写入返回 JSON 的 msg 字段，禁止隐瞒错误；
- 禁止脚本直接崩溃（如未捕获的 FileNotFoundError、JSONDecodeError 等）；
- 可选：调试日志可输出到 sys.stderr，不污染 stdout（示例：print("调试信息", file=sys.stderr)）。
## 4.5 输出规范
- 标准输出（stdout）只能有一行内容，即最终的返回 JSON 字符串；
- 禁止多次使用 print 输出，禁止输出调试信息、日志到 stdout；
- 调试日志、错误日志必须输出到 sys.stderr，避免影响 Rust 解析 JSON。
# 五、MCP 插件 JSON 编写规范（通用）
所有 MCP 插件的配置 JSON 必须遵循以下格式，确保 Rust 能正确识别、匹配插件：
```json
{
    "name": "插件唯一标识（英文小写，用连字符分隔，如：music-local-playlist-manage）",
    "serviceType": "服务类型（如：local-storage、ai-service、control-service）",
    "serviceDomain": "业务域（如：music、file、tool、control）",
    "serviceName": "插件名称（中文，直观易懂，如：本地音乐歌单管理服务）",
    "serviceDescription": "插件功能说明，明确插件用途、使用规范（可选但推荐）",
    "serviceTags": ["标签1", "标签2"],  // 用于 Rust 服务发现，如：["music", "playlist", "local"]
    "pathPattern": "/home/{user_name}/工作路径",  // 路径模板，{user_name} 会自动替换
    "accessToken": "权限令牌（预留，可自定义，如：playlist-manage-001）",
    "functions": [
        {
            "functionKey": "指令唯一标识（英文，用点分隔，如：music.playlist.scan）",
            "functionDesc": "指令功能说明（简洁明了，如：扫描歌单目录并生成JSON）",
            "functionParams": [
                // 业务参数列表（无参数则留空数组）
                {
                    "paramName": "参数名",
                    "paramType": "参数类型（如：string、int、bool）"
                }
            ],
            "execScript": "脚本路径（相对路径，如：./service/music-local-playlist-manage/scan_playlists.py）",
            "execType": "执行类型（固定为：python3）"
        }
    ]
}
```
# 六、通用避坑指南（常见错误总结）
| 常见错误 | 错误现象 | 解决方案 |
| -------- | -------- | -------- |
| 参数顺序写错 | 脚本崩溃，Rust 报状态码 2 | 严格按 sys.argv[1]=params_json、sys.argv[2]=user_name、sys.argv[3]=real_path 接收 |
| 手动拼接路径 | 找不到文件、权限错误 | 全部使用 os.path.join(real_path, ...) 拼接路径 |
| 未捕获异常 | 脚本崩溃，Rust 报状态码 2 | 所有业务逻辑放入 try-except 块，异常信息写入 msg 字段 |
| 返回非JSON内容 | Rust 解析失败 | 确保 stdout 只输出唯一的 JSON 字符串，禁止多余 print |
| 调试日志输出到 stdout | JSON 解析失败 | 调试日志输出到 sys.stderr（print(msg, file=sys.stderr)） |
| 未处理空目录/空文件 | 脚本崩溃、返回异常 | 添加空值判断，如：if not os.path.exists(real_path): 返回错误提示 |
# 七、规范总结（一句话牢记）
**Rust 固定传参顺序，插件必须适配；只使用 real_path 作为根路径；必须返回统一 JSON；必须捕获所有异常；永远不要让脚本崩溃。**
# 八、补充说明
- 本规范将持续更新，后续如有新增需求，将统一同步修改，所有插件需同步适配；
- 所有插件开发完成后，需按本规范自检，确保无违规内容；
- 若发现规范与实际业务冲突，需统一协商修改，禁止私自修改 Rust 调用逻辑或插件编写规范。
# 九、场景分类（manifest.scenario）
所有插件应在 `manifest` 中声明适用场景，方便用户（管理端界面）与智能体判断该插件适合哪个场景：
```json
{
    "manifest": {
        "name": "hom-message-board",
        "serviceType": "family-board",
        "scenario": "home"
    }
}
```
**可选值（枚举）**：
| 值 | 含义 | 管理端徽章 |
| --- | --- | --- |
| `home` | 家庭场景（家用 NAS、客厅影音、家人留言等） | 🏠 家庭 |
| `business` | 商业场景（门店、企业、运营等） | 🏪 商业 |
| `general` | 通用（两端都适用，默认值） | 🌐 通用 |

**约定**：
1. 未声明或填写非法值时，宿主统一按 `general`（通用）处理，不影响加载；
2. 跨场景插件（家庭/商业都适用）应标 `general`，而不是多选；
3. 宿主在 `local_service_discover` 返回中透传 `scenario`，智能体可据此选择合适场景的插件；
4. 管理端插件列表会展示场景徽章。
5. **目录名 = manifest.name = 场景前缀 + 功能名**（hom-家庭 / biz-商业 / gen-通用，全部带前缀），如 hom-message-board、biz-message-board、gen-dmc-to-mcp。
