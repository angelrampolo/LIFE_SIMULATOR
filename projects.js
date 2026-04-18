// ══════════════════════════════════════════════════════════════════════════════
// LifeControl RPG — Módulo de Proyectos v3 (PIM-Driven + 9 Mejoras)
// Técnicas PIM: Quick Capture, Next Actions, Weekly Review, Progressive Disclosure
// Mejoras: Subtareas, Duplicar/Archivar, Urgencia visual, Touch DnD, Auto-color
// ══════════════════════════════════════════════════════════════════════════════

// ── Estado local del módulo ──────────────────────────────────────────────────
let pjView = "panel";          // panel | detail | weeklyReview
let pjDetailTab = "overview";  // overview | kanban | milestones | notes | budget
let pjCurrentId = null;
let pjFilterStatus = "all";
let pjFilterPriority = "all";
let pjFilterArea = "all";
let pjSearch = "";
let pjShowFilters = false;
let pjTimelineZoom = "month";
let pjListSort = "priority";
let pjDragId = null;
let pjDragKind = null;
let pjQuickName = "";
let pjTouchDragEl = null;      // Mejora #8: Touch DnD state
let pjTouchClone = null;

// ── Area color map (Mejora #9) ───────────────────────────────────────────────
const PJ_AREA_COLORS = { str: "#E74C3C", int: "#3498DB", vit: "#2ECC71", luk: "#F39C12", cha: "#9B59B6" };

