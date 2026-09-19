(() => {
  function showBuyerName() {
    const buyer = JSON.parse(localStorage.getItem('sentinelBuyerSession') || 'null');
    const actions = document.querySelector('.header-actions');
    if (!buyer?.name || !actions || actions.querySelector('.buyer-greeting')) return;
    const greeting = document.createElement('span');
    greeting.className = 'buyer-greeting';
    greeting.textContent = `Hi, ${buyer.name}`;
    actions.prepend(greeting);
  }
  new MutationObserver(showBuyerName).observe(document.querySelector('#app'), { childList: true, subtree: true });
  showBuyerName();
})();
