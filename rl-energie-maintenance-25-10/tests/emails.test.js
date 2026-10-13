/* Plusieurs adresses de récupération + messages (toasts) qui ne s'empilent plus. */
const {build}=require('./harness');
(async()=>{
 let ok=0,ko=0;const t=(n,c)=>{console.log((c?'✅':'❌')+' '+n);c?ok++:ko++};
 const mails=[];const fetch=async(u,o)=>{mails.push(JSON.parse(o.body).template_params);return{ok:true}};
 const fresh=async(store)=>{const h=build({fetch,store});await h.sleep(250);h.T.ev("Object.assign(RESET,{service:'svc',template:'tpl',key:'pub'})");return h};
 const last=()=>mails[mails.length-1];const reset=h=>{h.store.rl_rslog='[]'};
 const add=async(h,e)=>{h.T.ev('admin=true');reset(h);h.ui.inputs.rme=e;await h.A.rmsend();h.ui.inputs.rmc=last().code;await h.A.rmok()};
 const list=h=>JSON.parse(h.store.rl_rmails||'[]');
 const forgot=async(h,e)=>{reset(h);h.ui.inputs.rfe=e;await h.A.rfsend()};

 /* ===== plusieurs adresses ===== */
 let h=await fresh();
 await add(h,'chef@exemple.fr');await add(h,'adjoint@exemple.fr');
 t('deux adresses enregistrées (chacune vérifiée par un code)',list(h).join()==='chef@exemple.fr,adjoint@exemple.fr');
 t('l\'écran les liste avec un bouton « Retirer » chacune',/chef@exemple\.fr/.test(h.ui.modal)&&/adjoint@exemple\.fr/.test(h.ui.modal)&&(h.ui.modal.match(/data-a="rmdel"/g)||[]).length===2);
 const nb=mails.length;h.toasts.length=0;h.ui.inputs.rme='chef@exemple.fr';await h.A.rmsend();
 t('doublon refusé, aucun mail envoyé',mails.length===nb&&h.toasts.some(x=>/déjà enregistrée/.test(x))&&list(h).length===2);
 h.T.ev('admin=false');
 let n0=mails.length;await forgot(h,'adjoint@exemple.fr');
 t('mot de passe oublié avec l\'adresse n° 2 : le code part À CETTE adresse seulement',mails.length===n0+1&&last().to_email==='adjoint@exemple.fr');
 n0=mails.length;await forgot(h,'chef@exemple.fr');
 t('… avec l\'adresse n° 1 : part à la n° 1 seulement',mails.length===n0+1&&last().to_email==='chef@exemple.fr');
 n0=mails.length;await forgot(h,'inconnu@exemple.fr');
 t('… avec une adresse inconnue : rien ne part',mails.length===n0);
 /* retrait */
 h.toasts.length=0;h.A.rmdel({dataset:{i:'0'}});
 t('un utilisateur ne peut pas retirer une adresse',list(h).length===2&&h.toasts.some(x=>/réservée/.test(x)));
 h.T.ev('admin=true');h.A.rmdel({dataset:{i:'0'}});
 t('admin : confirmation demandée avant de retirer',/Confirmation/.test(h.ui.modal)&&/chef@exemple\.fr/.test(h.ui.modal)&&list(h).length===2);
 h.A.yes();
 t('adresse retirée ; l\'écran se met à jour',list(h).join()==='adjoint@exemple.fr'&&!/chef@exemple/.test(h.ui.modal));
 h.T.ev('admin=false');n0=mails.length;await forgot(h,'chef@exemple.fr');
 t('l\'adresse retirée ne reçoit plus rien',mails.length===n0);
 n0=mails.length;await forgot(h,'adjoint@exemple.fr');t('l\'autre fonctionne toujours',mails.length===n0+1&&last().to_email==='adjoint@exemple.fr');
 h.T.ev('admin=true');h.A.rmdel({dataset:{i:'0'}});
 t('retirer la dernière : avertissement clair',/dernière/.test(h.ui.modal));h.A.yes();
 h.T.ev('admin=false');h.A.forgot();t('plus aucune adresse : « Mot de passe oublié » l\'explique',/Aucune adresse/.test(h.ui.modal)&&list(h).length===0);
 /* maximum */
 h=await fresh();for(const e of['a','b','c','d','e'])await add(h,e+'@exemple.fr');
 t('5 adresses acceptées',list(h).length===5);
 h.T.ev('admin=true');h.A.rmail();t('à 5 : plus de champ d\'ajout',!/id="rme"/.test(h.ui.modal));
 n0=mails.length;h.ui.inputs.rme='f@exemple.fr';reset(h);h.toasts.length=0;await h.A.rmsend();
 t('6e adresse refusée, rien envoyé',mails.length===n0&&h.toasts.some(x=>/maximum/.test(x))&&list(h).length===5);
 /* ancien réglage à une seule adresse */
 h=await fresh({rl_rmail:JSON.stringify('ancien@exemple.fr')});
 n0=mails.length;await forgot(h,'ancien@exemple.fr');
 t('ancien réglage (une adresse) repris automatiquement',mails.length===n0+1&&last().to_email==='ancien@exemple.fr');
 await add(h,'nouveau@exemple.fr');
 t('… puis migré dans la liste (l\'ancienne clé disparaît)',list(h).join()==='ancien@exemple.fr,nouveau@exemple.fr'&&!('rl_rmail' in h.store));

 /* ===== messages : jamais empilés ===== */
 h=await fresh();
 h.T.ev("for(let i=0;i<20000;i++)toast('Renseignez chaque point de contrôle','err')");
 t('20 000 clics sur le même message d\'erreur : UN seul message à l\'écran',h.toasts.length===1&&h.T.ev('_toasts.size')===1);
 h.T.ev("toast('Autre erreur','err');toast('Encore une','err');toast('Et une 4e','err')");
 t('jamais plus de 3 messages différents en même temps',h.T.ev('_toasts.size')===3);
 const before=h.toasts.length;h.T.ev("toast('Et une 4e','err');toast('Et une 4e','err')");
 t('répéter le dernier message ne l\'ajoute pas',h.toasts.length===before);
 h.toasts.length=0;h.T.ev("toast('Enregistré');toast('Enregistré','err')");
 t('même texte mais type différent (ok / erreur) : deux messages distincts',h.toasts.length===2);
 /* cas réel : un utilisateur sans droit spamme une action refusée */
 h=await fresh();h.T.ev('admin=false');h.toasts.length=0;
 for(let i=0;i<50;i++)h.A.cdel({dataset:{id:'101'}});
 t('50 clics sur une action refusée : UN seul message',h.toasts.length===1&&/réservée/.test(h.toasts[0]));
 /* le message finit par disparaître, puis peut revenir */
 h=await fresh();h.T.ev("toast('Temporaire','err')");await h.sleep(3700);
 t('après 3,5 s le message disparaît de la liste',h.T.ev('_toasts.size')===0);
 h.T.ev("toast('Temporaire','err')");t('… et peut de nouveau s\'afficher',h.toasts.length===2&&h.T.ev('_toasts.size')===1);
 /* ===== blocage après 5 mauvais mots de passe : survit au rechargement ===== */
 h=await fresh();h.T.ev('admin=false');h.ui.inputs.pwi='faux';for(let i=0;i<5;i++)await h.A.login();
 const re=build({fetch,store:{...h.store}});await re.sleep(250);re.ui.inputs.pwi='admin123';re.toasts.length=0;await re.A.login();
 t('5 échecs puis rechargement de la page : toujours bloqué (même avec le bon mot de passe)',re.T.ev('admin')===false&&re.toasts.some(x=>/patientez/i.test(x)));
 h=await fresh();h.ui.inputs.pwi='faux';for(let i=0;i<3;i++)await h.A.login();
 const r2=build({fetch,store:{...h.store}});await r2.sleep(250);r2.ui.inputs.pwi='faux';await r2.A.login();await r2.A.login();r2.toasts.length=0;await r2.A.login();
 t('3 échecs + rechargement : le compteur continue (blocage au 5e échec au total)',r2.T.ev('pwLock')>Date.now());
 h=await fresh();h.ui.inputs.pwi='faux';for(let i=0;i<4;i++)await h.A.login();h.ui.inputs.pwi='admin123';await h.A.login();
 t('une connexion réussie remet le compteur à zéro',h.T.ev('admin')===true&&JSON.parse(h.store.rl_pwf).f===0);
 console.log(`\n${ok} OK / ${ko} KO`);process.exit(ko?1:0);
})();
