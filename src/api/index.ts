// 统一管理项目用户相关的接口
// 引入request
import request from '../utils/request';
import type { Job, LogResponse, ApiResponse, LogData, FuncOption, TaskCategory } from '../types/api';

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