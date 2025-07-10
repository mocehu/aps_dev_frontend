<template>
  <div class="job-list-container">
    <a-card :bordered="false">
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
      >
        <template #bodyCell="{ column, record }">
          <!-- 状态列 -->
          <template v-if="column.key === 'status'">
            <a-button
              type="link"
              :danger="record.status === '已暂停'"
              @click="changeStatus(record.status, record)"
            >
              <template #icon>
                <pause-outlined v-if="record.status === '已暂停'" />
                <play-circle-outlined v-else />
              </template>
              {{ record.status }}
            </a-button>
          </template>
          
          <!-- 下次执行时间列 -->
          <template v-if="column.key === 'next_run_time'">
            <div class="next-run-time">
              <div :class="['time-tag', `time-tag-${getTimeTagType(record.next_run_time)}`]">
                <calendar-outlined style="margin-right: 6px" />
                <span>{{ formatNextRunTime(record.next_run_time) }}</span>
              </div>
              <div class="time-relative" v-if="record.next_run_time">
                {{ getRelativeTime(record.next_run_time) }}
              </div>
            </div>
          </template>
          
          <!-- 操作列 -->
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="editJob(record)">编辑</a-button>
              <a-button type="link" danger @click="deleteJob(record)">删除</a-button>
              <a-button type="link" @click="viewJobDetail(record)">详情</a-button>
              <a-button type="link" @click="runJobNow(record)">立即执行</a-button>
            </a-space>
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
  PlayCircleOutlined 
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

// 表格配置
const columns = [
  {
    title: '任务ID',
    dataIndex: 'id',
    key: 'id',
    sorter: true,
    width: 120,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    align: 'center',
    sorter: true
  },
  {
    title: '下次执行时间',
    dataIndex: 'next_run_time',
    key: 'next_run_time',
    width: 280,
    sorter: true
  },
  {
    title: '触发器类型',
    dataIndex: 'trigger',
    key: 'trigger'
  },
  {
    title: '任务函数',
    dataIndex: 'func',
    key: 'func',
    width: 200
  },
  {
    title: '参数',
    dataIndex: 'kwargs',
    key: 'kwargs',
    width: 120
  },
  {
    title: '操作',
    key: 'action',
    width: 300
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
      item.trigger = `${trigger} : ${item.trigger.match(/\[([^\]]*)\]/)?.[1] || ''}`
    }
    if (Object.keys(item.kwargs).length <= 0) {
      item.kwargs = ''
    }
    if(item.func === 'another_task') {
      item.kwargs = item.kwargs.param
    } else if (item.func === 'example_task') {
      item.kwargs = `${item.kwargs.arg1}-${item.kwargs.arg2}`
    } else if (item.func === 'run_os_command' || item.func === 'run_python_command') {
      item.kwargs = item.kwargs.command
    }
    return item
  })
  pagination.total = jobsData.length
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
    data.kwargs = {
      arg1: data.kwargs.split('-')[0],
      arg2: data.kwargs.split('-')[1]
    }
  } else if(data.func === 'another_task') {
    data.kwargs = {
      param: data.kwargs
    }
  } else if(data.func === 'run_os_command' || data.func === 'run_python_command') {
    data.kwargs = {
      "command": data.kwargs
    }
  }
  
  // 处理trigger
  const triggers = data.trigger.split(' : ')[0]
  const triggerArgs = data.trigger.split(' : ')[1]
  data.trigger_args = {}
  
  if(triggers === '周期性任务') {
    data.trigger = 'interval'
    
    triggerArgs.split(', ').forEach((item: string) => {
      if(item.includes(' days')) {
        data.trigger_args.days = +item.split(' ')[0]
      } else {
        const hours = item.split(':')[0];
        const minutes = item.split(':')[1];
        const seconds = item.split(':')[2];
        
        data.trigger_args.hours = parseInt(hours) >= 10 ? parseInt(hours) : parseInt(hours[hours.length - 1])
        data.trigger_args.minutes = parseInt(minutes) >= 10 ? parseInt(minutes) : parseInt(minutes[minutes.length - 1])
        data.trigger_args.seconds = parseInt(seconds) >= 10 ? parseInt(seconds) : parseInt(seconds[seconds.length - 1])
      }
    })
  } else if(triggers === '特定时间周期') {
    data.trigger = 'cron'
    
    triggerArgs.split(',').forEach((item: string) => {
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

// 根据时间确定标签类型
const getTimeTagType = (timeStr: string | null | undefined) => {
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
    flex-direction: column;
    align-items: flex-start;
    
    .time-relative {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      padding-left: 4px;
      margin-top: 4px;
    }
  }
}
</style> 