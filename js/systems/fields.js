window.Fields = {
  plant(i, cropId, opts={}){
    const s=GameState.get(); const p=s.map[i]; if(!p.owned){ Bus.emit('toast',{type:'err',text:'Compre este talhão primeiro'}); return; }
    const crop=CROPS[cropId]; if(!crop) return; if(p.crop){ Bus.emit('toast',{type:'err',text:'Já plantado'}); return; }
    const opCost = Machines.opCost('plant');
    if(s.player.money<opCost){ Bus.emit('toast',{type:'err',text:'Sem dinheiro para o plantio'}); return; }
    s.player.money-=opCost; GameState.expense(opCost);
    p.crop=crop.id; p.stage=0; p.days=0; p.water=Math.max(0.6,p.water); p.fert=Math.max(0.6,p.fert); p.pest=false; p.ready=false;
    if(opts.autoSet){ p.auto.enabled=true; p.auto.crop=crop.id; }
    GameState.addLog(`Plantio de ${crop.id} (custo op: R$ ${opCost.toFixed(2)}).`);
    Bus.emit('fields', s.map); Bus.emit('money', s.player.money);
  },
  harvest(i){
    const s=GameState.get(); const p=s.map[i]; if(!p.ready){ Bus.emit('toast',{type:'err',text:'Ainda não está pronto'}); return; }
    const crop=CROPS[p.crop]; if(!crop) return;
    const opCost = Machines.opCost('harvest');
    if(s.player.money<opCost){ Bus.emit('toast',{type:'err',text:'Sem dinheiro para colher'}); return; }
    const D = CF_CONSTANTS.DIFFICULTY[s.meta.difficulty||'moderado'];
    // rendimento
    const wf=Math.min(1,Math.max(0,(p.water/crop.waterNeed))); const ff=Math.min(1,Math.max(0,(p.fert/crop.fertNeed))); const pf=p.pest?0.7:1;
    const sizeMult = p.sizeLevel===1?1 : (p.sizeLevel===2?1.25:1.5);
    const units=Math.max(1,Math.round(crop.baseYield*wf*ff*pf*sizeMult));
    s.player.money -= opCost; GameState.expense(opCost);
    if(Inventory.add(crop.id, units)){
      s.metrics.produced[crop.id]=(s.metrics.produced[crop.id]||0)+units;
      GameState.addLog(`Colheita: ${units}x ${crop.id}.`);
    }
    const replant = (p.auto.enabled && p.auto.replant) ? (p.auto.crop||crop.id) : null;
    p.crop=null;p.stage=0;p.days=0;p.ready=false;p.pest=false;p.water=Math.max(0.3,p.water-0.2);p.fert=Math.max(0.3,p.fert-0.2);
    Bus.emit('fields', s.map);
    if(replant){ setTimeout(()=>Fields.plant(i, replant), 20); }
  },
  setAuto(i, enabled, cropId, replant){ const s=GameState.get(); const p=s.map[i]; p.auto.enabled=enabled; if(cropId) p.auto.crop=cropId; p.auto.replant=!!replant; Bus.emit('fields', s.map); },
  irrigate(i){ const s=GameState.get(); const p=s.map[i]; if(!p.owned) return; const cost = Machines.opCost('spray')*0.5; if(s.player.money<cost){ Bus.emit('toast',{type:'err',text:'Sem dinheiro'}); return; } s.player.money-=cost; GameState.expense(cost); p.water=Math.min(1, p.water+0.25); Bus.emit('fields', s.map); Bus.emit('money', s.player.money); },
  fertilize(i){ const s=GameState.get(); const p=s.map[i]; if(!p.owned) return; const cost = Machines.opCost('spray'); if(s.player.money<cost){ Bus.emit('toast',{type:'err',text:'Sem dinheiro'}); return; } s.player.money-=cost; GameState.expense(cost); p.fert=Math.min(1,p.fert+0.35); Bus.emit('fields', s.map); Bus.emit('money', s.player.money); },
  daily(s){
    const pestChance = CF_CONSTANTS.DIFFICULTY[s.meta.difficulty||'moderado'].PEST_CHANCE;
    s.map.forEach((p,i)=>{
      if(!p.owned){ return; }
      if(!p.crop && p.auto.enabled && p.auto.crop){ Fields.plant(i, p.auto.crop); }
      if(!p.crop) return;
      const crop=CROPS[p.crop];
      p.days += 1;
      p.water = s.weather.rain? Math.min(1, p.water+0.3) : Math.max(0, p.water-0.18);
      if(Math.random() < pestChance) p.pest = true;
      const stage = Math.min(crop.stages-1, Math.floor((p.days / crop.days) * crop.stages));
      p.stage = stage;
      if(p.days >= crop.days){ p.ready = true; }
    });
    Bus.emit('fields', s.map);
  }
};