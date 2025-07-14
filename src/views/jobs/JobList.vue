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
              <a-tag :color="getTimeTagColor(record.next_run_time)" class="time-tag">
                <calendar-outlined style="margin-right: 6px" />
                <span>{{ formatNextRunTime(record.next_run_time) }}</span>
              </a-tag>
              <span class="time-relative" v-if="record.next_run_time">
                {{ getRelativeTime(record.next_run_time) }}
              </span>
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
  getFuncOptions,
  addJob,
  editJob as apiEditJob,
  immediateJob
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
  trigger_args: {}
})
const loading = ref(false)

// 表格配置
const columns = [
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
  await loadFuncOptions()
  drawerTitle.value = '修改任务'
  const data = _.cloneDeep(row)
  
  // 处理kwargs
  if(data.func === 'example_task'){
    // 检查kwargs是否已经是对象类型
    if (typeof data.kwargs === 'string') {
      // 如果是字符串类型，需要进行分割
      const parts = data.kwargs.split('-');
      data.kwargs = {
        arg1: parts[0] || '',
        arg2: parseInt(parts[1] || '0')
      }
    }
    // 否则保持原样，假设它已经是 {arg1, arg2} 的格式
  } else if(data.func === 'another_task') {
    if (typeof data.kwargs === 'string') {
      data.kwargs = {
        param: data.kwargs
      }
    } else if (data.kwargs && 'param' in data.kwargs) {
      // 已经是正确格式，不需要处理
    } else {
      data.kwargs = { param: '' }
    }
  } else if(data.func === 'run_os_command' || data.func === 'run_python_command') {
    if (typeof data.kwargs === 'string') {
      data.kwargs = {
        "command": data.kwargs
      }
    } else if (data.kwargs && 'command' in data.kwargs) {
      // 已经是正确格式，不需要处理
    } else {
      data.kwargs = { command: '' }
    }
  }
  
  // 处理trigger
  if (data.trigger && data.trigger.includes(' : ')) {
    const parts = data.trigger.split(' : ');
    const triggers = parts[0];
    const triggerArgs = parts.length > 1 ? parts[1] : '';
    data.trigger_args = {};
    
    if(triggers === '周期性任务') {
      data.trigger = 'interval';
      
      if (triggerArgs) {
        triggerArgs.split(', ').forEach((item: string) => {
          // 检查天数，支持单数day和复数days
          if(item.includes(' day')) {
            // 提取数字部分，然后转换为整数
            const daysMatch = item.match(/(\d+)\s+days?/);
            if (daysMatch && daysMatch[1]) {
              data.trigger_args.days = parseInt(daysMatch[1]) || 0;
            } else {
              // 如果匹配失败，尝试直接提取数字
              const firstPart = item.split(' ')[0];
              data.trigger_args.days = parseInt(firstPart) || 0;
            }
          } else if (item && item.includes(':')) {
            const timeParts = item.split(':');
            const hours = timeParts[0] || '0';
            const minutes = timeParts.length > 1 ? timeParts[1] : '0';
            const seconds = timeParts.length > 2 ? timeParts[2] : '0';
            
            // 更安全的方式处理字符串到数字的转换
            data.trigger_args.hours = parseInt(hours) || 0;
            data.trigger_args.minutes = parseInt(minutes) || 0;
            data.trigger_args.seconds = parseInt(seconds) || 0;
          }
        });
      } else {
        // 设置默认值
        data.trigger_args = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
    } else if(triggers === '特定时间周期') {
      data.trigger = 'cron';
      
      if (triggerArgs) {
        triggerArgs.split(',').forEach((item: string) => {
          if (item && item.includes('=')) {
            const keyValue = item.split('=');
            const key = keyValue[0].trim();
            // 确保value存在
            if (keyValue.length > 1) {
              const value = keyValue[1].replace(/['"]/g, '');
              data.trigger_args[key] = parseInt(value) || 0;
            }
          }
        });
      }
      
      // 确保所有必要的字段都有默认值
      const cronFields = ['year', 'month', 'day', 'week', 'hour', 'minute', 'second'];
      cronFields.forEach(field => {
        if (data.trigger_args[field] === undefined) {
          data.trigger_args[field] = 0;
        }
      });
    } else {
      data.trigger = 'date';
      data.trigger_args = {
        run_date: triggerArgs || ''
      };
    }
  } else {
    // 如果trigger格式不正确，设置默认值
    data.trigger = 'interval';
    data.trigger_args = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  formData.value = {
    ...data,
    job_id: data.id
  }
  
  drawer.value = true
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
  if(data.id) {
    if(data.kwargs === ''){
      data.kwargs = {}
    }
    await apiEditJob(data)
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

// 格式化下次执行时间的函数
const formatNextRunTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return '未设置'
  return dayjs(timeStr).format('YYYY-MM-DD HH:mm:ss')
}

// 获取相对时间（如"3小时后"、"2天后"）
const getRelativeTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return ''
  
  const now = dayjs()
  const targetTime = dayjs(timeStr)
  
  // 如果目标时间已过，显示"已过期"
  if (targetTime.isBefore(now)) {
    return '已过期'
  }
  
  return targetTime.fromNow()
}

// 根据时间确定标签颜色
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