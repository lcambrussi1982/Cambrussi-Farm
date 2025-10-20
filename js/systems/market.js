window.Market = {
  daily(s){
    const bias = CF_CONSTANTS.MARKET.seasonBias[s.weather.season];
    const vol = s.market.volatility;
    const floor = CF_CONSTANTS.MARKET.floor;
    const ceil  = CF_CONSTANTS.MARKET.ceil;
    const p = s.market.prices;
    Object.keys(p).forEach(k=>{
      const rnd = (Math.random()*2-1)*vol;
      const drift = (bias[k]||0);
      let next = Math.max(floor[k], Math.min(ceil[k], p[k]*(1 + rnd + drift)));
      p[k] = Math.round(next*100)/100;
    });
  }
};