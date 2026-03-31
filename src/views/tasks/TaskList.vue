<template>
  <div class="task-list-container">
    <a-card :bordered="false" :shadow="false">
      <template #title>
        <div class="card-header">
          <h2>可用函数</h2>
          <div class="header-actions">
            <a-space>
              <a-button type="primary" @click="openCreateFuncModal">
                <template #icon><plus-outlined /></template>
                新建函数
              </a-button>
              <a-button @click="handleReloadTasks" :loading="reloading">
                <template #icon><reload-outlined /></template>
                热加载
              </a-button>
              <a-button @click="goToJobList">查看计划任务</a-button>
            </a-space>
          </div>
        </div>
      </template>
      
      <!-- 添加搜索和过滤功能 -->
      <div class="task-search mb-4">
        <div class="search-row">
          <a-input
            v-model="taskSearchKeyword"
            placeholder="搜索任务名称或描述"
            prefix-icon="Search"
            clearable
            @input="filterTasks"
            style="width: 300px; margin-right: 16px;"
          />
          
          <!-- 添加分类过滤 -->
          <div class="category-filters" v-if="taskCategories.length > 0">
            <a-tag 
              v-for="category in taskCategories" 
              :key="category"
              :type="selectedCategory === category ? 'primary' : 'info'"
              effect="plain"
              class="category-tag"
              @click="selectCategory(category)"
            >
              {{ category }}
            </a-tag>
            <a-tag 
              v-if="selectedCategory"
              type="danger"
              effect="plain"
              class="category-tag"
              @click="selectedCategory = ''"
            >
              清除筛选
            </a-tag>
          </div>
        </div>
      </div>
      
      <div class="task-grid">
        <a-card 
          v-for="item in filteredFuncRes" 
          :key="item.name" 
          class="task-box"
          :bordered="false"
          :hoverable="true"
          @click="showTaskDetail(item)"
        >
          <template #title>
            <div class="task-header">
              <div class="title-with-category">
                <h3 class="task-title">{{ item.name }}</h3>
                <a-tag 
                  size="small" 
                  effect="plain" 
                  :type="getTagTypeByCategory(item.category)"
                  class="category-label"
                >
                  {{ item.category }}
                </a-tag>
                <a-tag 
                  v-if="isCustomFunc(item) && item.is_used" 
                  size="small" 
                  color="green"
                  class="used-label"
                >
                  使用中
                </a-tag>
              </div>
            </div>
          </template>
          
          <div class="task-content">
            <div class="task-description-section">
              <div class="section-title">功能描述：</div>
              <div class="task-description preview-description">
                {{ truncateDescription(item.parsed_description || item.description) }}
              </div>
            </div>
            
            <div class="task-return" v-if="item.return_value">
              <div class="section-title">返回值：</div>
              <div class="return-description">
                <a-tag type="success" effect="light">{{ item.return_value.type }}</a-tag>
                <div class="return-details">
                  <div class="return-text preview-return">{{ truncateDescription(item.return_value.description) }}</div>
                </div>
              </div>
            </div>
            
            <div class="task-parameters" v-if="hasParameters(item)">
              <div class="section-title">参数：</div>
              <div class="param-count">{{ Object.keys(item.parameters).length }} 个参数</div>
            </div>
          </div>

          <template #actions>
            <a-flex justify="flex-end" gap="small">
              <template v-if="isCustomFunc(item)">
                <a-popconfirm
                  :title="item.is_used ? '此函数正在被使用，确定删除？' : '确定删除此函数？'"
                  @confirm="handleDeleteFunc(item.name)"
                >
                  <a-button danger @click.stop>删除</a-button>
                </a-popconfirm>
                <a-button @click.stop="openEditFuncModal(item)">编辑</a-button>
              </template>
              <a-button type="primary" @click.stop="quickCreateTask(item)">创建任务</a-button>
            </a-flex>
          </template>
        </a-card>
      </div>
    </a-card>
    
    <!-- 任务表单抽屉 -->
    <JobFormDrawer 
      v-if="drawer"
      v-model="drawer" 
      :title="drawerTitle" 
      :form-data="formData" 
      :func-options="funcOptions as any"
      @submit="submitForm"
      @close="closeDrawer"
    />
    
    <!-- 任务详情弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      :title="selectedTask?.name"
      width="700px"
      :footer="null"
    >
      <template v-if="selectedTask">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="分类">
            <a-tag :type="getTagTypeByCategory(selectedTask.category)">{{ selectedTask.category }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="功能描述">
            <a-typography-paragraph style="margin-bottom: 0">
              {{ selectedTask.parsed_description || selectedTask.description }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item v-if="isCustomFunc(selectedTask)" label="使用状态">
            <template v-if="selectedTask.is_used">
              <a-tag color="green">使用中</a-tag>
              <span style="margin-left: 8px; color: #666">
                被任务: {{ selectedTask.used_by_jobs?.join(', ') }}
              </span>
            </template>
            <template v-else>
              <a-tag>未使用</a-tag>
            </template>
          </a-descriptions-item>
        </a-descriptions>
        
        <template v-if="selectedTask.return_value">
          <a-divider orientation="left">返回值</a-divider>
          <a-space direction="vertical" style="width: 100%">
            <a-tag color="green">{{ selectedTask.return_value.type }}</a-tag>
            <a-typography-paragraph style="margin-bottom: 0">
              {{ selectedTask.return_value.description }}
            </a-typography-paragraph>
            <a-typography-paragraph v-if="selectedTask.return_value.example" style="margin-bottom: 0">
              <a-typography-text type="secondary">示例：</a-typography-text>
              <a-typography-text code>{{ selectedTask.return_value.example }}</a-typography-text>
            </a-typography-paragraph>
          </a-space>
        </template>
        
        <template v-if="hasParameters(selectedTask)">
          <a-divider orientation="left">参数列表</a-divider>
          <a-table 
            :data-source="getParameterDataSource(selectedTask)" 
            :columns="paramColumns"
            :pagination="false"
            size="small"
            bordered
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <a-typography-text strong>{{ record.name }}</a-typography-text>
              </template>
              <template v-else-if="column.key === 'type'">
                <a-tag color="blue">{{ record.type }}</a-tag>
              </template>
              <template v-else-if="column.key === 'required'">
                <a-tag v-if="record.required" color="error">必填</a-tag>
                <a-typography-text v-else type="secondary">可选</a-typography-text>
              </template>
              <template v-else-if="column.key === 'description'">
                <a-typography-text v-if="record.description && record.description !== '-'">
                  {{ record.description }}
                </a-typography-text>
                <a-typography-text v-else type="secondary">无描述</a-typography-text>
              </template>
              <template v-else-if="column.key === 'default'">
                <a-typography-text v-if="record.default && record.default !== '无'" code>
                  {{ record.default }}
                </a-typography-text>
                <a-typography-text v-else type="secondary">-</a-typography-text>
              </template>
            </template>
          </a-table>
        </template>
        
        <template v-if="selectedTask.code">
          <a-divider orientation="left">代码</a-divider>
          <pre class="code-block">{{ selectedTask.code }}</pre>
        </template>
        
        <a-divider />
        <a-flex justify="flex-end" gap="small">
          <a-button v-if="isCustomFunc(selectedTask)" type="default" @click="openEditFuncModal(selectedTask); detailModalVisible = false">编辑函数</a-button>
          <a-popconfirm
            v-if="isCustomFunc(selectedTask)"
            title="确定删除此函数？"
            @confirm="handleDeleteFunc(selectedTask?.name || ''); detailModalVisible = false"
          >
            <a-button type="default" danger>删除函数</a-button>
          </a-popconfirm>
          <a-button type="primary" @click="quickCreateTaskFromModal">创建任务</a-button>
          <a-button @click="detailModalVisible = false">关闭</a-button>
        </a-flex>
      </template>
    </a-modal>

    <a-modal
      v-model:open="funcModalVisible"
      :title="isEditFunc ? '编辑自定义函数' : '新建自定义函数'"
      width="800px"
      :confirm-loading="funcModalLoading"
      @ok="handleFuncSubmit"
    >
      <a-form
        ref="funcFormRef"
        :model="funcFormData"
        :rules="funcFormRules"
        layout="vertical"
      >
        <a-form-item label="函数名称" name="name" v-if="!isEditFunc">
          <a-input v-model:value="funcFormData.name" placeholder="须和代码中定义的函数名称一致!" />
        </a-form-item>
        <a-form-item label="分类" name="category">
          <a-auto-complete
            v-model:value="funcFormData.category"
            :options="categoryOptions"
            placeholder="选择或输入分类"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="描述" name="description">
          <a-input v-model:value="funcFormData.description" placeholder="函数功能描述" />
        </a-form-item>
        <a-form-item label="启用状态" name="enabled" v-if="isEditFunc">
          <a-switch v-model:checked="funcFormData.enabled" />
        </a-form-item>
        <div class="code-editor-wrapper">
          <div class="code-label"><span class="required">*</span> Python 代码 </div>
          <MonacoEditor
            v-model="funcFormData.code"
            language="python"
            height="400px"
            :show-ai-buttons="true"
            @change="handleCodeChange"
          />
        </div>
      </a-form>

      <a-alert v-if="validateResult" :type="validateResult.valid ? 'success' : 'error'" show-icon>
        <template #message>
          <template v-if="validateResult.valid">代码验证通过</template>
          <template v-else>
            <div v-for="error in validateResult.errors" :key="error">{{ error }}</div>
          </template>
        </template>
        <template v-if="validateResult.warnings && validateResult.warnings.length > 0" #description>
          <div v-for="warning in validateResult.warnings" :key="warning">{{ warning }}</div>
        </template>
      </a-alert>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import _ from 'lodash'
// @ts-ignore
import JobFormDrawer from '../jobs/components/JobFormDrawer.vue'
import MonacoEditor from '../../components/MonacoEditor.vue'
import {
  getFuncOptions,
  addJob,
  getCustomTask,
  createCustomTask,
  updateCustomTask,
  deleteCustomTask,
  validateCustomTaskCode,
  reloadTasks
} from '../../api/index'
import type { FuncOption, CustomTaskResponse, ValidateResult } from '../../types/api'

interface TaskFuncOption extends FuncOption {
  label?: string;
  value?: string;
  parsed_description?: string;
  category?: string;
  return_value?: {
    type: string;
    description: string;
    example?: string;
  };
  code?: string;
  enabled?: boolean;
  is_used?: boolean;
  used_by_jobs?: string[];
  is_custom?: boolean;
}

const router = useRouter()

// 数据
const funcRes = ref<TaskFuncOption[]>([])
const filteredFuncRes = ref<TaskFuncOption[]>([])
const taskSearchKeyword = ref('')
const taskCategories = ref<string[]>([])
const selectedCategory = ref<string>('')
const drawer = ref(false)
const drawerTitle = ref('')
const formData = ref<Record<string, any>>({})
const funcOptions = ref<TaskFuncOption[]>([])
const detailModalVisible = ref(false)
const selectedTask = ref<TaskFuncOption | null>(null)
const reloading = ref(false)
const funcModalVisible = ref(false)
const funcModalLoading = ref(false)
const isEditFunc = ref(false)
const validateResult = ref<ValidateResult | null>(null)
const funcFormRef = ref()

const funcFormData = reactive({
  name: '',
  category: 'custom',
  description: '',
  code: '',
  enabled: true
})

const funcFormRules = {
  name: [{ required: true, message: '请输入函数名称' }]
}

const categoryOptions = computed(() => {
  return taskCategories.value.map(cat => ({ value: cat }))
})

const initFormData = ref({
  func: '',
  trigger: '',
  kwargs: {},
  job_id: '',
  name: '',
  trigger_args: {}
})

// 检查是否有参数
const hasParameters = (item: TaskFuncOption) => {
  return item.parameters && Object.keys(item.parameters).length > 0;
}

// 截断描述
const truncateDescription = (text: string | undefined) => {
  if (!text) return ''
  return text.length > 80 ? text.substring(0, 80) + '...' : text
}

// 显示任务详情弹窗
const showTaskDetail = async (item: TaskFuncOption) => {
  selectedTask.value = item
  detailModalVisible.value = true
  
  if (item.is_custom) {
    try {
      const res = await getCustomTask(item.name)
      if (res.code === 200 && res.data) {
        selectedTask.value = {
          ...item,
          code: res.data.code,
          enabled: res.data.enabled,
          is_used: res.data.is_used,
          used_by_jobs: res.data.used_by_jobs || []
        }
      }
    } catch (error) {
      console.error('获取自定义任务详情失败:', error)
    }
  }
}

// 参数表格列配置
const paramColumns = [
  { title: '参数名', key: 'name', dataIndex: 'name', width: 100 },
  { title: '类型', key: 'type', dataIndex: 'type', width: 80, align: 'center' },
  { title: '必填', key: 'required', dataIndex: 'required', width: 60, align: 'center' },
  { title: '描述', key: 'description', dataIndex: 'description' },
  { title: '默认值', key: 'default', dataIndex: 'default', width: 100 }
]

// 获取参数表格数据
const getParameterDataSource = (item: TaskFuncOption) => {
  if (!item.parameters) return []
  return Object.entries(item.parameters).map(([key, param]: [string, any]) => ({
    key,
    name: key,
    type: param.type || '未知',
    required: param.required || false,
    description: param.description || '-',
    default: param.default
  }))
}

// 从弹窗创建任务
const quickCreateTaskFromModal = () => {
  if (selectedTask.value) {
    quickCreateTask(selectedTask.value)
    detailModalVisible.value = false
  }
}

// 方法
const getFunc = async () => {
  try {
    const funcResponse = await getFuncOptions()
    
    let tasksData: any[] = [];
    if (funcResponse && typeof funcResponse === 'object') {
      if (funcResponse.data && typeof funcResponse.data === 'object') {
        if (Array.isArray(funcResponse.data)) {
          tasksData = funcResponse.data;
        } else if (funcResponse.data.tasks && Array.isArray(funcResponse.data.tasks)) {
          tasksData = funcResponse.data.tasks;
          
          if (funcResponse.data.categories && Array.isArray(funcResponse.data.categories)) {
            taskCategories.value = funcResponse.data.categories;
          }
        }
      }
    }
    
    if (!tasksData || !Array.isArray(tasksData)) {
      console.error('API返回的数据格式不正确', funcResponse);
      message.error('获取数据失败：数据格式异常');
      tasksData = [];
    }
    
    funcRes.value = tasksData.map((item: any) => {
      // 解析描述中可能包含的信息
      const description = item.description || '';
      let returnValue = null;
      let parsedDescription = '';
      
      // 1. 提取主要描述部分（不包含参数和返回值部分）
      // 查找第一个":param"或"Returns:"的位置
      const paramIndex = description.indexOf(':param');
      const returnsIndex = description.search(/Returns?:/i);
      
      let endIndex = description.length;
      if (paramIndex > -1 && (returnsIndex === -1 || paramIndex < returnsIndex)) {
        endIndex = paramIndex;
      } else if (returnsIndex > -1) {
        endIndex = returnsIndex;
      }
      
      parsedDescription = description.substring(0, endIndex).trim();
      
      // 2. 查找返回值部分
      let returnDescription = '';
      if (returnsIndex > -1) {
        // 从Returns后面提取到下一个:param或结束
        const returnStartIndex = returnsIndex + (description.substring(returnsIndex, returnsIndex + 8).toLowerCase() === 'returns:' ? 8 : 7);
        const nextParamAfterReturn = description.indexOf(':param', returnsIndex);
        
        if (nextParamAfterReturn > -1) {
          returnDescription = description.substring(returnStartIndex, nextParamAfterReturn).trim();
        } else {
          returnDescription = description.substring(returnStartIndex).trim();
        }
        
        // 尝试解析返回值类型和描述
        // 格式可能是 "(output, error) 元组，其中output是命令..."
        const typeMatch = returnDescription.match(/^\s*\(([^)]+)\)\s*(.+)/);
        let returnType = '未指定';
        let returnDesc = returnDescription;
        let example = undefined;
        
        // 提取示例，格式可能是 "例如: xxx" 或 "示例: xxx"
        const exampleMatch = returnDescription.match(/(?:例如|示例)\s*:\s*(.+?)(?=\s*$|\s*(?:例如|示例)\s*:)/i);
        
        if (exampleMatch && exampleMatch[1]) {
          example = exampleMatch[1].trim();
          // 从描述中移除示例部分
          returnDesc = returnDescription.replace(/(?:例如|示例)\s*:\s*.+$/i, '').trim();
        }
        
        if (typeMatch) {
          returnType = typeMatch[1].trim();
          returnDesc = typeMatch[2].trim();
          
          // 如果描述中还包含示例，再次提取
          const exampleInDesc = returnDesc.match(/(?:例如|示例)\s*:\s*(.+?)(?=\s*$|\s*(?:例如|示例)\s*:)/i);
          if (exampleInDesc && exampleInDesc[1]) {
            example = exampleInDesc[1].trim();
            // 从描述中移除示例部分
            returnDesc = returnDesc.replace(/(?:例如|示例)\s*:\s*.+$/i, '').trim();
          }
        }
        
        returnValue = {
          type: returnType,
          description: returnDesc,
          ...(example ? { example } : {})
        };
      }
      
      // 3. 处理参数描述
      if (item.parameters) {
        Object.keys(item.parameters).forEach(key => {
          const param = item.parameters[key];
          if (param && typeof param === 'object') {
            // 查找参数描述
            if (!param.description) {
              const paramRegex = new RegExp(`:param\\s+${key}\\s*:\\s*([^:]+)`, 'i');
              const paramMatch = description.match(paramRegex);
              if (paramMatch && paramMatch[1]) {
                param.description = paramMatch[1].trim();
              }
            }
            
            // 如果没有类型信息，尝试从描述中提取
            if (!param.type) {
              param.type = param.name ? param.name.split(' ')[0] : 'string';
            }
            
            // 确保有默认值显示
            if (param.default === undefined || param.default === null) {
              param.default = '无';
            }
          }
        });
      }
      
      // 默认分类处理
      const result = {
        ...item,
        parsed_description: parsedDescription,
        return_value: returnValue,
        category: item.category || '未分类' // 添加分类，默认为未分类
      };
      
      // 根据名称推断分类
      if (!result.category) {
        if (result.name.includes('run_') || result.name.includes('system_')) {
          result.category = 'system';
        } else if (result.name.includes('example')) {
          result.category = 'example';
        }
      }
      
      return result;
    });
    
    filterTasks();
  } catch (error) {
    console.error('获取任务列表失败', error);
    message.error('获取任务列表失败');
  }
}

// 过滤任务
const filterTasks = () => {
  if (!funcRes.value) return
  
  let filtered = [...funcRes.value];
  
  // 先按分类筛选
  if (selectedCategory.value) {
    filtered = filtered.filter(item => item.category === selectedCategory.value);
  }
  
  // 再按关键词搜索
  if (taskSearchKeyword.value) {
    const keyword = taskSearchKeyword.value.toLowerCase();
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(keyword) || 
      (item.description && item.description.toLowerCase().includes(keyword)) ||
      (item.parsed_description && item.parsed_description.toLowerCase().includes(keyword))
    );
  }
  
  filteredFuncRes.value = filtered;
}

