<template>
  <div class="agent-chat-page">
    <a-row :gutter="0" class="chat-container">
      <!-- 左侧会话列表 -->
      <a-col :span="6" class="chat-sidebar">
        <a-card :bordered="false" class="sidebar-card">
          <template #title>
            <span>{{ $t('agentChat.sessionList') }}</span>
          </template>
          <template #extra>
            <a-button type="primary" size="small" @click="createNewSession">
              <template #icon><icon-plus /></template>
              {{ $t('agentChat.newChat') }}
            </a-button>
          </template>

          <div class="session-list">
            <div
              v-for="session in sessions"
              :key="session.id"
              :class="['session-item', { active: session.id === activeSessionId }]"
              @click="switchSession(session.id)"
            >
              <div class="session-info">
                <div class="session-title">{{ session.title || $t('agentChat.defaultSession') }}</div>
                <div class="session-time">{{ session.updatedAt }}</div>
              </div>
              <a-button
                type="text"
                size="mini"
                class="session-delete"
                @click.stop="deleteSession(session.id)"
              >
                <template #icon><icon-delete /></template>
              </a-button>
            </div>

            <a-empty
              v-if="sessions.length === 0"
              :description="$t('agentChat.defaultSession')"
              style="margin-top: 40px"
            />
          </div>
        </a-card>
      </a-col>

      <!-- 右侧聊天区 -->
      <a-col :span="18" class="chat-main">
        <!-- 消息列表 -->
        <div ref="messageListRef" class="message-list" @scroll="onScroll">
          <!-- 空状态 -->
          <div v-if="currentMessages.length === 0" class="welcome-state">
            <div class="welcome-icon">
              <icon-robot :size="64" />
            </div>
            <h2>{{ $t('agentChat.welcomeTitle') }}</h2>
            <p>{{ $t('agentChat.welcomeDesc') }}</p>
          </div>

          <!-- 消息渲染 -->
          <div
            v-for="(msg, index) in currentMessages"
            :key="index"
            :class="['message-item', msg.role]"
          >
            <!-- 用户消息 -->
            <template v-if="msg.role === 'user'">
              <div class="message-bubble user-bubble">
                <div class="message-content">{{ msg.content }}</div>
              </div>
              <div class="message-avatar">
                <a-avatar :size="32" class="user-avatar">
                  <icon-user />
                </a-avatar>
              </div>
            </template>

            <!-- AI 消息 -->
            <template v-else-if="msg.role === 'assistant'">
              <div class="message-avatar">
                <a-avatar :size="32" class="ai-avatar">
                  <icon-robot />
                </a-avatar>
              </div>
              <div class="message-body">
                <div class="message-bubble ai-bubble">
                  <!-- 流式文本 -->
                  <div class="message-content">
                    <span>{{ msg.content }}</span>
                    <span v-if="msg.isStreaming" class="cursor-blink">|</span>
                  </div>
                  <!-- 内联工具调用 -->
                  <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="tool-calls-inline">
                    <div
                      v-for="(tc, ti) in msg.toolCalls"
                      :key="ti"
                      class="tool-call-card"
                    >
                      <div
                        class="tool-call-header"
                        @click="toggleToolCard(index, ti)"
                      >
                        <span class="tool-call-indicator">
                          <icon-loading v-if="tc.status === 'running'" :spin="true" />
                          <icon-check-circle v-else-if="tc.status === 'done'" style="color: #19c37d" />
                          <icon-close-circle v-else-if="tc.status === 'error'" style="color: #f53f3f" />
                        </span>
                        <span class="tool-call-name">{{ $t('agentChat.toolCalling') }} {{ tc.name }}</span>
                        <icon-down
                          :class="['tool-call-arrow', { expanded: tc.expanded }]"
                        />
                      </div>
                      <div v-if="tc.expanded" class="tool-call-body">
                        <div v-if="tc.args" class="tool-call-section">
                          <div class="tool-call-label">{{ $t('agentChat.toolArgs') }}</div>
                          <pre class="tool-call-json">{{ tc.args }}</pre>
                        </div>
                        <div v-if="tc.result" class="tool-call-section">
                          <div class="tool-call-label">{{ $t('agentChat.toolResult') }}</div>
                          <pre class="tool-call-json">{{ formatJson(tc.result) }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 错误消息 -->
                <div v-if="msg.error" class="message-error">
                  <span>{{ $t('agentChat.errorOccurred') }}：{{ msg.error }}</span>
                  <a-button type="text" size="mini" @click="retryMessage">
                    {{ $t('agentChat.errorRetry') }}
                  </a-button>
                </div>
              </div>
            </template>

            <!-- 独立工具消息（旧格式兼容） -->
            <template v-else-if="msg.role === 'tool'">
              <div class="message-avatar">
                <a-avatar :size="32" class="tool-avatar">
                  <icon-tool />
                </a-avatar>
              </div>
              <div class="message-bubble tool-bubble">
                <div class="tool-call-card standalone">
                  <div class="tool-call-header">
                    <icon-loading v-if="msg.toolStatus === 'running'" :spin="true" />
                    <icon-check-circle v-else style="color: #19c37d" />
                    <span class="tool-call-name">{{ msg.toolName }}</span>
                  </div>
                  <div v-if="msg.toolResult" class="tool-call-body">
                    <pre class="tool-call-json">{{ formatJson(msg.toolResult) }}</pre>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 末端的 anchor，用于自动滚动 -->
          <div ref="scrollAnchorRef" />
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <!-- 参数选择行 -->
          <div class="input-options">
            <div v-if="!hasBoundAgents" class="no-agent-tip">
              <span>{{ $t('agentChat.noAgentBound') }}</span>
              <a-button type="primary" size="mini" @click="goCreateAgent">
                {{ $t('agentChat.goCreateAgent') }}
              </a-button>
            </div>
            <a-space wrap>
              <div class="option-item">
                <span class="option-label">{{ $t('agentChat.selectAgent') }}:</span>
                <a-select
                  v-model="selectedAgentId"
                  size="small"
                  :style="{ width: '180px' }"
                  :placeholder="$t('agentChat.selectAgentPlaceholder')"
                  @change="onAgentChange"
                >
                  <a-option
                    v-for="ag in agentOptions"
                    :key="ag.gisAgentId"
                    :value="ag.gisAgentId"
                  >
                    {{ ag.agentName }}
                  </a-option>
                </a-select>
              </div>
              <a-button
                v-if="currentMessages.length > 0"
                size="small"
                status="warning"
                @click="clearCurrentSession"
              >
                {{ $t('agentChat.clearSession') }}
              </a-button>
            </a-space>
          </div>

          <!-- 输入框 -->
          <div class="input-row">
            <a-textarea
              ref="inputRef"
              v-model="inputMessage"
              :placeholder="$t('agentChat.inputPlaceholder')"
              :auto-size="{ minRows: 1, maxRows: 4 }"
              :disabled="isStreaming"
              class="chat-input"
              @keydown="handleKeydown"
            />
            <a-button
              v-if="!isStreaming"
              type="primary"
              :disabled="!inputMessage.trim() || !selectedAgentId"
              @click="sendMessage"
            >
              <template #icon><icon-send /></template>
              {{ $t('agentChat.send') }}
            </a-button>
            <a-button
              v-else
              status="danger"
              @click="stopStreaming"
            >
              <template #icon><icon-pause /></template>
              {{ $t('agentChat.stop') }}
            </a-button>
          </div>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Modal } from '@arco-design/web-vue'
