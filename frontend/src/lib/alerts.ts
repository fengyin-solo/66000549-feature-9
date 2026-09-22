import type { Alert, AlertConfig, ApplyScope, ConfigNote, SeverityKey, SeverityTier, SilenceRule } from '@/types'

/** 固定的四档标准；顺序即严重程度由高到低 */
export const SEVERITY_KEYS: SeverityKey[] = ['critical', 'high', 'medium', 'low']

export const DEFAULT_CONFIG: AlertConfig = {
  tiers: [
    { key: 'critical', label: '紧急', min: 4 },
    { key: 'high', label: '高', min: 2.5 },
    { key: 'medium', label: '中', min: 1 },
    { key: 'low', label: '低', min: 0 }
  ],
  silences: []
}

/** 各档展示样式（图表/列表共用，保证分档视觉一致） */
export const SEVERITY_COLORS: Record<SeverityKey, string> = {
  critical: '#ef4444',
  high: '#f87171',
  medium: '#fbbf24',
  low: '#38bdf8'
}

export const SEVERITY_LABELS: Record<SeverityKey, string> = {
  critical: '紧急',
  high: '高',
  medium: '中',
  low: '低'
}

const TIME_RE = /^(\d{2}):(\d{2}):(\d{2})$/

export function timeToSeconds(value: string): number | null {
  const m = TIME_RE.exec((value ?? '').trim())
  if (!m) return null
  const hh = +m[1]; const mm = +m[2]; const ss = +m[3]
  if (hh > 23 || mm > 59 || ss > 59) return null
  return hh * 3600 + mm * 60 + ss
}

/** 校验分级标准 + 静默时段；返回逐条不合格项（空数组表示可保存） */
export function validateConfig(config: AlertConfig): string[] {
  const errors: string[] = []
  const tiers = config?.tiers
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return ['分级标准不能为空，且必须包含 critical/high/medium/low 四档']
  }

  // ---- 严重级别 ----
  const byKey = new PartialMap<SeverityKey, SeverityTier>()
  tiers.forEach((tier, i) => {
    const key = tier?.key as SeverityKey
    const rawMin = tier?.min as unknown
    if (!SEVERITY_KEYS.includes(key)) {
      errors.push(`严重级别填错：第${i + 1}档 '${tier?.key}' 不是合法档位，只允许 critical/high/medium/low`)
      return
    }
    if (byKey.has(key)) {
      errors.push(`严重级别填错：'${key}' 档位重复配置`)
      return
    }
    if (typeof rawMin !== 'number' || Number.isNaN(rawMin)) {
      errors.push(`严重级别填错：'${key}' 的阈值必须是数字，当前为 ${JSON.stringify(rawMin)}`)
      return
    }
    byKey.set(key, tier)
  })

  for (const key of SEVERITY_KEYS) {
    if (!byKey.has(key)) errors.push(`分级标准缺少档位：${key}`)
  }
  if (SEVERITY_KEYS.every(k => byKey.has(k))) {
    const vals = SEVERITY_KEYS.map(k => byKey.get(k)!.min as number)
    // SEVERITY_KEYS 由高到低：critical < high < medium < low 的阈值顺序反过来要求
    const [critM, highM, medM, lowM] = vals
    if (lowM !== 0) errors.push(`严重级别填错：最低档 low 的阈值必须为 0（兜底盘），当前为 ${lowM}`)
    const ordered: [SeverityKey, number][] = [
      ['low', lowM], ['medium', medM], ['high', highM], ['critical', critM]
    ]
    for (let i = 1; i < ordered.length; i++) {
      const [prevK, prevV] = ordered[i - 1]
      const [curK, curV] = ordered[i]
      if (!(prevV < curV)) {
        errors.push(`严重级别填错：${prevK} 的阈值(${prevV}) 必须小于 ${curK} 的阈值(${curV})，分档边界不允许相等或颠倒`)
      }
    }
  }

  // ---- 静默时段 ----
  const silences = config?.silences ?? []
  if (!Array.isArray(silences)) {
    errors.push('静默时段必须是列表')
    return errors
  }
  silences.forEach((rule, i) => {
    const name = (rule?.name ?? '').trim()
    const target = (rule?.target ?? '').trim()
    const prefix = `静默时段'${name || `第${i + 1}条`}'`
    if (!name) errors.push(`${prefix}：名称不能为空`)
    if (!target) errors.push(`${prefix}：必须指定适用的同类告警（规则名或全部告警）`)
    const start = timeToSeconds(rule?.startTime ?? '')
    const end = timeToSeconds(rule?.endTime ?? '')
    if (start === null) errors.push(`${prefix}：起始时间格式错误，应为 HH:MM:SS，当前为 ${JSON.stringify(rule?.startTime)}`)
    if (end === null) errors.push(`${prefix}：结束时间格式错误，应为 HH:MM:SS，当前为 ${JSON.stringify(rule?.endTime)}`)
    if (start !== null && end !== null && start >= end) {
      errors.push(`${prefix}：起止时间颠倒（${rule?.startTime} ≥ ${rule?.endTime}），起始必须早于结束`)
    }
  })

  return errors
}

