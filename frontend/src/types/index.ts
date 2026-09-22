export interface LogEntry { id: number; timestamp: string; level: string; source: string; message: string; raw: string }
export interface TimeWindow { start: number; end: number; count: number; levels: Record<string,number>; sources: Record<string,number> }
export interface AnomalyScore { windowIndex: number; sigmaScore: number; iqrScore: number; isAnomaly: boolean; timestamp: string }
export interface AlertRule { id: number; name: string; type: string; threshold: number; enabled: boolean }

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'
export interface GradeDef { level: SeverityLevel; label: string; min: number }
export interface SilenceDef { id?: number; start: string; end: string; scope: string }
export interface AlertConfig { grades: GradeDef[]; silences: SilenceDef[] }

export interface ConfigFieldError { field: string; message: string; value?: unknown }
export interface AlertStats {
  totalRaw: number
  kept: number
  suppressed: number
  silencedFirsts: number
  bySeverity: Record<SeverityLevel, number>
}

export interface Alert {
  id: number
  ruleName: string
  severity: SeverityLevel | string
  severityLabel?: string
  score?: number
  message: string
  timestamp: string
  timeSec?: number
  windowIndex?: number
  silenced?: boolean
  suppressedCount?: number
  silenceWindowId?: number | null
  silenceRange?: string
}

export interface AnalysisResult {
  logs: LogEntry[]
  windows: TimeWindow[]
  anomalies: AnomalyScore[]
  alerts: Alert[]
  rawAlerts?: Alert[]
  alertStats?: AlertStats
  alertConfig?: AlertConfig
  totalLogs: number
}
