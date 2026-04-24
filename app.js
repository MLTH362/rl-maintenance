/* =========================================================
   R.L ENERGIE — Version PRO
   Code optimisé, clair, modulaire, APK-friendly
   ========================================================= */

/* ---------------------------------------
   VARIABLES GLOBALES
--------------------------------------- */

let currentStep = 0;
let technicianName = "";
let currentClientIndex = -1;
let isAdminMode = false;

let stepPhotos = {};       // Photos de chaque étape
let stepData = {};         // Observations + checklist
let maintenanceRunning = false;

const ADMIN_PASSWORD = "admin123";

/* ---------------------------------------
   CHARGEMENT DES DONNÉES
--------------------------------------- */

let clients = JSON.parse(localStorage.getItem("rl_clients")) || [
  {
    name: "Client A - 450 kWc",
    details: "Puissance : 450 kWc\nLocalisation : Région PACA",
    lastMaint: "15/03/2025",
    oldDates: ["15/03/2025", "10/09/2024"],
  },
  {
    name: "Client B - 120 kWc",
    details: "Puissance : 120 kWc\nLocalisation : Île-de-France",
    lastMaint: "08/01/2026",
    oldDates: ["08/01/2026", "12/06/2025"],
  },
  {
    name: "Client C - 800 kWc",
    details: "Puissance : 800 kWc\nLocalisation : Occitanie",
    lastMaint: "22/11/2025",
    oldDates: ["22/11/2025", "15/05/2025"],
  },
];

let history = JSON.parse(localStorage.getItem("rl_history")) || [];
let recovery = JSON.parse(localStorage.getItem("rl_recovery")) || null;

/* ---------------------------------------
   LISTE DES 13 ÉTAPES (fixées)
--------------------------------------- */

const stepsList = [
  "Drone thermique toiture",
  "Caméra thermique onduleur AC+DC",
  "Ouverture du coffret AC et remise sous tension",
  "Vérification visuel et nettoyage local onduleur",
  "Thermique coffret AC",
  "AGCP",
  "Vérification PDL",
  "Serrage PDL",
  "Vérification couple de serrage",
  "Vérification couple de serrage base onduleur",
  "Ventilateur onduleur",
  "Relevé compteur + Remise sous tension",
  "Vérification redémarrage",
];

/* =========================================================
   INITIALISATION
========================================================= */

window.onload = () => {
  renderClientList();
  refreshHistory();

  // Reprise automatique
  if (recovery && recovery.running) {
    if (confirm("Une maintenance en cours a été détectée. Voulez-vous la reprendre ?")) {
      loadRecovery();
    } else {
      localStorage.removeItem("rl_recovery");
    }
  }
};

/* =========================================================
   SAUVEGARDE AUTOMATIQUE
========================================================= */

function saveRecovery() {
  localStorage.setItem(
    "rl_recovery",
    JSON.stringify({
      running: maintenanceRunning,
      currentStep,
      technicianName,
      currentClientIndex,
      stepPhotos,
      stepData,
    })
  );
}

function loadRecovery() {
  maintenanceRunning = true;
  technicianName = recovery.technicianName;
  currentClientIndex = recovery.currentClientIndex;
  stepPhotos = recovery.stepPhotos;
  stepData = recovery.stepData;
  currentStep = recovery.currentStep;

  document.getElementById("infoBlock").style.display = "none";
  createSteps();
  document.getElementById(`step${currentStep}`).classList.add("active");
}

/* =========================================================
   UTILITAIRES
========================================================= */

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast-msg";
  el.textContent = msg;
  document.getElementById("toast").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function saveData() {
  localStorage.setItem("rl_clients", JSON.stringify(clients));
  localStorage.setItem("rl_history", JSON.stringify(history));
  saveRecovery();
}

/* =========================================================
   GESTION CLIENTS
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
  const idx = +document.getElementById("clientSelect").value;
  if (isNaN(idx) || idx < 0) {
    document.getElementById("clientDetails").style.display = "none";
    return;
  }

  currentClientIndex = idx;
  const c = clients[idx];

  document.getElementById("clientDetails").style.display = "block";
  document.getElementById("installationDetails").value = c.details;
  document.getElementById("oldDatesInput").value = c.oldDates.join("\n");
  document.getElementById("lastMaint").value = c.lastMaint;
  document.getElementById("startDate").value = new Date().toLocaleDateString("fr-FR");
}

function addNewClient() {
  if (!isAdminMode) return;

  const name = document.getElementById("newClient").value.trim();
  if (!name) return toast("Nom invalide");

  clients.push({
    name,
    details: "",
    lastMaint: "",
    oldDates: [],
  });

  document.getElementById("newClient").value = "";
  saveData();
  renderClientList();
  toast("Client ajouté");
}

/* =========================================================
   DÉMARRAGE MAINTENANCE
========================================================= */

