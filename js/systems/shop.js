window.Shop = {
  list(){ return [
    { id:'seed_milho', name:'Semente de Milho', price: 16 },
    { id:'seed_trigo', name:'Semente de Trigo', price: 14 },
    { id:'seed_soja', name:'Semente de Soja', price: 22 },
    { id:'seed_algodao', name:'Semente de Algodão', price: 28 },
    { id:'seed_canola', name:'Semente de Canola', price: 24 },
    { id:'seed_girassol', name:'Semente de Girassol', price: 20 },
    { id:'adubo_npk', name:'Adubo NPK', price: 35 }
  ]; },
  sellables(){ const s=GameState.get(); return Object.keys(s.market.prices).map(id=>({ id, name:id[0].toUpperCase()+id.slice(1), sellPrice:s.market.prices[id] })); },
  buy(id, qty=1){ const it=this.list().find(i=>i.id===id); if(!it) return; qty=Math.max(1,qty|0); const s=GameState.get(); const cost=it.price*qty;
    if(s.player.money<cost){ Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return; }
    s.player.money-=cost; GameState.expense(cost); Inventory.add(id, qty); GameState.addLog(`Compra: ${qty}x ${it.name} (R$ ${cost.toFixed(2)})`); Bus.emit('money', s.player.money);
  },
  sell(id, qty=1){ const s=GameState.get(); const price=s.market.prices[id]; if(price==null) return; qty=Math.max(1,qty|0);
    if(!Inventory.remove(id, qty)){ Bus.emit('toast',{type:'err',text:'Estoque insuficiente'}); return; }
    const gross=price*qty; const tax=gross*CF_CONSTANTS.SALES_TAX; const net=gross-tax;
    const freight = Machines.has('truck')? Machines.serviceCosts().transport : (Machines.serviceCosts().transport + Machines.rentalCosts().truck);
    s.player.money+= (net - freight); GameState.revenue(net - freight); GameState.tax(tax); GameState.expense(freight);
    GameState.addLog(`Venda: ${qty}x ${id} a R$ ${price.toFixed(2)} (líq. ${net.toFixed(2)}; frete ${freight.toFixed(2)})`); Bus.emit('money', s.player.money);
  }
};