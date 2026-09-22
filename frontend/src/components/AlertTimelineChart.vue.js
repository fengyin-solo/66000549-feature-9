/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { useLogStore } from '../store/log';
import { LEVEL_ORDER, gradeLabel, severityColor } from '@/utils/severity';
const store = useLogStore();
const chart = ref();
let inst = null;
function update() {
    if (!inst)
        return;
    const alerts = store.result?.alerts || [];
    const labels = store.alertConfig.grades.reduce((m, g) => { m[g.level] = g.label; return m; }, {});
    // 每个分档一条散点序列；静默期首条单独再叠一层标记
    const series = LEVEL_ORDER.map(lv => ({
        name: labels[lv] || gradeLabel({ severity: lv }),
        type: 'scatter',
        symbolSize: (d) => d[2] ? 10 : 14,
        itemStyle: {
            color: severityColor(lv),
            opacity: 0.9,
            borderColor: '#0f172a',
            borderWidth: 1,
        },
        data: alerts
            .filter(a => String(a.severity) === lv && !a.silenced)
            .map(a => [a.windowIndex ?? 0, a.score ?? 0, false, a]),
    }));
    const silenced = alerts.filter(a => a.silenced);
    series.push({
        name: '🔇 静默中（重复已折叠）',
        type: 'scatter',
        symbol: 'diamond',
        symbolSize: 15,
        itemStyle: { color: '#64748b', borderColor: '#cbd5e1', borderWidth: 1.5 },
        label: { show: true, formatter: '🔇', fontSize: 9, position: 'top', color: '#cbd5e1' },
        data: silenced.map(a => [a.windowIndex ?? 0, a.score ?? 0, true, a]),
    });
    inst.setOption({
        backgroundColor: 'transparent',
        grid: { left: 40, right: 15, top: 28, bottom: 25 },
        tooltip: {
            trigger: 'item',
            formatter: (p) => {
                const a = p.data[3];
                const lines = [
                    `窗口 W${a.windowIndex} · ${a.timestamp}`,
                    `${gradeLabel(a)}（分数 ${a.score}）· ${a.ruleName}`,
                    `${a.message}`,
                ];
                if (a.silenced) {
                    lines.push(`🔇 静默中 ${a.silenceRange || ''}`);
                    if (a.suppressedCount)
                        lines.push(`已折叠静默期内 ${a.suppressedCount} 条同类重复告警`);
                }
                return lines.join('<br/>');
            },
        },
        legend: { top: 0, textStyle: { color: '#94a3b8', fontSize: 9 }, itemWidth: 10, itemHeight: 8 },
        xAxis: {
            type: 'value', name: '窗口', minInterval: 1,
            nameTextStyle: { color: '#94a3b8', fontSize: 9 },
            axisLabel: { color: '#94a3b8', fontSize: 9, formatter: (v) => 'W' + v },
            splitLine: { lineStyle: { color: '#33415555' } },
        },
        yAxis: {
            type: 'value', min: 0, max: 10,
            axisLabel: { color: '#94a3b8', fontSize: 9 },
            splitLine: { lineStyle: { color: '#33415555' } },
        },
        series,
        animation: false,
    }, true);
}
onMounted(() => { if (chart.value) {
    inst = echarts.init(chart.value);
    update();
} });
watch(() => [store.result, store.alertConfig], update, { deep: true });
onUnmounted(() => inst?.dispose());
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "chart",
    ...{ class: "chart" },
});
/** @type {typeof __VLS_ctx.chart} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['chart']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            chart: chart,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
