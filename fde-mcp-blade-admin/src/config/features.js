// ==========================================
// 本版发布范围开关（FEATURES）
//
// 🔴 与 `stores/capabilities.js` 的分工，务必分清：
//   - `capabilities`（GET /biz/capabilities）= **能力真相** —— 后端如实回答「我这儿有什么」。
//   - `FEATURES`（本文件）           = **产品决策** —— 「本版发不发这个入口」。
//
// 为什么必须分两层：后端已定案 `hardware.mqtt` **恒 true**（本地 MQTT broker 是产品内置、
// 随进程启动）。若把 Tab 显隐绑到 capabilities 上，Tab 反而会显示出来，与「本版收起
// MQTT 配置」的决定相反。把「本版不发」塞进 capabilities 会让那个接口说谎。
//
// 用法：`FEATURES.connectionBluetoothTab ? [...] : []` —— 硬件线重开时只翻这里的布尔值，
// 不动模板。（1016 §3.2 第三步 (c)）
// ==========================================

export const FEATURES = {
  /** 连接设置页 · 蓝牙连接配置 Tab（本版交付形态是 Docker 镜像，落点不含硬件外设） */
  connectionBluetoothTab: false,

  /** 连接设置页 · MQTT 连接配置 Tab（同上） */
  connectionMqttTab: false
}

export default FEATURES
