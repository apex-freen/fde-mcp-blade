// ==========================================
// 侧边导航图标表
//
// 为什么要有这张表：后端下发的菜单节点虽然带 `icon` 字段（`meta.icon`），
// 但取值域不受控（可能为空、也可能是 RuoYi 的英文图标名）。directly 渲染会大片空白。
// 所以按三级优先解析：
//   ① `item.icon` 命中 NAME_MAP → 用它
//   ② 兜底：按 `item.path` 命中 PATH_RULES → 用它（这是实际生效的主力）
//   ③ 都没有 → 通用方点
//
// 图形语言与 design-preview v1 一致：24×24、stroke 描边、fill 无、圆头圆角。
// 形状用元组描述，避免在模板里堆一大串 if：
//   ['p', d]              → <path>
//   ['r', x, y, w, h, rx] → <rect>
//   ['c', cx, cy, r]      → <circle>
//   ['l', x1, y1, x2, y2] → <line>
// ==========================================

const ICONS = {
  dashboard: [
    ['r', 3, 3, 7, 9, 1.5],
    ['r', 14, 3, 7, 5, 1.5],
    ['r', 14, 12, 7, 9, 1.5],
    ['r', 3, 16, 7, 5, 1.5]
  ],
  cost: [['p', 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6']],
  report: [
    ['p', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'],
    ['p', 'M14 2v6h6M8 13h8M8 17h5']
  ],
  key: [
    ['c', 8, 15, 4],
    ['p', 'M10.8 12.2 21 2M18 5l2 2M15 8l2 2']
  ],
  cube: [
    ['p', 'M20.2 7.6 12 2 3.8 7.6v8.8L12 22l8.2-5.6z'],
    ['p', 'M12 22V12M3.8 7.6 12 12l8.2-4.4']
  ],
  chat: [
    ['p', 'M21 2H3v16h5v4l4-4h5z'],
    ['p', 'M8 9h8M8 13h5']
  ],
  lock: [
    ['r', 3, 11, 18, 10, 2],
    ['c', 12, 16, 1.5],
    ['p', 'M7 11V7a5 5 0 0 1 10 0v4']
  ],
  cpu: [
    ['r', 4, 4, 16, 16, 3],
    ['p', 'M9 9h6v6H9z'],
    ['p', 'M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3']
  ],
  list: [
    ['p', 'M4 4h16v16H4z'],
    ['p', 'M8 9h8M8 13h8M8 17h4']
  ],
  alert: [
    ['p', 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'],
    ['p', 'M12 9v4M12 17h.01']
  ],
  chart: [
    ['p', 'M3 3v18h18'],
    ['p', 'M7 15l4-5 3 3 5-7']
  ],
  gear: [
    ['c', 12, 12, 3],
    [
      'p',
      'M19.4 15a1.7 1.7 0 0 0 .3 1.9 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2 2 2 0 1 1-2.8-2.8A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9 2 2 0 1 1 2.8-2.8A1.7 1.7 0 0 0 9 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2 2 2 0 1 1 2.8 2.8A1.7 1.7 0 0 0 20 11a2 2 0 1 1 0 4z'
    ]
  ],
  user: [
    ['p', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'],
    ['c', 12, 7, 4]
  ],
  users: [
    ['p', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'],
    ['c', 9, 7, 4],
    ['p', 'M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75']
  ],
  shield: [['p', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']],
  bell: [
    ['p', 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'],
    ['p', 'M13.7 21a2 2 0 0 1-3.4 0']
  ],
  clock: [
    ['c', 12, 12, 9],
    ['p', 'M12 7v5l3 2']
  ],
  database: [
    ['p', 'M3 5a9 3 0 1 0 18 0a9 3 0 1 0 -18 0'],
    ['p', 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'],
    ['p', 'M3 12c0 1.66 4 3 9 3s9-1.34 9-3']
  ],
  hex: [
    ['p', 'M12 2l8.5 5v10L12 22l-8.5-5V7z'],
    ['c', 12, 12, 2.5]
  ],
  book: [
    ['p', 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20'],
    ['p', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z']
  ],
  tree: [
    ['r', 9, 2, 6, 5, 1.5],
    ['r', 3, 16, 6, 5, 1.5],
    ['r', 15, 16, 6, 5, 1.5],
    ['p', 'M12 7v4M6 16v-2h12v2']
  ],
  terminal: [
    ['p', 'M4 4h16v16H4z'],
    ['p', 'M8 9l3 3-3 3M13 15h3']
  ],
  cloud: [['p', 'M18 16a4 4 0 0 0-1-7.9A6 6 0 0 0 6 9a4 4 0 0 0 0 7z']],
  flag: [
    ['p', 'M4 22V4'],
    ['p', 'M4 4h13l-2 4 2 4H4']
  ],
  shadow: [
    ['r', 9, 9, 12, 12, 2],
    ['p', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1']
  ],
  check: [['p', 'M20 6 9 17l-5-5']],
  dot: [['c', 12, 12, 3]]
}

/** ① 后端 `meta.icon` 名 → 图形（RuoYi 常见图标名 + 我们自己的语义名） */
const NAME_MAP = {
  dashboard: 'dashboard',
  home: 'dashboard',
  cost: 'cost',
  money: 'cost',
  report: 'report',
  form: 'report',
  documentation: 'book',
  guide: 'book',
  token: 'key',
  'password': 'key',
  component: 'cube',
  build: 'cube',
  plugin: 'cube',
  chat: 'chat',
  message: 'chat',
  email: 'chat',
  lock: 'lock',
  'permission': 'lock',
  peoples: 'users',
  user: 'user',
  avatar: 'user',
  dept: 'tree',
  tree: 'tree',
  system: 'gear',
  setting: 'gear',
  tool: 'gear',
  monitor: 'chart',
  chart: 'chart',
  log: 'terminal',
  clipboard: 'list',
  list: 'list',
  table: 'list',
  bug: 'alert',
  alert: 'alert',
  server: 'database',
  database: 'database',
  dict: 'book',
  bell: 'bell',
  job: 'clock',
  time: 'clock',
  date: 'clock',
  flag: 'flag',
  shield: 'shield',
  safe: 'shield',
  cloud: 'cloud',
  cpu: 'cpu',
  validCode: 'shield',
  eye: 'shield'
}

/** ② 路径兜底规则：按顺序命中第一条。写在后面的越通用 */
const PATH_RULES = [
  [/\/workspace\/dashboard/, 'dashboard'],
  [/cost|budget/, 'cost'],
  [/report|value/, 'report'],
  [/\/mine\/token|token/, 'key'],
  [/plugin/, 'cube'],
  [/mcp/, 'chat'],
  [/message|notification|announcement/, 'chat'],
  [/permission|grant|auth|role|sso/, 'lock'],
  [/eqp|device|firmware/, 'cpu'],
  [/risk|hitl|approval/, 'alert'],
  [/stat/, 'chart'],
  [/audit|operlog|logininfor/, 'list'],
  [/shadow/, 'shadow'],
  [/vector/, 'hex'],
  [/pii/, 'shield'],
  [/milestone/, 'flag'],
  [/job|task/, 'clock'],
  [/dept/, 'tree'],
  [/user/, 'user'],
  [/vector|db|database/, 'database'],
  [/doc|knowledge/, 'book'],
  [/capabilit|overview|connection|maintenance|config|setting/, 'gear'],
  [/screen/, 'chart']
]

/**
 * 解析菜单项图标
 * @param {{icon?: string, path?: string, title?: string}} item 菜单树节点
 * @returns {Array} 形状元组数组
 */
export function resolveNavIcon(item) {
  const byName = NAME_MAP[item?.icon]
  if (byName && ICONS[byName]) return ICONS[byName]

  const path = item?.path || ''
  for (const [re, key] of PATH_RULES) {
    if (re.test(path)) return ICONS[key]
  }

  return ICONS.dot
}

export { ICONS }
export default resolveNavIcon
