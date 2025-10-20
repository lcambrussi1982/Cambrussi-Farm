// Cambrussi Farm — Land (compra, avaliação e upgrade até T10)
// Depende: GameState, CF_CONSTANTS, Bus, Economy (opcional)
(function(){
  const fmt = (v)=> (window.Economy && Economy.format) ? Economy.format(v) : Number(v).toFixed(2);

  // ------- Helpers -------
  function maxLevel(){ return Number(CF_CONSTANTS.MAX_PLOT_LEVEL || 10); }
  function ensureDefaults(p){
    if(p.sizeLevel == null) p.sizeLevel = 1;
    if(p.owned == null) p.owned = false;
    if(p.price == null)  p.price = 0; // setado via seedPrices()
  }

  // preço base por talhão, usando LAND.basePrice/variance + leve ajuste por “distância” do canto
  // (deixa os mais afastados um pouco mais caros; evita tudo com preço igual)
  function basePriceForPlot(p){
    const L = CF_CONSTANTS.LAND || { basePrice: 300, variance: 120 };
    const bx = Number(L.basePrice || 300);
    const varr = Number(L.variance || 120);

    // pequeno fator de localização: mais longe do (0,0) => + até 12%
    const dist = Math.sqrt((p.x||0)*(p.x||0) + (p.y||0)*(p.y||0));
    const loc  = 1 + Math.min(0.12, dist * 0.02);

    // ruído estável por talhão (seed simples)
    const seed = ((p.x+1)*73856093 ^ (p.y+1)*19349663) & 0xffff;
    const r = (seed / 0xffff) * 2 - 1; // [-1, +1]
    const jitter = 1 + (r * 0.25);     // ±25%

    const price = Math.max(50, Math.round(bx * loc * jitter + varr * (r*0.5)));
    return price;
  }

  // custo de upgrade com base no preço do talhão (UPGRADE_* em CF_CONSTANTS)
  function upgradeCostFor(p){
    const baseRatio = Number(CF_CONSTANTS.UPGRADE_BASE_RATIO || 0.28);
    const exp       = Number(CF_CONSTANTS.UPGRADE_EXP || 1.22);
    const lvl       = Number(p.sizeLevel || 1);
    const base = Math.max(100, Number(p.price || 1000) * baseRatio);
    return Math.round(base * Math.pow(exp, Math.max(0, lvl-1)));
  }

  // ------- API -------
  window.Land = {
    // (re)semeia preços para todos os talhões sem preço
    seedPrices(){
      const s = GameState.get();
      (s.map||[]).forEach(p=>{
        ensureDefaults(p);
        if(!p.price || p.price <= 0){
          p.price = basePriceForPlot(p);
        }
      });
      Bus.emit('land'); // para refrescar UI
    },

    // quantos talhões próprios
    countOwned(){
      const s = GameState.get();
      return (s.map||[]).filter(p=>{ ensureDefaults(p); return !!p.owned; }).length;
    },

    // valor total de terras próprias (soma do preço de compra)
    totalLandValue(s){
      s = s || GameState.get();
      return (s.map||[]).filter(p=>{ ensureDefaults(p); return !!p.owned; })
                        .reduce((sum,p)=> sum + Number(p.price||0), 0);
    },

    // avaliação atual de um talhão (pode ser usado como colateral futuro)
    appraise(i){
      const s = GameState.get(); const p = s.map[i]; if(!p) return 0;
      ensureDefaults(p);
      // avaliação = preço base + um leve prêmio por nível
      const prem = 1 + 0.10 * Math.max(0, (p.sizeLevel||1) - 1);
      return Math.round(Number(p.price||basePriceForPlot(p)) * prem);
    },

    // comprar talhão
    buy(i){
      const s = GameState.get(); const p = s.map[i]; if(!p) return;
      ensureDefaults(p);
      if(p.owned){ Bus.emit('toast',{type:'ok',text:'Você já possui este talhão'}); return; }

      if(!p.price || p.price <= 0) p.price = basePriceForPlot(p);

      if(s.player.money < p.price){
        Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return;
      }

      s.player.money -= p.price; GameState.expense(p.price);
      p.owned = true;

      GameState.addLog(`Comprou talhão (${(p.x|0)+1},${(p.y|0)+1}) por R$ ${fmt(p.price)}.`);
      Bus.emit('money', s.player.money);
      Bus.emit('land', { action:'buy', i, owned:true, price:p.price });
      Bus.emit('fields', s.map);
    },

    // custo de upgrade calculado
    upgradeCost(i){
      const s = GameState.get(); const p = s.map[i]; if(!p) return Infinity;
      ensureDefaults(p);
      if((p.sizeLevel||1) >= maxLevel()) return Infinity;
      return upgradeCostFor(p);
    },

    // pode fazer upgrade?
    canUpgrade(i){
      const s = GameState.get(); const p = s.map[i]; if(!p) return false;
      ensureDefaults(p);
      return !!p.owned && (p.sizeLevel||1) < maxLevel();
    },

    // upgrade de tamanho até T10
    upgrade(i){
      const s = GameState.get(); const p = s.map[i]; if(!p) return;
      ensureDefaults(p);

      if(!this.canUpgrade(i)){
        Bus.emit('toast',{type:'err',text:'Tamanho máximo atingido'}); return;
      }

      const cost = this.upgradeCost(i);
      if(s.player.money < cost){
        Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente para upgrade'}); return;
      }

      s.player.money -= cost; GameState.expense(cost);
      p.sizeLevel = (p.sizeLevel||1) + 1;

      GameState.addLog(`Upgrade talhão (${(p.x|0)+1},${(p.y|0)+1}) para T${p.sizeLevel} (R$ ${fmt(cost)})`);
      Bus.emit('money', s.player.money);
      Bus.emit('land', { action:'upgrade', i, sizeLevel:p.sizeLevel, cost });
      Bus.emit('fields', s.map);
    }
  };

  // inicializa preços em saves antigos que não têm p.price
  try{ window.Land.seedPrices(); }catch(e){}
})();
