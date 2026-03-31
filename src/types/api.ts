// API响应类型定义

// 通用API响应类型
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface Job {
  id: string;
  func: string;
  trigger: string;
  kwargs: any;
  next_run_time: string;
  status: string;
  name?: string;
  [key: string]: any;
}

export interface LogItem {
  id: number;
  job_id: string;
  message: string;
  timestamp: string;
  duration: number;
  status: boolean;
  output?: string;
}

// 日志列表响应数据结构
export interface LogData {
  logs: LogItem[];
  count: number;
}

// 日志响应类型
export interface LogResponse extends ApiResponse<LogData> {}

export interface ReturnValue {
  type: string;
  description: string;
  example?: string;
}

// 任务分类
export interface TaskCategory {
  tasks: FuncOption[];
  categories: string[];
}

export interface FuncOption {
  name: string;
  description: string;
  parameters: Record<string, any>;
  return_value?: ReturnValue;
  label?: string;
  value?: string;
  parsed_description?: string;
  category?: string;
  is_custom?: boolean;
} 

export interface DraftPayload {
  func?: string;
  trigger?: string;
  trigger_args?: Record<string, any>;
  args?: any[];
  kwargs?: Record<string, any>;
  name?: string | null;
  job_id?: string;
  id?: string;
  configs?: Record<string, any>;
  [key: string]: any;
}

export interface DraftDisplayField {
  label: string;
  value: string;
}

export interface DraftDisplay {
  title: string;
  fields: DraftDisplayField[];
  warning?: string;
}

export interface AiDraft {
  action: 'create_job' | 'update_job' | 'delete_job' | 'pause_job' | 'resume_job' | 'update_config' | string;
  payload: DraftPayload;
  display: DraftDisplay;
  confirm_text?: string;
  cancel_text?: string;
}

export interface AiToolCall {
  name: string;
  arguments: Record<string, any> | string;
  result?: {
    action?: string;
    payload?: DraftPayload;
    [key: string]: any;
  } | string;
  status?: string;
}

export interface AiChatRequest {
  message: string;
  session_id?: string | null;
  model?: string;
  mode?: string;
}

export interface AiChatResponseData {
  session_id: string;
  reply: string;
  tool_calls: AiToolCall[];
  draft: AiDraft | null;
  model?: string;
  provider?: string;
}

export interface AiSessionItem {
  id: string;
  title: string;
  provider: string;
  model: string;
  mode: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessageItem {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | string;
  content: string;
  created_at: string;
}

export interface AiToolCallRecord {
  id: number;
  session_id: string;
  message_id: number | null;
  tool_name: string;
  tool_args: string;
  tool_result: string;
  status: string;
  created_at: string;
}

export interface AiSessionDetail {
  session: AiSessionItem;
  messages: AiMessageItem[];
  tool_calls: AiToolCallRecord[];
}

export interface AiModelsData {
  models: Record<string, string[]>;
  current: {
    provider: string;
    model: string;
  };
}

export interface AiConfigMap {
  [key: string]: ConfigItem;
}

export interface AiConfigUpdatePayload {
  ai_enabled?: string;
  ai_provider?: string;
  ai_base_url?: string;
  ai_api_key?: string;
  ai_model?: string;
  ai_allow_execute?: string;
  ai_stream_enabled?: string;
  ai_agent_api_key?: string;
  ai_max_history_messages?: string;
  [key: string]: string | undefined;
}

export interface ConfigItem {
  value: string;
  description: string;
  updated_at: string | null;
}

export interface CustomTaskCreate {
  name: string;
  category?: string;
  description?: string;
  code: string;
}

export interface CustomTaskUpdate {
  category?: string;
  description?: string;
  code?: string;
  enabled?: boolean;
}

export interface CustomTaskParameter {
  name: string;
  type: string;
  default: any;
  required: boolean;
}

export interface CustomTaskResponse {
  name: string;
  category: string;
  description: string;
  code: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  parameters: Record<string, CustomTaskParameter>;
  is_used: boolean;
  used_by_jobs: string[];
}

export interface SecurityConfig {
  timeout: number;
  forbidden_modules: string[];
  forbidden_builtins: string[];
}

export interface SecurityConfigUpdate {
  timeout?: number;
  forbidden_modules?: string;
  forbidden_builtins?: string;
}

export interface ValidateResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface GenerateCodeRequest {
  description: string;
  func_name: string;
}

export interface GenerateCodeResponse {
  success: boolean;
  code: string;
  func_name: string;
}

export interface ReviewCodeRequest {
  code: string;
  func_name: string;
}

export interface CodeSecurityResult {
  safe: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  summary: string;
}

export interface ReviewCodeResponse {
  success: boolean;
  security: CodeSecurityResult;
  has_issues: boolean;
}
