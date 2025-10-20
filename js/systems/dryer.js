// Secador: fila e bônus de preço
// Depende: GameState, Bus
window.Dryer = {
  priceBonusFor(/*id*/){
    return 0.15; // +15% no preço
  },
  enqueue(id, qty){
    const s = GameState.get();
    s.dryer = s.dryer || { queue:[] };
    s.dryer.queue.push({ id, qty });
    Bus.emit('dryer', s.dryer.queue);
  }
};
