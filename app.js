'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=(n,d=2)=>n.toLocaleString('es-MX',{minimumFractionDigits:d,maximumFractionDigits:d});
const usd=n=>(n>0?'+':'')+fmt(n)+' USD';
const cls=n=>n>0?'pos':n<0?'neg':'';
const buzz=(ms=8)=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TABS=['resumen','calendario','operaciones','par'], TIT={resumen:'Resumen',calendario:'Calendario',operaciones:'Operaciones',par:'Por par'};
const srv=s=>s.replace(/-/g,'.').replace('T',' '),mx=s=>s.slice(8,10)+'/'+s.slice(5,7)+' '+s.slice(11,16),sd=s=>s.slice(0,10).replace(/-/g,'.');
const hm=s=>s.slice(11,16), dmy=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let D,cal,chart,tab=0,F={sym:'all',res:'all',sort:'date-d'};
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),1800)}

/* ---------- datos ---------- */
async function load(fresh){
  const r=await fetch('data.json',{cache:fresh?'no-store':'no-cache'});if(!r.ok)throw new Error('HTTP '+r.status);
  D=await r.json();
  if(!cal){const last=D.trades.length?D.trades[D.trades.length-1].date_srv:new Date().toISOString();cal={y:+last.slice(0,4),m:+last.slice(5,7)-1}}
  renderAll();
}
function renderAll(){resumen();calendario();ops();par();enter(TABS[tab])}
load().catch(e=>{$('#resumen').innerHTML='<div class="card neg">Error cargando datos: '+esc(e.message)+'</div>'});

/* ---------- tabs + swipe ---------- */
function go(i,anim=true){i=Math.max(0,Math.min(3,i));const ch=i!==tab;tab=i;
  $('#track').style.transform=`translateX(${-i*25}%)`;$('#ind').style.transform=`translateX(${i*100}%)`;
  $$('nav button').forEach((b,j)=>b.classList.toggle('on',j===i));$('#title').textContent=TIT[TABS[i]];
  if(ch&&anim){buzz();enter(TABS[i])}if(i===0&&ch&&D)countUps();
  history.replaceState(history.state,'','#'+TABS[i]);
}
function enter(id){const v=$('#'+id);v.classList.remove('enter');void v.offsetWidth;v.classList.add('enter')}
$$('nav button').forEach((b,i)=>b.onclick=()=>go(i));
(()=>{const vp=$('#vp'),tr=$('#track');let sx,sy,dx,mode,w;
  vp.addEventListener('touchstart',e=>{if(e.touches.length>1)return;const t=e.touches[0];sx=t.clientX;sy=t.clientY;dx=0;mode=null;w=vp.clientWidth;
    if(e.target.closest('.calwrap,.chips,.chart'))mode='no'},{passive:true});
  vp.addEventListener('touchmove',e=>{if(mode==='no'||sx==null)return;const t=e.touches[0],x=t.clientX-sx,y=t.clientY-sy;
    if(!mode){if(Math.abs(x)>10&&Math.abs(x)>Math.abs(y)*1.3){mode='h';tr.classList.add('drag')}else if(Math.abs(y)>10)mode='v';else return}
    if(mode==='h'){dx=x;if((tab===0&&x>0)||(tab===3&&x<0))dx=x/3;tr.style.transform=`translateX(calc(${-tab*25}% + ${dx}px))`}},{passive:true});
  vp.addEventListener('touchend',()=>{if(mode==='h'){tr.classList.remove('drag');go(Math.abs(dx)>w*.22?tab+(dx<0?1:-1):tab)}sx=null;mode=null});
})();

