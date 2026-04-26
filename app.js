// ══════════════════════════════════════════════════════════════════════════════
// LifeControl RPG — Vanilla JS App + Firebase Sync
// ══════════════════════════════════════════════════════════════════════════════

const SK = "fin-rpg-v6";
const BAK = ["fin-rpg-bak-1", "fin-rpg-bak-2", "fin-rpg-bak-3"];
const FB_URL = "https://lifecontrol-cf790-default-rtdb.firebaseio.com";
let playerCode = null;
let syncStatus = "offline"; // "online", "syncing", "offline", "error"
let lastCloudSync = null;
let cloudSyncInterval = null;

// ── State ────────────────────────────────────────────────────────────────────
let data = null;
let view = "dashboard";
let month = MS[new Date().getMonth()];
let expGr = null;
let showAv = false;
let showSettings = false;
let showInitEdit = false;
let todoText = "";
let todoDif = "easy";
let todoArea = "str";
let todoDate = todayStr();
let areaFilter = "all";
let histF = "all";
let histType = "all";
let aFrame = 0;
let lastSaved = null;
let pendingAccs = {};
let pendingStarts = {};
let toastTimeout = null;
let moodTimeout = null;
let fMood = null;
let todoViewMode = "day"; // "day" or "general"
let todoAddToSchedule = false; // toggle for adding task to agenda
let todoSchdStart = ""; // schedule start time
let todoSchdEnd = "";   // schedule end time
let uniTaskAddToSchedule = false;
let uniTaskSchdStart = "";
let uniTaskSchdEnd = "";
let saveTimeout = null;
let shopText = "";
let shopCat = "frutas";
let shopQty = "";
let remText = "";
let shopFilter = "all";
let remPri = "medium";
let remDate = "";
let showRemForm = false;
let showGoalForm = false;
let showRecurForm = false;
let showHabitForm = false;
let showAchievements = false;
let habitArea = "str";
let goalText = "";
let goalTarget = "";
let goalIcon = "🎯";
let goalDeadline = "";
let recurName = "";
let recurAmount = "";
let recurGroup = "viv";
let recurCat = "arr";
let recurDay = 1;
let journalMood = "good";
let notifEnabled = false;
let showJournalHist = false;
let showDebtForm = false;
let showWishForm = false;
let showSubsForm = false;
let showFocusForm = false;
let showComparador = false;
let compareMo2 = "";

// ── University state ─────────────────────────────────────────────────────────
let showUniSbjForm = false;
let showUniTaskForm = false;
let uniTaskSbj = null;      // subject id being used for new task
let uniSbjFilter = "all";   // "all" or subject id
let uniSbjColor = "#3498DB"; // color selected in subject form

// ── Custom categories state ───────────────────────────────────────────────────
let customExpMode = "group"; // "group" or "sub"
let customExpGroupSel = "";  // group id selected for adding subcat

// ── Effective category lists (base + custom) ─────────────────────────────────
function getEffectiveIC() { return [...IC, ...((typeof data !== 'undefined' && data && data.customIncCats) || [])]; }
function getEffectiveEG() { return [...EG, ...((typeof data !== 'undefined' && data && data.customExpGroups) || [])]; }

