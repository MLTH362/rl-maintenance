'use strict';
/* R.L ENERGIE — Exports PDF / Excel / Word
   Les rapports PDF et Word suivent la même trame :
   page de garde · synthèse (verdict, chiffres, informations, défauts, récapitulatif) · détail étape par étape (avec photos) · validation (signatures). */
const rgb=h=>[0,2,4].map(o=>parseInt(h.substr(o,2),16));

/* ---------- Données communes aux rapports ---------- */
/* Informations générales du rapport (PDF, Excel, Word) : lues dans la fiche client, donc modifiables dans Gestion > Clients.
   Si le client existe toujours, ses valeurs actuelles sont utilisées (même pour un ancien rapport) ; sinon celles enregistrées dans le rapport. */
const CINFO=['address','itype','power','grid','panels','inverter','integ','since','freq'];
const cinfo=r=>{const live=clients.find(c=>c.id==r.client.id)||clients.find(c=>c.name===r.client.name);const c=live?{...r.client,...Object.fromEntries(CINFO.map(k=>[k,live[k]||'']))}:{...r.client};c.itype=itypeNorm(c.itype);return c};
const ITLAB={'Vente totale':'Vente totale','Autoconsommation':'Autoconsommation','Les deux':'Autoconsommation et vente'};
/* prochaine maintenance = date de l'intervention + périodicité du client */
const nextOf=r=>{const c=cinfo(r);return c.freq&&typeof nextM==='function'?nextM({freq:c.freq,dates:[r.start]}):''};
/* référence du rapport : RM-AAAAMMJJ-nnn (date d'intervention + numéro) */
const refOf=r=>{const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(r.start||'');return 'RM-'+(m?m[3]+m[2].padStart(2,'0')+m[1].padStart(2,'0'):'00000000')+'-'+String((+r.id||0)%1000).padStart(3,'0')};
const infoGroups=r=>{const c=cinfo(r),v=x=>x||'—',nx=nextOf(r);return[
['Installation',[['Client',r.client.name],['Adresse',v(c.address)],["Type d'installation",v(ITLAB[c.itype])],['Puissance installée',v(c.power)],['Puissance de raccordement',v(c.grid)],['Panneaux photovoltaïques',v(c.panels)],['Onduleurs',v(c.inverter)],["Système d'intégration",v(c.integ)],...(c.since?[['Mise en service',c.since]]:[])]],
['Intervention',[['Procédure',r.proc||'Maintenance'],['Technicien',v(r.tech)],["Date d'intervention",v(r.start)],['Maintenance précédente',v(r.prev)],...(nx?[['Prochaine maintenance prévue',nx]]:[])]]]};
const infoRows=r=>infoGroups(r).flatMap(g=>g[1]);
/* totaux : conforme / défaut / non contrôlé / non renseigné */
const tally=r=>{use(r);const n={ok:0,ko:0,nc:0,na:0,total:0};STEPS.forEach((c,i)=>c.i.forEach((_,j)=>{const k=r.steps[i].st[j]||'';n.total++;n[k==='ok'||k==='ko'||k==='nc'?k:'na']++}));return n};
const uncontrolled=r=>{const o=[];STEPS.forEach((c,i)=>c.i.forEach((x,j)=>r.steps[i].st[j]==='nc'&&o.push([`${i+1}. ${c.t}`,x])));return o};
/* défauts pour le PDF / Word : l'observation d'une étape n'est écrite qu'une fois même si plusieurs points sont en défaut */
const defectsG=r=>{let last='';return defects(r).map(x=>{const dup=x[0]===last&&x[2]!=='—';last=x[0];return dup?[x[0],x[1],'Idem (voir ci-dessus)']:x})};
/* résultat d'une étape */
const stepRes=(r,i)=>{const c=STEPS[i],ks=c.i.map((_,j)=>r.steps[i].st[j]||'');if(!ks.length)return c.releve?'m':'nc';if(ks.includes('ko'))return'ko';if(ks.includes(''))return'na';const ok=ks.filter(k=>k==='ok').length;return ok===ks.length?'ok':ok?'p':'nc'};
const RES={ok:{l:'Conforme',c:COL.ok,b:LIGHT.ok},ko:{l:'Défaut',c:COL.ko,b:LIGHT.ko},nc:{l:'Non contrôlé',c:COL.nc,b:LIGHT.nc},m:{l:'Relevé',c:COL.m,b:LIGHT.m},p:{l:'Partiel',c:'8A5A00',b:'FBF3D5'},na:{l:'Incomplet',c:'8A5A00',b:'FBF3D5'}};
const plur=(n,a,b)=>n>1?b:a;
/* phrase de conclusion (même texte dans le PDF et le Word) */
const verdict=r=>{const t=tally(r),k=t.ko,rest=t.nc+t.na;
const reste=rest?` ${rest} point${plur(rest,'','s')} ${plur(rest,"n'a pas été contrôlé ou renseigné","n'ont pas été contrôlés ou renseignés")}.`:'';
if(k)return{k:'ko',t:`${k} défaut${plur(k,'','s')} constaté${plur(k,'','s')}`,s:`Sur ${t.total} points de contrôle, ${t.ok} ${plur(t.ok,'est conforme','sont conformes')} et ${k} ${plur(k,'est en défaut','sont en défaut')}. ${plur(k,'Ce défaut est détaillé','Ces défauts sont détaillés')} dans la section Défauts constatés ci-après ; une action corrective est à prévoir.`+reste};
if(!rest)return{k:'ok',t:'Installation conforme',s:t.total?`L'ensemble des ${t.total} points de contrôle prévus est conforme. Aucun défaut n'a été relevé lors de l'intervention.`:'Aucun point de contrôle.'};
return{k:'p',t:'Aucun défaut constaté',s:`Aucun défaut n'a été relevé sur les points contrôlés (${t.ok} conforme${plur(t.ok,'','s')} sur ${t.total}).`+reste}};
/* paragraphe d'introduction de la synthèse */
const introOf=r=>{const c=cinfo(r),t=tally(r);return `Le présent rapport rend compte de l'intervention de maintenance${r.start?' réalisée le '+r.start:''}${r.tech?' par '+r.tech:''} sur l'installation de ${r.client.name}${c.address?' ('+c.address+')':''}. Elle a porté sur ${t.total} point${plur(t.total,'','s')} de contrôle répartis en ${STEPS.length} étape${plur(STEPS.length,'','s')}.`};
const VCOL={ok:{c:COL.ok,b:LIGHT.ok},ko:{c:COL.ko,b:LIGHT.ko},p:{c:'8A5A00',b:'FBF3D5'}};
/* nombre d'étapes avec photos, total de photos */
const nPh=r=>STEPS.reduce((n,_,i)=>n+(r.steps[i].ph||[]).length,0);

