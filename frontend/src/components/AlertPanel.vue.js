/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, ref } from 'vue';
import { useLogStore } from '../store/log';
import AlertConfigDialog from './AlertConfigDialog.vue';
import { LEVEL_ORDER, gradeLabel, severityColor } from '@/utils/severity';
const store = useLogStore();
const dlgRef = ref(null);
const alerts = computed(() => store.result?.alerts || []);
const stats = computed(() => store.result?.alertStats || {
    totalRaw: 0, kept: 0, suppressed: 0, silencedFirsts: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
});
const levelOrder = LEVEL_ORDER;
const colorOf = (lv) => severityColor(lv);
const labelOf = (lv) => store.alertConfig.grades.find(g => g.level === lv)?.label || gradeLabel({ severity: lv });
function openConfig() {
    dlgRef.value?.open();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-row']} */ ;
/** @type {__VLS_StyleScopedClasses['cfg-note']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    plain: true,
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    size: "small",
    type: "primary",
    plain: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.openConfig)
};
__VLS_3.slots.default;
var __VLS_3;
if (__VLS_ctx.alerts.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stats-row" },
    });
    for (const [lv] of __VLS_getVForSourceType((__VLS_ctx.levelOrder))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (lv),
            ...{ class: "stat-chip" },
            ...{ style: ({ borderColor: __VLS_ctx.colorOf(lv) }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "dot" },
            ...{ style: ({ background: __VLS_ctx.colorOf(lv) }) },
        });
        (__VLS_ctx.labelOf(lv));
        (__VLS_ctx.stats.bySeverity[lv] || 0);
    }
    if (__VLS_ctx.stats.silencedFirsts) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-chip silenced-chip" },
        });
        (__VLS_ctx.stats.silencedFirsts);
    }
    if (__VLS_ctx.stats.suppressed) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "stat-chip suppressed-chip" },
        });
        (__VLS_ctx.stats.suppressed);
    }
}
if (!__VLS_ctx.alerts.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty" },
    });
}
for (const [a] of __VLS_getVForSourceType((__VLS_ctx.alerts.slice(0, 8)))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (a.id),
        ...{ class: "alert-row" },
        ...{ class: ({ silenced: a.silenced }) },
        ...{ style: ({ borderLeft: `3px solid ${__VLS_ctx.colorOf(String(a.severity))}` }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "a-sev" },
        ...{ style: ({ color: __VLS_ctx.colorOf(String(a.severity)), background: __VLS_ctx.colorOf(String(a.severity)) + '22' }) },
    });
    (__VLS_ctx.gradeLabel(a));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "a-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "a-line" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "a-time" },
    });
    (a.timestamp);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "a-rule" },
    });
    (a.ruleName);
    if (a.silenced) {
        const __VLS_8 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            size: "small",
            type: "info",
            effect: "dark",
            ...{ class: "mute-tag" },
        }));
        const __VLS_10 = __VLS_9({
            size: "small",
            type: "info",
            effect: "dark",
            ...{ class: "mute-tag" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_11.slots.default;
        (a.silenceRange ? ' ' + a.silenceRange : '');
        var __VLS_11;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "a-msg" },
    });
    (a.message);
    if (a.suppressedCount) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "a-suppressed" },
        });
        (a.suppressedCount);
    }
}
if (__VLS_ctx.store.configNote) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cfg-note" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (__VLS_ctx.store.configNote);
}
/** @type {[typeof AlertConfigDialog, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(AlertConfigDialog, new AlertConfigDialog({
    ref: "dlgRef",
}));
const __VLS_13 = __VLS_12({
    ref: "dlgRef",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
/** @type {typeof __VLS_ctx.dlgRef} */ ;
var __VLS_15 = {};
var __VLS_14;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-row']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['silenced-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['suppressed-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['empty']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-row']} */ ;
/** @type {__VLS_StyleScopedClasses['a-sev']} */ ;
/** @type {__VLS_StyleScopedClasses['a-body']} */ ;
/** @type {__VLS_StyleScopedClasses['a-line']} */ ;
/** @type {__VLS_StyleScopedClasses['a-time']} */ ;
/** @type {__VLS_StyleScopedClasses['a-rule']} */ ;
/** @type {__VLS_StyleScopedClasses['mute-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['a-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['a-suppressed']} */ ;
/** @type {__VLS_StyleScopedClasses['cfg-note']} */ ;
// @ts-ignore
var __VLS_16 = __VLS_15;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AlertConfigDialog: AlertConfigDialog,
            gradeLabel: gradeLabel,
            store: store,
            dlgRef: dlgRef,
            alerts: alerts,
            stats: stats,
            levelOrder: levelOrder,
            colorOf: colorOf,
            labelOf: labelOf,
            openConfig: openConfig,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