// ── Utils ────────────────────────────────────────────────────────────────────
function fmt(n) { return "$" + (n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fS(n) { return "$" + (n || 0).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function nowEC() { return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Guayaquil" })); }
function todayStr() { const d = nowEC(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function dateToStr(d) { return d.toISOString().slice(0, 10) }
function $(id) { return document.getElementById(id) }

function mkInit() {
  const b = {
    months: {}, cq: {}, xp: 0, sa: {}, todos: [], hist: [],
    stats: { str: 0, int: 0, vit: 0, luk: 0, cha: 0 },
    avatar: { hair: "messy", hairColor: "brown", skin: "medium", eyeColor: "brown", outfit: "tshirt", outfitColor: "blue", accessory: "none" },
    shopList: [],
    reminders: [],
    projects: [],
    subjects: [],
    uniTasks: [],
    customExpGroups: [],
    customIncCats: [],
    schedule: [],
    customAreas: []
  };
  MS.forEach(m => { b.months[m] = { income: {}, expenses: {}, accounts: {} }; });
  return b;
}

// ── Guardado robusto (local) ─────────────────────────────────────────────────
function localSave(d) {
  const s = JSON.stringify(d);
  try { localStorage.setItem(SK, s); } catch (e) { }
  BAK.forEach(k => { try { localStorage.setItem(k, s); } catch (e) { } });
  const today = todayStr();
  try { localStorage.setItem(`fin-rpg-daily-${today}`, s); } catch (e) { }
  try {
    for (let i = 8; i <= 30; i++) {
      const dd = new Date(); dd.setDate(dd.getDate() - i);
      localStorage.removeItem(`fin-rpg-daily-${dateToStr(dd)}`);
    }
  } catch (e) { }
}

function localLoad() {
  const sources = [
    () => localStorage.getItem(SK),
    ...BAK.map(k => () => localStorage.getItem(k)),
  ];
  for (let i = 0; i < 8; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    sources.push(() => localStorage.getItem(`fin-rpg-daily-${dateToStr(d)}`));
  }
  for (const src of sources) {
    try { const v = src(); if (v) { const d = JSON.parse(v); if (d && typeof d === 'object' && (d.months || d.avatar || d.xp !== undefined)) return d; } } catch (e) { }
  }
  return null;
}

// ── Firebase REST API ────────────────────────────────────────────────────────
async function cloudSave(d) {
  if (!playerCode) return false;
  try {
    syncStatus = "syncing"; updateSyncUI();
    const resp = await fetch(`${FB_URL}/players/${playerCode}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d)
    });
    if (resp.ok) {
      syncStatus = "online";
      lastCloudSync = new Date();
      updateSyncUI();
      return true;
    }
    syncStatus = "error"; updateSyncUI();
    return false;
  } catch (e) {
    syncStatus = "offline"; updateSyncUI();
    return false;
  }
}

async function cloudLoad() {
  if (!playerCode) return null;
  try {
    syncStatus = "syncing"; updateSyncUI();
    const resp = await fetch(`${FB_URL}/players/${playerCode}.json`);
    if (resp.ok) {
      const d = await resp.json();
      // Accept any object with data (Firebase deletes empty objects like months:{})
      if (d && typeof d === 'object' && (d.months || d.avatar || d.xp !== undefined || d.todos || d.shopList)) {
        syncStatus = "online";
        lastCloudSync = new Date();
        updateSyncUI();
        return d;
      }
    }
    syncStatus = "online"; updateSyncUI();
    return null;
  } catch (e) {
    syncStatus = "offline"; updateSyncUI();
    return null;
  }
}

// Ensure all required data structures exist (Firebase deletes empty objects/arrays and converts arrays to objects)
function ensureData(d) {
  if (!d) return mkInit();
  if (!d.months) d.months = {};
  MS.forEach(m => {
    if (!d.months[m]) d.months[m] = {};
    if (!d.months[m].income) d.months[m].income = {};
    if (!d.months[m].expenses) d.months[m].expenses = {};
    if (!d.months[m].accounts) d.months[m].accounts = {};
  });
  if (!d.stats) d.stats = { str: 0, int: 0, vit: 0, luk: 0, cha: 0 };
  if (!d.avatar) d.avatar = { hair: "messy", hairColor: "brown", skin: "medium", eyeColor: "brown", outfit: "tshirt", outfitColor: "blue", accessory: "none" };
  if (d.xp === undefined) d.xp = 0;
  if (!d.cq) d.cq = {};
  if (!d.sa) d.sa = {};
  if (!d.journal) d.journal = {};
  if (!d.achievements) d.achievements = {};
  if (!d.theme) d.theme = "cyber";
  // Firebase converts arrays to objects with numeric keys — fix them all
  const fixArr = (key) => {
    if (!d[key]) { d[key] = []; return; }
    if (Array.isArray(d[key])) return;
    // It's an object from Firebase — convert to array
    if (typeof d[key] === 'object') {
      const arr = [];
      Object.keys(d[key]).forEach(k => {
        if (d[key][k] && typeof d[key][k] === 'object') {
          arr.push(d[key][k]);
        }
      });
      d[key] = arr;
    } else {
      d[key] = [];
    }
  };
  fixArr('todos');
  fixArr('hist');
  fixArr('shopList');
  fixArr('reminders');
  fixArr('habits');
  fixArr('goals');
  fixArr('recurring');
  fixArr('debts');
  fixArr('wishlist');
  fixArr('subs');
  fixArr('projects');
  fixArr('subjects');
  fixArr('uniTasks');
  fixArr('customExpGroups');
  fixArr('customIncCats');
  fixArr('schedule');
  fixArr('customAreas');
  // Fix nested arrays inside projects (milestones, columns)
  (d.projects || []).forEach(p => {
    if (!p.milestones) p.milestones = [];
    else if (!Array.isArray(p.milestones)) {
      const arr = [];
      Object.keys(p.milestones).forEach(k => { if (p.milestones[k] && typeof p.milestones[k] === 'object') arr.push(p.milestones[k]); });
      p.milestones = arr;
    }
    if (!p.kanbanColumns) p.kanbanColumns = DEFAULT_KANBAN_COLUMNS.map(c => ({...c}));
    else if (!Array.isArray(p.kanbanColumns)) {
      const arr = [];
      Object.keys(p.kanbanColumns).forEach(k => { if (p.kanbanColumns[k] && typeof p.kanbanColumns[k] === 'object') arr.push(p.kanbanColumns[k]); });
      p.kanbanColumns = arr.length ? arr : DEFAULT_KANBAN_COLUMNS.map(c => ({...c}));
    }
    if (!p.tags) p.tags = [];
    else if (!Array.isArray(p.tags)) {
      const arr = [];
      Object.keys(p.tags).forEach(k => { if (p.tags[k]) arr.push(p.tags[k]); });
      p.tags = arr;
    }
    if (!p.expenseIds) p.expenseIds = [];
    else if (!Array.isArray(p.expenseIds)) {
      const arr = [];
      Object.keys(p.expenseIds).forEach(k => { if (p.expenseIds[k]) arr.push(p.expenseIds[k]); });
      p.expenseIds = arr;
    }
  });
  // Fix subtasks inside todos (Firebase converts arrays to objects)
  (d.todos || []).forEach(t => {
    if (!t.subtasks) t.subtasks = [];
    else if (!Array.isArray(t.subtasks)) {
      const arr = [];
      Object.keys(t.subtasks).forEach(k => { if (t.subtasks[k] && typeof t.subtasks[k] === 'object') arr.push(t.subtasks[k]); });
      t.subtasks = arr;
    }
  });
  // Fix nested arrays inside habits (history per habit, payments per debt, etc.)
  (d.habits || []).forEach(h => {
    if (h.history && typeof h.history !== 'object') h.history = {};
    if (!h.history) h.history = {};
  });
  (d.debts || []).forEach(db => {
    if (!db.payments) db.payments = [];
    if (!Array.isArray(db.payments)) {
      const arr = [];
      Object.keys(db.payments).forEach(k => { if (db.payments[k]) arr.push(db.payments[k]); });
      db.payments = arr;
    }
  });
  // focusChallenge can be null — Firebase may delete it, which is fine
  if (d.focusChallenge === undefined) d.focusChallenge = null;
  // Fix nested cats arrays inside customExpGroups
  (d.customExpGroups || []).forEach(g => {
    if (!g.cats) g.cats = [];
    else if (!Array.isArray(g.cats)) {
      const arr = [];
      Object.keys(g.cats).forEach(k => { if (g.cats[k] && typeof g.cats[k] === 'object') arr.push(g.cats[k]); });
      g.cats = arr;
    }
  });
  return d;
}

function updateSyncUI() {
  const el = $("sync-indicator");
  if (!el) return;
  const icons = { online: "🟢", syncing: "🔄", offline: "🟠", error: "🔴" };
  const labels = { online: "Sincronizado", syncing: "Sincronizando...", offline: "Sin conexión", error: "Error de sync" };
  el.innerHTML = `<span onclick="forceSync()" style="cursor:pointer">${icons[syncStatus] || "⚪"} <span style="font-size:10px;color:#666">${labels[syncStatus] || ""}</span></span>`;
}

async function forceSync() {
  flash("🔄 Sincronizando...", "success");
  const remote = await cloudLoad();
  if (remote) {
    data = ensureData(remote);
    localSave(data);
    flash("✅ Datos sincronizados desde la nube", "success");
    render();
  } else {
    flash("⚠️ No se pudo conectar con la nube", "xp");
  }
}

// ── Save functions ──────────────────────────────────────────────────────────
// ONLY schedSave stamps _lastModified (called by user actions)
function schedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    data._lastModified = Date.now(); // ONLY stamp here — actual user change
    localSave(data);
    cloudSave(data);
    lastSaved = new Date();
    render();
  }, 400);
}

// ── Periodic cloud sync (pull remote changes) ────────────────────────────────
async function pullFromCloud() {
  if (!playerCode || !data) return;
  const remote = await cloudLoad();
  if (remote) {
    const localTs = data._lastModified || 0;
    const remoteTs = remote._lastModified || 0;
    if (remoteTs > localTs) {
      data = ensureData(remote);
      localSave(data);
      render();
    }
  }
}

// ── Login ────────────────────────────────────────────────────────────────────
function loginWithCode() {
  const input = $("login-code-input");
  const code = (input?.value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!code || code.length < 3) {
    $("login-error").textContent = "El código debe tener al menos 3 caracteres (letras y números)";
    $("login-error").style.display = "block";
    return;
  }
  playerCode = code;
  localStorage.setItem("lc-player-code", code);
  $("login-error").style.display = "none";
  startApp();
}

async function startApp() {
  $("login-screen").style.display = "none";
  $("loading").style.display = "flex";

  // Load from both sources and pick the newest
  const cloud = await cloudLoad();
  const local = localLoad();

  const cloudTs = cloud?._lastModified || 0;
  const localTs = local?._lastModified || 0;

  if (cloud && local) {
    data = cloudTs >= localTs ? cloud : local;
  } else if (cloud) {
    data = cloud;
  } else if (local) {
    data = local;
  } else {
    data = mkInit();
  }

  // Ensure all data structures exist (Firebase deletes empty objects)
  data = ensureData(data);

  // Only save locally on load — do NOT push to cloud (to avoid overwriting newer data)
  localSave(data);
  // Only push to cloud if this is brand new data (no timestamp yet)
  if (!data._lastModified) {
    data._lastModified = Date.now();
    cloudSave(data);
  }

  // Show app
  $("loading").style.display = "none";
  $("app").style.display = "block";
  render();
  checkQuests();

  // Start avatar animation
  function tick() {
    aFrame++;
    const level = Math.floor((data.xp || 0) / 10) + 1;
    $("avatar-container").innerHTML = renderAvatar(data.avatar, level, getAutoMood(), 72, aFrame);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Periodic LOCAL-only save every 60s (safety net, does NOT push to cloud)
  setInterval(() => { if (data) localSave(data); }, 60000);

  // Periodic cloud pull every 5s (sync from other devices)
  cloudSyncInterval = setInterval(pullFromCloud, 5000);

  // Save locally on tab hide / close (does NOT push to cloud with new timestamp)
  const saveNow = () => { if (data) localSave(data); };
  document.addEventListener("visibilitychange", saveNow);
  window.addEventListener("beforeunload", saveNow);
}

function logout() {
  if (!confirm("¿Cerrar sesión? Tus datos se mantienen guardados en la nube.")) return;
  if (cloudSyncInterval) clearInterval(cloudSyncInterval);
  playerCode = null;
  localStorage.removeItem("lc-player-code");
  $("app").style.display = "none";
  $("login-screen").style.display = "flex";
  $("login-code-input").value = "";
}

// ── Cálculos ─────────────────────────────────────────────────────────────────
function calcM(d, m) {
  const md = d.months[m] || {};
  const inc = Object.values(md.income || {}).reduce((a, b) => a + b, 0);
  let exp = 0;
  Object.values(md.expenses || {}).forEach(g => Object.values(g).forEach(v => exp += v));
  const accs = Object.values(md.accounts || {}).reduce((a, b) => a + b, 0);
  return { inc, exp, bal: inc - exp, accs };
}

// ── Get starting amounts for a given month ──────────────────────────────────
// For the first month with data or if no previous month has accounts, use data.sa.
// Otherwise, use the account values from the previous month as starting balances.
function getStartAmounts(d, m) {
  const mi = MS.indexOf(m);
  if (mi <= 0) {
    // January or unknown month: use global initial balances
    return Object.assign({}, d.sa || {});
  }
  // Check if previous month has account data
  const prevMonth = MS[mi - 1];
  const prevAccounts = d.months[prevMonth]?.accounts || {};
  const hasData = Object.values(prevAccounts).some(v => v > 0);
  if (hasData) {
    // Use previous month's final account values as starting balances
    return Object.assign({}, prevAccounts);
  }
  // No data in previous month: recurse back further
  return getStartAmounts(d, prevMonth);
}

function getStatLv(xp) { return Math.floor((xp || 0) / 20) + 1 }
function getStatPct(xp) { const lv = getStatLv(xp); return (((xp || 0) - (lv - 1) * 20) / 20) * 100 }

// ── Mood ─────────────────────────────────────────────────────────────────────
function getAutoMood() {
  if (fMood) return fMood;
  const ct = calcM(data, month);
  const h = new Date().getHours();
  if (h >= 23 || h < 6) return "sleeping";
  if (ct.bal < 0 && ct.exp > 0) return "sad";
  if (ct.inc > 0 && ct.exp > ct.inc * 0.9) return "angry";
  if (ct.inc > 0 && ct.bal > 0 && ct.bal / ct.inc > 0.3) return "money";
  const tds = (data.todos || []).filter(x => x.date === todayStr());
  if (tds.length > 0 && tds.filter(x => !x.done).length > 0) return "working";
  if (view === "history") return "thinking";
  return "idle";
}

function setMoodTmp(m, dur) {
  fMood = m;
  if (moodTimeout) clearTimeout(moodTimeout);
  moodTimeout = setTimeout(() => { fMood = null; render(); }, dur || 2500);
  render();
}

// ── Toast ────────────────────────────────────────────────────────────────────
function flash(msg, type) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast";
  t.style.display = "block";
  t.style.borderColor = type === "xp" ? "#FFD700" : "#2ECC71";
  t.style.color = type === "xp" ? "#FFD700" : "#2ECC71";
  if (type === "xp") showParticles();
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { t.style.display = "none"; }, 3500);
}

function showParticles() {
  const c = $("particles");
  const colors = ["#FFD700", "#E74C3C", "#2ECC71", "#3498DB", "#9B59B6"];
  c.innerHTML = ""; c.style.display = "block";
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = Math.random() * 100 + "%";
    p.style.top = Math.random() * 80 + "%";
    p.style.background = colors[i % 5];
    p.style.setProperty("--dur", (1 + Math.random() * 2) + "s");
    p.style.setProperty("--delay", Math.random() * 0.4 + "s");
    c.appendChild(p);
  }
  setTimeout(() => { c.style.display = "none"; c.innerHTML = ""; }, 3000);
}

// ── Quests ────────────────────────────────────────────────────────────────────
function checkQuests() {
  if (!data) return;
  QS.forEach(q => {
    const k = month + "-" + q.id;
    if (!data.cq[k] && q.ck(data, month)) {
      data.xp = (data.xp || 0) + q.xp;
      data.cq[k] = true;
      flash("🎯 " + q.n + " (+" + q.xp + "XP)", "xp");
      setMoodTmp("celebrate", 3000);
      schedSave();
    }
  });
}

// ── Save income ──────────────────────────────────────────────────────────────
function saveInc(id, amt, note) {
  const cat = IC.find(x => x.id === id);
  const entry = { id: Date.now().toString(), date: new Date().toISOString(), month, type: "income", catId: id, catName: cat?.name || id, icon: cat?.icon || "💰", amount: amt, note };
  if (!data.months[month].income) data.months[month].income = {};
  const prevInc = data.months[month].income[id] || 0;
  data.months[month].income[id] = prevInc + amt;
  data.hist = [entry, ...(data.hist || [])].slice(0, 500);
  closeModal();
  setMoodTmp("money", 2500);
  flash(`💰 ${cat?.name}: ${fmt(amt)}`, "success");
  schedSave();
  checkQuests();
  render();
}

// ── Save expense ─────────────────────────────────────────────────────────────
function saveExp(gid, cid, amt, note, projectId) {
  let gn = "", cn = "", gi = "📦";
  for (let i = 0; i < EG.length; i++) { if (EG[i].id === gid) { gn = EG[i].name; gi = EG[i].icon; for (let j = 0; j < EG[i].cats.length; j++) { if (EG[i].cats[j].id === cid) cn = EG[i].cats[j].name; } } }
  const entry = { id: Date.now().toString(), date: new Date().toISOString(), month, group: gid, cat: cid, amount: amt, note, groupName: gn, catName: cn, icon: gi };
  if (projectId) entry.projectId = projectId;
  if (!data.months[month].expenses) data.months[month].expenses = {};
  if (!data.months[month].expenses[gid]) data.months[month].expenses[gid] = {};
  data.months[month].expenses[gid][cid] = (data.months[month].expenses[gid][cid] || 0) + amt;
  data.hist = [entry, ...(data.hist || [])].slice(0, 500);
  closeModal();
  setMoodTmp(amt > 100 ? "angry" : "thinking", 1800);
  flash(`📝 ${cn}: ${fmt(amt)}`);
  schedSave();
  checkQuests();
  render();
}

// ── Accounts ─────────────────────────────────────────────────────────────────
function updateAccPending(id, value) {
  pendingAccs[id] = value;
  // Update only the save button state without re-rendering entire DOM
  const btn = document.querySelector(`[data-acc-save="${id}"]`);
  if (btn) {
    btn.disabled = false;
    btn.style.background = '#1ABC9C';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
  }
  // Update input border
  const inp = document.querySelector(`[data-acc-input="${id}"]`);
  if (inp) inp.style.borderColor = 'rgba(255,215,0,0.35)';
}
function updateStartPending(id, value) {
  pendingStarts[id] = value;
  // Show save button without re-rendering
  const container = document.querySelector(`[data-start-container="${id}"]`);
  if (container) {
    let btn = container.querySelector('.start-save-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'start-save-btn';
      btn.onclick = () => confirmStart(id);
      btn.style.cssText = 'margin-top:6px;width:100%;padding:6px;border-radius:7px;border:none;background:rgba(255,215,0,0.15);color:#FFD700;cursor:pointer;font-weight:700;font-size:11px';
      btn.textContent = '✓ Guardar';
      container.appendChild(btn);
    }
  }
  const inp = document.querySelector(`[data-start-input="${id}"]`);
  if (inp) inp.style.borderColor = 'rgba(255,215,0,0.3)';
}
function confirmAcc(id) {
  const v = pendingAccs[id];
  if (v === undefined) return;
  if (!data.months[month].accounts) data.months[month].accounts = {};
  data.months[month].accounts[id] = parseFloat(v) || 0;
  delete pendingAccs[id];
  flash("✅ Saldo actualizado", "success");
  schedSave(); checkQuests(); render();
}
function confirmStart(id) {
  const v = pendingStarts[id];
  if (v === undefined) return;
  data.sa[id] = parseFloat(v) || 0;
  delete pendingStarts[id];
  flash("✅ Saldo inicial guardado", "success");
  schedSave(); render();
}

// ── Todos ────────────────────────────────────────────────────────────────────
function addTodo() {
  const input = $("todo-input");
  const text = input ? input.value.trim() : "";
  if (!text) return;
  const d = TD.find(x => x.id === todoDif) || TD[0];
  const todoId = Date.now().toString();
  const newTodo = { id: todoId, text, diff: todoDif, area: todoArea, xp: d.xp, done: false, date: todoDate };

  // If schedule toggle is on, create linked schedule event
  if (todoAddToSchedule) {
    const sStart = ($('todo-schd-start')?.value || todoSchdStart).trim();
    const sEnd = ($('todo-schd-end')?.value || todoSchdEnd).trim();
    if (sStart && sEnd && typeof schdTimeToMin === 'function' && schdTimeToMin(sStart) < schdTimeToMin(sEnd)) {
      const eventId = (Date.now() + 1).toString();
      if (!data.schedule) data.schedule = [];
      data.schedule.push({
        id: eventId, title: text, date: todoDate,
        startTime: sStart, endTime: sEnd,
        area: todoArea, priority: null, description: '',
        done: false, todoId: todoId, createdAt: Date.now()
      });
      newTodo.scheduleEventId = eventId;
    }
  }

  data.todos = [...(data.todos || []), newTodo];
  if (input) input.value = "";
  todoText = "";
  todoAddToSchedule = false; todoSchdStart = ""; todoSchdEnd = "";
  schedSave(); checkQuests(); render();
}
function toggleTodo(id) {
  const todo = (data.todos || []).find(x => x.id === id); if (!todo) return;
  if (!todo.done) {
    flash(`✅ +${todo.xp}XP`, "xp"); setMoodTmp("celebrate", 2000);
    data.xp = (data.xp || 0) + todo.xp;
    data.stats[todo.area] = (data.stats[todo.area] || 0) + todo.xp;
    todo.done = true;
  } else {
    data.xp = Math.max(0, (data.xp || 0) - todo.xp);
    data.stats[todo.area] = Math.max(0, (data.stats[todo.area] || 0) - todo.xp);
    todo.done = false;
  }
  // Sync with linked university task (bidirectional)
  if (todo.uniTaskId) {
    const ut = (data.uniTasks || []).find(x => x.id === todo.uniTaskId);
    if (ut && ut.done !== todo.done) {
      ut.done = todo.done;
      if (ut.reminderId) {
        const rem = (data.reminders || []).find(x => x.id === ut.reminderId);
        if (rem) rem.done = todo.done;
      }
    }
  }
  // Sync with linked schedule event (bidirectional)
  if (todo.scheduleEventId) {
    const sev = (data.schedule || []).find(e => e.id === todo.scheduleEventId);
    if (sev && sev.done !== todo.done) sev.done = todo.done;
  }
  schedSave(); checkQuests(); render();
}
function deleteTodo(id) {
  const todo = (data.todos || []).find(x => x.id === id);
  // Remove linked schedule event if exists
  if (todo && todo.scheduleEventId) {
    data.schedule = (data.schedule || []).filter(e => e.id !== todo.scheduleEventId);
  }
  // Remove linked university task if exists
  if (todo && todo.uniTaskId) {
    data.uniTasks = (data.uniTasks || []).filter(x => x.id !== todo.uniTaskId);
  }
  data.todos = (data.todos || []).filter(x => x.id !== id);
  schedSave(); render();
}
function dateOffset(days) {
  const d = new Date(todoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  todoDate = d.toISOString().slice(0, 10);
  render();
}

// ── Export / Import ──────────────────────────────────────────────────────────
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `lifecontrol_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  URL.revokeObjectURL(url);
  flash("Datos exportados", "success");
}
function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const d = JSON.parse(ev.target.result);
      if (d && d.months) { data = d; flash("Backup restaurado!", "success"); schedSave(); render(); }
    } catch (err) { flash("Error al restaurar", "error"); }
  };
  reader.readAsText(file);
}

// ── Shopping List ────────────────────────────────────────────────────────────
function addShopItem() {
  const input = $("shop-input");
  const text = (input ? input.value : "").trim();
  if (!text) return;
  if (!data.shopList) data.shopList = [];
  data.shopList.push({ id: Date.now().toString(), text, qty: shopQty || "", cat: shopCat, done: false, date: todayStr() });
  if (input) input.value = "";
  shopText = ""; shopQty = "";
  schedSave(); render();
}
function toggleShopItem(id) {
  const item = (data.shopList || []).find(x => x.id === id);
  if (item) {
    item.done = !item.done;
    if (item.done) flash("✅ Comprado", "success");
    schedSave(); checkQuests(); render();
  }
}
function deleteShopItem(id) {
  data.shopList = (data.shopList || []).filter(x => x.id !== id);
  schedSave(); render();
}
function clearDoneShop() {
  if (!confirm("¿Eliminar todos los items completados?")) return;
  data.shopList = (data.shopList || []).filter(x => !x.done);
  flash("🧹 Lista limpiada", "success");
  schedSave(); render();
}
function clearAllShop() {
  if (!confirm("¿Vaciar toda la lista de compras?")) return;
  data.shopList = [];
  flash("🗑️ Lista vaciada", "success");
  schedSave(); render();
}

// ── Reminders ────────────────────────────────────────────────────────────────
function addReminder() {
  const input = $("rem-input");
  const text = (input ? input.value : "").trim();
  if (!text) return;
  if (!data.reminders) data.reminders = [];
  data.reminders.push({ id: Date.now().toString(), text, priority: remPri, date: remDate || "", done: false });
  if (input) input.value = "";
  remText = ""; remDate = "";
  showRemForm = false;
  flash("📌 Recordatorio agregado", "success");
  schedSave(); render();
}
function toggleReminder(id) {
  const rem = (data.reminders || []).find(x => x.id === id);
  if (rem) {
    rem.done = !rem.done;
    if (rem.done) flash("✅ Recordatorio completado", "success");
    schedSave(); render();
  }
}
function deleteReminder(id) {
  data.reminders = (data.reminders || []).filter(x => x.id !== id);
  schedSave(); render();
}

// ── Modal helpers ────────────────────────────────────────────────────────────
function openExpenseModal(gid, cid, cat, groupName) {
  const m = $("modal-expense");
  m.dataset.gid = gid; m.dataset.cid = cid;
  $("modal-exp-group").textContent = groupName;
  $("modal-exp-cat").textContent = cat.name;
  $("modal-exp-amt").value = "";
  $("modal-exp-note").value = "";
  if (typeof pjPopulateExpenseProjectSelect === "function") pjPopulateExpenseProjectSelect();
  m.style.display = "flex";
  setTimeout(() => $("modal-exp-amt").focus(), 100);
}
function openIncomeModal(id, name, icon) {
  const m = $("modal-income");
  m.dataset.id = id;
  $("modal-inc-icon").textContent = icon;
  $("modal-inc-name").textContent = name;
  $("modal-inc-amt").value = "";
  $("modal-inc-note").value = "";
  m.style.display = "flex";
  setTimeout(() => $("modal-inc-amt").focus(), 100);
}
function closeModal() {
  $("modal-expense").style.display = "none";
  $("modal-income").style.display = "none";
}

function submitExpense() {
  const m = $("modal-expense");
  const a = parseFloat($("modal-exp-amt").value) || 0;
  const n = $("modal-exp-note").value || "";
  const projSel = $("modal-exp-project");
  const pid = projSel ? (projSel.value || null) : null;
  if (a > 0) saveExp(m.dataset.gid, m.dataset.cid, a, n, pid);
}
function submitIncome() {
  const m = $("modal-income");
  const a = parseFloat($("modal-inc-amt").value) || 0;
  const n = $("modal-inc-note").value || "";
  if (a > 0) saveInc(m.dataset.id, a, n);
}

// ── Navigation ───────────────────────────────────────────────────────────────
function setView(v) { view = v; render(); }
function setMonth(m) { month = m; render(); }

// ── Avatar update ────────────────────────────────────────────────────────────
function upAv(k, v) { data.avatar[k] = v; schedSave(); render(); }

// ══════════════════════════════════════════════════════════════════════════════
// ── RENDER ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function render() {
  if (!data) return;
  const ct = calcM(data, month);
  const level = Math.floor((data.xp || 0) / 10) + 1;
  const xpNext = level * 10;
  const xpCur = (data.xp || 0) - (level - 1) * 10;
  let rank = RK[0];
  for (let ri = RK.length - 1; ri >= 0; ri--) { if (level >= RK[ri].m) { rank = RK[ri]; break; } }
  const monthStarts = getStartAmounts(data, month);
  const startT = Object.values(monthStarts).reduce((a, b) => a + b, 0);
  const autoMood = getAutoMood();
  const fmtSaved = lastSaved ? lastSaved.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }) : null;
  const isToday = todoDate === todayStr();
  const dateDisplay = isToday ? "Hoy" : new Date(todoDate + "T12:00:00").toLocaleDateString("es-EC", { weekday: "short", day: "numeric", month: "short" });
  const allTodosDay = (data.todos || []).filter(x => x.date === todoDate);
  const filteredTodos = areaFilter === "all" ? allTodosDay : allTodosDay.filter(x => x.area === areaFilter);
  const doneTodayCount = allTodosDay.filter(x => x.done).length;

  // ── Avatar ──
  $("avatar-container").innerHTML = renderAvatar(data.avatar, level, autoMood, 72, aFrame);
  const avCt = $("avatar-container");
  avCt.style.borderColor = rank.c + '55';
  avCt.style.background = `radial-gradient(ellipse at 55% 35%, ${rank.c}14 0%, rgba(0,0,0,0.55) 70%)`;
  avCt.style.boxShadow = `0 0 0 1px ${rank.c}25, 0 4px 24px ${rank.c}1e`;

  // ── Header info ──
  $("rank-badge").textContent = rank.b + " " + rank.n;
  $("rank-badge").style.color = rank.c;
  $("level-info").textContent = `Nivel ${level}  ·  ${data.xp || 0} XP total`;
  $("xp-bar-fill").style.width = (xpCur / xpNext) * 100 + "%";
  $("xp-bar-fill").style.background = `linear-gradient(90deg,${rank.c},#FFD700)`;
  $("xp-text").textContent = `${xpCur} / ${xpNext} XP`;
  $("save-indicator").textContent = fmtSaved ? `💾 ${fmtSaved}` : "";
  updateSyncUI();

  // Balance + cofres
  const balEl = $("header-balance");
  balEl.style.background = ct.bal >= 0 ? "rgba(46,204,113,0.07)" : "rgba(231,76,60,0.07)";
  balEl.style.borderColor = ct.bal >= 0 ? "rgba(46,204,113,0.18)" : "rgba(231,76,60,0.18)";
  $("header-balance-val").textContent = (ct.bal >= 0 ? "+" : "") + fS(ct.bal);
  $("header-balance-val").style.color = ct.bal >= 0 ? "#2ECC71" : "#E74C3C";
  $("header-cofres-val").textContent = fS(ct.accs || startT);

  // ── Stats ──
  let statsHTML = "";
  AREAS.forEach(a => {
    const sv = data.stats?.[a.id] || 0;
    const lv = getStatLv(sv);
    const pct = getStatPct(sv);
    statsHTML += `<div class="stat-item" style="background:${a.c}0e;border:1px solid ${a.c}28;border-radius:10px;padding:8px 5px;text-align:center">
      <div class="stat-icon" style="font-size:18px;margin-bottom:4px">${a.icon}</div>
      <div class="stat-name" style="font-size:9px;color:${a.c};font-weight:700;margin-bottom:3px;letter-spacing:0.3px">${a.n}</div>
      <div class="stat-lv rpg" style="font-size:10px;color:#eee">${lv}</div>
      <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-top:5px"><div style="height:100%;width:${pct}%;background:${a.c};border-radius:3px;transition:width 0.5s"></div></div>
    </div>`;
  });
  $("stats-grid").innerHTML = statsHTML;

  // ── Settings ──
  $("settings-panel").classList.toggle("hidden", !showSettings);
  if (showSettings) {
    const cloudTime = lastCloudSync ? lastCloudSync.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }) : null;
    $("settings-save-status").innerHTML = fmtSaved ? `✅ Guardado local: ${fmtSaved}${cloudTime ? ` &nbsp;·&nbsp; ☁️ Cloud: ${cloudTime}` : ""}<br><span style="font-size:10px;color:#888">Código: <b style="color:#FFD700">${playerCode || "—"}</b></span>` : "⏳ Guardando...";
  }

  // ── Avatar editor ──
  $("avatar-editor").classList.toggle("hidden", !showAv);
  if (showAv) renderAvatarEditor();

  // ── Months ──
  let monthsHTML = "";
  MS.forEach(m => {
    const on = month === m;
    monthsHTML += `<button onclick="setMonth('${m}')" style="flex-shrink:0;padding:7px 13px;border-radius:20px;border:1px solid ${on ? "#FFD700" : "rgba(255,255,255,0.07)"};background:${on ? "rgba(255,215,0,0.1)" : "rgba(14,18,30,0.8)"};color:${on ? "#FFD700" : "#555"};cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">${m.slice(0, 3)}</button>`;
  });
  $("months-bar").innerHTML = monthsHTML;

  // ── Views ──
  $("view-dashboard").classList.toggle("hidden", view !== "dashboard");
  $("view-income").classList.toggle("hidden", view !== "income");
  $("view-expenses").classList.toggle("hidden", view !== "expenses");
  $("view-accounts").classList.toggle("hidden", view !== "accounts");
  $("view-todos").classList.toggle("hidden", view !== "todos");
  $("view-university").classList.toggle("hidden", view !== "university");
  $("view-projects").classList.toggle("hidden", view !== "projects");
  $("view-shopping").classList.toggle("hidden", view !== "shopping");
  $("view-history").classList.toggle("hidden", view !== "history");
  $("view-schedule").classList.toggle("hidden", view !== "schedule");

  // ── Dashboard ──
  if (view === "dashboard") { renderDashboard(ct, rank); renderReminders(); renderWeeklySummary(); renderTrendChart(); renderHabitsPreview(); renderJournalCard(); renderDailyQuote(); renderFocusChallenge(); if (typeof pjRenderDashWidget === "function") pjRenderDashWidget(); }
  if (view === "income") renderIncome(ct);
  if (view === "expenses") { renderExpenses(ct); renderRecurring(); renderSubs(); }
  if (view === "accounts") { renderAccounts(ct, startT, monthStarts); renderGoals(); renderDebts(); }
  if (view === "todos") renderTodos(allTodosDay, filteredTodos, doneTodayCount, isToday, dateDisplay);
  if (view === "university") renderUniversity();
  if (view === "projects" && typeof renderProjects === "function") renderProjects();
  if (view === "shopping") { renderShopping(); renderWishlist(); }
  if (view === "history") { renderHistory(); renderComparador(); }
  if (view === "schedule" && typeof renderSchedule === "function") renderSchedule();
  if (showSettings) renderSettingsExtras();

  // Apply theme
  applyTheme(data.theme || "cyber");

  // ── Nav ──
  NAV.forEach(n => {
    const btn = $("nav-" + n.id);
    if (btn) {
      btn.className = "nb" + (view === n.id ? " on" : "");
    }
  });
}

