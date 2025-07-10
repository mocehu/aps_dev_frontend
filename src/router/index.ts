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
        meta: { title: '可用任务' }
      },
      {
        path: '/logs',
        name: 'LogList',
        component: () => import('../views/logs/LogList.vue'),
        meta: { title: '日志信息' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫，设置页面标题
router.beforeEach((to, from, next) => {
  document.title = to.meta.title as string || '任务调度系统'
  next()
})

export default router 