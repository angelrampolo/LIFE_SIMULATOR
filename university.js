// ══════════════════════════════════════════════════════════════════════════════
// LifeControl RPG — University Module + Custom Categories
// ══════════════════════════════════════════════════════════════════════════════

// ── Colores disponibles para materias ────────────────────────────────────────
const UNI_COLORS = [
  "#3498DB","#9B59B6","#E74C3C","#2ECC71","#F39C12",
  "#1ABC9C","#E67E22","#FF6B35","#00BCD4","#8E44AD"
];

// ── Tipos de actividad universitaria ─────────────────────────────────────────
const UNI_TYPES = {
  tarea:       { icon:"📝", label:"Tarea",        color:"#3498DB" },
  examen:      { icon:"📋", label:"Examen",        color:"#E74C3C" },
  proyecto:    { icon:"🚀", label:"Proyecto",      color:"#9B59B6" },
  recordatorio:{ icon:"📌", label:"Recordatorio",  color:"#F39C12" },
  otro:        { icon:"📦", label:"Otro",           color:"#78909C" }
};

const UNI_PRI_COLORS = { high:"#E74C3C", medium:"#F39C12", low:"#2ECC71" };
const UNI_PRI_ICONS  = { high:"🔴", medium:"🟡", low:"🟢" };

// ════════════════════════════════════════════════════════════════════════════
// UNIVERSITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function addSubject() {
  const nameEl = $("uni-sbj-name");
  const levelEl = $("uni-sbj-level");
  const iconEl  = $("uni-sbj-icon");
  const name  = (nameEl ? nameEl.value : "").trim();
  const level = (levelEl ? levelEl.value : "").trim();
  const icon  = (iconEl  ? iconEl.value  : "").trim() || "📚";
  if (!name) { flash("⚠️ Escribe el nombre de la materia", "xp"); return; }
  if (!data.subjects) data.subjects = [];
  const sbj = {
    id: "sbj_" + Date.now(),
    name, level, icon,
    color: uniSbjColor,
    createdAt: todayStr()
  };
  data.subjects.push(sbj);
  if (nameEl)  nameEl.value  = "";
  if (levelEl) levelEl.value = "";
  if (iconEl)  iconEl.value  = "";
  uniSbjColor = "#3498DB";
  showUniSbjForm = false;
  flash("🎓 Materia agregada: " + name, "success");
  schedSave(); render();
}

let pendingDeleteSbj = null;

function deleteSubject(id) {
  if (pendingDeleteSbj !== id) {
    pendingDeleteSbj = id;
    render(); // Re-render to show "Seguro?" state
    setTimeout(() => {
      if (pendingDeleteSbj === id) { pendingDeleteSbj = null; render(); }
    }, 3000);
    return;
  }
  pendingDeleteSbj = null;
  
  // Clean up linked tasks (Todos and Reminders) before deleting the subject tasks
  const tasksToDelete = (data.uniTasks || []).filter(x => x.sbjId === id);
  tasksToDelete.forEach(ut => {
    if (ut.todoId) data.todos = (data.todos || []).filter(x => x.id !== ut.todoId);
    if (ut.reminderId) data.reminders = (data.reminders || []).filter(x => x.id !== ut.reminderId);
  });

  data.subjects = (data.subjects || []).filter(x => x.id !== id);
  data.uniTasks = (data.uniTasks || []).filter(x => x.sbjId !== id);
  if (uniSbjFilter === id) uniSbjFilter = "all";
  flash("🗑️ Materia eliminada", "success");
  schedSave(); render();
}

function openUniTaskForm(sbjId) {
  uniTaskSbj = sbjId;
  showUniTaskForm = true;
  const due = $("uni-task-due");
  if (due) due.value = todayStr();
  render();
  setTimeout(() => { const el = $("uni-task-text"); if (el) el.focus(); }, 100);
}

