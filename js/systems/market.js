// Cambrussi Farm — Mercado unificado (sazonalidade + dificuldade + mean reversion)
// Depende: GameState, CF_CONSTANTS, Bus
(function(){
  const round2 = (n)=> Math.round(n * 100) / 100;

  // fallback se não houver floor/ceil
  const BASE_PRICES_FALLBACK = { milho: 9, trigo: 8, soja: 13, algodao: 16, canola: 12, girassol: 11 };

  function diffCfg(){
    const s = GameState.get();
    const d = (s.meta && s.meta.difficulty) || 'moderado';
    return CF_CONSTANTS.DIFFICULTY?.[d] || { PRICE_MULT:1, MARKET_VOL:0.08 };
  }

  // volatilidade efetiva = base * (1 + MARKET_VOL da dificuldade)
  function effectiveVolatility(){
    const base = Number(CF_CONSTANTS.MARKET?.dailyVolatility ?? 0.08);
    const D = diffCfg();
    return Math.max(0, base * (1 + Number(D.MARKET_VOL || 0)));
  }

  // chaves dos ativos disponíveis (preferir floor/ceil do config; senão, base fallback)
  function productKeys(){
    const floors = CF_CONSTANTS.MARKET?.floor || {};
    const keys = Object.keys(floors);
    if(keys.length > 0) return keys;
    return Object.keys(BASE_PRICES_FALLBACK);
  }

  // preço inicial: centro do intervalo * jitter ±10% * PRICE_MULT (ou base fallback * jitter)
  function seedPrice(id){
    const D = diffCfg();
    const floors = CF_CONSTANTS.MARKET?.floor || {};
    const ceils  = CF_CONSTANTS.MARKET?.ceil  || {};
    const hasBounds = floors[id] != null && ceils[id] != null;

    const jitter = 1 + (Math.random()*0.20 - 0.10); // ±10%
    let p0;

    if(hasBounds){
      const mid = (floors[id] + ceils[id]) / 2;
      p0 = mid * jitter * Number(D.PRICE_MULT || 1);
      // clamp por segurança
      p0 = Math.min(ceils[id], Math.max(floors[id], p0));
    } else {
      const base = BASE_PRICES_FALLBACK[id] ?? 10;
      p0 = base * jitter * Number(D.PRICE_MULT || 1);
    }
    return round2(p0);
  }

  // Um passo diário: random walk + viés sazonal + mean reversion para o "mid"
  function nextPrice(id, curr, season){
    const floors = CF_CONSTANTS.MARKET?.floor || {};
    const ceils  = CF_CONSTANTS.MARKET?.ceil  || {};
    const biasMap= CF_CONSTANTS.MARKET?.seasonBias || {};
    const vol    = effectiveVolatility();

    const biasBySeason = biasMap?.[season] || {};
    const bias = Number(biasBySeason?.[id] || 0);       // viés da estação para a commodity
    const rnd  = (Math.random()*2 - 1) * vol;           // ruído simétrico
    const mid  = (floors[id] != null && ceils[id] != null) ? (floors[id]+ceils[id])/2 : curr;

    const kappa = 0.08; // força do mean reversion (0=off, 0.05-0.15 bom)
    let next = curr * (1 + rnd + bias) + kappa * (mid - curr);

    // clamp se tiver faixa definida
    if(floors[id] != null && ceils[id] != null){
      next = Math.min(ceils[id], Math.max(floors[id], next));
    }
    return round2(next);
  }

  window.Market = {
    // Recria estrutura e (re)semeia preços
    init(){
      const s = GameState.get();
      s.market = s.market || {};
      s.market.prices = s.market.prices || {};
      s.market.volatility = effectiveVolatility(); // salva para debug/UI

      const keys = productKeys();
      keys.forEach(id=>{
        s.market.prices[id] = seedPrice(id);
      });

      // temporada inicial se não houver
      if(!s.weather) s.weather = {};
      if(!s.weather.season){
        // se o seu sistema já define as estações, remova este default
        s.weather.season = 'Verão';
      }

      Bus.emit('market', {...s.market.prices});
      return s.market.prices;
    },

    // Atualiza volatilidade efetiva (caso mude a dificuldade em runtime)
    refreshVolatility(){
      const s = GameState.get();
      if(!s.market) s.market = {};
      s.market.volatility = effectiveVolatility();
      return s.market.volatility;
    },

    // Recria preços (nova semente), útil ao iniciar um save novo
    refresh(){
      const prices = this.init();
      Bus.emit('market', {...prices});
      return prices;
    },

    // Avança um dia de mercado (usar no ciclo diário do jogo)
    daily(){
      const s = GameState.get();
      if(!s.market || !s.market.prices) this.init();

      const season = (s.weather && s.weather.season) || 'Verão';
      const keys = productKeys();
      keys.forEach(id=>{
        const curr = s.market.prices[id] ?? seedPrice(id);
        s.market.prices[id] = nextPrice(id, curr, season);
      });

      Bus.emit('market', {...s.market.prices});
      return s.market.prices;
    },

    // Troca de estação (se seu sistema de clima chamar isso)
    setSeason(season){
      const s = GameState.get();
      s.weather = s.weather || {};
      s.weather.season = season;
      // opcional: ajuste instantâneo leve ao mudar estação
      this.daily();
    }
  };

  // inicializa se necessário
  try {
    const s = GameState.get();
    if(!s.market || !s.market.prices || Object.keys(s.market.prices).length === 0){
      window.Market.init();
    } else {
      window.Market.refreshVolatility();
      Bus.emit('market', {...s.market.prices});
    }
  } catch(e){
    // silencioso: init será chamado quando GameState estiver disponível
  }
})();
