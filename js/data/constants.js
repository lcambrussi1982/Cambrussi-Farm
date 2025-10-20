// Cambrussi Farm — Config unificada v19.10
// - Reúne e padroniza chaves (sem sobrescrever entre si)
// - Mantém compat com SERVICE_MULT/RENTAL_MULT (seus scripts antigos)
//   e com COST_MULT/PRICE_MULT/YIELD_MULT (scripts novos)
// - Balance mais leve + upgrade de talhão até T10

window.CF_CONSTANTS = {
  VERSION: '20.0.0',
  DAY_MINS: 24*60,
  TICK_MS_BASE: 600,
  MINUTES_PER_TICK: 10,

  // Mapa
  MAP: { WIDTH: 10, HEIGHT: 8 },

  // Impostos / datas
  SALES_TAX: 0.06,
  TAX_DUE_DAY: 30,

  // Dificuldades — compat: SERVICE_MULT/RENTAL_MULT (legado) e COST_MULT/PRICE_MULT/YIELD_MULT (novo)
  // MARKET_VOL é um multiplicador adicional que seus sistemas de mercado podem usar (ex.: volEfetiva = baseVol * (1 + MARKET_VOL))
  DIFFICULTY: {
    facil: {
      START_MONEY: 25000,
      MARKET_VOL: 0.06,
      SERVICE_MULT: 0.80,
      RENTAL_MULT: 0.80,
      // aliases para módulos novos:
      COST_MULT: 0.80,         // == SERVICE_MULT
      PRICE_MULT: 1.12,
      YIELD_MULT: 1.12,
      PEST_CHANCE: 0.05
    },
    moderado: {
      START_MONEY: 12000,
      MARKET_VOL: 0.08,
      SERVICE_MULT: 1.00,
      RENTAL_MULT: 1.00,
      COST_MULT: 1.00,         // == SERVICE_MULT
      PRICE_MULT: 1.05,
      YIELD_MULT: 1.00,
      PEST_CHANCE: 0.07
    },
    dificil: {
      START_MONEY: 8000,
      MARKET_VOL: 0.11,
      SERVICE_MULT: 1.20,
      RENTAL_MULT: 1.30,
      COST_MULT: 1.20,         // == SERVICE_MULT
      PRICE_MULT: 0.98,
      YIELD_MULT: 0.96,
      PEST_CHANCE: 0.10
    }
  },

  // Custos base dos serviços (sem aluguel). Usados por Machines.serviceCosts()
  // Números pequenos de base escalam por dificuldade via *_MULT
  SERVICE_COSTS_BASE: { plant: 2.0, harvest: 3.5, spray: 1.5, transport: 0.5 },

  // Custos base de aluguel quando não possui a máquina. Usados por Machines.rentalCosts()
  RENTAL_COSTS_BASE:  { tractor: 1.5, planter: 2.5, harvester: 6.0, sprayer: 2.0, truck: 1.2 },

  // Catálogo de máquinas (para Machines.buy / has)
  MACHINES: [
    { id:'tractor',   name:'Trator',        price:  8000 },
    { id:'planter',   name:'Plantadeira',   price:  6000 },
    { id:'harvester', name:'Colheitadeira', price: 12000 },
    { id:'sprayer',   name:'Pulverizador',  price:  5000 },
    { id:'truck',     name:'Caminhão',      price:  7000 }
  ],

  // Mercado: faixas e viés sazonal
  MARKET: {
    // vol. base do jogo; módulo de mercado pode aplicar: volEfetiva = base * (1 + DIFFICULTY[d].MARKET_VOL)
    dailyVolatility: 0.08,
    seasonBias: {
      'Primavera': { milho: 0.02, trigo: 0.01, soja: 0.01, algodao: 0.00, canola: 0.00, girassol: 0.00 },
      'Verão':     { milho: 0.03, trigo: -0.01, soja: 0.02, algodao: 0.01, canola: 0.00, girassol: 0.02 },
      'Outono':    { milho: -0.01, trigo: 0.02, soja: 0.01, algodao: 0.02, canola: 0.01, girassol: 0.00 },
      'Inverno':   { milho: 0.00, trigo: 0.03, soja: -0.01, algodao: 0.02, canola: 0.02, girassol: -0.01 }
    },
    // pisos e tetos (mantêm o mercado dentro de faixas realistas)
    floor: { milho: 18, trigo: 16, soja: 22, algodao: 38, canola: 26, girassol: 24 },
    ceil:  { milho: 58, trigo: 50, soja: 70, algodao: 110, canola: 78, girassol: 72 }
  },

  // Terras
  LAND: { startOwned: 16, basePrice: 300, variance: 120 },

  // Silos
  SILOS: {
    types: ['graos','oleo','fibra'],
    levelCaps: [200, 450, 700, 950, 1200],
    newSiloCostBase: 1800,
    upgradeCostBase: 800,
    maxLevel: 5,
    lossesOnOverflow: true
  },

  // Banco
  BANK: { ltv: 0.6, dailyRate: 0.0005, penaltyRate: 0.0008 },

  // ===== Melhorias de produção/upgrade =====
  // boost global de produção
  YIELD_GLOBAL: 1.08,
  // até T10 com +12% por nível
  MAX_PLOT_LEVEL: 10,
  SIZE_YIELD_STEP: 0.12,
  // custo de upgrade baseado no preço do talhão
  UPGRADE_BASE_RATIO: 0.28,
  UPGRADE_EXP: 1.22
};