// ── Utils ────────────────────────────────────────────────────────────────────
function pjNewId(prefix) { return (prefix || "p") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function pjToday() { return new Date().toISOString().slice(0, 10); }
function pjAddDays(iso, n) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function pjDaysBetween(a, b) {
  if (!a || !b) return 0;
  const d1 = new Date(a + "T00:00:00Z"), d2 = new Date(b + "T00:00:00Z");
  return Math.round((d2 - d1) / 86400000);
}
function pjEscape(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function pjFmt(n) { return "$" + (n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function pjGet(id) { return (data.projects || []).find(p => p.id === id); }
function pjTasks(pid) { return (data.todos || []).filter(t => t.projectId === pid); }

function pjCalcProgress(p) {
  const ts = pjTasks(p.id);
  const ms = p.milestones || [];
  // Count subtask progress too
  let subDone = 0, subTotal = 0;
  ts.forEach(t => { (t.subtasks || []).forEach(s => { subTotal++; if (s.done) subDone++; }); });
  const totalItems = ts.length + ms.length + subTotal;
  if (totalItems === 0) return 0;
  const done = ts.filter(t => t.done).length + ms.filter(m => m.done).length + subDone;
  return Math.round((done / totalItems) * 100);
}

function pjNextMilestone(p) {
  const pend = (p.milestones || []).filter(m => !m.done && m.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return pend[0] || (p.milestones || []).find(m => !m.done) || null;
}

function pjNextAction(pid) {
  const tasks = pjTasks(pid).filter(t => !t.done);
  if (tasks.length === 0) return null;
  const colOrder = { "todo": 0, "doing": 1, "backlog": 2, "review": 3, "writing": 4 };
  tasks.sort((a, b) => {
    const ca = colOrder[a.columnId] ?? 99; const cb = colOrder[b.columnId] ?? 99;
    if (ca !== cb) return ca - cb;
    return (a.date || "").localeCompare(b.date || "");
  });
  return tasks[0];
}

function pjSpent(p) {
  return (data.hist || []).filter(h => h.projectId === p.id && h.type !== "income").reduce((a, h) => a + (h.amount || 0), 0);
}

function pjIsAtRisk(p) {
  if (!p.dueDate || p.status === "done" || p.status === "archived") return false;
  return p.dueDate < pjToday();
}

function pjDaysRemaining(p) {
  if (!p.dueDate) return null;
  return pjDaysBetween(pjToday(), p.dueDate);
}

// ── Mejora #4: Urgency color gradient ────────────────────────────────────────
function pjUrgencyColor(daysLeft) {
  if (daysLeft == null) return "#666";
  if (daysLeft < 0) return "#E74C3C";   // overdue — red
  if (daysLeft <= 3) return "#E74C3C";   // critical — red
  if (daysLeft <= 7) return "#F39C12";   // urgent — orange
  if (daysLeft <= 15) return "#F1C40F";  // soon — yellow
  return "#2ECC71";                       // safe — green
}

function pjUrgencyLabel(daysLeft) {
  if (daysLeft == null) return "";
  if (daysLeft < 0) return `⚠️ ${Math.abs(daysLeft)}d atraso`;
  if (daysLeft === 0) return "🔥 ¡HOY!";
  if (daysLeft <= 3) return `🔥 ${daysLeft}d`;
  if (daysLeft <= 7) return `⏰ ${daysLeft}d`;
  return `📅 ${daysLeft}d`;
}

// ── SVG Progress Ring ────────────────────────────────────────────────────────
function pjRingSVG(pct, color, size, strokeW) {
  size = size || 44; strokeW = strokeW || 3;
  const r = (size - strokeW) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  // Mejora #7: CSS transition on ring fill for smooth animation
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg);flex-shrink:0">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" class="pj-ring-bg" stroke-width="${strokeW}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" class="pj-ring-fill" stroke="${color}" stroke-width="${strokeW}"
      stroke-dasharray="${c}" stroke-dashoffset="${offset}"
      style="--ring-circumference:${c};--ring-offset:${offset};transition:stroke-dashoffset 0.8s ease-out"/>
    <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central"
      fill="${color}" font-size="${size < 40 ? 9 : 11}" font-weight="800"
      font-family="'Inter',sans-serif" style="transform:rotate(90deg);transform-origin:center">${pct}%</text>
  </svg>`;
}

// ── Mejora #9: Auto-color based on area ──────────────────────────────────────
function pjAutoColor(area) { return PJ_AREA_COLORS[area] || "#FFD700"; }

// ══════════════════════════════════════════════════════════════════════════════
// CRUD — Create, Update, Delete, Complete, Duplicate, Archive
// ══════════════════════════════════════════════════════════════════════════════
function pjCreate(fromTemplate) {
  const t = fromTemplate || {};
  const now = Date.now();
  const area = t.area || "int";
  const color = t.color || pjAutoColor(area); // Mejora #9
  const cols = (t.columns && t.columns.length) ? t.columns.map(c => ({ ...c })) : DEFAULT_KANBAN_COLUMNS.map(c => ({ ...c }));
  const startDate = pjToday();
  const dueDate = pjAddDays(startDate, 30);

  // Mejora #5: Auto-distribute milestone dates proportionally
  const milestones = (t.milestones || []).map((m, i, arr) => {
    const totalDays = 30;
    const interval = Math.round(totalDays / (arr.length + 1));
    const autoDate = pjAddDays(startDate, interval * (i + 1));
    return {
      id: pjNewId("ms"), name: m.name, xpReward: m.xpReward || 15,
      done: false, dueDate: m.dueDate || autoDate, completedAt: null
    };
  });

  const p = {
    id: pjNewId("proj"), name: t.name || "Nuevo proyecto", icon: t.icon || "🎯",
    color, area, description: t.description || "",
    status: "planning", priority: "med",
    startDate, dueDate,
    tags: [], milestones, budget: null, expenseIds: [], notes: "",
    kanbanColumns: cols, createdAt: now, updatedAt: now,
    completedAt: null, xpAwarded: 0
  };
  if (!data.projects) data.projects = [];
  data.projects.push(p);

  // Create tasks from template
  (t.tasks || []).forEach(tk => {
    const diff = TD.find(x => x.id === tk.diff) || TD[0];
    data.todos = [...(data.todos || []), {
      id: pjNewId("td"), text: tk.text, diff: diff.id, area: p.area, xp: diff.xp,
      done: false, date: pjToday(),
      projectId: p.id, columnId: tk.col || (cols[0] && cols[0].id) || "todo",
      subtasks: [] // Mejora #2: subtask support
    }];
  });
  schedSave();
  return p;
}

function pjUpdate(id, patch) {
  const p = pjGet(id); if (!p) return;
  Object.assign(p, patch, { updatedAt: Date.now() });
  schedSave();
}

function pjDelete(id) {
  if (!confirm("¿Eliminar este proyecto? Las tareas vinculadas perderán su enlace.")) return;
  data.projects = (data.projects || []).filter(p => p.id !== id);
  (data.todos || []).forEach(t => { if (t.projectId === id) { delete t.projectId; delete t.columnId; } });
  if (pjCurrentId === id) { pjCurrentId = null; pjView = "panel"; }
  flash("🗑️ Proyecto eliminado", "success");
  schedSave(); render();
}

function pjComplete(id) {
  const p = pjGet(id); if (!p || p.status === "done") return;
  const ts = pjTasks(id);
  const diffs = ts.filter(t => t.done).map(t => { const d = TD.find(x => x.id === t.diff) || TD[0]; return d.xp; });
  const avg = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 5;
  const bonus = Math.round(50 + avg * 2);
  data.xp = (data.xp || 0) + bonus;
  data.stats[p.area] = (data.stats[p.area] || 0) + bonus;
  p.status = "done"; p.completedAt = Date.now(); p.xpAwarded = (p.xpAwarded || 0) + bonus;
  flash(`🏆 Proyecto completado! +${bonus}XP épico`, "xp");
  setMoodTmp("celebrate", 3500); showParticles();
  schedSave(); render();
}

// ── Mejora #3: Duplicate project ─────────────────────────────────────────────
function pjDuplicate(id) {
  const p = pjGet(id); if (!p) return;
  const now = Date.now();
  const clone = JSON.parse(JSON.stringify(p));
  clone.id = pjNewId("proj");
  clone.name = p.name + " (copia)";
  clone.status = "planning";
  clone.startDate = pjToday();
  clone.dueDate = pjAddDays(pjToday(), pjDaysBetween(p.startDate || pjToday(), p.dueDate || pjAddDays(pjToday(), 30)));
  clone.createdAt = now; clone.updatedAt = now;
  clone.completedAt = null; clone.xpAwarded = 0;
  // Reset milestones
  (clone.milestones || []).forEach(m => { m.id = pjNewId("ms"); m.done = false; m.completedAt = null; });
  if (!data.projects) data.projects = [];
  data.projects.push(clone);
  // Duplicate tasks
  const origTasks = pjTasks(id);
  origTasks.forEach(t => {
    const nt = JSON.parse(JSON.stringify(t));
    nt.id = pjNewId("td"); nt.projectId = clone.id; nt.done = false;
    (nt.subtasks || []).forEach(s => { s.id = pjNewId("st"); s.done = false; });
    data.todos = [...(data.todos || []), nt];
  });
  flash(`📋 "${p.name}" duplicado`, "success");
  schedSave(); render();
}

// ── Mejora #3: Archive project ───────────────────────────────────────────────
function pjArchive(id) {
  const p = pjGet(id); if (!p) return;
  if (p.status === "archived") {
    p.status = "planning"; p.updatedAt = Date.now();
    flash(`📂 "${p.name}" desarchivado`, "success");
  } else {
    p.status = "archived"; p.updatedAt = Date.now();
    flash(`📦 "${p.name}" archivado`, "success");
  }
  schedSave(); render();
}

// ── Milestones ───────────────────────────────────────────────────────────────
function pjToggleMilestone(pid, mid) {
  const p = pjGet(pid); if (!p) return;
  const m = (p.milestones || []).find(x => x.id === mid); if (!m) return;
  if (!m.done) {
    m.done = true; m.completedAt = Date.now();
    const xp = m.xpReward || 15;
    data.xp = (data.xp || 0) + xp;
    data.stats[p.area] = (data.stats[p.area] || 0) + xp;
    p.xpAwarded = (p.xpAwarded || 0) + xp;
    flash(`🏆 Hito: ${m.name} (+${xp}XP)`, "xp");
    setMoodTmp("celebrate", 2500);
  } else {
    m.done = false; m.completedAt = null;
    const xp = m.xpReward || 15;
    data.xp = Math.max(0, (data.xp || 0) - xp);
    data.stats[p.area] = Math.max(0, (data.stats[p.area] || 0) - xp);
    p.xpAwarded = Math.max(0, (p.xpAwarded || 0) - xp);
  }
  p.updatedAt = Date.now();
  schedSave(); checkQuests(); render();
}

function pjAddMilestone(pid) {
  const name = (document.getElementById("pj-ms-name") || {}).value || "";
  const due = (document.getElementById("pj-ms-due") || {}).value || "";
  const xp = parseInt((document.getElementById("pj-ms-xp") || {}).value || "15", 10) || 15;
  if (!name.trim()) { flash("Pon un nombre al hito", "error"); return; }
  const p = pjGet(pid); if (!p) return;
  p.milestones = p.milestones || [];
  p.milestones.push({ id: pjNewId("ms"), name: name.trim(), xpReward: xp, dueDate: due || "", done: false, completedAt: null });
  p.updatedAt = Date.now();
  document.getElementById("pj-ms-name").value = "";
  document.getElementById("pj-ms-due").value = "";
  document.getElementById("pj-ms-xp").value = "15";
  schedSave(); render();
}

function pjDeleteMilestone(pid, mid) {
  const p = pjGet(pid); if (!p) return;
  p.milestones = (p.milestones || []).filter(m => m.id !== mid);
  p.updatedAt = Date.now();
  schedSave(); render();
}

// ── Mejora #2: Subtasks ──────────────────────────────────────────────────────
function pjAddSubtask(tid) {
  const input = document.getElementById("pj-sub-" + tid);
  const text = (input ? input.value : "").trim();
  if (!text) return;
  const t = (data.todos || []).find(x => x.id === tid); if (!t) return;
  if (!t.subtasks) t.subtasks = [];
  t.subtasks.push({ id: pjNewId("st"), text, done: false });
  if (input) input.value = "";
  if (t.projectId) { const p = pjGet(t.projectId); if (p) p.updatedAt = Date.now(); }
  schedSave(); render();
}

function pjToggleSubtask(tid, sid) {
  const t = (data.todos || []).find(x => x.id === tid); if (!t) return;
  const s = (t.subtasks || []).find(x => x.id === sid); if (!s) return;
  s.done = !s.done;
  if (t.projectId) { const p = pjGet(t.projectId); if (p) p.updatedAt = Date.now(); }
  schedSave(); render();
}

function pjDeleteSubtask(tid, sid) {
  const t = (data.todos || []).find(x => x.id === tid); if (!t) return;
  t.subtasks = (t.subtasks || []).filter(s => s.id !== sid);
  if (t.projectId) { const p = pjGet(t.projectId); if (p) p.updatedAt = Date.now(); }
  schedSave(); render();
}

// ── Tasks ────────────────────────────────────────────────────────────────────
function pjAddTask(pid) {
  const p = pjGet(pid); if (!p) return;
  const txt = (document.getElementById("pj-task-text") || {}).value || "";
  const diff = (document.getElementById("pj-task-diff") || {}).value || "easy";
  const col = (document.getElementById("pj-task-col") || {}).value || (p.kanbanColumns[0] && p.kanbanColumns[0].id) || "todo";
  const date = (document.getElementById("pj-task-date") || {}).value || pjToday();
  if (!txt.trim()) { flash("Pon un nombre a la tarea", "error"); return; }
  const d = TD.find(x => x.id === diff) || TD[0];
  data.todos = [...(data.todos || []), {
    id: pjNewId("td"), text: txt.trim(), diff: d.id, area: p.area, xp: d.xp,
    done: col === "done", date, projectId: pid, columnId: col, subtasks: []
  }];
  document.getElementById("pj-task-text").value = "";
  schedSave(); render();
}

// Mejora #1: Quick add task from card
function pjQuickAddTask(pid) {
  const input = document.getElementById("pj-qat-" + pid);
  const txt = (input ? input.value : "").trim();
  if (!txt) return;
  const p = pjGet(pid); if (!p) return;
  const col = (p.kanbanColumns[0] && p.kanbanColumns[0].id) || "todo";
  data.todos = [...(data.todos || []), {
    id: pjNewId("td"), text: txt, diff: "easy", area: p.area, xp: 2,
    done: false, date: pjToday(), projectId: pid, columnId: col, subtasks: []
  }];
  if (input) input.value = "";
  flash("✅ Tarea añadida", "success");
  schedSave(); render();
}

function pjMoveTask(tid, newCol) {
  const t = (data.todos || []).find(x => x.id === tid); if (!t) return;
  const p = pjGet(t.projectId); if (!p) return;
  const prevCol = t.columnId;
  t.columnId = newCol;
  const doneColIds = (p.kanbanColumns || []).filter(c => c.id === "done" || c.n.toLowerCase().includes("hecho") || c.n.toLowerCase().includes("listo")).map(c => c.id);
  const wasDone = !!t.done;
  if (doneColIds.includes(newCol) && !wasDone) {
    t.done = true; data.xp = (data.xp || 0) + t.xp;
    data.stats[t.area] = (data.stats[t.area] || 0) + t.xp;
    flash(`✅ +${t.xp}XP`, "xp"); setMoodTmp("celebrate", 2000);
  } else if (!doneColIds.includes(newCol) && wasDone && doneColIds.includes(prevCol)) {
    t.done = false; data.xp = Math.max(0, (data.xp || 0) - t.xp);
    data.stats[t.area] = Math.max(0, (data.stats[t.area] || 0) - t.xp);
  }
  p.updatedAt = Date.now();
  schedSave(); checkQuests(); render();
}

function pjDeleteProjectTask(tid) { data.todos = (data.todos || []).filter(t => t.id !== tid); schedSave(); render(); }

// ── DnD (desktop) ────────────────────────────────────────────────────────────
function pjDragStart(ev, tid) { pjDragId = tid; pjDragKind = "task"; ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", tid); } catch(e){} }
function pjDragOver(ev) { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; }
function pjDropOnCol(ev, colId) { ev.preventDefault(); if (pjDragKind !== "task" || !pjDragId) return; pjMoveTask(pjDragId, colId); pjDragId = null; pjDragKind = null; }

// ── Mejora #8: Touch DnD for mobile (LONG-PRESS to drag) ─────────────────────
// Uses a 400ms long-press to start drag. Normal taps pass through to subtask
// inputs, checkboxes, and delete buttons without interference.
let pjTouchTimer = null;
let pjTouchStartX = 0;
let pjTouchStartY = 0;
const PJ_TOUCH_THRESHOLD = 10; // px - movement before cancelling long-press

function pjTouchStart(ev, tid) {
  // Don't intercept touches on inputs, buttons, selects
  const tag = (ev.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "button" || tag === "select" || tag === "textarea") return;

  const touch = ev.touches[0]; if (!touch) return;
  pjTouchStartX = touch.clientX;
  pjTouchStartY = touch.clientY;

  // Start a long-press timer — only start drag after 400ms hold
  clearTimeout(pjTouchTimer);
  pjTouchTimer = setTimeout(() => {
    pjDragId = tid; pjDragKind = "task";
    const el = ev.currentTarget;
    if (!el || !document.body.contains(el)) return;
    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(30);
    // Create clone for visual feedback
    pjTouchClone = el.cloneNode(true);
    pjTouchClone.style.cssText = `position:fixed;z-index:9999;opacity:0.85;transform:scale(1.05) rotate(2deg);pointer-events:none;width:${el.offsetWidth}px;left:${pjTouchStartX - el.offsetWidth/2}px;top:${pjTouchStartY - 30}px;box-shadow:0 12px 40px rgba(0,0,0,0.7);border-radius:8px;transition:none`;
    document.body.appendChild(pjTouchClone);
    el.style.opacity = "0.3";
    pjTouchDragEl = el;
  }, 400);
}

function pjTouchMove(ev) {
  const touch = ev.touches[0]; if (!touch) return;

  // If we haven't started dragging yet, check if we moved too far (cancel long-press)
  if (!pjTouchClone && pjTouchTimer) {
    const dx = Math.abs(touch.clientX - pjTouchStartX);
    const dy = Math.abs(touch.clientY - pjTouchStartY);
    if (dx > PJ_TOUCH_THRESHOLD || dy > PJ_TOUCH_THRESHOLD) {
      clearTimeout(pjTouchTimer);
      pjTouchTimer = null;
      // Allow normal scroll
      return;
    }
  }

  // If dragging, move the clone
  if (!pjTouchClone) return;
  ev.preventDefault(); // Only prevent default WHEN actually dragging
  pjTouchClone.style.left = (touch.clientX - pjTouchClone.offsetWidth / 2) + "px";
  pjTouchClone.style.top = (touch.clientY - 30) + "px";
  // Highlight drop target
  document.querySelectorAll("[data-pj-col]").forEach(col => {
    const r = col.getBoundingClientRect();
    if (touch.clientX >= r.left && touch.clientX <= r.right && touch.clientY >= r.top && touch.clientY <= r.bottom) {
      col.style.background = "rgba(255,215,0,0.12)";
      col.style.borderColor = "rgba(255,215,0,0.35)";
    } else {
      col.style.background = ""; col.style.borderColor = "";
    }
  });
}

function pjTouchEnd(ev) {
  // Cancel long-press timer if still pending
  clearTimeout(pjTouchTimer); pjTouchTimer = null;

  if (pjTouchClone) { pjTouchClone.remove(); pjTouchClone = null; }
  if (pjTouchDragEl) { pjTouchDragEl.style.opacity = "1"; pjTouchDragEl = null; }
  if (!pjDragId) return;

  const touch = ev.changedTouches[0]; if (!touch) { pjDragId = null; return; }
  // Find which column we dropped on
  let dropped = false;
  document.querySelectorAll("[data-pj-col]").forEach(col => {
    const r = col.getBoundingClientRect();
    if (touch.clientX >= r.left && touch.clientX <= r.right && touch.clientY >= r.top && touch.clientY <= r.bottom) {
      pjMoveTask(pjDragId, col.dataset.pjCol);
      dropped = true;
    }
    col.style.background = ""; col.style.borderColor = "";
  });
  pjDragId = null; pjDragKind = null;
}

// ── Quick Capture ────────────────────────────────────────────────────────────
function pjQuickCreate() {
  const input = document.getElementById("pj-quick-input");
  const name = (input ? input.value : "").trim();
  if (!name) { flash("Escribe un nombre para el proyecto", "error"); return; }
  const p = pjCreate({ name, icon: "🎯", area: "int" }); // Mejora #9: color auto-assigned by area
  if (input) input.value = ""; pjQuickName = "";
  pjCurrentId = p.id; pjView = "detail"; pjDetailTab = "overview";
  flash(`✨ "${p.name}" creado — ¡personalízalo!`, "success");
  render();
}

function pjToggleFilters() {
  pjShowFilters = !pjShowFilters;
  const drawer = document.getElementById("pj-filters-drawer");
  const btn = document.getElementById("pj-filter-btn");
  if (drawer) drawer.classList.toggle("open", pjShowFilters);
  if (btn) btn.classList.toggle("active", pjShowFilters);
}

function pjHasActiveFilters() { return pjFilterStatus !== "all" || pjFilterPriority !== "all" || pjFilterArea !== "all" || pjSearch.trim() !== ""; }

// Complete next action from overview
function pjCompleteNextAction(tid) {
  const t = (data.todos || []).find(x => x.id === tid); if (!t || t.done) return;
  t.done = true; t.columnId = "done";
  data.xp = (data.xp || 0) + t.xp;
  data.stats[t.area] = (data.stats[t.area] || 0) + t.xp;
  flash(`✅ +${t.xp}XP`, "xp"); setMoodTmp("celebrate", 2000);
  if (t.projectId) { const p = pjGet(t.projectId); if (p) p.updatedAt = Date.now(); }
  schedSave(); checkQuests(); render();
}

// ══════════════════════════════════════════════════════════════════════════════
// RENDER — Main entrypoint
// ══════════════════════════════════════════════════════════════════════════════
function renderProjects() {
  const root = document.getElementById("view-projects");
  if (!root) return;

  // Detail view
  if (pjView === "detail" && pjCurrentId && pjGet(pjCurrentId)) {
    root.innerHTML = pjRenderDetail(pjGet(pjCurrentId)); return;
  }
  // Mejora #6: Weekly Review
  if (pjView === "weeklyReview") { root.innerHTML = pjRenderWeeklyReview(); return; }

  const all = data.projects || [];

  // Empty State
  if (all.length === 0) { root.innerHTML = pjRenderEmptyState(); return; }

  // Main View
  let html = "";

  // Quick Capture Bar
  html += `<div class="pj-quick-capture" style="margin-bottom:12px">
    <span style="font-size:20px">⚡</span>
    <input id="pj-quick-input" class="inp" placeholder="Nuevo proyecto rápido..." value="${pjEscape(pjQuickName)}"
      oninput="pjQuickName=this.value" onkeydown="if(event.key==='Enter')pjQuickCreate()"
      style="flex:1;background:transparent;border:none;padding:8px 0;font-size:14px;color:#eee"/>
    <button onclick="pjQuickCreate()" style="background:linear-gradient(135deg,#FFD700,#F39C12);border:none;color:#000;padding:8px 16px;border-radius:10px;font-weight:800;cursor:pointer;font-size:12px;font-family:'Inter',sans-serif;white-space:nowrap">+ Crear</button>
    <button onclick="pjOpenTemplates()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#aaa;padding:8px 12px;border-radius:10px;cursor:pointer;font-size:12px;font-family:'Inter',sans-serif;white-space:nowrap" title="Plantillas">✨</button>
  </div>`;

  // Stats + Filters + Weekly Review button
  const activos = all.filter(p => p.status === "active" || p.status === "planning").length;
  const completados = all.filter(p => p.status === "done").length;
  const enRiesgo = all.filter(p => pjIsAtRisk(p)).length;
  const filterActive = pjHasActiveFilters();

  html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
    <span class="pj-stat-pill" style="color:#3498DB;border-color:rgba(52,152,219,0.3);background:rgba(52,152,219,0.08)">🚀 ${activos} activos</span>
    <span class="pj-stat-pill" style="color:#2ECC71;border-color:rgba(46,204,113,0.3);background:rgba(46,204,113,0.08)">✅ ${completados}</span>
    ${enRiesgo ? `<span class="pj-stat-pill" style="color:#E74C3C;border-color:rgba(231,76,60,0.3);background:rgba(231,76,60,0.08);animation:pjPulseGlow 2s infinite">⚠️ ${enRiesgo} atraso</span>` : ""}
    <button id="pj-filter-btn" class="pj-filter-toggle ${filterActive ? 'active' : ''}" onclick="pjToggleFilters()">🔍 Filtros ${filterActive ? '<span style="background:#FFD700;color:#000;padding:1px 5px;border-radius:8px;font-size:9px">ON</span>' : ""}</button>
    <button onclick="pjView='weeklyReview';render()" class="pj-filter-toggle" style="margin-left:auto" title="Revisión semanal">📋 Revisión</button>
  </div>`;

  // Collapsible Filters
  html += `<div id="pj-filters-drawer" class="pj-filters-drawer ${pjShowFilters ? 'open' : ''}">
    <div class="card" style="padding:12px 14px;margin-bottom:12px;border-color:rgba(255,215,0,0.12)">
      <input id="pj-search" class="inp" placeholder="🔍 Buscar..." value="${pjEscape(pjSearch)}" oninput="pjSearch=this.value;pjRefreshList()" style="margin-bottom:10px;font-size:13px"/>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
        <span style="font-size:10px;color:#555;font-weight:700;width:100%;margin-bottom:2px">ESTADO</span>
        ${pjFilterPill("status","all","Todos","#aaa")}
        ${PROJECT_STATUS.map(s => pjFilterPill("status", s.id, s.icon+" "+s.n, s.c)).join("")}
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
        <span style="font-size:10px;color:#555;font-weight:700;width:100%;margin-bottom:2px">PRIORIDAD</span>
        ${pjFilterPill("priority","all","Todas","#aaa")}
        ${PROJECT_PRIORITY.map(p => pjFilterPill("priority", p.id, p.icon+" "+p.n, p.c)).join("")}
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <span style="font-size:10px;color:#555;font-weight:700;width:100%;margin-bottom:2px">ÁREA</span>
        ${pjFilterPill("area","all","📋 Todas","#aaa")}
        ${AREAS.map(a => pjFilterPill("area", a.id, a.icon+" "+a.n, a.c)).join("")}
      </div>
    </div>
  </div>`;

  // Next Actions
  html += pjRenderNextActions();

  // Project Cards
  html += `<div id="pj-panel-list">${pjRenderPanelList()}</div>`;

  root.innerHTML = html;
}

function pjSetView(v) { pjView = v; render(); }

function pjFilterPill(type, id, lbl, c) {
  const currentVal = type === "status" ? pjFilterStatus : type === "priority" ? pjFilterPriority : pjFilterArea;
  const on = currentVal === id;
  const handler = type === "status" ? "pjFilterStatus" : type === "priority" ? "pjFilterPriority" : "pjFilterArea";
  return `<button onclick="${handler}='${id}';pjRefreshList()" class="pill" style="cursor:pointer;padding:4px 10px;font-size:10px;color:${on ? c : "#555"};border-color:${on ? c+"50" : "rgba(255,255,255,0.06)"};background:${on ? c+"18" : "rgba(0,0,0,0.15)"};font-weight:700">${pjEscape(lbl)}</button>`;
}

function pjFilteredProjects() {
  let list = (data.projects || []).slice();
  if (pjFilterStatus !== "all") list = list.filter(p => p.status === pjFilterStatus);
  if (pjFilterPriority !== "all") list = list.filter(p => p.priority === pjFilterPriority);
  if (pjFilterArea !== "all") list = list.filter(p => p.area === pjFilterArea);
  if (pjSearch.trim()) {
    const q = pjSearch.trim().toLowerCase();
    list = list.filter(p => (p.name||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q) || (p.tags||[]).some(t => (t||"").toLowerCase().includes(q)));
  }
  const prioRank = { critical:0, high:1, med:2, low:3 };
  const statusRank = { active:0, planning:1, paused:2, done:3, archived:4 };
  list.sort((a, b) => {
    const sr = (statusRank[a.status]||9) - (statusRank[b.status]||9);
    return sr !== 0 ? sr : (prioRank[a.priority]||9) - (prioRank[b.priority]||9);
  });
  return list;
}

// ── Empty State ──────────────────────────────────────────────────────────────
function pjRenderEmptyState() {
  return `<div class="card" style="text-align:center;padding:40px 24px;border-color:rgba(255,215,0,0.15)">
    <div class="pj-empty-icon">🎯</div>
    <div style="font-size:18px;font-weight:800;color:#FFD700;margin:16px 0 8px">Organiza tus ideas</div>
    <div style="font-size:13px;color:#888;line-height:1.6;max-width:300px;margin:0 auto 24px">
      Los proyectos te ayudan a dividir grandes metas en pasos claros.<br/>
      Cada paso completado te da <b style="color:#FFD700">XP</b> y te acerca a la victoria.
    </div>
    <div class="pj-empty-shimmer" style="margin-bottom:16px">
      <div class="pj-quick-capture" style="background:rgba(16,20,34,0.98)">
        <span style="font-size:20px">⚡</span>
        <input id="pj-quick-input" class="inp" placeholder="¿Qué quieres lograr?" value=""
          onkeydown="if(event.key==='Enter'){pjQuickName=this.value;pjQuickCreate()}" oninput="pjQuickName=this.value"
          style="flex:1;background:transparent;border:none;padding:8px 0;font-size:14px;color:#eee"/>
        <button onclick="pjQuickName=document.getElementById('pj-quick-input').value;pjQuickCreate()" style="background:linear-gradient(135deg,#FFD700,#F39C12);border:none;color:#000;padding:10px 20px;border-radius:10px;font-weight:800;cursor:pointer;font-size:13px;font-family:'Inter',sans-serif">🚀 Crear</button>
      </div>
    </div>
    <div style="font-size:11px;color:#555;margin-bottom:16px">o elige una plantilla:</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
      ${PROJECT_TEMPLATES.slice(0,4).map(t => `<button onclick="pjCreateFromTemplate('${t.id}')" style="padding:10px 16px;border-radius:12px;border:1px solid ${t.color}35;background:${t.color}0c;cursor:pointer;display:flex;align-items:center;gap:6px;font-family:'Inter',sans-serif;transition:all 0.2s">
        <span style="font-size:20px">${t.icon}</span>
        <span style="color:#eee;font-weight:600;font-size:12px">${pjEscape(t.name)}</span>
      </button>`).join("")}
    </div>
  </div>`;
}

// ── Next Actions ─────────────────────────────────────────────────────────────
function pjRenderNextActions() {
  const activeProjects = (data.projects || []).filter(p => p.status === "active" || p.status === "planning");
  const actions = [];
  activeProjects.forEach(p => { const next = pjNextAction(p.id); if (next) actions.push({ project: p, task: next }); });
  if (actions.length === 0) return "";
  return `<div class="card" style="padding:12px 14px;margin-bottom:12px;border-color:rgba(255,165,0,0.18)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:13px;font-weight:700;color:#FF9800">⚡ Lo Siguiente</span>
      <span style="font-size:10px;color:#666">${actions.length} pendiente${actions.length > 1 ? "s" : ""}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${actions.slice(0, 5).map(a => {
        const df = TD.find(x => x.id === a.task.diff) || TD[0];
        const subs = (a.task.subtasks || []);
        const subDone = subs.filter(s => s.done).length;
        return `<div class="pj-next-action" onclick="pjOpen('${a.project.id}');pjDetailTab='kanban'">
          <div style="width:8px;height:30px;border-radius:4px;background:${a.project.color};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#eee;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pjEscape(a.task.text)}</div>
            <div style="font-size:10px;color:#666;margin-top:2px">${pjEscape(a.project.icon)} ${pjEscape(a.project.name)} · ${df.i} +${df.xp}XP${subs.length ? ` · ${subDone}/${subs.length} sub` : ""}</div>
          </div>
          <button onclick="event.stopPropagation();pjCompleteNextAction('${a.task.id}')" style="background:rgba(46,204,113,0.12);border:1px solid rgba(46,204,113,0.3);color:#2ECC71;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;flex-shrink:0;font-family:'Inter',sans-serif">✓</button>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

// ── Panel Cards ──────────────────────────────────────────────────────────────
function pjRenderPanelList() {
  const list = pjFilteredProjects();
  if (list.length === 0) return `<div class="card" style="text-align:center;padding:28px;color:#555"><div style="font-size:32px;margin-bottom:8px">🔍</div><div style="font-size:13px">Sin resultados.</div></div>`;
  return `<div style="display:flex;flex-direction:column;gap:10px">${list.map((p, i) => pjRenderCard(p, i)).join("")}</div>`;
}

function pjRefreshList() { const el = document.getElementById("pj-panel-list"); if (el) el.innerHTML = pjRenderPanelList(); }

function pjRenderCard(p, index) {
  const st = PROJECT_STATUS.find(s => s.id === p.status) || PROJECT_STATUS[0];
  const pr = PROJECT_PRIORITY.find(x => x.id === p.priority) || PROJECT_PRIORITY[1];
  const prog = pjCalcProgress(p);
  const dr = pjDaysRemaining(p);
  const ts = pjTasks(p.id);
  const tsDone = ts.filter(t => t.done).length;
  const nextAct = pjNextAction(p.id);
  const delay = (index || 0) * 0.06;
  const urgC = pjUrgencyColor(dr);     // Mejora #4
  const urgL = pjUrgencyLabel(dr);      // Mejora #4

  let html = `<div onclick="pjOpen('${p.id}')" class="card pj-card" style="padding:14px;border-left:3px solid ${p.color};background:linear-gradient(135deg,rgba(16,20,34,0.98),${p.color}06);animation-delay:${delay}s">
    <div style="display:flex;gap:12px;align-items:center">
      ${pjRingSVG(prog, p.color, 48, 3.5)}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:18px;flex-shrink:0">${pjEscape(p.icon)}</span>
          <span style="font-weight:700;font-size:14px;color:#eee;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pjEscape(p.name)}</span>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
          <span class="pill" style="color:${st.c};border-color:${st.c}30;background:${st.c}10;font-size:9px;padding:2px 7px">${st.icon} ${st.n}</span>
          ${pr.id !== "med" ? `<span class="pill" style="color:${pr.c};border-color:${pr.c}30;background:${pr.c}10;font-size:9px;padding:2px 7px">${pr.icon}</span>` : ""}
          ${urgL ? `<span style="font-size:10px;color:${urgC};font-weight:700;${dr != null && dr <= 3 ? 'animation:pjPulseGlow 2s infinite;' : ''}">${urgL}</span>` : ""}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:10px;color:#666">${tsDone}/${ts.length}</div>
        <div style="font-size:9px;color:#444;margin-top:2px">tareas</div>
      </div>
    </div>`;

  // Next action preview
  if (nextAct) {
    html += `<div style="margin-top:10px;padding:7px 10px;background:rgba(255,165,0,0.05);border:1px solid rgba(255,165,0,0.1);border-radius:8px;display:flex;align-items:center;gap:6px">
      <span style="font-size:10px;color:#FF9800;font-weight:700;flex-shrink:0">⚡ Siguiente:</span>
      <span style="font-size:11px;color:#bbb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pjEscape(nextAct.text)}</span>
    </div>`;
  }

  // Mejora #1: Inline CTA for empty projects
  if (ts.length === 0 && p.status !== "done" && p.status !== "archived") {
    html += `<div onclick="event.stopPropagation()" style="margin-top:10px;display:flex;gap:6px;align-items:center">
      <input id="pj-qat-${p.id}" class="inp" placeholder="+ Añadir primera acción..." style="flex:1;padding:7px 10px;font-size:12px;border-color:${p.color}30"
        onkeydown="event.stopPropagation();if(event.key==='Enter')pjQuickAddTask('${p.id}')" onclick="event.stopPropagation()"/>
      <button onclick="event.stopPropagation();pjQuickAddTask('${p.id}')" style="background:${p.color}18;border:1px solid ${p.color}35;color:${p.color};padding:6px 10px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif;flex-shrink:0">➕</button>
    </div>`;
  }

  // Tags
  if ((p.tags || []).length > 0) {
    html += `<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">${(p.tags||[]).slice(0,4).map(t => `<span style="font-size:9px;color:#AB47BC;background:rgba(171,71,188,0.08);padding:2px 7px;border-radius:10px">#${pjEscape(t)}</span>`).join("")}</div>`;
  }

  html += `</div>`;
  return html;
}

function pjOpen(id) { pjCurrentId = id; pjView = "detail"; pjDetailTab = "overview"; render(); }
function pjBackToPanel() { pjCurrentId = null; pjView = "panel"; render(); }

// ══════════════════════════════════════════════════════════════════════════════
// DETAIL VIEW
// ══════════════════════════════════════════════════════════════════════════════
function pjRenderDetail(p) {
  const st = PROJECT_STATUS.find(s => s.id === p.status) || PROJECT_STATUS[0];
  const pr = PROJECT_PRIORITY.find(x => x.id === p.priority) || PROJECT_PRIORITY[1];
  const ar = AREAS.find(a => a.id === p.area) || AREAS[1];
  const prog = pjCalcProgress(p);
  const dr = pjDaysRemaining(p);
  const urgC = pjUrgencyColor(dr);

  let html = `<div class="card" style="padding:14px;border-left:4px solid ${p.color};background:linear-gradient(135deg,rgba(16,20,34,0.98),${p.color}08);margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <button onclick="pjBackToPanel()" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#888;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif">← Proyectos</button>
      <div style="display:flex;gap:5px">
        <button onclick="pjOpenEdit('${p.id}')" style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.25);color:#FFD700;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif" title="Editar">✏️</button>
        <button onclick="pjDuplicate('${p.id}')" style="background:rgba(52,152,219,0.08);border:1px solid rgba(52,152,219,0.25);color:#3498DB;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif" title="Duplicar">📋</button>
        <button onclick="pjArchive('${p.id}')" style="background:rgba(155,89,182,0.08);border:1px solid rgba(155,89,182,0.25);color:#9B59B6;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif" title="${p.status === 'archived' ? 'Desarchivar' : 'Archivar'}">${p.status === "archived" ? "📂" : "📦"}</button>
        ${p.status !== "done" ? `<button onclick="pjComplete('${p.id}')" style="background:linear-gradient(135deg,#2ECC71,#27AE60);border:none;color:#fff;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:800;font-family:'Inter',sans-serif" title="Completar">🏆</button>` : ""}
        <button onclick="pjDelete('${p.id}')" style="background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.25);color:#E74C3C;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif" title="Eliminar">🗑️</button>
      </div>
    </div>
    <div style="display:flex;gap:14px;align-items:center">
      ${pjRingSVG(prog, p.color, 60, 4)}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <span style="font-size:28px">${pjEscape(p.icon)}</span>
          <span style="font-weight:800;font-size:17px;color:#fff">${pjEscape(p.name)}</span>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <span class="pill" style="color:${st.c};border-color:${st.c}35;background:${st.c}12;font-size:9px;padding:2px 7px">${st.icon} ${st.n}</span>
          <span class="pill" style="color:${pr.c};border-color:${pr.c}35;background:${pr.c}12;font-size:9px;padding:2px 7px">${pr.icon} ${pr.n}</span>
          <span class="pill" style="color:${ar.c};border-color:${ar.c}35;background:${ar.c}12;font-size:9px;padding:2px 7px">${ar.icon} ${ar.n}</span>
        </div>
        <div style="font-size:10px;color:${urgC};margin-top:5px;font-weight:600">${p.startDate || "—"} → ${p.dueDate || "—"} ${pjUrgencyLabel(dr) ? " · " + pjUrgencyLabel(dr) : ""}</div>
      </div>
    </div>
    ${p.description ? `<div style="margin-top:10px;font-size:12px;color:#999;line-height:1.5;border-top:1px solid rgba(255,255,255,0.04);padding-top:10px">${pjEscape(p.description)}</div>` : ""}
  </div>`;

  // Tabs
  const tabs = [
    { id:"overview", lbl:"📊 Resumen" }, { id:"kanban", lbl:"🧭 Kanban" },
    { id:"milestones", lbl:"🏆 Hitos" }, { id:"notes", lbl:"📝 Notas" }, { id:"budget", lbl:"💰 Presupuesto" }
  ];
  html += `<div style="display:flex;gap:5px;margin-bottom:12px;overflow-x:auto;padding-bottom:4px">`;
  tabs.forEach(t => {
    const on = pjDetailTab === t.id;
    html += `<button onclick="pjDetailTab='${t.id}';renderProjects()" class="tab" style="color:${on ? "#FFD700" : "#555"};border-color:${on ? "#FFD700" : "rgba(255,255,255,0.07)"};background:${on ? "rgba(255,215,0,0.1)" : "rgba(0,0,0,0.25)"};white-space:nowrap">${t.lbl}</button>`;
  });
  html += `</div>`;

  if (pjDetailTab === "overview") html += pjRenderOverview(p);
  else if (pjDetailTab === "kanban") html += pjRenderKanban(p);
  else if (pjDetailTab === "milestones") html += pjRenderMilestonesTab(p);
  else if (pjDetailTab === "notes") html += pjRenderNotesTab(p);
  else if (pjDetailTab === "budget") html += pjRenderBudgetTab(p);
  return html;
}

// ── Overview ─────────────────────────────────────────────────────────────────
function pjRenderOverview(p) {
  const ts = pjTasks(p.id);
  const tsDone = ts.filter(t => t.done).length;
  const ms = p.milestones || [];
  const msDone = ms.filter(m => m.done).length;
  const dr = pjDaysRemaining(p);
  const risk = pjIsAtRisk(p);
  const urgC = pjUrgencyColor(dr);
  const spent = pjSpent(p);
  const budget = p.budget;

  let html = `<div class="card" style="padding:14px;margin-bottom:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="padding:12px;background:rgba(52,152,219,0.06);border:1px solid rgba(52,152,219,0.15);border-radius:12px;text-align:center">
        <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Tareas</div>
        <div class="rpg" style="font-size:16px;color:#3498DB;margin-top:6px">${tsDone}/${ts.length}</div>
      </div>
      <div style="padding:12px;background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.15);border-radius:12px;text-align:center">
        <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Hitos</div>
        <div class="rpg" style="font-size:16px;color:#FFD700;margin-top:6px">${msDone}/${ms.length}</div>
      </div>
      <div style="padding:12px;background:${urgC}0a;border:1px solid ${urgC}25;border-radius:12px;text-align:center">
        <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">Días</div>
        <div class="rpg" style="font-size:16px;color:${urgC};margin-top:6px">${pjUrgencyLabel(dr) || "—"}</div>
      </div>
      <div style="padding:12px;background:rgba(171,71,188,0.06);border:1px solid rgba(171,71,188,0.15);border-radius:12px;text-align:center">
        <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">XP ganado</div>
        <div class="rpg" style="font-size:16px;color:#AB47BC;margin-top:6px">${p.xpAwarded || 0}</div>
      </div>
    </div>
  </div>`;

  // Next Actions for this project
  const pendingTasks = ts.filter(t => !t.done).slice(0, 4);
  if (pendingTasks.length > 0) {
    html += `<div class="card" style="padding:14px;margin-bottom:12px;border-color:rgba(255,165,0,0.15)">
      <div style="font-weight:700;font-size:13px;color:#FF9800;margin-bottom:10px">⚡ Próximas Acciones</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${pendingTasks.map(t => {
          const df = TD.find(x => x.id === t.diff) || TD[0];
          const subs = t.subtasks || [];
          const subDone = subs.filter(s => s.done).length;
          return `<div class="pj-next-action" onclick="event.stopPropagation()">
            <div onclick="pjCompleteNextAction('${t.id}')" style="width:22px;height:22px;border-radius:6px;border:2px solid ${df.c}55;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s" onmouseover="this.style.borderColor='${df.c}';this.style.background='${df.c}18'" onmouseout="this.style.borderColor='${df.c}55';this.style.background='transparent'"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;color:#eee;font-weight:600">${pjEscape(t.text)}</div>
              <div style="font-size:10px;color:#666;margin-top:1px">${df.i} +${df.xp}XP${subs.length ? ` · 📎 ${subDone}/${subs.length}` : ""}</div>
            </div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }

  // Upcoming milestones
  const next = (ms || []).filter(m => !m.done).slice(0, 3);
  if (next.length) {
    html += `<div class="card" style="padding:14px;margin-bottom:12px;border-color:rgba(255,215,0,0.12)">
      <div style="font-weight:700;font-size:13px;color:#FFD700;margin-bottom:10px">🏆 Próximos hitos</div>
      ${next.map(m => {
        const mdr = m.dueDate ? pjDaysBetween(pjToday(), m.dueDate) : null;
        const mUrgC = pjUrgencyColor(mdr);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,215,0,0.04);border:1px solid rgba(255,215,0,0.1);border-radius:9px;margin-bottom:6px">
        <div class="pj-ms-dot" style="border-color:${m.done ? '#2ECC71' : '#FFD700'};background:${m.done ? 'rgba(46,204,113,0.2)' : 'transparent'}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:#eee;font-weight:600">${pjEscape(m.name)}</div>
          <div style="font-size:10px;color:${mUrgC}">${m.dueDate ? "📅 " + m.dueDate + (mdr != null ? " · " + pjUrgencyLabel(mdr) : "") : "Sin fecha"} · +${m.xpReward || 15}XP</div>
        </div>
        <button onclick="pjToggleMilestone('${p.id}','${m.id}')" style="background:linear-gradient(135deg,#FFD700,#F39C12);border:none;color:#000;padding:5px 10px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:800;font-family:'Inter',sans-serif">✓</button>
      </div>`;
      }).join("")}
    </div>`;
  }

  // Budget preview
  if (budget != null) {
    const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;
    const over = budget ? spent > budget : false;
    const c = over ? "#E74C3C" : pct > 70 ? "#F39C12" : "#2ECC71";
    html += `<div class="card" style="padding:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-weight:700;font-size:13px;color:#eee">💰 Presupuesto</span>
        <span class="rpg" style="font-size:12px;color:${c}">${pjFmt(spent)} / ${pjFmt(budget)}</span>
      </div>
      <div style="height:8px;background:rgba(0,0,0,0.35);border-radius:5px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${c},${c}aa);transition:width 0.6s"></div>
      </div>
    </div>`;
  }
  return html;
}

// ── Kanban (with touch DnD + subtasks) ───────────────────────────────────────
function pjRenderKanban(p) {
  const cols = p.kanbanColumns || DEFAULT_KANBAN_COLUMNS;
  const ts = pjTasks(p.id);

  let html = `<div class="card" style="padding:12px;margin-bottom:12px;border-color:${p.color}20">
    <div style="font-weight:700;font-size:13px;color:#eee;margin-bottom:10px">➕ Nueva tarea</div>
    <input id="pj-task-text" class="inp" placeholder="Nombre de la tarea..." style="margin-bottom:8px" onkeydown="if(event.key==='Enter')pjAddTask('${p.id}')"/>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <select id="pj-task-diff" class="inp" style="padding:9px">${TD.map(d => `<option value="${d.id}">${d.i} ${d.n} +${d.xp}XP</option>`).join("")}</select>
      <select id="pj-task-col" class="inp" style="padding:9px">${cols.map(c => `<option value="${c.id}">${pjEscape(c.n)}</option>`).join("")}</select>
    </div>
    <input type="date" id="pj-task-date" class="inp" value="${pjToday()}" style="margin-bottom:10px"/>
    <button onclick="pjAddTask('${p.id}')" style="width:100%;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,${p.color},${p.color}aa);color:#fff;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif">➕ Añadir tarea</button>
  </div>`;

  // Kanban columns with touch DnD (Mejora #8)
  html += `<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px" >`;
  cols.forEach(col => {
    const colTasks = ts.filter(t => (t.columnId || cols[0].id) === col.id);
    html += `<div data-pj-col="${col.id}" ondragover="pjDragOver(event)" ondrop="pjDropOnCol(event,'${col.id}')" style="min-width:200px;flex:1;max-width:260px;background:rgba(0,0,0,0.2);border-radius:12px;padding:10px;border:1px solid ${col.c}22;transition:background 0.2s,border-color 0.2s">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid ${col.c}30">
        <span style="font-weight:700;font-size:12px;color:${col.c}">${pjEscape(col.n)}</span>
        <span class="pill" style="font-size:10px;padding:2px 7px;color:${col.c};border-color:${col.c}30;background:${col.c}12">${colTasks.length}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;min-height:30px">
        ${colTasks.map(t => pjRenderKanbanCard(t, p)).join("") || `<div style="text-align:center;padding:14px;color:#333;font-size:11px">Vacío</div>`}
      </div>
    </div>`;
  });
  html += `</div>`;

  // Mobile quick mover
  html += `<div style="margin-top:12px">
    <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">📱 Mover tareas rápido</div>
    <div style="display:flex;flex-direction:column;gap:4px">
      ${ts.filter(t => !t.done).slice(0, 8).map(t => `<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(0,0,0,0.15);border-radius:8px">
        <span style="font-size:11px;color:#ccc;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pjEscape(t.text)}</span>
        <select onchange="pjMoveTask('${t.id}',this.value)" class="inp" style="width:auto;padding:4px 8px;font-size:10px;min-width:90px">
          ${cols.map(c => `<option value="${c.id}" ${t.columnId === c.id ? 'selected' : ''}>${pjEscape(c.n)}</option>`).join("")}
        </select>
      </div>`).join("")}
    </div>
  </div>`;
  return html;
}

// Mejora #2: Kanban card with subtasks
function pjRenderKanbanCard(t, p) {
  const df = TD.find(x => x.id === t.diff) || TD[0];
  const subs = t.subtasks || [];
  const subDone = subs.filter(s => s.done).length;

  let html = `<div draggable="true" ondragstart="pjDragStart(event,'${t.id}')"
    ontouchstart="pjTouchStart(event,'${t.id}')" ontouchend="pjTouchEnd(event)" ontouchmove="pjTouchMove(event)"
    style="padding:8px 10px;background:rgba(14,18,30,0.85);border-radius:8px;border:1px solid rgba(255,255,255,0.06);cursor:grab;transition:transform 0.15s;touch-action:pan-y" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
    <div style="font-size:12px;color:${t.done ? '#555' : '#eee'};text-decoration:${t.done ? 'line-through' : 'none'};margin-bottom:5px;line-height:1.3">${pjEscape(t.text)}</div>`;

  // Subtask progress bar (if any)
  if (subs.length > 0) {
    const pct = Math.round((subDone / subs.length) * 100);
    html += `<div style="margin-bottom:5px">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px">
        <span style="font-size:9px;color:#666">📎 ${subDone}/${subs.length} subtareas</span>
        <span style="font-size:9px;color:#666">${pct}%</span>
      </div>
      <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${df.c};border-radius:2px;transition:width 0.4s"></div>
      </div>`;
    // Show subtasks inline
    html += `<div style="margin-top:4px;display:flex;flex-direction:column;gap:2px">
      ${subs.map(s => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0">
        <div onclick="event.stopPropagation();pjToggleSubtask('${t.id}','${s.id}')" style="width:14px;height:14px;border-radius:4px;border:1.5px solid ${s.done ? '#2ECC71' : '#555'};background:${s.done ? 'rgba(46,204,113,0.2)' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:8px;color:#2ECC71">${s.done ? '✓' : ''}</div>
        <span style="font-size:10px;color:${s.done ? '#555' : '#bbb'};text-decoration:${s.done ? 'line-through' : 'none'};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pjEscape(s.text)}</span>
        <button onclick="event.stopPropagation();pjDeleteSubtask('${t.id}','${s.id}')" style="background:transparent;border:none;color:#333;cursor:pointer;font-size:9px;padding:0;flex-shrink:0">✕</button>
      </div>`).join("")}
    </div>`;
    html += `</div>`;
  }

  // Add subtask input
  html += `<div onclick="event.stopPropagation()" style="margin-top:4px;display:flex;gap:3px;align-items:center">
    <input id="pj-sub-${t.id}" class="inp" placeholder="+ subtarea" onclick="event.stopPropagation()" onkeydown="event.stopPropagation();if(event.key==='Enter')pjAddSubtask('${t.id}')" style="flex:1;padding:4px 6px;font-size:10px;border-color:rgba(255,255,255,0.06)"/>
    <button onclick="event.stopPropagation();pjAddSubtask('${t.id}')" style="background:transparent;border:1px solid rgba(255,255,255,0.08);color:#666;padding:3px 6px;border-radius:5px;cursor:pointer;font-size:9px;flex-shrink:0">+</button>
  </div>`;

  html += `<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:5px">
    <span class="pill" style="color:${df.c};border-color:${df.c}28;background:${df.c}12;font-size:9px;padding:2px 6px">${df.i} ${df.xp}XP</span>
    <button onclick="event.stopPropagation();pjDeleteProjectTask('${t.id}')" style="margin-left:auto;background:transparent;border:none;color:#3a3a4a;cursor:pointer;font-size:11px;padding:2px">🗑️</button>
  </div>
  </div>`;
  return html;
}

// ── Milestones ───────────────────────────────────────────────────────────────
function pjRenderMilestonesTab(p) {
  const ms = p.milestones || [];
  let html = `<div class="card" style="padding:14px;margin-bottom:12px;border-color:rgba(255,215,0,0.12)">
    <div style="font-weight:700;font-size:13px;color:#eee;margin-bottom:10px">➕ Nuevo hito</div>
    <input id="pj-ms-name" class="inp" placeholder="Nombre del hito..." style="margin-bottom:8px" onkeydown="if(event.key==='Enter')pjAddMilestone('${p.id}')"/>
    <div style="display:grid;grid-template-columns:1fr 90px;gap:8px;margin-bottom:10px">
      <input type="date" id="pj-ms-due" class="inp"/>
      <input type="number" id="pj-ms-xp" class="inp" value="15" min="0" placeholder="XP"/>
    </div>
    <button onclick="pjAddMilestone('${p.id}')" style="width:100%;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#FFD700,#F39C12);color:#000;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif">🏆 Añadir hito</button>
  </div>`;

  if (ms.length === 0) return html + `<div class="card" style="text-align:center;padding:22px;color:#555;font-size:12px">Sin hitos aún.</div>`;

  html += `<div class="card" style="padding:14px">
    <div style="position:relative;padding-left:24px">
      <div style="position:absolute;left:10px;top:6px;bottom:6px;width:2px;background:linear-gradient(to bottom,#FFD700,rgba(255,215,0,0.1));border-radius:2px"></div>
      ${ms.map((m, i) => {
        const mdr = m.dueDate ? pjDaysBetween(pjToday(), m.dueDate) : null;
        const mUrgC = pjUrgencyColor(mdr);
        return `<div style="position:relative;padding:10px 12px;margin-bottom:${i < ms.length-1 ? '12px' : '0'};background:${m.done ? "rgba(46,204,113,0.06)" : "rgba(0,0,0,0.15)"};border:1px solid ${m.done ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.05)"};border-radius:10px">
        <div onclick="pjToggleMilestone('${p.id}','${m.id}')" class="pj-ms-dot" style="position:absolute;left:-19px;top:14px;border-color:${m.done ? '#2ECC71' : '#FFD700'};background:${m.done ? '#2ECC71' : 'rgba(16,20,34,0.98)'};cursor:pointer"></div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;color:${m.done ? "#666" : "#eee"};text-decoration:${m.done ? "line-through" : "none"};font-weight:600">${pjEscape(m.name)}</div>
            <div style="font-size:10px;color:${m.done ? '#666' : mUrgC};margin-top:3px">${m.dueDate ? "📅 " + m.dueDate + (mdr != null ? " · " + pjUrgencyLabel(mdr) : "") : "Sin fecha"} · +${m.xpReward || 15}XP${m.completedAt ? " · ✅" : ""}</div>
          </div>
          <button onclick="pjDeleteMilestone('${p.id}','${m.id}')" style="background:transparent;border:none;color:#3a3a4a;cursor:pointer;font-size:12px;flex-shrink:0">🗑️</button>
        </div>
      </div>`;
      }).join("")}
    </div>
  </div>`;
  return html;
}

// ── Notes ────────────────────────────────────────────────────────────────────
function pjRenderNotesTab(p) {
  const notes = p.notes || "";
  return `<div class="card" style="padding:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-weight:700;font-size:13px;color:#eee">📝 Notas</span>
      <button onclick="pjSaveNotes('${p.id}')" style="background:linear-gradient(135deg,#FFD700,#F39C12);border:none;color:#000;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:800;font-family:'Inter',sans-serif">💾 Guardar</button>
    </div>
    <textarea id="pj-notes-ta" class="inp" rows="14" style="resize:vertical;font-family:'Inter',monospace;font-size:13px;line-height:1.5" placeholder="# Título&#10;**negrita** · *cursiva*">${pjEscape(notes)}</textarea>
    ${notes ? `<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">
      <div style="font-size:11px;color:#555;margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Vista previa</div>
      ${pjRenderMarkdown(notes)}
    </div>` : ""}
  </div>`;
}

function pjSaveNotes(pid) { const ta = document.getElementById("pj-notes-ta"); if (!ta) return; pjUpdate(pid, { notes: ta.value }); flash("💾 Notas guardadas", "success"); render(); }

function pjRenderMarkdown(text) {
  return (text || "").split("\n").map(l => {
    if (l.startsWith("### ")) return `<h4 style="color:#FFD700;margin:10px 0 4px;font-size:13px">${pjEscape(l.slice(4))}</h4>`;
    if (l.startsWith("## ")) return `<h3 style="color:#FFD700;margin:12px 0 5px;font-size:14px">${pjEscape(l.slice(3))}</h3>`;
    if (l.startsWith("# ")) return `<h2 style="color:#FFD700;margin:14px 0 6px;font-size:16px">${pjEscape(l.slice(2))}</h2>`;
    if (l.startsWith("> ")) return `<blockquote style="border-left:3px solid #FFD700;padding-left:10px;color:#aaa;font-style:italic;margin:6px 0">${pjInline(l.slice(2))}</blockquote>`;
    if (l.startsWith("- ") || l.startsWith("* ")) return `<li style="margin-left:18px;color:#ccc;font-size:13px">${pjInline(l.slice(2))}</li>`;
    if (/^\d+\.\s/.test(l)) return `<li style="margin-left:18px;color:#ccc;font-size:13px;list-style-type:decimal">${pjInline(l.replace(/^\d+\.\s/, ""))}</li>`;
    if (l.trim() === "") return `<div style="height:6px"></div>`;
    return `<p style="color:#ccc;font-size:13px;line-height:1.5;margin:4px 0">${pjInline(l)}</p>`;
  }).join("");
}
function pjInline(text) {
  let s = pjEscape(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#fff">$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em style="color:#ddd">$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(255,215,0,0.1);color:#FFD700;padding:1px 5px;border-radius:4px;font-size:12px">$1</code>');
  return s;
}

// ── Budget ───────────────────────────────────────────────────────────────────
function pjRenderBudgetTab(p) {
  const spent = pjSpent(p); const budget = p.budget;
  const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;
  const over = budget ? spent > budget : false;
  const c = over ? "#E74C3C" : pct > 70 ? "#F39C12" : "#2ECC71";
  const expenses = (data.hist || []).filter(h => h.projectId === p.id && h.type !== "income");

  let html = `<div class="card" style="padding:14px;margin-bottom:12px">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <input type="number" id="pj-budget-val" class="inp" value="${budget == null ? "" : budget}" step="0.01" placeholder="Presupuesto ($)" style="flex:1"/>
      <button onclick="pjSaveBudget('${p.id}')" style="background:linear-gradient(135deg,#FFD700,#F39C12);border:none;color:#000;padding:0 16px;border-radius:10px;cursor:pointer;font-weight:800;font-family:'Inter',sans-serif">💾</button>
    </div>`;
  if (budget != null) {
    html += `<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px">
      <div><div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px">Gastado</div><div class="rpg" style="font-size:14px;color:${c}">${pjFmt(spent)}</div></div>
      <div style="text-align:right"><div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px">Presupuesto</div><div class="rpg" style="font-size:14px;color:#FFD700">${pjFmt(budget)}</div></div>
    </div>
    <div style="height:10px;background:rgba(0,0,0,0.35);border-radius:5px;overflow:hidden"><div style="width:${pct}%;height:100%;background:linear-gradient(90deg,${c},${c}aa);transition:width 0.4s"></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:#666"><span>${pct.toFixed(1)}%</span><span style="color:${over ? "#E74C3C" : "#2ECC71"}">${over ? "Excedido " + pjFmt(spent - budget) : pjFmt(budget - spent) + " restantes"}</span></div>`;
  }
  html += `</div>`;
  html += `<div class="card" style="padding:14px"><div style="font-weight:700;font-size:13px;color:#eee;margin-bottom:10px">🛡️ Gastos (${expenses.length})</div>
    ${expenses.length === 0 ? `<div style="text-align:center;padding:18px;color:#555;font-size:12px">Sin gastos vinculados.</div>`
    : `<div style="display:flex;flex-direction:column;gap:6px">${expenses.slice(0,30).map(h => {
      const d = new Date(h.date);
      return `<div style="display:flex;gap:10px;align-items:center;padding:8px 10px;background:rgba(231,76,60,0.06);border-radius:9px;border:1px solid rgba(231,76,60,0.1)">
        <span style="font-size:16px">${h.icon || "💸"}</span>
        <div style="flex:1;min-width:0"><div style="font-size:12px;color:#eee;font-weight:600">${pjEscape(h.catName||"")}</div><div style="font-size:10px;color:#666">${h.groupName ? pjEscape(h.groupName)+" · " : ""}${d.toLocaleDateString("es-EC",{day:"2-digit",month:"short"})}</div></div>
        <span class="rpg" style="font-size:10px;color:#E74C3C">-${pjFmt(h.amount)}</span>
      </div>`;
    }).join("")}</div>`}</div>`;
  return html;
}

function pjSaveBudget(pid) { const v = document.getElementById("pj-budget-val").value; pjUpdate(pid, { budget: isNaN(parseFloat(v)) ? null : parseFloat(v) }); flash("💾 Presupuesto actualizado", "success"); render(); }

// ══════════════════════════════════════════════════════════════════════════════
// Mejora #6: WEEKLY REVIEW (PIM)
// ══════════════════════════════════════════════════════════════════════════════
function pjRenderWeeklyReview() {
  const all = data.projects || [];
  const active = all.filter(p => p.status === "active" || p.status === "planning");
  const stagnant = active.filter(p => {
    const daysSinceUpdate = pjDaysBetween(new Date(p.updatedAt || p.createdAt).toISOString().slice(0,10), pjToday());
    return daysSinceUpdate > 5;
  });
  const atRisk = active.filter(p => pjIsAtRisk(p));
  const dueSoon = active.filter(p => { const dr = pjDaysRemaining(p); return dr != null && dr >= 0 && dr <= 7; });
  const weekTodos = (data.todos || []).filter(t => t.projectId);
  const weekDone = weekTodos.filter(t => t.done);
  const totalProgress = active.length ? Math.round(active.reduce((a, p) => a + pjCalcProgress(p), 0) / active.length) : 0;

  // Milestones completed this week
  const weekAgo = pjAddDays(pjToday(), -7);
  let msCompletedThisWeek = 0;
  active.forEach(p => { (p.milestones || []).forEach(m => { if (m.done && m.completedAt && new Date(m.completedAt).toISOString().slice(0,10) >= weekAgo) msCompletedThisWeek++; }); });

  let html = `<div class="card" style="padding:14px;border-color:rgba(255,215,0,0.2);margin-bottom:12px;background:linear-gradient(135deg,rgba(16,20,34,0.98),rgba(255,215,0,0.03))">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div>
        <div style="font-size:16px;font-weight:800;color:#FFD700">📋 Revisión Semanal</div>
        <div style="font-size:11px;color:#666;margin-top:3px">¿Cómo van tus proyectos esta semana?</div>
      </div>
      <button onclick="pjView='panel';render()" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#888;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif">← Volver</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="padding:12px;background:rgba(52,152,219,0.08);border:1px solid rgba(52,152,219,0.2);border-radius:12px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:#3498DB">${totalProgress}%</div>
        <div style="font-size:9px;color:#555;text-transform:uppercase;font-weight:700;margin-top:3px">Progreso global</div>
      </div>
      <div style="padding:12px;background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.2);border-radius:12px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:#2ECC71">${weekDone.length}</div>
        <div style="font-size:9px;color:#555;text-transform:uppercase;font-weight:700;margin-top:3px">Tareas hechas</div>
      </div>
      <div style="padding:12px;background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:12px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:#FFD700">${msCompletedThisWeek}</div>
        <div style="font-size:9px;color:#555;text-transform:uppercase;font-weight:700;margin-top:3px">Hitos cumplidos</div>
      </div>
    </div>
  </div>`;

  // At Risk
  if (atRisk.length > 0) {
    html += `<div class="card" style="padding:14px;margin-bottom:12px;border-color:rgba(231,76,60,0.25)">
      <div style="font-weight:700;color:#E74C3C;margin-bottom:10px;font-size:13px">⚠️ En riesgo (${atRisk.length})</div>
      ${atRisk.map(p => {
        const dr = pjDaysRemaining(p); const prog = pjCalcProgress(p);
        return `<div onclick="pjOpen('${p.id}')" class="pj-next-action" style="border-color:rgba(231,76,60,0.15);margin-bottom:6px">
          ${pjRingSVG(prog, '#E74C3C', 36, 2.5)}
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#eee;font-weight:600">${pjEscape(p.icon)} ${pjEscape(p.name)}</div>
            <div style="font-size:10px;color:#E74C3C;font-weight:700">${Math.abs(dr)}d de atraso</div>
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }

  // Due Soon
  if (dueSoon.length > 0) {
    html += `<div class="card" style="padding:14px;margin-bottom:12px;border-color:rgba(243,156,18,0.25)">
      <div style="font-weight:700;color:#F39C12;margin-bottom:10px;font-size:13px">⏰ Vence pronto (${dueSoon.length})</div>
      ${dueSoon.map(p => {
        const dr = pjDaysRemaining(p); const prog = pjCalcProgress(p);
        return `<div onclick="pjOpen('${p.id}')" class="pj-next-action" style="border-color:rgba(243,156,18,0.15);margin-bottom:6px">
          ${pjRingSVG(prog, '#F39C12', 36, 2.5)}
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#eee;font-weight:600">${pjEscape(p.icon)} ${pjEscape(p.name)}</div>
            <div style="font-size:10px;color:#F39C12">${dr}d restantes · ${prog}%</div>
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }

  // Stagnant
  if (stagnant.length > 0) {
    html += `<div class="card" style="padding:14px;margin-bottom:12px;border-color:rgba(155,89,182,0.25)">
      <div style="font-weight:700;color:#9B59B6;margin-bottom:10px;font-size:13px">😴 Estancados (+5d sin actividad)</div>
      ${stagnant.map(p => {
        const daysSince = pjDaysBetween(new Date(p.updatedAt || p.createdAt).toISOString().slice(0,10), pjToday());
        return `<div onclick="pjOpen('${p.id}')" class="pj-next-action" style="border-color:rgba(155,89,182,0.15);margin-bottom:6px">
          <span style="font-size:18px">${pjEscape(p.icon)}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:#eee;font-weight:600">${pjEscape(p.name)}</div>
            <div style="font-size:10px;color:#9B59B6">${daysSince}d sin actividad</div>
          </div>
        </div>`;
      }).join("")}
    </div>`;
  }

  // All projects overview
  html += `<div class="card" style="padding:14px">
    <div style="font-weight:700;color:#eee;margin-bottom:10px;font-size:13px">📊 Todos los proyectos (${active.length})</div>
    ${active.map(p => {
      const prog = pjCalcProgress(p);
      const ts = pjTasks(p.id); const done = ts.filter(t => t.done).length;
      const nextAct = pjNextAction(p.id);
      return `<div onclick="pjOpen('${p.id}')" style="display:flex;align-items:center;gap:10px;padding:10px;background:${p.color}06;border:1px solid ${p.color}18;border-radius:10px;margin-bottom:6px;cursor:pointer;transition:transform 0.15s" onmouseover="this.style.transform='scale(1.01)'" onmouseout="this.style.transform='scale(1)'">
        ${pjRingSVG(prog, p.color, 38, 2.5)}
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:#eee;font-weight:700">${pjEscape(p.icon)} ${pjEscape(p.name)}</div>
          <div style="font-size:10px;color:#666;margin-top:2px">${done}/${ts.length} tareas${nextAct ? ' · ⚡ ' + pjEscape(nextAct.text).substring(0, 30) : ''}</div>
        </div>
      </div>`;
    }).join("")}
  </div>`;

  return html;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODALS: Templates + Edit
// ══════════════════════════════════════════════════════════════════════════════
function pjOpenTemplates() {
  const m = document.getElementById("modal-pj-templates"); if (!m) return;
  const body = document.getElementById("modal-pj-templates-body");
  body.innerHTML = PROJECT_TEMPLATES.map(t => `<div onclick="pjCreateFromTemplate('${t.id}')" style="padding:13px;border-radius:12px;border:1px solid ${t.color}35;background:linear-gradient(135deg,${t.color}08,${t.color}04);cursor:pointer;margin-bottom:8px;display:flex;gap:12px;align-items:center;transition:transform 0.15s,border-color 0.15s" onmouseover="this.style.transform='scale(1.01)';this.style.borderColor='${t.color}60'" onmouseout="this.style.transform='scale(1)';this.style.borderColor='${t.color}35'">
    <div style="font-size:32px">${t.icon}</div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;color:#fff;font-size:14px">${pjEscape(t.name)}</div>
      <div style="font-size:11px;color:#aaa;margin-top:3px">${pjEscape(t.description || "")}</div>
      <div style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap">
        ${t.milestones && t.milestones.length ? `<span class="pill" style="color:#FFD700;border-color:rgba(255,215,0,0.25);background:rgba(255,215,0,0.08);font-size:10px">🏆 ${t.milestones.length} hitos</span>` : ""}
        ${t.tasks && t.tasks.length ? `<span class="pill" style="color:#3498DB;border-color:rgba(52,152,219,0.25);background:rgba(52,152,219,0.08);font-size:10px">📋 ${t.tasks.length} tareas</span>` : ""}
      </div>
    </div>
  </div>`).join("");
  m.style.display = "flex";
}

function pjCloseTemplates() { const m = document.getElementById("modal-pj-templates"); if (m) m.style.display = "none"; }

function pjCreateFromTemplate(tid) {
  const t = PROJECT_TEMPLATES.find(x => x.id === tid); if (!t) return;
  const p = pjCreate(t);
  pjCloseTemplates();
  pjCurrentId = p.id; pjView = "detail"; pjDetailTab = "overview";
  flash("✨ Proyecto creado: " + p.name, "success");
  render();
}

function pjOpenEdit(pid) {
  const p = pjGet(pid); if (!p) return;
  const m = document.getElementById("modal-pj-edit"); if (!m) return;
  m.dataset.pid = pid;
  document.getElementById("pj-edit-name").value = p.name || "";
  document.getElementById("pj-edit-icon").value = p.icon || "🎯";
  document.getElementById("pj-edit-color").value = p.color || "#FFD700";
  document.getElementById("pj-edit-desc").value = p.description || "";
  document.getElementById("pj-edit-start").value = p.startDate || "";
  document.getElementById("pj-edit-due").value = p.dueDate || "";
  document.getElementById("pj-edit-tags").value = (p.tags || []).join(", ");
  const statusSel = document.getElementById("pj-edit-status");
  statusSel.innerHTML = PROJECT_STATUS.map(s => `<option value="${s.id}" ${p.status === s.id ? "selected" : ""}>${s.icon} ${s.n}</option>`).join("");
  const prioSel = document.getElementById("pj-edit-priority");
  prioSel.innerHTML = PROJECT_PRIORITY.map(s => `<option value="${s.id}" ${p.priority === s.id ? "selected" : ""}>${s.icon} ${s.n}</option>`).join("");
  const areaSel = document.getElementById("pj-edit-area");
  areaSel.innerHTML = AREAS.map(a => `<option value="${a.id}" ${p.area === a.id ? "selected" : ""}>${a.icon} ${a.n}</option>`).join("");
  m.style.display = "flex";
}

function pjCloseEdit() { const m = document.getElementById("modal-pj-edit"); if (m) m.style.display = "none"; }

function pjSubmitEdit() {
  const m = document.getElementById("modal-pj-edit");
  const pid = m.dataset.pid;
  const tagsStr = document.getElementById("pj-edit-tags").value || "";
  const newArea = document.getElementById("pj-edit-area").value;
  const manualColor = document.getElementById("pj-edit-color").value;
  const p = pjGet(pid);
  // If color hasn't been manually changed from auto, update it with new area
  const autoOld = pjAutoColor(p ? p.area : "int");
  const useAutoColor = (p && p.color === autoOld) ? pjAutoColor(newArea) : manualColor;
  pjUpdate(pid, {
    name: document.getElementById("pj-edit-name").value.trim() || "Proyecto",
    icon: document.getElementById("pj-edit-icon").value.trim() || "🎯",
    color: useAutoColor,
    description: document.getElementById("pj-edit-desc").value || "",
    startDate: document.getElementById("pj-edit-start").value || "",
    dueDate: document.getElementById("pj-edit-due").value || "",
    status: document.getElementById("pj-edit-status").value,
    priority: document.getElementById("pj-edit-priority").value,
    area: newArea,
    tags: tagsStr.split(",").map(s => s.trim()).filter(Boolean)
  });
  pjCloseEdit();
  flash("💾 Proyecto actualizado", "success");
  render();
}

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS
// ══════════════════════════════════════════════════════════════════════════════
function pjPopulateExpenseProjectSelect() {
  const sel = document.getElementById("modal-exp-project"); if (!sel) return;
  const activos = (data.projects || []).filter(p => p.status !== "archived" && p.status !== "done");
  sel.innerHTML = `<option value="">— Sin proyecto —</option>` + activos.map(p => `<option value="${p.id}">${p.icon} ${pjEscape(p.name)}</option>`).join("");
  sel.value = "";
}

// Dashboard widget
function pjRenderDashWidget() {
  const el = document.getElementById("dash-projects"); if (!el) return;
  const activos = (data.projects || []).filter(p => p.status === "active" || p.status === "planning");
  if (activos.length === 0) { el.classList.add("hidden"); el.innerHTML = ""; return; }
  el.classList.remove("hidden");
  const top = activos.slice().sort((a, b) => ({ critical:0,high:1,med:2,low:3 }[a.priority]||9) - ({ critical:0,high:1,med:2,low:3 }[b.priority]||9)).slice(0, 3);
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:13px;font-weight:700;color:#FFD700">🎯 Proyectos activos</span>
      <button onclick="setView('projects')" style="background:transparent;border:1px solid rgba(255,215,0,0.25);color:#FFD700;padding:4px 10px;border-radius:7px;cursor:pointer;font-size:10px;font-weight:700;font-family:'Inter',sans-serif">Ver todos →</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:7px">
      ${top.map(p => {
      const prog = pjCalcProgress(p); const nextAct = pjNextAction(p.id);
      const dr = pjDaysRemaining(p); const urgC = pjUrgencyColor(dr);
      return `<div onclick="pjOpen('${p.id}');setView('projects')" style="cursor:pointer;padding:10px 12px;background:${p.color}08;border:1px solid ${p.color}28;border-radius:10px;transition:transform 0.15s" onmouseover="this.style.transform='scale(1.01)'" onmouseout="this.style.transform='scale(1)'">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:18px">${pjEscape(p.icon)}</span>
            <span style="flex:1;font-size:12px;color:#eee;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pjEscape(p.name)}</span>
            ${pjRingSVG(prog, p.color, 32, 2.5)}
          </div>
          ${nextAct ? `<div style="font-size:10px;color:#FF9800;margin-top:2px">⚡ ${pjEscape(nextAct.text)}</div>` : ""}
          ${dr != null ? `<div style="font-size:10px;color:${urgC};margin-top:3px;font-weight:600">${pjUrgencyLabel(dr)}</div>` : ""}
        </div>`;
    }).join("")}
    </div>`;
}
