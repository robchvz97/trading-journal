'use strict';
const $=s=>document.querySelector(s);
const fmt=(n,d=2)=>n.toLocaleString('es-MX',{minimumFractionDigits:d,maximumFractionDigits:d});
const usd=n=>(n>0?'+':'')+fmt(n)+' USD';
const cls=n=>n>0?'pos':n<0?'neg':'';
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TIT={resumen:'Resumen',calendario:'Calendario',operaciones:'Operaciones',par:'Por par'};
let D,cal,chart;
const hm=s=>s.slice(11,16), dmy=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

fetch('data.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{D=d;
  const last=d.trades.length?d.trades[d.trades.length-1].date:new Date().toISOString();
  cal={y:+last.slice(0,4),m:+last.slice(5,7)-1,sel:null};
  resumen();calendario();ops();par();
}).catch(e=>{$('main').innerHTML='<div class="card neg">Error cargando datos: '+esc(e)+'</div>'});

document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===b.dataset.v));
  $('#title').textContent=TIT[b.dataset.v];window.scrollTo(0,0);if(chart)chart.resize();
});

function resumen(){const s=D.summary;
  const m=(k,v,c='')=>`<div class="card"><div class="k">${k}</div><div class="v ${c}">${v}</div></div>`;
  $('#resumen').innerHTML=`<div class="card"><div class="k">Balance (inicial ${fmt(s.start)})</div><div class="big">${fmt(s.balance)} USD</div><div class="${cls(s.net)}">${usd(s.net)} · ${s.trades} operaciones</div></div>
  <div class="grid">${m('Neto',usd(s.net),cls(s.net))}${m('Win rate',fmt(s.win_rate*100,1)+'%')}
  ${m('Profit factor',s.profit_factor==null?'—':fmt(s.profit_factor))}${m('Max drawdown','-'+fmt(s.max_dd)+' <small>('+fmt(s.max_dd_pct)+'%)</small>','neg')}
  ${m('Ganancia media',usd(s.avg_win),'pos')}${m('Pérdida media',usd(s.avg_loss),'neg')}
  ${m('Ganadas / Perdidas',s.wins+' / '+s.losses)}${m('Comisiones',usd(s.commission),'neg')}</div>
  <div class="card" style="margin-top:10px"><div class="k">Curva de balance</div><div class="chart"><canvas id="bc"></canvas></div></div>`;
  if(!window.Chart)return;
  chart=new Chart($('#bc'),{type:'line',data:{labels:D.curve.map((c,i)=>i?'#'+i:'Inicio'),
    datasets:[{data:D.curve.map(c=>c.balance),borderColor:'#2962ff',backgroundColor:'rgba(41,98,255,.15)',fill:true,tension:.2,pointRadius:3,
      pointBackgroundColor:D.curve.map((c,i)=>i?(c.balance>=D.curve[i-1].balance?'#26a69a':'#ef5350'):'#787b86')}]},
    options:{maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{title:it=>{const c=D.curve[it[0].dataIndex];return c.ticket?'#'+c.ticket+' · '+dmy(c.label)+' '+hm(c.label):'Inicio'},label:it=>fmt(it.parsed.y)+' USD'}}},
      scales:{x:{ticks:{color:'#787b86',maxTicksLimit:8},grid:{color:'#2a2e39'}},y:{ticks:{color:'#787b86'},grid:{color:'#2a2e39'}}}}});
}

function byDay(){const m={};D.trades.forEach(t=>{(m[t.date]=m[t.date]||[]).push(t)});return m}
function calendario(){const bd=byDay(),{y,m}=cal;
  const first=(new Date(y,m,1).getDay()+6)%7, n=new Date(y,m+1,0).getDate();
  let cells='',tot=0,cnt=0;
  ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].forEach(d=>cells+=`<div class="dn">${d}</div>`);
  for(let i=0;i<first;i++)cells+='<div class="day x"></div>';
  for(let d=1;d<=n;d++){const k=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,ts=bd[k];
    let c='',inner='';if(ts){const net=ts.reduce((a,t)=>a+t.net,0);tot+=net;cnt+=ts.length;c=net>=0?'g':'r';
      inner=`<span class="${cls(net)}">${(net>0?'+':'')+fmt(net,0)}</span><span class="n">${ts.length} op</span>`}
    cells+=`<div class="day ${c} ${cal.sel===k?'sel':''}" data-k="${k}"><b>${d}</b>${inner}</div>`}
  let list='';if(cal.sel&&bd[cal.sel]){list=`<div class="k" style="margin:12px 0 6px">${dmy(cal.sel)}</div>`+bd[cal.sel].map(card).join('')}
  else list='<p class="empty" style="text-align:center">Toca un día con operaciones</p>';
  $('#calendario').innerHTML=`<div class="cal-h"><button id="pm">‹</button><div style="text-align:center"><b>${MESES[m]} ${y}</b><br><small class="${cls(tot)}">${cnt?usd(tot)+' · '+cnt+' op':'Sin operaciones'}</small></div><button id="nm">›</button></div>
  <div class="cal">${cells}</div>${list}`;
  $('#pm').onclick=()=>{cal.m--;if(cal.m<0){cal.m=11;cal.y--}cal.sel=null;calendario()};
  $('#nm').onclick=()=>{cal.m++;if(cal.m>11){cal.m=0;cal.y++}cal.sel=null;calendario()};
  document.querySelectorAll('#calendario .day[data-k]').forEach(e=>e.onclick=()=>{cal.sel=e.dataset.k;calendario()});
  bindCards('#calendario');
}

