window.Router = (()=>{
  let current = 'dashboard';
  const mount = (name)=>{ current = name; Bus.emit('route', name); };
  const init = ()=>{ document.querySelectorAll('#tabs button').forEach(btn=>{
    btn.addEventListener('click', ()=>{ document.querySelector('#tabs .active')?.classList.remove('active'); btn.classList.add('active'); mount(btn.dataset.tab); });
  }); };
  return { init, mount, get:()=>current };
})();