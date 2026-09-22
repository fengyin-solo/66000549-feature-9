import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import type { AlertConfig, AlertStats, AnalysisResult, AlertRule, Alert } from '@/types'
import { defaultAlertConfig } from '@/utils/severity'

export type ConfigScope = 'subsequent' | 'backfill'

export const useLogStore = defineStore('log', () => {
  const result = ref<AnalysisResult | null>(null)
  const loading = ref(false)
  const searchQuery = ref('')
  const logType = ref('nginx')
  const rules = ref<AlertRule[]>([
    { id:1, name:'高频ERROR', type:'level', threshold:5, enabled:true },
    { id:2, name:'异常流量', type:'count', threshold:200, enabled:false },
    { id:3, name:'关键词命中', type:'keyword', threshold:0, enabled:true }
  ])

  // 当前生效的分级标准与静默时段
  const alertConfig = ref<AlertConfig>(defaultAlertConfig())
  // 后端写回的说明（含严重级别校验结果）
  const configNote = ref('')
  const configDirty = ref(false)

  async function loadAlertConfig() {
    const { data } = await axios.get('/api/alerts/config')
    alertConfig.value = data.config
    configDirty.value = false
  }

  /**
   * 保存分级/静默配置。
   * - scope=subsequent：只影响后续告警，已有条目不动
   * - scope=backfill：同时回填已有条目，列表与各图表消费同一份重新分档结果
   * 校验失败时后端返回 422，这里抛出携带 errors/note 的错误，调用方负责展示不合格项。
   */
  async function saveAlertConfig(cfg: AlertConfig, scope: ConfigScope) {
    const payload = {
      grades: cfg.grades,
      silences: cfg.silences.map((s, i) => ({ id: s.id ?? i + 1, start: s.start, end: s.end, scope: s.scope || '' })),
      scope,
      alerts: scope === 'backfill' ? (result.value?.rawAlerts ?? result.value?.alerts ?? []) : [],
    }
    try {
      const { data } = await axios.post('/api/alerts/config', payload)
      alertConfig.value = data.config
      configNote.value = data.note
      configDirty.value = false
      if (scope === 'backfill' && result.value) {
        result.value = {
          ...result.value,
          alerts: data.alerts as Alert[],
          alertStats: data.alertStats as AlertStats,
          alertConfig: data.config,
        }
      }
      return data
    } catch (e: any) {
      const body = e?.response?.data
      if (body) {
        configNote.value = body.note || '配置校验未通过，未保存。'
      }
      throw body || e
    }
  }

  async function generate() {
    loading.value=true
    try {
      const {data} = await axios.post('/api/generate',{type:logType.value,count:1000})
      result.value=data
      if (data.alertConfig) alertConfig.value = data.alertConfig
      configNote.value = ''
    } finally { loading.value=false }
  }

  async function detect() {
    if (!result.value) return
    loading.value=true
    try {
      const {data} = await axios.post('/api/detect',{logs:result.value.logs,rules:rules.value.filter(r=>r.enabled),query:searchQuery.value})
      result.value=data
      if (data.alertConfig) alertConfig.value = data.alertConfig
      configNote.value = ''
    } finally { loading.value=false }
  }

  return {
    result, loading, searchQuery, logType, rules,
    alertConfig, configNote, configDirty,
    loadAlertConfig, saveAlertConfig, generate, detect,
  }
})
