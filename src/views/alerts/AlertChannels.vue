<template>
  <div class="alert-channels-page">
    <a-card>
      <template #title>
        <a-flex justify="space-between" align="center">
          <span>告警渠道</span>
          <a-button type="primary" @click="openModal()">
            <template #icon><plus-outlined /></template>
            新建渠道
          </a-button>
        </a-flex>
      </template>

      <a-table
        :data-source="channels"
        :columns="columns"
        :loading="loading"
        row-key="id"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag :color="record.type === 'webhook' ? 'blue' : 'orange'">{{ record.type }}</a-tag>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-switch v-model:checked="record.enabled" @change="(checked: boolean) => toggleEnabled(record, checked)" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openModal(record)">编辑</a-button>
              <a-button type="link" size="small" @click="handleTest(record)" :loading="record.testing">测试</a-button>
              <a-popconfirm title="确定删除此渠道？" @confirm="handleDelete(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalVisible"
      :title="editingChannel ? '编辑渠道' : '新建渠道'"
      :confirm-loading="submitting"
      @ok="handleSubmit"
      @cancel="handleCancel"
      width="700px"
    >
      <template #footer>
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="default" :loading="testingForm" @click="handleTestForm">
            测试发送
          </a-button>
          <a-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ editingChannel ? '更新' : '创建' }}
          </a-button>
        </a-space>
      </template>
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <a-form-item label="渠道名称" name="name">
          <a-input v-model:value="formData.name" placeholder="渠道名称" />
        </a-form-item>

        <a-form-item label="渠道类型" name="type">
          <a-select v-model:value="formData.type" placeholder="选择渠道类型" @change="handleTypeChange">
            <a-select-option value="webhook">Webhook</a-select-option>
            <a-select-option value="email">Email</a-select-option>
          </a-select>
        </a-form-item>

        <template v-if="formData.type === 'webhook'">
          <a-form-item label="Webhook URL" required>
            <a-input v-model:value="(formData.config as WebhookConfig).url" placeholder="Webhook URL" :status="urlError ? 'error' : undefined" />
            <span v-if="urlError" style="color: #ff4d4f; font-size: 12px">{{ urlError }}</span>
          </a-form-item>

          <a-form-item label="请求方法">
            <a-select v-model:value="(formData.config as WebhookConfig).method">
              <a-select-option value="POST">POST</a-select-option>
              <a-select-option value="GET">GET</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="请求头 (JSON)">
            <a-textarea
              v-model:value="headersJson"
              placeholder='{"Content-Type": "application/json"}'
              :rows="3"
            />
          </a-form-item>

          <a-form-item label="请求体（body）">
            <a-textarea
              v-model:value="(formData.config as WebhookConfig).body_template"
              placeholder="自行构建合规的body格式，系统告警内容使用 {message} 占位"
              :rows="4"
            />
          </a-form-item>
        </template>

        <template v-if="formData.type === 'email'">
          <a-form-item label="SMTP服务器地址" required>
            <a-input v-model:value="(formData.config as EmailConfig).smtp_host" placeholder="smtp.example.com" :status="smtpHostError ? 'error' : undefined" />
            <span v-if="smtpHostError" style="color: #ff4d4f; font-size: 12px">{{ smtpHostError }}</span>
          </a-form-item>

          <a-form-item label="SMTP端口">
            <a-input-number v-model:value="(formData.config as EmailConfig).smtp_port" :min="1" :max="65535" style="width: 100%" />
          </a-form-item>

          <a-form-item label="SMTP用户名" required>
            <a-input v-model:value="(formData.config as EmailConfig).smtp_user" placeholder="SMTP用户名" :status="smtpUserError ? 'error' : undefined" />
            <span v-if="smtpUserError" style="color: #ff4d4f; font-size: 12px">{{ smtpUserError }}</span>
          </a-form-item>

          <a-form-item label="SMTP密码" required>
            <a-input-password v-model:value="(formData.config as EmailConfig).smtp_pass" placeholder="SMTP密码" :status="smtpPassError ? 'error' : undefined" />
            <span v-if="smtpPassError" style="color: #ff4d4f; font-size: 12px">{{ smtpPassError }}</span>
          </a-form-item>

          <a-form-item label="发件人地址" required>
            <a-input v-model:value="(formData.config as EmailConfig).from_addr" placeholder="alert@example.com" :status="fromAddrError ? 'error' : undefined" />
            <span v-if="fromAddrError" style="color: #ff4d4f; font-size: 12px">{{ fromAddrError }}</span>
          </a-form-item>

          <a-form-item label="收件人地址" required>
            <a-input v-model:value="toAddrStr" placeholder="多个地址用逗号分隔" :status="toAddrError ? 'error' : undefined" />
            <span v-if="toAddrError" style="color: #ff4d4f; font-size: 12px">{{ toAddrError }}</span>
          </a-form-item>
        </template>

        <a-form-item label="启用状态" name="enabled">
          <a-switch v-model:checked="formData.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { FormInstance } from 'ant-design-vue'
