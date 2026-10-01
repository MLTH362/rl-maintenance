/* Configuration EmailJS réelle (js/config.js tel que livré) + format de la requête + réactions aux refus. */
const {build}=require('./harness');
(async()=>{
 let ok=0,ko=0;const t=(n,c)=>{console.log((c?'✅':'❌')+' '+n);c?ok++:ko++};
 const calls=[];let reply={ok:true,status:200,text:async()=>'OK'};
 const fetch=async(u,o)=>{calls.push({u,o,b:JSON.parse(o.body)});if(reply.throw)throw new Error('réseau');return reply};
 const fresh=async(withIds=false,real=false)=>{calls.length=0;const h=build({fetch,realConfig:real,store:{rl_rmails:JSON.stringify(['chef@exemple.fr'])}});await h.sleep(250);
  if(!real)h.T.ev("Object.assign(RESET,{service:'service_5s8ui9i'})"); /* simulation : seul le service est renseigné */
  if(withIds)h.T.ev("Object.assign(RESET,{template:'template_test',key:'pk_test'})");return h};
 const forgot=async(h,e)=>{h.store.rl_rslog='[]';h.ui.inputs.rfe=e;h.toasts.length=0;h.ui.logs.length=0;await h.A.rfsend()};

 /* --- configuration livrée (js/config.js tel quel) --- */
 let h=await fresh(false,true);
 t('config.js : Service ID = service_5s8ui9i',h.T.ev('RESET.service')==='service_5s8ui9i');
 t('config.js : Template ID renseigné (template_…)',/^template_[A-Za-z0-9]{5,}$/.test(h.T.ev('RESET.template')));
 t('config.js : Public Key renseignée, forme d\'une clé publique EmailJS (ni vide, ni espace, ni guillemet)',/^[A-Za-z0-9_-]{10,40}$/.test(h.T.ev('RESET.key')));
 t('config.js : les trois réglages présents => fonction ACTIVÉE (rsOn = true)',h.T.ev('rsOn()')===true&&h.T.ev('rsMissing().length')===0);
 h.A.forgot();
 t('« Mot de passe oublié ? » propose la saisie de l\'adresse (plus de « pas encore activé »)',!/pas encore activée/.test(h.ui.modal)&&/id="rfe"/.test(h.ui.modal));
 t('réglages de sécurité inchangés (10 min, 60 s, 6/h, 5 essais)',h.T.ev('[RESET.ttl,RESET.cool,RESET.maxSend,RESET.maxTry].join()')==='10,60,6,5');
 await forgot(h,'chef@exemple.fr');
 t('avec la vraie config : la requête part vers EmailJS avec service_id, template_id et user_id de config.js',calls.length===1&&calls[0].b.service_id===h.T.ev('RESET.service')&&calls[0].b.template_id===h.T.ev('RESET.template')&&calls[0].b.user_id===h.T.ev('RESET.key'));
 t('la clé envoyée comme user_id est bien celle de config.js (pas une autre valeur)',calls[0].b.user_id.length>=10&&calls[0].b.user_id!=='pk_test');

 /* --- simulation d'une config incomplète (neutralisée) --- */
 h=await fresh();
 t('simulation : template et key vides => fonction désactivée (rsOn = false)',h.T.ev('rsOn()')===false);
 h.A.forgot();
 t('… « Mot de passe oublié ? » explique clairement que ce n\'est pas activé',/pas encore activée/.test(h.ui.modal));
 await forgot(h,'chef@exemple.fr');
 t('… aucune requête n\'est envoyée tant que template/key sont vides',calls.length===0);

 /* --- diagnostic : quel réglage manque --- */
 t('écran « Mot de passe oublié » : liste précisément les réglages vides (template, key)',/Réglage\(s\) vide\(s\)[^<]*<b>template, key<\/b>/.test(h.ui.modal));
 t('… et explique quoi faire si on vient de les renseigner (cache / APK)',/fermez complètement/.test(h.ui.modal)&&/réinstallez l'APK/.test(h.ui.modal));
 h.T.ev("Object.assign(RESET,{template:'template_test'})");h.A.forgot();
 t('template renseigné seul : il ne reste que « key »',/<b>key<\/b>/.test(h.ui.modal)&&!/<b>template/.test(h.ui.modal));
 h.T.ev("Object.assign(RESET,{key:'pk_test'})");h.A.forgot();
 t('les trois renseignés : plus aucun message « non activé » (formulaire d\'adresse affiché)',!/pas encore activée/.test(h.ui.modal)&&/rfe/.test(h.ui.modal));
 h=await fresh();h.T.ev('curId=null');h.toasts.length=0;h.ui.inputs.rme='chef2@exemple.fr';h.T.ev('admin=true');await h.A.rmsend();
 t('ajout d\'adresse (admin) sans config : le message dit ce qui manque',h.toasts.some(x=>/template, key/.test(x)));
 /* --- format de la requête (doc EmailJS : /api/v1.0/email/send) --- */
 h=await fresh(true);
 t('template + key renseignés => fonction activée',h.T.ev('rsOn()')===true);
 await forgot(h,'chef@exemple.fr');
 const c=calls[0];
 t('une seule requête POST vers api.emailjs.com/api/v1.0/email/send',calls.length===1&&c.u==='https://api.emailjs.com/api/v1.0/email/send'&&c.o.method==='POST');
 t('corps JSON (Content-Type: application/json)',c.o.headers['Content-Type']==='application/json');
 t('champs exigés par EmailJS : service_id, template_id, user_id, template_params (et rien d\'autre)',Object.keys(c.b).sort().join()==='service_id,template_id,template_params,user_id');
 t('service_id = service_5s8ui9i ; template_id et user_id = ceux de la config',c.b.service_id==='service_5s8ui9i'&&c.b.template_id==='template_test'&&c.b.user_id==='pk_test');
 t('variables du modèle : to_email, code, passcode, minutes, time, app (exactement)',Object.keys(c.b.template_params).sort().join()==='app,code,minutes,passcode,time,to_email'&&c.b.template_params.passcode===c.b.template_params.code&&/^\d\d:\d\d$/.test(c.b.template_params.time));
 t('to_email = l\'adresse enregistrée ; code à 8 chiffres ; minutes = 10',c.b.template_params.to_email==='chef@exemple.fr'&&/^\d{8}$/.test(c.b.template_params.code)&&c.b.template_params.minutes===10);
 t('le code n\'apparaît ni dans les messages ni dans la console',!h.toasts.concat(h.ui.logs).some(x=>x.includes(c.b.template_params.code)));
 t('le code n\'est pas stocké en clair',!JSON.stringify(h.store).includes(c.b.template_params.code));
 await forgot(h,'inconnu@exemple.fr');
 t('adresse inconnue : AUCUNE requête envoyée (pas de mail à un inconnu)',calls.length===1);

 /* --- refus d'EmailJS --- */
 h=await fresh(true);reply={ok:false,status:403,text:async()=>'API calls are disabled for non-browser applications'};
 await forgot(h,'chef@exemple.fr');
 t('403 : message clair qui indique le réglage « non-navigateur » à activer',h.toasts.some(x=>/403/.test(x)&&/non-navigateur/.test(x)));
 t('403 : statut et réponse d\'EmailJS écrits dans la console (diagnostic)',h.ui.logs.some(x=>/refusé/.test(x)&&/403/.test(x)&&/non-browser/.test(x)));
 t('403 : aucun code en attente (pas d\'état bloqué)',!('rl_reset' in h.store));
 t('403 : le code n\'a fuité ni dans les messages ni dans la console',!h.toasts.concat(h.ui.logs).some(x=>/\d{8}/.test(x)));
 h=await fresh(true);reply={ok:false,status:400,text:async()=>'The user_id parameter is required'};
 await forgot(h,'chef@exemple.fr');
 t('400 : message qui oriente vers Service ID / Template ID / Public Key',h.toasts.some(x=>/Service ID/.test(x)&&/Public Key/.test(x)));
 h=await fresh(true);reply={ok:false,status:500};
 await forgot(h,'chef@exemple.fr');
 t('500 (réponse sans texte) : message générique, pas de plantage',h.toasts.some(x=>/Envoi impossible/.test(x))&&!('rl_reset' in h.store));
 h=await fresh(true);reply={throw:true};
 await forgot(h,'chef@exemple.fr');
 t('coupure réseau : message générique, pas de plantage',h.toasts.some(x=>/Envoi impossible/.test(x))&&!('rl_reset' in h.store));
 h=await fresh(true);reply={ok:true,status:200,text:async()=>'OK'};
 await forgot(h,'chef@exemple.fr');
 t('envoi réussi : le formulaire de saisie du code s\'affiche',/Code reçu par e-mail/.test(h.ui.modal));
 console.log(`\n${ok} OK / ${ko} KO`);process.exit(ko?1:0);
})();
