<template>
  <div class="maintenance-page">
    <a-alert type="warning" style="margin-top: 16px">
      {{ $t('settingsMaintenance.highRiskAlert') }}
    </a-alert>

    <!-- 固件升级 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div class="section-title">
          <icon-arrow-rise />
          <span>{{ $t('settingsMaintenance.firmwareUpgrade') }}</span>
          <a-tag v-if="!isDocker" color="orange" size="small">{{ $t('settingsMaintenance.reserved') }}</a-tag>
        </div>
      </template>

      <!-- Docker 环境 -->
      <template v-if="isDocker">
        <a-alert type="info">
          <template #title>{{ $t('settingsMaintenance.dockerUpgradeTitle') }}</template>
          <div class="docker-hint">
            <p>{{ $t('settingsMaintenance.dockerUpgradeHint1') }}</p>
            <pre class="code-block">
# 拉取最新镜像
docker pull your-image:latest

# 停止并重建容器
docker compose down
docker compose up -d

# 或直接更新
docker compose pull && docker compose up -d</pre>
            <p class="hint-text">{{ $t('settingsMaintenance.dockerUpgradeHint2') }}</p>
          </div>
        </a-alert>
      </template>

      <!-- 物理设备 -->
      <template v-else>
        <a-spin :loading="firmwareLoading" style="width: 100%">
          <a-descriptions :column="3" bordered size="small">
            <a-descriptions-item :label="$t('settingsMaintenance.currentVersion')">{{ firmwareInfo.current_version || '-' }}</a-descriptions-item>
            <a-descriptions-item :label="$t('settingsMaintenance.latestVersion')">
              <span v-if="firmwareInfo.latest_version">{{ firmwareInfo.latest_version }}</span>
              <span v-else style="color: var(--color-text-4)">{{ $t('settingsMaintenance.noLatestVersion') }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="$t('settingsMaintenance.hasUpgrade')">
              <a-tag :color="firmwareInfo.has_upgrade ? 'green' : 'gray'" size="small">
                {{ firmwareInfo.has_upgrade ? $t('settingsMaintenance.hasNewVersion') : $t('settingsMaintenance.isLatest') }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>

          <div style="margin-top: 16px">
            <a-space>
              <a-input
                v-model="upgradeVersion"
                :placeholder="$t('settingsMaintenance.targetVersion')"
                style="width: 200px"
              />
              <a-popconfirm :content="$t('settingsMaintenance.confirmUpgrade')" @ok="handleUpgrade">
                <a-button
                  type="primary"
                  status="warning"
                  :loading="upgrading"
                  :disabled="!upgradeVersion"
                >
                  <template #icon><icon-arrow-rise /></template>
                  {{ $t('settingsMaintenance.executeUpgrade') }}
                </a-button>
              </a-popconfirm>
              <a-button @click="loadFirmware">
                <template #icon><icon-refresh /></template>
                {{ $t('settingsMaintenance.checkUpdate') }}
              </a-button>
            </a-space>
          </div>
        </a-spin>
      </template>
    </a-card>

    <!-- 关机 / 重启 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div class="section-title">
          <icon-poweroff />
          <span>{{ $t('settingsMaintenance.powerControl') }}</span>
        </div>
      </template>

      <!-- Docker 环境 -->
      <template v-if="isDocker">
        <a-alert type="info">
          <template #title>{{ $t('settingsMaintenance.dockerPowerTitle') }}</template>
          <div class="docker-hint">
            <p>{{ $t('settingsMaintenance.dockerPowerHint1') }}</p>
            <pre class="code-block">
# 重启容器
docker restart container-name

# 停止容器
docker stop container-name

# 使用 compose
docker compose restart
docker compose down</pre>
            <p class="hint-text">{{ $t('settingsMaintenance.dockerPowerHint2') }} <code>docker start</code> 或 <code>docker compose up -d</code>。</p>
          </div>
        </a-alert>
      </template>

      <!-- 物理设备 -->
      <template v-else>
        <a-space>
          <a-popconfirm :content="$t('settingsMaintenance.confirmReboot')" @ok="handleReboot">
            <a-button status="warning" :loading="rebooting">
              <template #icon><icon-refresh /></template>
              {{ $t('settingsMaintenance.rebootDevice') }}
            </a-button>
          </a-popconfirm>
          <a-popconfirm :content="$t('settingsMaintenance.confirmShutdown')" @ok="handleShutdown">
            <a-button status="danger" :loading="shuttingDown">
              <template #icon><icon-poweroff /></template>
              {{ $t('settingsMaintenance.shutdown') }}
            </a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </a-card>

    <!-- 备份恢复 -->
    <a-card :bordered="false" style="margin-top: 16px">
      <template #title>
        <div class="section-title">
          <icon-save />
          <span>{{ $t('settingsMaintenance.backupRestore') }}</span>
          <a-tag v-if="!isDocker" color="orange" size="small">{{ $t('settingsMaintenance.reserved') }}</a-tag>
        </div>
      </template>

      <!-- Docker 环境 -->
      <template v-if="isDocker">
        <a-alert type="info">
          <template #title>{{ $t('settingsMaintenance.dockerBackupTitle') }}</template>
          <div class="docker-hint">
            <p>{{ $t('settingsMaintenance.dockerBackupHint') }}</p>
            <pre class="code-block">
# 备份数据卷
docker run --rm -v volume-name:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz -C /data .

# 恢复数据卷
docker run --rm -v volume-name:/data -v $(pwd):/backup \
  alpine tar xzf /backup/backup.tar.gz -C /data

# 使用 compose 查看挂载
docker compose config | grep -A5 volumes</pre>
            <p class="hint-text">{{ $t('settingsMaintenance.dockerBackupHint2') }}</p>
          </div>
        </a-alert>
      </template>

      <!-- 物理设备 -->
      <template v-else>
        <a-spin :loading="backupLoading" style="width: 100%">
          <a-descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
            <a-descriptions-item :label="$t('settingsMaintenance.lastBackupTime')">
              {{ backupInfo.last_backup_time || $t('settingsMaintenance.noBackup') }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('settingsMaintenance.backupCount')">{{ backupInfo.backup_count ?? 0 }}</a-descriptions-item>
          </a-descriptions>

          <a-space>
            <a-button type="primary" :loading="backingUp" @click="handleBackup">
              <template #icon><icon-download /></template>
              {{ $t('settingsMaintenance.backupNow') }}
            </a-button>

            <a-input
              v-model="restoreBackupId"
              :placeholder="$t('settingsMaintenance.backupIdPlaceholder')"
              style="width: 280px"
            />
            <a-popconfirm :content="$t('settingsMaintenance.confirmRestore')" @ok="handleRestore">
              <a-button
                status="warning"
                :loading="restoring"
                :disabled="!restoreBackupId"
              >
                <template #icon><icon-upload /></template>
                {{ $t('settingsMaintenance.restoreBackup') }}
              </a-button>
            </a-popconfirm>
          </a-space>
        </a-spin>
      </template>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { useUserStore } from '@/stores/user'
import {
  getFirmwareInfo, upgradeFirmware,
  shutdown, reboot,
  getBackupInfo, createBackup, restoreBackup
} from '@/api/modules/gisSettings'

const { t } = useI18n()
const userStore = useUserStore()
const { isDocker } = storeToRefs(userStore)

// ============ 固件升级 ============
const firmwareLoading = ref(false)
const firmwareInfo = ref({})
const upgradeVersion = ref('')
const upgrading = ref(false)

const loadFirmware = async () => {
  if (isDocker.value) return
  firmwareLoading.value = true
  try {
    const res = await getFirmwareInfo()
    firmwareInfo.value = res.data || {}
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    firmwareLoading.value = false
  }
}

const handleUpgrade = async () => {
  if (!upgradeVersion.value) {
    Message.warning(t('settingsMaintenance.versionRequired'))
    return
  }
  upgrading.value = true
  try {
    await upgradeFirmware({ version: upgradeVersion.value })
    Message.success(t('settingsMaintenance.upgradeSuccess'))
    loadFirmware()
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    upgrading.value = false
  }
}

// ============ 关机 / 重启 ============
const rebooting = ref(false)
const shuttingDown = ref(false)

const handleReboot = async () => {
  rebooting.value = true
  try {
    await reboot()
    Message.success(t('settingsMaintenance.rebootSuccess'))
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    rebooting.value = false
  }
}

const handleShutdown = async () => {
  shuttingDown.value = true
  try {
    await shutdown()
    Message.success(t('settingsMaintenance.shutdownSuccess'))
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    shuttingDown.value = false
  }
}

// ============ 备份恢复 ============
const backupLoading = ref(false)
const backupInfo = ref({})
const backingUp = ref(false)
const restoring = ref(false)
const restoreBackupId = ref('')

const loadBackupInfo = async () => {
  if (isDocker.value) return
  backupLoading.value = true
  try {
    const res = await getBackupInfo()
    backupInfo.value = res.data || {}
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    backupLoading.value = false
  }
}

const handleBackup = async () => {
  backingUp.value = true
  try {
    await createBackup({ description: '手动备份' })
    Message.success(t('settingsMaintenance.backupSuccess'))
    loadBackupInfo()
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    backingUp.value = false
  }
}

const handleRestore = async () => {
  if (!restoreBackupId.value) {
    Message.warning(t('settingsMaintenance.backupIdRequired'))
    return
  }
  restoring.value = true
  try {
    await restoreBackup({ backup_id: restoreBackupId.value })
    Message.success(t('settingsMaintenance.restoreSuccess'))
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    restoring.value = false
  }
}

onMounted(() => {
  loadFirmware()
  loadBackupInfo()
})
</script>

<style scoped>
.maintenance-page {
  padding: 0 0 24px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title svg {
  font-size: 18px;
}
.docker-hint {
  margin-top: 8px;
}
.docker-hint p {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--color-text-2);
}
.code-block {
  background: var(--color-fill-2);
  padding: 12px 16px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-text-1);
  margin: 8px 0;
  white-space: pre;
  overflow-x: auto;
}
.hint-text {
  margin-top: 8px !important;
  color: var(--color-text-3) !important;
  font-size: 12px !important;
}
</style>
