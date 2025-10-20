(function(){
  function catCaps(s){
    return CF_CONSTANTS.SILOS.types.map(t=>`${t}: ${Silos.totalCapacityByType(s,t)}`).join(' • ');
  }
  function render(){
    const s = GameState.get();
    const root = document.createElement('div'); root.className='grid cols-3';

    const res = UI.section('Resumo');
    const list = document.createElement('div'); list.className='list';
    const invTotal = Object.values(s.inventory).reduce((a,b)=>a+b,0);
    const cap = Silos.totalCapacity(s);
    list.innerHTML = `
      <div class="kv"><span>Dinheiro</span><b>R$ ${Economy.format(s.player.money)}</b></div>
      <div class="kv"><span>Talhões</span><b>${s.map.filter(p=>p.owned).length}/${s.map.length}</b></div>
      <div class="kv"><span>Armazenagem</span><b>${invTotal}/${cap}</b></div>
      <div class="kv"><span>Cap. por categoria</span><b>${catCaps(s)}</b></div>
      <div class="kv"><span>Impostos a pagar</span><b>R$ ${Economy.format(s.taxes.due)} (venc. dia ${s.taxes.nextDue})</b></div>
      <div class="kv"><span>Dívida</span><b>R$ ${Economy.format(Bank.totalDebt(s))}</b></div>
      <div class="kv"><span>Dificuldade</span><b>${s.meta.difficulty||'-'}</b></div>
    `;
    res.appendChild(list);

    const market = UI.section('Mercado Hoje');
    const table = document.createElement('div'); table.className='list';
    Object.entries(s.market.prices).forEach(([id,price])=>{
      const it = document.createElement('div'); it.className='item';
      it.innerHTML = `<div><b>${id}</b></div><div>R$ ${Economy.format(price)}</div>`;
      table.appendChild(it);
    });
    market.appendChild(table);

    root.append(res, market);
    return root;
  }
  Bus.on('route', tab=>{ if(tab==='dashboard') UI.mount(render()); });
  window.addEventListener('DOMContentLoaded', ()=>{ if(Router.get()==='dashboard') UI.mount(render()); });
  ['money','market','inventory','weather','land','cap','tax','debt'].forEach(ev=>Bus.on(ev, ()=>{ if(Router.get()==='dashboard') UI.mount(render()); }));
})();