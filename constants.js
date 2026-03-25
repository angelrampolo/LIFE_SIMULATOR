// ── Utilidades de color ──────────────────────────────────────────────────────
function clr(hex, n) {
  const v = parseInt(hex.replace("#",""),16);
  const r = Math.min(255,Math.max(0,(v>>16)+n));
  const g = Math.min(255,Math.max(0,((v>>8)&0xFF)+n));
  const b = Math.min(255,Math.max(0,(v&0xFF)+n));
  return "#"+((r<<16)|(g<<8)|b).toString(16).padStart(6,"0");
}

// ── Apariencia Avatar ────────────────────────────────────────────────────────
const SKINS = {light:"#FDBCB4",medium:"#D4A574",tan:"#C68642",brown:"#8D5524",dark:"#5C3A1E"};
const HAIRS = {black:"#1C1C2E",brown:"#5D4037",red:"#C62828",blonde:"#FFD54F",blue:"#1565C0",pink:"#E91E63",white:"#ECEFF1",green:"#2E7D32",purple:"#7B1FA2",orange:"#E65100"};
const OUTFITS = {gray:"#546E7A",blue:"#1565C0",red:"#C62828",green:"#2E7D32",purple:"#6A1B9A",black:"#263238",gold:"#F9A825",teal:"#00838F"};
const EYES = {brown:"#3E2723",blue:"#0D47A1",green:"#1B5E20",amber:"#FF6F00",redE:"#B71C1C",violet:"#4A148C"};

// ── Meses ────────────────────────────────────────────────────────────────────
const MS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ── Categorías de ingresos ───────────────────────────────────────────────────
const IC = [
  {id:"sal",name:"Sueldo",icon:"💼"},
  {id:"free",name:"Freelance",icon:"💻"},
  {id:"com",name:"Comisiones",icon:"🤝"},
  {id:"neg",name:"Negocio",icon:"🏪"},
  {id:"inv",name:"Inversiones",icon:"📈"},
  {id:"otr",name:"Otros",icon:"✨"}
];

// ── Grupos de gastos ─────────────────────────────────────────────────────────
const EG = [
  {id:"viv",name:"Vivienda",icon:"🏠",color:"#E67E22",cats:[{id:"arr",name:"Arriendo"},{id:"luz",name:"Luz"},{id:"agua",name:"Agua"},{id:"inet",name:"Internet"},{id:"cel",name:"Celular"},{id:"gas",name:"Gas"}]},
  {id:"trans",name:"Transporte",icon:"🚗",color:"#3498DB",cats:[{id:"gaso",name:"Gasolina"},{id:"taxi",name:"Taxi/Bus"},{id:"mant",name:"Mantenimiento"},{id:"segv",name:"Seguro"}]},
  {id:"ali",name:"Alimentación",icon:"🍕",color:"#E74C3C",cats:[{id:"super",name:"Supermercado"},{id:"rest",name:"Restaurantes"},{id:"deli",name:"Delivery"}]},
  {id:"pers",name:"Personal",icon:"👤",color:"#9B59B6",cats:[{id:"ropa",name:"Ropa"},{id:"salud",name:"Salud"},{id:"gym",name:"Gym"},{id:"entre",name:"Entretenimiento"},{id:"subs",name:"Suscripciones"},{id:"edu",name:"Educación"}]},
  {id:"fin",name:"Financiero",icon:"🏦",color:"#1ABC9C",cats:[{id:"tc",name:"Tarjeta crédito"},{id:"prest",name:"Préstamos"},{id:"seg",name:"Seguros"},{id:"ahorro",name:"Ahorro"}]},
  {id:"otros",name:"Otros",icon:"📦",color:"#95A5A6",cats:[{id:"reg",name:"Regalos"},{id:"masc",name:"Mascotas"},{id:"imp",name:"Imprevistos"}]}
];

// ── Cuentas (cofres) ─────────────────────────────────────────────────────────
const AC = [
  {id:"efec",name:"Efectivo",icon:"💵",c:"#4CAF50"},
  {id:"bpich",name:"Bco Pichincha",icon:"🏦",c:"#FFD600"},
  {id:"produ",name:"Produbanco",icon:"🏦",c:"#1565C0"},
  {id:"bpac",name:"Bco Pacífico",icon:"🏦",c:"#00838F"},
  {id:"coop",name:"Cooperativa",icon:"🏛️",c:"#6A1B9A"},
  {id:"dig",name:"Ahorro digital",icon:"📱",c:"#00BFA5"},
  {id:"binance",name:"Binance",icon:"🪙",c:"#F0B90B"},
  {id:"inver",name:"Inversiones",icon:"📊",c:"#E65100"}
];