import {
  getAlertChannels,
  createAlertChannel,
  updateAlertChannel,
  deleteAlertChannel,
  testAlertChannel
} from '../../api/index'
import type { AlertChannel, AlertChannelCreate, AlertChannelUpdate, WebhookConfig, EmailConfig, AlertChannelType } from '../../types/api'

const channels = ref<(AlertChannel & { testing?: boolean })[]>([])
const loading = ref(false)
const modalVisible = ref(false)
const submitting = ref(false)
const testingForm = ref(false)
const editingChannel = ref<AlertChannel | null>(null)
const formRef = ref<FormInstance>()

const formData = ref<{
  name: string
  type: AlertChannelType
  enabled: boolean
  config: WebhookConfig | EmailConfig
}>({
  name: '',
  type: 'webhook',
  enabled: true,
  config: {
    url: '',
    method: 'POST',
    headers: {},
    body_template: ''
  }
})

const headersJson = ref('{\n  "Content-Type": "application/json"\n}')
const toAddrStr = ref('')

const urlError = ref('')
const smtpHostError = ref('')
const smtpUserError = ref('')
const smtpPassError = ref('')
const fromAddrError = ref('')
const toAddrError = ref('')

const clearConfigErrors = () => {
  urlError.value = ''
  smtpHostError.value = ''
  smtpUserError.value = ''
  smtpPassError.value = ''
  fromAddrError.value = ''
  toAddrError.value = ''
}

const columns = [
  { title: '渠道名称', dataIndex: 'name' },
  { title: '渠道类型', key: 'type', dataIndex: 'type' },
  { title: '启用状态', key: 'enabled', dataIndex: 'enabled' },
  { title: '操作', key: 'action', width: 200 }
]

const formRules = {
  name: [{ required: true, message: '请输入渠道名称' }],
  type: [{ required: true, message: '请选择渠道类型' }]
}

