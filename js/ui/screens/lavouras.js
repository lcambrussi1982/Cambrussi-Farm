// Cambrussi Farm — Lavouras (v24.0)
// Objetivo: layout 100% estável e bonito. Lavouras quadradas, chips embaixo,
// painel de ações fixo (sticky) que acompanha o scroll, ícones sempre por cima,
// botão Colher compat (fallback) e muitos guardas para não quebrar a rota.
// Dep.: UI, GameState, CROPS, Fields, Land, Silos, Economy, Machines, CF_CONSTANTS, Bus
(function(){
  // ================= CSS (isolado) =================
  (function ensureStyle(){
    const ID='cf-lavouras-v240-style'; if(document.getElementById(ID)) return;
    const st=document.createElement('style'); st.id=ID; st.textContent=`
      .cf-lav{ --tile: var(--cf_tile_fields, 200px); --r: 8px; --pad: 10px; }
      .cf-lav__layout{ display:grid; grid-template-columns: 360px 1fr; gap:16px; align-items:start; }
      @media (max-width: 1180px){ .cf-lav__layout{ grid-template-columns: 1fr; } }

      /* Painel lateral */
      .cf-lav__aside{ position: sticky; top: var(--cf-sticky-top, 80px); align-self: start; height: fit-content; }
      .cf-lav__aside .small{ opacity:.85 }

      /* Tools */
      .cf-lav__tools{ display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:10px; }
      .cf-lav__sp{ flex:1 1 auto; }

      /* Legenda em pílulas */
      .cf-lav__legend{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
      .cf-lav__lg{ display:inline-flex; align-items:center; gap:6px; padding:4px 10px; font-size:12px; border-radius:999px; border:1px solid rgba(0,0,0,.08); background:#f8fafc; white-space:nowrap; }
      .cf-lav__lg.ok{ background:#ecfdf5; border-color:rgba(16,185,129,.35) }
      .cf-lav__lg.warn{ background:#fff7ed; border-color:rgba(245,158,11,.35) }
      .cf-lav__lg.danger{ background:#fef2f2; border-color:rgba(239,68,68,.35) }
      .cf-lav__lg.muted{ background:#f3f4f6; border-color:rgba(156,163,175,.35) }

      /* Grid — colunas de largura FIXA para tiles quadrados e consistentes */
      .cf-lav__gridCard{ overflow: visible !important; }
      .cf-lav__grid{ display:grid; grid-template-columns: repeat(auto-fill, var(--tile)); gap:14px; justify-content:start; align-items:start; }

      /* Célula = tile quadrado + meta embaixo */
      .cf-lav__cell{ width:var(--tile); display:flex; flex-direction:column; gap:6px; }

      /* T I L E  (quadrado absoluto) */
      .cf-lav__tile{ position:relative; width:var(--tile); height:var(--tile); border-radius:var(--r); overflow:hidden; background:#6b4f2a; cursor:pointer; box-shadow:inset 0 0 0 1px rgba(0,0,0,.10); transition:transform .06s ease, box-shadow .12s ease;
        isolation:isolate; contain:paint; }
      .cf-lav__tile:hover{ transform:translateY(-1px); box-shadow:inset 0 0 0 1px rgba(0,0,0,.12), 0 6px 16px rgba(0,0,0,.18) }
      .cf-lav__tile::before, .cf-lav__tile::after{ content:none !important; display:none !important; }

      .cf-lav__soil{ position:absolute; inset:0; z-index:1; background:
        radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,.05), transparent 60%),
        repeating-linear-gradient(25deg, rgba(0,0,0,.08) 0 8px, rgba(0,0,0,.02) 8px 16px),
        linear-gradient(180deg, #6b4f2a 0%, #5a4426 100%); }
      .cf-lav__tile.locked .cf-lav__soil{ filter:saturate(.2) brightness(.9) }
      .cf-lav__tile.empty  .cf-lav__soil{ background: repeating-linear-gradient(45deg, #70512d, #70512d 12px, #674a2a 12px, #674a2a 24px) }
      .cf-lav__tile.ready{ outline:2px solid rgba(16,185,129,.75); box-shadow: 0 0 0 3px rgba(16,185,129,.18) inset, inset 0 0 0 1px rgba(0,0,0,.08) }
      .cf-lav__tile.pest { outline:2px dashed rgba(220,38,38,.7) }
      .cf-lav__tile.dry  { outline:2px dashed rgba(234,179,8,.8) }

      .cf-lav__sprite{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 1px 0 rgba(0,0,0,.25)); z-index:10; pointer-events:none; }
      .cf-lav__center{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size: calc(var(--tile) * .28); filter:drop-shadow(0 1px 0 rgba(0,0,0,.4)); z-index:2147483000; pointer-events:none; }
      .cf-lav__center img{ max-width:56%; max-height:56%; object-fit:contain; }

      .cf-lav__flags{ position:absolute; top:6px; left:6px; display:flex; gap:4px; z-index:2147483001 }
      .cf-lav__flag{ width:18px; height:18px; border-radius:6px; background:rgba(0,0,0,.50); color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; box-shadow:0 1px 1px rgba(0,0,0,.25) }

      /* Meta (chips) SOB O TILE */
      .cf-lav__meta{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; min-height:28px; }
      .cf-chip{ display:inline-flex; align-items:center; gap:6px; padding:3px 8px; font-size:12px; border-radius:999px; background:#f3f4f6; color:#111; border:1px solid rgba(0,0,0,.06); line-height:1; }
      .cf-chip .dot{ width:10px; height:10px; border-radius:50%; background:#9ca3af }
      .cf-chip.ok .dot{ background:#10b981 }
      .cf-chip.warn .dot{ background:#f59e0b }
      .cf-chip.danger .dot{ background:#ef4444 }
      .cf-chip.tag{ background:#111827; color:#fff; border-color:transparent }

      /* Caixa de erro (fallback) */
      .cf-lav__err{ padding:12px; border-radius:8px; background:#fef2f2; border:1px solid #fecaca; color:#7f1d1d; font-size:14px }
    `; document.head.appendChild(st);
  })();

  // ================= Helpers =================
  const CUR = (n)=>{ try{ return `R$ ${Economy.format(n||0)}` }catch(_){ return `R$ ${(n||0).toFixed? n.toFixed(2): n}` } };
  function ensureAutoDefaults(p){ p.auto = p.auto || { enabled:false, crop:'milho', replant:false, autoSpray:true }; if (typeof p.auto.autoSpray === 'undefined') p.auto.autoSpray = true; if (!p.sizeLevel) p.sizeLevel = 1; }
  function tileClass(p){ let c='cf-lav__tile'; if(!p) return c+' empty'; if(p.ready) c+=' ready'; if(!p.owned) c+=' locked'; if(p.pest) c+=' pest'; if(p.owned && p.crop && p.water<0.35) c+=' dry'; if(!p.crop) c+=' empty'; return c; }
  function setTile(px){ try{ document.querySelector('.cf-lav')?.style.setProperty('--cf_tile_fields', px+'px'); localStorage.setItem('cf_tile_fields', String(px)); }catch(_){} }
  function getTile(){ const v = Number(localStorage.getItem('cf_tile_fields')||'200'); return Math.min(340, Math.max(140, v||200)); }

  // Ícones center/flags
  function centerEl(key){ const map = (window.CF_CONSTANTS && CF_CONSTANTS.CROP_STAGE_IMAGES) || null; const emoji={ just:'🌱', mid:'🌿', near:'🌾', ready:'✅', empty:'' }; const el=document.createElement('div'); el.className='cf-lav__center'; if(map && map[key]){ const im=document.createElement('img'); im.src=map[key]; im.alt=key; el.appendChild(im); } else { el.textContent = emoji[key]||''; } return el; }
  function flagEl(key){ const map = (window.CF_CONSTANTS && CF_CONSTANTS.STATUS_ICONS) || null; const emoji={ pest:'🐛', dry:'💧', locked:'🔒', empty:'◻️' }; const el=document.createElement('div'); el.className='cf-lav__flag'; if(map && map[key]){ const im=document.createElement('img'); im.src=map[key]; im.alt=key; el.appendChild(im); } else { el.textContent=emoji[key]||'•'; } el.title=({pest:'Pragas', dry:'Seca', locked:'Bloqueado', empty:'Vazio'})[key]||key; return el; }
  function buildLegend(){
    const L=document.createElement('div'); L.className='cf-lav__legend';
    const add=(label, em, tone)=>{ const it=document.createElement('div'); it.className='cf-lav__lg'+(tone?(' '+tone):''); const i=document.createElement('span'); i.textContent=em; const t=document.createElement('span'); t.textContent=label; it.append(i,t); return it; };
    L.append( add('Plantada','🌱'), add('Crescendo','🌿'), add('Perto','🌾','warn'), add('Pronta','✅','ok'), add('Praga','🐛','danger'), add('Seca','💧','warn'), add('Vazio','◻️','muted'), add('Bloqueado','🔒','muted') );
    return L;
  }

  function cropMeta(id){ try{ const c = CROPS && CROPS[id]; if(!c) return {daysTotal:10, stages:4}; return { daysTotal: c.days ?? c.daysToHarvest ?? c.growDays ?? 10, stages: c.stages ?? c.numStages ?? 4 }; }catch(_){ return {daysTotal:10, stages:4}; } }
  function daysSince(p,s){ const now = s?.time?.day || 1; const planted = p?.plantedDay ?? p?.plantedAt ?? p?.day ?? p?.start ?? null; if(typeof planted==='number') return Math.max(0, now-planted); if(typeof p?.growthDays==='number') return Math.max(0,p.growthDays); return (typeof p?.days==='number')? p.days : 0; }
  function stageKey(p,s){ const has = !!(p && (p.crop||p.cropId||p.cropName)); if(!has) return 'empty'; const meta=cropMeta(p.crop||p.cropId||''); if(typeof p.stage==='number'){ const tot=Math.max(1, meta.stages-1); if(p.stage>=tot) return 'ready'; if(p.stage<=0) return 'just'; if(p.stage>=tot-1) return 'near'; return 'mid'; } const ds=daysSince(p,s); const rem=Math.max(0, meta.daysTotal-ds); if(ds<=2) return 'just'; if(rem<=0) return 'ready'; if(rem<=2) return 'near'; return 'mid'; }
  function flagsOf(p){ const fs=[]; const has = !!(p && (p.crop||p.cropId||p.cropName)); if(!p?.owned) fs.push('locked'); if(!has) fs.push('empty'); if(p?.pest) fs.push('pest'); if(p?.owned && has && typeof p.water==='number' && p.water<0.35) fs.push('dry'); return fs; }

  // Chips abaixo do tile
  function chip(txt,tone){ const el=document.createElement('div'); el.className='cf-chip'+(tone?(' '+tone):''); const d=document.createElement('span'); d.className='dot'; el.append(d, document.createTextNode(txt)); return el; }
  function chipTag(txt){ const el=document.createElement('div'); el.className='cf-chip tag'; el.textContent=txt; return el; }
  function chipsFor(p,s){ const arr=[]; arr.push(chipTag('T'+(p.sizeLevel||1))); const has = !!(p && (p.crop||p.cropId||p.cropName)); if(!p.owned){ arr.push(chip('Bloqueado','warn')); return arr; } if(!has){ arr.push(chip('Vazio')); return arr; } const st=stageKey(p,s); if(st==='ready') arr.push(chip('Pronta','ok')); else if(st==='near') arr.push(chip('Perto','warn')); else if(st==='just') arr.push(chip('Plantada')); else arr.push(chip('Crescendo')); if(typeof p.water==='number'){ if(p.water<0.35) arr.push(chip('Seca','warn')); else if(p.water>0.70) arr.push(chip('Molhada')); else arr.push(chip('Umidade ok')); } if(p.pest) arr.push(chip('Praga','danger')); return arr; }

  // Colheita compat
  function safeHarvest(i){ try{ if(typeof Fields?.harvest==='function') return Fields.harvest(i); if(typeof Fields?.collect==='function') return Fields.collect(i); if(typeof Fields?.harvestPlot==='function') return Fields.harvestPlot(i); console.warn('Método de colheita não encontrado'); }catch(e){ console.error('Falha ao colher', e); } }

  // ================= Render =================
  function render(){
    try{
      const s = GameState.get ? GameState.get() : { map: [] };
      const root = document.createElement('div'); root.className='cf-lav';
      // sticky offset (usa header/topbar se existir)
      try{ const hdr=document.querySelector('.topbar, header, .navbar, .appbar'); const top=((hdr?.offsetHeight||68)+12)+'px'; root.style.setProperty('--cf-sticky-top', top); }catch(_){ root.style.setProperty('--cf-sticky-top','80px'); }

      // Tools
      const tools=document.createElement('div'); tools.className='cf-lav__tools';
      const lb=document.createElement('label'); lb.textContent='Tamanho dos quadros:';
      const range=document.createElement('input'); range.type='range'; range.min='140'; range.max='340'; range.step='4'; range.value=String(getTile()); range.oninput=()=> setTile(Number(range.value));
      const chk=document.createElement('input'); chk.type='checkbox'; const store = localStorage.getItem('cf_show_sprites'); const show = store==null? false : (store==='1'); chk.checked=show; chk.id='cf-show-sprites'; const chkLbl=document.createElement('label'); chkLbl.htmlFor='cf-show-sprites'; chkLbl.textContent='Sprites base';
      chk.onchange=()=>{ localStorage.setItem('cf_show_sprites', chk.checked?'1':'0'); root.querySelectorAll('.cf-lav__sprite').forEach(el=> el.style.display = chk.checked ? '' : 'none'); };
      const legend=buildLegend(); const sp=document.createElement('div'); sp.className='cf-lav__sp';
      tools.append(lb, range, chk, chkLbl, sp, legend);

      // Grid
      const gridCard = UI.section ? UI.section('Talhões') : (function(){ const d=document.createElement('div'); d.className='card'; return d; })();
      gridCard.classList && gridCard.classList.add('cf-lav__gridCard'); gridCard.appendChild(tools);
      const grid=document.createElement('div'); grid.className='cf-lav__grid'; setTile(getTile());

      (s.map||[]).forEach((p,i)=>{
        ensureAutoDefaults(p);
        const cell=document.createElement('div'); cell.className='cf-lav__cell';

        const tile=document.createElement('div'); tile.className=tileClass(p);
        const soil=document.createElement('div'); soil.className='cf-lav__soil';
        const img=document.createElement('img'); img.className='cf-lav__sprite'; img.src = p && p.crop ? `assets/crops/${p.crop}_stage${p.stage}.svg` : `assets/crops/empty.svg`; img.alt = p && p.crop ? `${p.crop} estágio ${p.stage}` : 'Vazio'; if(!show) img.style.display='none';
        const cKey = stageKey(p,s); const center = centerEl(cKey);
        const flags=document.createElement('div'); flags.className='cf-lav__flags'; flagsOf(p).forEach(k=> flags.appendChild(flagEl(k)));

        tile.append(soil,img,center,flags);
        tile.title = p && p.owned ? (p.crop ? `${p.crop}` : 'Vazio') : `Bloqueado — ${CUR(p && p.price)}`;
        tile.onclick = ()=> openPanel(i);

        const meta=document.createElement('div'); meta.className='cf-lav__meta'; chipsFor(p,s).forEach(ch=> meta.appendChild(ch));

        cell.append(tile, meta); grid.appendChild(cell);
      });
      gridCard.appendChild(grid);

      // Aside (Ações)
      const aside = UI.section ? UI.section('Ações / Auto-plant') : (function(){ const d=document.createElement('div'); d.className='card'; return d; })();
      aside.classList && aside.classList.add('cf-lav__aside');
      const wrap=document.createElement('div'); wrap.className='list'; wrap.id='panel-fields';
      wrap.innerHTML = `<div class="small">Talhões em cinza precisam ser comprados. Custos variam com <b>Máquinas</b> e <b>Dificuldade</b>. Use <b>inseticida</b> para remover pragas. O <b>Auto-pulverizar</b> vem habilitado por padrão.</div>`;
      aside.appendChild(wrap);

      // Layout
      const layout=document.createElement('div'); layout.className='cf-lav__layout'; layout.append(aside, gridCard);
      root.append(layout);
      return root;
    }catch(err){ const box=document.createElement('div'); box.className='cf-lav__err'; box.textContent='Falha ao abrir Lavouras. Reiniciei padrões e evitei travar a rota.'; try{ localStorage.removeItem('cf_tile_fields'); }catch(_){} return box; }
  }

  // =============== Painel por talhão ===============
  function openPanel(i){
    try{
      const s = GameState.get && GameState.get(); const p = (s && s.map && s.map[i]) || null; if(!p) return; ensureAutoDefaults(p);
      const w=document.getElementById('panel-fields'); if(!w) return; w.innerHTML='';

      // Não comprado
      if(!p.owned){ const card=document.createElement('div'); card.className='list'; const xx=(p.x!=null?p.x:i%8), yy=(p.y!=null?p.y:Math.floor(i/8)); card.innerHTML=`<div class="kv"><span>Talhão</span><b>(${xx+1},${yy+1})</b></div><div class="kv"><span>Preço</span><b>${CUR(p.price)}</b></div>`; const buy=document.createElement('button'); buy.textContent='Comprar talhão'; buy.onclick=()=> Land && Land.buy && Land.buy(i); card.appendChild(buy); w.appendChild(card); return; }

      const row1=document.createElement('div'); row1.className='row';
      const cropSel=document.createElement('select'); cropSel.className='input'; const list=(window.CROPS && typeof CROPS==='object')? Object.values(CROPS) : [{id:'milho'},{id:'soja'},{id:'trigo'}]; list.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.id; cropSel.appendChild(o); }); cropSel.value=p.auto.crop||'milho';
      const bPlant=document.createElement('button'); bPlant.textContent=`Plantar (${CUR((Machines && Machines.opCost? Machines.opCost('plant'):0))})`; bPlant.onclick=()=> Fields && Fields.plant && Fields.plant(i, cropSel.value);
      const bIrr=document.createElement('button');  bIrr.textContent=`Irrigar (~${CUR((Machines && Machines.opCost? Machines.opCost('spray'):0)*0.5)})`; bIrr.onclick=()=> Fields && Fields.irrigate && Fields.irrigate(i);
      const bFert=document.createElement('button'); bFert.textContent=`Adubar (${CUR((Machines && Machines.opCost? Machines.opCost('spray'):0))})`; bFert.onclick=()=> Fields && Fields.fertilize && Fields.fertilize(i);
      const bHarv=document.createElement('button'); bHarv.textContent=`Colher (${CUR((Machines && Machines.opCost? Machines.opCost('harvest'):0))})`; bHarv.onclick=()=> safeHarvest(i);
      row1.append(cropSel,bPlant,bIrr,bFert,bHarv);

      if(p.pest){ const bInsect=document.createElement('button'); const op=(Machines && Machines.opCost? Machines.opCost('spray'):0); bInsect.textContent=`Aplicar Inseticida (1x) (${CUR(op)} + estoque/emerg.)`; bInsect.onclick=()=> Fields && Fields.applyInsecticide && Fields.applyInsecticide(i); row1.appendChild(bInsect); }

      const row2=document.createElement('div'); row2.className='row';
      const autoCheck=document.createElement('input'); autoCheck.type='checkbox'; autoCheck.checked=!!p.auto.enabled; const autoLbl=document.createElement('label'); autoLbl.className='small'; autoLbl.textContent='Auto-plant';
      const replCheck=document.createElement('input'); replCheck.type='checkbox'; replCheck.checked=!!p.auto.replant; const replLbl=document.createElement('label'); replLbl.className='small'; replLbl.textContent='Auto-replant';
      const sprayCheck=document.createElement('input'); sprayCheck.type='checkbox'; sprayCheck.checked=!!p.auto.autoSpray; const sprayLbl=document.createElement('label'); sprayLbl.className='small'; sprayLbl.textContent='Auto-pulverizar (pragas)';
      const supportsAuto=(Fields && typeof Fields.setAuto==='function' && Fields.setAuto.length>=5);
      function persist(){ if(supportsAuto){ Fields.setAuto(i, autoCheck.checked, cropSel.value, replCheck.checked, sprayCheck.checked); } else { const st=GameState.get && GameState.get(); if(!st) return; const pf=st.map[i]; pf.auto=pf.auto||{}; pf.auto.enabled=!!autoCheck.checked; pf.auto.crop=cropSel.value; pf.auto.replant=!!replCheck.checked; pf.auto.autoSpray=!!sprayCheck.checked; GameState.save && GameState.save(st); Bus.emit && Bus.emit('fields', st.map); } }
      autoCheck.onchange=persist; replCheck.onchange=persist; sprayCheck.onchange=persist; cropSel.onchange=persist;

      const maxLvl=(window.CF_CONSTANTS && CF_CONSTANTS.MAX_PLOT_LEVEL) || 10; const nextLvl=Math.min(maxLvl,(p.sizeLevel||1)+1);
      const upg=document.createElement('button'); if((p.sizeLevel||1) < maxLvl){ const price=(Land && typeof Land.upgradeCost==='function')? Land.upgradeCost(i):0; upg.textContent=`Upgrade tamanho (T${p.sizeLevel}→T${nextLvl}) — ${CUR(price)}`; upg.onclick=()=> Land && Land.upgrade && Land.upgrade(i); } else { upg.textContent=`Tamanho máximo (T${p.sizeLevel})`; upg.disabled=true; }
      row2.append(autoCheck,autoLbl,replCheck,replLbl,sprayCheck,sprayLbl,upg);

      const info=document.createElement('div'); info.className='list';
      const invTotal=(function(){ try{ return Object.values(s.inventory||{}).reduce((a,b)=>a+(b||0),0); }catch(_){ return 0; } })();
      const cap=(Silos && Silos.totalCapacity? Silos.totalCapacity(s):0);
      const insetQt=(function(){ if (s?.inventory && typeof s.inventory['inseticida']==='number') return s.inventory['inseticida']; if (s?.items && typeof s.items['inseticida']==='number') return s.items['inseticida']; return 0; })();
      const metaC=p.crop? cropMeta(p.crop): null;
      const text=p.crop ? (
        `<div class="kv"><span>Estado</span><b>${p.crop} • ${typeof p.days==='number'?`dia ${p.days}/${metaC?.daysTotal}`:`estágio ${p.stage}/${(metaC?.stages||4)-1}`}</b></div>`+
        `<div class="kv"><span>Água</span><b>${(p.water*100|0)}%</b></div>`+
        `<div class="kv"><span>Fertilidade</span><b>${(p.fert*100|0)}%</b></div>`+
        `<div class="kv"><span>Pragas</span><b>${p.pest?'Sim':'Não'}</b></div>`
      ) : `<div class="kv"><span>Estado</span><b>Vazio</b></div>`;

      info.innerHTML = `<div class="kv"><span>Tamanho</span><b>T${p.sizeLevel}</b></div>`+
                       `<div class="kv"><span>Armazenagem</span><b>${invTotal}/${cap}</b></div>`+
                       `<div class="kv"><span>Inseticida (estoque)</span><b>${insetQt} frasco(s)</b></div>`+
                       text;

      const box=document.createElement('div'); box.className='list'; box.append(row1,row2,info); w.append(box);
    }catch(e){ console.error('openPanel error', e); }
  }

  // ================= Eventos =================
  function isLavourasTab(tab){ try{ return String(tab).toLowerCase()==='lavouras'; }catch(_){ return false; } }
  function mountIf(){ try{ if(isLavourasTab(Router.get && Router.get())) UI.mount && UI.mount(render()); }catch(e){ console.error('Lavouras render error', e); } }
  Bus.on && Bus.on('route',     tab=>{ if(isLavourasTab(tab)) UI.mount && UI.mount(render()); });
  Bus.on && Bus.on('fields',    ()=>{ mountIf(); });
  Bus.on && Bus.on('land',      ()=>{ mountIf(); });
  Bus.on && Bus.on('cap',       ()=>{ mountIf(); });
  Bus.on && Bus.on('machines',  ()=>{ mountIf(); });
  Bus.on && Bus.on('inventory', ()=>{ mountIf(); });

  mountIf();
})();