function addUniTask() {
  const textEl = $("uni-task-text");
  const typeEl = $("uni-task-type");
  const priEl  = $("uni-task-pri");
  const dueEl  = $("uni-task-due");
  const text = (textEl ? textEl.value : "").trim();
  if (!text) { flash("⚠️ Escribe la actividad", "xp"); return; }
  if (!uniTaskSbj) { flash("⚠️ Selecciona una materia primero", "xp"); return; }
  const type     = typeEl ? typeEl.value : "tarea";
  const priority = priEl  ? priEl.value  : "medium";
  const dueDate  = dueEl  ? dueEl.value  : "";
  const sbj = (data.subjects || []).find(x => x.id === uniTaskSbj);

  if (!data.uniTasks) data.uniTasks = [];
  const ut = {
    id: "ut_" + Date.now(),
    sbjId: uniTaskSbj,
    sbjName: sbj ? sbj.name : "",
    text, type, priority,
    dueDate: dueDate || "",
    done: false,
    createdAt: todayStr()
  };
  data.uniTasks.push(ut);

  // 1. Sync with general Todos (Missions)
  const xpMap = { high: 10, medium: 5, low: 2 };
  const xp = xpMap[priority] || 5;
  const todoId = "ut_todo_" + ut.id;
  if (!data.todos) data.todos = [];
  data.todos.push({
    id: todoId,
    text: (sbj ? sbj.icon + " [" + sbj.name + "] " : "") + text,
    diff: priority === "high" ? "hard" : priority === "low" ? "easy" : "medium",
    area: "int",
    xp,
    done: false,
    date: dueDate || todayStr(),
    uniTaskId: ut.id
  });
  ut.todoId = todoId;

  // 2. If type is recordatorio, also add to general reminders
  if (type === "recordatorio") {
    if (!data.reminders) data.reminders = [];
    const remId = "ut_rem_" + ut.id;
    data.reminders.push({
      id: remId,
      text: (sbj ? "[" + sbj.name + "] " : "") + text,
      priority,
      date: dueDate || "",
      done: false,
      uniTaskId: ut.id
    });
    ut.reminderId = remId;
  }

  if (textEl) textEl.value = "";
  showUniTaskForm = false;
  uniTaskSbj = null;
  flash("📝 Actividad agregada y vinculada a Tareas", "success");
  data.xp = (data.xp || 0) + 1; // small XP for creating
  schedSave(); checkQuests(); render();
}

function toggleUniTask(id) {
  const ut = (data.uniTasks || []).find(x => x.id === id);
  if (!ut) return;
  ut.done = !ut.done;

  // Sync with linked Todo
  if (ut.todoId) {
    const todo = (data.todos || []).find(x => x.id === ut.todoId);
    if (todo && todo.done !== ut.done) {
      if (!todo.done) {
        // Complete the linked todo and award XP
        data.xp = (data.xp || 0) + (todo.xp || 5);
        data.stats["int"] = (data.stats["int"] || 0) + (todo.xp || 5);
        flash("✅ +XP ¡Actividad completada!", "xp");
        setMoodTmp("celebrate", 2000);
      } else {
        data.xp = Math.max(0, (data.xp || 0) - (todo.xp || 5));
        data.stats["int"] = Math.max(0, (data.stats["int"] || 0) - (todo.xp || 5));
      }
      todo.done = ut.done;
    }
  }

  // Sync with linked Reminder
  if (ut.reminderId) {
    const rem = (data.reminders || []).find(x => x.id === ut.reminderId);
    if (rem) rem.done = ut.done;
  }

  if (ut.done) flash("🎓 ¡Actividad completada!", "xp");
  schedSave(); checkQuests(); render();
}

function deleteUniTask(id) {
  const ut = (data.uniTasks || []).find(x => x.id === id);
  if (!ut) return;
  // Remove linked todo and reminder
  if (ut.todoId)    data.todos     = (data.todos     || []).filter(x => x.id !== ut.todoId);
  if (ut.reminderId) data.reminders = (data.reminders || []).filter(x => x.id !== ut.reminderId);
  data.uniTasks = (data.uniTasks || []).filter(x => x.id !== id);
  flash("🗑️ Actividad eliminada", "success");
  schedSave(); render();
}

