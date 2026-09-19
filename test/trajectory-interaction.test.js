const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('pointer drag changes horizontal and vertical view, syncs slider and stops after release',()=>{
 let Chart;const nodes=new Map();
 class Element{
  constructor(){this.dataset={base:'100',eligible:'1000'};this.isConnected=true}
  querySelector(key){if(!nodes.has(key))nodes.set(key,{value:0,setAttribute(){},insertAdjacentHTML(){},classList:{add(){},remove(){}},focus(){},setPointerCapture(){},hasPointerCapture(){return true},releasePointerCapture(){},getBoundingClientRect(){return {width:800}}});return nodes.get(key)}
 }
 const callbacks=[];vm.runInNewContext(fs.readFileSync('public/prediction-trajectory.js','utf8'),{HTMLElement:Element,customElements:{define(name,value){Chart=value}},requestAnimationFrame:fn=>{callbacks.push(fn);return callbacks.length},cancelAnimationFrame(){},Intl});
 const chart=new Chart();chart.connectedCallback();const svg=nodes.get('svg'),yaw=chart.yaw,pitch=chart.pitch;
 const event=(x,y,id=1)=>({button:0,pointerId:id,clientX:x,clientY:y,preventDefault(){}});
 svg.onpointerdown(event(100,100));svg.onpointermove(event(150,75));assert.notEqual(chart.yaw,yaw);assert.ok(chart.pitch>pitch);assert.equal(Number(nodes.get('[data-rotation]').value),Math.round(chart.yaw*180/Math.PI));
 const moved=chart.yaw;svg.onpointermove(event(200,100,2));assert.equal(chart.yaw,moved);
 svg.onpointerup(event(150,75));svg.onpointermove(event(250,0));assert.equal(chart.yaw,moved);
 svg.onkeydown({key:'Home',preventDefault(){}});assert.equal(chart.yaw,yaw);assert.equal(chart.pitch,pitch);
 svg.onpointerdown(event(0,0));svg.onpointermove(event(0,-9999));assert.ok(chart.pitch<=60*Math.PI/180);svg.onpointercancel(event(0,-9999));assert.equal(chart.drag,null);
 callbacks.forEach(fn=>fn());assert.ok(nodes.get('svg').innerHTML.includes('<polyline'));
 chart.disconnectedCallback();assert.equal(chart.frame,0);
});
