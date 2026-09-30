/* Banc de test : exécute le VRAI code de l'app (js/*.js + libs PDF/Excel/Word) dans Node,
   avec un faux navigateur (DOM, localStorage, IndexedDB, partage). Lancer depuis n'importe où :
   node tests/run.js */
const fs=require('fs'),vm=require('vm'),path=require('path'),{webcrypto}=require('crypto');
const ROOT=path.join(__dirname,'..');
const APP=['core','data','state','ui','actions','exports','boot'].map(n=>'js/'+n+'.js');
const LIBS=['logo-data.js','libs/jspdf.umd.min.js','libs/jspdf.plugin.autotable.min.js','libs/exceljs.min.js','libs/docx.umd.js'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const proxy=()=>new Proxy(function(){},{get:(t,k)=>k==='classList'?{contains:()=>false,add(){},remove(){},toggle(){}}:k==='dataset'?{}:k==='files'?[]:k==='style'?{}:(k in t?t[k]:proxy()),set:()=>true,apply:()=>proxy()});

function build(o={}){
  const store=Object.assign({},o.store||{}),kv=Object.assign({},o.kv||{}),L={},toasts=[];
  const ui={modal:'',app:'',stor:{textContent:''},inputs:{},logs:[],anchors:[]};
  const ctx={console:{log:console.log,error:(...a)=>ui.logs.push(a.join(' ')),warn(){}},setTimeout,clearTimeout,URL,Blob,Date,TextEncoder,TextDecoder,
    File:class extends Blob{constructor(p,n,x){super(p,x);this.name=n}},
    crypto:o.noCrypto?undefined:webcrypto,
    navigator:{userAgent:'Android',storage:{persist:async()=>1,estimate:async()=>o.estimate||{usage:12e6,quota:2e9}}},
    location:{protocol:'file:',host:''},
    localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{if(ctx.LSFAIL)throw new Error('quota');store[k]=String(v)},removeItem:k=>{delete store[k]}},
    document:{visibilityState:'visible',readyState:'complete',body:{appendChild(){}},
      querySelector:s=>{
        if(s==='#modal')return{set innerHTML(v){ui.modal=v},get innerHTML(){return ui.modal}};
        if(s==='#modal .dlg')return ui.modal?{classList:{contains:c=>ui.modal.includes('class="dlg '+c)},focus(){}}:null;
        if(s==='#toast')return{appendChild:e=>toasts.push(e.textContent)};
        if(s==='#app')return{set innerHTML(v){ui.app=v},get innerHTML(){return ui.app},scrollTop:0};
        if(s==='#stor')return ui.stor;
        if(s[0]==='#'&&ui.inputs[s.slice(1)]!==undefined)return{value:ui.inputs[s.slice(1)],focus(){}};
        return proxy()},
      querySelectorAll:()=>[],addEventListener:(t,f)=>{(L[t]=L[t]||[]).push(f)},
      createElement:()=>{const o={className:'',textContent:'',remove(){},click(){},style:{},setAttribute(){}};ui.anchors.push(o);return o}},
    addEventListener:(t,f)=>{(L[t]=L[t]||[]).push(f)},scrollTo(){},requestAnimationFrame:f=>f(),
    atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
    indexedDB:{open(){const q={};setTimeout(()=>{
      const db={objectStoreNames:{contains:()=>true},createObjectStore(){},transaction:()=>{const t={};
        const st={get:k=>{const r={};setTimeout(()=>{r.result=kv[k]===undefined?undefined:JSON.parse(JSON.stringify(kv[k]));t.oncomplete&&t.oncomplete()});return r},
          put:(v,k)=>{const r={};setTimeout(()=>{if(ctx.FAIL){t.error=new Error('QuotaExceeded');t.onabort&&t.onabort();return}kv[k]=JSON.parse(JSON.stringify(v));t.oncomplete&&t.oncomplete()});return r},
          delete:k=>{const r={};delete kv[k];setTimeout(()=>t.oncomplete&&t.oncomplete());return r}};
        t.objectStore=()=>st;return t}};
      q.result=db;q.onupgradeneeded&&q.onupgradeneeded();q.onsuccess&&q.onsuccess()});return q}}};
  ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  LIBS.forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f}));
  APP.forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f})); // un script par fichier, comme le navigateur
  vm.runInContext(`globalThis.__t={A,ev:c=>eval(c),
    get clients(){return clients},set clients(v){clients=v},get reports(){return reports},get plans(){return plans},get drafts(){return drafts},
    get procs(){return procs},set procs(v){procs=v},get draft(){return draft},set draft(v){draft=v},get view(){return view},set view(v){view=v},
    form,get STEPS(){return STEPS},DEF,get ready(){return ready},setPe:v=>pe=v,tryClose,dl,mkPdf,mkXls,mkDoc,restore,mergeDates,dkey,numv,esc,dbSave,norm,saveReports,snap}`,ctx);
  let ok=0,ko=0;const t=(n,c)=>{console.log((c?'✅':'❌')+' '+n);c?ok++:ko++};
  const done=()=>{console.log(`\n${ok} OK / ${ko} KO`);process.exit(ko?1:0)};
  return{ctx,T:ctx.__t,A:ctx.__t.A,ui,kv,store,L,toasts,sleep,t,done};
}
process.on('unhandledRejection',e=>{console.log('❌ ERREUR NON GÉRÉE :',e&&e.stack?e.stack.split('\n').slice(0,3).join(' | '):e);process.exitCode=1});
module.exports={build,sleep,ROOT};
