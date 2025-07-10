<template>
  <div class="app-container">
    <!-- 顶部导航栏 -->
    <el-header class="app-header">
      <div class="header-title">任务调度系统</div>
      <div class="header-menu">
        <el-menu
          mode="horizontal"
          :router="true"
          :default-active="activeMenu"
          class="nav-menu"
        >
          <el-menu-item index="/jobs">
            <el-icon><Calendar /></el-icon>
            <span>计划任务</span>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <el-icon><List /></el-icon>
            <span>可用任务</span>
          </el-menu-item>
          <el-menu-item index="/logs">
            <el-icon><Document /></el-icon>
            <span>日志信息</span>
          </el-menu-item>
        </el-menu>
      </div>
      <div class="header-actions">
        <!-- 可以添加其他操作按钮，如用户信息等 -->
      </div>
    </el-header>
    
    <!-- 主内容区域 -->
    <el-main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
    
    <!-- 底部区域 -->
    <el-footer class="app-footer">
      <div class="footer-content">
        <span>© {{ new Date().getFullYear() }} 任务调度系统</span>
      </div>
    </el-footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Calendar, List, Document } from '@element-plus/icons-vue'

const route = useRoute()

// 计算当前激活的菜单项
const activeMenu = computed(() => {
  const { path } = route
  if (path.startsWith('/jobs/')) {
    return '/jobs'
  }
  return path
})
</script>

<style scoped lang="scss">
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  height: 60px;
  
  .header-title {
    font-size: 20px;
    font-weight: 600;
    color: #409EFF;
  }
  
  .header-menu {
    flex: 1;
    display: flex;
    justify-content: center;
    
    .nav-menu {
      border-bottom: none;
    }
  }
}

.app-main {
  padding: 20px;
  flex: 1;
}

.app-footer {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  
  .footer-content {
    color: #909399;
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