// ── Dashboard view ───────────────────────────────────────────────────────────
function renderDashboard(ct, rank) {
  // Balance
  $("dash-balance-card").style.borderColor = ct.bal >= 0 ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)";
  $("dash-month").textContent = "Balance — " + month;
  $("dash-balance").textContent = (ct.bal >= 0 ? "+" : "") + fmt(ct.bal);
  $("dash-balance").style.color = ct.bal >= 0 ? "#2ECC71" : "#E74C3C";
  $("dash-balance").className = "rpg";
  $("dash-inc").textContent = "↑ " + fS(ct.inc);
  $("dash-exp").textContent = "↓ " + fS(ct.exp);
  const saveEl = $("dash-save-pct");
  if (ct.inc > 0) { saveEl.textContent = ((ct.bal / ct.inc) * 100).toFixed(1) + "% ahorro"; saveEl.style.color = rank.c; saveEl.style.display = ""; }
  else saveEl.style.display = "none";

  // Balance bar
  const bb = $("dash-balance-bar");
  if ((ct.inc + ct.exp) > 0) {
    bb.style.display = "flex";
    $("dash-bar-inc").style.width = (ct.inc / (ct.inc + ct.exp)) * 100 + "%";
    $("dash-bar-exp").style.width = (ct.exp / (ct.inc + ct.exp)) * 100 + "%";
  } else bb.style.display = "none";

  // Expense breakdown
  const ebEl = $("dash-expense-breakdown");
  if (ct.exp > 0) {
    ebEl.classList.remove("hidden");
    $("dash-exp-total").textContent = fS(ct.exp) + " total";
    let ebHTML = "";
    getEffectiveEG().forEach(g => {
      const gt = Object.values(data.months[month]?.expenses?.[g.id] || {}).reduce((a, b) => a + b, 0);
      if (!gt) return;
      const p = (gt / ct.exp) * 100;
      ebHTML += `<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span style="color:#ccc">${g.icon} ${g.name}</span>
          <span style="color:${g.color};font-weight:700">${fS(gt)} <span style="font-size:10px;color:#555;font-weight:400">(${p.toFixed(0)}%)</span></span>
        </div>
        <div style="height:5px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden"><div style="height:100%;width:${p}%;background:${g.color};border-radius:3px"></div></div>
      </div>`;
    });
    $("dash-exp-list").innerHTML = ebHTML;
  } else ebEl.classList.add("hidden");

  // Today's tasks summary
  const tt = (data.todos || []).filter(x => x.date === todayStr());
  const ttEl = $("dash-today-tasks");
  if (tt.length > 0) {
    ttEl.classList.remove("hidden");
    const dn = tt.filter(x => x.done).length;
    $("dash-tasks-count").textContent = `${dn}/${tt.length}`;
    $("dash-tasks-bar").style.width = (tt.length ? (dn / tt.length) * 100 : 0) + "%";
    let pillsHTML = "";
    AREAS.forEach(a => {
      const ac = tt.filter(x => x.area === a.id).length;
      if (!ac) return;
      const ad = tt.filter(x => x.area === a.id && x.done).length;
      pillsHTML += `<span class="pill" style="color:${a.c};border-color:${a.c}30;background:${a.c}12">${a.icon} ${ad}/${ac}</span>`;
    });
    $("dash-tasks-pills").innerHTML = pillsHTML;
  } else ttEl.classList.add("hidden");
}

// ── Income view ──────────────────────────────────────────────────────────────
function renderIncome(ct) {
  $("inc-total").textContent = fS(ct.inc);
  $("inc-month").textContent = month + " — Toca una fuente para registrar";
  let html = "";
  getEffectiveIC().forEach(c => {
    const total = data.months[month]?.income?.[c.id] || 0;
    const entries = (data.hist || []).filter(h => h.type === "income" && h.catId === c.id && h.month === month);
    let entriesHTML = "";
    if (entries.length > 0) {
      entriesHTML = `<div style="padding:0 13px 12px;display:flex;flex-direction:column;gap:5px">`;
      entries.slice(0, 5).forEach(e => {
        entriesHTML += `<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:rgba(46,204,113,0.04);border-radius:8px;border-left:3px solid rgba(46,204,113,0.3)">
          <span style="font-size:12px;color:#2ECC71;font-weight:700">${fmt(e.amount)}</span>
          ${e.note ? `<span style="flex:1;font-size:11px;color:#777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📝 ${e.note}</span>` : ""}
          <span style="font-size:10px;color:#444;flex-shrink:0">${new Date(e.date).toLocaleDateString("es-EC", { day: "2-digit", month: "short" })}</span>
        </div>`;
      });
      if (entries.length > 5) entriesHTML += `<div style="font-size:10px;color:#555;text-align:center;padding-top:3px">+${entries.length - 5} más en historial</div>`;
      entriesHTML += "</div>";
    }
    html += `<div class="card" style="padding:0;border-color:${total > 0 ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.05)"}">
      <div style="display:flex;align-items:center;gap:13px;padding:13px 15px">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${c.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:#ddd">${c.name}</div>
          ${entries.length > 0 ? `<div style="font-size:10px;color:#555;margin-top:2px">${entries.length} entrada${entries.length > 1 ? "s" : ""}</div>` : ""}
        </div>
        <div style="text-align:right;margin-right:10px">
          <div style="font-size:15px;font-weight:800;color:${total > 0 ? "#2ECC71" : "#444"}">${total > 0 ? fS(total) : "—"}</div>
        </div>
        <button onclick="openIncomeModal('${c.id}','${c.name}','${c.icon}')" style="flex-shrink:0;padding:7px 13px;border-radius:9px;border:1px solid rgba(46,204,113,0.35);background:rgba(46,204,113,0.08);color:#2ECC71;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">+ Añadir</button>
      </div>
      ${entriesHTML}
    </div>`;
  });
  $("inc-list").innerHTML = html;
}

// ── Expenses view ────────────────────────────────────────────────────────────
function renderExpenses(ct) {
  $("exp-total").textContent = fS(ct.exp);
  $("exp-month").textContent = month + " — Toca una categoría para añadir";
  let html = "";
  getEffectiveEG().forEach(g => {
    const gt = Object.values(data.months[month]?.expenses?.[g.id] || {}).reduce((a, b) => a + b, 0);
    const open = expGr === g.id;
    let catsHTML = "";
    if (open) {
      catsHTML = `<div style="padding:0 13px 13px;display:flex;flex-direction:column;gap:7px">`;
      (g.cats || []).forEach(c2 => {
        const cv = data.months[month]?.expenses?.[g.id]?.[c2.id] || 0;
        catsHTML += `<div onclick="openExpenseModal('${g.id}','${c2.id}',{name:'${c2.name}'},'${g.name}')" style="display:flex;align-items:center;padding:10px 12px;background:rgba(0,0,0,0.3);border-radius:10px;cursor:pointer;border-left:3px solid ${g.color}">
          <span style="flex:1;font-size:13px;color:#aaa">${c2.name}</span>
          <span style="font-size:13px;color:${cv > 0 ? g.color : "#444"};font-weight:700;margin-right:10px">${cv > 0 ? fS(cv) : "—"}</span>
          <span style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.07);border-radius:6px;color:#777">+ Añadir</span>
        </div>`;
      });
      catsHTML += "</div>";
    }
    html += `<div class="card" style="padding:0;border-color:${open ? g.color + "44" : "rgba(255,255,255,0.05)"}">
      <div onclick="toggleExpGroup('${g.id}')" style="display:flex;align-items:center;gap:13px;padding:13px 15px;cursor:pointer">
        <span style="font-size:22px">${g.icon}</span>
        <span style="flex:1;font-size:14px;color:${open ? g.color : "#ccc"};font-weight:600">${g.name}</span>
        <span style="font-size:13px;color:${gt > 0 ? g.color : "#444"};font-weight:700">${gt > 0 ? fS(gt) : "—"}</span>
        <span style="font-size:10px;color:#444;transform:${open ? "rotate(90deg)" : ""};transition:0.2s;display:inline-block">▶</span>
      </div>
      ${catsHTML}
    </div>`;
  });
  $("exp-list").innerHTML = html;
}
function toggleExpGroup(id) { expGr = expGr === id ? null : id; render(); }

// ── Accounts view ────────────────────────────────────────────────────────────
function renderAccounts(ct, startT, monthStarts) {
  // Cuadre
  const esperado = startT + ct.inc - ct.exp;
  const diferencia = ct.accs - esperado;
  const difOk = Math.abs(diferencia) < 1;
  const difColor = difOk ? "#2ECC71" : diferencia > 0 ? "#F1C40F" : "#E74C3C";
  const difLabel = difOk ? "✅ Todo cuadra perfectamente" : diferencia > 0 ? `+${fS(diferencia)} sin contabilizar (ingreso o saldo extra)` : `${fS(diferencia)} de diferencia (posibles gastos sin registrar)`;
  $("acc-cuadre-month").textContent = "📊 Cuadre del Mes — " + month;

  // Check if start amounts come from previous month's accounts
  const mi = MS.indexOf(month);
  const fromPrevMonth = mi > 0 && Object.values(data.months[MS[mi - 1]]?.accounts || {}).some(v => v > 0);
  const startLabel = fromPrevMonth ? `Saldo heredado de ${MS[mi - 1]}` : "Saldo inicial (configurado)";

  // Formula rows
  $("acc-start-val").textContent = fS(startT);
  $("acc-inc-val").textContent = "+ " + fS(ct.inc);
  $("acc-exp-val").textContent = "− " + fS(ct.exp);
  $("acc-esperado").textContent = fS(esperado);
  $("acc-real").textContent = fS(ct.accs);
  $("acc-dif-label").textContent = difLabel;
  $("acc-dif-label").style.color = difColor;
  $("acc-dif-box").style.background = difColor + "0f";
  $("acc-dif-box").style.borderColor = difColor + "30";

  // Account list
  let html = "";
  AC.forEach(a => {
    const savedVal = data.months[month]?.accounts?.[a.id] || 0;
    const initVal = monthStarts[a.id] || 0;
    const inputVal = pendingAccs[a.id] !== undefined ? pendingAccs[a.id] : (savedVal || "");
    const hasPending = pendingAccs[a.id] !== undefined;
    const delta = savedVal - initVal;
    const deltaColor = delta > 0 ? "#2ECC71" : delta < 0 ? "#E74C3C" : "#555";
    const deltaLabel = delta === 0 ? "Sin cambio" : delta > 0 ? `+${fS(delta)} desde inicio` : `${fS(delta)} desde inicio`;

    html += `<div class="card" style="padding:13px 14px;border-color:${a.c}20">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:34px;height:34px;border-radius:9px;background:${a.c}18;border:1px solid ${a.c}30;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${a.icon}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:#ddd">${a.name}</div>
          <div style="font-size:11px;color:#555;margin-top:1px">${fromPrevMonth ? 'Heredado' : 'Inicio del mes'}: <span style="color:#888;font-weight:600">${fS(initVal)}</span></div>
        </div>
        <div style="text-align:right"><div style="font-size:11px;color:${deltaColor};font-weight:700">${deltaLabel}</div></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="flex:1">
          <div style="font-size:11px;color:#555;margin-bottom:5px;font-weight:600">Saldo actual</div>
          <input class="inp" data-acc-input="${a.id}" type="number" min="0" step="0.01" placeholder="0.00" value="${inputVal}" oninput="updateAccPending('${a.id}',this.value)" onkeydown="if(event.key==='Enter')confirmAcc('${a.id}')" style="font-size:16px;padding:10px 12px;border-color:${hasPending ? "rgba(255,215,0,0.35)" : "rgba(255,255,255,0.09)"}"/>
        </div>
        <div style="padding-top:19px">
          <button data-acc-save="${a.id}" onclick="confirmAcc('${a.id}')" ${!hasPending ? "disabled" : ""} style="padding:10px 14px;border-radius:10px;border:none;background:${hasPending ? "#1ABC9C" : "rgba(255,255,255,0.05)"};color:${hasPending ? "#fff" : "#444"};cursor:${hasPending ? "pointer" : "default"};font-weight:700;font-size:13px;white-space:nowrap;transition:0.2s">✓ Guardar</button>
        </div>
      </div>
    </div>`;
  });
  $("acc-list").innerHTML = html;

  // Initial balances
  $("acc-init-panel").classList.toggle("hidden", !showInitEdit);
  $("acc-init-total").textContent = fS(startT);
  $("acc-init-arrow").style.transform = showInitEdit ? "rotate(90deg)" : "";
  if (showInitEdit) {
    let initHTML = "";
    AC.forEach(a => {
      const startInput = pendingStarts[a.id] !== undefined ? pendingStarts[a.id] : (data.sa?.[a.id] || "");
      const hasStartPending = pendingStarts[a.id] !== undefined;
      initHTML += `<div data-start-container="${a.id}" style="padding:10px;background:rgba(0,0,0,0.25);border-radius:10px;border:1px solid ${hasStartPending ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.05)"}">
        <div style="font-size:11px;color:#666;margin-bottom:6px;font-weight:600">${a.icon} ${a.name}</div>
        <input class="inp" data-start-input="${a.id}" type="number" min="0" step="0.01" placeholder="0.00" value="${startInput}" oninput="updateStartPending('${a.id}',this.value)" onkeydown="if(event.key==='Enter')confirmStart('${a.id}')" style="font-size:14px;padding:7px 9px;border-color:${hasStartPending ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.09)"}"/>
        ${hasStartPending ? `<button class="start-save-btn" onclick="confirmStart('${a.id}')" style="margin-top:6px;width:100%;padding:6px;border-radius:7px;border:none;background:rgba(255,215,0,0.15);color:#FFD700;cursor:pointer;font-weight:700;font-size:11px">✓ Guardar</button>` : ""}
      </div>`;
    });
    $("acc-init-grid").innerHTML = initHTML;
  }
}
function toggleInitEdit() { showInitEdit = !showInitEdit; render(); }

// ── Todos view ───────────────────────────────────────────────────────────────
function setTodoViewMode(mode) { todoViewMode = mode; render(); }

function renderTodos(allTodosDay, filteredTodos, doneTodayCount, isToday, dateDisplay) {
  // View mode toggle (Day vs General vs Habits)
  const viewModeEl = $("todo-view-mode");
  if (viewModeEl) {
    viewModeEl.innerHTML = `
      <button onclick="setTodoViewMode('day')" style="flex:1;padding:8px;border-radius:8px;border:1px solid ${todoViewMode === 'day' ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.07)'};background:${todoViewMode === 'day' ? 'rgba(255,107,53,0.12)' : 'transparent'};color:${todoViewMode === 'day' ? '#FF6B35' : '#555'};cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">📅 Por Día</button>
      <button onclick="setTodoViewMode('general')" style="flex:1;padding:8px;border-radius:8px;border:1px solid ${todoViewMode === 'general' ? 'rgba(171,71,188,0.4)' : 'rgba(255,255,255,0.07)'};background:${todoViewMode === 'general' ? 'rgba(171,71,188,0.12)' : 'transparent'};color:${todoViewMode === 'general' ? '#AB47BC' : '#555'};cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">📋 General</button>
      <button onclick="setTodoViewMode('habits')" style="flex:1;padding:8px;border-radius:8px;border:1px solid ${todoViewMode === 'habits' ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.07)'};background:${todoViewMode === 'habits' ? 'rgba(255,215,0,0.12)' : 'transparent'};color:${todoViewMode === 'habits' ? '#FFD700' : '#555'};cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">🔄 Hábitos</button>
    `;
  }

  if (todoViewMode === 'habits') {
    renderHabitsTab();
    return;
  }

  if (todoViewMode === 'general') {
    renderTodosGeneral();
    return;
  }

  // Day view (existing)
  $("todo-day-nav").classList.remove("hidden");
  $("todo-date-display").textContent = dateDisplay;
  $("todo-date-sub").textContent = isToday ? "" : todoDate;
  $("todo-date-sub").style.display = isToday ? "none" : "";
  $("todo-today-btn").style.background = isToday ? "rgba(255,107,53,0.18)" : "transparent";
  $("todo-today-btn").style.border = isToday ? "1px solid rgba(255,107,53,0.35)" : "1px solid transparent";
  $("todo-today-btn").style.color = isToday ? "#FF6B35" : "#777";
  
  // Update schedule toggle UI
  const schdBtn = $("todo-schd-toggle-btn");
  const schdFields = $("todo-schd-fields");
  if (schdBtn) {
    schdBtn.style.background = todoAddToSchedule ? "rgba(255,215,0,0.15)" : "rgba(255,215,0,0.03)";
    schdBtn.style.borderColor = todoAddToSchedule ? "rgba(255,215,0,0.6)" : "rgba(255,215,0,0.25)";
    schdBtn.style.color = todoAddToSchedule ? "#FFD700" : "rgba(255,215,0,0.5)";
    schdBtn.innerHTML = todoAddToSchedule ? "🗓️ Programado en Agenda" : "🗓️ Agregar a Agenda (opcional)";
  }
  if (schdFields) schdFields.style.display = todoAddToSchedule ? "block" : "none";

  $("todo-progress-count").textContent = `${doneTodayCount} / ${allTodosDay.length}`;
  $("todo-progress-bar").style.width = (allTodosDay.length ? (doneTodayCount / allTodosDay.length) * 100 : 0) + "%";

  // Area selector
  let areaHTML = "";
  AREAS.forEach(a => {
    const on = todoArea === a.id;
    areaHTML += `<button onclick="todoArea='${a.id}';render()" class="tab" style="color:${on ? a.c : "#555"};border-color:${on ? a.c : "rgba(255,255,255,0.07)"};background:${on ? a.c + "18" : "rgba(0,0,0,0.25)"}">${a.icon} ${a.n}</button>`;
  });
  $("todo-area-selector").innerHTML = areaHTML;

  // Difficulty selector
  let difHTML = "";
  TD.forEach(d => {
    const on = todoDif === d.id;
    difHTML += `<button onclick="todoDif='${d.id}';render()" style="padding:6px 11px;border-radius:8px;border:1px solid ${on ? d.c : "rgba(255,255,255,0.06)"};color:${on ? d.c : "#555"};background:${on ? d.c + "14" : "transparent"};cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap">${d.i} ${d.xp}XP</button>`;
  });
  $("todo-dif-selector").innerHTML = difHTML;

  // Area filter
  let filterHTML = `<button onclick="areaFilter='all';render()" class="tab ${areaFilter === "all" ? "on" : ""}" style="color:${areaFilter === "all" ? "#eee" : "#555"};border-color:${areaFilter === "all" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.07)"};background:${areaFilter === "all" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.25)"}">📋 Todas${allTodosDay.length > 0 ? ` <span style="font-size:10px;color:#666">(${doneTodayCount}/${allTodosDay.length})</span>` : ""}</button>`;
  AREAS.forEach(a => {
    const ac = allTodosDay.filter(x => x.area === a.id).length;
    const ad = allTodosDay.filter(x => x.area === a.id && x.done).length;
    const on = areaFilter === a.id;
    filterHTML += `<button onclick="areaFilter='${a.id}';render()" class="tab ${on ? "on" : ""}" style="color:${on ? a.c : "#555"};border-color:${on ? a.c : "rgba(255,255,255,0.07)"};background:${on ? a.c + "18" : "rgba(0,0,0,0.25)"}">${a.icon} ${a.n}${ac > 0 ? ` <span style="font-size:10px;color:${on ? a.c : "#555"}">(${ad}/${ac})</span>` : ""}</button>`;
  });
  $("todo-filter-bar").innerHTML = filterHTML;

  // Todo list
  let listHTML = "";
  const displayTodos = filteredTodos.filter(t => !t.scheduleEventId);
  if (displayTodos.length === 0) {
    listHTML = `<div style="text-align:center;padding:26px;color:#444"><div style="font-size:28px;margin-bottom:9px">📭</div><div style="font-size:13px">${areaFilter === "all" ? "No hay misiones para este día." : `Sin tareas de ${AREAS.find(x => x.id === areaFilter)?.n || ""} hoy.`}</div></div>`;
  }
  displayTodos.forEach(todo => {
    const df = TD.find(x => x.id === todo.diff) || TD[0];
    const ar = AREAS.find(x => x.id === todo.area) || AREAS[0];
    listHTML += `<div style="display:flex;align-items:center;gap:11px;padding:11px 13px;background:${todo.done ? "rgba(46,204,113,0.04)" : "rgba(0,0,0,0.2)"};border-radius:12px;border:1px solid ${todo.done ? "rgba(46,204,113,0.18)" : "rgba(255,255,255,0.05)"};transition:0.2s">
      <div onclick="toggleTodo('${todo.id}')" style="width:25px;height:25px;border-radius:7px;border:2px solid ${todo.done ? "#2ECC71" : ar.c + "88"};background:${todo.done ? "rgba(46,204,113,0.18)" : "transparent"};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:#2ECC71;flex-shrink:0;transition:0.2s">${todo.done ? "✓" : ""}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;color:${todo.done ? "#555" : "#eee"};text-decoration:${todo.done ? "line-through" : "none"};font-weight:500;margin-bottom:5px;line-height:1.3">${todo.text}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <span class="pill" style="color:${ar.c};border-color:${ar.c}28;background:${ar.c}12">${ar.icon} ${ar.n}</span>
          <span class="pill" style="color:${df.c};border-color:${df.c}28;background:${df.c}12">${df.i} +${todo.xp}XP</span>
          ${todo.scheduleEventId ? '<span class="pill" style="color:#FFD700;border-color:rgba(255,215,0,0.2);background:rgba(255,215,0,0.08)">🗓️ Agenda</span>' : ''}
        </div>
      </div>
      <button onclick="deleteTodo('${todo.id}')" style="background:transparent;border:none;color:#3a3a4a;cursor:pointer;font-size:15px;padding:5px;flex-shrink:0">🗑️</button>
    </div>`;
  });

  // ── Actividades de Agenda para este día ──────────────────────────────────
  const _daySchd = (data.schedule || [])
    .filter(e => e.date === todoDate)
    .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

  if (_daySchd.length > 0) {
    // If there were no regular todos, clear the empty-state message
    if (displayTodos.length === 0) listHTML = '';

    listHTML += `<div style="${displayTodos.length > 0 ? 'margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);' : ''}">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:9px">
        <span style="font-size:13px">🗓️</span>
        <span style="font-size:9px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Actividades de Agenda</span>
        <span style="font-size:9px;color:#333;font-weight:700">(${_daySchd.filter(e=>e.done).length}/${_daySchd.length})</span>
      </div>`;

    _daySchd.forEach(ev => {
      const _allAreas = typeof getEffectiveAreas === 'function' ? getEffectiveAreas() : AREAS;
      const _ar = _allAreas.find(a => a.id === ev.area) || AREAS[0];
      const _colors = typeof schdGetAreaColors === 'function' ? schdGetAreaColors(ev.area) : { bg: 'rgba(52,152,219,0.78)', border: '#3498DB' };
      const _arColor = _ar.c || _colors.border;
      const _timeStr = typeof schdFmt === 'function' ? `${schdFmt(ev.startTime)} – ${schdFmt(ev.endTime)}` : `${ev.startTime}–${ev.endTime}`;
      listHTML += `<div style="display:flex;align-items:center;gap:11px;padding:10px 12px;background:${ev.done ? 'rgba(46,204,113,0.04)' : 'rgba(0,0,0,0.18)'};border-radius:12px;border:1px solid ${ev.done ? 'rgba(46,204,113,0.18)' : _colors.border + '22'};border-left:3px solid ${_colors.border};margin-bottom:5px;transition:0.2s">
        <div onclick="if(typeof schdToggleDone==='function'){schdToggleDone('${ev.id}');render();}" style="width:25px;height:25px;border-radius:7px;border:2px solid ${ev.done ? '#2ECC71' : _colors.border + '88'};background:${ev.done ? 'rgba(46,204,113,0.18)' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:#2ECC71;flex-shrink:0;transition:0.2s">${ev.done ? '✓' : ''}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;color:${ev.done ? '#555' : '#eee'};text-decoration:${ev.done ? 'line-through' : 'none'};font-weight:500;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.title}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
            <span class="pill" style="color:${_arColor};border-color:${_arColor}28;background:${_arColor}12">${_ar.icon} ${_ar.n || _ar.name}</span>
            <span style="font-size:9px;color:#555;font-weight:700;background:rgba(0,0,0,0.25);padding:2px 6px;border-radius:5px">⏰ ${_timeStr}</span>
          </div>
        </div>
        <span class="pill" style="color:#FFD700;border-color:rgba(255,215,0,0.2);background:rgba(255,215,0,0.08);flex-shrink:0;font-size:9px">🗓️</span>
      </div>`;
    });
    listHTML += `</div>`;
  }

  $("todo-list").innerHTML = listHTML;
}

