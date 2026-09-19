const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {analyze}=require('../incident-analysis');
test('payment settlement failure with safe metrics is classified separately',()=>{
 const log={id:'L1',timestamp:'2026-09-19T10:00:00Z',orderId:'O1',severity:'CRITICAL',latency:120,packetLoss:.5,errorRate:.5,moneyDebited:true,settlementStatus:'DEBITED_FROM_CUSTOMER_NOT_RECEIVED_BY_ORGANIZATION'};
 const result=analyze([log]);assert.equal(result.incidents.length,1);assert.match(result.incidents[0].title,/Payment/);assert.equal(result.incidents[0].incidentId,analyze([log]).incidents[0].incidentId);
 assert.equal(analyze([{...log,moneyDebited:false}]).incidents.length,0);
 assert.match(analyze([{...log,moneyDebited:false,latency:300}]).incidents[0].title,/Network/);
});
test('intelligence updates preserve the chat DOM instead of rendering the dashboard again',()=>{
 let socket,rendered=0,eventName;
 const context={WebSocket:class{constructor(){socket=this}},location:{protocol:'http:',host:'localhost:8000',pathname:'/dashboard/intelligence'},window:{render:()=>rendered++,dispatchEvent:e=>eventName=e.type},Event:class{constructor(type){this.type=type}},setTimeout:()=>{}};
 vm.runInNewContext(fs.readFileSync('public/dashboard-realtime.js','utf8'),context);
 socket.onmessage({data:JSON.stringify({type:'data-updated'})});assert.equal(rendered,0);assert.equal(eventName,'intelligence-data-updated');
 context.location.pathname='/dashboard/overview';socket.onmessage({data:JSON.stringify({type:'data-updated'})});assert.equal(rendered,1);
});
