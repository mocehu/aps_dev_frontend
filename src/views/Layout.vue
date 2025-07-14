<template>
  <a-layout class="app-container">
    <!-- 顶部导航栏 -->
    <a-layout-header class="app-header">
      <div class="header-title">定时任务管理</div>
      <a-menu
        mode="horizontal"
        :selectedKeys="activeKeys"
        @update:selectedKeys="updateSelectedKeys"
        class="nav-menu"
      >
        <a-menu-item key="/jobs">
          <template #icon><calendar-outlined /></template>
          <router-link to="/jobs">计划任务</router-link>
        </a-menu-item>
        <a-menu-item key="/tasks">
          <template #icon><unordered-list-outlined /></template>
          <router-link to="/tasks">可用任务</router-link>
        </a-menu-item>
        <a-menu-item key="/logs">
          <template #icon><file-outlined /></template>
          <router-link to="/logs">日志信息</router-link>
        </a-menu-item>
      </a-menu>
      <div class="header-actions">
        <!-- 可以添加其他操作按钮，如用户信息等 -->
      </div>
    </a-layout-header>
    
    <!-- 主内容区域 -->
    <a-layout-content class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </a-layout-content>
    

  </a-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { 
  CalendarOutlined, 
  UnorderedListOutlined, 
  FileOutlined 
} from '@ant-design/icons-vue'

const route = useRoute()
const activeKeys = ref<string[]>([])

// 计算当前激活的菜单项
const selectedKeys = computed(() => {
  const { path } = route
  if (path.startsWith('/jobs/')) {
    return ['/jobs']
  }
  return [path]
})

// 监听计算属性的变化，并更新activeKeys
watch(selectedKeys, (newValue) => {
  activeKeys.value = newValue
}, { immediate: true })

// 更新选中的菜单项
const updateSelectedKeys = (keys: string[]) => {
  activeKeys.value = keys
}
</script>

<style scoped lang="scss">
.app-container {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  height: 64px;
  line-height: 64px;
  
  .header-title {
    font-size: 20px;
    font-weight: 600;
    color: #1890ff;
    margin-right: 30px;
  }
  
  .nav-menu {
    flex: 1;
    
    a {
      color: inherit;
      text-decoration: none;
    }
  }
  
  .header-actions {
    margin-left: auto;
  }
}

.app-main {
  padding: 24px;
  background-color: #f0f2f5;
  min-height: calc(100vh - 64px - 70px);
}

.app-footer {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70px;
  
  .footer-content {
    color: rgba(0, 0, 0, 0.45);
    font-size: 14px;
  }
}

// 页面过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style> 