<template>
  <div class="risk-alert-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="calls" :title="$t('riskAlert.tabCalls')">
          <RiskCallTable />
        </a-tab-pane>
        <a-tab-pane key="intercepts" :title="$t('riskAlert.tabIntercept')">
          <InterceptLogTable />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
// 审计中心 · 风险告警（menu 1006，权限点 audit:risk:alert）
// 风险调用记录：复用既有 /biz/gis_cmd_log?risk_level=...（该接口无权限点校验，属多使用方共用）
// 拦截记录：新增 /biz/gis_risk_intercept_log/list|export
import { ref } from 'vue'
import RiskCallTable from './components/RiskCallTable.vue'
import InterceptLogTable from './components/InterceptLogTable.vue'

const activeTab = ref('calls')
</script>
