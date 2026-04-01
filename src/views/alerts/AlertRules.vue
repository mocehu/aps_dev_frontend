<template>
  <div class="alert-rules-page">
    <a-card>
      <template #title>
        <a-flex justify="space-between" align="center">
          <span>告警规则</span>
          <a-button type="primary" @click="openModal()">
            <template #icon><plus-outlined /></template>
            新建规则
          </a-button>
        </a-flex>
      </template>

      <a-table
        :data-source="rules"
        :columns="columns"
        :loading="loading"
        row-key="id"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'job_id'">
            <a-tag v-if="!record.job_id || record.job_id === '*'" color="blue">全局规则</a-tag>
            <span v-else>{{ record.job_id }}</span>
          </template>
          <template v-else-if="column.key === 'rule_type'">
            {{ ruleTypeMap[record.rule_type] || record.rule_type }}
          </template>
          <template v-else-if="column.key === 'channels'">
            <a-tag v-for="name in record.channel_names" :key="name" color="green">{{ name }}</a-tag>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-switch v-model:checked="record.enabled" @change="(checked: boolean) => toggleEnabled(record, checked)" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openModal(record)">编辑</a-button>
              <a-popconfirm title="确定删除此规则？" @confirm="handleDelete(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalVisible"
      :title="editingRule ? '编辑规则' : '新建规则'"
      :confirm-loading="submitting"
      @ok="handleSubmit"
      @cancel="handleCancel"
      width="600px"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <a-form-item label="任务ID" name="job_id">
          <a-input v-model:value="formData.job_id" placeholder="任务ID，支持 * 通配符，留空表示全局规则" />
        </a-form-item>

        <a-form-item label="规则类型" name="rule_type">
          <a-select v-model:value="formData.rule_type" placeholder="选择规则类型">
            <a-select-option value="single_fail">单次失败</a-select-option>
            <a-select-option value="consecutive_fail">连续失败</a-select-option>
            <a-select-option value="timeout">执行超时</a-select-option>
            <a-select-option value="job_removed">任务不存在</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item v-if="showThreshold" label="阈值" name="threshold">
          <a-input-number v-model:value="formData.threshold" :min="1" style="width: 100%" />
        </a-form-item>

        <a-form-item label="告警渠道" name="channels">
          <a-select
            v-model:value="formData.channels"
            mode="multiple"
            placeholder="选择告警渠道"
            :loading="channelsLoading"
          >
            <a-select-option v-for="ch in channels" :key="ch.id" :value="ch.id">
              {{ ch.name }} ({{ ch.type }})
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="冷却时间（分钟）" name="cooldown_minutes">
          <a-input-number v-model:value="formData.cooldown_minutes" :min="1" style="width: 100%" />
        </a-form-item>

        <a-form-item label="启用状态" name="enabled">
          <a-switch v-model:checked="formData.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import type { FormInstance } from 'ant-design-vue'
import { getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule, getAlertChannels } from '../../api/index'
import type { AlertRule, AlertRuleCreate, AlertRuleUpdate, AlertChannel, AlertRuleType } from '../../types/api'

const rules = ref<AlertRule[]>([])
const channels = ref<AlertChannel[]>([])
const loading = ref(false)
const channelsLoading = ref(false)
const modalVisible = ref(false)
const submitting = ref(false)
const editingRule = ref<AlertRule | null>(null)
const formRef = ref<FormInstance>()

const ruleTypeMap: Record<AlertRuleType, string> = {
  single_fail: '单次失败',
  consecutive_fail: '连续失败',
  timeout: '执行超时',
  job_removed: '任务不存在'
}

const columns = [
  { title: '任务ID', key: 'job_id', dataIndex: 'job_id' },
  { title: '规则类型', key: 'rule_type', dataIndex: 'rule_type' },
  { title: '阈值', dataIndex: 'threshold' },
  { title: '告警渠道', key: 'channels', dataIndex: 'channels' },
  { title: '冷却时间(分钟)', dataIndex: 'cooldown_minutes' },
  { title: '启用状态', key: 'enabled', dataIndex: 'enabled' },
  { title: '操作', key: 'action', width: 150 }
]

