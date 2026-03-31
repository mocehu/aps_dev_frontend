<template>
  <div class="editor-wrapper">
    <div class="editor-toolbar">
      <a-space>
        <a-button
          v-if="showAiButtons"
          type="primary"
          :loading="generating"
          @click="handleGenerate"
        >
          <template #icon><BulbOutlined /></template>
          AI 生成
        </a-button>
        <a-button
          v-if="showAiButtons"
          :loading="reviewing"
          @click="handleReview"
        >
          <template #icon><SafetyCertificateOutlined /></template>
          AI 检查
        </a-button>
      </a-space>
      <div v-if="funcName" class="editor-info">
        <a-input
          v-model:value="localFuncName"
          placeholder="函数名称"
          size="small"
          style="width: 150px"
        />
      </div>
    </div>

    <div ref="editorContainer" class="monaco-editor-container"></div>

    <a-modal
      v-model:open="generateModalVisible"
      title="AI 生成代码"
      :footer="null"
      width="600px"
      :maskClosable="!generating"
      :closable="!generating"
    >
      <div class="generate-content">
        <a-textarea
          v-model:value="generateDescription"
          placeholder="描述你想要的功能，例如：发送邮件通知给指定收件人"
          :auto-size="{ minRows: 3, maxRows: 6 }"
          :disabled="generating"
        />
        <div class="generate-tips" v-if="!generating">
          <a-typography-text type="secondary">
            提示：描述越详细，生成的代码越准确
          </a-typography-text>
        </div>
        <div v-if="generating && generateStatus" class="generate-status">
          <a-spin size="small" />
          <span>{{ generateStatus }}</span>
        </div>
      </div>
      <a-flex justify="flex-end" style="margin-top: 16px">
        <a-space>
          <a-button :disabled="generating" @click="generateModalVisible = false">取消</a-button>
          <a-button type="primary" :loading="generating" @click="confirmGenerate">
            生成
          </a-button>
        </a-space>
      </a-flex>
    </a-modal>

    <a-modal
      v-model:open="reviewModalVisible"
      title="AI 代码审查"
      :footer="null"
      width="650px"
      :maskClosable="false"
    >
      <div v-if="reviewing" class="review-loading">
        <div class="review-status">
          <a-spin size="small" />
          <span>{{ reviewStatus || '正在分析代码...' }}</span>
        </div>
        <a-skeleton active :paragraph="{ rows: 3 }" />
      </div>
      <div v-else-if="reviewResult" class="review-result">
        <a-alert
          :type="reviewResult.has_issues ? 'warning' : 'success'"
          show-icon
          style="margin-bottom: 16px"
        >
          <template #message>
            <strong>{{ reviewResult.security.summary }}</strong>
          </template>
        </a-alert>

        <div v-if="reviewResult.security.errors.length > 0" class="review-section">
          <div class="section-title error">
            <CloseCircleOutlined /> 错误 ({{ reviewResult.security.errors.length }})
          </div>
          <div class="section-content">
            <a-alert
              v-for="(error, index) in reviewResult.security.errors"
              :key="index"
              type="error"
              show-icon
              style="margin-bottom: 8px"
            >
              <template #message>{{ error }}</template>
            </a-alert>
          </div>
        </div>

        <div v-if="reviewResult.security.warnings.length > 0" class="review-section">
          <div class="section-title warning">
            <ExclamationCircleOutlined /> 警告 ({{ reviewResult.security.warnings.length }})
          </div>
          <div class="section-content">
            <a-alert
              v-for="(warning, index) in reviewResult.security.warnings"
              :key="index"
              type="warning"
              show-icon
              style="margin-bottom: 8px"
            >
              <template #message>{{ warning }}</template>
            </a-alert>
          </div>
        </div>

        <div v-if="reviewResult.security.suggestions.length > 0" class="review-section">
          <div class="section-title info">
            <BulbOutlined /> 建议 ({{ reviewResult.security.suggestions.length }})
          </div>
          <div class="section-content">
            <a-alert
              v-for="(suggestion, index) in reviewResult.security.suggestions"
              :key="index"
              type="info"
              show-icon
              style="margin-bottom: 8px"
            >
              <template #message>{{ suggestion }}</template>
            </a-alert>
          </div>
        </div>

        <div v-if="!reviewResult.has_issues" class="review-success">
          <CheckCircleOutlined style="font-size: 48px; color: #52c41a" />
          <div>代码安全，未发现问题</div>
        </div>
      </div>

      <a-flex justify="flex-end" style="margin-top: 16px" v-if="!reviewing">
        <a-button type="primary" @click="reviewModalVisible = false">关闭</a-button>
      </a-flex>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { message } from 'ant-design-vue'
