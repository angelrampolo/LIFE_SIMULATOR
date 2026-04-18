// ── Utilidades de color ──────────────────────────────────────────────────────
function clr(hex, n) {
  const v = parseInt(hex.replace("#",""),16);
  const r = Math.min(255,Math.max(0,(v>>16)+n));
  const g = Math.min(255,Math.max(0,((v>>8)&0xFF)+n));
  const b = Math.min(255,Math.max(0,(v&0xFF)+n));
  return "#"+((r<<16)|(g<<8)|b).toString(16).padStart(6,"0");
}

// ── Apariencia Avatar ────────────────────────────────────────────────────────
const SKINS = {light:"#FDBCB4",medium:"#D4A574",tan:"#C68642",brown:"#8D5524",dark:"#5C3A1E",pale:"#FFE0D0",olive:"#B08D57"};
const HAIRS = {black:"#1C1C2E",brown:"#5D4037",red:"#C62828",blonde:"#FFD54F",blue:"#1565C0",pink:"#E91E63",white:"#ECEFF1",green:"#2E7D32",purple:"#7B1FA2",orange:"#E65100",silver:"#90A4AE",teal:"#00897B"};
const OUTFITS = {gray:"#546E7A",blue:"#1565C0",red:"#C62828",green:"#2E7D32",purple:"#6A1B9A",black:"#263238",gold:"#F9A825",teal:"#00838F",pink:"#AD1457",navy:"#1A237E",crimson:"#880E4F",forest:"#1B5E20"};
const EYES = {brown:"#3E2723",blue:"#0D47A1",green:"#1B5E20",amber:"#FF6F00",redE:"#B71C1C",violet:"#4A148C",cyan:"#006064",gold:"#F57F17"};

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
  {id:"q6",n:"3 tareas completadas hoy",xp:15,ck:d=>{let td=new Date().toISOString().slice(0,10);return(d.todos||[]).filter(t=>t.done&&t.date===td).length>=3}},
  {id:"q7",n:"Lista del super completa",xp:10,ck:d=>(d.shopList||[]).filter(x=>x.done).length>=5},
  {id:"q8",n:"Avanza en un proyecto",xp:10,ck:d=>{const td=new Date().toISOString().slice(0,10);return(d.todos||[]).some(t=>t.projectId&&t.done&&t.date===td);}}
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
const HAIR_IDS = ["messy","spiky","long","curly","mohawk","buzz","ponytail","twintails","bald"];
const OUT_IDS  = ["tshirt","armor","hoodie","suit","wizard","cape","kimono","sport","punk"];
const ACC_IDS  = ["none","crown","headband","glasses","halo","horns","headphones","cap","earring","scarf","eyepatch","mask"];

// ── Categorías de compras ────────────────────────────────────────────────────
const SHOP_CATS = [
  {id:"frutas",name:"Frutas y Verduras",icon:"🥬",c:"#4CAF50"},
  {id:"carnes",name:"Carnes y Proteínas",icon:"🥩",c:"#E74C3C"},
  {id:"lacteos",name:"Lácteos",icon:"🧀",c:"#FFC107"},
  {id:"panaderia",name:"Panadería y Cereales",icon:"🍞",c:"#F57C00"},
  {id:"bebidas",name:"Bebidas",icon:"🥤",c:"#29B6F6"},
  {id:"limpieza",name:"Limpieza y Hogar",icon:"🧹",c:"#7E57C2"},
  {id:"higiene",name:"Higiene Personal",icon:"🧴",c:"#26A69A"},
  {id:"otros",name:"Otros",icon:"📦",c:"#78909C"}
];

// ── Prioridades de recordatorios ─────────────────────────────────────────────
const REMINDER_PRI = [
  {id:"high",name:"Alta",icon:"🔴",c:"#E74C3C"},
  {id:"medium",name:"Media",icon:"🟡",c:"#F39C12"},
  {id:"low",name:"Baja",icon:"🟢",c:"#2ECC71"}
];

