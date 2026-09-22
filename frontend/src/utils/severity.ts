import type { Alert, AlertConfig, GradeDef, SeverityLevel } from '@/types'

// 与后端 alerts.py 的 LEVEL_ORDER 保持一致
export const LEVEL_ORDER: SeverityLevel[] = ['critical', 'high', 'medium', 'low']

// 固定配色：告警列表、时间线、趋势图/异常图标记点共用，保证“分档一致、颜色一致”
export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#fbbf24',
  low: '#38bdf8',
}
export const SEVERITY_LABELS_FALLBACK: Record<string, string> = {
  critical: '紧急',
  high: '严重',
  medium: '中等',
  low: '轻微',
}

export function severityColor(level: string): string {
  return SEVERITY_COLORS[level] || SEVERITY_COLORS.low
}

export function severityLabel(level: string): string {
  return SEVERITY_LABELS_FALLBACK[level] || level
}

/** 后端返回的告警已带 severity；这是纯展示兜底，图表与列表永远只消费同一份 alerts。 */
export function gradeOf(score: number, grades: GradeDef[]): GradeDef {
  for (const g of [...grades].sort((a, b) => b.min - a.min)) {
    if (score >= g.min) return g
  }
  return grades[grades.length - 1]
}

export function gradeLabel(a: Alert): string {
  return a.severityLabel || SEVERITY_LABELS_FALLBACK[String(a.severity)] || String(a.severity)
}

export function gradeColor(a: Alert): string {
  return severityColor(String(a.severity))
}

export function defaultAlertConfig(): AlertConfig {
  return {
    grades: [
      { level: 'critical', label: '紧急', min: 8 },
      { level: 'high', label: '严重', min: 5 },
      { level: 'medium', label: '中等', min: 2 },
      { level: 'low', label: '轻微', min: 0 },
    ],
    silences: [],
  }
}
