window.Bank = {
  totalDebt(s){ return (s.bank.loans||[]).reduce((sum,l)=> sum + l.principal, 0); },
  creditLimit(s){ const ltv=CF_CONSTANTS.BANK.ltv; const land=Land.totalLandValue(s); const used=this.totalDebt(s); return Math.max(0, Math.round(land*ltv - used)); },
  borrow(amount){ const s=GameState.get(); amount=Math.max(0, Math.floor(amount)); const limit=this.creditLimit(s);
    if(amount<=0){ return; } if(amount>limit){ Bus.emit('toast',{type:'err',text:'Acima do limite'}); return; }
    (s.bank.loans||[]).push({ principal:amount, accrued:0, lastDay:s.time.day, status:'ok' });
    s.player.money += amount; GameState.addLog(`Empréstimo de R$ ${amount}.`); Bus.emit('money', s.player.money); Bus.emit('debt', this.totalDebt(s));
  },
  pay(amount){ const s=GameState.get(); amount=Math.max(0, Math.floor(amount)); if(amount<=0) return;
    let remaining=amount;
    (s.bank.loans||[]).forEach(l=>{ if(remaining<=0) return; const j=Math.min(remaining, l.accrued); remaining-=j; l.accrued-=j; GameState.interest(j); });
    (s.bank.loans||[]).forEach(l=>{ if(remaining<=0) return; const p=Math.min(remaining, l.principal); remaining-=p; l.principal-=p; });
    const paid = amount-remaining; s.player.money -= paid; if(paid>0){ GameState.expense(paid); GameState.addLog(`Pagamento ao banco: R$ ${paid.toFixed(2)}.`); }
    s.bank.loans = s.bank.loans.filter(l=> l.principal>0 || l.accrued>0 );
    Bus.emit('money', s.player.money); Bus.emit('debt', this.totalDebt(s));
  },
  daily(s){
    const rate=CF_CONSTANTS.BANK.dailyRate; const penalty=CF_CONSTANTS.BANK.penaltyRate;
    (s.bank.loans||[]).forEach(l=>{
      const base = l.principal + l.accrued;
      const j = base * rate;
      l.accrued += j; GameState.interest(j);
      const excess = this.totalDebt(s) > Land.totalLandValue(s)*CF_CONSTANTS.BANK.ltv;
      if(excess){ l.accrued += base * penalty; }
    });
  }
};