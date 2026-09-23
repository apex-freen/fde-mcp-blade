// ==========================================
// 能力清单（capabilities）
// 对应后端：GET /biz/capabilities
// 契约：1017 §2.2 / §2.2.1；页面：1016 §4.1 页 5（能力总览，M4）
//
// 口径（v1.6/v1.7 后端已定案）：
//   - **要求登录、不要求权限码**（普通账号也通）；
//   - 顶层 `product` 恒 "fde-mcp-blade"；`version` 编译期常量；
//     `build_time` / `image_tag` 构建期注入；`edition` 恒定 "enterprise"；
//     `image_digest` **待定 —— 不要预设它存在**，按「有则显示」；
//   - `modules[].enabled`：plugin.engine / security.pii / audit.export /
//     security.shadow 恒 true；ai.vector 看本地 ONNX 模型；integration.cloud
//     看云端凭据；hardware.mqtt 看 MQTT 配置；hardware.bluetooth **恒 false**；
//   - `modules[].name` 是**后端中文硬编码固定文案，不是 i18n key**
//     → 前端「只用 `key` 查词典，`name` 仅兜底直渲」；
//   - **任何字段拿不到 → 后端返 `null`，接口不失败** → 前端按「有则显示」渲染，
//     不要因单字段为 null 而报错或整块隐藏。
//
// ⏳ 落地状态：接口仍在后端排期。前端已按「拿不到就按有则显示」写降级（见
//    stores/capabilities.js），接口就绪后**零改动**自动切到真实值。
// ==========================================

import { get } from '@/utils/request'

/**
 * 拉取本机能力清单（要求登录、不要求权限码）
 * @returns {Promise<Object>} { product, version, build_time, image_tag, image_digest, edition, modules[] }
 */
export function getCapabilities() {
  return get('/biz/capabilities')
}