function startMaintenance() {
  technicianName = document.getElementById("technicianName").value.trim();
  if (!technicianName) return toast("Nom du technicien requis");

  if (document.getElementById("clientSelect").value === "")
    return toast("Sélectionnez un client");

  document.getElementById("infoBlock").style.display = "none";

  maintenanceRunning = true;

  stepPhotos = {};
  stepData = {};

  createSteps();
  currentStep = 1;
  document.getElementById("step1").classList.add("active");

  saveRecovery();

  toast("Maintenance démarrée !");
}

/* =========================================================
   GÉNÉRATION DES ÉTAPES
========================================================= */

function createSteps() {
  const container = document.getElementById("stepsContainer");
  container.innerHTML = "";

  stepsList.forEach((title, index) => {
    const stepNum = index + 1;

    const div = document.createElement("div");
    div.className = "step card";
    div.id = `step${stepNum}`;

    div.innerHTML = `
      <div class="section-title">Étape ${stepNum} - ${title}</div>
      <div class="card-body">

        <label>Checklist</label>
        <select id="check${stepNum}" class="check-select">
          <option value="">Sélectionner...</option>
          <option>Conforme</option>
          <option>Défaut constaté</option>
          <option>Non contrôlé</option>
        </select>

        <label>Observations</label>
        <textarea id="obs${stepNum}" rows="4" placeholder="Notes..."></textarea>

        <label>Photos</label>
        <input type="file" id="photo${stepNum}" accept="image/*" multiple onchange="addPhoto(${stepNum})" />

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
   NAVIGATION ÉTAPES
========================================================= */

function nextStep(n) {
  const check = document.getElementById(`check${n}`).value;
  if (!check) return toast("Veuillez remplir la checklist");

  stepData[n] = {
    check,
    obs: document.getElementById(`obs${n}`).value.trim(),
  };

  document.getElementById(`step${n}`).classList.remove("active");

  currentStep = n + 1;

  if (currentStep <= stepsList.length) {
    document.getElementById(`step${currentStep}`).classList.add("active");
  } else {
    maintenanceRunning = false;
    localStorage.removeItem("rl_recovery");
    toast("Maintenance terminée !");
  }

  saveRecovery();
}

function prevStep() {
  if (currentStep <= 1) {
    document.getElementById("stepsContainer").innerHTML = "";
    document.getElementById("infoBlock").style.display = "block";
    currentStep = 0;
    saveRecovery();
    return;
  }

  document.getElementById(`step${currentStep}`).classList.remove("active");
  currentStep--;
  document.getElementById(`step${currentStep}`).classList.add("active");
  saveRecovery();
}

/* =========================================================
   PHOTOS + COMPRESSION
========================================================= */

function addPhoto(step) {
  const files = document.getElementById(`photo${step}`).files;
  if (!files.length) return;

  if (!stepPhotos[step]) stepPhotos[step] = [];

  [...files].forEach((file) => compressImage(file, (base64) => {
    stepPhotos[step].push(base64);
    renderPhotos(step);
    saveRecovery();
  }));

  document.getElementById(`photo${step}`).value = "";
}

function renderPhotos(step) {
  const div = document.getElementById(`photos${step}`);
  div.innerHTML = "";

  (stepPhotos[step] || []).forEach((src, index) => {
    div.innerHTML += `
      <div class="photo-preview">
        <img src="${src}">
        <button class="delete-btn" onclick="deletePhoto(${step}, ${index})">×</button>
      </div>
    `;
  });
}

function deletePhoto(step, idx) {
  stepPhotos[step].splice(idx, 1);
  renderPhotos(step);
  saveRecovery();
}

/* Compression image */
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const maxSize = 1280;
      let w = img.width;
      let h = img.height;

      if (w > maxSize) {
        h *= maxSize / w;
        w = maxSize;
      }
      if (h > maxSize) {
        w *= maxSize / h;
        h = maxSize;
      }

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      const base64 = canvas.toDataURL("image/jpeg", 0.8);
      callback(base64);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

/* =========================================================
   GENERATION PDF PRO
========================================================= */

function generateReport() {
  if (!stepData[1]) return toast("Maintenance non terminée");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const client = clients[currentClientIndex];
  const dateStr = new Date().toLocaleDateString("fr-FR");

  /* PAGE DE GARDE */
  doc.setFontSize(32);
  doc.text("R.L ENERGIE", 105, 50, { align: "center" });
  doc.setFontSize(18);
  doc.text("RAPPORT DE MAINTENANCE", 105, 75, { align: "center" });

  doc.setFontSize(12);
  doc.text(`Client : ${client.name}`, 105, 100, { align: "center" });
  doc.text(`Technicien : ${technicianName}`, 105, 112, { align: "center" });
  doc.text(dateStr, 105, 124, { align: "center" });

  doc.addPage();

  /* ÉTAPES */
  let y = 20;

  for (let i = 1; i <= stepsList.length; i++) {
    const step = stepData[i];
    if (!step) continue;

    doc.setFontSize(14);
    doc.text(`Étape ${i} — ${stepsList[i - 1]}`, 15, y);
    y += 8;

    doc.setFontSize(11);
    doc.text(`État : ${step.check}`, 20, y);
    y += 7;

    if (step.obs) {
      doc.text("Observations :", 20, y);
      y += 6;
      doc.text(step.obs, 25, y);
      y += 10;
    }

    if (stepPhotos[i] && stepPhotos[i].length > 0) {
      doc.text("Photos :", 20, y);
      y += 5;

      for (const img of stepPhotos[i]) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }
        doc.addImage(img, "JPEG", 20, y, 160, 90);
        y += 95;
      }
    }

    y += 10;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  }

  doc.save(`Rapport_${client.name.replace(/ /g, "_")}_${dateStr}.pdf`);

  /* Sauvegarde historique */
  history.unshift({
    id: Date.now(),
    clientName: client.name,
    technician: technicianName,
    date: dateStr,
  });
  saveData();

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
    ["Étape", "Checklist", "Observations"],
  ];

  for (let i = 1; i <= stepsList.length; i++) {
    if (!stepData[i]) continue;
    rows.push([
      `${i}. ${stepsList[i - 1]}`,
      stepData[i].check,
      stepData[i].obs || "RAS",
    ]);
  }

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
  <h1 style="text-align:center;">R.L ENERGIE</h1>
  <h2 style="text-align:center;">Rapport de Maintenance</h2>
  <p><strong>Client :</strong> ${client.name}</p>
  <p><strong>Technicien :</strong> ${technicianName}</p>
  <p><strong>Date :</strong> ${dateStr}</p>
  <hr>
  `;

  for (let i = 1; i <= stepsList.length; i++) {
    if (!stepData[i]) continue;
    html += `<h3>${i}. ${stepsList[i - 1]}</h3>`;
    html += `<p><strong>État :</strong> ${stepData[i].check}</p>`;
    html += `<p><strong>Observations :</strong><br>${stepData[i].obs || "RAS"}</p><br>`;
  }

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword",
  });

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
    list.innerHTML = `<p style="text-align:center;padding:20px;color:#777;">Aucun rapport</p>`;
    return;
  }

  history.forEach((r) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>${r.clientName}</strong><br>${r.date} — ${r.technician}`;
    list.appendChild(div);
  });
}

function filterHistory() {
  const term = document.getElementById("searchHistory").value.toLowerCase();
  document.querySelectorAll(".history-item").forEach((i) => {
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
  toast("Mode administrateur activé");
}

function clearAll() {
  if (confirm("Tout effacer ?")) location.reload();
}

function recommencerTout() {
  if (confirm("Nouvelle maintenance ?")) location.reload();
}

/* =========================================================
   BACKUP JSON
========================================================= */

function exportJSON() {
  const data = { clients, history };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "backup_rl_energie.json";
  a.click();

  toast("Export JSON OK");
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      clients = data.clients || clients;
      history = data.history || history;
      saveData();
      renderClientList();
      refreshHistory();
      toast("Import réussi !");
    } catch {
      toast("Erreur import JSON");
    }
  };

  reader.readAsText(file);
}
