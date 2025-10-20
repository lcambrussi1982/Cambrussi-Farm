// Cambrussi Farm — Shop (Loja & Mercado) unificado e melhorado
// Depende: GameState, Inventory, Market, Machines, CF_CONSTANTS, Bus, Economy, (opcional) Dryer
(function(){
  const fmt = (v)=> (window.Economy && Economy.format) ? Economy.format(v) : Number(v).toFixed(2);

  function diffCfg(){
    const s = GameState.get();
    const d = (s.meta && s.meta.difficulty) || 'moderado';
    return CF_CONSTANTS.DIFFICULTY?.[d] || { COST_MULT: 1, SERVICE_MULT: 1 };
  }
  function costMult(){
    const D = diffCfg();
    // aceita COST_MULT (novo) ou SERVICE_MULT (legado) como multiplicador de custos de insumos
    return Number(D.COST_MULT || D.SERVICE_MULT || 1);
  }

  // Nome amigável para commodities (milho -> Milho)
  function titleCaseId(id){
    if(!id) return '';
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

  // Base de itens vendáveis na loja (antes do multiplicador de dificuldade)
  const BASE_ITEMS = [
    { id:'seed_milho',    name:'Semente de Milho',       price: 12 },
    { id:'seed_trigo',    name:'Semente de Trigo',       price: 10 },
    { id:'seed_soja',     name:'Semente de Soja',        price: 16 },
    { id:'seed_algodao',  name:'Semente de Algodão',     price: 20 },
    { id:'seed_canola',   name:'Semente de Canola',      price: 18 },
    { id:'seed_girassol', name:'Semente de Girassol',    price: 15 },
    { id:'adubo_npk',     name:'Adubo NPK',              price: 26 },
    { id:'inseticida',    name:'Inseticida (frasco 1x)', price: 19 } // item “fora de silo”
  ];

  function pricedList(){
    const mult = costMult();
    return BASE_ITEMS.map(it => ({ ...it, price: Math.max(1, Math.round(it.price * mult)) }));
  }

  // Segurança: garante estrutura mínima do estado
  function ensureState(){
    const s = GameState.get();
    s.inventory = s.inventory || {};
    s.market    = s.market || { prices:{} };
    s.player    = s.player || { money:0 };
    s.logs      = s.logs || [];
    return s;
  }

  window.Shop = {
    // Lista de itens com preço final (após multiplicador)
    list(){ return pricedList(); },

    // Pega um item da loja por id (com preço já multiplicado)
    get(id){
      return pricedList().find(i => i.id === id) || null;
    },

    // Commodities vendáveis com preço do mercado
    sellables(){
      const s = ensureState();
      // se o mercado não tiver sido montado ainda, evita crash
      const ids = Object.keys(s.market.prices || {});
      return ids.map(id => ({
        id,
        name: titleCaseId(id),
        sellPrice: s.market.prices[id]
      }));
    },

    // Comprar item (seeds/adubo vão pro Inventory; inseticida vai em s.inventory.inseticida)
    buy(id, qty=1){
      const item = this.get(id); if(!item){ Bus.emit('toast',{type:'err',text:'Item inválido'}); return; }
      qty = Math.max(1, qty|0);

      const s = ensureState();
      const cost = item.price * qty;

      if(s.player.money < cost){
        Bus.emit('toast',{type:'err',text:'Dinheiro insuficiente'}); return;
      }

      // item especial: inseticida não ocupa silo
      if(id === 'inseticida'){
        s.player.money -= cost; GameState.expense(cost);
        s.inventory.inseticida = (s.inventory.inseticida||0) + qty;
        GameState.addLog(`Compra: ${qty}x Inseticida (R$ ${fmt(cost)})`);
        Bus.emit('inventory', {...s.inventory});
        Bus.emit('money', s.player.money);
        return;
      }

      // demais itens passam pelo Inventory (com verificação de capacidade)
      s.player.money -= cost; GameState.expense(cost);
      const ok = Inventory.add(id, qty);
      if(!ok){
        // rollback de dinheiro e despesa se faltou espaço
        s.player.money += cost; GameState.expense(-cost);
        Bus.emit('money', s.player.money);
        Bus.emit('toast',{type:'err',text:'Sem espaço para armazenar'});
        return;
      }

      GameState.addLog(`Compra: ${qty}x ${item.name} (R$ ${fmt(cost)})`);
      Bus.emit('money', s.player.money);
    },

    // Cotação de venda (considera Secador se existir)
    // return { gross, bonusPct, tax, netBeforeFreight, freight, netFinal }
    quoteSell(id, qty=1){
      const s = ensureState();
      qty = Math.max(1, qty|0);

      const base = s.market?.prices?.[id];
      if(base == null) return null;

      const bonus = (typeof window.Dryer?.priceBonusFor === 'function') ? window.Dryer.priceBonusFor(id) : 0;
      const gross = (base * (1 + bonus)) * qty;
      const tax   = gross * Number(CF_CONSTANTS.SALES_TAX || 0);
      const netBeforeFreight = gross - tax;

      const freight = Machines.opCost('transport');
      const netFinal = netBeforeFreight - freight;

      const netFinalClamped = Math.max(0, netFinal);
      return { gross, bonusPct: bonus, tax, netBeforeFreight, freight, netFinal: netFinalClamped };
    },

    // Vender quantidade (usa Inventory.remove; aplica imposto, bônus de secador e frete)
    sell(id, qty=1){
  const s = ensureState();
  const base = s.market?.prices?.[id];
  if(base == null){ Bus.emit('toast',{type:'err',text:'Produto sem preço no mercado'}); return; }

  qty = Math.max(1, qty|0);

  if(!Inventory.remove(id, qty)){
    Bus.emit('toast',{type:'err',text:'Estoque insuficiente'}); return;
  }

  const q = this.quoteSell(id, qty);
  if(!q){
    // rollback por segurança
    Inventory.add(id, qty);
    Bus.emit('toast',{type:'err',text:'Falha ao cotar venda'});
    return;
  }

  // Evita venda não lucrativa (ex.: frete > receita líquida)
  if(q.netFinal <= 0){
    // desfaz retirada do estoque
    Inventory.add(id, qty);
    GameState.addLog(`Venda cancelada: ${qty}x ${titleCaseId(id)} não compensa no momento (líq R$ ${fmt(q.netBeforeFreight)} - frete R$ ${fmt(q.freight)} ≤ 0).`);
    Bus.emit('toast',{type:'warn',text:'Venda não compensa agora (frete alto).'});
    return;
  }

  // Usa moneyDelta para padronizar alteração de saldo + evento
  GameState.moneyDelta(q.netFinal);

  GameState.revenue(q.netBeforeFreight);
  GameState.tax(q.tax);
  GameState.expense(q.freight);

  GameState.addLog(
    `Venda: ${qty}x ${titleCaseId(id)} a R$ ${fmt(base)}`
    + (q.bonusPct ? ` (+${Math.round(q.bonusPct*100)}% secador)` : '')
    + ` • Líq: R$ ${fmt(q.netBeforeFreight)}; Frete R$ ${fmt(q.freight)}; Recebido R$ ${fmt(q.netFinal)}`
  );
},

    // (Opcional) Vender tudo de um produto
    sellAll(id){
      const s = ensureState();
      const current = (Inventory.get && Inventory.get(id)) || s.inventory?.[id] || 0;
      const qty = Number(current|0);
      if(qty <= 0){ Bus.emit('toast',{type:'err',text:'Nada para vender'}); return; }
      this.sell(id, qty);
    }
  };
})();
