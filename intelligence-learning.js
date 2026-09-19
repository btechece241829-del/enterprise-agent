function learn(d){
  const logs=Array.isArray(d.logs)?d.logs:[],recoveries=Array.isArray(d.recoveries)?d.recoveries:[];
  const payment=logs.filter(x=>x.moneyDebited&&x.settlementStatus==='DEBITED_FROM_CUSTOMER_NOT_RECEIVED_BY_ORGANIZATION');
  const critical=logs.filter(x=>x.severity==='CRITICAL'&&Number.isFinite(+x.latency));
  const avg=(rows,key)=>rows.length?Math.round(rows.reduce((sum,row)=>sum+(+row[key]||0),0)/rows.length*10)/10:0;
  const lessons=[];
  if(payment.length)lessons.push({id:'payment-settlement-mismatch',category:'PAYMENT_RECOVERY',confidence:Math.min(.99,.7+payment.length*.05),observations:payment.length,pattern:'Customer debit with no organization settlement requires immediate customer recovery.',outcome:`${recoveries.filter(x=>x.customerDecision==='REFUND').length} refund request(s), ${recoveries.filter(x=>x.customerDecision==='REORDER').length} reorder(s).`,recommendedAction:'Create one customer-specific Refund / Reorder notification and prevent duplicate processing.'});
  if(critical.length)lessons.push({id:'critical-network-threshold',category:'NETWORK_RISK',confidence:Math.min(.98,.68+critical.length*.04),observations:critical.length,pattern:`Critical checkouts historically averaged ${avg(critical,'latency')}ms latency, ${avg(critical,'packetLoss')}% packet loss, and ${avg(critical,'errorRate')}% error rate.`,outcome:`${critical.filter(x=>x.finalOutcome==='FAILED').length} failed outcome(s) observed.`,recommendedAction:'Block or fail the simulated order and recommend investigation until safe thresholds return.'});
  const memory={version:1,updatedAt:new Date().toISOString(),samples:logs.length,lessons};d.intelligenceMemory=memory;return memory;
}
module.exports={learn};
