(() => {
  let savedAnswer='',savedQuestion='',savedSession='';
  const safeJson=v=>{try{return JSON.parse(v||'null')}catch{return null}},esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),headers=()=>({Authorization:`Bearer ${safeJson(localStorage.getItem('sentinelAdminSession'))?.token||''}`}),evidence=l=>(Array.isArray(l)?l:[]).map(esc).join('<br>');
  const incidentCard=i=>`<article class="intel-card"><div><span class="status ${esc(i.severity)}">${esc(i.severity)}</span><b>${esc(i.priority)}</b></div><h2>${esc(i.title)}</h2><p>${esc(i.probableRootCause)}</p><p><b>Impact:</b> ${esc(i.businessImpact)} · <b>Confidence:</b> ${Math.round((+i.confidence||0)*100)}%</p><p><b>Evidence</b><br>${evidence(i.evidence)}</p><p><b>Recommendation:</b> ${esc(i.recommendedAction)}</p><p><b>Policy:</b> ${esc(i.executionMode)} (${esc(i.riskLevel)} risk)</p></article>`;
  const lessonCard=l=>`<article class="intel-card intel-learning-card"><div><span class="status SAFE">LEARNED</span><b>${Math.round((+l.confidence||0)*100)}%</b></div><h2>${esc(l.category)}</h2><p>${esc(l.pattern)}</p><p><b>Evidence base:</b> ${esc(l.observations)} observed incident(s)</p><p><b>Observed outcome:</b> ${esc(l.outcome)}</p><p><b>Future action:</b> ${esc(l.recommendedAction)}</p></article>`;
  async function load(){
    if(location.pathname!=='/dashboard/intelligence')return;
    const main=document.querySelector('.dash-main');if(!main||main.dataset.intelligence===location.pathname)return;main.dataset.intelligence=location.pathname;
    try{
      const response=await fetch('/api/intelligence',{headers:headers()}),data=await response.json();if(!response.ok)throw Error(data.error||'Unable to load intelligence.');
      const incidents=Array.isArray(data.incidents)&&data.incidents.length?data.incidents.map(incidentCard).join(''):'<article class="intel-card"><h2>No active incidents</h2><p>There is insufficient critical evidence to create an incident.</p></article>';
      const lessons=data.learning?.lessons?.length?data.learning.lessons.map(lessonCard).join(''):'<article class="intel-card"><h2>Learning in progress</h2><p>Sentinel will create patterns after payment or network incidents are recorded.</p></article>';
      main.innerHTML=`<h1>Incident Intelligence</h1><p class="intel-sub">${data.provider==='GROQ'?'Groq GPT-OSS 20B receives current incidents and learned local patterns for grounded analysis.':'Groq is unavailable until GROQ_API_KEY is configured; deterministic learning remains active.'}</p><section class="intel-summary"><b>${esc(data.summary)}</b><span>Provider: ${esc(data.provider)} · Model: ${esc(data.model)} · Learning samples: ${esc(data.learning?.samples||0)}</span></section><h2>Learned patterns</h2><section class="intel-grid">${lessons}</section><h2>Active incidents</h2><section class="intel-grid">${incidents}</section><section class="intel-chat"><h2>Ask Sentinel Intelligence</h2><p>Answers are grounded in current logs, orders, and learned incident patterns.</p><div id="intel-answer"></div><form id="intel-form"><input id="intel-question" required maxlength="2000" placeholder="What did Sentinel learn from recent checkout failures?"><button>Ask Groq</button></form></section>`;
      if(savedSession===headers().Authorization){main.querySelector('#intel-answer').innerHTML=savedAnswer;main.querySelector('#intel-question').value=savedQuestion;}
      main.querySelector('#intel-answer').setAttribute('aria-live','polite');
      main.querySelector('#intel-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button'),out=main.querySelector('#intel-answer'),question=main.querySelector('#intel-question').value.trim();if(!question)return;savedQuestion=question;savedSession=headers().Authorization;out.textContent='Analyzing your question…';button.disabled=true;button.textContent='Analyzing…';try{const response=await fetch('/api/intelligence/chat',{method:'POST',headers:{'Content-Type':'application/json',...headers()},body:JSON.stringify({question})}),answer=await response.json();if(!response.ok)throw Error(answer.error||'Intelligence request failed.');out.innerHTML=`<article><b>${esc(answer.provider)} / ${esc(answer.model)}</b><h3>${esc(answer.answer)}</h3><p><b>Evidence:</b><br>${evidence(answer.evidence)}</p><p><b>Recommended action:</b> ${esc(answer.recommendedAction)}<br><b>Risk:</b> ${esc(answer.riskLevel)} · Approval required: ${answer.approvalRequired?'Yes':'No'}</p></article>`}catch(error){out.innerHTML=`<p class="intel-error">${esc(error.message)}</p>`}finally{savedAnswer=out.innerHTML;button.disabled=false;button.textContent='Ask Groq'}};
    }catch(error){main.innerHTML=`<h1>Incident Intelligence</h1><p class="intel-error">${esc(error.message)}</p>`}
  }
  function link(){const side=document.querySelector('.dash-side');if(side&&!side.querySelector('[href="/dashboard/intelligence"]'))side.insertAdjacentHTML('beforeend','<a href="/dashboard/intelligence">Intelligence</a>')}
  window.addEventListener('intelligence-data-updated',()=>{
    const main=document.querySelector('.dash-main');
    if(!main||location.pathname!=='/dashboard/intelligence'||main.querySelector('.intel-refresh'))return;
    const button=document.createElement('button');
    button.className='intel-refresh';button.type='button';button.textContent='New activity — refresh incident analysis';
    button.onclick=()=>{if(main.querySelector('#intel-form button')?.disabled)return;delete main.dataset.intelligence;load()};
    main.querySelector('.intel-summary')?.after(button);
  });
  new MutationObserver(()=>{link();load()}).observe(document.querySelector('#app'),{childList:true,subtree:true});link();load();
})();
