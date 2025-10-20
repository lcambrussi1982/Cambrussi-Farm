(function(){
  function bootstrap(){
    const saved = CFStorage.load();
    if(saved && saved.meta?.version){
      GameState.set(saved);
      Silos.recomputeCapacity(GameState.get());
      Bus.emit('money', saved.player.money); Bus.emit('clock', saved.time); Bus.emit('weather', saved.weather); Bus.emit('market', saved.market); Bus.emit('land'); Bus.emit('cap'); Bus.emit('tax', saved.taxes.due); Bus.emit('debt', 0);
      Router.init(); Bus.emit('speed', 1);
    }else{
      // Tela inicial de dificuldade
      Bus.emit('start');
    }
    // autosave a cada 2h de jogo simulado
    setInterval(()=>{
      const cur = GameState.get();
      if((cur.time.minute % 120)===0){ CFStorage.save(GameState.get()); }
    }, 800);
  }
  window.addEventListener('DOMContentLoaded', bootstrap);
})();