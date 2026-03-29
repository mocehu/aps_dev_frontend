<template>
  <div class="config-container">
    <a-row :gutter="24">
      <a-col :span="16">
        <a-card :bordered="false" title="系统配置">
          <a-spin :spinning="loading">
            <div v-if="!loading">
              <a-alert type="info" show-icon style="margin-bottom: 16px">
                <template #message>修改配置后立即生效，无需重启服务</template>
              </a-alert>

              <a-divider orientation="left">日志配置</a-divider>

              <a-descriptions bordered :column="1">
                <a-descriptions-item label="日志保留天数">
                  <a-input-number
                      v-model:value="configData.log_retention_days"
                      :min="1"
                      :max="365"
                      addon-after="天"
                  />
                </a-descriptions-item>
                <a-descriptions-item label="最大日志数量">
                  <a-input-number
                      v-model:value="configData.log_max_count"
                      :min="1000"
                      :max="1000000"
                      :step="10000"
                      addon-after="条"
                  />
                </a-descriptions-item>
                <a-descriptions-item label="自动清理日志">
                  <a-switch
                      v-model:checked="autoCleanupEnabled"
                      checked-children="开启"
                      un-checked-children="关闭"
                  />
                </a-descriptions-item>
                <a-descriptions-item label="清理执行时间" v-if="autoCleanupEnabled">
                  <a-input-number
                      v-model:value="configData.log_cleanup_hour"
                      :min="0"
                      :max="23"
                      addon-after="点"
                  />
                </a-descriptions-item>
              </a-descriptions>

              <a-divider orientation="left" style="margin-top: 24px">API 认证配置</a-divider>

              <a-descriptions bordered :column="1">
                <a-descriptions-item label="启用 API 认证">
                  <a-switch
                      v-model:checked="apiKeyEnabled"
                      checked-children="开启"
                      un-checked-children="关闭"
                  />
                </a-descriptions-item>
                <a-descriptions-item label="API Key">
                  <a-input-password
                      v-model:value="configData.api_key"
                      placeholder="请输入 API Key"
                      allow-clear
                  />
                </a-descriptions-item>
              </a-descriptions>

              <a-flex justify="flex-end" style="margin-top: 24px" gap="middle">
                <a-button type="primary" @click="saveConfig" :loading="saving">
                  <template #icon>
                    <save-outlined/>
                  </template>
                  保存配置
                </a-button>
                <a-button @click="resetConfig">
                  <template #icon>
                    <reload-outlined/>
                  </template>
                  重置
                </a-button>
              </a-flex>
            </div>
          </a-spin>
        </a-card>
      </a-col>

      <a-col :span="8">
        <a-card :bordered="false" title="版本信息" style="margin-bottom: 24px">
          <a-spin :spinning="versionLoading">
            <a-descriptions :column="1" size="small" v-if="versionInfo">
              <a-descriptions-item label="当前版本">
                <a-tag color="blue">{{ versionInfo.version }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="构建时间" v-if="versionInfo.build_date">
                {{ versionInfo.build_date }}
              </a-descriptions-item>
            </a-descriptions>
          </a-spin>

          <a-divider style="margin: 12px 0"/>

          <a-space direction="vertical" style="width: 100%">
            <a-button @click="handleCheckUpdate" :loading="checkingUpdate" block>
              <template #icon>
                <sync-outlined/>
              </template>
              检查更新
            </a-button>

            <a-button @click="handleViewReleaseNotes" :loading="loadingNotes" block>
              <template #icon>
                <file-text-outlined/>
              </template>
              查看更新日志
            </a-button>

            <a-alert
                v-if="updateResult"
                :type="updateResult.has_update ? 'warning' : 'success'"
                show-icon
            >
              <template #message>
                <template v-if="updateResult.has_update">
                  发现新版本 {{ updateResult.latest_version }}
                  <a :href="updateResult.release?.html_url" target="_blank" style="margin-left: 8px">
                    查看详情
                  </a>
                </template>
                <template v-else>当前已是最新版本 v{{ updateResult.current_version }}</template>
              </template>
            </a-alert>
          </a-space>
        </a-card>

      </a-col>
    </a-row>

    <a-modal
        v-model:open="notesModalVisible"
        title="更新日志"
        :footer="null"
        width="700px"
    >
      <a-spin :spinning="loadingNotes">
        <template v-if="releaseNotesList && releaseNotesList.length > 0">
          <a-collapse v-model:activeKey="activeReleaseKey" accordion>
            <a-collapse-panel
                v-for="(note, index) in releaseNotesList"
                :key="index"
                :header="note.name || note.version"
            >
              <template #extra>
                <a-space>
                  <a-tag color="blue">{{ note.version }}</a-tag>
                  <span v-if="note.published_at" style="font-size: 12px; color: #909399">
                    {{ formatDate(note.published_at) }}
                  </span>
                </a-space>
              </template>

              <a-descriptions :column="1" size="small">
                <a-descriptions-item label="发布时间" v-if="note.published_at">
                  {{ formatDate(note.published_at) }}
                </a-descriptions-item>
                <a-descriptions-item label="下载地址" v-if="note.html_url">
                  <a :href="note.html_url" target="_blank">
                    <link-outlined/>
                    GitHub Release
                  </a>
                </a-descriptions-item>
              </a-descriptions>

              <a-divider style="margin: 12px 0"/>

              <template v-if="note.body">
                <a-typography>
                  <pre
                      style="white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.6; background: #f5f5f5; padding: 12px; border-radius: 4px">{{
                      note.body
                    }}</pre>
                </a-typography>
              </template>
              <ThunderboltTwoTone/>
            </a-collapse-panel>
          </a-collapse>
        </template>
        <a-empty v-else :image="simpleImage" description="暂无更新日志"/>
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import {ref, computed, onMounted} from 'vue'
import {message, Empty} from 'ant-design-vue'
import {
  SaveOutlined,
  ReloadOutlined,
  SyncOutlined,
  FileTextOutlined,
  LinkOutlined,
  ThunderboltTwoTone
} from '@ant-design/icons-vue'
import {
  getConfigs,
  batchUpdateConfig,
  ConfigItem,
  getVersion,
  checkUpdate,
  getReleaseNotes,
  VersionInfo,
  UpdateCheckResult,
  ReleaseNote
} from '../../api/index'
import {setApiKey} from '../../utils/request'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
const loading = ref(false)
const saving = ref(false)
const versionLoading = ref(false)
const checkingUpdate = ref(false)
const loadingNotes = ref(false)
const originalConfig = ref<Record<string, ConfigItem>>({})
const versionInfo = ref<VersionInfo | null>(null)
const updateResult = ref<UpdateCheckResult | null>(null)
const releaseNotesList = ref<ReleaseNote[]>([])
const notesModalVisible = ref(false)
const activeReleaseKey = ref<number>(0)

const configData = ref({
  log_retention_days: 30,
  log_max_count: 100000,
  log_auto_cleanup: 'false',
  log_cleanup_hour: 3,
  api_key_enabled: 'true',
  api_key: ''
})

const autoCleanupEnabled = computed({
  get: () => configData.value.log_auto_cleanup === 'true',
  set: (val: boolean) => {
    configData.value.log_auto_cleanup = val ? 'true' : 'false'
  }
})

const apiKeyEnabled = computed({
  get: () => configData.value.api_key_enabled === 'true',
  set: (val: boolean) => {
    configData.value.api_key_enabled = val ? 'true' : 'false'
  }
})


const loadConfig = async () => {
  loading.value = true
  try {
    const res = await getConfigs()
    if (res.code === 200 && res.data) {
      originalConfig.value = res.data
      configData.value = {
        log_retention_days: parseInt(res.data.log_retention_days?.value || '30'),
        log_max_count: parseInt(res.data.log_max_count?.value || '100000'),
        log_auto_cleanup: res.data.log_auto_cleanup?.value || 'false',
        log_cleanup_hour: parseInt(res.data.log_cleanup_hour?.value || '3'),
        api_key_enabled: res.data.api_key_enabled?.value || 'true',
        api_key: res.data.api_key?.value || ''
      }
    }
  } catch (error) {
    message.error('加载配置失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const loadVersion = async () => {
  versionLoading.value = true
  try {
    const res = await getVersion()
    if (res.code === 200 && res.data) {
      versionInfo.value = res.data
    }
  } catch (error) {
    console.error('获取版本信息失败', error)
  } finally {
    versionLoading.value = false
  }
}

const handleCheckUpdate = async () => {
  checkingUpdate.value = true
  try {
    const res = await checkUpdate(true)
    if (res.code === 200 && res.data) {
      updateResult.value = res.data
    }
  } catch (error) {
    message.error('检查更新失败')
    console.error(error)
  } finally {
    checkingUpdate.value = false
  }
}

const handleViewReleaseNotes = async () => {
  notesModalVisible.value = true
  loadingNotes.value = true
  try {
    const res = await getReleaseNotes(true)
    if (res.code === 200 && res.data) {
      releaseNotesList.value = res.data.releases || []
      activeReleaseKey.value = 0
    }
  } catch (error) {
    message.error('获取更新日志失败')
    console.error(error)
  } finally {
    loadingNotes.value = false
  }
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const saveConfig = async () => {
  saving.value = true
  try {
    const configs: Record<string, string> = {
      log_retention_days: configData.value.log_retention_days.toString(),
      log_max_count: configData.value.log_max_count.toString(),
      log_auto_cleanup: configData.value.log_auto_cleanup,
      log_cleanup_hour: configData.value.log_cleanup_hour.toString(),
      api_key_enabled: configData.value.api_key_enabled,
      api_key: configData.value.api_key
    }

    const res = await batchUpdateConfig(configs)
    if (res.code === 200) {
      message.success('配置保存成功')
      originalConfig.value = res.data

      if (configData.value.api_key) {
        setApiKey(configData.value.api_key)
      }
    } else {
      message.error(res.msg || '保存失败')
    }
  } catch (error) {
    message.error('保存配置失败')
    console.error(error)
  } finally {
    saving.value = false
  }
}

const resetConfig = () => {
  if (originalConfig.value) {
    configData.value = {
      log_retention_days: parseInt(originalConfig.value.log_retention_days?.value || '30'),
      log_max_count: parseInt(originalConfig.value.log_max_count?.value || '100000'),
      log_auto_cleanup: originalConfig.value.log_auto_cleanup?.value || 'false',
      log_cleanup_hour: parseInt(originalConfig.value.log_cleanup_hour?.value || '3'),
      api_key_enabled: originalConfig.value.api_key_enabled?.value || 'true',
      api_key: originalConfig.value.api_key?.value || ''
    }
    message.info('已重置为原始配置')
  }
}

onMounted(() => {
  loadConfig()
  loadVersion()
})
</script>