/* ---------- PDF ---------- */
/* La police standard du PDF ne connaît que le jeu Windows-1252 : tout autre caractère est remplacé pour ne jamais produire de signes illisibles. */
const SYM={'≈':'~','≥':'>=','≤':'<=','→':'->','←':'<-','✔':'','✓':'','✗':'x','✘':'x','≠':'!=','−':'-','′':"'",'″':'"','\u00a0':' '};
const S=t=>String(t??'').replace(/[≈≥≤→←✔✓✗✘≠−′″\u00a0]/g,c=>SYM[c]).replace(/[\u202f\u2007\u2009\u200a\u200b\ufe0f]/g,' ').replace(/[\u2010-\u2012]/g,'-').replace(/[^\n\x20-\x7e\xa1-\xff\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2022\u2026\u20ac\u0152\u0153\u0160\u0161\u0178\u017d\u017e]/g,'').replace(/ {2,}/g,' ');
const PDK=[38,40,43],PAM=[242,169,31],PGR=[90,94,100],PCR=[244,243,238],PLN=[214,218,224];
function cover(d,r,W,M){const c=CO(),K=PDK,A=PAM,G=PGR,T=(t,x,y,sz,col,b,o)=>{d.setFont('helvetica',b?'bold':'normal');d.setFontSize(sz);d.setTextColor(...col);d.text(S(t),x,y,o)};
d.setFillColor(...PCR);d.rect(0,0,W,297,'F');d.setFillColor(...A);d.rect(0,0,W,6,'F');
if(LOGOWM){const h=255,w=h*LOGO.w/LOGO.h;d.addImage(LOGOWM,'PNG',(W-w)/2,25,w,h,'rlwm','FAST')}
if(LOGO){const h=60;d.addImage(LOGO.d,'PNG',M,18,h*LOGO.w/LOGO.h,h,'rllogo','FAST')}else{T(c.name,M,44,40,K,1);T(c.tag||'',M,56,13,G)}
T('Réf. '+refOf(r),W-M,24,9,G,0,{align:'right'});
d.setFillColor(...A);d.rect(M,112,30,2.5,'F');T('RAPPORT DE MAINTENANCE',M,128,26,K,1);T(r.proc||'Maintenance',M,138,14,G);
d.setFont('helvetica','bold');d.setFontSize(20);d.setTextColor(...K);let y=158;d.splitTextToSize(S(r.client.name),W-2*M).slice(0,3).forEach(t=>{d.text(t,M,y);y+=9});
const ci=cinfo(r);if(ci.address){d.setFont('helvetica','normal');d.setFontSize(12);d.setTextColor(...G);d.splitTextToSize(S(ci.address),W-2*M).slice(0,2).forEach(t=>{d.text(t,M,y);y+=6});y+=2}
y=Math.max(y+8,190);[[["Date d'intervention",r.start],['Technicien',r.tech]],[['Puissance installée',ci.power||'—'],['Maintenance précédente',r.prev]]].forEach(row=>{row.forEach((p,i)=>{T(p[0].toUpperCase(),M+i*90,y,8,G,1);T(String(p[1]||'—'),M+i*90,y+6,12,K)});y+=18});
d.setFillColor(...K);d.rect(0,247,W,50,'F');d.setFillColor(...A);d.rect(0,247,W,2,'F');
const put=(x,lab,L)=>{L=L.filter(Boolean);if(!L.length)return;T(lab,x,259,8,A,1);d.setFont('helvetica','normal');d.setFontSize(10);d.setTextColor(255,255,255);let q=266;L.forEach(l=>d.splitTextToSize(S(l),56).forEach(t=>{d.text(t,x,q);q+=5}))};
put(M,'ENTREPRISE',[c.name,c.addr,[c.zip,c.city].filter(Boolean).join(' ')]);put(80,'CONTACT',[c.tel&&'Tél. '+c.tel,c.mail]);put(145,'INFORMATIONS',[c.web,c.siret&&'SIRET '+c.siret])}

