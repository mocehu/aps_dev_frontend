<template>
  <div class="job-list-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <h2>计划任务</h2>
          <el-button type="primary" @click="createJob">创建计划任务</el-button>
        </div>
      </template>
      
      <el-table :data="jobTableData" border style="width: 100%">
        <el-table-column prop="id" label="任务ID" width="120" sortable />
        <el-table-column label="状态" width="120" align="center" sortable>
          <template #default="{ row }">
            <el-button
              text
              :icon="row.status === '已暂停' ? 'VideoPause' : 'VideoPlay'"
              :type="row.status === '已暂停' ? 'danger' : 'success'"
              @click="changeStatus(row.status, row)">
              {{ row.status }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="下次执行时间" width="280" sortable>
          <template #default="{ row }">
            <div class="next-run-time">
              <el-tag 
                :type="getTimeTagType(row.next_run_time)" 
                effect="plain" 
                size="large"
                class="time-tag"
              >
                <div class="time-content">
                  <el-icon class="time-icon"><Calendar /></el-icon>
                  <span>{{ formatNextRunTime(row.next_run_time) }}</span>
                </div>
              </el-tag>
              <div class="time-relative" v-if="row.next_run_time">
                {{ getRelativeTime(row.next_run_time) }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="trigger" label="触发器类型" />
        <el-table-column prop="func" label="任务函数" width="200" />
        <el-table-column prop="kwargs" label="参数" width="120" />
        <el-table-column label="操作" width="400">
          <template #default="{ row }">
            <el-button text size="small" type="primary" @click="editJob(row)">编辑</el-button>
            <el-button text size="small" type="danger" @click="deleteJob(row)">删除</el-button>
            <el-button text size="small" type="primary" @click="viewJobDetail(row)">详情</el-button>
            <el-button text size="small" type="primary" @click="runJobNow(row)">立即执行</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-config-provider :locale="zhCn">
          <el-pagination
            v-model:current-page="jobCurrentPage"
            v-model:page-size="jobPageSize"
            :page-sizes="[10, 20, 30, 40]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </el-config-provider>
      </div>
    </el-card>
    
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import _ from 'lodash'

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
const jobCurrentPage = ref(1)
const jobPageSize = ref(10)
const total = ref(0)
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
  total.value = jobsData.length
}

const handleSizeChange = (val: number) => {
  jobPageSize.value = val
  getjobTableData(jobCurrentPage.value, jobPageSize.value)
}

const handleCurrentChange = (val: number) => {
  jobCurrentPage.value = val
  getjobTableData(jobCurrentPage.value, jobPageSize.value)
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
  ElMessageBox.confirm(
    '确认删除该任务?',
    '提示',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async() => {
    await apiDeleteJob(row.id)
    ElMessage.success('删除成功')
    getjobTableData(jobCurrentPage.value, jobPageSize.value)
  })
}

const viewJobDetail = (row: any) => {
  router.push(`/jobs/${row.id}`)
}

const runJobNow = async (row: any) => {
  const res: any = await immediateJob(row)
  ElMessage.success(res.msg || res.message || '任务已立即执行')
  getjobTableData(jobCurrentPage.value, jobPageSize.value)
}

const changeStatus = async (status: string, row: any) => {
  if(status === '已暂停') {
    await resumeJob(row.id)
    ElMessage.success('任务恢复')
  } else {
    await pauseJob(row.id)
    ElMessage.success('任务暂停')
  }
  getjobTableData(jobCurrentPage.value, jobPageSize.value)
}

const submitForm = async (data: any) => {
  if(data.id) {
    if(data.kwargs === ''){
      data.kwargs = {}
    }
    await apiEditJob(data)
    ElMessage.success('修改成功')
  } else {
    await addJob(data)
    ElMessage.success('添加成功')
  }
  getjobTableData(jobCurrentPage.value, jobPageSize.value)
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
  
  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  
  .next-run-time {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    
    .time-tag {
      width: 100%;
      margin-bottom: 4px;
      
      .time-content {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        
        .time-icon {
          margin-right: 6px;
        }
      }
    }
    
    .time-relative {
      font-size: 12px;
      color: #909399;
      padding-left: 4px;
    }
  }
}
</style> 