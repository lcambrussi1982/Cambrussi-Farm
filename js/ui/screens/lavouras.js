(function(){
  function plotClass(p){
    let cls='plot'; if(p.ready) cls+=' ready'; if(!p.owned) cls+=' locked'; if(p.pest) cls+=' pest'; if(p.owned && p.crop && p.water<0.35) cls+=' dry'; return cls;
  }
  function render(){
    const s = GameState.get();
    const root = document.createElement('div'); root.className='fieldwrap';

    const gridCard = UI.section('Talhões');
    const grid = document.createElement('div'); grid.className='fieldgrid';
    s.map.forEach((p,i)=>{
      const cell = document.createElement('div'); cell.className = plotClass(p);
      const img = document.createElement('img');
      img.src = p.crop? `assets/crops/${p.crop}_stage${p.stage}.svg` : `assets/crops/empty.svg`;
      img.alt = p.crop? `${p.crop} estágio ${p.stage}` : 'vazio';
      const lbl = document.createElement('div'); lbl.className='lbl'; lbl.textContent = `T${p.sizeLevel}`;
      cell.append(img,lbl);
      cell.title = p.owned ? (p.crop? `${p.crop} • dia ${p.days}/${CROPS[p.crop].days}` : 'vazio') : `bloqueado — R$ ${p.price}`;
      cell.onclick = ()=> openPanel(i);
      grid.appendChild(cell);
    });
    gridCard.appendChild(grid);

    const panel = UI.section('Ações / Auto-plant'); panel.classList.add('sidepanel');
    const wrap = document.createElement('div'); wrap.className='list'; wrap.id='panel-fields';
    wrap.innerHTML = `<div class="small">Talhões em cinza precisam ser comprados. Custos de operação variam com **Máquinas** e com a **Dificuldade**.</div>`;
    panel.appendChild(wrap);

    root.append(gridCard, panel);
    return root;
  }

  function openPanel(i){
    const s = GameState.get(); const p=s.map[i];
    const w = document.getElementById('panel-fields'); w.innerHTML = '';

    if(!p.owned){
      const card = document.createElement('div'); card.className='list';
      card.innerHTML = `<div class="kv"><span>Talhão</span><b>(${p.x+1},${p.y+1})</b></div>
        <div class="kv"><span>Preço</span><b>R$ ${Economy.format(p.price)}</b></div>`;
      const buy = document.createElement('button'); buy.textContent='Comprar talhão'; buy.onclick=()=>Land.buy(i);
      card.appendChild(buy); w.appendChild(card); return;
    }

    const row1 = document.createElement('div'); row1.className='row';
    const cropSel = document.createElement('select'); cropSel.className='input'; Object.values(CROPS).forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.id; cropSel.appendChild(o); });
    cropSel.value = p.auto.crop||'milho';
    const bPlant = document.createElement('button'); bPlant.textContent=`Plantar (R$ ${Economy.format(Machines.opCost('plant'))})`; bPlant.onclick=()=>Fields.plant(i, cropSel.value);
    const bIrr = document.createElement('button'); bIrr.textContent=`Irrigar (~R$ ${Economy.format(Machines.opCost('spray')*0.5)})`; bIrr.onclick=()=>Fields.irrigate(i);
    const bFert = document.createElement('button'); bFert.textContent=`Adubar (R$ ${Economy.format(Machines.opCost('spray'))})`; bFert.onclick=()=>Fields.fertilize(i);
    const bHarv = document.createElement('button'); bHarv.textContent=`Colher (R$ ${Economy.format(Machines.opCost('harvest'))})`; bHarv.onclick=()=>Fields.harvest(i);
    row1.append(cropSel,bPlant,bIrr,bFert,bHarv);

    const row2 = document.createElement('div'); row2.className='row';
    const autoCheck = document.createElement('input'); autoCheck.type='checkbox'; autoCheck.checked = !!p.auto.enabled;
    const autoLbl = document.createElement('label'); autoLbl.className='small'; autoLbl.textContent='Auto-plant';
    autoCheck.onchange = ()=> Fields.setAuto(i, autoCheck.checked, cropSel.value, replCheck.checked);
    const replCheck = document.createElement('input'); replCheck.type='checkbox'; replCheck.checked = !!p.auto.replant;
    const replLbl = document.createElement('label'); replLbl.className='small'; replLbl.textContent='Auto-replant';
    replCheck.onchange = ()=> Fields.setAuto(i, autoCheck.checked, cropSel.value, replCheck.checked);

    const upg = document.createElement('button'); upg.textContent=`Upgrade tamanho (T${p.sizeLevel}→T${Math.min(3,p.sizeLevel+1)})`; upg.onclick=()=>Land.upgrade(i);

    row2.append(autoCheck,autoLbl,replCheck,replLbl,upg);

    const info = document.createElement('div'); info.className='list';
    const invTotal = Object.values(s.inventory).reduce((a,b)=>a+b,0);
    const cap = Silos.totalCapacity(s);
    const text = p.crop? `<div class="kv"><span>Estado</span><b>${p.crop} • estágio ${p.stage}/${CROPS[p.crop].stages-1}</b></div>
      <div class="kv"><span>Água</span><b>${(p.water*100|0)}%</b></div><div class="kv"><span>Fertilidade</span><b>${(p.fert*100|0)}%</b></div>`
      : `<div class="kv"><span>Estado</span><b>Vazio</b></div>`;
    info.innerHTML = `<div class="kv"><span>Tamanho</span><b>T${p.sizeLevel}</b></div>
      <div class="kv"><span>Armazenagem</span><b>${invTotal}/${cap}</b></div>` + text;

    w.append(row1, row2, info);
  }

  Bus.on('route', tab=>{ if(tab==='lavouras') UI.mount(render()); });
  Bus.on('fields', ()=>{ if(Router.get()==='lavouras') UI.mount(render()); });
  Bus.on('land', ()=>{ if(Router.get()==='lavouras') UI.mount(render()); });
  Bus.on('cap', ()=>{ if(Router.get()==='lavouras') UI.mount(render()); });
  Bus.on('machines', ()=>{ if(Router.get()==='lavouras') UI.mount(render()); });
})();