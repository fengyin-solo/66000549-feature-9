<template>
  <div class="panel">
    <div class="panel-head">
      <h4>🚨 告警列表</h4>
      <el-button size="small" text type="primary" @click="configOpen = true">⚙️ 分级与静默配置</el-button>
    </div>

    <!-- 当前分级标准 + 分档统计：与各图表共用同一份处理结果 -->
    <div class="tier-bar">
      <span v-for="t in orderedTiers" :key="t.key" class="tier-chip" :style="{ borderColor: colorOf(t.key) }">
        <i class="dot" :style="{ background: colorOf(t.key) }"/>
        {{ t.label || t.key }}≥{{ t.min }}
        <b :style="{ color: colorOf(t.key) }">{{ counts[t.key] || 0 }}</b>
      </span>
      <span v-if="silencedCount" class="silenced-chip">🤫 静默中 {{ silencedCount }}</span>
      <span v-if="suppressedCount" class="suppressed-chip" @click="showSuppressed = !showSuppressed">
        {{ showSuppressed ? '▾' : '▸' }} 静默期重复 {{ suppressedCount }}
      </span>
      <span v-if="store.futureConfig" class="pending-chip">⏳ 新配置将在下次生成/检测后生效</span>
    </div>

    <div v-if="!shownAlerts.length" class="empty">暂无告警</div>
    <div v-for="a in shownAlerts" :key="a.id" class="alert-row" :class="[a.severity, { silenced: a.silenced }]">
      <span class="a-sev" :class="a.severity" :style="{ background: colorOf(a.severity) }">
        {{ tierText(a.severity) }}
      </span>
      <div class="a-body">
        <div class="a-line">
          <span class="a-time">{{ a.timestamp }}</span>
          <span class="a-rule">{{ a.ruleName }}</span>
          <span class="a-score">score={{ a.score }}</span>
          <el-tag v-if="a.silenced" size="small" type="info" effect="dark" class="sil-tag">
            🤫 静默中<span v-if="a.silenceRule">·{{ a.silenceRule }}</span>
          </el-tag>
        </div>
        <div class="a-msg">{{ a.message }}</div>
      </div>
    </div>

    <!-- 校验/保存说明：含严重级别校验结果 -->
    <div v-if="store.lastNote" class="note" :class="store.lastNote.valid ? 'ok' : 'bad'">
      <div class="note-title">
        📝 {{ store.lastNote.time }} · {{ store.lastNote.scope === 'backfill' ? '回填已有条目' : '只影响后续告警' }}：
        <span :class="store.lastNote.valid ? 'ok-text' : 'bad-text'">
          {{ store.lastNote.valid ? '校验通过并已保存' : '校验未通过、未保存' }}
        </span>
      </div>
      <div class="note-summary">{{ store.lastNote.summary }}</div>
      <ul v-if="store.lastNote.errors.length" class="note-errors">
        <li v-for="(e, i) in store.lastNote.errors" :key="i">⛔ {{ e }}</li>
      </ul>
    </div>

    <AlertConfigDialog v-model="configOpen"/>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLogStore } from '../store/log'
import { visibleAlerts, severityColor, tierLabel } from '../lib/alerts'
import type { SeverityKey } from '../types'
import AlertConfigDialog from './AlertConfigDialog.vue'

const store = useLogStore()
const configOpen = ref(false)
const showSuppressed = ref(false)

// 列表与图表共用 store.alerts（同一套重新分档 + 静默结果）
const shownAlerts = computed(() => {
  const all = store.alerts
  return showSuppressed.value ? all.slice(0, 50) : visibleAlerts(all).slice(0, 8)
})

const orderedTiers = computed(() =>
  [...store.viewConfig.tiers].sort((a, b) => b.min - a.min))

const counts = computed<Record<string, number>>(() => {
  const c: Record<string, number> = {}
  for (const a of visibleAlerts(store.alerts)) c[a.severity] = (c[a.severity] || 0) + 1
  return c
})

const silencedCount = computed(() => store.alerts.filter(a => a.silenced).length)
const suppressedCount = computed(() => store.alerts.filter(a => a.suppressed).length)

function colorOf(key: string) { return severityColor(key) }
function tierText(key: string) { return tierLabel(key as SeverityKey, store.viewConfig.tiers) }
</script>

<style scoped>
.panel{background:#1e293b;border-radius:8px;padding:12px;border:1px solid #334155;margin-top:12px}
.panel-head{display:flex;justify-content:space-between;align-items:center}
.panel-head h4{color:#f87171;font-size:13px}
.tier-bar{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px}
.tier-chip{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#cbd5e1;border:1px solid;border-radius:10px;padding:1px 7px;background:#0f172a66}
.tier-chip b{font-size:11px}
.dot{width:7px;height:7px;border-radius:50%;display:inline-block}
.silenced-chip{font-size:10px;color:#94a3b8;background:#33415588;border-radius:10px;padding:1px 7px}
.suppressed-chip{font-size:10px;color:#64748b;cursor:pointer;text-decoration:underline dotted;border-radius:10px;padding:1px 4px}
.pending-chip{font-size:10px;color:#fbbf24;background:#78350f55;border-radius:10px;padding:1px 7px}
.empty{color:#64748b;font-size:12px}
.alert-row{display:flex;gap:8px;padding:5px 6px;margin:2px 0;border-radius:4px;font-size:11px;align-items:flex-start;background:#7f1d1d22}
.alert-row.critical{background:#7f1d1d44}
.alert-row.high{background:#7f1d1d2b}
.alert-row.medium{background:#78350f33}
.alert-row.low{background:#0c4a6e33}
.alert-row.silenced{opacity:.62}
.a-sev{font-weight:700;min-width:34px;text-align:center;font-size:10px;padding:2px 4px;border-radius:2px;color:#fff;flex-shrink:0}
.a-body{min-width:0;flex:1}
.a-line{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.a-time{color:#94a3b8;font-size:10px}
.a-rule{color:#e2e8f0;font-weight:600}
.a-score{color:#64748b;font-size:10px}
.sil-tag{transform:scale(.9);transform-origin:left center}
.a-msg{color:#cbd5e1;font-size:10.5px;margin-top:1px;word-break:break-all}
.note{margin-top:8px;border-radius:6px;padding:6px 8px;font-size:10.5px;line-height:1.5}
.note.ok{background:#052e1655;border:1px solid #14532d}
.note.bad{background:#450a0a55;border:1px solid #7f1d1d}
.note-title{font-weight:600;color:#e2e8f0}
.note-summary{color:#94a3b8}
.note-errors{margin:3px 0 0 16px;color:#fca5a5}
.ok-text{color:#4ade80}.bad-text{color:#fca5a5}
</style>
