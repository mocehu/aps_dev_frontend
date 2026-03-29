<template>
  <router-view></router-view>
  
  <!-- 全局 API Key 弹窗 -->
  <a-modal
    v-model:open="showApiKeyModal"
    title="API Key 配置"
    :closable="false"
    :maskClosable="false"
    :footer="null"
    width="400px"
  >
    <a-alert type="warning" show-icon style="margin-bottom: 16px">
      <template #message>API 认证失败，请配置有效的 API Key</template>
    </a-alert>
    
    <a-form layout="vertical">
      <a-form-item label="API Key">
        <a-input-password 
          v-model:value="tempApiKey" 
          placeholder="请输入 API Key"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" block @click="handleSaveApiKey">
          保存并重试
        </a-button>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onApiKeyError, setApiKey, getApiKey } from './utils/request'

const showApiKeyModal = ref(false)
const tempApiKey = ref('')

const handleSaveApiKey = () => {
  setApiKey(tempApiKey.value)
  showApiKeyModal.value = false
  window.location.reload()
}

onMounted(() => {
  // 监听 API Key 错误事件
  onApiKeyError(() => {
    tempApiKey.value = getApiKey() || ''
    showApiKeyModal.value = true
  })
})

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
