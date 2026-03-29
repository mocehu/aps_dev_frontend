// 统一管理项目用户相关的接口
// 引入request
import request from '../utils/request';
import type { Job, LogResponse, ApiResponse, FuncOption, TaskCategory } from '../types/api';

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

export interface ConfigItem {
  value: string;
  description: string;
  updated_at: string | null;
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