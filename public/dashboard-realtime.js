(() => {
  let socket;
  function connect() {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${scheme}://${location.host}`);
    socket.onmessage = event => {
      const update = JSON.parse(event.data);
      if (update.type === 'data-updated' && location.pathname.startsWith('/dashboard/')) {
        window.render();
      }
    };
    socket.onclose = () => setTimeout(connect, 1500);
  }
  connect();
})();
