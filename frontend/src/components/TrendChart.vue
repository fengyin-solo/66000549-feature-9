<template>
  <div class="panel"><h4>📉 窗口日志量趋势 & 告警分档</h4><div ref="chart" class="chart"></div></div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useLogStore } from '../store/log'
import { visibleAlerts, severityColor } from '../lib/alerts'
import type { Alert, SeverityKey } from '../types'
const store = useLogStore(); const chart = ref<HTMLDivElement>(); let inst: echarts.ECharts|null=null

function pointsBySeverity(severity: SeverityKey) {
  return visibleAlerts(store.alerts)
    .filter(a => a.severity === severity)
    .map(a => ({
      value: [a.windowIndex, a.score],
      itemStyle: {
        color: severityColor(severity),
        opacity: a.silenced ? 0.4 : 1,
        borderColor: a.silenced ? '#e2e8f0' : 'transparent', borderWidth: 1
      },
      silenced: a.silenced, rule: a.ruleName, msg: a.message, ts: a.timestamp
    }))
}

function update() {
  if (!inst||!store.result) return
  const ws = store.result.windows
  const tiers = [...store.viewConfig.tiers].sort((a,b)=>b.min-a.min)
  // 告警散点层按分档上色（与列表、异常图一致），静默中的点半透明描白边
  const scatterSeries = tiers.map(t => ({
    type: 'scatter' as const, name: `${t.label || t.key}告警`,
    symbolSize: 8, z: 6,
    data: pointsBySeverity(t.key as SeverityKey)
  }))
  inst.setOption({
    backgroundColor:'transparent',grid:{left:40,right:15,top:24,bottom:25},
    tooltip:{trigger:'item',formatter:(p:any)=>{
      if (p.seriesType==='scatter') return `W${p.value[0]} ${p.data.ts}<br/>${p.data.rule}<br/>score=${p.value[1]}${p.data.silenced?'<br/>🤫 静默中':''}<br/><span style="color:#94a3b8">${p.data.msg}</span>`
      return `W${p.dataIndex}: ${p.value} 条`
    }},
    legend:{right:0,top:0,textStyle:{color:'#94a3b8',fontSize:9},itemWidth:10,itemHeight:8},
    xAxis:{type:'category',data:ws.map((_,i)=>'W'+i),axisLabel:{color:'#94a3b8',fontSize:9}},
    yAxis:[
      {type:'value',name:'日志量',nameTextStyle:{color:'#64748b',fontSize:9},axisLabel:{color:'#94a3b8'}},
      {type:'value',name:'告警分数',nameTextStyle:{color:'#64748b',fontSize:9},axisLabel:{color:'#94a3b8'},splitLine:{show:false}}
    ],
    series:[{
      type:'bar',data:ws.map(w=>w.count),name:'日志量',itemStyle:{color:'#38bdf8'}
    },
    ...scatterSeries.map(s => ({...s, yAxisIndex:1}))
    ],animation:false
  },{replaceMerge:['series']})
}
onMounted(()=>{if(chart.value){inst=echarts.init(chart.value);update()}})
watch(()=>[store.result, store.alerts, store.viewConfig],update,{deep:false})
onUnmounted(()=>inst?.dispose())
</script>
<style scoped>.panel{background:#1e293b;border-radius:8px;padding:12px;border:1px solid #334155}.panel h4{color:#38bdf8;font-size:13px;margin-bottom:4px}.chart{width:100%;height:200px}</style>
