const {build}=require('./harness');
(async()=>{
 const {T,A,ctx,t,done,sleep}=build();await sleep(200);
 t('démarrage terminé (ready=1)',T.ready===1);
 // --- fusion de clients : tri des dates
 t('tri des dates aaaa>mm>jj',JSON.stringify(T.mergeDates(['15/03/2025','10/09/2024'],['08/01/2026','12/06/2025']))==='["08/01/2026","12/06/2025","15/03/2025","10/09/2024"]');
 // --- restauration
 T.clients.length=0;T.plans.length=0;T.reports.length=0;
 T.clients.push({id:111,name:'Dupont',dates:['01/01/2026'],address:'',power:'',contact:'',phone:'',notes:''});
 await T.restore({v:4,clients:[{id:999,name:'dupont',dates:['05/05/2025'],address:'1 rue X'},{id:111,name:'Martin',dates:[]}],
   plans:[{id:7,clientId:999,procId:1,date:'2026-05-01',status:'todo'},{id:8,clientId:111,procId:1,date:'2026-05-02',status:'todo'}],reports:[],
   drafts:[{id:5,client:{id:111,name:'Martin'},steps:[]}]});
 const d=T.clients.find(c=>c.id===111),m=T.clients.find(c=>c.name==='Martin');
 t('restauration : même nom => dates fusionnées sans écrasement',d.dates.join()==='01/01/2026,05/05/2025'&&d.address==='1 rue X');
 t('restauration : homonyme en collision d\'id => nouvel id',m&&m.id!==111);
 t('restauration : planning remappé (ancien id 999 -> 111)',T.plans.find(p=>p.id===7).clientId===111);
 t('restauration : planning remappé (Martin -> son nouvel id)',T.plans.find(p=>p.id===8).clientId===m.id);
 t('restauration : brouillon restauré et client remappé',T.drafts.length===1&&T.drafts[0].client.id===m.id);
 let bad=false;try{await T.restore({foo:1})}catch{bad=true}t('restauration : fichier invalide refusé',bad);
 // --- stockage
 ctx.FAIL=1;const r=await T.dbSave('reports',[]);ctx.FAIL=0;
 t('échec IndexedDB détecté (dbSave=false, plus de silence)',r===false);
 t('dbSave normal => true',(await T.dbSave('x',[1]))===true);
 t('esc neutralise < & > "',!/[<>"]/.test(T.esc('a<b>&"')));
 t('relevés : virgule et espaces',T.numv('12 456,5')===12456.5&&isNaN(T.numv('abc')));
 // --- exports avec étape sans point de contrôle
 const S=T.STEPS,saved=S[1].i;S[1].i=[];
 const rep={id:1,start:'01/01/2026',end:'01/01/2026',tech:'T',date:'01/01/2026',obs:'',defects:[],meter:'',
   client:{id:1,name:'C',address:'a',power:'9 kWc',contact:'X',phone:'0102030405',notes:''},prev:'10/09/2024',prod:'12 456,5',conso:'100',pid:1,pver:1,
   steps:S.map(c=>({st:c.i.map(()=>'ok'),obs:'',ph:[]})),ph:[]};
 try{const p=T.mkPdf(rep);t('PDF avec étape vide',(p.size||p.byteLength)>1000)}catch(e){t('PDF étape vide : '+e.message,false)}
 try{t('Excel avec étape vide',!!(await T.mkXls(rep)))}catch(e){t('Excel étape vide : '+e.message,false)}
 try{const w=await T.mkDoc(rep);t('Word avec étape vide',(w.size||w.length)>1000)}catch(e){t('Word étape vide : '+e.message,false)}
 S[1].i=saved;
 done();
})();
