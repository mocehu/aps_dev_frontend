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
} 