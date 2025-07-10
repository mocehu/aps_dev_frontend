<template>
  <el-drawer :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" :title="title" size="50%" @closed="close" :destroy-on-close="true">
    <el-form
      ref="formRef"
      :model="formDataCopy"
      :rules="rules"
      label-width="100px"
      class="task-form"
      status-icon
    >
      <!-- 添加步骤指引 -->
      <div class="form-steps">
        <el-steps :active="formStepActive" finish-status="success" simple>
          <el-step title="选择任务" />
          <el-step title="设置触发器" />
          <el-step title="配置参数" />
        </el-steps>
      </div>

      <!-- 任务函数选择 -->
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <el-form-item label="任务函数" prop="func">
          <el-select 
            v-model="formDataCopy.func" 
            placeholder="请选择任务函数" 
            @change="changeFunc"
            filterable
            style="width: 100%"
            popper-class="func-select-dropdown"
          >
            <el-option 
              v-for="item in funcOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value">
              <div class="func-option">
                <span class="func-name">{{ item.label }}</span>
                <div v-if="getFuncDescription(item.value)" class="func-description">
                  {{ getFuncDescription(item.value) }}
                </div>
              </div>
            </el-option>
          </el-select>
          <div v-if="whatsFunc" class="form-helper-text">
            已选择: <el-tag size="small" effect="dark">{{ whatsFunc }}</el-tag>
            <el-alert
              v-if="getFuncDescription(whatsFunc)"
              :title="getFuncDescription(whatsFunc)"
              type="info"
              :closable="false"
              class="func-selected-description"
              show-icon
            />
          </div>
        </el-form-item>

        <el-form-item label="任务ID" prop="job_id">
          <el-input v-model="formDataCopy.job_id" placeholder="请输入任务ID">
            <template #prepend>ID</template>
            <template #append>
              <el-button @click="generateRandomId">随机生成</el-button>
            </template>
          </el-input>
          <div class="form-helper-text">任务ID用于唯一标识此任务，可以包含字母、数字和下划线</div>
        </el-form-item>
      </div>

      <!-- 触发器设置 -->
      <div class="form-section">
        <h3 class="section-title">触发器设置</h3>
        <el-form-item label="触发器类型" prop="trigger">
          <el-radio-group v-model="formDataCopy.trigger" @change="changeTrigger">
            <el-radio-button label="interval">周期性任务</el-radio-button>
            <el-radio-button label="cron">特定时间周期</el-radio-button>
            <el-radio-button label="date">特定日期</el-radio-button>
          </el-radio-group>
          
          <div class="trigger-description">
            <template v-if="formDataCopy.trigger === 'interval'">
              周期性任务：按固定时间间隔重复执行
            </template>
            <template v-else-if="formDataCopy.trigger === 'cron'">
              特定时间周期：在特定的时间点执行（类似Linux crontab）
            </template>
            <template v-else-if="formDataCopy.trigger === 'date'">
              特定日期：在指定的日期和时间执行一次
            </template>
          </div>
        </el-form-item>

        <el-form-item label="运行时间" v-if="whatsTrigger">
          <div v-if="whatsTrigger === 'interval'" class="time-inputs">
            <div class="time-inputs-header">设置时间间隔：</div>
            <yhInput :data="runTimeInterval" :formData="formDataCopy" />
            <div class="form-helper-text">至少需要设置一个时间值，例如：每2天执行一次</div>
          </div>
          
          <div v-if="whatsTrigger === 'cron'" class="time-inputs">
            <div class="time-inputs-header">设置定时规则：</div>
            <yhInput :data="runTimeCron" :formData="formDataCopy" />
            <div class="form-helper-text">设置具体的执行时间点，如每月1日的10:30执行</div>
          </div>
          
          <div v-if="whatsTrigger === 'date'" class="time-inputs">
            <div class="time-inputs-header">选择执行日期和时间：</div>
            <el-date-picker
              v-model="formDataCopy.trigger_args.run_date"
              type="datetime"
              placeholder="选择日期和时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width: 100%"
            />
            <div class="form-helper-text">任务将在所选时间执行一次</div>
          </div>
        </el-form-item>
      </div>

      <!-- 参数设置 -->
      <div class="form-section" v-if="whatsFunc">
        <h3 class="section-title">参数设置</h3>
        
        <template v-if="whatsFunc === 'another_task'">
          <el-form-item label="参数值" prop="kwargs.param">
            <el-input 
              v-model="formDataCopy.kwargs.param" 
              placeholder="请输入param参数的值"
            >
              <template #prepend>param</template>
            </el-input>
            <div class="form-helper-text">
              <el-alert
                title="参数说明"
                type="info"
                :closable="false"
                show-icon
              >
                <div>param参数用于传递给另一个任务的值</div>
              </el-alert>
            </div>
          </el-form-item>
        </template>
        
        <template v-if="whatsFunc === 'run_os_command' || whatsFunc === 'run_python_command'">
          <el-form-item label="命令" prop="kwargs.command">
            <el-input 
              v-model="formDataCopy.kwargs.command" 
              placeholder="请输入要执行的命令"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
            />
            <div class="form-helper-text">
              <el-alert
                :title="whatsFunc === 'run_os_command' ? '系统命令' : 'Python命令'"
                type="info"
                :closable="false"
                show-icon
              >
                <div v-if="whatsFunc === 'run_os_command'">
                  输入要执行的系统命令，例如：dir, ls -la 等
                </div>
                <div v-else>
                  输入要执行的Python代码，例如：print('Hello World')
                </div>
              </el-alert>
            </div>
          </el-form-item>
        </template>
        
        <template v-if="whatsFunc === 'example_task'">
          <el-form-item label="参数1" prop="kwargs.arg1">
            <el-input 
              v-model="formDataCopy.kwargs.arg1" 
              placeholder="请输入参数1的值"
            >
              <template #prepend>arg1</template>
            </el-input>
          </el-form-item>
          
          <el-form-item label="参数2" prop="kwargs.arg2">
            <el-input 
              v-model="formDataCopy.kwargs.arg2" 
              placeholder="请输入参数2的值"
            >
              <template #prepend>arg2</template>
            </el-input>
            <div class="form-helper-text">参数2必须是整数类型</div>
          </el-form-item>
        </template>
      </div>

      <!-- 表单操作按钮 -->
      <div class="form-actions">
        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">{{ formDataCopy.id ? '保存修改' : '创建任务' }}</el-button>
          <el-button @click="close">取消</el-button>
        </el-form-item>
      </div>
    </el-form>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import _ from 'lodash'
