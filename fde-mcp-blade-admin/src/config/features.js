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
  connectionMqttTab: false,

  /**
   * 登录页 · 图形验证码（本版暂不启用）
   *
   * 说明：当前验证码是**纯前端本地校验**（前端随机生成 4 位、前端比对），
   * `/login` 请求体里并不包含 captcha 字段，后端也没校验 —— 它挡不住脚本，
   * 属于观感型控件。上线要真验码时，应由后端出图 + 后端校验，
   * 再把这个布尔翻回 true（模板与校验逻辑都还在，无需重写）。
   */
  loginCaptcha: false
}

export default FEATURES
