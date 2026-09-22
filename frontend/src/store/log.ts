import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import type { AnalysisResult, AlertRule, AlertConfig, Alert, ApplyScope, ConfigNote } from '@/types'
import { DEFAULT_CONFIG, processAlerts, validateConfig, buildConfigNote } from '@/lib/alerts'

const CONFIG_KEY = 'log-alert-config-v1'
const NOTE_KEY = 'log-alert-config-note-v1'

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function loadStored(): { view: AlertConfig; future: AlertConfig | null; note: ConfigNote | null } {
  let view: AlertConfig = clone(DEFAULT_CONFIG)
  let future: AlertConfig | null = null
  let note: ConfigNote | null = null
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.view?.tiers && parsed?.future !== undefined) {
        view = parsed.view
        future = parsed.future
      } else if (parsed && Array.isArray(parsed.tiers)) {
        view = parsed // 兼容直接存 config 的旧结构
      }
    }
    const noteRaw = localStorage.getItem(NOTE_KEY)
    if (noteRaw) note = JSON.parse(noteRaw)
  } catch { /* ignore */ }
  return { view, future, note }
}

export const useLogStore = defineStore('log', () => {
  const result = ref<AnalysisResult | null>(null)
  const loading = ref(false)
  const searchQuery = ref('')
  const logType = ref('nginx')
  const rules = ref<AlertRule[]>([
    { id: 1, name: '高频ERROR', type: 'level', threshold: 5, enabled: true },
    { id: 2, name: '异常流量', type: 'count', threshold: 200, enabled: false },
    { id: 3, name: '关键词命中', type: 'keyword', threshold: 0, enabled: true }
  ])

  const stored = loadStored()
  /** 当前视图生效配置：驱动告警列表与各图表面板（始终一致） */
  const viewConfig = ref<AlertConfig>(stored.view)
  /** “只影响后续”时保存、尚未作用于当前视图的配置；下次生成/检测时生效 */
  const futureConfig = ref<AlertConfig | null>(stored.future)
  const lastNote = ref<ConfigNote | null>(stored.note)

  /**
   * 列表与各图表面板的唯一数据源：
   * 按 viewConfig 的同一套分级标准重新分档、按静默时段折叠后的告警。
   */
  const alerts = computed<Alert[]>(() =>
    processAlerts(result.value?.alerts ?? [], viewConfig.value))

  const activeConfig = computed<AlertConfig>(() => futureConfig.value ?? viewConfig.value)

  function persist() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ view: viewConfig.value, future: futureConfig.value }))
  }

  function setNote(note: ConfigNote) {
    lastNote.value = note
    localStorage.setItem(NOTE_KEY, JSON.stringify(note))
  }

  /**
 * 保存分级标准与静默时段。
   * - 校验不通过（严重级别填错 / 静默起止颠倒等）：不允许保存，返回逐项不合格项
   * - scope='future'：只影响后续告警，当前列表与图表不变
   * - scope='backfill'：同时回填已有条目，列表与所有图表立即按新标准重新分档
   */
  async function saveConfig(next: AlertConfig, scope: ApplyScope): Promise<{ ok: boolean; errors: string[] }> {
    const errors = validateConfig(next)
    if (errors.length) {
      setNote({
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        scope, valid: false, errors,
        summary: `校验未通过（共${errors.length}项），配置未保存；请按不合格项修正后重试。`
      })
      return { ok: false, errors }
    }

    loading.value = true
    try {
      // 同步给后端，保证后续 /api/generate、/api/detect 使用同一套标准
      await axios.put('/api/alert-config', next)
    } catch (e: any) {
      const serverErrors: string[] = e?.response?.data?.detail?.errors ?? ['后端保存失败，请重试']
      setNote({
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        scope, valid: false, errors: serverErrors,
        summary: `服务端校验未通过（共${serverErrors.length}项），配置未保存。`
      })
      return { ok: false, errors: serverErrors }
    } finally {
      loading.value = false
    }

    if (scope === 'backfill') {
      // 回填：当前视图立即重分档，并在现有数据上重新检测
      viewConfig.value = next
      futureConfig.value = null
      persist()
      await detect(true)
    } else {
      // 只影响后续：当前列表/图表保持不变，下一次生成/检测时生效
      futureConfig.value = next
      persist()
    }

    setNote(buildConfigNote(next, scope))
    return { ok: true, errors: [] }
  }

  /** 新的一次生成/检测开始前，套用待生效（只影响后续）的配置 */
  function activatePending() {
    if (futureConfig.value) {
      viewConfig.value = futureConfig.value
      futureConfig.value = null
      persist()
    }
  }

  async function generate() {
    loading.value = true
    try {
      activatePending()
      const { data } = await axios.post('/api/generate', {
        type: logType.value, count: 1000, config: viewConfig.value
      })
      result.value = data
    } finally { loading.value = false }
  }

  async function detect(silent = false) {
    if (!result.value) return
    if (!silent) loading.value = true
    try {
      activatePending()
      const { data } = await axios.post('/api/detect', {
        logs: result.value.logs,
        rules: rules.value.filter(r => r.enabled),
        query: searchQuery.value,
        config: viewConfig.value
      })
      result.value = data
    } finally { if (!silent) loading.value = false }
  }

  return {
    result, loading, searchQuery, logType, rules,
    viewConfig, futureConfig, lastNote,
    alerts, activeConfig,
    generate, detect, saveConfig
  }
})
