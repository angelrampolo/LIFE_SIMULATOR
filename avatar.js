// ── Avatar SVG renderer (vanilla JS) ─────────────────────────────────────────
function renderAvatar(av, lv, mood, sz, frame) {
  const sk = SKINS[av.skin]||SKINS.medium;
  const hr = HAIRS[av.hairColor]||HAIRS.black;
  const ot = OUTFITS[av.outfitColor]||OUTFITS.blue;
  const ey = EYES[av.eyeColor]||EYES.brown;
  const sd=clr(sk,-25), hd=clr(hr,-30), od=clr(ot,-30), ol=clr(ot,25);
  const f = frame||0;
  const by = mood==="celebrate"?Math.sin(f*0.3)*2:mood==="sad"?0.5:mood==="sleeping"?Math.sin(f*0.1)*0.3:Math.sin(f*0.08)*0.5;
  const ht = mood==="thinking"?Math.sin(f*0.05)*1.5:mood==="celebrate"?Math.sin(f*0.4)*2:mood==="sad"?1:0;

  // Hair
  let hairSVG = '';
  if(av.hair==="spiky") hairSVG=`<rect x="7" y="3" width="18" height="5" fill="${hr}" rx="2"/><rect x="8" y="-1" width="3" height="5" fill="${hr}" rx="1"/><rect x="12" y="-3" width="3" height="7" fill="${hr}" rx="1"/><rect x="17" y="-2" width="3" height="6" fill="${hr}" rx="1"/><rect x="21" y="-1" width="3" height="5" fill="${hr}" rx="1"/><rect x="6" y="5" width="3" height="4" fill="${hr}" rx="1"/><rect x="23" y="5" width="3" height="4" fill="${hr}" rx="1"/>`;
  else if(av.hair==="long") hairSVG=`<rect x="7" y="2" width="18" height="6" fill="${hr}" rx="3"/><rect x="5" y="4" width="4" height="14" fill="${hr}" rx="2"/><rect x="23" y="4" width="4" height="14" fill="${hr}" rx="2"/><rect x="7" y="4" width="4" height="10" fill="${hr}" rx="1"/><rect x="21" y="4" width="4" height="10" fill="${hr}" rx="1"/>`;
  else if(av.hair==="curly") hairSVG=`<rect x="6" y="1" width="4" height="4" fill="${hr}" rx="2"/><rect x="9" y="0" width="4" height="4" fill="${hr}" rx="2"/><rect x="13" y="0" width="4" height="4" fill="${hr}" rx="2"/><rect x="17" y="0" width="4" height="4" fill="${hr}" rx="2"/><rect x="21" y="1" width="4" height="4" fill="${hr}" rx="2"/><rect x="7" y="3" width="18" height="5" fill="${hr}" rx="2"/><rect x="5" y="5" width="3" height="5" fill="${hr}" rx="1.5"/><rect x="24" y="5" width="3" height="5" fill="${hr}" rx="1.5"/>`;
  else if(av.hair==="mohawk") hairSVG=`<rect x="8" y="4" width="16" height="4" fill="${hr}" rx="2"/><rect x="12" y="-4" width="8" height="9" fill="${hr}" rx="2"/><rect x="13" y="-5" width="6" height="4" fill="${hr}" rx="2"/><rect x="14" y="-6" width="4" height="3" fill="${hr}" rx="1.5"/><rect x="6" y="5" width="3" height="4" fill="${hr}" rx="1" opacity="0.5"/><rect x="23" y="5" width="3" height="4" fill="${hr}" rx="1" opacity="0.5"/>`;
  else if(av.hair==="buzz") hairSVG=`<rect x="8" y="3" width="16" height="5" fill="${hr}" rx="3"/><rect x="7" y="4" width="18" height="3" fill="${hr}" rx="2"/><rect x="6" y="5" width="2" height="4" fill="${hr}" rx="1"/><rect x="24" y="5" width="2" height="4" fill="${hr}" rx="1"/>`;
  else hairSVG=`<rect x="7" y="2" width="18" height="6" fill="${hr}" rx="3"/><rect x="6" y="4" width="3" height="5" fill="${hr}" rx="1"/><rect x="23" y="4" width="3" height="5" fill="${hr}" rx="1"/><rect x="8" y="1" width="4" height="3" fill="${hr}" rx="1"/><rect x="14" y="0" width="5" height="3" fill="${hr}" rx="1"/><rect x="20" y="1" width="4" height="3" fill="${hr}" rx="1"/>`;

  // Eyes
  let eyeSVG = '';
  const blink = Math.sin(f*0.07)>0.97;
  if(mood==="sleeping") eyeSVG=`<rect x="11" y="11" width="4" height="1" fill="${ey}" rx="0.5"/><rect x="17" y="11" width="4" height="1" fill="${ey}" rx="0.5"/>`;
  else if(mood==="sad") eyeSVG=`<rect x="11" y="10" width="4" height="3" fill="white" rx="1"/><rect x="12" y="11" width="2" height="2" fill="${ey}" rx="0.5"/><rect x="17" y="10" width="4" height="3" fill="white" rx="1"/><rect x="18" y="11" width="2" height="2" fill="${ey}" rx="0.5"/>`;
  else if(mood==="angry") eyeSVG=`<rect x="11" y="10" width="4" height="3" fill="white" rx="1"/><rect x="12.5" y="10.5" width="2.5" height="2.5" fill="${ey}" rx="0.5"/><rect x="17" y="10" width="4" height="3" fill="white" rx="1"/><rect x="17" y="10.5" width="2.5" height="2.5" fill="${ey}" rx="0.5"/><rect x="10" y="8" width="5" height="1.5" fill="${sd}" rx="0.5" transform="rotate(12, 12.5, 9)"/><rect x="17" y="8" width="5" height="1.5" fill="${sd}" rx="0.5" transform="rotate(-12, 19.5, 9)"/>`;
  else if(mood==="celebrate"||mood==="money") eyeSVG=`<rect x="11" y="10" width="4" height="3" fill="white" rx="1.5"/><rect x="12" y="10" width="3" height="3" fill="${ey}" rx="1"/><rect x="12.5" y="10.5" width="1" height="1" fill="white" rx="0.5"/><rect x="17" y="10" width="4" height="3" fill="white" rx="1.5"/><rect x="17.5" y="10" width="3" height="3" fill="${ey}" rx="1"/><rect x="18" y="10.5" width="1" height="1" fill="white" rx="0.5"/>`;
  else if(blink) eyeSVG=`<rect x="11" y="11" width="4" height="1" fill="${ey}" rx="0.5"/><rect x="17" y="11" width="4" height="1" fill="${ey}" rx="0.5"/>`;
  else eyeSVG=`<rect x="11" y="10" width="4" height="3" fill="white" rx="1"/><rect x="12" y="10.5" width="2" height="2.5" fill="${ey}" rx="0.5"/><rect x="12.5" y="10.8" width="1" height="1" fill="white" rx="0.5" opacity="0.7"/><rect x="17" y="10" width="4" height="3" fill="white" rx="1"/><rect x="18" y="10.5" width="2" height="2.5" fill="${ey}" rx="0.5"/><rect x="18.5" y="10.8" width="1" height="1" fill="white" rx="0.5" opacity="0.7"/>`;

  // Mouth
  let mouthSVG = '';
  if(mood==="celebrate"||mood==="money") mouthSVG=`<rect x="13" y="15" width="6" height="2.5" fill="#E57373" rx="1.2"/><rect x="14" y="15.5" width="4" height="1" fill="white" rx="0.5" opacity="0.8"/>`;
  else if(mood==="sad") mouthSVG=`<rect x="13" y="16" width="6" height="1" fill="${sd}" rx="0.5"/>`;
  else if(mood==="sleeping") mouthSVG=`<ellipse cx="16" cy="16" rx="1.5" ry="1" fill="${sd}" opacity="0.4"/>`;
  else mouthSVG=`<rect x="13" y="15.5" width="6" height="1.5" fill="#E57373" rx="1" opacity="0.8"/>`;

  // Outfit
  let outSVG = '';
  if(av.outfit==="armor") outSVG=`<rect x="7" y="22" width="18" height="14" fill="${ot}" rx="1"/><rect x="9" y="23" width="14" height="4" fill="${ol}" rx="1"/><rect x="11" y="24" width="10" height="2" fill="#FFD700" opacity="0.5"/><rect x="14" y="27" width="4" height="6" fill="#FFD700" opacity="0.3"/><rect x="9" y="33" width="14" height="2" fill="#FFD700" opacity="0.4" rx="0.5"/>`;
  else if(av.outfit==="hoodie") outSVG=`<rect x="7" y="22" width="18" height="14" fill="${ot}" rx="2"/><rect x="10" y="22" width="4" height="3" fill="${od}" rx="1"/><rect x="18" y="22" width="4" height="3" fill="${od}" rx="1"/><rect x="12" y="28" width="8" height="5" fill="${od}" rx="1" opacity="0.5"/>`;
  else if(av.outfit==="suit") outSVG=`<rect x="8" y="22" width="16" height="14" fill="${ot}" rx="1"/><rect x="14" y="22" width="4" height="14" fill="#ECEFF1" opacity="0.25"/><rect x="15" y="24" width="2" height="2" fill="#E53935" rx="0.5"/>`;
  else if(av.outfit==="wizard") outSVG=`<rect x="6" y="22" width="20" height="16" fill="${ot}" rx="2"/><rect x="8" y="22" width="16" height="3" fill="${ol}" rx="1"/><rect x="12" y="26" width="2" height="2" fill="#FFD700" rx="0.5"/><rect x="18" y="28" width="2" height="2" fill="#FFD700" rx="0.5"/>`;
  else if(av.outfit==="cape") outSVG=`<rect x="8" y="22" width="16" height="14" fill="${ot}" rx="2"/><rect x="5" y="23" width="3" height="14" fill="${od}" rx="1"/><rect x="24" y="23" width="3" height="14" fill="${od}" rx="1"/><rect x="14" y="23" width="4" height="2" fill="#FFD700" opacity="0.6" rx="0.5"/>`;
  else outSVG=`<rect x="8" y="22" width="16" height="14" fill="${ot}" rx="2"/><rect x="9" y="22" width="14" height="2" fill="${ol}" rx="1"/><rect x="12" y="22" width="8" height="3" fill="${sk}" rx="1"/>`;

  // Accessory
  let accSVG = '';
  if(av.accessory==="crown") accSVG=`<rect x="8" y="-1" width="16" height="3" fill="#FFD700" rx="0.5"/><rect x="9" y="-3" width="3" height="3" fill="#FFD700"/><rect x="14" y="-4" width="4" height="4" fill="#FFD700"/><rect x="20" y="-3" width="3" height="3" fill="#FFD700"/><rect x="15" y="-3" width="2" height="2" fill="#E53935" rx="1"/>`;
  else if(av.accessory==="glasses") accSVG=`<rect x="10" y="9" width="6" height="5" fill="none" stroke="#333" stroke-width="0.8" rx="1.5"/><rect x="16" y="11" width="2" height="0.8" fill="#333"/><rect x="18" y="9" width="6" height="5" fill="none" stroke="#333" stroke-width="0.8" rx="1.5"/><rect x="6" y="11" width="4" height="0.8" fill="#333"/><rect x="24" y="11" width="3" height="0.8" fill="#333"/>`;
  else if(av.accessory==="halo") accSVG=`<ellipse cx="16" cy="0" rx="7" ry="2" fill="none" stroke="#FFD700" stroke-width="1.2" opacity="0.7"/>`;
  else if(av.accessory==="horns") accSVG=`<rect x="5" y="1" width="3" height="3" fill="#C62828" rx="0.5"/><rect x="4" y="-1" width="2" height="3" fill="#E53935" rx="0.5"/><rect x="24" y="1" width="3" height="3" fill="#C62828" rx="0.5"/><rect x="26" y="-1" width="2" height="3" fill="#E53935" rx="0.5"/>`;
  else if(av.accessory==="headphones") accSVG=`<rect x="5" y="9" width="3" height="5" fill="#616161" rx="1"/><rect x="24" y="9" width="3" height="5" fill="#616161" rx="1"/><path d="M 6.5 5 Q 6.5 1, 16 0.5 Q 25.5 1, 25.5 5" fill="none" stroke="#424242" stroke-width="1.5"/>`;
  else if(av.accessory==="cap") accSVG=`<rect x="6" y="4" width="22" height="3" fill="${ot}" rx="1"/><rect x="8" y="2" width="16" height="4" fill="${ot}" rx="2"/><rect x="22" y="4" width="7" height="2" fill="${ot}" rx="1"/><rect x="6" y="6" width="22" height="1" fill="${od}"/>`;
  else if(av.accessory==="headband") accSVG=`<rect x="6" y="6" width="20" height="2" fill="#E53935" rx="0.5"/><rect x="6" y="6" width="20" height="1" fill="#EF5350" rx="0.5"/>`;

  // Mood indicator
  let moodSVG = '';
  if(mood==="thinking") moodSVG=`<text x="24" y="3" font-size="5">💭</text>`;
  else if(mood==="angry") moodSVG=`<text x="24" y="4" font-size="4">💢</text>`;
  else if(mood==="money") moodSVG=`<text x="${24+Math.sin(f*0.15)*2}" y="-2" font-size="4" opacity="0.8">💰</text><text x="6" y="1" font-size="3" opacity="0.6">✨</text>`;
  else if(mood==="sleeping") moodSVG=Math.sin(f*0.15)>0?`<text x="24" y="6" font-size="4">💤</text>`:'';

  // Arms
  const armLr = mood==="celebrate"?-3+Math.sin(f*0.35)*3:mood==="money"?-2+Math.sin(f*0.25)*2:0;
  const armRr = mood==="celebrate"?-3+Math.cos(f*0.35)*3:mood==="working"?-2+Math.sin(f*0.2)*2:0;
  const armFill = av.outfit==="tshirt"?sk:ot;

  return `<svg viewBox="-2 -7 36 53" width="${sz||120}" height="${sz||120}" style="image-rendering:pixelated">
    <g transform="translate(0,${-(by||0)})">
      <rect x="10" y="35" width="4" height="6" fill="#37474F" rx="0.5"/>
      <rect x="18" y="35" width="4" height="6" fill="#37474F" rx="0.5"/>
      <rect x="9" y="40" width="6" height="3" fill="#4E342E" rx="1"/>
      <rect x="9" y="40" width="6" height="1" fill="#6D4C41"/>
      <rect x="17" y="40" width="6" height="3" fill="#4E342E" rx="1"/>
      <rect x="17" y="40" width="6" height="1" fill="#6D4C41"/>
      ${outSVG}
      <g transform="rotate(${armLr}, 9, 24)">
        <rect x="4" y="23" width="4" height="10" fill="${armFill}" rx="1.5"/>
        <rect x="4" y="31" width="4" height="3" fill="${sk}" rx="1.5"/>
      </g>
      <g transform="rotate(${-armRr}, 23, 24)">
        <rect x="24" y="23" width="4" height="10" fill="${armFill}" rx="1.5"/>
        <rect x="24" y="31" width="4" height="3" fill="${sk}" rx="1.5"/>
      </g>
      <g transform="translate(${ht}, 0)">
        <rect x="13" y="19" width="6" height="4" fill="${sk}"/>
        <rect x="8" y="4" width="16" height="16" fill="${sk}" rx="4"/>
        <rect x="8" y="16" width="16" height="4" fill="${sd}" rx="2" opacity="0.2"/>
        <rect x="6" y="10" width="3" height="4" fill="${sk}" rx="1.5"/>
        <rect x="23" y="10" width="3" height="4" fill="${sk}" rx="1.5"/>
        ${eyeSVG}
        <rect x="15" y="12" width="2" height="2" fill="${sd}" rx="0.5" opacity="0.35"/>
        ${mouthSVG}
        ${hairSVG}
        ${accSVG}
        ${moodSVG}
      </g>
      <rect x="26" y="36" width="8" height="6" fill="rgba(0,0,0,0.6)" rx="2"/>
      <text x="30" y="41" text-anchor="middle" font-size="4.5" fill="#FFD700" font-family="monospace" font-weight="bold">${lv}</text>
    </g>
    <ellipse cx="16" cy="44" rx="10" ry="2" fill="#000" opacity="0.12"/>
  </svg>`;
}
