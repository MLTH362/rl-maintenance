/* =========================================================
   R.L ENERGIE — Version PRO
   Code optimisé & compatible APK (WebView)
   ========================================================= */

/* ---------------------------------------
   VARIABLES GLOBALES
--------------------------------------- */
let currentStep = 0;
let technicianName = "";
let currentClientIndex = -1;
let isAdminMode = false;

let stepPhotos = {};    
let stepData = {};      

let maintenanceRunning = false;

const ADMIN_PASSWORD = "admin123";

/* ---------------------------------------
   SAUVEGARDE / IMPORT
--------------------------------------- */

let clients = JSON.parse(localStorage.getItem("rl_clients")) || [];
let history = JSON.parse(localStorage.getItem("rl_history")) || [];
let recovery = JSON.parse(localStorage.getItem("rl_recovery")) || null;

if (clients.length === 0) {
  clients = [
    { name:"Client A - 450 kWc", details:"Puissance : 450 kWc\nLocalisation : Région PACA",
      lastMaint:"15/03/2025", oldDates:["15/03/2025","10/09/2024"] },

    { name:"Client B - 120 kWc", details:"Puissance : 120 kWc\nLocalisation : Île-de-France",
      lastMaint:"08/01/2026", oldDates:["08/01/2026","12/06/2025"] },

    { name:"Client C - 800 kWc", details:"Puissance : 800 kWc\nLocalisation : Occitanie",
      lastMaint:"22/11/2025", oldDates:["22/11/2025","15/05/2025"] }
  ];
}

/* ---------------------------------------
   CHECKLISTS EXACTES D’ORIGINE
--------------------------------------- */

const checklists = [
  ["Observation drone thermique"],

  ["Observation thermique onduleur AC et DC"],

  ["État visuel coffret AC"],

  ["État visuel onduleurs","Câbles","Chemin de câble","Attache câble",
   "Capot","Connectiques DC","Environnement","Étiquettes","Nettoyage","Test continuité"],

  ["Observation thermique coffret AC"],

  ["AGCP"],

  ["Test différentiel","Paramétrage"],

  ["Coupure du sectionneur"],

  ["Vérification couple de serrage"],

  ["Vérification couple de serrage base onduleur"],

  ["Nettoyage ventilateur onduleur"],

  [], // Étape 12 : traitements spéciaux

  ["Vérification redémarrage"]
];

const stepsList = [
  "Drone thermique toiture",
  "Caméra thermique onduleur AC+DC",
  "Ouverture du coffret AC et remise sous tension",
  "Vérification visuel & nettoyage local onduleur",
  "Thermique coffret AC",
  "AGCP",
  "Vérification PDL",
  "Serrage PDL",
  "Vérification couple de serrage",
  "Vérification couple de serrage base onduleur",
  "Ventilateur onduleur",
  "Relevé compteur + Remise sous tension",
  "Vérification redémarrage"
];

/* =========================================================
   INITIALISATION
========================================================= */

window.onload = () => {
  renderClientList();
  refreshHistory();

  if (recovery && recovery.running) {
    if (confirm("Une maintenance en cours a été trouvée. Reprendre ?")) {
      loadRecovery();
    } else {
      localStorage.removeItem("rl_recovery");
    }
  }
};

/* =========================================================
   UTILITAIRES
========================================================= */

