/* v24 : menu, cohérence Gestion / planning / droits / sauvegarde (cas limites trouvés à la relecture). */
const {build}=require('./harness');
(async()=>{
 const h=build();await h.sleep(250);const {T,A,ui,toasts,t}=h,ev=c=>T.ev(c),html=()=>{ev('render()');return ui.app};
 const CID=424242,CID2=424243;
 const rep=(id,cid,start)=>({id,start,end:start,tech:'T',client:{id:cid,name:'Client '+cid,address:'x',power:'',contact:'',phone:'',notes:''},pid:1,prev:'—',prod:'100',conso:'50',obs:'',
   steps:T.DEF.map(c=>({st:c.i.map(()=>'ok'),obs:'',ph:[],torque:''}))});
 ev("clients.push({id:"+CID+",name:'Client A',dates:['01/01/2025'],address:'x',power:'',contact:'',phone:'',notes:''},{id:"+CID2+",name:'Client B',dates:[],address:'',power:'',contact:'',phone:'',notes:''})");
 const lim=()=>({clients:1});

 /* ---- droits : « Supprimer une intervention (depuis Gestion) » doit donner accès à Gestion ---- */
 ev('admin=false');ev("ls.set('rl_rights',{...RPRE.min(),plan_del:1})");
 t('droit « supprimer une intervention » seul : le bouton Gestion apparaît',ev('mgmt()')===true);
 ev("view='adm'");html();
 t('… et l\'onglet Planning est disponible',/data-t="s"/.test(ui.app));
 ev("ls.set('rl_rights',RPRE.min())");t('aucun droit de gestion : pas de Gestion',ev('mgmt()')===false);

 /* ---- export d'un rapport supprimé : jamais un autre rapport ---- */
 ev('admin=true');ev('reports.length=0');ev('reports.push('+JSON.stringify(rep(9001,CID,'01/06/2026'))+')');
 ev('last='+JSON.stringify(rep(9002,CID,'02/06/2026')));
 toasts.length=0;await A.exp({dataset:{f:'pdf',id:'12345'}});
 t('exporter un rapport qui n\'existe plus : refusé, rien n\'est généré',toasts.some(x=>/introuvable/i.test(x))&&!toasts.some(x=>/Fichier enregistré/.test(x)));
 toasts.length=0;await A.exp({dataset:{f:'pdf',id:'9001'}});
 t('exporter un rapport existant : fonctionne',toasts.some(x=>/Fichier enregistré/.test(x)));

 /* ---- planning lié à un rapport supprimé ---- */
 ev("plans.length=0;plans.push({id:301,clientId:"+CID+",procId:1,date:'2026-06-01',time:'08:00',tech:'T',notes:'',status:'done',reportId:9001,hist:[]},{id:302,clientId:"+CID+",procId:1,date:'2026-06-02',time:'08:00',tech:'T',notes:'',status:'done',reportId:777,hist:[]})");
 ev("plh='old';view='home'");html();
 t('accueil : bouton « Rapport » seulement si le rapport existe encore',ev("plRow(plans.find(p=>p.id===301))").includes('📄 Rapport')&&!ev("plRow(plans.find(p=>p.id===302))").includes('📄 Rapport'));
 A.delrep({dataset:{id:'9001'}});A.yes();
 t('supprimer un rapport : l\'intervention n\'y fait plus référence',ev('reports.length')===0&&ev('plans.find(p=>p.id===301).reportId')===undefined);

 /* ---- démarrer deux fois la même intervention : reprendre, pas de doublon ---- */
 ev("plans.length=0;plans.push({id:401,clientId:"+CID+",procId:1,date:'2026-06-01',time:'08:00',tech:'Tech',notes:'',status:'planned',hist:[]})");
 ev("drafts=[];draft=null;view='home'");A.plgo({dataset:{id:'401'}});
 t('démarrer une intervention crée un brouillon lié',ev('drafts.length')===1&&ev('draft.planId')===401);
 const d1=ev('draft.id');ev("view='home'");A.plgo({dataset:{id:'401'}});
 t('la redémarrer reprend le brouillon existant (pas de doublon)',ev('drafts.length')===1&&ev('draft.id')===d1&&ev('view')==='wiz');
 ev("drafts=[];draft=null;view='home'");

 /* ---- supprimer un client : ses interventions à venir ne restent pas orphelines ---- */
 ev("plans.length=0;plans.push({id:501,clientId:"+CID2+",procId:1,date:'2026-07-01',time:'08:00',tech:'',notes:'',status:'planned',hist:[]},{id:502,clientId:"+CID2+",procId:1,date:'2026-05-01',time:'08:00',tech:'',notes:'',status:'done',hist:[]},{id:503,clientId:"+CID+",procId:1,date:'2026-07-02',time:'08:00',tech:'',notes:'',status:'planned',hist:[]})");
 A.cdel({dataset:{id:String(CID2)}});
 t('supprimer un client : la confirmation annonce les interventions à venir',/1 intervention/.test(ui.modal));
 A.yes();
 t('… elles sont retirées, l\'historique et les autres clients restent',!ev('plans.some(p=>p.id===501)')&&ev('plans.some(p=>p.id===502)')&&ev('plans.some(p=>p.id===503)')&&!ev('clients.some(c=>c.id==='+CID2+')'));

 /* ---- reprogrammer en tant qu'utilisateur : uniquement date / heure ---- */
 ev("plans.length=0;plans.push({id:601,clientId:"+CID+",procId:1,date:'2026-07-01',time:'08:00',tech:'Paul',notes:'n',status:'planned',hist:[]})");
 ev('admin=false');ev("ls.set('rl_rights',{...RPRE.min(),plan_edit:1})");
 A.pledit({dataset:{id:'601'}});
 ev("pl.status='done';pl.clientId="+CID2+";pl.tech='Pirate';pl.notes='hack';pl.date='2026-07-09'");A.plsave();
 const P6=ev("plans.find(p=>p.id===601)");
 t('utilisateur : la date change',P6.date==='2026-07-09');
 t('… mais pas le statut, le client, le technicien ni les notes',P6.status==='planned'&&P6.clientId==CID&&P6.tech==='Paul'&&P6.notes==='n');

 /* ---- catégories : droit propre à chaque type ---- */
 ev("ls.set('rl_rights',{...RPRE.min(),doc_edit:1})");toasts.length=0;A.catnew({dataset:{k:'p'}});
 t('droit « documents » seul : pas de catégorie de procédures',toasts.some(x=>/droit insuffisant/.test(x)));
 toasts.length=0;A.catnew({dataset:{k:'d'}});t('… mais catégorie de documents autorisée',!toasts.some(x=>/droit insuffisant/.test(x))&&/Nouvelle catégorie/.test(ui.modal));A.catcancel();
 ev("ls.set('rl_rights',{...RPRE.min(),proc_edit:1})");toasts.length=0;A.catnew({dataset:{k:'d'}});
 t('droit « procédures » seul : pas de catégorie de documents',toasts.some(x=>/droit insuffisant/.test(x)));

 /* ---- dupliquer une procédure deux fois : titres distincts ---- */
 ev('admin=true');const pid=ev('procs[0].id'),n0=ev('procs.length');
 A.pdup({dataset:{id:String(pid)}});A.pdup({dataset:{id:String(pid)}});
 const titles=ev('procs.map(p=>p.title)');
 t('deux duplications : deux titres différents',ev('procs.length')===n0+2&&new Set(titles).size===titles.length);
 ev("view='adm'");ui.inputs.pcp=String(pid);A.pedit({dataset:{id:''}});ui.inputs.pcp=String(pid);A.pnew({dataset:{m:'copy'}});
 t('copier une procédure : le titre proposé est libre',!ev('procs.some(p=>p.title===pe.title)'));ev('pe=null;view="adm"');

 /* ---- supprimer un document : plus aucune référence ---- */
 ev("docs.push({id:'dX',title:'Doc X',desc:'',cat:'',type:'image',src:'data:image/jpeg;base64,AAAA'});procs[0].docs=['dX'];procs[0].steps=procs[0].steps.map((s,i)=>i===0?{...s,docs:['dX']}:s)");
 A.ddel({dataset:{id:'dX'}});A.yes();
 t('document supprimé : retiré des procédures et de leurs étapes',!ev('docs.some(d=>d.id==="dX")')&&!ev('procs[0].docs.includes("dX")')&&!ev('procs[0].steps.some(s=>(s.docs||[]).includes("dX"))'));

 /* ---- restauration : les rapports suivent le client fusionné ---- */
 ev("clients=[{id:1,name:'Client A',dates:[],address:'',power:'',contact:'',phone:'',notes:''}]");ev('reports.length=0');
 const S={v:5,clients:[{id:99,name:'client a',dates:['01/01/2024']}],reports:[rep(8001,99,'01/01/2024')],plans:[],procs:[],docs:[],drafts:[]};
 await T.restore(S);
 t('restauration : client fusionné par nom, rapport rattaché au bon client',ev('clients.length')===1&&ev('reports.find(r=>r.id===8001).client.id')===1);

 /* ---- supprimer toutes les procédures : elles ne reviennent pas au redémarrage ---- */
 const h1=build();await h1.sleep(250);h1.T.ev('procs=[]');await h1.T.ev('saveProcs()');await h1.sleep(50);
 const h2=build({kv:h1.kv});await h2.sleep(300);
 t('procédures toutes supprimées : pas de procédure fantôme au redémarrage',h2.T.ev('procs.length')===0);
 const h3=build();await h3.sleep(250);t('premier démarrage : la procédure standard est créée',h3.T.ev('procs.length')===1&&h3.T.ev("procs[0].status")==='pub');

 /* ---- accueil : plus de 8 interventions ---- */
 ev('admin=false');ev("ls.set('rl_rights',RSTD())");
 ev("plans.length=0;for(let i=0;i<11;i++)plans.push({id:700+i,clientId:"+CID+",procId:1,date:'2027-01-'+String(10+i),time:'08:00',tech:'',notes:'',status:'planned',hist:[]})");
 ev("plh='up';plAll=0;view='home'");let H=html();
 t('accueil : 8 interventions + bouton « Voir tout (11) »',(H.match(/data-a="plgo"/g)||[]).length===8&&/data-a="plall"[^>]*>[^<]*11/.test(H));
 A.plall();H=ui.app;t('… « Voir tout » affiche les 11',(H.match(/data-a="plgo"/g)||[]).length===11&&/Réduire/.test(H));
 ev('plAll=0');

 /* ---- menu ---- */
 ev('admin=false');ev("ls.set('rl_rights',RPRE.min())");ev("view='home'");H=html();
 t('en-tête : bouton Menu présent',/data-a="menu"/.test(H));
 A.menu();t('menu utilisateur sans droit de gestion : Accueil + mode administrateur seulement',/data-a="mhome"/.test(ui.modal)&&/data-a="madmin"/.test(ui.modal)&&!/data-a="mtab"/.test(ui.modal));
 ev("ls.set('rl_rights',{...RPRE.min(),proc_edit:1,doc_edit:1})");A.menu();
 t('menu avec droits : accès direct aux sections autorisées (Procédures, Documents, Catégories)',/data-t="p"/.test(ui.modal)&&/data-t="d"/.test(ui.modal)&&/data-t="k"/.test(ui.modal)&&!/data-t="r"/.test(ui.modal));
 A.mtab({dataset:{t:'d'}});t('… choisir Documents ouvre Gestion sur Documents et ferme le menu',ev('view')==='adm'&&ev('admTab')==='d'&&ui.modal==='');
 ev('admin=true');A.menu();t('menu administrateur : toutes les sections, dont Droits & accès',/data-t="r"/.test(ui.modal)&&/data-t="c"/.test(ui.modal)&&/Quitter/.test(ui.modal));
 A.madmin();t('« Quitter le mode admin » depuis le menu : retour accueil, menu fermé',ev('admin')===false&&ev('view')==='home'&&ui.modal==='');
 ev("view='wiz'");
 console.log('');h.done();
})();
