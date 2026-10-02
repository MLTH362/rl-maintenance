/* Création du mot de passe à la première entrée en mode administrateur (plus de mot de passe par défaut). */
const {build}=require('./harness.js');
(async()=>{let ok=0,ko=0;const t=(n,c)=>{c?ok++:ko++;console.log((c?'✅ ':'❌ ')+n)};
 let h=build();await h.sleep(250);
 h.A.admin();t('première fois : écran « Créez votre mot de passe » (pas de saisie admin123)',/Créez votre mot de passe/.test(h.ui.modal)&&/id="pwf1"/.test(h.ui.modal)&&!/data-a="forgot"/.test(h.ui.modal));
 h.ui.inputs.pwf1='abc';h.ui.inputs.pwf2='abc';h.toasts.length=0;await h.A.pwfirst();t('trop court refusé',h.toasts.some(x=>/Trop court/.test(x))&&!h.store.rl_pw&&h.T.ev('admin')===false);
 h.ui.inputs.pwf1='Mon-mdp-1';h.ui.inputs.pwf2='autre';h.toasts.length=0;await h.A.pwfirst();t('confirmation différente refusée',h.toasts.some(x=>/différents/.test(x))&&!h.store.rl_pw);
 h.ui.inputs.pwf2='Mon-mdp-1';await h.A.pwfirst();t('création : mot de passe enregistré (PBKDF2, pas en clair) et admin activé',h.T.ev('admin')===true&&JSON.parse(h.store.rl_pw).v===2&&!h.store.rl_pw.includes('Mon-mdp-1'));
 h.A.admin();h.A.admin();t('quitter puis revenir : écran de connexion classique avec « Mot de passe oublié ? »',/Accès administrateur/.test(h.ui.modal)&&/data-a="forgot"/.test(h.ui.modal));
 h.ui.inputs.pwi='admin123';await h.A.login();t('admin123 ne marche pas',h.T.ev('admin')===false);
 h.ui.inputs.pwi='Mon-mdp-1';await h.A.login();t('le mot de passe créé fonctionne',h.T.ev('admin')===true);
 h=build({store:{rl_pw:JSON.stringify('x')}});await h.sleep(250);h.ui.inputs.pwf1='Pirate-99';h.ui.inputs.pwf2='Pirate-99';await h.A.pwfirst();t('impossible d\'écraser un mot de passe existant par cet écran',h.store.rl_pw===JSON.stringify('x'));
 console.log(`\n${ok} OK / ${ko} KO`);process.exit(ko?1:0)})();
