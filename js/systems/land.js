window.Land = {
  countOwned(){ const s=GameState.get(); return s.map.filter(p=>p.owned).length; },
  totalLandValue(s){ return s.map.filter(p=>p.owned).reduce((sum,p)=>sum+p.price,0); },
  buy(i){ const s=GameState.get(); const p=s.map[i]; if(p.owned) return; if(s.player.money < p.price){ Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return; }
    s.player.money -= p.price; GameState.expense(p.price); p.owned=true; GameState.addLog(`Comprou talhão (${p.x+1},${p.y+1}) por R$ ${p.price}.`); Bus.emit('money', s.player.money); Bus.emit('land'); },
  upgrade(i){ const s=GameState.get(); const p=s.map[i]; if(!p.owned) return; if(p.sizeLevel>=3){ Bus.emit('toast',{type:'err',text:'Tamanho máximo'}); return; }
    const cost = Math.round(200 * p.sizeLevel * 1.25);
    if(s.player.money<cost){ Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return; }
    s.player.money -= cost; GameState.expense(cost); p.sizeLevel += 1; GameState.addLog(`Upgrade talhão (${p.x+1},${p.y+1}) para T${p.sizeLevel}.`); Bus.emit('money', s.player.money); Bus.emit('land'); }
};