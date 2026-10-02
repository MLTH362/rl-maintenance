'use strict';
/* R.L ENERGIE — État, sauvegardes, helpers métier (relevés, dates, stats) */
/* ---------- État ---------- */
let clients=(ls.get('rl_clients',null)||SEED).map(norm),reports=[],drafts=[],draft=null,last=null,admin=false,view='home',editId=null,pend=null,form={tech:ls.get('rl_tech',''),ci:'',pi:''};
const VER='25.1';let ready=0,_te=0;
const dbSave=(k,v)=>idb.set(k,v).then(()=>true,e=>{console.error(e);if(Date.now()-_te>4000){_te=Date.now();toast('⚠ Enregistrement impossible : stockage plein ou indisponible. Faites une sauvegarde JSON.','err')}return false});
const saveClients=async()=>{if(await dbSave('clients',clients)){try{localStorage.removeItem('rl_clients')}catch{}return true}ls.set('rl_clients',clients);return false},saveReports=()=>dbSave('reports',reports),saveProcs=()=>dbSave('procs',procs),saveDocs=()=>dbSave('docs',docs),savePlans=()=>dbSave('plans',plans);
let tm;const saveDraft=(now)=>{clearTimeout(tm);const f=()=>dbSave('drafts',drafts);now?f():tm=setTimeout(f,300)};
const snap=light=>JSON.stringify({v:5,light:!!light,clients,reports,procs,docs,plans,drafts,rights:ls.get('rl_rights',null),cats},light?(k,v)=>k==='ph'&&Array.isArray(v)?[]:v:undefined);
const fmtB=n=>n>=1e9?(n/1e9).toFixed(1)+' Go':n>=1e6?Math.round(n/1e6)+' Mo':Math.round(n/1e3)+' Ko';
const photoStats=()=>{let n=0,c=0;const add=a=>(a||[]).forEach(q=>{if(q&&q.d){n+=q.d.length*.75;c++}}),sc=r=>{add(r.ph);(r.steps||[]).forEach(s=>add(s.ph))};reports.forEach(sc);drafts.forEach(sc);return{bytes:n,count:c}};
async function showStorage(){const e=$('#stor');if(!e)return;try{const s=await navigator.storage.estimate(),p=photoStats();e.textContent=`${fmtB(s.usage)} utilisés sur ${fmtB(s.quota)} (${Math.round(s.usage/s.quota*100)} %) — dont ${p.count} photo(s) ≈ ${fmtB(p.bytes)}`}catch{e.textContent='indisponible sur ce navigateur'}}
async function checkSpace(){try{const s=await navigator.storage.estimate();if(s.quota&&s.usage/s.quota>.8)toast(`⚠ Stockage utilisé à ${Math.round(s.usage/s.quota*100)} % : faites une sauvegarde puis supprimez d'anciens rapports.`,'err')}catch{}}
const dkey=x=>{const m=String(x).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?+m[3]*10000+ +m[2]*100+ +m[1]:0};
const mergeDates=(...L)=>[...new Set(L.flat())].sort((a,b)=>dkey(b)-dkey(a));
const numv=v=>parseFloat(String(v).replace(/\s/g,'').replace(',','.'));
const prevReading=()=>{const L=reports.filter(r=>(r.client.id==draft.client.id||r.client.name===draft.client.name)&&r.id<draft.id&&r.id!==draft.editOf&&!isNaN(numv(r.prod))&&!isNaN(numv(r.conso))).sort((a,b)=>b.id-a.id)[0];return L?{prod:numv(L.prod),conso:numv(L.conso)}:null};
const mapUrl=a=>/Android/i.test(navigator.userAgent)?'geo:0,0?q='+encodeURIComponent(a):'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(a);
const newDraft=(c,tech,P)=>(use({def:P.steps}),{def:P.steps,proc:P.title,pid:P.id,pdocs:P.docs||[],id:Date.now(),client:{...c},prev:c.dates[0]||'—',tech,start:today(),step:0,prod:'',conso:'',steps:STEPS.map(s=>({st:s.i.map(()=>''),obs:'',ph:[],torque:''}))});
const stats=r=>{use(r);const n={ok:0,ko:0,nc:0};STEPS.forEach((c,i)=>c.i.forEach((_,j)=>{const k=r.steps[i].st[j];if(k in n)n[k]++}));return n};
const lines=(r,i)=>{const c=STEPS[i],s=r.steps[i],o=c.i.map((d,j)=>({d,k:s.st[j]}));
if(c.torque&&s.torque)o.push({d:'Couple de serrage appliqué : '+s.torque,k:'m'});
if(c.releve){o.push({d:'Relevé compteur production : '+(r.prod||'—')+' kWh',k:'m'});o.push({d:'Relevé compteur non-consommation : '+(r.conso||'—')+' kWh',k:'m'})}return o};
const defects=r=>{const o=[];STEPS.forEach((c,i)=>c.i.forEach((x,j)=>r.steps[i].st[j]==='ko'&&o.push([`${i+1}. ${c.t}`,x,r.steps[i].obs||'—'])));return o};