// ── Navegación ───────────────────────────────────────────────────────────────
const NAV = [
  {id:"dashboard",icon:"🗺️",label:"Inicio"},
  {id:"income",   icon:"💰",label:"Ingresos"},
  {id:"expenses", icon:"🛡️",label:"Gastos"},
  {id:"accounts", icon:"🏦",label:"Cofres"},
  {id:"todos",    icon:"📋",label:"Tareas"},
  {id:"projects", icon:"🎯",label:"Proyectos"},
  {id:"shopping", icon:"🛒",label:"Compras"},
  {id:"history",  icon:"📖",label:"Historial"},
];

// ── Proyectos: estados, prioridades, kanban, plantillas ──────────────────────
const PROJECT_STATUS = [
  {id:"planning", n:"Planificación", c:"#78909C", icon:"📝"},
  {id:"active",   n:"En curso",      c:"#3498DB", icon:"🚀"},
  {id:"paused",   n:"En pausa",      c:"#F39C12", icon:"⏸️"},
  {id:"done",     n:"Completado",    c:"#2ECC71", icon:"✅"},
  {id:"archived", n:"Archivado",     c:"#555",    icon:"📦"}
];
const PROJECT_PRIORITY = [
  {id:"low",      n:"Baja",     c:"#78909C", icon:"🔽"},
  {id:"med",      n:"Media",    c:"#3498DB", icon:"➖"},
  {id:"high",     n:"Alta",     c:"#F39C12", icon:"🔼"},
  {id:"critical", n:"Crítica",  c:"#E74C3C", icon:"🔥"}
];
const DEFAULT_KANBAN_COLUMNS = [
  {id:"todo",   n:"Por hacer", c:"#78909C"},
  {id:"doing",  n:"En curso",  c:"#3498DB"},
  {id:"review", n:"Revisión",  c:"#F39C12"},
  {id:"done",   n:"Hecho",     c:"#2ECC71"}
];
const PROJECT_TEMPLATES = [
  {
    id:"tesis", name:"Tesis / TFG", icon:"🎓", color:"#3498DB", area:"int",
    description:"Proyecto de investigación académica con hitos clásicos.",
    columns:[
      {id:"backlog", n:"Por investigar", c:"#78909C"},
      {id:"writing", n:"Escribiendo",    c:"#3498DB"},
      {id:"review",  n:"Revisión",       c:"#F39C12"},
      {id:"done",    n:"Listo",          c:"#2ECC71"}
    ],
    milestones:[
      {name:"Propuesta aprobada",     xpReward:20},
      {name:"Marco teórico completo", xpReward:25},
      {name:"Metodología definida",   xpReward:25},
      {name:"Resultados obtenidos",   xpReward:30},
      {name:"Defensa exitosa",        xpReward:50}
    ],
    tasks:[
      {text:"Definir pregunta de investigación", diff:"hard",   col:"backlog"},
      {text:"Revisión bibliográfica inicial",    diff:"medium", col:"backlog"},
      {text:"Redactar introducción",             diff:"medium", col:"backlog"}
    ]
  },
  {
    id:"curso", name:"Curso online", icon:"📚", color:"#9B59B6", area:"int",
    description:"Completar un curso estructurado con módulos y evaluaciones.",
    columns:null,
    milestones:[
      {name:"Módulo 1 completado", xpReward:10},
      {name:"Módulo intermedio",   xpReward:15},
      {name:"Proyecto final",      xpReward:25},
      {name:"Certificado obtenido",xpReward:30}
    ],
    tasks:[
      {text:"Ver primera clase",          diff:"easy",   col:"todo"},
      {text:"Completar ejercicios sem 1", diff:"medium", col:"todo"}
    ]
  },
  {
    id:"cert", name:"Certificación profesional", icon:"🏅", color:"#F39C12", area:"int",
    description:"Prepararse y aprobar un examen de certificación.",
    columns:null,
    milestones:[
      {name:"Inscripción realizada",  xpReward:10},
      {name:"50% del temario",        xpReward:20},
      {name:"Simulacro aprobado",     xpReward:25},
      {name:"Certificación obtenida", xpReward:50}
    ],
    tasks:[
      {text:"Comprar material de estudio", diff:"easy", col:"todo"},
      {text:"Simulacro 1",                  diff:"hard", col:"todo"}
    ]
  },
  {
    id:"libro", name:"Leer libro", icon:"📖", color:"#2ECC71", area:"int",
    description:"Leer un libro completo y tomar notas.",
    columns:null,
    milestones:[
      {name:"25% leído", xpReward:5},
      {name:"50% leído", xpReward:10},
      {name:"Terminado", xpReward:20}
    ],
    tasks:[
      {text:"Leer primer capítulo", diff:"easy",   col:"todo"},
      {text:"Notas y resumen",      diff:"medium", col:"todo"}
    ]
  },
  {
    id:"blank", name:"En blanco", icon:"🎯", color:"#FFD700", area:"int",
    description:"Empieza desde cero con tu propia estructura.",
    columns:null, milestones:[], tasks:[]
  }
];

