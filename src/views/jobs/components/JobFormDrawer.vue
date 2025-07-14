<template>
  <a-drawer 
    :open="modelValue" 
    @update:open="$emit('update:modelValue', $event)" 
    :title="title" 
    :width="800"
    @close="close" 
    :destroyOnClose="true"
  >
    <a-form
      ref="formRef"
      :model="formDataCopy"
      :rules="rules"
      layout="vertical"
      class="task-form"
    >
      <!-- 添加步骤指引 -->
      <div class="form-steps">
        <a-steps :current="formStepActive - 1" size="small">
          <a-step title="选择任务" />
          <a-step title="设置触发器" />
          <a-step title="配置参数" />
        </a-steps>
      </div>

      <!-- 任务函数选择 -->
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        <a-form-item name="func" label="任务函数">
          <a-select
            v-model:value="formDataCopy.func" 
            placeholder="请选择任务函数" 
            @change="changeFunc"
            show-search
            style="width: 100%"
            option-filter-prop="label"
          >
            <a-select-option 
              v-for="item in funcOptions" 
              :key="item.value" 
              :value="item.value"
              :label="item.label"
            >
              <div class="func-option">
                <div class="func-name">{{ item.label }}</div>
                <div v-if="getFuncDescription(item.value)" class="func-description">
                  {{ getFuncDescription(item.value) }}
                </div>
              </div>
            </a-select-option>
          </a-select>
          <template v-if="whatsFunc">
            <div class="form-helper-text">
              已选择: <a-tag>{{ whatsFunc }}</a-tag>
            </div>
            <a-alert
              v-if="getFuncDescription(whatsFunc)"
              :message="getFuncDescription(whatsFunc)"
              type="info"
              class="func-selected-description"
              show-icon
              style="margin-top: 8px"
            />
          </template>
        </a-form-item>

        <a-form-item name="job_id" label="任务ID">
          <a-input-group compact>
            <a-input
              v-model:value="formDataCopy.job_id" 
              placeholder="请输入任务ID"
              addon-before="ID" 
              style="width: calc(100% - 110px)"
            />
            <a-button style="width: 110px" @click="generateRandomId">随机生成</a-button>
          </a-input-group>
          <div class="form-helper-text">任务ID用于唯一标识此任务，可以包含字母、数字和下划线</div>
        </a-form-item>
      </div>

      <!-- 触发器设置 -->
      <div class="form-section">
        <h3 class="section-title">触发器设置</h3>
        <a-form-item name="trigger" label="触发器类型">
          <a-radio-group 
            v-model:value="formDataCopy.trigger" 
            button-style="solid"
            @change="changeTrigger"
          >
            <a-radio-button value="interval">周期性任务</a-radio-button>
            <a-radio-button value="cron">特定时间周期</a-radio-button>
            <a-radio-button value="date">特定日期</a-radio-button>
          </a-radio-group>
          
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
        </a-form-item>

        <a-form-item label="运行时间" v-if="whatsTrigger">
          <div v-if="whatsTrigger === 'interval'" class="time-inputs">
            <div class="time-inputs-header">设置时间间隔：</div>
            <yhInput :data="runTimeInterval" :formData="formDataCopy" />
            <div class="form-helper-text">至少需要设置一个时间值，例如：每2天执行一次</div>
          </div>
          
          <div v-if="whatsTrigger === 'cron'" class="time-inputs">
            <div class="time-inputs-header">设置定时规则：</div>
            <yhInput :data="runTimeCron" :formData="formDataCopy" />
            <div class="form-helper-text">
              设置具体的执行时间点，如每月1日的10:00执行。
              <strong>必须设置小时值，分钟默认为0</strong>，其他时间参数可选。
              <br>
              <a-collapse ghost size="small">
                <a-collapse-panel key="1" header="查看字段说明">
                  <div class="cron-fields-table">
                    <table style="width:100%; font-size:12px; border-collapse:collapse;">
                      <thead>
                        <tr>
                          <th style="text-align:left; padding:4px; border-bottom:1px solid #eee;">字段</th>
                          <th style="text-align:left; padding:4px; border-bottom:1px solid #eee;">范围</th>
                          <th style="text-align:left; padding:4px; border-bottom:1px solid #eee;">说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">year</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">1970–2099</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">可选</td>
                        </tr>
                        <tr>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">month</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">1–12</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">可选</td>
                        </tr>
                        <tr>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">day</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">1–31</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">可选</td>
                        </tr>
                        <tr>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">week</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">1–53</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">可选</td>
                        </tr>
                        <tr>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">day_of_week</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">0–6</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">0为周一，可选</td>
                        </tr>
                        <tr>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">hour</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">0–23</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;"><strong>必填</strong></td>
                        </tr>
                        <tr>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">minute</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">0–59</td>
                          <td style="padding:4px; border-bottom:1px solid #f5f5f5;">默认为0</td>
                        </tr>
                        <tr>
                          <td style="padding:4px;">second</td>
                          <td style="padding:4px;">0–59</td>
                          <td style="padding:4px;">默认为0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
          </div>
          
          <div v-if="whatsTrigger === 'date'" class="time-inputs">
            <div class="time-inputs-header">选择执行日期和时间：</div>
            <a-date-picker
              v-model:value="formDataCopy.trigger_args.run_date"
              type="date"
              show-time
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width: 100%"
              placeholder="选择日期和时间"
            />
            <div class="form-helper-text">任务将在所选时间执行一次</div>
          </div>
        </a-form-item>
      </div>

      <!-- 参数设置 -->
      <div class="form-section" v-if="whatsFunc">
        <h3 class="section-title">参数设置</h3>
        
        <template v-if="whatsFunc === 'another_task'">
          <a-form-item label="参数值" name="['kwargs', 'param']">
            <a-input 
              v-model:value="formDataCopy.kwargs.param" 
              placeholder="请输入param参数的值"
              addon-before="param"
            />
            <div class="form-helper-text">
              <a-alert
                message="参数说明"
                description="param参数用于传递给另一个任务的值"
                type="info"
                show-icon
              />
            </div>
          </a-form-item>
        </template>
        
        <template v-if="whatsFunc === 'run_os_command' || whatsFunc === 'run_python_command'">
          <a-form-item label="命令" name="['kwargs', 'command']">
            <a-textarea 
              v-model:value="stringifiedCommand" 
              placeholder="请输入要执行的命令"
              :auto-size="{ minRows: 2, maxRows: 5 }"
            />
            <div class="form-helper-text">
              <a-alert
                :message="whatsFunc === 'run_os_command' ? '系统命令' : 'Python命令'"
                :description="whatsFunc === 'run_os_command' ? 
                  '输入要执行的系统命令，例如：dir, ls -la 等' : 
                  '输入要执行的Python代码，例如：print(\'Hello World\')'
                "
                type="info"
                show-icon
              />
            </div>
          </a-form-item>
        </template>
        
        <template v-if="whatsFunc === 'example_task'">
          <a-form-item label="参数1" name="['kwargs', 'arg1']">
            <a-input 
              v-model:value="formDataCopy.kwargs.arg1" 
              placeholder="请输入参数1的值"
              addon-before="arg1"
            />
          </a-form-item>
          
          <a-form-item label="参数2" name="['kwargs', 'arg2']">
            <a-input-number
              v-model:value="formDataCopy.kwargs.arg2" 
              placeholder="请输入参数2的值" 
              :min="0"
              :precision="0"
              style="width: 100%"
            >
              <template #addonBefore>arg2</template>
            </a-input-number>
            <div class="form-helper-text">参数2必须是整数类型</div>
          </a-form-item>
        </template>
      </div>

      <!-- 表单操作按钮 -->
      <div class="form-actions">
        <a-space>
          <a-button type="primary" @click="submitForm" :loading="submitLoading">
            {{ formDataCopy.id ? '保存修改' : '创建任务' }}
          </a-button>
          <a-button @click="close">取消</a-button>
        </a-space>
      </div>
    </a-form>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import _ from 'lodash'
