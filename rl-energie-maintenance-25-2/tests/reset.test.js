/* E-mail de récupération + mot de passe oublié (EmailJS simulé). Vérifie le flux ET les protections. */
const {build}=require('./harness');
(async()=>{
 let ok=0,ko=0;const t=(n,c)=>{console.log((c?'✅':'❌')+' '+n);c?ok++:ko++};
 const mails=[];let fetchOk=true,fetchThrow=false;
 const fetch=async(u,o)=>{if(fetchThrow)throw new Error('réseau');mails.push({u,b:JSON.parse(o.body)});return{ok:fetchOk}};
 const fresh=async(o={})=>{const h=build({fetch,store:o.store});await h.sleep(250);if(o.cfg!==false)h.T.ev("Object.assign(RESET,{service:'svc',template:'tpl',key:'pub'})");return h};
 const last=()=>mails[mails.length-1].b.template_params;
 const reset=h=>{h.store.rl_rslog='[]'};
 /* enregistre une adresse de récupération en passant par le vrai parcours admin */
 const setMail=async(h,e)=>{h.T.ev('admin=true');reset(h);h.ui.inputs.rme=e;await h.A.rmsend();h.ui.inputs.rmc=last().code;await h.A.rmok();h.T.ev('admin=false')};
 const inp=(h,c,p,p2)=>{h.ui.inputs.rsc=c;h.ui.inputs.rsn=p;h.ui.inputs.rsn2=p2===undefined?p:p2};

 /* ===== non configuré ===== */
 let h=await fresh({cfg:false,store:{rl_pw:JSON.stringify('x')}});
 t('connexion : lien « Mot de passe oublié ? »',(h.A.admin(),/data-a="forgot"/.test(h.ui.modal)));
 h.A.forgot();t('service non configuré : message explicatif',/pas encore activée/.test(h.ui.modal));
 h.T.ev('admin=true');h.ui.inputs.rme='a@b.fr';await h.A.rmsend();t('service non configuré : rien n\'est envoyé',mails.length===0);

 /* ===== adresse de récupération : réservée à l'admin, vérifiée ===== */
 h=await fresh();
 h.T.ev('admin=false');h.toasts.length=0;h.A.rmail();t('un utilisateur ne peut pas ouvrir le réglage',!/id="rme"/.test(h.ui.modal)&&h.toasts.some(x=>/réservée/.test(x)));
 h.ui.inputs.rme='pirate@mail.fr';await h.A.rmsend();t('… ni demander de code pour une adresse',mails.length===0);
 h.T.ev('admin=true');h.A.rmail();t('admin : écran « E-mail de récupération »',/id="rme"/.test(h.ui.modal));
 for(const bad of ['','abc','a@b','a b@c.fr','a@b.c','<x>@y.fr','a@@b.fr']){h.ui.inputs.rme=bad;h.toasts.length=0;await h.A.rmsend();if(!h.toasts.some(x=>/invalide/.test(x)))t('adresse invalide refusée : '+bad,false)}
 t('adresses invalides refusées, rien envoyé',mails.length===0);
 h.ui.inputs.rme='  Responsable@Exemple.FR ';await h.A.rmsend();
 t('code de vérification envoyé à la NOUVELLE adresse (normalisée)',mails.length===1&&last().to_email==='responsable@exemple.fr'&&/^\d{8}$/.test(last().code));
 t('envoi via l\'API EmailJS (POST) avec les identifiants',mails[0].u==='https://api.emailjs.com/api/v1.0/email/send'&&mails[0].b.service_id==='svc'&&mails[0].b.template_id==='tpl'&&mails[0].b.user_id==='pub');
 t('adresse PAS encore enregistrée tant que le code n\'est pas validé',!('rl_rmails' in h.store));
 h.ui.inputs.rmc='00000000';h.toasts.length=0;await h.A.rmok();
 t('mauvais code : adresse non enregistrée',!('rl_rmails' in h.store)&&h.toasts.some(x=>/incorrect/.test(x)));
 h.ui.inputs.rmc=last().code;await h.A.rmok();
 t('bon code : adresse enregistrée',JSON.parse(h.store.rl_rmails).join()==='responsable@exemple.fr'&&!('rl_reset' in h.store));
 t('un code « e-mail » ne peut pas servir à réinitialiser le mot de passe',await(async()=>{reset(h);h.ui.inputs.rme='autre@exemple.fr';await h.A.rmsend();const c=last().code;h.T.ev('admin=false');inp(h,c,'Piratage-99');await h.A.rsok();return !h.store.rl_pw})());
 h.T.ev('admin=true');h.A.rmail();t('l\'adresse actuelle est affichée et modifiable',/responsable@exemple\.fr/.test(h.ui.modal));
 t('bouton « E-mail de récupération » dans Gestion',(h.T.ev("view='adm'"),h.T.ev("admTab='r'"),h.T.ev('render()'),/data-a="rmail"/.test(h.ui.app)));

 /* ===== mot de passe oublié ===== */
 h=await fresh();h.A.forgot();
 t('sans adresse enregistrée : explique comment en ajouter une, rien envoyé',/Aucune adresse/.test(h.ui.modal)&&!/data-a="rssend"/.test(h.ui.modal));
 const n0=mails.length;await h.A.rssend();t('… rssend ne peut pas envoyer',mails.length===n0);
 await setMail(h,'chef@exemple.fr');
 h.A.forgot();t('avec adresse : l\'écran demande l\'adresse e-mail et ne révèle pas celle enregistrée',/id="rfe"/.test(h.ui.modal)&&!/chef@|c\*\*\*/.test(h.ui.modal));
 /* ----- mauvaise adresse : rien ne part, mais rien ne se voit ----- */
 reset(h);const n1=mails.length;h.ui.inputs.rfe='pirate@mail.fr';h.toasts.length=0;await h.A.rfsend();
 const toastBad=h.toasts.slice(),modalBad=h.ui.modal.replace(/\s+/g,' ');
 t('MAUVAISE adresse : AUCUN mail envoyé',mails.length===n1);
 t('… et l\'écran de saisie du code s\'affiche quand même (rien ne révèle l\'échec)',/id="rsc"/.test(h.ui.modal)&&toastBad.some(x=>/Si l'adresse est la bonne/.test(x)));
 h.ui.inputs.rsc='12345678';h.ui.inputs.rsn='Piratage-99';h.ui.inputs.rsn2='Piratage-99';h.toasts.length=0;await h.A.rsok();
 t('… un code au hasard donne la même réponse que pour la bonne adresse (« incorrect, 4 essais »)',!h.store.rl_pw&&h.toasts.some(x=>/incorrect \(4/.test(x)));
 h.ui.inputs.rfe='pirate@mail.fr';for(let i=0;i<3;i++){reset(h);await h.A.rfsend()}
 t('… les demandes à la mauvaise adresse comptent dans le plafond horaire',JSON.parse(h.store.rl_rslog).length===1&&mails.length===n1);
 h.ui.inputs.rfe='abc';h.toasts.length=0;await h.A.rfsend();t('format invalide refusé',h.toasts.some(x=>/invalide/.test(x)));
 /* ----- bonne adresse (majuscules/espaces tolérés) ----- */
 reset(h);h.ui.inputs.rfe='  CHEF@Exemple.fr ';await h.A.rfsend();
 t('BONNE adresse : le code part vers l\'adresse enregistrée',mails.length===n1+1&&last().to_email==='chef@exemple.fr'&&/^\d{8}$/.test(last().code));
 t('… le message affiché est identique à celui de la mauvaise adresse',h.toasts.some(x=>x===toastBad[0])&&h.ui.modal.replace(/\s+/g,' ')===modalBad);
 const code=last().code,st=JSON.parse(h.store.rl_reset);
 t('code JAMAIS stocké en clair (PBKDF2 + sel)',!JSON.stringify(h.store).includes(code)&&st.s.length===32&&st.h.length===64&&st.i===150000);
 t('écran de saisie affiché, code absent de l\'interface et des toasts',/id="rsc"/.test(h.ui.modal)&&!h.ui.modal.includes(code)&&!h.toasts.some(x=>x.includes(code)));
 h.toasts.length=0;await h.A.rssend();t('redemande immédiate refusée (60 s)',mails.length===n1+1&&h.toasts.some(x=>/Patientez/.test(x)));
 h.store.rl_rslog=JSON.stringify([200000,190000,180000,170000,160000,150000].map(x=>Date.now()-x));h.toasts.length=0;await h.A.rssend();
 t('plafond : 6 demandes par heure',mails.length===n1+1&&h.toasts.some(x=>/Trop de demandes/.test(x)));
 h.store.rl_rslog=JSON.stringify([Date.now()-4000000]);await h.A.rssend();
 t('une demande de plus d\'1 h ne compte plus ; nouveau code = ancien annulé',mails.length===n1+2&&JSON.parse(h.store.rl_reset).h!==st.h);
 const c1=last().code;
 inp(h,code,'nouveau6');h.toasts.length=0;await h.A.rsok();
 t('ancien code (remplacé) refusé ; essais restants annoncés',!h.store.rl_pw&&h.toasts.some(x=>/incorrect \(4/.test(x)));
 t('compteur d\'essais enregistré (recharger la page ne le remet pas à zéro)',JSON.parse(h.store.rl_reset).t===1);
 inp(h,c1,'court');await h.A.rsok();inp(h,c1,'nouveau6','autre66');await h.A.rsok();inp(h,'123','nouveau6');await h.A.rsok();
 t('mot de passe trop court / différent / code incomplet : aucun essai consommé',JSON.parse(h.store.rl_reset).t===1&&!h.store.rl_pw);
 for(let i=0;i<4;i++){inp(h,'11111111','nouveau6');await h.A.rsok()}
 t('5 mauvais codes : code annulé',!('rl_reset' in h.store));
 h.toasts.length=0;inp(h,c1,'nouveau6');await h.A.rsok();
 t('… même le BON code ne marche plus ensuite',!h.store.rl_pw&&h.toasts.some(x=>/expiré ou absent/.test(x)));
 reset(h);await h.A.rssend();const c2=last().code;
 const r=JSON.parse(h.store.rl_reset);r.exp=Date.now()-1;h.store.rl_reset=JSON.stringify(r);
 h.toasts.length=0;inp(h,c2,'nouveau6');await h.A.rsok();t('code expiré (10 min) refusé',!h.store.rl_pw&&h.toasts.some(x=>/expiré/.test(x)));
 reset(h);await h.A.rssend();const c3=last().code;
 h.T.ev('pwFail=3;pwLock=Date.now()+99999');inp(h,c3,'Nouveau-mdp9');h.toasts.length=0;await h.A.rsok();
 t('bon code : mot de passe remplacé (PBKDF2), admin123 ne marche plus',JSON.parse(h.store.rl_pw).v===2&&await h.T.ev("pwCheck('Nouveau-mdp9')")===true&&await h.T.ev("pwCheck('admin123')")===false);
 t('code à usage unique ; blocage levé ; retour à la connexion',!('rl_reset' in h.store)&&h.T.ev('pwLock')===0&&/id="pwi"/.test(h.ui.modal)&&h.toasts.some(x=>/réinitialisé/.test(x)));
 const old=h.store.rl_pw;inp(h,c3,'Autre-mdp99');await h.A.rsok();t('rejouer le même code est impossible',h.store.rl_pw===old);
 t('ni code ni état de récupération dans les sauvegardes JSON',!h.T.snap().includes('rl_reset')&&!h.T.snap().includes(old));

 /* ===== rappel après connexion ===== */
 h=await fresh();h.toasts.length=0;h.ui.inputs.pwi='admin123';await h.A.login();await h.sleep(1700);
 t('connexion admin sans adresse enregistrée : rappel affiché',h.T.ev('admin')===true&&h.toasts.some(x=>/adresse e-mail de récupération/.test(x)));
 h=await fresh({store:{rl_rmail:JSON.stringify('chef@exemple.fr')}});h.toasts.length=0;h.ui.inputs.pwi='admin123';await h.A.login();await h.sleep(1700);
 t('avec adresse enregistrée : aucun rappel',h.T.ev('admin')===true&&!h.toasts.some(x=>/adresse e-mail de récupération/.test(x)));

 /* ===== pannes ===== */
 h=await fresh();await setMail(h,'chef@exemple.fr');
 h.ui.inputs.rfe='chef@exemple.fr';fetchOk=false;reset(h);h.toasts.length=0;await h.A.rfsend();
 t('envoi refusé : aucun code conservé, message clair',!('rl_reset' in h.store)&&h.toasts.some(x=>/Envoi impossible/.test(x)));
 fetchOk=true;fetchThrow=true;reset(h);h.toasts.length=0;await h.A.rssend();
 t('réseau coupé : pas de plantage, aucun code conservé',!('rl_reset' in h.store)&&h.toasts.some(x=>/Envoi impossible/.test(x)));
 fetchThrow=false;t('un envoi raté compte dans le plafond horaire',JSON.parse(h.store.rl_rslog).length===1);
 const n=build({noCrypto:1,fetch,store:{rl_rmail:JSON.stringify('chef@exemple.fr')}});await n.sleep(250);n.T.ev("Object.assign(RESET,{service:'s',template:'t',key:'k'})");
 n.ui.inputs.rfe='chef@exemple.fr';const nb=mails.length;n.toasts.length=0;await n.A.rfsend();t('sans WebCrypto : refus propre, rien envoyé',mails.length===nb&&n.toasts.some(x=>/indisponible/.test(x)));
 console.log(`\n${ok} OK / ${ko} KO`);process.exit(ko?1:0);
})();