// 选择分类
const selectCategory = (category: string) => {
  selectedCategory.value = category === selectedCategory.value ? '' : category;
  filterTasks();
}

// 快速创建任务
const quickCreateTask = (item: TaskFuncOption) => {
  formData.value = _.cloneDeep(initFormData.value)
  formData.value.func = item.name
  drawerTitle.value = '添加任务'
  
  // 准备功能选项
  // @ts-ignore
  funcOptions.value = funcRes.value.map(item => ({
    label: item.name,
    value: item.name,
    description: item.description,
    parameters: item.parameters,
    return_value: item.return_value
  }))
  
  // 显示抽屉
  drawer.value = true
}

const submitForm = async (data: any) => {
  try {
    await addJob(data)
    message.success('添加成功')
    drawer.value = false
    
    // 可以选择跳转到任务列表页面
    router.push('/jobs')
  } catch (error: any) {
    message.error('添加失败：' + error.message)
  }
}

const closeDrawer = () => {
  drawer.value = false
}

const goToJobList = () => {
  router.push('/jobs')
}

const openCreateFuncModal = () => {
  isEditFunc.value = false
  funcFormData.name = ''
  funcFormData.category = 'custom'
  funcFormData.description = ''
  funcFormData.code = ''
  funcFormData.enabled = true
  validateResult.value = null
  funcModalVisible.value = true
}

