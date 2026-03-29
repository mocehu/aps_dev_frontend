<template>
  <div class="job-list-container">
    <a-card :bordered="false" :loading="loading">
      <template #title>
        <div class="card-header">
          <h2>计划任务</h2>
          <a-button type="primary" @click="createJob">创建计划任务</a-button>
        </div>
      </template>
      
      <a-table
        :dataSource="jobTableData"
        :columns="columns"
        :pagination="pagination"
        @change="handleTableChange"
        bordered
        :loading="loading"
        :rowClassName="(record: any) => record.status === '已暂停' ? 'paused-row' : ''"
        rowKey="id"
        :scroll="{ x: 'max-content' }"
        :resizable="true"
      >
        <template #emptyText>
          <a-empty description="暂无计划任务" />
        </template>
        
        <template #bodyCell="{ column, record }">
          <!-- 状态列 -->
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === '已暂停' ? 'red' : 'green'" class="status-tag">
              <template #icon>
                <pause-outlined v-if="record.status === '已暂停'" />
                <play-circle-outlined v-else />
              </template>
              {{ record.status }}
            </a-tag>
          </template>
          
          <!-- 下次执行时间列 -->
          <template v-if="column.key === 'next_run_time'">
            <div class="next-run-time">
              <template v-if="record.status === '已暂停'">
                <a-tag color="default" class="time-tag">
                  <pause-outlined style="margin-right: 6px" />
                  <span>已暂停</span>
                </a-tag>
              </template>
              <template v-else>
                <a-tag :color="getTimeTagColor(record.next_run_time)" class="time-tag">
                  <calendar-outlined style="margin-right: 6px" />
                  <span>{{ formatNextRunTime(record.next_run_time) }}</span>
                </a-tag>
                <span class="time-relative" v-if="record.next_run_time && isValidTime(record.next_run_time)">
                  {{ getRelativeTime(record.next_run_time) }}
                </span>
              </template>
            </div>
          </template>
          
          <!-- 触发器类型列 -->
          <template v-if="column.key === 'trigger'">
            <a-tag :color="getTriggerColor(record.trigger)">{{ record.trigger }}</a-tag>
          </template>
          
          <!-- 参数列 -->
          <template v-if="column.key === 'kwargs'">
            <a-tooltip v-if="record.kwargs" placement="topLeft" :title="formatTooltipContent(record.kwargs)">
              <div class="kwargs-content">{{ record.kwargs }}</div>
            </a-tooltip>
            <span v-else>-</span>
          </template>
          
          <!-- 操作列 -->
          <template v-if="column.key === 'action'">
            <div class="action-buttons">
              <a-button type="link" size="small" @click="editJob(record)" title="编辑">
                <template #icon><edit-outlined /></template>
              </a-button>
              
              <a-button type="link" danger size="small" @click="deleteJob(record)" title="删除">
                <template #icon><delete-outlined /></template>
              </a-button>
              
              <a-button type="link" size="small" @click="viewJobDetail(record)" title="详情">
                <template #icon><eye-outlined /></template>
              </a-button>
              
              <a-button type="link" size="small" @click="runJobNow(record)" title="立即执行">
                <template #icon><thunderbolt-outlined /></template>
              </a-button>
              
              <a-button 
                type="link" 
                size="small"
                :danger="record.status !== '已暂停'"
                @click="changeStatus(record.status, record)"
                :title="record.status === '已暂停' ? '恢复任务' : '暂停任务'"
              >
                <template #icon>
                  <pause-outlined v-if="record.status !== '已暂停'" />
                  <play-circle-outlined v-else />
                </template>
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>
    
    <!-- 任务表单抽屉 -->
    <JobFormDrawer 
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
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import _ from 'lodash'
import { 
  CalendarOutlined, 
  PauseOutlined, 
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ThunderboltOutlined
} from '@ant-design/icons-vue'

// 初始化dayjs插件
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 导入组件和API
import JobFormDrawer from './components/JobFormDrawer.vue'
import {
  getJobs,
  pauseJob,
  resumeJob,
  deleteJob as apiDeleteJob,
  addJob,
  editJob as apiEditJob,
  immediateJob,
  getJob,
  getTaskInfo
} from '../../api/index'

const router = useRouter()

// 数据
const jobTableData = ref([])
const drawer = ref(false)
const drawerTitle = ref('')
const formData = ref({})
const funcOptions = ref<Array<{
  label: string;
  value: string;
  description: string;
  parameters: any;
}>>([])
const initFormData = ref({
  func: '',
  trigger: '',
  kwargs: {},
  job_id: '',
  name: '',
  trigger_args: {}
})
const loading = ref(false)

