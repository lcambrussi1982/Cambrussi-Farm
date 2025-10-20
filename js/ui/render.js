window.UI = {
  el(id){ return document.getElementById(id); },
  money(n){ UI.el('ui-money').textContent = Economy.format(n); },
  tax(n){ UI.el('ui-tax').textContent = Economy.format(n); },
  debt(n){ UI.el('ui-debt').textContent = Economy.format(n); },
  clock(time){ const d=time.day; const h=Math.floor(time.minute/60); const m=time.minute%60; UI.el('ui-day').textContent=`Dia ${d}`; UI.el('ui-clock').textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; },
  weather(w){ UI.el('ui-weather').textContent = `${w.season} • ${w.temp}°C ${w.rain?'• Chuva':''}`; },
  land(){ const s=GameState.get(); UI.el('ui-owned').textContent = s.map.filter(p=>p.owned).length; UI.el('ui-total').textContent = s.map.length; },
  cap(){ const s=GameState.get(); const total=Object.values(s.inventory).reduce((a,b)=>a+b,0); const cap=Silos.totalCapacity(s); UI.el('ui-cap').textContent = `${total}/${cap}`; },
  toast({type='ok', text}){ UI.el('ui-status').textContent = text; },
  mount(content){ const view=document.getElementById('view'); view.innerHTML=''; view.appendChild(content); },
  section(title){ const s=document.createElement('section'); s.className='section card'; const h=document.createElement('h2'); h.textContent=title; s.appendChild(h); return s; }
};
Bus.on('money', UI.money); Bus.on('clock', UI.clock); Bus.on('weather', UI.weather); Bus.on('land', UI.land); Bus.on('cap', UI.cap); Bus.on('toast', UI.toast); Bus.on('tax', UI.tax); Bus.on('debt', UI.debt);

window.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('btn-save').addEventListener('click', ()=> CFStorage.save(GameState.get()) );
  document.getElementById('btn-reset').addEventListener('click', ()=>{ CFStorage.reset(); location.reload(); });
  const speedSel = document.getElementById('speed');
  speedSel.addEventListener('change', ()=>{
    const s = GameState.get();
    const mult = Number(speedSel.value||'1');
    s.time.speedFactor = mult;
    Bus.emit('speed', mult);
  });
});