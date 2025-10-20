window.GameState = (() => {
  const C = CF_CONSTANTS;
  const W = C.MAP.WIDTH, H = C.MAP.HEIGHT;
  function makeMap() {
    const out = []; const total = W * H; const startOwned = C.LAND.startOwned; const ownedIdx = new Set();
    while (ownedIdx.size < startOwned) { ownedIdx.add(Math.floor(Math.random() * total)); }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x; const price = Math.max(60, Math.round(C.LAND.basePrice + (Math.random() * 2 - 1) * C.LAND.variance));
        out.push({ x, y, owned: ownedIdx.has(i), price, sizeLevel: 1, crop: null, stage: 0, days: 0, water: 0.5, fert: 0.5, pest: false, ready: false, auto: { enabled: false, crop: 'milho', replant: false } });
      }
    }
    return out;
  }

  let state = {
    meta: { version: C.VERSION, createdAt: Date.now(), difficulty: null },
    time: { day: 1, minute: 0, speedFactor: 1 },
    player: { money: 0 },
    taxes: { due: 0, nextDue: C.TAX_DUE_DAY },
    inventory: {},
    capacity: 0,
    weather: { season: 'Primavera', temp: 24, rain: false, humidity: 0.5 },
    map: [],
    market: { prices: { milho: 35, trigo: 30, soja: 40, algodao: 60, canola: 45, girassol: 42 }, volatility: C.MARKET.dailyVolatility },
    silos: [],
    machines: { owned: {} },
    bank: { loans: [], accruedInterest: 0 },
    metrics: { days: {}, produced: {}, taxesPaid: 0, interestPaid: 0 },
    logs: []
  };

  const get = () => state; const set = (s) => { state = s; };

  function addLog(text) { state.logs.unshift({ t: Date.now(), text }); state.logs = state.logs.slice(0, 300); }
  function moneyDelta(v) { state.player.money += v; Bus.emit('money', state.player.money); }
  function recordDay() { const d = state.time.day; if (!state.metrics.days[d]) state.metrics.days[d] = { revenue: 0, expenses: 0, taxes: 0, interest: 0, profit: 0 }; return state.metrics.days[d]; }
  function expense(v) { const M = recordDay(); M.expenses += v; M.profit = M.revenue - M.expenses - M.taxes - M.interest; }
  function revenue(v) { const M = recordDay(); M.revenue += v; M.profit = M.revenue - M.expenses - M.taxes - M.interest; }
  function tax(v) { const M = recordDay(); M.taxes += v; M.profit = M.revenue - M.expenses - M.taxes - M.interest; state.taxes.due += v; }
  function interest(v) { const M = recordDay(); M.interest += v; M.profit = M.revenue - M.expenses - M.taxes - M.interest; state.metrics.interestPaid += v; }

  const tick = () => {
    const add = C.MINUTES_PER_TICK;
    state.time.minute += add;
    if (state.time.minute >= C.DAY_MINS) {
      state.time.day += 1; state.time.minute = 0;
      Weather.daily(state);
      Market.daily(state);
      Bank.daily(state);
      Tax.daily(state);
      Fields.daily(state);
      Bus.emit('metrics', state.metrics);
    }
    Bus.emit('clock', { ...state.time }); Bus.emit('weather', { ...state.weather }); Bus.emit('market', { ...state.market }); Bus.emit('tax', state.taxes.due); Bus.emit('debt', Bank.totalDebt(state));
  };

  function applyDifficulty(diff) {
    const D = C.DIFFICULTY[diff] || C.DIFFICULTY.moderado;
    state.meta.difficulty = diff;
    state.player.money = D.START_MONEY;
    state.market.volatility = D.MARKET_VOL;
    state.map = makeMap();
    state.silos = [{ name: 'Silo G1', type: 'graos', level: 1 }];
    state.logs = [];
    addLog(`Jogo iniciado no modo ${diff}.`);
  }

  return { get, set, tick, addLog, moneyDelta, expense, revenue, tax, interest, applyDifficulty };
})();