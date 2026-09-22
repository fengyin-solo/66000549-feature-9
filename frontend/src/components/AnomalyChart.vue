<template>
  <div class="panel"><h4>📈 异常分数与分级标准 (3-sigma + IQR)</h4><div ref="chart" class="chart"></div></div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useLogStore } from '../store/log'
import { visibleAlerts, severityColor } from '../lib/alerts'
import type { Alert, SeverityKey } from '../types'
const store = useLogStore(); const chart = ref<HTMLDivElement>(); let inst: echarts.ECharts|null=null

/** 异常窗口上的告警点：颜色=按统一标准重新分档后的严重级别；静默中的点降透明度描边 */
function alertPoints(predicate: (a: Alert) => boolean) {
  return visibleAlerts(store.alerts)
    .filter(a => a.ruleName === '统计异常检测' && predicate(a))
    .map(a => ({
      value: [a.windowIndex, a.score],
      itemStyle: {
        color: severityColor(a.severity),
        opacity: a.silenced ? 0.45 : 1,
        borderColor: a.silenced ? '#e2e8f0' : 'transparent',
        borderWidth: a.silenced ? 1 : 0
      },
      label: a.silenced ? { show: true, formatter: '🤫', fontSize: 9, offset: [0, -10] } : undefined
    }))
}

function update() {
  if (!inst||!store.result) return
  const anoms = store.result.anomalies
  // 分级边界（low 的 0 不画线）
  const boundaries = [...store.viewConfig.tiers]
    .filter(t => t.min > 0)
    .sort((a, b) => b.min - a.min)
  const markLines = boundaries.map(t => ({
    yAxis: t.min,
    lineStyle: { color: severityColor(t.key as SeverityKey), type: 'dashed' as const, width: 1, opacity: .6 },
    label: { formatter: `${t.label || t.key} ${t.min}`, color: severityColor(t.key as SeverityKey), fontSize: 9, position: 'insideEndTop' }
  }))
  inst.setOption({
    backgroundColor:'transparent',grid:{left:40,right:15,top:24,bottom:25},
    tooltip:{trigger:'item',formatter:(p:any)=>p.seriesName==='告警'?`窗口W${p.value[0]}<br/>score=${p.value[1]}`:p.value},
    xAxis:{type:'category',data:anoms.map(a=>'W'+a.windowIndex),axisLabel:{color:'#94a3b8',fontSize:9}},
    yAxis:{type:'value',axisLabel:{color:'#94a3b8'},name:'统一分数',nameTextStyle:{color:'#64748b',fontSize:9}},
    series:[
      {type:'line',data:anoms.map(a=>a.sigmaScore),name:'3-sigma',itemStyle:{color:'#f97316'},lineStyle:{width:1.5},
       markLine:{silent:true,symbol:'none',data:markLines}},
      {type:'line',data:anoms.map(a=>a.iqrScore),name:'IQR',itemStyle:{color:'#a78bfa'},lineStyle:{width:1.5}},
      // 与告警列表同一套分档的告警点
      {type:'scatter',name:'告警',symbolSize:9,z:5,data:alertPoints(()=>true)}
    ],animation:false,legend:{right:0,textStyle:{color:'#94a3b8',fontSize:10}}
  },{replaceMerge:['series']})
}
onMounted(()=>{if(chart.value){inst=echarts.init(chart.value);update()}})
watch(()=>[store.result, store.alerts, store.viewConfig],update,{deep:false})
onUnmounted(()=>inst?.dispose())
</script>
<style scoped>.panel{background:#1e293b;border-radius:8px;padding:12px;border:1px solid #334155}.panel h4{color:#38bdf8;font-size:13px;margin-bottom:4px}.chart{width:100%;height:220px}</style>