const openEditFuncModal = async (task: TaskFuncOption) => {
  isEditFunc.value = true
  funcFormData.name = task.name
  funcFormData.category = task.category || 'custom'
  funcFormData.description = task.description || ''
  funcFormData.enabled = task.enabled ?? true
  validateResult.value = null
  
  if (task.is_custom && !task.code) {
    try {
      const res = await getCustomTask(task.name)
      if (res.code === 200 && res.data) {
        funcFormData.code = res.data.code
        funcFormData.enabled = res.data.enabled
      }
    } catch (error) {
      message.error('获取自定义任务详情失败')
      console.error(error)
      funcFormData.code = ''
    }
  } else {
    funcFormData.code = task.code || ''
  }
  
  funcModalVisible.value = true
}

const handleFuncSubmit = async (force: boolean = false) => {
  try {
    await funcFormRef.value.validate()
    
    if (!funcFormData.code.trim()) {
      message.error('请输入代码')
      return
    }
    
    const validateRes = await validateCustomTaskCode(funcFormData.code, funcFormData.name)
    if (validateRes.code === 200) {
      validateResult.value = validateRes.data
      if (!validateRes.data?.valid) {
        message.error('代码验证失败')
        return
      }
    }

    funcModalLoading.value = true
    if (isEditFunc.value) {
      const res = await updateCustomTask(funcFormData.name, {
        category: funcFormData.category,
        description: funcFormData.description,
        code: funcFormData.code,
        enabled: funcFormData.enabled
      }, force)
      if (res.code === 200) {
        message.success('更新成功')
        funcModalVisible.value = false
        getFunc()
      }
    } else {
      const res = await createCustomTask({
        name: funcFormData.name,
        category: funcFormData.category,
        description: funcFormData.description,
        code: funcFormData.code
      })
      if (res.code === 200) {
        message.success('创建成功')
        funcModalVisible.value = false
        getFunc()
      }
    }
  } catch (error: any) {
    const errorMsg = error?.response?.data?.msg || error?.message || '操作失败'
    if (isEditFunc.value && errorMsg.includes('正在被') && errorMsg.includes('使用')) {
      Modal.confirm({
        title: '任务正在被使用',
        content: errorMsg + '，是否强制更新？',
        okText: '强制更新',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => handleFuncSubmit(true)
      })
    } else {
      message.error(errorMsg)
    }
    console.error(error)
  } finally {
    funcModalLoading.value = false
  }
}

