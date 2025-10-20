(function(){
  // ================= Relatórios v20+ (upgrade sem remover nada) =================
  // Mantém o fluxo original e adiciona: KPIs avançados, por-produto mais rico,
  // marcação a mercado (MtM), indicadores de risco, projeções e exportação CSV.
  // Depende de: GameState, UI, Bus, Router, CF_CONSTANTS, Economy,
  //             Land, Bank, Shop, Machines (para custos/quote), Silos, CROPS

  // ====== Estilos injetados (para conter overflow no resumo) ======
  (function ensureStyle(){
    const ID = 'cf-reports-style';
    if(document.getElementById(ID)) return;
    const st = document.createElement('style'); st.id = ID; st.textContent = `
      .cf-reports{ --gap:12px; }
      .report-grid.cf-reports{ max-width:100%; overflow-x:hidden; box-sizing:border-box; }
      .cf-reports .kpi-grid{ display:grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap:var(--gap); }
      .cf-reports .kpi{ min-width:0; padding:12px; border-radius:12px; border:1px solid var(--glassBorder, rgba(255,255,255,.2)); background:var(--glassA, rgba(255,255,255,.06)); box-sizing:border-box; }
      .cf-reports .kpi .kpi-label{ font-size:12px; opacity:.8; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .cf-reports .kpi .kpi-value{ display:block; max-width:100%; white-space:normal; overflow-wrap:anywhere; font-variant-numeric: tabular-nums; font-weight:600; font-size: clamp(12px, 2.3vw, 20px); line-height: 1.15; }
      .cf-reports .table .tr > div{ min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .cf-reports .spark, .cf-reports .hbar{ width:100%; }
      .cf-reports .controls-row{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
      .cf-reports .controls-row input[type=number]{ width:100px; }
      .cf-reports .badge.warn{ background:rgba(245,158,11,.15); border:1px solid rgba(245,158,11,.35); padding:2px 6px; border-radius:10px; font-size:11px; }
    `; document.head.appendChild(st);
  })();

  // =============== Helpers ===============
  const CUR = (n)=> `R$ ${Economy.format(n||0)}`;
  const sum = (arr)=> arr.reduce((a,b)=> a + (b||0), 0);
  const clamp = (n,min,max)=> Math.max(min, Math.min(max, n));
  const pct = (num, den)=> (den ? (100 * (num/den)) : 0);
  const fmtPct = (v)=> `${(v||0).toFixed(1)}%`;
  const fmtQty = (q)=> (q==null? '-' : String(q));

  // baixa CSV simples
  function downloadCSV(filename, headers, rows){
    const esc = (s)=> '"'+String(s).replaceAll('"','""')+'"';
    const head = headers.map(esc).join(',');
    const body = rows.map(r=> r.map(esc).join(',')).join('\n');
    const csv = head + '\n' + body;
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 2000);
  }

  // pega os últimos N dias do dicionário metrics.days
  function daysSlice(s, n){
    const keys = Object.keys(s.metrics.days||{}).map(Number).sort((a,b)=>a-b);
    if(!keys.length) return [];
    const from = Math.max(0, keys.length - n);
    return keys.slice(from).map(d=>({ day:d, ...(s.metrics.days[d]||{}) }));
  }

  // calcula dias restantes p/ vencimento
  function daysToDue(s){
    const ciclo = CF_CONSTANTS.TAX_DUE_DAY || 30;
    const prox  = s.taxes.nextDue || ciclo;
    const hoje  = s.time.day || 1;
    const pos   = ((hoje-1) % ciclo) + 1; // 1..30
    return (pos <= prox) ? (prox - pos) : (ciclo - pos + prox);
  }

  // Sparkline mini (lucro diário)
  function spark(values){
    const vs = values.length? values : [0];
    const w=260, h=60, p=6;
    const max = Math.max(...vs, 1), min = Math.min(...vs, 0);
    const span = Math.max(1, vs.length-1);
    const sx = i => p + (i/span)*(w-2*p);
    const sy = v => h - p - ((v-min)/Math.max(1,(max-min)))*(h-2*p);
    const d = vs.map((v,i)=> `${i?'L':'M'} ${sx(i)},${sy(v)}`).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.setAttribute('height', h);
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', d); path.setAttribute('fill','none'); path.setAttribute('stroke','currentColor'); path.setAttribute('stroke-width','2');
    svg.appendChild(path);
    const box = document.createElement('div'); box.className='spark'; box.appendChild(svg);
    return box;
  }

  // Barras horizontais simples (para top produtos)
  function hbar(data, opts={}){
    const width = opts.width||360, height = (data.length*22)+20, pad=6;
    const maxV = Math.max(...data.map(d=>Math.abs(d.value)), 1);
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    let y=10;
    data.forEach(d=>{
      const w = Math.max(1, Math.round((Math.abs(d.value)/maxV)*(width-140)));
      const g = document.createElementNS(svg.namespaceURI,'g');
      const rect = document.createElementNS(svg.namespaceURI,'rect');
      rect.setAttribute('x', 130); rect.setAttribute('y', y); rect.setAttribute('width', w); rect.setAttribute('height', 16);
      rect.setAttribute('rx', 4); rect.setAttribute('ry', 4); rect.setAttribute('fill', 'currentColor'); rect.setAttribute('opacity','0.15');
      const label = document.createElementNS(svg.namespaceURI,'text');
      label.setAttribute('x', 0); label.setAttribute('y', y+13); label.textContent = d.label;
      label.setAttribute('font-size', '12');
      const val = document.createElementNS(svg.namespaceURI,'text');
      val.setAttribute('x', 130+w+6); val.setAttribute('y', y+13); val.textContent = CUR(d.value);
      val.setAttribute('font-size', '12');
      g.append(rect,label,val); svg.appendChild(g); y += 22;
    });
    const box = document.createElement('div'); box.className='hbar'; box.appendChild(svg); return box;
  }

  // Tabela simples
  function table(headers, rows, opts={}){
    const wrap=document.createElement('div'); wrap.className='table';
    const head=document.createElement('div'); head.className='tr th';
    headers.forEach(h=>{ const c=document.createElement('div'); c.textContent=h; head.appendChild(c); });
    wrap.appendChild(head);
    rows.forEach(r=>{
      const tr=document.createElement('div'); tr.className='tr';
      r.forEach((cell,i)=>{
        const c=document.createElement('div');
        if(opts.rawFirst && i===0) c.innerHTML = cell; 
        else if (typeof cell==='number') c.textContent = CUR(cell);
        else c.textContent = (cell==null? '' : cell);
        if(opts.colorizeNeg && typeof cell==='number' && cell<0) c.style.color = 'var(--danger, #dc2626)';
        tr.appendChild(c);
      });
      wrap.appendChild(tr);
    });
    return wrap;
  }

  // ------------ Parsers de LOG (receitas/despesas) ------------
  function parseLogsPeriod(s, periodDays){
    // Observação: como os logs não carregam o "dia" explícito, usamos os logs como
    // FONTE DE DETALHAMENTO (quebras por tipo/produto), enquanto os totais do período
    // vêm de metrics.days. Assim, mesmo sem dia no log, obtemos quebra útil.

    const cat = {
      receitaPorProduto: {}, // { milho: valorLiquidoRecebido }
      receitaBruta: 0,       // soma (preço base * qty * (1+bonus))
      frete: 0,

      // detalhamento adicional
      qtyVendidaPorProduto: {},  // { milho: 120 }
      brutoPorProduto: {},       // { milho: 1234 }
      precoMedioLiqPorProduto: {}, // calculado ao final

      // despesas
      operacoes: 0,      // plantio/colheita/pulverização/transporte
      insumos: 0,        // sementes/adubos
      maquinas: 0,       // compra de máquinas
      manutencao: 0,     // revisão
      terras: 0,         // compra/upgrade de talhão
      silos: 0,          // novos/upgrade
      secador: 0,        // build/upgrade
      bancoPagto: 0,     // pagamentos ao banco
      outros: 0,

      // despesas por produto (aprox)
      operacoesPorProduto: {}, // extraído de "Plantio de X (custo op: R$ Y)"
    };

    const reVenda = /Venda:\s+(\d+)x\s+(\w+)\s+a\s+R\$\s*([\d.,]+).*?L[íi]q:\s*([\d.,]+).*?Frete\s*([\d.,]+)/i;
    const reCompra = /Compra:\s+(\d+)x\s+(.+?)\s+\(R\$\s*([\d.,]+)\)/i;
    const reMaquinaBuy = /Comprou\s+(.+?)\s+por\s+R\$\s*([\d.,]+)/i;
    const reReparo = /Reparou\s+(.+?)\s+\(R\$\s*([\d.,]+)\)/i;
    const reSiloNovo = /Novo\s+silo.*?R\$\s*([\d.,]+)/i;
    const reSiloUpg = /upgrade.*?N[ií]vel\s+\d+\s+\(R\$\s*([\d.,]+)\)/i;
    const reSecadorBuild = /Construiu\s+Secador\s+\(R\$\s*([\d.,]+)\)/i;
    const reSecadorUpg   = /Upgrade\s+Secador.*?\(R\$\s*([\d.,]+)\)/i;
    const reTerraBuy = /Comprou\s+talh[aã]o.*?por\s+R\$\s*([\d.,]+)/i;
    const reTerraUpg = /Upgrade\s+talh[aã]o.*?\(R\$\s*([\d.,]+)\)/i;
    const reBankPay  = /Pagamento ao banco:\s+R\$\s*([\d.,]+)/i;
    const reOpPlant  = /Plantio de\s+(\w+)\s+\(custo op:\s*R\$\s*([\d.,]+)\)/i;

    const toNum = (t)=> Number(String(t).replace(/\./g,'').replace(',','.'))||0;

    (s.logs||[]).forEach(e=>{
      const msg = e.text||'';

      const mV = msg.match(reVenda);
      if(mV){
        const qty = toNum(mV[1]);
        const prod = (mV[2]||'').toLowerCase();
        const preco = toNum(mV[3]); // preço unitário base (+bônus)
        const liq = toNum(mV[4]);   // líquido antes do frete
        const frete = toNum(mV[5]);

        cat.receitaBruta += qty * preco;
        cat.frete += frete;
        cat.receitaPorProduto[prod] = (cat.receitaPorProduto[prod]||0) + liq;
        cat.qtyVendidaPorProduto[prod] = (cat.qtyVendidaPorProduto[prod]||0) + qty;
        cat.brutoPorProduto[prod] = (cat.brutoPorProduto[prod]||0) + (qty*preco);
        return;
      }

      const mPlant = msg.match(reOpPlant);
      if(mPlant){
        const prod = (mPlant[1]||'').toLowerCase();
        cat.operacoes += toNum(mPlant[2]);
        cat.operacoesPorProduto[prod] = (cat.operacoesPorProduto[prod]||0) + toNum(mPlant[2]);
        return;
      }

      const mC = msg.match(reCompra);
      if(mC){
        const item = (mC[2]||'').toLowerCase();
        const val = toNum(mC[3]);
        if(item.includes('semente') || item.includes('adubo')) cat.insumos += val; else cat.outros += val;
        return;
      }

      const mMB = msg.match(reMaquinaBuy); if(mMB){ cat.maquinas += toNum(mMB[2]); return; }
      const mRep = msg.match(reReparo);    if(mRep){ cat.manutencao += toNum(mRep[2]); return; }
      const mSN  = msg.match(reSiloNovo);  if(mSN){  cat.silos += toNum(mSN[1]);  return; }
      const mSU  = msg.match(reSiloUpg);   if(mSU){  cat.silos += toNum(mSU[1]);  return; }
      const mDB  = msg.match(reSecadorBuild); if(mDB){ cat.secador += toNum(mDB[1]); return; }
      const mDU  = msg.match(reSecadorUpg);   if(mDU){ cat.secador += toNum(mDU[1]); return; }
      const mTB  = msg.match(reTerraBuy);  if(mTB){  cat.terras += toNum(mTB[1]); return; }
      const mTU  = msg.match(reTerraUpg);  if(mTU){  cat.terras += toNum(mTU[1]); return; }
      const mBP  = msg.match(reBankPay);   if(mBP){  cat.bancoPagto += toNum(mBP[1]); return; }
      // demais logs: ignorados para a DRE detalhada
    });

    // pós-processamento: preço médio líquido por produto (antes do frete)
    Object.keys(cat.receitaPorProduto).forEach(prod=>{
      const qty = cat.qtyVendidaPorProduto[prod]||0;
      const liq = cat.receitaPorProduto[prod]||0;
      cat.precoMedioLiqPorProduto[prod] = qty>0 ? (liq/qty) : 0;
    });

    return cat;
  }

  // ------------ Balanço (snapshot) ------------
  function snapshotBalanco(s){
    const caixa = s.player.money||0;
    const estoqueVal = Object.entries(s.inventory||{}).reduce((tot,[id,q])=>{
      const p = s.market.prices[id]||0; return tot + (q||0)*p;
    }, 0);
    const terrasVal = Land.totalLandValue(s); // valor de compra dos talhões possuídos
    const maquinasVal = CF_CONSTANTS.MACHINES.reduce((tot,m)=> tot + (s.machines.owned?.[m.id]? m.price : 0), 0);

    const ativos = caixa + estoqueVal + terrasVal + maquinasVal;
    const passivos = (s.taxes.due||0) + Bank.totalDebt(s);
    const patrimonio = ativos - passivos;

    return {
      caixa, estoqueVal, terrasVal, maquinasVal,
      ativos, passivos,
      impostosAPagar: s.taxes.due||0,
      divida: Bank.totalDebt(s),
      patrimonio
    };
  }

  // =============== View ===============
  function render(){
    const s = GameState.get();

    // Container
    const root = document.createElement('div'); root.className='report-grid cf-reports';

    // CONTROLES DE PERÍODO
    const controls = UI.section('Relatórios');
    const row=document.createElement('div'); row.className='row';
    const stored = localStorage.getItem('cf_reports_period'); let period = Number(stored||14);
    ['7','14','30'].forEach(val=>{
      const b=document.createElement('button'); b.textContent=`${val} dias`;
      if(Number(val)===period) b.style.outline='2px solid rgba(59,130,246,.35)';
      b.onclick=()=>{ localStorage.setItem('cf_reports_period', val); UI.mount(render()); };
      row.appendChild(b);
    });
    // input custom
    const inp=document.createElement('input'); inp.type='number'; inp.min='1'; inp.value=String(period); inp.style.width='90px'; inp.placeholder='dias';
    const bGo=document.createElement('button'); bGo.textContent='Aplicar'; bGo.onclick=()=>{ localStorage.setItem('cf_reports_period', String(Math.max(1, parseInt(inp.value||'1')))); UI.mount(render()); };
    row.append(inp,bGo);
    controls.appendChild(row);

    // DADOS DO PERÍODO (do sistema)
    const data = daysSlice(s, period);
    const receitaLiqSistema = sum(data.map(d=>d.revenue||0));
    const impostosSistema   = sum(data.map(d=>d.taxes||0));
    const despesasSistema   = sum(data.map(d=>d.expenses||0));
    const jurosSistema      = sum(data.map(d=>d.interest||0));
    const lucroSistema      = sum(data.map(d=>d.profit||0));
    const lucroSerie        = data.map(d=>d.profit||0);

    // EXTRAÇÃO por LOG (quebras)
    const cat = parseLogsPeriod(s, period);

    // DRE (cálculo)
    const receitaBruta = cat.receitaBruta;               // do log de vendas
    const deducoesImpostos = impostosSistema;            // do sistema
    const receitaLiquida = Math.max(0, receitaBruta - deducoesImpostos);

    // Custos operacionais: operações + frete (frete é lançado em despesas)
    const custosOperacionais = (cat.operacoes||0) + (cat.frete||0);

    // Despesas gerais: insumos, máquinas, terras, silos, secador, manutenção, banco (pagto), outros
    const despesasGeraisPartes = ['insumos','maquinas','manutencao','terras','silos','secador','bancoPagto','outros'];
    let despesasGerais = sum(despesasGeraisPartes.map(k=>cat[k]||0));

    // Reconciliação: garante que Operacionais + Gerais + Juros == Despesas do sistema
    const somaClassificada = custosOperacionais + despesasGerais + jurosSistema;
    const deltaRecon = clamp(despesasSistema - somaClassificada, -1e9, 1e9);
    if (Math.abs(deltaRecon) > 0.009) { // ajusta em "outros"
      cat.outros = (cat.outros||0) + deltaRecon;
      despesasGerais += deltaRecon;
    }

    const resultadoBruto = receitaLiquida - custosOperacionais;
    const resultadoOperacional = resultadoBruto - despesasGerais;
    const lucroLiquidoDRE = resultadoOperacional - jurosSistema;

    // ======= KPIs =======
    const kpis = UI.section(`Resumo (${period} dias)`);
    const kgrid = document.createElement('div'); kgrid.className='kpi-grid';
    const margemBruta = pct(resultadoBruto, receitaLiquida);
    const margemOper = pct(resultadoOperacional, receitaLiquida);
    const margemLiquida = pct(lucroLiquidoDRE, receitaLiquida);
    kgrid.append(
      kpi('Receita Bruta', receitaBruta),
      kpi('Impostos sobre Vendas', deducoesImpostos),
      kpi('Receita Líquida', receitaLiquida),
      kpi('Custos Operacionais', custosOperacionais),
      kpi('Despesas Gerais', despesasGerais),
      kpi('Lucro Líquido (sistema)', lucroSistema),
      kpi('Margem Bruta', fmtPct(margemBruta)),
      kpi('Margem Operacional', fmtPct(margemOper)),
      kpi('Margem Líquida', fmtPct(margemLiquida))
    );
    kpis.appendChild(kgrid);

    // Ajuste de fonte para valores longos caberem dentro do card
    requestAnimationFrame(()=>{
      kgrid.querySelectorAll('.kpi .kpi-value').forEach(el=>{
        let size = parseFloat(getComputedStyle(el).fontSize)||16;
        while(el.scrollWidth>el.clientWidth && size>11){ size -= 1; el.style.fontSize = size+'px'; }
      });
    });

    // Tendência de Lucro
    const trend = UI.section('Tendência de Lucro Diário');
    trend.appendChild(spark(lucroSerie));

    // TOP PRODUTOS por Receita Líquida (logs)
    const topData = Object.entries(cat.receitaPorProduto).map(([prod,val])=>({label: prod, value: val})).sort((a,b)=>b.value-a.value).slice(0,5);
    if(topData.length){ const topCard = UI.section('Top Produtos (Receita Líquida)'); topCard.appendChild(hbar(topData)); root.appendChild(topCard); }

    // RECEITAS por Produto — avançado
    const receitasCard = UI.section('Receitas por Produto (avançado)');
    const recRows = Object.keys(cat.receitaPorProduto)
      .sort((a,b)=> (cat.receitaPorProduto[b]-cat.receitaPorProduto[a]))
      .map(prod=>{
        const liq = cat.receitaPorProduto[prod]||0;
        const qty = cat.qtyVendidaPorProduto[prod]||0;
        const bruto = cat.brutoPorProduto[prod]||0;
        const pmed = cat.precoMedioLiqPorProduto[prod]||0; // antes do frete
        // alocação simples do frete proporcional à quantidade
        const totalQty = sum(Object.values(cat.qtyVendidaPorProduto));
        const freteAlocado = totalQty? (cat.frete * (qty/totalQty)) : 0;
        const freteUn = qty? (freteAlocado/qty) : 0;
        // custo direto/unidade estimado: operações específicas do produto + frete alocado / qty
        const opProd = cat.operacoesPorProduto[prod]||0;
        const custoDiretoUn = qty? ((opProd + freteAlocado)/qty) : 0;
        const margemUn = pmed - custoDiretoUn;
        const margemPct = pct(margemUn, pmed);
        return [prod, qty, pmed, freteUn, custoDiretoUn, margemUn, fmtPct(margemPct), bruto, liq];
      });
    receitasCard.appendChild(table([
      'Produto','Qtd vendida','Preço médio líq (un)','Frete (un)','Custo direto (un)','Margem (un)','Margem %','Bruto','Líquido'
    ], recRows, { }));

    // OPORTUNIDADES — Marcação a Mercado (se vender tudo agora)
    const mtmCard = UI.section('Oportunidades • Marcação a Mercado (se vender tudo agora)');
    const inv = {...(s.inventory||{})};
    const mtmRows = Object.keys(inv).filter(id=> (inv[id]||0)>0).map(id=>{
      const q = inv[id]||0;
      const p = s.market.prices[id]||0; // preço atual (unit)
      // quoteSell cobra frete por operação; aqui queremos líquido total (aprox)
      let liqTotal = 0;
      try{
        if(Shop && typeof Shop.quoteSell==='function'){
          const qres = Shop.quoteSell(id, q);
          liqTotal = qres? qres.netFinal : q*p; // fallback
        }else{ liqTotal = q*p; }
      }catch(e){ liqTotal = q*p; }
      const bruto = q*p;
      const liqUn = q? (liqTotal/q) : 0;
      // histórico: preço médio recebido quando vendeu (se existir)
      const pmed = (cat.precoMedioLiqPorProduto[id]||0);
      const upside = liqUn - pmed; // quanto acima do preço médio líquido
      return [id, q, p, bruto, liqTotal, (pmed||'-'), upside];
    });
    if(mtmRows.length){
      mtmCard.appendChild(table(['Produto','Qtd estocada','Preço hoje (un)','Valor bruto','Líquido estimado','Preço médio líq (histórico)','Upside vs. histórico'], mtmRows));
    } else {
      const p=document.createElement('p'); p.className='small'; p.textContent='Sem estoque disponível para MtM.'; mtmCard.appendChild(p);
    }

    // DESPESAS por Categoria (período)
    const despesasCard = UI.section('Despesas por Categoria (período)');
    const drows = [
      ['Operações (plantio/colheita/pulverização/transporte)', cat.operacoes||0],
      ['Frete', cat.frete||0],
      ['Insumos (sementes/adubos)', cat.insumos||0],
      ['Máquinas (compras)', cat.maquinas||0],
      ['Manutenção (revisões)', cat.manutencao||0],
      ['Terras (compra/upgrade)', cat.terras||0],
      ['Silos', cat.silos||0],
      ['Secador', cat.secador||0],
      ['Pagamentos ao banco (amortização/serviços)', cat.bancoPagto||0],
      ['Outros (reconciliação)', cat.outros||0]
    ];
    despesasCard.appendChild(table(['Categoria','Gasto'], drows, { colorizeNeg:false }));

    // DRE do Período (com margens)
    const dre = UI.section('DRE do Período');
    const dreRows = [
      ['Receita Bruta', receitaBruta],
      ['(-) Impostos sobre Vendas', -deducoesImpostos],
      ['= Receita Líquida', receitaLiquida],
      ['(-) Custos Operacionais', -custosOperacionais],
      ['= Resultado Bruto', resultadoBruto],
      ['(-) Despesas Gerais', -despesasGerais],
      ['= Resultado Operacional', resultadoOperacional],
      ['(-) Despesas Financeiras (Juros)', -jurosSistema],
      ['= Lucro/Prejuízo Líquido (DRE)', lucroLiquidoDRE],
      ['Margem Bruta', `${fmtPct(margemBruta)}`],
      ['Margem Operacional', `${fmtPct(margemOper)}`],
      ['Margem Líquida', `${fmtPct(margemLiquida)}`]
    ];
    dre.appendChild(table(['Conta','Valor'], dreRows, { rawFirst:true, colorizeNeg:true }));

    // Conciliação
    const note = document.createElement('p'); note.className='small';
    const diff = lucroLiquidoDRE - lucroSistema;
    note.textContent = `Conciliação: lucro DRE (${CUR(lucroLiquidoDRE)}) vs. lucro do sistema (${CUR(lucroSistema)}). Diferença: ${CUR(diff)} (itens sem log detalhado entram em "Outros").`;
    dre.appendChild(note);

    // BALANÇO (snapshot)
    const bal = UI.section('Balanço (Snapshot)');
    const snap = snapshotBalanco(s);
    const balRows = [
      ['Ativos'],
      ['• Caixa', snap.caixa],
      ['• Estoques (preço atual de mercado)', snap.estoqueVal],
      ['• Terras (valor de aquisição)', snap.terrasVal],
      ['• Máquinas (preço de tabela possuídas)', snap.maquinasVal],
      ['Total de Ativos', snap.ativos],
      ['Passivos'],
      ['• Impostos a pagar', snap.impostosAPagar],
      ['• Dívida bancária', snap.divida],
      ['Total de Passivos', snap.passivos],
      ['Patrimônio Líquido (Ativos - Passivos)', snap.patrimonio]
    ].map(row=>{ if(row.length===1) return [`<b>${row[0]}</b>`, '']; return row; });
    bal.appendChild(table(['Conta','Valor'], balRows, { rawFirst:true }));

    // IMPOSTOS
    const impostosCard = UI.section('Impostos');
    const ilist=document.createElement('div'); ilist.className='list';
    const dtd = daysToDue(s);
    const alert = (s.taxes.due>0 && dtd<=5) ? `<span class="badge warn">Vence em ${dtd} dia(s)</span>` : '';
    ilist.innerHTML = `
      <div class="kv"><span>A pagar</span><b>${CUR(s.taxes.due||0)} ${alert}</b></div>
      <div class="kv"><span>Próximo vencimento</span><b>Dia ${s.taxes.nextDue}</b></div>`;
    const bpay=document.createElement('button'); bpay.textContent='Pagar Impostos'; bpay.onclick=()=>Tax.payAll();
    impostosCard.appendChild(ilist); impostosCard.appendChild(bpay);

    // DÍVIDA & RISCO
    const debtCard = UI.section('Dívida, Juros & Indicadores de Risco');
    const dlist=document.createElement('div'); dlist.className='list';
    const dscr = (jurosSistema>0)? (resultadoOperacional/jurosSistema) : null; // proxy simples
    dlist.innerHTML = `
      <div class="kv"><span>Dívida total</span><b>${CUR(Bank.totalDebt(s))}</b></div>
      <div class="kv"><span>Juros pagos (acum.)</span><b>${CUR(s.metrics.interestPaid||0)}</b></div>
      <div class="kv"><span>DSCR (proxy)</span><b>${dscr==null? 'N/A' : dscr.toFixed(2)}</b></div>`;
    debtCard.appendChild(dlist);

    // EXPORTAÇÕES
    const exportCard = UI.section('Exportar');
    const b1=document.createElement('button'); b1.textContent='CSV • Receitas por Produto'; b1.onclick=()=>{
      const rows = Object.keys(cat.receitaPorProduto).map(prod=>{
        const qty = cat.qtyVendidaPorProduto[prod]||0;
        const pmed = cat.precoMedioLiqPorProduto[prod]||0;
        const total = cat.receitaPorProduto[prod]||0;
        return [prod, qty, pmed.toFixed(2), total.toFixed(2)];
      });
      downloadCSV(`receitas_produtos_${period}d.csv`, ['produto','qty_vendida','preco_medio_liq','receita_liq'], rows);
    };
    const b2=document.createElement('button'); b2.textContent='CSV • DRE Resumida'; b2.onclick=()=>{
      const rows = [
        ['receita_bruta', receitaBruta],
        ['impostos', deducoesImpostos],
        ['receita_liquida', receitaLiquida],
        ['custos_operacionais', custosOperacionais],
        ['despesas_gerais', despesasGerais],
        ['resultado_operacional', resultadoOperacional],
        ['juros', jurosSistema],
        ['lucro_liquido_dre', lucroLiquidoDRE],
        ['lucro_liquido_sistema', lucroSistema]
      ].map(([k,v])=>[k, Number(v||0).toFixed(2)]);
      downloadCSV(`dre_resumo_${period}d.csv`, ['conta','valor'], rows);
    };
    exportCard.append(b1,b2);

    // monta página
    root.append(
      controls, kpis, trend,
      receitasCard, despesasCard,
      mtmCard,
      dre, bal,
      impostosCard, debtCard,
      exportCard
    );
    return root;
  }

  // KPI block helper
  function kpi(label, value){
    const el=document.createElement('div'); el.className='kpi';
    const isPct = (typeof value==='string' && value.endsWith('%'));
    el.innerHTML = `<div class="kpi-label">${label}</div><div class="kpi-value">${isPct? value : CUR(value)}</div>`;
    return el;
  }

  // Eventos
  Bus.on('route', tab=>{ if(tab==='relatorios') UI.mount(render()); });
  Bus.on('metrics', ()=>{ if(Router.get()==='relatorios') UI.mount(render()); });
  Bus.on('tax', ()=>{ if(Router.get()==='relatorios') UI.mount(render()); });
  Bus.on('debt', ()=>{ if(Router.get()==='relatorios') UI.mount(render()); });
  Bus.on('cap', ()=>{ if(Router.get()==='relatorios') UI.mount(render()); });
})();
