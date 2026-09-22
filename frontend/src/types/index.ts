export interface LogEntry { id: number; timestamp: string; level: string; source: string; message: string; raw: string }
export interface TimeWindow { start: number; end: number; count: number; levels: Record<string,number>; sources: Record<string,number> }
export interface AnomalyScore { windowIndex: number; sigmaScore: number; iqrScore: number; isAnomaly: boolean; timestamp: string }
export interface AlertRule { id: number; name: string; type: string; threshold: number; enabled: boolean }

export type SeverityKey = 'critical' | 'high' | 'medium' | 'low'

/** 分级标准中的一档：同一套标准对所有告警生效 */
export interface SeverityTier {
  key: SeverityKey
  label: string
  /** 统一分数 >= min 即归入该档（由高到低匹配） */
  min: number
}

/** 静默时段配置 */
export interface SilenceRule {
  id: number
  name: string
  /** 目标告警规则名；'__ALL__' 表示全部告警（同类按 ruleName 去重） */
  target: string
  startTime: string
  endTime: string
  enabled: boolean
}

export interface AlertConfig {
  tiers: SeverityTier[]
  silences: SilenceRule[]
}

/** 配置保存的作用范围 */
export type ApplyScope = 'future' | 'backfill'

/** 校验结果说明（写入“说明”区域） */
export interface ConfigNote {
  time: string
  scope: ApplyScope
  valid: boolean
  errors: string[]
  summary: string
}

export interface Alert {
  id: number
  ruleName: string
  severity: SeverityKey | string
  /** 后端统一评分，前端分级的唯一依据 */
  score: number
  message: string
  timestamp: string
  windowIndex: number
  /** 静默期内保留的第一次同类告警：静默中 */
  silenced: boolean
  /** 静默期内被折叠的重复告警 */
  suppressed: boolean
  silenceRule?: string | null
}

export interface AnalysisResult {
  logs: LogEntry[]
  windows: TimeWindow[]
  anomalies: AnomalyScore[]
  alerts: Alert[]
  totalLogs: number
  alertConfig?: AlertConfig
}
