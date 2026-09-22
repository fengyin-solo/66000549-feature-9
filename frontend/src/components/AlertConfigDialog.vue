<template>
  <el-dialog
    :model-value="modelValue"
    title="⚙️ 告警分级与静默配置"
    width="760px"
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <div class="cfg-body">
      <!-- ============ 分级标准 ============ -->
      <section class="cfg-section">
        <div class="sec-title">
          <span>🎚️ 严重级别分级标准（同一套标准作用于全部告警）</span>
          <span class="sec-hint">按统一评分 score 由高到低匹配：score ≥ 阈值即归入该档</span>
        </div>
        <el-table :data="form.tiers" size="small" border>
          <el-table-column label="档位 key" width="120">
            <template #default="{ row }">
              <el-select v-model="row.key" size="small" :class="{ 'field-err': tierKeyErr(row) }">
                <el-option v-for="k in SEVERITY_KEYS" :key="k" :label="k" :value="k"/>
              </el-select>
              <span class="inline-err" v-if="tierKeyErr(row)">{{ tierKeyErr(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="显示名称" width="130">
            <template #default="{ row }">
              <el-input v-model="row.label" size="small"/>
            </template>
          </el-table-column>
          <el-table-column label="最低分数阈值 (min)" min-width="200">
            <template #default="{ row }">
              <el-input-number
                v-model="row.min" size="small" :step="0.5" :min="-100" :max="100"
                :controls="false" style="width:100%"
                :class="{ 'field-err': tierMinErr(row) }"
              />
              <span class="inline-err" v-if="tierMinErr(row)">{{ tierMinErr(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="颜色" width="70">
            <template #default="{ row }">
              <span class="dot" :style="{ background: colorOf(row.key) }"/>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <!-- ============ 静默时段 ============ -->
      <section class="cfg-section">
        <div class="sec-title">
          <span>🤫 静默时段（期内同类告警仅保留第一次并标“静默中”）</span>
          <el-button size="small" text type="primary" @click="addSilence">+ 新增静默时段</el-button>
        </div>
        <el-table :data="form.silences" size="small" border>
          <el-table-column label="启用" width="55">
            <template #default="{ row }">
              <el-switch v-model="row.enabled"/>
            </template>
          </el-table-column>
          <el-table-column label="名称" width="150">
            <template #default="{ row }">
              <el-input v-model="row.name" size="small" placeholder="如：夜间维护"
                        :class="{ 'field-err': silErr(row, 'name') }"/>
              <span class="inline-err" v-if="silErr(row, 'name')">{{ silErr(row, 'name') }}</span>
            </template>
          </el-table-column>
          <el-table-column label="适用同类告警" min-width="170">
            <template #default="{ row }">
              <el-select v-model="row.target" size="small" style="width:100%"
                         :class="{ 'field-err': silErr(row, 'target') }">
                <el-option label="全部告警（按规则名各自去重）" value="__ALL__"/>
                <el-option v-for="name in ruleNames" :key="name" :label="name" :value="name"/>
              </el-select>
              <span class="inline-err" v-if="silErr(row, 'target')">{{ silErr(row, 'target') }}</span>
            </template>
          </el-table-column>
          <el-table-column label="开始" width="150">
            <template #default="{ row }">
              <el-time-picker v-model="row.startTime" size="small" format="HH:mm:ss" value-format="HH:mm:ss"
                              placeholder="HH:MM:SS" style="width:100%"
                              :class="{ 'field-err': silErr(row, 'start') }"/>
              <span class="inline-err" v-if="silErr(row, 'start')">{{ silErr(row, 'start') }}</span>
            </template>
          </el-table-column>
          <el-table-column label="结束" width="150">
            <template #default="{ row }">
              <el-time-picker v-model="row.endTime" size="small" format="HH:mm:ss" value-format="HH:mm:ss"
                              placeholder="HH:MM:SS" style="width:100%"
                              :class="{ 'field-err': silErr(row, 'end') }"/>
              <span class="inline-err" v-if="silErr(row, 'end')">{{ silErr(row, 'end') }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60">
            <template #default="{ $index }">
              <el-button size="small" text type="danger" @click="form.silences.splice($index,1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <!-- ============ 校验说明 ============ -->
      <section class="cfg-section note-section">
        <div class="sec-title"><span>📝 校验说明</span></div>
        <div v-if="liveErrors.length" class="note-box invalid">
          <div class="note-head">⛔ 存在 {{ liveErrors.length }} 项不合格，当前不允许保存：</div>
          <ul><li v-for="(e, i) in liveErrors" :key="i">{{ e }}</li></ul>
        </div>
        <div v-else class="note-box valid">
          <div class="note-head">✅ 实时校验通过，可以保存。</div>
          <div class="note-sub">
            当前标准：{{ tierSummary }}；启用静默 {{ enabledSilenceCount }} 条。
          </div>
        </div>
        <div v-if="store.lastNote" class="note-box history">
          <div class="note-head">
            上次保存（{{ store.lastNote.time }}）：
            <span :class="store.lastNote.valid ? 'ok-text' : 'bad-text'">
              {{ store.lastNote.valid ? '已保存' : '未保存' }}
            </span>
            · 作用范围：{{ store.lastNote.scope === 'backfill' ? '同时回填已有条目' : '只影响后续告警' }}
          </div>
          <div class="note-sub">{{ store.lastNote.summary }}</div>
          <ul v-if="store.lastNote.errors.length">
            <li v-for="(e, i) in store.lastNote.errors" :key="i">{{ e }}</li>
          </ul>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="dlg-footer">
        <div class="scope-group">
          <span class="scope-label">保存后：</span>
          <el-radio-group v-model="scope" size="small">
            <el-radio-button value="future">只影响后续告警</el-radio-button>
            <el-radio-button value="backfill">同时回填已有条目</el-radio-button>
          </el-radio-group>
        </div>
        <div>
          <el-button size="small" @click="emit('update:modelValue', false)">取消</el-button>
          <el-button size="small" type="primary" :loading="store.loading" :disabled="liveErrors.length > 0" @click="onSave">
            保存配置
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { AlertConfig, ApplyScope, SilenceRule, SeverityKey } from '@/types'
import { SEVERITY_KEYS, SEVERITY_COLORS, validateConfig } from '@/lib/alerts'
import { useLogStore } from '../store/log'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
const store = useLogStore()

let uidSeq = 1
function withUid<T extends Record<string, unknown>>(obj: T): T & { _uid: number } {
  return { ...obj, _uid: uidSeq++ }
}

type TierRow = { _uid: number; key: SeverityKey | string; label: string; min: number }
type SilenceRow = SilenceRule & { _uid: number }

const form = ref<{ tiers: TierRow[]; silences: SilenceRow[] }>({ tiers: [], silences: [] })
const scope = ref<ApplyScope>('backfill')

const ruleNames = computed(() => {
  const fromRules = store.rules.map(r => r.name)
  const fromAlerts = (store.result?.alerts ?? []).map(a => a.ruleName)
  return Array.from(new Set([...fromRules, ...fromAlerts, '高频ERROR', '异常流量', '统计异常检测']))
})

function resetForm() {
  uidSeq = 1
  form.value = {
    tiers: store.viewConfig.tiers.map(t => withUid({ ...t })),
    silences: store.viewConfig.silences.map(s => withUid({ ...s }))
  }
  scope.value = 'backfill'
}

// 每次打开对话框时用当前视图配置初始化
watch(() => props.modelValue, open => { if (open) resetForm() })

const liveErrors = computed(() => validateConfig(snapshot()))

function snapshot(): AlertConfig {
  return {
    tiers: form.value.tiers.map(t => ({ key: t.key as SeverityKey, label: t.label, min: Number(t.min) })),
    silences: form.value.silences.map(s => ({
      id: s.id, name: s.name, target: s.target,
      startTime: s.startTime ?? '', endTime: s.endTime ?? '', enabled: s.enabled
    }))
  }
}

function addSilence() {
  const nextId = form.value.silences.reduce((m, s) => Math.max(m, s.id), 0) + 1
  form.value.silences.push(withUid({
    id: nextId, name: '', target: '__ALL__',
    startTime: '02:00:00', endTime: '06:00:00', enabled: true
  }))
}

const enabledSilenceCount = computed(() => form.value.silences.filter(s => s.enabled).length)
const tierSummary = computed(() =>
  [...snapshot().tiers].sort((a, b) => b.min - a.min).map(t => `${t.label || t.key}≥${t.min}`).join('，'))

function colorOf(key: string) {
  return SEVERITY_COLORS[key as SeverityKey] ?? '#64748b'
}

// ---- 逐字段定位不合格项（严重级别 + 静默时段） ----
function tierKeyErr(row: TierRow): string {
  if (SEVERITY_KEYS.includes(row.key as SeverityKey)) {
    return liveErrors.value.find(e => e.includes(`'${row.key}' 档位重复`)) || ''
  }
  return liveErrors.value.find(e => e.includes(`'${row.key}' 不是合法档位`))
    || '严重级别填错，只允许 critical/high/medium/low'
}

function tierMinErr(row: TierRow): string {
  if (typeof row.min !== 'number' || Number.isNaN(row.min)) {
    return liveErrors.value.find(e => e.includes(`'${row.key}' 的阈值必须是数字`)) || '阈值必须是数字'
  }
  const key = row.key as SeverityKey
  return liveErrors.value.find(e =>
    e.includes(`'${key}' 的阈值(`) || (key === 'low' && e.includes('最低档 low 的阈值必须为 0'))) || ''
}

/** 返回某条静默规则指定字段上的不合格描述 */
function silErr(row: SilenceRow, field: 'name' | 'target' | 'start' | 'end'): string {
  const idx = form.value.silences.indexOf(row)
  const label = row.name || `第${idx + 1}条`
  const related = liveErrors.value.filter(e => e.startsWith(`静默时段'${label}'：`))
  for (const e of related) {
    if (field === 'name' && e.includes('名称不能为空')) return e
    if (field === 'target' && e.includes('适用的同类告警')) return e
    if (field === 'start' && (e.includes('起始时间格式') || e.includes('起止时间颠倒'))) return e
    if (field === 'end' && (e.includes('结束时间格式') || e.includes('起止时间颠倒'))) return e
  }
  return ''
}

async function onSave() {
  const { ok, errors } = await store.saveConfig(snapshot(), scope.value)
  if (ok) {
    ElMessage.success(scope.value === 'backfill' ? '配置已保存并回填全部告警' : '配置已保存，将作用于后续告警')
    emit('update:modelValue', false)
  } else {
    ElMessage.error(`配置校验未通过（${errors.length}项），未保存`)
  }
}
</script>

<style scoped>
.cfg-body{display:flex;flex-direction:column;gap:14px;max-height:62vh;overflow:auto;padding-right:4px}
.cfg-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px}
:global(.dark) .cfg-section{background:#1e293b;border-color:#334155}
.sec-title{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px}
:global(.dark) .sec-title{color:#e2e8f0}
.sec-hint{font-weight:400;font-size:11px;color:#64748b}
.dot{display:inline-block;width:14px;height:14px;border-radius:50%}
.field-err :deep(.el-input__wrapper),
.field-err:deep(.el-input__wrapper),
.field-err :deep(.el-select__wrapper),
.field-err:deep(.el-select__wrapper){box-shadow:0 0 0 1px #ef4444 inset !important;background:#fef2f2}
.inline-err{display:block;color:#dc2626;font-size:10px;line-height:1.3;margin-top:2px}
.note-box{border-radius:6px;padding:8px 10px;font-size:12px;line-height:1.5}
.note-box.invalid{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.note-box.valid{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}
.note-box.history{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;margin-top:8px}
.note-head{font-weight:600;margin-bottom:2px}
.note-sub{color:#475569}
.note-box ul{margin:4px 0 0 16px}
.note-box li{margin:1px 0}
.ok-text{color:#16a34a}.bad-text{color:#dc2626}
.dlg-footer{display:flex;justify-content:space-between;align-items:center}
.scope-label{font-size:12px;color:#64748b;margin-right:6px}
.scope-group{display:flex;align-items:center}
</style>
