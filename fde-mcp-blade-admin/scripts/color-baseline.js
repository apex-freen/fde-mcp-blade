/**
 * 硬编码颜色基线（技术债清单）
 *
 * 这些文件在 M1「主题令牌化」之前仍含颜色字面量，暂不阻断。
 * 门禁规则：**不在本清单里的文件一旦出现颜色字面量即失败**；
 *          本清单里的文件只允许**减少**，不允许增加。
 *
 * M1 完成后应把此文件缩减到仅剩图表/大屏等确有必要内联配色的文件。
 * 用法：npm run check:colors:update  ← 按当前实际值重写本清单（谨慎）
 */
export default {
  'src/views/screen/fde/index.vue': 20,
  'src/views/controller/plugin/center.vue': 10,
  'src/layouts/default.vue': 9,
  'src/views/screen/cost/index.vue': 8,
  'src/views/workspace/dashboard/index.vue': 8,
  'src/components/charts/PieChart.vue': 7,
  'src/views/login/sso.vue': 7,
  'src/views/audit/stats/index.vue': 6,
  'src/views/login/index.vue': 6,
  'src/views/workspace/agent/chat.vue': 6,
  'src/views/controller/token/index.vue': 4,
  'src/views/controller/settings/overview/index.vue': 3,
  'src/components/charts/BaseChart.vue': 2,
  'src/views/controller/eqp/index.vue': 2,
  'src/views/controller/sso/components/OidcTab.vue': 1,
  'src/views/screen/report/index.vue': 1,
  'src/views/workspace/biz/detail/index.vue': 1
}