// 表格配置
const columns = [
  {
    title: '任务名称',
    dataIndex: 'name',
    key: 'name',
    width: 150,
    ellipsis: true,
    resizable: true
  },
  {
    title: '任务ID',
    dataIndex: 'id',
    key: 'id',
    sorter: true,
    width: 120,
    align: 'center',
    resizable: true
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    align: 'center',
    sorter: true,
    resizable: true
  },
  {
    title: '下次执行时间',
    dataIndex: 'next_run_time',
    key: 'next_run_time',
    width: 280,
    sorter: true,
    resizable: true
  },
  {
    title: '触发器类型',
    dataIndex: 'trigger',
    key: 'trigger',
    width: 180,
    resizable: true
  },
  {
    title: '任务函数',
    dataIndex: 'func',
    key: 'func',
    width: 180,
    ellipsis: true,
    resizable: true
  },
  {
    title: '参数',
    dataIndex: 'kwargs',
    key: 'kwargs',
    width: 120,
    ellipsis: true,
    resizable: true
  },
  {
    title: '操作',
    key: 'action',
    width: 140,
    align: 'center',
    fixed: 'right'
  }
]

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '30', '40'],
  showTotal: (total: number) => `共 ${total} 条数据`
})

// 方法
const getjobTableData = async (page = 1, pageSize = 10) => {
  loading.value = true
  try {
    const response: any = await getJobs(page, pageSize)
    // 从 response 中获取任务数组
    const jobsData = response?.data || []
    
    jobTableData.value = jobsData.map((item: any) => {
      const name = item.trigger.indexOf('[')
      let trigger = item.trigger.slice(0, name)
      if (name > -1) {
        if(trigger === 'interval') {
          trigger = '周期性任务'
        } else if(trigger === 'cron') {
          trigger = '特定时间周期'
        } else {
          trigger = '特定日期'
        }
        
        // 提取trigger参数
        const triggerParams = item.trigger.match(/\[([^\]]*)\]/)?.[1] || '';
        
        // 处理天数显示，确保正确显示单复数形式
        let formattedParams = triggerParams;
        const daysMatch = triggerParams.match(/(\d+)\s+day/);
        if (daysMatch && !triggerParams.includes('days') && daysMatch[1] !== '1') {
          // 如果是复数天但没有用复数形式，修正为复数形式
          formattedParams = triggerParams.replace(`${daysMatch[1]} day`, `${daysMatch[1]} days`);
        }
        
        item.trigger = `${trigger} : ${formattedParams}`
      }
      
      // 处理kwargs为空的情况
      if (!item.kwargs || Object.keys(item.kwargs).length <= 0) {
        item.kwargs = ''
      } 
      // 处理不同任务类型的kwargs
      else if (item.func === 'another_task' && item.kwargs.param !== undefined) {
        item.kwargs = item.kwargs.param
      } else if (item.func === 'example_task' && item.kwargs.arg1 !== undefined && item.kwargs.arg2 !== undefined) {
        item.kwargs = `${item.kwargs.arg1}-${item.kwargs.arg2}`
      } else if ((item.func === 'run_os_command' || item.func === 'run_python_command') && item.kwargs.command !== undefined) {
        item.kwargs = item.kwargs.command
      }
      
      return item
    })
    pagination.total = jobsData.length
  } catch (error) {
    console.error('获取任务列表失败:', error)
    message.error('获取任务列表失败')
  } finally {
    loading.value = false
  }
}

const handleTableChange = (pag: any, filters: any, sorter: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  getjobTableData(pagination.current, pagination.pageSize)
}

const createJob = async () => {
  await loadFuncOptions()
  drawerTitle.value = '创建计划任务'
  formData.value = _.cloneDeep(initFormData.value)
  drawer.value = true
}

