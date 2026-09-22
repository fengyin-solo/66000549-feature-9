<template>
  <div class="panel">
    <div class="panel-head">
      <h4>🚨 告警列表</h4>
      <el-button size="small" type="primary" plain @click="openConfig">⚙ 分级/静默配置</el-button>
    </div>

    <!-- 分档统计：与图表共用同一份 alerts -->
    <div v-if="alerts.length" class="stats-row">
      <span v-for="lv in levelOrder" :key="lv" class="stat-chip" :style="{ borderColor: colorOf(lv) }">
        <i class="dot" :style="{ background: colorOf(lv) }"></i>
        {{ labelOf(lv) }} {{ stats.bySeverity[lv] || 0 }}
      </span>
      <span v-if="stats.silencedFirsts" class="stat-chip silenced-chip">🔇 静默中 {{ stats.silencedFirsts }}</span>
      <span v-if="stats.suppressed" class="stat-chip suppressed-chip">折叠重复 {{ stats.suppressed }}</span>
    </div>

    <div v-if="!alerts.length" class="empty">暂无告警</div>
    <div
      v-for="a in alerts.slice(0,8)"
      :key="a.id"
      class="alert-row"
      :class="{ silenced: a.silenced }"
      :style="{ borderLeft: `3px solid ${colorOf(String(a.severity))}` }"
    >
      <span class="a-sev" :style="{ color: colorOf(String(a.severity)), background: colorOf(String(a.severity)) + '22' }">
        {{ gradeLabel(a) }}
      </span>
      <div class="a-body">
        <div class="a-line">
          <span class="a-time">{{ a.timestamp }}</span>
          <span class="a-rule">{{ a.ruleName }}</span>
          <el-tag v-if="a.silenced" size="small" type="info" effect="dark" class="mute-tag">
            🔇 静默中{{ a.silenceRange ? ' ' + a.silenceRange : '' }}
          </el-tag>
        </div>
        <div class="a-msg">{{ a.message }}</div>
        <div v-if="a.suppressedCount" class="a-suppressed">
          静默时段内另有 {{ a.suppressedCount }} 条同类重复告警已折叠；时段结束后同类告警恢复展示
        </div>
      </div>
    </div>

    <!-- 配置说明（含严重级别校验结果） -->
    <div v-if="store.configNote" class="cfg-note">
      <pre>{{ store.configNote }}</pre>
    </div>

    <AlertConfigDialog ref="dlgRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogStore } from '../store/log'
import AlertConfigDialog from './AlertConfigDialog.vue'
import { LEVEL_ORDER, gradeLabel, severityColor } from '@/utils/severity'
import type { SeverityLevel } from '@/types'

const store = useLogStore()
const dlgRef = ref<InstanceType<typeof AlertConfigDialog> | null>(null)

const alerts = computed(() => store.result?.alerts || [])
const stats = computed(() => store.result?.alertStats || {
  totalRaw: 0, kept: 0, suppressed: 0, silencedFirsts: 0,
  bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
})
const levelOrder = LEVEL_ORDER
const colorOf = (lv: string) => severityColor(lv)
const labelOf = (lv: SeverityLevel) =>
  store.alertConfig.grades.find(g => g.level === lv)?.label || gradeLabel({ severity: lv } as any)

function openConfig() {
  dlgRef.value?.open()
}
</script>

<style scoped>
.panel{background:#1e293b;border-radius:8px;padding:12px;border:1px solid #334155;margin-top:12px}
.panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.panel-head h4{color:#f87171;font-size:13px}
.stats-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.stat-chip{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#cbd5e1;border:1px solid #334155;border-radius:10px;padding:1px 8px;background:#0f172a88}
.stat-chip .dot{width:6px;height:6px;border-radius:50%;display:inline-block}
.silenced-chip{border-color:#64748b;color:#cbd5e1}
.suppressed-chip{border-color:#78350f;color:#fbbf24}
.empty{color:#64748b;font-size:12px}
.alert-row{display:flex;gap:8px;padding:5px 8px;margin:3px 0;border-radius:4px;font-size:11px;align-items:flex-start;background:#0f172a66}
.alert-row.silenced{opacity:.75;background:#33415544}
.a-sev{font-weight:700;min-width:40px;text-align:center;font-size:10px;padding:2px 4px;border-radius:2px;flex-shrink:0}
.a-body{flex:1;min-width:0}
.a-line{display:flex;gap:6px;align-items:center;margin-bottom:2px;flex-wrap:wrap}
.a-time{color:#94a3b8;font-size:10px}
.a-rule{color:#e2e8f0;font-weight:600}
.mute-tag{transform:scale(.9);transform-origin:left center}
.a-msg{color:#e2e8f0;word-break:break-all}
.a-suppressed{color:#94a3b8;font-size:10px;margin-top:2px}
.cfg-note{margin-top:8px;background:#0f172a;border:1px solid #334155;border-radius:4px;padding:6px 8px}
.cfg-note pre{white-space:pre-wrap;word-break:break-all;color:#a7f3d0;font-size:10px;line-height:1.5;font-family:inherit;margin:0}
</style>
