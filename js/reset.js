'use strict';
/* R.L ENERGIE — E-mail de récupération + mot de passe oublié.
   - L'administrateur enregistre jusqu'à RS_MAX adresses e-mail (Gestion > Droits & accès). Chacune est VÉRIFIÉE par un code envoyé à cette adresse avant d'être ajoutée.
   - « Mot de passe oublié ? » demande l'adresse e-mail. Si (et seulement si) elle est identique à l'une des adresses de récupération enregistrées, un code à 8 chiffres
     est envoyé À CETTE ADRESSE SEULEMENT (pas aux autres). Si elle est différente, AUCUN mail ne part, mais l'écran, le message et les réponses sont identiques (un faux code est créé) :
     impossible de deviner l'adresse enregistrée, et personne ne peut se faire envoyer un code à sa propre adresse.
   Sécurité du code : crypto.getRandomValues, jamais stocké en clair (PBKDF2 + sel), RESET.ttl min, usage unique, RESET.maxTry essais puis annulé,
   délai entre deux demandes + plafond horaire (enregistrés : recharger la page ne les remet pas à zéro). Jamais affiché ni écrit dans la console. */
const RS_URL='https://api.emailjs.com/api/v1.0/email/send';
const rsOn=()=>!!(RESET.service&&RESET.template&&RESET.key);
const rsMissing=()=>['service','template','key'].filter(k=>!RESET[k]);
const rsWhy=()=>{const m=rsMissing();return m.length?`<p class="sdesc">Réglage(s) vide(s) dans js/config.js : <b>${m.join(', ')}</b>.</p><p class="sdesc">Si vous venez de les renseigner : fermez complètement l'application puis rouvrez-la (avec internet), ou réinstallez l'APK. L'ancienne configuration reste sinon en mémoire.</p>`:''};
/* Message d'erreur précis quand EmailJS refuse l'envoi : indique la vraie cause (statut + réponse d'EmailJS) au lieu d'un « vérifiez l'adresse » générique. */
const rsErr=(s,d)=>{const t=String(d||'').replace(/\s+/g,' ').trim().slice(0,90),e=s?(t?` (EmailJS ${s} : ${t})`:` (EmailJS ${s})`):'';
 if(s===403)return(/origin|domain/i.test(t)?"Envoi refusé (403) : EmailJS n'autorise pas ce site. Dans EmailJS > Account > Security, retirez la restriction de domaines ou ajoutez celui de l'app":"Envoi refusé par EmailJS (403) : dans EmailJS > Account > Security, autorisez les appels « non-navigateur » (utile pour l'APK)")+e;
 if(s===400||s===404)return'Envoi refusé par EmailJS : vérifiez Service ID, Template ID et Public Key dans js/config.js'+e;
 if(s===422)return"Envoi refusé par EmailJS : adresse du destinataire non reçue. Dans EmailJS > Email Templates, le champ « To Email » doit contenir exactement {{to_email}}"+e;
 if(s===412)return"Envoi refusé par EmailJS : le compte mail relié n'est plus autorisé. Dans EmailJS > Email Services, reconnectez-le"+e;
 if(s===429)return'EmailJS : trop de demandes ou quota atteint, réessayez plus tard'+e;
 if(s)return'Envoi impossible : EmailJS a répondu une erreur'+e;
 return"Envoi impossible : pas de réponse d'EmailJS, vérifiez la connexion internet puis réessayez"};
