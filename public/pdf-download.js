(() => {
  async function downloadReport(button) {
    const session = JSON.parse(localStorage.getItem('sentinelAdminSession') || 'null');
    try {
      const logs = await fetch('/api/logs', { headers: { Authorization: `Bearer ${session?.token || ''}` } }).then(r => r.json());
      if (!Array.isArray(logs) || !logs.length) return alert('No network logs available to generate a report.');
      button.disabled = true; button.textContent = 'Generating PDF...';
      const response = await fetch('/api/reports/network/pdf', { headers: { Authorization: `Bearer ${session?.token || ''}` } });
      if (!response.ok) throw Error('Report generation failed');
      const blob = await response.blob(), link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = `network-logs-report-${new Date().toISOString().slice(0,10)}.pdf`; link.click(); URL.revokeObjectURL(link.href);
      alert('Network monitoring report downloaded.');
    } catch (error) { alert(error.message || 'Unable to generate the PDF report.'); }
    finally { button.disabled = false; button.textContent = 'Download PDF'; }
  }
  function addButton() {
    if (!location.pathname.endsWith('/logs')) return;
    const main = document.querySelector('.dash-main'), heading = main?.querySelector('h1');
    if (!heading || main.querySelector('.pdf-download-button')) return;
    const button = document.createElement('button'); button.className = 'pdf-download-button'; button.textContent = 'Download PDF'; button.onclick = () => downloadReport(button); heading.insertAdjacentElement('afterend', button);
  }
  new MutationObserver(addButton).observe(document.querySelector('#app'), { childList:true, subtree:true }); addButton();
})();
