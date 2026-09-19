(() => {
  const readBuyer=()=>{try{return JSON.parse(localStorage.getItem('sentinelBuyerSession')||'null')}catch{return null}};
  const esc=value=>String(value??'').replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
  async function chooseRecovery(button){
    const buyer=readBuyer(),action=button.dataset.recoveryAction;
    button.disabled=true;button.textContent='Processing…';
    try{
      const response=await fetch(`/api/recovery/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${buyer.token}`},body:JSON.stringify({incidentId:button.dataset.incidentId})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to process recovery choice.');
      const root=document.querySelector('#app');delete root.dataset.notifications;showNotifications();
    }catch(error){button.disabled=false;button.textContent=action==='refund'?'Request refund':'Reorder';alert(error.message)}
  }
  function bindRecovery(root){root.querySelectorAll('[data-recovery-action]').forEach(button=>button.onclick=()=>chooseRecovery(button))}
  function liveUpdates(){
    if(window.sentinelNotificationSocket||!['/notification','/notfication','/notifican'].includes(location.pathname))return;
    const socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);window.sentinelNotificationSocket=socket;
    socket.onmessage=event=>{try{if(JSON.parse(event.data).type==='data-updated'&&['/notification','/notfication','/notifican'].includes(location.pathname)){const root=document.querySelector('#app');delete root.dataset.notifications;showNotifications()}}catch{}};
    socket.onclose=()=>{delete window.sentinelNotificationSocket};
  }
  async function showNotifications(){
    const routes=['/notification','/notfication','/notifican'],route=location.pathname,root=document.querySelector('#app');
    if(!routes.includes(route)){if(root)delete root.dataset.notifications;return;}
    if(!root||root.dataset.notifications===route)return;root.dataset.notifications=route;liveUpdates();
    try{
      const buyer=readBuyer();if(!buyer)throw Error('Enter your name first to view your notifications.');
      const response=await fetch('/api/notifications',{headers:{Authorization:`Bearer ${buyer.token}`}}),data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load notifications.');
      const cards=data.notifications.length?data.notifications.map(item=>`<article class="notification-card"><div><span class="status ${esc(item.severity)}">${esc(item.status)}</span><small>${new Date(item.timestamp).toLocaleString()}</small></div><h2>${esc(item.title)}</h2><p>${esc(item.message)}</p><p><b>Product:</b> ${esc(item.productName)}<br><b>Order:</b> ${esc(item.orderId)}<br><b>Payment:</b> ${esc(item.paymentStatus)} · <b>Order status:</b> ${esc(item.orderStatus)}</p><p class="notification-ai"><b>Sentinel recommendation:</b> ${esc(item.aiMessage)}</p>${item.recoveryRequired?`<div class="recovery-actions"><button data-recovery-action="refund" data-incident-id="${esc(item.incidentId)}">Request refund</button><button class="secondary" data-recovery-action="reorder" data-incident-id="${esc(item.incidentId)}">Reorder</button></div>`:''}</article>`).join(''):'<div class="notification-empty"><h1>No notifications yet</h1><p>When you place an order, its status updates will appear here.</p></div>';
      root.innerHTML=`<div class="notification-page"><header class="notification-header"><a href="/shop">NEXORA.</a><a href="/shop">Back to shop</a></header><main><p class="notification-eyebrow">YOUR ORDER UPDATES</p><h1>Notifications for ${esc(data.buyerName||buyer.name)}</h1><p class="notification-summary">${esc(data.summary)}</p><section class="notification-list">${cards}</section></main></div>`;
      bindRecovery(root);
    }catch(error){root.innerHTML=`<div class="notification-page"><main><h1>Notifications unavailable</h1><p>${esc(error.message)}</p><a href="/welcome">Enter your name</a></main></div>`}
  }
  function addLink(){const actions=document.querySelector('.header-actions'),buyer=readBuyer();if(buyer&&actions&&!actions.querySelector('[href="/notification"]'))actions.insertAdjacentHTML('afterbegin','<a class="notification-link" href="/notification">◌<small>Alerts</small></a>')}
  new MutationObserver(()=>{addLink();showNotifications()}).observe(document.querySelector('#app'),{childList:true,subtree:true});addLink();showNotifications();
})();
