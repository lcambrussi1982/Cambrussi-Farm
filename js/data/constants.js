window.CF_CONSTANTS = {
  VERSION: '19.9.1-pro-hotfix',
  DAY_MINS: 24*60,
  TICK_MS_BASE: 600,
  MINUTES_PER_TICK: 10,
  SALES_TAX: 0.06,
  TAX_DUE_DAY: 30,
  MAP: { WIDTH: 10, HEIGHT: 8 },

  DIFFICULTY: {
    facil:   { START_MONEY: 25000, MARKET_VOL: 0.06, SERVICE_MULT: 0.8, RENTAL_MULT: 0.8, PEST_CHANCE: 0.05 },
    moderado:{ START_MONEY: 12000, MARKET_VOL: 0.08, SERVICE_MULT: 1.0, RENTAL_MULT: 1.0, PEST_CHANCE: 0.07 },
    dificil: { START_MONEY: 8000,  MARKET_VOL: 0.11, SERVICE_MULT: 1.2, RENTAL_MULT: 1.3, PEST_CHANCE: 0.10 }
  },

  SERVICE_COSTS_BASE: { plant:2.0, harvest:3.5, spray:1.5, transport:0.5 },
  RENTAL_COSTS_BASE:  { tractor:1.5, planter:2.5, harvester:6.0, sprayer:2.0, truck:1.2 },

  MACHINES: [
    { id:'tractor', name:'Trator', price: 8000 },
    { id:'planter', name:'Plantadeira', price: 6000 },
    { id:'harvester', name:'Colheitadeira', price: 12000 },
    { id:'sprayer', name:'Pulverizador', price: 5000 },
    { id:'truck', name:'Caminhão', price: 7000 }
  ],

  MARKET: {
    dailyVolatility: 0.08, // será ajustado pela dificuldade na inicialização
    seasonBias: {
      'Primavera': { milho: 0.02, trigo: 0.01, soja: 0.01, algodao: 0.00, canola: 0.00, girassol: 0.00 },
      'Verão':     { milho: 0.03, trigo: -0.01, soja: 0.02, algodao: 0.01, canola: 0.00, girassol: 0.02 },
      'Outono':    { milho: -0.01, trigo: 0.02, soja: 0.01, algodao: 0.02, canola: 0.01, girassol: 0.00 },
      'Inverno':   { milho: 0.00, trigo: 0.03, soja: -0.01, algodao: 0.02, canola: 0.02, girassol: -0.01 }
    },
    floor: { milho: 18, trigo: 16, soja: 22, algodao: 38, canola: 26, girassol: 24 },
    ceil:  { milho: 58, trigo: 50, soja: 70, algodao: 110, canola: 78, girassol: 72 }
  },

  LAND: { startOwned: 16, basePrice: 300, variance: 120 },

  SILOS: {
    types: ['graos','oleo','fibra'],
    levelCaps: [200, 450, 700, 950, 1200],
    newSiloCostBase: 1800,
    upgradeCostBase: 800,
    maxLevel: 5,
    lossesOnOverflow: true
  },

  BANK: { ltv: 0.6, dailyRate: 0.0005, penaltyRate: 0.0008 }
};