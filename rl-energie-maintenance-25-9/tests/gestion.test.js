/* Gestion v23 : création de procédures, catégories, documents visibles dans les procédures. */
const {build}=require('./harness');
(async()=>{
 let ok=0,ko=0;const t=(n,c)=>{console.log((c?'✅':'❌')+' '+n);c?ok++:ko++};
 const h=build();await h.sleep(250);const T=h.T,ev=c=>T.ev(c),A=h.A,html=()=>{ev('render()');return h.ui.app};
 const chg=(d,checked,value)=>h.L.change.forEach(f=>{try{f({target:{dataset:d,checked,value}})}catch{}});
 const inp=(d,value)=>h.L.input.forEach(f=>{try{f({target:{dataset:d,value}})}catch{}});
 ev('admin=true');ev("view='adm';admTab='p'");

 /* ---- catégories ---- */
 t('onglet Catégories présent',/data-t="k"/.test(html()));
 A.catnew({dataset:{k:'p'}});h.ui.inputs.cn='Onduleurs';A.catsave();await h.sleep(30);
 t('catégorie de procédures créée',ev("catList('p')").includes('Onduleurs')&&JSON.stringify(h.kv.cats).includes('Onduleurs'));
 A.catnew({dataset:{k:'p'}});h.ui.inputs.cn='onduleurs';A.catsave();
 t('doublon (casse différente) : pas de deuxième catégorie',ev("catList('p')").filter(c=>/onduleurs/i.test(c)).length===1);
 A.catnew({dataset:{k:'p'}});h.ui.inputs.cn='   ';h.toasts.length=0;A.catsave();t('nom vide refusé',h.toasts.some(x=>/nom/.test(x)));
 A.catnew({dataset:{k:'d'}});h.ui.inputs.cn='Notices';A.catsave();t('catégorie de documents indépendante',ev("catList('d')").includes('Notices')&&!ev("catList('p')").includes('Notices'));

 /* ---- créer une procédure de zéro ---- */
 A.pedit({dataset:{id:''}});t('« + Nouvelle » : choix départ de zéro / modèle / copie',/data-m="blank"/.test(h.ui.modal)&&/data-m="std"/.test(h.ui.modal)&&/data-m="copy"/.test(h.ui.modal));
 A.pnew({dataset:{m:'blank'}});
 t('éditeur plein écran ouvert avec 1 étape vide',ev("view")==='pe'&&ev('pe.steps.length')===1&&/Nouvelle procédure/.test(html())&&/data-a="psave"/.test(h.ui.app));
 h.toasts.length=0;A.psave();t('titre obligatoire',h.toasts.some(x=>/titre/.test(x)));
 inp({pe:'title'},'Contrôle onduleur');inp({pe:'cat'},'Onduleurs');inp({pe:'status'},'pub');
 h.toasts.length=0;A.psave();t('étape sans titre refusée',h.toasts.some(x=>/Étape 1/.test(x))&&ev("view")==='pe');
 inp({pe:'t',k:'0'},'Ventilateur');inp({pe:'desc',k:'0'},'Souffler la poussière');
 A.ptadd({dataset:{k:'0'}});inp({pt:'1',k:'0'},'Bruit');inp({pt:'0',k:'0'},'Propreté');A.ptadd({dataset:{k:'0'}});
 t('points de contrôle ajoutés un par un',ev('pe.steps[0].i.length')===3&&/data-pt="2"/.test(html()));
 A.ptdel({dataset:{k:'0',j:'2'}});t('point retiré',ev('pe.steps[0].i.length')===2);
 A.sadd();inp({pe:'t',k:'1'},'Relevé');chg({pc:'releve',k:'1'},true);inp({pt:'0',k:'1'},'x');A.ptdel({dataset:{k:'1',j:'0'}});
 A.sdup({dataset:{k:'0'}});t('étape dupliquée à la suite',ev('pe.steps.length')===3&&/copie/.test(ev('pe.steps[1].t')));
 A.smv({dataset:{k:'2',d:'-1'}});t('étape déplacée ↑',ev('pe.steps[1].t')==='Relevé');
 ev('procs.length');const n0=ev('procs.length');A.psave();
 const P=ev('procs.find(p=>p.title==="Contrôle onduleur")');
 t('procédure enregistrée, publiée, rangée dans sa catégorie',!!P&&P.status==='pub'&&P.cat==='Onduleurs'&&ev('procs.length')===n0+1&&ev('view')==='adm');
 t('… points vides nettoyés, options prises en compte',P.steps[0].i.join()==='Propreté,Bruit'&&P.steps[1].releve===1);
 await h.sleep(30);t('… sauvegardée dans IndexedDB',h.kv.procs.some(p=>p.title==='Contrôle onduleur'));
 A.pnew({dataset:{m:'blank'}});inp({pe:'title'},'contrôle ONDULEUR');inp({pe:'t',k:'0'},'a');h.toasts.length=0;A.psave();
 t('titre déjà utilisé refusé',h.toasts.some(x=>/déjà/.test(x)));A.pcancel();h.toasts.length=0;
 t('annuler avec modifications : confirmation demandée',/Confirmation/.test(h.ui.modal));A.yes();
 t('… puis retour à la liste sans enregistrer',ev('view')==='adm'&&ev('pe')===null);
 A.pedit({dataset:{id:String(P.id)}});A.pcancel();t('annuler sans modification : sans confirmation',ev('view')==='adm');

 /* ---- démarrage : catégories dans le choix ---- */
 ev("view='home'");const H=html();
 t('accueil : procédures groupées par catégorie',/<optgroup label="Onduleurs">/.test(H)&&/<optgroup label="Maintenance">/.test(H));
 ev("form.tech='T';form.ci='0'");h.T.form.pi='';html();
 A.start();
 const d0=ev('draft');t('la nouvelle procédure sélectionnée par défaut est bien celle qui démarre',!!d0&&ev('procs.some(p=>p.id===draft.pid)'));
 ev("form.pi="+P.id);html();ev('drafts=[];draft=null');A.start();
 t('lancer une maintenance avec la procédure créée',ev('draft.proc')==='Contrôle onduleur'&&ev('STEPS.length')===3);
 ev("view='wiz'");t('… et son étape 1 s\'affiche',/Ventilateur/.test(html())&&/Propreté/.test(h.ui.app));
 ev('drafts=[];draft=null;view="home"');

 /* ---- documents : ajout et apparition dans la procédure ---- */
 ev("view='adm';admTab='d'");
 A.dedit({dataset:{id:''}});t('fiche document : choix de catégorie + procédures où l\'utiliser',/data-de="cat"/.test(h.ui.modal)&&/data-dp/.test(h.ui.modal));
 inp({de:'title'},'Notice onduleur');inp({de:'cat'},'Notices');ev("de.src='data:image/jpeg;base64,AAAA'");
 chg({dp:''},true,String(P.id));A.dsave();
 t('document créé et attaché à la procédure cochée',ev('docs.some(d=>d.title==="Notice onduleur")')&&ev(`procs.find(p=>p.id===${P.id}).docs.length`)===1);
 const DID=ev('docs.find(d=>d.title==="Notice onduleur").id');
 t('liste Documents : classé par catégorie, « utilisé dans 1 procédure »',/Notices/.test(html())&&/utilisé dans 1 procédure/.test(h.ui.app));
 ev("form.pi="+P.id+";form.ci='0'");A.start();ev("view='wiz'");
 t('MAINTENANCE : le document apparaît à l\'étape 1',new RegExp('data-a="vdoc" data-id="'+DID+'"').test(html()));
 t('… et le bouton « Tous les documents » est là',/data-a="wdocs"/.test(h.ui.app));
 /* doc ajouté APRÈS le démarrage (maintenance en pause) : visible en direct */
 ev("de={id:'dLate',title:'Schéma tardif',desc:'',cat:'',type:'image',src:'data:image/jpeg;base64,AAAA',procs:[]};deTarget=null");
 ev("de.procs=[String("+P.id+")]");A.dsave();
 t('document ajouté pendant une maintenance en pause : visible sans la recommencer',/data-id="dLate"/.test(html()));
 A.wdocs();t('« Tous les documents » : liste la procédure puis les autres',/Cette procédure/.test(h.ui.modal)&&/data-id="dLate"/.test(h.ui.modal)&&/data-id="d1"/.test(h.ui.modal)&&/Autres documents/.test(h.ui.modal));
 ev('drafts=[];draft=null;view="adm";admTab="p"');
 /* création d'un document depuis l'éditeur de procédure (étape) */
 A.pedit({dataset:{id:String(P.id)}});A.sopen({dataset:{k:'0'}});A.dnew({dataset:{k:'0'}});
 t('depuis une étape : pas de liste de procédures (le doc va à l\'étape)',!/data-dp/.test(h.ui.modal));
 inp({de:'title'},'Photo étape');ev("de.src='data:image/jpeg;base64,BBBB'");A.dsave();
 const nid=ev('docs.find(d=>d.title==="Photo étape").id');
 t('nouveau document coché automatiquement dans l\'étape',ev('pe.steps[0].docs.includes('+JSON.stringify(nid)+')')&&/checked/.test(html()));
 A.psave();t('… et enregistré dans la procédure',ev(`procs.find(p=>p.id===${P.id}).steps[0].docs.includes(${JSON.stringify(nid)})`));

 /* ---- renommer / supprimer une catégorie ---- */
 A.catren({dataset:{k:'p',n:'Onduleurs'}});h.ui.inputs.cn='Onduleurs & coffrets';A.catsave();
 t('renommer : procédures suivies',ev(`procs.find(p=>p.id===${P.id}).cat`)==='Onduleurs & coffrets'&&!ev("catList('p')").includes('Onduleurs'));
 A.catdel({dataset:{k:'p',n:'Onduleurs & coffrets'}});t('suppression : confirmation avec le nombre d\'éléments',/1 élément/.test(h.ui.modal));A.yes();
 t('… la procédure passe « Sans catégorie », rien n\'est supprimé',ev(`procs.find(p=>p.id===${P.id}).cat`)===''&&!ev("catList('p')").includes('Onduleurs & coffrets'));

 /* ---- sauvegarde & droits ---- */
 const S=JSON.parse(T.snap(false));t('la sauvegarde contient les catégories',Array.isArray(S.cats.d)&&S.cats.d.includes('Notices'));
 ev("cats={p:[],d:[]}");await T.restore(S);t('restauration : catégories récupérées',ev("cats.d").includes('Notices'));
 ev('admin=false');ev("ls.set('rl_rights',RPRE.min())");h.toasts.length=0;A.catnew({dataset:{k:'p'}});
 t('utilisateur sans droit : catégories refusées',h.toasts.some(x=>/droit insuffisant/.test(x)));
 h.toasts.length=0;A.pchoose();t('… et création de procédure refusée',h.toasts.some(x=>/droit insuffisant/.test(x)));
 ev("ls.set('rl_rights',{...RPRE.min(),proc_edit:1})");ev("view='adm'");html();
 t('avec le droit procédures : onglets Procédures + Catégories (procédures seulement)',/data-t="p"/.test(h.ui.app)&&/data-t="k"/.test(h.ui.app)&&!/data-t="d"/.test(h.ui.app));
 ev("admTab='k'");html();t('… la page Catégories ne montre que les catégories de procédures',/de procédures/.test(h.ui.app)&&!/de documents/.test(h.ui.app));
 console.log(`\n${ok} OK / ${ko} KO`);process.exit(ko?1:0);
})();
