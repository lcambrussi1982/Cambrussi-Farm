// Tela de Lavouras — unificada e melhorada (auto-spray padrão + upgrade T10 com preço)
// Depende: UI, GameState, CROPS, Fields, Land, Silos, Economy, Machines, CF_CONSTANTS, Bus
(function(){
  // ---- Helpers ----
  function ensureAutoDefaults(p){
    p.auto = p.auto || { enabled:false, crop:'milho', replant:false, autoSpray:true };
    if (typeof p.auto.autoSpray === 'undefined') p.auto.autoSpray = true; // marcado por padrão
    if (!p.sizeLevel) p.sizeLevel = 1;
  }
  function plotClass(p){
    let cls='plot';
    if(p.ready) cls+=' ready';
    if(!p.owned) cls+=' locked';
    if(p.pest) cls+=' pest';
    if(p.owned && p.crop && p.water<0.35) cls+=' dry';
    return cls;
  }
  function getInsectQty(s){
    if (s?.inventory && typeof s.inventory['inseticida']==='number') return s.inventory['inseticida'];
    if (s?.items && typeof s.items['inseticida']==='number') return s.items['inseticida'];
    if (window.Inventory && typeof Inventory.get==='function'){
      const q = Inventory.get('inseticida'); if(typeof q==='number') return q;
    }
    return 0;
  }

  // ---- Render raiz ----
  function render(){
    const s = GameState.get();
    const root = document.createElement('div'); root.className='fieldwrap';

    // GRID
    const gridCard = UI.section('Talhões');
    const grid = document.createElement('div'); grid.className='fieldgrid';

    s.map.forEach((p,i)=>{
      ensureAutoDefaults(p);
      const cell = document.createElement('div'); cell.className = plotClass(p);
      const img = document.createElement('img');
      img.src = p.crop ? `assets/crops/${p.crop}_stage${p.stage}.svg` : `assets/crops/empty.svg`;
      img.alt = p.crop ? `${p.crop} estágio ${p.stage}` : 'Vazio';
      const lbl = document.createElement('div'); lbl.className='lbl'; lbl.textContent = `T${p.sizeLevel}`;
      cell.append(img,lbl);

      cell.title = p.owned
        ? (p.crop ? `${p.crop} • dia ${p.days}/${CROPS[p.crop].days}` : 'Vazio')
        : `Bloqueado — R$ ${Economy.format(p.price)}`;
      cell.onclick = ()=> openPanel(i);
      grid.appendChild(cell);
    });
    gridCard.appendChild(grid);

    // SIDE PANEL
    const panel = UI.section('Ações / Auto-plant'); panel.classList.add('sidepanel');
    const wrap = document.createElement('div'); wrap.className='list'; wrap.id='panel-fields';
    wrap.innerHTML = `<div class="small">
      Talhões em cinza precisam ser comprados. Custos variam com <b>Máquinas</b> e <b>Dificuldade</b>.
      Use <b>inseticida</b> para remover pragas. O <b>Auto-pulverizar</b> vem habilitado por padrão.
    </div>`;
    panel.appendChild(wrap);

    root.append(gridCard, panel);
    return root;
  }

  // ---- Painel por talhão ----
  function openPanel(i){
    const s = GameState.get(); const p = s.map[i];
    ensureAutoDefaults(p);
    const w = document.getElementById('panel-fields'); if(!w) return;
    w.innerHTML = '';

    // Não comprado
    if(!p.owned){
      const card = document.createElement('div'); card.className='list';
      card.innerHTML = `
        <div class="kv"><span>Talhão</span><b>(${p.x+1},${p.y+1})</b></div>
        <div class="kv"><span>Preço</span><b>R$ ${Economy.format(p.price)}</b></div>`;
      const buy = document.createElement('button'); buy.textContent='Comprar talhão';
      buy.onclick=()=>Land.buy(i);
      card.appendChild(buy); w.appendChild(card); return;
    }

    // AÇÕES
    const row1 = document.createElement('div'); row1.className='row';

    const cropSel = document.createElement('select'); cropSel.className='input';
    Object.values(CROPS).forEach(c=>{
      const o=document.createElement('option'); o.value=c.id; o.textContent=c.id; cropSel.appendChild(o);
    });
    cropSel.value = p.auto.crop || 'milho';

    const bPlant = document.createElement('button');
    bPlant.textContent=`Plantar (R$ ${Economy.format(Machines.opCost('plant'))})`;
    bPlant.onclick=()=>Fields.plant(i, cropSel.value);

    const bIrr = document.createElement('button');
    bIrr.textContent=`Irrigar (~R$ ${Economy.format(Machines.opCost('spray')*0.5)})`;
    bIrr.onclick=()=>Fields.irrigate(i);

    const bFert = document.createElement('button');
    bFert.textContent=`Adubar (R$ ${Economy.format(Machines.opCost('spray'))})`;
    bFert.onclick=()=>Fields.fertilize(i);

    const bHarv = document.createElement('button');
    bHarv.textContent=`Colher (R$ ${Economy.format(Machines.opCost('harvest'))})`;
    bHarv.onclick=()=>Fields.harvest(i);

    row1.append(cropSel,bPlant,bIrr,bFert,bHarv);

    // Inseticida (manual) — aparece apenas se houver pragas
    if(p.pest){
      const bInsect = document.createElement('button');
      const op = Machines.opCost('spray');
      bInsect.textContent = `Aplicar Inseticida (1x) (R$ ${Economy.format(op)} + estoque/emerg.)`;
      bInsect.onclick = ()=> Fields.applyInsecticide(i);
      row1.appendChild(bInsect);
    }

    // AUTOMAÇÃO
    const row2 = document.createElement('div'); row2.className='row';

    const autoCheck = document.createElement('input'); autoCheck.type='checkbox'; autoCheck.checked = !!p.auto.enabled;
    const autoLbl = document.createElement('label'); autoLbl.className='small'; autoLbl.textContent='Auto-plant';

    const replCheck = document.createElement('input'); replCheck.type='checkbox'; replCheck.checked = !!p.auto.replant;
    const replLbl = document.createElement('label'); replLbl.className='small'; replLbl.textContent='Auto-replant';

    const sprayCheck = document.createElement('input'); sprayCheck.type='checkbox'; sprayCheck.checked = !!p.auto.autoSpray;
    const sprayLbl = document.createElement('label'); sprayLbl.className='small'; sprayLbl.textContent='Auto-pulverizar (pragas)';

    const supportsAutoSpray = (typeof Fields.setAuto==='function' && Fields.setAuto.length >= 5);

    function persistAuto(){
      if(supportsAutoSpray){
        Fields.setAuto(i, autoCheck.checked, cropSel.value, replCheck.checked, sprayCheck.checked);
      }else{
        const st = GameState.get();
        const pf = st.map[i]; pf.auto = pf.auto || {};
        pf.auto.enabled = !!autoCheck.checked;
        pf.auto.crop = cropSel.value;
        pf.auto.replant = !!replCheck.checked;
        pf.auto.autoSpray = !!sprayCheck.checked;
        GameState.save(st); Bus.emit('fields', st.map);
      }
    }

    autoCheck.onchange = persistAuto;
    replCheck.onchange = persistAuto;
    sprayCheck.onchange = persistAuto;
    cropSel.onchange = persistAuto;

    // Upgrade até T10 com preço
    const maxLvl = (CF_CONSTANTS.MAX_PLOT_LEVEL || 10);
    const nextLvl = Math.min(maxLvl, (p.sizeLevel||1)+1);
    const upg = document.createElement('button');
    if((p.sizeLevel||1) < maxLvl){
      const price = (typeof Land.upgradeCost==='function') ? Land.upgradeCost(i) : 0;
      upg.textContent = `Upgrade tamanho (T${p.sizeLevel}→T${nextLvl}) — R$ ${Economy.format(price)}`;
      upg.onclick = ()=>Land.upgrade(i);
    }else{
      upg.textContent = `Tamanho máximo (T${p.sizeLevel})`;
      upg.disabled = true;
    }

    row2.append(autoCheck,autoLbl,replCheck,replLbl,sprayCheck,sprayLbl,upg);

    // INFO
    const info = document.createElement('div'); info.className='list';
    const invTotal = Object.values(s.inventory||{}).reduce((a,b)=>a+(b||0),0);
    const cap = Silos.totalCapacity(s);
    const insetQt = getInsectQty(s);
    const text = p.crop
      ? `<div class="kv"><span>Estado</span><b>${p.crop} • estágio ${p.stage}/${CROPS[p.crop].stages-1}</b></div>
         <div class="kv"><span>Água</span><b>${(p.water*100|0)}%</b></div>
         <div class="kv"><span>Fertilidade</span><b>${(p.fert*100|0)}%</b></div>
         <div class="kv"><span>Pragas</span><b>${p.pest?'Sim':'Não'}</b></div>`
      : `<div class="kv"><span>Estado</span><b>Vazio</b></div>`;

    info.innerHTML = `
      <div class="kv"><span>Tamanho</span><b>T${p.sizeLevel}</b></div>
      <div class="kv"><span>Armazenagem</span><b>${invTotal}/${cap}</b></div>
      <div class="kv"><span>Inseticida (estoque)</span><b>${insetQt} frasco(s)</b></div>
      ${text}
    `;

    const container = document.createElement('div'); container.className='list';
    container.appendChild(row1); container.appendChild(row2); container.appendChild(info);
    w.append(container);
  }

  // ---- Montagem e eventos ----
  Bus.on('route',     tab=>{ if(tab==='lavouras') UI.mount(render()); });
  Bus.on('fields',    ()=>{ if(Router.get()==='lavouras') UI.mount(render()); });
  Bus.on('land',      ()=>{ if(Router.get()==='lavouras') UI.mount(render()); });
  Bus.on('cap',       ()=>{ if(Router.get()==='lavouras') UI.mount(render()); });
  Bus.on('machines',  ()=>{ if(Router.get()==='lavouras') UI.mount(render()); });
  Bus.on('inventory', ()=>{ if(Router.get()==='lavouras') UI.mount(render()); });
})();