function card(t){return `<div class="card tc" data-t="${t.ticket}"><div><span class="s">${t.symbol}</span><span class="tag ${t.type}">${t.type==='buy'?'Compra':'Venta'}</span>
 <div class="k">${dmy(t.date)} ${hm(t.open_mx)} · ${t.volume} lotes · ${t.duration}</div></div><div class="v ${cls(t.net)}" style="font-size:16px">${usd(t.net)}</div></div>`}
function bindCards(sc){document.querySelectorAll(sc+' .tc').forEach(e=>e.onclick=()=>detail(+e.dataset.t))}
function ops(){$('#operaciones').innerHTML=[...D.trades].reverse().map(card).join('');bindCards('#operaciones')}

function detail(tk){const t=D.trades.find(x=>x.ticket===tk),p=v=>v.toFixed(t.digits);
  const f=(k,v,c='')=>`<div><span>${k}</span><b class="${c}">${v}</b></div>`;
  $('#detail').innerHTML=`<button class="back">‹ Volver</button>
  <h2 style="margin:4px 0">${t.symbol} <span class="tag ${t.type}">${t.type==='buy'?'Compra':'Venta'}</span></h2>
  <div class="k">#${t.ticket} · ${dmy(t.date)}</div>
  <div class="big ${cls(t.net)}" style="margin:6px 0">${usd(t.net)}</div>
  ${t.image?`<a href="${t.image}" target="_blank"><img src="${t.image}" alt="Gráfico ${t.ticket}" loading="lazy"></a>`:'<div class="card empty">Sin gráfico</div>'}
  <div class="card kv" style="margin-top:10px">${f('Entrada',p(t.open_price)+' · '+hm(t.open_mx))}${f('Salida',p(t.close_price)+' · '+hm(t.close_mx))}
  ${f('Stop loss',p(t.sl),'neg')}${f('Take profit',p(t.tp),'pos')}${f('Lotes',t.volume)}${f('Duración',t.duration)}
  ${f('Pips',t.pips,cls(t.pips))}${f('R:R plan',t.rr?'1:'+t.rr:'N/A (SL en ganancia)')}
  ${f('Profit bruto',usd(t.profit),cls(t.profit))}${f('Comisión',usd(t.commission),'neg')}</div>
  <div class="card"><div class="k">Motivo de entrada</div><div class="note ${t.motivo?'':'empty'}">${esc(t.motivo)||'Sin anotar'}</div></div>
  <div class="card"><div class="k">Qué pensaba</div><div class="note ${t.pensaba?'':'empty'}">${esc(t.pensaba)||'Sin anotar'}</div></div>
  <div class="k" style="text-align:center">Horas en hora CDMX (UTC-6)</div>`;
  $('#detail').classList.remove('hidden');$('#detail').scrollTop=0;$('.back').onclick=closeD;history.pushState({d:1},'');
}
function closeD(){if(!$('#detail').classList.contains('hidden')){$('#detail').classList.add('hidden');if(history.state&&history.state.d)history.back()}}
window.onpopstate=()=>$('#detail').classList.add('hidden');

function par(){const g={};D.trades.forEach(t=>(g[t.symbol]=g[t.symbol]||[]).push(t));
  const rows=Object.entries(g).map(([s,ts])=>{const w=ts.filter(t=>t.net>0),l=ts.filter(t=>t.net<=0),sum=a=>a.reduce((x,t)=>x+t.net,0);
    return {s,n:ts.length,wr:w.length/ts.length,gross:ts.reduce((a,t)=>a+t.profit,0),com:ts.reduce((a,t)=>a+t.commission,0),net:sum(ts),pf:l.length&&sum(l)?sum(w)/-sum(l):null,lots:ts.reduce((a,t)=>a+t.volume,0)}}).sort((a,b)=>b.net-a.net);
  $('#par').innerHTML=rows.map(r=>`<div class="card"><div class="tc"><span class="s">${r.s}</span><span class="v ${cls(r.net)}" style="font-size:17px">${usd(r.net)}</span></div>
   <div class="kv" style="margin-top:8px"><div><span>Operaciones</span>${r.n}</div><div><span>Win rate</span>${fmt(r.wr*100,0)}%</div>
   <div><span>Bruto</span><b class="${cls(r.gross)}">${usd(r.gross)}</b></div><div><span>Comisión</span><b class="neg">${usd(r.com)}</b></div>
   <div><span>Profit factor</span>${r.pf==null?'—':fmt(r.pf)}</div><div><span>Lotes</span>${fmt(r.lots)}</div></div></div>`).join('');
}

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
// abrir pestaña por hash (#calendario, #operaciones, #par)
addEventListener('load',()=>{const h=location.hash.slice(1);const b=document.querySelector(`nav button[data-v="${h}"]`);if(b)b.click()});
