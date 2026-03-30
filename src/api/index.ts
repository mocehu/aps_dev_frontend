// 统一管理项目用户相关的接口
// 引入request
import request from '../utils/request';
import type {
  Job,
  LogResponse,
  ApiResponse,
  FuncOption,
  TaskCategory,
  ConfigItem,
  AiChatRequest,
  AiChatResponseData,
  AiSessionItem,
  AiSessionDetail,
  AiModelsData,
  AiConfigMap,
  AiConfigUpdatePayload
} from '../types/api';

// 保存所有接口
// 不需要再定义 bu 变量，因为 request 已经配置了 baseURL
type paramsType = {
  page: number
  pageSize: number
  job_id?:  number | string | null
  status?: boolean | null
  start_time?: string | null
  end_time?: string | null
}

export function getJobs(page?: number, pageSize?: number): Promise<ApiResponse<Job[]>> {
  return request({
    url: '/jobs/',
    method: 'get',
    params: {
      page,
      pageSize
    }
  });
}

export function getJob(jobId: string): Promise<ApiResponse<Job>> {
  return request({
    url: '/job/' + jobId,
    method: 'get'
  });
}

export function pauseJob(id: string): Promise<ApiResponse<any>> {
  return request({
    url: '/pause-job/' + id,
    method: 'get'
  });
}

export function resumeJob(id: string): Promise<ApiResponse<any>> {
  return request({
    url: '/resume-job/' + id,
    method: 'get'
  });
}

export function deleteJob(id: string): Promise<ApiResponse<any>> {
  return request({
    url: '/remove-job/' + id,
    method: 'get'
  });
}

export function getFuncOptions(): Promise<ApiResponse<FuncOption[] | TaskCategory>> {
  return request({
    url: '/available-tasks/',
    method: 'get'
  });
}

export function getTaskInfo(taskName: string): Promise<ApiResponse<FuncOption>> {
  return request({
    url: '/task-info/' + taskName,
    method: 'get'
  });
}

export function addJob(data: any): Promise<ApiResponse<any>> {
  return request({
    url: '/add-job/',
    method: 'post',
    data
  });
}

export function editJob(data: any): Promise<ApiResponse<any>> {
  return request({
    url: '/update-job/',
    method: 'post',
    data
  });
}

export function getLog(
  page: number, 
  pageSize: number, 
  row: Job | null = null, 
  status?: boolean | null, 
  start_time?: string | null, 
  end_time?: string | null
): Promise<LogResponse> {
  const params: paramsType = {
    page,
    pageSize
  }
  
  if (row && row.id) {
    params.job_id = row.id;
  }
  
  if (status !== undefined) {
    params.status = status;
  }
  
  if (start_time) {
    params.start_time = start_time;
  }
  
  if (end_time) {
    params.end_time = end_time;
  }
  
  return request({
    url: '/logs/',
    method: 'get',
    params
  });
}

export function immediateJob(row: Job): Promise<ApiResponse<any>> {
  return request({
    url: '/run-job-now/',
    method: 'post',
    params: {
      job_id: row.id
    }
  });
}

export function getConfigs(): Promise<ApiResponse<Record<string, ConfigItem>>> {
  return request({
    url: '/config/',
    method: 'get'
  });
}

export function getConfig(key: string): Promise<ApiResponse<{key: string, value: string}>> {
  return request({
    url: '/config/' + key,
    method: 'get'
  });
}

export function updateConfig(key: string, value: string): Promise<ApiResponse<{key: string, value: string, updated_at: string}>> {
  return request({
    url: '/config/' + key,
    method: 'put',
    params: { value }
  });
}

export function batchUpdateConfig(configs: Record<string, string>): Promise<ApiResponse<Record<string, ConfigItem>>> {
  return request({
    url: '/config/',
    method: 'post',
    data: configs
  });
}

export interface VersionInfo {
  version: string;
  build_date?: string;
  commit_hash?: string;
}

