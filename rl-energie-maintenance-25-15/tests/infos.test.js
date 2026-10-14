/* v25.2 : informations générales du rapport (adresse, type d'installation, puissances, panneaux, onduleurs) — v25.6 : plus de système d'intégration, type d'installation à 3 choix */
const {build}=require('./harness');
(async()=>{
 const {T,ui,t,done,sleep}=build();await sleep(200);const ev=c=>T.ev(c);
 ev(`clients.push(norm({id:901,name:'Client Test',address:'12 rue du Soleil, 75001 Paris',itype:'Toiture – autoconsommation',power:'300 kWc',grid:'250 kVA',panels:'600 × 500 Wc',inverter:'3 × SMA Tripower',integ:'Surimposition'}))`);
 const R=(extra='')=>`{id:1,client:{id:901,name:'Client Test'${extra}},tech:'Paul',start:'01/01/2026',prev:'01/01/2025',prod:'1',conso:'1',steps:DEF.map(c=>({st:c.i.map(()=>'ok'),obs:'',ph:[],torque:''}))}`;
 const rows=ev(`infoRows(${R()})`),get=k=>(rows.find(x=>x[0]===k)||[])[1];
 t('adresse',get('Adresse')==='12 rue du Soleil, 75001 Paris');
 t("type d'installation : ancienne saisie convertie en « Autoconsommation »",get("Type d'installation")==='Autoconsommation');
 t('puissance installée',get('Puissance installée')==='300 kWc');
 t('puissance de raccordement',get('Puissance de raccordement')==='250 kVA');
 t('panneaux photovoltaïques',get('Panneaux photovoltaïques')==='600 × 500 Wc');
 t('onduleurs',get('Onduleurs')==='3 × SMA Tripower');
 t("système d'intégration (saisie libre) dans le rapport",get("Système d'intégration")==='Surimposition');
 ev(`clients.find(c=>c.id===901).grid='400 kVA'`);
 t('modifier la fiche client met à jour le rapport',ev(`infoRows(${R(",grid:'ancienne'")})`).find(x=>x[0]==='Puissance de raccordement')[1]==='400 kVA');
 t('client supprimé : valeurs gardées dans le rapport',ev(`(clients=clients.filter(c=>c.id!==901),infoRows(${R(",grid:'250 kVA',power:'300 kWc'")}))`).find(x=>x[0]==='Puissance installée')[1]==='300 kWc');
 ev(`clients.push(norm({id:901,name:'Client Test',power:'300 kWc',grid:'400 kVA',itype:'Ombrière',panels:'p',inverter:'o',integ:'Sol',address:'a'}))`);
 try{t('PDF',(ev(`mkPdf(${R()})`).size||1)>1000)}catch(e){t('PDF : '+e.message,false)}
 try{t('Excel',!!(await ev(`mkXls(${R()})`)))}catch(e){t('Excel : '+e.message,false)}
 try{const w=await ev(`mkDoc(${R()})`);t('Word',(w.size||w.length)>1000);require('fs').writeFileSync('/tmp/test.docx',Buffer.from(w.arrayBuffer?await w.arrayBuffer():w))}catch(e){t('Word : '+e.message,false)}
 done();
})();
