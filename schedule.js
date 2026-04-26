// ══════════════════════════════════════════════════════════════════════════════
// LifeControl RPG — Schedule / Agenda Module v2
// ══════════════════════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────────────────────
let scheduleDate = null;
let scheduleViewMode = "timeline"; // "timeline" | "general"
let showSchdForm = false;
let schdEditId = null;
let showNewAreaForm = false;
let schdPendingDelete = null; // id awaiting delete confirmation
let _schdSkipAutoScroll = false; // prevent scroll jump on edit

// Form fields
let schdTitle = "";
let schdStart = "";
let schdEnd   = "";
let schdArea  = "int";
let schdDesc  = "";
let schdPriority = ""; // "" | "high" | "medium" | "low"

// New area form
let schdNewAreaName  = "";
let schdNewAreaIcon  = "⭐";
let schdNewAreaColor = "#E91E63";

// ── Color palette for custom areas ────────────────────────────────────────────
const SCHD_PALETTE = [
  "#E91E63","#FF5722","#FF9800","#FFC107","#8BC34A",
  "#00BCD4","#2196F3","#9C27B0","#795548","#607D8B"
];

// ── Built-in area base colors ─────────────────────────────────────────────────
const AREA_COLORS = {
  str: { bg:"rgba(231,76,60,0.78)",   border:"#E74C3C", glow:"rgba(231,76,60,0.3)"  },
  int: { bg:"rgba(52,152,219,0.78)",  border:"#3498DB", glow:"rgba(52,152,219,0.3)" },
  vit: { bg:"rgba(46,204,113,0.78)",  border:"#2ECC71", glow:"rgba(46,204,113,0.3)" },
  luk: { bg:"rgba(241,196,15,0.78)",  border:"#F1C40F", glow:"rgba(241,196,15,0.3)" },
  cha: { bg:"rgba(155,89,182,0.78)",  border:"#9B59B6", glow:"rgba(155,89,182,0.3)" },
};

// ── Dynamic color resolver ─────────────────────────────────────────────────────
function schdGetAreaColors(areaId) {
  if (AREA_COLORS[areaId]) return AREA_COLORS[areaId];
  // Custom area — build from its color field
  const ca = (data.customAreas || []).find(a => a.id === areaId);
  const hex = (ca && ca.color) ? ca.color.replace('#','') : "888888";
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  return { bg:`rgba(${r},${g},${b},0.8)`, border:(ca&&ca.color)||"#888", glow:`rgba(${r},${g},${b},0.28)` };
}

