/* Création du mot de passe à la première ouverture (remplace tout ancien mot de passe), une seule fois. */
const {build}=require('./harness.js');
(async()=>{let ok=0,ko=0;const t=(n,c)=>{c?ok++:ko++;console.log((c?'✅ ':'❌ ')+n)};
 let h=build({firstrun:1,store:{rl_pw:JSON.stringify('ancienhash')}});await h.sleep(300);
 t('à l\'ouverture, même avec un ancien mot de passe : écran de création affiché tout seul',/Créez votre mot de passe/.test(h.ui.modal)&&/id="pwf1"/.test(h.ui.modal)&&!/data-a="forgot"/.test(h.ui.modal));
 h.ui.inputs.pwf1='abc';h.ui.inputs.pwf2='abc';h.toasts.length=0;await h.A.pwfirst();t('trop court refusé',h.toasts.some(x=>/Trop court/.test(x))&&!h.store.rl_pwinit&&h.T.ev('admin')===false);
 h.ui.inputs.pwf1='Mon-mdp-1';h.ui.inputs.pwf2='autre';h.toasts.length=0;await h.A.pwfirst();t('confirmation différente refusée',h.toasts.some(x=>/différents/.test(x))&&!h.store.rl_pwinit);
 h.ui.inputs.pwf2='Mon-mdp-1';await h.A.pwfirst();const st=JSON.parse(h.store.rl_pw);
 t('création : ancien mot de passe remplacé (PBKDF2, pas en clair), admin activé, création marquée faite',h.T.ev('admin')===true&&st.v===2&&!h.store.rl_pw.includes('Mon-mdp-1')&&!!h.store.rl_pwinit);
 h.A.admin();h.A.admin();t('ensuite : écran de connexion classique avec « Mot de passe oublié ? »',/Accès administrateur/.test(h.ui.modal)&&/data-a="forgot"/.test(h.ui.modal));
 h.ui.inputs.pwi='Mon-mdp-1';await h.A.login();t('le mot de passe créé fonctionne',h.T.ev('admin')===true);
 h.ui.inputs.pwf1='Pirate-99';h.ui.inputs.pwf2='Pirate-99';const keep=h.store.rl_pw;await h.A.pwfirst();t('l\'écran de création ne peut pas servir une 2e fois',h.store.rl_pw===keep);
 const re=build({store:{...h.store}});await re.sleep(300);t('rechargement de l\'app : plus d\'écran de création',!/Créez votre mot de passe/.test(re.ui.modal));
 const n=build({firstrun:1});await n.sleep(300);t('appareil neuf (aucun mot de passe) : même écran de création',/Créez votre mot de passe/.test(n.ui.modal));
 console.log(`\n${ok} OK / ${ko} KO`);process.exit(ko?1:0)})();