let rsBusy=0;
const rsCode=()=>{const a=new Uint32Array(1),lim=4294967296-4294967296%1e8;do crypto.getRandomValues(a);while(a[0]>=lim);return String(a[0]%1e8).padStart(8,'0')};
const rsDrop=()=>{try{localStorage.removeItem('rl_reset')}catch{}};
const rsEq=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&[...a].reduce((x,c,i)=>x|(c.charCodeAt(0)^b.charCodeAt(i)),0)===0;
const RS_MAX=5;
/* liste des adresses ; reprend l'ancien réglage à une seule adresse (rl_rmail) s'il existe */
const rsMails=()=>{let l=ls.get('rl_rmails',null);if(!Array.isArray(l)){const o=ls.get('rl_rmail',null);l=typeof o==='string'?[o]:[]}return[...new Set(l.filter(m=>typeof m==='string'&&rsValid(m)))].slice(0,RS_MAX)};
const rsSave=l=>{ls.set('rl_rmails',l);try{localStorage.removeItem('rl_rmail')}catch{}};
const rsValid=m=>m.length<=120&&/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;.]{2,}$/.test(m);
let rsAsk='';
/* Crée un code (p = 'reset' : adresse enregistrée ; 'mail' : nouvelle adresse à vérifier) et l'envoie par e-mail.
   send=false : mêmes vérifications, mêmes compteurs, même enregistrement (avec un faux code que personne ne connaît), mais AUCUN mail. Renvoie true si tout s'est bien passé. */
async function rsIssue(p,to,send=true){
 if(!rsOn()){toast("Envoi d'e-mail non activé : vide dans js/config.js → "+rsMissing().join(', '),'err');return false}
 if(!canSub()){toast('Récupération indisponible sur ce navigateur','err');return false}
 if(navigator.onLine===false){toast('Connexion internet nécessaire','err');return false}
 if(rsBusy)return false;
 const now=Date.now(),log=(ls.get('rl_rslog',[])||[]).filter(t=>typeof t==='number'&&now-t<3600000),wait=log.length?RESET.cool*1000-(now-Math.max(...log)):0;
 if(wait>0){toast(`Patientez ${Math.ceil(wait/1000)} s avant de redemander un code`,'err');return false}
 if(log.length>=RESET.maxSend){toast('Trop de demandes : réessayez dans une heure','err');return false}
 rsBusy=1;
 try{
  const code=rsCode(),s=crypto.getRandomValues(new Uint8Array(16)),h=await pbk(send?code:rsCode()+'x',s,PW_ITER);
  ls.set('rl_rslog',[...log,now]); /* la demande compte même si l'envoi échoue */
  ls.set('rl_reset',{p,to:p==='mail'?to:'',s:b2h(s),h,i:PW_ITER,exp:now+RESET.ttl*60000,t:0}); /* un nouveau code annule le précédent */
  let ok=!send,refus=0,det='';
  if(send)try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),15000);
   const r=await fetch(RS_URL,{method:'POST',headers:{'Content-Type':'application/json'},signal:ac.signal,body:JSON.stringify({service_id:RESET.service,template_id:RESET.template,user_id:RESET.key,template_params:{to_email:to,code,passcode:code,minutes:RESET.ttl,time:new Date(now+RESET.ttl*60000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),app:'R.L ENERGIE — Maintenance'}})});
   clearTimeout(tm);ok=!!r.ok;
   if(!ok){let x='';try{x=String(await r.text()).slice(0,200)}catch{}console.error('EmailJS a refusé la demande',r.status,x);refus=r.status;det=x}}catch(e){console.error('envoi e-mail impossible',e&&e.name,e&&e.message)}
  if(!ok){rsDrop();toast(rsErr(refus,det),'err');return false}
  return true;
 }finally{rsBusy=0}}
/* Vérifie un code saisi (essai compté AVANT la vérification, et enregistré). Renvoie l'enregistrement si bon, sinon null (message déjà affiché). */
async function rsCheck(p,c){
 const rec=ls.get('rl_reset',null);
 if(!rec||!rec.h||rec.p!==p||!(Date.now()<=rec.exp)){rsDrop();toast('Code expiré ou absent : demandez-en un nouveau','err');return null}
 if(c.length!==8){toast('Le code comporte 8 chiffres','err');return null}
 rec.t=(rec.t||0)+1;ls.set('rl_reset',rec);
 let ok=false;try{ok=canSub()&&rsEq(await pbk(c,h2b(rec.s),rec.i),rec.h)}catch(e){console.error(e)}
 if(ok)return rec;
 if(rec.t>=RESET.maxTry){rsDrop();close();toast("Trop d'erreurs : code annulé. Demandez-en un nouveau.",'err')}else toast(`Code incorrect (${RESET.maxTry-rec.t} essai(s) restant(s))`,'err');
 return null}