// ── General (all pending) view ───────────────────────────────────────────────
function renderTodosGeneral() {
  $("todo-day-nav").classList.add("hidden");

  // Gather all pending tasks, sorted by date
  const allPending = (data.todos || []).filter(x => !x.done).sort((a, b) => a.date.localeCompare(b.date));
  const allDone = (data.todos || []).filter(x => x.done).length;
  const totalAll = (data.todos || []).length;

  $("todo-progress-count").textContent = `${allDone} / ${totalAll}`;
  $("todo-progress-bar").style.width = (totalAll ? (allDone / totalAll) * 100 : 0) + "%";

  // Hide area/difficulty selectors for general view, show only filter
  $("todo-area-selector").innerHTML = "";
  $("todo-dif-selector").innerHTML = "";

  // Area filter for general view
  const filteredPending = areaFilter === "all" ? allPending : allPending.filter(x => x.area === areaFilter);
  let filterHTML = `<button onclick="areaFilter='all';render()" class="tab ${areaFilter === "all" ? "on" : ""}" style="color:${areaFilter === "all" ? "#eee" : "#555"};border-color:${areaFilter === "all" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.07)"};background:${areaFilter === "all" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.25)"}">📋 Todas <span style="font-size:10px;color:#666">(${allPending.length})</span></button>`;
  AREAS.forEach(a => {
    const ac = allPending.filter(x => x.area === a.id).length;
    const on = areaFilter === a.id;
    if (ac > 0) filterHTML += `<button onclick="areaFilter='${a.id}';render()" class="tab ${on ? "on" : ""}" style="color:${on ? a.c : "#555"};border-color:${on ? a.c : "rgba(255,255,255,0.07)"};background:${on ? a.c + "18" : "rgba(0,0,0,0.25)"}">${a.icon} ${a.n} <span style="font-size:10px;color:${on ? a.c : "#555"}">(${ac})</span></button>`;
  });
  $("todo-filter-bar").innerHTML = filterHTML;

  // Group by date
  const groups = {};
  const displayPending = filteredPending.filter(t => !t.scheduleEventId);
  displayPending.forEach(t => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });

  let listHTML = "";
  if (displayPending.length === 0) {
    listHTML = `<div style="text-align:center;padding:30px;color:#444"><div style="font-size:32px;margin-bottom:12px">🎉</div><div style="font-size:14px;font-weight:600;color:#2ECC71">¡Sin tareas pendientes!</div><div style="font-size:12px;color:#555;margin-top:4px">Todas las misiones han sido completadas.</div></div>`;
  } else {
    const today = todayStr();
    Object.keys(groups).sort().forEach(dateKey => {
      const tasks = groups[dateKey];
      const d = new Date(dateKey + "T12:00:00");
      const isToday = dateKey === today;
      const isPast = dateKey < today;
      const dateLabel = isToday ? "📅 Hoy" : d.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long" });
      const dateColor = isToday ? "#FF6B35" : isPast ? "#E74C3C" : "#888";
      const dateBadge = isPast && !isToday ? " ⚠️ Atrasada" : "";

      listHTML += `<div style="margin-bottom:6px">
        <div style="font-size:11px;font-weight:700;color:${dateColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding:4px 8px;background:${dateColor}0e;border-radius:6px;border-left:3px solid ${dateColor};display:inline-block">${dateLabel}${dateBadge} <span style="font-size:10px;color:#555;font-weight:400">(${tasks.length})</span></div>
      </div>`;

      tasks.forEach(todo => {
        const df = TD.find(x => x.id === todo.diff) || TD[0];
        const ar = AREAS.find(x => x.id === todo.area) || AREAS[0];
        listHTML += `<div style="display:flex;align-items:center;gap:11px;padding:11px 13px;background:rgba(0,0,0,0.2);border-radius:12px;border:1px solid ${isPast && !isToday ? 'rgba(231,76,60,0.15)' : 'rgba(255,255,255,0.05)'};transition:0.2s;margin-bottom:6px">
          <div onclick="toggleTodo('${todo.id}')" style="width:25px;height:25px;border-radius:7px;border:2px solid ${ar.c}88;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:#2ECC71;flex-shrink:0;transition:0.2s"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;color:#eee;font-weight:500;margin-bottom:5px;line-height:1.3">${todo.text}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
              <span class="pill" style="color:${ar.c};border-color:${ar.c}28;background:${ar.c}12">${ar.icon} ${ar.n}</span>
              <span class="pill" style="color:${df.c};border-color:${df.c}28;background:${df.c}12">${df.i} +${todo.xp}XP</span>
            </div>
          </div>
          <button onclick="deleteTodo('${todo.id}')" style="background:transparent;border:none;color:#3a3a4a;cursor:pointer;font-size:15px;padding:5px;flex-shrink:0">🗑️</button>
        </div>`;
      });
    });
  }

  // ── Actividades de Agenda (General view) ─────────────────────────────────
  const _allSchd = (data.schedule || [])
    .filter(e => areaFilter === 'all' || e.area === areaFilter)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''));

  if (_allSchd.length > 0) {
    const _today = todayStr();
    // Group by date
    const _schdGroups = {};
    _allSchd.forEach(ev => {
      if (!_schdGroups[ev.date]) _schdGroups[ev.date] = [];
      _schdGroups[ev.date].push(ev);
    });

    // Append a section header only if it's needed
    if (displayPending.length > 0) {
      listHTML += `<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.05)"></div>`;
    }
    listHTML += `<div style="font-size:9px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;display:flex;align-items:center;gap:5px">
      <span style="font-size:13px">🗓️</span><span>Actividades de Agenda</span>
      <span style="color:#333">(${_allSchd.filter(e=>e.done).length}/${_allSchd.length})</span>
    </div>`;

    Object.keys(_schdGroups).sort().forEach(dateKey => {
      const evs = _schdGroups[dateKey];
      const _d = new Date(dateKey + 'T12:00:00');
      const _isToday = dateKey === _today;
      const _isPast = dateKey < _today;
      const _dateLabel = _isToday ? '📅 Hoy' : _d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
      const _dateColor = _isToday ? '#FF6B35' : _isPast ? '#E74C3C' : '#888';

      listHTML += `<div style="font-size:11px;font-weight:700;color:${_dateColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding:4px 8px;background:${_dateColor}0e;border-radius:6px;border-left:3px solid ${_dateColor};display:inline-block">${_dateLabel} <span style="font-size:10px;color:#555;font-weight:400">(${evs.length})</span></div>`;

      evs.forEach(ev => {
        const _allAreas = typeof getEffectiveAreas === 'function' ? getEffectiveAreas() : AREAS;
        const _ar = _allAreas.find(a => a.id === ev.area) || AREAS[0];
        const _colors = typeof schdGetAreaColors === 'function' ? schdGetAreaColors(ev.area) : { border: '#3498DB' };
        const _arColor = _ar.c || _colors.border;
        const _hasTime = ev.startTime && ev.endTime;
        const _timeStr = _hasTime && typeof schdFmt === 'function' ? `${schdFmt(ev.startTime)} – ${schdFmt(ev.endTime)}` : '';
        const _priorityColors = { high: '#E74C3C', medium: '#F39C12', low: '#2ECC71' };
        const _priorityLabels = { high: '🔴 Alta', medium: '🟡 Media', low: '🟢 Baja' };
        const _prioColor = ev.priority ? _priorityColors[ev.priority] : null;

        listHTML += `<div style="display:flex;align-items:center;gap:11px;padding:10px 12px;background:${ev.done ? 'rgba(46,204,113,0.04)' : 'rgba(0,0,0,0.18)'};border-radius:12px;border:1px solid ${ev.done ? 'rgba(46,204,113,0.18)' : _colors.border + '22'};border-left:3px solid ${_colors.border};margin-bottom:6px;transition:0.2s">
          <div onclick="if(typeof schdToggleDone==='function'){schdToggleDone('${ev.id}');render();}" style="width:25px;height:25px;border-radius:7px;border:2px solid ${ev.done ? '#2ECC71' : _colors.border + '88'};background:${ev.done ? 'rgba(46,204,113,0.18)' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:#2ECC71;flex-shrink:0;transition:0.2s">${ev.done ? '✓' : ''}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;color:${ev.done ? '#555' : '#eee'};text-decoration:${ev.done ? 'line-through' : 'none'};font-weight:500;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.title}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
              <span class="pill" style="color:${_arColor};border-color:${_arColor}28;background:${_arColor}12">${_ar.icon} ${_ar.n || _ar.name}</span>
              ${_timeStr ? `<span style="font-size:9px;color:#555;font-weight:700;background:rgba(0,0,0,0.25);padding:2px 6px;border-radius:5px">⏰ ${_timeStr}</span>` : ''}
              ${_prioColor ? `<span style="font-size:9px;color:${_prioColor};font-weight:700">${_priorityLabels[ev.priority]}</span>` : ''}
            </div>
          </div>
          <span class="pill" style="color:#FFD700;border-color:rgba(255,215,0,0.2);background:rgba(255,215,0,0.08);flex-shrink:0;font-size:9px">🗓️</span>
        </div>`;
      });
    });
  }

  $("todo-list").innerHTML = listHTML;
}

// ── History view ─────────────────────────────────────────────────────────────
function renderHistory() {
  const filtHist = (data.hist || []).filter(h => {
    const byMonth = histF === "all" || h.month === histF;
    const byType = histType === "all" || h.type === histType || (!h.type && histType === "expense");
    return byMonth && byType;
  });
  $("hist-count").textContent = filtHist.length + " movimientos";

  // Type filter
  let typeHTML = "";
  [{ id: "all", label: "Todo", color: "#AB47BC" }, { id: "income", label: "💰 Ingresos", color: "#2ECC71" }, { id: "expense", label: "🛡️ Gastos", color: "#E74C3C" }].forEach(t => {
    const on = histType === t.id;
    typeHTML += `<button onclick="histType='${t.id}';render()" class="tab ${on ? "on" : ""}" style="color:${on ? t.color : "#555"};border-color:${on ? t.color : "rgba(255,255,255,0.07)"};background:${on ? t.color + "18" : "rgba(0,0,0,0.25)"}">${t.label}</button>`;
  });
  $("hist-type-filter").innerHTML = typeHTML;

  // Month filter
  let monthHTML = `<button onclick="histF='all';render()" class="tab ${histF === "all" ? "on" : ""}" style="color:${histF === "all" ? "#AB47BC" : "#555"};border-color:${histF === "all" ? "#AB47BC" : "rgba(255,255,255,0.07)"};background:${histF === "all" ? "rgba(171,71,188,0.1)" : "rgba(0,0,0,0.25)"}">Todos</button>`;
  MS.forEach(m => {
    const on = histF === m;
    monthHTML += `<button onclick="histF='${m}';render()" class="tab ${on ? "on" : ""}" style="color:${on ? "#AB47BC" : "#555"};border-color:${on ? "#AB47BC" : "rgba(255,255,255,0.07)"};background:${on ? "rgba(171,71,188,0.1)" : "rgba(0,0,0,0.25)"}">${m.slice(0, 3)}</button>`;
  });
  $("hist-month-filter").innerHTML = monthHTML;

  // Compute running balance per month for all entries
  const monthBalances = {};
  const allHist = (data.hist||[]).slice().reverse(); // chronological order (oldest first)
  allHist.forEach(h=>{
    const m = h.month;
    if(!monthBalances[m]) monthBalances[m] = { running: 0, entries: {} };
    const isInc = h.type==="income";
    monthBalances[m].running += isInc ? h.amount : -h.amount;
    monthBalances[m].entries[h.id] = monthBalances[m].running;
  });

  // Compute month totals for summary
  const monthTotals = {};
  MS.forEach(m=>{
    const md = data.months[m]||{};
    const inc = Object.values(md.income||{}).reduce((a,b)=>a+b,0);
    let exp = 0;
    Object.values(md.expenses||{}).forEach(g=>Object.values(g).forEach(v=>exp+=v));
    monthTotals[m] = {inc, exp, bal: inc-exp};
  });

  // Summary for filtered month
  const summaryEl = $("hist-summary");
  if(summaryEl) {
    if(histF!=="all" && monthTotals[histF]) {
      const mt = monthTotals[histF];
      summaryEl.classList.remove("hidden");
      summaryEl.innerHTML=`<div style="display:flex;gap:8px;text-align:center">
        <div style="flex:1;padding:8px;background:rgba(46,204,113,0.07);border-radius:8px;border:1px solid rgba(46,204,113,0.18)">
          <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Ingresos</div>
          <div style="font-size:14px;font-weight:800;color:#2ECC71">${fS(mt.inc)}</div>
        </div>
        <div style="flex:1;padding:8px;background:rgba(231,76,60,0.07);border-radius:8px;border:1px solid rgba(231,76,60,0.18)">
          <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Gastos</div>
          <div style="font-size:14px;font-weight:800;color:#E74C3C">${fS(mt.exp)}</div>
        </div>
        <div style="flex:1;padding:8px;background:${mt.bal>=0?'rgba(46,204,113,0.07)':'rgba(231,76,60,0.07)'};border-radius:8px;border:1px solid ${mt.bal>=0?'rgba(46,204,113,0.18)':'rgba(231,76,60,0.18)'}">
          <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Balance</div>
          <div style="font-size:14px;font-weight:800;color:${mt.bal>=0?'#2ECC71':'#E74C3C'}">${mt.bal>=0?'+':''}${fS(mt.bal)}</div>
        </div>
      </div>`;
    } else {
      summaryEl.classList.add("hidden");
    }
  }

  // List
  let html = "";
  if (filtHist.length === 0) html = `<div style="text-align:center;padding:28px;color:#444"><div style="font-size:28px;margin-bottom:9px">📭</div>Sin movimientos.</div>`;
  filtHist.slice(0, 80).forEach(hx => {
    const isInc = hx.type === "income";
    const d = new Date(hx.date);
    const ac = isInc ? "#2ECC71" : "#E74C3C";
    const label = hx.catName;
    const sublabel = isInc ? "Ingreso · " + hx.catName : (hx.groupName || "");
    const runBal = monthBalances[hx.month]?.entries?.[hx.id];
    const balColor = runBal !== undefined ? (runBal >= 0 ? "#2ECC71" : "#E74C3C") : "#555";
    const balStr = runBal !== undefined ? `${runBal >= 0 ? '+' : ''}${fS(runBal)}` : "";
    html += `<div style="display:flex;gap:12px;padding:11px 13px;background:rgba(0,0,0,0.2);border-radius:12px;border:1px solid ${ac}18">
      <div style="width:36px;height:36px;border-radius:9px;background:${ac}12;border:1px solid ${ac}25;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${hx.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px">
          <span style="font-size:14px;color:#eee;font-weight:600">${label}</span>
          <span style="font-size:14px;color:${ac};font-weight:800;flex-shrink:0;margin-left:8px">${isInc ? "+" : "-"}${fmt(hx.amount)}</span>
        </div>
        <div style="font-size:11px;color:#555;margin-bottom:${hx.note || balStr ? "6px" : "0"}">
          <span class="pill" style="color:${ac};border-color:${ac}25;background:${ac}10;font-size:9px;padding:2px 6px;margin-right:6px">${isInc ? "↑ Ingreso" : "↓ Gasto"}</span>
          ${sublabel ? `<span style="color:#555">${sublabel} · </span>` : ""}
          ${d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
        </div>
        ${balStr ? `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:${balColor}08;border-radius:6px;border:1px solid ${balColor}18;margin-bottom:${hx.note ? '6px' : '0'}">
          <span style="font-size:10px;color:#666">📊 Balance del mes:</span>
          <span style="font-size:12px;font-weight:700;color:${balColor}">${balStr}</span>
        </div>` : ""}
        ${hx.note ? `<div style="font-size:12px;color:#aaa;padding:5px 10px;background:rgba(255,255,255,0.03);border-radius:6px;border-left:3px solid ${ac}55">📝 ${hx.note}</div>` : ""}
      </div>
    </div>`;
  });
  $("hist-list").innerHTML = html;
}

