<template>
  <div class="alert-history-page">
    <a-card>
      <template #title>
        <a-flex justify="space-between" align="center">
          <span>告警历史</span>
          <a-button @click="loadHistory">
            <template #icon><reload-outlined /></template>
            刷新
          </a-button>
        </a-flex>
      </template>

      <a-space wrap style="margin-bottom: 16px">
        <a-input
          v-model:value="filters.job_id"
          placeholder="任务ID搜索"
          allow-clear
          style="width: 200px"
          @pressEnter="loadHistory"
        />
        <a-select
          v-model:value="filters.status"
          placeholder="发送状态"
          allow-clear
          style="width: 120px"
          @change="loadHistory"
        >
          <a-select-option value="success">成功</a-select-option>
          <a-select-option value="fail">失败</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.channel_type"
          placeholder="渠道类型"
          allow-clear
          style="width: 120px"
          @change="loadHistory"
        >
          <a-select-option value="webhook">Webhook</a-select-option>
          <a-select-option value="email">Email</a-select-option>
        </a-select>
        <a-range-picker
          v-model:value="dateRange"
          show-time
          format="YYYY-MM-DD HH:mm:ss"
          @change="handleDateChange"
        />
      </a-space>

      <a-table
        :data-source="history"
        :columns="columns"
        :loading="loading"
        row-key="id"
        :pagination="pagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'job_id'">
            <a-tag v-if="!record.job_id || record.job_id === '*'" color="blue">全局</a-tag>
            <span v-else>{{ record.job_id }}</span>
          </template>
          <template v-else-if="column.key === 'rule_type'">
            {{ ruleTypeMap[record.rule_type] || record.rule_type }}
          </template>
          <template v-else-if="column.key === 'channel_type'">
            <a-tag :color="record.channel_type === 'webhook' ? 'blue' : 'orange'">{{ record.channel_type }}</a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status ? 'success' : 'error'">{{ record.status ? '成功' : '失败' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'message'">
            <a-tooltip v-if="record.message && record.message.length > 50" placement="topLeft">
              <template #title>
                <div style="max-width: 400px; white-space: pre-wrap">{{ record.message }}</div>
              </template>
              <span>{{ record.message.slice(0, 50) }}...</span>
            </a-tooltip>
            <span v-else>{{ record.message }}</span>
          </template>
          <template v-else-if="column.key === 'sent_at'">
            {{ formatDateTime(record.sent_at) }}
          </template>
          <template v-else-if="column.key === 'error'">
            <a-tooltip v-if="record.error" placement="topLeft">
              <template #title>{{ record.error }}</template>
              <a-tag color="red">{{ record.error.slice(0, 30) }}...</a-tag>
            </a-tooltip>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import type { TableProps } from 'ant-design-vue'
import dayjs, { Dayjs } from 'dayjs'
import { getAlertHistory } from '../../api/index'
import type { AlertHistoryItem, AlertRuleType, AlertChannelType } from '../../types/api'

const history = ref<AlertHistoryItem[]>([])
const loading = ref(false)
const total = ref(0)

const filters = reactive({
  job_id: '',
  status: undefined as 'success' | 'fail' | undefined,
  channel_type: undefined as AlertChannelType | undefined,
  start_time: '',
  end_time: ''
})

const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`
})

const ruleTypeMap: Record<AlertRuleType, string> = {
  single_fail: '单次失败',
  consecutive_fail: '连续失败',
  timeout: '执行超时',
  job_removed: '任务不存在'
}

const columns = [
  { title: '任务ID', key: 'job_id', dataIndex: 'job_id', width: 150 },
  { title: '规则类型', key: 'rule_type', dataIndex: 'rule_type', width: 120 },
  { title: '渠道类型', key: 'channel_type', dataIndex: 'channel_type', width: 100 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 80 },
  { title: '告警内容', key: 'message', dataIndex: 'message', ellipsis: true },
  { title: '发送时间', key: 'sent_at', dataIndex: 'sent_at', width: 180 },
  { title: '失败原因', key: 'error', dataIndex: 'error', width: 150 }
]

const formatDateTime = (dateStr: string) => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss')
}

const handleDateChange = (dates: [Dayjs, Dayjs] | null) => {
  if (dates) {
    filters.start_time = dates[0].format('YYYY-MM-DD HH:mm:ss')
    filters.end_time = dates[1].format('YYYY-MM-DD HH:mm:ss')
  } else {
    filters.start_time = ''
    filters.end_time = ''
  }
  loadHistory()
}

const handleTableChange: TableProps['onChange'] = (pag) => {
  pagination.current = pag.current || 1
  pagination.pageSize = pag.pageSize || 20
  loadHistory()
}

const loadHistory = async () => {
  loading.value = true
  try {
    const params = {
      job_id: filters.job_id || undefined,
      status: filters.status,
      channel_type: filters.channel_type,
      start_time: filters.start_time || undefined,
      end_time: filters.end_time || undefined,
      page: pagination.current,
      limit: pagination.pageSize
    }
    const res = await getAlertHistory(params)
    if (res.code === 200) {
      history.value = res.data.logs
      total.value = res.data.count
      pagination.total = res.data.count
    }
  } catch (error) {
    message.error('加载告警历史失败')
    console.error('加载告警历史失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHistory()
})
</script>

<style scoped lang="scss">
.alert-history-page {
  :deep(.ant-card-head-title) {
    width: 100%;
  }
}
</style>