<template>
  <div class="job-detail-container">
    <div class="detail-header">
      <div class="header-left">
        <a-button type="primary" @click="goBack" class="back-button">
          <template #icon><arrow-left-outlined /></template>
          返回任务列表
        </a-button>
      </div>
    </div>
    
    <div class="detail-log-container">
      <!-- 任务基本信息卡片 -->
      <a-card class="task-info-card" :bordered="true" :hoverable="true" v-if="detailJobsLog">
        <template #title>
          <div class="card-header">
            <info-circle-outlined />
            <span>任务基本信息</span>
          </div>
        </template>
        
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="任务ID">
            <span class="id-text">{{ detailJobsLog.id }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="任务函数">
            <span class="func-text">{{ detailJobsLog.func }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="触发器类型">
            <a-tag :color="getTriggerColor(detailJobsLog.trigger)">{{ detailJobsLog.trigger }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="参数">
            <a-tooltip v-if="detailJobsLog.kwargs" :title="formatTooltipContent(detailJobsLog.kwargs)">
              <div class="kwargs-content">{{ detailJobsLog.kwargs || '无' }}</div>
            </a-tooltip>
            <span v-else>无</span>
          </a-descriptions-item>
          <a-descriptions-item label="下次执行时间">
            <div class="next-run-time">
              <a-tag :color="getTimeTagColor(detailJobsLog.next_run_time)" class="time-tag">
                <calendar-outlined style="margin-right: 6px" />
                <span>{{ formatNextRunTime(detailJobsLog.next_run_time) }}</span>
              </a-tag>
              <span class="time-relative" v-if="detailJobsLog.next_run_time">
                {{ getRelativeTime(detailJobsLog.next_run_time) }}
              </span>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="detailJobsLog.status === '已暂停' ? 'red' : 'green'" class="status-tag" :style="{ width: 'auto', padding: '0 8px' }">
              <template #icon>
                <pause-outlined v-if="detailJobsLog.status === '已暂停'" />
                <play-circle-outlined v-else />
              </template>
              {{ detailJobsLog.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="操作">
            <div class="action-buttons">
              <a-button type="primary" size="small" @click="editJob(detailJobsLog)" class="action-btn edit-btn">
                <template #icon><edit-outlined /></template>
                编辑
              </a-button>
              <a-button 
                :type="detailJobsLog.status === '已暂停' ? 'success' : 'warning'" 
                size="small" 
                @click="changeStatus(detailJobsLog.status, detailJobsLog)"
                class="action-btn status-btn"
              >
                <template #icon>
                  <pause-outlined v-if="detailJobsLog.status !== '已暂停'" />
                  <play-circle-outlined v-else />
                </template>
                {{ detailJobsLog.status === '已暂停' ? '恢复' : '暂停' }}
              </a-button>
              <a-button type="primary" size="small" @click="runJobNow(detailJobsLog)" class="action-btn run-btn">
                <template #icon><thunderbolt-outlined /></template>
                执行
              </a-button>
              <a-button danger size="small" @click="deleteJob(detailJobsLog)" class="action-btn delete-btn">
                <template #icon><delete-outlined /></template>
                删除
              </a-button>
            </div>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>
      
      <a-card class="task-info-card" :bordered="true" :hoverable="true" v-else>
        <template #title>
          <div class="card-header">
            <info-circle-outlined />
            <span>任务基本信息</span>
          </div>
        </template>
        <div class="loading-placeholder">
          <a-spin />
          <div class="loading-text">正在加载任务信息...</div>
        </div>
      </a-card>
      
      <!-- 日志筛选区域 -->
      <a-card class="log-filter-card" :bordered="true" v-if="detailJobsLog">
        <template #title>
          <div class="card-header">
            <filter-outlined />
            <span>日志筛选</span>
          </div>
        </template>
        <div class="filter-content">
          <a-select v-model:value="searchSelect" allowClear placeholder="执行状态" @change="searchSelectValue" style="width: 120px;">
            <a-select-option
              v-for="item in statusOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-select-option>
          </a-select>
          
          <a-config-provider :locale="zhCn">
            <a-range-picker
              v-model:value="searchDate"
              format="YYYY-MM-DD HH:mm:ss"
              :show-time="{ format: 'HH:mm:ss' }"
              @change="searchDateValue"
              style="margin: 0 10px; width: 400px;"
              :placeholder="['开始时间', '结束时间']"
            />
          </a-config-provider>

          <a-button type="primary" @click="searchLog">
            <template #icon><search-outlined /></template>
            搜索
          </a-button>
          <a-button @click="resetSearch" style="margin-left: 8px;">
            <template #icon><reload-outlined /></template>
            重置
          </a-button>
        </div>
      </a-card>
      
      <!-- 日志列表和详情 -->
      <div class="log-detail-section" v-if="detailJobsLog">
        <!-- 左侧日志列表 -->
        <a-card class="log-list-card" :bordered="true">
          <template #title>
            <div class="card-header">
              <history-outlined />
              <span>执行记录</span>
              <a-badge :count="missionLogTotal" :overflowCount="99" />
            </div>
          </template>
          
          <div class="log-scroll-container">
            <a-empty v-if="loading" description="加载中..." style="padding: 30px;">
              <template #image>
                <a-spin />
              </template>
            </a-empty>
            
            <div v-else-if="missionLogTableData.length > 0">
              <div 
                v-for="(item, index) in missionLogTableData" 
                :key="item.id || index" 
                :class="['log-item', {'active': selectedLogIndex === index}]" 
                @click="showDetailLogMessage(item, index)"
              >
                <div class="log-item-header">
                  <div class="log-item-status">
                    <a-tag 
                      :color="item.status ? 'green' : 'red'" 
                      size="small"
                    >
                      <template #icon>
                        <check-circle-outlined v-if="item.status" />
                        <close-circle-outlined v-else />
                      </template>
                      {{ item.status ? '成功' : '失败' }}
                    </a-tag>
                  </div>
                  <div class="log-time">
                    <clock-circle-outlined />
                    {{ formatLogTime(item.timestamp) }}
                  </div>
                </div>
                <div class="log-item-content">
                  <div class="log-message">{{ truncateMessage(item.message) }}</div>
                  <div class="log-duration">
                    <hourglass-outlined />
                    <span>{{ formatDuration(item.duration) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <a-empty v-else description="暂无日志记录" />
          </div>
          
          <div class="pagination-container">
            <a-config-provider :locale="zhCn">
              <a-pagination
                v-model:current="missionLogCurrentPage"
                v-model:pageSize="missionLogPageSize"
                :pageSizeOptions="[5, 10, 20, 30]"
                showSizeChanger
                :showTotal="(total: number) => `共 ${total} 条`"
                :total="missionLogTotal"
                @change="handlePaginationChange"
                size="small"
              />
            </a-config-provider>
          </div>
        </a-card>
        
        <!-- 右侧日志详情 -->
        <a-card v-if="detailLogMessage && Object.keys(detailLogMessage).length > 0" class="log-detail-card" :bordered="true">
          <template #title>
            <div class="card-header">
              <file-text-outlined />
              <span>执行详情</span>
              <a-tag 
                :color="detailLogMessage.status ? 'green' : 'red'"
              >
                <template #icon>
                  <check-circle-outlined v-if="detailLogMessage.status" />
                  <close-circle-outlined v-else />
                </template>
                {{ detailLogMessage.status ? '成功' : '失败' }}
              </a-tag>
            </div>
          </template>
          
          <a-descriptions :column="1" bordered>
            <a-descriptions-item label="任务编号">
              <code>{{ detailLogMessage.job_id || '未知' }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="执行信息">
              {{ detailLogMessage.message || '无信息' }}
            </a-descriptions-item>
            <a-descriptions-item label="开始时间">
              <calendar-outlined style="margin-right: 6px" />
              {{ formatFullDateTime(detailLogMessage.timestamp) }}
            </a-descriptions-item>
            <a-descriptions-item label="执行耗时">
              <hourglass-outlined style="margin-right: 6px" />
              {{ formatDuration(detailLogMessage.duration) }}
            </a-descriptions-item>
          </a-descriptions>
          
          <div class="output-section">
            <div class="output-header">
              <code-outlined />
              任务输出
            </div>
            <a-textarea
              v-model:value="detailLogMessage.output"
              :auto-size="{ minRows: 5, maxRows: 15 }"
              placeholder="无输出内容"
              readonly
              class="output-content"
            />
          </div>
        </a-card>
        
        <!-- 无日志时的占位 -->
        <a-card v-else class="log-detail-card" :bordered="true">
          <template #title>
            <div class="card-header">
              <file-text-outlined />
              <span>执行详情</span>
            </div>
          </template>
          
          <div class="no-log-selected">
            <a-empty description="请选择一条日志记录查看详情">
              <template #image>
                <file-search-outlined style="font-size: 48px; color: #aaaaaa;" />
              </template>
            </a-empty>
          </div>
        </a-card>
      </div>
      
      <div class="log-detail-section" v-else>
        <a-card :bordered="true" class="loading-card">
          <a-empty description="加载中，请稍候...">
            <template #image>
              <a-spin size="large" />
            </template>
          </a-empty>
        </a-card>
      </div>
    </div>
    
    <!-- 任务表单抽屉 -->
    <JobFormDrawer 
      v-if="drawer"
      v-model="drawer" 
      :title="drawerTitle" 
      :form-data="formData" 
      :func-options="funcOptions"
      @submit="submitForm"
      @close="closeDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import _ from 'lodash'
import zhCn from 'ant-design-vue/es/locale/zh_CN'
import { 
  CalendarOutlined,
  ClockCircleOutlined, 
  PauseOutlined,
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  FilterOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  CodeOutlined,
  HourglassOutlined,
  SyncOutlined,
  NumberOutlined,
  HistoryOutlined,
  ArrowLeftOutlined,
  FileSearchOutlined
} from '@ant-design/icons-vue'

// 导入组件和API，重命名冲突的函数
import JobFormDrawer from './components/JobFormDrawer.vue'
import {
  getJobs,
  pauseJob,
  resumeJob,
  deleteJob as apiDeleteJob,
  getFuncOptions,
  editJob as apiEditJob,
  getLog,
  immediateJob
} from '../../api/index'
import type { Job, LogResponse, LogItem, ApiResponse, FuncOption } from '../../types/api'

// 初始化dayjs插件
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const route = useRoute()
const router = useRouter()
const jobId = route.params.id as string

// 数据
const detailJobsLog = ref<Job | null>(null)
const missionLogTableData = ref<LogItem[]>([])
const missionLogCurrentPage = ref(1)
const missionLogPageSize = ref(10)
const missionLogTotal = ref(0)
const detailLogMessage = ref<LogItem | Record<string, any>>({})
const selectedLogIndex = ref(0)
const searchSelect = ref()
const searchDate = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
const startTime = ref()
const endTime = ref()
const statusOptions = [
  {
    label: '成功',
    value: true
  },
  {
    label: '失败',
    value: false
  }
]
const drawer = ref(false)
const drawerTitle = ref('')
const formData = ref({})
const funcOptions = ref([])

// 添加loading状态
const loading = ref(false)

// 方法
const loadJobDetail = async () => {
  try {
    const response = await getJobs()
    
    // 适配新的API返回结构 {code, msg, data: [...]}
    if (response && response.code === 200 && Array.isArray(response.data)) {
      const jobsData = response.data;
      
      // 查找匹配的任务
      const job = jobsData.find((job: Job) => job.id === jobId)
      
      if (job) {
        detailJobsLog.value = job
        
        // 获取任务日志
        getMissionLogTableData(missionLogCurrentPage.value, missionLogPageSize.value)
      } else {
        message.error('未找到指定任务')
        router.push('/jobs')
      }
    } else {
      message.error('获取任务列表失败')
      console.error('API返回格式不正确', response)
    }
  } catch (error) {
    message.error('加载任务详情失败')
    console.error(error)
  }
}

const getMissionLogTableData = async (page = 1, pageSize = 10) => {
  try {
    if (!detailJobsLog.value) {
      console.error('任务详情为空')
      return
    }
    
    loading.value = true
    const response = await getLog(page, pageSize, detailJobsLog.value, searchSelect.value, startTime.value, endTime.value)
    
    // 适配API返回结构
    if (response && response.code === 200 && response.data) {
      
      // 处理嵌套结构 response.data.logs
      const logData = response.data;
      
      // 确保logs是数组
      missionLogTableData.value = Array.isArray(logData.logs) ? logData.logs : [];
      missionLogTotal.value = logData.count || 0;
      
      if (missionLogTableData.value.length > 0) {
        detailLogMessage.value = missionLogTableData.value[0];
        selectedLogIndex.value = 0;
      } else {
        detailLogMessage.value = {} as LogItem;
      }
    } else {
      console.error('日志API返回格式不正确', response);
      missionLogTableData.value = [];
      missionLogTotal.value = 0;
    }
  } catch (error) {
    console.error('获取日志失败', error);
    message.error('获取日志数据失败')
    missionLogTableData.value = [];
    missionLogTotal.value = 0;
  } finally {
    loading.value = false
  }
}

const missionLogSizeChange = (val: number) => {
  missionLogPageSize.value = val
  getMissionLogTableData(missionLogCurrentPage.value, missionLogPageSize.value)
}

const missionLogCurrentChange = (val: number) => {
  missionLogCurrentPage.value = val
  getMissionLogTableData(missionLogCurrentPage.value, missionLogPageSize.value)
}

const showDetailLogMessage = (row: any, index: number) => {
  selectedLogIndex.value = index
  detailLogMessage.value = row
}

const searchSelectValue = (value: any) => {
  searchSelect.value = value
}

const searchDateValue = (value: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
  if (value && value.length === 2) {
    startTime.value = value[0].format('YYYY-MM-DDTHH:mm:ss')
    endTime.value = value[1].format('YYYY-MM-DDTHH:mm:ss')
  } else {
    startTime.value = undefined
    endTime.value = undefined
  }
}

const searchLog = async () => {
  if (!detailJobsLog.value) {
    console.error('任务详情为空')
    return
  }
  
  const response = await getLog(1, 10, detailJobsLog.value, searchSelect.value, startTime.value, endTime.value)
  
  // 适配API返回结构
  if (response && response.code === 200 && response.data) {
    
    // 处理嵌套结构 response.data.logs
    const logData = response.data;
    
    // 确保logs是数组
    missionLogTableData.value = Array.isArray(logData.logs) ? logData.logs : [];
    missionLogTotal.value = logData.count || 0;
    
    if (missionLogTableData.value.length > 0) {
      detailLogMessage.value = missionLogTableData.value[0];
      selectedLogIndex.value = 0;
    } else {
      detailLogMessage.value = {} as LogItem;
    }
  } else {
    console.error('日志API返回格式不正确', response);
    missionLogTableData.value = [];
    missionLogTotal.value = 0;
  }
}

const resetSearch = () => {
  searchSelect.value = undefined
  searchDate.value = null
  startTime.value = undefined
  endTime.value = undefined
  getMissionLogTableData(missionLogCurrentPage.value, missionLogPageSize.value)
}

const goBack = () => {
  router.push('/jobs')
}

const editJob = async (row: Job) => {
  // 获取功能选项
  const response = await getFuncOptions()
  
  if (response && response.code === 200) {
    let optionsData: FuncOption[] = [];
    
    // 处理两种可能的返回格式
    if (Array.isArray(response.data)) {
      optionsData = response.data;
    } else if (response.data && typeof response.data === 'object' && 'tasks' in response.data && Array.isArray(response.data.tasks)) {
      optionsData = response.data.tasks;
    }
    
    // 使用类型断言解决类型错误
    funcOptions.value = optionsData.map(item => ({
      label: item.name,
      value: item.name,
      description: item.description,
      parameters: item.parameters
    })) as any;
  }
  
  drawerTitle.value = '修改任务'
  const data = _.cloneDeep(row)
  
  // 处理kwargs
  if(data.func === 'example_task'){
    data.kwargs = {
      arg1: data.kwargs.split('-')[0],
      arg2: data.kwargs.split('-')[1]
    }
  } else if(data.func === 'another_task') {
    data.kwargs = {
      param: data.kwargs
    }
  } else if(data.func === 'run_os_command' || data.func === 'run_python_command') {
    // 确保命令是字符串类型
    const commandStr = typeof data.kwargs === 'object' ? 
      (data.kwargs.command || JSON.stringify(data.kwargs)) : 
      String(data.kwargs);
      
    data.kwargs = {
      command: commandStr
    }
  }
  
  // 处理trigger
  const triggers = data.trigger.split(' : ')[0]
  const triggerArgs = data.trigger.split(' : ')[1]
  data.trigger_args = {}
  
  if(triggers === '周期性任务') {
    data.trigger = 'interval'
    
    triggerArgs.split(', ').forEach(item => {
      if(item.includes(' days')) {
        data.trigger_args.days = +item.split(' ')[0]
      } else {
        const hours = item.split(':')[0];
        const minutes = item.split(':')[1];
        const seconds = item.split(':')[2];
        
        // 使用parseInt解决比较错误
        data.trigger_args.hours = parseInt(hours) >= 10 ? parseInt(hours) : parseInt(hours[hours.length - 1])
        data.trigger_args.minutes = parseInt(minutes) >= 10 ? parseInt(minutes) : parseInt(minutes[minutes.length - 1])
        data.trigger_args.seconds = parseInt(seconds) >= 10 ? parseInt(seconds) : parseInt(seconds[seconds.length - 1])
      }
    })
  } else if(triggers === '特定时间周期') {
    data.trigger = 'cron'
    
    triggerArgs.split(',').forEach(item => {
      const key = item.split('=')[0].trim()
      const value = item.split('=')[1].replace(/['"]/g, '')
      data.trigger_args[key] = +value
    })
  } else {
    data.trigger = 'date'
    data.trigger_args = {
      run_date: triggerArgs
    }
  }
  
  formData.value = {
    ...data,
    job_id: data.id
  }
  
  drawer.value = true
}

const deleteJob = (row: any) => {
  Modal.confirm({
    title: '确认删除该任务?',
    content: '确认删除该任务?',
    okText: '确认',
    cancelText: '取消',
    type: 'warning',
    onOk: async() => {
      await apiDeleteJob(row.id)
      message.success('删除成功')
      router.push('/jobs')
    }
  })
}

const runJobNow = async (row: Job) => {
  const response = await immediateJob(row)
  if (response && response.code === 200) {
    message.success(response.msg || '执行成功')
  } else {
    message.error('执行失败')
  }
  loadJobDetail()
}

const changeStatus = async (status: string, row: any) => {
  if(status === '已暂停') {
    await resumeJob(row.id)
    message.success('任务恢复')
  } else {
    await pauseJob(row.id)
    message.success('任务暂停')
  }
  loadJobDetail()
}

const submitForm = async (data: any) => {
  try {
    if(data.kwargs === ''){
      data.kwargs = {}
    }
    await apiEditJob(data)
    message.success('修改成功')
    loadJobDetail()
    drawer.value = false
  } catch (error: any) {
    message.error('修改失败：' + (error.message || '未知错误'))
  }
}

const closeDrawer = () => {
  drawer.value = false
}

// 格式化下次执行时间的函数
const formatNextRunTime = (timeStr: string | undefined | null) => {
  if (!timeStr) return '未设置'
  return dayjs(timeStr).format('YYYY-MM-DD HH:mm:ss')
}

// 获取相对时间（如"3小时后"、"2天后"）
const getRelativeTime = (timeStr: string | undefined | null) => {
  if (!timeStr) return ''
  
  const now = dayjs()
  const targetTime = dayjs(timeStr)
  
  // 如果目标时间已过，显示"已过期"
  if (targetTime.isBefore(now)) {
    return '已过期'
  }
  
  return targetTime.fromNow()
}

// 根据时间确定标签类型
const getTimeTagType = (timeStr: string | undefined | null) => {
  if (!timeStr) return 'info'
  
  const now = dayjs()
  const targetTime = dayjs(timeStr)
  
  // 如果已过期
  if (targetTime.isBefore(now)) {
    return 'danger'
  }
  
  // 如果在24小时内
  if (targetTime.diff(now, 'hour') < 24) {
    return 'warning'
  }
  
  // 如果在7天内
  if (targetTime.diff(now, 'day') < 7) {
    return 'success'
  }
  
  // 更远的未来
  return 'info'
}

// 格式化日志时间，只显示时间部分
const formatLogTime = (timeStr: string | undefined | null) => {
  if (!timeStr) return ''
  return dayjs(timeStr).format('MM-DD HH:mm:ss')
}

// 格式化完整日期时间
const formatFullDateTime = (timeStr: string | undefined | null) => {
  if (!timeStr) return ''
  return dayjs(timeStr).format('YYYY-MM-DD HH:mm:ss')
}

// 格式化持续时间
const formatDuration = (duration: number | undefined | null) => {
  if (duration === undefined || duration === null) return '未知'
  
  if (duration < 1000) {
    return `${duration}ms`
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(2)}秒`
  } else {
    const minutes = Math.floor(duration / 60000)
    const seconds = ((duration % 60000) / 1000).toFixed(0)
    return `${minutes}分${seconds}秒`
  }
}

// 截断消息文本
const truncateMessage = (message: string | undefined | null) => {
  if (!message) return ''
  return message.length > 30 ? message.substring(0, 30) + '...' : message
}

// 添加处理分页变化的方法
const handlePaginationChange = (page: number, pageSize: number) => {
  missionLogCurrentPage.value = page
  missionLogPageSize.value = pageSize
  getMissionLogTableData(page, pageSize)
}

// 添加getTriggerColor方法
const getTriggerColor = (trigger: string) => {
  if (trigger.includes('周期性任务')) {
    return 'purple'
  } else if (trigger.includes('特定时间周期')) {
    return 'geekblue'
  } else if (trigger.includes('特定日期')) {
    return 'cyan'
  }
  return 'default'
}

// 添加getTimeTagColor方法
const getTimeTagColor = (timeStr: string | null | undefined) => {
  if (!timeStr) return 'default'
  
  const now = dayjs()
  const targetTime = dayjs(timeStr)
  
  // 如果已过期
  if (targetTime.isBefore(now)) {
    return 'red'
  }
  
  // 如果在24小时内
  if (targetTime.diff(now, 'hour') < 24) {
    return 'orange'
  }
  
  // 如果在7天内
  if (targetTime.diff(now, 'day') < 7) {
    return 'green'
  }
  
  // 更远的未来
  return 'blue'
}

// 添加formatTooltipContent方法
const formatTooltipContent = (content: string | object) => {
  if (typeof content === 'object') {
    return JSON.stringify(content, null, 2)
  }
  return content.toString()
}

onMounted(() => {
  loadJobDetail()
})
</script>

<style scoped lang="scss">
.job-detail-container {
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    // margin-bottom: 20px;
    // padding: 16px 0;
    border-bottom: 1px solid #ebeef5;
    
    .header-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      
      .back-button {
        margin-bottom: 20px;
        display: flex;
        align-items: center;
      }
      
      .title-section {
        .header-title {
          font-size: 20px;
          font-weight: 600;
          color: #303133;
        }
      }
    }
  }

  .detail-log-container {
    .task-info-card, .log-filter-card, .log-list-card, .log-detail-card {
      margin-bottom: 20px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      background-color: #fff;
      
      .card-header {
        font-weight: 600;
        color: #303133;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
    
    .loading-placeholder {
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      
      .loading-text {
        margin-top: 16px;
        color: #909399;
      }
    }
    
    .kwargs-content {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
    }
    
    .log-filter-card {
      .filter-content {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
    }
    
    .log-detail-section {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 20px;
      
      .log-list-card {
        margin-bottom: 0;
        height: fit-content;
        
        .log-scroll-container {
          height: 400px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        
        .log-item {
          padding: 12px 15px;
          border-bottom: 1px solid #ebeef5;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          transition: all 0.3s;
          
          &:hover {
            background-color: #f5f7fa;
          }
          
          &.active {
            background-color: #e6f7ff;
            border-right: 3px solid #1890ff;
          }
          
          .log-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            
            .log-item-status {
              flex-shrink: 0;
            }
            
            .log-time {
              font-size: 12px;
              color: #606266;
              display: flex;
              align-items: center;
              gap: 4px;
            }
          }
          
          .log-item-content {
            display: flex;
            flex-direction: column;
            
            .log-message {
              font-size: 14px;
              color: #303133;
              word-break: break-word;
              margin-bottom: 6px;
            }
            
            .log-duration {
              font-size: 12px;
              color: #909399;
              display: flex;
              align-items: center;
              gap: 4px;
            }
          }
        }
      }
      
      .log-detail-card {
        margin-bottom: 0;
        
        .output-section {
          padding: 15px;
          border-top: 1px solid #ebeef5;
          margin-top: 16px;
          
          .output-header {
            font-weight: 600;
            margin-bottom: 10px;
            color: #303133;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .output-content {
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            background-color: #f5f7fa;
            border-radius: 4px;
          }
        }
      }
      
      .no-log-selected {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 0;
        height: 100%;
      }
      
      .loading-card {
        grid-column: 1 / span 2;
      }
    }
  }
  
  .next-run-time {
    display: flex;
    flex-direction: row;
    align-items: center;
    
    .time-tag {
      display: flex;
      align-items: center;
      font-size: 13px;
      
      span {
        white-space: nowrap;
      }
    }
    
    .time-relative {
      font-size: 12px;
      color: #909399;
      padding-left: 8px;
    }
  }
  
  .status-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    line-height: 24px;
  }
  
  .action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    
    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 64px;
      
      &.edit-btn {
        background-color: #1890ff;
        border-color: #1890ff;
      }
      
      &.run-btn {
        background-color: #13c2c2;
        border-color: #13c2c2;
      }
      
      &.status-btn {
        &.ant-btn-warning {
          background-color: #faad14;
          border-color: #faad14;
          color: #fff;
        }
      }
    }
  }
  
  :deep(.ant-descriptions-bordered) {
    .ant-descriptions-item-label {
      background-color: #f5f7fa;
      width: 120px;
    }
  }

  .pagination-container {
    padding: 12px 16px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: flex-end;
  }

  .func-text {
    font-weight: 500;
    color: #722ed1; // 保持与原来tag的紫色一致
  }
  
  .id-text {
    font-family: monospace;
    color: #1890ff;
    font-weight: 500;
  }
}
</style> 