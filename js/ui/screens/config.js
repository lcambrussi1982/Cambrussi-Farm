(function(){
  let loop=null;
  function setLoop(mult){
    if(loop) clearInterval(loop);
    const base = CF_CONSTANTS.TICK_MS_BASE;
    if(mult<=0){ return; }
    loop = setInterval(()=>GameState.tick(), Math.max(60, base / mult));
  }
  function render(){
    const s = GameState.get();
    const root = document.createElement('div'); root.className='grid cols-2';
    const card = UI.section('Config');
    const info = document.createElement('div'); info.className='list';
    const cap = Silos.totalCapacity(s);
    info.innerHTML = `<div class="kv"><span>Velocidade</span><b>${s.time.speedFactor}x</b></div>
      <div class="kv"><span>Capacidade Total</span><b>${cap}</b></div>`;
    card.appendChild(info);
    root.append(card);
    return root;
  }
  Bus.on('route', tab=>{ if(tab==='config') UI.mount(render()); });
  Bus.on('speed', mult=> setLoop(mult) );
  window.addEventListener('DOMContentLoaded', ()=>{
    const sel = document.getElementById('speed'); sel.value='1'; Bus.emit('speed', 1);
  });
})();