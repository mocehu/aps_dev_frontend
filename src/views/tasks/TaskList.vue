<template>
  <div class="task-list-container">
    <a-card :bordered="false" :shadow="false">
      <template #title>
        <div class="card-header">
          <h2>可用任务</h2>
          <div class="header-actions">
            <a-button type="primary" @click="goToJobList">查看计划任务</a-button>
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
              </div>
              <a-button type="primary" plain @click.stop="quickCreateTask(item)">创建任务</a-button>
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
        
        <a-divider />
        <a-flex justify="flex-end" gap="small">
          <a-button type="primary" @click="quickCreateTaskFromModal">创建任务</a-button>
          <a-button @click="detailModalVisible = false">关闭</a-button>
        </a-flex>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import _ from 'lodash'
// @ts-ignore
import JobFormDrawer from '../jobs/components/JobFormDrawer.vue'
import { getFuncOptions, addJob } from '../../api/index'
import type { FuncOption } from '../../types/api'

// 扩展FuncOption类型以包含前端需要的字段
interface TaskFuncOption extends FuncOption {
  label?: string;
  value?: string;
  parsed_description?: string;
  category?: string; // 添加任务分类字段
  return_value?: {
    type: string;
    description: string;
    example?: string;
  };
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

// 初始化表单数据
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
const showTaskDetail = (item: TaskFuncOption) => {
  selectedTask.value = item
  detailModalVisible.value = true
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
    const response = await getFuncOptions()
    
    // 处理新的API返回结构：{code, msg, data: {tasks: [], categories: []}}
    // 获取任务数组
    let tasksData: any[] = [];
    if (response && typeof response === 'object') {
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data)) {
          // 兼容旧格式
          tasksData = response.data;
        } else if (response.data.tasks && Array.isArray(response.data.tasks)) {
          // 新格式 data.tasks
          tasksData = response.data.tasks;
          
          // 存储任务分类
          if (response.data.categories && Array.isArray(response.data.categories)) {
            taskCategories.value = response.data.categories;
          }
        }
      }
    }
    
    // 如果没有数据，设置为空数组
    if (!tasksData || !Array.isArray(tasksData)) {
      console.error('API返回的数据格式不正确', response);
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

// 添加对分类变化的监听
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
      height: auto;
      transition: all 0.3s;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      background-color: #ffffff;
      overflow: hidden;
      
      :deep(.el-card__header) {
        background-color: #f5f7fa;
        border-bottom: 1px solid #e4e7ed;
        padding: 12px 16px;
      }
      
      :deep(.el-card__body) {
        padding: 16px;
        background-color: #ffffff;
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
        }
      }
      
      .task-content {
        padding: 0;
        
        .section-title {
          font-weight: 600;
          margin-bottom: 8px;
          color: #303133;
        }
        
        .task-description-section {
          margin-bottom: 16px;
          
          .task-description {
            color: #606266;
            line-height: 1.6;
            padding: 12px;
            background-color: #f8f9fa;
            border-radius: 4px;
            white-space: pre-line;
            word-break: break-word;
            min-height: 50px;
            font-size: 14px;
            border-left: 4px solid #409EFF;
          }
        }
        
        .task-return {
          margin-bottom: 16px;
          
          .return-description {
            padding: 10px;
            background-color: #f0f9eb;
            border-radius: 4px;
            border-left: 4px solid #67c23a;
            
            .return-details {
              margin-top: 8px;
              color: #606266;
              font-size: 14px;
              line-height: 1.5;
              
              .return-text {
                margin-bottom: 6px;
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
          margin-bottom: 16px;
          
          .param-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            
            .param-item {
              .param-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
                
                .param-name {
                  font-weight: 500;
                  color: #303133;
                }
                
                .param-type {
                  font-size: 12px;
                  line-height: 1;
                  padding: 2px 6px;
                  height: auto;
                  margin: 0;
                }
                
                .required-tag {
                  font-size: 12px;
                  line-height: 1;
                  padding: 2px 6px;
                  height: auto;
                  margin: 0;
                }
                
                :deep(.ant-tag) {
                  margin-right: 0;
                }
              }
              
              .param-body {
                padding-left: 8px;
                border-left: 2px solid #e8e8e8;
                color: #606266;
                font-size: 13px;
                
                .param-description {
                  margin-bottom: 4px;
                  line-height: 1.5;
                }
                
                .param-default {
                  color: #909399;
                  
                  code {
                    background-color: #f5f7fa;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: monospace;
                    color: #e6a23c;
                  }
                }
              }
            }
          }
          
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