(() => {
  const headers = () => ({ Authorization: `Bearer ${JSON.parse(localStorage.getItem('sentinelAdminSession') || 'null')?.token || ''}` });
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + (+n || 0).toFixed(2);

  let approving = new Set();

  async function approveAlert(incidentId, btn) {
    if (approving.has(incidentId)) return;
    approving.add(incidentId);
    btn.disabled = true;
    btn.textContent = 'Approving…';
    try {
      const r = await fetch(`/api/alerts/${encodeURIComponent(incidentId)}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() } });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Approval failed');
      const card = btn.closest('.alert-card');
      if (card) {
        card.classList.add('alert-approved');
        card.querySelector('.alert-severity').textContent = '✓ APPROVED';
        card.querySelector('.alert-severity').style.cssText = 'background:#dcfce7;color:#15803d';
        btn.closest('.alert-actions').innerHTML = `<div class="alert-approved-stamp">✓ Reorder executed — new order: <b>${esc(data.reorderOrderId)}</b></div>`;
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Approve reorder';
      approving.delete(incidentId);
      const card = btn.closest('.alert-card');
      if (card) { let err = card.querySelector('.alerts-error'); if (!err) { err = document.createElement('p'); err.className = 'alerts-error'; card.append(err); } err.textContent = e.message; }
    }
  }

  function alertCard(item) {
    const ts = new Date(item.createdAt).toLocaleString();
    const approved = item.executionStatus === 'REORDER_CREATED';
    return `<div class="alert-card${approved ? ' alert-approved' : ''}" data-incident-id="${esc(item.id)}">
      <div class="alert-card-header">
        <span class="alert-severity">${approved ? '✓ APPROVED' : '⚠ PENDING REORDER'}</span>
        <time>${esc(ts)}</time>
      </div>
      <h2>${esc(item.productName)}</h2>
      <div class="alert-meta">
        <span><b>Buyer:</b> ${esc(item.customerName)}</span>
        <span><b>Amount:</b> ${money(item.amount)}</span>
        <span><b>Original order:</b> ${esc(item.originalOrderId)}</span>
        <span><b>Priority:</b> ${esc(item.priority)}</span>
      </div>
      <div class="alert-actions">
        ${approved
          ? `<div class="alert-approved-stamp">✓ Reorder executed — new order: <b>${esc(item.reorderOrderId || '')}</b></div>`
          : `<button class="alert-approve-btn" data-approve-id="${esc(item.id)}">Approve reorder</button>`}
      </div>
    </div>`;
  }

  async function loadAlerts() {
    if (location.pathname !== '/dashboard/alerts') return;
    const main = document.querySelector('.dash-main');
    if (!main || main.dataset.alerts === 'loading') return;
    main.dataset.alerts = 'loading';
    try {
      const r = await fetch('/api/alerts', { headers: headers() });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Unable to load alerts');
      const pending = data.filter(x => x.executionStatus === 'PENDING_AI_REORDER');
      const done = data.filter(x => x.executionStatus !== 'PENDING_AI_REORDER');
      const badgeHtml = pending.length
        ? `<div class="alerts-badge"><span class="badge-dot"></span>${pending.length} pending approval${pending.length > 1 ? 's' : ''}</div>`
        : '';
      const pendingHtml = pending.length
        ? pending.map(alertCard).join('')
        : `<div class="alerts-empty"><h2>No pending reorder requests</h2><p>Network reorder incidents flagged at checkout will appear here awaiting your approval.</p></div>`;
      const doneHtml = done.length
        ? `<h2 style="margin:28px 0 12px;font-size:1rem;color:#64748b;font-weight:600">Resolved (${done.length})</h2><div class="alerts-grid">${done.map(alertCard).join('')}</div>`
        : '';
      main.innerHTML = `<h1>Reorder Alerts</h1>
        <p class="alerts-sub">AI recovery requests from the network intelligence layer — approve to execute reorder on buyer's behalf.</p>
        ${badgeHtml}
        <div class="alerts-grid">${pendingHtml}</div>
        ${doneHtml}`;
      main.querySelectorAll('[data-approve-id]').forEach(btn => {
        btn.onclick = () => approveAlert(btn.dataset.approveId, btn);
      });
    } catch (e) {
      const main2 = document.querySelector('.dash-main');
      if (main2) main2.innerHTML = `<h1>Reorder Alerts</h1><p class="alerts-error">${esc(e.message)}</p>`;
    } finally {
      const main3 = document.querySelector('.dash-main');
      if (main3) main3.dataset.alerts = 'done';
    }
  }

  function addLink() {
    const side = document.querySelector('.dash-side');
    if (side && !side.querySelector('[href="/dashboard/alerts"]'))
      side.insertAdjacentHTML('beforeend', '<a href="/dashboard/alerts">Alerts</a>');
  }

  // Refresh panel on WS events
  window.addEventListener('alerts-refresh', () => {
    const main = document.querySelector('.dash-main');
    if (main) { delete main.dataset.alerts; loadAlerts(); }
  });

  new MutationObserver(() => { addLink(); const main = document.querySelector('.dash-main'); if (main && location.pathname === '/dashboard/alerts' && !main.dataset.alerts) loadAlerts(); }).observe(document.querySelector('#app'), { childList: true, subtree: true });
  addLink(); loadAlerts();
})();
