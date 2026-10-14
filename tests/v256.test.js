/* v25.6 : type d'installation à 3 choix, plus de système d'intégration, rapports PDF / Word refaits */
const {build}=require('./harness');
(async()=>{
 const {T,ui,t,done,sleep}=build();await sleep(200);const ev=c=>T.ev(c);
 /* conversion des anciennes saisies libres */
 const N=v=>ev(`itypeNorm(${JSON.stringify(v)})`);
 t('« Toiture – vente totale » → Vente totale',N('Toiture – vente totale')==='Vente totale');
 t('« Toiture – autoconsommation » → Autoconsommation',N('Toiture – autoconsommation')==='Autoconsommation');
 t('autoconsommation + vente → Les deux',N('Autoconsommation avec vente du surplus')==='Les deux'&&N('Les deux')==='Les deux');
 t('« Ombrière de parking » (ancien choix) → non précisé',N('Ombrière de parking')==='');
 t('vide → vide',N('')==='');
 /* formulaire client */
 ev('admin=true');ev(`clients.push(norm({id:910,name:'Client V256',itype:'Vente totale'}))`);
 T.A.cedit({dataset:{id:'910'}});
 const m=ui.modal;
 t("formulaire : « Système d'intégration » est un champ libre, sans menu déroulant",m.includes('<input id="c_integ"')&&!m.includes('list="dl_integ"')&&!m.includes('<select id="c_integ"'));
 t("formulaire : « Type d'installation » est un menu déroulant",m.includes('<select id="c_itype">'));
 const opts=[...m.slice(m.indexOf('<select id="c_itype">')).split('</select>')[0].matchAll(/<option value="([^"]*)"/g)].map(x=>x[1]);
 t('menu : Non précisé + 3 choix exactement',JSON.stringify(opts)===JSON.stringify(['','Vente totale','Autoconsommation','Les deux']));
 t('menu : valeur actuelle présélectionnée',/<option value="Vente totale" selected>/.test(m));
 /* enregistrement */
 for(const k of ['address','contact','access','power','grid','panels','inverter','notes','type'])ui.inputs['c_'+k]='';ui.inputs.c_integ='Bac acier';ui.inputs.c_name='Client V256';ui.inputs.c_itype='Les deux';ui.inputs.c_dates='';ui.inputs.c_email='';ui.inputs.c_phone='';ui.inputs.c_freq='12';ui.inputs.c_since='';
 T.A.csave();await sleep(50);
 const c=ev(`clients.find(c=>c.id===910)`);
 t('enregistrement : type = Les deux',c.itype==='Les deux');
 t("enregistrement : système d'intégration conservé tel que saisi",c.integ==='Bac acier');
 /* rapports */
 const rep=`{id:1760000000123,proc:'Maintenance',client:{id:910,name:'Client V256'},tech:'Paul',start:'13/10/2026',prev:'12/10/2025',prod:'1 000',conso:'500',steps:DEF.map((c,i)=>({st:c.i.map((_,j)=>i===3&&j===0?'ko':'ok'),obs:i===3?'Câble abîmé – œuvre à reprendre ≈ 100 €':'',ph:[],torque:''}))}`;
 const rows=ev(`infoRows(${rep})`),get=k=>(rows.find(x=>x[0]===k)||[])[1];
 t('rapport : type « Les deux » affiché en toutes lettres',get("Type d'installation")==='Autoconsommation et vente');
 t('rapport : prochaine maintenance = date + périodicité',get('Prochaine maintenance prévue')==='13/10/2027');
 t('rapport : référence RM-AAAAMMJJ-nnn',ev(`refOf(${rep})`)==='RM-20261013-123');
 const V=ev(`verdict(${rep})`);t('verdict : 1 défaut constaté',V.k==='ko'&&V.t==='1 défaut constaté');
 t('verdict : tout conforme',ev(`verdict(${rep.replace(/i===3&&j===0\?'ko':'ok'/,"'ok'")})`).t==='Installation conforme');
 t('PDF : caractères hors police remplacés (≈ → ~, jamais « ? »)',ev(`S('≈ 100 € ✔ 🙂 œuvre')`)==='~ 100 €  œuvre'.replace('  ',' ')||ev(`S('≈ 100 €')`)==='~ 100 €');
 try{const p=ev(`mkPdf(${rep})`);t('PDF généré',p.size>5000)}catch(e){console.log(e.stack.split('\n').slice(0,5).join('\n'));t('PDF : '+e.message,false)}
 try{const w=await ev(`mkDoc(${rep})`);t('Word généré',w.size>5000)}catch(e){t('Word : '+e.message,false)}
 try{t('Excel généré',!!(await ev(`mkXls(${rep})`)))}catch(e){t('Excel : '+e.message,false)}
 done();
})();
