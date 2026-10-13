const {build}=require('./harness');
const C=(id,name,dates=[])=>({id,name,dates,address:'',power:'',contact:'',phone:'',notes:''});
(async()=>{
 let ok=0,ko=0;const t=(n,c)=>{console.log((c?'✅':'❌')+' '+n);c?ok++:ko++};

 /* ===== 1. clients : localStorage -> IndexedDB ===== */
 let h=build({store:{rl_clients:JSON.stringify([C(1,'Ancien client',['01/01/2024'])])}});await h.sleep(250);
 t('migration : clients de l\'ancienne version repris',h.T.clients.length===1&&h.T.clients[0].name==='Ancien client');
 t('migration : copie écrite dans IndexedDB',Array.isArray(h.kv.clients)&&h.kv.clients[0].name==='Ancien client');
 t('migration : ancienne clé localStorage supprimée (place libérée)',!('rl_clients' in h.store));

 h=build({kv:{clients:[C(5,'Dans IDB')]}});await h.sleep(250);
 t('démarrage normal : clients lus depuis IndexedDB',h.T.clients.length===1&&h.T.clients[0].name==='Dans IDB');

 h=build({kv:{clients:[]}});await h.sleep(250);
 t('liste vide volontaire : les clients de démo ne reviennent pas',h.T.clients.length===0);

 h=build();await h.sleep(250);
 t('première installation : clients de démonstration proposés',h.T.clients.length===3);

 h=build({kv:{clients:[C(5,'Dans IDB')]}});await h.sleep(250);
 h.T.clients.push(C(6,'Nouveau'));await h.T.ev('saveClients()');
 t('enregistrement : écrit dans IndexedDB',h.kv.clients.length===2);
 h.ctx.FAIL=1;h.T.clients.push(C(7,'Secours'));await h.T.ev('saveClients()');h.ctx.FAIL=0;
 t('échec IndexedDB : copie de secours dans localStorage (aucune perte)',JSON.parse(h.store.rl_clients).some(c=>c.name==='Secours'));
 const store2=Object.assign({},h.store),kv2=JSON.parse(JSON.stringify(h.kv));
 const h2=build({store:store2,kv:kv2});await h2.sleep(250);
 t('redémarrage : la copie de secours (plus récente) fait foi et est remigrée',h2.T.clients.some(c=>c.name==='Secours')&&h2.kv.clients.some(c=>c.name==='Secours')&&!('rl_clients' in h2.store));

 /* ===== 2. espace de stockage ===== */
 h=build({estimate:{usage:12e6,quota:2e9}});await h.sleep(250);
 h.T.reports.push({id:1,ph:[{d:'A'.repeat(4000),w:1,h:1}],steps:[{ph:[{d:'B'.repeat(4000),w:1,h:1}]}]});
 await h.T.ev('showStorage()');
 t('indicateur d\'espace : "12 Mo utilisés sur 2.0 Go" + nombre de photos',/12 Mo/.test(h.ui.stor.textContent)&&/2\.0 Go/.test(h.ui.stor.textContent)&&/2 photo/.test(h.ui.stor.textContent));
 h=build({estimate:{usage:1.7e9,quota:2e9}});await h.sleep(250);
 t('alerte au démarrage quand le stockage dépasse 80 %',h.toasts.some(x=>/85 %/.test(x)));
 h=build({estimate:{usage:1e6,quota:2e9}});await h.sleep(250);
 t('pas d\'alerte quand il reste de la place',!h.toasts.some(x=>/Stockage utilisé/.test(x)));

 /* ===== 3. sauvegarde sans photos ===== */
 h=build();await h.sleep(250);
 const big='Z'.repeat(50000);
 const mkSteps=(st,ph)=>h.T.STEPS.map((c,i)=>({st:c.i.map(()=>st),obs:'',ph:i===0?ph:[]}));
 h.T.reports.push({id:11,client:C(1,'X'),proc:'P',start:'01/01/2026',end:'01/01/2026',tech:'T',prod:'1',conso:'1',steps:mkSteps('ok',[{d:big,w:10,h:10}]),ph:[]});
 h.T.drafts.push({id:12,client:C(1,'X'),proc:'P',start:'01/01/2026',tech:'T',step:0,prod:'',conso:'',steps:mkSteps('',[{d:big,w:1,h:1}])});
 const full=h.T.snap(false),light=h.T.snap(true);
 t('sauvegarde complète : photos incluses',full.includes(big)&&JSON.parse(full).light===false);
 t('sauvegarde légère : plus aucune photo, données conservées ('+Math.round(full.length/1000)+' Ko -> '+Math.round(light.length/1000)+' Ko)',!light.includes(big)&&light.length<full.length/10&&JSON.parse(light).reports[0].steps[0].st[0]==='ok'&&JSON.parse(light).drafts.length===1&&JSON.parse(light).light===true);
 const before=JSON.stringify(h.T.reports);h.T.snap(true);
 t('la sauvegarde légère ne modifie pas les données en mémoire',JSON.stringify(h.T.reports)===before);
 await h.T.restore(JSON.parse(light));
 t('restauration d\'une sauvegarde légère : le rapport local garde ses photos',h.T.reports.find(r=>r.id===11).steps[0].ph[0].d===big);
 h.T.ev('admin=true');h.ui.anchors.length=0;h.A.bk({dataset:{l:'1'}});const a1=h.ui.anchors.find(a=>a.download);
 t('bouton « Sans photos » : fichier réellement nommé '+(a1&&a1.download),!!a1&&/^Sauvegarde_RL_.*_sans-photos\.json$/.test(a1.download));
 h.ui.anchors.length=0;h.A.bk({dataset:{}});const a2=h.ui.anchors.find(a=>a.download);
 t('bouton « complète » : nom sans suffixe ('+(a2&&a2.download)+')',!!a2&&!/sans-photos/.test(a2.download)&&/\.json$/.test(a2.download));
 h.T.ev('admin=true');h.T.view='adm';h.T.ev('render()');
 t('écran Données : 2 boutons de sauvegarde',/data-l="1"/.test(h.ui.app)&&/Sauvegarde complète/.test(h.ui.app));
 h.T.ev("admTab='g'");h.T.ev('render()');
 t('onglet Diagnostic séparé : espace utilisé, journal, partage',/id="stor"/.test(h.ui.app)&&/Journal des erreurs/.test(h.ui.app)&&/Partage de fichiers/.test(h.ui.app)&&!/data-a="cedit"/.test(h.ui.app));
 h.T.ev("admTab='c'");h.T.ev('render()');
 t("l'onglet Clients & données ne contient plus le diagnostic",!/id="stor"/.test(h.ui.app)&&/data-a="cedit"/.test(h.ui.app));

 /* ===== 4. mot de passe ===== */
 h=build();await h.sleep(250);
 t('mot de passe par défaut (admin123) accepté',await h.T.ev("pwCheck('admin123')")===true&&await h.T.ev("pwCheck('autre')")===false);
 const mk=await h.T.ev("pwMake('Sésame-42')");
 t('nouveau mot de passe : PBKDF2 + sel + 150 000 itérations, pas de mot de passe en clair',mk.v===2&&mk.s.length===32&&mk.i===150000&&mk.h.length===64&&!JSON.stringify(mk).includes('Sésame'));
 const mk2=await h.T.ev("pwMake('Sésame-42')");
 t('deux hash du même mot de passe sont différents (sel)',mk.h!==mk2.h&&mk.s!==mk2.s);
 h.store.rl_pw=JSON.stringify(mk);
 t('vérification : bon mot de passe accepté / mauvais refusé',await h.T.ev("pwCheck('Sésame-42')")===true&&await h.T.ev("pwCheck('sésame-42')")===false);
 const legacy=await h.T.ev("hash('ancien1')");h.store.rl_pw=JSON.stringify(legacy);
 t('ancien mot de passe (hash v19) toujours accepté',await h.T.ev("pwCheck('ancien1')")===true);
 t('… et migré automatiquement vers PBKDF2 à la première connexion',JSON.parse(h.store.rl_pw).v===2&&await h.T.ev("pwCheck('ancien1')")===true);
 h.T.ev('admin=true');h.ui.inputs.pwn='abcd1';await h.A.pwsave();
 t('changement de mot de passe : enregistré en PBKDF2',JSON.parse(h.store.rl_pw).v===2&&await h.T.ev("pwCheck('abcd1')")===true);
 h.ui.inputs.pwn='ab';h.toasts.length=0;await h.A.pwsave();t('mot de passe trop court refusé',h.toasts.includes('Trop court'));
 h.ui.inputs.pwi='abcd1';h.T.ev('admin=false');await h.A.login();
 t('connexion réussie => mode administrateur',h.T.ev('admin')===true);
 h.T.ev('admin=false');h.ui.inputs.pwi='faux';
 for(let i=0;i<5;i++)await h.A.login();
 h.ui.inputs.pwi='abcd1';h.toasts.length=0;await h.A.login();
 t('5 échecs => blocage 30 s (même le bon mot de passe est refusé)',h.T.ev('admin')===false&&h.toasts.some(x=>/patientez/.test(x)));
 const n=build({noCrypto:true});await n.sleep(250);
 t('sans WebCrypto : repli sur l\'ancien hash (jamais de blocage)',typeof await n.T.ev("pwMake('abcd')")==='string');
 n.store.rl_pw=JSON.stringify(mk);n.ui.inputs.pwi='Sésame-42';n.toasts.length=0;await n.A.login();
 t('sans WebCrypto + mot de passe PBKDF2 : message clair, pas de plantage',n.toasts.some(x=>/impossible/.test(x)));
 console.log(`\n${ok} OK / ${ko} KO`);process.exit(ko?1:0);
})();
