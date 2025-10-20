window.Bus = (()=>{
  const map = new Map();
  return {
    on(type, fn){ if(!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); return ()=>map.get(type)?.delete(fn); },
    emit(type, payload){ map.get(type)?.forEach(fn=>{ try{ fn(payload) }catch(e){ console.error(e)} }); }
  };
})();