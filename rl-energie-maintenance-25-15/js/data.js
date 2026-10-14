'use strict';
/* R.L ENERGIE — Référentiel des étapes de maintenance + variables d'état globales */
/* ---------- Référentiel des étapes ---------- */
const DEF=[
{t:'Drone thermique toiture',i:['Observation drone thermique']},
{t:'Caméra thermique onduleur AC + DC',i:['Observation thermique onduleur AC et DC']},
{t:'Ouverture du coffret AC et remise sous tension',i:['État visuel coffret AC'],danger:1,refs:['et']},
{t:'Vérification visuelle et nettoyage du local onduleur',i:['État visuel onduleurs','Câbles','Chemin de câble','Attache câble','Capot','Connectiques DC','Environnement','Étiquettes','Nettoyage','Test continuité'],refs:['et']},
{t:'Thermique coffret AC',i:['Observation thermique coffret AC']},
{t:'AGCP',i:['AGCP'],refs:['et']},
{t:'Vérification PDL',i:['Test différentiel','Paramétrage']},
{t:'Serrage PDL',i:['Coupure du sectionneur'],torque:1,refs:['tq']},
{t:'Vérification du couple de serrage',i:['Vérification couple de serrage'],torque:1,refs:['tq']},
{t:'Local onduleur',i:['Vérification couple de serrage base onduleur'],torque:1,refs:['tq']},
{t:'Ventilateur onduleur',i:['Nettoyage ventilateur onduleur']},
{t:'Remise en tension PDL + vérification de compteur',i:[],releve:1},
{t:'Vérification du redémarrage',i:['Vérification redémarrage']}];
let LOGO={d:window.LOGO_DATA,w:520,h:724},LOGOWM=window.LOGO_WM,plans=[],pl=null,plf='up',STEPS=DEF,procs=[],docs=[],admTab='c',pe=null,de=null;const vfix=s=>String(s).replace(/\brelev[ée](s?)(?![a-zà-ÿ])/gi,(m,p)=>{const v=p?'vérifications':'vérification';return m[0]==='R'?'V'+v.slice(1):v});const use=r=>{const D=r&&r.def||DEF;STEPS=D.some(c=>c&&/relev/i.test(c.t))?D.map(c=>c&&/relev/i.test(c.t)?{...c,t:vfix(c.t)}:c):D};
const TQ=['3,5 N.m','8 N.m','10 N.m','12 N.m','15 N.m','18 N.m','20 N.m','25 N.m','30 N.m','50 N.m'];
const TQREF=[['IC60N – C120N','ic60n',[['63 A à 125 A','3,5 N.m']]],['NSX100-400','nsx',[['100 / 160 / 250 A','15 N.m'],['400 A','50 N.m']]],['INS250-400','ins',[['250 A','15 N.m'],['400 A','50 N.m']]],['Épanouisseur 160-400','epanouisseur',[['160 / 250 A','15 N.m'],['400 / 630 A','50 N.m']]]];
/* Procédure fournie avec l'appli (ajoutée une seule fois au démarrage ; supprimable ensuite depuis Gestion > Procédures) */
const PROC_THERMIQUE={"id":1760400000001,"title":"Maintenance annuelle - contrôle thermique","desc":"Contrôle thermique, resserrage et nettoyage de l'onduleur, du coffret AC et de la logette","cat":"Maintenance","status":"pub","ver":1,"upd":"14/10/2026","docs":[],"steps":[{"t":"État général","i":["Chemin de câbles","Étiquettes « Sous tension » à hauteur d'homme","État visuel de l'installation","Étiquette de coupure d'urgence"]},{"t":"Logette : vérification des index 800 et 801 du compteur client (selon la distance)","i":[],"releve":1},{"t":"Ouverture du coffret AC (sortie onduleur) pour contrôle à la caméra thermique","i":["Contrôle des connectiques (vision thermique)"]},{"t":"Photos à la caméra thermique de l'onduleur","i":["Alimentation coffret AC","Alimentation DC"]},{"t":"Caméra thermique à la logette","i":["Observation thermique du départ client au disjoncteur"]},{"t":"Coupure du disjoncteur à la logette","i":["Coupure du disjoncteur logette"],"danger":1},{"t":"Coupure du coffret AC et de l'onduleur","i":["Coupure du coffret AC","Coupure de l'onduleur"],"danger":1},{"t":"Resserrage des écrous","i":["Alimentation onduleur","Coffret AC","Départ client","Disjoncteur logette"],"torque":1},{"t":"Remise sous tension : logette en premier, puis coffret AC et onduleur","i":["Remise sous tension logette","Remise sous tension coffret AC","Remise sous tension onduleur"]},{"t":"Recontrôle des anomalies constatées aux étapes 4 et 5","i":["Recontrôle onduleur (étape 4)","Recontrôle logette (étape 5)"]},{"t":"Nettoyage des ventilateurs et dépoussiérage","i":["Nettoyage des ventilateurs","Dépoussiérage du coffret","Dépoussiérage de l'onduleur"]},{"t":"Contrôle des panneaux au drone (une photo par pente de toit)","i":["Contrôle des anomalies des panneaux"]},{"t":"Drone thermique toiture","i":["Observation drone thermique"]}]};
const LBL={ok:'Conforme',ko:'Défaut',nc:'Non contrôlé',m:'Vérifié','':'Non renseigné'};
const COL={ok:'187A33',ko:'C5221A',nc:'5A6470',m:'1D5FA8'},LIGHT={ok:'E3F4E8',ko:'FDE3E0',nc:'ECEFF3',m:'E1ECF8'};
const SEED=[{id:101,name:'Client A - 450 kWc',address:'Région PACA',power:'450 kWc',dates:['15/03/2025','10/09/2024']},{id:102,name:'Client B - 120 kWc',address:'Île-de-France',power:'120 kWc',dates:['08/01/2026','12/06/2025']},{id:103,name:'Client C - 800 kWc',address:'Occitanie',power:'800 kWc',dates:['22/11/2025','15/05/2025']}];
/* Type d'installation : 3 valeurs seulement. Les anciennes saisies libres (ex. « Toiture – vente totale ») sont converties. */
const itypeNorm=v=>{const x=String(v||'').toLowerCase();if(!x.trim())return'';if(/(les deux|mixte|surplus)/.test(x)||(/autoconso/.test(x)&&/vente/.test(x)))return'Les deux';if(/autoconso/.test(x))return'Autoconsommation';if(/vente/.test(x))return'Vente totale';return''};
const norm=(c,k=0)=>({id:c.id||Date.now()+k,name:c.name||'Sans nom',address:c.address||'',power:c.power||'',contact:c.contact||'',phone:c.phone||'',notes:c.notes||c.details||'',dates:c.dates||c.oldDates||(c.lastMaint?[c.lastMaint]:[]),email:c.email||'',type:c.type||'',access:c.access||'',panels:c.panels||'',inverter:c.inverter||'',itype:itypeNorm(c.itype),grid:c.grid||'',integ:c.integ||'',since:c.since||'',freq:c.freq||'',tsm:c.tsm||0,_h:c._h});