import {
  IconPlus,
  IconRobot,
  IconUser,
  IconSend,
  IconPause,
  IconTool,
  IconLoading,
  IconCheckCircle,
  IconCloseCircle,
  IconDown,
  IconDelete
} from '@arco-design/web-vue/es/icon'
import { agentChatSSE, getAgentAllList } from '@/api/modules/agent'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const { t } = useI18n()

// ==================== 当前用户 ====================
const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.userId)
const router = useRouter()

// ==================== 会话管理 ====================
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function getSessionStorageKey() {
  return `apex_agent_chat_sessions_${currentUserId.value || 'anonymous'}`
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(getSessionStorageKey())
    const list = raw ? JSON.parse(raw) : []
    const cutoff = Date.now() - SESSION_TTL_MS
    return list.filter(s => (s.lastActiveAt || 0) >= cutoff)
  } catch {
    return []
  }
}

function saveSessions() {
  try {
    // 将内存中的消息回写到 session，保证历史记录持久化
    sessions.value.forEach(s => {
      s.messages = allMessages[s.id] || []
    })
    localStorage.setItem(getSessionStorageKey(), JSON.stringify(sessions.value))
  } catch {
    // ignore
  }
}

const sessions = ref(loadSessions())
const activeSessionId = ref(sessions.value.length > 0 ? sessions.value[0].id : null)

// 当前活跃会话的消息
const allMessages = reactive({})

// 初始化时加载已有消息
sessions.value.forEach(s => {
  allMessages[s.id] = s.messages || []
})