/** 按同一套分级标准把统一分数归入档位 */
export function classifySeverity(score: number, tiers: SeverityTier[]): SeverityKey {
  const sorted = [...tiers].sort((a, b) => b.min - a.min)
  for (const tier of sorted) {
    if (score >= tier.min) return tier.key
  }
  return 'low'
}

/**
 * 应用静默时段：静默期内的同类(ruleName)重复告警只保留第一次并标 silenced(静默中)，
 * 其余标 suppressed（折叠不删除，规则解除后可恢复展示）；静默结束后的同类告警正常展示。
 * 不修改入参，返回处理后的新数组。
 */
export function applySilences(alerts: Alert[], silences: SilenceRule[]): Alert[] {
  const result = alerts.map(a => ({ ...a, silenced: false, suppressed: false, silenceRule: null as string | null }))
  const enabled = silences
    .filter(r => r.enabled)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const seen = new Set<string>()
  const ordered = [...result].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp) || a.id - b.id)
  for (const alert of ordered) {
    const match = enabled.find(r =>
      (r.target === '__ALL__' || r.target === alert.ruleName) &&
      r.startTime <= alert.timestamp && alert.timestamp <= r.endTime)
    if (!match) continue
    const key = `${match.id}::${alert.ruleName}`
    if (seen.has(key)) {
      alert.suppressed = true
    } else {
      seen.add(key)
      alert.silenced = true
      alert.silenceRule = match.name
    }
  }
  return result
}

/** 统一入口：重新分档 + 静默处理。告警列表与各图表面板都消费这里的输出 */
export function processAlerts(rawAlerts: Alert[], config: AlertConfig): Alert[] {
  const regraded = rawAlerts.map(a => ({
    ...a,
    severity: classifySeverity(Number(a.score) || 0, config.tiers)
  }))
  return applySilences(regraded, config.silences)
}

/** 折叠掉静默期内的重复告警；第一次(静默中)和静默结束后的正常告警都保留 */
export function visibleAlerts(alerts: Alert[]): Alert[] {
  return alerts.filter(a => !a.suppressed)
}

export function tierLabel(key: SeverityKey, tiers: SeverityTier[]): string {
  return tiers.find(t => t.key === key)?.label || SEVERITY_LABELS[key]
}

export function severityColor(key: string): string {
  return SEVERITY_COLORS[key as SeverityKey] ?? SEVERITY_COLORS.low
}

export function buildConfigNote(config: AlertConfig, scope: ApplyScope): ConfigNote {
  const errors = validateConfig(config)
  const tierDesc = config.tiers
    .slice()
    .sort((a, b) => b.min - a.min)
    .map(t => `${t.label || t.key}≥${t.min}`)
    .join('，')
  const silCount = config.silences.filter(s => s.enabled).length
  const scopeText = scope === 'backfill' ? '同时回填已有告警' : '只影响后续告警'
  const summary = errors.length === 0
    ? `校验通过：分级标准（${tierDesc}）已按同一套标准${scope === 'backfill' ? '重新分档所有告警' : '应用于后续告警'}；`
      + `启用静默时段 ${silCount} 条，静默期内同类重复告警仅保留第一次并标注“静默中”。作用范围：${scopeText}。`
    : `校验未通过（共${errors.length}项），配置未保存；请按下方不合格项修正后重试。`
  return {
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    scope,
    valid: errors.length === 0,
    errors,
    summary
  }
}

class PartialMap<K extends string, V> {
  private m = new Map<K, V>()
  has(k: K) { return this.m.has(k) }
  get(k: K) { return this.m.get(k) }
  set(k: K, v: V) { this.m.set(k, v) }
}
