window.Inventory = {
  productCategory(id){ return (CROPS[id]&&CROPS[id].cat)||'graos'; },
  capacityForProduct(s, id){ const cat=this.productCategory(id); return Silos.totalCapacityByType(s, cat); },
  totalStored(s){ return Object.values(s.inventory).reduce((a,b)=>a+b,0); },
  add(id, qty=1){ const s=GameState.get(); const cap = this.capacityForProduct(s, id);
    const cur = s.inventory[id]||0; const free = Math.max(0, cap - cur);
    if(qty>free){
      const take = Math.max(0, free);
      if(take>0){ s.inventory[id]=cur+take; Bus.emit('inventory',{...s.inventory}); Bus.emit('cap'); }
      if(CF_CONSTANTS.SILOS.lossesOnOverflow && qty-take>0){
        GameState.addLog(`Perda: ${qty-take}x ${id} por falta de espaço (${cur}/${cap}).`);
      }else{
        Bus.emit('toast',{type:'err',text:`Sem espaço para ${id}.`});
      }
      return take>0;
    }
    s.inventory[id]=cur+qty; Bus.emit('inventory',{...s.inventory}); Bus.emit('cap'); return true; },
  remove(id, qty=1){ const s=GameState.get(); const cur=s.inventory[id]||0; if(cur<qty) return false; s.inventory[id]=cur-qty; Bus.emit('inventory',{...s.inventory}); Bus.emit('cap'); return true; },
  getAll(){ return {...GameState.get().inventory}; },
  qty(id){ return GameState.get().inventory[id]||0; }
};