// ── Rangos ────────────────────────────────────────────────────────────────────
const RK = [
  {m:1,n:"Novato",b:"🥉",c:"#95A5A6"},
  {m:5,n:"Aprendiz",b:"🥈",c:"#78909C"},
  {m:10,n:"Escudero",b:"🛡️",c:"#42A5F5"},
  {m:20,n:"Caballero",b:"⚔️",c:"#66BB6A"},
  {m:30,n:"Mago",b:"🧙",c:"#AB47BC"},
  {m:40,n:"Señor Tesoro",b:"👑",c:"#FFA726"},
  {m:50,n:"Leyenda",b:"🏆",c:"#FFD700"}
];

// ── Dificultad de tareas ─────────────────────────────────────────────────────
const TD = [
  {id:"easy",n:"Fácil",xp:2,c:"#2ECC71",i:"⭐"},
  {id:"medium",n:"Media",xp:5,c:"#F39C12",i:"⭐⭐"},
  {id:"hard",n:"Difícil",xp:10,c:"#E74C3C",i:"⭐⭐⭐"},
  {id:"epic",n:"Épica",xp:20,c:"#9B59B6",i:"💎"}
];

// ── Moods del avatar ─────────────────────────────────────────────────────────
const ML = {idle:"Tranquilo",sleeping:"Durmiendo",sad:"Preocupado",angry:"Estresado",money:"Feliz",celebrate:"Festejando",thinking:"Pensando",working:"Trabajando"};

// ── Quests ───────────────────────────────────────────────────────────────────
const QS = [
  {id:"q1",n:"Registra ingreso",xp:5,ck:(d,m)=>Object.values(d.months[m]?.income||{}).some(v=>v>0)},
  {id:"q2",n:"3 gastos registrados",xp:10,ck:(d,m)=>{let c=0;Object.values(d.months[m]?.expenses||{}).forEach(g=>Object.values(g).forEach(v=>{if(v>0)c++}));return c>=3}},
  {id:"q3",n:"Actualiza cofres",xp:10,ck:(d,m)=>Object.values(d.months[m]?.accounts||{}).some(v=>v>0)},
  {id:"q4",n:"Balance positivo",xp:20,ck:(d,m)=>{let i=Object.values(d.months[m]?.income||{}).reduce((a,b)=>a+b,0);let e=0;Object.values(d.months[m]?.expenses||{}).forEach(g=>Object.values(g).forEach(v=>e+=v));return i>0&&i>e}},
  {id:"q5",n:"Ahorra 20%",xp:30,ck:(d,m)=>{let i=Object.values(d.months[m]?.income||{}).reduce((a,b)=>a+b,0);let e=0;Object.values(d.months[m]?.expenses||{}).forEach(g=>Object.values(g).forEach(v=>e+=v));return i>0&&((i-e)/i)>=0.2}},
  {id:"q6",n:"3 tareas completadas hoy",xp:15,ck:d=>{let td=new Date().toISOString().slice(0,10);return(d.todos||[]).filter(t=>t.done&&t.date===td).length>=3}}
];

// ── Áreas (stats del personaje) ──────────────────────────────────────────────
const AREAS = [
  {id:"str", n:"Entrenamiento", icon:"💪", c:"#E74C3C"},
  {id:"int", n:"Estudios",      icon:"📚", c:"#3498DB"},
  {id:"vit", n:"Salud",         icon:"🍎", c:"#2ECC71"},
  {id:"luk", n:"Finanzas",      icon:"💰", c:"#F1C40F"},
  {id:"cha", n:"Social",        icon:"🤝", c:"#9B59B6"}
];

// ── IDs de personalización ───────────────────────────────────────────────────
const HAIR_IDS = ["messy","spiky","long","curly","mohawk","buzz"];
const OUT_IDS  = ["tshirt","armor","hoodie","suit","wizard","cape"];
const ACC_IDS  = ["none","crown","headband","glasses","halo","horns","headphones","cap"];

// ── Navegación ───────────────────────────────────────────────────────────────
const NAV = [
  {id:"dashboard",icon:"🗺️",label:"Inicio"},
  {id:"income",   icon:"💰",label:"Ingresos"},
  {id:"expenses", icon:"🛡️",label:"Gastos"},
  {id:"accounts", icon:"🏦",label:"Cofres"},
  {id:"todos",    icon:"📋",label:"Tareas"},
  {id:"history",  icon:"📖",label:"Historial"},
];