// ── Effective areas (built-in + custom) ───────────────────────────────────────
function getEffectiveAreas() {
  const custom = (typeof data !== 'undefined' && data && data.customAreas) ? data.customAreas : [];
  return [...AREAS, ...custom];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function schdGetDate() { if (!scheduleDate) scheduleDate = todayStr(); return scheduleDate; }

function schdTimeToMin(t) {
  if (!t || !t.includes(":")) return 0;
  const [h,m] = t.split(":").map(Number); return h*60+m;
}

function schdFmt(t) {
  if (!t) return "";
  const [h,m] = t.split(":").map(Number);
  const ampm = h>=12?"pm":"am", hh=h%12||12;
  return `${hh}:${String(m).padStart(2,"0")}${ampm}`;
}

function schdEventsForDate(date) {
  return (data.schedule||[]).filter(e=>e.date===date);
}

// ── Overlap layout (Google Calendar style) ─────────────────────────────────────
function schdComputeLayout(events) {
  const sorted = [...events].sort((a,b)=>schdTimeToMin(a.startTime)-schdTimeToMin(b.startTime));
  const layout=[];

  let clusters=[];
  sorted.forEach(ev=>{
    const evS=schdTimeToMin(ev.startTime), evE=schdTimeToMin(ev.endTime)||evS+30;
    let placed=false;
    for(const cl of clusters){
      const clE=Math.max(...cl.map(x=>schdTimeToMin(x.endTime)||schdTimeToMin(x.startTime)+30));
      if(evS<clE){cl.push(ev);placed=true;break;}
    }
    if(!placed) clusters.push([ev]);
  });

  clusters.forEach(cl=>{
    const n=cl.length;
    cl.forEach((ev,idx)=>layout.push({event:ev,col:idx,totalCols:n}));
  });
  return layout;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN RENDER ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function renderSchedule() {
  const el = document.getElementById("view-schedule");
  if (!el) return;

  schdGetDate();
  const today = todayStr();
  const isToday = scheduleDate === today;
  const dayEvents = schdEventsForDate(scheduleDate);
  const totalDone = dayEvents.filter(e=>e.done).length;
  const pct = dayEvents.length ? Math.round((totalDone/dayEvents.length)*100) : 0;

  // Date label
  let dateLabel;
  if(isToday) dateLabel = "Hoy";
  else {
    const d = new Date(scheduleDate+"T12:00:00");
    dateLabel = d.toLocaleDateString("es-EC",{weekday:"long",day:"numeric",month:"long"});
    dateLabel = dateLabel.charAt(0).toUpperCase()+dateLabel.slice(1);
  }

  // Total hours planned
  const totalMinutes = dayEvents.reduce((sum,e)=>{
    const s=schdTimeToMin(e.startTime), en=schdTimeToMin(e.endTime)||s+30;
    return sum+(en-s);
  },0);
  const totalHours = (totalMinutes/60).toFixed(1);

  el.innerHTML = `
  <!-- ── HEADER CARD ── -->
  <div style="background:linear-gradient(145deg,rgba(16,21,40,1),rgba(9,12,24,1));border:1px solid rgba(255,215,0,0.1);border-radius:20px;padding:18px 16px 16px;margin-bottom:10px;position:relative;overflow:hidden">
    <div style="position:absolute;top:-28px;right:-24px;width:150px;height:150px;background:radial-gradient(circle,rgba(255,215,0,0.06),transparent 65%);pointer-events:none"></div>
    <div style="position:absolute;bottom:-44px;left:-18px;width:120px;height:120px;background:radial-gradient(circle,rgba(52,152,219,0.04),transparent 68%);pointer-events:none"></div>

    <!-- Top row: title + nav -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
          <div style="width:3px;height:13px;background:linear-gradient(180deg,#FFD700,rgba(255,165,0,0.4));border-radius:2px;flex-shrink:0"></div>
          <div style="font-size:9px;color:rgba(255,215,0,0.5);text-transform:uppercase;letter-spacing:2.5px;font-weight:800">Agenda</div>
        </div>
        <div style="font-size:${isToday?'28':'22'}px;font-weight:900;color:#fff;line-height:1;letter-spacing:-0.3px">${dateLabel}</div>
        <div style="font-size:11px;color:${isToday?'rgba(255,215,0,0.35)':'#3a3a52'};margin-top:5px;font-weight:600">${scheduleDate}</div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;margin-top:2px">
        <button onclick="schdOffsetDate(-1)" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#777;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">◀</button>
        <button onclick="schdGoToday()" style="padding:6px 13px;border-radius:10px;border:1px solid ${isToday?"rgba(255,215,0,0.5)":"rgba(255,255,255,0.08)"};background:${isToday?"rgba(255,215,0,0.12)":"transparent"};color:${isToday?"#FFD700":"#555"};cursor:pointer;font-weight:800;font-size:11px;font-family:'Inter',sans-serif">Hoy</button>
        <button onclick="schdOffsetDate(1)" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#777;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">▶</button>
      </div>
    </div>

    <!-- Week strip -->
    <div class="schd-week-strip" style="margin-bottom:${dayEvents.length>0?'16':'0'}px">${schdBuildWeekStrip(today)}</div>

    ${dayEvents.length>0 ? `
    <!-- Stats row -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:${pct>0?'12':'0'}px">
      <div style="background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.12);border-radius:14px;padding:11px 10px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:#FFD700;line-height:1">${dayEvents.length}</div>
        <div style="font-size:8px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-top:4px">Tareas</div>
      </div>
      <div style="background:rgba(46,204,113,0.05);border:1px solid rgba(46,204,113,0.12);border-radius:14px;padding:11px 10px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:#2ECC71;line-height:1">${totalDone}</div>
        <div style="font-size:8px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-top:4px">Completadas</div>
      </div>
      <div style="background:rgba(52,152,219,0.05);border:1px solid rgba(52,152,219,0.12);border-radius:14px;padding:11px 10px;text-align:center">
        <div style="font-size:22px;font-weight:900;color:#3498DB;line-height:1">${totalHours}<span style="font-size:12px;font-weight:700">h</span></div>
        <div style="font-size:8px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-top:4px">Planeadas</div>
      </div>
    </div>
    ${pct>0?`<div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.04);border-radius:11px;padding:10px 13px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px"><span style="font-size:9px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:0.8px">Progreso del día</span><span style="font-size:13px;font-weight:900;color:${pct>=100?'#2ECC71':'#FFD700'}">${pct}%</span></div><div style="height:6px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3498DB,#2ECC71,#FFD700);border-radius:4px;transition:width 0.6s ease-out"></div></div></div>`:""}
    ` : ""}
  </div>

  <!-- ── VIEW TABS + ADD BUTTON ── -->
  <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
    <button onclick="scheduleViewMode='timeline';renderSchedule()" style="flex:1;padding:10px;border-radius:13px;border:1px solid ${scheduleViewMode==="timeline"?"rgba(255,215,0,0.4)":"rgba(255,255,255,0.06)"};background:${scheduleViewMode==="timeline"?"rgba(255,215,0,0.1)":"rgba(0,0,0,0.22)"};color:${scheduleViewMode==="timeline"?"#FFD700":"#444"};cursor:pointer;font-weight:800;font-size:12px;font-family:'Inter',sans-serif;transition:0.2s">⏱️ Horario</button>
    <button onclick="scheduleViewMode='general';renderSchedule()" style="flex:1;padding:10px;border-radius:13px;border:1px solid ${scheduleViewMode==="general"?"rgba(255,107,53,0.4)":"rgba(255,255,255,0.06)"};background:${scheduleViewMode==="general"?"rgba(255,107,53,0.1)":"rgba(0,0,0,0.22)"};color:${scheduleViewMode==="general"?"#FF6B35":"#444"};cursor:pointer;font-weight:800;font-size:12px;font-family:'Inter',sans-serif;transition:0.2s">📋 General</button>
    <button onclick="schdOpenForm()" style="padding:10px 18px;border-radius:13px;border:none;background:linear-gradient(135deg,#FFD700,#F39C12);color:#000;cursor:pointer;font-weight:900;font-size:13px;box-shadow:0 4px 16px rgba(255,215,0,0.28);white-space:nowrap">+ Nueva</button>
  </div>

  <!-- ── FORM ── -->
  ${showSchdForm ? schdRenderForm() : ""}
  ${showNewAreaForm ? schdRenderNewAreaModal() : ""}

  <!-- ── CONTENT ── -->
  <div style="background:rgba(10,13,24,0.98);border:1px solid rgba(255,255,255,0.05);border-radius:18px;overflow:hidden">
    ${scheduleViewMode==="timeline" ? schdRenderTimeline(dayEvents) : schdRenderGeneral(dayEvents)}
  </div>
  `;

  // Auto-scroll to current hour (skip if editing to prevent jump)
  if(scheduleViewMode==="timeline" && isToday && !_schdSkipAutoScroll){
    setTimeout(()=>{
      const nr=document.getElementById("schd-now-row");
      if(nr) nr.scrollIntoView({behavior:"smooth",block:"center"});
    },200);
  }
  _schdSkipAutoScroll = false;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── WEEK STRIP ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function schdBuildWeekStrip(today) {
  const selDate = new Date(scheduleDate+"T12:00:00");
  const dow = selDate.getDay();
  const mondayOffset = dow===0?-6:1-dow;
  const monday = new Date(selDate);
  monday.setDate(monday.getDate()+mondayOffset);

  const dayNames=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  let html="";
  for(let i=0;i<7;i++){
    const d=new Date(monday);
    d.setDate(monday.getDate()+i);
    const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    const isTdy=ds===today, isSel=ds===scheduleDate;
    const evCount=(data.schedule||[]).filter(e=>e.date===ds).length;
    const dayName=dayNames[d.getDay()];

    html+=`<div class="schd-day-chip ${isTdy?"today":""} ${isSel?"selected":""}" onclick="scheduleDate='${ds}';renderSchedule()">
      <div class="schd-day-chip-name">${dayName}</div>
      <div class="schd-day-chip-num">${d.getDate()}</div>
      <div class="schd-day-chip-dot ${evCount>0?"has-events":""}"></div>
    </div>`;
  }
  return html;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── TIMELINE ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function schdRenderTimeline(events) {
  const isToday = scheduleDate===todayStr();
  const nowEC = new Date(new Date().toLocaleString("en-US",{timeZone:"America/Guayaquil"}));
  const nowMin = nowEC.getHours()*60+nowEC.getMinutes();

  const ROW_H = 64; // px per hour
  const GUTTER = 52; // px for time labels

  // Separate timed vs untimed events
  const timedEvents = events.filter(e => e.startTime && e.endTime);
  const untimedEvents = events.filter(e => !e.startTime || !e.endTime);

  if(timedEvents.length===0){
    // No timed events — show empty state + untimed list
    let untimedHTML = '';
    if(untimedEvents.length > 0){
      const allAreas = getEffectiveAreas();
      untimedHTML = `<div style="padding:14px 16px"><div style="font-size:9px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;display:flex;align-items:center;gap:5px"><span>📌</span><span>Sin horario específico</span></div>`;
      untimedEvents.forEach(ev => {
        const ar = allAreas.find(a=>a.id===ev.area)||AREAS[0];
        const colors = schdGetAreaColors(ev.area);
        const prioLabel = ev.priority ? (ev.priority==='high'?'🔴':ev.priority==='medium'?'🟡':'🟢') : '';
        const isPendingDel = schdPendingDelete===ev.id;
        untimedHTML += `<div class="schd-general-item ${ev.done?'done':''}${isPendingDel?' schd-pending-del':''}"
            onclick="${isPendingDel?'':`schdToggleDone('${ev.id}')`}"
            style="border-left:3px solid ${isPendingDel?'#E74C3C':colors.border}; background:${isPendingDel?'rgba(231,76,60,0.15)':''}">
          ${isPendingDel ? `
          <div style="display:flex;align-items:center;justify-content:center;width:100%;gap:10px">
            <span style="font-size:12px;color:#E74C3C;font-weight:700">¿Eliminar?</span>
            <button onclick="event.stopPropagation();schdDelete('${ev.id}')" style="padding:4px 12px;border-radius:6px;border:none;background:#E74C3C;color:#fff;cursor:pointer;font-weight:700">Sí</button>
            <button onclick="event.stopPropagation();schdPendingDelete=null;renderSchedule()" style="padding:4px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#aaa;cursor:pointer;font-weight:700">No</button>
          </div>
          ` : `
          <div style="width:22px;height:22px;border-radius:6px;border:2px solid ${ev.done?'#2ECC71':colors.border+'88'};background:${ev.done?'rgba(46,204,113,0.18)':'transparent'};display:flex;align-items:center;justify-content:center;font-size:11px;color:#2ECC71;flex-shrink:0">${ev.done?'✓':''}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:${ev.done?'#555':'#ddd'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.title} ${prioLabel}</div>
          </div>
          <div style="display:flex;gap:8px">
            <div onclick="event.stopPropagation();schdOpenEdit('${ev.id}')" style="font-size:13px;cursor:pointer;color:#555">✏️</div>
            <div onclick="event.stopPropagation();schdAskDelete('${ev.id}')" style="font-size:13px;cursor:pointer;color:#555">✕</div>
          </div>
          `}
        </div>`;
      });
      untimedHTML += `</div>`;
    }

    return `<div style="padding:32px 16px;text-align:center">
      <div style="font-size:52px;margin-bottom:14px;opacity:0.15">📅</div>
      <div style="font-size:14px;color:#333;font-weight:800;margin-bottom:6px">Sin actividades con horario</div>
      <div style="font-size:12px;color:#2a2a3a;margin-bottom:18px">Toca <b style="color:#FFD700">+ Nueva</b> para añadir</div>
      ${schdGhostTimeline(GUTTER, ROW_H)}
    </div>${untimedHTML}`;
  }

  // Compute hour range
  const startMins=timedEvents.map(e=>schdTimeToMin(e.startTime));
  const endMins=timedEvents.map(e=>schdTimeToMin(e.endTime)||schdTimeToMin(e.startTime)+30);
  const minHour=Math.max(0, Math.min(6, Math.floor(Math.min(...startMins)/60)-1));
  const maxHour=Math.min(24, Math.max(22, Math.ceil(Math.max(...endMins)/60)+1));

  const totalHours=maxHour-minHour;
  const containerH=totalHours*ROW_H;

  const layout=schdComputeLayout(timedEvents);

  // Build grid lines HTML
  let gridLines="";
  for(let h=minHour;h<=maxHour;h++){
    const top=(h-minHour)*ROW_H;
    const isCur=isToday&&nowEC.getHours()===h;
    // Hour line
    gridLines+=`<div style="position:absolute;left:0;right:0;top:${top}px;display:flex;align-items:flex-start;pointer-events:none">
      <div style="width:${GUTTER}px;flex-shrink:0;font-size:9px;font-weight:${isCur?'800':'600'};color:${isCur?"rgba(255,215,0,0.7)":"rgba(255,255,255,0.2)"};text-align:right;padding-right:10px;padding-top:2px;line-height:1;letter-spacing:0.3px;transition:0.3s">${h===0?"12am":h<12?`${h}am`:h===12?"12pm":`${h-12}pm`}</div>
      <div style="flex:1;border-top:1px solid ${isCur?"rgba(255,215,0,0.18)":"rgba(255,255,255,0.05)"};margin-top:6px"></div>
    </div>`;
    // 30-min divider
    if(h<maxHour){
      const halfTop=top+ROW_H/2;
      gridLines+=`<div style="position:absolute;left:${GUTTER}px;right:0;top:${halfTop}px;border-top:1px dashed rgba(255,255,255,0.03);pointer-events:none"></div>`;
    }
  }

  // Build event blocks
  let evBlocks="";
  layout.forEach(({event:ev,col,totalCols})=>{
    const sMin=schdTimeToMin(ev.startTime);
    const eMin=schdTimeToMin(ev.endTime)||sMin+30;
    const durMin=Math.max(eMin-sMin,15);

    const top=(sMin-minHour*60)/60*ROW_H;
    const height=Math.max(durMin/60*ROW_H-4,20);

    const colW=totalCols>1?`calc((100% - ${(totalCols-1)*4}px)/${totalCols})`:"100%";
    const colLeft=totalCols>1?`calc(${col}*(100% - ${(totalCols-1)*4}px)/${totalCols} + ${col*4}px)`:"0";

    const colors=schdGetAreaColors(ev.area);
    const allAreas=getEffectiveAreas();
    const areaInfo=allAreas.find(a=>a.id===ev.area)||AREAS[0];
    const short=height<34;
    const tall=height>=80;

    const isPendingDel = schdPendingDelete===ev.id;
    const evBg = isPendingDel ? 'rgba(231,76,60,0.2)' :
      `linear-gradient(160deg,${colors.bg.replace('0.78','0.65')} 0%,${colors.bg.replace('0.78','0.38')} 100%)`;

    evBlocks+=`<div class="schd-event ${ev.done?"done":""}${isPendingDel?' schd-pending-del':''}"
        onclick="${isPendingDel?'':`schdToggleDone('${ev.id}')`}"
        oncontextmenu="event.preventDefault();schdOpenEdit('${ev.id}')"
        style="position:absolute;top:${top}px;height:${height}px;left:${colLeft};width:${colW};
          background:${evBg};
          border-left:3px solid ${isPendingDel?'#E74C3C':colors.border};
          border-top:1px solid ${isPendingDel?'rgba(231,76,60,0.3)':colors.border+'22'};
          border-right:1px solid rgba(255,255,255,0.03);
          border-bottom:1px solid rgba(255,255,255,0.03);
          border-radius:0 8px 8px 0;
          box-shadow:0 2px 10px ${colors.glow};
          backdrop-filter:blur(10px);overflow:hidden">
      ${isPendingDel ? `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;gap:6px;padding:0 8px">
        <div style="font-size:10px;color:#E74C3C;font-weight:800">¿Eliminar?</div>
        <button onclick="event.stopPropagation();schdDelete('${ev.id}')" style="padding:3px 10px;border-radius:6px;border:none;background:#E74C3C;color:#fff;cursor:pointer;font-size:10px;font-weight:800;font-family:'Inter',sans-serif">Sí</button>
        <button onclick="event.stopPropagation();schdPendingDelete=null;_schdSkipAutoScroll=true;renderSchedule()" style="padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#aaa;cursor:pointer;font-size:10px;font-weight:700;font-family:'Inter',sans-serif">No</button>
      </div>
      ` : `
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${colors.border}55,transparent);pointer-events:none"></div>
      <div style="padding:${short?'3px 24px 3px 8px':'6px 24px 5px 9px'};height:100%;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box">
        <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;min-width:0">
          ${ev.done?`<span style="font-size:9px;color:#2ECC71;flex-shrink:0;line-height:1">✓</span>`:''}
          <span style="font-size:${short?'10':'11'}px;font-weight:800;color:${ev.done?'rgba(255,255,255,0.45)':'#fff'};text-decoration:${ev.done?'line-through':'none'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,0.5);line-height:1.2">${ev.title}</span>
        </div>
        ${!short?`<div style="margin-top:3px;display:inline-flex;align-items:center;padding:1px 5px;background:rgba(0,0,0,0.28);border-radius:4px;align-self:flex-start;flex-shrink:0"><span style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.55)">${schdFmt(ev.startTime)}–${schdFmt(ev.endTime)}</span></div>`:''}
        ${tall?`<div style="margin-top:4px;display:flex;align-items:center;gap:3px;flex-shrink:0"><span style="font-size:11px;line-height:1">${areaInfo.icon}</span>${ev.priority?`<span style="font-size:8px;font-weight:700;padding:1px 5px;border-radius:4px;background:rgba(0,0,0,0.22);color:${ev.priority==='high'?'#E74C3C':ev.priority==='medium'?'#F39C12':'#2ECC71'}">${ev.priority==='high'?'Alta':ev.priority==='medium'?'Med':'Baja'}</span>`:''}</div>`:''}
        ${tall&&ev.done?`<div style="margin-top:5px;display:inline-flex;align-items:center;gap:3px;padding:2px 7px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.25);border-radius:5px;align-self:flex-start"><span style="font-size:8px;font-weight:700;color:#2ECC71">✓ Completado</span></div>`:''}
      </div>
      <div style="position:absolute;top:3px;right:3px;display:flex;flex-direction:column;gap:1px">
        <div onclick="event.stopPropagation();schdOpenEdit('${ev.id}')" class="schd-ev-edit-btn" style="width:18px;height:18px;border-radius:4px;background:rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;opacity:0;transition:opacity 0.18s">✏️</div>
        <div onclick="event.stopPropagation();schdAskDelete('${ev.id}')" class="schd-ev-del-btn" style="width:18px;height:18px;border-radius:4px;background:rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;color:rgba(255,255,255,0.4);opacity:0.45;transition:opacity 0.18s">✕</div>
      </div>
      `}
    </div>`;
  });

  // Now indicator
  let nowIndicator="";
  if(isToday&&nowMin>=minHour*60&&nowMin<=maxHour*60){
    const nowTop=(nowMin-minHour*60)/60*ROW_H;
    nowIndicator=`<div id="schd-now-row" style="position:absolute;left:${GUTTER-4}px;right:0;top:${nowTop}px;pointer-events:none;z-index:20">
      <div class="schd-now-dot"></div>
      <div class="schd-now-line"></div>
    </div>`;
  }
  // Build untimed events section
  let untimedSection = '';
  if (untimedEvents.length > 0) {
    const allAr = getEffectiveAreas();
    untimedSection = `<div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.04)"><div style="font-size:9px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;display:flex;align-items:center;gap:5px"><span>📌</span><span>Sin horario</span></div>`;
    untimedEvents.forEach(ev => {
      const ar = allAr.find(a=>a.id===ev.area)||AREAS[0];
      const clr = schdGetAreaColors(ev.area);
      const prioL = ev.priority?(ev.priority==='high'?'🔴':ev.priority==='medium'?'🟡':'🟢'):'';
      const isPendingDel = schdPendingDelete===ev.id;
      untimedSection += `<div class="schd-general-item ${ev.done?'done':''}${isPendingDel?' schd-pending-del':''}"
          onclick="${isPendingDel?'':`schdToggleDone('${ev.id}')`}"
          style="border-left:3px solid ${isPendingDel?'#E74C3C':clr.border}; background:${isPendingDel?'rgba(231,76,60,0.15)':''}">
        ${isPendingDel ? `
        <div style="display:flex;align-items:center;justify-content:center;width:100%;gap:10px">
          <span style="font-size:12px;color:#E74C3C;font-weight:700">¿Eliminar?</span>
          <button onclick="event.stopPropagation();schdDelete('${ev.id}')" style="padding:4px 12px;border-radius:6px;border:none;background:#E74C3C;color:#fff;cursor:pointer;font-weight:700">Sí</button>
          <button onclick="event.stopPropagation();schdPendingDelete=null;renderSchedule()" style="padding:4px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#aaa;cursor:pointer;font-weight:700">No</button>
        </div>
        ` : `
        <div style="width:20px;height:20px;border-radius:6px;border:2px solid ${ev.done?'#2ECC71':clr.border+'88'};background:${ev.done?'rgba(46,204,113,0.18)':'transparent'};display:flex;align-items:center;justify-content:center;font-size:10px;color:#2ECC71;flex-shrink:0">${ev.done?'✓':''}</div>
        <div style="flex:1;font-size:13px;font-weight:600;color:${ev.done?'#555':'#ddd'}">${ev.title} ${prioL}</div>
        <div onclick="event.stopPropagation();schdOpenEdit('${ev.id}')" style="font-size:13px;cursor:pointer;color:#555">✏️</div>
        <div onclick="event.stopPropagation();schdAskDelete('${ev.id}')" style="font-size:13px;cursor:pointer;color:#555">✕</div>
        `}
      </div>`;
    });
    untimedSection += `</div>`;
  }

  return `<div style="max-height:72vh;overflow-y:auto;overflow-x:hidden;padding:8px 0" id="schd-scroll-container">
    <div style="position:relative;height:${containerH+24}px;margin:0 12px">
      ${gridLines}
      <!-- Events layer - offset by gutter -->
      <div style="position:absolute;left:${GUTTER}px;right:0;top:0;bottom:0">
        ${evBlocks}
        ${nowIndicator}
      </div>
    </div>
    ${untimedSection}
  </div>`;
}

// Ghost timeline for empty state
function schdGhostTimeline(GUTTER, ROW_H) {
  const hours=[7,8,9,10,11,12];
  let h="";
  h+=`<div style="margin-top:20px;text-align:left">`;
  hours.forEach(hr=>{
    const w=Math.random()*30+20;
    h+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;opacity:${0.06+0.04*(hr-7)}">
      <div style="width:28px;font-size:9px;color:#333;text-align:right;flex-shrink:0">${hr<12?hr+"am":hr===12?"12pm":(hr-12)+"pm"}</div>
      <div style="flex:1;height:1px;background:rgba(255,255,255,0.04)"></div>
    </div>`;
  });
  h+=`</div>`;
  return h;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── GENERAL LIST ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function schdRenderGeneral(events) {
  if(events.length===0){
    return `<div style="padding:36px 16px;text-align:center">
      <div style="font-size:50px;margin-bottom:14px;opacity:0.14">📋</div>
      <div style="font-size:14px;color:#333;font-weight:800;margin-bottom:6px">Sin actividades</div>
      <div style="font-size:12px;color:#2a2a3a">Toca <b style="color:#FFD700">+ Nueva</b> para planear tu día</div>
    </div>`;
  }

  const sorted=[...events].sort((a,b)=>schdTimeToMin(a.startTime)-schdTimeToMin(b.startTime));
  const allAreas=getEffectiveAreas();

  // Group by area
  const byArea={};
  sorted.forEach(ev=>{
    if(!byArea[ev.area]) byArea[ev.area]=[];
    byArea[ev.area].push(ev);
  });

  let html=`<div style="padding:14px;display:flex;flex-direction:column;gap:16px">`;

  allAreas.forEach(area=>{
    if(!byArea[area.id]) return;
    const areaEvents=byArea[area.id];
    const colors=schdGetAreaColors(area.id);
    const done=areaEvents.filter(e=>e.done).length;

    html+=`<div>
      <!-- Area header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 2px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:28px;height:28px;border-radius:8px;background:${colors.bg};border:1px solid ${colors.border}40;display:flex;align-items:center;justify-content:center;font-size:14px">${area.icon}</div>
          <div>
            <div style="font-size:12px;font-weight:800;color:${colors.border};letter-spacing:0.5px">${area.name||area.n}</div>
            <div style="font-size:9px;color:#444;margin-top:1px">${done}/${areaEvents.length} completadas</div>
          </div>
        </div>
        <div style="height:4px;width:60px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${areaEvents.length?(done/areaEvents.length*100):0}%;background:${colors.border};border-radius:3px;transition:0.4s"></div>
        </div>
      </div>

      <!-- Events list -->
      <div style="display:flex;flex-direction:column;gap:5px">`;

    areaEvents.forEach((ev,idx)=>{
      html+=`<div class="schd-general-item ${ev.done?"done":""}" onclick="schdToggleDone('${ev.id}')"
          style="animation-delay:${idx*0.04}s;border-left:3px solid ${colors.border}60">
        <div style="width:36px;height:36px;border-radius:10px;background:${ev.done?"rgba(46,204,113,0.15)":colors.bg};border:1px solid ${colors.border}30;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;transition:0.2s">
          ${ev.done?"✅":area.icon}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:${ev.done?"#555":"#ddd"};text-decoration:${ev.done?"line-through":"none"};margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.title}</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:700;background:rgba(0,0,0,0.3);color:#888">${ev.startTime&&ev.endTime?'⏰ '+schdFmt(ev.startTime)+' — '+schdFmt(ev.endTime):'Sin hora'}</span>
            ${ev.priority ? `<span style="font-size:9px;font-weight:700;color:${ev.priority==='high'?'#E74C3C':ev.priority==='medium'?'#F39C12':'#2ECC71'}">${ev.priority==='high'?'🔴 Alta':ev.priority==='medium'?'🟡 Media':'🟢 Baja'}</span>` : ''}
            ${ev.description?`<span style="font-size:10px;color:#3a3a4a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${ev.description}</span>`:""}
          </div>
        </div>
        <div style="display:flex;gap:3px;flex-shrink:0">
          <button onclick="event.stopPropagation();schdOpenEdit('${ev.id}')" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:#555;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:0.2s">✏️</button>
          ${schdPendingDelete===ev.id
            ? `<button onclick="event.stopPropagation();schdDelete('${ev.id}')" style="background:rgba(231,76,60,0.25);border:1px solid rgba(231,76,60,0.6);color:#E74C3C;width:60px;height:30px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:800;font-family:'Inter',sans-serif;transition:0.2s">¿Borrar?</button>`
            : `<button onclick="event.stopPropagation();schdAskDelete('${ev.id}')" style="background:rgba(231,76,60,0.06);border:1px solid rgba(231,76,60,0.15);color:#E74C3C88;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:0.2s">🗑️</button>`
          }
        </div>
      </div>`;
    });

    html+=`</div></div>`;
  });

  html+=`</div>`;
  return html;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── EVENT FORM ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function schdRenderForm() {
  const editing = schdEditId!==null;
  const allAreas = getEffectiveAreas();

  let areasHTML="";
  allAreas.forEach(a=>{
    const colors=schdGetAreaColors(a.id);
    const sel=schdArea===a.id;
    areasHTML+=`<button onclick="schdArea='${a.id}';renderSchedule()"
      style="flex-shrink:0;padding:8px 9px;border-radius:11px;border:1.5px solid ${sel?colors.border:"rgba(255,255,255,0.07)"};background:${sel?colors.bg:"rgba(0,0,0,0.2)"};cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:56px;transition:all 0.2s;box-shadow:${sel?"0 4px 12px "+colors.glow:"none"}">
      <span style="font-size:18px">${a.icon}</span>
      <span style="font-size:8px;color:${sel?"#fff":"#555"};font-weight:700;font-family:'Inter',sans-serif;text-align:center;line-height:1.1">${(a.name||a.n).slice(0,7)}</span>
    </button>`;
  });

  // "+" button to add custom area
  areasHTML+=`<button onclick="showNewAreaForm=true;renderSchedule()"
    style="flex-shrink:0;padding:8px 9px;border-radius:11px;border:1.5px dashed rgba(255,215,0,0.25);background:rgba(255,215,0,0.03);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:52px;transition:all 0.2s">
    <span style="font-size:18px">➕</span>
    <span style="font-size:8px;color:rgba(255,215,0,0.4);font-weight:700;font-family:'Inter',sans-serif">Nueva</span>
  </button>`;

  // Priority selector
  const PRIO_OPTS = [
    {id:'',    label:'— Ninguna', color:'#555'},
    {id:'high',label:'🔴 Alta',   color:'#E74C3C'},
    {id:'medium',label:'🟡 Media',color:'#F39C12'},
    {id:'low', label:'🟢 Baja',   color:'#2ECC71'},
  ];
  let prioHTML = '';
  PRIO_OPTS.forEach(p => {
    const sel = schdPriority === p.id;
    prioHTML += `<button onclick="schdPriority='${p.id}';renderSchedule()"
      style="flex:1;padding:8px 4px;border-radius:10px;border:1.5px solid ${sel ? p.color : 'rgba(255,255,255,0.07)'};background:${sel ? p.color+'18' : 'rgba(0,0,0,0.2)'};color:${sel ? p.color : '#555'};cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif;transition:all 0.2s;white-space:nowrap">${p.label}</button>`;
  });

  const hasTime = schdStart || schdEnd;

  return `<div style="background:linear-gradient(135deg,rgba(16,20,36,0.99),rgba(10,13,28,0.99));border:1px solid rgba(255,215,0,0.18);border-radius:18px;padding:18px;margin-bottom:10px;box-shadow:0 8px 32px rgba(0,0,0,0.4)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-size:14px;font-weight:800;color:#FFD700">${editing?"✏️ Editar actividad":"➕ Nueva actividad"}</span>
      <button onclick="schdCloseForm()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#555;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
    </div>

    <div style="margin-bottom:12px">
      <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Nombre *</div>
      <input id="schd-title-inp" class="inp" placeholder="Ej: Estudiar Cálculo, Gym, Reunión..." value="${schdTitle}" oninput="schdTitle=this.value" onkeydown="if(event.key==='Enter')schdSave()" style="font-size:15px;padding:12px;background:rgba(0,0,0,0.4)"/>
    </div>

    <!-- Time (optional) -->
    <div style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px">⏰ Horario <span style="color:#333;text-transform:none;letter-spacing:0">(opcional)</span></div>
        <button onclick="schdStart=schdStart?'':'08:00';schdEnd=schdEnd?'':'09:00';renderSchedule()"
          style="font-size:10px;font-weight:700;color:${hasTime?'#FFD700':'#555'};background:${hasTime?'rgba(255,215,0,0.08)':'rgba(255,255,255,0.04)'};border:1px solid ${hasTime?'rgba(255,215,0,0.3)':'rgba(255,255,255,0.08)'};border-radius:8px;padding:4px 10px;cursor:pointer;font-family:'Inter',sans-serif;transition:0.2s">
          ${hasTime?'⏰ Con hora':'+ Agregar hora'}
        </button>
      </div>
      ${hasTime ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <div style="font-size:9px;color:#444;font-weight:700;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px">Inicio</div>
          <input id="schd-start-inp" class="inp" type="time" value="${schdStart}" oninput="schdStart=this.value" style="padding:11px;font-size:15px;background:rgba(0,0,0,0.4)"/>
        </div>
        <div>
          <div style="font-size:9px;color:#444;font-weight:700;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.5px">Fin</div>
          <input id="schd-end-inp" class="inp" type="time" value="${schdEnd}" oninput="schdEnd=this.value" style="padding:11px;font-size:15px;background:rgba(0,0,0,0.4)"/>
        </div>
      </div>` : `<div style="padding:10px 12px;border-radius:10px;background:rgba(0,0,0,0.2);border:1px dashed rgba(255,255,255,0.06);text-align:center;font-size:11px;color:#333">Sin hora específica — aparecerá en General</div>`}
    </div>

    <div style="margin-bottom:12px">
      <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Área</div>
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none">${areasHTML}</div>
    </div>

    <div style="margin-bottom:12px">
      <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🚦 Prioridad</div>
      <div style="display:flex;gap:6px">${prioHTML}</div>
    </div>

    <div style="margin-bottom:16px">
      <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Descripción (opcional)</div>
      <input id="schd-desc-inp" class="inp" placeholder="Notas adicionales..." value="${schdDesc}" oninput="schdDesc=this.value" style="font-size:13px;padding:11px;background:rgba(0,0,0,0.4)"/>
    </div>

    <div style="display:flex;gap:8px">
      <button onclick="schdCloseForm()" style="flex:1;padding:13px;border-radius:13px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#666;cursor:pointer;font-weight:700;font-size:13px">Cancelar</button>
      <button onclick="schdSave()" style="flex:2;padding:13px;border-radius:13px;border:none;background:linear-gradient(135deg,#FFD700,#F39C12);color:#000;cursor:pointer;font-weight:800;font-size:14px;box-shadow:0 4px 16px rgba(255,215,0,0.3)">
        ${editing?"💾 Guardar cambios":"🗓️ Agregar actividad"}
      </button>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── NEW AREA MODAL ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function schdRenderNewAreaModal() {
  let paletteHTML="";
  SCHD_PALETTE.forEach(c=>{
    const sel=schdNewAreaColor===c;
    paletteHTML+=`<div onclick="schdNewAreaColor='${c}';renderSchedule()"
      style="width:28px;height:28px;border-radius:8px;background:${c};cursor:pointer;border:2px solid ${sel?"#fff":"transparent"};transition:0.2s;box-shadow:${sel?"0 0 8px "+c+"80":"none"}"></div>`;
  });

  return `<div style="background:linear-gradient(135deg,rgba(20,16,40,0.99),rgba(14,10,28,0.99));border:1px solid rgba(171,71,188,0.3);border-radius:18px;padding:18px;margin-bottom:10px;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-size:14px;font-weight:800;color:#AB47BC">✨ Nueva área personalizada</span>
      <button onclick="showNewAreaForm=false;renderSchedule()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#555;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px">✕</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 80px;gap:8px;margin-bottom:12px">
      <div>
        <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Nombre *</div>
        <input id="schd-area-name" class="inp" placeholder="Ej: Novia, Gimnasio, Música..." value="${schdNewAreaName}" oninput="schdNewAreaName=this.value" style="font-size:14px;padding:11px;background:rgba(0,0,0,0.4)"/>
      </div>
      <div>
        <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Icono</div>
        <input id="schd-area-icon" class="inp" maxlength="4" placeholder="⭐" value="${schdNewAreaIcon}" oninput="schdNewAreaIcon=this.value" style="font-size:22px;text-align:center;padding:8px;background:rgba(0,0,0,0.4)"/>
      </div>
    </div>

    <div style="margin-bottom:16px">
      <div style="font-size:10px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Color</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">${paletteHTML}</div>
    </div>

    <!-- Preview -->
    <div style="margin-bottom:16px;padding:10px 13px;border-radius:11px;border:1px solid ${schdNewAreaColor}30;background:${schdNewAreaColor}10;display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;border-radius:9px;background:${schdNewAreaColor}CC;border:1px solid ${schdNewAreaColor}60;display:flex;align-items:center;justify-content:center;font-size:18px">${schdNewAreaIcon}</div>
      <div style="font-size:13px;font-weight:700;color:${schdNewAreaColor}">${schdNewAreaName||"Mi área"}</div>
    </div>

    <div style="display:flex;gap:8px">
      <button onclick="showNewAreaForm=false;renderSchedule()" style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#666;cursor:pointer;font-weight:700">Cancelar</button>
      <button onclick="schdCreateArea()" style="flex:2;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#AB47BC,#7B1FA2);color:#fff;cursor:pointer;font-weight:800;font-size:14px">✨ Crear área</button>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ACTIONS ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function schdOpenForm() {
  _schdSkipAutoScroll = true;
  showSchdForm=true; schdEditId=null;
  schdTitle=""; schdStart=""; schdEnd=""; schdArea="int"; schdDesc=""; schdPriority="";
  renderSchedule();
  setTimeout(()=>{ const inp=document.getElementById("schd-title-inp"); if(inp)inp.focus(); },100);
}

function schdOpenEdit(id) {
  const ev=(data.schedule||[]).find(e=>e.id===id); if(!ev) return;
  // Save scroll position to prevent jump
  const scrollEl = document.getElementById('schd-scroll-container');
  const savedScroll = scrollEl ? scrollEl.scrollTop : 0;
  _schdSkipAutoScroll = true;
  showSchdForm=true; schdEditId=id;
  schdTitle=ev.title; schdStart=ev.startTime||"";
  schdEnd=ev.endTime||""; schdArea=ev.area; schdDesc=ev.description||"";
  schdPriority=ev.priority||"";
  renderSchedule();
  // Restore scroll position
  setTimeout(()=>{
    const newScrollEl = document.getElementById('schd-scroll-container');
    if(newScrollEl) newScrollEl.scrollTop = savedScroll;
    const inp=document.getElementById("schd-title-inp"); if(inp)inp.focus();
  },50);
}

function schdCloseForm() {
  _schdSkipAutoScroll = true;
  showSchdForm=false; schdEditId=null; showNewAreaForm=false;
  renderSchedule();
}

function schdSave() {
  const title=(document.getElementById("schd-title-inp")?.value||schdTitle).trim();
  const start=(document.getElementById("schd-start-inp")?.value||schdStart).trim();
  const end=(document.getElementById("schd-end-inp")?.value||schdEnd).trim();
  const desc=(document.getElementById("schd-desc-inp")?.value||schdDesc).trim();

  if(!title){ flash("⚠️ Escribe un nombre para la actividad","xp"); return; }
  // Time is optional — only validate if both are set
  if(start && end && schdTimeToMin(start)>=schdTimeToMin(end)){
    flash("⚠️ La hora de fin debe ser mayor al inicio","xp"); return;
  }

  if(!data.schedule) data.schedule=[];

  if(schdEditId){
    // Edit existing event
    const idx=data.schedule.findIndex(e=>e.id===schdEditId);
    if(idx>=0){
      const ev=data.schedule[idx];
      data.schedule[idx]={...ev,title,startTime:start||null,endTime:end||null,area:schdArea,priority:schdPriority||null,description:desc};
      // Sync linked todo title
      if(ev.todoId){
        const todo=(data.todos||[]).find(t=>t.id===ev.todoId);
        if(todo){ todo.text=title; todo.area=schdArea; }
      }
    }
    flash("✅ Actividad actualizada","success");
  } else {
    // Create new event
    const eventId=Date.now().toString();
    const todoId=(Date.now()+1).toString();

    const newEv={
      id:eventId,
      title,
      date:scheduleDate||todayStr(),
      startTime:start||null,
      endTime:end||null,
      area:schdArea,
      priority:schdPriority||null,
      description:desc,
      done:false,
      todoId:todoId,
      createdAt:Date.now()
    };
    data.schedule.push(newEv);

    // Create linked todo in tasks section
    const dif=TD.find(x=>x.id==="medium")||TD[0];
    const linkedTodo={
      id:todoId,
      text:title,
      diff:"medium",
      area:schdArea,
      xp:dif.xp,
      done:false,
      date:scheduleDate||todayStr(),
      scheduleEventId:eventId
    };
    if(!data.todos) data.todos=[];
    data.todos.push(linkedTodo);

    flash(`🗓️ "${title}" agregado a tu agenda y tareas!`,"success");
    if(typeof setMoodTmp==="function") setMoodTmp("working",2000);
  }

  showSchdForm=false; schdEditId=null;
  schdTitle=""; schdStart=""; schdEnd=""; schdArea="int"; schdDesc=""; schdPriority="";

  if(typeof schedSave==="function") schedSave();
  _schdSkipAutoScroll = true;
  renderSchedule();
}

function schdToggleDone(id) {
  const ev=(data.schedule||[]).find(e=>e.id===id); if(!ev) return;
  ev.done=!ev.done;

  if(ev.done){
    const xp=5;
    if(typeof data!=="undefined"&&data){
      data.xp=(data.xp||0)+xp;
      if(data.stats&&ev.area) data.stats[ev.area]=(data.stats[ev.area]||0)+xp;
    }
    flash(`✅ +${xp}XP — ${ev.title}`,"xp");
    if(typeof setMoodTmp==="function") setMoodTmp("celebrate",2000);
  } else {
    const xp=5;
    if(typeof data!=="undefined"&&data){
      data.xp=Math.max(0,(data.xp||0)-xp);
      if(data.stats&&ev.area) data.stats[ev.area]=Math.max(0,(data.stats[ev.area]||0)-xp);
    }
  }

  // Sync linked todo
  if(ev.todoId){
    const todo=(data.todos||[]).find(t=>t.id===ev.todoId);
    if(todo&&todo.done!==ev.done) todo.done=ev.done;
  }

  if(typeof schedSave==="function") schedSave();
  _schdSkipAutoScroll = true;
  if(typeof render==="function") render(); else renderSchedule();
}

function schdAskDelete(id) {
  _schdSkipAutoScroll = true;
  schdPendingDelete = id;
  renderSchedule();
  // Auto-cancel after 4s if user doesn't confirm
  setTimeout(() => { if(schdPendingDelete===id){ schdPendingDelete=null; _schdSkipAutoScroll=true; renderSchedule(); } }, 4000);
}

function schdDelete(id) {
  const ev=(data.schedule||[]).find(e=>e.id===id);
  // Remove linked todo too
  if(ev&&ev.todoId){
    data.todos=(data.todos||[]).filter(t=>t.id!==ev.todoId);
  }
  data.schedule=(data.schedule||[]).filter(e=>e.id!==id);
  schdPendingDelete=null;
  flash("🗑️ Actividad eliminada","success");
  if(typeof schedSave==="function") schedSave();
  _schdSkipAutoScroll = true;
  renderSchedule();
}

function schdOffsetDate(days) {
  const d=new Date((scheduleDate||todayStr())+"T12:00:00Z");
  d.setUTCDate(d.getUTCDate()+days);
  scheduleDate=d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0");
  renderSchedule();
}

function schdGoToday() { scheduleDate=todayStr(); renderSchedule(); }

function schdCreateArea() {
  const nameInp=document.getElementById("schd-area-name");
  const iconInp=document.getElementById("schd-area-icon");
  const name=(nameInp?nameInp.value:schdNewAreaName).trim();
  const icon=(iconInp?iconInp.value:schdNewAreaIcon).trim()||"⭐";

  if(!name){ flash("⚠️ Escribe un nombre para el área","xp"); return; }

  if(!data.customAreas) data.customAreas=[];
  const newArea={
    id:"ca_"+Date.now(),
    name, n:name,    // n for compatibility with AREAS structure
    icon,
    color: schdNewAreaColor,
    c: schdNewAreaColor  // c for compatibility
  };
  data.customAreas.push(newArea);

  // Set as selected area
  schdArea=newArea.id;
  showNewAreaForm=false;
  schdNewAreaName=""; schdNewAreaIcon="⭐"; schdNewAreaColor="#E91E63";

  flash(`✨ Área "${name}" creada!`,"success");
  if(typeof schedSave==="function") schedSave();
  _schdSkipAutoScroll = true;
  renderSchedule();
}