function mkPdf(r){use(r);const{jsPDF}=window.jspdf,d=new jsPDF({unit:'mm',format:'a4',compress:true}),W=210,M=15,TOP=28,BOT=278,K=PDK,A=PAM,G=PGR,CW=W-2*M,t=tally(r),V=verdict(r),ref=refOf(r),co=CO();
d.setProperties({title:S(`Rapport de maintenance - ${r.client.name}`),subject:S(r.proc||'Maintenance'),author:'R.L ENERGIE',creator:'R.L ENERGIE - Suivi de maintenance',keywords:ref});
const tx=(s,x,y,sz,col,b,o)=>{d.setFont('helvetica',b?'bold':'normal');d.setFontSize(sz);d.setTextColor(...col);d.text(S(s),x,y,o)};
let y=TOP;const room=h=>{if(y+h>BOT){d.addPage();y=TOP;return true}return false};
/* titre de section : barre ambre + intitulé */
const sec=(s,h=14)=>{room(h);d.setFillColor(...A);d.rect(M,y,1.6,6.5,'F');tx(s,M+4.5,y+5,13,K,1);y+=11};
const Q=rows=>rows.map(l=>l.map(c=>c&&typeof c==='object'?{...c,content:S(c.content)}:S(c)));
/* tableau : même style partout ; gap = espace laissé dessous */
const tOpts=(o,sy)=>({theme:'grid',margin:{left:M,right:M,top:TOP,bottom:20},styles:{font:'helvetica',fontSize:9.5,cellPadding:{top:2.3,bottom:2.3,left:3,right:3},lineColor:PLN,lineWidth:.2,textColor:30,valign:'middle',overflow:'linebreak'},headStyles:{fillColor:K,textColor:255,fontStyle:'bold'},rowPageBreak:'avoid',...o,head:o.head&&Q(o.head),body:Q(o.body||[]),startY:sy});
const tbl=(o,gap=7)=>{d.autoTable(tOpts(o,y));y=d.lastAutoTable.finalY+gap};
/* hauteur exacte qu'occuperait un tableau (sans le dessiner) */
const tH=o=>{const s=new jsPDF({unit:'mm',format:[210,3000]});s.autoTable({...tOpts(o,0),didParseCell:undefined,margin:{left:M,right:M,top:0,bottom:0}});return s.lastAutoTable.finalY};
const box=(x,yy,w,h,fill,line)=>{d.setFillColor(...fill);if(line){d.setDrawColor(...line);d.setLineWidth(.25)}d.roundedRect(x,yy,w,h,1.8,1.8,line?'FD':'F')};

/* ===== 1. Page de garde ===== */
cover(d,r,W,M);

/* ===== 2. Synthèse ===== */
d.addPage();y=TOP;
tx("Synthèse de l'intervention",M,y+6,20,K,1);y+=14;
/* introduction */
{d.setFont('helvetica','normal');d.setFontSize(10);d.setTextColor(...K);const L=d.splitTextToSize(S(introOf(r)),CW);d.text(L,M,y);y+=L.length*4.8+5}
/* résultat (bloc unique : conclusion + chiffres) */
{const vc=VCOL[V.k],c=rgb(vc.c),pc=n=>t.total?Math.round(n/t.total*100):0;d.setFont('helvetica','normal');d.setFontSize(9.5);const L=d.splitTextToSize(S(V.s),CW-14),
cnt=[`Conformes : ${t.ok} (${pc(t.ok)} %)`,`Défauts : ${t.ko} (${pc(t.ko)} %)`,`Non contrôlés : ${t.nc}`,...(t.na?[`Non renseignés : ${t.na}`]:[]),...(nPh(r)?[`${nPh(r)} photo${plur(nPh(r),'','s')}`]:[])].join('  ·  '),
h=19+L.length*4.6+7;room(h+6);box(M,y,CW,h,PCR,PLN);d.setFillColor(...A);d.rect(M,y,1.6,h,'F');tx('RÉSULTAT',M+8,y+6.5,7.5,G,1);tx(V.t,M+8,y+12.8,12,K,1);d.setFont('helvetica','normal');d.setFontSize(9.5);d.setTextColor(...K);d.text(L,M+8,y+19);tx(cnt,M+8,y+19+L.length*4.6+1.5,8.5,G);y+=h+7}
/* informations */
infoGroups(r).forEach(g=>{sec(g[0],24);tbl({body:g[1],columnStyles:{0:{fontStyle:'bold',fillColor:[251,243,213],cellWidth:58}}},6)});
/* relevés */
if(r.prod||r.conso){sec('Relevés des compteurs',26);tbl({head:[['Compteur de production','Compteur de non-consommation']],body:[[(r.prod||'—')+' kWh',(r.conso||'—')+' kWh']],styles:{halign:'center',fontSize:11,fontStyle:'bold'},headStyles:{fillColor:K,textColor:255,halign:'center',fontSize:9}})}
/* défauts */
const ko=defectsG(r);sec('Défauts constatés',26);
if(ko.length)tbl({head:[['Étape','Point de contrôle','Observation']],body:ko,columnStyles:{0:{cellWidth:56},1:{cellWidth:44}},headStyles:{fillColor:rgb(COL.ko),textColor:255}});
else{box(M,y,CW,11,PCR,PLN);d.setFillColor(...rgb(COL.ok));d.rect(M,y,1.6,11,'F');tx("Aucun défaut constaté lors de l'intervention.",M+8,y+7,10,K,0);y+=18}
/* points non contrôlés */
const nc=uncontrolled(r);if(nc.length){sec('Points non contrôlés',26);tbl({head:[['Étape','Point de contrôle']],body:nc,columnStyles:{0:{cellWidth:90}},headStyles:{fillColor:rgb(COL.nc),textColor:255}})}
/* récapitulatif des étapes */
sec('Récapitulatif des étapes',30);
tbl({head:[['N°','Étape','Conformes','Photos','Résultat']],body:STEPS.map((c,i)=>{const L=c.i.length,ok=c.i.filter((_,j)=>r.steps[i].st[j]==='ok').length;return[String(i+1),c.t,L?`${ok} / ${L}`:'—',String((r.steps[i].ph||[]).length||'—'),RES[stepRes(r,i)].l]}),
columnStyles:{0:{cellWidth:11,halign:'center'},2:{cellWidth:24,halign:'center'},3:{cellWidth:18,halign:'center'},4:{cellWidth:30,halign:'center',fontStyle:'bold'}},
didParseCell:h=>{if(h.section==='head'&&h.column.index!==1)h.cell.styles.halign='center';if(h.section==='body'&&h.column.index===4)h.cell.styles.textColor=rgb(RES[stepRes(r,h.row.index)].c)}});

/* ===== 3. Détail des contrôles ===== */
d.addPage();y=TOP;tx('Détail des contrôles',M,y+6,20,K,1);y+=14;
STEPS.forEach((c,i)=>{const p=r.steps[i],L=lines(r,i),res=stepRes(r,i),R=RES[res],ph=p.ph||[];
const nl=L.length;
const stOpt={head:[[{content:`${i+1}.  ${c.t}`,styles:{fontSize:10.5}},{content:R.l,styles:{halign:'center',fillColor:rgb(R.c),textColor:255}}],...(nl?[[{content:'Point de contrôle',styles:{fillColor:[236,239,243],textColor:PGR,fontSize:8}},{content:'Statut',styles:{fillColor:[236,239,243],textColor:PGR,fontSize:8,halign:'center'}}]]:[])],
body:[...L.map(l=>[l.d,{content:LBL[l.k],styles:{halign:'center',fontStyle:'bold'}}]),
[{content:'OBSERVATIONS',colSpan:2,styles:{fillColor:[251,243,213],fontSize:7.5,fontStyle:'bold',textColor:[110,84,10],cellPadding:{top:1.6,bottom:1.6,left:3,right:3}}}],
[{content:p.obs||'RAS',colSpan:2,styles:{textColor:p.obs?30:[130,130,130]}}]],
columnStyles:{1:{cellWidth:34}},
didParseCell:h=>{if(h.section==='body'&&h.column.index===1&&h.row.index<nl)h.cell.styles.textColor=rgb(COL[L[h.row.index].k||'nc'])}};
/* une étape qui tient sur une page n'est jamais coupée en deux ; sinon (très longue) on exige au moins l'en-tête et 3 lignes */
{const hh=tH(stOpt);if(hh<=BOT-TOP&&BOT-y<45){if(y+hh>BOT){d.addPage();y=TOP}}else room(41)}
tbl(stOpt,ph.length?4:8);
/* photos : 2 par ligne, légendées, centrées dans un cadre */
if(ph.length){const cw=(CW-6)/2,MAXH=64,CAP=7;let k=0,first=true;
while(k<ph.length){const row=ph.slice(k,k+2).map(q=>{const f=Math.min((cw-4)/q.w,MAXH/q.h);return{q,w:q.w*f,h:q.h*f}}),rh=Math.max(...row.map(o=>o.h))+4;
if(room(rh+CAP+(first?6:12))){tx(`${i+1}. ${c.t} (suite) — photos`,M,y+3,8,G,1);y+=8}else if(first){tx('PHOTOS',M,y+2.5,7.5,G,1);y+=5}first=false;
row.forEach((o,j)=>{const x=M+j*(cw+6);d.setDrawColor(...PLN);d.setLineWidth(.25);d.setFillColor(250,250,250);d.rect(x,y,cw,rh,'FD');d.addImage(o.q.d,'JPEG',x+(cw-o.w)/2,y+(rh-o.h)/2,o.w,o.h);tx(`Photo ${k+j+1} / ${ph.length}`,x,y+rh+4.2,8,G)});
y+=rh+CAP;k+=2}
y+=2}});

/* ===== 4. Mention finale ===== */

/* ===== En-têtes et pieds de page (hors page de garde) ===== */
const n=d.getNumberOfPages();
for(let i=2;i<=n;i++){d.setPage(i);
if(LOGO)d.addImage(LOGO.d,'PNG',M,7,12*LOGO.w/LOGO.h,12,'rllogo','FAST');
tx('RAPPORT DE MAINTENANCE',W-M,11.5,8,[170,112,0],1,{align:'right'});{let nm=S(`${r.client.name} · ${r.start}`);d.setFont('helvetica','normal');d.setFontSize(9);while(nm.length>8&&d.getTextWidth(nm)>CW-30)nm=nm.slice(0,-2);if(nm!==S(`${r.client.name} · ${r.start}`))nm=nm.trimEnd()+'…';tx(nm,W-M,16.5,9,K,0,{align:'right'})}
d.setDrawColor(...A);d.setLineWidth(.7);d.line(M,21.5,W-M,21.5);
d.setDrawColor(...PLN);d.setLineWidth(.25);d.line(M,285,W-M,285);
tx(`${co.name} — ${ref}`,M,290,8,G);tx([co.tel,co.web].filter(Boolean).join('  ·  '),W/2,290,8,G,0,{align:'center'});tx(`Page ${i-1} / ${n-1}`,W-M,290,8,G,0,{align:'right'})}
return d.output('blob')}