const rsForm=()=>dlg(`<h3>Code reçu par e-mail</h3><p class="sdesc">Si l'adresse saisie est bien l'adresse de récupération, un code à 8 chiffres vient de lui être envoyé (pensez aux indésirables). Saisissez-le, puis choisissez un nouveau mot de passe.</p><input id="rsc" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Code à 8 chiffres"><input id="rsn" type="password" autocomplete="new-password" placeholder="Nouveau mot de passe (6 caractères min.)"><input id="rsn2" type="password" autocomplete="new-password" placeholder="Confirmer le mot de passe"><div class="row"><button class="btn ghost" data-a="close">Annuler</button><button class="btn ghost" data-a="rssend">Renvoyer un code</button><button class="btn" data-a="rsok">Valider</button></div>`);
const rsBack='<button class="btn ghost" data-a="admin">Retour</button>';
Object.assign(A,{
/* ----- mot de passe oublié (depuis l'écran de connexion) ----- */
forgot:()=>{
 if(!rsOn())return dlg(`<h3>Mot de passe oublié</h3><p class="sdesc">La récupération par e-mail n'est pas encore activée sur cette application (voir LISEZ-MOI.txt, rubrique « Mot de passe oublié »).</p>${rsWhy()}<div class="row">${rsBack}</div>`);
 if(!rsMails().length)return dlg(`<h3>Mot de passe oublié</h3><p class="sdesc">Aucune adresse de récupération n'a encore été enregistrée. Pour en enregistrer une : se connecter en administrateur, puis Gestion &gt; Droits &amp; accès &gt; « E-mail de récupération ».</p><div class="row">${rsBack}</div>`);
 dlg(`<h3>Mot de passe oublié</h3><p class="sdesc">Saisissez l'adresse e-mail de récupération (ou votre adresse Gmail si c'est celle-là). Si elle correspond à celle enregistrée par l'administrateur, un code à usage unique, valable ${RESET.ttl} minutes, lui sera envoyé. Internet est nécessaire.</p><input id="rfe" type="email" inputmode="email" autocomplete="email" placeholder="adresse@exemple.fr"><div class="row">${rsBack}<button class="btn" data-a="rfsend">Envoyer le code</button></div>`)},
/* demande depuis l'écran « Mot de passe oublié » : le mail part seulement si l'adresse saisie = adresse enregistrée */
rfsend:async()=>{const e=String($('#rfe').value||'').trim().toLowerCase();
 if(!rsValid(e))return toast('Adresse e-mail invalide','err');
 rsAsk=e;return A.rssend()},
rssend:async()=>{const l=rsMails();if(!l.length||!rsAsk)return A.forgot();
 let m='';l.forEach(x=>{if(rsEq(rsAsk,x))m=x}); /* on parcourt toute la liste : pas d'arrêt anticipé */
 if(await rsIssue('reset',m,!!m)){rsForm();toast("Si l'adresse est la bonne, un code vient d'être envoyé (vérifiez aussi les indésirables)")}},
rsok:async()=>{
 const c=String($('#rsc').value||'').replace(/\D/g,''),p=$('#rsn').value||'',p2=$('#rsn2').value||'';
 if(p.length<6)return toast('Mot de passe trop court (6 caractères minimum)','err');
 if(p!==p2)return toast('Les deux mots de passe sont différents','err');
 if(rsBusy)return;rsBusy=1;
 try{const rec=await rsCheck('reset',c);if(!rec)return;
  ls.set('rl_pw',await pwMake(p));rsDrop();pwFail=0;pwLock=0;pwSave();close();toast('Mot de passe réinitialisé : connectez-vous');A.admin()
 }finally{rsBusy=0}},
/* ----- adresse de récupération (administrateur seulement) ----- */
rmail:()=>{if(!admin)return toast('Action réservée : droit insuffisant','err');rsMailDlg()},
rmsend:async()=>{if(!admin)return;const e=String($('#rme').value||'').trim().toLowerCase(),l=rsMails();
 if(!rsValid(e))return toast('Adresse e-mail invalide','err');
 if(l.includes(e))return toast('Cette adresse est déjà enregistrée','err');
 if(l.length>=RS_MAX)return toast(`${RS_MAX} adresses maximum : retirez-en une d'abord`,'err');
 if(await rsIssue('mail',e))dlg(`<h3>Vérification de l'adresse</h3><p class="sdesc">Saisissez le code à 8 chiffres envoyé à <b>${esc(e)}</b>.</p><input id="rmc" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Code à 8 chiffres"><div class="row"><button class="btn ghost" data-a="rmail">Annuler</button><button class="btn" data-a="rmok">Valider</button></div>`)},
rmok:async()=>{if(!admin)return;if(rsBusy)return;rsBusy=1;
 try{const rec=await rsCheck('mail',String($('#rmc').value||'').replace(/\D/g,''));if(!rec)return;
  if(!rsValid(rec.to||''))return toast('Adresse invalide','err');
  const l=rsMails();if(!l.includes(rec.to)&&l.length<RS_MAX)l.push(rec.to);
  rsSave(l);rsDrop();rsMailDlg();toast('Adresse de récupération ajoutée');
 }finally{rsBusy=0}},
rmdel:b=>{if(!admin)return toast('Action réservée : droit insuffisant','err');const l=rsMails(),m=l[+b.dataset.i];if(m===undefined)return;
 ask(`Retirer l'adresse <b>${esc(m)}</b> ?${l.length===1?' C\'est la dernière : « Mot de passe oublié » ne fonctionnera plus tant qu\'une adresse n\'est pas ajoutée.':''}`,()=>{if(!admin)return;rsSave(rsMails().filter(x=>x!==m));rsMailDlg();toast('Adresse retirée')})}});