// ── Temas de Color ───────────────────────────────────────────────────────────
const THEMES = [
  {id:"cyber",name:"Cyber Oscuro",bg:"#070b13",card:"#0e121e",accent:"#FFD700",glow:"rgba(255,215,0,0.08)"},
  {id:"forest",name:"Bosque",bg:"#060f0a",card:"#0e1e14",accent:"#66BB6A",glow:"rgba(102,187,106,0.08)"},
  {id:"ocean",name:"Océano",bg:"#060b14",card:"#0e1522",accent:"#29B6F6",glow:"rgba(41,182,246,0.08)"},
  {id:"volcano",name:"Volcán",bg:"#120808",card:"#1e1010",accent:"#FF6B35",glow:"rgba(255,107,53,0.08)"},
  {id:"royal",name:"Royal",bg:"#0b0814",card:"#14102a",accent:"#AB47BC",glow:"rgba(171,71,188,0.08)"},
];

// ── Moods del Diario ─────────────────────────────────────────────────────────
const JOURNAL_MOODS = [
  {id:"great",icon:"😄",label:"Genial",c:"#2ECC71"},
  {id:"good",icon:"🙂",label:"Bien",c:"#3498DB"},
  {id:"neutral",icon:"😐",label:"Normal",c:"#F1C40F"},
  {id:"bad",icon:"😔",label:"Mal",c:"#E67E22"},
  {id:"terrible",icon:"😩",label:"Terrible",c:"#E74C3C"},
];

// ── Logros ───────────────────────────────────────────────────────────────────
const ACHV = [
  {id:"first_inc",name:"Primer Botín",desc:"Registra tu primer ingreso",icon:"💰",xp:5,
    ck:d=>(d.hist||[]).some(h=>h.type==="income")},
  {id:"first_exp",name:"Primer Gasto",desc:"Registra tu primer gasto",icon:"🛡️",xp:5,
    ck:d=>(d.hist||[]).some(h=>!h.type||h.type==="expense")},
  {id:"saver_20",name:"Ahorrador 20%",desc:"Ahorra 20% en un mes",icon:"🐷",xp:20,
    ck:d=>{for(const m of MS){const md=d.months[m]||{};const i=Object.values(md.income||{}).reduce((a,b)=>a+b,0);let e=0;Object.values(md.expenses||{}).forEach(g=>Object.values(g).forEach(v=>e+=v));if(i>0&&(i-e)/i>=0.2)return true;}return false;}},
  {id:"streak_7",name:"Racha de Fuego",desc:"7 días seguidos de un hábito",icon:"🔥",xp:15,
    ck:d=>(d.habits||[]).some(h=>h.streak>=7)},
  {id:"streak_30",name:"Imparable",desc:"30 días de racha en un hábito",icon:"⚡",xp:30,
    ck:d=>(d.habits||[]).some(h=>h.streak>=30)},
  {id:"tasks_10",name:"Guerrero",desc:"Completa 10 tareas",icon:"⚔️",xp:10,
    ck:d=>(d.todos||[]).filter(t=>t.done).length>=10},
  {id:"tasks_50",name:"Héroe Épico",desc:"Completa 50 tareas",icon:"🏆",xp:25,
    ck:d=>(d.todos||[]).filter(t=>t.done).length>=50},
  {id:"goal_done",name:"Meta Cumplida",desc:"Alcanza una meta financiera",icon:"🎯",xp:20,
    ck:d=>(d.goals||[]).some(g=>g.done)},
  {id:"cofres_all",name:"Tesorero",desc:"Actualiza todos los cofres en un mes",icon:"🗝️",xp:15,
    ck:d=>{for(const m of MS){const accs=d.months[m]?.accounts||{};if(AC.every(a=>accs[a.id]>0))return true;}return false;}},
  {id:"level_10",name:"Nivel 10",desc:"Alcanza nivel 10",icon:"⭐",xp:20,
    ck:d=>Math.floor((d.xp||0)/10)+1>=10},
  {id:"journal_7",name:"Escritor",desc:"Escribe en el diario 7 días",icon:"📝",xp:10,
    ck:d=>Object.keys(d.journal||{}).length>=7},
  {id:"habits_3",name:"Disciplinado",desc:"Crea 3 hábitos",icon:"📅",xp:10,
    ck:d=>(d.habits||[]).length>=3},
];