/* ---------- Droits : Utilisateur (technicien) / Administrateur ----------
   L'administrateur (mot de passe) a toujours tous les droits. Pour l'utilisateur, chaque droit est réglable
   dans Gestion > Droits & accès. [clé, libellé, valeur d'origine] */
const RIGHTS=[
['Interventions',[['plan_add','Planifier une intervention',1],['plan_edit','Modifier la date et l\'heure d\'une intervention',1],['plan_del','Supprimer une intervention (depuis Gestion)',0]]],
['Rapports',[['rep_exp','Exporter un rapport (PDF, Excel, Word)',1],['rep_edit','Modifier un rapport terminé',0],['rep_del','Supprimer un rapport',0]]],
['Clients',[['cli_edit','Ajouter et modifier les clients',0],['cli_del','Supprimer et fusionner les clients',0]]],
['Procédures et documents',[['proc_edit','Créer et modifier les procédures',0],['doc_edit','Ajouter et modifier les documents de référence',0]]],
['Données et réglages',[['backup','Sauvegarder et restaurer les données',0],['co_edit','Modifier les coordonnées de l\'entreprise',0],['diag','Consulter le diagnostic',0]]]];
const RKEYS=RIGHTS.flatMap(g=>g[1].map(x=>x[0])),RSTD=()=>Object.fromEntries(RIGHTS.flatMap(g=>g[1].map(x=>[x[0],x[2]])));
const RPRE={min:()=>Object.fromEntries(RKEYS.map(k=>[k,k==='rep_exp'?1:0])),std:RSTD,all:()=>Object.fromEntries(RKEYS.map(k=>[k,1]))};
/* ancien réglage v21 « qui peut modifier les dates » : repris tant que les droits n'ont jamais été enregistrés */
const rights=()=>{const d=RSTD();if(ls.get('rl_pp','both')==='admin'){d.plan_add=0;d.plan_edit=0}return{...d,...ls.get('rl_rights',{})}};
const perm=k=>admin||!!rights()[k];
/* Gestion visible pour l'utilisateur seulement si au moins un droit de gestion lui est donné (le planning reste sur l'accueil) */
const mgmt=()=>admin||['cli_edit','cli_del','proc_edit','doc_edit','backup','co_edit','diag','plan_del'].some(k=>rights()[k]);

/* ---------- Catégories (procédures et documents) : créées, renommées, supprimées depuis Gestion ---------- */
let cats={p:[],d:[]},peOpen=0,peSnap='',catCtx=null,deTarget=null;
const saveCats=()=>dbSave('cats',cats);
const catList=k=>[...new Set([...(cats[k]||[]),...(k==='p'?procs:docs).map(x=>x.cat).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'fr'));
const catCount=(k,c)=>(k==='p'?procs:docs).filter(x=>x.cat===c).length;
/* titre de procédure libre : « X (copie) », puis « X (copie 2) »… */
const uniqTitle=base=>{const used=new Set(procs.map(x=>String(x.title||'').trim().toLowerCase()));if(!used.has(base.toLowerCase()))return base;const b0=base.endsWith(')')?base.slice(0,-1):base;for(let n=2;;n++){const t=b0+' '+n+')';if(!used.has(t.toLowerCase()))return t}};
