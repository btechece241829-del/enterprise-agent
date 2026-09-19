/* Self-contained 3D projection: no external chart service or customer data transfer. */
(function(root){
  function trajectory(base,eligible,rate,progress){
    const nonnegative=x=>Number.isFinite(Number(x))?Math.max(0,Number(x)):0;
    base=nonnegative(base);eligible=nonnegative(eligible);
    rate=Math.min(1,nonnegative(rate));progress=Math.min(1,nonnegative(progress));
    const additional=eligible*rate*progress;
    return {progress:progress*100,recovered:base+additional,remaining:eligible-additional,additional};
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={trajectory};return;}
  const money=x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(x);
  const scenarios=[{name:'Conservative',rate:.2,color:'#5ec8df'},{name:'Planning',rate:.4,color:'#a6d992'},{name:'Optimistic',rate:.6,color:'#e6bb6c'}];
  class PredictionTrajectory extends HTMLElement {
    connectedCallback(){
      if(this.initialized)return;this.initialized=true;
      this.base=Number(this.dataset.base)||0;this.eligible=Number(this.dataset.eligible)||0;
      this.yaw=-.65;this.stage=1;
      this.innerHTML=`<div class="trajectory-top"><div><p class="eyebrow">RECOVERY OUTLOOK</p><h2>Now → projected trajectory</h2><p>One starting point. Three possible recovery paths.</p></div><span class="trajectory-tag">3D · Scenario model</span></div><div class="trajectory-legend"><span><i style="background:#ffffff"></i>Now</span>${scenarios.map(s=>`<span><i style="background:${s.color}"></i>${s.name} · ${s.rate*100}%</span>`).join('')}</div><svg class="trajectory-svg" viewBox="0 0 850 440" role="img" aria-label="Three-dimensional recovery projection. Horizontal axis: scenario progress. Depth: unresolved eligible order value. Vertical: observed plus projected reorder value."></svg><p class="trajectory-empty" ${this.eligible>0?'hidden':''}>No unresolved eligible order value. All scenario paths remain flat; no additional recovery is projected.</p><div class="trajectory-controls"><label>Rotate view<input type="range" min="-120" max="35" value="-37" data-rotation aria-label="Rotate three-dimensional chart"></label><label>Scenario progress <output data-stage>100%</output><input type="range" min="0" max="100" value="100" data-progress aria-label="Projected scenario progress"></label><button type="button" data-reset>Reset view</button></div><div class="trajectory-readout" aria-live="polite"></div><p class="trajectory-note">X: progress from now to scenario completion · Y: unresolved eligible value · Z: observed + projected reorder value (USD). Progress is a linear planning assumption, not elapsed days or a learned time forecast. Refund-selected cases are excluded. Reorder value is simulated and does not confirm settled revenue.</p><details class="trajectory-table"><summary>View exact scenario values</summary><div class="table-wrap"><table><thead><tr><th>Position</th><th>Progress</th><th>Additional value</th><th>Total reorder value</th><th>Remaining eligible value</th></tr></thead><tbody></tbody></table></div></details>`;
      this.querySelector('[data-rotation]').oninput=e=>{this.yaw=Number(e.target.value)*Math.PI/180;this.draw()};
      this.querySelector('[data-progress]').oninput=e=>{this.stage=Number(e.target.value)/100;this.draw()};
      this.querySelector('[data-reset]').onclick=()=>{this.yaw=-37*Math.PI/180;this.stage=1;this.querySelector('[data-rotation]').value=-37;this.querySelector('[data-progress]').value=100;this.draw()};
      this.draw();
    }
    draw(){
      const max=Math.max(1,this.base+this.eligible,this.eligible),c=Math.cos(this.yaw),s=Math.sin(this.yaw);
      const project=(x,y,z)=>{const a=(x-.5)*370,b=(y-.5)*280;return [425+a*c-b*s,300+(a*s+b*c)*.40-z*220]};
      const point=p=>project(p.progress/100,p.remaining/max,p.recovered/max);
      const line=(a,b,color,width=1,dash='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
      const text=(p,t,fill='#aac3b8',anchor='middle')=>`<text x="${p[0]}" y="${p[1]}" fill="${fill}" text-anchor="${anchor}" font-size="11" font-family="Manrope,Arial">${t}</text>`;
      let svg='<title>Current recovery position and three assumed future trajectories</title><desc>Use the rotation and progress sliders. An exact-value table is provided below.</desc>';
      for(let i=0;i<=4;i++){const f=i/4;svg+=line(project(f,0,0),project(f,1,0),'#2c4944');svg+=line(project(0,f,0),project(1,f,0),'#2c4944');svg+=text(project(f,-.12,0),`${i===0?'Now':i===4?'Projected':Math.round(f*100)+'%'}`);svg+=text(project(-.15,f,0),money(max*f));svg+=text(project(0,1,f).map((v,k)=>k===0?v-12:v),money(max*f),'#aac3b8','end');}
      const origin=project(0,0,0);svg+=line(origin,project(1,0,0),'#8ba99d',2);svg+=line(origin,project(0,1,0),'#8ba99d',2);svg+=line(project(0,1,0),project(0,1,1),'#8ba99d',2);
      svg+=text(project(.6,-.28,0),'Scenario progress');svg+=text(project(-.32,.6,0),'Unresolved USD');svg+=text(project(0,1,1.1),'Reorder value USD');
      scenarios.forEach(sc=>{
        const pts=Array.from({length:21},(_,i)=>point(trajectory(this.base,this.eligible,sc.rate,i/20)));
        svg+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${sc.color}" stroke-width="2" stroke-dasharray="5 5" opacity=".65"/>`;
        const selected=trajectory(this.base,this.eligible,sc.rate,this.stage),p=point(selected),start=point(trajectory(this.base,this.eligible,sc.rate,0));
        svg+=line(start,p,sc.color,3);svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${sc.color}"><title>${sc.name}: ${money(selected.recovered)} reorder value; ${money(selected.remaining)} remaining</title></circle>`;
      });
      const now=point(trajectory(this.base,this.eligible,0,0));svg+=`<circle cx="${now[0]}" cy="${now[1]}" r="7" fill="#fff" stroke="#183e34" stroke-width="3"/>`;svg+=text([now[0],now[1]-18],'NOW','#fff');
      this.querySelector('svg').innerHTML=svg;
      this.querySelector('[data-stage]').textContent=Math.round(this.stage*100)+'%';
      this.querySelector('.trajectory-readout').innerHTML=scenarios.map(sc=>{const p=trajectory(this.base,this.eligible,sc.rate,this.stage);return `<div><span style="color:${sc.color}">${sc.name}</span><b>${money(p.recovered)}</b><small>+${money(p.additional)} projected · ${money(p.remaining)} remaining</small></div>`}).join('');
      const exact=x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x);
      this.querySelector('tbody').innerHTML=[{name:'Now',rate:0,progress:0},...scenarios.map(sc=>({...sc,progress:this.stage}))].map(sc=>{const p=trajectory(this.base,this.eligible,sc.rate,sc.progress);return `<tr><td>${sc.name}</td><td>${Math.round(p.progress)}%</td><td>${exact(p.additional)}</td><td>${exact(p.recovered)}</td><td>${exact(p.remaining)}</td></tr>`}).join('');
    }
  }
  customElements.define('prediction-trajectory',PredictionTrajectory);
})(typeof window!=='undefined'?window:this);
