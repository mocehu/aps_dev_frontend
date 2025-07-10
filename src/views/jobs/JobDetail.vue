<template>
  <div class="job-detail-container">
    <el-card shadow="never">
      <template #header>
        <div class="detail-log-header">
          <div class="header-left">
            <el-button type="primary" plain icon="Back" @click="goBack" class="back-button">返回任务列表</el-button>
            <span class="header-title" v-if="detailJobsLog">{{ detailJobsLog.func }} 任务执行记录</span>
            <span class="header-title" v-else>任务执行记录</span>
          </div>
          <div class="header-right">
            <el-tag type="info" effect="plain" size="large" v-if="detailJobsLog">任务ID: {{ detailJobsLog.id }}</el-tag>
            <el-tag type="info" effect="plain" size="large" v-else>正在加载...</el-tag>
          </div>
        </div>
      </template>
      
      <div class="detail-log-container">
        <!-- 任务基本信息卡片 -->
        <el-card class="task-info-card" shadow="hover" v-if="detailJobsLog">
          <template #header>
            <div class="card-header">
              <span>任务基本信息</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="任务函数">{{ detailJobsLog.func }}</el-descriptions-item>
            <el-descriptions-item label="触发器类型">{{ detailJobsLog.trigger }}</el-descriptions-item>
            <el-descriptions-item label="参数">{{ detailJobsLog.kwargs || '无' }}</el-descriptions-item>
            <el-descriptions-item label="下次执行时间">
              <div class="next-run-time">
                <el-tag 
                  :type="getTimeTagType(detailJobsLog.next_run_time)" 
                  effect="plain" 
                  size="default"
                >
                  {{ formatNextRunTime(detailJobsLog.next_run_time) }}
                </el-tag>
                <div class="time-relative" v-if="detailJobsLog.next_run_time">
                  {{ getRelativeTime(detailJobsLog.next_run_time) }}
                </div>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="detailJobsLog.status === '已暂停' ? 'danger' : 'success'">
                {{ detailJobsLog.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="操作">
              <el-button-group>
                <el-button size="small" type="primary" @click="editJob(detailJobsLog)">编辑</el-button>
                <el-button size="small" :type="detailJobsLog.status === '已暂停' ? 'success' : 'warning'" @click="changeStatus(detailJobsLog.status, detailJobsLog)">
                  {{ detailJobsLog.status === '已暂停' ? '恢复' : '暂停' }}
                </el-button>
                <el-button size="small" type="danger" @click="deleteJob(detailJobsLog)">删除</el-button>
                <el-button size="small" type="success" @click="runJobNow(detailJobsLog)">立即执行</el-button>
              </el-button-group>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        
        <el-card class="task-info-card" shadow="hover" v-else>
          <template #header>
            <div class="card-header">
              <span>任务基本信息</span>
            </div>
          </template>
          <div class="loading-placeholder">
            <el-empty description="正在加载任务信息..." />
          </div>
        </el-card>
        
        <!-- 日志筛选区域 -->
        <div class="log-filter-section" v-if="detailJobsLog">
          <div class="filter-title">日志筛选</div>
          <div class="filter-content">
            <el-select v-model="searchSelect" clearable placeholder="执行状态" @change="searchSelectValue">
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            
            <el-config-provider :locale="zhCn">
              <el-date-picker
                v-model="searchDate"
                type="datetimerange"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DDTHH:mm:ss"
                @change="searchDateValue"
                style="margin: 0 10px;"
              />
            </el-config-provider>

            <el-button type="primary" @click="searchLog">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </div>
        </div>
        
        <!-- 日志列表和详情 -->
        <div class="log-detail-section" v-if="detailJobsLog">
          <!-- 左侧日志列表 -->
          <div class="log-list">
            <div class="log-list-header">
              <span>执行记录</span>
              <el-badge :value="missionLogTotal" :max="99" type="info" />
            </div>
            
            <el-scrollbar height="400px">
              <div v-if="missionLogTableData.length > 0">
                <div 
                  v-for="(item, index) in missionLogTableData" 
                  :key="item.id || index" 
                  :class="['log-item', {'active': selectedLogIndex === index}]" 
                  @click="showDetailLogMessage(item, index)"
                >
                  <div class="log-item-left">
                    <el-tag 
                      :type="item.status ? 'success' : 'danger'" 
                      size="small" 
                      effect="dark"
                    >
                      {{ item.status ? '成功' : '失败' }}
                    </el-tag>
                  </div>
                  <div class="log-item-center">
                    <div class="log-time">{{ formatLogTime(item.timestamp) }}</div>
                    <div class="log-message">{{ truncateMessage(item.message) }}</div>
                  </div>
                  <div class="log-item-right">
                    <span class="log-duration">{{ formatDuration(item.duration) }}</span>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无日志记录" />
            </el-scrollbar>
            
            <div class="log-pagination">
              <el-config-provider :locale="zhCn">
                <el-pagination
                  v-model:current-page="missionLogCurrentPage"
                  v-model:page-size="missionLogPageSize"
                  :page-sizes="[5, 10, 20, 30]"
                  layout="total, sizes, prev, pager, next"
                  :total="missionLogTotal"
                  @size-change="missionLogSizeChange"
                  @current-change="missionLogCurrentChange"
                  small
                />
              </el-config-provider>
            </div>
          </div>
          
          <!-- 右侧日志详情 -->
          <div v-if="detailLogMessage && Object.keys(detailLogMessage).length > 0" class="log-detail">
            <div class="log-detail-header">
              <span>执行详情</span>
              <el-tag 
                :type="detailLogMessage.status ? 'success' : 'danger'" 
                effect="dark"
              >
                {{ detailLogMessage.status ? '成功' : '失败' }}
              </el-tag>
            </div>
            
            <el-descriptions :column="1" border>
              <el-descriptions-item label="任务编号">
                {{ detailLogMessage.job_id || '未知' }}
              </el-descriptions-item>
              <el-descriptions-item label="执行信息">
                {{ detailLogMessage.message || '无信息' }}
              </el-descriptions-item>
              <el-descriptions-item label="开始时间">
                {{ formatFullDateTime(detailLogMessage.timestamp) }}
              </el-descriptions-item>
              <el-descriptions-item label="执行耗时">
                {{ formatDuration(detailLogMessage.duration) }}
              </el-descriptions-item>
            </el-descriptions>
            
            <div class="output-section">
              <div class="output-header">任务输出</div>
              <el-input
                v-model="detailLogMessage.output"
                type="textarea"
                :autosize="{ minRows: 4, maxRows: 10 }"
                placeholder="无输出内容"
                readonly
              />
            </div>
          </div>
          
          <!-- 无日志时的占位 -->
          <div v-else class="no-log-selected">
            <el-empty description="请选择一条日志记录查看详情" />
          </div>
        </div>
        
        <div class="log-detail-section" v-else>
          <el-empty description="加载中，请稍候..." />
        </div>
      </div>
    </el-card>
    
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import _ from 'lodash'

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
const searchDate = ref([])
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
        ElMessage.error('未找到指定任务')
        router.push('/jobs')
      }
    } else {
      ElMessage.error('获取任务列表失败')
      console.error('API返回格式不正确', response)
    }
  } catch (error) {
    ElMessage.error('加载任务详情失败')
    console.error(error)
  }
}

