(() => {
  async function clearData(kind) {
    const label = kind === 'logs' ? 'all logs' : 'all transactions';
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    const admin = JSON.parse(localStorage.getItem('sentinelAdminSession') || 'null');
    const response = await fetch(`/api/${kind}`, { method: 'DELETE', headers: { Authorization: `Bearer ${admin?.token || ''}` } });
    const result = await response.json();
    if (!response.ok) return alert(result.error || 'Deletion failed');
    alert(`${result.deleted} ${label} deleted.`);
    window.render();
  }
  function addControls() {
    const main = document.querySelector('.dash-main');
    const admin = JSON.parse(localStorage.getItem('sentinelAdminSession') || 'null');
    if (!main || admin?.role !== 'SUPER_ADMIN' || main.querySelector('.admin-delete-controls')) return;
    const isLogs = location.pathname.endsWith('/logs');
    const controls = document.createElement('div');
    controls.className = 'admin-delete-controls';
    controls.innerHTML = `<button class="danger-button">Delete all ${isLogs ? 'logs' : 'transactions'}</button>`;
    controls.querySelector('button').onclick = () => clearData(isLogs ? 'logs' : 'transactions');
    main.querySelector('h1')?.insertAdjacentElement('afterend', controls);
  }
  async function addRowControls() {
    const main = document.querySelector('.dash-main');
    const admin = JSON.parse(localStorage.getItem('sentinelAdminSession') || 'null');
    if (!main || admin?.role !== 'SUPER_ADMIN' || main.dataset.rowControls) return;
    const isLogs = location.pathname.endsWith('/logs');
    const table = main.querySelector('table');
    if (!table) return;
    main.dataset.rowControls = 'true';
    try {
      const response = await fetch(isLogs ? '/api/logs' : '/api/dashboard/data', { headers: { Authorization: `Bearer ${admin.token}` } });
      const data = await response.json();
      const ids = isLogs ? data.map(log => log.id) : data.transactions.map(transaction => transaction.id);
      const head = table.querySelector('thead tr');
      const rows = [...table.querySelectorAll('tbody tr')];
      if (!head || !rows.length) return;
      head.insertAdjacentHTML('beforeend', '<th>Action</th>');
      rows.forEach((row, index) => {
        if (!ids[index]) return;
        const cell = document.createElement('td');
        const button = document.createElement('button');
        button.className = 'row-delete-button';
        button.textContent = 'Delete';
        button.onclick = async () => {
          const label = isLogs ? 'this log' : 'this order and its transaction';
          if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
          const result = await fetch(isLogs ? `/api/logs/${ids[index]}` : `/api/orders/${data.orders.find(order => order.transactionId === ids[index])?.id || ''}`, { method: 'DELETE', headers: { Authorization: `Bearer ${admin.token}` } });
          const payload = await result.json();
          if (!result.ok) return alert(payload.error || 'Deletion failed');
          window.render();
        };
        cell.append(button); row.append(cell);
      });
    } finally { main.dataset.rowControls = 'done'; }
  }
  function cleanOverviewMetrics() {
    if (!location.pathname.endsWith('/overview') && location.pathname !== '/overview' && location.pathname !== '/dashboard') return;
    document.querySelectorAll('.metrics .metric').forEach(metric => {
      const label = metric.querySelector('span')?.textContent.trim().toLowerCase();
      if (label === 'blocked transactions' || label === 'total injection events') metric.remove();
    });
  }
  function decorate() { cleanOverviewMetrics(); addControls(); addRowControls(); }
  new MutationObserver(decorate).observe(document.querySelector('#app'), { childList: true, subtree: true });
  decorate();
})();
