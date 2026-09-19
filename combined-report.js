const { prediction } = require('./prediction');
function reportData(d, days) {
  const all=[...(d.logs||[]),...(d.orders||[]),...(d.transactions||[])].map(x=>Date.parse(x.timestamp||x.createdAt)).filter(Number.isFinite);
  const end=Date.now(), span=Number(days)>0?Number(days)*864e5:null, start=span?end-span:null;
  const inRange=x=>{const time=Date.parse(x?.timestamp||x?.createdAt);return !start||!Number.isFinite(time)||time>=start};
  const scoped={...d,logs:(d.logs||[]).filter(inRange),orders:(d.orders||[]).filter(inRange),transactions:(d.transactions||[]).filter(inRange),recoveries:(d.recoveries||[]).filter(inRange)};
  const stats={totalTransactions:scoped.transactions.length,successfulOrders:scoped.transactions.filter(x=>x.orderStatus==='CONFIRMED').length,failedOrders:scoped.transactions.filter(x=>x.orderStatus==='FAILED').length,criticalEvents:scoped.logs.filter(x=>x.severity==='CRITICAL').length,safeEvents:scoped.logs.filter(x=>x.severity==='SAFE').length,paymentFailures:scoped.logs.filter(x=>x.paymentStatus==='FAILED').length,recoveryCases:scoped.recoveries.length,refundRequests:scoped.recoveries.filter(x=>x.customerDecision==='REFUND').length,reordersCompleted:scoped.recoveries.filter(x=>x.customerDecision==='REORDER').length};
  const projection=prediction(scoped);
  return {generatedAt:new Date().toISOString(),range:{days:Number(days)>0?Number(days):'all',from:start?new Date(start).toISOString():(all.length?new Date(Math.min(...all)).toISOString():null),to:new Date(end).toISOString()},stats,projection,logs:scoped.logs.length,orders:scoped.orders.length,impact:{failedOrderValue:projection.summary.failedOrderValue,unresolvedOpportunity:projection.summary.eligibleValue,verifiedReorderValue:projection.summary.observedReorderValue,pendingRefundValue:projection.summary.pendingRefundValue,planningRecoveryValue:projection.scenarios.find(x=>x.name==='Planning')?.potentialOrderValue||0}};
}
module.exports={reportData};