/* ---------- pull to refresh ---------- */
(()=>{const p=$('#ptr'),sp=$('.spin',p);let y0=null,d=0,busy=false;
  $$('.view').forEach(v=>{
    v.addEventListener('touchstart',e=>{y0=(v.scrollTop<=0&&!busy)?e.touches[0].clientY:null;d=0},{passive:true});
    v.addEventListener('touchmove',e=>{if(y0==null)return;d=Math.max(0,e.touches[0].clientY-y0);if(d<=0)return;const k=Math.min(d/2,70);
      p.style.height=k+'px';sp.style.opacity=Math.min(1,k/60);sp.style.transform=`translateY(-10px) rotate(${d*3}deg)`;v.style.transform=`translateY(${k*.6}px)`},{passive:true});
    v.addEventListener('touchend',async()=>{if(y0==null)return;y0=null;v.style.transition='transform .3s';
      if(d/2>=60){busy=true;buzz(15);p.classList.add('go');p.style.height='60px';v.style.transform='translateY(36px)';
        try{await Promise.all([load(true),new Promise(r=>setTimeout(r,500))]);toast('Datos actualizados ✓')}catch(e){toast('Sin conexión · usando caché')}
        p.classList.remove('go');busy=false}
      p.style.height='0';sp.style.opacity=0;v.style.transform='';setTimeout(()=>v.style.transition='',300)});
  });
})();

/* ---------- count up ---------- */
function countUps(){$$('[data-cu]').forEach(el=>{const to=+el.dataset.cu,dec=+(el.dataset.dec??2),pre=el.dataset.pre||'',suf=el.dataset.suf||'',sign=el.dataset.sign==='1';
  const t0=performance.now(),dur=900;cancelAnimationFrame(el._r);
  const st=n=>pre+(sign&&n>0?'+':'')+fmt(n,dec)+suf;
  const f=()=>{const t=performance.now(),p=Math.max(0,Math.min(1,(t-t0)/dur)),e=1-Math.pow(1-p,3);el.textContent=st(to*e+(+(el.dataset.from||0))*(1-e));if(p<1)el._r=requestAnimationFrame(f)};el._r=requestAnimationFrame(f);clearTimeout(el._to);el._to=setTimeout(()=>{cancelAnimationFrame(el._r);el.textContent=st(to)},dur+150)})}