function toast(msg) {
  const el = document.createElement("div");
  el.classList.add("toast-msg");
  el.textContent = msg;
  document.getElementById("toast").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function saveAll() {
  localStorage.setItem("rl_clients", JSON.stringify(clients));
  localStorage.setItem("rl_history", JSON.stringify(history));
  saveRecovery();
}

function saveRecovery() {
  localStorage.setItem("rl_recovery", JSON.stringify({
    running: maintenanceRunning,
    currentStep,
    technicianName,
    currentClientIndex,
    stepPhotos,
    stepData
  }));
}

/* =========================================================
   CLIENTS
========================================================= */

function renderClientList() {
  const sel = document.getElementById("clientSelect");
  sel.innerHTML = '<option value="">Sélectionnez un client...</option>';
  clients.forEach((c, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

function loadClientData() {
  const idx = Number(document.getElementById("clientSelect").value);

  if (isNaN(idx)) return;

  currentClientIndex = idx;
  const c = clients[idx];

  document.getElementById("clientDetails").style.display = "block";
  document.getElementById("installationDetails").value = c.details || "";
  document.getElementById("oldDatesInput").value = c.oldDates?.join("\n") || "";
  document.getElementById("lastMaint").value = c.lastMaint || "";
  document.getElementById("startDate").value = new Date().toLocaleDateString("fr-FR");
}

function addNewClient() {
  if (!isAdminMode) return toast("Mode admin requis.");
  const name = document.getElementById("newClient").value.trim();
  if (!name) return toast("Nom invalide");

  clients.push({ name, details:"", lastMaint:"", oldDates:[] });
  document.getElementById("newClient").value = "";
  saveAll();
  renderClientList();
  toast("Client ajouté");
}

/* =========================================================
   DEMARRAGE MAINTENANCE
========================================================= */

function startMaintenance() {
  technicianName = document.getElementById("technicianName").value.trim();
  if (!technicianName) return toast("Nom du technicien requis");
  if (document.getElementById("clientSelect").value === "")
    return toast("Sélectionnez un client");

  maintenanceRunning = true;

  stepPhotos = {};
  stepData = {};

  document.getElementById("infoBlock").style.display = "none";

  createSteps();

  currentStep = 1;
  document.getElementById("step1").classList.add("active");

  saveRecovery();
}

/* =========================================================
   CREATION DES ETAPES (TABLEAUX)
========================================================= */

function createSteps() {
  const container = document.getElementById("stepsContainer");
  container.innerHTML = "";

  stepsList.forEach((title, i) => {
    const stepNum = i + 1;
    const items = checklists[i] || [];

    let checklistHTML = "";

    // Étape 12 → champs spéciaux
    if (stepNum === 12) {
      checklistHTML = `
        <label>Relevé Production (kWh)</label>
        <input type="number" id="releveProd" placeholder="Ex : 12045">

        <label>Relevé Non-consommation (kWh)</label>
        <input type="number" id="releveNonConso" placeholder="Ex : 8754">
      `;
    } else {
      // Tableaux EXACTS
      checklistHTML += `
        <div class="checklist-grid">
          <div class="checklist-header">Description</div>
          <div class="checklist-header">Conforme</div>
          <div class="checklist-header">Défaut</div>
          <div class="checklist-header">Non contrôlé</div>
      `;

      items.forEach((line, j) => {
        checklistHTML += `
          <div class="checklist-item">${line}</div>

          <div><input type="checkbox" class="chk" data-line="${stepNum}-${j}" 
            id="c${stepNum}-${j}-ok" onchange="exclusiveCheck(this)"></div>

          <div><input type="checkbox" class="chk" data-line="${stepNum}-${j}" 
            id="c${stepNum}-${j}-def" onchange="exclusiveCheck(this)"></div>

          <div><input type="checkbox" class="chk" data-line="${stepNum}-${j}" 
            id="c${stepNum}-${j}-nc" onchange="exclusiveCheck(this)"></div>
        `;
      });

      checklistHTML += `</div>`;
    }

    const div = document.createElement("div");
    div.className = "step card";
    div.id = `step${stepNum}`;

    div.innerHTML = `
      <div class="section-title">Étape ${stepNum} — ${title}</div>
      <div class="card-body">

        ${checklistHTML}

        <label>Observations</label>
        <textarea id="obs${stepNum}" rows="4" placeholder="Notes..."></textarea>

        <label>Photos</label>
        <input type="file" multiple accept="image/*" onchange="addPhoto(event, ${stepNum})">

        <div id="photos${stepNum}" class="photo-grid"></div>

        <div class="btn-row">
          <button class="btn btn-gray big" onclick="prevStep()">Précédent</button>
          <button class="btn btn-green big" onclick="nextStep(${stepNum})">Suivant</button>
        </div>

      </div>
    `;

    container.appendChild(div);
  });
}

/* =========================================================
   CHECKLIST EXCLUSIVE
========================================================= */

function exclusiveCheck(box) {
  const line = box.dataset.line;
  const all = document.querySelectorAll(`input[data-line="${line}"]`);
  all.forEach(x => { if (x !== box) x.checked = false; });
}

/* =========================================================
   NAVIGATION ENTRE ETAPES
========================================================= */

function nextStep(n) {
  const items = checklists[n - 1] || [];
  let valid = true;

  if (n !== 12) {
    for (let j = 0; j < items.length; j++) {
      const ok = document.getElementById(`c${n}-${j}-ok`);
      const de = document.getElementById(`c${n}-${j}-def`);
      const nc = document.getElementById(`c${n}-${j}-nc`);
      if (!ok.checked && !de.checked && !nc.checked) valid = false;
    }
    if (!valid) return toast("Veuillez compléter la checklist.");
  }

  stepData[n] = {
    obs: document.getElementById(`obs${n}`).value.trim() || "",
    values: []
  };

  if (n === 12) {
    stepData[12].prod = document.getElementById("releveProd").value;
    stepData[12].nonConso = document.getElementById("releveNonConso").value;
  } else {
    items.forEach((_, j) => {
      stepData[n].values.push({
        ok: document.getElementById(`c${n}-${j}-ok`).checked,
        def: document.getElementById(`c${n}-${j}-def`).checked,
        nc: document.getElementById(`c${n}-${j}-nc`).checked
      });
    });
  }

  saveRecovery();

  document.getElementById(`step${n}`).classList.remove("active");
  currentStep = n + 1;

  if (currentStep <= 13)
    document.getElementById(`step${currentStep}`).classList.add("active");
  else {
    maintenanceRunning = false;
    localStorage.removeItem("rl_recovery");
    toast("Maintenance terminée !");
  }
}

function prevStep() {
  if (currentStep <= 1) {
    document.getElementById("stepsContainer").innerHTML = "";
    document.getElementById("infoBlock").style.display = "block";
    currentStep = 0;
    return;
  }

  document.getElementById(`step${currentStep}`).classList.remove("active");
  currentStep--;
  document.getElementById(`step${currentStep}`).classList.add("active");
}

/* =========================================================
   PHOTOS + COMPRESSION
========================================================= */

function addPhoto(event, stepNum) {
  const files = [...event.target.files];
  if (!stepPhotos[stepNum]) stepPhotos[stepNum] = [];

  files.forEach(file => compressImage(file, base64 => {
    stepPhotos[stepNum].push(base64);
    renderPhotos(stepNum);
    saveRecovery();
  }));
}

function renderPhotos(stepNum) {
  const div = document.getElementById(`photos${stepNum}`);
  div.innerHTML = "";
  (stepPhotos[stepNum] || []).forEach((src, i) => {
    div.innerHTML += `
      <div class="photo-preview">
        <img src="${src}">
        <button class="delete-btn" onclick="deletePhoto(${stepNum}, ${i})">×</button>
      </div>
    `;
  });
}

function deletePhoto(stepNum, index) {
  stepPhotos[stepNum].splice(index, 1);
  renderPhotos(stepNum);
  saveRecovery();
}

function compressImage(file, cb) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const max = 1280;
      let { width:w, height:h } = img;

      if (w > max) { h *= max / w; w = max; }
      if (h > max) { w *= max / h; h = max; }

      c.width = w;
      c.height = h;

      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      cb(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* =========================================================
   PDF PRO
========================================================= */

function generatePDF() {
  const client = clients[currentClientIndex];
  if (!stepData[1]) return toast("Maintenance incomplète.");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  const dateStr = new Date().toLocaleDateString("fr-FR");

  // PAGE TITRE
  doc.setFontSize(32);
  doc.text("R.L ENERGIE", 105, y, { align:"center" });
  y += 15;

  doc.setFontSize(18);
  doc.text("RAPPORT DE MAINTENANCE", 105, y, { align:"center" });
  y += 25;

  doc.setFontSize(12);
  doc.text(`Client : ${client.name}`, 105, y, { align:"center" });
  y += 8;
  doc.text(`Technicien : ${technicianName}`, 105, y, { align:"center" });
  y += 8;
  doc.text(dateStr, 105, y, { align:"center" });

  doc.addPage();
  y = 20;

  // ÉTAPES
  stepsList.forEach((title, index) => {
    const n = index + 1;
    const dat = stepData[n];
    if (!dat) return;

    doc.setFontSize(14);
    doc.text(`Étape ${n} — ${title}`, 10, y);
    y += 8;

    const items = checklists[index];

    if (n !== 12) {
      const body = items.map((line, j) => [
        line,
        dat.values[j].ok ? "✔" : "",
        dat.values[j].def ? "✔" : "",
        dat.values[j].nc ? "✔" : ""
      ]);

      doc.autoTable({
        startY: y,
        head:[["Description","Conforme","Défaut","Non contrôle"]],
        body,
        theme:"grid",
        styles:{ fontSize:9 },
        headStyles:{ fillColor:[0,60,120], textColor:255 },
      });

      y = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(11);
      doc.text(`Relevé Production : ${dat.prod || "—"} kWh`, 15, y); y+=7;
      doc.text(`Relevé Non-consommation : ${dat.nonConso || "—"} kWh`, 15, y); y+=12;
    }

    if (dat.obs) {
      doc.setFontSize(11);
      doc.text("Observations :", 15, y);
      y += 5;
      doc.text(dat.obs, 20, y);
      y += 10;
    }

    if (stepPhotos[n]?.length > 0) {
      doc.setFontSize(12);
      doc.text("Photos :", 15, y);
      y += 8;

      for (const img of stepPhotos[n]) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.addImage(img, "JPEG", 15, y, 160, 95);
        y += 100;
      }
    }

    y += 10;
    if (y > 250) { doc.addPage(); y = 20; }
  });

  const filename = `Rapport_${client.name.replace(/ /g,"_")}_${dateStr.replace(/\//g,"-")}.pdf`;
  doc.save(filename);

  history.unshift({
    clientName: client.name,
    technician: technicianName,
    date: dateStr
  });

  saveAll();
  refreshHistory();

  toast("PDF généré !");
}

/* =========================================================
   EXCEL
========================================================= */

function generateExcel() {
  const client = clients[currentClientIndex];
  const dateStr = new Date().toLocaleDateString("fr-FR");

  const wb = XLSX.utils.book_new();
  const rows = [
    ["R.L ENERGIE — Rapport Maintenance"],
    ["Client", client.name],
    ["Technicien", technicianName],
    ["Date", dateStr],
    [],
    ["Étape", "Description", "Conforme","Défaut","Non contrôlé","Observation"]
  ];

  stepsList.forEach((title, i) => {
    const n = i + 1;
    const dat = stepData[n];
    if (!dat) return;

    const items = checklists[i];

    if (n !== 12) {
      items.forEach((line, j) => {
        rows.push([
          n,
          line,
          dat.values[j].ok ? "✔" : "",
          dat.values[j].def ? "✔" : "",
          dat.values[j].nc ? "✔" : "",
          dat.obs || ""
        ]);
      });
    } else {
      rows.push([n,"Relevés","Prod: "+dat.prod,"NonConso: "+dat.nonConso,"",""]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Rapport");

  XLSX.writeFile(wb, `Rapport_${client.name}_${dateStr}.xlsx`);
  toast("Excel généré !");
}

/* =========================================================
   WORD
========================================================= */

function generateWord() {
  const client = clients[currentClientIndex];
  const dateStr = new Date().toLocaleDateString("fr-FR");

  let html = `
  <h1 style="text-align:center">R.L ENERGIE</h1>
  <h2 style="text-align:center">Rapport de maintenance</h2>
  <p><strong>Client :</strong> ${client.name}</p>
  <p><strong>Technicien :</strong> ${technicianName}</p>
  <p><strong>Date :</strong> ${dateStr}</p>
  <hr>
  `;

  stepsList.forEach((title, i) => {
    const n = i + 1;
    const dat = stepData[n];
    if (!dat) return;

    html += `<h3>Étape ${n} — ${title}</h3>`;

    if (n !== 12) {
      html += `<ul>`;
      checklists[i].forEach((line, j) => {
        let state = dat.values[j].ok ? "✔ Conforme" : dat.values[j].def ? "❌ Défaut" : "Non contrôlé";
        html += `<li><strong>${line}</strong> : ${state}</li>`;
      });
      html += `</ul>`;
    } else {
      html += `
        <p><strong>Relevé production :</strong> ${dat.prod}</p>
        <p><strong>Relevé non-conso :</strong> ${dat.nonConso}</p>
      `;
    }

    html += `<p><strong>Observations :</strong><br>${dat.obs || "RAS"}</p><br>`;
  });

  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `Rapport_${client.name}_${dateStr}.doc`;
  a.click();
  URL.revokeObjectURL(url);

  toast("Word généré !");
}

/* =========================================================
   HISTORIQUE
========================================================= */

function refreshHistory() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";

  if (history.length === 0) {
    list.innerHTML = `<p style="text-align:center;padding:15px;color:#777">Aucun rapport</p>`;
    return;
  }

  history.forEach(r => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${r.clientName}</strong><br>${r.date} — ${r.technician}`;
    list.appendChild(div);
  });
}

function filterHistory() {
  const term = document.getElementById("searchHistory").value.toLowerCase();
  document.querySelectorAll(".history-item").forEach(i => {
    i.style.display = i.textContent.toLowerCase().includes(term) ? "" : "none";
  });
}

/* =========================================================
   ADMIN MODE
========================================================= */

function toggleAdminMode() {
  const pw = prompt("Mot de passe admin :");
  if (pw !== ADMIN_PASSWORD) return;
  isAdminMode = true;
  document.getElementById("adminControls").style.display = "block";
  toast("Mode admin activé");
}

/* =========================================================
   JSON BACKUP
========================================================= */

function exportJSON() {
  const data = { clients, history };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "RL_Maintenance_Backup.json";
  a.click();
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      clients = data.clients || clients;
      history = data.history || history;
      saveAll();
      renderClientList();
      refreshHistory();
      toast("Données importées !");
    } catch {
      toast("Erreur JSON");
    }
  };
  reader.readAsText(file);
}

/* FIN */
