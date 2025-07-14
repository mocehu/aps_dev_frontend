<template>
  <div class="log-list-container">
    <a-card :bordered="false" :shadow="false">
      <template #title>
        <div class="card-header">
          <h2>日志信息</h2>
          <div class="header-actions">
            <a-button type="primary" @click="refreshLogs">刷新</a-button>
          </div>
        </div>
      </template>
      
      <!-- 搜索和过滤功能 -->
      <div class="log-search mb-4">
        <div class="search-row">
          <a-input
            v-model:value="jobIdKeyword"
            placeholder="搜索任务ID"
            prefix-icon="Search"
            clearable
            @pressEnter="filterLogs"
            style="width: 200px; margin-right: 16px;"
          >
            <template #suffix>
              <a-button type="text" size="small" @click="filterLogs">
                <search-outlined />
              </a-button>
            </template>
          </a-input>
          
          <a-select
            v-model:value="logStatus"
            placeholder="日志状态"
            style="width: 150px; margin-right: 16px;"
            @change="filterLogs"
            allowClear
          >
            <a-select-option :value="true">成功</a-select-option>
            <a-select-option :value="false">失败</a-select-option>
          </a-select>
          
          <a-range-picker
            v-model:value="dateRange"
            format="YYYY-MM-DD HH:mm:ss"
            :show-time="{ format: 'HH:mm:ss' }"
            @change="filterLogs"
            style="width: 400px;"
          />
        </div>
      </div>
      
      <!-- 日志表格 -->
      <a-table
        :dataSource="filteredLogs"
        :columns="columns"
        :loading="loading"
        :pagination="{
          current: currentPage,
          pageSize: pageSize,
          total: totalLogs,
          showTotal: (total: number) => `共 ${total} 条`,
          onChange: handlePageChange
        }"
        bordered
        :scroll="{ x: 'max-content' }"
        :resizable="true"
      >
        <template #bodyCell="{ column, record }">
          <!-- 状态列 -->
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusTagColor(record.status)">
              {{ record.status ? '成功' : '失败' }}
            </a-tag>
          </template>
          
          <!-- 执行耗时列 -->
          <template v-if="column.key === 'duration'">
            {{ formatDuration(record.duration) }}
          </template>
          
          <!-- 操作列 -->
          <template v-if="column.key === 'operation'">
            <a-button type="link" @click="viewLogDetail(record)">详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
    
    <!-- 日志详情抽屉 -->
    <a-drawer
      v-model:open="drawerVisible"
      title="日志详情"
      width="600px"
      placement="right"
    >
      <div v-if="selectedLog">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="任务ID">{{ selectedLog.job_id }}</a-descriptions-item>
          <a-descriptions-item label="时间">
            {{ formatDateTime(selectedLog.timestamp) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusTagColor(selectedLog.status)">
              {{ selectedLog.status ? '成功' : '失败' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="执行耗时">
            <div>
              <div>{{ formatDuration(selectedLog.duration) }}</div>
              <div class="raw-duration">原始值: {{ selectedLog.duration }}ms</div>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="消息">
            <div class="log-content">{{ selectedLog.message }}</div>
          </a-descriptions-item>
          <a-descriptions-item label="输出" v-if="selectedLog.output">
            <div class="log-content">{{ selectedLog.output }}</div>
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getLog } from '../../api/index'
import type { LogItem } from '../../types/api'
import dayjs from 'dayjs'
import { SearchOutlined } from '@ant-design/icons-vue'

// 表格列定义
const columns = [
  {
    title: '任务ID',
    dataIndex: 'job_id',
    key: 'job_id',
    width: 180,
    resizable: true,
  },
  {
    title: '时间',
    dataIndex: 'timestamp',
    key: 'timestamp',
    width: 180,
    customRender: ({ text }: { text: string }) => formatDateTime(text),
    resizable: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    resizable: true,
  },
  {
    title: '执行耗时',
    dataIndex: 'duration',
    key: 'duration',
    width: 120,
    resizable: true,
  },
  {
    title: '消息',
    dataIndex: 'message',
    key: 'message',
    ellipsis: true,
    resizable: true,
    width: 300,
  },
  {
    title: '操作',
    key: 'operation',
    width: 100,
    fixed: 'right',
  }
]

// 数据和状态
const filteredLogs = ref<LogItem[]>([])
const loading = ref(false)
const jobIdKeyword = ref('')
const logStatus = ref<boolean | undefined>(undefined)
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
const currentPage = ref(1)
const pageSize = ref(10)
const totalLogs = ref(0)
const drawerVisible = ref(false)
const selectedLog = ref<LogItem | null>(null)

// 获取日志数据
const fetchLogs = async () => {
  loading.value = true
  try {
    // 格式化日期为ISO字符串，确保使用正确的格式
    const startTime = dateRange.value && dateRange.value[0] 
      ? dateRange.value[0].format('YYYY-MM-DDTHH:mm:ss') 
      : undefined
      
    const endTime = dateRange.value && dateRange.value[1] 
      ? dateRange.value[1].format('YYYY-MM-DDTHH:mm:ss') 
      : undefined
    

    // 创建一个符合Job类型的对象
    const dummyJob = jobIdKeyword.value ? {
      id: jobIdKeyword.value,
      func: '',
      trigger: '',
      kwargs: {},
      next_run_time: '',
      status: ''
    } : null
    
    // 使用API函数
    const response = await getLog(
      currentPage.value,
      pageSize.value,
      dummyJob,
      logStatus.value,
      startTime,
      endTime
    )
    
    if (response && response.code === 200 && response.data) {
      // 处理嵌套结构 response.data.logs
      const logData = response.data
      
      // 确保logs是数组
      filteredLogs.value = Array.isArray(logData.logs) ? logData.logs : []
      totalLogs.value = logData.count || 0
    } else {
      message.error('获取日志数据失败')
      filteredLogs.value = []
      totalLogs.value = 0
    }
  } catch (error) {
    message.error('获取日志数据失败')
    console.error(error)
    filteredLogs.value = []
    totalLogs.value = 0
  } finally {
    loading.value = false
  }
}

// 刷新日志
const refreshLogs = () => {
  fetchLogs()
}

// 过滤日志
const filterLogs = () => {
  // 重新获取日志数据
  currentPage.value = 1 // 重置为第一页
  fetchLogs()
}

// 处理分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchLogs()
}

// 查看日志详情
const viewLogDetail = (log: LogItem) => {
  selectedLog.value = log
  drawerVisible.value = true
}

// 获取日志状态对应的标签颜色
const getStatusTagColor = (status: boolean) => {
  return status ? 'green' : 'red'
}

// 格式化日期时间
const formatDateTime = (timestamp: string) => {
  if (!timestamp) return '-'
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

// 格式化持续时间
const formatDuration = (duration: number) => {
  if (duration === undefined || duration === null) return '-'
  
  if (duration < 1000) {
    // 保留2位有效数字
    if (duration < 10) {
      // 小于10ms时，保留2位小数
      return `${duration.toFixed(2)}ms`
    } else if (duration < 100) {
      // 10-100ms时，保留1位小数
      return `${duration.toFixed(1)}ms`
    } else {
      // 100ms以上，取整
      return `${Math.round(duration)}ms`
    }
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m${seconds}s`
  }
}

// 初始化
onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.log-list-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.log-search {
  margin-bottom: 16px;
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.log-content {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.raw-duration {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}
</style>