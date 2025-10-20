// Máquinas: catálogo, compra e custos de operação (serviço + aluguel quando necessário)
// Depende: GameState, CF_CONSTANTS, Bus, Economy (para formatar logs, opcional)
(function(){
  // ====== Helpers ======
  const round = (n)=> Math.max(0, Math.round(n||0));

  // Mapas de alias para aceitar PT/EN
  const ALIAS = {
    tractor: ['tractor','trator'],
    planter: ['planter','semeadeira'],
    harvester: ['harvester','colheitadeira'],
    sprayer: ['sprayer','pulverizador'],
    truck: ['truck','caminhao','caminhão']
  };

  // Converte um id qualquer para a chave canônica (tractor/planter/harvester/sprayer/truck)
  function canonical(id){
    id = String(id||'').toLowerCase();
    for(const key of Object.keys(ALIAS)){
      if(ALIAS[key].includes(id)) return key;
    }
    return id; // devolve como veio se não reconhecer (permite outras máquinas)
  }

  // pega multiplicadores/custos base da dificuldade
  function diffCfg(){
    const s = GameState.get();
    const d = (s.meta && s.meta.difficulty) || 'moderado';
    return CF_CONSTANTS.DIFFICULTY?.[d] || { COST_MULT: 1 };
  }

  // Bases padrão caso não existam em CF_CONSTANTS
  const DEFAULT_SERVICE_BASE = { plant:10, harvest:14, spray:7, transport:6 };
  const DEFAULT_RENTAL_BASE  = { tractor:6, planter:7, harvester:9, sprayer:6, truck:5 };

  // Lê bases de CF_CONSTANTS ou usa defaults
  function serviceBase(){
    const B = CF_CONSTANTS.SERVICE_COSTS_BASE || DEFAULT_SERVICE_BASE;
    // normaliza chaves que venham com outros nomes, mantendo compat
    return {
      plant:     Number(B.plant ?? DEFAULT_SERVICE_BASE.plant),
      harvest:   Number(B.harvest ?? DEFAULT_SERVICE_BASE.harvest),
      spray:     Number(B.spray ?? DEFAULT_SERVICE_BASE.spray),
      transport: Number(B.transport ?? DEFAULT_SERVICE_BASE.transport)
    };
  }
  function rentalBase(){
    const B = CF_CONSTANTS.RENTAL_COSTS_BASE || DEFAULT_RENTAL_BASE;
    return {
      tractor:   Number(B.tractor ?? DEFAULT_RENTAL_BASE.tractor),
      planter:   Number(B.planter ?? DEFAULT_RENTAL_BASE.planter),
      harvester: Number(B.harvester ?? DEFAULT_RENTAL_BASE.harvester),
      sprayer:   Number(B.sprayer ?? DEFAULT_RENTAL_BASE.sprayer),
      truck:     Number(B.truck ?? DEFAULT_RENTAL_BASE.truck)
    };
  }

  // ====== Módulo ======
  window.Machines = {
    // catálogo de máquinas (compatível com CF_CONSTANTS.MACHINES)
    catalog: (CF_CONSTANTS.MACHINES || []).reduce((acc, m)=>{
      if(m?.id) acc[m.id] = m;
      return acc;
    }, {}),

    // normaliza id e verifica posse
    has(id){
      const s = GameState.get();
      const key = canonical(id);
      const owned = s?.machines?.owned || {};
      // aceita tanto chave canônica quanto variações que já estejam salvas
      return !!(owned[key] || owned[id]);
    },

    // compra máquina do catálogo
    buy(id){
      const s = GameState.get();
      const item = this.catalog[id] || this.catalog[canonical(id)];
      if(!item){ Bus.emit('toast',{type:'err',text:'Máquina inválida'}); return; }
      if(this.has(item.id)){ Bus.emit('toast',{type:'err',text:'Já possui'}); return; }
      if(s.player.money < item.price){ Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return; }

      s.player.money -= item.price;
      GameState.expense(item.price);
      s.machines = s.machines || { owned:{} };
      s.machines.owned[item.id] = true;

      GameState.addLog(`Comprou ${item.name||item.id} por R$ ${Economy ? Economy.format(item.price) : item.price}.`);
      Bus.emit('money', s.player.money);
      Bus.emit('machines');
    },

    // custos de serviço (sem aluguel)
    serviceCosts(){
      const D = diffCfg();
      const B = serviceBase();
      return {
        plant:     round(B.plant     * (D.COST_MULT||1)),
        harvest:   round(B.harvest   * (D.COST_MULT||1)),
        spray:     round(B.spray     * (D.COST_MULT||1)),
        transport: round(B.transport * (D.COST_MULT||1))
      };
    },

    // custos de aluguel (quando não possui a máquina)
    rentalCosts(){
      const D = diffCfg();
      const B = rentalBase();
      return {
        tractor:   round(B.tractor   * (D.COST_MULT||1)),
        planter:   round(B.planter   * (D.COST_MULT||1)),
        harvester: round(B.harvester * (D.COST_MULT||1)),
        sprayer:   round(B.sprayer   * (D.COST_MULT||1)),
        truck:     round(B.truck     * (D.COST_MULT||1))
      };
    },

    /**
     * Custo de operação: serviço + aluguel (se necessário)
     * kind: 'plant' | 'harvest' | 'spray' | 'transport'
     */
    opCost(kind){
      const S = this.serviceCosts();
      const R = this.rentalCosts();
      switch(kind){
        case 'plant': {
          const need = [ 'tractor','planter' ];
          const rent = need.reduce((sum, m)=> sum + (this.has(m) ? 0 : R[m]), 0);
          return round(S.plant + rent);
        }
        case 'harvest': {
          const need = [ 'tractor','harvester' ];
          const rent = need.reduce((sum, m)=> sum + (this.has(m) ? 0 : R[m]), 0);
          return round(S.harvest + rent);
        }
        case 'spray': {
          const need = [ 'tractor','sprayer' ];
          const rent = need.reduce((sum, m)=> sum + (this.has(m) ? 0 : R[m]), 0);
          return round(S.spray + rent);
        }
        case 'transport': {
          const need = [ 'truck' ];
          const rent = need.reduce((sum, m)=> sum + (this.has(m) ? 0 : R[m]), 0);
          return round(S.transport + rent);
        }
        default:
          return 0;
      }
    }
  };
})();
