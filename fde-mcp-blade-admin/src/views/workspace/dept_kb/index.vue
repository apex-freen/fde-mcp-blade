<template>
  <!-- 1041 §2.1：工作台 › 部门知识库（菜单 1089，权限点 workspace:dept_kb）
       与「管理中心 › 平台能力 › 向量知识库」共用同一个页面组件，
       只靠 mode 收敛差异：本入口无检索设置 / 别名表 / 内容缺口 / 反馈 / 重新同步，
       写文档与重建按接口返回的 can_manage（部门负责人）决定。 -->
  <VectorKnowledgeBase mode="dept" />
</template>

<script setup>
import VectorKnowledgeBase from '@/views/controller/vector/index.vue'
</script>