const formData = ref<AlertRuleCreate & { id?: number }>({
  job_id: '',
  rule_type: 'single_fail' as AlertRuleType,
  threshold: undefined,
  channels: [],
  cooldown_minutes: 30,
  enabled: true
})

const showThreshold = computed(() => {
  return formData.value.rule_type === 'consecutive_fail' || formData.value.rule_type === 'timeout'
})

const formRules = {
  rule_type: [{ required: true, message: '请选择规则类型' }],
  channels: [{ required: true, message: '请选择至少一个告警渠道', type: 'array' }],
  cooldown_minutes: [{ required: true, message: '请输入冷却时间' }]
}

const loadRules = async () => {
  loading.value = true
  try {
    const res = await getAlertRules()
    if (res.code === 200) {
      rules.value = res.data
    }
  } catch (error) {
    message.error('加载规则列表失败')
    console.error('加载规则列表失败:', error)
  } finally {
    loading.value = false
  }
}

const loadChannels = async () => {
  channelsLoading.value = true
  try {
    const res = await getAlertChannels()
    if (res.code === 200) {
      channels.value = res.data
    }
  } catch (error) {
    message.error('加载渠道列表失败')
    console.error('加载渠道列表失败:', error)
  } finally {
    channelsLoading.value = false
  }
}

const openModal = (rule?: AlertRule) => {
  editingRule.value = rule || null
  if (rule) {
    formData.value = {
      id: rule.id,
      job_id: rule.job_id || '',
      rule_type: rule.rule_type,
      threshold: rule.threshold,
      channels: rule.channels,
      cooldown_minutes: rule.cooldown_minutes,
      enabled: rule.enabled
    }
  } else {
    formData.value = {
      job_id: '',
      rule_type: 'single_fail' as AlertRuleType,
      threshold: undefined,
      channels: [],
      cooldown_minutes: 30,
      enabled: true
    }
  }
  modalVisible.value = true
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

  submitting.value = true
  try {
    const data: AlertRuleCreate | AlertRuleUpdate = {
      job_id: formData.value.job_id || undefined,
      rule_type: formData.value.rule_type,
      threshold: showThreshold.value ? formData.value.threshold : undefined,
      channels: formData.value.channels,
      cooldown_minutes: formData.value.cooldown_minutes,
      enabled: formData.value.enabled
    }

    if (editingRule.value) {
      const res = await updateAlertRule(editingRule.value.id, data)
      if (res.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        loadRules()
      } else {
        message.error(res.msg || '更新失败')
      }
    } else {
      const res = await createAlertRule(data as AlertRuleCreate)
      if (res.code === 200) {
        message.success('创建成功')
        modalVisible.value = false
        loadRules()
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

const toggleEnabled = async (rule: AlertRule, checked: boolean) => {
  try {
    const res = await updateAlertRule(rule.id, { enabled: checked })
    if (res.code === 200) {
      message.success(checked ? '已启用' : '已禁用')
    } else {
      rule.enabled = !checked
      message.error(res.msg || '操作失败')
    }
  } catch (error) {
    rule.enabled = !checked
    message.error('操作失败')
    console.error('操作失败:', error)
  }
}

const handleDelete = async (id: number) => {
  try {
    const res = await deleteAlertRule(id)
    if (res.code === 200) {
      message.success('删除成功')
      loadRules()
    } else {
      message.error(res.msg || '删除失败')
    }
  } catch (error) {
    message.error('删除失败')
    console.error('删除失败:', error)
  }
}

onMounted(() => {
  loadRules()
  loadChannels()
})
</script>

<style scoped lang="scss">
.alert-rules-page {
  :deep(.ant-card-head-title) {
    width: 100%;
  }
}
</style>