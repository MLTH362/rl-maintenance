/* Test de fumée : affiche tous les écrans et déclenche toutes les actions, et traque les ReferenceError
   (identifiant introuvable = typiquement un oubli après un découpage en fichiers). */
const {build}=require('./harness');
(async()=>{
 const {T,A,ctx,ui,t,done,sleep}=build();await sleep(250);
 const refs=new Set();let views=0,acts=0;
 const guard=(n,f)=>{try{const r=f();if(r&&r.catch)r.catch(e=>{if(e.name==='ReferenceError')refs.add(n+' : '+e.message)})}catch(e){if(e.name==='ReferenceError')refs.add(n+' : '+e.message)}};
 // données réalistes
 const steps=()=>T.STEPS.map(c=>({st:c.i.map(()=>'ok'),obs:'',ph:[],torque:''}));
 T.clients.push({id:900,name:'Client Z',dates:['01/01/2026'],address:'1 rue X',power:'9 kWc',contact:'',phone:'',notes:''});
 const rep={id:800,client:T.clients[0],proc:'P',pid:1,start:'01/01/2026',end:'01/01/2026',tech:'T',prod:'1',conso:'1',prev:'—',steps:steps(),ph:[]};
 T.reports.push(rep);T.drafts.push({...rep,id:801,end:undefined,step:1});
 T.plans.push({id:700,clientId:900,procId:1,date:'2026-10-01',time:'09:00',status:'todo',tech:'T',hist:[]});
 T.ev('admin=true');
 // tous les écrans
 for(const v of ['home','done','hist','plan','adm','wiz'])for(const tab of ['c','p','d','s']){
   T.view=v;T.ev(`admTab='${tab}'`);
   if(v==='wiz'){T.draft={...rep,id:802,step:0,steps:steps()};for(let i=0;i<T.STEPS.length;i++){T.draft.step=i;guard('écran étape '+i,()=>T.ev('render()'));views++}}
   else{if(v==='done')T.ev('last=reports[0]');guard('écran '+v+'/'+tab,()=>T.ev('render()'));views++}
 }
 // toutes les actions avec un bouton factice
 const btn={dataset:{id:'800',f:'pdf',t:'c',k:'ok',j:'0',i:'0',l:'',a:''},value:'x',files:[],parentNode:{querySelectorAll:()=>[]},closest:()=>({classList:{add(){},remove(){}},scrollIntoView(){}}),classList:{add(){},remove(){},toggle(){}},scrollIntoView(){}};
 const skip=new Set(['bk','exp','fshare','fsave']);
 for(const k of Object.keys(A)){if(skip.has(k))continue;T.ev('admin=true');T.view='home';T.draft={...rep,id:803,step:0,steps:steps()};guard('action '+k,()=>A[k](btn));acts++;ui.modal=''}
 await sleep(100);
 t(views+' écrans affichés sans référence manquante',![...refs].some(x=>/écran/.test(x)));
 t(acts+' actions déclenchées sans référence manquante',![...refs].some(x=>/action/.test(x)));
 if(refs.size)console.log('   RÉFÉRENCES MANQUANTES :\n   '+[...refs].join('\n   '));
 done();
})();