const editJob = async (row: any) => {
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
          // 已经是正确格式
        } else {
          data.kwargs = { arg1: '', arg2: 0 }
        }
      } else if(data.func === 'another_task') {
        if (typeof data.kwargs === 'string') {
          data.kwargs = { param: data.kwargs }
        } else if (data.kwargs && 'param' in data.kwargs) {
          // 已经是正确格式
        } else {
          data.kwargs = { param: '' }
        }
      } else if(data.func === 'run_os_command' || data.func === 'run_python_command') {
        if (typeof data.kwargs === 'string') {
          data.kwargs = { command: data.kwargs }
        } else if (data.kwargs && 'command' in data.kwargs) {
          // 已经是正确格式
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
            
            triggerArgs.split(',').forEach((item: string) => {
              const match = item.trim().match(/(\w+)\s*=\s*(.+)/);
              if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/['"]/g, '');
                data.trigger_args[key] = key === 'week' || key === 'day_of_week' ? value : (parseInt(value) || 0);
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
    title: '提示',
    content: '确认删除该任务?',
    okText: '确认',
    cancelText: '取消',
    okType: 'danger',
    onOk: async() => {
      await apiDeleteJob(row.id)
      message.success('删除成功')
      getjobTableData(pagination.current, pagination.pageSize)
    }
  })
}

const viewJobDetail = (row: any) => {
  router.push(`/jobs/${row.id}`)
}

const runJobNow = async (row: any) => {
  const res: any = await immediateJob(row)
  message.success(res.msg || res.message || '任务已立即执行')
  getjobTableData(pagination.current, pagination.pageSize)
}

const changeStatus = async (status: string, row: any) => {
  if(status === '已暂停') {
    await resumeJob(row.id)
    message.success('任务恢复')
  } else {
    await pauseJob(row.id)
    message.success('任务暂停')
  }
  getjobTableData(pagination.current, pagination.pageSize)
}

const submitForm = async (data: any) => {
  const wasPaused = data.status === '已暂停'
  
  if(data.id) {
    if(data.kwargs === ''){
      data.kwargs = {}
    }
    await apiEditJob(data)
    
    // 如果之前是暂停状态，更新后需要重新暂停
    if (wasPaused) {
      try {
        await pauseJob(data.id)
      } catch (e) {
        console.error('恢复暂停状态失败', e)
      }
    }
    
    message.success('修改成功')
  } else {
    await addJob(data)
    message.success('添加成功')
  }
  getjobTableData(pagination.current, pagination.pageSize)
  drawer.value = false
}

const closeDrawer = () => {
  drawer.value = false
}

const loadFuncOptions = async () => {
  if (funcOptions.value.length === 0) {
    const response: any = await getFuncOptions()
    
    let optionsData: any[] = [];
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      // Old format: direct array
      optionsData = response.data;
    } else if (response.data && typeof response.data === 'object' && 'tasks' in response.data && Array.isArray(response.data.tasks)) {
      // New format: { tasks: [] }
      optionsData = response.data.tasks;
    } else {
      // Fallback to empty array if data structure is unexpected
      console.error('Unexpected response format:', response);
      optionsData = [];
    }
    
    funcOptions.value = optionsData.map((item: any) => ({
      label: item.name,
      value: item.name,
      description: item.description,
      parameters: item.parameters
    }))
  }
}

// 检查时间是否有效
const isValidTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return false
  const parsed = dayjs(timeStr)
  return parsed.isValid()
}

// 格式化下次执行时间的函数
const formatNextRunTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return '未设置'
  const parsed = dayjs(timeStr)
  if (!parsed.isValid()) return '未设置'
  return parsed.format('YYYY-MM-DD HH:mm:ss')
}

// 获取相对时间（如"3小时后"、"2天后"）
const getRelativeTime = (timeStr: string | null | undefined) => {
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

// 根据时间确定标签颜色
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

// 根据触发器类型确定标签颜色
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

// 格式化参数提示内容
const formatTooltipContent = (content: string | object) => {
  if (typeof content === 'object') {
    return JSON.stringify(content, null, 2)
  }
  return content.toString()
}

onMounted(() => {
  getjobTableData()
})
</script>

<style scoped lang="scss">
.job-list-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
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
      color: rgba(0, 0, 0, 0.45);
      padding-left: 8px;
    }
  }
  
  .status-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-weight: 500;
  }
  
  .kwargs-content {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .paused-row {
    background-color: #fafafa;
  }
  
  :deep(.ant-table) {
    border-radius: 8px;
    overflow: hidden;
  }
  
  :deep(.ant-table-thead > tr > th) {
    background-color: #f5f7fa;
    font-weight: 500;
  }
  
  :deep(.ant-divider-vertical) {
    height: 16px;
    margin: 0 4px;
  }
  
  .action-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
  }
  
  :deep(.ant-btn-link) {
    padding: 2px;
    height: 24px;
    min-width: 24px;
    margin: 0;
  }
}
</style> 