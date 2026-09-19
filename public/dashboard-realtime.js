(() => {
  let socket;
  function connect() {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${scheme}://${location.host}`);
    socket.onmessage = event => {
      let update;
      try { update = JSON.parse(event.data); } catch { return; }
      if (update.type === 'data-updated' && location.pathname === '/dashboard/intelligence') {
        window.dispatchEvent(new Event('intelligence-data-updated'));
        return;
      }
      if (update.type === 'data-updated' && location.pathname.startsWith('/dashboard/')) {
        window.render();
      }
    };
    socket.onclose = () => setTimeout(connect, 1500);
  }
  connect();
})();
