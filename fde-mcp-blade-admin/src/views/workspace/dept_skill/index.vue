<template>
  <!-- 1042 §5.2：使用中心 › 本部门技能（部门负责人自助维护）
       与「管理中心 › 平台能力 › 技能库」共用同一个页面组件，靠 mode 收敛差异：
       本入口固定 scope=dept，只按接口返回的 can_manage 显示写按钮，
       不出现全局域切换等管理型区块。 -->
  <SkillLibrary mode="dept" />
</template>

<script setup>
import SkillLibrary from '@/views/controller/skill/index.vue'
</script>