const getMissionLogTableData = async (page = 1, pageSize = 10) => {
  try {
    if (!detailJobsLog.value) {
      console.error('任务详情为空')
      return
    }
    
    const response = await getLog(page, pageSize, detailJobsLog.value)
    
    // 适配API返回结构
    if (response && response.code === 200 && response.data) {
      console.log('日志数据:', response); // 调试日志
      
      // 处理嵌套结构 response.data.logs
      const logData = response.data;
      
      // 确保logs是数组
      missionLogTableData.value = Array.isArray(logData.logs) ? logData.logs : [];
      missionLogTotal.value = logData.count || 0;
      
      if (missionLogTableData.value.length > 0) {
        detailLogMessage.value = missionLogTableData.value[0];
        selectedLogIndex.value = 0;
      } else {
        console.log('没有日志数据');
        detailLogMessage.value = {} as LogItem;
      }
    } else {
      console.error('日志API返回格式不正确', response);
      missionLogTableData.value = [];
      missionLogTotal.value = 0;
    }
  } catch (error) {
    console.error('获取日志失败', error);
    missionLogTableData.value = [];
    missionLogTotal.value = 0;
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

const searchDateValue = (value: any) => {
  if(value && value.length > 0) {
    startTime.value = value[0]
    endTime.value = value[1]
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
    console.log('搜索日志数据:', response); // 调试日志
    
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
  searchDate.value = []
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
    router.push('/jobs')
  })
}

const runJobNow = async (row: Job) => {
  const response = await immediateJob(row)
  if (response && response.code === 200) {
    ElMessage.success(response.msg || '执行成功')
  } else {
    ElMessage.error('执行失败')
  }
  loadJobDetail()
}

const changeStatus = async (status: string, row: any) => {
  if(status === '已暂停') {
    await resumeJob(row.id)
    ElMessage.success('任务恢复')
  } else {
    await pauseJob(row.id)
    ElMessage.success('任务暂停')
  }
  loadJobDetail()
}

const submitForm = async (data: any) => {
  try {
    if(data.kwargs === ''){
      data.kwargs = {}
    }
    await apiEditJob(data)
    ElMessage.success('修改成功')
    loadJobDetail()
    drawer.value = false
  } catch (error: any) {
    ElMessage.error('修改失败：' + (error.message || '未知错误'))
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

onMounted(() => {
  loadJobDetail()
})
</script>

<style scoped lang="scss">
.job-detail-container {
  .detail-log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .header-left {
      display: flex;
      align-items: center;
      
      .back-button {
        margin-right: 15px;
      }
      
      .header-title {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
      }
    }
  }
  
  .detail-log-container {
    .task-info-card {
      margin-bottom: 20px;
      
      .card-header {
        font-weight: 600;
        color: #303133;
      }
    }
    
    .log-filter-section {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      
      .filter-title {
        font-weight: 600;
        margin-bottom: 15px;
        color: #303133;
      }
      
      .filter-content {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
    }
    
    .log-detail-section {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 20px;
      
      .log-list {
        background-color: #fff;
        border: 1px solid #e4e7ed;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        
        .log-list-header {
          padding: 12px 15px;
          font-weight: 600;
          border-bottom: 1px solid #e4e7ed;
          background-color: #f5f7fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .log-item {
          padding: 12px 15px;
          border-bottom: 1px solid #ebeef5;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          transition: all 0.3s;
          
          &:hover {
            background-color: #f5f7fa;
          }
          
          &.active {
            background-color: #ecf5ff;
          }
          
          .log-item-left {
            margin-right: 10px;
            padding-top: 2px;
          }
          
          .log-item-center {
            flex: 1;
            
            .log-time {
              font-size: 13px;
              color: #606266;
              margin-bottom: 4px;
            }
            
            .log-message {
              font-size: 14px;
              color: #303133;
              word-break: break-word;
            }
          }
          
          .log-item-right {
            margin-left: 10px;
            
            .log-duration {
              font-size: 12px;
              color: #909399;
              white-space: nowrap;
            }
          }
        }
        
        .log-pagination {
          padding: 10px;
          border-top: 1px solid #e4e7ed;
          background-color: #f5f7fa;
        }
      }
      
      .log-detail {
        background-color: #fff;
        border: 1px solid #e4e7ed;
        border-radius: 8px;
        padding: 0;
        
        .log-detail-header {
          padding: 12px 15px;
          font-weight: 600;
          border-bottom: 1px solid #e4e7ed;
          background-color: #f5f7fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .output-section {
          padding: 15px;
          
          .output-header {
            font-weight: 600;
            margin-bottom: 10px;
            color: #303133;
          }
        }
      }
      
      .no-log-selected {
        background-color: #fff;
        border: 1px solid #e4e7ed;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
      }
    }
  }
  
  .next-run-time {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    
    .time-relative {
      font-size: 12px;
      color: #909399;
      padding-left: 4px;
      margin-top: 4px;
    }
  }
}
</style> 