/* ---------- Resumen ---------- */
const crosshair={id:'xh',afterDraw(c){const a=c.tooltip&&c.tooltip.getActiveElements();if(!a||!a.length)return;const x=a[0].element.x,y=a[0].element.y,ar=c.chartArea,g=c.ctx;
  g.save();g.strokeStyle='rgba(209,212,220,.45)';g.setLineDash([4,4]);g.lineWidth=1;g.beginPath();g.moveTo(x,ar.top);g.lineTo(x,ar.bottom);g.moveTo(ar.left,y);g.lineTo(ar.right,y);g.stroke();
  g.setLineDash([]);g.fillStyle='#2962ff';g.beginPath();g.arc(x,y,5,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke();g.restore()}};
function resumen(){const s=D.summary,T=D.trades,W=T.filter(t=>t.net>0),L=T.filter(t=>t.net<=0),av=a=>a.length?a.reduce((x,t)=>x+t.profit,0)/a.length:0,P=T.map(t=>t.profit);
  const G={aw:av(W),al:av(L),best:Math.max(...P),worst:Math.min(...P)};
  const cu=(v,o={})=>`<span data-cu="${v}" data-dec="${o.dec??2}" data-pre="${o.pre||''}" data-suf="${o.suf||''}" data-sign="${o.sign?1:0}" data-from="${o.from||0}">${(o.sign&&v>0?'+':'')+fmt(v,o.dec??2)}${o.suf||''}</span>`;
  const m=(k,v,c='')=>`<div class="card press"><div class="k">${k}</div><div class="v ${c}">${v}</div></div>`;
  $('#resumen').innerHTML=`<div class="card"><div class="k">Balance (inicial ${fmt(s.start)})</div><div class="big">${cu(s.balance,{suf:' USD',from:s.start})}</div><div class="k">${s.trades} operaciones · ${D.account}</div>
   <div class="kv" style="margin-top:8px"><div><span>Profit</span><b class="${cls(s.gross)}">${cu(s.gross,{sign:1})}</b></div><div><span>Comisiones</span><b class="neg">${cu(s.commission)}</b></div>
   <div><span>Neto</span><b class="${cls(s.net)}">${cu(s.net,{sign:1})}</b></div><div><span>Balance</span><b>${cu(s.balance,{from:s.start})}</b></div></div>
   <div class="prog"><i style="background:var(--g)" data-w="${s.win_rate*100}"></i></div><div class="k" style="margin-top:4px">${s.wins} ganadas · ${s.losses} perdidas</div></div>
  <div class="grid">${m('Profit (bruto)',cu(s.gross,{sign:1,suf:' USD'})+`<div class="k">Neto ${usd(s.net)}</div>`,cls(s.gross))}${m('Win rate <small>(neto)</small>',cu(s.win_rate*100,{dec:1,suf:'%'}))}
  ${m('Profit factor <small>(neto)</small>',s.profit_factor==null?'—':cu(s.profit_factor))}${m('Max drawdown',cu(-s.max_dd)+' <small>('+fmt(s.max_dd_pct)+'%)</small>','neg')}
  ${m('Ganancia media',cu(G.aw,{sign:1})+`<div class="k">Neto ${usd(s.avg_win)}</div>`,'pos')}${m('Pérdida media',cu(G.al)+`<div class="k">Neto ${usd(s.avg_loss)}</div>`,'neg')}
  ${m('Mejor / peor',`<span class="pos">${usd(G.best).replace(' USD','')}</span> / <span class="neg">${fmt(G.worst)}</span><div class="k">Neto ${fmt(s.best)} / ${fmt(s.worst)}</div>`)}${m('Comisiones',cu(s.commission),'neg')}</div>
  <div class="card"><div class="tc"><div class="k">Curva de balance</div><div class="k" id="cinfo">Toca y arrastra</div></div><div class="chart"><canvas id="bc"></canvas></div></div>`;
  countUps();setTimeout(()=>$$('#resumen .prog i').forEach(i=>i.style.width=i.dataset.w+'%'),50);
  if(!window.Chart)return;if(chart)chart.destroy();
  const C=D.curve;let lastIdx=-1;
  chart=new Chart($('#bc'),{type:'line',plugins:[crosshair],data:{labels:C.map((c,i)=>i?'#'+i:'Inicio'),
    datasets:[{data:C.map(c=>c.balance),borderColor:'#2962ff',borderWidth:2.5,fill:true,tension:.25,pointRadius:3,pointHoverRadius:0,
      backgroundColor:ctx=>{const a=ctx.chart.chartArea;if(!a)return'rgba(41,98,255,.15)';const g=ctx.chart.ctx.createLinearGradient(0,a.top,0,a.bottom);g.addColorStop(0,'rgba(41,98,255,.35)');g.addColorStop(1,'rgba(41,98,255,0)');return g},
      pointBackgroundColor:C.map((c,i)=>i?(c.balance>=C[i-1].balance?'#26a69a':'#ef5350'):'#787b86'),pointBorderWidth:0},
      {data:C.map(()=>D.summary.start),borderColor:'rgba(120,123,134,.5)',borderDash:[5,5],borderWidth:1,pointRadius:0,fill:false}]},
    options:{maintainAspectRatio:false,animation:{duration:1100,easing:'easeOutQuart'},interaction:{mode:'index',intersect:false,axis:'x'},
      events:['mousemove','mouseout','click','touchstart','touchmove','touchend'],
      onHover:(e,a)=>{if(a.length&&a[0].index!==lastIdx){lastIdx=a[0].index;buzz(4);const c=C[lastIdx],d=lastIdx?c.balance-C[lastIdx-1].balance:0;
        $('#cinfo').innerHTML=lastIdx?`#${c.ticket} <span class="${cls(c.profit)}">${usd(c.profit)}</span> <small>neto ${usd(d)}</small>`:'Inicio'}},
      onClick:(e,a)=>{if(a.length&&C[a[0].index].ticket)detail(C[a[0].index].ticket)},
      plugins:{legend:{display:false},tooltip:{filter:i=>i.datasetIndex===0,backgroundColor:'#2a2e39',displayColors:false,padding:8,
        callbacks:{title:it=>{const c=C[it[0].dataIndex];return c.ticket?c.label:'Inicio'},label:it=>fmt(it.parsed.y)+' USD'}}},
      scales:{x:{ticks:{color:'#787b86',maxTicksLimit:7},grid:{color:'#2a2e39'}},y:{ticks:{color:'#787b86',callback:v=>fmt(v,0)},grid:{color:'#2a2e39'}}}}});
  $('#bc').addEventListener('touchend',()=>setTimeout(()=>{chart.setActiveElements([]);chart.tooltip.setActiveElements([]);chart.update('none');$('#cinfo').textContent='Toca y arrastra';lastIdx=-1},1200));
}

/* ---------- Calendario ---------- */
function byDay(){const m={};D.trades.forEach(t=>(m[t.date_srv]=m[t.date_srv]||[]).push(t));return m}
function calendario(dir){const v=$('#calendario');
  if(!v.querySelector('.calwrap')){v.innerHTML=`<div class="cal-h"><button class="ib" id="pm">‹</button><div style="text-align:center"><b id="mt"></b><br><small id="ms"></small></div><button class="ib" id="nm">›</button></div>
    <div class="calwrap card" style="padding:8px"><div class="cal"></div></div><div id="wk"></div><p class="k" style="text-align:center">Fecha servidor MT5 (GMT+3) · grande = Profit, N = neto (color por neto)<br>Desliza para cambiar de mes · toca un día</p>`;
    $('#pm').onclick=()=>month(-1);$('#nm').onclick=()=>month(1);
    const w=$('.calwrap',v);let sx,sy;w.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
    w.addEventListener('touchend',e=>{const t=e.changedTouches[0],dx=t.clientX-sx;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(t.clientY-sy)*1.5)month(dx<0?1:-1)});}
  const bd=byDay(),{y,m}=cal,first=(new Date(y,m,1).getDay()+6)%7,n=new Date(y,m+1,0).getDate(),today=new Date().toISOString().slice(0,10);
  let h='',tot=0,gt=0,cnt=0,wd=0,ld=0;['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].forEach(d=>h+=`<div class="dn">${d}</div>`);
  for(let i=0;i<first;i++)h+='<div class="day x"></div>';
  for(let d=1;d<=n;d++){const k=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,ts=bd[k];let c='',inner='';
    if(ts){const net=ts.reduce((a,t)=>a+t.net,0),gp=ts.reduce((a,t)=>a+t.profit,0);tot+=net;gt+=gp;cnt+=ts.length;net>=0?wd++:ld++;c=net>=0?'g':'r';inner=`<span class="${cls(gp)}" style="font-weight:600">${(gp>0?'+':'')+fmt(gp,0)}</span><span class="k" style="font-size:9px">N ${(net>0?'+':'')+fmt(net,0)}</span><span class="n">${ts.length} op</span>`}
    h+=`<div class="day ${c} ${k===today?'today':''}" style="animation-delay:${(first+d)*12}ms" ${ts?`data-k="${k}"`:''}><b>${d}</b>${inner}</div>`}
  const g=$('.cal',v),put=()=>{g.innerHTML=h;$('#mt').textContent=MESES[m]+' '+y;$('#ms').innerHTML=cnt?`<span class="${cls(gt)}">Profit ${usd(gt)}</span> · <span class="${cls(tot)}">Neto ${usd(tot)}</span> · ${cnt} op`:'Sin operaciones';
    $('#wk').innerHTML=cnt?`<div class="grid"><div class="card"><div class="k">Días verdes</div><div class="v pos">${wd}</div></div><div class="card"><div class="k">Días rojos</div><div class="v neg">${ld}</div></div></div>`:'';
    $$('.day[data-k]',g).forEach(e=>e.onclick=()=>{buzz();daySheet(e.dataset.k)})};
  if(!dir)return put();
  g.className='cal out-'+(dir>0?'l':'r');setTimeout(()=>{put();g.className='cal pre-'+(dir>0?'l':'r');void g.offsetWidth;g.className='cal'},220);
}
function month(d){buzz();cal.m+=d;if(cal.m<0){cal.m=11;cal.y--}if(cal.m>11){cal.m=0;cal.y++}calendario(d)}
function daySheet(k){const ts=byDay()[k]||[],net=ts.reduce((a,t)=>a+t.net,0),gp=ts.reduce((a,t)=>a+t.profit,0),cm=ts.reduce((a,t)=>a+t.commission,0);
  $('#daySheet .sc').innerHTML=`<div class="tc" style="margin-bottom:10px"><div><b style="font-size:18px">${sd(k)}</b><div class="k">${ts.length} operaciones · servidor MT5</div></div><div style="text-align:right"><div class="v ${cls(gp)}">${usd(gp)}</div><div class="k">Comisión ${fmt(cm)} · Neto <b class="${cls(net)}">${usd(net)}</b></div></div></div>`+ts.map(card).join('');
  bindCards('#daySheet');openSheet('#daySheet');
}

/* ---------- sheets ---------- */
const stack=[];
function openSheet(id){const s=$(id);s.classList.add('open');$('#backdrop').classList.add('on');if(!stack.includes(id)){stack.push(id);history.pushState({s:stack.length},'')}$('.sc',s).scrollTop=0}
function closeTop(fromPop){const id=stack.pop();if(!id)return;$(id).classList.remove('open');if(!stack.length)$('#backdrop').classList.remove('on');if(!fromPop)history.back()}
window.addEventListener('popstate',()=>{if(stack.length)closeTop(true)});
$('#backdrop').onclick=()=>closeTop();
$$('.sheet').forEach(s=>{let y0=null,d=0;const sc=$('.sc',s);
  s.addEventListener('touchstart',e=>{if(e.touches.length>1||e.target.closest('.zoom'))return;if(e.target.closest('.grab')||sc.scrollTop<=0){y0=e.touches[0].clientY;d=0}},{passive:true});
  s.addEventListener('touchmove',e=>{if(y0==null)return;d=e.touches[0].clientY-y0;if(d>0){s.classList.add('drag');s.style.transform=`translateY(${d}px)`}else if(!e.target.closest('.grab'))y0=null},{passive:true});
  s.addEventListener('touchend',()=>{if(y0==null)return;y0=null;s.classList.remove('drag');s.style.transform='';if(d>110){buzz();closeTop()}});
});

/* ---------- Operaciones ---------- */
function card(t){return `<div class="card tc press" data-t="${t.ticket}"><div class="bar" style="background:${t.net>0?'var(--g)':t.net<0?'var(--r)':'var(--mut)'}"></div><div style="flex:1"><span class="s">${t.symbol}</span><span class="tag ${t.type}">${t.type==='buy'?'Compra':'Venta'}</span>
 <div class="k">${t.volume} lotes · ${t.close_srv}</div><div class="k" style="font-size:10px">CDMX ${mx(t.close_mx)} · ${t.duration}</div></div><div style="text-align:right"><div class="v ${cls(t.profit)}" style="font-size:16px">${usd(t.profit)}</div><div class="k" style="font-size:11px">Neto <span class="${cls(t.net)}">${usd(t.net)}</span></div></div></div>`}
function bindCards(sc){$$(sc+' .tc[data-t]').forEach(e=>e.onclick=()=>{buzz();detail(+e.dataset.t)})}
function ops(){const v=$('#operaciones'),syms=[...new Set(D.trades.map(t=>t.symbol))].sort();
  const chip=(g,val,l)=>`<button class="chip ${F[g]===val?'on':''}" data-g="${g}" data-val="${val}">${l}</button>`;
  let L=D.trades.filter(t=>(F.sym==='all'||t.symbol===F.sym)&&(F.res==='all'||(F.res==='w'?t.net>0:t.net<=0)));const by=a=>a.close_srv;
  const S={'date-d':(a,b)=>by(b).localeCompare(by(a)),'date-a':(a,b)=>by(a).localeCompare(by(b)),'net-d':(a,b)=>b.profit-a.profit,'net-a':(a,b)=>a.profit-b.profit,'lot-d':(a,b)=>b.volume-a.volume};
  L=[...L].sort(S[F.sort]);const net=L.reduce((a,t)=>a+t.net,0),gp=L.reduce((a,t)=>a+t.profit,0);
  v.innerHTML=`<div class="chips">${chip('sym','all','Todos los pares')}${syms.map(s=>chip('sym',s,s)).join('')}</div>
  <div class="chips">${chip('res','all','Todas')}${chip('res','w','✅ Ganadas')}${chip('res','l','❌ Perdidas')}</div>
  <div class="ophead"><span>${L.length} op · <b class="${cls(gp)}">${usd(gp)}</b> <small class="k">neto ${usd(net)}</small></span><select id="sort">
  ${[['date-d','Más recientes'],['date-a','Más antiguas'],['net-d','Mayor profit'],['net-a','Menor profit'],['lot-d','Más lotes']].map(([k,l])=>`<option value="${k}" ${F.sort===k?'selected':''}>${l}</option>`).join('')}</select></div>
  <div id="ol">${L.map(card).join('')||'<p class="empty" style="text-align:center">Sin operaciones con estos filtros</p>'}</div>`;
  $$('.chip',v).forEach(c=>c.onclick=()=>{buzz();F[c.dataset.g]=c.dataset.val;const sl=v.querySelector('.chips').scrollLeft;ops();v.querySelector('.chips').scrollLeft=sl;anim('#ol')});
  $('#sort').onchange=e=>{F.sort=e.target.value;ops();anim('#ol')};bindCards('#operaciones');
}
function anim(sel){$$(sel+'>*').forEach((e,i)=>{e.style.animation='none';void e.offsetWidth;e.style.animation=`rise .35s var(--ease) ${i*25}ms both`})}

/* ---------- detalle + pinch zoom ---------- */
function detail(tk){const t=D.trades.find(x=>x.ticket===tk);if(!t)return;const p=v=>v.toFixed(t.digits),f=(k,v,c='')=>`<div><span>${k}</span><b class="${c}">${v}</b></div>`;
  $('#detail .sc').innerHTML=`<div class="tc"><div><h2 style="margin:0">${t.symbol} <span class="tag ${t.type}">${t.type==='buy'?'Compra':'Venta'}</span></h2><div class="k">#${t.ticket} · ${t.open_srv.slice(0,10)}</div></div><button class="ib" id="cls">✕</button></div>
  <div class="k" style="margin-top:6px">Profit</div><div class="big ${cls(t.profit)}">${usd(t.profit)}</div><div class="k" style="margin-bottom:8px">Comisión ${fmt(t.commission)} · Neto <b class="${cls(t.net)}">${usd(t.net)}</b></div>
  ${[[t.image,'M5'],[t.image_m1,'M1 (zoom)']].map(([src,lb])=>src?`<div class="clabel">${lb}</div><div class="zoom"><img src="${src}" alt="Gráfico ${lb} ${t.ticket}" draggable="false" loading="lazy"><span class="hint">Pellizca / doble toque</span></div>`:`<div class="clabel">${lb}</div><div class="card empty">Sin gráfico ${lb}</div>`).join('')}
  <div class="card kv" style="margin-top:10px">${f('Entrada',p(t.open_price))}${f('Salida',p(t.close_price))}
  ${f('Hora apertura',t.open_srv+`<br><small class="k">CDMX ${mx(t.open_mx)}</small>`)}${f('Hora cierre',t.close_srv+`<br><small class="k">CDMX ${mx(t.close_mx)}</small>`)}
  ${f('Stop loss',p(t.sl),'neg')}${f('Take profit',p(t.tp),'pos')}${f('Lotes',t.volume)}${f('Duración',t.duration)}
  ${f('Pips',t.pips,cls(t.pips))}${f('R:R plan',t.rr?'1:'+t.rr:'N/A (SL en ganancia)')}${f('Profit bruto',usd(t.profit),cls(t.profit))}${f('Comisión',usd(t.commission),'neg')}</div>
  <div class="card"><div class="k">Motivo de entrada</div><div class="note ${t.motivo?'':'empty'}">${esc(t.motivo)||'Sin anotar'}</div></div>
  <div class="card"><div class="k">Qué pensaba</div><div class="note ${t.pensaba?'':'empty'}">${esc(t.pensaba)||'Sin anotar'}</div></div>
  <div class="k" style="text-align:center">Horas principales: servidor MT5 (GMT+3) · secundarias: hora CDMX (UTC-6)</div>`;
  $('#cls').onclick=()=>closeTop();$$('#detail .zoom').forEach(pinch);openSheet('#detail');
}
function pinch(box){const img=$('img',box);let s=1,x=0,y=0,pts=new Map(),st=null,lastTap=0;
  const clamp=()=>{const w=box.clientWidth,h=box.clientHeight;s=Math.min(5,Math.max(1,s));x=Math.min(0,Math.max(w-w*s,x));y=Math.min(0,Math.max(h-h*s,y))};
  const apply=()=>{img.style.transform=`translate(${x}px,${y}px) scale(${s})`;$('.hint',box).style.opacity=s>1?0:1};
  const rel=e=>{const r=box.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
  box.addEventListener('pointerdown',e=>{box.setPointerCapture(e.pointerId);pts.set(e.pointerId,rel(e));img.classList.add('live');
    if(pts.size===1){const n=Date.now();if(n-lastTap<300){img.classList.remove('live');const p=rel(e);if(s>1){s=1;x=y=0}else{s=2.5;x=p.x-p.x*s;y=p.y-p.y*s}clamp();apply();buzz();lastTap=0;return}lastTap=n}
    st={s,x,y,pts:new Map([...pts].map(([k,v])=>[k,{...v}]))}});
  box.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)||!st)return;pts.set(e.pointerId,rel(e));const a=[...pts.values()],b=[...st.pts.values()];
    if(a.length>=2&&b.length>=2){const d0=Math.hypot(b[0].x-b[1].x,b[0].y-b[1].y),d1=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),c0={x:(b[0].x+b[1].x)/2,y:(b[0].y+b[1].y)/2},c1={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};
      s=st.s*d1/d0;const k=s/st.s;x=c1.x-(c0.x-st.x)*k;y=c1.y-(c0.y-st.y)*k}
    else if(st.s>1){const k=[...st.pts.keys()][0],p0=st.pts.get(k),p1=pts.get(k);if(p0&&p1){x=st.x+p1.x-p0.x;y=st.y+p1.y-p0.y}}
    clamp();apply()});
  const up=e=>{pts.delete(e.pointerId);img.classList.remove('live');st={s,x,y,pts:new Map([...pts].map(([k,v])=>[k,{...v}]))}};
  box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);
}