// ── Render University View ─────────────────────────────────────────────────
function renderUniversity() {
  const subjects = data.subjects || [];
  const allTasks = data.uniTasks || [];
  const total = allTasks.length;
  const done  = allTasks.filter(x => x.done).length;
  const today = todayStr();

  // Header stats
  const subEl = $("uni-header-sub");
  if (subEl) subEl.textContent = subjects.length + " materia" + (subjects.length !== 1 ? "s" : "") + " · " + (total - done) + " actividades pendientes";
  const pcEl = $("uni-progress-count");
  if (pcEl) pcEl.textContent = done + " / " + total;
  const pbEl = $("uni-progress-bar");
  if (pbEl) pbEl.style.width = (total > 0 ? Math.round((done / total) * 100) : 0) + "%";

  // Subject form toggle
  const formEl = $("uni-sbj-form");
  if (formEl) {
    formEl.classList.toggle("hidden", !showUniSbjForm);
    if (showUniSbjForm) {
      // Color picker
      const cp = $("uni-color-picker");
      if (cp) {
        let cpHTML = "";
        UNI_COLORS.forEach(c => {
          const sel = uniSbjColor === c;
          cpHTML += `<button onclick="uniSbjColor='${c}';renderUniversity()" style="width:26px;height:26px;border-radius:7px;background:${c};border:${sel ? '3px solid #FFD700' : '2px solid transparent'};cursor:pointer;transition:0.2s"></button>`;
        });
        cp.innerHTML = cpHTML;
      }
    }
  }

  // Task form toggle
  const tfEl = $("uni-task-form");
  if (tfEl) {
    tfEl.classList.toggle("hidden", !showUniTaskForm);
    if (showUniTaskForm && uniTaskSbj) {
      const sbj = subjects.find(x => x.id === uniTaskSbj);
      const nEl = $("uni-task-for-name");
      if (nEl) nEl.textContent = sbj ? (sbj.icon + " " + sbj.name) : "—";
    }
  }

  // Subject filter
  const filterEl = $("uni-sbj-filter");
  if (filterEl) {
    const onAll = uniSbjFilter === "all";
    let fHTML = `<button onclick="uniSbjFilter='all';renderUniversity()" style="padding:6px 13px;border-radius:20px;border:1px solid ${onAll ? '#3498DB' : 'rgba(255,255,255,0.07)'};background:${onAll ? 'rgba(52,152,219,0.12)' : 'rgba(0,0,0,0.25)'};color:${onAll ? '#3498DB' : '#555'};cursor:pointer;font-weight:700;font-size:12px;font-family:Inter,sans-serif;flex-shrink:0">📋 Todas</button>`;
    subjects.forEach(s => {
      const on = uniSbjFilter === s.id;
      const cnt = allTasks.filter(x => x.sbjId === s.id && !x.done).length;
      fHTML += `<button onclick="uniSbjFilter='${s.id}';renderUniversity()" style="padding:6px 13px;border-radius:20px;border:1px solid ${on ? s.color : 'rgba(255,255,255,0.07)'};background:${on ? s.color + '18' : 'rgba(0,0,0,0.25)'};color:${on ? s.color : '#555'};cursor:pointer;font-weight:700;font-size:12px;font-family:Inter,sans-serif;flex-shrink:0">${s.icon} ${s.name}${cnt > 0 ? ' <span style="background:' + s.color + ';color:#fff;border-radius:10px;padding:1px 6px;font-size:10px">' + cnt + '</span>' : ''}</button>`;
    });
    filterEl.innerHTML = fHTML;
  }

  // No subjects state
  const listEl = $("uni-subjects-list");
  if (!listEl) return;

  if (subjects.length === 0) {
    listEl.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#555">
      <div style="font-size:52px;margin-bottom:16px">🎓</div>
      <div style="font-size:16px;font-weight:700;color:#3498DB;margin-bottom:8px">Sin materias aún</div>
      <div style="font-size:12px;color:#555;margin-bottom:20px">Agrega tu primera materia para comenzar a organizar tus actividades universitarias</div>
      <button onclick="showUniSbjForm=true;render()" style="padding:12px 24px;border-radius:10px;border:1px solid rgba(52,152,219,0.4);background:rgba(52,152,219,0.1);color:#3498DB;cursor:pointer;font-weight:700;font-size:13px;font-family:Inter,sans-serif">+ Agregar Primera Materia</button>
    </div>`;
    return;
  }

  // Filter subjects
  const sbjsToShow = uniSbjFilter === "all" ? subjects : subjects.filter(x => x.id === uniSbjFilter);
  let html = "";

  sbjsToShow.forEach(sbj => {
    const sbjTasks = allTasks.filter(x => x.sbjId === sbj.id);
    const sbjDone  = sbjTasks.filter(x => x.done).length;
    const sbjPendi = sbjTasks.filter(x => !x.done);
    const sbjComp  = sbjTasks.filter(x => x.done);
    const pct = sbjTasks.length > 0 ? Math.round((sbjDone / sbjTasks.length) * 100) : 0;

    let tasksHTML = "";

    // Pending tasks
    if (sbjPendi.length > 0) {
      tasksHTML += `<div style="font-size:10px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px;padding:0 14px">Pendientes (${sbjPendi.length})</div>`;
      sbjPendi.sort((a,b) => {
        const po = { high:0, medium:1, low:2 };
        return (po[a.priority]||1) - (po[b.priority]||1);
      }).forEach(ut => { tasksHTML += buildUniTaskHTML(ut, sbj); });
    }

    // Add task button
    tasksHTML += `<div style="padding:10px 14px 14px"><button onclick="openUniTaskForm('${sbj.id}')" style="width:100%;padding:9px;border-radius:9px;border:1px dashed ${sbj.color}55;background:${sbj.color}08;color:${sbj.color};cursor:pointer;font-weight:700;font-size:12px;font-family:Inter,sans-serif">+ Nueva Actividad</button></div>`;

    // Completed tasks (collapsed)
    if (sbjComp.length > 0) {
      tasksHTML += `<div style="padding:0 14px 12px">
        <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Completadas (${sbjComp.length})</div>
        ${sbjComp.slice(0,3).map(ut => buildUniTaskHTML(ut, sbj)).join("")}
        ${sbjComp.length > 3 ? `<div style="font-size:10px;color:#444;text-align:center;padding-top:4px">+${sbjComp.length-3} más completadas</div>` : ""}
      </div>`;
    }

    html += `<div class="card" style="padding:0;border-color:${sbj.color}35;margin-bottom:10px;border-left:3px solid ${sbj.color}">
      <div style="display:flex;align-items:center;gap:12px;padding:13px 14px">
        <div style="width:40px;height:40px;border-radius:11px;background:${sbj.color}18;border:1px solid ${sbj.color}30;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${sbj.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700;color:#eee">${sbj.name}</div>
          ${sbj.level ? `<div style="font-size:11px;color:${sbj.color};margin-top:2px;font-weight:600">${sbj.level}</div>` : ""}
          <div style="height:4px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;margin-top:7px;width:100px">
            <div style="height:100%;width:${pct}%;background:${sbj.color};border-radius:3px;transition:0.4s"></div>
          </div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <div style="font-size:11px;color:${sbj.color};font-weight:700">${sbjDone}/${sbjTasks.length}</div>
          <button onclick="deleteSubject('${sbj.id}')" style="background:${pendingDeleteSbj === sbj.id ? '#E74C3C' : 'transparent'};border:none;color:${pendingDeleteSbj === sbj.id ? '#fff' : '#444'};cursor:pointer;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;transition:0.2s">${pendingDeleteSbj === sbj.id ? '¿Seguro?' : '🗑️'}</button>
        </div>
      </div>
      ${tasksHTML}
    </div>`;
  });

  listEl.innerHTML = html;
}

// ── Build individual uni-task HTML ─────────────────────────────────────────
function buildUniTaskHTML(ut, sbj) {
  const t = UNI_TYPES[ut.type] || UNI_TYPES.otro;
  const priColor = UNI_PRI_COLORS[ut.priority] || "#F39C12";
  const priIcon  = UNI_PRI_ICONS[ut.priority]  || "🟡";
  const today = todayStr();
  const isOverdue = ut.dueDate && ut.dueDate < today && !ut.done;
  const dateStr = ut.dueDate
    ? new Date(ut.dueDate + "T12:00:00").toLocaleDateString("es-EC", { day:"numeric", month:"short" })
    : "";

  return `<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;background:${ut.done ? 'rgba(46,204,113,0.04)' : 'rgba(0,0,0,0.15)'};border-bottom:1px solid rgba(255,255,255,0.03)">
    <button onclick="toggleUniTask('${ut.id}')" style="width:24px;height:24px;border-radius:7px;border:2px solid ${ut.done ? '#2ECC71' : priColor + '77'};background:${ut.done ? 'rgba(46,204,113,0.2)' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;color:#2ECC71;flex-shrink:0">${ut.done ? '✓' : ''}</button>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;color:${ut.done ? '#555' : '#ddd'};font-weight:500;${ut.done ? 'text-decoration:line-through;opacity:0.6' : ''};line-height:1.3">${ut.text}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">
        <span style="font-size:10px;padding:1px 6px;border-radius:5px;background:${t.color}18;color:${t.color};border:1px solid ${t.color}30">${t.icon} ${t.label}</span>
        <span style="font-size:10px;padding:1px 6px;border-radius:5px;background:${priColor}12;color:${priColor}">${priIcon}</span>
        ${dateStr ? `<span style="font-size:10px;color:${isOverdue ? '#E74C3C' : '#666'}">${isOverdue ? '⚠️ ' : '📅 '}${dateStr}</span>` : ''}
        ${ut.todoId ? '<span style="font-size:9px;color:#3498DB;padding:1px 5px;border-radius:4px;background:rgba(52,152,219,0.1)">🔗 Misión</span>' : ''}
        ${ut.reminderId ? '<span style="font-size:9px;color:#F39C12;padding:1px 5px;border-radius:4px;background:rgba(243,156,18,0.1)">📌 Rec.</span>' : ''}
      </div>
    </div>
    <button onclick="deleteUniTask('${ut.id}')" style="background:transparent;border:none;color:#444;cursor:pointer;font-size:12px;padding:3px;flex-shrink:0">✕</button>
  </div>`;
}


// ════════════════════════════════════════════════════════════════════════════
// CUSTOM EXPENSE CATEGORIES
// ════════════════════════════════════════════════════════════════════════════
const CUSTOM_EXP_COLORS = [
  "#E74C3C","#E67E22","#F39C12","#2ECC71","#1ABC9C",
  "#3498DB","#9B59B6","#E91E63","#FF6B35","#78909C"
];
let customExpNewColor = "#E74C3C";

function openCustomExpModal() {
  customExpMode = "group";
  customExpNewColor = "#E74C3C";
  renderCustomExpModal();
  $("modal-custom-exp").style.display = "flex";
}

function openAddSubcatModal(groupId) {
  customExpMode = "sub";
  customExpGroupSel = groupId;
  renderCustomExpModal();
  $("modal-custom-exp").style.display = "flex";
}

function renderCustomExpModal() {
  const body = $("custom-exp-modal-body");
  if (!body) return;

  const tg = $("custom-exp-tab-group");
  const ts = $("custom-exp-tab-sub");
  if (tg) {
    tg.style.background = customExpMode === "group" ? "rgba(231,76,60,0.12)" : "transparent";
    tg.style.color      = customExpMode === "group" ? "#E74C3C" : "#555";
    tg.style.borderColor= customExpMode === "group" ? "rgba(231,76,60,0.4)" : "rgba(255,255,255,0.07)";
  }
  if (ts) {
    ts.style.background = customExpMode === "sub" ? "rgba(231,76,60,0.12)" : "transparent";
    ts.style.color      = customExpMode === "sub" ? "#E74C3C" : "#555";
    ts.style.borderColor= customExpMode === "sub" ? "rgba(231,76,60,0.4)" : "rgba(255,255,255,0.07)";
  }

  if (customExpMode === "group") {
    // Color picker
    let cpHTML = "";
    CUSTOM_EXP_COLORS.forEach(c => {
      const sel = customExpNewColor === c;
      cpHTML += `<button onclick="customExpNewColor='${c}';renderCustomExpModal()" style="width:26px;height:26px;border-radius:7px;background:${c};border:${sel ? '3px solid #FFD700' : '2px solid transparent'};cursor:pointer"></button>`;
    });
    body.innerHTML = `
      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:#777;margin-bottom:6px;font-weight:700">Nombre del grupo</div>
        <input id="custom-exp-name" class="inp" placeholder="Ej: Universidad, Entretenimiento..." style="font-size:15px;padding:12px"/>
      </div>
      <div style="display:grid;grid-template-columns:80px 1fr;gap:8px;margin-bottom:12px">
        <div>
          <div style="font-size:11px;color:#777;margin-bottom:5px;font-weight:700">Icono</div>
          <input id="custom-exp-icon" class="inp" maxlength="4" placeholder="📦" style="font-size:20px;text-align:center;padding:10px"/>
        </div>
        <div>
          <div style="font-size:11px;color:#777;margin-bottom:5px;font-weight:700">Color</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">${cpHTML}</div>
        </div>
      </div>
      <div style="margin-bottom:18px">
        <div style="font-size:11px;color:#777;margin-bottom:6px;font-weight:700">Primera subcategoría (opcional)</div>
        <input id="custom-exp-cat1" class="inp" placeholder="Ej: Útiles, Libros..." style="font-size:13px;padding:10px"/>
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="closeCustomModals()" style="flex:1;padding:13px;border-radius:12px;border:1px solid rgba(255,255,255,0.09);background:transparent;color:#777;cursor:pointer;font-weight:700">Cancelar</button>
        <button onclick="addCustomExpGroup()" style="flex:2;padding:13px;border-radius:12px;border:none;background:#E74C3C;color:#fff;cursor:pointer;font-weight:800;font-size:14px">💾 Guardar Grupo</button>
      </div>`;
  } else {
    // Add sub-category to existing custom group
    const groups = data.customExpGroups || [];
    let groupOpts = "";
    groups.forEach(g => { groupOpts += `<option value="${g.id}" ${customExpGroupSel === g.id ? 'selected' : ''}>${g.icon} ${g.name}</option>`; });
    body.innerHTML = `
      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:#777;margin-bottom:6px;font-weight:700">Grupo de gasto</div>
        <select id="custom-sub-group" class="inp" style="padding:11px;font-size:13px" onchange="customExpGroupSel=this.value">${groupOpts || '<option disabled>Sin grupos custom creados</option>'}</select>
      </div>
      <div style="margin-bottom:18px">
        <div style="font-size:11px;color:#777;margin-bottom:6px;font-weight:700">Nombre de la subcategoría</div>
        <input id="custom-sub-name" class="inp" placeholder="Ej: Matrícula, Fotocopias..." style="font-size:15px;padding:12px"/>
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="closeCustomModals()" style="flex:1;padding:13px;border-radius:12px;border:1px solid rgba(255,255,255,0.09);background:transparent;color:#777;cursor:pointer;font-weight:700">Cancelar</button>
        <button onclick="addCustomExpCat()" style="flex:2;padding:13px;border-radius:12px;border:none;background:#E74C3C;color:#fff;cursor:pointer;font-weight:800;font-size:14px">💾 Guardar Subcategoría</button>
      </div>`;
  }
}

function addCustomExpGroup() {
  const nameEl = $("custom-exp-name");
  const iconEl = $("custom-exp-icon");
  const cat1El = $("custom-exp-cat1");
  const name = (nameEl ? nameEl.value : "").trim();
  const icon = (iconEl ? iconEl.value : "").trim() || "📦";
  const cat1 = (cat1El ? cat1El.value : "").trim();
  if (!name) { flash("⚠️ Escribe el nombre del grupo", "xp"); return; }
  if (!data.customExpGroups) data.customExpGroups = [];
  const gid = "ceg_" + Date.now();
  const newGroup = { id: gid, name, icon, color: customExpNewColor, cats: [] };
  if (cat1) newGroup.cats.push({ id: "cec_" + Date.now(), name: cat1 });
  data.customExpGroups.push(newGroup);
  flash("✅ Grupo '" + name + "' creado", "success");
  closeCustomModals();
  schedSave(); render();
}

function addCustomExpCat() {
  const nameEl = $("custom-sub-name");
  const grpEl  = $("custom-sub-group");
  const name   = (nameEl ? nameEl.value : "").trim();
  const gid    = grpEl ? grpEl.value : customExpGroupSel;
  if (!name) { flash("⚠️ Escribe el nombre de la subcategoría", "xp"); return; }
  const g = (data.customExpGroups || []).find(x => x.id === gid);
  if (!g) { flash("⚠️ Selecciona un grupo válido", "xp"); return; }
  if (!g.cats) g.cats = [];
  g.cats.push({ id: "cec_" + Date.now(), name });
  flash("✅ Subcategoría '" + name + "' agregada a " + g.name, "success");
  closeCustomModals();
  schedSave(); render();
}

function deleteCustomExpGroup(id) {
  if (!confirm("¿Eliminar este grupo de gasto personalizado?")) return;
  data.customExpGroups = (data.customExpGroups || []).filter(x => x.id !== id);
  flash("🗑️ Grupo eliminado", "success");
  schedSave(); render();
}

// ════════════════════════════════════════════════════════════════════════════
// CUSTOM INCOME CATEGORIES
// ════════════════════════════════════════════════════════════════════════════

function openCustomIncModal() {
  $("modal-custom-inc").style.display = "flex";
  const ni = $("custom-inc-name");
  const ii = $("custom-inc-icon");
  if (ni) { ni.value = ""; setTimeout(() => ni.focus(), 100); }
  if (ii) ii.value = "";
}

function addCustomIncCat() {
  const nameEl = $("custom-inc-name");
  const iconEl = $("custom-inc-icon");
  const name = (nameEl ? nameEl.value : "").trim();
  const icon = (iconEl ? iconEl.value : "").trim() || "💼";
  if (!name) { flash("⚠️ Escribe el nombre de la fuente de ingreso", "xp"); return; }
  if (!data.customIncCats) data.customIncCats = [];
  data.customIncCats.push({ id: "cic_" + Date.now(), name, icon });
  flash("✅ Fuente de ingreso '" + name + "' creada", "success");
  closeCustomModals();
  schedSave(); render();
}

function deleteCustomIncCat(id) {
  if (!confirm("¿Eliminar esta fuente de ingreso personalizada?")) return;
  data.customIncCats = (data.customIncCats || []).filter(x => x.id !== id);
  flash("🗑️ Fuente de ingreso eliminada", "success");
  schedSave(); render();
}

// ════════════════════════════════════════════════════════════════════════════
// CUSTOM MODAL HELPERS
// ════════════════════════════════════════════════════════════════════════════

function closeCustomModals() {
  const me = $("modal-custom-exp");
  const mi = $("modal-custom-inc");
  if (me) me.style.display = "none";
  if (mi) mi.style.display = "none";
}
