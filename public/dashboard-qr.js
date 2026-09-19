(() => {
  async function addStoreQr() {
    const main = document.querySelector('.dash-main');
    if (!main || main.querySelector('.overview-qr') || main.dataset.qrLoading || location.pathname.endsWith('/logs')) return;
    main.dataset.qrLoading = 'true';
    try {
      const response = await fetch('/api/network-url');
      const { shopUrl } = await response.json();
      const card = document.createElement('section');
      card.className = 'overview-qr dash-card';
      card.innerHTML = `<img src="/api/qr?target=${encodeURIComponent(shopUrl)}" alt="QR code for the shop"><div><p class="eyebrow">STORE QR CODE</p><h2>Open the storefront</h2><p>Scan from a phone on the same network to open the current shop address.</p><code>${shopUrl}</code></div>`;
      main.prepend(card);
    } finally { delete main.dataset.qrLoading; }
  }
  new MutationObserver(addStoreQr).observe(document.querySelector('#app'), { childList: true, subtree: true });
  addStoreQr();
})();