/* ---------- Por par ---------- */
function par(){const g={};D.trades.forEach(t=>(g[t.symbol]=g[t.symbol]||[]).push(t));
  const rows=Object.entries(g).map(([s,ts])=>{const w=ts.filter(t=>t.net>0),l=ts.filter(t=>t.net<=0),sum=a=>a.reduce((x,t)=>x+t.net,0);
    return{s,n:ts.length,wr:w.length/ts.length,gross:ts.reduce((a,t)=>a+t.profit,0),com:ts.reduce((a,t)=>a+t.commission,0),net:sum(ts),pf:l.length&&sum(l)?sum(w)/-sum(l):null,lots:ts.reduce((a,t)=>a+t.volume,0)}}).sort((a,b)=>b.gross-a.gross);
  const mxv=Math.max(...rows.map(r=>Math.abs(r.gross)),1);
  $('#par').innerHTML=rows.map(r=>`<div class="card press" data-s="${r.s}"><div class="tc"><span class="s">${r.s}</span><div style="text-align:right"><div class="v ${cls(r.gross)}" style="font-size:17px">${usd(r.gross)}</div><div class="k">Neto <span class="${cls(r.net)}">${usd(r.net)}</span></div></div></div>
   <div class="prog"><i style="background:${r.net>=0?'var(--g)':'var(--r)'}" data-w="${Math.abs(r.gross)/mxv*100}"></i></div>
   <div class="kv" style="margin-top:8px"><div><span>Operaciones</span>${r.n}</div><div><span>Win rate</span>${fmt(r.wr*100,0)}%</div>
   <div><span>Neto</span><b class="${cls(r.net)}">${usd(r.net)}</b></div><div><span>Comisión</span><b class="neg">${usd(r.com)}</b></div>
   <div><span>Profit factor</span>${r.pf==null?'—':fmt(r.pf)}</div><div><span>Lotes</span>${fmt(r.lots)}</div></div></div>`).join('')+'<p class="k" style="text-align:center">Toca un par para ver sus operaciones</p>';
  setTimeout(()=>$$('#par .prog i').forEach(i=>i.style.width=i.dataset.w+'%'),80);
  $$('#par [data-s]').forEach(c=>c.onclick=()=>{F.sym=c.dataset.s;F.res='all';ops();go(2)});
}

