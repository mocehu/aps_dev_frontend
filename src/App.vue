<template>
  <router-view></router-view>
</template>

<script setup lang="ts">
// 主应用入口，仅作为路由容器
</script>

<style>
/* 全局样式 */
html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 自定义下拉菜单样式 */
.func-select-dropdown {
  max-width: 500px !important;
  min-width: 350px !important;
}

/* 时间标签样式 */
.time-tag {
  display: inline-block;
  padding: 6px 10px;
  font-size: 14px;
  line-height: 1.5;
  border-radius: 2px;
}

.time-tag-danger {
  color: #ff4d4f;
  background-color: #fff1f0;
  border: 1px solid #ffccc7;
}

.time-tag-warning {
  color: #faad14;
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
}

.time-tag-success {
  color: #52c41a;
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
}

.time-tag-info {
  color: #1677ff;
  background-color: #e6f4ff;
  border: 1px solid #91caff;
}
</style>