// 消息变更后自动持久化（防抖）
let saveTimer = null
watch(allMessages, () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveSessions(), 300)
}, { deep: true })

const currentMessages = computed(() => {
  return activeSessionId.value ? (allMessages[activeSessionId.value] || []) : []
})

function createNewSession() {
  const session = {
    id: `session_${Date.now()}`,
    title: '',
    updatedAt: formatTime(Date.now()),
    lastActiveAt: Date.now(),
    sessionNo: null
  }
  sessions.value.unshift(session)
  allMessages[session.id] = []
  activeSessionId.value = session.id
  saveSessions()
  nextTick(() => scrollToBottom())
}

function switchSession(id) {
  activeSessionId.value = id
  const session = sessions.value.find(s => s.id === id)
  if (session) {
    session.lastActiveAt = Date.now()
  }
  nextTick(() => scrollToBottom())
}

function clearCurrentSession() {
  Modal.confirm({
    title: t('agentChat.clearSession'),
    content: t('agentChat.clearConfirm'),
    onOk: () => {
      const sid = activeSessionId.value
      if (sid) {
        allMessages[sid] = []
        const session = sessions.value.find(s => s.id === sid)
        if (session) {
          session.sessionNo = null
          session.title = ''
        }
        saveSessions()
        nextTick(() => scrollToBottom())
      }
    }
  })
}

function updateSessionMeta(sessionId, updates) {
  const session = sessions.value.find(s => s.id === sessionId)
  if (session) {
    Object.assign(session, updates)
    session.updatedAt = formatTime(Date.now())
    session.lastActiveAt = Date.now()
    saveSessions()
  }
}

function deleteSession(id) {
  Modal.confirm({
    title: t('agentChat.deleteSession'),
    content: t('agentChat.deleteSessionConfirm'),
    onOk: () => {
      delete allMessages[id]
      const idx = sessions.value.findIndex(s => s.id === id)
      if (idx !== -1) {
        sessions.value.splice(idx, 1)
      }
      if (activeSessionId.value === id) {
        activeSessionId.value = sessions.value[0]?.id || null
      }
      saveSessions()
      nextTick(() => scrollToBottom())
    }
  })
}

// ==================== 消息与流 ====================
const selectedAgentId = ref(null)
const agentOptions = ref([])
const hasBoundAgents = computed(() => agentOptions.value.length > 0)
const inputMessage = ref('')
const isStreaming = ref(false)
const messageListRef = ref(null)
const scrollAnchorRef = ref(null)
const inputRef = ref(null)
const shouldAutoScroll = ref(true)
let abortController = null

function goCreateAgent() {
  router.push('/controller/agent/index')
}

function formatTime(ts) {
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function scrollToBottom() {
  if (shouldAutoScroll.value) {
    nextTick(() => {
      scrollAnchorRef.value?.scrollIntoView({ behavior: 'smooth' })
    })
  }
}

function onScroll() {
  if (!messageListRef.value) return
  const el = messageListRef.value
  const threshold = 80
  shouldAutoScroll.value = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
}

// 获取当前会话的消息列表（确保响应式）
function getCurrentMessages() {
  const sid = activeSessionId.value
  if (!sid) return []
  if (!allMessages[sid]) allMessages[sid] = []
  return allMessages[sid]
}

function addMessage(msg) {
  const msgs = getCurrentMessages()
  msgs.push(msg)
  scrollToBottom()
}

function updateLastAssistant(updates) {
  const msgs = getCurrentMessages()
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'assistant') {
      Object.assign(msgs[i], updates)
      scrollToBottom()
      return
    }
  }
}

function getLastAssistant() {
  const msgs = getCurrentMessages()
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'assistant') return msgs[i]
  }
  return null
}