// ── Shopping List ────────────────────────────────────────────────────────────
function renderShopping() {
  const list = data.shopList || [];
  const filtered = shopFilter === "all" ? list : list.filter(x => x.cat === shopFilter);
  const pending = list.filter(x => !x.done).length;
  const done = list.filter(x => x.done).length;

  // Header counts
  $("shop-count").textContent = `${pending} pendiente${pending !== 1 ? "s" : ""} · ${done} comprado${done !== 1 ? "s" : ""}`;
  const pct = list.length > 0 ? (done / list.length) * 100 : 0;
  $("shop-progress-bar").style.width = pct + "%";
  $("shop-progress-count").textContent = list.length > 0 ? `${done}/${list.length}` : "Sin items";

  // Category filter
  let filterHTML = `<button onclick="shopFilter='all';render()" class="tab${shopFilter === 'all' ? ' on' : ''}" style="color:${shopFilter === 'all' ? '#FFD700' : ''}">Todo (${list.length})</button>`;
  SHOP_CATS.forEach(sc => {
    const cnt = list.filter(x => x.cat === sc.id).length;
    if (cnt > 0) filterHTML += `<button onclick="shopFilter='${sc.id}';render()" class="tab${shopFilter === sc.id ? ' on' : ''}" style="color:${shopFilter === sc.id ? sc.c : ''}">${sc.icon} ${cnt}</button>`;
  });
  $("shop-filter-bar").innerHTML = filterHTML;

  // New item form: category
  let catSelHTML = "";
  SHOP_CATS.forEach(sc => {
    const sel = shopCat === sc.id;
    catSelHTML += `<button onclick="shopCat='${sc.id}';render()" style="padding:5px 10px;border-radius:8px;border:1px solid ${sel ? sc.c + '88' : 'rgba(255,255,255,0.07)'};background:${sel ? sc.c + '18' : 'transparent'};color:${sel ? sc.c : '#555'};cursor:pointer;font-size:11px;font-family:'Inter',sans-serif;white-space:nowrap;font-weight:600;flex-shrink:0">${sc.icon} ${sc.name}</button>`;
  });
  $("shop-cat-selector").innerHTML = catSelHTML;

  // Items list
  let html = "";
  if (filtered.length === 0) {
    html = `<div style="text-align:center;padding:30px;color:#444;font-size:13px">🛒 Sin items${shopFilter !== "all" ? " en esta categoría" : ""}</div>`;
  } else {
    // Group by category
    const groups = {};
    filtered.forEach(x => {
      if (!groups[x.cat]) groups[x.cat] = [];
      groups[x.cat].push(x);
    });
    Object.keys(groups).forEach(catId => {
      const cat = SHOP_CATS.find(c => c.id === catId) || SHOP_CATS[SHOP_CATS.length - 1];
      const items = groups[catId];
      if (shopFilter === "all") html += `<div style="font-size:11px;color:${cat.c};font-weight:700;margin:10px 0 6px;text-transform:uppercase;letter-spacing:1px">${cat.icon} ${cat.name}</div>`;
      items.forEach(x => {
        html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${x.done ? 'rgba(46,204,113,0.06)' : 'rgba(0,0,0,0.15)'};border-radius:10px;border:1px solid ${x.done ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.05)'}">
          <button onclick="toggleShopItem('${x.id}')" style="width:28px;height:28px;border-radius:8px;border:2px solid ${x.done ? '#2ECC71' : 'rgba(255,255,255,0.15)'};background:${x.done ? 'rgba(46,204,113,0.2)' : 'transparent'};cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${x.done ? '✓' : ''}</button>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;color:${x.done ? '#555' : '#ddd'};font-weight:600;${x.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${x.text}</div>
            ${x.qty ? `<div style="font-size:11px;color:#666;margin-top:2px">Cant: ${x.qty}</div>` : ''}
          </div>
          <button onclick="deleteShopItem('${x.id}')" style="background:none;border:none;color:#555;cursor:pointer;font-size:12px;padding:4px">✕</button>
        </div>`;
      });
    });
  }
  $("shop-list").innerHTML = html;

  // Action buttons
  $("shop-actions").innerHTML = done > 0 ? `<div style="display:flex;gap:8px;margin-top:12px">
    <button onclick="clearDoneShop()" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(46,204,113,0.3);background:rgba(46,204,113,0.08);color:#2ECC71;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">🧹 Limpiar comprados (${done})</button>
    <button onclick="clearAllShop()" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(231,76,60,0.3);background:rgba(231,76,60,0.08);color:#E74C3C;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">🗑️</button>
  </div>`: "";
}

// ── Reminders on Dashboard ──────────────────────────────────────────────────
function renderReminders() {
  const rems = (data.reminders || []).filter(x => !x.done);
  const container = $("dash-reminders");
  if (!container) return;

  if (rems.length === 0 && !showRemForm) {
    container.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:#555">Sin recordatorios activos</span>
      <button onclick="showRemForm=true;render()" style="background:linear-gradient(135deg,#FFD700,#FFA726);border:none;color:#000;padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">+ Añadir</button>
    </div>`;
    return;
  }

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="font-size:13px;font-weight:700;color:#FFD700">📌 Recordatorios (${rems.length})</span>
    <button onclick="showRemForm=!showRemForm;render()" style="background:${showRemForm ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#FFD700,#FFA726)'};border:${showRemForm ? '1px solid rgba(255,255,255,0.1)' : 'none'};color:${showRemForm ? '#888' : '#000'};padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">${showRemForm ? 'Cancelar' : '+ Añadir'}</button>
  </div>`;

  // Form
  if (showRemForm) {
    let priHTML = "";
    REMINDER_PRI.forEach(p => {
      const sel = remPri === p.id;
      priHTML += `<button onclick="remPri='${p.id}';render()" style="padding:5px 10px;border-radius:8px;border:1px solid ${sel ? p.c + '88' : 'rgba(255,255,255,0.07)'};background:${sel ? p.c + '18' : 'transparent'};color:${sel ? p.c : '#555'};cursor:pointer;font-size:11px;font-family:'Inter',sans-serif;font-weight:600">${p.icon} ${p.name}</button>`;
    });
    html += `<div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:12px;margin-bottom:12px">
      <input id="rem-input" class="inp" placeholder="Ej: Pagar luz, Cita médico..." value="${remText}" oninput="remText=this.value" onkeydown="if(event.key==='Enter')addReminder()" style="margin-bottom:8px;font-size:14px"/>
      <div style="display:flex;gap:6px;margin-bottom:8px">${priHTML}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="date" value="${remDate}" onchange="remDate=this.value" class="inp" style="flex:1;font-size:12px;padding:8px"/>
        <button onclick="addReminder()" style="padding:10px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#FFD700,#FFA726);color:#000;cursor:pointer;font-weight:800;font-size:13px;font-family:'Inter',sans-serif;white-space:nowrap">📌 Guardar</button>
      </div>
    </div>`;
  }

  // List
  rems.sort((a, b) => { const po = { high: 0, medium: 1, low: 2 }; return (po[a.priority] || 1) - (po[b.priority] || 1); });
  rems.forEach(r => {
    const p = REMINDER_PRI.find(x => x.id === r.priority) || REMINDER_PRI[1];
    const dateStr = r.date ? new Date(r.date + "T12:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short" }) : "";
    const isOverdue = r.date && r.date < todayStr();
    html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${isOverdue ? 'rgba(231,76,60,0.08)' : 'rgba(0,0,0,0.15)'};border-radius:10px;border-left:3px solid ${p.c};margin-bottom:6px">
      <button onclick="toggleReminder('${r.id}')" style="width:26px;height:26px;border-radius:7px;border:2px solid ${p.c}55;background:transparent;cursor:pointer;flex-shrink:0;font-size:12px">○</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:#ddd;font-weight:600">${r.text}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:3px">
          <span style="font-size:10px;color:${p.c}">${p.icon} ${p.name}</span>
          ${dateStr ? `<span style="font-size:10px;color:${isOverdue ? '#E74C3C' : '#666'}">${isOverdue ? '⚠️ ' : '📅 '}${dateStr}</span>` : ''}
        </div>
      </div>
      <button onclick="deleteReminder('${r.id}')" style="background:none;border:none;color:#444;cursor:pointer;font-size:12px;padding:4px">✕</button>
    </div>`;
  });

  container.innerHTML = html;
}

// ── Avatar Editor ────────────────────────────────────────────────────────────
function renderAvatarEditor() {
  const opts = [
    { lbl: "Peinado", id: "hair", opts: HAIR_IDS },
    { lbl: "Color Pelo", id: "hairColor", opts: Object.keys(HAIRS), map: HAIRS },
    { lbl: "Tono Piel", id: "skin", opts: Object.keys(SKINS), map: SKINS },
    { lbl: "Ojos", id: "eyeColor", opts: Object.keys(EYES), map: EYES },
    { lbl: "Ropa", id: "outfit", opts: OUT_IDS },
    { lbl: "Color Ropa", id: "outfitColor", opts: Object.keys(OUTFITS), map: OUTFITS },
    { lbl: "Accesorio", id: "accessory", opts: ACC_IDS },
  ];
  let html = "";
  opts.forEach(opt => {
    let btns = "";
    opt.opts.forEach(o => {
      const sel = data.avatar[opt.id] === o;
      if (opt.map) {
        btns += `<button onclick="upAv('${opt.id}','${o}')" style="width:22px;height:22px;padding:0;border-radius:6px;background:${opt.map[o]};border:1.5px solid ${sel ? "#FFD700" : "rgba(255,255,255,0.09)"};cursor:pointer"></button>`;
      } else {
        btns += `<button onclick="upAv('${opt.id}','${o}')" style="padding:3px 7px;border-radius:6px;background:${sel ? "rgba(255,215,0,0.12)" : "transparent"};border:1.5px solid ${sel ? "#FFD700" : "rgba(255,255,255,0.09)"};color:${sel ? "#FFD700" : "#666"};font-size:10px;cursor:pointer">${o}</button>`;
      }
    });
    html += `<div style="background:rgba(0,0,0,0.2);padding:8px;border-radius:10px">
      <div style="font-size:10px;color:#555;margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">${opt.lbl}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">${btns}</div>
    </div>`;
  });
  $("avatar-editor-grid").innerHTML = html;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── HABITS ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function addHabit(){
  const input=$("habit-input");
  const text=(input?input.value:"").trim();
  if(!text) return;
  if(!data.habits) data.habits=[];
  data.habits.push({id:Date.now().toString(),text,area:habitArea,streak:0,bestStreak:0,history:{}});
  if(input) input.value="";
  flash("🔄 Hábito creado","success");
  showHabitForm=false;
  schedSave();checkAchievements();render();
}
function toggleHabitToday(id){
  const h=(data.habits||[]).find(x=>x.id===id);if(!h) return;
  const today=todayStr();
  if(h.history[today]){
    delete h.history[today];
    h.streak=calcStreak(h);
    flash("↩️ Hábito desmarcado","success");
  } else {
    h.history[today]=true;
    h.streak=calcStreak(h);
    if(h.streak>h.bestStreak) h.bestStreak=h.streak;
    const bonusXP=h.streak%7===0?5:1;
    data.xp=(data.xp||0)+bonusXP;
    data.stats[h.area]=(data.stats[h.area]||0)+bonusXP;
    flash(`🔥 +${bonusXP}XP ${h.streak%7===0?"¡Bonus racha!":""}`,h.streak%7===0?"xp":"success");
    if(h.streak%7===0) setMoodTmp("celebrate",2500);
  }
  schedSave();checkAchievements();render();
}
function calcStreak(h){
  let streak=0;
  const d=new Date();
  while(true){
    const ds=d.toISOString().slice(0,10);
    if(h.history[ds]){streak++;d.setDate(d.getDate()-1);}
    else break;
  }
  return streak;
}
function deleteHabit(id){
  if(!confirm("¿Eliminar este hábito?")) return;
  data.habits=(data.habits||[]).filter(x=>x.id!==id);
  schedSave();render();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── GOALS ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function addGoal(){
  const input=$("goal-input");
  const text=(input?input.value:"").trim();
  const target=parseFloat(goalTarget)||0;
  if(!text||target<=0) return;
  if(!data.goals) data.goals=[];
  data.goals.push({id:Date.now().toString(),text,icon:goalIcon,target,current:0,deadline:goalDeadline||"",done:false});
  if(input) input.value="";
  goalText="";goalTarget="";goalDeadline="";
  showGoalForm=false;
  flash("🎯 Meta creada","success");
  schedSave();render();
}
function updateGoalProgress(id,val){
  const g=(data.goals||[]).find(x=>x.id===id);if(!g) return;
  g.current=parseFloat(val)||0;
  if(g.current>=g.target&&!g.done){
    g.done=true;
    data.xp=(data.xp||0)+20;
    flash("🎯 ¡META CUMPLIDA! +20XP","xp");
    setMoodTmp("celebrate",3000);
    checkAchievements();
  }
  schedSave();render();
}
function deleteGoal(id){
  data.goals=(data.goals||[]).filter(x=>x.id!==id);
  schedSave();render();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── RECURRING EXPENSES ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function addRecurring(){
  const input=$("recur-input");
  const name=(input?input.value:"").trim();
  const amount=parseFloat(recurAmount)||0;
  if(!name||amount<=0) return;
  if(!data.recurring) data.recurring=[];
  data.recurring.push({id:Date.now().toString(),name,amount,group:recurGroup,cat:recurCat,dueDay:parseInt(recurDay)||1,paidMonths:{}});
  if(input) input.value="";
  recurName="";recurAmount="";
  showRecurForm=false;
  flash("🔄 Gasto recurrente agregado","success");
  schedSave();render();
}
function toggleRecurPaid(id){
  const r=(data.recurring||[]).find(x=>x.id===id);if(!r) return;
  if(r.paidMonths[month]){
    delete r.paidMonths[month];
  } else {
    r.paidMonths[month]=true;
    // Auto register as expense
    if(!data.months[month].expenses) data.months[month].expenses={};
    if(!data.months[month].expenses[r.group]) data.months[month].expenses[r.group]={};
    data.months[month].expenses[r.group][r.cat]=(data.months[month].expenses[r.group][r.cat]||0)+r.amount;
    const gn=EG.find(g=>g.id===r.group)?.name||"";
    const cn=EG.find(g=>g.id===r.group)?.cats.find(c=>c.id===r.cat)?.name||"";
    data.hist=[{id:Date.now().toString(),date:new Date().toISOString(),month,group:r.group,cat:r.cat,amount:r.amount,note:"Gasto fijo: "+r.name,groupName:gn,catName:cn,icon:EG.find(g=>g.id===r.group)?.icon||"📦"},...(data.hist||[])].slice(0,500);
    flash(`✅ ${r.name} pagado: ${fmt(r.amount)}`,"success");
  }
  schedSave();render();
}
function deleteRecurring(id){
  data.recurring=(data.recurring||[]).filter(x=>x.id!==id);
  schedSave();render();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── JOURNAL ──────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function saveJournal(){
  const input=$("journal-input");
  const text=(input?input.value:"").trim();
  if(!data.journal) data.journal={};
  const today=todayStr();
  data.journal[today]={text,mood:journalMood,date:today};
  flash("📝 Diario guardado","success");
  schedSave();checkAchievements();render();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function checkAchievements(){
  if(!data) return;
  ACHV.forEach(a=>{
    if(!data.achievements[a.id]&&a.ck(data)){
      data.achievements[a.id]=todayStr();
      data.xp=(data.xp||0)+a.xp;
      flash(`🏅 ¡Logro: ${a.name}! +${a.xp}XP`,"xp");
      setMoodTmp("celebrate",3000);
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ── THEMES ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function applyTheme(themeId){
  const t=THEMES.find(x=>x.id===themeId)||THEMES[0];
  document.documentElement.style.setProperty("--bg",t.bg);
  document.documentElement.style.setProperty("--card-bg",t.card);
  document.documentElement.style.setProperty("--accent",t.accent);
  document.documentElement.style.setProperty("--glow",t.glow);
  document.body.style.background=t.bg;
}
function setTheme(id){
  data.theme=id;
  applyTheme(id);
  flash("🎨 Tema cambiado","success");
  schedSave();render();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── NOTIFICATIONS ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function toggleNotifications(){
  if(!("Notification" in window)){flash("⚠️ Tu navegador no soporta notificaciones","xp");return;}
  if(Notification.permission==="granted"){
    notifEnabled=!notifEnabled;
    localStorage.setItem("lc-notif",notifEnabled?"1":"0");
    flash(notifEnabled?"🔔 Notificaciones activadas":"🔕 Notificaciones desactivadas","success");
    render();
  } else if(Notification.permission!=="denied"){
    Notification.requestPermission().then(p=>{
      if(p==="granted"){notifEnabled=true;localStorage.setItem("lc-notif","1");flash("🔔 Notificaciones activadas","success");render();}
    });
  } else {
    flash("⚠️ Notificaciones bloqueadas en tu navegador","xp");
  }
}
function checkNotifications(){
  if(!notifEnabled||!data) return;
  const now=new Date();
  const h=now.getHours();
  if(h>=20&&h<21){
    const today=todayStr();
    const key="lc-notif-"+today;
    if(!localStorage.getItem(key)){
      const pending=(data.todos||[]).filter(t=>t.date===today&&!t.done).length;
      const habits=(data.habits||[]).filter(hab=>!hab.history[today]).length;
      if(pending>0||habits>0){
        new Notification("⚔️ LifeControl RPG",{body:`Tienes ${pending} tareas y ${habits} hábitos pendientes hoy`,icon:"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚔️</text></svg>"});
        localStorage.setItem(key,"1");
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── PDF EXPORT ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function exportPDF(){
  const ct=calcM(data,month);
  const level=Math.floor((data.xp||0)/10)+1;
  const doneTasks=(data.todos||[]).filter(t=>t.done).length;
  const totalTasks=(data.todos||[]).length;
  const habitsDone=(data.habits||[]).filter(h=>h.history[todayStr()]).length;
  let expBreakdown="";
  getEffectiveEG().forEach(g=>{
    const gt=Object.values(data.months[month]?.expenses?.[g.id]||{}).reduce((a,b)=>a+b,0);
    if(gt>0) expBreakdown+=`<tr><td>${g.icon} ${g.name}</td><td style="text-align:right;color:#E74C3C">$${gt.toLocaleString()}</td></tr>`;
  });
  const w=window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html><head><title>LifeControl — ${month}</title>
  <style>*{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;box-sizing:border-box}body{background:#fff;color:#333;padding:40px;max-width:800px;margin:auto}
  h1{color:#1a1a2e;margin-bottom:5px}h2{color:#555;font-size:16px;margin:25px 0 10px;border-bottom:2px solid #eee;padding-bottom:5px}
  .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin:15px 0}
  .box{padding:20px;border-radius:12px;text-align:center}
  .green{background:#e8f5e9;border:1px solid #a5d6a7}.red{background:#fce4ec;border:1px solid #ef9a9a}.blue{background:#e3f2fd;border:1px solid #90caf9}
  .big{font-size:28px;font-weight:800;margin-top:5px}.label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px}
  table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:8px 12px;border-bottom:1px solid #eee;font-size:14px}
  .footer{text-align:center;color:#aaa;font-size:11px;margin-top:40px;padding-top:15px;border-top:1px solid #eee}
  @media print{body{padding:20px}}</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <div><h1>⚔️ LifeControl RPG</h1><div style="color:#888;font-size:13px">Reporte ${month} · Nivel ${level}</div></div>
    <div style="text-align:right;font-size:12px;color:#888">${new Date().toLocaleDateString("es-EC",{day:"numeric",month:"long",year:"numeric"})}</div>
  </div>
  <h2>💰 Resumen Financiero</h2>
  <div class="grid">
    <div class="box green"><div class="label">Ingresos</div><div class="big" style="color:#2e7d32">$${ct.inc.toLocaleString()}</div></div>
    <div class="box red"><div class="label">Gastos</div><div class="big" style="color:#c62828">$${ct.exp.toLocaleString()}</div></div>
    <div class="box blue"><div class="label">Balance</div><div class="big" style="color:${ct.bal>=0?'#1565c0':'#c62828'}">${ct.bal>=0?'+':''}$${ct.bal.toLocaleString()}</div></div>
  </div>
  ${expBreakdown?`<h2>📊 Desglose de Gastos</h2><table>${expBreakdown}</table>`:""}
  <h2>📋 Progreso</h2>
  <div class="grid">
    <div class="box blue"><div class="label">Tareas</div><div class="big" style="color:#1565c0">${doneTasks}/${totalTasks}</div></div>
    <div class="box green"><div class="label">Hábitos Hoy</div><div class="big" style="color:#2e7d32">${habitsDone}/${(data.habits||[]).length}</div></div>
    <div class="box" style="background:#fff3e0;border:1px solid #ffcc80"><div class="label">XP Total</div><div class="big" style="color:#e65100">${data.xp||0}</div></div>
  </div>
  <div class="footer">Generado por LifeControl RPG · ${new Date().toISOString()}</div>
  <script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  w.document.close();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── DASHBOARD EXTRA RENDERS ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function renderWeeklySummary(){
  const el=$("dash-weekly");if(!el) return;
  const today=new Date();
  const dayOfWeek=today.getDay()||7;
  const weekStart=new Date(today);weekStart.setDate(today.getDate()-(dayOfWeek-1));
  let weekInc=0,weekExp=0,weekTasks=0,weekHabits=0;
  for(let i=0;i<7;i++){
    const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);
    const ds=d.toISOString().slice(0,10);
    weekTasks+=(data.todos||[]).filter(t=>t.date===ds&&t.done).length;
    (data.habits||[]).forEach(h=>{if(h.history[ds])weekHabits++;});
  }
  // Week expenses from history
  const weekHist=(data.hist||[]).filter(h=>{
    const hd=new Date(h.date);
    return hd>=weekStart&&hd<=today;
  });
  weekHist.forEach(h=>{if(h.type==="income")weekInc+=h.amount;else weekExp+=h.amount;});
  
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="font-size:13px;font-weight:700;color:#29B6F6">📊 Resumen Semanal</span>
    <span style="font-size:10px;color:#555">${weekStart.toLocaleDateString("es-EC",{day:"numeric",month:"short"})} — ${today.toLocaleDateString("es-EC",{day:"numeric",month:"short"})}</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;text-align:center">
    <div style="padding:8px 4px;background:rgba(46,204,113,0.07);border-radius:8px;border:1px solid rgba(46,204,113,0.18)">
      <div style="font-size:9px;color:#555;margin-bottom:2px">INGRESO</div>
      <div style="font-size:13px;font-weight:800;color:#2ECC71">${fS(weekInc)}</div>
    </div>
    <div style="padding:8px 4px;background:rgba(231,76,60,0.07);border-radius:8px;border:1px solid rgba(231,76,60,0.18)">
      <div style="font-size:9px;color:#555;margin-bottom:2px">GASTO</div>
      <div style="font-size:13px;font-weight:800;color:#E74C3C">${fS(weekExp)}</div>
    </div>
    <div style="padding:8px 4px;background:rgba(255,107,53,0.07);border-radius:8px;border:1px solid rgba(255,107,53,0.18)">
      <div style="font-size:9px;color:#555;margin-bottom:2px">TAREAS</div>
      <div style="font-size:13px;font-weight:800;color:#FF6B35">${weekTasks}</div>
    </div>
    <div style="padding:8px 4px;background:rgba(255,215,0,0.07);border-radius:8px;border:1px solid rgba(255,215,0,0.18)">
      <div style="font-size:9px;color:#555;margin-bottom:2px">HÁBITOS</div>
      <div style="font-size:13px;font-weight:800;color:#FFD700">${weekHabits}</div>
    </div>
  </div>`;
}

function renderTrendChart(){
  const el=$("dash-trends");if(!el) return;
  // Daily expenses for current month from history
  const monthHist=(data.hist||[]).filter(h=>h.month===month&&(!h.type||h.type!=="income"));
  if(monthHist.length===0){el.classList.add("hidden");return;}
  el.classList.remove("hidden");
  const dailyExp={};
  monthHist.forEach(h=>{
    const day=new Date(h.date).getDate();
    dailyExp[day]=(dailyExp[day]||0)+h.amount;
  });
  const days=Object.keys(dailyExp).map(Number).sort((a,b)=>a-b);
  const maxExp=Math.max(...Object.values(dailyExp),1);
  const barW=Math.max(8,Math.floor(280/Math.max(days.length,1))-2);
  let bars="";
  days.forEach((d,i)=>{
    const h=Math.max(3,Math.round((dailyExp[d]/maxExp)*80));
    const x=i*(barW+2)+2;
    const color=dailyExp[d]>maxExp*0.7?"#E74C3C":dailyExp[d]>maxExp*0.4?"#F39C12":"#2ECC71";
    bars+=`<rect x="${x}" y="${90-h}" width="${barW}" height="${h}" rx="3" fill="${color}" opacity="0.8"><title>Día ${d}: $${dailyExp[d].toLocaleString()}</title></rect>`;
  });
  const svgW=days.length*(barW+2)+4;
  const avg=Object.values(dailyExp).reduce((a,b)=>a+b,0)/days.length;
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="font-size:13px;font-weight:700;color:#E74C3C">📈 Tendencia de Gastos</span>
    <span style="font-size:10px;color:#555">Promedio: <b style="color:#F39C12">${fS(avg)}</b>/día</span>
  </div>
  <div style="overflow-x:auto;padding-bottom:4px">
    <svg width="${svgW}" height="95" style="display:block">${bars}
      <line x1="0" y1="${90-Math.round((avg/maxExp)*80)}" x2="${svgW}" y2="${90-Math.round((avg/maxExp)*80)}" stroke="#F39C12" stroke-dasharray="4,3" stroke-width="1" opacity="0.5"/>
    </svg>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:9px;color:#444;margin-top:4px">
    <span>Día ${days[0]||1}</span><span>Día ${days[days.length-1]||1}</span>
  </div>`;
}

function renderHabitsPreview(){
  const el=$("dash-habits-preview");if(!el) return;
  const habits=data.habits||[];
  if(habits.length===0){el.classList.add("hidden");return;}
  el.classList.remove("hidden");
  const today=todayStr();
  const done=habits.filter(h=>h.history[today]).length;
  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="font-size:13px;font-weight:700;color:#FF6B35">🔄 Hábitos Hoy</span>
    <span style="font-size:12px;color:#FF6B35;font-weight:700">${done}/${habits.length}</span>
  </div>
  <div style="height:4px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;margin-bottom:10px">
    <div style="height:100%;width:${habits.length?(done/habits.length)*100:0}%;background:linear-gradient(90deg,#FF6B35,#FFD700);transition:0.4s"></div>
  </div>`;
  habits.forEach(h=>{
    const isDone=h.history[today];
    const ar=AREAS.find(a=>a.id===h.area)||AREAS[0];
    html+=`<div onclick="toggleHabitToday('${h.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:${isDone?"rgba(46,204,113,0.06)":"rgba(0,0,0,0.15)"};border-radius:9px;cursor:pointer;margin-bottom:4px;border:1px solid ${isDone?"rgba(46,204,113,0.18)":"rgba(255,255,255,0.04)"}">
      <div style="width:22px;height:22px;border-radius:6px;border:2px solid ${isDone?"#2ECC71":ar.c+"66"};background:${isDone?"rgba(46,204,113,0.18)":"transparent"};display:flex;align-items:center;justify-content:center;font-size:11px;color:#2ECC71;flex-shrink:0">${isDone?"✓":""}</div>
      <span style="flex:1;font-size:13px;color:${isDone?"#555":"#ccc"};font-weight:500;${isDone?"text-decoration:line-through":""}">${h.text}</span>
      ${h.streak>0?`<span style="font-size:10px;color:#FF6B35;font-weight:700">🔥${h.streak}</span>`:""}
    </div>`;
  });
  el.innerHTML=html;
}

function renderJournalCard(){
  const el=$("dash-journal");if(!el) return;
  const today=todayStr();
  const entry=data.journal?.[today];
  let moodHTML="";
  JOURNAL_MOODS.forEach(m=>{
    const sel=journalMood===m.id||(entry?.mood===m.id&&journalMood==="good");
    moodHTML+=`<button onclick="journalMood='${m.id}';render()" style="font-size:20px;padding:4px 6px;border-radius:8px;border:2px solid ${sel?m.c+"88":"transparent"};background:${sel?m.c+"18":"transparent"};cursor:pointer;transition:0.2s" title="${m.label}">${m.icon}</button>`;
  });
  // Journal history entries
  const entries=Object.entries(data.journal||{}).sort((a,b)=>b[0].localeCompare(a[0]));
  const histCount=entries.length;
  let histHTML="";
  if(showJournalHist && histCount>0){
    histHTML=`<div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.06);padding-top:12px">
      <div style="font-size:11px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">📖 Historial de Diario (${histCount})</div>`;
    entries.forEach(([dateKey, e])=>{
      const d=new Date(dateKey+"T12:00:00");
      const moodObj=JOURNAL_MOODS.find(m=>m.id===e.mood)||JOURNAL_MOODS[2];
      const isToday=dateKey===today;
      const dateLabel=isToday?"Hoy":d.toLocaleDateString("es-EC",{weekday:"short",day:"numeric",month:"short"});
      histHTML+=`<div style="display:flex;gap:10px;padding:10px;background:${isToday?'rgba(255,215,0,0.04)':'rgba(0,0,0,0.15)'};border-radius:10px;border:1px solid ${isToday?'rgba(255,215,0,0.12)':'rgba(255,255,255,0.04)'};margin-bottom:6px">
        <div style="font-size:24px;flex-shrink:0;padding-top:2px">${moodObj.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:11px;font-weight:700;color:${moodObj.c}">${moodObj.label}</span>
            <span style="font-size:10px;color:#444">${dateLabel}</span>
          </div>
          ${e.text?`<div style="font-size:12px;color:#aaa;line-height:1.4">${e.text}</div>`:"<div style='font-size:11px;color:#333;font-style:italic'>Sin nota</div>"}
        </div>
      </div>`;
    });
    histHTML+=`</div>`;
  }
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="font-size:13px;font-weight:700;color:#FFD700">📝 Diario de Hoy</span>
    ${entry?`<span style="font-size:10px;color:#2ECC71">✓ Guardado</span>`:""}
  </div>
  <div style="display:flex;gap:4px;margin-bottom:10px">${moodHTML}</div>
  <textarea id="journal-input" class="inp" placeholder="¿Cómo fue tu día? Reflexiona..." style="min-height:60px;resize:vertical;font-size:13px;padding:10px;margin-bottom:8px">${entry?.text||""}</textarea>
  <div style="display:flex;gap:8px">
    <button onclick="saveJournal()" style="flex:1;padding:9px;border-radius:9px;border:none;background:linear-gradient(135deg,#FFD700,#FFA726);color:#000;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">${entry?"✏️ Actualizar":"📝 Guardar"}</button>
    ${histCount>0?`<button onclick="showJournalHist=!showJournalHist;render()" style="padding:9px 14px;border-radius:9px;border:1px solid rgba(255,215,0,0.25);background:${showJournalHist?'rgba(255,215,0,0.1)':'transparent'};color:#FFD700;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">📖 ${histCount}</button>`:""}
  </div>
  ${histHTML}`;
}

function renderRecurring(){
  const el=$("exp-recurring");if(!el) return;
  const recurs=data.recurring||[];
  if(recurs.length===0&&!showRecurForm){
    el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:13px;font-weight:700;color:#E67E22">🔄 Gastos Fijos</span>
      <button onclick="showRecurForm=true;render()" style="background:linear-gradient(135deg,#E67E22,#F39C12);border:none;color:#fff;padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">+ Añadir</button>
    </div>`;
    return;
  }
  const paid=recurs.filter(r=>r.paidMonths[month]).length;
  const pendAmt=recurs.filter(r=>!r.paidMonths[month]).reduce((a,r)=>a+r.amount,0);
  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="font-size:13px;font-weight:700;color:#E67E22">🔄 Gastos Fijos — ${month}</span>
    <div style="display:flex;gap:6px;align-items:center">
      <span style="font-size:11px;color:#888">${paid}/${recurs.length} pagados</span>
      <button onclick="showRecurForm=!showRecurForm;render()" style="background:${showRecurForm?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#E67E22,#F39C12)"};border:${showRecurForm?"1px solid rgba(255,255,255,0.1)":"none"};color:${showRecurForm?"#888":"#fff"};padding:5px 10px;border-radius:7px;cursor:pointer;font-weight:700;font-size:10px;font-family:'Inter',sans-serif">${showRecurForm?"Cancelar":"+ Nuevo"}</button>
    </div>
  </div>`;
  if(pendAmt>0) html+=`<div style="padding:6px 10px;background:rgba(231,76,60,0.08);border-radius:8px;border:1px solid rgba(231,76,60,0.18);margin-bottom:10px;font-size:11px;color:#E74C3C;font-weight:600">⚠️ ${fS(pendAmt)} en gastos fijos pendientes este mes</div>`;
  if(showRecurForm){
    let grpHTML="";
    getEffectiveEG().forEach(g=>{let catsHTML="";(g.cats || []).forEach(c=>{
      const sel=recurGroup===g.id&&recurCat===c.id;
      catsHTML+=`<button onclick="recurGroup='${g.id}';recurCat='${c.id}';render()" style="padding:4px 8px;border-radius:6px;border:1px solid ${sel?g.color+"88":"rgba(255,255,255,0.06)"};background:${sel?g.color+"18":"transparent"};color:${sel?g.color:"#555"};font-size:10px;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap">${c.name}</button>`;
    });grpHTML+=`<div style="margin-bottom:6px"><div style="font-size:10px;color:${g.color};margin-bottom:4px">${g.icon} ${g.name}</div><div style="display:flex;gap:4px;flex-wrap:wrap">${catsHTML}</div></div>`;});
    html+=`<div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:10px;margin-bottom:10px">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input id="recur-input" class="inp" placeholder="Ej: Arriendo, Netflix..." style="flex:1;font-size:13px;padding:8px"/>
        <input class="inp" type="number" placeholder="$" value="${recurAmount}" oninput="recurAmount=this.value" style="width:80px;font-size:13px;padding:8px"/>
      </div>
      <div style="margin-bottom:8px;max-height:120px;overflow-y:auto">${grpHTML}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="flex:1"><div style="font-size:10px;color:#555;margin-bottom:3px">Día de pago</div>
          <input class="inp" type="number" min="1" max="31" value="${recurDay}" oninput="recurDay=this.value" style="font-size:13px;padding:6px;width:60px"/>
        </div>
        <button onclick="addRecurring()" style="padding:8px 16px;border-radius:8px;border:none;background:#E67E22;color:#fff;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">💾 Guardar</button>
      </div>
    </div>`;
  }
  recurs.forEach(r=>{
    const isPaid=r.paidMonths[month];
    const g=EG.find(x=>x.id===r.group);
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:${isPaid?"rgba(46,204,113,0.05)":"rgba(0,0,0,0.15)"};border-radius:10px;border:1px solid ${isPaid?"rgba(46,204,113,0.15)":"rgba(255,255,255,0.05)"};margin-bottom:4px">
      <button onclick="toggleRecurPaid('${r.id}')" style="width:24px;height:24px;border-radius:7px;border:2px solid ${isPaid?"#2ECC71":"rgba(255,255,255,0.15)"};background:${isPaid?"rgba(46,204,113,0.2)":"transparent"};cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#2ECC71">${isPaid?"✓":""}</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:${isPaid?"#555":"#ddd"};font-weight:600;${isPaid?"text-decoration:line-through;opacity:0.6":""}">${r.name}</div>
        <div style="font-size:10px;color:#555">Día ${r.dueDay} · ${g?.icon||""} ${g?.name||""}</div>
      </div>
      <span style="font-size:13px;color:${isPaid?"#555":"#E67E22"};font-weight:700">${fS(r.amount)}</span>
      <button onclick="deleteRecurring('${r.id}')" style="background:none;border:none;color:#444;cursor:pointer;font-size:11px;padding:3px">✕</button>
    </div>`;
  });
  el.innerHTML=html;
}

function renderGoals(){
  const el=$("acc-goals");if(!el) return;
  const goals=data.goals||[];
  if(goals.length===0&&!showGoalForm){
    el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:13px;font-weight:700;color:#FFD700">🎯 Metas Financieras</span>
      <button onclick="showGoalForm=true;render()" style="background:linear-gradient(135deg,#FFD700,#FFA726);border:none;color:#000;padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">+ Nueva Meta</button>
    </div>`;
    return;
  }
  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <span style="font-size:13px;font-weight:700;color:#FFD700">🎯 Metas Financieras (${goals.filter(g=>g.done).length}/${goals.length})</span>
    <button onclick="showGoalForm=!showGoalForm;render()" style="background:${showGoalForm?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#FFD700,#FFA726)"};border:${showGoalForm?"1px solid rgba(255,255,255,0.1)":"none"};color:${showGoalForm?"#888":"#000"};padding:5px 10px;border-radius:7px;cursor:pointer;font-weight:700;font-size:10px;font-family:'Inter',sans-serif">${showGoalForm?"Cancelar":"+ Nueva"}</button>
  </div>`;
  if(showGoalForm){
    const icons=["🎯","🛡️","🏠","🚗","💻","🎓","✈️","🎁","💊","📱"];
    let iconHTML="";icons.forEach(ic=>{
      iconHTML+=`<button onclick="goalIcon='${ic}';render()" style="font-size:18px;padding:4px;border-radius:6px;border:1px solid ${goalIcon===ic?"rgba(255,215,0,0.5)":"transparent"};background:${goalIcon===ic?"rgba(255,215,0,0.12)":"transparent"};cursor:pointer">${ic}</button>`;
    });
    html+=`<div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:10px;margin-bottom:12px">
      <input id="goal-input" class="inp" placeholder="Ej: Fondo de emergencia..." style="font-size:13px;padding:8px;margin-bottom:8px"/>
      <div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">${iconHTML}</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input class="inp" type="number" placeholder="Meta $" value="${goalTarget}" oninput="goalTarget=this.value" style="flex:1;font-size:13px;padding:8px"/>
        <input class="inp" type="date" value="${goalDeadline}" onchange="goalDeadline=this.value" style="flex:1;font-size:12px;padding:8px"/>
      </div>
      <button onclick="addGoal()" style="width:100%;padding:8px;border-radius:8px;border:none;background:linear-gradient(135deg,#FFD700,#FFA726);color:#000;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">🎯 Crear Meta</button>
    </div>`;
  }
  goals.forEach(g=>{
    const pct=g.target>0?Math.min(100,Math.round((g.current/g.target)*100)):0;
    const barColor=g.done?"#2ECC71":pct>60?"#F1C40F":"#3498DB";
    const deadlineStr=g.deadline?new Date(g.deadline+"T12:00:00").toLocaleDateString("es-EC",{day:"numeric",month:"short"}):"";
    const isOverdue=g.deadline&&!g.done&&g.deadline<todayStr();
    html+=`<div style="padding:12px;background:${g.done?"rgba(46,204,113,0.05)":"rgba(0,0,0,0.15)"};border-radius:12px;border:1px solid ${g.done?"rgba(46,204,113,0.2)":"rgba(255,255,255,0.05)"};margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:22px">${g.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:${g.done?"#2ECC71":"#ddd"};${g.done?"text-decoration:line-through":""}">${g.text}</div>
          <div style="font-size:10px;color:#555">${deadlineStr?`${isOverdue?"⚠️":"📅"} ${deadlineStr} · `:""}${fS(g.current)} de ${fS(g.target)}</div>
        </div>
        <span style="font-size:14px;font-weight:800;color:${barColor}">${pct}%</span>
        <button onclick="deleteGoal('${g.id}')" style="background:none;border:none;color:#444;cursor:pointer;font-size:11px;padding:3px">✕</button>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;margin-bottom:8px">
        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width 0.5s"></div>
      </div>
      ${!g.done?`<div style="display:flex;gap:6px;align-items:center">
        <input class="inp" type="number" placeholder="Actualizar progreso $" oninput="this.style.borderColor='rgba(255,215,0,0.35)'" onkeydown="if(event.key==='Enter'){updateGoalProgress('${g.id}',this.value)}" style="flex:1;font-size:12px;padding:7px"/>
        <button onclick="updateGoalProgress('${g.id}',this.previousElementSibling.value)" style="padding:7px 12px;border-radius:8px;border:none;background:#1ABC9C;color:#fff;cursor:pointer;font-weight:700;font-size:11px">✓</button>
      </div>`:`<div style="text-align:center;font-size:12px;color:#2ECC71;font-weight:700">🎉 ¡Meta alcanzada!</div>`}
    </div>`;
  });
  el.innerHTML=html;
}

function renderHabitsTab(){
  const el=$("todo-list");if(!el) return;
  const habits=data.habits||[];
  const today=todayStr();

  // Hide day nav, show habits
  $("todo-day-nav").classList.add("hidden");
  $("todo-area-selector").innerHTML="";
  $("todo-dif-selector").innerHTML="";
  $("todo-filter-bar").innerHTML="";

  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <span style="font-size:15px;font-weight:700;color:#FF6B35">🔄 Mis Hábitos Diarios</span>
    <button onclick="showHabitForm=!showHabitForm;render()" style="background:${showHabitForm?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#FF6B35,#FF8C42)"};border:${showHabitForm?"1px solid rgba(255,255,255,0.1)":"none"};color:${showHabitForm?"#888":"#fff"};padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">${showHabitForm?"Cancelar":"+ Nuevo Hábito"}</button>
  </div>`;
  if(showHabitForm){
    let areaHTML="";
    AREAS.forEach(a=>{
      const on=habitArea===a.id;
      areaHTML+=`<button onclick="habitArea='${a.id}';render()" class="tab" style="color:${on?a.c:"#555"};border-color:${on?a.c:"rgba(255,255,255,0.07)"};background:${on?a.c+"18":"rgba(0,0,0,0.25)"}">${a.icon} ${a.n}</button>`;
    });
    html+=`<div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:12px;margin-bottom:14px">
      <input id="habit-input" class="inp" placeholder="Ej: Ejercicio 30min, Leer, Meditar..." style="font-size:14px;padding:10px;margin-bottom:8px"/>
      <div style="font-size:10px;color:#555;margin-bottom:6px;font-weight:600">ÁREA</div>
      <div style="display:flex;gap:5px;overflow-x:auto;margin-bottom:10px">${areaHTML}</div>
      <button onclick="addHabit()" style="width:100%;padding:10px;border-radius:9px;border:none;background:linear-gradient(135deg,#FF6B35,#FF8C42);color:#fff;cursor:pointer;font-weight:800;font-size:13px;font-family:'Inter',sans-serif">+ CREAR HÁBITO</button>
    </div>`;
  }
  if(habits.length===0){
    html+=`<div style="text-align:center;padding:30px;color:#444"><div style="font-size:32px;margin-bottom:10px">🔄</div><div style="font-size:13px">No tienes hábitos aún.</div><div style="font-size:11px;color:#555;margin-top:4px">Crea uno para empezar a construir rachas.</div></div>`;
  }
  // Week grid header
  if(habits.length>0){
    const weekDays=[];
    for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);weekDays.push(d);}
    html+=`<div style="display:grid;grid-template-columns:1fr repeat(7,28px) 40px 28px;gap:4px;align-items:center;margin-bottom:6px;padding:0 4px">
      <div></div>
      ${weekDays.map(d=>`<div style="text-align:center;font-size:8px;color:#555;font-weight:700">${["Do","Lu","Ma","Mi","Ju","Vi","Sa"][d.getDay()]}</div>`).join("")}
      <div style="text-align:center;font-size:8px;color:#FF6B35;font-weight:700">🔥</div>
      <div></div>
    </div>`;
    habits.forEach(h=>{
      const ar=AREAS.find(a=>a.id===h.area)||AREAS[0];
      const isDoneToday=h.history[today];
      let dotsHTML="";
      weekDays.forEach(d=>{
        const ds=d.toISOString().slice(0,10);
        const done=h.history[ds];
        dotsHTML+=`<div style="width:22px;height:22px;border-radius:5px;background:${done?"rgba(46,204,113,0.3)":"rgba(255,255,255,0.04)"};border:1px solid ${done?"rgba(46,204,113,0.4)":"rgba(255,255,255,0.06)"};margin:auto;display:flex;align-items:center;justify-content:center;font-size:9px;color:#2ECC71">${done?"✓":""}</div>`;
      });
      html+=`<div style="display:grid;grid-template-columns:1fr repeat(7,28px) 40px 28px;gap:4px;align-items:center;padding:8px 4px;background:${isDoneToday?"rgba(46,204,113,0.04)":"rgba(0,0,0,0.12)"};border-radius:10px;border:1px solid ${isDoneToday?"rgba(46,204,113,0.15)":"rgba(255,255,255,0.04)"};margin-bottom:4px">
        <div onclick="toggleHabitToday('${h.id}')" style="cursor:pointer;min-width:0">
          <div style="font-size:12px;color:${isDoneToday?"#555":"#ddd"};font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isDoneToday?"text-decoration:line-through":""}">${h.text}</div>
          <div style="font-size:9px;color:${ar.c}">${ar.icon} ${ar.n}</div>
        </div>
        ${dotsHTML}
        <div style="text-align:center;font-size:12px;font-weight:800;color:${h.streak>0?"#FF6B35":"#333"}">${h.streak}</div>
        <button onclick="deleteHabit('${h.id}')" style="background:none;border:none;color:#333;cursor:pointer;font-size:10px;padding:2px">✕</button>
      </div>`;
    });
    // Best streaks
    const best=habits.filter(h=>h.bestStreak>0).sort((a,b)=>b.bestStreak-a.bestStreak);
    if(best.length>0){
      html+=`<div style="margin-top:12px;padding:10px;background:rgba(255,107,53,0.06);border-radius:10px;border:1px solid rgba(255,107,53,0.15)">
        <div style="font-size:10px;color:#FF6B35;font-weight:700;margin-bottom:6px">🏆 MEJORES RACHAS</div>
        ${best.slice(0,3).map(h=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0"><span style="color:#aaa">${h.text}</span><span style="color:#FFD700;font-weight:700">🔥 ${h.bestStreak} días</span></div>`).join("")}
      </div>`;
    }
  }
  el.innerHTML=html;
  // Update progress for habits
  const doneH=habits.filter(h=>h.history[today]).length;
  $("todo-progress-count").textContent=`${doneH} / ${habits.length}`;
  $("todo-progress-bar").style.width=(habits.length?(doneH/habits.length)*100:0)+"%";
}

function renderSettingsExtras(){
  // Theme selector
  const themeEl=$("settings-themes");
  if(themeEl){
    let html=`<div style="font-size:11px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🎨 Tema de Color</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">`;
    THEMES.forEach(t=>{
      const sel=data.theme===t.id;
      html+=`<button onclick="setTheme('${t.id}')" style="padding:8px 14px;border-radius:9px;border:2px solid ${sel?t.accent:"rgba(255,255,255,0.08)"};background:${t.bg};color:${sel?t.accent:"#666"};cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:6px">
        <span style="width:12px;height:12px;border-radius:50%;background:${t.accent};display:inline-block;flex-shrink:0"></span>${t.name}
      </button>`;
    });
    html+=`</div>`;
    themeEl.innerHTML=html;
  }
  // Notifications
  const notifEl=$("settings-notif");
  if(notifEl){
    notifEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:12px;color:#ddd;font-weight:600">🔔 Notificaciones</div>
        <div style="font-size:10px;color:#555">Recordatorio a las 8pm de tareas pendientes</div></div>
      <button onclick="toggleNotifications()" style="padding:6px 14px;border-radius:8px;border:1px solid ${notifEnabled?"rgba(46,204,113,0.4)":"rgba(255,255,255,0.1)"};background:${notifEnabled?"rgba(46,204,113,0.12)":"transparent"};color:${notifEnabled?"#2ECC71":"#555"};cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">${notifEnabled?"✓ Activo":"Activar"}</button>
    </div>`;
  }
  // PDF
  const pdfEl=$("settings-pdf");
  if(pdfEl){
    pdfEl.innerHTML=`<button onclick="exportPDF()" style="width:100%;padding:10px;border-radius:9px;border:1px solid rgba(171,71,188,0.3);background:rgba(171,71,188,0.08);color:#AB47BC;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">📄 Generar Reporte PDF</button>`;
  }
  // Achievements
  const achEl=$("settings-achievements");
  if(achEl){
    const unlocked=Object.keys(data.achievements||{}).length;
    let html=`<div onclick="showAchievements=!showAchievements;render()" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:${showAchievements?"10px":"0"}">
      <span style="font-size:12px;font-weight:700;color:#FFD700">🏅 Logros (${unlocked}/${ACHV.length})</span>
      <span style="font-size:10px;color:#444;transform:${showAchievements?"rotate(90deg)":""};transition:0.2s;display:inline-block">▶</span>
    </div>`;
    if(showAchievements){
      html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">`;
      ACHV.forEach(a=>{
        const done=data.achievements?.[a.id];
        html+=`<div style="padding:8px;background:${done?"rgba(255,215,0,0.06)":"rgba(0,0,0,0.2)"};border-radius:9px;border:1px solid ${done?"rgba(255,215,0,0.2)":"rgba(255,255,255,0.04)"}">
          <div style="font-size:18px;margin-bottom:4px;${done?"":"filter:grayscale(1);opacity:0.3"}">${a.icon}</div>
          <div style="font-size:11px;font-weight:700;color:${done?"#FFD700":"#444"}">${a.name}</div>
          <div style="font-size:9px;color:#555;margin-top:2px">${a.desc}</div>
          ${done?`<div style="font-size:8px;color:#2ECC71;margin-top:3px">✓ ${done}</div>`:""}
        </div>`;
      });
      html+=`</div>`;
    }
    achEl.innerHTML=html;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── 1. DEBTS & LOANS ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function addDebt(){
  const nameEl=$("debt-name-input");const amtEl=$("debt-amt-input");
  const name=(nameEl?nameEl.value:"").trim();const amount=parseFloat(amtEl?amtEl.value:0)||0;
  if(!name||amount<=0) return;
  const typeEl=document.querySelector('input[name="debt-type"]:checked');
  const type=typeEl?typeEl.value:"owe_me";
  data.debts.push({id:Date.now().toString(),name,amount,paid:0,type,date:todayStr(),payments:[]});
  if(nameEl) nameEl.value="";if(amtEl) amtEl.value="";
  showDebtForm=false;
  flash(type==="owe_me"?"💸 Deuda registrada: te deben":"💸 Deuda registrada: debes","success");
  schedSave();render();
}
function payDebt(id){
  const d=data.debts.find(x=>x.id===id);if(!d) return;
  const input=document.getElementById("debt-pay-"+id);
  const val=parseFloat(input?input.value:0)||0;
  if(val<=0) return;
  d.paid+=val;
  d.payments.push({amount:val,date:todayStr()});
  if(input) input.value="";
  if(d.paid>=d.amount){
    flash(`✅ ¡Deuda con ${d.name} saldada!`,"xp");
    data.xp=(data.xp||0)+5;
  } else {
    flash(`💰 Abono de ${fmt(val)} registrado`,"success");
  }
  schedSave();render();
}
function deleteDebt(id){
  if(!confirm("¿Eliminar esta deuda?")) return;
  data.debts=data.debts.filter(x=>x.id!==id);
  schedSave();render();
}

function renderDebts(){
  const el=$("acc-debts");if(!el) return;
  const debts=data.debts||[];
  const oweMe=debts.filter(d=>d.type==="owe_me"&&d.paid<d.amount);
  const iOwe=debts.filter(d=>d.type==="i_owe"&&d.paid<d.amount);
  const settled=debts.filter(d=>d.paid>=d.amount);
  const totalOweMe=oweMe.reduce((a,d)=>a+(d.amount-d.paid),0);
  const totalIOwe=iOwe.reduce((a,d)=>a+(d.amount-d.paid),0);

  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <span style="font-size:13px;font-weight:700;color:#3498DB">👥 Deudas & Préstamos</span>
    <button onclick="showDebtForm=!showDebtForm;render()" style="background:${showDebtForm?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#3498DB,#2980B9)"};border:${showDebtForm?"1px solid rgba(255,255,255,0.1)":"none"};color:${showDebtForm?"#888":"#fff"};padding:5px 10px;border-radius:7px;cursor:pointer;font-weight:700;font-size:10px;font-family:'Inter',sans-serif">${showDebtForm?"Cancelar":"+ Nueva"}</button>
  </div>`;

  if(totalOweMe>0||totalIOwe>0){
    html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div style="padding:8px;background:rgba(46,204,113,0.06);border-radius:8px;border:1px solid rgba(46,204,113,0.18);text-align:center">
        <div style="font-size:9px;color:#555">ME DEBEN</div>
        <div style="font-size:14px;font-weight:800;color:#2ECC71">${fS(totalOweMe)}</div>
      </div>
      <div style="padding:8px;background:rgba(231,76,60,0.06);border-radius:8px;border:1px solid rgba(231,76,60,0.18);text-align:center">
        <div style="font-size:9px;color:#555">DEBO</div>
        <div style="font-size:14px;font-weight:800;color:#E74C3C">${fS(totalIOwe)}</div>
      </div>
    </div>`;
  }

  if(showDebtForm){
    html+=`<div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:10px;margin-bottom:12px">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <label style="flex:1;display:flex;align-items:center;gap:6px;padding:8px;border-radius:8px;border:1px solid rgba(46,204,113,0.3);background:rgba(46,204,113,0.06);cursor:pointer;font-size:11px;color:#2ECC71;font-weight:700">
          <input type="radio" name="debt-type" value="owe_me" checked style="accent-color:#2ECC71"/> Me deben
        </label>
        <label style="flex:1;display:flex;align-items:center;gap:6px;padding:8px;border-radius:8px;border:1px solid rgba(231,76,60,0.3);background:rgba(231,76,60,0.06);cursor:pointer;font-size:11px;color:#E74C3C;font-weight:700">
          <input type="radio" name="debt-type" value="i_owe" style="accent-color:#E74C3C"/> Yo debo
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input id="debt-name-input" class="inp" placeholder="Nombre de la persona..." style="flex:1;font-size:13px;padding:8px"/>
        <input id="debt-amt-input" class="inp" type="number" placeholder="$" style="width:90px;font-size:13px;padding:8px"/>
      </div>
      <button onclick="addDebt()" style="width:100%;padding:8px;border-radius:8px;border:none;background:#3498DB;color:#fff;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">💸 Registrar</button>
    </div>`;
  }

  const renderDebtItem=(d)=>{
    const remaining=d.amount-d.paid;
    const pct=Math.min(100,Math.round((d.paid/d.amount)*100));
    const isOweMe=d.type==="owe_me";
    const color=isOweMe?"#2ECC71":"#E74C3C";
    return `<div style="padding:10px;background:rgba(0,0,0,0.15);border-radius:10px;border:1px solid rgba(255,255,255,0.05);margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">${isOweMe?"🟢":"🔴"}</span>
          <div><div style="font-size:13px;font-weight:700;color:#ddd">${d.name}</div>
          <div style="font-size:10px;color:#555">${isOweMe?"Te debe":"Le debes"} · ${new Date(d.date+"T12:00:00").toLocaleDateString("es-EC",{day:"numeric",month:"short"})}</div></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:800;color:${color}">${fS(remaining)}</div>
          <div style="font-size:9px;color:#555">de ${fS(d.amount)}</div>
        </div>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-bottom:8px">
        <div style="height:100%;width:${pct}%;background:${color};transition:0.4s"></div>
      </div>
      ${remaining>0?`<div style="display:flex;gap:6px;align-items:center">
        <input id="debt-pay-${d.id}" class="inp" type="number" placeholder="Abono $" style="flex:1;font-size:12px;padding:6px"/>
        <button onclick="payDebt('${d.id}')" style="padding:6px 12px;border-radius:7px;border:none;background:${color};color:#fff;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">Abonar</button>
        <button onclick="deleteDebt('${d.id}')" style="background:none;border:none;color:#333;cursor:pointer;font-size:10px">✕</button>
      </div>`:`<div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:#2ECC71;font-weight:700">✅ Saldada</span>
        <button onclick="deleteDebt('${d.id}')" style="background:none;border:none;color:#333;cursor:pointer;font-size:10px">✕</button>
      </div>`}
      ${d.payments.length>0?`<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.04)">
        ${d.payments.slice(-3).map(p=>`<div style="display:flex;justify-content:space-between;font-size:10px;color:#444;padding:2px 0"><span>${new Date(p.date+"T12:00:00").toLocaleDateString("es-EC",{day:"numeric",month:"short"})}</span><span style="color:${color}">${fS(p.amount)}</span></div>`).join("")}
      </div>`:""}
    </div>`;
  };

  if(oweMe.length>0){html+=`<div style="font-size:10px;color:#2ECC71;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">ME DEBEN (${oweMe.length})</div>`;oweMe.forEach(d=>{html+=renderDebtItem(d);});}
  if(iOwe.length>0){html+=`<div style="font-size:10px;color:#E74C3C;font-weight:700;margin:8px 0 6px;text-transform:uppercase;letter-spacing:1px">YO DEBO (${iOwe.length})</div>`;iOwe.forEach(d=>{html+=renderDebtItem(d);});}
  if(settled.length>0){html+=`<div style="font-size:10px;color:#555;font-weight:700;margin:8px 0 6px;text-transform:uppercase;letter-spacing:1px">✅ SALDADAS (${settled.length})</div>`;settled.slice(0,3).forEach(d=>{html+=renderDebtItem(d);});}
  if(debts.length===0&&!showDebtForm) html+=`<div style="text-align:center;padding:15px;color:#333;font-size:12px">Sin deudas registradas 🎉</div>`;

  el.innerHTML=html;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── 2. WISHLIST ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function addWishItem(){
  const nameEl=$("wish-name");const priceEl=$("wish-price");
  const name=(nameEl?nameEl.value:"").trim();const price=parseFloat(priceEl?priceEl.value:0)||0;
  if(!name) return;
  data.wishlist.push({id:Date.now().toString(),name,price,done:false,date:todayStr()});
  if(nameEl) nameEl.value="";if(priceEl) priceEl.value="";
  showWishForm=false;
  flash("🎁 Agregado a la wishlist","success");
  schedSave();render();
}
function toggleWishDone(id){
  const w=data.wishlist.find(x=>x.id===id);if(!w) return;
  w.done=!w.done;
  if(w.done) flash("🎉 ¡Comprado!","success");
  schedSave();render();
}
function deleteWish(id){data.wishlist=data.wishlist.filter(x=>x.id!==id);schedSave();render();}

function renderWishlist(){
  const el=$("shop-wishlist");if(!el) return;
  const items=data.wishlist||[];
  const pending=items.filter(w=>!w.done);
  const bought=items.filter(w=>w.done);
  const totalPending=pending.reduce((a,w)=>a+w.price,0);
  // Calculate avg monthly savings
  const ct=calcM(data,month);
  const monthlySavings=ct.bal>0?ct.bal:0;
  const monthsNeeded=monthlySavings>0?Math.ceil(totalPending/monthlySavings):0;

  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="font-size:13px;font-weight:700;color:#9B59B6">🎁 Quiero Comprar</span>
    <button onclick="showWishForm=!showWishForm;render()" style="background:${showWishForm?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#9B59B6,#8E44AD)"};border:${showWishForm?"1px solid rgba(255,255,255,0.1)":"none"};color:${showWishForm?"#888":"#fff"};padding:5px 10px;border-radius:7px;cursor:pointer;font-weight:700;font-size:10px;font-family:'Inter',sans-serif">${showWishForm?"Cancelar":"+ Agregar"}</button>
  </div>`;

  if(showWishForm){
    html+=`<div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:10px;margin-bottom:10px">
      <input id="wish-name" class="inp" placeholder="¿Qué quieres comprar?" style="font-size:13px;padding:8px;margin-bottom:8px"/>
      <div style="display:flex;gap:8px">
        <input id="wish-price" class="inp" type="number" placeholder="Precio $" style="flex:1;font-size:13px;padding:8px"/>
        <button onclick="addWishItem()" style="padding:8px 16px;border-radius:8px;border:none;background:#9B59B6;color:#fff;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">🎁 Agregar</button>
      </div>
    </div>`;
  }

  if(totalPending>0){
    html+=`<div style="padding:8px 10px;background:rgba(155,89,182,0.06);border-radius:8px;border:1px solid rgba(155,89,182,0.18);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:10px;color:#555">TOTAL PENDIENTE</div><div style="font-size:14px;font-weight:800;color:#9B59B6">${fS(totalPending)}</div></div>
      ${monthsNeeded>0?`<div style="text-align:right"><div style="font-size:10px;color:#555">AHORRANDO ASÍ</div><div style="font-size:12px;font-weight:700;color:#F1C40F">~${monthsNeeded} mes${monthsNeeded>1?"es":""}</div></div>`:""}
    </div>`;
  }

  pending.forEach(w=>{
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(0,0,0,0.12);border-radius:9px;margin-bottom:4px;border:1px solid rgba(255,255,255,0.04)">
      <button onclick="toggleWishDone('${w.id}')" style="width:22px;height:22px;border-radius:6px;border:2px solid rgba(155,89,182,0.4);background:transparent;cursor:pointer;flex-shrink:0"></button>
      <div style="flex:1;min-width:0"><div style="font-size:13px;color:#ddd;font-weight:600">${w.name}</div></div>
      ${w.price>0?`<span style="font-size:12px;color:#9B59B6;font-weight:700">${fS(w.price)}</span>`:""}
      <button onclick="deleteWish('${w.id}')" style="background:none;border:none;color:#333;cursor:pointer;font-size:10px">✕</button>
    </div>`;
  });
  bought.forEach(w=>{
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(46,204,113,0.04);border-radius:9px;margin-bottom:4px;border:1px solid rgba(46,204,113,0.12)">
      <button onclick="toggleWishDone('${w.id}')" style="width:22px;height:22px;border-radius:6px;border:2px solid #2ECC71;background:rgba(46,204,113,0.2);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#2ECC71">✓</button>
      <span style="flex:1;font-size:13px;color:#555;text-decoration:line-through">${w.name}</span>
      <button onclick="deleteWish('${w.id}')" style="background:none;border:none;color:#333;cursor:pointer;font-size:10px">✕</button>
    </div>`;
  });
  if(items.length===0&&!showWishForm) html+=`<div style="text-align:center;padding:12px;color:#333;font-size:12px">Lista vacía. ¡Agrega algo que desees!</div>`;
  el.innerHTML=html;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── 3. MONTHLY COMPARATOR ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function renderComparador(){
  const el=$("hist-comparador");if(!el) return;
  const mi=MS.indexOf(month);
  if(!compareMo2){compareMo2=mi>0?MS[mi-1]:MS[MS.length-1];}
  const m1=month;const m2=compareMo2;
  const c1=calcM(data,m1);const c2=calcM(data,m2);

  const pctChange=(a,b)=>{if(b===0) return a>0?"+100%":"0%";const p=Math.round(((a-b)/Math.abs(b))*100);return (p>=0?"+":"")+p+"%";};
  const arrow=(a,b,invert)=>{if(a===b) return "→";return (invert?(a<b):(a>b))?"↑":"↓";};
  const clr=(a,b,invert)=>{if(a===b) return "#555";return (invert?(a<b):(a>b))?"#2ECC71":"#E74C3C";};

  let moOpts="";MS.forEach(m=>{moOpts+=`<option value="${m}" ${m===compareMo2?"selected":""}>${m}</option>`;});

  let catComp="";
  getEffectiveEG().forEach(g=>{
    const e1=Object.values(data.months[m1]?.expenses?.[g.id]||{}).reduce((a,b)=>a+b,0);
    const e2=Object.values(data.months[m2]?.expenses?.[g.id]||{}).reduce((a,b)=>a+b,0);
    if(e1>0||e2>0){
      catComp+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.03)">
        <span style="font-size:14px">${g.icon}</span>
        <span style="flex:1;font-size:12px;color:#aaa">${g.name}</span>
        <span style="font-size:11px;color:#888;width:70px;text-align:right">${fS(e2)}</span>
        <span style="font-size:11px;font-weight:800;width:50px;text-align:center;color:${clr(e1,e2,true)}">${arrow(e1,e2,true)} ${pctChange(e1,e2)}</span>
        <span style="font-size:11px;color:#ddd;font-weight:700;width:70px;text-align:right">${fS(e1)}</span>
      </div>`;
    }
  });

  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <span style="font-size:13px;font-weight:700;color:#1ABC9C">🔁 Comparador Mensual</span>
    <select onchange="compareMo2=this.value;render()" style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#ddd;padding:4px 8px;border-radius:6px;font-size:11px;font-family:'Inter',sans-serif">${moOpts}</select>
  </div>
  <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:6px;margin-bottom:12px;text-align:center">
    <div style="padding:8px;background:rgba(0,0,0,0.15);border-radius:8px">
      <div style="font-size:9px;color:#555">${m2}</div>
    </div>
    <div style="display:flex;align-items:center;font-size:12px;color:#555">vs</div>
    <div style="padding:8px;background:rgba(26,188,156,0.06);border-radius:8px;border:1px solid rgba(26,188,156,0.18)">
      <div style="font-size:9px;color:#1ABC9C;font-weight:700">${m1} (actual)</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
    <div style="padding:8px;background:rgba(46,204,113,0.05);border-radius:8px;text-align:center;border:1px solid rgba(46,204,113,0.12)">
      <div style="font-size:9px;color:#555">INGRESOS</div>
      <div style="font-size:12px;font-weight:800;color:#2ECC71">${fS(c1.inc)}</div>
      <div style="font-size:10px;color:${clr(c1.inc,c2.inc,false)};font-weight:700">${arrow(c1.inc,c2.inc,false)} ${pctChange(c1.inc,c2.inc)}</div>
    </div>
    <div style="padding:8px;background:rgba(231,76,60,0.05);border-radius:8px;text-align:center;border:1px solid rgba(231,76,60,0.12)">
      <div style="font-size:9px;color:#555">GASTOS</div>
      <div style="font-size:12px;font-weight:800;color:#E74C3C">${fS(c1.exp)}</div>
      <div style="font-size:10px;color:${clr(c1.exp,c2.exp,true)};font-weight:700">${arrow(c1.exp,c2.exp,true)} ${pctChange(c1.exp,c2.exp)}</div>
    </div>
    <div style="padding:8px;background:rgba(52,152,219,0.05);border-radius:8px;text-align:center;border:1px solid rgba(52,152,219,0.12)">
      <div style="font-size:9px;color:#555">BALANCE</div>
      <div style="font-size:12px;font-weight:800;color:${c1.bal>=0?"#3498DB":"#E74C3C"}">${fS(c1.bal)}</div>
      <div style="font-size:10px;color:${clr(c1.bal,c2.bal,false)};font-weight:700">${arrow(c1.bal,c2.bal,false)} ${pctChange(c1.bal,c2.bal)}</div>
    </div>
  </div>
  ${catComp?`<div style="font-size:10px;color:#555;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">POR CATEGORÍA</div>
  <div style="display:flex;justify-content:space-between;font-size:9px;color:#444;margin-bottom:4px;padding:0 4px"><span></span><span></span><span style="width:70px;text-align:right">${m2}</span><span style="width:50px;text-align:center">cambio</span><span style="width:70px;text-align:right">${m1}</span></div>
  ${catComp}`:""}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── 4. SUBSCRIPTIONS ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function addSub(){
  const nameEl=$("sub-name");const priceEl=$("sub-price");
  const name=(nameEl?nameEl.value:"").trim();const price=parseFloat(priceEl?priceEl.value:0)||0;
  if(!name||price<=0) return;
  data.subs.push({id:Date.now().toString(),name,price,active:true,date:todayStr()});
  if(nameEl) nameEl.value="";if(priceEl) priceEl.value="";
  showSubsForm=false;
  flash("📍 Suscripción registrada","success");
  schedSave();render();
}
function toggleSubActive(id){
  const s=data.subs.find(x=>x.id===id);if(!s) return;
  s.active=!s.active;
  flash(s.active?"✅ Suscripción reactivada":"⏸️ Suscripción pausada","success");
  schedSave();render();
}
function deleteSub(id){data.subs=data.subs.filter(x=>x.id!==id);schedSave();render();}

function renderSubs(){
  const el=$("exp-subs");if(!el) return;
  const subs=data.subs||[];
  const active=subs.filter(s=>s.active);
  const paused=subs.filter(s=>!s.active);
  const totalActive=active.reduce((a,s)=>a+s.price,0);
  const totalPaused=paused.reduce((a,s)=>a+s.price,0);
  const annual=totalActive*12;

  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="font-size:13px;font-weight:700;color:#E91E63">📍 Suscripciones</span>
    <button onclick="showSubsForm=!showSubsForm;render()" style="background:${showSubsForm?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#E91E63,#C2185B)"};border:${showSubsForm?"1px solid rgba(255,255,255,0.1)":"none"};color:${showSubsForm?"#888":"#fff"};padding:5px 10px;border-radius:7px;cursor:pointer;font-weight:700;font-size:10px;font-family:'Inter',sans-serif">${showSubsForm?"Cancelar":"+ Nueva"}</button>
  </div>`;

  if(totalActive>0){
    html+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
      <div style="padding:8px;background:rgba(233,30,99,0.06);border-radius:8px;border:1px solid rgba(233,30,99,0.18);text-align:center">
        <div style="font-size:9px;color:#555">MENSUAL</div>
        <div style="font-size:14px;font-weight:800;color:#E91E63">${fS(totalActive)}</div>
      </div>
      <div style="padding:8px;background:rgba(233,30,99,0.03);border-radius:8px;border:1px solid rgba(233,30,99,0.1);text-align:center">
        <div style="font-size:9px;color:#555">ANUAL</div>
        <div style="font-size:14px;font-weight:800;color:#C2185B">${fS(annual)}</div>
      </div>
    </div>`;
  }
  if(totalPaused>0){
    html+=`<div style="padding:6px 10px;background:rgba(46,204,113,0.06);border-radius:8px;border:1px solid rgba(46,204,113,0.15);margin-bottom:10px;font-size:11px;color:#2ECC71;font-weight:600">💡 Ahorras ${fS(totalPaused)}/mes por subs pausadas</div>`;
  }

  if(showSubsForm){
    html+=`<div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:10px;margin-bottom:10px">
      <div style="display:flex;gap:8px">
        <input id="sub-name" class="inp" placeholder="Ej: Netflix, Spotify..." style="flex:1;font-size:13px;padding:8px"/>
        <input id="sub-price" class="inp" type="number" placeholder="$/mes" style="width:80px;font-size:13px;padding:8px"/>
      </div>
      <button onclick="addSub()" style="width:100%;padding:8px;border-radius:8px;border:none;background:#E91E63;color:#fff;cursor:pointer;font-weight:700;font-size:12px;margin-top:8px;font-family:'Inter',sans-serif">📍 Registrar</button>
    </div>`;
  }

  active.forEach(s=>{
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:rgba(0,0,0,0.15);border-radius:10px;border:1px solid rgba(255,255,255,0.05);margin-bottom:4px">
      <span style="font-size:14px">🔴</span>
      <span style="flex:1;font-size:13px;color:#ddd;font-weight:600">${s.name}</span>
      <span style="font-size:12px;color:#E91E63;font-weight:700">${fS(s.price)}/m</span>
      <button onclick="toggleSubActive('${s.id}')" style="background:none;border:1px solid rgba(255,255,255,0.1);color:#555;cursor:pointer;font-size:9px;padding:3px 6px;border-radius:5px;font-family:'Inter',sans-serif">⏸️</button>
      <button onclick="deleteSub('${s.id}')" style="background:none;border:none;color:#333;cursor:pointer;font-size:10px">✕</button>
    </div>`;
  });
  paused.forEach(s=>{
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:rgba(46,204,113,0.03);border-radius:10px;border:1px solid rgba(46,204,113,0.1);margin-bottom:4px;opacity:0.6">
      <span style="font-size:14px">⏸️</span>
      <span style="flex:1;font-size:13px;color:#555;font-weight:600;text-decoration:line-through">${s.name}</span>
      <span style="font-size:12px;color:#555;font-weight:700">${fS(s.price)}/m</span>
      <button onclick="toggleSubActive('${s.id}')" style="background:none;border:1px solid rgba(46,204,113,0.2);color:#2ECC71;cursor:pointer;font-size:9px;padding:3px 6px;border-radius:5px;font-family:'Inter',sans-serif">▶️</button>
      <button onclick="deleteSub('${s.id}')" style="background:none;border:none;color:#333;cursor:pointer;font-size:10px">✕</button>
    </div>`;
  });
  if(subs.length===0&&!showSubsForm) html+=`<div style="text-align:center;padding:12px;color:#333;font-size:12px">Sin suscripciones registradas</div>`;
  el.innerHTML=html;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── 5. FOCUS / NO-SPEND CHALLENGE ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function startFocusChallenge(){
  const daysEl=$("focus-days");const catEl=$("focus-cat");
  const days=parseInt(daysEl?daysEl.value:7)||7;
  const cat=catEl?catEl.value:"all";
  const catName=cat==="all"?"todo":EG.find(g=>g.id===cat)?.name||cat;
  data.focusChallenge={start:todayStr(),days,cat,catName,streak:0,failed:false};
  showFocusForm=false;
  flash(`⚡ ¡Reto activado! ${days} días sin gastar en ${catName}`,"xp");
  schedSave();render();
}
function checkFocusChallenge(){
  const fc=data.focusChallenge;if(!fc||fc.failed) return;
  const start=new Date(fc.start+"T12:00:00");
  const today=new Date();
  const daysPassed=Math.floor((today-start)/(1000*60*60*24));
  // Check if any expense was made in the category since start
  const recentHist=(data.hist||[]).filter(h=>{
    const hd=new Date(h.date);
    return hd>=start&&(!h.type||h.type!=="income");
  });
  const broke=fc.cat==="all"?recentHist.length>0:recentHist.some(h=>h.group===fc.cat);
  fc.streak=daysPassed;
  if(broke&&daysPassed>0){fc.failed=true;flash("💔 Reto fallido... ¡Inténtalo de nuevo!","xp");}
  if(daysPassed>=fc.days&&!broke){
    data.xp=(data.xp||0)+fc.days;
    flash(`🏆 ¡RETO COMPLETADO! +${fc.days}XP`,"xp");
    setMoodTmp("celebrate",3000);
    data.focusChallenge=null;
  }
}

function renderFocusChallenge(){
  const el=$("dash-focus");if(!el) return;
  const fc=data.focusChallenge;

  if(!fc&&!showFocusForm){
    el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:13px;font-weight:700;color:#00BCD4">⚡ Reto "No Gastes"</span>
      <button onclick="showFocusForm=true;render()" style="background:linear-gradient(135deg,#00BCD4,#0097A7);border:none;color:#fff;padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">🎯 Iniciar Reto</button>
    </div>`;
    return;
  }

  if(showFocusForm&&!fc){
    let catOpts=`<option value="all">🚫 Todo (no gastar nada)</option>`;
    getEffectiveEG().forEach(g=>{catOpts+=`<option value="${g.id}">${g.icon} ${g.name}</option>`;});
    el.innerHTML=`<div style="font-size:13px;font-weight:700;color:#00BCD4;margin-bottom:10px">⚡ Nuevo Reto "No Gastes"</div>
    <div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:10px">
      <div style="font-size:11px;color:#555;margin-bottom:6px;font-weight:600">NO GASTAR EN:</div>
      <select id="focus-cat" style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#ddd;padding:8px;border-radius:8px;font-size:13px;font-family:'Inter',sans-serif;margin-bottom:8px">${catOpts}</select>
      <div style="font-size:11px;color:#555;margin-bottom:6px;font-weight:600">DURANTE:</div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        ${[3,7,14,30].map(d=>`<button onclick="document.getElementById('focus-days').value=${d}" style="flex:1;padding:7px;border-radius:7px;border:1px solid rgba(0,188,212,0.3);background:rgba(0,188,212,0.06);color:#00BCD4;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">${d}d</button>`).join("")}
      </div>
      <input id="focus-days" class="inp" type="number" value="7" min="1" max="90" style="font-size:13px;padding:8px;margin-bottom:8px;text-align:center"/>
      <div style="display:flex;gap:8px">
        <button onclick="startFocusChallenge()" style="flex:1;padding:9px;border-radius:8px;border:none;background:linear-gradient(135deg,#00BCD4,#0097A7);color:#fff;cursor:pointer;font-weight:700;font-size:13px;font-family:'Inter',sans-serif">⚡ ACTIVAR RETO</button>
        <button onclick="showFocusForm=false;render()" style="padding:9px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#555;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">✕</button>
      </div>
    </div>`;
    return;
  }

  if(fc){
    checkFocusChallenge();
    const start=new Date(fc.start+"T12:00:00");
    const today=new Date();
    const daysPassed=Math.floor((today-start)/(1000*60*60*24));
    const pct=Math.min(100,Math.round((daysPassed/fc.days)*100));
    const remaining=Math.max(0,fc.days-daysPassed);
    const dots=[];
    for(let i=0;i<fc.days;i++){dots.push(i<daysPassed);}

    el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:13px;font-weight:700;color:${fc.failed?"#E74C3C":"#00BCD4"}">⚡ Reto: No gastar en ${fc.catName}</span>
      <button onclick="data.focusChallenge=null;showFocusForm=false;schedSave();render()" style="background:none;border:none;color:#333;cursor:pointer;font-size:10px">✕</button>
    </div>
    ${fc.failed?`<div style="padding:10px;background:rgba(231,76,60,0.08);border-radius:10px;border:1px solid rgba(231,76,60,0.2);text-align:center;margin-bottom:8px">
      <div style="font-size:20px;margin-bottom:4px">💔</div>
      <div style="font-size:12px;color:#E74C3C;font-weight:700">Reto fallido en el día ${daysPassed}</div>
      <button onclick="data.focusChallenge=null;showFocusForm=true;schedSave();render()" style="margin-top:8px;padding:6px 16px;border-radius:7px;border:none;background:#E74C3C;color:#fff;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">🔄 Reintentar</button>
    </div>`:`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:28px;font-weight:800;color:#00BCD4">${daysPassed}<span style="font-size:12px;color:#555">/${fc.days} días</span></span>
      <span style="font-size:12px;color:#F1C40F;font-weight:700">${remaining>0?`Faltan ${remaining}`:"🏆 Completado"}</span>
    </div>
    <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;margin-bottom:8px">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#00BCD4,#26C6DA);transition:0.4s"></div>
    </div>
    <div style="display:flex;gap:2px;flex-wrap:wrap">${dots.map((done,i)=>`<div style="width:${Math.min(16,Math.floor(280/fc.days))}px;height:10px;border-radius:2px;background:${done?"rgba(0,188,212,0.5)":"rgba(255,255,255,0.04)"}"></div>`).join("")}</div>`}`;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── 6. RPG DAILY QUOTE ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function renderDailyQuote(){
  const el=$("dash-quote");if(!el) return;
  // Deterministic quote based on day
  const today=new Date();
  const dayOfYear=Math.floor((today-new Date(today.getFullYear(),0,0))/(1000*60*60*24));
  const q=RPG_QUOTES[dayOfYear%RPG_QUOTES.length];
  el.innerHTML=`<div style="display:flex;align-items:center;gap:12px">
    <span style="font-size:24px;flex-shrink:0">${q.icon}</span>
    <div style="font-size:12px;color:#aaa;font-style:italic;line-height:1.5">"${q.text}"</div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  $("loading").style.display = "none";
  notifEnabled=localStorage.getItem("lc-notif")==="1";
  // Check for saved player code
  const savedCode = localStorage.getItem("lc-player-code");
  if (savedCode) {
    playerCode = savedCode;
    $("login-screen").style.display = "none";
    startApp();
  } else {
    $("login-screen").style.display = "flex";
  }
  // Notification check every 60s
  setInterval(checkNotifications,60000);
});

