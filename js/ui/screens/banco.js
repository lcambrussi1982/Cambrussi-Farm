(function(){
  function render(){
    const s = GameState.get();
    const root = document.createElement('div'); root.className='grid cols-2';

    const summary = UI.section('Resumo do Banco');
    const list = document.createElement('div'); list.className='list';
    const landVal = Land.totalLandValue(s);
    const limit = Bank.creditLimit(s);
    const debt = Bank.totalDebt(s);
    list.innerHTML = `
      <div class="kv"><span>Valor das Terras</span><b>R$ ${Economy.format(landVal)}</b></div>
      <div class="kv"><span>Limite de Crédito (LTV 60%)</span><b>R$ ${Economy.format(limit)}</b></div>
      <div class="kv"><span>Dívida Atual</span><b>R$ ${Economy.format(debt)}</b></div>
      <div class="kv"><span>Juros Diários</span><b>${(CF_CONSTANTS.BANK.dailyRate*100).toFixed(2)}%</b></div>`;
    summary.appendChild(list);

    const actions = UI.section('Operações');
    const row1 = document.createElement('div'); row1.className='row';
    const inpTake = document.createElement('input'); inpTake.type='number'; inpTake.placeholder='Valor do empréstimo'; inpTake.className='input'; inpTake.style.maxWidth='160px';
    const b1 = document.createElement('button'); b1.textContent='Tomar Empréstimo'; b1.onclick=()=> Bank.borrow(parseInt(inpTake.value||'0'));
    row1.append(inpTake,b1);
    const row2 = document.createElement('div'); row2.className='row';
    const inpPay = document.createElement('input'); inpPay.type='number'; inpPay.placeholder='Valor para pagar'; inpPay.className='input'; inpPay.style.maxWidth='160px';
    const b2 = document.createElement('button'); b2.textContent='Pagar Dívida'; b2.onclick=()=> Bank.pay(parseInt(inpPay.value||'0'));
    row2.append(inpPay,b2);
    actions.append(row1,row2);

    const loans = UI.section('Empréstimos');
    const lst = document.createElement('div'); lst.className='list';
    (s.bank.loans||[]).forEach((l,idx)=>{
      const it=document.createElement('div'); it.className='item';
      it.innerHTML = `<div><b>#${idx+1}</b><div class="small">Principal: R$ ${Economy.format(l.principal)} • Juros: R$ ${Economy.format(l.accrued)}</div></div>`;
      lst.appendChild(it);
    });
    if(!(s.bank.loans||[]).length){ lst.innerHTML='<div class="small">Sem empréstimos ativos.</div>'; }
    loans.appendChild(lst);

    root.append(summary, actions, loans);
    return root;
  }
  Bus.on('route', tab=>{ if(tab==='banco') UI.mount(render()); });
  Bus.on('debt', ()=>{ if(Router.get()==='banco') UI.mount(render()); });
  Bus.on('money', ()=>{ if(Router.get()==='banco') UI.mount(render()); });
  Bus.on('land', ()=>{ if(Router.get()==='banco') UI.mount(render()); });
})();