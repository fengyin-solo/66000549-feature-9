<template>
  <el-dialog
    v-model="visible"
    title="⚙ 告警分级与静默时段配置"
    width="760px"
    :close-on-click-modal="false"
    append-to-body
    @open="onOpen"
  >
    <div class="cfg-body">
      <!-- 分级标准 -->
      <section>
        <div class="sec-title">① 严重级别分级标准（所有告警按同一套标准重新分档）</div>
        <el-table :data="form.grades" size="small" border>
          <el-table-column label="档位（由高到低）" width="200">
            <template #default="{ row }">
              <span class="lv-badge" :style="{ background: colorOf(row.level) }">{{ row.level }}</span>
              <span class="lv-name">/ {{ row.label }}</span>
            </template>
          </el-table-column>
          <el-table-column label="显示名称" width="150">
            <template #default="{ row }">
              <el-input v-model="row.label" size="small" placeholder="如：紧急"/>
            </template>
          </el-table-column>
          <el-table-column label="分数下限（0~10，需严格递减）">
            <template #default="{ row }">
              <el-input-number v-model="row.min" :min="0" :max="10" :step="0.5" :precision="2" size="small" style="width:100%"/>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <!-- 静默时段 -->
      <section>
        <div class="sec-title-row">
          <span class="sec-title">② 静默时段（时段内同类告警只保留第一次并标出“静默中”，结束后恢复展示）</span>
          <el-button size="small" @click="addSilence">+ 新增时段</el-button>
        </div>
        <el-table :data="form.silences" size="small" border :empty-text="'暂无静默时段，点击右上角新增'">
          <el-table-column label="#" width="46" type="index"/>
          <el-table-column label="开始" width="190">
            <template #default="{ row }">
              <el-time-picker
                v-model="row.start"
                format="HH:mm:ss"
                value-format="HH:mm:ss"
                placeholder="开始时间"
                size="small"
                style="width:100%"
                :clearable="false"
              />
            </template>
          </el-table-column>
          <el-table-column label="结束" width="190">
            <template #default="{ row }">
              <el-time-picker
                v-model="row.end"
                format="HH:mm:ss"
                value-format="HH:mm:ss"
                placeholder="结束时间"
                size="small"
                style="width:100%"
                :clearable="false"
              />
            </template>
          </el-table-column>
          <el-table-column label="作用范围（留空=全部规则）">
            <template #default="{ row }">
              <el-input v-model="row.scope" size="small" placeholder="如：高频ERROR；留空表示全部"/>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="64">
            <template #default="{ $index }">
              <el-button link type="danger" size="small" @click="form.silences.splice($index,1)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <!-- 作用范围 -->
      <section>
        <div class="sec-title">③ 生效范围</div>
        <el-radio-group v-model="scope">
          <el-radio value="subsequent">只影响后续告警（已有条目保持原分档）</el-radio>
          <el-radio value="backfill">同时回填已有条目（列表与各图表面板一并重新分档）</el-radio>
        </el-radio-group>
      </section>

      <!-- 校验不合格项 -->
      <section v-if="errors.length" class="err-box">
        <div class="sec-title err-title">✋ 保存被拒绝，以下项不合格：</div>
        <ul>
          <li v-for="(e, i) in errors" :key="i">
            <code>[{{ e.field }}]</code> {{ e.message }}
            <span v-if="e.value !== undefined && e.value !== null && e.value !== ''" class="err-val">当前值：{{ String(e.value) }}</span>
          </li>
        </ul>
      </section>
      <section v-if="warnings.length" class="warn-box">
        <div class="sec-title warn-title">⚠ 提示：</div>
        <ul>
          <li v-for="(w, i) in warnings" :key="i">[{{ w.field }}] {{ w.message }}</li>
        </ul>
      </section>

      <!-- 说明（含严重级别校验结果） -->
      <section v-if="note" class="note-box">
        <div class="sec-title">📝 说明</div>
        <pre class="note-text">{{ note }}</pre>
      </section>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存配置</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useLogStore } from '../store/log'
import type { ConfigScope } from '../store/log'
import type { AlertConfig, ConfigFieldError, SilenceDef } from '@/types'
import { SEVERITY_COLORS } from '@/utils/severity'

const emit = defineEmits<{ (e: 'saved'): void }>()
const store = useLogStore()

const visible = ref(false)
const saving = ref(false)
const scope = ref<ConfigScope>('subsequent')
const errors = ref<ConfigFieldError[]>([])
const warnings = ref<ConfigFieldError[]>([])
const note = ref('')

const form = reactive<AlertConfig>({
  grades: [],
  silences: [],
})

function colorOf(level: string) {
  return SEVERITY_COLORS[level] || SEVERITY_COLORS.low
}

function cloneConfig(cfg: AlertConfig): AlertConfig {
  return {
    grades: cfg.grades.map(g => ({ ...g })),
    silences: cfg.silences.map(s => ({ ...s })),
  }
}

function onOpen() {
  const fresh = cloneConfig(store.alertConfig)
  form.grades = fresh.grades
  form.silences = fresh.silences
  errors.value = []
  warnings.value = []
  note.value = ''
}

function addSilence() {
  const s: SilenceDef = { start: '00:00:00', end: '00:30:00', scope: '' }
  form.silences.push(s)
}

async function onSave() {
  saving.value = true
  errors.value = []
  warnings.value = []
  try {
    const data = await store.saveAlertConfig(
      { grades: form.grades.map(g => ({ ...g })), silences: form.silences.map(s => ({ ...s })) },
      scope.value,
    )
    warnings.value = data.warnings || []
    note.value = data.note || ''
    ElMessage.success(scope.value === 'backfill' ? '配置已保存并回填已有条目' : '配置已保存，只影响后续告警')
    emit('saved')
    // 回填时弹窗保留，方便查看说明；只影响后续时直接关闭
    if (scope.value === 'subsequent') visible.value = false
  } catch (body: any) {
    errors.value = body?.errors || [{ field: '-', message: body?.note || '配置校验未通过，未保存。' }]
    warnings.value = body?.warnings || []
    note.value = body?.note || ''
    ElMessage.error('配置校验未通过，未保存，请查看不合格项')
  } finally {
    saving.value = false
  }
}

defineExpose({ open: () => { visible.value = true } })
</script>

<style scoped>
.cfg-body section { margin-bottom: 14px }
.sec-title { font-size: 13px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px }
.sec-title-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px }
.lv-badge { display:inline-block; padding:1px 8px; border-radius:3px; color:#0f172a; font-weight:700; font-size:11px }
.lv-name { margin-left:6px; color:#94a3b8; font-size:12px }
.err-box { background:#450a0a33; border:1px solid #991b1b; border-radius:6px; padding:10px }
.err-title { color:#fca5a5 }
.err-box ul { margin:4px 0 0 18px; color:#fecaca; font-size:12px; line-height:1.7 }
.err-box code { color:#fde68a; background:#1e293b; padding:0 4px; border-radius:2px }
.err-val { color:#f87171; margin-left:6px }
.warn-box { background:#78350f33; border:1px solid #b45309; border-radius:6px; padding:10px }
.warn-title { color:#fcd34d }
.warn-box ul { margin:4px 0 0 18px; color:#fde68a; font-size:12px; line-height:1.7 }
.note-box { background:#1e293b; border:1px solid #334155; border-radius:6px; padding:10px }
.note-text { white-space:pre-wrap; word-break:break-all; color:#a7f3d0; font-size:12px; font-family:inherit; line-height:1.6; margin:0 }
</style>