export interface UpdateCheckResult {
  current_version: string;
  latest_version: string;
  has_update: boolean;
  release?: ReleaseNote;
  checked_at?: string;
  error?: string | null;
}

export interface ReleaseNote {
  version: string;
  name?: string;
  published_at?: string;
  html_url?: string;
  body?: string;
  prerelease?: boolean;
  draft?: boolean;
}

export interface ReleaseNotesResponse {
  releases: ReleaseNote[];
}

export function getVersion(): Promise<ApiResponse<VersionInfo>> {
  return request({
    url: '/version/',
    method: 'get'
  });
}

export function checkUpdate(force: boolean = false): Promise<ApiResponse<UpdateCheckResult>> {
  return request({
    url: '/check-update/',
    method: 'get',
    params: { force }
  });
}

export function getReleaseNotes(all: boolean = false): Promise<ApiResponse<ReleaseNotesResponse>> {
  return request({
    url: '/release-notes/',
    method: 'get',
    params: all ? { all: true } : {}
  });
}

export function sendAiChat(data: AiChatRequest): Promise<ApiResponse<AiChatResponseData>> {
  return request({
    url: '/ai/chat',
    method: 'post',
    data
  });
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (data: AiChatResponseData) => void;
  onError: (error: Error) => void;
}

export async function sendAiChatStream(
  data: AiChatRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://192.168.2.78:8000';
  const apiKey = localStorage.getItem('API_KEY');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  try {
    const response = await fetch(`${BASE_URL}/ai/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullReply = '';
    let sessionId = data.session_id || '';
    let model = '';
    let provider = '';
    let toolCalls: any[] = [];
    let draft: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);

            switch (parsed.type) {
              case 'session':
                sessionId = parsed.session_id || sessionId;
                model = parsed.model || model;
                provider = parsed.provider || provider;
                break;
              case 'content':
                if (parsed.content) {
                  fullReply += parsed.content;
                  callbacks.onChunk(parsed.content);
                }
                break;
              case 'tool_call':
                toolCalls.push({
                  name: parsed.name,
                  arguments: parsed.arguments,
                  result: parsed.result,
                  status: parsed.status || 'success'
                });
                break;
              case 'draft':
                draft = parsed.draft;
                break;
              case 'error':
                callbacks.onError(new Error(parsed.message || 'Unknown error'));
                return;
              case 'done':
                callbacks.onComplete({
                  session_id: sessionId,
                  reply: parsed.reply || fullReply,
                  tool_calls: toolCalls,
                  draft: draft || parsed.draft,
                  model,
                  provider
                });
                return;
            }
          } catch (e) {
            console.warn('[Stream] Failed to parse SSE data:', jsonStr);
          }
        }
      }
    }

    callbacks.onComplete({
      session_id: sessionId,
      reply: fullReply,
      tool_calls: toolCalls,
      draft,
      model,
      provider
    });
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export function getAiSessions(): Promise<ApiResponse<AiSessionItem[]>> {
  return request({
    url: '/ai/sessions',
    method: 'get'
  });
}

export function getAiSessionDetail(sessionId: string): Promise<ApiResponse<AiSessionDetail>> {
  return request({
    url: `/ai/sessions/${sessionId}`,
    method: 'get'
  });
}

export function deleteAiSession(sessionId: string): Promise<ApiResponse<any>> {
  return request({
    url: `/ai/sessions/${sessionId}`,
    method: 'delete'
  });
}

export function getAiModels(): Promise<ApiResponse<AiModelsData>> {
  return request({
    url: '/ai/models',
    method: 'get'
  });
}

export function getAiTools(): Promise<ApiResponse<any>> {
  return request({
    url: '/ai/tools',
    method: 'get'
  });
}

export function getAiConfig(): Promise<ApiResponse<AiConfigMap>> {
  return request({
    url: '/ai/config',
    method: 'get'
  });
}

export function updateAiConfig(data: AiConfigUpdatePayload): Promise<ApiResponse<AiConfigMap>> {
  return request({
    url: '/ai/config',
    method: 'put',
    data
  });
}