import { 
  BulbOutlined, 
  SafetyCertificateOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons-vue'
import * as monaco from 'monaco-editor'
import { generateCodeStream, reviewCodeStream } from '../api/index'
import type { ReviewCodeResponse } from '../types/api'

const props = defineProps<{
  modelValue: string
  language?: string
  readOnly?: boolean
  height?: string
  showAiButtons?: boolean
  funcName?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': []
}>()

const editorContainer = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const generating = ref(false)
const reviewing = ref(false)
const generateModalVisible = ref(false)
const generateDescription = ref('')
const generateStatus = ref('')
const reviewModalVisible = ref(false)
const reviewResult = ref<ReviewCodeResponse | null>(null)
const reviewStatus = ref('')
const localFuncName = ref(props.funcName || '')

onMounted(() => {
  if (editorContainer.value) {
    editor = monaco.editor.create(editorContainer.value, {
      value: props.modelValue,
      language: props.language || 'python',
      theme: 'vs-dark',
      readOnly: props.readOnly || false,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 4,
      insertSpaces: true,
      renderWhitespace: 'selection',
      folding: true,
      bracketPairColorization: { enabled: true },
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10
      },
      padding: { top: 12, bottom: 12 }
    })

    editor.onDidChangeModelContent(() => {
      const value = editor?.getValue() || ''
      emit('update:modelValue', value)
      emit('change')
    })
  }
})

watch(() => props.modelValue, (newValue) => {
  if (editor && newValue !== editor.getValue()) {
    editor.setValue(newValue)
  }
})

watch(() => props.funcName, (newValue) => {
  localFuncName.value = newValue || ''
})

onBeforeUnmount(() => {
  editor?.dispose()
})

const handleGenerate = () => {
  generateDescription.value = ''
  generateStatus.value = ''
  generateModalVisible.value = true
}

const confirmGenerate = async () => {
  if (!generateDescription.value.trim()) {
    message.warning('请输入功能描述')
    return
  }
  
  generating.value = true
  generateStatus.value = '正在连接 AI...'
  let generatedCode = ''
  
  await generateCodeStream(
    {
      description: generateDescription.value,
      func_name: localFuncName.value || 'generated_func'
    },
    {
      onStatus: (msg) => {
        generateStatus.value = msg
      },
      onContent: (content) => {
        generatedCode += content
        emit('update:modelValue', generatedCode)
      },
      onDone: (code) => {
        emit('update:modelValue', code)
        generateModalVisible.value = false
        message.success('代码生成成功')
      },
      onError: (error) => {
        message.error(error)
      }
    }
  )
  
  generating.value = false
}

const handleReview = async () => {
  const code = props.modelValue?.trim() || editor?.getValue()?.trim() || ''
  if (!code) {
    message.warning('请先输入代码')
    return
  }
  
  reviewing.value = true
  reviewStatus.value = '正在连接 AI...'
  reviewResult.value = null
  reviewModalVisible.value = true
  
  await reviewCodeStream(
    {
      code,
      func_name: localFuncName.value || 'unknown_func'
    },
    {
      onStatus: (msg) => {
        reviewStatus.value = msg
      },
      onSecurity: (data) => {
        reviewResult.value = {
          success: true,
          security: {
            safe: data.safe,
            errors: data.errors,
            warnings: data.warnings,
            suggestions: [],
            summary: data.safe ? '代码安全' : '发现安全问题'
          },
          has_issues: !data.safe || data.errors.length > 0 || data.warnings.length > 0
        }
      },
      onDone: (result) => {
        reviewResult.value = result
      },
      onError: (error) => {
        message.error(error)
        reviewModalVisible.value = false
      }
    }
  )
  
  reviewing.value = false
}
</script>

<style scoped>
.editor-wrapper {
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.editor-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.monaco-editor-container {
  width: 100%;
  height: v-bind('props.height || "400px"');
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.generate-content {
  min-height: 100px;
}

.generate-tips {
  margin-top: 8px;
}

.generate-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #e6f7ff;
  border-radius: 4px;
  color: #1890ff;
}

.review-loading {
  min-height: 200px;
}

.review-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #e6f7ff;
  border-radius: 4px;
  color: #1890ff;
}

.review-result {
  max-height: 400px;
  overflow-y: auto;
}

.review-section {
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title.error {
  background-color: #fff2f0;
  color: #ff4d4f;
}

.section-title.warning {
  background-color: #fffbe6;
  color: #faad14;
}

.section-title.info {
  background-color: #e6f7ff;
  color: #1890ff;
}

.section-content {
  padding-left: 8px;
}

.review-success {
  text-align: center;
  padding: 24px;
  color: #52c41a;
}
</style>