// @ts-ignore
import yhInput from '../../../components/yh-input.vue'

// 定义类型
interface FormData {
  func: string;
  trigger: string;
  kwargs: Record<string, any>;
  job_id: string;
  trigger_args: Record<string, any>;
  [key: string]: any;
}

interface FuncOption {
  label: string;
  value: string;
  description?: string;
  parameters?: any[];
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

// 处理command字段，确保它是字符串类型
const stringifiedCommand = computed({
  get: () => {
    if (!formDataCopy.value.kwargs) return '';
    const command = formDataCopy.value.kwargs.command;
    return typeof command === 'object' ? JSON.stringify(command) : String(command || '');
  },
  set: (val) => {
    if (!formDataCopy.value.kwargs) formDataCopy.value.kwargs = {};
    formDataCopy.value.kwargs.command = val;
  }
});

// 监听formData变化
watch(() => props.formData, (newVal) => {
  // 深拷贝防止引用错误
  formDataCopy.value = _.cloneDeep(newVal as FormData)
  
  // 确保kwargs和trigger_args存在
  if (!formDataCopy.value.kwargs) formDataCopy.value.kwargs = {}
  if (!formDataCopy.value.trigger_args) formDataCopy.value.trigger_args = {}
  
  // 设置当前步骤
  if (formDataCopy.value.func) {
    whatsFunc.value = formDataCopy.value.func
    formStepActive.value = 2
    
    if (formDataCopy.value.trigger) {
      whatsTrigger.value = formDataCopy.value.trigger
      formStepActive.value = 3
    }
  }
}, { deep: true, immediate: true })

// 设置表单校验规则
const rules = {
  func: [{ required: true, message: '请选择任务函数', trigger: 'change' }],
  job_id: [{ required: true, message: '请输入任务ID', trigger: 'blur' }],
  trigger: [{ required: true, message: '请选择触发器类型', trigger: 'change' }]
}

// 运行时间设置表单项 - 时间间隔
const runTimeInterval = [
  {
    name: 'days',
    type: 'number',
    label: '天数',
    description: '几天执行一次',
    placeholder: '请输入天数',
    triggerArgs: true
  },
  {
    name: 'hours',
    type: 'number',
    label: '小时',
    description: '几小时执行一次',
    placeholder: '请输入小时数',
    triggerArgs: true
  },
  {
    name: 'minutes',
    type: 'number',
    label: '分钟',
    description: '几分钟执行一次',
    placeholder: '请输入分钟数',
    triggerArgs: true
  },
  {
    name: 'seconds',
    type: 'number',
    label: '秒数',
    description: '几秒执行一次',
    placeholder: '请输入秒数',
    triggerArgs: true
  }
]

// 运行时间设置表单项 - cron表达式
const runTimeCron = [
  {
    name: 'year',
    type: 'number',
    label: '年',
    description: '指定年份 (1970-2099)',
    placeholder: '请输入年份，如: 2023',
    triggerArgs: true
  },
  {
    name: 'month',
    type: 'number',
    label: '月',
    description: '指定月份 (1-12)',
    placeholder: '请输入月份，如: 3',
    triggerArgs: true
  },
  {
    name: 'day',
    type: 'number',
    label: '日',
    description: '指定日期 (1-31)',
    placeholder: '请输入日期，如: 15',
    triggerArgs: true
  },
  {
    name: 'week',
    type: 'number',
    label: '周',
    description: '指定周数 (1-53)',
    placeholder: '请输入周数，如: 10',
    triggerArgs: true
  },
  {
    name: 'day_of_week',
    type: 'number',
    label: '星期',
    description: '指定星期几 (0-6，其中0是周一)',
    placeholder: '请输入星期几，如: 1',
    triggerArgs: true
  },
  {
    name: 'hour',
    type: 'number',
    label: '时',
    description: '指定小时 (0-23)',
    placeholder: '请输入小时，如: 10',
    triggerArgs: true
  },
  {
    name: 'minute',
    type: 'number',
    label: '分',
    description: '指定分钟 (0-59)，默认为0',
    placeholder: '默认为0，可不填',
    triggerArgs: true
  },
  {
    name: 'second',
    type: 'number',
    label: '秒',
    description: '指定秒数 (0-59)',
    placeholder: '请输入秒数，如: 0',
    triggerArgs: true
  }
]

// 改变任务函数
const changeFunc = (value: string) => {
  whatsFunc.value = value
  formStepActive.value = 2
  
  // 初始化kwargs
  if (value === 'another_task') {
    formDataCopy.value.kwargs = { param: '' }
  } else if (value === 'run_os_command' || value === 'run_python_command') {
    formDataCopy.value.kwargs = { command: '' }
  } else if (value === 'example_task') {
    formDataCopy.value.kwargs = { arg1: '', arg2: 0 }
  } else {
    formDataCopy.value.kwargs = {}
  }
}

// 改变触发器类型
const changeTrigger = (e: any) => {
  const value = e.target ? e.target.value : e
  whatsTrigger.value = value
  formStepActive.value = 3
  
  // 根据触发器类型初始化参数
  if (value === 'interval') {
    formDataCopy.value.trigger_args = { days: 0, hours: 0, minutes: 0, seconds: 0 }
  } else if (value === 'cron') {
    formDataCopy.value.trigger_args = { 
      year: 0, month: 0, day: 0, week: 0, day_of_week: 0,
      hour: 0, minute: 0, second: 0 
    }
  } else if (value === 'date') {
    formDataCopy.value.trigger_args = { run_date: '' }
  }
}

// 获取函数描述
const getFuncDescription = (funcName: string) => {
  const funcOption = props.funcOptions.find(item => item.value === funcName)
  return funcOption?.description || ''
}

// 生成随机ID
const generateRandomId = () => {
  const timestamp = Date.now().toString().slice(-6)
  const randomStr = Math.random().toString(36).slice(2, 6)
  formDataCopy.value.job_id = `job_${timestamp}_${randomStr}`
}

// 提交表单
const submitForm = async () => {
  try {
    // 表单校验
    await formRef.value.validate()
    
    // 参数校验
    let valid = true
    let errorMsg = ''
    
    // 检查任务ID
    if (!formDataCopy.value.job_id) {
      valid = false
      errorMsg = '请输入任务ID'
    }
    
    // 检查触发器参数
    if (formDataCopy.value.trigger === 'interval') {
      const triggerArgs = formDataCopy.value.trigger_args
      
      // 检查是否至少设置了一个时间间隔值
      if (!triggerArgs.days && !triggerArgs.hours && !triggerArgs.minutes && !triggerArgs.seconds) {
        valid = false
        errorMsg = '请至少设置一个时间间隔值'
      }
    } else if (formDataCopy.value.trigger === 'cron') {
      const triggerArgs = formDataCopy.value.trigger_args
      
      // 修改判断逻辑：只检查hour是否设置，分钟默认为0不需要手动设置
      if (triggerArgs.hour === undefined || triggerArgs.hour === null || triggerArgs.hour === '') {
        valid = false
        errorMsg = '请至少设置小时值'
      } else {
        // 确保minute至少为0（默认值）
        if (triggerArgs.minute === undefined || triggerArgs.minute === null || triggerArgs.minute === '') {
          triggerArgs.minute = 0
        }
        
        // 确保second至少为0（默认值）
        if (triggerArgs.second === undefined || triggerArgs.second === null || triggerArgs.second === '') {
          triggerArgs.second = 0
        }
        
        // 确保day_of_week在正确范围内
        if (triggerArgs.day_of_week !== undefined && triggerArgs.day_of_week !== null && 
            (triggerArgs.day_of_week < 0 || triggerArgs.day_of_week > 6)) {
          triggerArgs.day_of_week = 0  // 默认周一
        }
      }
    } else if (formDataCopy.value.trigger === 'date') {
      if (!formDataCopy.value.trigger_args.run_date) {
        valid = false
        errorMsg = '请选择执行时间'
      }
    }
    
    // 检查特定函数的参数
    if (formDataCopy.value.func === 'another_task') {
      if (!formDataCopy.value.kwargs.param) {
        valid = false
        errorMsg = '请输入param参数的值'
      }
    } else if (formDataCopy.value.func === 'run_os_command' || formDataCopy.value.func === 'run_python_command') {
      if (!formDataCopy.value.kwargs.command) {
        valid = false
        errorMsg = '请输入要执行的命令'
      }
    } else if (formDataCopy.value.func === 'example_task') {
      if (!formDataCopy.value.kwargs.arg1 || formDataCopy.value.kwargs.arg2 === undefined) {
        valid = false
        errorMsg = '请输入arg1和arg2参数的值'
      }
      
      // 确保arg2是整数类型
      if (typeof formDataCopy.value.kwargs.arg2 === 'string') {
        formDataCopy.value.kwargs.arg2 = parseInt(formDataCopy.value.kwargs.arg2) || 0
      }
    }
    
    if (!valid) {
      message.error(errorMsg)
      return
    }
    
    // 提交表单
    submitLoading.value = true
    emit('submit', formDataCopy.value)
    submitLoading.value = false
  } catch (error) {
    console.error('表单校验失败:', error)
  }
}

// 关闭抽屉
const close = () => {
  emit('close')
}
</script>

<style scoped lang="scss">
.task-form {
  .form-steps {
    margin-bottom: 24px;
  }
  
  .form-section {
    margin-bottom: 24px;
    padding: 16px;
    background-color: #fafafa;
    border-radius: 4px;
    
    .section-title {
      font-size: 16px;
      font-weight: 500;
      margin-top: 0;
      margin-bottom: 16px;
      color: rgba(0, 0, 0, 0.85);
    }
  }
  
  .form-helper-text {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    margin-top: 4px;
  }
  
  .trigger-description {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
    margin-top: 8px;
  }
  
  .time-inputs {
    &-header {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 12px;
    }
  }
  
  .form-actions {
    margin-top: 32px;
    text-align: center;
  }
  
  .func-option {
    .func-name {
      font-weight: 500;
    }
    
    .func-description {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      margin-top: 4px;
      white-space: normal;
    }
  }
}
</style> 