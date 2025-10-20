// Cambrussi Farm — CROPS unificado (com seeds, sprites, categorias e buff de rendimento)
(function(){
  // Categorias compatíveis com Silos: 'graos' | 'oleo' | 'fibra'
  // Dias encurtados e baseYield levemente maior para melhorar o fluxo de caixa
  window.CROPS = {
    milho: {
      id:'milho', seed:'seed_milho', sprite:'milho', cat:'graos',
      days:6, stages:4, waterNeed:0.90, fertNeed:0.90, baseYield:15
    },
    trigo: {
      id:'trigo', seed:'seed_trigo', sprite:'trigo', cat:'graos',
      days:5, stages:4, waterNeed:0.85, fertNeed:0.85, baseYield:13
    },
    soja: {
      id:'soja', seed:'seed_soja', sprite:'soja', cat:'graos',
      days:6, stages:4, waterNeed:0.90, fertNeed:0.90, baseYield:12
    },
    algodao: {
      id:'algodao', seed:'seed_algodao', sprite:'algodao', cat:'fibra',
      days:7, stages:4, waterNeed:0.95, fertNeed:0.95, baseYield:11
    },
    canola: {
      id:'canola', seed:'seed_canola', sprite:'canola', cat:'oleo',
      days:6, stages:4, waterNeed:0.90, fertNeed:0.90, baseYield:12
    },
    girassol: {
      id:'girassol', seed:'seed_girassol', sprite:'girassol', cat:'oleo',
      days:6, stages:4, waterNeed:0.90, fertNeed:0.90, baseYield:11
    }
  };

  // ===== Índices auxiliares (opcionais, não quebram nada) =====
  // Mapa: seedId -> cropId (ex.: 'seed_milho' => 'milho')
  window.CROPS_BY_SEED = Object.keys(CROPS).reduce((acc, k)=>{
    const c = CROPS[k]; if(c.seed) acc[c.seed] = c.id; return acc;
  }, {});

  // Mapa: categoria -> [cropIds]
  window.CROPS_BY_CAT = Object.keys(CROPS).reduce((acc, k)=>{
    const c = CROPS[k]; const cat = c.cat || 'outros';
    (acc[cat] ||= []).push(c.id); return acc;
  }, {});

  // Helper opcional: retorna o caminho de sprite já no padrão usado pela UI
  window.cropSpriteSrc = function(cropId, stage){
    const c = CROPS[cropId]; if(!c) return 'assets/crops/empty.svg';
    const st = Math.max(0, Math.min((c.stages||4)-1, stage|0));
    return `assets/crops/${c.sprite||cropId}_stage${st}.svg`;
  };
})();
