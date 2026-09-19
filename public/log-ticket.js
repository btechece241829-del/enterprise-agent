(() => {
  const text = input => input === null || input === undefined || input === '' ? '—' : String(input);
  const esc = input => text(input).replace(/[&<>]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[char]));
  function closeTicket() { document.querySelector('.ticket-overlay')?.remove(); }
  function showTicket(log) {
    const network = log.injectionConfiguration?.network || {};
    const payment = log.injectionConfiguration?.payment || {};
    const timeline = (log.timeline || []).map(([step,time]) => `<li><b>${esc(step)}</b><span>${new Date(time).toLocaleString()}</span></li>`).join('');
    const overlay = document.createElement('div');
    overlay.className = 'ticket-overlay';
    overlay.innerHTML = `<article class="ticket"><header><div><p>INCIDENT TICKET</p><h2>${esc(log.id)}</h2></div><button class="ticket-close" aria-label="Close">×</button></header><div class="ticket-status"><span class="status ${esc(log.severity)}">${esc(log.severity)}</span><span class="status ${esc(log.finalOutcome)}">${esc(log.finalOutcome)}</span><span>${new Date(log.timestamp).toLocaleString()}</span></div><section><h3>Buyer & order</h3><dl><div><dt>Buyer</dt><dd>${esc(log.buyerName)}</dd></div><div><dt>Session ID</dt><dd>${esc(log.sessionId)}</dd></div><div><dt>Product</dt><dd>${esc(log.productName)}</dd></div><div><dt>Product ID</dt><dd>${esc(log.productId)}</dd></div><div><dt>Transaction ID</dt><dd>${esc(log.transactionId)}</dd></div><div><dt>Order ID</dt><dd>${esc(log.orderId)}</dd></div></dl></section><section><h3>Network evaluation</h3><dl><div><dt>Scenario</dt><dd>${esc(log.scenario)}</dd></div><div><dt>Packet loss</dt><dd>${esc(log.packetLoss)}%</dd></div><div><dt>Latency</dt><dd>${esc(log.latency)}ms</dd></div><div><dt>Error rate</dt><dd>${esc(log.errorRate)}%</dd></div><div><dt>Severity</dt><dd>${esc(log.severity)}</dd></div><div><dt>Rule</dt><dd>Critical when latency &gt;250ms, packet loss &gt;2%, or error rate &gt;2%</dd></div></dl><p class="ticket-note">Configured input: ${esc(JSON.stringify(network))}</p></section><section><h3>Payment & settlement</h3><dl><div><dt>Payment status</dt><dd>${esc(log.paymentStatus)}</dd></div><div><dt>Money debited</dt><dd>${log.moneyDebited ? 'Yes' : 'No'}</dd></div><div><dt>Settlement status</dt><dd>${esc(log.settlementStatus)}</dd></div><div><dt>Failure reason</dt><dd>${esc(log.failureReason)}</dd></div></dl><p class="ticket-note">Configured input: ${esc(JSON.stringify(payment))}</p></section><section><h3>AI analysis</h3><dl><div><dt>Engine</dt><dd>RULE-BASED ANALYSIS</dd></div><div><dt>Decision</dt><dd>${esc(log.aiDecision)}</dd></div><div><dt>Risk</dt><dd>${esc(log.aiRisk)}</dd></div><div><dt>Confidence</dt><dd>${esc(log.aiConfidence)}</dd></div><div class="wide"><dt>Reason</dt><dd>${esc(log.aiReason)}</dd></div><div class="wide"><dt>Recommendation</dt><dd>${esc(log.aiRecommendation)}</dd></div></dl></section><section><h3>Event timeline</h3><ol class="ticket-timeline">${timeline || '<li>No timeline was recorded.</li>'}</ol></section></article>`;
    overlay.onclick = event => { if (event.target === overlay || event.target.closest('.ticket-close')) closeTicket(); };
    document.body.append(overlay);
  }
  async function addTicketButtons() {
    if (!location.pathname.endsWith('/logs')) return;
    const main = document.querySelector('.dash-main');
    const session = JSON.parse(localStorage.getItem('sentinelAdminSession') || 'null');
    const table = main?.querySelector('table');
    if (!main || !table || main.dataset.ticketButtons) return;
    main.dataset.ticketButtons = 'true';
    try {
      const response = await fetch('/api/logs', { headers: { Authorization: `Bearer ${session?.token || ''}` } });
      const logs = await response.json();
      const header = table.querySelector('thead tr');
      const rows = [...table.querySelectorAll('tbody tr')];
      if (!header || !rows.length) return;
      header.insertAdjacentHTML('beforeend', '<th>Ticket</th>');
      rows.forEach((row,index) => { const cell=document.createElement('td'),button=document.createElement('button');button.className='ticket-button';button.textContent='View ticket';button.onclick=()=>showTicket(logs[index]);cell.append(button);row.append(cell); });
    } finally { main.dataset.ticketButtons = 'done'; }
  }
  new MutationObserver(addTicketButtons).observe(document.querySelector('#app'), { childList:true, subtree:true });
  addTicketButtons();
})();
