'use strict';
/* R.L ENERGIE — Utilitaires, stockage local (localStorage + IndexedDB), hash */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toLocaleDateString('fr-FR');
const BOOT=(()=>{try{const n=(+localStorage.getItem('rl_boots')||0)+1;localStorage.setItem('rl_boots',n);return n}catch{return 0}})(),STORE_OK=(()=>{try{localStorage.setItem('rl_t','1');return localStorage.getItem('rl_t')==='1'}catch{return false}})();
/* Journal des erreurs (Gestion > Diagnostic) : les 60 derniers incidents, sans aucune donnée secrète. */
const logErr=(k,m)=>{try{const a=JSON.parse(localStorage.getItem('rl_log')||'[]');a.push({t:Date.now(),k:String(k),m:String(m??'').replace(/\s+/g,' ').slice(0,300)});localStorage.setItem('rl_log',JSON.stringify(a.slice(-60)))}catch{}};
try{addEventListener('error',e=>logErr('erreur',(e.message||'?')+' ('+String(e.filename||'').split('/').pop()+':'+(e.lineno||0)+')'));addEventListener('unhandledrejection',e=>logErr('promesse',e.reason&&e.reason.message?(e.reason.name||'Erreur')+' : '+e.reason.message:String(e.reason)))}catch{}
try{if(console&&console.error){const _ce=console.error;console.error=(...a)=>{try{logErr('console',a.map(x=>x&&x.message?(x.name||'Erreur')+' : '+x.message:String(x)).join(' '))}catch{}return _ce.apply(console,a)}}}catch{}
const ls={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{toast('Stockage plein','err')}}};
const hash=s=>{let a=0xdeadbeef,b=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}a=Math.imul(a^a>>>16,2246822507)^Math.imul(b^b>>>13,3266489909);b=Math.imul(b^b>>>16,2246822507)^Math.imul(a^a>>>13,3266489909);return String(4294967296*(2097151&b)+(a>>>0))};
/* Mot de passe admin : PBKDF2-SHA256 + sel aléatoire si WebCrypto est disponible ; sinon ancien hash (repli). */
const PW_ITER=150000,canSub=()=>!!(globalThis.crypto&&crypto.subtle&&crypto.getRandomValues);
const b2h=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''),h2b=h=>new Uint8Array((h.match(/../g)||[]).map(x=>parseInt(x,16)));
const pbk=async(pw,salt,iter)=>{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);return b2h(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:iter},k,256))};
const pwMake=async pw=>{if(!canSub())return hash(pw);const s=crypto.getRandomValues(new Uint8Array(16));return{v:2,s:b2h(s),i:PW_ITER,h:await pbk(pw,s,PW_ITER)}};
const pwCheck=async pw=>{const st=ls.get('rl_pw',null);
if(st===null)return hash(pw)===hash('admin123');
if(typeof st==='string'){const ok=hash(pw)===st;if(ok&&canSub())try{ls.set('rl_pw',await pwMake(pw))}catch(e){console.error(e)}return ok}
if(st&&st.v===2){if(!canSub())throw new Error('WebCrypto indisponible');return(await pbk(pw,h2b(st.s),st.i))===st.h}
return false};
/* essais ratés et blocage : enregistrés, pour que recharger la page ne les remette pas à zéro */
const _pf0=ls.get('rl_pwf',null)||{};let pwFail=+_pf0.f||0,pwLock=+_pf0.l||0;const pwSave=()=>ls.set('rl_pwf',{f:pwFail,l:pwLock});
const idb=(()=>{let db;const open=()=>db||(db=new Promise((ok,ko)=>{const q=indexedDB.open('rl',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>ok(q.result);q.onerror=()=>ko(q.error)}));
const tx=async(m,f)=>{const d=await open();return new Promise((ok,ko)=>{const t=d.transaction('kv',m),q=f(t.objectStore('kv'));t.oncomplete=()=>ok(q.result);t.onerror=()=>ko(t.error);t.onabort=()=>ko(t.error||new Error('Transaction annulée'))})};
return{get:k=>tx('readonly',s=>s.get(k)),set:(k,v)=>tx('readwrite',s=>s.put(v,k)),del:k=>tx('readwrite',s=>s.delete(k))}})();
