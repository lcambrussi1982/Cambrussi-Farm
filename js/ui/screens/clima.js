(function(){
  function render(){
    const s = GameState.get(); const root=document.createElement('div'); root.className='grid cols-3';
    const card=UI.section('Clima'); const list=document.createElement('div'); list.className='list';
    const w=s.weather; list.innerHTML=`
      <div class="kv"><span>Estação</span><b>${w.season}</b></div>
      <div class="kv"><span>Temperatura</span><b>${w.temp}°C</b></div>
      <div class="kv"><span>Chuva</span><b>${w.rain?'Sim':'Não'}</b></div>`;
    card.appendChild(list); root.appendChild(card); return root;
  }
  Bus.on('route', tab=>{ if(tab==='clima') UI.mount(render()); });
  Bus.on('weather', ()=>{ if(Router.get()==='clima') UI.mount(render()); });
})();