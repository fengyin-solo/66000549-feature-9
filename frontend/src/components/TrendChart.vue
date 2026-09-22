<template>
  <div class="panel"><h4>📉 窗口日志量趋势（告警点颜色＝分级标准，🔇＝静默中）</h4><div ref="chart" class="chart"></div></div>
</template>
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useLogStore } from '../store/log'
import { gradeColor, gradeLabel } from '@/utils/severity'
import { buildAlertMarkers } from '@/utils/chartMarkers'
const store = useLogStore(); const chart = ref<HTMLDivElement>(); let inst: echarts.ECharts|null=null
function update() {
  if (!inst||!store.result) return
  const ws = store.result.windows
  inst.setOption({
    backgroundColor:'transparent',grid:{left:40,right:15,top:10,bottom:25},
    xAxis:{type:'category',data:ws.map((_,i)=>'W'+i),axisLabel:{color:'#94a3b8',fontSize:9}},
    yAxis:{type:'value',axisLabel:{color:'#94a3b8'}},
    series:[{
      type:'bar',data:ws.map(w=>w.count),itemStyle:{color:'#38bdf8'},
      markLine:{data:[{type:'average',name:'avg'}],lineStyle:{color:'#f97316',type:'dashed'},label:{color:'#f97316'}},
      // 与告警列表同源：每个告警窗口按其分档着色，静默期首条用灰色🔇
      markPoint:buildAlertMarkers(store.result, { yValues: ws.map(w=>w.count), gradeColor, gradeLabel }),
    }],animation:false
  },true)
}
onMounted(()=>{if(chart.value){inst=echarts.init(chart.value);update()}})
watch(()=>[store.result,store.alertConfig],update,{deep:true})
onUnmounted(()=>inst?.dispose())
</script>
<style scoped>.panel{background:#1e293b;border-radius:8px;padding:12px;border:1px solid #334155}.panel h4{color:#38bdf8;font-size:13px;margin-bottom:4px}.chart{width:100%;height:200px}</style>
