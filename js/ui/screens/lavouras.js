(function(){
  // ================== Mapa da Fazenda — v20 Upgrade ==================
  // Objetivo:
  // - Aumentar o tamanho dos quadradinhos (tiles) com controle de tamanho
  // - Mostrar no CENTRO de cada talhão um ícone/imagem indicando o estado:
  //     • recém plantado  • em crescimento  • perto da colheita  • pronto p/ colher
  // - Não quebra código existente; injeta seção "Mapa" dentro da rota Terras/Lavouras
  // Requisitos: GameState, UI, Bus, Router, (opcional) CROPS, Land

  // ================== Estilos ==================
  (function ensureStyle(){
    const ID='cf-map-style-v20'; if(document.getElementById(ID)) return;
    const st=document.createElement('style'); st.id=ID; st.textContent=`
      .farm-map{ --tile: 84px; --cols: 8; --gap: 8px; }
      .farm-map .toolbar{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
      .farm-map-grid{ display:grid; grid-template-columns: repeat(var(--cols), var(--tile)); gap: var(--gap); align-items:center; justify-content:flex-start; }
      .farm-plot{ position:relative; width: var(--tile); height: var(--tile); border-radius: 10px; overflow:hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
      .farm-plot .soil{ position:absolute; inset:0; background: linear-gradient(180deg, #6b4f2a 0%, #5a4426 100%); }
      .farm-plot .center-icon{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size: calc(var(--tile) * .55); filter: drop-shadow(0 1px 0 rgba(0,0,0,.25)); pointer-events:none; }
      .farm-plot .badge{ position:absolute; bottom:4px; right:4px; font-size:12px; line-height:1; padding:3px 6px; border-radius:999px; background:rgba(0,0,0,.35); color:#fff; }
      .farm-plot.empty .soil{ background: repeating-linear-gradient(45deg, #70512d, #70512d 10px, #664a2a 10px, #664a2a 20px); opacity:.9; }
      .farm-plot.just   { outline: 2px solid rgba(34,197,94,.45); }
      .farm-plot.mid    { outline: 2px solid rgba(59,130,246,.35); }
      .farm-plot.near   { outline: 2px solid rgba(234,179,8,.55); }
      .farm-plot.ready  { outline: 2px solid rgba(16,185,129,.65); }
    `; document.head.appendChild(st);
  })();

  // ================== Utilitários ==================
  const S = {
    get(){ return (typeof GameState!=='undefined' && GameState.get)? GameState.get() : {}; },
    setTileSize(px){ localStorage.setItem('cf_map_tile', String(px)); },
    getTileSize(){ return Number(localStorage.getItem('cf_map_tile')||'96'); },
    setCols(n){ localStorage.setItem('cf_map_cols', String(n)); },
    getCols(defaultCols){ return Number(localStorage.getItem('cf_map_cols')||defaultCols||8); }
  };

  // Heurística para obter lista de talhões do state (genérica p/ diferentes versões)
  function getPlots(state){
    // Prioridades comuns
    if(state.fields && Array.isArray(state.fields.list)) return state.fields.list;               // {crop, plantedDay, size, status}
    if(state.lands && Array.isArray(state.lands.plots))  return state.lands.plots;               // {cropId, plantedAt, size}
    if(Array.isArray(state.terras)) return state.terras;                                         // genérico
    if(typeof Land!=='undefined' && Land.getAll) return Land.getAll(state);                      // fallback API
    return []; // desconhecido
  }

  // Dados de crescimento (genérico). Usa CROPS[cropId].daysToHarvest se existir.
  function cropDaysToHarvest(cropId){
    try{ const c = (typeof CROPS!=='undefined' && CROPS[cropId])? CROPS[cropId] : null; return c?.daysToHarvest || c?.growDays || 10; }catch(e){ return 10; }
  }

  // Dias desde plantio (heurística para vários formatos)
  function daysSincePlanted(plot, state){
    const dayNow = state?.time?.day || 1;
    const planted = plot.plantedDay || plot.plantedAt || plot.day || plot.start || null;
    if(typeof planted==='number') return Math.max(0, (dayNow - planted));
    // alguns estados guardam progresso direto
    if(typeof plot.growthDays==='number') return Math.max(0, plot.growthDays);
    return 0; // desconhecido
  }

  function stageOf(plot, state){
    if(!plot || !plot.crop && !plot.cropId) return {key:'empty', icon:'', badge:'Livre'};
    const crop = (plot.crop||plot.cropId||'').toString();
    const total = cropDaysToHarvest(crop);
    const ds = daysSincePlanted(plot, state);
    const remaining = Math.max(0, total - ds);
    if(ds<=2) return {key:'just',  icon:'\uD83C\uDF31', badge:'Plantada'};       // 🌱
    if(remaining<=0) return {key:'ready', icon:'\u2705', badge:'Colher'};         // ✅
    if(remaining<=2) return {key:'near',  icon:'\uD83C\uDF3E', badge:'Perto'};   // 🌾
    return {key:'mid', icon:'\uD83C\uDF33', badge:'Crescendo'};                  // 🌳
  }

  // ================== Render do Mapa ==================
  function renderMap(){
    const s = S.get();
    const root = document.createElement('div'); root.className='farm-map';

    // Toolbar (tamanho e colunas)
    const tb = document.createElement('div'); tb.className='toolbar';
    const lbl1=document.createElement('label'); lbl1.textContent='Tamanho do tile:';
    const range=document.createElement('input'); range.type='range'; range.min='64'; range.max='160'; range.step='4'; range.value=String(S.getTileSize());
    range.oninput = ()=>{ root.style.setProperty('--tile', range.value+'px'); S.setTileSize(Number(range.value)); };
    const lbl2=document.createElement('label'); lbl2.textContent='Colunas:';
    const colsInp=document.createElement('input'); colsInp.type='number'; colsInp.min='4'; colsInp.max='20'; colsInp.value=String(S.getCols()); colsInp.style.width='72px';
    colsInp.onchange = ()=>{ grid.style.setProperty('--cols', String(Math.max(4, Math.min(20, parseInt(colsInp.value||'8'))))); S.setCols(parseInt(colsInp.value||'8')); };
    tb.append(lbl1, range, lbl2, colsInp);

    // Grid
    const grid = document.createElement('div'); grid.className='farm-map-grid';
    grid.style.setProperty('--tile', S.getTileSize()+'px');
    grid.style.setProperty('--cols', S.getCols(getDefaultCols()) );

    // Plots
    const plots = getPlots(s);
    plots.forEach((p, idx)=>{
      const tile=document.createElement('div'); tile.className='farm-plot';
      const soil=document.createElement('div'); soil.className='soil'; tile.appendChild(soil);

      const st=stageOf(p, s); tile.classList.add(st.key);
      const center=document.createElement('div'); center.className='center-icon';

      // Se houver imagens configuradas, usa; senão usa emojis como padrão
      const imgMap = (s?.ui?.mapStageImages) || (window.CF_CONSTANTS?.CROP_STAGE_IMAGES) || null;
      if(imgMap && imgMap[st.key]){
        const im=document.createElement('img'); im.src=imgMap[st.key]; im.alt=st.key; im.style.maxWidth='80%'; im.style.maxHeight='80%'; im.style.objectFit='contain'; center.appendChild(im);
      }else{
        center.textContent = st.icon; // emoji fallback
      }

      const badge=document.createElement('div'); badge.className='badge'; badge.textContent=st.badge;
      tile.append(center, badge);

      // Title/tooltip informativo
      const cropName = (p.cropName||p.crop||p.cropId||'vazio');
      tile.title = `${cropName}\nDias desde plantio: ${daysSincePlanted(p,s)}\nEstágio: ${st.badge}`;

      grid.appendChild(tile);
    });

    root.append(tb, grid);
    return root;
  }

  function getDefaultCols(){
    const s = S.get(); const count = getPlots(s).length || 16; // quadrado aproximado
    return Math.max(6, Math.round(Math.sqrt(count)));
  }

  // ================== Integração com a UI ==================
  function mount(){
    const section = UI.section('Mapa da Fazenda');
    section.appendChild(renderMap());
    return section;
  }

  // Exibe o mapa dentro das rotas "terras" e "lavouras" (sem criar rota nova)
  Bus.on('route', (tab)=>{ if(tab==='terras' || tab==='lavouras'){ const c = mount(); UI.mount(c); } });
  // Atualiza mapa quando houver avanço de tempo/metrics
  Bus.on('metrics', ()=>{ if(Router.get()==='terras' || Router.get()==='lavouras'){ const c = mount(); UI.mount(c); } });
})();