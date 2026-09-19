const {createHash}=require('node:crypto');
function analyze(logs){
  const groups=new Map();
  for(const log of Array.isArray(logs)?logs:[]){
    if(!log||!log.id||log.injectionType==='PAYMENT_RECOVERY')continue;
    const payment=log.moneyDebited===true&&log.settlementStatus==='DEBITED_FROM_CUSTOMER_NOT_RECEIVED_BY_ORGANIZATION';
    const metrics=['latency','packetLoss','errorRate'].every(k=>log[k]!==null&&log[k]!==undefined&&Number.isFinite(Number(log[k])));
    const network=metrics&&(Number(log.latency)>250||Number(log.packetLoss)>2||Number(log.errorRate)>2);
    if(!payment&&!network)continue;
    const time=Date.parse(log.timestamp);if(!Number.isFinite(time))continue;
    const type=payment?'PAYMENT_SETTLEMENT':'NETWORK';
    const key=type+':'+Math.floor(time/(15*60*1000));
    if(!groups.has(key))groups.set(key,{type,logs:[]});
    const group=groups.get(key);if(!group.logs.some(x=>x.id===log.id))group.logs.push(log);
  }
  const incidents=[...groups.entries()].map(([key,g])=>{
    const payment=g.type==='PAYMENT_SETTLEMENT',rows=g.logs;
    return {incidentId:'INC-'+createHash('sha256').update(key).digest('hex').slice(0,10),title:payment?'Payment debited but not received by the organization':'Network thresholds exceeded during checkout',status:'REVIEW_REQUIRED',severity:payment?'HIGH':'CRITICAL',businessImpact:'HIGH',priority:'P1',confidence:1,probableRootCause:payment?'Recorded payment settlement mismatch; the provider cause has not been verified.':'Recorded network thresholds exceeded; the underlying network cause has not been verified.',affectedProducts:[...new Set(rows.map(x=>x.productName).filter(Boolean))],affectedOrders:[...new Set(rows.map(x=>x.orderId).filter(Boolean))],relatedLogs:rows.map(x=>x.id),evidence:rows.map(x=>payment?`${x.id}: customer debited, organization not credited; order ${x.orderId}.`:`${x.id}: latency ${x.latency}ms, packet loss ${x.packetLoss}%, error rate ${x.errorRate}%.`),recommendedAction:payment?'Offer the affected customer Refund or Reorder; verify their recovery status before further action.':'Investigate the network and verify new checkout metrics before retrying.',executionMode:'HUMAN_APPROVAL',riskLevel:'HIGH',verificationPlan:payment?'Confirm the selected recovery outcome. A refund request is not a completed refund.':'Verify new logs: latency <250ms, packet loss <1%, error rate <1%.'};
  });
  return {incidents,summary:incidents.length?`${incidents.length} historical incident group(s) found. Review recovery outcomes to determine what remains open.`:'No payment settlement mismatches or network threshold breaches found in the available logs.'};
}
module.exports={analyze};
