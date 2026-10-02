/* R.L ENERGIE - service worker : 100 % hors réseau (cache d'abord).
   Changer V à chaque nouvelle version : le nouveau jeu de fichiers est alors
   pré-chargé en entier avant de remplacer l'ancien. */
const V='rl-v25c',F=['./','index.html','style.css','js/core.js','js/config.js','js/data.js','js/state.js','js/ui.js','js/actions.js','js/reset.js','js/exports.js','js/boot.js','logo-data.js','libs/jspdf.umd.min.js','libs/jspdf.plugin.autotable.min.js','libs/exceljs.min.js','libs/docx.umd.js','docs/etiquettes.jpg','docs/ic60n.jpg','docs/nsx.jpg','docs/ins.jpg','docs/epanouisseur.jpg','manifest.json','icon-180.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(F)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const q=e.request;
  if(q.method!=='GET'||!q.url.startsWith(self.location.origin))return;
  e.respondWith(caches.match(q,{ignoreSearch:true}).then(hit=>{
    /* mise à jour discrète en arrière-plan si un réseau existe, sans jamais attendre */
    const net=fetch(q).then(r=>{if(r&&r.ok&&r.type==='basic'){const c=r.clone();caches.open(V).then(x=>x.put(q,c))}return r}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    return net.then(r=>r||(q.mode==='navigate'?caches.match('index.html'):Response.error()));
  }));
});
