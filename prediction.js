const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const amount = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
function prediction(d) {
  const orders = [...new Map((d.orders || []).filter(x => x && x.id).map(x => [x.id, x])).values()];
  const logs = d.logs || [], recoveries = d.recoveries || [];
  const failed = orders.filter(x => ['FAILED', 'BLOCKED'].includes(x.status) && !x.reorderOf);
  const investigations = failed.map(order => {
    const evidence = logs.filter(x => x.orderId === order.id).sort((a,b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    const source = evidence.find(x => x.injectionType !== 'PAYMENT_RECOVERY');
    const recovery = recoveries.find(x => x.originalOrderId === order.id);
    const settlement = source?.moneyDebited === true && source?.settlementStatus === 'DEBITED_FROM_CUSTOMER_NOT_RECEIVED_BY_ORGANIZATION';
    const network = source && ['latency','packetLoss','errorRate'].some((k,i) => source[k] != null && Number.isFinite(Number(source[k])) && Number(source[k]) > [250,2,2][i]);
    const replacement = recovery?.reorderOrderId ? orders.find(x => x.id === recovery.reorderOrderId && x.originalOrderId === order.id && x.status === 'CONFIRMED') : null;
    const verifiedReorder = recovery?.customerDecision === 'REORDER' && recovery?.verificationStatus === 'PASSED' && !!replacement;
    const refund = recovery?.customerDecision === 'REFUND';
    const type = settlement ? 'Payment settlement mismatch' : network ? 'Network threshold breach' : 'Unclassified checkout failure';
    const status = verifiedReorder ? 'REORDER_VERIFIED' : refund ? 'REFUND_PENDING' : 'INVESTIGATION_OPEN';
    const steps = settlement ? [
      'Match the original order and payment reference with provider settlement records; do not charge the customer again.',
      'Offer Refund or Reorder only to the affected customer session and record their choice once.',
      'For reorder, check all original items, quantities and prices, confirm stock, then verify the linked replacement order.',
      'For refund, create the request and wait for provider confirmation before marking funds returned.'
    ] : network ? [
      'Inspect the recorded latency, packet loss and error rate alongside the failed checkout timestamp.',
      'Investigate application and network telemetry; the checkout metrics alone cannot identify the failing infrastructure component.',
      'Restore connectivity, then measure a new safe checkout: latency below 250ms, packet loss below 1%, and error rate below 1%.',
      'Retry only with customer authorization and link the retry result to the original failure before closing the case.'
    ] : ['Retrieve the missing checkout/payment logs.', 'Investigate the failure before selecting a remedy.', 'Record a linked successful outcome and its verification evidence.'];
    return {
      orderId:order.id, customer:order.buyerName || 'Unknown customer', createdAt:order.createdAt,
      products:(order.items || []).map(i => ({name:(d.products || []).find(p=>p.id===i.productId)?.name || i.productId, quantity:i.quantity})),
      amount:amount(order.amount), type, status,
      error:source?.failureReason || `Order ended with status ${order.status}.`,
      rootCause:settlement ? 'Recorded trigger: simulated customer debit without merchant settlement. A real payment-provider root cause has not been established.' : network ? 'Recorded trigger: one or more network thresholds exceeded. The responsible network or application component is unverified.' : 'Insufficient evidence to establish a root cause.',
      steps,
      resolution:verifiedReorder ? `Linked replacement ${replacement.id} is confirmed. This verifies the simulated order record, not real payment settlement or fulfillment.` : refund ? 'Customer requested a refund. Funds returned are not verified; the refund remains pending.' : recovery ? 'A recovery case exists; a completed, verified outcome has not been recorded.' : 'No linked recovery outcome is available. Investigation remains open.',
      evidence:evidence.map(l=>({id:l.id,time:l.timestamp,outcome:l.finalOutcome,payment:l.paymentStatus,latency:l.latency,packetLoss:l.packetLoss,errorRate:l.errorRate})),
      timeline:[...(source?.timeline || []),...(recovery?.timeline || [])],
      recoveryId:recovery?.id || null, decision:recovery?.customerDecision || 'Not selected',
      verification:verifiedReorder ? 'Linked order verified' : 'Unverified / pending',
      eligible:!verifiedReorder&&!refund,
      observedReorderValue:verifiedReorder ? Math.min(amount(order.amount),amount(replacement.amount)) : 0,
      refundPendingValue:refund ? amount(order.amount) : 0
    };
  });
  const sum = key => round(investigations.reduce((a,x)=>a+x[key],0));
  const eligible = investigations.filter(x=>x.eligible);
  const eligibleValue = round(eligible.reduce((a,x)=>a+x.amount,0));
  const validDates = orders.map(x=>Date.parse(x.createdAt)).filter(Number.isFinite);
  return {
    generatedAt:new Date().toISOString(), currency:'USD', mode:'SIMULATED',
    period:validDates.length ? {from:new Date(Math.min(...validDates)).toISOString(),to:new Date(Math.max(...validDates)).toISOString()} : null,
    summary:{originalOrders:orders.filter(x=>!x.reorderOf).length,failedOrders:failed.length,failedOrderValue:sum('amount'),verifiedReorders:investigations.filter(x=>x.status==='REORDER_VERIFIED').length,observedReorderValue:sum('observedReorderValue'),pendingRefundValue:sum('refundPendingValue'),eligibleOrders:eligible.length,eligibleValue},
    scenarios:[{name:'Conservative',rate:.2},{name:'Planning',rate:.4},{name:'Optimistic',rate:.6}].map(s=>({...s,expectedOrders:round(eligible.length*s.rate),potentialOrderValue:round(eligibleValue*s.rate)})),
    assumptions:[
      'All values describe the existing checkout simulation. No real revenue, refunds, margin or cash collection is verified.',
      'Scenarios apply assumed 20%, 40% and 60% recovery rates to unresolved failed/blocked order value. They are not trained forecasts or measured AI uplift.',
      'Refund-selected cases and verified replacement orders are excluded from the opportunity pool. Each original order is counted once.',
      'Potential order value = eligible order value × assumed recovery rate. Verified reorder value is capped at the original order value.',
      'This is a recovery opportunity for the displayed history, not a monthly forecast. No future traffic growth is assumed.',
      'Revenue attribution requires a control group, verified payment settlement and costs; retention and support savings are not measured.'
    ],
    mechanisms:[
      {title:'Recover interrupted purchases',action:'Detect failures and offer a customer-specific recovery choice.',measure:'Verified linked replacement orders / eligible failed orders',limit:'A replacement order alone does not prove settled revenue.'},
      {title:'Protect customer trust',action:'Track refund requests transparently until provider confirmation.',measure:'Provider-confirmed refunds and time to resolution',limit:'Refunds return customer funds; they are not additional revenue.'},
      {title:'Reduce repeated checkout failures',action:'Use incident evidence to prioritize network and payment investigations.',measure:'Failure rate before and after a verified fix, under comparable traffic',limit:'A lower failure rate cannot be attributed to AI without comparison data.'},
      {title:'Focus operations work',action:'Collect logs, probable causes, remedies and recovery outcomes in one view.',measure:'Investigation handling time and verified resolution time',limit:'No labor savings are claimed until handling time and cost are measured.'}
    ], investigations
  };
}
module.exports={prediction};