// ── Frases RPG ───────────────────────────────────────────────────────────────
const RPG_QUOTES = [
  {text:"Un guerrero sabio no gasta en lo que no necesita.",icon:"⚔️"},
  {text:"Cada moneda ahorrada es una poción para el futuro.",icon:"🧪"},
  {text:"El verdadero botín no se encuentra, se construye día a día.",icon:"🏗️"},
  {text:"La disciplina es el arma más poderosa del inventario.",icon:"🗡️"},
  {text:"No midas tu riqueza en oro, mídela en libertad.",icon:"🦅"},
  {text:"Un héroe planifica su misión antes de lanzarse a la aventura.",icon:"🗺️"},
  {text:"Los gastos hormiga son enemigos invisibles. Mantente alerta.",icon:"🐜"},
  {text:"Invertir en ti mismo da el mejor rendimiento de XP.",icon:"📚"},
  {text:"La paciencia del comerciante supera la fuerza del guerrero.",icon:"🏪"},
  {text:"Cada hábito completado es un ladrillo de tu fortaleza.",icon:"🏰"},
  {text:"El presupuesto es tu escudo contra el caos financiero.",icon:"🛡️"},
  {text:"No persigas tesoros ajenos, forja el tuyo propio.",icon:"⚒️"},
  {text:"El mayor enemigo del ahorro es el 'yo del presente'.",icon:"👹"},
  {text:"Una racha rota no es derrota, es una nueva misión.",icon:"🔄"},
  {text:"Los grandes castillos se construyen moneda a moneda.",icon:"🏯"},
  {text:"Tu futuro yo te agradecerá cada decisión de hoy.",icon:"🔮"},
  {text:"El camino del guerrero financiero es largo, pero cada paso cuenta.",icon:"👣"},
  {text:"No gastes para impresionar, ahorra para ser libre.",icon:"💎"},
  {text:"La consistencia vence al talento cuando el talento no es consistente.",icon:"🎯"},
  {text:"Registrar cada gasto es como mapear el calabozo antes de entrar.",icon:"📋"},
  {text:"El oro que no controlas, te controla a ti.",icon:"👑"},
  {text:"Hoy es buen día para subir de nivel.",icon:"⬆️"},
  {text:"Las deudas son monstruos que crecen si no los enfrentas.",icon:"🐉"},
  {text:"El héroe más fuerte es el que dice NO a los gastos innecesarios.",icon:"✋"},
  {text:"Celebra los pequeños logros, son escalones hacia la cima.",icon:"🎉"},
  {text:"Tu inventario de hábitos define tu clase de personaje.",icon:"📖"},
  {text:"El ahorro no es privación, es estrategia de batalla.",icon:"♟️"},
  {text:"Misión de hoy: ser 1% mejor que ayer.",icon:"📈"},
  {text:"Las suscripciones olvidadas son trampas del calabozo.",icon:"🪤"},
  {text:"Quien domina sus finanzas, domina su destino.",icon:"🌟"},
];
