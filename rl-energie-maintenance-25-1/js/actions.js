'use strict';
/* R.L ENERGIE — Actions (clics, formulaires, planning, admin) */
/* ---------- Actions ---------- */
const A={close,zoom:b=>b.classList.toggle('z'),
ref:b=>{const d=b.dataset.d,c=draft&&view==='wiz'&&STEPS[draft.step].torque;
dlg(d==='et'?`<h3>Étiquettes de sécurité</h3><div class="zoom" data-a="zoom"><img src="docs/etiquettes.jpg" alt="Schéma des étiquettes"></div><p style="color:var(--nc);font-size:.85rem;margin-top:.5rem">Touchez l'image pour zoomer / dézoomer.</p><div class="row"><button class="btn" data-a="close">Fermer</button></div>`
:`<h3>Couples de serrage</h3><div class="tq">${TQREF.map(t=>`<section><h4>${t[0]}</h4><img src="docs/${t[1]}.jpg" alt="">${t[2].map(r=>`<div class="r"><span>${r[0]}</span><b>${r[1]}</b>${c?`<button class="btn sm y" data-a="usetq" data-v="${r[1]}">Utiliser</button>`:''}</div>`).join('')}</section>`).join('')}</div><div class="row"><button class="btn" data-a="close">Fermer</button></div>`,'wide')},
usetq:b=>{draft.steps[draft.step].torque=b.dataset.v;const i=document.querySelector('[data-in="torque"]'),q=$('#tqs');if(i)i.value=b.dataset.v;if(q)q.value=TQ.includes(b.dataset.v)?b.dataset.v:'';saveDraft();close();toast('Couple appliqué : '+b.dataset.v)},
yes:()=>{close();pend&&pend()},home:()=>{view='home';render()},toadm:()=>{view='adm';render()},
admin:()=>admin?(admin=false,view='home',render()):dlg('<h3>Accès administrateur</h3><input id="pwi" type="password" placeholder="Mot de passe"><div class="row"><button class="btn ghost" data-a="close">Annuler</button><button class="btn" data-a="login">Valider</button></div><div class="row"><button class="btn ghost" data-a="forgot">Mot de passe oublié ?</button></div>'),
login:async()=>{if(Date.now()<pwLock)return toast(`Trop d'essais : patientez ${Math.ceil((pwLock-Date.now())/1000)} s`,'err');
const v=$('#pwi').value;let ok=false;try{ok=await pwCheck(v)}catch(e){console.error(e);return toast('Vérification impossible sur ce navigateur','err')}
if(ok){pwFail=0;pwSave();admin=true;close();render();toast('Mode administrateur activé')}else{if(++pwFail>=5){pwLock=Date.now()+30000;pwFail=0}pwSave();toast('Mot de passe incorrect','err')}},
pw:()=>dlg('<h3>Nouveau mot de passe</h3><input id="pwn" type="password" placeholder="4 caractères minimum"><div class="row"><button class="btn ghost" data-a="close">Annuler</button><button class="btn" data-a="pwsave">Enregistrer</button></div>'),
pwsave:async()=>{const v=$('#pwn').value;if(v.length<4)return toast('Trop court','err');ls.set('rl_pw',await pwMake(v));close();toast('Mot de passe modifié')},
cedit:b=>{editId=b.dataset.id||null;const c=editId?clients.find(x=>x.id==editId):norm({});const f=(k,l,ph='',t='text',im='')=>`<label>${l}</label><input id="c_${k}" type="${t}"${im?` inputmode="${im}"`:''} value="${esc(c[k])}" placeholder="${esc(ph)}">`,h=x=>`<p class="sdesc" style="margin:16px 0 0"><b>${x}</b></p>`;
const ty=`<label>Type de client</label><select id="c_type">${['','Particulier','Professionnel','Collectivité / public','Agricole'].map(o=>`<option value="${esc(o)}"${c.type===o?' selected':''}>${o||'— Non précisé —'}</option>`).join('')}</select>`;
dlg(`<h3>${editId?'Modifier':'Nouveau'} client</h3>${h('Identité')}${f('name','Nom du client / installation *','Ex : Client D - 300 kWc')}${ty}${h('Coordonnées')}${f('address','Adresse / site')}${f('contact','Contact sur site')}${f('phone','Téléphone','Ex : 06 12 34 56 78','tel','tel')}${f('email','E-mail','nom@exemple.fr','email','email')}${f('access','Accès au site / consignes','Ex : portail, code, clé chez le gardien')}${h('Installation')}${f('power','Puissance','Ex : 300 kWc')}${f('panels','Panneaux (nombre et modèle)','Ex : 120 × 500 Wc')}${f('inverter','Onduleur (marque, modèle)','Ex : SMA Sunny Tripower')}${f('since','Date de mise en service','JJ/MM/AAAA')}${h('Maintenance')}${f('freq','Périodicité (en mois)','Ex : 12','number','numeric')}<label>Dates de maintenance (une par ligne, JJ/MM/AAAA)</label><textarea id="c_dates" rows="3">${esc(c.dates.join('\n'))}</textarea><label>Notes</label><textarea id="c_notes" rows="2">${esc(c.notes)}</textarea><div class="row stick"><button class="btn ghost" data-a="close">Annuler</button><button class="btn ok" data-a="csave">Enregistrer</button></div>`)},
csave:()=>{const g=k=>(($('#c_'+k)||{}).value||'').trim(),name=g('name');if(!name)return toast('Le nom est obligatoire','err');
if(clients.some(c=>c.name.toLowerCase()===name.toLowerCase()&&c.id!=editId))return toast('Ce client existe déjà','err');
const em=g('email');if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))return toast('Adresse e-mail invalide','err');
const ph=g('phone');if(ph&&ph.replace(/\D/g,'').length<6)return toast('Numéro de téléphone trop court','err');
const okD=x=>{const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(x);if(!m)return false;const d=new Date(+m[3],m[2]-1,+m[1]);return d.getFullYear()==m[3]&&d.getMonth()==m[2]-1&&d.getDate()==+m[1]},fx=x=>okD(x)?x.replace(/^(\d)\//,'0$1/').replace(/\/(\d)\//,'/0$1/'):x;
const old=editId?clients.find(c=>c.id==editId).dates:[];let dates=[...new Set(g('dates').split('\n').map(x=>fx(x.trim())).filter(Boolean))];
const bad=dates.find(x=>!okD(x)&&!old.includes(x));if(bad)return toast(`Date de maintenance invalide : « ${bad} » (format JJ/MM/AAAA)`,'err');
if(dates.every(okD))dates.sort((a,b)=>{const k=x=>x.split('/').reverse().join('');return k(b)<k(a)?-1:1});
const since=fx(g('since'));if(since&&!okD(since)&&since!==(editId?clients.find(c=>c.id==editId).since:''))return toast('Date de mise en service invalide (format JJ/MM/AAAA)','err');
const fq=g('freq');if(fq&&!(/^\d+$/.test(fq)&&+fq>=1&&+fq<=120))return toast('Périodicité : un nombre de mois entre 1 et 120','err');
const o={name,type:g('type'),address:g('address'),contact:g('contact'),phone:ph,email:em,access:g('access'),power:g('power'),panels:g('panels'),inverter:g('inverter'),since,freq:fq,notes:g('notes'),dates};
editId?Object.assign(clients.find(c=>c.id==editId),o):clients.push({id:Date.now(),...o});saveClients();close();render();toast('Client enregistré')},
cdel:b=>{const id=b.dataset.id,n=plans.filter(p=>p.clientId==id&&p.status==='planned').length;ask('Supprimer ce client ? Les rapports déjà enregistrés sont conservés.'+(n?` ${n} intervention${n>1?'s':''} planifiée${n>1?'s':''} pour ce client ser${n>1?'ont':'a'} aussi supprimée${n>1?'s':''}.`:''),()=>{clients=clients.filter(c=>c.id!=id);if(n){plans=plans.filter(p=>!(p.clientId==id&&p.status==='planned'));savePlans()}form.ci='';saveClients();render()})},
cmerge:b=>{const src=clients.find(x=>x.id==b.dataset.id);if(!src)return;const others=clients.filter(x=>x.id!==src.id);dlg(`<h3>Fusionner « ${esc(src.name)} »</h3><p class="sdesc">Choisissez le client à conserver. Ses rapports resteront tels quels ; ce client-ci (« ${esc(src.name)} ») sera supprimé et son planning réattribué.</p><label>Conserver</label><select id="mrg">${others.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select><div class="row stick"><button class="btn ghost" data-a="close">Annuler</button><button class="btn ok" data-a="cmergego" data-id="${src.id}">Fusionner</button></div>`)},
cmergego:b=>{const src=clients.find(x=>x.id==b.dataset.id),tgtId=document.getElementById('mrg').value,tgt=clients.find(x=>x.id==tgtId);if(!src||!tgt)return;
tgt.dates=mergeDates(tgt.dates,src.dates);
['address','power','contact','phone','notes','email','type','access','panels','inverter','since','freq'].forEach(k=>{if(!tgt[k]&&src[k])tgt[k]=src[k]});
plans.forEach(p=>{if(p.clientId==src.id)p.clientId=tgt.id});savePlans();
clients=clients.filter(x=>x.id!==src.id);if(form.ci!==''&&clients[form.ci]&&clients[form.ci].id===src.id)form.ci='';saveClients();close();render();toast(`Fusionné dans « ${tgt.name} »`)},
delrep:b=>ask('Supprimer définitivement ce rapport ?',()=>{const id=b.dataset.id;reports=reports.filter(r=>r.id!=id);let ch=0;plans.forEach(p=>{if(p.reportId==id){delete p.reportId;ch=1}});if(ch)savePlans();saveReports();render()}),
start:()=>{if(!form.tech.trim())return toast('Nom du technicien requis','err');if(form.ci==='')return toast('Sélectionnez un client','err');
const P=procs.find(p=>p.id==form.pi&&p.status==='pub')||procs.find(p=>p.status==='pub');if(!P)return toast('Aucune procédure publiée','err');draft=newDraft(clients[form.ci],form.tech.trim(),P);drafts.unshift(draft);view='wiz';saveDraft(1);render();scrollTo(0,0)},
redit:b=>{const r=reports.find(x=>x.id==b.dataset.id);if(!r)return;draft=JSON.parse(JSON.stringify(r));draft.editOf=r.id;view='wiz';use(draft);goStep(0)},
resume:b=>{draft=drafts.find(x=>x.id==b.dataset.id);if(!draft)return toast('Introuvable','err');view='wiz';use(draft);goStep(draft.step)},dropdraft:b=>ask('Abandonner cette maintenance en pause ? Toute la saisie sera perdue.',()=>{const id=b.dataset.id;drafts=drafts.filter(x=>x.id!=id);if(draft&&draft.id==id){draft=null;view='home'}saveDraft(1);render()}),
st:b=>{const s=draft.steps[draft.step],j=+b.dataset.j;s.st[j]=b.dataset.k;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));b.closest('.line').classList.remove('miss');saveDraft()},
allok:()=>{const s=draft.steps[draft.step];s.st=s.st.map(()=>'ok');document.querySelectorAll('.line').forEach(l=>{l.classList.remove('miss');l.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x.dataset.k==='ok'))});saveDraft()},
phdel:b=>{draft.steps[draft.step].ph.splice(+b.dataset.k,1);$('#ph').innerHTML=phHTML();saveDraft(1)},
prev:()=>draft.step?goStep(draft.step-1):(draft.editOf&&(draft=null),view='home',render()),
chip:b=>{const s=draft.steps[draft.step],t=b.dataset.t,e=document.querySelector('[data-in="obs"]');s.obs=s.obs.trim()?s.obs.trim()+' ; '+t:t;if(e){e.value=s.obs;e.classList.remove('miss')}saveDraft()},
next:()=>{const i=draft.step,s=draft.steps[i],j=s.st.findIndex(v=>!v);
if(j>=0){toast('Renseignez chaque point de contrôle','err');const e=document.querySelector(`.line[data-j="${j}"]`);e.classList.add('miss');return e.scrollIntoView({block:'center'})}
if(STEPS[i].releve){if(!draft.prod.trim()||!draft.conso.trim())return toast('Saisissez les deux relevés de compteur','err');if(isNaN(numv(draft.prod))||isNaN(numv(draft.conso)))return toast('Relevé invalide : saisissez un nombre (ex : 12456,5)','err')}
if(s.st.some(v=>v==='ko'||v==='nc')&&s.obs.trim().length<4){toast('Décrivez le défaut ou le point non contrôlé en observation','err');const e=document.querySelector('[data-in="obs"]');e&&(e.classList.add('miss'),e.scrollIntoView({block:'center'}),e.focus());return}
const go=()=>i===STEPS.length-1?(draft.editOf?finishEdit():finish()):goStep(i+1);
if(STEPS[i].releve){const pv=prevReading();if(pv&&(numv(draft.prod)<pv.prod||numv(draft.conso)<pv.conso))return ask(`Un relevé est inférieur à celui de la visite précédente (production ${pv.prod} kWh, non-consommation ${pv.conso} kWh). Confirmer quand même ?`,go)}
go()},
exp:async b=>{const r=reports.find(x=>x.id==b.dataset.id);if(!r)return toast('Rapport introuvable : il a peut-être été supprimé','err');toast('Génération en cours…');try{const n=fname(r);b.dataset.f==='pdf'?dl(mkPdf(r),n+'.pdf'):b.dataset.f==='xls'?dl(await mkXls(r),n+'.xlsx'):dl(await mkDoc(r),n+'.docx')}catch(e){console.error(e);toast('Erreur : '+e.message,'err')}},
bk:b=>{const light=!!(b&&b.dataset&&b.dataset.l);dl(new Blob([snap(light)],{type:'application/json'}),`Sauvegarde_RL_${today().replace(/\//g,'-')}${light?'_sans-photos':''}.json`,()=>{ls.set('rl_lastbk',Date.now());ls.set('rl_sincebk',0);render()})}};
const A2={tab:b=>{admTab=b.dataset.t;render()},
pdup:b=>{const c=JSON.parse(JSON.stringify(procs.find(x=>x.id==b.dataset.id)));c.id=Date.now();c.title=uniqTitle(c.title+' (copie)');c.status='draft';c.ver=1;c.upd=today();procs.push(c);saveProcs();render();toast('Procédure dupliquée en brouillon')},
pdel:b=>ask('Supprimer cette procédure ? Les rapports déjà enregistrés sont conservés.',()=>{procs=procs.filter(x=>x.id!=b.dataset.id);saveProcs();render()}),
ddel:b=>ask('Supprimer ce document ? Il disparaîtra des procédures qui l\'utilisent.',()=>{const id=b.dataset.id;docs=docs.filter(x=>x.id!==id);procs.forEach(p=>{if((p.docs||[]).includes(id))p.docs=p.docs.filter(x=>x!==id);(p.steps||[]).forEach(s=>{if((s.docs||[]).includes(id))s.docs=s.docs.filter(x=>x!==id)})});saveDocs();saveProcs();render()}),
vdoc:b=>{const d=docs.find(x=>x.id===b.dataset.id);if(!d)return;const u=d.type==='pdf'?blobUrl(d.src):'';dlg(`<h3>${esc(d.title)}</h3>${d.desc?`<p class="sdesc">${esc(d.desc)}</p>`:''}<div class="zoom vw"${d.type==='pdf'?'':' data-a="zoom"'}>${d.type==='pdf'?`<iframe src="${u}"></iframe>`:`<img src="${d.src}" alt="">`}</div>${d.type==='pdf'?'':'<p class="hint">Touchez l\'image pour zoomer / dézoomer.</p>'}<div class="row">${u?`<a class="btn ghost" href="${u}" target="_blank" rel="noopener">Ouvrir à part</a>`:''}<button class="btn" data-a="close">Fermer</button></div>`,'wide')}};
Object.assign(A,A2);
const A3={cosave:()=>{const o={};document.querySelectorAll('[data-co]').forEach(i=>o[i.dataset.co]=i.value.trim());ls.set('rl_co',o);toast('Coordonnées enregistrées')},plf:b=>{plf=b.dataset.f;render()},plhf:b=>{plh=b.dataset.f;plAll=0;render()},plall:()=>{plAll=plAll?0:1;render()},plcancel:()=>{pl=null;close()},
pledit:b=>{const p=plans.find(x=>x.id==b.dataset.id);if(!perm(p?'plan_edit':'plan_add'))return toast('Action réservée : droit insuffisant','err');pl=p?JSON.parse(JSON.stringify(p)):{id:Date.now(),isNew:1,clientId:'',procId:(procs.find(x=>x.status==='pub')||{}).id,date:nowKey().slice(0,10),time:'08:00',tech:form.tech||'',notes:'',status:'planned',hist:[]};dlg(plHTML())},
plsave:()=>{const p=pl;if(!perm(plans.some(x=>x.id===p.id)?'plan_edit':'plan_add'))return toast('Action réservée : droit insuffisant','err');if(!p.clientId)return toast('Choisissez un client','err');if(!p.date||!p.time)return toast('Date et heure obligatoires','err');const o=plans.find(x=>x.id===p.id),{isNew,why,...d}=p;
if(o){if(o.date!==d.date||o.time!==d.time){(o.hist=o.hist||[]).push({w:today()+' '+z2(new Date().getHours())+':'+z2(new Date().getMinutes()),by:admin?'Admin':(form.tech||'Technicien'),from:o.date+' '+o.time,to:d.date+' '+d.time,why:why||''})}const h=o.hist;Object.assign(o,admin?d:{date:d.date,time:d.time},{hist:h,mod:today()})}else{d.hist=[];d.mod=today();plans.push(d)}
savePlans();pl=null;close();render();toast('Planning enregistré')},
pldel:b=>ask('Supprimer cette intervention planifiée ?',()=>{plans=plans.filter(x=>x.id!=b.dataset.id);savePlans();render()}),
plgo:b=>{const p=plans.find(x=>x.id==b.dataset.id);if(!p)return toast('Intervention introuvable','err');const ex=drafts.find(x=>x.planId==p.id);if(ex)return A.resume({dataset:{id:ex.id}});const i=clients.findIndex(c=>c.id==p.clientId);if(i<0)return toast('Client introuvable','err');
const P0=procs.find(x=>x.id==p.procId&&x.status==='pub'),P1=procs.find(x=>x.status==='pub');if(!P1)return toast('Aucune procédure publiée','err');
const go=()=>{form.ci=String(i);form.pi=(P0||P1).id;if(p.tech){form.tech=p.tech;ls.set('rl_tech',p.tech)}const before=draft;A.start();if(draft&&draft!==before){draft.planId=p.id;saveDraft(1)}};
P0?go():ask(`La procédure prévue n'est plus disponible (masquée ou supprimée). Démarrer avec « ${esc(P1.title)} » à la place ?`,go)}};
Object.assign(A,{fsave:()=>{if(!outF)return;anchorDl(outF,outF.name);close();outCb&&outCb()},fshare:async()=>{if(!outF)return;try{await navigator.share({files:[outF],title:outF.name});try{const a=(ls.get('rl_nosh',[])||[]).filter(x=>x!==shExt(outF.name));ls.set('rl_nosh',a)}catch{}close();outCb&&outCb()}catch(e){if(e&&e.name==='AbortError')return;const ex=shExt(outF.name);logErr('partage',(e&&e.name)+' : '+(e&&e.message)+' — '+outF.name+' ('+(outF.type||'type inconnu')+', '+outF.size+' o)');
if(SH_OK.includes(ex)){toast('Partage impossible ('+((e&&e.name)||'erreur')+') : utilisez « Enregistrer »','err');return}
try{const a=ls.get('rl_nosh',[])||[];if(!a.includes(ex))ls.set('rl_nosh',[...a,ex])}catch{}
const f=outF,cb=outCb;anchorDl(f,f.name);close();cb&&cb();toast('Ce navigateur ne permet pas de partager les fichiers .'+ex+' : le fichier est enregistré dans Téléchargements, partagez-le depuis « Fichiers ».','err')}},
diagshreset:()=>{try{localStorage.removeItem('rl_nosh')}catch{}render();toast('Le partage sera de nouveau proposé pour tous les types')}});
Object.assign(A,A3);
const A4={
pedit:b=>{const p=procs.find(x=>x.id==b.dataset.id);if(!p)return A.pchoose();pe=JSON.parse(JSON.stringify(p));peSnap=JSON.stringify(pe);peOpen=-1;view='pe';render();scrollTo(0,0)},
pchoose:()=>dlg(`<h3>Nouvelle procédure</h3><p class="sdesc">Comment voulez-vous commencer ?</p><div class="stack"><button class="btn big" data-a="pnew" data-m="blank">✏ Partir de zéro</button><button class="btn big ghost" data-a="pnew" data-m="std">📋 Depuis le modèle standard R.L ENERGIE</button>${procs.length?`<label>Ou copier une procédure existante</label><div class="row" style="flex-wrap:nowrap;margin:0"><select id="pcp" style="flex:1">${procs.map(x=>`<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select><button class="btn ghost" data-a="pnew" data-m="copy">Copier</button></div>`:''}</div><div class="row"><button class="btn ghost" data-a="close">Annuler</button></div>`),
pnew:b=>{const m=b.dataset.m;let steps,t='',c='';if(m==='std')steps=JSON.parse(JSON.stringify(DEF));else if(m==='copy'){const s=procs.find(x=>x.id==$('#pcp').value);if(!s)return toast('Choisissez une procédure','err');steps=JSON.parse(JSON.stringify(s.steps));c=s.cat||'';t=uniqTitle(s.title+' (copie)')}else steps=[{t:'',i:['']}];
pe={id:Date.now(),isNew:1,title:t,desc:'',cat:c,status:'draft',ver:1,docs:[],steps};peSnap=JSON.stringify(pe);peOpen=m==='blank'?0:-1;view='pe';close();render();scrollTo(0,0)},
pcancel:()=>{const go=()=>{pe=null;peOpen=-1;view='adm';admTab='p';render()};JSON.stringify(pe)===peSnap?go():ask('Abandonner les modifications de cette procédure ?',go)},
sopen:b=>{const k=+b.dataset.k;peOpen=peOpen===k?-1:k;render()},
sadd:()=>{pe.steps.push({t:'',i:['']});peOpen=pe.steps.length-1;render();const e=$('#app');e&&(e.scrollTop=e.scrollHeight)},
sdel:b=>{if(pe.steps.length<2)return toast('Une procédure doit garder au moins une étape','err');const k=+b.dataset.k;ask('Supprimer cette étape ?',()=>{pe.steps.splice(k,1);peOpen=-1;render()})},
sdup:b=>{const k=+b.dataset.k,c=JSON.parse(JSON.stringify(pe.steps[k]));c.t=(c.t||'Étape')+' (copie)';pe.steps.splice(k+1,0,c);peOpen=k+1;render()},
smv:b=>{const k=+b.dataset.k,d=+b.dataset.d,s=pe.steps;if(k+d<0||k+d>=s.length)return;[s[k],s[k+d]]=[s[k+d],s[k]];if(peOpen===k)peOpen=k+d;render()},
ptadd:b=>{const k=+b.dataset.k;(pe.steps[k].i=pe.steps[k].i||[]).push('');render();setTimeout(()=>{const l=document.querySelectorAll(`[data-pt][data-k="${k}"]`),e=l[l.length-1];e&&e.focus()},0)},
ptdel:b=>{pe.steps[+b.dataset.k].i.splice(+b.dataset.j,1);render()},
psave:()=>{if(!pe.title.trim())return toast('Le titre de la procédure est obligatoire','err');pe.steps.forEach(x=>x.i=(x.i||[]).map(v=>String(v).trim()).filter(Boolean));const bad=pe.steps.findIndex(x=>!(x.t||'').trim());if(bad>=0){peOpen=bad;render();return toast(`Étape ${bad+1} : titre manquant`,'err')}
if(procs.some(x=>x.id!==pe.id&&x.title.trim().toLowerCase()===pe.title.trim().toLowerCase()))return toast('Une procédure porte déjà ce titre','err');
pe.steps.forEach(x=>{x.refs=(x.refs||[]).filter(r=>r!=='tq');if(x.torque)x.refs.push('tq');if(!x.refs.length)delete x.refs});
const{isNew,...p}=pe,o=procs.find(x=>x.id===p.id);p.title=p.title.trim();p.upd=today();o?(p.ver=(o.ver||1)+1,Object.assign(o,p)):procs.push(p);saveProcs();pe=null;peOpen=-1;view='adm';admTab='p';close();render();scrollTo(0,0);toast(p.status==='pub'?'Procédure enregistrée et publiée : disponible tout de suite':'Procédure enregistrée en brouillon (masquée)')},
ppubt:b=>{const p=procs.find(x=>x.id==b.dataset.id);if(!p)return;p.status=p.status==='pub'?'draft':'pub';p.upd=today();saveProcs();render();toast(p.status==='pub'?'Procédure publiée':'Procédure masquée')},
dedit:b=>{const d=docs.find(x=>x.id===b.dataset.id);deTarget=null;de=d?{...d,procs:procs.filter(p=>(p.docs||[]).includes(d.id)).map(p=>String(p.id))}:{id:'d'+Date.now(),isNew:1,title:'',desc:'',cat:'',type:'image',src:'',procs:[]};deR()},
dnew:b=>{deTarget=b.dataset.k===undefined?'p':+b.dataset.k;de={id:'d'+Date.now(),isNew:1,title:'',desc:'',cat:'',type:'image',src:'',procs:[]};deR()},
dcancel:()=>{de=null;deTarget=null;close()},
dsave:()=>{if(!de.title.trim())return toast('Le titre est obligatoire','err');if(!de.src)return toast('Choisissez un fichier','err');const{isNew,procs:dp,...d}=de,o=docs.find(x=>x.id===d.id);o?Object.assign(o,d):docs.push(d);saveDocs();
if(deTarget!==null&&pe){const t=deTarget==='p'?pe:pe.steps[deTarget];if(t&&!(t.docs||[]).includes(d.id))(t.docs=t.docs||[]).push(d.id)}
else if(dp&&perm('proc_edit')){let ch=0;procs.forEach(p=>{const has=(p.docs||[]).includes(d.id),want=dp.includes(String(p.id));if(want&&!has){(p.docs=p.docs||[]).push(d.id);ch=1}else if(!want&&has){p.docs=p.docs.filter(x=>x!==d.id);ch=1}});if(ch)saveProcs()}
de=null;deTarget=null;close();render();toast('Document enregistré')},
wdocs:()=>{const P=procs.find(x=>x.id===draft.pid),mine=new Set([...pDocs(),...(P?P.steps:draft.def||[]).flatMap(s=>s.docs||[])]),a=docs.filter(d=>mine.has(d.id)),o=docs.filter(d=>!mine.has(d.id));dlg(`<h3>Documents</h3>${a.length?`<div class="refs"><b>Cette procédure</b>${a.map(d=>dbtn(d.id)).join('')}</div>`:''}${o.length?`<div class="refs"><b>Autres documents</b>${o.map(d=>dbtn(d.id)).join('')}</div>`:''}${docs.length?'':'<p>Aucun document.</p>'}<div class="row"><button class="btn" data-a="close">Fermer</button></div>`,'wide')},
/* catégories : k = 'p' (procédures) ou 'd' (documents) */
catnew:b=>{if(!catOk(b.dataset.k))return;catCtx={k:b.dataset.k,from:b.dataset.from||'',old:''};dlg(`<h3>Nouvelle catégorie</h3><input id="cn" placeholder="Ex : Onduleurs, Sécurité, Toiture…"><div class="row"><button class="btn ghost" data-a="catcancel">Annuler</button><button class="btn ok" data-a="catsave">Créer</button></div>`)},
catren:b=>{if(!catOk(b.dataset.k))return;catCtx={k:b.dataset.k,from:'',old:b.dataset.n};dlg(`<h3>Renommer la catégorie</h3><input id="cn" value="${esc(b.dataset.n)}"><div class="row"><button class="btn ghost" data-a="catcancel">Annuler</button><button class="btn ok" data-a="catsave">Renommer</button></div>`)},
catcancel:()=>{const f=catCtx&&catCtx.from;catCtx=null;f==='de'?deR():close()},
catsave:()=>{if(!catCtx||!catOk(catCtx.k))return;const{k,from,old}=catCtx,el=$('#cn'),n=(el&&el.value||'').trim();if(!n)return toast('Donnez un nom à la catégorie','err');
const ex=catList(k).find(c=>c.toLowerCase()===n.toLowerCase());
if(old){if(ex&&ex!==old)return toast('Cette catégorie existe déjà','err');(k==='p'?procs:docs).forEach(x=>{if(x.cat===old)x.cat=n});cats[k]=[...new Set([...cats[k].filter(c=>c!==old),n])];saveProcs();saveDocs()}
else{if(!ex)cats[k]=[...cats[k],n]}
saveCats();const name=ex&&!old?ex:n;catCtx=null;
if(from==='de'){de.cat=name;deR()}else{if(from==='pe')pe.cat=name;close();render()}
toast(old?'Catégorie renommée':ex?'Catégorie déjà existante : sélectionnée':'Catégorie créée')},
catdel:b=>{const{k,n}=b.dataset;if(!catOk(k))return;const c=catCount(k,n);ask(`Supprimer la catégorie « ${esc(n)} » ? ${c?c+' élément(s) passeront en « Sans catégorie ».':'Elle est vide.'}`,()=>{(k==='p'?procs:docs).forEach(x=>{if(x.cat===n)x.cat=''});cats[k]=cats[k].filter(x=>x!==n);saveProcs();saveDocs();saveCats();render()})}};
const catOk=k=>{if(perm(k==='p'?'proc_edit':'doc_edit'))return true;toast('Action réservée : droit insuffisant','err');return false};
Object.assign(A,A4);
/* Menu (☰) : accès direct à l'accueil, aux sections de Gestion autorisées et au mode administrateur */
Object.assign(A,{menu:()=>{const T=mgmt()?admTabs():[],ic={c:'👥',p:'📋',d:'📄',k:'🗂',s:'📅',r:'🔑',g:'🩺'};dlg(`<h3>Menu</h3><div class="stack"><button class="btn ghost" data-a="mhome">🏠 Accueil</button>${T.length?'<h4 class="grp">Gestion</h4>'+T.map(t=>`<button class="btn ghost" data-a="mtab" data-t="${t[0]}">${ic[t[0]]||'•'} ${esc(t[1])}</button>`).join(''):''}<h4 class="grp">Accès</h4><button class="btn" data-a="madmin">${admin?'🔓 Quitter le mode admin':'🔒 Mode administrateur'}</button></div><div class="row"><button class="btn ghost" data-a="close">Fermer</button></div>`)},mhome:()=>{close();A.home()},mtab:b=>{if(!mgmt())return;close();admTab=b.dataset.t;view='adm';render()},madmin:()=>{close();A.admin()}});
/* Droits : chaque action sensible est aussi vérifiée ici (pas seulement masquée à l'écran). '@' = administrateur seulement. */
Object.assign(A,{
diagcopy:async()=>{const t=diagTxt();try{await navigator.clipboard.writeText(t);toast('Rapport copié')}catch{const e=$('#dlog');if(e&&e.select){e.focus();e.select()}toast('Copie automatique impossible : le texte est sélectionné, fais « Copier » sur le téléphone','err')}},
diagclr:()=>{try{localStorage.removeItem('rl_log')}catch{}render();toast('Journal effacé')}});
const NEED={diagshreset:'diag',diagcopy:'diag',diagclr:'diag',cedit:'cli_edit',csave:'cli_edit',cdel:'cli_del',cmerge:'cli_del',cmergego:'cli_del',delrep:'rep_del',redit:'rep_edit',exp:'rep_exp',bk:'backup',cosave:'co_edit',pedit:'proc_edit',pchoose:'proc_edit',pnew:'proc_edit',psave:'proc_edit',pdup:'proc_edit',pdel:'proc_edit',ppubt:'proc_edit',sadd:'proc_edit',sdel:'proc_edit',sdup:'proc_edit',smv:'proc_edit',sopen:'proc_edit',ptadd:'proc_edit',ptdel:'proc_edit',dedit:'doc_edit',dnew:'doc_edit',dsave:'doc_edit',ddel:'doc_edit',pldel:'plan_del',pw:'@',pwsave:'@',rpre:'@'};
A.rpre=b=>{const f=RPRE[b.dataset.p];if(!f)return;ls.set('rl_rights',f());render();toast('Droits mis à jour')};
Object.keys(NEED).forEach(k=>{const f=A[k];A[k]=function(...x){if(NEED[k]==='@'?admin:perm(NEED[k]))return f.apply(this,x);toast('Action réservée : droit insuffisant','err')}});
let busy=0;
async function finishEdit(){if(busy)return;busy=1;try{const id=draft.editOf,i=reports.findIndex(x=>x.id===id);if(i<0)return;const{editOf,...clean}=draft,old=reports[i];clean.end=old.end;clean.mod={date:today()};reports[i]=clean;if(!(await saveReports())){reports[i]=old;return toast('Modification NON enregistrée : stockage insuffisant','err')}draft=null;view='home';render();toast('Rapport modifié')}finally{busy=0}}
async function finish(){if(busy)return;busy=1;try{const r=draft;r.end=today();reports.unshift(r);
if(!(await saveReports())){reports.shift();delete r.end;return toast('Rapport NON enregistré : stockage insuffisant. Faites une sauvegarde JSON puis libérez de la place.','err')}
drafts=drafts.filter(x=>x.id!==r.id);saveDraft(1);
try{anchorDl(mkPdf(r),fname(r)+'.pdf')}catch(e){console.error(e)}
try{const n=(+ls.get('rl_sincebk',0)||0)+1;ls.set('rl_sincebk',n);if(n>=5){anchorDl(new Blob([snap()],{type:'application/json'}),`Sauvegarde_auto_RL_${today().replace(/\//g,'-')}.json`);ls.set('rl_lastbk',Date.now());ls.set('rl_sincebk',0)}}catch(e){console.error(e)}
const c=clients.find(x=>x.id==r.client.id);if(c&&!c.dates.includes(r.start)){c.dates.unshift(r.start);c.dates=mergeDates(c.dates)}
if(r.planId){const p=plans.find(x=>x.id==r.planId);if(p){p.status='done';p.reportId=r.id;p.doneOn=r.end;savePlans()}}else{plans.push({id:Date.now()+1,clientId:r.client.id,procId:r.pid,date:nowKey().slice(0,10),time:nowKey().slice(11),tech:r.tech,notes:'',status:'done',reportId:r.id,doneOn:r.end,unplanned:1,hist:[],mod:today()});savePlans()}
saveClients();idb.del('draft');last=r;draft=null;view='done';render();scrollTo(0,0)}finally{busy=0}}
async function restore(d){if(!d||typeof d!=='object'||!(d.clients||d.reports||d.plans||d.procs||d.docs))throw new Error('format');const map={};let nc=0,nr=0;
(d.clients||[]).forEach((c,n)=>{const orig=c.id,x=norm(c,n),key=orig??x.id,o=clients.find(y=>y.name.toLowerCase()===x.name.toLowerCase());
if(o){map[key]=o.id;o.dates=mergeDates(o.dates,x.dates);['address','power','contact','phone','notes'].forEach(k=>{if(!o[k]&&x[k])o[k]=x[k]})}
else{if(clients.some(y=>y.id==x.id))x.id=Date.now()+n+Math.floor(Math.random()*1e4);map[key]=x.id;clients.push(x);nc++}});
(d.reports||[]).forEach(r=>{if(!reports.some(x=>x.id===r.id)){if(r.client&&map[r.client.id]!==undefined)r.client.id=map[r.client.id];reports.push(r);nr++}});
(d.procs||[]).forEach(p=>{if(!procs.some(x=>x.id===p.id))procs.push(p)});(d.docs||[]).forEach(x=>{if(!docs.some(y=>y.id===x.id))docs.push(x)});
(d.plans||[]).forEach(p=>{if(plans.some(x=>x.id===p.id))return;if(map[p.clientId]!==undefined)p.clientId=map[p.clientId];plans.push(p)});
(d.drafts||[]).forEach(x=>{if(drafts.some(y=>y.id===x.id))return;if(x.client&&map[x.client.id]!==undefined)x.client.id=map[x.client.id];drafts.push(x)});
if(d.cats&&typeof d.cats==='object'){['p','d'].forEach(k=>cats[k]=[...new Set([...cats[k],...(Array.isArray(d.cats[k])?d.cats[k]:[])])]);await saveCats()}
if(admin&&d.rights&&typeof d.rights==='object')ls.set('rl_rights',d.rights);
reports.sort((a,b)=>b.id-a.id);await Promise.all([savePlans(),saveProcs(),saveDocs(),saveReports(),saveClients()]);saveDraft(1);render();toast(`Sauvegarde restaurée (+${nc} client(s), +${nr} rapport(s))`)}

document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&A[b.dataset.a])A[b.dataset.a](b)});
document.addEventListener('input',e=>{const t=e.target,k=t.dataset.in;if(!k)return;
if(k==='tech'){form.tech=t.value;ls.set('rl_tech',t.value)}else if(k==='q')$('#hist').innerHTML=histHTML(t.value);
else if(draft){const s=draft.steps[draft.step];if(k==='obs')s.obs=t.value;else if(k==='torque'){s.torque=t.value;const q=$('#tqs');if(q)q.value=TQ.includes(t.value)?t.value:''}else draft[k]=t.value;saveDraft()}});
document.addEventListener('change',async e=>{const t=e.target,k=t.dataset.ch;if(!k)return;
if(k==='client'){form.ci=t.value;render()}else if(k==='proc'){form.pi=t.value}else if(k==='rt'){if(admin&&RKEYS.includes(t.dataset.k)){const R=rights();R[t.dataset.k]=t.checked?1:0;ls.set('rl_rights',R);toast('Droit mis à jour')}}else if(k==='dfile'&&t.files[0]){await readDoc(t.files[0]);deR()}
else if(k==='torque'){draft.steps[draft.step].torque=t.value;document.querySelector('[data-in="torque"]').value=t.value;saveDraft()}
else if(k==='photo'){const s=draft.steps[draft.step];for(const f of t.files){const p=await compress(f);p?s.ph.push(p):toast('Photo illisible : format non pris en charge','err')}t.value='';$('#ph').innerHTML=phHTML();saveDraft(1)}
else if(k==='restore'&&t.files[0]&&perm('backup')){try{await restore(JSON.parse(await t.files[0].text()))}catch(e){console.error(e);toast('Fichier invalide','err')}t.value=''}});
