// ── Avatar SVG renderer — Enhanced Edition ───────────────────────────────────
function renderAvatar(av, lv, mood, sz, frame) {
  const sk = SKINS[av.skin]||SKINS.medium;
  const hr = HAIRS[av.hairColor]||HAIRS.black;
  const ot = OUTFITS[av.outfitColor]||OUTFITS.blue;
  const ey = EYES[av.eyeColor]||EYES.brown;
  const sd=clr(sk,-25), sh=clr(sk,20), hd=clr(hr,-30), hl=clr(hr,25);
  const od=clr(ot,-30), ol=clr(ot,25), om=clr(ot,10);
  const f = frame||0;

  // Breathing & movement
  const breathe = Math.sin(f*0.06)*0.6;
  const by = mood==="celebrate"?Math.sin(f*0.3)*2.5:mood==="sad"?0.5:mood==="sleeping"?Math.sin(f*0.08)*0.4:breathe;
  const ht = mood==="thinking"?Math.sin(f*0.05)*1.5:mood==="celebrate"?Math.sin(f*0.4)*2:mood==="sad"?1:0;
  const bodySquash = mood==="celebrate"?1+Math.sin(f*0.3)*0.02:1;

  // ── HAIR ────────────────────────────────────────────────────────────────
  let hairSVG = '';
  const h = av.hair;
  if(h==="spiky") hairSVG=`<rect x="7" y="3" width="18" height="5" fill="${hr}" rx="2"/><rect x="8" y="-1" width="3" height="5" fill="${hr}" rx="1"/><rect x="12" y="-3" width="3" height="7" fill="${hl}" rx="1"/><rect x="17" y="-2" width="3" height="6" fill="${hr}" rx="1"/><rect x="21" y="-1" width="3" height="5" fill="${hr}" rx="1"/><rect x="6" y="5" width="3" height="4" fill="${hd}" rx="1"/><rect x="23" y="5" width="3" height="4" fill="${hd}" rx="1"/>`;
  else if(h==="long") hairSVG=`<rect x="7" y="2" width="18" height="6" fill="${hr}" rx="3"/><rect x="5" y="4" width="4" height="16" fill="${hd}" rx="2"/><rect x="23" y="4" width="4" height="16" fill="${hd}" rx="2"/><rect x="7" y="4" width="4" height="12" fill="${hr}" rx="1"/><rect x="21" y="4" width="4" height="12" fill="${hr}" rx="1"/><rect x="9" y="1" width="14" height="3" fill="${hl}" rx="1.5"/>`;
  else if(h==="curly") hairSVG=`<rect x="6" y="1" width="4" height="4" fill="${hr}" rx="2"/><rect x="9" y="0" width="4" height="4" fill="${hl}" rx="2"/><rect x="13" y="0" width="4" height="4" fill="${hr}" rx="2"/><rect x="17" y="0" width="4" height="4" fill="${hl}" rx="2"/><rect x="21" y="1" width="4" height="4" fill="${hr}" rx="2"/><rect x="7" y="3" width="18" height="5" fill="${hr}" rx="2"/><rect x="5" y="5" width="3" height="6" fill="${hd}" rx="1.5"/><rect x="24" y="5" width="3" height="6" fill="${hd}" rx="1.5"/>`;
  else if(h==="mohawk") hairSVG=`<rect x="8" y="4" width="16" height="4" fill="${hd}" rx="2"/><rect x="12" y="-4" width="8" height="9" fill="${hr}" rx="2"/><rect x="13" y="-5" width="6" height="4" fill="${hl}" rx="2"/><rect x="14" y="-6" width="4" height="3" fill="${hr}" rx="1.5"/>`;
  else if(h==="buzz") hairSVG=`<rect x="8" y="3" width="16" height="5" fill="${hr}" rx="3"/><rect x="7" y="4" width="18" height="3" fill="${hd}" rx="2"/><rect x="10" y="3" width="6" height="2" fill="${hl}" rx="1" opacity="0.5"/>`;
  else if(h==="ponytail") hairSVG=`<rect x="7" y="2" width="18" height="6" fill="${hr}" rx="3"/><rect x="9" y="1" width="14" height="3" fill="${hl}" rx="1.5"/><rect x="6" y="5" width="3" height="4" fill="${hd}" rx="1"/><rect x="23" y="5" width="3" height="4" fill="${hd}" rx="1"/><rect x="20" y="6" width="4" height="3" fill="${hr}" rx="1"/><rect x="22" y="8" width="3" height="10" fill="${hr}" rx="1.5"/><rect x="23" y="7" width="3" height="4" fill="${hl}" rx="1"/>`;
  else if(h==="twintails") hairSVG=`<rect x="7" y="2" width="18" height="6" fill="${hr}" rx="3"/><rect x="9" y="1" width="14" height="3" fill="${hl}" rx="1.5"/><rect x="5" y="5" width="4" height="3" fill="${hr}" rx="1"/><rect x="4" y="7" width="3" height="12" fill="${hr}" rx="1.5"/><rect x="5" y="7" width="3" height="5" fill="${hl}" rx="1"/><rect x="23" y="5" width="4" height="3" fill="${hr}" rx="1"/><rect x="25" y="7" width="3" height="12" fill="${hr}" rx="1.5"/><rect x="25" y="7" width="3" height="5" fill="${hl}" rx="1"/>`;
  else if(h==="bald") hairSVG=`<rect x="9" y="4" width="14" height="2" fill="${sh}" rx="1" opacity="0.15"/>`;
  else hairSVG=`<rect x="7" y="2" width="18" height="6" fill="${hr}" rx="3"/><rect x="6" y="4" width="3" height="5" fill="${hd}" rx="1"/><rect x="23" y="4" width="3" height="5" fill="${hd}" rx="1"/><rect x="8" y="1" width="4" height="3" fill="${hl}" rx="1"/><rect x="14" y="0" width="5" height="3" fill="${hr}" rx="1"/><rect x="20" y="1" width="4" height="3" fill="${hl}" rx="1"/>`;

  // ── EYES ────────────────────────────────────────────────────────────────
  let eyeSVG = '';
  const blink = Math.sin(f*0.07)>0.97;
  if(mood==="sleeping") eyeSVG=`<rect x="11" y="11" width="4" height="1" fill="${ey}" rx="0.5"/><rect x="17" y="11" width="4" height="1" fill="${ey}" rx="0.5"/>`;
  else if(mood==="sad") eyeSVG=`<rect x="11" y="10" width="4" height="3" fill="white" rx="1"/><rect x="12" y="11" width="2" height="2" fill="${ey}" rx="0.5"/><rect x="17" y="10" width="4" height="3" fill="white" rx="1"/><rect x="18" y="11" width="2" height="2" fill="${ey}" rx="0.5"/><rect x="14" y="17" width="1" height="2" fill="#64B5F6" rx="0.5" opacity="0.6"/>`;
  else if(mood==="angry") eyeSVG=`<rect x="11" y="10" width="4" height="3" fill="white" rx="1"/><rect x="12.5" y="10.5" width="2.5" height="2.5" fill="${ey}" rx="0.5"/><rect x="17" y="10" width="4" height="3" fill="white" rx="1"/><rect x="17" y="10.5" width="2.5" height="2.5" fill="${ey}" rx="0.5"/><rect x="10" y="8" width="5" height="1.5" fill="${sd}" rx="0.5" transform="rotate(12, 12.5, 9)"/><rect x="17" y="8" width="5" height="1.5" fill="${sd}" rx="0.5" transform="rotate(-12, 19.5, 9)"/>`;
  else if(mood==="celebrate"||mood==="money") eyeSVG=`<rect x="11" y="10" width="4" height="3" fill="white" rx="1.5"/><rect x="12" y="10" width="3" height="3" fill="${ey}" rx="1"/><rect x="12.5" y="10.5" width="1" height="1" fill="white" rx="0.5"/><rect x="17" y="10" width="4" height="3" fill="white" rx="1.5"/><rect x="17.5" y="10" width="3" height="3" fill="${ey}" rx="1"/><rect x="18" y="10.5" width="1" height="1" fill="white" rx="0.5"/>`;
  else if(blink) eyeSVG=`<rect x="11" y="11" width="4" height="1" fill="${ey}" rx="0.5"/><rect x="17" y="11" width="4" height="1" fill="${ey}" rx="0.5"/>`;
  else eyeSVG=`<rect x="11" y="10" width="4" height="3" fill="white" rx="1"/><rect x="12" y="10.5" width="2" height="2.5" fill="${ey}" rx="0.5"/><rect x="12.5" y="10.8" width="1" height="1" fill="white" rx="0.5" opacity="0.7"/><rect x="17" y="10" width="4" height="3" fill="white" rx="1"/><rect x="18" y="10.5" width="2" height="2.5" fill="${ey}" rx="0.5"/><rect x="18.5" y="10.8" width="1" height="1" fill="white" rx="0.5" opacity="0.7"/>`;

  // Blush (cheeks)
  const blushSVG = (mood==="celebrate"||mood==="money")?`<rect x="9" y="13" width="3" height="1.5" fill="#FF8A80" rx="0.7" opacity="0.35"/><rect x="20" y="13" width="3" height="1.5" fill="#FF8A80" rx="0.7" opacity="0.35"/>`:'';

  // ── MOUTH ───────────────────────────────────────────────────────────────
  let mouthSVG = '';
  if(mood==="celebrate"||mood==="money") mouthSVG=`<rect x="13" y="15" width="6" height="2.5" fill="#E57373" rx="1.2"/><rect x="14" y="15.5" width="4" height="1" fill="white" rx="0.5" opacity="0.8"/>`;
  else if(mood==="sad") mouthSVG=`<path d="M13 17 Q16 15.5 19 17" fill="none" stroke="${sd}" stroke-width="0.8"/>`;
  else if(mood==="sleeping") mouthSVG=`<ellipse cx="16" cy="16" rx="1.5" ry="1" fill="${sd}" opacity="0.4"/>`;
  else if(mood==="angry") mouthSVG=`<rect x="13" y="15.5" width="6" height="1.2" fill="${sd}" rx="0.5"/>`;
  else mouthSVG=`<rect x="13" y="15.5" width="6" height="1.5" fill="#E57373" rx="1" opacity="0.8"/>`;

  // ── OUTFIT ──────────────────────────────────────────────────────────────
  let outSVG = '';
  const o = av.outfit;
  if(o==="armor") outSVG=`<rect x="7" y="22" width="18" height="14" fill="${ot}" rx="1"/><rect x="9" y="23" width="14" height="4" fill="${ol}" rx="1"/><rect x="11" y="24" width="10" height="2" fill="#FFD700" opacity="0.5"/><rect x="14" y="27" width="4" height="6" fill="#FFD700" opacity="0.3"/><rect x="9" y="33" width="14" height="2" fill="#FFD700" opacity="0.4" rx="0.5"/><rect x="7" y="22" width="18" height="1" fill="${ol}" opacity="0.6"/>`;
  else if(o==="hoodie") outSVG=`<rect x="7" y="22" width="18" height="14" fill="${ot}" rx="2"/><rect x="10" y="22" width="4" height="3" fill="${od}" rx="1"/><rect x="18" y="22" width="4" height="3" fill="${od}" rx="1"/><rect x="12" y="28" width="8" height="5" fill="${od}" rx="1" opacity="0.5"/><rect x="14" y="22" width="4" height="6" fill="${ol}" rx="1" opacity="0.15"/>`;
  else if(o==="suit") outSVG=`<rect x="8" y="22" width="16" height="14" fill="${ot}" rx="1"/><rect x="14" y="22" width="4" height="14" fill="#ECEFF1" opacity="0.25"/><rect x="15" y="24" width="2" height="2" fill="#E53935" rx="0.5"/><rect x="8" y="22" width="6" height="6" fill="${od}" rx="1" opacity="0.2"/><rect x="18" y="22" width="6" height="6" fill="${od}" rx="1" opacity="0.2"/>`;
  else if(o==="wizard") outSVG=`<rect x="6" y="22" width="20" height="16" fill="${ot}" rx="2"/><rect x="8" y="22" width="16" height="3" fill="${ol}" rx="1"/><rect x="12" y="26" width="2" height="2" fill="#FFD700" rx="0.5"/><rect x="18" y="28" width="2" height="2" fill="#FFD700" rx="0.5"/><rect x="15" y="30" width="2" height="2" fill="#FFD700" rx="0.5"/><rect x="6" y="35" width="20" height="2" fill="${ol}" rx="1" opacity="0.5"/>`;
  else if(o==="cape") outSVG=`<rect x="8" y="22" width="16" height="14" fill="${ot}" rx="2"/><rect x="5" y="23" width="3" height="16" fill="${od}" rx="1"/><rect x="24" y="23" width="3" height="16" fill="${od}" rx="1"/><rect x="14" y="23" width="4" height="2" fill="#FFD700" opacity="0.6" rx="0.5"/><rect x="5" y="37" width="3" height="2" fill="${ot}" rx="1" opacity="0.5"/><rect x="24" y="37" width="3" height="2" fill="${ot}" rx="1" opacity="0.5"/>`;
  else if(o==="kimono") outSVG=`<rect x="6" y="22" width="20" height="16" fill="${ot}" rx="2"/><path d="M16 22 L12 30 L16 30 Z" fill="${ol}" opacity="0.4"/><path d="M16 22 L20 30 L16 30 Z" fill="${od}" opacity="0.3"/><rect x="10" y="30" width="12" height="2.5" fill="${od}" rx="0.5"/><rect x="14" y="30" width="4" height="2.5" fill="#FFD700" opacity="0.4" rx="0.5"/><rect x="6" y="36" width="20" height="2" fill="${ol}" rx="1" opacity="0.3"/>`;
  else if(o==="sport") outSVG=`<rect x="8" y="22" width="16" height="14" fill="${ot}" rx="2"/><rect x="8" y="22" width="16" height="3" fill="${ol}" rx="1"/><rect x="12" y="26" width="8" height="3" fill="white" rx="1" opacity="0.2"/><rect x="14" y="27" width="4" height="1.5" fill="white" opacity="0.3" rx="0.5"/><rect x="8" y="33" width="16" height="2" fill="${od}" rx="1"/>`;
  else if(o==="punk") outSVG=`<rect x="7" y="22" width="18" height="14" fill="#1a1a2e" rx="2"/><rect x="7" y="22" width="18" height="3" fill="${ot}" rx="1"/><rect x="13" y="27" width="6" height="4" fill="#FFD700" opacity="0.15" rx="1"/><text x="14" y="30" font-size="3" fill="#FFD700" opacity="0.6">☠</text><rect x="7" y="33" width="18" height="2" fill="${ot}" rx="1" opacity="0.7"/>`;
  else outSVG=`<rect x="8" y="22" width="16" height="14" fill="${ot}" rx="2"/><rect x="9" y="22" width="14" height="2" fill="${ol}" rx="1"/><rect x="12" y="22" width="8" height="3" fill="${sk}" rx="1"/><rect x="8" y="33" width="16" height="1" fill="${od}" opacity="0.3"/>`;

  // ── ACCESSORY ───────────────────────────────────────────────────────────
  let accSVG = '';
  const a = av.accessory;
  if(a==="crown") accSVG=`<rect x="8" y="-1" width="16" height="3" fill="#FFD700" rx="0.5"/><rect x="9" y="-3" width="3" height="3" fill="#FFD700"/><rect x="14" y="-4" width="4" height="4" fill="#FFD700"/><rect x="20" y="-3" width="3" height="3" fill="#FFD700"/><rect x="15" y="-3" width="2" height="2" fill="#E53935" rx="1"/><rect x="10" y="-2" width="1.5" height="1.5" fill="#42A5F5" rx="0.75"/>`;
  else if(a==="glasses") accSVG=`<rect x="10" y="9" width="6" height="5" fill="none" stroke="#333" stroke-width="0.8" rx="1.5"/><rect x="16" y="11" width="2" height="0.8" fill="#333"/><rect x="18" y="9" width="6" height="5" fill="none" stroke="#333" stroke-width="0.8" rx="1.5"/><rect x="6" y="11" width="4" height="0.8" fill="#333"/><rect x="24" y="11" width="3" height="0.8" fill="#333"/><rect x="10" y="9" width="6" height="5" fill="#64B5F6" opacity="0.08" rx="1.5"/><rect x="18" y="9" width="6" height="5" fill="#64B5F6" opacity="0.08" rx="1.5"/>`;
  else if(a==="halo") accSVG=`<ellipse cx="16" cy="0" rx="7" ry="2" fill="none" stroke="#FFD700" stroke-width="1.2" opacity="0.7"/><ellipse cx="16" cy="0" rx="5" ry="1.2" fill="none" stroke="#FFF9C4" stroke-width="0.5" opacity="0.4"/>`;
  else if(a==="horns") accSVG=`<rect x="5" y="1" width="3" height="3" fill="#C62828" rx="0.5"/><rect x="4" y="-1" width="2" height="3" fill="#E53935" rx="0.5"/><rect x="4" y="-2" width="1.5" height="2" fill="#EF5350" rx="0.5"/><rect x="24" y="1" width="3" height="3" fill="#C62828" rx="0.5"/><rect x="26" y="-1" width="2" height="3" fill="#E53935" rx="0.5"/><rect x="27" y="-2" width="1.5" height="2" fill="#EF5350" rx="0.5"/>`;
  else if(a==="headphones") accSVG=`<rect x="5" y="9" width="3" height="5" fill="#616161" rx="1"/><rect x="5" y="10" width="3" height="2" fill="#757575" rx="0.5"/><rect x="24" y="9" width="3" height="5" fill="#616161" rx="1"/><rect x="24" y="10" width="3" height="2" fill="#757575" rx="0.5"/><path d="M 6.5 5 Q 6.5 1, 16 0.5 Q 25.5 1, 25.5 5" fill="none" stroke="#424242" stroke-width="1.5"/>`;
  else if(a==="cap") accSVG=`<rect x="6" y="4" width="22" height="3" fill="${ot}" rx="1"/><rect x="8" y="2" width="16" height="4" fill="${ot}" rx="2"/><rect x="22" y="4" width="7" height="2" fill="${ot}" rx="1"/><rect x="6" y="6" width="22" height="1" fill="${od}"/><rect x="9" y="3" width="8" height="1.5" fill="${ol}" rx="0.5" opacity="0.3"/>`;
  else if(a==="headband") accSVG=`<rect x="6" y="6" width="20" height="2" fill="#E53935" rx="0.5"/><rect x="6" y="6" width="20" height="1" fill="#EF5350" rx="0.5"/>`;
  else if(a==="earring") accSVG=`<circle cx="6" cy="13" r="1.2" fill="#FFD700"/><circle cx="6" cy="13" r="0.5" fill="#FFF9C4"/>`;
  else if(a==="scarf") accSVG=`<rect x="6" y="18" width="20" height="4" fill="#E53935" rx="1.5"/><rect x="6" y="18" width="20" height="1.5" fill="#EF5350" rx="1"/><rect x="6" y="21" width="4" height="6" fill="#E53935" rx="1"/><rect x="6" y="21" width="4" height="2" fill="#EF5350" rx="1" opacity="0.5"/>`;
  else if(a==="eyepatch") accSVG=`<rect x="17" y="9" width="6" height="5" fill="#263238" rx="1.5"/><path d="M 6 9 L 20 9" fill="none" stroke="#37474F" stroke-width="0.8"/><path d="M 20 14 L 26 18" fill="none" stroke="#37474F" stroke-width="0.8"/>`;
  else if(a==="mask") accSVG=`<rect x="8" y="13" width="16" height="6" fill="#37474F" rx="2"/><rect x="8" y="13" width="16" height="2" fill="#455A64" rx="1"/><path d="M 6 14 L 8 16" fill="none" stroke="#455A64" stroke-width="0.6"/><path d="M 24 16 L 26 14" fill="none" stroke="#455A64" stroke-width="0.6"/>`;

  // ── MOOD INDICATOR ──────────────────────────────────────────────────────
  let moodSVG = '';
  if(mood==="thinking") moodSVG=`<text x="24" y="3" font-size="5">💭</text>`;
  else if(mood==="angry") moodSVG=`<text x="24" y="4" font-size="4">💢</text>`;
  else if(mood==="money") moodSVG=`<text x="${24+Math.sin(f*0.15)*2}" y="-2" font-size="4" opacity="0.8">💰</text><text x="6" y="1" font-size="3" opacity="0.6">✨</text>`;
  else if(mood==="sleeping") moodSVG=Math.sin(f*0.15)>0?`<text x="24" y="6" font-size="4">💤</text>`:'';
  else if(mood==="celebrate") moodSVG=`<text x="${5+Math.sin(f*0.2)*3}" y="${-3+Math.cos(f*0.3)*2}" font-size="3" opacity="0.7">🎉</text>`;

  // ── ARMS ────────────────────────────────────────────────────────────────
  const armLr = mood==="celebrate"?-3+Math.sin(f*0.35)*3:mood==="money"?-2+Math.sin(f*0.25)*2:Math.sin(f*0.06)*0.5;
  const armRr = mood==="celebrate"?-3+Math.cos(f*0.35)*3:mood==="working"?-2+Math.sin(f*0.2)*2:-Math.sin(f*0.06)*0.5;
  const armFill = (o==="tshirt"||o==="sport")?sk:ot;
  const handFill = sk;

  // ── Shadow on face ─────────────────────────────────────────────────────
  const faceShadow = `<rect x="8" y="16" width="16" height="4" fill="${sd}" rx="2" opacity="0.15"/>`;

  return `<svg viewBox="-2 -8 36 55" width="${sz||120}" height="${sz||120}" style="image-rendering:pixelated">
    <defs>
      <radialGradient id="glow"><stop offset="0%" stop-color="#FFD700" stop-opacity="0.06"/><stop offset="100%" stop-color="#FFD700" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="16" cy="44" rx="11" ry="2.5" fill="url(#glow)"/>
    <g transform="translate(0,${-(by||0)}) scale(1,${bodySquash})">
      <!-- Legs -->
      <rect x="10" y="35" width="4" height="6" fill="#37474F" rx="0.5"/>
      <rect x="10" y="35" width="4" height="1.5" fill="#455A64" rx="0.5"/>
      <rect x="18" y="35" width="4" height="6" fill="#37474F" rx="0.5"/>
      <rect x="18" y="35" width="4" height="1.5" fill="#455A64" rx="0.5"/>
      <!-- Shoes -->
      <rect x="9" y="40" width="6" height="3" fill="#4E342E" rx="1"/>
      <rect x="9" y="40" width="6" height="1" fill="#6D4C41"/>
      <rect x="9" y="40" width="2" height="1" fill="#795548" rx="0.5" opacity="0.5"/>
      <rect x="17" y="40" width="6" height="3" fill="#4E342E" rx="1"/>
      <rect x="17" y="40" width="6" height="1" fill="#6D4C41"/>
      <rect x="17" y="40" width="2" height="1" fill="#795548" rx="0.5" opacity="0.5"/>
      <!-- Body / outfit -->
      ${outSVG}
      <!-- Left arm -->
      <g transform="rotate(${armLr}, 9, 24)">
        <rect x="4" y="23" width="4" height="10" fill="${armFill}" rx="1.5"/>
        <rect x="4" y="23" width="4" height="2" fill="${armFill===''+sk?sh:ol}" rx="1" opacity="0.3"/>
        <rect x="4" y="31" width="4" height="3" fill="${handFill}" rx="1.5"/>
      </g>
      <!-- Right arm -->
      <g transform="rotate(${-armRr}, 23, 24)">
        <rect x="24" y="23" width="4" height="10" fill="${armFill}" rx="1.5"/>
        <rect x="24" y="23" width="4" height="2" fill="${armFill===''+sk?sh:ol}" rx="1" opacity="0.3"/>
        <rect x="24" y="31" width="4" height="3" fill="${handFill}" rx="1.5"/>
      </g>
      <!-- Head -->
      <g transform="translate(${ht}, 0)">
        <rect x="13" y="19" width="6" height="4" fill="${sk}"/>
        <rect x="8" y="4" width="16" height="16" fill="${sk}" rx="4"/>
        ${faceShadow}
        <!-- Ears -->
        <rect x="6" y="10" width="3" height="4" fill="${sk}" rx="1.5"/>
        <rect x="6.5" y="11" width="1.5" height="2" fill="${sd}" rx="0.7" opacity="0.3"/>
        <rect x="23" y="10" width="3" height="4" fill="${sk}" rx="1.5"/>
        <rect x="24" y="11" width="1.5" height="2" fill="${sd}" rx="0.7" opacity="0.3"/>
        <!-- Eyes -->
        ${eyeSVG}
        ${blushSVG}
        <!-- Nose -->
        <rect x="15" y="12" width="2" height="2" fill="${sd}" rx="0.5" opacity="0.3"/>
        <!-- Mouth -->
        ${mouthSVG}
        <!-- Hair -->
        ${hairSVG}
        <!-- Accessory -->
        ${accSVG}
        <!-- Mood -->
        ${moodSVG}
      </g>
      <!-- Level badge -->
      <rect x="26" y="36" width="8" height="6" fill="rgba(0,0,0,0.7)" rx="2"/>
      <rect x="26" y="36" width="8" height="2" fill="rgba(255,215,0,0.15)" rx="2"/>
      <text x="30" y="41" text-anchor="middle" font-size="4.5" fill="#FFD700" font-family="monospace" font-weight="bold">${lv}</text>
    </g>
    <ellipse cx="16" cy="44" rx="10" ry="2" fill="#000" opacity="0.12"/>
  </svg>`;
}
