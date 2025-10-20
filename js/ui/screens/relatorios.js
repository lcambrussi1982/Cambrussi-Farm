(function(){
  function render(){
    const s = GameState.get(); const root=document.createElement('div'); root.className='grid cols-3';
    const daily=UI.section('Financeiro Diário'); const list=document.createElement('div'); list.className='list';
    const days=Object.keys(s.metrics.days).sort((a,b)=>Number(b)-Number(a));
    days.slice(0,14).forEach(d=>{ const M=s.metrics.days[d]; const it=document.createElement('div'); it.className='item';
      it.innerHTML=`<div><b>Dia ${d}</b><div class="small">Receita: R$ ${Economy.format(M.revenue)} • Despesas: R$ ${Economy.format(M.expenses)} • Impostos: R$ ${Economy.format(M.taxes||0)} • Juros: R$ ${Economy.format(M.interest||0)} • Lucro: R$ ${Economy.format(M.profit)}</div></div>`;
      list.appendChild(it); });
    daily.appendChild(list);

    const tax = UI.section('Impostos');
    const tlist=document.createElement('div'); tlist.className='list';
    tlist.innerHTML = `<div class="kv"><span>A pagar</span><b>R$ ${Economy.format(s.taxes.due)}</b></div>
      <div class="kv"><span>Próximo vencimento</span><b>Dia ${s.taxes.nextDue}</b></div>`;
    const bpay = document.createElement('button'); bpay.textContent='Pagar Impostos'; bpay.onclick=()=>Tax.payAll();
    tax.appendChild(tlist); tax.appendChild(bpay);

    const debt = UI.section('Dívida & Juros');
    const dlist=document.createElement('div'); dlist.className='list';
    const totalDebt = Bank.totalDebt(s);
    dlist.innerHTML = `<div class="kv"><span>Dívida total</span><b>R$ ${Economy.format(totalDebt)}</b></div>
      <div class="kv"><span>Juros pagos (acum.)</span><b>R$ ${Economy.format(s.metrics.interestPaid||0)}</b></div>`;
    debt.appendChild(dlist);

    const inv=UI.section('Estoque & Silos');
    const ilist=document.createElement('div'); ilist.className='list';
    Object.entries(s.inventory).forEach(([id,q])=>{
      const cat=CROPS[id]?.cat||'-';
      const cap=Inventory.capacityForProduct(s,id);
      const it=document.createElement('div'); it.className='item'; it.innerHTML=`<div><b>${id}</b> <span class="badge">${cat}</span></div><div>${q}/${cap}</div>`;
      ilist.appendChild(it);
    });
    inv.appendChild(ilist);

    root.append(daily, tax, debt, inv);
    return root;
  }
  Bus.on('route', tab=>{ if(tab==='relatorios') UI.mount(render()); });
  Bus.on('metrics', ()=>{ if(Router.get()==='relatorios') UI.mount(render()); });
  Bus.on('tax', ()=>{ if(Router.get()==='relatorios') UI.mount(render()); });
  Bus.on('debt', ()=>{ if(Router.get()==='relatorios') UI.mount(render()); });
  Bus.on('cap', ()=>{ if(Router.get()==='relatorios') UI.mount(render()); });
})();