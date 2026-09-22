/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { useLogStore } from '../store/log';
import { SEVERITY_COLORS } from '@/utils/severity';
const emit = defineEmits();
const store = useLogStore();
const visible = ref(false);
const saving = ref(false);
const scope = ref('subsequent');
const errors = ref([]);
const warnings = ref([]);
const note = ref('');
const form = reactive({
    grades: [],
    silences: [],
});
function colorOf(level) {
    return SEVERITY_COLORS[level] || SEVERITY_COLORS.low;
}
function cloneConfig(cfg) {
    return {
        grades: cfg.grades.map(g => ({ ...g })),
        silences: cfg.silences.map(s => ({ ...s })),
    };
}
function onOpen() {
    const fresh = cloneConfig(store.alertConfig);
    form.grades = fresh.grades;
    form.silences = fresh.silences;
    errors.value = [];
    warnings.value = [];
    note.value = '';
}
function addSilence() {
    const s = { start: '00:00:00', end: '00:30:00', scope: '' };
    form.silences.push(s);
}
async function onSave() {
    saving.value = true;
    errors.value = [];
    warnings.value = [];
    try {
        const data = await store.saveAlertConfig({ grades: form.grades.map(g => ({ ...g })), silences: form.silences.map(s => ({ ...s })) }, scope.value);
        warnings.value = data.warnings || [];
        note.value = data.note || '';
        ElMessage.success(scope.value === 'backfill' ? '配置已保存并回填已有条目' : '配置已保存，只影响后续告警');
        emit('saved');
        // 回填时弹窗保留，方便查看说明；只影响后续时直接关闭
        if (scope.value === 'subsequent')
            visible.value = false;
    }
    catch (body) {
        errors.value = body?.errors || [{ field: '-', message: body?.note || '配置校验未通过，未保存。' }];
        warnings.value = body?.warnings || [];
        note.value = body?.note || '';
        ElMessage.error('配置校验未通过，未保存，请查看不合格项');
    }
    finally {
        saving.value = false;
    }
}
const __VLS_exposed = { open: () => { visible.value = true; } };
defineExpose(__VLS_exposed);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['err-box']} */ ;
/** @type {__VLS_StyleScopedClasses['err-box']} */ ;
/** @type {__VLS_StyleScopedClasses['warn-box']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onOpen': {} },
    modelValue: (__VLS_ctx.visible),
    title: "⚙ 告警分级与静默时段配置",
    width: "760px",
    closeOnClickModal: (false),
    appendToBody: true,
}));
const __VLS_2 = __VLS_1({
    ...{ 'onOpen': {} },
    modelValue: (__VLS_ctx.visible),
    title: "⚙ 告警分级与静默时段配置",
    width: "760px",
    closeOnClickModal: (false),
    appendToBody: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onOpen: (__VLS_ctx.onOpen)
};
var __VLS_8 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cfg-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sec-title" },
});
const __VLS_9 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    data: (__VLS_ctx.form.grades),
    size: "small",
    border: true,
}));
const __VLS_11 = __VLS_10({
    data: (__VLS_ctx.form.grades),
    size: "small",
    border: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
__VLS_12.slots.default;
const __VLS_13 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent(__VLS_13, new __VLS_13({
    label: "档位（由高到低）",
    width: "200",
}));
const __VLS_15 = __VLS_14({
    label: "档位（由高到低）",
    width: "200",
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
__VLS_16.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_16.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "lv-badge" },
        ...{ style: ({ background: __VLS_ctx.colorOf(row.level) }) },
    });
    (row.level);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "lv-name" },
    });
    (row.label);
}
var __VLS_16;
const __VLS_17 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
    label: "显示名称",
    width: "150",
}));
const __VLS_19 = __VLS_18({
    label: "显示名称",
    width: "150",
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
__VLS_20.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_20.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_21 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_22 = __VLS_asFunctionalComponent(__VLS_21, new __VLS_21({
        modelValue: (row.label),
        size: "small",
        placeholder: "如：紧急",
    }));
    const __VLS_23 = __VLS_22({
        modelValue: (row.label),
        size: "small",
        placeholder: "如：紧急",
    }, ...__VLS_functionalComponentArgsRest(__VLS_22));
}
var __VLS_20;
const __VLS_25 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25({
    label: "分数下限（0~10，需严格递减）",
}));
const __VLS_27 = __VLS_26({
    label: "分数下限（0~10，需严格递减）",
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
__VLS_28.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_28.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_29 = {}.ElInputNumber;
    /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
        modelValue: (row.min),
        min: (0),
        max: (10),
        step: (0.5),
        precision: (2),
        size: "small",
        ...{ style: {} },
    }));
    const __VLS_31 = __VLS_30({
        modelValue: (row.min),
        min: (0),
        max: (10),
        step: (0.5),
        precision: (2),
        size: "small",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_30));
}
var __VLS_28;
var __VLS_12;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sec-title-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "sec-title" },
});
const __VLS_33 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_35 = __VLS_34({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
let __VLS_37;
let __VLS_38;
let __VLS_39;
const __VLS_40 = {
    onClick: (__VLS_ctx.addSilence)
};
__VLS_36.slots.default;
var __VLS_36;
const __VLS_41 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    data: (__VLS_ctx.form.silences),
    size: "small",
    border: true,
    emptyText: ('暂无静默时段，点击右上角新增'),
}));
const __VLS_43 = __VLS_42({
    data: (__VLS_ctx.form.silences),
    size: "small",
    border: true,
    emptyText: ('暂无静默时段，点击右上角新增'),
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
__VLS_44.slots.default;
const __VLS_45 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
    label: "#",
    width: "46",
    type: "index",
}));
const __VLS_47 = __VLS_46({
    label: "#",
    width: "46",
    type: "index",
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
const __VLS_49 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
    label: "开始",
    width: "190",
}));
const __VLS_51 = __VLS_50({
    label: "开始",
    width: "190",
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
__VLS_52.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_52.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_53 = {}.ElTimePicker;
    /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
    // @ts-ignore
    const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
        modelValue: (row.start),
        format: "HH:mm:ss",
        valueFormat: "HH:mm:ss",
        placeholder: "开始时间",
        size: "small",
        ...{ style: {} },
        clearable: (false),
    }));
    const __VLS_55 = __VLS_54({
        modelValue: (row.start),
        format: "HH:mm:ss",
        valueFormat: "HH:mm:ss",
        placeholder: "开始时间",
        size: "small",
        ...{ style: {} },
        clearable: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_54));
}
var __VLS_52;
const __VLS_57 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_58 = __VLS_asFunctionalComponent(__VLS_57, new __VLS_57({
    label: "结束",
    width: "190",
}));
const __VLS_59 = __VLS_58({
    label: "结束",
    width: "190",
}, ...__VLS_functionalComponentArgsRest(__VLS_58));
__VLS_60.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_60.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_61 = {}.ElTimePicker;
    /** @type {[typeof __VLS_components.ElTimePicker, typeof __VLS_components.elTimePicker, ]} */ ;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
        modelValue: (row.end),
        format: "HH:mm:ss",
        valueFormat: "HH:mm:ss",
        placeholder: "结束时间",
        size: "small",
        ...{ style: {} },
        clearable: (false),
    }));
    const __VLS_63 = __VLS_62({
        modelValue: (row.end),
        format: "HH:mm:ss",
        valueFormat: "HH:mm:ss",
        placeholder: "结束时间",
        size: "small",
        ...{ style: {} },
        clearable: (false),
    }, ...__VLS_functionalComponentArgsRest(__VLS_62));
}
var __VLS_60;
const __VLS_65 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_66 = __VLS_asFunctionalComponent(__VLS_65, new __VLS_65({
    label: "作用范围（留空=全部规则）",
}));
const __VLS_67 = __VLS_66({
    label: "作用范围（留空=全部规则）",
}, ...__VLS_functionalComponentArgsRest(__VLS_66));
__VLS_68.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_68.slots;
    const [{ row }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_69 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
        modelValue: (row.scope),
        size: "small",
        placeholder: "如：高频ERROR；留空表示全部",
    }));
    const __VLS_71 = __VLS_70({
        modelValue: (row.scope),
        size: "small",
        placeholder: "如：高频ERROR；留空表示全部",
    }, ...__VLS_functionalComponentArgsRest(__VLS_70));
}
var __VLS_68;
const __VLS_73 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
    label: "操作",
    width: "64",
}));
const __VLS_75 = __VLS_74({
    label: "操作",
    width: "64",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
__VLS_76.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_76.slots;
    const [{ $index }] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_77 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_78 = __VLS_asFunctionalComponent(__VLS_77, new __VLS_77({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
        size: "small",
    }));
    const __VLS_79 = __VLS_78({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_78));
    let __VLS_81;
    let __VLS_82;
    let __VLS_83;
    const __VLS_84 = {
        onClick: (...[$event]) => {
            __VLS_ctx.form.silences.splice($index, 1);
        }
    };
    __VLS_80.slots.default;
    var __VLS_80;
}
var __VLS_76;
var __VLS_44;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sec-title" },
});
const __VLS_85 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
    modelValue: (__VLS_ctx.scope),
}));
const __VLS_87 = __VLS_86({
    modelValue: (__VLS_ctx.scope),
}, ...__VLS_functionalComponentArgsRest(__VLS_86));
__VLS_88.slots.default;
const __VLS_89 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
    value: "subsequent",
}));
const __VLS_91 = __VLS_90({
    value: "subsequent",
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
__VLS_92.slots.default;
var __VLS_92;
const __VLS_93 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_94 = __VLS_asFunctionalComponent(__VLS_93, new __VLS_93({
    value: "backfill",
}));
const __VLS_95 = __VLS_94({
    value: "backfill",
}, ...__VLS_functionalComponentArgsRest(__VLS_94));
__VLS_96.slots.default;
var __VLS_96;
var __VLS_88;
if (__VLS_ctx.errors.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "err-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sec-title err-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
    for (const [e, i] of __VLS_getVForSourceType((__VLS_ctx.errors))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: (i),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (e.field);
        (e.message);
        if (e.value !== undefined && e.value !== null && e.value !== '') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "err-val" },
            });
            (String(e.value));
        }
    }
}
if (__VLS_ctx.warnings.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "warn-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sec-title warn-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
    for (const [w, i] of __VLS_getVForSourceType((__VLS_ctx.warnings))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: (i),
        });
        (w.field);
        (w.message);
    }
}
if (__VLS_ctx.note) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "note-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sec-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
        ...{ class: "note-text" },
    });
    (__VLS_ctx.note);
}
{
    const { footer: __VLS_thisSlot } = __VLS_3.slots;
    const __VLS_97 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
        ...{ 'onClick': {} },
    }));
    const __VLS_99 = __VLS_98({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_98));
    let __VLS_101;
    let __VLS_102;
    let __VLS_103;
    const __VLS_104 = {
        onClick: (...[$event]) => {
            __VLS_ctx.visible = false;
        }
    };
    __VLS_100.slots.default;
    var __VLS_100;
    const __VLS_105 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_106 = __VLS_asFunctionalComponent(__VLS_105, new __VLS_105({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_107 = __VLS_106({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_106));
    let __VLS_109;
    let __VLS_110;
    let __VLS_111;
    const __VLS_112 = {
        onClick: (__VLS_ctx.onSave)
    };
    __VLS_108.slots.default;
    var __VLS_108;
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['cfg-body']} */ ;
/** @type {__VLS_StyleScopedClasses['sec-title']} */ ;
/** @type {__VLS_StyleScopedClasses['lv-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['lv-name']} */ ;
/** @type {__VLS_StyleScopedClasses['sec-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sec-title']} */ ;
/** @type {__VLS_StyleScopedClasses['sec-title']} */ ;
/** @type {__VLS_StyleScopedClasses['err-box']} */ ;
/** @type {__VLS_StyleScopedClasses['sec-title']} */ ;
/** @type {__VLS_StyleScopedClasses['err-title']} */ ;
/** @type {__VLS_StyleScopedClasses['err-val']} */ ;
/** @type {__VLS_StyleScopedClasses['warn-box']} */ ;
/** @type {__VLS_StyleScopedClasses['sec-title']} */ ;
/** @type {__VLS_StyleScopedClasses['warn-title']} */ ;
/** @type {__VLS_StyleScopedClasses['note-box']} */ ;
/** @type {__VLS_StyleScopedClasses['sec-title']} */ ;
/** @type {__VLS_StyleScopedClasses['note-text']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            visible: visible,
            saving: saving,
            scope: scope,
            errors: errors,
            warnings: warnings,
            note: note,
            form: form,
            colorOf: colorOf,
            onOpen: onOpen,
            addSilence: addSilence,
            onSave: onSave,
        };
    },
    __typeEmits: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            ...__VLS_exposed,
        };
    },
    __typeEmits: {},
});
; /* PartiallyEnd: #4569/main.vue */