const loadChannels = async () => {
  loading.value = true
  try {
    const res = await getAlertChannels()
    if (res.code === 200) {
      channels.value = res.data
    }
  } catch (error) {
    message.error('加载渠道列表失败')
    console.error('加载渠道列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleTypeChange = () => {
  formRef.value?.clearValidate()
  clearConfigErrors()
  if (formData.value.type === 'webhook') {
    formData.value.config = {
      url: '',
      method: 'POST',
      headers: {},
      body_template: ''
    }
    headersJson.value = '{\n  "Content-Type": "application/json"\n}'
  } else {
    formData.value.config = {
      smtp_host: '',
      smtp_port: 465,
      smtp_user: '',
      smtp_pass: '',
      from_addr: '',
      to_addr: []
    }
    toAddrStr.value = ''
  }
}

const openModal = (channel?: AlertChannel) => {
  editingChannel.value = channel || null
  clearConfigErrors()
  if (channel) {
    formData.value = {
      name: channel.name,
      type: channel.type,
      enabled: channel.enabled,
      config: { ...channel.config } as WebhookConfig | EmailConfig
    }
    if (channel.type === 'webhook') {
      const cfg = channel.config as WebhookConfig
      headersJson.value = JSON.stringify(cfg.headers || {}, null, 2)
    } else {
      const cfg = channel.config as EmailConfig
      toAddrStr.value = (cfg.to_addr || []).join(',')
    }
  } else {
    formData.value = {
      name: '',
      type: 'webhook',
      enabled: true,
      config: {
        url: '',
        method: 'POST',
        headers: {},
        body_template: ''
      }
    }
    headersJson.value = '{\n  "Content-Type": "application/json"\n}'
    toAddrStr.value = ''
  }
  modalVisible.value = true
  setTimeout(() => {
    formRef.value?.clearValidate()
  }, 0)
}

const handleCancel = () => {
  modalVisible.value = false
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  clearConfigErrors()
  let config: WebhookConfig | EmailConfig
  let hasError = false

  if (formData.value.type === 'webhook') {
    if (!(formData.value.config as WebhookConfig).url) {
      urlError.value = '请输入Webhook URL'
      hasError = true
    }
    if (hasError) return

    try {
      const headers = JSON.parse(headersJson.value || '{}')
      config = {
        url: (formData.value.config as WebhookConfig).url,
        method: (formData.value.config as WebhookConfig).method || 'POST',
        headers,
        body_template: (formData.value.config as WebhookConfig).body_template || ''
      }
    } catch {
      message.error('请求头JSON格式错误')
      return
    }
  } else {
    if (!(formData.value.config as EmailConfig).smtp_host) {
      smtpHostError.value = '请输入SMTP服务器地址'
      hasError = true
    }
    if (!(formData.value.config as EmailConfig).smtp_user) {
      smtpUserError.value = '请输入SMTP用户名'
      hasError = true
    }
    if (!(formData.value.config as EmailConfig).smtp_pass) {
      smtpPassError.value = '请输入SMTP密码'
      hasError = true
    }
    if (!(formData.value.config as EmailConfig).from_addr) {
      fromAddrError.value = '请输入发件人地址'
      hasError = true
    }
    const toAddr = toAddrStr.value.split(',').map(s => s.trim()).filter(Boolean)
    if (toAddr.length === 0) {
      toAddrError.value = '请输入收件人地址'
      hasError = true
    }
    if (hasError) return

    config = {
      smtp_host: (formData.value.config as EmailConfig).smtp_host,
      smtp_port: (formData.value.config as EmailConfig).smtp_port || 465,
      smtp_user: (formData.value.config as EmailConfig).smtp_user,
      smtp_pass: (formData.value.config as EmailConfig).smtp_pass,
      from_addr: (formData.value.config as EmailConfig).from_addr,
      to_addr: toAddr
    }
  }

  submitting.value = true
  try {
    const data: AlertChannelCreate | AlertChannelUpdate = {
      name: formData.value.name,
      type: formData.value.type,
      config,
      enabled: formData.value.enabled
    }

    if (editingChannel.value) {
      const res = await updateAlertChannel(editingChannel.value.id, data)
      if (res.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        loadChannels()
      } else {
        message.error(res.msg || '更新失败')
      }
    } else {
      const res = await createAlertChannel(data as AlertChannelCreate)
      if (res.code === 200) {
        message.success('创建成功')
        modalVisible.value = false
        loadChannels()
      } else {
        message.error(res.msg || '创建失败')
      }
    }
  } catch (error) {
    message.error('操作失败')
    console.error('操作失败:', error)
  } finally {
    submitting.value = false
  }
}

const toggleEnabled = async (channel: AlertChannel, checked: boolean) => {
  try {
    const res = await updateAlertChannel(channel.id, { enabled: checked })
    if (res.code === 200) {
      message.success(checked ? '已启用' : '已禁用')
    } else {
      channel.enabled = !checked
      message.error(res.msg || '操作失败')
    }
  } catch (error) {
    channel.enabled = !checked
    message.error('操作失败')
    console.error('操作失败:', error)
  }
}

const handleTest = async (channel: AlertChannel & { testing?: boolean }) => {
  channel.testing = true
  try {
    const res = await testAlertChannel(channel.id)
    if (res.code === 200 && res.data.success) {
      message.success(res.data.message || '测试成功')
    } else {
      message.error(res.data?.message || res.msg || '测试失败')
    }
  } catch (error) {
    message.error('测试失败')
    console.error('测试失败:', error)
  } finally {
    channel.testing = false
  }
}

const handleTestForm = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    message.warning('请先填写必填字段')
    return
  }

  clearConfigErrors()
  let config: WebhookConfig | EmailConfig
  let hasError = false

  if (formData.value.type === 'webhook') {
    if (!(formData.value.config as WebhookConfig).url) {
      urlError.value = '请输入Webhook URL'
      hasError = true
    }
    if (hasError) return

    try {
      const headers = JSON.parse(headersJson.value || '{}')
      config = {
        url: (formData.value.config as WebhookConfig).url,
        method: (formData.value.config as WebhookConfig).method || 'POST',
        headers,
        body_template: (formData.value.config as WebhookConfig).body_template || ''
      }
    } catch {
      message.error('请求头JSON格式错误')
      return
    }
  } else {
    if (!(formData.value.config as EmailConfig).smtp_host) {
      smtpHostError.value = '请输入SMTP服务器地址'
      hasError = true
    }
    if (!(formData.value.config as EmailConfig).smtp_user) {
      smtpUserError.value = '请输入SMTP用户名'
      hasError = true
    }
    if (!(formData.value.config as EmailConfig).smtp_pass) {
      smtpPassError.value = '请输入SMTP密码'
      hasError = true
    }
    if (!(formData.value.config as EmailConfig).from_addr) {
      fromAddrError.value = '请输入发件人地址'
      hasError = true
    }
    const toAddr = toAddrStr.value.split(',').map(s => s.trim()).filter(Boolean)
    if (toAddr.length === 0) {
      toAddrError.value = '请输入收件人地址'
      hasError = true
    }
    if (hasError) return

    config = {
      smtp_host: (formData.value.config as EmailConfig).smtp_host,
      smtp_port: (formData.value.config as EmailConfig).smtp_port || 465,
      smtp_user: (formData.value.config as EmailConfig).smtp_user,
      smtp_pass: (formData.value.config as EmailConfig).smtp_pass,
      from_addr: (formData.value.config as EmailConfig).from_addr,
      to_addr: toAddr
    }
  }

  testingForm.value = true
  try {
    const data: AlertChannelCreate | AlertChannelUpdate = {
      name: formData.value.name,
      type: formData.value.type,
      config,
      enabled: formData.value.enabled
    }

    let channelId: number

    if (editingChannel.value) {
      const res = await updateAlertChannel(editingChannel.value.id, data)
      if (res.code === 200) {
        channelId = editingChannel.value.id
      } else {
        message.error(res.msg || '保存失败')
        return
      }
    } else {
      const res = await createAlertChannel(data as AlertChannelCreate)
      if (res.code === 200) {
        channelId = res.data.id
        editingChannel.value = res.data
      } else {
        message.error(res.msg || '创建失败')
        return
      }
    }

    const testRes = await testAlertChannel(channelId!)
    if (testRes.code === 200 && testRes.data.success) {
      message.success('测试成功')
      modalVisible.value = false
      loadChannels()
    } else {
      message.error(testRes.data?.message || testRes.msg || '测试失败')
    }
  } catch (error) {
    message.error('操作失败')
    console.error('操作失败:', error)
  } finally {
    testingForm.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    const res = await deleteAlertChannel(id)
    if (res.code === 200) {
      message.success('删除成功')
      loadChannels()
    } else {
      message.error(res.msg || '删除失败')
    }
  } catch (error) {
    message.error('删除失败')
    console.error('删除失败:', error)
  }
}

onMounted(() => {
  loadChannels()
})
</script>

<style scoped lang="scss">
.alert-channels-page {
  :deep(.ant-card-head-title) {
    width: 100%;
  }
}
</style>