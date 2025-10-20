window.CFStorage = {
  key: 'cambrussi_farm_v19_pro_hotfix',
  save(state){ try{ localStorage.setItem(this.key, JSON.stringify(state)); Bus.emit('toast',{type:'ok',text:'Jogo salvo.'}); }catch(e){ Bus.emit('toast',{type:'err',text:'Falha ao salvar'}); } },
  load(){ try{ const s=localStorage.getItem(this.key); return s? JSON.parse(s):null; }catch(e){ return null; } },
  reset(){ localStorage.removeItem(this.key); }
};