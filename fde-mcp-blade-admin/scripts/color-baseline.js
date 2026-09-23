/**
 * 硬编码颜色基线（技术债清单）
 *
 * 门禁规则：**不在本清单里的文件一旦出现颜色字面量即失败**；
 *          本清单里的文件只允许**减少**，不允许增加。
 *
 * 收敛记录
 *   M1 建立基线：17 个文件 / 100 处。
 *   M3 视觉落地：`layouts/default.vue`（9→0）、`views/login/index.vue`（6→0）、
 *              `views/workspace/dashboard/index.vue`（8→0）
 *              已改为全量走 tokens.scss 令牌 → 移出基线。
 *              图表组件（BaseChart / PieChart）的取色兜底字面量统一收进
 *              `components/charts/theme.js`（.js 不参与门禁）→ 两文件均归零，移出基线。
 *              现 12 个文件 / 69 处。
 *
 * 剩余 12 个文件分两类，处置口径不同：
 *   ① 数据大屏（screen/*）—— 深色舞台自成一套视觉体系，
 *      且 `screen-theme.scss` 的编译期常量无法用 CSS 变量表达，暂留。
 *   ② 业务页内联配色（plugin/center、audit/stats、agent/chat、eqp …）—— 待后续
 *      逐个页面替换为 `--tint-* / --ink-*` 令牌后继续收敛。
 *
 * 用法：npm run check:colors:update  ← 按当前实际值重写本清单（谨慎）
 */
export default {
  'src/views/screen/fde/index.vue': 20,
  'src/views/controller/plugin/center.vue': 10,
  'src/views/screen/cost/index.vue': 8,
  'src/views/login/sso.vue': 7,
  'src/views/audit/stats/index.vue': 6,
  'src/views/workspace/agent/chat.vue': 6,
  'src/views/controller/token/index.vue': 4,
  'src/views/controller/settings/overview/index.vue': 3,
  'src/views/controller/eqp/index.vue': 2,
  'src/views/controller/sso/components/OidcTab.vue': 1,
  'src/views/screen/report/index.vue': 1,
  'src/views/workspace/biz/detail/index.vue': 1
}
