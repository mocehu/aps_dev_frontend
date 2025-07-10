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

/* 函数选择下拉菜单样式 */
.func-select-dropdown {
  max-width: 500px !important;
  min-width: 350px !important;
}

.func-select-dropdown .el-select-dropdown__item {
  height: auto;
  padding: 6px 12px;
  line-height: 1.5;
  white-space: normal;
}

.func-select-dropdown .el-select-dropdown__item.selected {
  background-color: #f0f9eb;
}

.func-select-dropdown .el-select-dropdown__item.hover {
  background-color: #f5f7fa;
}

.func-select-dropdown .el-select-dropdown__item:hover {
  background-color: #f5f7fa;
}

.func-select-dropdown .el-select-dropdown__item.selected.hover {
  background-color: #e6f3d9;
}

/* 优化alert组件中的描述文本 */
.func-selected-description .el-alert__title {
  font-size: 13px !important;
  line-height: 1.6 !important;
  white-space: normal !important;
  word-break: break-word !important;
}

.func-selected-description .el-alert__icon {
  font-size: 16px !important;
  color: #409EFF !important;
}

/* 时间标签样式 */
.time-tag.el-tag--large {
  padding: 6px 10px;
  font-size: 14px;
  line-height: 1.5;
}

.time-tag.el-tag--danger.is-plain {
  background-color: #fff0f0;
}

.time-tag.el-tag--warning.is-plain {
  background-color: #fdf6ec;
}

.time-tag.el-tag--success.is-plain {
  background-color: #f0f9eb;
}

.time-tag.el-tag--info.is-plain {
  background-color: #f4f4f5;
}
</style>
