window.Weather = {
  seasons:['Primavera','Verão','Outono','Inverno'],
  daily(s){
    const idx=Math.floor((s.time.day-1)/30)%4; s.weather.season=this.seasons[idx];
    const table={'Primavera':[18,28,0.35],'Verão':[24,36,0.55],'Outono':[16,26,0.30],'Inverno':[8,18,0.20]};
    const [tmin,tmax,pr]=table[s.weather.season]; s.weather.temp=Math.floor(tmin+Math.random()*(tmax-tmin)); s.weather.rain=Math.random()<pr; s.weather.humidity=s.weather.rain?0.8:0.4;
  }
};