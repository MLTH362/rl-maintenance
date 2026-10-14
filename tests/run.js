/* Lance tous les fichiers *.test.js et affiche un bilan. Usage : node tests/run.js */
const {spawnSync}=require('child_process'),fs=require('fs'),path=require('path');
let bad=0,total=0;
for(const f of fs.readdirSync(__dirname).filter(x=>x.endsWith('.test.js')).sort()){
  const r=spawnSync(process.execPath,[path.join(__dirname,f)],{encoding:'utf8',cwd:path.join(__dirname,'..')});
  const out=r.stdout||'';const m=out.match(/(\d+) OK \/ (\d+) KO/);
  console.log(`\n===== ${f} =====\n${out.trim()}`);
  if(r.stderr&&/Error/.test(r.stderr))console.log(r.stderr.split('\n').filter(l=>!/QuotaExceeded|node:internal|at /.test(l)).join('\n'));
  if(m){total+=+m[1]+ +m[2];bad+=+m[2]}if(r.status!==0)bad||bad++;
}
console.log(`\n${bad?'❌ ÉCHEC':'✅ TOUT PASSE'} — ${total} vérifications`);process.exit(bad?1:0);
