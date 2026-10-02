'use strict';
/* R.L ENERGIE — Exports PDF / Excel / Word */
/* ---------- Exports ---------- */
const rgb=h=>[0,2,4].map(o=>parseInt(h.substr(o,2),16));
function cover(d,r,W,M){const c=CO(),K=[38,40,43],A=[242,169,31],G=[90,94,100],T=(t,x,y,sz,col,b)=>{d.setFont('helvetica',b?'bold':'normal');d.setFontSize(sz);d.setTextColor(...col);d.text(t,x,y)};
d.setFillColor(244,243,238);d.rect(0,0,W,297,'F');d.setFillColor(...A);d.rect(0,0,W,6,'F');
if(LOGOWM){const h=255,w=h*LOGO.w/LOGO.h;d.addImage(LOGOWM,'PNG',(W-w)/2,25,w,h,'rlwm','FAST')}
if(LOGO){const h=60;d.addImage(LOGO.d,'PNG',M,18,h*LOGO.w/LOGO.h,h,'rllogo','FAST')}else{T(c.name,M,44,40,K,1);T(c.tag||'',M,56,13,G)}
d.setFillColor(...A);d.rect(M,112,30,2.5,'F');T('RAPPORT DE MAINTENANCE',M,128,26,K,1);T(r.proc||'Maintenance',M,138,14,G);
d.setFont('helvetica','bold');d.setFontSize(20);d.setTextColor(...K);let y=158;d.splitTextToSize(r.client.name,W-2*M).forEach(t=>{d.text(t,M,y);y+=9});
if(r.client.address){T(r.client.address,M,y,12,G);y+=8}
y=Math.max(y+8,190);[[["Date d'intervention",r.start],['Technicien',r.tech]],[['Puissance',r.client.power||'—'],['Maintenance précédente',r.prev]]].forEach(row=>{row.forEach((p,i)=>{T(p[0].toUpperCase(),M+i*90,y,8,G,1);T(String(p[1]||'—'),M+i*90,y+6,12,K)});y+=18});
d.setFillColor(...K);d.rect(0,247,W,50,'F');d.setFillColor(...A);d.rect(0,247,W,2,'F');
const put=(x,lab,L)=>{L=L.filter(Boolean);if(!L.length)return;T(lab,x,259,8,A,1);d.setFont('helvetica','normal');d.setFontSize(10);d.setTextColor(255,255,255);let q=266;L.forEach(l=>d.splitTextToSize(l,56).forEach(t=>{d.text(t,x,q);q+=5}))};
put(M,'ENTREPRISE',[c.name,c.addr,[c.zip,c.city].filter(Boolean).join(' ')]);put(80,'CONTACT',[c.tel&&'Tél. '+c.tel,c.mail]);put(145,'INFORMATIONS',[c.web,c.siret&&'SIRET '+c.siret])}
function mkPdf(r){const{jsPDF}=window.jspdf,d=new jsPDF({unit:'mm',format:'a4'}),W=210,M=15,NAVY=[17,17,17],s=stats(r);
cover(d,r,W,M);d.addPage();
let y=M;const T=o=>{d.autoTable({theme:'grid',margin:{left:M,right:M,top:M,bottom:18},styles:{fontSize:9.5,cellPadding:2.5,lineColor:[205,213,224],lineWidth:.2,textColor:30},headStyles:{fillColor:NAVY,textColor:255},...o,startY:y});y=d.lastAutoTable.finalY+5};
const H=t=>{if(y>255){d.addPage();y=M}d.setFont('helvetica','bold');d.setFontSize(13);d.setTextColor(...NAVY);d.text(t,M,y+4);y+=8};
H('Informations générales');T({body:[['Client',r.client.name],['Site',r.client.address||'—'],['Puissance',r.client.power||'—'],['Technicien',r.tech],["Date d'intervention",r.start],['Maintenance précédente',r.prev]],columnStyles:{0:{fontStyle:'bold',fillColor:[251,243,213],cellWidth:55}}});
H('Synthèse');T({head:[['Conforme','Défaut constaté','Non contrôlé']],body:[[s.ok,s.ko,s.nc]],styles:{halign:'center',fontSize:12,cellPadding:3}});
H('Défauts constatés');const ko=defects(r);
if(ko.length)T({head:[['Étape','Point','Observation']],body:ko,columnStyles:{0:{cellWidth:50},1:{cellWidth:38}},headStyles:{fillColor:[217,48,37],textColor:255}});else{d.setFont('helvetica','normal');d.setFontSize(10.5);d.setTextColor(30,110,60);d.text('Aucun défaut constaté.',M,y+2);y+=10}
STEPS.forEach((c,i)=>{const p=r.steps[i],L=lines(r,i);if(y>235){d.addPage();y=M}
T({head:[[{content:`${i+1}. ${c.t}`,colSpan:2,styles:{fontSize:11}}],...(L.length?[['Point de contrôle','Statut']]:[])],body:L.map(l=>[l.d,LBL[l.k]]),columnStyles:{1:{cellWidth:38,halign:'center',fontStyle:'bold'}},
didParseCell:h=>{if(h.section==='body'&&h.column.index===1)h.cell.styles.textColor=rgb(COL[L[h.row.index].k||'nc'])}});y-=2;
T({head:[['Observations']],body:[[p.obs||'RAS']],headStyles:{fillColor:[251,243,213],textColor:[17,17,17]}});
if(p.ph.length){const cw=(W-2*M-5)/2;let rh=0;p.ph.forEach((q,k)=>{if(k%2===0){if(y+72>282){d.addPage();y=M}rh=0}const f=Math.min(cw/q.w,68/q.h),w=q.w*f,h=q.h*f;d.addImage(q.d,'JPEG',M+(k%2)*(cw+5),y,w,h);rh=Math.max(rh,h);if(k%2||k===p.ph.length-1)y+=rh+5})}y+=3});
const n=d.getNumberOfPages();for(let i=2;i<=n;i++){d.setPage(i);d.setFont('helvetica','normal');d.setFontSize(8);d.setTextColor(120);d.setDrawColor(200);d.line(M,285,W-M,285);d.text(`R.L ENERGIE — ${r.client.name} — ${r.start}`,M,290);d.text(`Page ${i-1} / ${n-1}`,W-M,290,{align:'right'})}
return d.output('blob')}

