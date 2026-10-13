/* v25.10 : transfert tablette <-> PC (horodatage automatique, fusion « le plus récent gagne », envoi des nouveautés) */
const {build}=require('./harness');
(async()=>{
 const {T,ui,t,done,sleep}=build();await sleep(200);const ev=c=>T.ev(c);
 const mk=(id,extra='')=>`{id:${id},proc:'Maintenance',client:{id:1,name:'Client X'},tech:'Paul',start:'13/10/2026',prev:'',prod:'1',conso:'1',steps:DEF.map((c,i)=>({st:c.i.map(()=>'ok'),obs:'${extra}',ph:i===0?[{d:'${'x'.repeat(300)}',w:10,h:10}]:[]}))}`;
 /* horodatage automatique */
 ev(`clients.push(norm({id:1,name:'Client X',address:'A'}));reports.push(${mk(1000)});baseline()`);
 t('référence au démarrage : pas de date de modification',ev('reports[0].tsm')===undefined);
 await ev('saveReports()');t('enregistrement sans changement : toujours pas de date',ev('reports[0].tsm')===undefined);
 ev(`reports[0].obs0='x';reports[0].steps[1].obs='modifié'`);await ev('saveReports()');
 const t1=ev('reports[0].tsm');t('modification : date de modification posée',typeof t1==='number'&&t1>0);
 await sleep(5);await ev('saveReports()');t('réenregistrement identique : date inchangée',ev('reports[0].tsm')===t1);
 /* envoi des nouveautés */
 ev(`reports.push(${mk(2000)});reports[1]._h='old'`);
 const all=JSON.parse(ev('snapXfer(0)')),inc=JSON.parse(ev(`snapXfer(${t1})`));
 t('« Tout envoyer » : tous les rapports',all.reports.length===2&&all.docs.length>=0);
 t('« Nouveautés » : seulement ce qui a changé après la date',inc.reports.every(r=>(r.tsm||r.id)>t1));
 t('fichier de transfert identifié',all.kind==='transfer'&&all.v===6);
 /* réception : le plus récent gagne */
 const mkIn=(id,tsm,obs,extra={})=>JSON.parse(ev(`JSON.stringify(Object.assign(${mk(id,obs)},{tsm:${tsm}}))`));
 const before=ev('reports.length');
 await ev(`restore(${JSON.stringify({v:6,reports:[mkIn(3000,5,'neuf')]})})`);
 t('réception : rapport nouveau ajouté',ev('reports.length')===before+1);
 const cur=ev('reports.find(r=>r.id===1000).tsm');
 await ev(`restore(${JSON.stringify({v:6,reports:[mkIn(1000,cur-1,'ANCIEN')]})})`);
 t('réception : une version plus ancienne n\'écrase pas',ev('reports.find(r=>r.id===1000).steps[3].obs')!=='ANCIEN');
 await ev(`restore(${JSON.stringify({v:6,reports:[mkIn(1000,cur+1000,'RECENT')]})})`);
 t('réception : une version plus récente remplace',ev('reports.find(r=>r.id===1000).steps[3].obs')==='RECENT');
 t('réception : la date de l\'envoyeur est conservée (pas de renvoi inutile)',ev('reports.find(r=>r.id===1000).tsm')===cur+1000);
 await ev('saveReports()');t('… même après réenregistrement',ev('reports.find(r=>r.id===1000).tsm')===cur+1000);
 /* sauvegarde sans photos : les photos locales sont gardées */
 const lite=mkIn(1000,cur+5000,'LITE');lite.steps.forEach(s=>s.ph=[]);
 await ev(`restore(${JSON.stringify({v:6,light:true,reports:[lite]})})`);
 t('sans photos : rapport mis à jour',ev('reports.find(r=>r.id===1000).steps[3].obs')==='LITE');
 t('sans photos : photos locales conservées',ev('reports.find(r=>r.id===1000).steps[0].ph.length')===1);
 /* rattachement au client par le nom si le numéro diffère */
 const other=mkIn(4000,9,'');other.client={id:777,name:'Client X'};
 await ev(`restore(${JSON.stringify({v:6,reports:[other]})})`);
 t('client rattaché par son nom',ev('reports.find(r=>r.id===4000).client.id')===1);
 /* maintenance en pause terminée ailleurs */
 ev(`drafts.push({id:5000,client:{id:1,name:'Client X'},steps:[]})`);
 await ev(`restore(${JSON.stringify({v:6,reports:[mkIn(5000,9,'fini')]})})`);
 t('maintenance en pause terminée ailleurs : retirée ici',ev('drafts.some(x=>x.id===5000)')===false);
 /* client : le plus récent gagne */
 ev(`clients.find(c=>c.id===1).tsm=10`);
 await ev(`restore(${JSON.stringify({v:6,clients:[{id:1,name:'Client X',address:'NOUVELLE ADRESSE',tsm:20}]})})`);
 t('client plus récent : adresse mise à jour',ev('clients.find(c=>c.id===1).address')==='NOUVELLE ADRESSE');
 await ev(`restore(${JSON.stringify({v:6,clients:[{id:1,name:'Client X',address:'VIEILLE',tsm:5}]})})`);
 t('client plus ancien : adresse conservée',ev('clients.find(c=>c.id===1).address')==='NOUVELLE ADRESSE');
 /* ancienne sauvegarde (sans dates) : n'écrase rien */
 await ev(`restore(${JSON.stringify({v:5,reports:[JSON.parse(ev(`JSON.stringify(${mk(1000,'VIEUX')})`))]})})`);
 t('ancienne sauvegarde : rien n\'est écrasé',ev('reports.find(r=>r.id===1000).steps[3].obs')==='LITE');
 /* bouton Envoyer */
 ev(`ls.set('rl_lastsend',0)`);ui.anchors.length=0;
 ev(`A.xsend({dataset:{}})`);await sleep(30);
 t('« Envoyer » : date du dernier envoi enregistrée',(+ev(`ls.get('rl_lastsend',0)`)||0)>0);
 t('carte Transfert dans Gestion',ev('xferCard()').includes('Envoyer les nouveautés')&&ev('xferCard()').includes('Recevoir un fichier'));
 done();
})();
