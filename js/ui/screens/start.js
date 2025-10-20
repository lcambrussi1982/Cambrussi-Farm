(function(){
  function render(){
    const root = document.getElementById('start-overlay');
    root.classList.remove('hidden');
    const card = document.createElement('div'); card.className='start-card';
    card.innerHTML = `<h2>Bem-vindo ao Cambrussi Farm</h2>
      <p>Escolha o nível de dificuldade para começar:</p>`;
    const grid = document.createElement('div'); grid.className='diff-grid';

    const diffs = [
      {id:'facil', title:'Fácil', desc:'Mais dinheiro inicial, custos e volatilidade menores.'},
      {id:'moderado', title:'Moderado', desc:'Equilíbrio entre risco e retorno.'},
      {id:'dificil', title:'Difícil', desc:'Pouco dinheiro, custos e volatilidade maiores.'}
    ];
    diffs.forEach(d=>{
      const box = document.createElement('div'); box.className='diff';
      box.innerHTML = `<h3>${d.title}</h3><div class="small">${d.desc}</div>`;
      const b = document.createElement('button'); b.textContent='Começar'; b.onclick=()=> startGame(d.id);
      box.appendChild(b); grid.appendChild(box);
    });

    card.appendChild(grid);
    root.innerHTML=''; root.appendChild(card);
  }

  function startGame(level){
    const s = GameState.get();
    GameState.applyDifficulty(level);
    Silos.recomputeCapacity(GameState.get());
    Bus.emit('money', s.player.money); Bus.emit('clock', s.time); Bus.emit('weather', s.weather); Bus.emit('market', s.market); Bus.emit('land'); Bus.emit('cap'); Bus.emit('tax', s.taxes.due); Bus.emit('debt', 0);
    document.getElementById('start-overlay').classList.add('hidden');
    Router.init();
    Bus.emit('speed', 1);
  }

  Bus.on('start', render);
})();

// v20 badge (não intrusivo)
try{ Bus.on('route', (tab)=>{ if(tab==='start'){ const b=document.querySelector('.version-pill'); if(!b){ const v=document.createElement('div'); v.className='version-pill'; v.textContent='v'+(CF_CONSTANTS.VERSION||'20.0.0'); v.style.cssText='position:fixed;right:12px;bottom:12px;padding:6px 10px;border-radius:12px;background:#1118;color:#fff;font-size:12px;opacity:.8;backdrop-filter:blur(6px)'; document.body.appendChild(v);} } }); }catch(e){}
