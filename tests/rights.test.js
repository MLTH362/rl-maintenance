/* Droits utilisateur / administrateur (v22) : réglages, application réelle des droits, page Droits & accès. */
const {build}=require('./harness');
(async()=>{
 const h0=build();await h0.sleep(250);
 let h=h0;let ok=0,ko=0;const t=(n,c)=>{console.log((c?'✅':'❌')+' '+n);c?ok++:ko++},ev=c=>h.T.ev(c);let as=a=>ev('admin='+a);const html=()=>{h.T.ev('render()');return h.ui.app};
 const ck=b=>h.toasts.some(x=>/droit insuffisant/.test(x)),clr=()=>h.toasts.length=0;

 /* ===== 1. réglages d'origine ===== */
 as(false);
 t('origine : l\'utilisateur peut planifier, reprogrammer et exporter',ev("perm('plan_add')&&perm('plan_edit')&&perm('rep_exp')"));
 t('origine : l\'utilisateur ne peut ni modifier/supprimer un rapport, ni toucher clients, procédures, documents, données',!ev("['rep_edit','rep_del','cli_edit','cli_del','proc_edit','doc_edit','backup','co_edit','diag','plan_del'].some(perm)"));
 t('origine : pas de bouton Gestion pour l\'utilisateur',!/data-a="toadm"/.test(html())&&ev('mgmt()')===false);
 as(true);
 t('l\'administrateur a tous les droits, même tout coupé',(ev("ls.set('rl_rights',RPRE.min())"),ev("RKEYS.every(perm)")));
 t('admin : bouton Gestion visible',/data-a="toadm"/.test(html()));

 /* ===== 2. ancien réglage v21 « administrateur seulement » repris ===== */
 h=build({store:{rl_pp:JSON.stringify('admin')}});await h.sleep(250);
 t('migration v21 : « admin seulement » => l\'utilisateur ne peut plus planifier ni reprogrammer',!h.T.ev("perm('plan_add')")&&!h.T.ev("perm('plan_edit')"));

 /* ===== 3. actions bloquées côté code (pas seulement boutons cachés) ===== */
 h=build();await h.sleep(250);as=a=>h.T.ev('admin='+a);
 as(false);
 const n0=h.T.clients.length;
 for(const k of ['cedit','csave','cdel','cmerge','cmergego','delrep','redit','bk','cosave','pedit','psave','pdup','pdel','sadd','sdel','smv','dedit','dsave','ddel','pldel','pw','pwsave','rpre']){
   clr();h.T.ev('pe=null');const r=h.A[k]({dataset:{id:'1',p:'all',l:'',k:'0',d:'1'}});await Promise.resolve(r);
   t('utilisateur : action « '+k+' » refusée',ck());
 }
 t('… et rien n\'a changé (clients, droits)',h.T.clients.length===n0&&h.store.rl_rights===undefined);
 as(true);h.A.rpre({dataset:{p:'min'}});as(false);h.T.ev("ls.set('rl_rights',{...RPRE.min(),rep_exp:0})");clr();h.T.reports.push({id:9,client:{id:1,name:'X'},start:'01/01/2026',steps:[]});await Promise.resolve(h.A.exp({dataset:{id:'9',f:'pdf'}}));
 t('utilisateur sans droit d\'export : action « exp » refusée',ck());h.store.rl_rights=undefined;delete h.store.rl_rights;h.T.reports.pop();
 clr();h.A.pledit({dataset:{id:''}});t('utilisateur (droit d\'origine) : peut ouvrir « Planifier »',!ck()&&/Planifier une intervention/.test(h.ui.modal));
 h.ui.modal='';

 /* ===== 4. l'admin règle les droits ===== */
 as(true);
 h.T.ev("view='adm';admTab='r'");
 t('page « Droits & accès » : onglet + interrupteurs pour chaque droit',/Droits &amp; accès|Droits & accès/.test(html())&&(h.ui.app.match(/data-ch="rt"/g)||[]).length===h.T.ev('RKEYS.length')&&/data-a="rpre" data-p="min"/.test(h.ui.app));
 const chg=(k,c)=>document_change(k,c);
 function document_change(k,c){const f=h.L.change[h.L.change.length-1];return f({target:{dataset:{ch:'rt',k},checked:c}})}
 await chg('cli_edit',true);
 t('interrupteur : le droit est enregistré (localStorage)',JSON.parse(h.store.rl_rights).cli_edit===1);
 await chg('cli_edit',false);t('… et se retire',JSON.parse(h.store.rl_rights).cli_edit===0);
 await chg('n_importe_quoi',true);t('clé inconnue ignorée',!('n_importe_quoi' in JSON.parse(h.store.rl_rights)));
 await chg('cli_edit',true);await chg('proc_edit',true);
 as(false);h.T.ev("view='home'");
 t('utilisateur avec droits de gestion : le bouton Gestion apparaît',/data-a="toadm"/.test(html()));
 h.T.ev("view='adm';admTab='c'");html();
 t('… il voit les clients, mais pas la suppression, ni la page Droits, ni le mot de passe',/data-a="cedit"/.test(h.ui.app)&&!/data-a="cdel"/.test(h.ui.app)&&!/data-a="cmerge"/.test(h.ui.app)&&!/data-a="pw"/.test(h.ui.app)&&!/data-t="r"/.test(h.ui.app));
 t('… onglet Procédures présent, Documents absent',/data-t="p"/.test(h.ui.app)&&!/data-t="d"/.test(h.ui.app));
 h.T.ev("admTab='r'");html();
 t('… forcer l\'onglet Droits : l\'écran retombe sur un onglet autorisé',!/data-ch="rt"/.test(h.ui.app)&&h.T.ev('admTab')!=='r');
 clr();await chg('backup',true);
 t('un utilisateur ne peut PAS s\'accorder un droit (interrupteur ignoré)',JSON.parse(h.store.rl_rights).backup!==1);
 clr();h.A.cedit({dataset:{id:''}});t('droit accordé : « Nouveau client » s\'ouvre',!ck()&&/Nouveau client/.test(h.ui.modal));h.ui.modal='';
 clr();h.A.cdel({dataset:{id:'101'}});t('droit non accordé : suppression client refusée',ck());

 /* ===== 5. Gestion disparaît si les droits sont retirés ===== */
 as(true);h.A.rpre({dataset:{p:'min'}});as(false);h.T.ev("view='adm'");
 t('droits retirés pendant que l\'utilisateur est dans Gestion : retour à l\'accueil',(html(),h.T.view==='home'));
 as(true);h.A.rpre({dataset:{p:'std'}});
 t('préréglage Standard = réglages d\'origine',JSON.stringify(JSON.parse(h.store.rl_rights))===JSON.stringify(h.T.ev('RSTD()')));
 h.A.rpre({dataset:{p:'all'}});as(false);
 t('préréglage « Tout autoriser » : l\'utilisateur peut tout sauf le réservé admin',h.T.ev("RKEYS.every(perm)"));
 clr();h.A.rpre({dataset:{p:'min'}});t('… mais ne peut pas changer les droits lui-même',ck());

 /* ===== 6. rapports / planning : boutons selon droits ===== */
 as(true);h.A.rpre({dataset:{p:'min'}});
 const st=h.T.STEPS.map(c=>({st:c.i.map(()=>'ok'),obs:'',ph:[]}));
 h.T.reports.push({id:7,client:{id:101,name:'Client A'},proc:'P',start:'01/01/2026',end:'01/01/2026',tech:'T',prod:'1',conso:'1',steps:st,ph:[]});
 as(false);let H=h.T.ev('histHTML()');
 t('Restreint : export visible, Modifier / Suppr. cachés',/data-a="exp"/.test(H)&&!/data-a="redit"/.test(H)&&!/data-a="delrep"/.test(H));
 as(true);h.T.ev("ls.set('rl_rights',{...RPRE.min(),rep_edit:1})");as(false);H=h.T.ev('histHTML()');
 t('droit « modifier un rapport » seul : Modifier visible, Suppr. caché',/data-a="redit"/.test(H)&&!/data-a="delrep"/.test(H));
 as(true);h.T.ev("ls.set('rl_rights',{...RPRE.min(),rep_exp:0})");as(false);H=h.T.ev('histHTML()');
 t('sans droit d\'export : aucun bouton PDF / Excel / Word',!/data-a="exp"/.test(H));
 h.T.ev("last=reports[0];view='done'");t('… ni sur l\'écran « Maintenance enregistrée »',!/data-a="exp"/.test(html()));
 h.T.ev("view='home'");
 as(true);h.A.rpre({dataset:{p:'min'}});as(false);
 t('Restreint : plus de bouton « + Planifier » ni « Date / heure »',!/data-a="pledit"/.test(html()));
 h.T.plans.push({id:5,clientId:101,procId:1,date:'2099-01-01',time:'08:00',tech:'',notes:'',status:'planned',hist:[]});
 t('Restreint : le bouton « ▶ Démarrer » reste disponible',/data-a="plgo"/.test(html())&&!/data-a="pledit"/.test(h.ui.app));
 clr();h.A.pledit({dataset:{id:'5'}});t('Restreint : ouvrir « Date / heure » par le code est refusé',ck());
 h.T.ev("pl={id:5,clientId:101,procId:1,date:'2099-02-02',time:'09:00',status:'planned',hist:[]}");clr();h.A.plsave();
 t('Restreint : enregistrer une nouvelle date est refusé',ck()&&h.T.plans.find(p=>p.id===5).date==='2099-01-01');
 as(true);h.T.ev("ls.set('rl_rights',{...RPRE.min(),plan_edit:1})");as(false);
 t('droit « modifier date / heure » seul : bouton Date / heure sans « + Planifier »',/data-a="pledit" data-id="5"/.test(html())&&!/data-a="pledit" data-id=""/.test(h.ui.app));
 as(true);h.T.ev("pl={...pl,date:'2099-03-03'}");as(false);clr();h.A.plsave();
 t('… et l\'enregistrement d\'une reprogrammation passe',!ck()&&h.T.plans.find(p=>p.id===5).date==='2099-03-03');

 /* ===== 7. sauvegarde : les droits suivent, mais seul un admin peut les restaurer ===== */
 as(true);h.A.rpre({dataset:{p:'all'}});
 const S=JSON.parse(h.T.snap(false));t('la sauvegarde contient les droits',S.rights&&S.rights.backup===1);
 h.store.rl_rights=JSON.stringify(RPRE_MIN(h));
 as(false);await h.T.restore(S);
 t('restauration en mode utilisateur : les droits NE sont PAS remplacés (pas d\'auto-promotion)',JSON.parse(h.store.rl_rights).backup===0);
 as(true);await h.T.restore(S);t('restauration par l\'admin : droits repris',JSON.parse(h.store.rl_rights).backup===1);
 function RPRE_MIN(h){return h.T.ev('RPRE.min()')}
 t('une vieille sauvegarde sans droits se restaure sans erreur',await h.T.restore({clients:[]}).then(()=>true,()=>false));
 console.log(`\n${ok} OK / ${ko} KO`);process.exit(ko?1:0);
})();
