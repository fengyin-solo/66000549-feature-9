/**
 * 构造 ECharts markPoint：告警列表里的每条告警都成为一个分级着色的点，
 * 静默期首条用灰色菱形 + 🔇。所有图表调用同一函数，保证分档与列表一致。
 */
export function buildAlertMarkers(result, opts) {
    const alerts = result.alerts || [];
    const yOf = (wi) => (opts.yValues ? opts.yValues[wi] ?? 0 : 0);
    const data = alerts.map(a => {
        const wi = a.windowIndex ?? 0;
        return {
            coord: ['W' + wi, yOf(wi)],
            symbol: a.silenced ? 'diamond' : 'circle',
            symbolSize: a.silenced ? 13 : 9,
            itemStyle: {
                color: a.silenced ? '#64748b' : opts.gradeColor(a),
                borderColor: a.silenced ? '#cbd5e1' : '#0f172a',
                borderWidth: a.silenced ? 1.5 : 1,
            },
            label: a.silenced
                ? { show: true, formatter: '🔇', fontSize: 8, color: '#cbd5e1', position: 'top' }
                : { show: false },
            value: a.score,
            _alert: a,
        };
    });
    return {
        data,
        tooltip: {
            formatter: (p) => {
                const a = p?.data?._alert;
                if (!a)
                    return '';
                const lines = [
                    `W${a.windowIndex} · ${a.timestamp} · ${opts.gradeLabel(a)}（分数 ${a.score}）`,
                    `${a.ruleName}：${a.message}`,
                ];
                if (a.silenced) {
                    lines.push(`🔇 静默中 ${a.silenceRange || ''}`);
                    if (a.suppressedCount)
                        lines.push(`已折叠 ${a.suppressedCount} 条同类重复告警`);
                }
                return lines.join('<br/>');
            },
        },
    };
}