const handleDeleteFunc = async (name: string, force: boolean = false) => {
  try {
    const res = await deleteCustomTask(name, force)
    if (res.code === 200) {
      message.success('删除成功')
      getFunc()
    }
  } catch (error: any) {
    const errorMsg = error?.response?.data?.msg || error?.message || '删除失败'
    if (errorMsg.includes('正在被') && errorMsg.includes('使用')) {
      Modal.confirm({
        title: '任务正在被使用',
        content: errorMsg + '，是否强制删除？',
        okText: '强制删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => handleDeleteFunc(name, true)
      })
    } else {
      message.error(errorMsg)
    }
    console.error(error)
  }
}

const handleReloadTasks = async () => {
  reloading.value = true
  try {
    const res = await reloadTasks()
    if (res.code === 200) {
      message.success('热加载成功')
      getFunc()
    }
  } catch (error) {
    message.error('热加载失败')
    console.error(error)
  } finally {
    reloading.value = false
  }
}

const isCustomFunc = (task: TaskFuncOption) => {
  if (!task) return false
  return task.is_custom === true
}

const handleCodeChange = () => {
  if (funcFormRef.value) {
    funcFormRef.value.validateFields(['code'])
  }
}

watch(() => selectedCategory.value, () => {
  filterTasks();
});

