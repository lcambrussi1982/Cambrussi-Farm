(function(){
  function render(){
    const s = GameState.get();
    const root = document.createElement('div'); root.className='grid cols-2';

    const listCard = UI.section('Comprar Talhões');
    const list = document.createElement('div'); list.className='list';
    s.map.forEach((p,i)=>{
      if(p.owned) return;
      const it=document.createElement('div'); it.className='item';
      it.innerHTML = `<div><b>(${p.x+1},${p.y+1})</b><div class="small">Preço: R$ ${Economy.format(p.price)}</div></div>`;
      const buy=document.createElement('button'); buy.textContent='Comprar'; buy.onclick=()=>Land.buy(i);
      it.appendChild(buy); list.appendChild(it);
    });
    if(!list.children.length){ list.innerHTML = '<div class="small">Todos os talhões já foram comprados.</div>'; }
    listCard.appendChild(list);

    const tips = UI.section('Dicas');
    const ul = document.createElement('div'); ul.className='list';
    ul.innerHTML = `<div class="small">• Talhões T2/T3 rendem mais (+25% / +50%).</div>
                    <div class="small">• Limite do **Banco** usa 60% do valor das terras.</div>`;
    tips.appendChild(ul);

    root.append(listCard, tips);
    return root;
  }
  Bus.on('route', tab=>{ if(tab==='terras') UI.mount(render()); });
  Bus.on('land', ()=>{ if(Router.get()==='terras') UI.mount(render()); });
})();