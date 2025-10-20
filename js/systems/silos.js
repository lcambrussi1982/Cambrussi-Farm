window.Silos = {
  totalCapacityByType(s, t){ const caps=CF_CONSTANTS.SILOS.levelCaps; return (s.silos||[]).filter(sl=>sl.type===t).reduce((sum,sl)=> sum + (caps[sl.level-1]||0), 0); },
  totalCapacity(s){ return CF_CONSTANTS.SILOS.types.reduce((acc,t)=> acc + Silos.totalCapacityByType(s,t), 0); },
  recomputeCapacity(s){ s.capacity = this.totalCapacity(s); Bus.emit('cap'); },
  newSiloCost(s){ const base=CF_CONSTANTS.SILOS.newSiloCostBase; const n=(s.silos||[]).length; return Math.round(base * (1 + n*0.25)); },
  upgradeCost(level){ return Math.round(CF_CONSTANTS.SILOS.upgradeCostBase * level * 1.2); },
  add(type='graos'){ const s=GameState.get(); const cost=this.newSiloCost(s);
    if(s.player.money<cost){ Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return; }
    s.player.money-=cost; GameState.expense(cost); (s.silos||[]).push({name:`Silo ${type[0].toUpperCase()+type.slice(1)}`, type, level:1});
    GameState.addLog(`Novo silo (${type}) por R$ ${cost}.`); this.recomputeCapacity(s); Bus.emit('money', s.player.money);
  },
  upgrade(idx){ const s=GameState.get(); const silo=s.silos[idx]; const max=CF_CONSTANTS.SILOS.maxLevel;
    if(silo.level>=max){ Bus.emit('toast',{type:'err',text:'Nível máximo do silo'}); return; }
    const cost=this.upgradeCost(silo.level);
    if(s.player.money<cost){ Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return; }
    s.player.money-=cost; GameState.expense(cost); silo.level+=1; GameState.addLog(`${silo.name}: upgrade para Nível ${silo.level} (R$ ${cost}).`); this.recomputeCapacity(s); Bus.emit('money', s.player.money);
  }
};