// @ts-ignore
import yhInput from '../../../components/yh-input.vue'

// 定义类型
interface FuncOption {
  label: string;
  value: string;
  description: string;
  parameters: Record<string, any>;
}

interface FormData {
  id?: string;
  func: string;
  trigger: string;
  kwargs: Record<string, any>;
  job_id: string;
  trigger_args: Record<string, any>;
}

// 定义props
const props = defineProps<{
  modelValue: boolean;
  title: string;
  formData: Record<string, any>;
  funcOptions: FuncOption[];
}>()

// 定义emit
const emit = defineEmits(['update:modelValue', 'close', 'submit'])

// 表单数据
const formRef = ref()
const formDataCopy = ref<FormData>({
  func: '',
  trigger: '',
  kwargs: {},
  job_id: '',
  trigger_args: {}
})
const formStepActive = ref(1)
const whatsFunc = ref('')
const whatsTrigger = ref('')
const submitLoading = ref(false)

// 表单验证规则
const rules = {
  func: [{ required: true, message: '请选择任务函数', trigger: 'blur' }],
  trigger: [{ required: true, message: '请选择触发器', trigger: 'blur'}],
  job_id: [{ required: true, message: '请输入任务ID', trigger: 'blur' }],
  kwargs: {
    param: [{ required: true, message: '请输入param参数的值', trigger: 'blur' }],
    command: [{ required: true, message: '请输入command参数的值', trigger: 'blur' }],
    arg1:[{ required: true, message: '请输入arg1参数的值', trigger: 'blur' }],
    arg2:[{ required: true, message: '请输入arg1参数的值', trigger: 'blur' },
      { pattern:/^(?:0|(?:-?[1-9]\d*))$/, message: 'arg1参数的值是一个整数', trigger: 'blur' }
    ],
  },
}

// 周期性任务的时间输入配置
const runTimeInterval = [
  {
    min: 0,
    max: 99999999999,
    maxlength: 1,
    model: 'weeks',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入周数',
    suffixSlot: '周'
  },
  {
    min: 0,
    max: 99999999999,
    maxlength: 2,
    model: 'days',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入天数',
    suffixSlot: '天'
  },
  {
    min: 0,
    max: 99999999999,
    maxlength: 2,
    model: 'hours',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入小时',
    suffixSlot: '小时'
  },
  {
    min: 0,
    max: 99999999999,
    maxlength: 2,
    model: 'minutes',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入分钟',
    suffixSlot: '分钟'
  },
  {
    min: 0,
    max: 99999999999,
    maxlength: 2,
    model: 'seconds',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入秒数',
    suffixSlot: '秒'
  },
]

