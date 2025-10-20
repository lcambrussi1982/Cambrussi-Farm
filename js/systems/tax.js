window.Tax = {
  payAll(){ const s=GameState.get(); const due=s.taxes.due;
    if(due<=0){ return; }
    if(s.player.money<due){ Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return; }
    s.player.money -= due; s.taxes.due = 0; GameState.expense(due); s.metrics.taxesPaid += due;
    GameState.addLog(`Pagou impostos: R$ ${due.toFixed(2)}.`); Bus.emit('money', s.player.money); Bus.emit('tax', s.taxes.due);
  },
  daily(s){
    if(s.time.day > 0 && (s.time.day % CF_CONSTANTS.TAX_DUE_DAY)===0){
      GameState.addLog(`Vencimento de impostos — pague em Relatórios > Impostos.`);
    }
  }
};