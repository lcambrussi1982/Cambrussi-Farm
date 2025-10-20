(function(){
  function render(){
    const s = GameState.get();
    const root = document.createElement('div'); root.className='grid cols-2';

    const shop = UI.section('Comprar Máquinas');
    const list = document.createElement('div'); list.className='list';
    CF_CONSTANTS.MACHINES.forEach(m=>{
      const owned = !!s.machines.owned[m.id];
      const row=document.createElement('div'); row.className='item';
      row.innerHTML = `<div><b>${m.name}</b><div class="small">${owned? 'Você possui' : 'Não possui'} • Preço: R$ ${Economy.format(m.price)}</div></div>`;
      const btn=document.createElement('button'); btn.textContent= owned? '—' : 'Comprar';
      btn.disabled = owned; btn.onclick = ()=>Machines.buy(m.id);
      row.append(btn); list.appendChild(row);
    });
    shop.appendChild(list);

    const ops = UI.section('Custos por Operação (com/sem máquinas)');
    const ul=document.createElement('div'); ul.className='list';
    const opsList=[['Plantio','plant'],['Colheita','harvest'],['Pulverização','spray'],['Transporte','transport']];
    opsList.forEach(([label,op])=>{
      const cost = Machines.opCost(op);
      const it=document.createElement('div'); it.className='item'; it.innerHTML=`<div>${label}</div><div>R$ ${Economy.format(cost)}</div>`;
      ul.appendChild(it);
    });
    ops.appendChild(ul);

    root.append(shop, ops);
    return root;
  }
  Bus.on('route', tab=>{ if(tab==='maquinas') UI.mount(render()); });
  Bus.on('machines', ()=>{ if(Router.get()==='maquinas') UI.mount(render()); });
  Bus.on('money', ()=>{ if(Router.get()==='maquinas') UI.mount(render()); });
})();