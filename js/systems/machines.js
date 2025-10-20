window.Machines = {
  catalog: CF_CONSTANTS.MACHINES.reduce((a,m)=>{ a[m.id]=m; return a; },{}),
  has(id){ return !!GameState.get().machines.owned[id]; },
  buy(id){ const s=GameState.get(); const m=this.catalog[id]; if(!m) return; if(this.has(id)){ Bus.emit('toast',{type:'err',text:'Já possui'}); return; }
    if(s.player.money<m.price){ Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return; }
    s.player.money-=m.price; GameState.expense(m.price); s.machines.owned[id]=true; GameState.addLog(`Comprou ${m.name} por R$ ${m.price}.`); Bus.emit('money', s.player.money); Bus.emit('machines'); },
  serviceCosts(){ const diff=GameState.get().meta.difficulty||'moderado'; const mult=CF_CONSTANTS.DIFFICULTY[diff].SERVICE_MULT; const B=CF_CONSTANTS.SERVICE_COSTS_BASE; return { plant:B.plant*mult, harvest:B.harvest*mult, spray:B.spray*mult, transport:B.transport*mult }; },
  rentalCosts(){ const diff=GameState.get().meta.difficulty||'moderado'; const mult=CF_CONSTANTS.DIFFICULTY[diff].RENTAL_MULT; const B=CF_CONSTANTS.RENTAL_COSTS_BASE; return { tractor:B.tractor*mult, planter:B.planter*mult, harvester:B.harvester*mult, sprayer:B.sprayer*mult, truck:B.truck*mult }; },
  opCost(op){
    const S=this.serviceCosts(); const R=this.rentalCosts();
    if(op==='plant'){ return (this.has('tractor') && this.has('planter')) ? S.plant : (S.plant + R.tractor + R.planter); }
    if(op==='harvest'){ return (this.has('tractor') && this.has('harvester')) ? S.harvest : (S.harvest + R.tractor + R.harvester); }
    if(op==='spray'){ return (this.has('tractor') && this.has('sprayer')) ? S.spray : (S.spray + R.tractor + R.sprayer); }
    if(op==='transport'){ return this.has('truck') ? S.transport : (S.transport + R.truck); }
    return 0;
  }
};