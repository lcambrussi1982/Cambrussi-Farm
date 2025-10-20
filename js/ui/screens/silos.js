(function(){
  function render(){
    const s = GameState.get();
    Silos.recomputeCapacity(s);
    const root = document.createElement('div'); root.className='grid cols-2';

    const listCard = UI.section('Silos');
    const grid = document.createElement('div'); grid.className='silo-grid';

    const caps = CF_CONSTANTS.SILOS.levelCaps;
    const totalByType = {}; CF_CONSTANTS.SILOS.types.forEach(t=> totalByType[t]=Silos.totalCapacityByType(s,t));
    const usedByType = {}; Object.keys(s.inventory).forEach(id=>{ const cat=CROPS[id]?.cat||'graos'; usedByType[cat]=(usedByType[cat]||0)+s.inventory[id]; });

    (s.silos||[]).forEach((sl,idx)=>{
      const cap = caps[sl.level-1]||0;
      const capCat = totalByType[sl.type]||0;
      const usedCat = usedByType[sl.type]||0;
      const usedFrac = capCat? usedCat / capCat : 0;
      const card = document.createElement('div'); card.className='card silo-card';
      const title = document.createElement('div'); title.innerHTML = `<b>${sl.name}</b> <span class="badge">${sl.type}</span> <span class="badge">Nível ${sl.level}</span>`;
      const info = document.createElement('div'); info.className='small'; info.textContent = `Capacidade deste silo: ${cap} • Uso ${usedCat}/${capCat}`;
      const meter = document.createElement('div'); meter.className='meter'; const bar=document.createElement('div'); bar.style.width = (usedFrac*100)+'%'; meter.appendChild(bar);
      const actions = document.createElement('div'); actions.className='row';
      const upg = document.createElement('button'); upg.textContent = sl.level>=CF_CONSTANTS.SILOS.maxLevel? 'Nível Máximo' : `Upgrade (R$ ${Economy.format(Silos.upgradeCost(sl.level))})`;
      upg.disabled = sl.level>=CF_CONSTANTS.SILOS.maxLevel;
      upg.onclick = ()=> Silos.upgrade(idx);
      actions.appendChild(upg);
      card.append(title, info, meter, actions);
      grid.appendChild(card);
    });

    listCard.appendChild(grid);

    const actions = UI.section('Construir novo Silo');
    const row = document.createElement('div'); row.className='row';
    const typeSel = document.createElement('select'); typeSel.className='input'; CF_CONSTANTS.SILOS.types.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; typeSel.appendChild(o); });
    const btn = document.createElement('button'); btn.textContent = `Novo Silo (R$ ${Economy.format(Silos.newSiloCost(s))})`;
    btn.onclick = ()=> Silos.add(typeSel.value);
    row.append(typeSel, btn); actions.appendChild(row);

    root.append(listCard, actions);
    return root;
  }
  Bus.on('route', tab=>{ if(tab==='silos') UI.mount(render()); });
  Bus.on('cap', ()=>{ if(Router.get()==='silos') UI.mount(render()); });
  Bus.on('money', ()=>{ if(Router.get()==='silos') UI.mount(render()); });
})();