async function sendMessage() {
  const content = inputMessage.value.trim()
  if (!content || isStreaming.value) return

  if (!selectedAgentId.value) {
    Message.warning(t('agentChat.selectAgentRequired'))
    return
  }

  // 确保有活跃会话
  if (!activeSessionId.value) {
    createNewSession()
  }

  // 自动生成会话标题（用第一条消息）
  const session = sessions.value.find(s => s.id === activeSessionId.value)
  if (session && !session.title) {
    session.title = content.slice(0, 30) + (content.length > 30 ? '...' : '')
    saveSessions()
  }

  // 添加用户消息
  addMessage({ role: 'user', content, timestamp: Date.now() })
  inputMessage.value = ''

  // 模型/供应商由所选智能体配置决定
  const reqBody = { message: content, agent_id: selectedAgentId.value }

  const sid = activeSessionId.value
  const currentSession = sessions.value.find(s => s.id === sid)
  if (currentSession?.sessionNo) {
    reqBody.session_no = currentSession.sessionNo
  }

  // 开始流式
  isStreaming.value = true
  abortController = new AbortController()

  // 先添加一个空的 assistant 消息占位
  const assistantMsg = {
    role: 'assistant',
    content: '',
    isStreaming: true,
    toolCalls: [],
    timestamp: Date.now()
  }
  addMessage(assistantMsg)

  try {
    const body = await agentChatSSE({
      ...reqBody,
      signal: abortController.signal
    })

    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // 保留最后一个不完整的行
      buffer = lines.pop() || ''

      for (const line of lines) {
        processSSELine(line.trim())
      }
    }

    // 处理剩余 buffer
    if (buffer.trim()) {
      for (const line of buffer.split('\n')) {
        processSSELine(line.trim())
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // 用户主动停止
    } else {
      updateLastAssistant({ error: err.message })
    }
  } finally {
    // 标记流结束
    const last = getLastAssistant()
    if (last) {
      last.isStreaming = false
      last.toolCalls?.forEach(tc => {
        if (tc.status === 'running') tc.status = 'error'
      })
    }
    isStreaming.value = false
    abortController = null
  }
}

function processSSELine(line) {
  if (!line.startsWith('data: ')) return

  let event
  try {
    event = JSON.parse(line.slice(6))
  } catch {
    return
  }

  const last = getLastAssistant()

  switch (event.type) {
    case 'session': {
      // 记录 session_no，用于后续继续对话
      const sid = activeSessionId.value
      const currentSession = sessions.value.find(s => s.id === sid)
      if (currentSession && event.session_no) {
        currentSession.sessionNo = event.session_no
        saveSessions()
      }
      break
    }

    case 'text_delta': {
      if (last) {
        last.content += event.delta || ''
        scrollToBottom()
      }
      break
    }

    case 'tool_start': {
      if (last) {
        if (!last.toolCalls) last.toolCalls = []
        last.toolCalls.push({
          name: event.tool_name || '',
          args: '',
          result: '',
          status: 'running',
          expanded: false
        })
        scrollToBottom()
      }
      break
    }

    case 'tool_args': {
      if (last?.toolCalls?.length > 0) {
        const tc = last.toolCalls[last.toolCalls.length - 1]
        tc.args += event.tool_args || ''
        scrollToBottom()
      }
      break
    }

    case 'tool_end': {
      // 工具调用参数接收完毕
      break
    }

    case 'tool_result': {
      if (last?.toolCalls?.length > 0) {
        const tc = last.toolCalls[last.toolCalls.length - 1]
        tc.result = event.tool_result || ''
        tc.status = 'done'
        scrollToBottom()
      }
      break
    }

    case 'done': {
      if (last) {
        last.isStreaming = false
      }
      updateSessionMeta(activeSessionId.value, {})
      break
    }

    case 'error': {
      if (last) {
        last.error = event.error || t('agentChat.errorOccurred')
        last.isStreaming = false
      }
      break
    }
  }
}

function stopStreaming() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}

function retryMessage() {
  const msgs = getCurrentMessages()
  // 找到最后一个用户消息重新发送
  let lastUserContent = ''
  // 移除失败的 assistant 消息
  while (msgs.length > 0) {
    const last = msgs[msgs.length - 1]
    if (last.role === 'assistant') {
      msgs.pop()
    } else if (last.role === 'user') {
      lastUserContent = last.content
      break
    } else {
      msgs.pop()
    }
    if (msgs.length === 0) break
  }
  if (lastUserContent) {
    inputMessage.value = lastUserContent
    nextTick(() => sendMessage())
  }
}

// ==================== 输入处理 ====================
function handleKeydown(e) {
  // Enter 发送，Shift+Enter 换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (!e.composing) {
      sendMessage()
    }
  }
}

// ==================== 智能体选择 ====================
const fetchAgentOptions = async () => {
  try {
    const res = await getAgentAllList()
    const all = res.rows || res.data?.rows || []
    // 只显示当前登录用户绑定的智能体
    agentOptions.value = all.filter(
      a => currentUserId.value != null && String(a.userId) === String(currentUserId.value)
    )
    // 默认选中第一个绑定的智能体
    if (!selectedAgentId.value && agentOptions.value.length > 0) {
      selectedAgentId.value = agentOptions.value[0].gisAgentId
      onAgentChange(selectedAgentId.value)
    }
  } catch (e) {
    agentOptions.value = []
  }
}

