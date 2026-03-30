<template>
  <div class="ai-chat-page">
    <a-row :gutter="24">
      <a-col :xs="24" :lg="8" :xl="7">
        <a-card :bordered="false" class="session-card">
          <template #title>
            <div class="panel-title">
              <span>历史会话</span>
              <a-button type="link" @click="startNewSession">新对话</a-button>
            </div>
          </template>

          <a-spin :spinning="sessionsLoading">
            <Conversations
                :items="conversationItems"
                :active-key="currentSessionId"
                :menu="conversationMenu"
                @active-change="selectSession"
                style="width: 100%"
            />
          </a-spin>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="16" :xl="17">
        <a-card :bordered="false" class="chat-card">
          <template #title>
            <div class="panel-title">
              <span>AI 指令助手</span>
              <a-tag color="blue">Beta</a-tag>
            </div>
          </template>

          <a-alert type="info" show-icon class="pageAlert">
            <template #message>AI也会出错，在执行删除、修改等操作时注意核对信息！</template>
          </a-alert>

          <div class="chat-container" ref="chatContainerRef">
            <Welcome
                v-if="messages.length === 0"
                icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
                title="AI 指令助手"
                description="输入自然语言，让 AI 生成任务草案。例如：创建一个每天凌晨3点执行的日志清理任务"
            />

            <div v-else class="bubble-list-wrapper" ref="bubbleListWrapperRef">
              <BubbleList
                  ref="bubbleListRef"
                  :roles="bubbleRoles"
                  :items="bubbleItems"
              />
            </div>
          </div>

          <a-card v-if="currentDraft" size="small" class="draft-card">
            <template #title>当前草案</template>
            <a-descriptions :column="1" size="small" bordered>
              <a-descriptions-item label="操作类型">
                <a-tag :color="draftActionColor">{{ draftActionLabel }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item v-if="currentDraft.action !== 'delete_job'" label="任务函数">{{ currentDraft.payload?.func || '-' }}</a-descriptions-item>
              <a-descriptions-item v-if="currentDraft.action !== 'delete_job'" label="触发器">{{ currentDraft.payload?.trigger || '-' }}</a-descriptions-item>
              <a-descriptions-item v-if="currentDraft.action === 'delete_job'" label="任务ID">{{ currentDraft.payload?.job_id || '-' }}</a-descriptions-item>
              <a-descriptions-item v-if="currentDraft.action === 'delete_job'" label="任务名称">{{ currentDraft.payload?.job_name || '-' }}</a-descriptions-item>
              <a-descriptions-item label="参数预览">
                <pre class="draft-json">{{ formatJson(currentDraft.payload) }}</pre>
              </a-descriptions-item>
            </a-descriptions>
            <a-flex justify="space-between" align="center" style="margin-top: 16px" wrap="wrap" gap="small">
              <a-typography-text type="secondary">{{ draftHintText }}</a-typography-text>
              <a-space>
                <a-button @click="cancelDraft">取消</a-button>
                <a-button :type="currentDraft.action === 'delete_job' ? 'primary' : 'primary'" :danger="currentDraft.action === 'delete_job'" @click="confirmDraft">
                  {{ draftButtonText }}
                </a-button>
              </a-space>
            </a-flex>
          </a-card>
          <a-flex gap="middle" vertical>
            <a-collapse v-if="toolCalls.length > 0" class="tool-call-panel">
              <a-collapse-panel key="1">
                <template #header>
                  <a-space>
                    <BugOutlined/>
                    <span>调试信息</span>
                    <a-tag size="small">{{ toolCalls.length }}</a-tag>
                  </a-space>
                </template>
                <div class="tool-call-list">
<div v-for="tool in toolCalls" :key="tool.id || tool.name || tool.created_at" class="tool-call-item">
                     <div class="tool-call-header">
                       <a-space align="center">
                         <CodeOutlined/>
                         <span class="tool-call-name">{{ tool.tool_name || tool.name }}</span>
                         <a-tag v-if="tool.status" :color="getToolStatusColor(tool.status)" size="small">
                           {{ tool.status }}
                         </a-tag>
                       </a-space>
                     </div>
                     <div class="tool-call-body">
                       <div class="tool-call-section">
                         <div class="tool-call-label">参数</div>
                         <pre class="tool-call-code">{{ formatToolArgs(tool) }}</pre>
                       </div>
                       <div v-if="'tool_result' in tool || tool.result" class="tool-call-section">
                         <div class="tool-call-label">结果</div>
                         <pre class="tool-call-code">{{ formatToolResult(tool) }}</pre>
                       </div>
                     </div>
                   </div>
                </div>
              </a-collapse-panel>
            </a-collapse>
            <Sender
                v-model:value="messageText"
                :loading="sending"
                placeholder="例如：创建一个每天凌晨3点执行的日志清理任务"
                :auto-size="{ minRows: 3, maxRows: 6 }"
                @submit="sendMessage"
                @cancel="cancelSending"
                clearable
            />
          </a-flex>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import {computed, h, onMounted, ref, watch} from 'vue'
import {message} from 'ant-design-vue'
import {BubbleList, Conversations, Sender, Welcome} from 'ant-design-x-vue'
import type {BubbleListProps, ConversationsProps} from 'ant-design-x-vue'
import {UserOutlined, DeleteOutlined, BugOutlined, CodeOutlined} from '@ant-design/icons-vue'
import MarkdownIt from 'markdown-it'
import {
  deleteAiSession,
  getAiSessionDetail,
  getAiSessions,
  sendAiChatStream
} from '../../api/index'
import type {
  AiDraft,
  AiMessageItem,
  AiSessionItem,
  AiToolCall,
  AiToolCallRecord
} from '../../types/api'

const md = new MarkdownIt({html: true, breaks: true, linkify: true})

const sessions = ref<AiSessionItem[]>([])
const messages = ref<AiMessageItem[]>([])
const toolCalls = ref<Array<AiToolCallRecord | AiToolCall>>([])
const currentSessionId = ref('')
const messageText = ref('')
const currentDraft = ref<AiDraft | null>(null)

const sessionsLoading = ref(false)
const sending = ref(false)

const bubbleListRef = ref<InstanceType<typeof BubbleList>>(null)
const chatContainerRef = ref<HTMLElement | null>(null)
const bubbleListWrapperRef = ref<HTMLElement | null>(null)

let scrollTimeout: ReturnType<typeof setTimeout> | null = null
const scrollToBottom = (immediate = false) => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  const delay = immediate ? 0 : 50
  scrollTimeout = setTimeout(() => {
    if (bubbleListWrapperRef.value) {
      bubbleListWrapperRef.value.scrollTop = bubbleListWrapperRef.value.scrollHeight
    }
  }, delay)
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

const conversationItems = computed<ConversationsProps['items']>(() => {
  return sessions.value.map(item => ({
    key: item.id,
    label: item.title || '未命名会话',
    timestamp: new Date(item.updated_at).getTime(),
    icon: item.model
  }))
})

const conversationMenu: ConversationsProps['menu'] = (conversation) => ({
  items: [
    {
      label: '删除',
      key: 'delete',
      icon: h(DeleteOutlined),
      danger: true
    }
  ],
  onClick: (menuInfo) => {
    menuInfo.domEvent.stopPropagation()
    if (menuInfo.key === 'delete') {
      removeSession(conversation.key as string)
    }
  }
})

const renderMarkdown = (content: string) => {
  return h('div', {
    class: 'markdown-content',
    innerHTML: md.render(content || '')
  })
}

const bubbleRoles: BubbleListProps['roles'] = {
  user: {
    placement: 'end',
    avatar: {icon: h(UserOutlined), style: {background: '#87d068'}},
    variant: 'filled',
    styles: {content: {background: '#1677ff', color: '#fff'}}
  },
  assistant: {
    placement: 'start',
    avatar: {icon: h(UserOutlined), style: {background: '#fde3cf'}},
    variant: 'outlined',
    typing: {step: 5, interval: 30},
    loadingRender: () => h('span', {class: 'streaming-cursor'}, '▊'),
    messageRender: renderMarkdown
  }
}

const bubbleItems = computed<BubbleListProps['items']>(() => {
  return messages.value.map((item) => ({
    key: String(item.id),
    role: item.role,
    content: item.content,
    loading: item.role === 'assistant' && sending.value && !item.content
  }))
})

const draftActionLabel = computed(() => {
  const action = currentDraft.value?.action
  if (action === 'create_job') return '创建任务'
  if (action === 'update_job') return '修改任务'
  if (action === 'delete_job') return '删除任务'
  return action || '-'
})

const draftActionColor = computed(() => {
  const action = currentDraft.value?.action
  if (action === 'create_job') return 'green'
  if (action === 'update_job') return 'blue'
  if (action === 'delete_job') return 'red'
  return 'default'
})

const draftButtonText = computed(() => {
  const action = currentDraft.value?.action
  if (action === 'create_job') return '填入任务表单'
  if (action === 'update_job') return '修改任务'
  if (action === 'delete_job') return '确认删除'
  return '确认'
})

const draftHintText = computed(() => {
  const action = currentDraft.value?.action
  if (action === 'create_job') return '确认后会跳转到任务页并自动填入表单'
  if (action === 'update_job') return '确认后会跳转到任务详情页进行修改'
  if (action === 'delete_job') return '删除操作不可恢复，请确认任务信息'
  return ''
})

const loadSessions = async (autoSelect = true) => {
  sessionsLoading.value = true
  try {
    const res = await getAiSessions()
    if (res.code === 200) {
      sessions.value = res.data || []
      if (autoSelect && sessions.value.length > 0 && !currentSessionId.value) {
        await selectSession(sessions.value[0].id)
      }
    }
  } catch (error) {
    console.error('加载 AI 会话失败:', error)
  } finally {
    sessionsLoading.value = false
  }
}

const selectSession = async (sessionId: string) => {
  if (!sessionId) return
  currentSessionId.value = sessionId

  try {
    const res = await getAiSessionDetail(sessionId)
    if (res.code === 200 && res.data) {
      messages.value = res.data.messages || []
      toolCalls.value = res.data.tool_calls || []
      currentDraft.value = null
      scrollToBottom()
    }
  } catch (error) {
    message.error('加载会话详情失败')
    console.error('加载会话详情失败:', error)
  }
}

const startNewSession = () => {
  currentSessionId.value = ''
  messages.value = []
  toolCalls.value = []
  currentDraft.value = null
  messageText.value = ''
}

const sendChatMessage = async (content: string) => {
  if (!content.trim()) return

  sending.value = true
  toolCalls.value = []
  currentDraft.value = null

  const sessionIdAtSend = currentSessionId.value
  const userMessageId = Date.now()
  const assistantMessageId = userMessageId + 1

  const newMessages: AiMessageItem[] = [
    {
      id: userMessageId,
      session_id: sessionIdAtSend,
      role: 'user',
      content,
      created_at: new Date().toISOString()
    },
    {
      id: assistantMessageId,
      session_id: sessionIdAtSend,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString()
    }
  ]

  messages.value = [...messages.value, ...newMessages]
  scrollToBottom(true)

  try {
    await sendAiChatStream(
        {
          message: content,
          session_id: sessionIdAtSend || null,
          mode: 'draft'
        },
        {
          onChunk: (chunk: string) => {
            const idx = messages.value.findIndex(m => m.id === assistantMessageId)
            if (idx !== -1) {
              const updated = { ...messages.value[idx], content: messages.value[idx].content + chunk }
              messages.value.splice(idx, 1, updated)
            }
          },
          onComplete: (data) => {
            if (currentSessionId.value !== sessionIdAtSend && currentSessionId.value !== '') {
              loadSessions(false)
              sending.value = false
              return
            }

            currentSessionId.value = data.session_id
            toolCalls.value = data.tool_calls || []
            currentDraft.value = data.draft || null

            const idx = messages.value.findIndex(m => m.id === assistantMessageId)
            if (idx !== -1) {
              const updated = {
                ...messages.value[idx],
                session_id: data.session_id,
                content: data.reply || messages.value[idx].content
              }
              messages.value.splice(idx, 1, updated)
            }

            loadSessions(false)
            sending.value = false
          },
          onError: (error) => {
            console.error('发送 AI 消息失败:', error)
            message.error('发送消息失败，请重试')
            messages.value = messages.value.filter(msg => msg.id !== assistantMessageId)
            sending.value = false
          }
        }
    )
  } catch (error) {
    console.error('发送 AI 消息失败:', error)
    message.error('发送消息失败')
    messages.value = messages.value.filter(msg => msg.id !== assistantMessageId)
    sending.value = false
  }
}

const sendMessage = async () => {
  const content = messageText.value.trim()
  if (!content) {
    message.warning('请输入指令内容')
    return
  }
  messageText.value = ''
  await sendChatMessage(content)
}

const confirmDraft = async () => {
  if (!currentDraft.value) return
  const draft = currentDraft.value
  currentDraft.value = null
  await sendChatMessage('确认')
}

const cancelDraft = async () => {
  if (!currentDraft.value) return
  currentDraft.value = null
  await sendChatMessage('取消')
}

const cancelSending = () => {
  sending.value = false
}

const removeSession = async (sessionId: string) => {
  try {
    await deleteAiSession(sessionId)
    sessions.value = sessions.value.filter(item => item.id !== sessionId)

    if (currentSessionId.value === sessionId) {
      startNewSession()
    }

    message.success('会话已删除')
  } catch (error) {
    message.error('删除会话失败')
    console.error('删除会话失败:', error)
  }
}

const formatJson = (payload: unknown) => JSON.stringify(payload || {}, null, 2)

const getToolStatusColor = (status: string) => {
  if (status === 'success') return 'success'
  if (status === 'error') return 'error'
  if (status === 'running') return 'processing'
  return 'default'
}

const formatToolArgs = (tool: AiToolCallRecord | AiToolCall) => {
  if ('tool_args' in tool) {
    return JSON.stringify(safeParse(tool.tool_args), null, 2)
  }
  const args = typeof tool.arguments === 'string' ? safeParse(tool.arguments) : tool.arguments
  return JSON.stringify(args, null, 2)
}

const formatToolResult = (tool: AiToolCallRecord | AiToolCall) => {
  if ('tool_result' in tool) {
    return JSON.stringify(safeParse(tool.tool_result), null, 2)
  }
  if (tool.result) {
    const result = typeof tool.result === 'string' ? safeParse(tool.result) : tool.result
    return JSON.stringify(result, null, 2)
  }
  return '-'
}

const safeParse = (value: string) => {
  try {
    return JSON.parse(value)
  } catch (_error) {
    return value
  }
}

onMounted(async () => {
  await loadSessions()
})
</script>

<style scoped lang="scss">
.ai-chat-page {
  .panel-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .pageAlert {
    margin-bottom: 16px;
  }

  .session-card,
  .chat-card {
    border-radius: 16px;
    background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
    box-shadow: 0 16px 36px rgba(16, 24, 40, 0.06);
  }

  .chat-container {
    min-height: 320px;
    margin-bottom: 20px;

    .bubble-list-wrapper {
      max-height: 520px;
      overflow-y: auto;
      padding: 8px 4px;
    }
  }

  .draft-card,
  .tool-call-panel {
    margin-top: 16px;
  }

  .tool-call-panel {
    background: #fafafa;
    border-radius: 12px;

    :deep(.ant-collapse-header) {
      padding: 12px 16px;
      font-weight: 500;
    }

    :deep(.ant-collapse-content) {
      border-top: 1px solid #e8e8e8;
    }
  }

  .tool-call-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tool-call-item {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #e8e8e8;
    overflow: hidden;
  }

  .tool-call-header {
    padding: 10px 12px;
    background: #f5f7fa;
    border-bottom: 1px solid #e8e8e8;
  }

  .tool-call-name {
    font-weight: 600;
    color: #1f2937;
  }

  .tool-call-body {
    padding: 12px;
  }

  .tool-call-section {
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .tool-call-label {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .tool-call-code {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.5;
    background: #f6f8fb;
    padding: 8px 12px;
    border-radius: 6px;
    color: #374151;
  }

  .draft-json {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.6;
    background: #f6f8fb;
    padding: 12px;
    border-radius: 8px;
  }

  .streaming-cursor {
    display: inline-block;
    margin-left: 2px;
    animation: blink 1s infinite;
    color: #1677ff;
    font-weight: bold;
  }

  :deep(.markdown-content) {
    line-height: 1.7;

    p {
      margin: 0 0 12px 0;
    }

    p:last-child {
      margin-bottom: 0;
    }

    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }

    pre {
      background: #f6f8fa;
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;

      code {
        background: transparent;
        padding: 0;
      }
    }

    ul, ol {
      padding-left: 20px;
      margin: 8px 0;
    }

    li {
      margin: 4px 0;
    }

    a {
      color: #1677ff;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    blockquote {
      border-left: 4px solid #1677ff;
      padding-left: 12px;
      margin: 12px 0;
      color: #666;
    }

    h1, h2, h3, h4, h5, h6 {
      margin: 16px 0 8px 0;
      font-weight: 600;
    }

    table {
      border-collapse: collapse;
      width: max-content;
      min-width: 100%;
      margin: 12px 0;
      display: block;
      overflow-x: auto;

      th, td {
        border: 1px solid #e8e8e8;
        padding: 10px 16px;
        text-align: left;
        white-space: nowrap;
        min-width: 80px;
      }

      th {
        background: #fafafa;
        font-weight: 600;
      }

      tr:nth-child(even) {
        background: #fafafa;
      }
    }
  }

  @keyframes blink {
    0%, 50% {
      opacity: 1;
    }
    51%, 100% {
      opacity: 0;
    }
  }

  @media (max-width: 991px) {
    .session-card {
      margin-bottom: 16px;
    }
  }
}
</style>