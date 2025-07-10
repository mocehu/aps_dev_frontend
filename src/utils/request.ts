// 进行axios的二次封装
// 导入axios
import axios from 'axios';

// 引入ant-design-vue 美化报错
import { message } from 'ant-design-vue';

// 从环境变量获取 baseURL
const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://192.168.2.78:8000';

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 30000  // Increased timeout to 30 seconds
});

// 请求拦截器
request.interceptors.request.use((config) => {
  config.headers.token = localStorage.getItem('TOKEN');
  return config;
});

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 检查响应是否符合新的返回结构：{code, msg, data}
    if (response.data && typeof response.data === 'object' && 'code' in response.data) {
      // 如果请求成功，返回data部分
      if (response.data.code === 200) {
        return response.data;
      } else {
        // 如果请求返回错误码，显示错误信息
        message.error(response.data.msg || '请求失败');
        return Promise.reject(new Error(response.data.msg || '请求失败'));
      }
    }
    // 兼容旧版API，直接返回数据
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status) {
      message.error(error.message);
    }
    return Promise.reject(error);
  }
);
export default request;
