// ══════════════════════════════════════════════════════════════════════════════
// LifeControl RPG — Vanilla JS App + Firebase Sync
// ══════════════════════════════════════════════════════════════════════════════

const SK = "fin-rpg-v6";
const BAK = ["fin-rpg-bak-1","fin-rpg-bak-2","fin-rpg-bak-3"];
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
let saveTimeout = null;
let shopText = "";
let shopCat = "frutas";
let shopQty = "";
let shopFilter = "all";
let remText = "";
let remPri = "medium";
let remDate = "";
let showRemForm = false;

// ── Utils ────────────────────────────────────────────────────────────────────
function fmt(n){return "$"+(n||0).toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}
function fS(n){return "$"+(n||0).toLocaleString("en",{minimumFractionDigits:0,maximumFractionDigits:0})}
function todayStr(){return new Date().toISOString().slice(0,10)}
function dateToStr(d){return d.toISOString().slice(0,10)}
function $(id){return document.getElementById(id)}

function mkInit() {
  const b = {
    months:{}, cq:{}, xp:0, sa:{}, todos:[], hist:[],
    stats:{str:0,int:0,vit:0,luk:0,cha:0},
    avatar:{hair:"messy",hairColor:"brown",skin:"medium",eyeColor:"brown",outfit:"tshirt",outfitColor:"blue",accessory:"none"},
    shopList:[],
    reminders:[]
  };
  MS.forEach(m=>{b.months[m]={income:{},expenses:{},accounts:{}};});
  return b;
}

// ── Guardado robusto (local) ─────────────────────────────────────────────────
function localSave(d) {
  const s = JSON.stringify(d);
  try{localStorage.setItem(SK,s);}catch(e){}
  BAK.forEach(k=>{try{localStorage.setItem(k,s);}catch(e){}});
  const today = todayStr();
  try{localStorage.setItem(`fin-rpg-daily-${today}`,s);}catch(e){}
  try{
    for(let i=8;i<=30;i++){
      const dd=new Date();dd.setDate(dd.getDate()-i);
      localStorage.removeItem(`fin-rpg-daily-${dateToStr(dd)}`);
    }
  }catch(e){}
}

function localLoad() {
  const sources = [
    ()=>localStorage.getItem(SK),
    ...BAK.map(k=>()=>localStorage.getItem(k)),
  ];
  for(let i=0;i<8;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    sources.push(()=>localStorage.getItem(`fin-rpg-daily-${dateToStr(d)}`));
  }
  for(const src of sources){
    try{const v=src();if(v){const d=JSON.parse(v);if(d&&typeof d==='object'&&(d.months||d.avatar||d.xp!==undefined))return d;}}catch(e){}
  }
  return null;
}

// ── Firebase REST API ────────────────────────────────────────────────────────
async function cloudSave(d) {
  if(!playerCode) return false;
  try {
    syncStatus="syncing"; updateSyncUI();
    const resp = await fetch(`${FB_URL}/players/${playerCode}.json`, {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(d)
    });
    if(resp.ok) {
      syncStatus="online";
      lastCloudSync=new Date();
      updateSyncUI();
      return true;
    }
    syncStatus="error"; updateSyncUI();
    return false;
  } catch(e) {
    syncStatus="offline"; updateSyncUI();
    return false;
  }
}

async function cloudLoad() {
  if(!playerCode) return null;
  try {
    syncStatus="syncing"; updateSyncUI();
    const resp = await fetch(`${FB_URL}/players/${playerCode}.json`);
    if(resp.ok) {
      const d = await resp.json();
      // Accept any object with data (Firebase deletes empty objects like months:{})
      if(d && typeof d === 'object' && (d.months || d.avatar || d.xp !== undefined || d.todos || d.shopList)) {
        syncStatus="online";
        lastCloudSync=new Date();
        updateSyncUI();
        return d;
      }
    }
    syncStatus="online"; updateSyncUI();
    return null;
  } catch(e) {
    syncStatus="offline"; updateSyncUI();
    return null;
  }
}

// Ensure all required data structures exist (Firebase deletes empty objects)
function ensureData(d) {
  if(!d) return mkInit();
  if(!d.months) d.months={};
  MS.forEach(m=>{ 
    if(!d.months[m]) d.months[m]={};
    if(!d.months[m].income) d.months[m].income={};
    if(!d.months[m].expenses) d.months[m].expenses={};
    if(!d.months[m].accounts) d.months[m].accounts={};
  });
  if(!d.stats) d.stats={str:0,int:0,vit:0,luk:0,cha:0};
  if(!d.avatar) d.avatar={hair:"messy",hairColor:"brown",skin:"medium",eyeColor:"brown",outfit:"tshirt",outfitColor:"blue",accessory:"none"};
  if(!d.todos) d.todos=[];
  if(!d.hist) d.hist=[];
  if(!d.shopList) d.shopList=[];
  if(!d.reminders) d.reminders=[];
  if(!d.cq) d.cq={};
  if(!d.sa) d.sa={};
  if(d.xp === undefined) d.xp=0;
  return d;
}

function updateSyncUI() {
  const el = $("sync-indicator");
  if(!el) return;
  const icons = {online:"🟢", syncing:"🔄", offline:"🟠", error:"🔴"};
  const labels = {online:"Sincronizado", syncing:"Sincronizando...", offline:"Sin conexión", error:"Error de sync"};
  el.innerHTML = `<span onclick="forceSync()" style="cursor:pointer">${icons[syncStatus]||"⚪"} <span style="font-size:10px;color:#666">${labels[syncStatus]||""}</span></span>`;
}

async function forceSync() {
  flash("🔄 Sincronizando...","success");
  const remote = await cloudLoad();
  if(remote) {
    data = ensureData(remote);
    localSave(data);
    flash("✅ Datos sincronizados desde la nube","success");
    render();
  } else {
    flash("⚠️ No se pudo conectar con la nube","xp");
  }
}

// ── Save functions ──────────────────────────────────────────────────────────
// ONLY schedSave stamps _lastModified (called by user actions)
function schedSave(){
  if(saveTimeout) clearTimeout(saveTimeout);
  saveTimeout=setTimeout(()=>{
    data._lastModified = Date.now(); // ONLY stamp here — actual user change
    localSave(data);
    cloudSave(data);
    lastSaved=new Date();
    render();
  },400);
}

// ── Periodic cloud sync (pull remote changes) ────────────────────────────────
async function pullFromCloud() {
  if(!playerCode || !data) return;
  const remote = await cloudLoad();
  if(remote) {
    const localTs = data._lastModified || 0;
    const remoteTs = remote._lastModified || 0;
    if(remoteTs > localTs) {
      data = ensureData(remote);
      localSave(data);
      render();
    }
  }
}

