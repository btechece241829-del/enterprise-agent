const test=require('node:test'),assert=require('node:assert/strict');
const {reportData}=require('../combined-report');
test('combined report filters the timeframe and exposes business impact',()=>{
 const now=new Date(),old=new Date(now-40*864e5).toISOString(),recent=new Date(now-2*864e5).toISOString();
 const d={logs:[{id:'old',timestamp:old,severity:'CRITICAL',paymentStatus:'FAILED'},{id:'new',timestamp:recent,severity:'SAFE',paymentStatus:'SUCCESS'}],transactions:[{id:'tx-old',createdAt:old,orderStatus:'FAILED'},{id:'tx-new',createdAt:recent,orderStatus:'CONFIRMED'}],orders:[{id:'old-order',createdAt:old,status:'FAILED',amount:20},{id:'new-order',createdAt:recent,status:'CONFIRMED',amount:50}],recoveries:[]};
 const r=reportData(d,30);assert.equal(r.stats.totalTransactions,1);assert.equal(r.stats.successfulOrders,1);assert.equal(r.stats.failedOrders,0);assert.equal(r.logs,1);assert.equal(r.orders,1);assert.equal(r.impact.failedOrderValue,0);assert.equal(r.range.days,30);
});