/* ---------- init ---------- */
{const i=TABS.indexOf(location.hash.slice(1));if(i>0)go(i,false)}
addEventListener('resize',()=>chart&&chart.resize());
if('serviceWorker' in navigator){const _hc=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('sw.js').then(r=>r.update());let _r=0;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!_r&&!window.__hr&&_hc){_r=1;location.reload()}})}

/* ---------- botón actualizar (forzar última versión) ---------- */
$('#refresh').onclick=async()=>{const b=$('#refresh');if(b.classList.contains('spin'))return;b.classList.add('spin');buzz(12);window.__hr=1;
  const t0=Date.now(),lim=(p,ms=2500)=>Promise.race([Promise.resolve(p).catch(()=>{}),new Promise(r=>setTimeout(r,ms))]);
  if('serviceWorker' in navigator)await lim(navigator.serviceWorker.getRegistrations().then(rs=>Promise.all(rs.map(r=>lim(r.update(),1500).then(()=>r.unregister()))))); // quitar SW
  if(window.caches)await lim(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))))); // borrar cachés
  await lim(Promise.all(['./','index.html','app.js','style.css','data.json','manifest.json','sw.js'].map(f=>fetch(f+'?v='+t0,{cache:'reload'}).then(()=>fetch(f,{cache:'reload'})).catch(()=>{}))),4000); // refrescar caché HTTP
  await new Promise(r=>setTimeout(r,Math.max(0,700-(Date.now()-t0))));
  try{sessionStorage.setItem('tj-updated','1')}catch(e){}
  const u=new URL(location.href);u.searchParams.set('v',Date.now());location.replace(u.toString());
};
try{if(sessionStorage.getItem('tj-updated')){sessionStorage.removeItem('tj-updated');setTimeout(()=>toast('Actualizado ✓'),400);
  const u=new URL(location.href);if(u.searchParams.has('v')){u.searchParams.delete('v');history.replaceState(history.state,'',u.toString())}}}catch(e){}