// 特定时间周期的时间输入配置
const runTimeCron = [
  {
    min: 1970,
    max: 9999,
    maxlength: 4,
    model: 'year',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入年份',
    suffixSlot: '年'
  },
  {
    min: 1,
    max: 12,
    maxlength: 2,
    model: 'month',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入月份',
    suffixSlot: '月'
  },
  {
    min: 1,
    max: 31,
    maxlength: 2,
    model: 'day',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入天数',
    suffixSlot: '日'
  },
  {
    min: 0,
    max: 23,
    maxlength: 2,
    model: 'hour',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入小时',
    suffixSlot: '小时'
  },
  {
    min: 0,
    max: 59,
    maxlength: 2,
    model: 'minute',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入分钟',
    suffixSlot: '分钟'
  },
  {
    min: 0,
    max: 59,
    maxlength: 2,
    model: 'second',
    type: 'number',
    width: '9.375rem',
    placeholder: '请输入秒数',
    suffixSlot: '秒'
  },
]

// 方法
const changeFunc = (func: string) => {
  whatsFunc.value = func
  formDataCopy.value.kwargs = {}
  formStepActive.value = 2
}

const changeTrigger = (trigger: string) => {
  if(trigger === 'cron') {
    formDataCopy.value.trigger_args = {
      day_of_week: 0,
      day: 1,
      month: 1,
      year: null,
      hour: 0,
      minute: 0,
      second: 0,
    }
  } else if(trigger === 'interval') {
    formDataCopy.value.trigger_args = {
      weeks: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    }
  } else if(trigger === 'date') {
    formDataCopy.value.trigger_args = {
      run_date: '',
    }
  }
  whatsTrigger.value = trigger
  formStepActive.value = 3
}

const close = () => {
  emit('update:modelValue', false)
  emit('close')
  formRef.value?.resetFields()
}

const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate((valid: boolean, fields: any) => {
    if (valid) {
      submitLoading.value = true
      try {
        emit('submit', formDataCopy.value)
      } catch (error: any) {
        ElMessage.error('提交失败：' + error.message)
      } finally {
        submitLoading.value = false
      }
    } else {
      console.log('表单验证失败:', fields)
      ElMessage.error('请完善表单信息')
    }
  })
}

const generateRandomId = () => {
  const prefix = 'task_'
  const randomStr = Math.random().toString(36).substring(2, 10)
  formDataCopy.value.job_id = prefix + randomStr
}

const getFuncDescription = (funcName: string) => {
  if (!props.funcOptions.length) return ''
  const func = props.funcOptions.find(item => item.value === funcName)
  return func ? func.description : ''
}

// 监听formData变化
watch(() => props.formData, (newVal) => {
  if (newVal) {
    formDataCopy.value = {
      func: newVal.func || '',
      trigger: newVal.trigger || '',
      kwargs: newVal.kwargs || {},
      job_id: newVal.job_id || '',
      trigger_args: newVal.trigger_args || {},
      ...(newVal.id ? { id: newVal.id } : {})
    }
    
    // 设置步骤和状态
    if (newVal.func) {
      whatsFunc.value = newVal.func
      formStepActive.value = 2
    }
    
    if (newVal.trigger) {
      whatsTrigger.value = newVal.trigger
      formStepActive.value = 3
    }
  }
}, { immediate: true, deep: true })
</script>

<style scoped lang="scss">
.task-form {
  padding: 0 20px;
  
  .form-steps {
    margin-bottom: 30px;
  }
  
  .form-section {
    margin-bottom: 30px;
    padding: 20px;
    background-color: #f8f9fa;
    border-radius: 8px;
    
    .section-title {
      margin-top: 0;
      margin-bottom: 20px;
      font-size: 18px;
      color: #303133;
      border-bottom: 1px solid #dcdfe6;
      padding-bottom: 10px;
    }
  }
  
  .form-helper-text {
    font-size: 12px;
    color: #909399;
    margin-top: 5px;
  }
  
  .trigger-description {
    margin-top: 10px;
    color: #909399;
    font-size: 13px;
  }
  
  .time-inputs {
    .time-inputs-header {
      margin-bottom: 10px;
      font-weight: 500;
      color: #303133;
    }
  }
  
  .form-actions {
    margin-top: 30px;
    display: flex;
    justify-content: center;
  }
}

.func-option {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  
  .func-name {
    font-weight: 600;
    color: #303133;
    font-size: 14px;
    margin-bottom: 4px;
  }
  
  .func-description {
    color: #606266;
    font-size: 13px;
    line-height: 1.5;
    padding: 6px 8px;
    background-color: #f8f9fa;
    border-radius: 4px;
    margin-top: 4px;
    border-left: 3px solid #e6a23c;
  }
}
</style> 