async function mkXls(r){const wb=new ExcelJS.Workbook(),s=stats(r);wb.creator='R.L ENERGIE';
const fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:'FF'+c}}),bd={style:'thin',color:{argb:'FFCDD5E0'}},B={top:bd,left:bd,bottom:bd,right:bd},hd=(ro)=>ro.eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill=fill('111111');c.border=B;c.alignment={vertical:'middle',horizontal:'center',wrapText:true}});
const y=wb.addWorksheet('Synthèse',{views:[{showGridLines:false}]});y.columns=[{width:34},{width:48}];y.mergeCells('A1:B1');const t=y.getCell('A1');t.value='R.L ENERGIE — Rapport de maintenance';t.font={bold:true,size:16,color:{argb:'FFFFFFFF'}};t.fill=fill('111111');t.alignment={vertical:'middle',indent:1};y.getRow(1).height=34;
[...infoRows(r),['Points conformes',s.ok],['Défauts constatés',s.ko],['Points non contrôlés',s.nc],['Relevé production (kWh)',r.prod||'—'],['Relevé non-consommation (kWh)',r.conso||'—']].forEach((v,k)=>{const ro=y.getRow(3+k);ro.values=v;ro.height=22;ro.eachCell(c=>{c.border=B;c.alignment={vertical:'middle',horizontal:'left',indent:1}});ro.getCell(1).font={bold:true};ro.getCell(1).fill=fill('FBF3D5')});
{const q=3+infoRows(r).length;y.getCell('B'+q).fill=fill(LIGHT.ok);y.getCell('B'+(q+1)).fill=fill(LIGHT.ko);y.getCell('B'+(q+2)).fill=fill(LIGHT.nc)}
const w=wb.addWorksheet('Détail',{views:[{state:'frozen',ySplit:1}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
w.columns=[{header:'N°',width:6},{header:'Étape',width:38},{header:'Point de contrôle',width:46},{header:'Statut',width:16},{header:'Observations',width:60}];hd(w.getRow(1));w.getRow(1).height=26;
let n=2;STEPS.forEach((c,i)=>{const L0=lines(r,i),L=L0.length?L0:[{d:'(aucun point de contrôle)',k:'',x:1}],a=n,ob=r.steps[i].obs||'RAS';L.forEach(l=>{const ro=w.addRow([i+1,c.t,l.d,l.x?'—':LBL[l.k],ob]);ro.height=24;ro.eachCell(x=>{x.border=B;x.alignment={vertical:'middle',wrapText:true}});ro.getCell(1).alignment={vertical:'middle',horizontal:'center'};
const st=ro.getCell(4);st.fill=fill(LIGHT[l.k||'nc']);st.font={bold:true,color:{argb:'FF'+COL[l.k||'nc']}};st.alignment={vertical:'middle',horizontal:'center'};n++});
if(L.length>1)['A','B','E'].forEach(k=>w.mergeCells(`${k}${a}:${k}${n-1}`))});
const ko=defects(r);if(ko.length){const f=wb.addWorksheet('Défauts');f.columns=[{header:'Étape',width:44},{header:'Point de contrôle',width:44},{header:'Observation',width:60}];hd(f.getRow(1));ko.forEach(v=>{const ro=f.addRow(v);ro.eachCell(c=>{c.border=B;c.alignment={vertical:'middle',wrapText:true}})})}
return new Blob([await wb.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}

/* ---------- Word ---------- */
async function mkDoc(r){use(r);const D=window.docx,{Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,ShadingType,ImageRun,AlignmentType,Footer,Header,PageNumber,BorderStyle,VerticalAlign,TableLayoutType,HeightRule,SectionType,LineRuleType,TabStopType}=D,
t=tally(r),V=verdict(r),ref=refOf(r),co=CO(),FONT='Calibri',CW=9638,DK='26282B',AMB='F2A91F',GR='5A5E64',LN='D6DAE0';
const u8=d=>Uint8Array.from(atob(d.split(',')[1]),c=>c.charCodeAt(0)),fillOf=c=>({type:ShadingType.CLEAR,fill:c,color:'auto'});
const runs=(s,o={})=>String(s??'').split('\n').map((l,i)=>new TextRun({text:l,font:FONT,size:20,...o,...(i?{break:1}:{})}));
const P=(s,o={},p={})=>new Paragraph({...p,children:runs(s,o)});
const SP=h=>new Paragraph({spacing:{before:0,after:0,line:h,lineRule:LineRuleType.EXACT},children:[]});
const bd=(c=LN,sz=4)=>({style:BorderStyle.SINGLE,size:sz,color:c}),NB={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
const BOX={top:bd(),bottom:bd(),left:bd(),right:bd()},NOB={top:NB,bottom:NB,left:NB,right:NB};
/* cellule : contenu = texte ou liste de paragraphes */
const C=(content,w,o={})=>new TableCell({width:{size:w,type:WidthType.DXA},columnSpan:o.span,shading:o.fill?fillOf(o.fill):undefined,verticalAlign:o.va||VerticalAlign.CENTER,borders:o.borders||BOX,margins:{top:o.mt??70,bottom:o.mb??70,left:o.ml??110,right:o.mr??110},
children:Array.isArray(content)?content:[P(content,{bold:o.b,color:o.color,size:o.size||20,italics:o.i},{alignment:o.al,keepNext:o.kn,spacing:{before:0,after:0}})]});
const ROW=(cells,o={})=>new TableRow({cantSplit:true,tableHeader:o.head,height:o.h?{value:o.h,rule:o.rule||HeightRule.ATLEAST}:undefined,children:cells});
const TBL=(W,rows,o={})=>new Table({width:{size:W.reduce((a,b)=>a+b,0),type:WidthType.DXA},columnWidths:W,layout:TableLayoutType.FIXED,borders:o.borders||{top:bd(),bottom:bd(),left:bd(),right:bd(),insideHorizontal:bd(),insideVertical:bd()},indent:o.indent,rows});
const NOBT={top:NB,bottom:NB,left:NB,right:NB,insideHorizontal:NB,insideVertical:NB};
/* titre de section : filet ambre à gauche */
const H1=s=>new Paragraph({keepNext:true,keepLines:true,spacing:{before:300,after:130},indent:{left:150},border:{left:{style:BorderStyle.SINGLE,size:24,color:AMB,space:8}},children:[new TextRun({text:s,font:FONT,bold:true,size:27,color:DK})]});
const PT=s=>new Paragraph({keepNext:true,spacing:{before:0,after:200},children:[new TextRun({text:s,font:FONT,bold:true,size:44,color:DK})]});


/* ===== Page de garde ===== */
const ci=cinfo(r),logoRun=LOGO?new ImageRun({data:u8(LOGO.d),type:'png',transformation:{width:Math.round(130*LOGO.w/LOGO.h),height:130}}):null;
const wm=LOGOWM?new ImageRun({data:u8(LOGOWM),type:'png',transformation:{width:Math.round(880*LOGO.w/LOGO.h),height:880},floating:{horizontalPosition:{relative:D.HorizontalPositionRelativeFrom.PAGE,offset:Math.round(81*9525)},verticalPosition:{relative:D.VerticalPositionRelativeFrom.PAGE,offset:Math.round(150*9525)},behindDocument:true,allowOverlap:true,wrap:{type:D.TextWrappingType.NONE}}}):null;
const gridCell=(lab,val,w)=>C([P(String(lab).toUpperCase(),{bold:true,size:15,color:GR},{spacing:{before:0,after:20}}),P(val||'—',{size:24,color:DK},{spacing:{before:0,after:0}})],w,{borders:NOB,ml:0,mb:150});
const cover=[
new Paragraph({spacing:{after:0},children:[...(logoRun?[logoRun]:[new TextRun({text:co.name,font:FONT,bold:true,size:56,color:DK})]),...(wm?[wm]:[])]}),
new Paragraph({alignment:AlignmentType.RIGHT,spacing:{before:0,after:0},children:[new TextRun({text:'Réf. '+ref,font:FONT,size:18,color:GR})]}),
SP(2100),
new Paragraph({spacing:{before:0,after:200},indent:{right:CW-1300},border:{bottom:{style:BorderStyle.SINGLE,size:30,color:AMB,space:1}},children:[]}),
new Paragraph({spacing:{before:0,after:60},children:[new TextRun({text:'RAPPORT DE MAINTENANCE',font:FONT,bold:true,size:58,color:DK})]}),
P(r.proc||'Maintenance',{size:30,color:GR},{spacing:{before:0,after:500}}),
P(r.client.name,{bold:true,size:44,color:DK},{spacing:{before:0,after:80}}),
...(ci.address?[P(ci.address,{size:24,color:GR},{spacing:{before:0,after:0}})]:[]),
SP(500),
TBL([4819,4819],[ROW([gridCell("Date d'intervention",r.start,4819),gridCell('Technicien',r.tech,4819)]),ROW([gridCell('Puissance installée',ci.power,4819),gridCell('Maintenance précédente',r.prev,4819)])],{borders:NOBT})];
/* bandeau coordonnées : placé dans le pied de la page de garde pour rester collé au bas de la page */
const band=(()=>{const L=(lab,lines,w)=>C([P(lab,{bold:true,size:16,color:AMB},{spacing:{before:0,after:60}}),...lines.filter(Boolean).map(l=>P(l,{size:19,color:'FFFFFF'},{spacing:{before:0,after:10}}))],w,{fill:DK,borders:{top:{style:BorderStyle.SINGLE,size:24,color:AMB},bottom:NB,left:NB,right:NB},va:VerticalAlign.TOP,mt:220,mb:260,ml:1134});
return TBL([4000,3600,4306],[ROW([L('ENTREPRISE',[co.name,co.addr,[co.zip,co.city].filter(Boolean).join(' ')],4000),L('CONTACT',[co.tel&&'Tél. '+co.tel,co.mail],3600),L('INFORMATIONS',[co.web,co.siret&&'SIRET '+co.siret],4306)])],{borders:NOBT,indent:{size:-1134,type:WidthType.DXA}})})();

/* ===== Synthèse ===== */
const CEN=AlignmentType.CENTER,body=[PT("Synthèse de l'intervention")];
body.push(P(introOf(r),{size:21,color:DK},{spacing:{before:0,after:200,line:300}}));
{const vc=VCOL[V.k],pc=n=>t.total?Math.round(n/t.total*100):0,cnt=[`Conformes : ${t.ok} (${pc(t.ok)} %)`,`Défauts : ${t.ko} (${pc(t.ko)} %)`,`Non contrôlés : ${t.nc}`,...(t.na?[`Non renseignés : ${t.na}`]:[]),...(nPh(r)?[`${nPh(r)} photo${plur(nPh(r),'','s')}`]:[])].join('  ·  ');
body.push(TBL([CW],[ROW([C([P('RÉSULTAT',{bold:true,size:15,color:GR},{spacing:{before:0,after:40}}),P(V.t,{bold:true,size:24,color:DK},{spacing:{before:0,after:50}}),P(V.s,{size:20,color:DK},{spacing:{before:0,after:60,line:280}}),P(cnt,{size:17,color:GR},{spacing:{before:0,after:0}})],CW,{fill:'F4F3EE',borders:{top:bd(),bottom:bd(),right:bd(),left:{style:BorderStyle.SINGLE,size:24,color:AMB}},ml:220,mt:120,mb:120})])],{borders:NOBT}))}
/* informations */
infoGroups(r).forEach(g=>{body.push(H1(g[0]),TBL([3300,CW-3300],g[1].map((x,j)=>ROW([C(x[0],3300,{fill:'FBF3D5',b:true,kn:j<1}),C(String(x[1]??'—'),CW-3300,{kn:j<1})]))))});
/* relevés */
if(r.prod||r.conso){const w=[CW/2,CW/2].map(Math.floor);w[1]=CW-w[0];body.push(H1('Relevés des compteurs'),TBL(w,[ROW([C('Compteur de production',w[0],{fill:DK,color:'FFFFFF',b:true,al:CEN,kn:1,size:18}),C('Compteur de non-consommation',w[1],{fill:DK,color:'FFFFFF',b:true,al:CEN,kn:1,size:18})],{head:true}),ROW([C((r.prod||'—')+' kWh',w[0],{b:true,size:26,al:CEN,mt:110,mb:110}),C((r.conso||'—')+' kWh',w[1],{b:true,size:26,al:CEN,mt:110,mb:110})])]))}
/* défauts */
const ko=defectsG(r);body.push(H1('Défauts constatés'));
if(ko.length){const w=[3300,2700,CW-6000];body.push(TBL(w,[ROW(['Étape','Point de contrôle','Observation'].map((h,i)=>C(h,w[i],{fill:COL.ko,color:'FFFFFF',b:true,kn:1})),{head:true}),...ko.map(x=>ROW(x.map((v,i)=>C(v,w[i]))))]))}
else body.push(TBL([CW],[ROW([C("Aucun défaut constaté lors de l'intervention.",CW,{fill:'F4F3EE',color:DK,borders:{top:bd(),bottom:bd(),right:bd(),left:{style:BorderStyle.SINGLE,size:24,color:COL.ok}},ml:220,mt:110,mb:110})])],{borders:NOBT}));
/* points non contrôlés */
const nc=uncontrolled(r);if(nc.length){const w=[4800,CW-4800];body.push(H1('Points non contrôlés'),TBL(w,[ROW(['Étape','Point de contrôle'].map((h,i)=>C(h,w[i],{fill:COL.nc,color:'FFFFFF',b:true,kn:1})),{head:true}),...nc.map(x=>ROW(x.map((v,i)=>C(v,w[i]))))]))}
/* récapitulatif des étapes */
{const w=[620,CW-620-1250-950-1650,1250,950,1650];body.push(H1('Récapitulatif des étapes'),TBL(w,[ROW(['N°','Étape','Conformes','Photos','Résultat'].map((h,i)=>C(h,w[i],{fill:DK,color:'FFFFFF',b:true,kn:1,al:i===1?undefined:CEN,size:18})),{head:true}),
...STEPS.map((c,i)=>{const L=c.i.length,ok=c.i.filter((_,j)=>r.steps[i].st[j]==='ok').length,R=RES[stepRes(r,i)];return ROW([C(String(i+1),w[0],{al:CEN}),C(c.t,w[1]),C(L?`${ok} / ${L}`:'—',w[2],{al:CEN}),C(String((r.steps[i].ph||[]).length||'—'),w[3],{al:CEN}),C(R.l,w[4],{al:CEN,b:true,color:R.c,fill:R.b})])})]))}

/* ===== Détail des contrôles ===== */
body.push(new Paragraph({pageBreakBefore:true,keepNext:true,spacing:{before:0,after:200},children:[new TextRun({text:'Détail des contrôles',font:FONT,bold:true,size:44,color:DK})]}));
STEPS.forEach((c,i)=>{const p=r.steps[i],L=lines(r,i),R=RES[stepRes(r,i)],ph=p.ph||[],W2=[CW-1900,1900];
const rows=[ROW([C(`${i+1}.  ${c.t}`,W2[0],{fill:DK,color:'FFFFFF',b:true,size:22,kn:1}),C(R.l,W2[1],{fill:R.c,color:'FFFFFF',b:true,al:CEN,kn:1})],{head:true})];
if(L.length)rows.push(ROW([C('POINT DE CONTRÔLE',W2[0],{fill:'ECEFF3',color:GR,b:true,size:15,kn:1,mt:40,mb:40}),C('STATUT',W2[1],{fill:'ECEFF3',color:GR,b:true,size:15,al:CEN,kn:1,mt:40,mb:40})],{head:true}));
L.forEach((l,j)=>rows.push(ROW([C(l.d,W2[0],{kn:j<1}),C(LBL[l.k],W2[1],{fill:LIGHT[l.k||'nc'],color:COL[l.k||'nc'],b:true,al:CEN,kn:j<1})])));
rows.push(ROW([C('OBSERVATIONS',CW,{span:2,fill:'FBF3D5',b:true,size:15,color:'6E540A',kn:1,mt:40,mb:40})]),ROW([C(p.obs||'RAS',CW,{span:2,color:p.obs?undefined:'828282',mt:90,mb:90})]));
body.push(TBL(W2,rows));
if(ph.length){body.push(new Paragraph({keepNext:true,spacing:{before:120,after:60},children:[new TextRun({text:`PHOTOS · ${i+1}. ${c.t}`,font:FONT,bold:true,size:15,color:GR})]}));for(let k=0;k<ph.length;k+=2){const cell=j=>{const q=ph[k+j];if(!q)return C([P('')],4819,{borders:NOB});const f=Math.min(290/q.w,225/q.h);return C([new Paragraph({keepNext:true,alignment:CEN,spacing:{before:60,after:60},children:[new ImageRun({data:u8(q.d),type:'jpg',transformation:{width:Math.max(1,Math.round(q.w*f)),height:Math.max(1,Math.round(q.h*f))}})]}),P(`Photo ${k+j+1} / ${ph.length}`,{size:16,color:GR},{alignment:CEN,spacing:{before:0,after:40}})],4819,{fill:'FAFAFA',mt:60,mb:40})};
body.push(TBL([4819,4819],[ROW([cell(0),cell(1)])],{borders:NOBT}))}}
body.push(SP(240))});


/* ===== Assemblage : page de garde (sans numéro) puis corps du rapport ===== */
const hb={top:NB,left:NB,right:NB,bottom:bd(AMB,12)};
const header=new Header({children:[TBL([3000,CW-3000],[ROW([C([new Paragraph({spacing:{before:0,after:0},children:LOGO?[new ImageRun({data:u8(LOGO.d),type:'png',transformation:{width:Math.round(46*LOGO.w/LOGO.h),height:46}})]:[new TextRun({text:co.name,font:FONT,bold:true,size:26})]})],3000,{borders:hb,ml:0,mb:90}),C([P('RAPPORT DE MAINTENANCE',{bold:true,size:16,color:'AA7000'},{alignment:AlignmentType.RIGHT,spacing:{before:0,after:20}}),P(`${r.client.name} · ${r.start}`,{size:18,color:DK},{alignment:AlignmentType.RIGHT,spacing:{before:0,after:0}})],CW-3000,{borders:hb,mr:0,mb:90,va:VerticalAlign.BOTTOM})])],{borders:NOBT}),SP(20)]});
const footer=new Footer({children:[new Paragraph({style:'FooterRL',spacing:{before:0,after:0},border:{top:{style:BorderStyle.SINGLE,size:4,color:LN,space:6}},tabStops:[{type:TabStopType.CENTER,position:Math.floor(CW/2)},{type:TabStopType.RIGHT,position:CW}],
children:[new TextRun({text:`${co.name} — ${ref}`,font:FONT,size:16,color:GR}),new TextRun({children:['\t'+[co.tel,co.web].filter(Boolean).join('  ·  ')+'\tPage ',PageNumber.CURRENT],font:FONT,size:16,color:GR})]})]});
const doc=new Document({creator:'R.L ENERGIE',title:`Rapport de maintenance — ${r.client.name}`,subject:r.proc||'Maintenance',description:`Rapport ${ref}`,keywords:ref,styles:{default:{document:{run:{font:FONT,size:20}}},paragraphStyles:[{id:'FooterRL',name:'Pied RL',basedOn:'Normal',run:{font:FONT,size:16,color:GR}}]},
sections:[
{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,right:1134,bottom:1134,left:1134,header:0,footer:0}}},footers:{default:new Footer({children:[band,SP(20)]})},children:cover},
{properties:{type:SectionType.NEXT_PAGE,page:{size:{width:11906,height:16838},margin:{top:1700,right:1134,bottom:1300,left:1134,header:500,footer:480},pageNumbers:{start:1}}},headers:{default:header},footers:{default:footer},children:body}]});
return Packer.toBlob(doc)}
