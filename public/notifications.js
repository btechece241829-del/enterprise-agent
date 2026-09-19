(() => {
  const readBuyer=()=>{try{return JSON.parse(localStorage.getItem('sentinelBuyerSession')||'null')}catch{return null}};
  const esc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const STEPS=[
    {label:'Detecting network failure',detail:'Packet loss / latency spike flagged at checkout',icon:'\uD83D\uDCE1',dur:900},
    {label:'Analysing risk profile',detail:'Sentinel classifying event severity',icon:'\uD83E\uDDE0',dur:1100},
    {label:'Executing reorder',detail:'Placing replacement order via secure channel',icon:'\u26A1',dur:1300},
    {label:'Confirming order',detail:'Verifying replacement order status',icon:'\u2705',dur:700},
  ];
  async function chooseRecovery(btn){
    const buyer=readBuyer(),action=btn.dataset.recoveryAction;
    btn.disabled=true;btn.textContent='Processing\u2026';
    try{
      const r=await fetch('/api/recovery/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+buyer.token},body:JSON.stringify({incidentId:btn.dataset.incidentId})});
      const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to process.');
      const root=document.querySelector('#app');delete root.dataset.notifications;showNotifications();
    }catch(e){btn.disabled=false;btn.textContent=action==='refund'?'Request refund':'Reorder';alert(e.message)}
  }
  function bindRecovery(root){root.querySelectorAll('[data-recovery-action]').forEach(b=>b.onclick=()=>chooseRecovery(b))}
  async function runAiReorder(card,incidentId,buyer){
    const stepsEl=card.querySelector('.ai-steps'),statusEl=card.querySelector('.ai-status-text');
    if(!stepsEl||!statusEl)return;
    for(let i=0;i<STEPS.length;i++){
      const el=stepsEl.children[i];if(!el)continue;
      el.classList.add('ai-step--active');
      statusEl.textContent=STEPS[i].label+'\u2026';
      await sleep(STEPS[i].dur);
      el.classList.remove('ai-step--active');el.classList.add('ai-step--done');
    }
    statusEl.textContent='Executing AI recovery\u2026';
    try{
      const r=await fetch('/api/recovery/network-reorder',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+buyer.token},body:JSON.stringify({incidentId})});
      const data=await r.json();if(!r.ok)throw Error(data.error||'Reorder failed');
      const rid=data.reorderOrderId,pN=esc(card.dataset.productName),oId=esc(card.dataset.orderId);
      card.classList.remove('ai-reorder-pending');card.classList.add('ai-reorder-done');
      card.innerHTML=
        '<div class="ai-reorder-done-inner"><div class="ai-done-badge">\u2713</div><div>'
        +'<div class="ai-done-header"><span class="status SAFE">\u2713 REORDERED</span><small>'+new Date().toLocaleString()+'</small></div>'
        +'<h2>Your order has been reordered</h2>'
        +'<p>A critical network failure interrupted your checkout. Sentinel Intelligence automatically re-placed your order and confirmed the replacement.</p>'
        +'<p class="ai-done-ids"><span><b>Product:</b> '+pN+'</span><span><b>Original order:</b> '+oId+'</span>'
        +'<span><b>New order:</b> <a href="/order/'+esc(rid)+'" class="reorder-link">'+esc(rid)+' \u2192</a></span></p>'
        +'<div class="ai-done-note"><span class="ai-brain">\uD83E\uDD16</span>'
        +'<p><b>Sentinel Intelligence:</b> AI recovery layer executed. Replacement order confirmed. No further action required.</p></div>'
        +'</div></div>';
      const banner=document.createElement('div');banner.className='reorder-toast';
      banner.innerHTML='<b>\u2713 Reorder confirmed</b> \u2014 Sentinel placed a new order for <b>'+pN+'</b>.';
      document.body.append(banner);setTimeout(()=>banner.remove(),5500);
    }catch(e){
      statusEl.textContent='Reorder failed: '+e.message;
      card.classList.add('ai-reorder-error');
      card.querySelectorAll('.ai-step--active').forEach(el=>{el.classList.remove('ai-step--active');el.classList.add('ai-step--error');});
    }
  }
  function bindAiReorders(root,buyer){
    root.querySelectorAll('.ai-reorder-pending[data-incident-id]').forEach(card=>{
      if(card.dataset.aiRunning)return;
      card.dataset.aiRunning='1';
      setTimeout(()=>runAiReorder(card,card.dataset.incidentId,buyer),800);
    });
  }
  function liveUpdates(){
    if(window.sentinelNotificationSocket||!['/notification','/notfication','/notifican'].includes(location.pathname))return;
    const socket=new WebSocket((location.protocol==='https:'?'wss':'ws')+'://'+location.host);
    window.sentinelNotificationSocket=socket;
    socket.onmessage=event=>{try{
      const msg=JSON.parse(event.data);
      if(!['/notification','/notfication','/notifican'].includes(location.pathname))return;
      if(msg.type==='data-updated'){const root=document.querySelector('#app');delete root.dataset.notifications;showNotifications();}
    }catch{}};
    socket.onclose=()=>{delete window.sentinelNotificationSocket};
  }
  function renderPendingCard(item){
    const steps=STEPS.map(s=>'<div class="ai-step"><span class="ai-step-icon">'+s.icon+'</span><div><b>'+esc(s.label)+'</b><small>'+esc(s.detail)+'</small></div></div>').join('');
    return '<article class="notification-card ai-reorder-pending" data-incident-id="'+esc(item.incidentId)+'" data-product-name="'+esc(item.productName)+'" data-order-id="'+esc(item.orderId)+'">'
      +'<div class="ai-reorder-header"><span class="status CRITICAL">\u26A0 CRITICAL NETWORK</span><small>'+new Date(item.timestamp).toLocaleString()+'</small></div>'
      +'<h2 class="ai-reorder-title">AI recovery in progress \u2014 '+esc(item.productName)+'</h2>'
      +'<p class="ai-reorder-sub">Critical network failure at checkout. Sentinel Intelligence is automatically re-placing your order now.</p>'
      +'<div class="ai-steps-panel">'
      +'<div class="ai-steps-label"><span class="ai-brain-spin">\uD83E\uDD16</span> <b>Sentinel Intelligence \u2014 Recovery Sequence</b></div>'
      +'<div class="ai-steps">'+steps+'</div>'
      +'<div class="ai-status-text">Initialising\u2026</div></div>'
      +'<p class="ai-reorder-ids"><b>Product:</b> '+esc(item.productName)+'&nbsp;&nbsp;<b>Original order:</b> '+esc(item.orderId)+'</p>'
      +'</article>';
  }
  function renderDoneCard(item){
    const done=item.status==='REORDER_CREATED';
    return '<article class="notification-card notification-reorder'+(done?' notification-reorder--success':'')+'">'
      +'<div><span class="status '+esc(item.severity)+'">'+(done?'\u2713 REORDERED':'REORDER UNAVAILABLE')+'</span><small>'+new Date(item.timestamp).toLocaleString()+'</small></div>'
      +'<h2>'+esc(item.title)+'</h2><p>'+esc(item.message)+'</p>'
      +'<p><b>Product:</b> '+esc(item.productName)+'<br><b>Original order:</b> '+esc(item.orderId)+(item.reorderOrderId?'<br><b>New order:</b> <a href="/order/'+esc(item.reorderOrderId)+'" class="reorder-link">'+esc(item.reorderOrderId)+' \u2192</a>':'')+'</p>'
      +'<div class="ai-done-note"><span class="ai-brain">\uD83E\uDD16</span><p><b>Sentinel Intelligence:</b> '+esc(item.aiMessage)+'</p></div>'
      +'</article>';
  }
  async function showNotifications(){
    const routes=['/notification','/notfication','/notifican'],route=location.pathname,root=document.querySelector('#app');
    if(!routes.includes(route)){if(root)delete root.dataset.notifications;return;}
    if(!root||root.dataset.notifications===route)return;
    root.dataset.notifications=route;liveUpdates();
    try{
      const buyer=readBuyer();if(!buyer)throw Error('Enter your name first to view your notifications.');
      const res=await fetch('/api/notifications',{headers:{Authorization:'Bearer '+buyer.token}});
      const data=await res.json();if(!res.ok)throw Error(data.error||'Unable to load notifications.');
      const renderCard=item=>{
        if(item.notificationType==='NETWORK_REORDER')return item.pending?renderPendingCard(item):renderDoneCard(item);
        return '<article class="notification-card"><div><span class="status '+esc(item.severity)+'">'+esc(item.status)+'</span><small>'+new Date(item.timestamp).toLocaleString()+'</small></div>'
          +'<h2>'+esc(item.title)+'</h2><p>'+esc(item.message)+'</p>'
          +'<p><b>Product:</b> '+esc(item.productName)+'<br><b>Order:</b> '+esc(item.orderId)+'<br><b>Payment:</b> '+esc(item.paymentStatus)+' \u00B7 <b>Status:</b> '+esc(item.orderStatus)+'</p>'
          +'<p class="notification-ai"><b>Sentinel recommendation:</b> '+esc(item.aiMessage)+'</p>'
          +(item.recoveryRequired?'<div class="recovery-actions"><button data-recovery-action="refund" data-incident-id="'+esc(item.incidentId)+'">Request refund</button><button class="secondary" data-recovery-action="reorder" data-incident-id="'+esc(item.incidentId)+'">Reorder</button></div>':'')
          +'</article>';
      };
      const empty='<div class="notification-empty"><h1>No notifications yet</h1><p>When you place an order, its status updates will appear here.</p></div>';
      const cards=data.notifications.length?data.notifications.map(renderCard).join(''):empty;
      root.innerHTML='<div class="notification-page"><header class="notification-header"><a href="/shop">NEXORA.</a><a href="/shop">Back to shop</a></header>'
        +'<main><p class="notification-eyebrow">YOUR ORDER UPDATES</p><h1>Notifications for '+esc(data.buyerName||buyer.name)+'</h1>'
        +'<p class="notification-summary">'+esc(data.summary)+'</p><section class="notification-list">'+cards+'</section></main></div>';
      bindRecovery(root);bindAiReorders(root,buyer);
    }catch(e){root.innerHTML='<div class="notification-page"><main><h1>Notifications unavailable</h1><p>'+esc(e.message)+'</p><a href="/welcome">Enter your name</a></main></div>';}
  }
  function addLink(){
    const a=document.querySelector('.header-actions'),b=readBuyer();
    if(b&&a&&!a.querySelector('[href="/notification"]'))a.insertAdjacentHTML('afterbegin','<a class="notification-link" href="/notification">\u25CC<small>Alerts</small></a>');
  }
  new MutationObserver(()=>{addLink();showNotifications()}).observe(document.querySelector('#app'),{childList:true,subtree:true});
  addLink();showNotifications();
})();
