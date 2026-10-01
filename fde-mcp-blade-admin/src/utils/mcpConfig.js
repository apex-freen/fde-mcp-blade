// ==========================================
// MCP 配置地址归一化
//
// 后端拿不到外部访问拓扑（HTTPS 卸载、端口转发、反向代理端口），生成的 mcpLocal.url
// 可能与用户实际可达地址不一致。例：站点走 https://fde.agent-plat.com（443 反代 → 8018），
// 后端却生成 http://fde.agent-plat.com:8018/mcp —— 协议错、端口多余，贴进智能体连不上。
//
// 归一化规则：控制台能从哪个地址打开，同源的 /mcp 就从哪个地址可达 ——
// 直接以 window.location.origin 改写协议+域名+端口，保留路径与查询串。
//   - 本地部署 http://192.168.x.x:8018 控制台与 MCP 同源，origin 不变 → 无副作用；
//   - 反代/端口转发站点 https://fde.agent-plat.com → 自动变成 https://域名/mcp（无端口）；
//   - 云端配置（mcpCloud）指向云端中转、域名不同，不做改写；
//   - localhost / 127.0.0.1 访问（本地开发）跳过，避免覆盖后端下发的正确内网地址。
//
// 复用点：管理台令牌页、「我的令牌」页（workspace/mine/token）的签发成功弹窗。
// ==========================================

const rewriteOrigin = (raw) => {
  try {
    const u = new URL(raw)
    if (u.origin === window.location.origin) return raw
    return window.location.origin + u.pathname + u.search + u.hash
  } catch (e) {
    return raw
  }
}

/**
 * 就地改写签发返回体里的本地 MCP 地址
 * @param {Object} info - 签发接口返回体（读取并修改 mcp_config.mcpLocal 与 mcpLocalQrCode）
 * @returns {boolean} 是否发生了改写（调用方据此提示「已按当前访问地址自动适配」）
 */
export function normalizeMcpConfig(info) {
  if (!info) return false
  const loc = window.location
  // 本地开发（localhost 访问）不归一化
  if (loc.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(loc.hostname)) return false

  let adapted = false

  // 后端结构是 mcpLocal.mcpServers.<server名>.url（可能还有别的包裹层），
  // 递归深改：凡是 mcpLocal 子树里挂了 http(s) url 属性的对象都按当前访问地址改写。
  // ⚠️ 只处理 mcpLocal；mcpCloud 指向云端中转、域名不同，不改写。
  const rewriteDeep = (node) => {
    if (!node || typeof node !== 'object') return
    for (const key of Object.keys(node)) {
      const v = node[key]
      if (!v || typeof v !== 'object') continue
      if (typeof v.url === 'string' && /^https?:\/\//i.test(v.url)) {
        const before = v.url
        v.url = rewriteOrigin(v.url)
        if (v.url !== before) adapted = true
      }
      rewriteDeep(v)
    }
  }
  rewriteDeep(info.mcp_config?.mcpLocal)
  // 本地二维码内容若是 http(s) 链接，同样按当前访问地址改写
  if (info.mcpLocalQrCode && /^https?:\/\//i.test(info.mcpLocalQrCode)) {
    const before = info.mcpLocalQrCode
    info.mcpLocalQrCode = rewriteOrigin(info.mcpLocalQrCode)
    if (info.mcpLocalQrCode !== before) adapted = true
  }

  return adapted
}
