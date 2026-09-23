<template>
  <div class="skill-page">
    <a-card :bordered="false">
      <div class="skill-hero">
        <div class="skill-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <!-- 技能块：六边形 + 中心点，与 NavIcon 的 hex 语言一致 -->
            <path d="M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z" />
            <circle cx="12" cy="12" r="2.6" />
            <path d="M12 2.5v6.9M12 14.6v6.9M4.6 6.9l5.6 3.4M13.8 13.7l5.6 3.4M19.4 6.9l-5.6 3.4M10.2 13.7l-5.6 3.4" />
          </svg>
        </div>
        <h2 class="skill-title">{{ $t('skillLib.heroTitle') }}</h2>
        <p class="skill-desc">{{ $t('skillLib.heroDesc') }}</p>
      </div>

      <a-divider />

      <div class="skill-status">
        <div class="status-row">
          <span class="status-dot status-dot--ok" />
          <span class="status-label">{{ $t('skillLib.statusMenuLabel') }}</span>
          <span class="status-value">{{ $t('skillLib.statusMenuValue') }}</span>
        </div>
        <div class="status-row">
          <span class="status-dot status-dot--wait" />
          <span class="status-label">{{ $t('skillLib.statusApiLabel') }}</span>
          <span class="status-value">{{ $t('skillLib.statusApiValue') }}</span>
        </div>
        <div class="status-row">
          <span class="status-dot status-dot--wait" />
          <span class="status-label">{{ $t('skillLib.statusPageLabel') }}</span>
          <span class="status-value">{{ $t('skillLib.statusPageValue') }}</span>
        </div>
      </div>

      <a-alert type="info" class="skill-note">{{ $t('skillLib.hint') }}</a-alert>
    </a-card>
  </div>
</template>

<script setup>
// 技能库 —— 占位页。
// 背景：后端菜单已下发该入口（menu_id 1083），但 1017 尚未收录技能库的接口契约，
// 无法实现真实功能。本页的职责是承接菜单点击（否则落 404 兜底页），
// 并如实告知当前状态。接口契约就绪后整体替换为本页的真实实现。
</script>

<style scoped>
.skill-page {
  padding: 16px;
}

.skill-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 16px 8px;
}

.skill-badge {
  width: 64px;
  height: 64px;
  border-radius: var(--r-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-blue);
  background: var(--tint-blue);
}

.skill-badge svg {
  width: 34px;
  height: 34px;
}

.skill-title {
  margin: 18px 0 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.skill-desc {
  margin: 10px 0 0;
  max-width: 560px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-2);
}

.skill-status {
  max-width: 640px;
  margin: 0 auto;
  padding: 4px 8px;
}

.status-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 7px 0;
  font-size: 13px;
}

.status-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  align-self: center;
}

.status-dot--ok {
  background: var(--c-green);
}

.status-dot--wait {
  background: var(--c-amber);
}

.status-label {
  flex: none;
  width: 96px;
  color: var(--text-3);
}

.status-value {
  color: var(--text-2);
}

.skill-note {
  max-width: 640px;
  margin: 18px auto 6px;
}
</style>
