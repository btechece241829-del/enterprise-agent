const test=require('node:test');
const assert=require('node:assert/strict');
const {prediction}=require('../prediction');
test('projection counts each original failure once and excludes refund selections and verified reorders',()=>{
 const d={orders:[{id:'a',status:'FAILED',amount:100},{id:'a',status:'FAILED',amount:100},{id:'b',status:'FAILED',amount:200},{id:'c',status:'FAILED',amount:300},{id:'r',originalOrderId:'c',reorderOf:'c',status:'CONFIRMED',amount:400}],recoveries:[{originalOrderId:'b',customerDecision:'REFUND'},{originalOrderId:'c',customerDecision:'REORDER',verificationStatus:'PASSED',reorderOrderId:'r'}]};
 const p=prediction(d);assert.equal(p.summary.failedOrders,3);assert.equal(p.summary.failedOrderValue,600);assert.equal(p.summary.pendingRefundValue,200);assert.equal(p.summary.observedReorderValue,300);assert.equal(p.summary.eligibleValue,100);assert.deepEqual(p.scenarios.map(x=>x.potentialOrderValue),[20,40,60]);assert.equal(p.investigations.find(x=>x.orderId==='b').status,'REFUND_PENDING');
});
test('missing linked reorder remains unverified; payment mismatch is not a network diagnosis',()=>{
 const p=prediction({orders:[{id:'a',status:'FAILED',amount:100}],recoveries:[{originalOrderId:'a',customerDecision:'REORDER',verificationStatus:'PASSED',reorderOrderId:'missing'}],logs:[{id:'l',orderId:'a',moneyDebited:true,settlementStatus:'DEBITED_FROM_CUSTOMER_NOT_RECEIVED_BY_ORGANIZATION',latency:120,packetLoss:.5,errorRate:.5}]});
 assert.equal(p.summary.verifiedReorders,0);assert.equal(p.summary.eligibleValue,100);assert.equal(p.investigations[0].type,'Payment settlement mismatch');assert.match(p.investigations[0].rootCause,/not been established/);
});
test('empty history and missing amounts yield no invented revenue',()=>{
 const p=prediction({});assert.equal(p.period,null);assert.equal(p.summary.eligibleValue,0);assert.equal(p.investigations.length,0);assert.ok(p.scenarios.every(x=>x.potentialOrderValue===0));
 assert.equal(prediction({orders:[{id:'a',status:'FAILED',amount:'invalid'}]}).summary.failedOrderValue,0);
});