async function mkXls(r){const wb=new ExcelJS.Workbook(),s=stats(r);wb.creator='R.L ENERGIE';
const fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:'FF'+c}}),bd={style:'thin',color:{argb:'FFCDD5E0'}},B={top:bd,left:bd,bottom:bd,right:bd},hd=(ro)=>ro.eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill=fill('111111');c.border=B;c.alignment={vertical:'middle',horizontal:'center',wrapText:true}});
const y=wb.addWorksheet('Synthèse',{views:[{showGridLines:false}]});y.columns=[{width:34},{width:48}];y.mergeCells('A1:B1');const t=y.getCell('A1');t.value='R.L ENERGIE — Rapport de maintenance';t.font={bold:true,size:16,color:{argb:'FFFFFFFF'}};t.fill=fill('111111');t.alignment={vertical:'middle',indent:1};y.getRow(1).height=34;
[['Client',r.client.name],['Site / adresse',r.client.address||'—'],['Puissance',r.client.power||'—'],['Technicien',r.tech],["Date d'intervention",r.start],['Maintenance précédente',r.prev],['Points conformes',s.ok],['Défauts constatés',s.ko],['Points non contrôlés',s.nc],['Relevé production (kWh)',r.prod||'—'],['Relevé non-consommation (kWh)',r.conso||'—']].forEach((v,k)=>{const ro=y.getRow(3+k);ro.values=v;ro.height=22;ro.eachCell(c=>{c.border=B;c.alignment={vertical:'middle',horizontal:'left',indent:1}});ro.getCell(1).font={bold:true};ro.getCell(1).fill=fill('FBF3D5')});
y.getCell('B9').fill=fill(LIGHT.ok);y.getCell('B10').fill=fill(LIGHT.ko);y.getCell('B11').fill=fill(LIGHT.nc);
const w=wb.addWorksheet('Détail',{views:[{state:'frozen',ySplit:1}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
w.columns=[{header:'N°',width:6},{header:'Étape',width:38},{header:'Point de contrôle',width:46},{header:'Statut',width:16},{header:'Observations',width:60}];hd(w.getRow(1));w.getRow(1).height=26;
let n=2;STEPS.forEach((c,i)=>{const L0=lines(r,i),L=L0.length?L0:[{d:'(aucun point de contrôle)',k:'',x:1}],a=n,ob=r.steps[i].obs||'RAS';L.forEach(l=>{const ro=w.addRow([i+1,c.t,l.d,l.x?'—':LBL[l.k],ob]);ro.height=24;ro.eachCell(x=>{x.border=B;x.alignment={vertical:'middle',wrapText:true}});ro.getCell(1).alignment={vertical:'middle',horizontal:'center'};
const st=ro.getCell(4);st.fill=fill(LIGHT[l.k||'nc']);st.font={bold:true,color:{argb:'FF'+COL[l.k||'nc']}};st.alignment={vertical:'middle',horizontal:'center'};n++});
if(L.length>1)['A','B','E'].forEach(k=>w.mergeCells(`${k}${a}:${k}${n-1}`))});
const ko=defects(r);if(ko.length){const f=wb.addWorksheet('Défauts');f.columns=[{header:'Étape',width:44},{header:'Point de contrôle',width:44},{header:'Observation',width:60}];hd(f.getRow(1));ko.forEach(v=>{const ro=f.addRow(v);ro.eachCell(c=>{c.border=B;c.alignment={vertical:'middle',wrapText:true}})})}
return new Blob([await wb.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}

async function mkDoc(r){const D=window.docx,{Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,ShadingType,ImageRun,AlignmentType,Footer,PageNumber}=D,s=stats(r);
const P=(t,o={},p={})=>new Paragraph({...p,children:[new TextRun({text:String(t),font:'Calibri',...o})]});
const C=(t,w,o={})=>new TableCell({width:{size:w,type:WidthType.PERCENTAGE},shading:o.f?{type:ShadingType.CLEAR,fill:o.f,color:'auto'}:undefined,margins:{top:60,bottom:60,left:100,right:100},children:[P(t,o.r||{})]});
const TB=(head,rows,w)=>new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[head&&new TableRow({tableHeader:true,children:head.map((h,k)=>C(h,w[k],{f:'111111',r:{bold:true,color:'FFFFFF'}}))}),...rows.map(x=>new TableRow({children:x.map((c,k)=>C(c.t??c,w[k],c.o||{}))}))].filter(Boolean)});
const H=t=>P(t,{bold:true,size:26,color:'111111'},{spacing:{before:300,after:120}}),u8=d=>Uint8Array.from(atob(d.split(',')[1]),c=>c.charCodeAt(0)),lab=t=>({t,o:{f:'FBF3D5',r:{bold:true}}});
const ch=[LOGO?new Paragraph({spacing:{after:200},children:[new ImageRun({data:u8(LOGO.d),type:'png',transformation:{width:Math.round(130*LOGO.w/LOGO.h),height:130}}),new ImageRun({data:u8(LOGOWM),type:'png',transformation:{width:Math.round(880*LOGO.w/LOGO.h),height:880},floating:{horizontalPosition:{relative:D.HorizontalPositionRelativeFrom.PAGE,offset:Math.round(81*9525)},verticalPosition:{relative:D.VerticalPositionRelativeFrom.PAGE,offset:Math.round(150*9525)},behindDocument:true,allowOverlap:true,wrap:{type:D.TextWrappingType.NONE}}})]}):P('R.L ENERGIE',{bold:true,size:48,color:'111111'}),P('Rapport de maintenance',{size:30,color:'F2A91F',bold:true},{spacing:{after:200}}),...(()=>{const c=CO();return[c.addr,[c.zip,c.city].filter(Boolean).join(' '),c.tel&&'Tél. '+c.tel,c.mail,c.web,c.siret&&'SIRET '+c.siret].filter(Boolean).map(t=>P(t,{size:20,color:'5A5E64'}))})(),
TB(null,[[lab('Client'),r.client.name],[lab('Site'),r.client.address||'—'],[lab('Puissance'),r.client.power||'—'],[lab('Technicien'),r.tech],[lab("Date d'intervention"),r.start],[lab('Maintenance précédente'),r.prev]],[30,70]),
H('Synthèse'),TB(['Conforme','Défaut constaté','Non contrôlé'],[[{t:String(s.ok),o:{r:{bold:true,color:COL.ok}}},{t:String(s.ko),o:{r:{bold:true,color:COL.ko}}},{t:String(s.nc),o:{r:{bold:true,color:COL.nc}}}]],[34,33,33])];
const ko=defects(r);ch.push(H('Défauts constatés'));ko.length?ch.push(TB(['Étape','Point','Observation'],ko,[36,30,34])):ch.push(P('Aucun défaut constaté.',{color:COL.ok}));
STEPS.forEach((c,i)=>{const p=r.steps[i];const L=lines(r,i);ch.push(H(`${i+1}. ${c.t}`));if(L.length)ch.push(TB(['Point de contrôle','Statut'],L.map(l=>[l.d,{t:LBL[l.k],o:{f:LIGHT[l.k||'nc'],r:{bold:true,color:COL[l.k||'nc']}}}]),[75,25]),P(''));ch.push(TB(['Observations'],[[p.obs||'RAS']],[100]));
for(let k=0;k<p.ph.length;k+=2)ch.push(new Paragraph({spacing:{before:120},children:p.ph.slice(k,k+2).map(q=>{const f=Math.min(300/q.w,225/q.h);return new ImageRun({data:u8(q.d),type:'jpg',transformation:{width:Math.round(q.w*f),height:Math.round(q.h*f)}})})}))});
const doc=new Document({sections:[{footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[`R.L ENERGIE — ${r.client.name} — Page `,PageNumber.CURRENT],size:16,color:'6B7683'})]})]})},children:ch}]});
return Packer.toBlob(doc)}