// ── Login ────────────────────────────────────────────────────────────────────
function loginWithCode() {
  const input = $("login-code-input");
  const code = (input?.value||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"");
  if(!code || code.length < 3) {
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

  if(cloud && local) {
    data = cloudTs >= localTs ? cloud : local;
  } else if(cloud) {
    data = cloud;
  } else if(local) {
    data = local;
  } else {
    data = mkInit();
  }

  // Ensure all data structures exist (Firebase deletes empty objects)
  data = ensureData(data);

  // Only save locally on load — do NOT push to cloud (to avoid overwriting newer data)
  localSave(data);
  // Only push to cloud if this is brand new data (no timestamp yet)
  if(!data._lastModified) {
    data._lastModified = Date.now();
    cloudSave(data);
  }

  // Show app
  $("loading").style.display = "none";
  $("app").style.display = "block";
  render();
  checkQuests();

  // Start avatar animation
  function tick(){
    aFrame++;
    const level = Math.floor((data.xp||0)/10)+1;
    $("avatar-container").innerHTML = renderAvatar(data.avatar,level,getAutoMood(),72,aFrame);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Periodic LOCAL-only save every 60s (safety net, does NOT push to cloud)
  setInterval(()=>{ if(data) localSave(data); }, 60000);

  // Periodic cloud pull every 5s (sync from other devices)
  cloudSyncInterval = setInterval(pullFromCloud, 5000);

  // Save locally on tab hide / close (does NOT push to cloud with new timestamp)
  const saveNow = ()=>{ if(data) localSave(data); };
  document.addEventListener("visibilitychange", saveNow);
  window.addEventListener("beforeunload", saveNow);
}

function logout() {
  if(!confirm("¿Cerrar sesión? Tus datos se mantienen guardados en la nube.")) return;
  if(cloudSyncInterval) clearInterval(cloudSyncInterval);
  playerCode = null;
  localStorage.removeItem("lc-player-code");
  $("app").style.display = "none";
  $("login-screen").style.display = "flex";
  $("login-code-input").value = "";
}

// ── Cálculos ─────────────────────────────────────────────────────────────────
function calcM(d,m){
  const md=d.months[m]||{};
  const inc=Object.values(md.income||{}).reduce((a,b)=>a+b,0);
  let exp=0;
  Object.values(md.expenses||{}).forEach(g=>Object.values(g).forEach(v=>exp+=v));
  const accs=Object.values(md.accounts||{}).reduce((a,b)=>a+b,0);
  return {inc,exp,bal:inc-exp,accs};
}

// ── Get starting amounts for a given month ──────────────────────────────────
// For the first month with data or if no previous month has accounts, use data.sa.
// Otherwise, use the account values from the previous month as starting balances.
function getStartAmounts(d, m) {
  const mi = MS.indexOf(m);
  if(mi <= 0) {
    // January or unknown month: use global initial balances
    return Object.assign({}, d.sa || {});
  }
  // Check if previous month has account data
  const prevMonth = MS[mi - 1];
  const prevAccounts = d.months[prevMonth]?.accounts || {};
  const hasData = Object.values(prevAccounts).some(v => v > 0);
  if(hasData) {
    // Use previous month's final account values as starting balances
    return Object.assign({}, prevAccounts);
  }
  // No data in previous month: recurse back further
  return getStartAmounts(d, prevMonth);
}

function getStatLv(xp){return Math.floor((xp||0)/20)+1}
function getStatPct(xp){const lv=getStatLv(xp);return(((xp||0)-(lv-1)*20)/20)*100}

// ── Mood ─────────────────────────────────────────────────────────────────────
function getAutoMood(){
  if(fMood) return fMood;
  const ct=calcM(data,month);
  const h=new Date().getHours();
  if(h>=23||h<6) return "sleeping";
  if(ct.bal<0&&ct.exp>0) return "sad";
  if(ct.inc>0&&ct.exp>ct.inc*0.9) return "angry";
  if(ct.inc>0&&ct.bal>0&&ct.bal/ct.inc>0.3) return "money";
  const tds=(data.todos||[]).filter(x=>x.date===todayStr());
  if(tds.length>0&&tds.filter(x=>!x.done).length>0) return "working";
  if(view==="history") return "thinking";
  return "idle";
}

function setMoodTmp(m,dur){
  fMood=m;
  if(moodTimeout) clearTimeout(moodTimeout);
  moodTimeout=setTimeout(()=>{fMood=null;render();},dur||2500);
  render();
}

// ── Toast ────────────────────────────────────────────────────────────────────
function flash(msg,type){
  const t=$("toast");
  t.textContent=msg;
  t.className="toast";
  t.style.display="block";
  t.style.borderColor=type==="xp"?"#FFD700":"#2ECC71";
  t.style.color=type==="xp"?"#FFD700":"#2ECC71";
  if(type==="xp") showParticles();
  if(toastTimeout) clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>{t.style.display="none";},3500);
}

function showParticles(){
  const c=$("particles");
  const colors=["#FFD700","#E74C3C","#2ECC71","#3498DB","#9B59B6"];
  c.innerHTML="";c.style.display="block";
  for(let i=0;i<20;i++){
    const p=document.createElement("div");
    p.className="particle";
    p.style.left=Math.random()*100+"%";
    p.style.top=Math.random()*80+"%";
    p.style.background=colors[i%5];
    p.style.setProperty("--dur",(1+Math.random()*2)+"s");
    p.style.setProperty("--delay",Math.random()*0.4+"s");
    c.appendChild(p);
  }
  setTimeout(()=>{c.style.display="none";c.innerHTML="";},3000);
}

// ── Quests ────────────────────────────────────────────────────────────────────
function checkQuests(){
  if(!data) return;
  QS.forEach(q=>{
    const k=month+"-"+q.id;
    if(!data.cq[k]&&q.ck(data,month)){
      data.xp=(data.xp||0)+q.xp;
      data.cq[k]=true;
      flash("🎯 "+q.n+" (+"+q.xp+"XP)","xp");
      setMoodTmp("celebrate",3000);
      schedSave();
    }
  });
}

// ── Save income ──────────────────────────────────────────────────────────────
function saveInc(id,amt,note){
  const cat=IC.find(x=>x.id===id);
  const entry={id:Date.now().toString(),date:new Date().toISOString(),month,type:"income",catId:id,catName:cat?.name||id,icon:cat?.icon||"💰",amount:amt,note};
  if(!data.months[month].income) data.months[month].income = {};
  const prevInc=data.months[month].income[id]||0;
  data.months[month].income[id]=prevInc+amt;
  data.hist=[entry,...(data.hist||[])].slice(0,500);
  closeModal();
  setMoodTmp("money",2500);
  flash(`💰 ${cat?.name}: ${fmt(amt)}`,"success");
  schedSave();
  checkQuests();
  render();
}

// ── Save expense ─────────────────────────────────────────────────────────────
function saveExp(gid,cid,amt,note){
  let gn="",cn="",gi="📦";
  for(let i=0;i<EG.length;i++){if(EG[i].id===gid){gn=EG[i].name;gi=EG[i].icon;for(let j=0;j<EG[i].cats.length;j++){if(EG[i].cats[j].id===cid)cn=EG[i].cats[j].name;}}}
  const entry={id:Date.now().toString(),date:new Date().toISOString(),month,group:gid,cat:cid,amount:amt,note,groupName:gn,catName:cn,icon:gi};
  if(!data.months[month].expenses) data.months[month].expenses={};
  if(!data.months[month].expenses[gid]) data.months[month].expenses[gid]={};
  data.months[month].expenses[gid][cid]=(data.months[month].expenses[gid][cid]||0)+amt;
  data.hist=[entry,...(data.hist||[])].slice(0,500);
  closeModal();
  setMoodTmp(amt>100?"angry":"thinking",1800);
  flash(`📝 ${cn}: ${fmt(amt)}`);
  schedSave();
  checkQuests();
  render();
}

// ── Accounts ─────────────────────────────────────────────────────────────────
function updateAccPending(id, value){
  pendingAccs[id] = value;
  // Update only the save button state without re-rendering entire DOM
  const btn = document.querySelector(`[data-acc-save="${id}"]`);
  if(btn) {
    btn.disabled = false;
    btn.style.background = '#1ABC9C';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
  }
  // Update input border
  const inp = document.querySelector(`[data-acc-input="${id}"]`);
  if(inp) inp.style.borderColor = 'rgba(255,215,0,0.35)';
}
function updateStartPending(id, value){
  pendingStarts[id] = value;
  // Show save button without re-rendering
  const container = document.querySelector(`[data-start-container="${id}"]`);
  if(container) {
    let btn = container.querySelector('.start-save-btn');
    if(!btn) {
      btn = document.createElement('button');
      btn.className = 'start-save-btn';
      btn.onclick = () => confirmStart(id);
      btn.style.cssText = 'margin-top:6px;width:100%;padding:6px;border-radius:7px;border:none;background:rgba(255,215,0,0.15);color:#FFD700;cursor:pointer;font-weight:700;font-size:11px';
      btn.textContent = '✓ Guardar';
      container.appendChild(btn);
    }
  }
  const inp = document.querySelector(`[data-start-input="${id}"]`);
  if(inp) inp.style.borderColor = 'rgba(255,215,0,0.3)';
}
function confirmAcc(id){
  const v=pendingAccs[id];
  if(v===undefined) return;
  if(!data.months[month].accounts) data.months[month].accounts={};
  data.months[month].accounts[id]=parseFloat(v)||0;
  delete pendingAccs[id];
  flash("✅ Saldo actualizado","success");
  schedSave();checkQuests();render();
}
function confirmStart(id){
  const v=pendingStarts[id];
  if(v===undefined) return;
  data.sa[id]=parseFloat(v)||0;
  delete pendingStarts[id];
  flash("✅ Saldo inicial guardado","success");
  schedSave();render();
}

// ── Todos ────────────────────────────────────────────────────────────────────
function addTodo(){
  const input=$("todo-input");
  const text=input?input.value.trim():"";
  if(!text) return;
  const d=TD.find(x=>x.id===todoDif)||TD[0];
  data.todos=[...(data.todos||[]),{id:Date.now().toString(),text,diff:todoDif,area:todoArea,xp:d.xp,done:false,date:todoDate}];
  if(input) input.value="";
  todoText="";
  schedSave();checkQuests();render();
}
function toggleTodo(id){
  const todo=(data.todos||[]).find(x=>x.id===id);if(!todo) return;
  if(!todo.done){
    flash(`✅ +${todo.xp}XP`,"xp");setMoodTmp("celebrate",2000);
    data.xp=(data.xp||0)+todo.xp;
    data.stats[todo.area]=(data.stats[todo.area]||0)+todo.xp;
    todo.done=true;
  } else {
    data.xp=Math.max(0,(data.xp||0)-todo.xp);
    data.stats[todo.area]=Math.max(0,(data.stats[todo.area]||0)-todo.xp);
    todo.done=false;
  }
  schedSave();checkQuests();render();
}
function deleteTodo(id){
  data.todos=(data.todos||[]).filter(x=>x.id!==id);
  schedSave();render();
}
function dateOffset(days){
  const d=new Date(todoDate+"T12:00:00Z");
  d.setUTCDate(d.getUTCDate()+days);
  todoDate=d.toISOString().slice(0,10);
  render();
}

// ── Export / Import ──────────────────────────────────────────────────────────
function exportData(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`lifecontrol_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();
  URL.revokeObjectURL(url);
  flash("Datos exportados","success");
}
function importData(e){
  const file=e.target.files[0];if(!file) return;
  const reader=new FileReader();
  reader.onload=(ev)=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(d&&d.months){data=d;flash("Backup restaurado!","success");schedSave();render();}
    }catch(err){flash("Error al restaurar","error");}
  };
  reader.readAsText(file);
}

// ── Shopping List ────────────────────────────────────────────────────────────
function addShopItem(){
  const input=$("shop-input");
  const text=(input?input.value:"").trim();
  if(!text) return;
  if(!data.shopList) data.shopList=[];
  data.shopList.push({id:Date.now().toString(), text, qty:shopQty||"", cat:shopCat, done:false, date:todayStr()});
  if(input) input.value="";
  shopText=""; shopQty="";
  schedSave();render();
}
function toggleShopItem(id){
  const item=(data.shopList||[]).find(x=>x.id===id);
  if(item){
    item.done=!item.done;
    if(item.done) flash("✅ Comprado","success");
    schedSave();checkQuests();render();
  }
}
function deleteShopItem(id){
  data.shopList=(data.shopList||[]).filter(x=>x.id!==id);
  schedSave();render();
}
function clearDoneShop(){
  if(!confirm("¿Eliminar todos los items completados?")) return;
  data.shopList=(data.shopList||[]).filter(x=>!x.done);
  flash("🧹 Lista limpiada","success");
  schedSave();render();
}
function clearAllShop(){
  if(!confirm("¿Vaciar toda la lista de compras?")) return;
  data.shopList=[];
  flash("🗑️ Lista vaciada","success");
  schedSave();render();
}

// ── Reminders ────────────────────────────────────────────────────────────────
function addReminder(){
  const input=$("rem-input");
  const text=(input?input.value:"").trim();
  if(!text) return;
  if(!data.reminders) data.reminders=[];
  data.reminders.push({id:Date.now().toString(), text, priority:remPri, date:remDate||"", done:false});
  if(input) input.value="";
  remText=""; remDate="";
  showRemForm=false;
  flash("📌 Recordatorio agregado","success");
  schedSave();render();
}
function toggleReminder(id){
  const rem=(data.reminders||[]).find(x=>x.id===id);
  if(rem){
    rem.done=!rem.done;
    if(rem.done) flash("✅ Recordatorio completado","success");
    schedSave();render();
  }
}
function deleteReminder(id){
  data.reminders=(data.reminders||[]).filter(x=>x.id!==id);
  schedSave();render();
}

// ── Modal helpers ────────────────────────────────────────────────────────────
function openExpenseModal(gid,cid,cat,groupName){
  const m=$("modal-expense");
  m.dataset.gid=gid;m.dataset.cid=cid;
  $("modal-exp-group").textContent=groupName;
  $("modal-exp-cat").textContent=cat.name;
  $("modal-exp-amt").value="";
  $("modal-exp-note").value="";
  m.style.display="flex";
  setTimeout(()=>$("modal-exp-amt").focus(),100);
}
function openIncomeModal(id,name,icon){
  const m=$("modal-income");
  m.dataset.id=id;
  $("modal-inc-icon").textContent=icon;
  $("modal-inc-name").textContent=name;
  $("modal-inc-amt").value="";
  $("modal-inc-note").value="";
  m.style.display="flex";
  setTimeout(()=>$("modal-inc-amt").focus(),100);
}
function closeModal(){
  $("modal-expense").style.display="none";
  $("modal-income").style.display="none";
}

function submitExpense(){
  const m=$("modal-expense");
  const a=parseFloat($("modal-exp-amt").value)||0;
  const n=$("modal-exp-note").value||"";
  if(a>0) saveExp(m.dataset.gid,m.dataset.cid,a,n);
}
function submitIncome(){
  const m=$("modal-income");
  const a=parseFloat($("modal-inc-amt").value)||0;
  const n=$("modal-inc-note").value||"";
  if(a>0) saveInc(m.dataset.id,a,n);
}

// ── Navigation ───────────────────────────────────────────────────────────────
function setView(v){view=v;render();}
function setMonth(m){month=m;render();}

// ── Avatar update ────────────────────────────────────────────────────────────
function upAv(k,v){data.avatar[k]=v;schedSave();render();}

// ══════════════════════════════════════════════════════════════════════════════
// ── RENDER ───────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function render(){
  if(!data) return;
  const ct=calcM(data,month);
  const level=Math.floor((data.xp||0)/10)+1;
  const xpNext=level*10;
  const xpCur=(data.xp||0)-(level-1)*10;
  let rank=RK[0];
  for(let ri=RK.length-1;ri>=0;ri--){if(level>=RK[ri].m){rank=RK[ri];break;}}
  const monthStarts = getStartAmounts(data, month);
  const startT=Object.values(monthStarts).reduce((a,b)=>a+b,0);
  const autoMood=getAutoMood();
  const fmtSaved=lastSaved?lastSaved.toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}):null;
  const isToday=todoDate===todayStr();
  const dateDisplay=isToday?"Hoy":new Date(todoDate+"T12:00:00").toLocaleDateString("es-EC",{weekday:"short",day:"numeric",month:"short"});
  const allTodosDay=(data.todos||[]).filter(x=>x.date===todoDate);
  const filteredTodos=areaFilter==="all"?allTodosDay:allTodosDay.filter(x=>x.area===areaFilter);
  const doneTodayCount=allTodosDay.filter(x=>x.done).length;

  // ── Avatar ──
  $("avatar-container").innerHTML=renderAvatar(data.avatar,level,autoMood,72,aFrame);

  // ── Header info ──
  $("rank-badge").textContent=rank.b+" "+rank.n;
  $("rank-badge").style.color=rank.c;
  $("level-info").textContent=`Nivel ${level}  ·  ${data.xp||0} XP total`;
  $("xp-bar-fill").style.width=(xpCur/xpNext)*100+"%";
  $("xp-bar-fill").style.background=`linear-gradient(90deg,${rank.c},#FFD700)`;
  $("xp-text").textContent=`${xpCur} / ${xpNext} XP`;
  $("save-indicator").textContent=fmtSaved?`💾 ${fmtSaved}`:"";
  updateSyncUI();

  // Balance + cofres
  const balEl=$("header-balance");
  balEl.style.background=ct.bal>=0?"rgba(46,204,113,0.07)":"rgba(231,76,60,0.07)";
  balEl.style.borderColor=ct.bal>=0?"rgba(46,204,113,0.18)":"rgba(231,76,60,0.18)";
  $("header-balance-val").textContent=(ct.bal>=0?"+":"")+fS(ct.bal);
  $("header-balance-val").style.color=ct.bal>=0?"#2ECC71":"#E74C3C";
  $("header-cofres-val").textContent=fS(ct.accs||startT);

  // ── Stats ──
  let statsHTML="";
  AREAS.forEach(a=>{
    const sv=data.stats?.[a.id]||0;
    const lv=getStatLv(sv);
    const pct=getStatPct(sv);
    statsHTML+=`<div class="stat-item" style="background:${a.c}0e;border:1px solid ${a.c}28;border-radius:10px;padding:8px 5px;text-align:center">
      <div class="stat-icon" style="font-size:18px;margin-bottom:4px">${a.icon}</div>
      <div class="stat-name" style="font-size:9px;color:${a.c};font-weight:700;margin-bottom:3px;letter-spacing:0.3px">${a.n}</div>
      <div class="stat-lv rpg" style="font-size:10px;color:#eee">${lv}</div>
      <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-top:5px"><div style="height:100%;width:${pct}%;background:${a.c};border-radius:3px;transition:width 0.5s"></div></div>
    </div>`;
  });
  $("stats-grid").innerHTML=statsHTML;

  // ── Settings ──
  $("settings-panel").classList.toggle("hidden",!showSettings);
  if(showSettings){
    const cloudTime = lastCloudSync ? lastCloudSync.toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"}) : null;
    $("settings-save-status").innerHTML=fmtSaved?`✅ Guardado local: ${fmtSaved}${cloudTime?` &nbsp;·&nbsp; ☁️ Cloud: ${cloudTime}`:""}<br><span style="font-size:10px;color:#888">Código: <b style="color:#FFD700">${playerCode||"—"}</b></span>`:"⏳ Guardando...";
  }

  // ── Avatar editor ──
  $("avatar-editor").classList.toggle("hidden",!showAv);
  if(showAv) renderAvatarEditor();

  // ── Months ──
  let monthsHTML="";
  MS.forEach(m=>{
    const on=month===m;
    monthsHTML+=`<button onclick="setMonth('${m}')" style="flex-shrink:0;padding:7px 13px;border-radius:20px;border:1px solid ${on?"#FFD700":"rgba(255,255,255,0.07)"};background:${on?"rgba(255,215,0,0.1)":"rgba(14,18,30,0.8)"};color:${on?"#FFD700":"#555"};cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">${m.slice(0,3)}</button>`;
  });
  $("months-bar").innerHTML=monthsHTML;

  // ── Views ──
  $("view-dashboard").classList.toggle("hidden",view!=="dashboard");
  $("view-income").classList.toggle("hidden",view!=="income");
  $("view-expenses").classList.toggle("hidden",view!=="expenses");
  $("view-accounts").classList.toggle("hidden",view!=="accounts");
  $("view-todos").classList.toggle("hidden",view!=="todos");
  $("view-shopping").classList.toggle("hidden",view!=="shopping");
  $("view-history").classList.toggle("hidden",view!=="history");

  // ── Dashboard ──
  if(view==="dashboard"){ renderDashboard(ct,rank); renderReminders(); }
  if(view==="income") renderIncome(ct);
  if(view==="expenses") renderExpenses(ct);
  if(view==="accounts") renderAccounts(ct,startT,monthStarts);
  if(view==="todos") renderTodos(allTodosDay,filteredTodos,doneTodayCount,isToday,dateDisplay);
  if(view==="shopping") renderShopping();
  if(view==="history") renderHistory();

  // ── Nav ──
  NAV.forEach(n=>{
    const btn=$("nav-"+n.id);
    if(btn){
      btn.className="nb"+(view===n.id?" on":"");
    }
  });
}

// ── Dashboard view ───────────────────────────────────────────────────────────
function renderDashboard(ct,rank){
  // Balance
  $("dash-balance-card").style.borderColor=ct.bal>=0?"rgba(46,204,113,0.2)":"rgba(231,76,60,0.2)";
  $("dash-month").textContent="Balance — "+month;
  $("dash-balance").textContent=(ct.bal>=0?"+":"")+fmt(ct.bal);
  $("dash-balance").style.color=ct.bal>=0?"#2ECC71":"#E74C3C";
  $("dash-balance").className="rpg";
  $("dash-inc").textContent="↑ "+fS(ct.inc);
  $("dash-exp").textContent="↓ "+fS(ct.exp);
  const saveEl=$("dash-save-pct");
  if(ct.inc>0){saveEl.textContent=((ct.bal/ct.inc)*100).toFixed(1)+"% ahorro";saveEl.style.color=rank.c;saveEl.style.display="";}
  else saveEl.style.display="none";

  // Balance bar
  const bb=$("dash-balance-bar");
  if((ct.inc+ct.exp)>0){
    bb.style.display="flex";
    $("dash-bar-inc").style.width=(ct.inc/(ct.inc+ct.exp))*100+"%";
    $("dash-bar-exp").style.width=(ct.exp/(ct.inc+ct.exp))*100+"%";
  } else bb.style.display="none";

  // Expense breakdown
  const ebEl=$("dash-expense-breakdown");
  if(ct.exp>0){
    ebEl.classList.remove("hidden");
    $("dash-exp-total").textContent=fS(ct.exp)+" total";
    let ebHTML="";
    EG.forEach(g=>{
      const gt=Object.values(data.months[month]?.expenses?.[g.id]||{}).reduce((a,b)=>a+b,0);
      if(!gt) return;
      const p=(gt/ct.exp)*100;
      ebHTML+=`<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span style="color:#ccc">${g.icon} ${g.name}</span>
          <span style="color:${g.color};font-weight:700">${fS(gt)} <span style="font-size:10px;color:#555;font-weight:400">(${p.toFixed(0)}%)</span></span>
        </div>
        <div style="height:5px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden"><div style="height:100%;width:${p}%;background:${g.color};border-radius:3px"></div></div>
      </div>`;
    });
    $("dash-exp-list").innerHTML=ebHTML;
  } else ebEl.classList.add("hidden");

  // Today's tasks summary
  const tt=(data.todos||[]).filter(x=>x.date===todayStr());
  const ttEl=$("dash-today-tasks");
  if(tt.length>0){
    ttEl.classList.remove("hidden");
    const dn=tt.filter(x=>x.done).length;
    $("dash-tasks-count").textContent=`${dn}/${tt.length}`;
    $("dash-tasks-bar").style.width=(tt.length?(dn/tt.length)*100:0)+"%";
    let pillsHTML="";
    AREAS.forEach(a=>{
      const ac=tt.filter(x=>x.area===a.id).length;
      if(!ac) return;
      const ad=tt.filter(x=>x.area===a.id&&x.done).length;
      pillsHTML+=`<span class="pill" style="color:${a.c};border-color:${a.c}30;background:${a.c}12">${a.icon} ${ad}/${ac}</span>`;
    });
    $("dash-tasks-pills").innerHTML=pillsHTML;
  } else ttEl.classList.add("hidden");
}

// ── Income view ──────────────────────────────────────────────────────────────
function renderIncome(ct){
  $("inc-total").textContent=fS(ct.inc);
  $("inc-month").textContent=month+" — Toca una fuente para registrar";
  let html="";
  IC.forEach(c=>{
    const total=data.months[month]?.income?.[c.id]||0;
    const entries=(data.hist||[]).filter(h=>h.type==="income"&&h.catId===c.id&&h.month===month);
    let entriesHTML="";
    if(entries.length>0){
      entriesHTML=`<div style="padding:0 13px 12px;display:flex;flex-direction:column;gap:5px">`;
      entries.slice(0,5).forEach(e=>{
        entriesHTML+=`<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:rgba(46,204,113,0.04);border-radius:8px;border-left:3px solid rgba(46,204,113,0.3)">
          <span style="font-size:12px;color:#2ECC71;font-weight:700">${fmt(e.amount)}</span>
          ${e.note?`<span style="flex:1;font-size:11px;color:#777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📝 ${e.note}</span>`:""}
          <span style="font-size:10px;color:#444;flex-shrink:0">${new Date(e.date).toLocaleDateString("es-EC",{day:"2-digit",month:"short"})}</span>
        </div>`;
      });
      if(entries.length>5) entriesHTML+=`<div style="font-size:10px;color:#555;text-align:center;padding-top:3px">+${entries.length-5} más en historial</div>`;
      entriesHTML+="</div>";
    }
    html+=`<div class="card" style="padding:0;border-color:${total>0?"rgba(46,204,113,0.2)":"rgba(255,255,255,0.05)"}">
      <div style="display:flex;align-items:center;gap:13px;padding:13px 15px">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${c.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:#ddd">${c.name}</div>
          ${entries.length>0?`<div style="font-size:10px;color:#555;margin-top:2px">${entries.length} entrada${entries.length>1?"s":""}</div>`:""}
        </div>
        <div style="text-align:right;margin-right:10px">
          <div style="font-size:15px;font-weight:800;color:${total>0?"#2ECC71":"#444"}">${total>0?fS(total):"—"}</div>
        </div>
        <button onclick="openIncomeModal('${c.id}','${c.name}','${c.icon}')" style="flex-shrink:0;padding:7px 13px;border-radius:9px;border:1px solid rgba(46,204,113,0.35);background:rgba(46,204,113,0.08);color:#2ECC71;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">+ Añadir</button>
      </div>
      ${entriesHTML}
    </div>`;
  });
  $("inc-list").innerHTML=html;
}

// ── Expenses view ────────────────────────────────────────────────────────────
function renderExpenses(ct){
  $("exp-total").textContent=fS(ct.exp);
  $("exp-month").textContent=month+" — Toca una categoría para añadir";
  let html="";
  EG.forEach(g=>{
    const gt=Object.values(data.months[month]?.expenses?.[g.id]||{}).reduce((a,b)=>a+b,0);
    const open=expGr===g.id;
    let catsHTML="";
    if(open){
      catsHTML=`<div style="padding:0 13px 13px;display:flex;flex-direction:column;gap:7px">`;
      g.cats.forEach(c2=>{
        const cv=data.months[month]?.expenses?.[g.id]?.[c2.id]||0;
        catsHTML+=`<div onclick="openExpenseModal('${g.id}','${c2.id}',{name:'${c2.name}'},'${g.name}')" style="display:flex;align-items:center;padding:10px 12px;background:rgba(0,0,0,0.3);border-radius:10px;cursor:pointer;border-left:3px solid ${g.color}">
          <span style="flex:1;font-size:13px;color:#aaa">${c2.name}</span>
          <span style="font-size:13px;color:${cv>0?g.color:"#444"};font-weight:700;margin-right:10px">${cv>0?fS(cv):"—"}</span>
          <span style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.07);border-radius:6px;color:#777">+ Añadir</span>
        </div>`;
      });
      catsHTML+="</div>";
    }
    html+=`<div class="card" style="padding:0;border-color:${open?g.color+"44":"rgba(255,255,255,0.05)"}">
      <div onclick="toggleExpGroup('${g.id}')" style="display:flex;align-items:center;gap:13px;padding:13px 15px;cursor:pointer">
        <span style="font-size:22px">${g.icon}</span>
        <span style="flex:1;font-size:14px;color:${open?g.color:"#ccc"};font-weight:600">${g.name}</span>
        <span style="font-size:13px;color:${gt>0?g.color:"#444"};font-weight:700">${gt>0?fS(gt):"—"}</span>
        <span style="font-size:10px;color:#444;transform:${open?"rotate(90deg)":""};transition:0.2s;display:inline-block">▶</span>
      </div>
      ${catsHTML}
    </div>`;
  });
  $("exp-list").innerHTML=html;
}
function toggleExpGroup(id){expGr=expGr===id?null:id;render();}

// ── Accounts view ────────────────────────────────────────────────────────────
function renderAccounts(ct,startT,monthStarts){
  // Cuadre
  const esperado=startT+ct.inc-ct.exp;
  const diferencia=ct.accs-esperado;
  const difOk=Math.abs(diferencia)<1;
  const difColor=difOk?"#2ECC71":diferencia>0?"#F1C40F":"#E74C3C";
  const difLabel=difOk?"✅ Todo cuadra perfectamente":diferencia>0?`+${fS(diferencia)} sin contabilizar (ingreso o saldo extra)`:`${fS(diferencia)} de diferencia (posibles gastos sin registrar)`;
  $("acc-cuadre-month").textContent="📊 Cuadre del Mes — "+month;

  // Check if start amounts come from previous month's accounts
  const mi = MS.indexOf(month);
  const fromPrevMonth = mi > 0 && Object.values(data.months[MS[mi-1]]?.accounts||{}).some(v=>v>0);
  const startLabel = fromPrevMonth ? `Saldo heredado de ${MS[mi-1]}` : "Saldo inicial (configurado)";

  // Formula rows
  $("acc-start-val").textContent=fS(startT);
  $("acc-inc-val").textContent="+ "+fS(ct.inc);
  $("acc-exp-val").textContent="− "+fS(ct.exp);
  $("acc-esperado").textContent=fS(esperado);
  $("acc-real").textContent=fS(ct.accs);
  $("acc-dif-label").textContent=difLabel;
  $("acc-dif-label").style.color=difColor;
  $("acc-dif-box").style.background=difColor+"0f";
  $("acc-dif-box").style.borderColor=difColor+"30";

  // Account list
  let html="";
  AC.forEach(a=>{
    const savedVal=data.months[month]?.accounts?.[a.id]||0;
    const initVal=monthStarts[a.id]||0;
    const inputVal=pendingAccs[a.id]!==undefined?pendingAccs[a.id]:(savedVal||"");
    const hasPending=pendingAccs[a.id]!==undefined;
    const delta=savedVal-initVal;
    const deltaColor=delta>0?"#2ECC71":delta<0?"#E74C3C":"#555";
    const deltaLabel=delta===0?"Sin cambio":delta>0?`+${fS(delta)} desde inicio`:`${fS(delta)} desde inicio`;

    html+=`<div class="card" style="padding:13px 14px;border-color:${a.c}20">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:34px;height:34px;border-radius:9px;background:${a.c}18;border:1px solid ${a.c}30;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${a.icon}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:#ddd">${a.name}</div>
          <div style="font-size:11px;color:#555;margin-top:1px">${fromPrevMonth?'Heredado':'Inicio del mes'}: <span style="color:#888;font-weight:600">${fS(initVal)}</span></div>
        </div>
        <div style="text-align:right"><div style="font-size:11px;color:${deltaColor};font-weight:700">${deltaLabel}</div></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="flex:1">
          <div style="font-size:11px;color:#555;margin-bottom:5px;font-weight:600">Saldo actual</div>
          <input class="inp" data-acc-input="${a.id}" type="number" min="0" step="0.01" placeholder="0.00" value="${inputVal}" oninput="updateAccPending('${a.id}',this.value)" onkeydown="if(event.key==='Enter')confirmAcc('${a.id}')" style="font-size:16px;padding:10px 12px;border-color:${hasPending?"rgba(255,215,0,0.35)":"rgba(255,255,255,0.09)"}"/>
        </div>
        <div style="padding-top:19px">
          <button data-acc-save="${a.id}" onclick="confirmAcc('${a.id}')" ${!hasPending?"disabled":""} style="padding:10px 14px;border-radius:10px;border:none;background:${hasPending?"#1ABC9C":"rgba(255,255,255,0.05)"};color:${hasPending?"#fff":"#444"};cursor:${hasPending?"pointer":"default"};font-weight:700;font-size:13px;white-space:nowrap;transition:0.2s">✓ Guardar</button>
        </div>
      </div>
    </div>`;
  });
  $("acc-list").innerHTML=html;

  // Initial balances
  $("acc-init-panel").classList.toggle("hidden",!showInitEdit);
  $("acc-init-total").textContent=fS(startT);
  $("acc-init-arrow").style.transform=showInitEdit?"rotate(90deg)":"";
  if(showInitEdit){
    let initHTML="";
    AC.forEach(a=>{
      const startInput=pendingStarts[a.id]!==undefined?pendingStarts[a.id]:(data.sa?.[a.id]||"");
      const hasStartPending=pendingStarts[a.id]!==undefined;
      initHTML+=`<div data-start-container="${a.id}" style="padding:10px;background:rgba(0,0,0,0.25);border-radius:10px;border:1px solid ${hasStartPending?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.05)"}">
        <div style="font-size:11px;color:#666;margin-bottom:6px;font-weight:600">${a.icon} ${a.name}</div>
        <input class="inp" data-start-input="${a.id}" type="number" min="0" step="0.01" placeholder="0.00" value="${startInput}" oninput="updateStartPending('${a.id}',this.value)" onkeydown="if(event.key==='Enter')confirmStart('${a.id}')" style="font-size:14px;padding:7px 9px;border-color:${hasStartPending?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.09)"}"/>
        ${hasStartPending?`<button class="start-save-btn" onclick="confirmStart('${a.id}')" style="margin-top:6px;width:100%;padding:6px;border-radius:7px;border:none;background:rgba(255,215,0,0.15);color:#FFD700;cursor:pointer;font-weight:700;font-size:11px">✓ Guardar</button>`:""}
      </div>`;
    });
    $("acc-init-grid").innerHTML=initHTML;
  }
}
function toggleInitEdit(){showInitEdit=!showInitEdit;render();}

// ── Todos view ───────────────────────────────────────────────────────────────
function setTodoViewMode(mode){ todoViewMode=mode; render(); }

function renderTodos(allTodosDay,filteredTodos,doneTodayCount,isToday,dateDisplay){
  // View mode toggle (Day vs General)
  const viewModeEl = $("todo-view-mode");
  if(viewModeEl) {
    viewModeEl.innerHTML = `
      <button onclick="setTodoViewMode('day')" style="flex:1;padding:8px;border-radius:8px;border:1px solid ${todoViewMode==='day'?'rgba(255,107,53,0.4)':'rgba(255,255,255,0.07)'};background:${todoViewMode==='day'?'rgba(255,107,53,0.12)':'transparent'};color:${todoViewMode==='day'?'#FF6B35':'#555'};cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">📅 Por Día</button>
      <button onclick="setTodoViewMode('general')" style="flex:1;padding:8px;border-radius:8px;border:1px solid ${todoViewMode==='general'?'rgba(171,71,188,0.4)':'rgba(255,255,255,0.07)'};background:${todoViewMode==='general'?'rgba(171,71,188,0.12)':'transparent'};color:${todoViewMode==='general'?'#AB47BC':'#555'};cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">📋 General</button>
    `;
  }

  if(todoViewMode === 'general') {
    renderTodosGeneral();
    return;
  }

  // Day view (existing)
  $("todo-day-nav").classList.remove("hidden");
  $("todo-date-display").textContent=dateDisplay;
  $("todo-date-sub").textContent=isToday?"":todoDate;
  $("todo-date-sub").style.display=isToday?"none":"";
  $("todo-today-btn").style.background=isToday?"rgba(255,107,53,0.18)":"transparent";
  $("todo-today-btn").style.border=isToday?"1px solid rgba(255,107,53,0.35)":"1px solid transparent";
  $("todo-today-btn").style.color=isToday?"#FF6B35":"#777";
  $("todo-progress-count").textContent=`${doneTodayCount} / ${allTodosDay.length}`;
  $("todo-progress-bar").style.width=(allTodosDay.length?(doneTodayCount/allTodosDay.length)*100:0)+"%";

  // Area selector
  let areaHTML="";
  AREAS.forEach(a=>{
    const on=todoArea===a.id;
    areaHTML+=`<button onclick="todoArea='${a.id}';render()" class="tab" style="color:${on?a.c:"#555"};border-color:${on?a.c:"rgba(255,255,255,0.07)"};background:${on?a.c+"18":"rgba(0,0,0,0.25)"}">${a.icon} ${a.n}</button>`;
  });
  $("todo-area-selector").innerHTML=areaHTML;

  // Difficulty selector
  let difHTML="";
  TD.forEach(d=>{
    const on=todoDif===d.id;
    difHTML+=`<button onclick="todoDif='${d.id}';render()" style="padding:6px 11px;border-radius:8px;border:1px solid ${on?d.c:"rgba(255,255,255,0.06)"};color:${on?d.c:"#555"};background:${on?d.c+"14":"transparent"};cursor:pointer;font-size:11px;font-weight:700;font-family:'Inter',sans-serif;white-space:nowrap">${d.i} ${d.xp}XP</button>`;
  });
  $("todo-dif-selector").innerHTML=difHTML;

  // Area filter
  let filterHTML=`<button onclick="areaFilter='all';render()" class="tab ${areaFilter==="all"?"on":""}" style="color:${areaFilter==="all"?"#eee":"#555"};border-color:${areaFilter==="all"?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.07)"};background:${areaFilter==="all"?"rgba(255,255,255,0.09)":"rgba(0,0,0,0.25)"}">📋 Todas${allTodosDay.length>0?` <span style="font-size:10px;color:#666">(${doneTodayCount}/${allTodosDay.length})</span>`:""}</button>`;
  AREAS.forEach(a=>{
    const ac=allTodosDay.filter(x=>x.area===a.id).length;
    const ad=allTodosDay.filter(x=>x.area===a.id&&x.done).length;
    const on=areaFilter===a.id;
    filterHTML+=`<button onclick="areaFilter='${a.id}';render()" class="tab ${on?"on":""}" style="color:${on?a.c:"#555"};border-color:${on?a.c:"rgba(255,255,255,0.07)"};background:${on?a.c+"18":"rgba(0,0,0,0.25)"}">${a.icon} ${a.n}${ac>0?` <span style="font-size:10px;color:${on?a.c:"#555"}">(${ad}/${ac})</span>`:""}</button>`;
  });
  $("todo-filter-bar").innerHTML=filterHTML;

  // Todo list
  let listHTML="";
  if(filteredTodos.length===0){
    listHTML=`<div style="text-align:center;padding:26px;color:#444"><div style="font-size:28px;margin-bottom:9px">📭</div><div style="font-size:13px">${areaFilter==="all"?"No hay misiones para este día.":`Sin tareas de ${AREAS.find(x=>x.id===areaFilter)?.n||""} hoy.`}</div></div>`;
  }
  filteredTodos.forEach(todo=>{
    const df=TD.find(x=>x.id===todo.diff)||TD[0];
    const ar=AREAS.find(x=>x.id===todo.area)||AREAS[0];
    listHTML+=`<div style="display:flex;align-items:center;gap:11px;padding:11px 13px;background:${todo.done?"rgba(46,204,113,0.04)":"rgba(0,0,0,0.2)"};border-radius:12px;border:1px solid ${todo.done?"rgba(46,204,113,0.18)":"rgba(255,255,255,0.05)"};transition:0.2s">
      <div onclick="toggleTodo('${todo.id}')" style="width:25px;height:25px;border-radius:7px;border:2px solid ${todo.done?"#2ECC71":ar.c+"88"};background:${todo.done?"rgba(46,204,113,0.18)":"transparent"};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:#2ECC71;flex-shrink:0;transition:0.2s">${todo.done?"✓":""}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;color:${todo.done?"#555":"#eee"};text-decoration:${todo.done?"line-through":"none"};font-weight:500;margin-bottom:5px;line-height:1.3">${todo.text}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <span class="pill" style="color:${ar.c};border-color:${ar.c}28;background:${ar.c}12">${ar.icon} ${ar.n}</span>
          <span class="pill" style="color:${df.c};border-color:${df.c}28;background:${df.c}12">${df.i} +${todo.xp}XP</span>
        </div>
      </div>
      <button onclick="deleteTodo('${todo.id}')" style="background:transparent;border:none;color:#3a3a4a;cursor:pointer;font-size:15px;padding:5px;flex-shrink:0">🗑️</button>
    </div>`;
  });
  $("todo-list").innerHTML=listHTML;
}

// ── General (all pending) view ───────────────────────────────────────────────
function renderTodosGeneral(){
  $("todo-day-nav").classList.add("hidden");

  // Gather all pending tasks, sorted by date
  const allPending = (data.todos||[]).filter(x=>!x.done).sort((a,b)=>a.date.localeCompare(b.date));
  const allDone = (data.todos||[]).filter(x=>x.done).length;
  const totalAll = (data.todos||[]).length;

  $("todo-progress-count").textContent=`${allDone} / ${totalAll}`;
  $("todo-progress-bar").style.width=(totalAll?(allDone/totalAll)*100:0)+"%";

  // Hide area/difficulty selectors for general view, show only filter
  $("todo-area-selector").innerHTML="";
  $("todo-dif-selector").innerHTML="";

  // Area filter for general view
  const filteredPending = areaFilter==="all"?allPending:allPending.filter(x=>x.area===areaFilter);
  let filterHTML=`<button onclick="areaFilter='all';render()" class="tab ${areaFilter==="all"?"on":""}" style="color:${areaFilter==="all"?"#eee":"#555"};border-color:${areaFilter==="all"?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.07)"};background:${areaFilter==="all"?"rgba(255,255,255,0.09)":"rgba(0,0,0,0.25)"}">📋 Todas <span style="font-size:10px;color:#666">(${allPending.length})</span></button>`;
  AREAS.forEach(a=>{
    const ac=allPending.filter(x=>x.area===a.id).length;
    const on=areaFilter===a.id;
    if(ac>0) filterHTML+=`<button onclick="areaFilter='${a.id}';render()" class="tab ${on?"on":""}" style="color:${on?a.c:"#555"};border-color:${on?a.c:"rgba(255,255,255,0.07)"};background:${on?a.c+"18":"rgba(0,0,0,0.25)"}">${a.icon} ${a.n} <span style="font-size:10px;color:${on?a.c:"#555"}">(${ac})</span></button>`;
  });
  $("todo-filter-bar").innerHTML=filterHTML;

  // Group by date
  const groups = {};
  filteredPending.forEach(t=>{
    if(!groups[t.date]) groups[t.date]=[];
    groups[t.date].push(t);
  });

  let listHTML="";
  if(filteredPending.length===0){
    listHTML=`<div style="text-align:center;padding:30px;color:#444"><div style="font-size:32px;margin-bottom:12px">🎉</div><div style="font-size:14px;font-weight:600;color:#2ECC71">¡Sin tareas pendientes!</div><div style="font-size:12px;color:#555;margin-top:4px">Todas las misiones han sido completadas.</div></div>`;
  } else {
    const today = todayStr();
    Object.keys(groups).sort().forEach(dateKey=>{
      const tasks = groups[dateKey];
      const d = new Date(dateKey+"T12:00:00");
      const isToday = dateKey === today;
      const isPast = dateKey < today;
      const dateLabel = isToday ? "📅 Hoy" : d.toLocaleDateString("es-EC",{weekday:"long",day:"numeric",month:"long"});
      const dateColor = isToday ? "#FF6B35" : isPast ? "#E74C3C" : "#888";
      const dateBadge = isPast && !isToday ? " ⚠️ Atrasada" : "";

      listHTML+=`<div style="margin-bottom:6px">
        <div style="font-size:11px;font-weight:700;color:${dateColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding:4px 8px;background:${dateColor}0e;border-radius:6px;border-left:3px solid ${dateColor};display:inline-block">${dateLabel}${dateBadge} <span style="font-size:10px;color:#555;font-weight:400">(${tasks.length})</span></div>
      </div>`;

      tasks.forEach(todo=>{
        const df=TD.find(x=>x.id===todo.diff)||TD[0];
        const ar=AREAS.find(x=>x.id===todo.area)||AREAS[0];
        listHTML+=`<div style="display:flex;align-items:center;gap:11px;padding:11px 13px;background:rgba(0,0,0,0.2);border-radius:12px;border:1px solid ${isPast&&!isToday?'rgba(231,76,60,0.15)':'rgba(255,255,255,0.05)'};transition:0.2s;margin-bottom:6px">
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
  $("todo-list").innerHTML=listHTML;
}

// ── History view ─────────────────────────────────────────────────────────────
function renderHistory(){
  const filtHist=(data.hist||[]).filter(h=>{
    const byMonth=histF==="all"||h.month===histF;
    const byType=histType==="all"||h.type===histType||(!h.type&&histType==="expense");
    return byMonth&&byType;
  });
  $("hist-count").textContent=filtHist.length+" movimientos";

  // Type filter
  let typeHTML="";
  [{id:"all",label:"Todo",color:"#AB47BC"},{id:"income",label:"💰 Ingresos",color:"#2ECC71"},{id:"expense",label:"🛡️ Gastos",color:"#E74C3C"}].forEach(t=>{
    const on=histType===t.id;
    typeHTML+=`<button onclick="histType='${t.id}';render()" class="tab ${on?"on":""}" style="color:${on?t.color:"#555"};border-color:${on?t.color:"rgba(255,255,255,0.07)"};background:${on?t.color+"18":"rgba(0,0,0,0.25)"}">${t.label}</button>`;
  });
  $("hist-type-filter").innerHTML=typeHTML;

  // Month filter
  let monthHTML=`<button onclick="histF='all';render()" class="tab ${histF==="all"?"on":""}" style="color:${histF==="all"?"#AB47BC":"#555"};border-color:${histF==="all"?"#AB47BC":"rgba(255,255,255,0.07)"};background:${histF==="all"?"rgba(171,71,188,0.1)":"rgba(0,0,0,0.25)"}">Todos</button>`;
  MS.forEach(m=>{
    const on=histF===m;
    monthHTML+=`<button onclick="histF='${m}';render()" class="tab ${on?"on":""}" style="color:${on?"#AB47BC":"#555"};border-color:${on?"#AB47BC":"rgba(255,255,255,0.07)"};background:${on?"rgba(171,71,188,0.1)":"rgba(0,0,0,0.25)"}">${m.slice(0,3)}</button>`;
  });
  $("hist-month-filter").innerHTML=monthHTML;

  // List
  let html="";
  if(filtHist.length===0) html=`<div style="text-align:center;padding:28px;color:#444"><div style="font-size:28px;margin-bottom:9px">📭</div>Sin movimientos.</div>`;
  filtHist.slice(0,80).forEach(hx=>{
    const isInc=hx.type==="income";
    const d=new Date(hx.date);
    const ac=isInc?"#2ECC71":"#E74C3C";
    const label=hx.catName;
    const sublabel=isInc?"Ingreso · "+hx.catName:(hx.groupName||"");
    html+=`<div style="display:flex;gap:12px;padding:11px 13px;background:rgba(0,0,0,0.2);border-radius:12px;border:1px solid ${ac}18">
      <div style="width:36px;height:36px;border-radius:9px;background:${ac}12;border:1px solid ${ac}25;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${hx.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px">
          <span style="font-size:14px;color:#eee;font-weight:600">${label}</span>
          <span style="font-size:14px;color:${ac};font-weight:800;flex-shrink:0;margin-left:8px">${isInc?"+":"-"}${fmt(hx.amount)}</span>
        </div>
        <div style="font-size:11px;color:#555;margin-bottom:${hx.note?"6px":"0"}">
          <span class="pill" style="color:${ac};border-color:${ac}25;background:${ac}10;font-size:9px;padding:2px 6px;margin-right:6px">${isInc?"↑ Ingreso":"↓ Gasto"}</span>
          ${sublabel?`<span style="color:#555">${sublabel} · </span>`:""}
          ${d.toLocaleDateString("es-EC",{day:"2-digit",month:"short"})} ${d.toLocaleTimeString("es-EC",{hour:"2-digit",minute:"2-digit"})}
        </div>
        ${hx.note?`<div style="font-size:12px;color:#aaa;padding:5px 10px;background:rgba(255,255,255,0.03);border-radius:6px;border-left:3px solid ${ac}55">📝 ${hx.note}</div>`:""}
      </div>
    </div>`;
  });
  $("hist-list").innerHTML=html;
}

// ── Shopping List ────────────────────────────────────────────────────────────
function renderShopping(){
  const list = data.shopList||[];
  const filtered = shopFilter==="all"?list:list.filter(x=>x.cat===shopFilter);
  const pending = list.filter(x=>!x.done).length;
  const done = list.filter(x=>x.done).length;

  // Header counts
  $("shop-count").textContent=`${pending} pendiente${pending!==1?"s":""} · ${done} comprado${done!==1?"s":""}`;
  const pct = list.length>0?(done/list.length)*100:0;
  $("shop-progress-bar").style.width=pct+"%";
  $("shop-progress-count").textContent=list.length>0?`${done}/${list.length}`:"Sin items";

  // Category filter
  let filterHTML=`<button onclick="shopFilter='all';render()" class="tab${shopFilter==='all'?' on':''}" style="color:${shopFilter==='all'?'#FFD700':''}">Todo (${list.length})</button>`;
  SHOP_CATS.forEach(sc=>{
    const cnt=list.filter(x=>x.cat===sc.id).length;
    if(cnt>0) filterHTML+=`<button onclick="shopFilter='${sc.id}';render()" class="tab${shopFilter===sc.id?' on':''}" style="color:${shopFilter===sc.id?sc.c:''}">${sc.icon} ${cnt}</button>`;
  });
  $("shop-filter-bar").innerHTML=filterHTML;

  // New item form: category
  let catSelHTML="";
  SHOP_CATS.forEach(sc=>{
    const sel=shopCat===sc.id;
    catSelHTML+=`<button onclick="shopCat='${sc.id}';render()" style="padding:5px 10px;border-radius:8px;border:1px solid ${sel?sc.c+'88':'rgba(255,255,255,0.07)'};background:${sel?sc.c+'18':'transparent'};color:${sel?sc.c:'#555'};cursor:pointer;font-size:11px;font-family:'Inter',sans-serif;white-space:nowrap;font-weight:600;flex-shrink:0">${sc.icon} ${sc.name}</button>`;
  });
  $("shop-cat-selector").innerHTML=catSelHTML;

  // Items list
  let html="";
  if(filtered.length===0){
    html=`<div style="text-align:center;padding:30px;color:#444;font-size:13px">🛒 Sin items${shopFilter!=="all"?" en esta categoría":""}</div>`;
  } else {
    // Group by category
    const groups = {};
    filtered.forEach(x=>{
      if(!groups[x.cat]) groups[x.cat]=[];
      groups[x.cat].push(x);
    });
    Object.keys(groups).forEach(catId=>{
      const cat = SHOP_CATS.find(c=>c.id===catId)||SHOP_CATS[SHOP_CATS.length-1];
      const items = groups[catId];
      if(shopFilter==="all") html+=`<div style="font-size:11px;color:${cat.c};font-weight:700;margin:10px 0 6px;text-transform:uppercase;letter-spacing:1px">${cat.icon} ${cat.name}</div>`;
      items.forEach(x=>{
        html+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${x.done?'rgba(46,204,113,0.06)':'rgba(0,0,0,0.15)'};border-radius:10px;border:1px solid ${x.done?'rgba(46,204,113,0.15)':'rgba(255,255,255,0.05)'}">
          <button onclick="toggleShopItem('${x.id}')" style="width:28px;height:28px;border-radius:8px;border:2px solid ${x.done?'#2ECC71':'rgba(255,255,255,0.15)'};background:${x.done?'rgba(46,204,113,0.2)':'transparent'};cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${x.done?'✓':''}</button>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;color:${x.done?'#555':'#ddd'};font-weight:600;${x.done?'text-decoration:line-through;opacity:0.6':''}">${x.text}</div>
            ${x.qty?`<div style="font-size:11px;color:#666;margin-top:2px">Cant: ${x.qty}</div>`:''}
          </div>
          <button onclick="deleteShopItem('${x.id}')" style="background:none;border:none;color:#555;cursor:pointer;font-size:12px;padding:4px">✕</button>
        </div>`;
      });
    });
  }
  $("shop-list").innerHTML=html;

  // Action buttons
  $("shop-actions").innerHTML=done>0?`<div style="display:flex;gap:8px;margin-top:12px">
    <button onclick="clearDoneShop()" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(46,204,113,0.3);background:rgba(46,204,113,0.08);color:#2ECC71;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">🧹 Limpiar comprados (${done})</button>
    <button onclick="clearAllShop()" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(231,76,60,0.3);background:rgba(231,76,60,0.08);color:#E74C3C;cursor:pointer;font-weight:700;font-size:12px;font-family:'Inter',sans-serif">🗑️</button>
  </div>`:"";
}

// ── Reminders on Dashboard ──────────────────────────────────────────────────
function renderReminders(){
  const rems = (data.reminders||[]).filter(x=>!x.done);
  const container = $("dash-reminders");
  if(!container) return;

  if(rems.length===0 && !showRemForm){
    container.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:#555">Sin recordatorios activos</span>
      <button onclick="showRemForm=true;render()" style="background:linear-gradient(135deg,#FFD700,#FFA726);border:none;color:#000;padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">+ Añadir</button>
    </div>`;
    return;
  }

  let html=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="font-size:13px;font-weight:700;color:#FFD700">📌 Recordatorios (${rems.length})</span>
    <button onclick="showRemForm=!showRemForm;render()" style="background:${showRemForm?'rgba(255,255,255,0.05)':'linear-gradient(135deg,#FFD700,#FFA726)'};border:${showRemForm?'1px solid rgba(255,255,255,0.1)':'none'};color:${showRemForm?'#888':'#000'};padding:6px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:11px;font-family:'Inter',sans-serif">${showRemForm?'Cancelar':'+ Añadir'}</button>
  </div>`;

  // Form
  if(showRemForm){
    let priHTML="";
    REMINDER_PRI.forEach(p=>{
      const sel=remPri===p.id;
      priHTML+=`<button onclick="remPri='${p.id}';render()" style="padding:5px 10px;border-radius:8px;border:1px solid ${sel?p.c+'88':'rgba(255,255,255,0.07)'};background:${sel?p.c+'18':'transparent'};color:${sel?p.c:'#555'};cursor:pointer;font-size:11px;font-family:'Inter',sans-serif;font-weight:600">${p.icon} ${p.name}</button>`;
    });
    html+=`<div style="padding:12px;background:rgba(0,0,0,0.2);border-radius:12px;margin-bottom:12px">
      <input id="rem-input" class="inp" placeholder="Ej: Pagar luz, Cita médico..." value="${remText}" oninput="remText=this.value" onkeydown="if(event.key==='Enter')addReminder()" style="margin-bottom:8px;font-size:14px"/>
      <div style="display:flex;gap:6px;margin-bottom:8px">${priHTML}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="date" value="${remDate}" onchange="remDate=this.value" class="inp" style="flex:1;font-size:12px;padding:8px"/>
        <button onclick="addReminder()" style="padding:10px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#FFD700,#FFA726);color:#000;cursor:pointer;font-weight:800;font-size:13px;font-family:'Inter',sans-serif;white-space:nowrap">📌 Guardar</button>
      </div>
    </div>`;
  }

  // List
  rems.sort((a,b)=>{const po={high:0,medium:1,low:2};return(po[a.priority]||1)-(po[b.priority]||1);});
  rems.forEach(r=>{
    const p=REMINDER_PRI.find(x=>x.id===r.priority)||REMINDER_PRI[1];
    const dateStr=r.date?new Date(r.date+"T12:00:00").toLocaleDateString("es-EC",{day:"numeric",month:"short"}):"";
    const isOverdue=r.date&&r.date<todayStr();
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${isOverdue?'rgba(231,76,60,0.08)':'rgba(0,0,0,0.15)'};border-radius:10px;border-left:3px solid ${p.c};margin-bottom:6px">
      <button onclick="toggleReminder('${r.id}')" style="width:26px;height:26px;border-radius:7px;border:2px solid ${p.c}55;background:transparent;cursor:pointer;flex-shrink:0;font-size:12px">○</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:#ddd;font-weight:600">${r.text}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:3px">
          <span style="font-size:10px;color:${p.c}">${p.icon} ${p.name}</span>
          ${dateStr?`<span style="font-size:10px;color:${isOverdue?'#E74C3C':'#666'}">${isOverdue?'⚠️ ':'📅 '}${dateStr}</span>`:''}
        </div>
      </div>
      <button onclick="deleteReminder('${r.id}')" style="background:none;border:none;color:#444;cursor:pointer;font-size:12px;padding:4px">✕</button>
    </div>`;
  });

  container.innerHTML=html;
}

// ── Avatar Editor ────────────────────────────────────────────────────────────
function renderAvatarEditor(){
  const opts=[
    {lbl:"Peinado",id:"hair",opts:HAIR_IDS},
    {lbl:"Color Pelo",id:"hairColor",opts:Object.keys(HAIRS),map:HAIRS},
    {lbl:"Tono Piel",id:"skin",opts:Object.keys(SKINS),map:SKINS},
    {lbl:"Ojos",id:"eyeColor",opts:Object.keys(EYES),map:EYES},
    {lbl:"Ropa",id:"outfit",opts:OUT_IDS},
    {lbl:"Color Ropa",id:"outfitColor",opts:Object.keys(OUTFITS),map:OUTFITS},
    {lbl:"Accesorio",id:"accessory",opts:ACC_IDS},
  ];
  let html="";
  opts.forEach(opt=>{
    let btns="";
    opt.opts.forEach(o=>{
      const sel=data.avatar[opt.id]===o;
      if(opt.map){
        btns+=`<button onclick="upAv('${opt.id}','${o}')" style="width:22px;height:22px;padding:0;border-radius:6px;background:${opt.map[o]};border:1.5px solid ${sel?"#FFD700":"rgba(255,255,255,0.09)"};cursor:pointer"></button>`;
      } else {
        btns+=`<button onclick="upAv('${opt.id}','${o}')" style="padding:3px 7px;border-radius:6px;background:${sel?"rgba(255,215,0,0.12)":"transparent"};border:1.5px solid ${sel?"#FFD700":"rgba(255,255,255,0.09)"};color:${sel?"#FFD700":"#666"};font-size:10px;cursor:pointer">${o}</button>`;
      }
    });
    html+=`<div style="background:rgba(0,0,0,0.2);padding:8px;border-radius:10px">
      <div style="font-size:10px;color:#555;margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">${opt.lbl}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">${btns}</div>
    </div>`;
  });
  $("avatar-editor-grid").innerHTML=html;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── INIT ─────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded",()=>{
  $("loading").style.display="none";

  // Check for saved player code
  const savedCode = localStorage.getItem("lc-player-code");
  if(savedCode) {
    playerCode = savedCode;
    $("login-screen").style.display = "none";
    startApp();
  } else {
    $("login-screen").style.display = "flex";
  }
});