function onAgentChange(val) {
  const sid = activeSessionId.value
  if (sid) {
    updateSessionMeta(sid, { agentId: val })
  }
}

// 工具卡片展开/折叠
function toggleToolCard(msgIndex, toolIndex) {
  const msgs = getCurrentMessages()
  if (msgs[msgIndex]?.toolCalls?.[toolIndex]) {
    msgs[msgIndex].toolCalls[toolIndex].expanded = !msgs[msgIndex].toolCalls[toolIndex].expanded
  }
}

// JSON 格式化
function formatJson(raw) {
  if (typeof raw === 'object') return JSON.stringify(raw, null, 2)
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchAgentOptions()
})

onBeforeUnmount(() => {
  stopStreaming()
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveSessions()
  }
})
</script>

<style scoped>
.agent-chat-page {
  height: calc(100vh - 120px);
  min-height: 600px;
}

.chat-container {
  height: 100%;
}

/* === 左侧边栏 === */
.chat-sidebar {
  height: 100%;
  border-right: 1px solid var(--color-border-2);
}

.sidebar-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-card :deep(.arco-card-body) {
  flex: 1;
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-delete {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.session-item:hover .session-delete {
  opacity: 1;
}

.session-item:hover {
  background: var(--color-fill-2);
}

.session-item.active {
  background: var(--color-primary-light-1);
}

.session-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.session-time {
  font-size: 11px;
  color: var(--color-text-3);
}

/* === 右侧主区域 === */
.chat-main {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-fill-1);
}

/* 消息列表 */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

/* 空状态 */
.welcome-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-3);
}

.welcome-icon {
  margin-bottom: 16px;
  color: var(--color-text-4);
  opacity: 0.5;
}

.welcome-state h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: var(--color-text-2);
}

.welcome-state p {
  margin: 0;
  font-size: 14px;
}

/* 消息项 */
.message-item {
  display: flex;
  margin-bottom: 20px;
  gap: 10px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar {
  background: var(--color-primary-light-2);
  color: var(--color-primary-6);
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.tool-avatar {
  background: var(--color-warning-light-2);
  color: var(--color-warning-6);
}

.message-body {
  max-width: 75%;
  min-width: 0;
}

/* 消息气泡 */
.message-bubble {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.user-bubble {
  background: var(--color-primary-light-1);
  color: var(--color-text-1);
  border-bottom-right-radius: 4px;
}

.ai-bubble {
  background: var(--color-bg-2);
  color: var(--color-text-1);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.tool-bubble {
  background: var(--color-warning-light-1);
  max-width: 85%;
  padding: 0;
  overflow: hidden;
}

.message-content {
  white-space: pre-wrap;
}

.cursor-blink {
  animation: blink 0.8s infinite;
  color: var(--color-primary-6);
  font-weight: 100;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* 错误消息 */
.message-error {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-danger-6);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* === 工具调用卡片 === */
.tool-calls-inline {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-call-card {
  background: var(--color-fill-1);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-border-2);
}

.tool-call-card.standalone {
  background: transparent;
  border: none;
}

.tool-call-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-2);
  user-select: none;
}

.tool-call-header:hover {
  background: var(--color-fill-2);
}

.tool-call-indicator {
  display: flex;
  align-items: center;
}

.tool-call-name {
  flex: 1;
}

.tool-call-arrow {
  transition: transform 0.2s;
  font-size: 12px;
}

.tool-call-arrow.expanded {
  transform: rotate(180deg);
}

.tool-call-body {
  padding: 8px 10px;
  border-top: 1px solid var(--color-border-2);
}

.tool-call-section {
  margin-bottom: 6px;
}

.tool-call-section:last-child {
  margin-bottom: 0;
}

.tool-call-label {
  font-size: 11px;
  color: var(--color-text-3);
  margin-bottom: 4px;
  font-weight: 500;
}

.tool-call-json {
  font-size: 12px;
  background: var(--color-fill-2);
  padding: 6px 8px;
  border-radius: 4px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  color: var(--color-text-2);
  line-height: 1.5;
}

/* === 输入区域 === */
.input-area {
  padding: 12px 24px 16px;
  border-top: 1px solid var(--color-border-2);
  background: var(--color-bg-2);
}

.input-options {
  margin-bottom: 10px;
}

.no-agent-tip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: var(--color-warning-light-1);
  color: var(--color-warning-6);
  font-size: 13px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.option-label {
  font-size: 12px;
  color: var(--color-text-3);
  white-space: nowrap;
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
}

.chat-input :deep(textarea) {
  font-size: 14px;
  line-height: 1.6;
  resize: none;
}
</style>
