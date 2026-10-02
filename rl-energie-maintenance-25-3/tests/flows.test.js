const {build}=require('./harness');
(async()=>{
 const {T,A,ctx,ui,kv,L,toasts,t,done,sleep}=build();await sleep(200);
 const ri=T.STEPS.findIndex(c=>c.releve),CID=424242;
 const base=()=>({id:5000,step:ri,start:'01/06/2026',tech:'T',client:{id:CID,name:'Client A',address:'x',power:'',contact:'',phone:'',notes:''},pid:1,pver:1,prev:'',prod:'100',conso:'50',obs:'',defects:[],meter:'',
   steps:T.STEPS.map(c=>({st:c.i.map(()=>'ok'),obs:'',ph:[]})),ph:[]});
 T.reports.push({...base(),id:1000,step:undefined,start:'01/01/2025',end:'01/01/2025',prod:'2 000,5',conso:'10'});
 // --- relevés
 T.draft=base();T.draft.prod='abc';ui.modal='';A.next();
 t('relevé « abc » refusé',T.draft.step===ri&&ui.modal==='');
 T.draft=base();T.draft.prod='150';A.next();
 t('relevé inférieur => confirmation affichée',T.draft.step===ri&&/inférieur/.test(ui.modal)&&/2000\.5/.test(ui.modal));
 A.yes();t('… « Confirmer » passe à l\'étape suivante',T.draft.step===ri+1);
 T.draft=base();T.draft.prod='2 100,5';T.draft.conso='60';ui.modal='';A.next();
 t('relevé supérieur (virgule) sans alerte',T.draft.step===ri+1&&!/inférieur/.test(ui.modal));
 // --- fenêtres
 ui.modal='<div class="ov"><div class="dlg">x</div></div>';T.setPe(null);T.tryClose();t('Échap ferme une fenêtre simple',ui.modal==='');
 ui.modal='<div class="ov"><div class="dlg">x</div></div>';T.setPe({});T.tryClose();t('Échap ne ferme PAS l\'éditeur de procédure',ui.modal!=='');T.setPe(null);
 ui.modal='<div class="ov"><div class="dlg danger">x</div></div>';T.tryClose();t('Échap ne ferme pas l\'alerte danger',ui.modal!=='');ui.modal='';
 // --- partage de fichiers
 let shared=0,cb=0;ctx.navigator.canShare=()=>true;ctx.navigator.share=async()=>{shared=1};
 T.dl(new Blob(['x'],{type:'application/pdf'}),'Rapport_test.pdf',()=>cb++);
 t('fenêtre Enregistrer/Partager proposée',/fshare/.test(ui.modal)&&/fsave/.test(ui.modal));
 await A.fshare();t('Partager => navigator.share puis fermeture',shared===1&&ui.modal===''&&cb===1);
 delete ctx.navigator.canShare;cb=0;T.dl(new Blob(['x']),'a.json',()=>cb++);
 t('sans partage : téléchargement direct + callback',ui.modal===''&&cb===1);
 // --- planning : procédure indisponible
 T.clients.push({id:CID,name:'Client A',dates:['01/01/2025'],address:'x',power:'',contact:'',phone:'',notes:''});
 const proc=(id,st)=>({id,title:'Proc <'+id+'>',status:st,ver:1,steps:T.DEF,docs:[]});
 T.procs=[proc(1,'draft')];T.plans.push({id:77,clientId:CID,procId:1,date:'2026-06-01',status:'todo',tech:'Tech'});
 T.draft=null;toasts.length=0;A.plgo({dataset:{id:77}});t('aucune procédure publiée => message clair',toasts.some(x=>/Aucune procédure/.test(x)));
 T.procs=[proc(1,'draft'),proc(2,'pub')];ui.modal='';A.plgo({dataset:{id:77}});
 t('procédure indisponible => confirmation (titre échappé)',/plus disponible/.test(ui.modal)&&/Proc &lt;2&gt;/.test(ui.modal));
 A.yes();t('… démarre avec l\'autre procédure, planId lié',T.draft&&T.draft.pid===2&&T.draft.planId===77);
 const old=T.draft;T.form.tech='';T.plans.push({id:78,clientId:CID,procId:2,date:'2026-06-02',status:'todo',tech:''});A.plgo({dataset:{id:78}});
 t('start échoué : l\'ancien brouillon garde son planId',T.draft===old&&old.planId===77);
 // --- fin de rapport
 const full=()=>({...base(),step:T.STEPS.length-1});
 T.draft=full();T.draft.id=6001;T.drafts.push(T.draft);ctx.FAIL=1;const n0=T.reports.length;toasts.length=0;
 await A.next();await sleep(50);ctx.FAIL=0;
 t('stockage plein : rapport NON ajouté, brouillon gardé, erreur affichée',T.reports.length===n0&&T.drafts.some(x=>x.id===6001)&&toasts.some(x=>/NON enregistré|impossible/.test(x)));
 T.draft=full();T.draft.id=6002;T.draft.prod='3000';T.draft.conso='70';T.drafts.push(T.draft);
 await A.next();await sleep(80);
 t('stockage OK : rapport ajouté, brouillon retiré, vue « done »',T.reports.some(x=>x.id===6002)&&!T.drafts.some(x=>x.id===6002)&&T.view==='done');
 t('… client mis à jour (dates triées) + planning hors-planning créé',T.clients.find(c=>c.id===CID).dates[0]==='01/06/2026'&&T.plans.some(p=>p.reportId===6002));
 // --- arrière-plan
 T.drafts.push({id:9999,client:{id:1,name:'Client A'},steps:[]});delete kv.drafts;
 ctx.document.visibilityState='hidden';L.visibilitychange.forEach(f=>f());await sleep(50);
 t('arrière-plan => brouillons écrits immédiatement',Array.isArray(kv.drafts)&&kv.drafts.some(x=>x.id===9999));
 // --- échappement dans l'écran d'étape
 T.STEPS[0]={...T.STEPS[0],t:'Titre <b>X</b> & co',i:['Point <i>1</i>']};
 T.draft=base();T.draft.step=0;T.draft.steps=T.STEPS.map(c=>({st:c.i.map(()=>''),obs:'',ph:[]}));T.view='wiz';T.ev('render()');
 t('titres/points d\'étape échappés',/Titre &lt;b&gt;X&lt;\/b&gt;/.test(ui.app)&&!/<b>X<\/b>/.test(ui.app)&&/Point &lt;i&gt;1&lt;\/i&gt;/.test(ui.app));
 done();
})();
