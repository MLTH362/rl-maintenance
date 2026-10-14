/* v25.13 : procédure « contrôle thermique » fournie avec l'appli */
const {build}=require('./harness');
(async()=>{
 const {T,kv,t,done,sleep}=build();await sleep(300);const ev=c=>T.ev(c);
 t('procédure thermique ajoutée au démarrage',ev('procs.some(p=>p.id===PROC_THERMIQUE.id&&p.status===\'pub\')'));
 t('13 étapes, dernière = drone thermique toiture',ev('procs.find(p=>p.id===PROC_THERMIQUE.id).steps.length')===13&&ev('procs.find(p=>p.id===PROC_THERMIQUE.id).steps[12].t')==='Drone thermique toiture');
 t('une seule fois (marqueur posé)',kv.proc_thermique_seeded===3);
 t('l\'ancienne procédure est conservée',ev('procs.length')>=2);
 t('chaque étape a un titre et au moins un point (ou la vérification de compteur)',ev('procs.find(p=>p.id===PROC_THERMIQUE.id).steps.every(s=>s.t&&(s.i.length||s.releve))'));
 t('alertes danger sur les coupures (6 et 7) uniquement',ev('procs.find(p=>p.id===PROC_THERMIQUE.id).steps.map((s,i)=>s.danger?i+1:0).filter(Boolean).join()')==='6,7');
 t('resserrage : 4 points dont le disjoncteur logette',ev('procs.find(p=>p.id===PROC_THERMIQUE.id).steps[7].i.join()').includes('Disjoncteur logette'));
 done();
})();
