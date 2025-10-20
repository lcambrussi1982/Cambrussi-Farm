(function(){
  function render(){
    const s = GameState.get();
    const root = document.createElement('div'); root.className='grid cols-3';

    const buy = UI.section('Comprar Itens');
    const list = document.createElement('div'); list.className='list';
    Shop.list().forEach(it=>{
      const row=document.createElement('div'); row.className='item';
      row.innerHTML = `<div><b>${it.name}</b><div class="small">R$ ${Economy.format(it.price)}</div></div>`;
      const input=document.createElement('input'); input.type='number'; input.min='1'; input.value='10'; input.className='input'; input.style.maxWidth='90px';
      const btn=document.createElement('button'); btn.textContent='Comprar'; btn.onclick=()=>Shop.buy(it.id, parseInt(input.value||'1'));
      row.append(input,btn); list.appendChild(row);
    });
    buy.appendChild(list);

    const sell = UI.section('Vender Produtos (preços do dia)');
    const list2 = document.createElement('div'); list2.className='list';
    Shop.sellables().forEach(p=>{
      const inv = Inventory.getAll()[p.id]||0;
      const row=document.createElement('div'); row.className='item';
      row.innerHTML = `<div><b>${p.name}</b><div class="small">Estoque: ${inv} • Hoje: R$ ${Economy.format(p.sellPrice)}</div></div>`;
      const input=document.createElement('input'); input.type='number'; input.min='1'; input.value='10'; input.className='input'; input.style.maxWidth='90px';
      const btn=document.createElement('button'); btn.textContent='Vender'; btn.onclick=()=>Shop.sell(p.id, parseInt(input.value||'1'));
      row.append(input,btn); list2.appendChild(row);
    });
    sell.appendChild(list2);

    root.append(buy, sell);
    return root;
  }
  Bus.on('route', tab=>{ if(tab==='loja') UI.mount(render()); });
  Bus.on('inventory', ()=>{ if(Router.get()==='loja') UI.mount(render()); });
  Bus.on('market', ()=>{ if(Router.get()==='loja') UI.mount(render()); });
})();