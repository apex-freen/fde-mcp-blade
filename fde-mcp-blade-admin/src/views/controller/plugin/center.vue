<template>
  <div class="plugin-center-page">
    <a-card :bordered="false" style="margin-top: 16px">
      <div class="offline-title">{{ $t('pluginCenter.offlineTitle') }}</div>
      <div class="offline-desc">{{ $t('pluginCenter.offlineDesc') }}</div>

      <div class="site-row">
        <span class="site-label">{{ $t('pluginCenter.officialSiteLabel') }}</span>
        <!-- 官方插件库网址待产品提供：填下方 script 里的 officialSite 常量即可，无需改 i18n -->
        <span v-if="officialSite" class="site-value">{{ officialSite }}</span>
        <span v-else class="site-todo">{{ $t('pluginCenter.officialSiteTodo') }}</span>
      </div>

      <div class="steps-title">{{ $t('pluginCenter.stepsTitle') }}</div>
      <ol class="steps">
        <li>{{ $t('pluginCenter.stepDownload') }}</li>
        <li>{{ $t('pluginCenter.stepCopy') }}</li>
        <li>{{ $t('pluginCenter.stepSync') }}</li>
      </ol>

      <a-alert type="info" show-icon class="offline-note">
        {{ $t('pluginCenter.offlineNote') }}
      </a-alert>
    </a-card>

    <!-- 已隐藏：原静态原型（硬编码 4 个假插件 + 无行为的「下载」按钮）
         依据 58 文档 §10.2 第 4 条：离线环境不提供在线下载，且后端无下载/安装接口，
         本页已改为上方「离线环境说明页」。将来若要做真实的在线插件中心，可取消注释复用下列卡片布局。
    <a-card style="margin-top: 16px">
      <a-row :gutter="16">
        <a-col :span="6" v-for="plugin in pluginList" :key="plugin.name">
          <a-card class="plugin-card" hoverable>
            <div class="plugin-icon" :style="{ background: plugin.bgColor }">
              <span class="plugin-emoji">{{ plugin.icon }}</span>
            </div>
            <div class="plugin-name">{{ plugin.name }}</div>
            <div class="plugin-version">v{{ plugin.version }}</div>
            <div class="plugin-desc">{{ plugin.desc }}</div>
            <a-button type="primary" long style="margin-top: 12px">
              下载
            </a-button>
          </a-card>
        </a-col>
      </a-row>
    </a-card>
    -->
  </div>
</template>

<script setup>
// 官方插件库网址：待产品提供。填入后页面直接生效；留空则显示「待补充」占位
const officialSite = ''

// 已隐藏：原静态原型的假插件列表（配合上方注释掉的卡片布局）
/*
const pluginList = [
  {
    name: '数据库插件',
    version: '1.2.0',
    desc: '支持多种数据库连接和查询',
    icon: '🗄️',
    color: '#165DFF',
    bgColor: '#E8F3FF'
  },
  {
    name: 'NAS 插件',
    version: '0.9.5',
    desc: '网络存储设备接入和文件管理',
    icon: '☁️',
    color: '#00B42A',
    bgColor: '#E8FFEA'
  },
  {
    name: '流媒体插件',
    version: '2.1.0',
    desc: '视频流处理和转发服务',
    icon: '🎬',
    color: '#F53F3F',
    bgColor: '#FFECE8'
  },
  {
    name: '文件插件',
    version: '1.0.3',
    desc: '多种文件格式解析和预览',
    icon: '📄',
    color: '#722ED1',
    bgColor: '#F5E8FF'
  }
]
*/
</script>

<style lang="scss" scoped>
.plugin-center-page {
  .offline-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .offline-desc {
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--color-text-2);
  }

  .site-row {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;

    .site-label {
      color: var(--color-text-3);
    }

    .site-value {
      color: var(--color-text-1);
      font-family: 'Consolas', 'Monaco', monospace;
    }

    .site-todo {
      color: var(--color-text-3);
    }
  }

  .steps-title {
    margin-top: 20px;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .steps {
    margin: 0;
    padding-left: 20px;
    font-size: 13px;
    line-height: 2;
    color: var(--color-text-2);
  }

  .offline-note {
    margin-top: 16px;
  }
}

// 已隐藏：原静态原型的卡片样式
/*
.plugin-card {
  text-align: center;

  .plugin-icon {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .plugin-emoji {
    font-size: 32px;
  }

  .plugin-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .plugin-version {
    font-size: 12px;
    color: #86909C;
    margin-bottom: 8px;
    font-family: 'JetBrains Mono', monospace;
  }

  .plugin-desc {
    font-size: 13px;
    color: #4E5969;
    line-height: 1.5;
  }
}
*/
</style>
