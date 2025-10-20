// Cambrussi Farm — Fields (Talhões) COMPLETO e unificado
// Depende: GameState, CROPS, Inventory, Machines, Dryer, CF_CONSTANTS, Bus, Economy

(function(){
  // ---------- Helpers ----------
  const num = (v, d=0)=> (typeof v==='number' && !isNaN(v)) ? v : d;

  function diffCfg(){
    const s = GameState.get();
    const d = (s.meta && s.meta.difficulty) || 'moderado';
    return CF_CONSTANTS.DIFFICULTY?.[d] || { YIELD_MULT:1, PEST_CHANCE:0.08 };
  }

  function clamp01(x){ return Math.max(0, Math.min(1, x)); }

  function ensurePlotDefaults(p){
    p.sizeLevel = num(p.sizeLevel, 1);
    p.water     = num(p.water, 0.5);
    p.fert      = num(p.fert, 0.5);
    p.days      = num(p.days, 0);
    p.stage     = num(p.stage, 0);
    p.ready     = !!p.ready;
    p.pest      = !!p.pest;
    p.auto = p.auto || { enabled:false, crop:'milho', replant:false, autoSpray:true };
    if(typeof p.auto.autoSpray==='undefined') p.auto.autoSpray = true;
    if(typeof p.auto.crop!=='string') p.auto.crop = 'milho';
  }

  function sizeMultiplier(level){
    const step   = num(CF_CONSTANTS.SIZE_YIELD_STEP, 0.12);
    const maxLvl = num(CF_CONSTANTS.MAX_PLOT_LEVEL, 10);
    const lvl    = Math.min(num(level,1), maxLvl);
    return 1 + step * (lvl - 1); // T1=1.00 ... T10≈ +108% se step=0.12
  }

  function yieldUnits(p, crop, D){
    // fatores
    const wf = clamp01(num(p.water) / num(crop.waterNeed, 1));
    const ff = clamp01(num(p.fert)  / num(crop.fertNeed, 1));
    const pf = p.pest ? 0.7 : 1;

    const base = num(crop.baseYield, 10);
    const sizeMult = sizeMultiplier(p.sizeLevel);
    const yGlob = num(CF_CONSTANTS.YIELD_GLOBAL, 1);

    const units = Math.max(1, Math.round(base * wf * ff * pf * sizeMult * num(D.YIELD_MULT,1) * yGlob));
    return units;
  }

  function hasRain(s){ return !!(s.weather && s.weather.rain); }

  function log(msg){ try{ GameState.addLog(msg); }catch{} }

  // ---------- Módulo ----------
  window.Fields = {
    // Plantio
    plant(i, cropId, opts={}){
      const s = GameState.get(); const p = s.map[i];
      if(!p || !p.owned){ Bus.emit('toast',{type:'err',text:'Compre este talhão primeiro'}); return; }
      ensurePlotDefaults(p);

      const crop = CROPS[cropId]; if(!crop){ Bus.emit('toast',{type:'err',text:'Cultura inválida'}); return; }
      if(p.crop){ Bus.emit('toast',{type:'err',text:'Já plantado'}); return; }

      const opCost = Machines.opCost('plant');
      if(s.player.money < opCost){ Bus.emit('toast',{type:'err',text:'Sem dinheiro para o plantio'}); return; }

      s.player.money -= opCost; GameState.expense(opCost);

      p.crop  = crop.id;
      p.stage = 0;
      p.days  = 0;
      p.water = Math.max(0.6, num(p.water, 0.5));
      p.fert  = Math.max(0.6, num(p.fert, 0.5));
      p.pest  = false;
      p.ready = false;

      if(opts.autoSet){ p.auto.enabled = true; p.auto.crop = crop.id; }

      log(`Plantio de ${crop.id} (R$ ${Economy ? Economy.format(opCost) : opCost}).`);
      Bus.emit('fields', s.map); Bus.emit('money', s.player.money);
    },

    // Irrigação (usa custo de spray/2, sem consumo de item)
    irrigate(i){
      const s = GameState.get(); const p = s.map[i];
      if(!p || !p.owned) return; ensurePlotDefaults(p);

      const cost = Machines.opCost('spray') * 0.5;
      if(s.player.money < cost){ Bus.emit('toast',{type:'err',text:'Sem dinheiro'}); return; }

      s.player.money -= cost; GameState.expense(cost);
      p.water = clamp01(num(p.water,0.5) + 0.25);

      log(`Irrigação no talhão (${p.x+1},${p.y+1}) — custo R$ ${Economy ? Economy.format(cost) : cost}.`);
      Bus.emit('fields', s.map); Bus.emit('money', s.player.money);
    },

    // Adubação (usa custo de spray; simples — sem item; adapte para consumir 'adubo_npk' se quiser)
    fertilize(i){
      const s = GameState.get(); const p = s.map[i];
      if(!p || !p.owned) return; ensurePlotDefaults(p);

      const cost = Machines.opCost('spray');
      if(s.player.money < cost){ Bus.emit('toast',{type:'err',text:'Sem dinheiro'}); return; }

      s.player.money -= cost; GameState.expense(cost);
      p.fert = clamp01(num(p.fert,0.5) + 0.35);

      log(`Adubação no talhão (${p.x+1},${p.y+1}) — custo R$ ${Economy ? Economy.format(cost) : cost}.`);
      Bus.emit('fields', s.map); Bus.emit('money', s.player.money);
    },

    // Colheita
    harvest(i){
      const s = GameState.get(); const p = s.map[i];
      if(!p || !p.owned){ Bus.emit('toast',{type:'err',text:'Compre este talhão primeiro'}); return; }
      ensurePlotDefaults(p);

      if(!p.ready){ Bus.emit('toast',{type:'err',text:'Ainda não está pronto'}); return; }
      const crop = CROPS[p.crop]; if(!crop){ Bus.emit('toast',{type:'err',text:'Cultura inválida'}); return; }

      const opCost = Machines.opCost('harvest');
      if(s.player.money < opCost){ Bus.emit('toast',{type:'err',text:'Sem dinheiro para colher'}); return; }

      const D = diffCfg();
      const units = yieldUnits(p, crop, D);

      s.player.money -= opCost; GameState.expense(opCost);

      if(hasRain(s) && typeof Dryer?.enqueue === 'function'){
        Dryer.enqueue(crop.id, units);
        log(`Colheita úmida enviada ao Secador: ${units}x ${crop.id}.`);
      }else{
        Inventory.add(crop.id, units);
        log(`Colheita: ${units}x ${crop.id}.`);
      }

      // pós-colheita
      const replant = (p.auto?.enabled && p.auto?.replant) ? (p.auto.crop || crop.id) : null;
      p.crop=null; p.stage=0; p.days=0; p.ready=false; p.pest=false;
      p.water=Math.max(0.3, num(p.water,0.5)-0.2);
      p.fert =Math.max(0.3, num(p.fert ,0.5)-0.2);

      Bus.emit('fields', s.map); Bus.emit('money', s.player.money);

      if(replant){ setTimeout(()=>window.Fields.plant(i, replant), 25); }
    },

    // Configuração de automação (com autoSpray opcional)
    setAuto(i, enabled, cropId, replant, autoSpray){
      const s = GameState.get(); const p = s.map[i];
      if(!p) return; ensurePlotDefaults(p);

      p.auto.enabled = !!enabled;
      if(cropId) p.auto.crop = cropId;
      p.auto.replant = !!replant;
      if(typeof autoSpray !== 'undefined') p.auto.autoSpray = !!autoSpray;

      GameState.save(s); Bus.emit('fields', s.map);
    },

    // Inseticida (manual e usado pelo autoSpray)
    applyInsecticide(i){
      const s = GameState.get(); const p = s.map[i];
      if(!p || !p.owned){ Bus.emit('toast',{type:'err',text:'Compre este talhão primeiro'}); return; }
      ensurePlotDefaults(p);

      if(!p.crop){ Bus.emit('toast',{type:'err',text:'Nada plantado aqui'}); return; }
      if(!p.pest){ Bus.emit('toast',{type:'ok',text:'Sem pragas neste talhão'}); return; }

      const opCost = Machines.opCost('spray');
      const emergencyPrice = 30; // compra de emergência se faltar frasco
      let extra = 0;

      const hasStock = num(GameState.get().inventory?.inseticida, 0) > 0;

      if(!hasStock){
        if(s.player.money < opCost + emergencyPrice){
          Bus.emit('toast',{type:'err',text:'Sem inseticida e dinheiro insuficiente para emergência'});
          return;
        }
        extra = emergencyPrice;
      }else{
        if(s.player.money < opCost){
          Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente para pulverizar'}); return;
        }
      }

      s.player.money -= (opCost + extra);
      GameState.expense(opCost + extra);

      if(hasStock){
        s.inventory.inseticida -= 1;
      }else{
        log(`Compra de emergência: 1x Inseticida (R$ ${Economy ? Economy.format(emergencyPrice) : emergencyPrice})`);
      }

      p.pest = false;

      log(`Pulverização no talhão (${p.x+1},${p.y+1}) em ${p.crop} — op R$ ${Economy ? Economy.format(opCost) : opCost}${extra?` + emergência R$ ${Economy ? Economy.format(extra) : extra}`:''}.`);
      Bus.emit('inventory', {...s.inventory});
      Bus.emit('money', s.player.money);
      Bus.emit('fields', s.map);
    },

    // Avanço diário (crescimento, consumo de água, chance de praga e automações)
    daily(s){
      const D = diffCfg();

      s.map.forEach((p,i)=>{
        if(!p || !p.owned) return;
        ensurePlotDefaults(p);

        // auto-plant (se vazio)
        if(!p.crop && p.auto.enabled && p.auto.crop){
          window.Fields.plant(i, p.auto.crop);
        }
        if(!p.crop) return;

        const crop = CROPS[p.crop]; if(!crop) return;

        // dia, água e praga
        p.days = num(p.days,0) + 1;
        p.water = hasRain(s) ? clamp01(num(p.water,0.5) + 0.30)
                             : clamp01(num(p.water,0.5) - 0.18);

        if(Math.random() < num(D.PEST_CHANCE, 0.08)) p.pest = true;

        // estágio e maturidade
        const prog  = num(p.days,0) / num(crop.days,1);
        p.stage = Math.min(num(crop.stages,4)-1, Math.floor(prog * num(crop.stages,4)));
        if(p.days >= num(crop.days,1)){ p.ready = true; }

        // auto-pulverizar
        if(p.pest && p.auto.autoSpray){
          window.Fields.applyInsecticide(i);
        }
      });

      Bus.emit('fields', s.map);
    }
  };
})();
