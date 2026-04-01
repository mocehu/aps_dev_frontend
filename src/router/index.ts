import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Layout from '../views/Layout.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: Layout,
    redirect: '/jobs',
    children: [
      {
        path: '/jobs',
        name: 'JobList',
        component: () => import('../views/jobs/JobList.vue'),
        meta: { title: '计划任务' }
      },
      {
        path: '/jobs/:id',
        name: 'JobDetail',
        component: () => import('../views/jobs/JobDetail.vue'),
        props: true,
        meta: { title: '任务详情' }
      },
      {
        path: '/tasks',
        name: 'TaskList',
        component: () => import('../views/tasks/TaskList.vue'),
        meta: { title: '可用函数' }
      },
      {
        path: '/logs',
        name: 'LogList',
        component: () => import('../views/logs/LogList.vue'),
        meta: { title: '日志信息' }
      },
      {
        path: '/ai',
        name: 'AiChat',
        component: () => import('../views/ai/AiChat.vue'),
        meta: { title: 'AI 助手' }
      },
{
        path: '/config',
        name: 'Config',
        component: () => import('../views/config/Config.vue'),
        meta: { title: '系统配置' }
      },
      {
        path: '/alerts/rules',
        name: 'AlertRules',
        component: () => import('../views/alerts/AlertRules.vue'),
        meta: { title: '告警规则' }
      },
      {
        path: '/alerts/channels',
        name: 'AlertChannels',
        component: () => import('../views/alerts/AlertChannels.vue'),
        meta: { title: '告警渠道' }
      },
      {
        path: '/alerts/history',
        name: 'AlertHistory',
        component: () => import('../views/alerts/AlertHistory.vue'),
        meta: { title: '告警历史' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫，设置页面标题
router.beforeEach((to, _from, next) => {
  document.title = to.meta.title as string || '任务调度系统'
  next()
})

export default router 
