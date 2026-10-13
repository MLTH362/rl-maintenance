/* v24.10 : journal des erreurs, diagnostic (partage, e-mail), fiche client complète */
const {build}=require('./harness');
(async()=>{
 const {T,A,ctx,ui,t,done,sleep,toasts}=build();await sleep(200);
 const ev=c=>T.ev(c),log=()=>ev("JSON.parse(localStorage.getItem('rl_log')||'[]')");
 ev('admin=true');
 // --- journal
 ev("console.error('boom',new Error('x'))");
 t('console.error est copié dans le journal',log().some(e=>/boom/.test(e.m)&&/x/.test(e.m)));
 ev("logErr('test','a'.repeat(900))");t('message du journal limité en taille',log().pop().m.length<=300);
 for(let i=0;i<80;i++)ev("logErr('n','"+i+"')");t('journal limité à 60 lignes',log().length===60);
 // --- page Diagnostic
 const d=ev('admDiag()');
 t('Diagnostic : journal + partage, sans test e-mail',/Journal des erreurs/.test(d)&&/Partage de fichiers/.test(d)&&!/E-mail de récupération/.test(d)&&!/diagmail/.test(d));
 t('Rapport copiable : état des réglages e-mail',/réglages vides \(service, template, key\)/.test(ev('diagTxt()')));
 A.diagclr();t('Effacer le journal',log().length===0);
 // --- partage : la vraie cause est enregistrée
 ctx.navigator.canShare=()=>true;
 ctx.navigator.share=async()=>{const e=new Error('refusé');e.name='NotAllowedError';throw e};
 // PDF refusé : message + journal, aucun apprentissage
 toasts.length=0;T.dl(new Blob(['x'],{type:'application/pdf'}),'a.pdf');await A.fshare();
 t('partage PDF refusé : cause dans le message et le journal',toasts.some(m=>/NotAllowedError/.test(m))&&log().some(e=>e.k==='partage'&&e.m.includes('a.pdf'))&&!/pdf/.test(ev("localStorage.getItem('rl_nosh')||''")));
 // Excel / Word refusés : enregistrement automatique + type retenu
 for(const [n,ty] of [['a.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],['a.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document']]){
  toasts.length=0;ui.anchors.length=0;T.dl(new Blob(['x'],{type:ty}),n);await A.fshare();
  t('partage '+n+' refusé : fichier enregistré automatiquement + explication',ui.anchors.some(x=>x.download===n)&&toasts.some(m=>/ne permet pas de partager/.test(m))&&ui.modal==='');
 }
 t('types refusés retenus (xlsx, docx)',/xlsx/.test(ev("localStorage.getItem('rl_nosh')"))&&/docx/.test(ev("localStorage.getItem('rl_nosh')")));
 ui.modal='';ui.anchors.length=0;T.dl(new Blob(['x'],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'b.xlsx');
 t('ensuite : plus de bouton Partager pour Excel, enregistrement direct',ui.modal===''&&ui.anchors.some(x=>x.download==='b.xlsx'));
 ui.modal='';T.dl(new Blob(['x'],{type:'application/pdf'}),'b.pdf');t('… mais Partager reste proposé pour le PDF',/fshare/.test(ui.modal));ui.modal='';
 t('Diagnostic : types appris + bouton de remise à zéro',/\.xlsx/.test(ev('admDiag()'))&&/diagshreset/.test(ev('admDiag()')));
 A.diagshreset();t('remise à zéro du partage',ev("localStorage.getItem('rl_nosh')")===null);
 A.diagclr();ctx.navigator.share=async()=>{};await (T.dl(new Blob(['x'],{type:'application/pdf'}),'ok.pdf'),A.fshare());
 t('partage réussi : rien dans le journal',log().length===0);
 ctx.navigator.canShare=()=>false;ctx.navigator.share=()=>{};T.dl(new Blob(['x'],{type:'application/pdf'}),'z.pdf');
 t('type refusé : repli sur l\'enregistrement + trace',log().some(e=>/Type refusé/.test(e.m)));
 delete ctx.navigator.canShare;delete ctx.navigator.share;
 // --- fiche client
 A.cedit({dataset:{id:''}});
 t('formulaire client complet',['c_type','c_email','c_access','c_panels','c_inverter','c_since','c_freq','c_dates'].every(k=>ui.modal.includes('id="'+k+'"')));
 const set=o=>{const v={name:'Client Test',type:'Particulier',address:'1 rue A',contact:'',phone:'06 12 34 56 78',email:'a@b.fr',access:'',power:'9 kWc',panels:'',inverter:'',since:'',freq:'12',notes:'',dates:'05/3/2025\n10/01/2026',...o};ui.inputs={};for(const k in v)ui.inputs['c_'+k]=v[k]};
 const n0=T.clients.length,tryS=o=>{set(o);toasts.length=0;A.csave();return toasts.join('|')};
 t('e-mail invalide refusé',/e-mail invalide/.test(tryS({email:'abc'}))&&T.clients.length===n0);
 t('téléphone trop court refusé',/trop court/.test(tryS({phone:'12'}))&&T.clients.length===n0);
 t('date de maintenance invalide refusée',/Date de maintenance invalide/.test(tryS({dates:'31/02/2026'}))&&T.clients.length===n0);
 t('mise en service invalide refusée',/mise en service invalide/.test(tryS({since:'hier'})));
 t('périodicité invalide refusée',/Périodicité/.test(tryS({freq:'0'}))&&/Périodicité/.test(tryS({freq:'abc'})));
 tryS({});const c=T.clients.find(x=>x.name==='Client Test');
 t('client enregistré avec tous les champs',!!c&&c.email==='a@b.fr'&&c.type==='Particulier'&&c.freq==='12'&&c.phone==='06 12 34 56 78');
 t('dates remises en forme et triées (récente en premier)',c&&c.dates[0]==='10/01/2026'&&c.dates[1]==='05/03/2025');
 t('prochaine maintenance = dernière date + périodicité',/Prochaine maintenance prévue<\/span><b>10\/01\/2027/.test(ev('info('+JSON.stringify(c)+')')));
 ev("clients.push(norm({id:77,name:'Ancien',dates:['mai 2024']}))");
 A.cedit({dataset:{id:'77'}});set({name:'Ancien',dates:'mai 2024',email:'',phone:'',freq:'',since:''});toasts.length=0;A.csave();
 t('ancien client à date libre : modifiable sans blocage',!toasts.some(m=>/invalide/.test(m)));
 t('norm donne les nouveaux champs vides par défaut',ev("JSON.stringify(norm({name:'x'}))").includes('"email":""'));

 // --- onglet Diagnostic : droits et navigation
 ev('admin=false');ev("ls.set('rl_rights',RPRE.min())");
 t('utilisateur restreint : pas d\'onglet Diagnostic',!ev("admTabs().some(x=>x[0]==='g')"));
 ev("ls.set('rl_rights',{...RPRE.min(),diag:1})");
 t('droit « Consulter le diagnostic » : onglet Diagnostic visible, sans Clients',ev("admTabs().map(x=>x[0]).join('')")==='g');
 ev("view='adm';admTab='g'");ev('render()');
 t('utilisateur avec ce droit : voit le journal',/Journal des erreurs/.test(ui.app));
 A.menu();t('menu : entrée Diagnostic',/data-t="g"/.test(ui.modal));ui.modal='';
 ev('admin=true');
 for(const k of ['c','p','d','k','s','r','g']){ev("admTab='"+k+"'");let ok=true;try{ev('render()')}catch(e){ok=false}t('onglet « '+k+' » s\'affiche sans erreur',ok&&ui.app.length>500)}
 done();
})();
