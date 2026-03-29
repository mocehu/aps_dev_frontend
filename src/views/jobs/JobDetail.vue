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
          <a-descriptions-item label="任务名称">
            <span>{{ detailJobsLog.name || '未设置' }}</span>
          </a-descriptions-item>
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
              <template v-if="detailJobsLog.status === '已暂停'">
                <a-tag color="default" class="time-tag">
                  <pause-outlined style="margin-right: 6px" />
                  <span>已暂停</span>
                </a-tag>
                <span class="time-relative" style="color: #909399">任务已暂停，不会自动执行</span>
              </template>
              <template v-else>
                <a-tag :bordered="false" :color="getTimeTagColor(detailJobsLog.next_run_time)" class="time-tag">
                  <calendar-outlined style="margin-right: 6px" />
                  <span>{{ formatNextRunTime(detailJobsLog.next_run_time) }}</span>
                </a-tag>
                <span class="time-relative" v-if="detailJobsLog.next_run_time && isValidTime(detailJobsLog.next_run_time)">
                  {{ getRelativeTime(detailJobsLog.next_run_time) }}
                </span>
              </template>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :bordered="false" :color="detailJobsLog.status === '已暂停' ? 'red' : 'green'" class="status-tag" :style="{ width: 'auto', padding: '0 8px' }">
              <template #icon>
                <pause-outlined v-if="detailJobsLog.status === '已暂停'" />
                <play-circle-outlined v-else />
              </template>
              {{ detailJobsLog.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="操作">
            <div class="action-buttons">
              <a-button type="primary"  @click="editJob(detailJobsLog)" class="action-btn edit-btn">
                <template #icon><edit-outlined /></template>
                编辑
              </a-button>
              <a-button 
                :type="detailJobsLog.status === '已暂停' ? 'success' : 'warning'"
                @click="changeStatus(detailJobsLog.status, detailJobsLog)"
                class="action-btn status-btn"
              >
                <template #icon>
                  <pause-outlined v-if="detailJobsLog.status !== '已暂停'" />
                  <play-circle-outlined v-else />
                </template>
                {{ detailJobsLog.status === '已暂停' ? '恢复' : '暂停' }}
              </a-button>
              <a-button type="primary" @click="runJobNow(detailJobsLog)" class="action-btn run-btn">
                <template #icon><thunderbolt-outlined /></template>
                执行
              </a-button>
              <a-button danger @click="deleteJob(detailJobsLog)" class="action-btn delete-btn">
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
              <div class="card-header-left">
                <history-outlined />
                <span>执行记录</span>
                <a-badge :count="missionLogTotal" :overflowCount="99" />
              </div>
              <div class="card-header-right">
                <a-switch 
                  v-model:checked="autoRefresh" 
                  size="small"
                  @change="handleAutoRefreshChange"
                >
                  <template #checkedChildren>自动</template>
                  <template #unCheckedChildren>手动</template>
                </a-switch>
                <a-button 
                  type="text" 
                  size="small" 
                  @click="handleRefreshLog"
                  :loading="refreshing"
                >
                  <template #icon><reload-outlined /></template>
                  刷新
                </a-button>
              </div>
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
import { ref, onMounted, onUnmounted } from 'vue'
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
  HistoryOutlined,
  ArrowLeftOutlined,
  FileSearchOutlined
} from '@ant-design/icons-vue'

// 导入组件和API，重命名冲突的函数
import JobFormDrawer from './components/JobFormDrawer.vue'
import {
  pauseJob,
  resumeJob,
  deleteJob as apiDeleteJob,
  editJob as apiEditJob,
  getLog,
  immediateJob,
  getJob,
  getTaskInfo
} from '../../api/index'
import type { Job, LogItem, FuncOption } from '../../types/api'

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
const refreshing = ref(false)
const autoRefresh = ref(false)
let refreshTimer: ReturnType<typeof setInterval> | null = null

// 方法
const loadJobDetail = async () => {
  try {
    const response = await getJob(jobId)
    
    if (response && response.code === 200 && response.data) {
      detailJobsLog.value = response.data
      getMissionLogTableData(missionLogCurrentPage.value, missionLogPageSize.value)
    } else {
      message.error('获取任务详情失败')
      router.push('/jobs')
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


const showDetailLogMessage = (row: any, index: number) => {
  selectedLogIndex.value = index
  detailLogMessage.value = row
}

const handleRefreshLog = async () => {
  refreshing.value = true
  try {
    await getMissionLogTableData(missionLogCurrentPage.value, missionLogPageSize.value)
  } finally {
    refreshing.value = false
  }
}

const startAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  refreshTimer = setInterval(() => {
    getMissionLogTableData(missionLogCurrentPage.value, missionLogPageSize.value)
  }, 10000)
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const handleAutoRefreshChange = (checked: boolean) => {
  if (checked) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
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
  drawerTitle.value = '修改任务'
  
  try {
    // 获取任务详情
    const jobResponse = await getJob(row.id)
    if (jobResponse && jobResponse.code === 200 && jobResponse.data) {
      const data = _.cloneDeep(jobResponse.data)
      
      // 获取函数详情
      const taskResponse = await getTaskInfo(data.func)
      if (taskResponse && taskResponse.code === 200 && taskResponse.data) {
        const taskInfo = taskResponse.data
        funcOptions.value = [{
          label: taskInfo.name,
          value: taskInfo.name,
          description: taskInfo.description,
          parameters: taskInfo.parameters
        }]
      }
      
      // 处理kwargs
      if(data.func === 'example_task'){
        if (typeof data.kwargs === 'string') {
          const parts = data.kwargs.split('-');
          data.kwargs = {
            arg1: parts[0] || '',
            arg2: parseInt(parts[1] || '0')
          }
        } else if (data.kwargs && 'arg1' in data.kwargs && 'arg2' in data.kwargs) {
          // 已经是正确格式，不需要处理
        } else {
          data.kwargs = { arg1: '', arg2: 0 }
        }
      } else if(data.func === 'another_task') {
        if (typeof data.kwargs === 'string') {
          data.kwargs = { param: data.kwargs }
        } else if (data.kwargs && 'param' in data.kwargs) {
          // 已经是正确格式，不需要处理
        } else {
          data.kwargs = { param: '' }
        }
      } else if(data.func === 'run_os_command' || data.func === 'run_python_command') {
        if (typeof data.kwargs === 'string') {
          data.kwargs = { command: data.kwargs }
        } else if (data.kwargs && 'command' in data.kwargs) {
          // 已经是正确格式，不需要处理
        } else {
          data.kwargs = { command: '' }
        }
      }
      
      // 处理trigger
      if (data.trigger) {
        data.trigger_args = {};
        
        // 解析格式: "interval[0:01:00]" 或 "cron[hour='8', minute='30']" 或 "date[2024-01-01 12:00:00]"
        const triggerMatch = data.trigger.match(/^(\w+)\[(.+)\]$/);
        
        if (triggerMatch) {
          const triggerType = triggerMatch[1];
          const triggerArgs = triggerMatch[2];
          
          if (triggerType === 'interval') {
            data.trigger = 'interval';
            
            // 格式: "days:hours:minutes:seconds" 或 "hours:minutes:seconds"
            const timeParts = triggerArgs.split(':');
            if (timeParts.length === 4) {
              data.trigger_args.days = parseInt(timeParts[0]) || 0;
              data.trigger_args.hours = parseInt(timeParts[1]) || 0;
              data.trigger_args.minutes = parseInt(timeParts[2]) || 0;
              data.trigger_args.seconds = parseInt(timeParts[3]) || 0;
            } else if (timeParts.length === 3) {
              data.trigger_args.days = 0;
              data.trigger_args.hours = parseInt(timeParts[0]) || 0;
              data.trigger_args.minutes = parseInt(timeParts[1]) || 0;
              data.trigger_args.seconds = parseInt(timeParts[2]) || 0;
            } else {
              data.trigger_args = { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }
          } else if (triggerType === 'cron') {
            data.trigger = 'cron';
            
            triggerArgs.split(',').forEach(item => {
              const match = item.trim().match(/(\w+)\s*=\s*(.+)/);
              if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/['"]/g, '');
                data.trigger_args[key] = key === 'week' ? value : (parseInt(value) || 0);
              }
            });
            
            const cronFields = ['year', 'month', 'day', 'week', 'day_of_week', 'hour', 'minute', 'second'];
            cronFields.forEach(field => {
              if (data.trigger_args[field] === undefined) {
                data.trigger_args[field] = field === 'week' || field === 'day_of_week' ? '*' : 0;
              }
            });
          } else if (triggerType === 'date') {
            data.trigger = 'date';
            data.trigger_args = {
              run_date: triggerArgs.replace(/['"]/g, '')
            };
          }
        } else {
          data.trigger = 'interval';
          data.trigger_args = { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }
      } else {
        data.trigger = 'interval';
        data.trigger_args = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      
      formData.value = {
        ...data,
        job_id: data.id
      }
      
      drawer.value = true
    } else {
      message.error('获取任务详情失败')
    }
  } catch (error) {
    message.error('加载任务详情失败')
    console.error(error)
  }
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
  const wasPaused = data.status === '已暂停'
  
  try {
    if(data.kwargs === ''){
      data.kwargs = {}
    }
    await apiEditJob(data)
    
    // 如果之前是暂停状态，更新后需要重新暂停
    if (wasPaused) {
      try {
        await pauseJob(data.id || data.job_id)
      } catch (e) {
        console.error('恢复暂停状态失败', e)
      }
    }
    
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

// 检查时间是否有效
const isValidTime = (timeStr: string | undefined | null) => {
  if (!timeStr) return false
  const parsed = dayjs(timeStr)
  return parsed.isValid()
}

// 格式化下次执行时间的函数
const formatNextRunTime = (timeStr: string | undefined | null) => {
  if (!timeStr) return '未设置'
  const parsed = dayjs(timeStr)
  if (!parsed.isValid()) return '未设置'
  return parsed.format('YYYY-MM-DD HH:mm:ss')
}

// 获取相对时间（如"3小时后"、"2天后"）
const getRelativeTime = (timeStr: string | undefined | null) => {
  if (!timeStr) return ''
  const parsed = dayjs(timeStr)
  if (!parsed.isValid()) return ''
  
  const now = dayjs()
  
  // 如果目标时间已过，显示"已过期"
  if (parsed.isBefore(now)) {
    return '已过期'
  }
  
  return parsed.fromNow()
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
  const parsed = dayjs(timeStr)
  if (!parsed.isValid()) return 'default'
  
  const now = dayjs()
  
  // 如果已过期
  if (parsed.isBefore(now)) {
    return 'red'
  }
  
  // 如果在24小时内
  if (parsed.diff(now, 'hour') < 24) {
    return 'orange'
  }
  
  // 如果在7天内
  if (parsed.diff(now, 'day') < 7) {
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

onUnmounted(() => {
  stopAutoRefresh()
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
        
        .card-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .card-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }
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