/* écran de gestion des adresses (administrateur) */
const rsMailDlg=()=>{const l=rsMails();
 dlg(`<h3>E-mails de récupération</h3><p class="sdesc">${l.length?'Adresses enregistrées : chacune peut récupérer le mot de passe.':'Aucune adresse enregistrée.'} Pour en ajouter une, un code de vérification est d'abord envoyé à cette adresse (${RS_MAX} maximum).${rsOn()?'':' <b>Envoi d\'e-mail non activé : vide dans js/config.js → '+rsMissing().join(', ')+'.</b>'}</p>${l.map((m,i)=>`<div class="split"><span>${esc(m)}</span><button class="btn sm ko" data-a="rmdel" data-i="${i}">Retirer</button></div>`).join('')}${l.length<RS_MAX?'<input id="rme" type="email" inputmode="email" autocomplete="email" placeholder="Nouvelle adresse e-mail"><div class="row"><button class="btn ghost" data-a="close">Fermer</button><button class="btn" data-a="rmsend">Ajouter (envoyer le code)</button></div>':'<div class="row"><button class="btn ghost" data-a="close">Fermer</button></div>'}`)};

/* Rappel (une fois par session) : tant qu'aucune adresse de récupération n'est enregistrée, « Mot de passe oublié » ne peut rien faire */
let rsNag=0;const _login=A.login;
A.login=async function(...x){await _login.apply(this,x);if(admin&&!rsNag&&rsOn()&&!rsMails().length){rsNag=1;setTimeout(()=>toast('Pensez à enregistrer une adresse e-mail de récupération (Gestion > Droits & accès)'),1500)}};