// 监听funcRes变化，更新过滤后的任务列表
watch(() => funcRes.value, (newVal) => {
  if (newVal) {
    filterTasks()
  }
}, { immediate: true })

// 根据分类返回标签类型
const getTagTypeByCategory = (category?: string): string => {
  if (!category) return 'info';
  
  switch(category.toLowerCase()) {
    case 'system':
      return 'danger';
    case 'example':
      return 'success';
    case 'custom':
      return 'warning';
    default:
      return 'info';
  }
}

onMounted(() => {
  getFunc()
})
</script>

<style scoped lang="scss">
.task-list-container {
  .code-block {
    background: #f5f5f5;
    padding: 16px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-x: auto;
  }

  .code-editor-wrapper {
    margin-bottom: 24px;

    .code-label {
      margin-bottom: 8px;
      color: rgba(0, 0, 0, 0.88);
      font-size: 14px;

      .required {
        color: #ff4d4f;
        margin-left: 2px;
      }
    }
  }

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
  
  .mb-4 {
    margin-bottom: 16px;
  }
  
  .task-search {
    .search-row {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      flex-wrap: wrap;
      
      .category-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        
        .category-tag {
          cursor: pointer;
          margin-right: 0;
          transition: all 0.3s;
          
          &:hover {
            transform: translateY(-2px);
          }
        }
      }
    }
  }
  
  .task-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
    padding: 10px 0;
    
    .task-box {
      height: 280px;
      transition: all 0.3s;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      background-color: #ffffff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      
      :deep(.ant-card-head) {
        background-color: #f5f7fa;
        border-bottom: 1px solid #e4e7ed;
        padding: 12px 16px;
        min-height: auto;
      }
      
      :deep(.ant-card-body) {
        padding: 16px;
        background-color: #ffffff;
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      :deep(.ant-card-actions) {
        border-top: 1px solid #e4e7ed;
        background-color: #fafafa;
        padding: 8px 16px;
        margin-top: auto;
      }
      
      .task-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        
        .title-with-category {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          
          .task-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            margin-right: 8px;
            color: #303133;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex-shrink: 1;
            min-width: 0;
          }
          
          .category-label {
            font-size: 12px;
            flex-shrink: 0;
          }

          .used-label {
            font-size: 12px;
            flex-shrink: 0;
            margin-left: 4px;
          }
        }

        .task-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
      }
      
      .task-content {
        padding: 0;
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 8px;
        
        .section-title {
          font-weight: 600;
          margin-bottom: 4px;
          color: #303133;
          font-size: 13px;
        }
        
        .task-description-section {
          flex: 1;
          min-height: 0;
          
          .task-description {
            color: #606266;
            line-height: 1.5;
            padding: 8px 12px;
            background-color: #f8f9fa;
            border-radius: 4px;
            white-space: pre-line;
            word-break: break-word;
            font-size: 13px;
            border-left: 3px solid #409EFF;
            overflow: hidden;
            max-height: 80px;
          }
        }
        
        .task-return {
          margin-bottom: 0;
          
          .return-description {
            padding: 8px;
            background-color: #f0f9eb;
            border-radius: 4px;
            border-left: 3px solid #67c23a;
            
            .return-details {
              margin-top: 4px;
              color: #606266;
              font-size: 13px;
              line-height: 1.4;
              
              .return-text {
                margin-bottom: 0;
                white-space: pre-line;
              }
              
              .return-example {
                font-size: 13px;
                
                code {
                  background-color: rgba(103, 194, 58, 0.1);
                  padding: 2px 4px;
                  border-radius: 3px;
                  font-family: monospace;
                  color: #67c23a;
                }
              }
            }
          }
        }
        
        .task-parameters {
          margin-bottom: 0;
          
          .param-count {
            color: #909399;
            font-size: 13px;
          }
        }
        
        .preview-description, .preview-return {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      
      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
        border-color: #c6e2ff;
        cursor: pointer;
      }
    }
  }
}
</style> 