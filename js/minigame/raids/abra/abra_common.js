/* ============================================================================
   ZİNDAN III ORTAK MODÜLÜ: BATIK DONANMA & DERYA YILANI ABRA
   (js/minigame/raids/abra/abra_common.js)
   ============================================================================ */

const ABRA_NORMAL_STAGES = [
  { stage: 1, name: "Aşama 1 · Kırık Fener & Mercan Kıyısı", sub: "2× Modüler Derin Deniz Karkinosu · Yüksek Açılı (55°+) Aşırtma Sınavı", bgKey: "abraBgSanctum", bgUrl: "img/abra/abra_sanctum_bg.webp", desc: "Düşük açılı (15°–35°) atışları dev kıskaç kalkanıyla bloklayan Karkinoslara karşı yüksek açılı (55°–75°) aşırtma atışlarla x1.5 Kritik vur!", preset: "abra_1" },
  { stage: 2, name: "Aşama 2 · İkiz Mercan Adaları & Hendek Girdabı", sub: "Girdap Sapması, 2× Zırhlı Karkinos & Öncü Abra Kuyruk Dalgası + Demir Çapa (⚓)", bgKey: "abraBgSanctum", bgUrl: "img/abra/abra_sanctum_bg.webp", desc: "İki ada arasındaki Hendek Girdabının üstünden aşır! 2 turda bir gelen Kuyruk Dalgasına karşı Demir Çapa (⚓) atarak savrulmayı %75 azalt!", preset: "abra_2" },
  { stage: 3, name: "Aşama 3 · Batık Tersane & Modüler Dalgıç Golemi", sub: "Ara-Boss: Modüler Dalgıç & Mercan Golemi (HP: 2200) · Lumbuz Camı x2.0 Kritik!", bgKey: "abraBgDockVault", bgUrl: "img/abra/abra_dock_vault_bg.webp", desc: "Selçuklu taş rıhtımını koruyan 3 parçalı Modüler Dalgıç Goleminin pirinç dalgıç başlığı lumbuz camını vurarak x2.0 Kritik vur ve top kolunu kilitle!", preset: "abra_3_subboss" },
  { stage: 4, name: "Aşama 4 · Derya Yılanı ABRA & 3 Parçalı Kadırga", sub: "Final Boss: Derya Yılanı ABRA (HP: 4800) · 3 Parçalı Kadırga · Kuyruk Yüzgeci Stagger!", bgKey: "abraBgArena", bgUrl: "img/abra/abra_arena_bg_v2.webp", desc: "3 parçalı Selçuklu kadırgasında Derya Yılanı ABRA ile yüzleş! Faz 3'te yükselen Fosforlu Kuyruk Yüzgecini 2 kez vurarak Abra'yı 2 tur STAGGER (x2.0 Baş Kritiği) durumuna düşür!", preset: "abra_boss" }
];

// 1. Pivot Noktalı Döndürme / Ölçekleme Yardımcı Fonksiyonu
function drawAbraPivot(ctx, img, x, y, w, h, px, py, deg = 0, alpha = 1) {
  if (!img || !img.complete || img.naturalWidth === 0 || alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  if (deg) ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(img, -w * px, -h * py, w, h);
  ctx.restore();
}

// 2. Sinüs Salınımlı 3-Katmanlı Sonsuz Deniz & Köpük Kuşağı (Görünür Kamera Aralığı & 60 FPS Optimize)
function drawUndulatingWaveBelt(ctx, img, canvasW, baseY, drawH, t, speedX, bobAmp, freq, alpha, camX = 0, viewW = canvasW) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const imgW = img.width;
  const imgH = img.height;
  const stripW = 24;
  const scrollX = (((t * speedX) % imgW) + imgW) % imgW;
  const xStart = Math.max(0, Math.floor(camX / stripW) * stripW - stripW);
  const xEnd = Math.min(canvasW, camX + viewW + stripW * 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let x = xStart; x < xEnd; x += stripW) {
    const sx = (x + scrollX) % imgW;
    const sw = Math.min(stripW, imgW - sx);
    const waveY =
      Math.sin(x * freq + t * 2.8) * bobAmp +
      Math.cos(x * freq * 2.1 - t * 1.9) * (bobAmp * 0.4);
    const stretchH = drawH + Math.sin(x * freq * 1.5 + t * 2.2) * (bobAmp * 0.6);
    ctx.drawImage(img, sx, 0, sw, imgH, x, baseY + waveY, stripW + 0.8, stretchH);
  }
  ctx.restore();
}

// 3. 6-Boğumlu (B1..B6) %100 Seamless Boyun + Kafa Çizimi (Sıfır Kopma / Sıfır Boşluk)
function drawSeamlessNeck(ctx, neckImg, headImg, baseX, baseY, drawW, drawH, boneOffsetsX, stretchY, headDeg) {
  if (!neckImg || !neckImg.complete || neckImg.naturalWidth === 0) {
    return { x: baseX, y: baseY - drawH };
  }
  const N = 26;
  const imgW = neckImg.width;
  const imgH = neckImg.height;
  const actualH = drawH * stretchY;
  const spine = [];
  const numBones = boneOffsetsX.length;

  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const s = u * numBones;
    const idx0 = Math.min(numBones - 1, Math.floor(s));
    const idx1 = Math.min(numBones, idx0 + 1);
    let f = s - idx0;
    f = f * f * (3 - 2 * f);
    const x0 = idx0 === 0 ? 0 : boneOffsetsX[idx0 - 1];
    const x1 = idx1 === 0 ? 0 : boneOffsetsX[idx1 - 1];
    const dx = x0 * (1 - f) + x1 * f;
    spine.push({ x: baseX + dx, y: baseY - u * actualH });
  }

  const hw = drawW * 0.5;
  for (let i = 0; i < N; i++) {
    const uBot = i / N;
    const uTop = (i + 1) / N;
    const syTop = Math.max(0, (1 - uTop) * imgH - 0.8);
    const syBot = Math.min(imgH, (1 - uBot) * imgH + 0.8);
    const sh = Math.max(1, syBot - syTop);
    const cBot = spine[i];
    const cTop = spine[i + 1];
    const dy = cBot.y - cTop.y + 0.5;
    const dx = cBot.x - cTop.x;
    ctx.save();
    ctx.transform(drawW / imgW, 0, dx / sh, dy / sh, cTop.x - hw, cTop.y);
    ctx.drawImage(neckImg, 0, syTop, imgW, sh, 0, 0, imgW, sh);
    ctx.restore();
  }

  const pivIdx = Math.floor(N * 0.85);
  const pivX = spine[pivIdx].x - drawW * 0.05;
  const pivY = spine[pivIdx].y;
  const dxTop = spine[N].x - spine[N - 8].x;
  const dyTop = spine[N - 8].y - spine[N].y;
  const neckTiltDeg = ((Math.atan2(dxTop, dyTop) * 180) / Math.PI) * 0.65;

  drawAbraPivot(ctx, headImg, pivX, pivY, drawW * 1.22, drawW * 0.95, 0.54, 0.62, neckTiltDeg + headDeg);
  return { x: pivX, y: pivY };
}

// 4. 4-Boğumlu (O-o-O) %100 Seamless Kuyruk Yüzgeci Çizimi (Zayıf Nokta)
function drawSeamlessTail(ctx, tailImg, baseX, baseY, drawW, drawH, tailOffsetsX, stretchY) {
  if (!tailImg || !tailImg.complete || tailImg.naturalWidth === 0) return;
  const N = 18;
  const imgW = tailImg.width;
  const imgH = tailImg.height;
  const actualH = drawH * stretchY;
  const spine = [];
  const numBones = tailOffsetsX.length;

  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const s = u * numBones;
    const idx0 = Math.min(numBones - 1, Math.floor(s));
    const idx1 = Math.min(numBones, idx0 + 1);
    let f = s - idx0;
    f = f * f * (3 - 2 * f);
    const x0 = idx0 === 0 ? 0 : tailOffsetsX[idx0 - 1];
    const x1 = idx1 === 0 ? 0 : tailOffsetsX[idx1 - 1];
    const dx = x0 * (1 - f) + x1 * f;
    spine.push({ x: baseX + dx, y: baseY - u * actualH });
  }

  const hw = drawW * 0.5;
  for (let i = 0; i < N; i++) {
    const uBot = i / N;
    const uTop = (i + 1) / N;
    const syTop = Math.max(0, (1 - uTop) * imgH - 0.8);
    const syBot = Math.min(imgH, (1 - uBot) * imgH + 0.8);
    const sh = Math.max(1, syBot - syTop);
    const cBot = spine[i];
    const cTop = spine[i + 1];
    const dy = cBot.y - cTop.y + 0.5;
    const dx = cBot.x - cTop.x;
    ctx.save();
    ctx.transform(drawW / imgW, 0, dx / sh, dy / sh, cTop.x - hw, cTop.y);
    ctx.drawImage(tailImg, 0, syTop, imgW, sh, 0, 0, imgW, sh);
    ctx.restore();
  }
}

// 5. Aşama 3 Ara-Boss: 3 Parçalı Modüler Mercan & Dalgıç Golemi Çizimi
function drawModularGolem(ctx, imgs, gx, gy, scale, t, attackState) {
  const gBobY = Math.sin(t * 2.2) * 3.5;
  const gTilt = Math.sin(t * 1.1) * 1.8;
  let cannonDeg = -8 + Math.sin(t * 2.0) * 6;
  let cannonRecoilX = 0;
  let anchorDeg = 12 + Math.cos(t * 2.0) * 8;

  if (attackState && attackState.type === "cannon") {
    const cp = attackState.progress; // 0..1
    const aimLift = cp < 0.25 ? cp / 0.25 : cp < 0.55 ? 1.0 : Math.max(0, 1 - (cp - 0.55) / 0.45);
    cannonDeg = 16 * aimLift;
    if (cp >= 0.22 && cp < 0.48) cannonRecoilX = Math.sin(((cp - 0.22) / 0.26) * Math.PI) * 12;
  } else if (attackState && attackState.type === "anchor") {
    const ap = attackState.progress; // 0..1
    if (ap < 0.42) anchorDeg = 12 + (ap / 0.42) * 52;
    else if (ap < 0.65) anchorDeg = 64 - Math.pow((ap - 0.42) / 0.23, 0.5) * 98;
    else anchorDeg = -34 + ((ap - 0.65) / 0.35) * 46;
  }

  // 1. Arka (Sol) Çapa-Yumruk Kol (omuz pivotu px=0.86, py=0.46)
  drawAbraPivot(ctx, imgs.abraGolemAnchor, gx - 26 * scale, gy + gBobY - 18 * scale, 155 * scale, 92 * scale, 0.86, 0.46, anchorDeg);
  // 2. Ana Gövde & Pirinç Dalgıç Miğferi (Miğfer Camı 2x Kritik Zayıf Nokta!)
  drawAbraPivot(ctx, imgs.abraGolemBody, gx, gy + gBobY, 175 * scale, 252 * scale, 0.5, 0.5, gTilt);
  // 3. Ön (Sağ) Top-Kıskaç Kol (omuz pivotu px=0.82, py=0.28)
  drawAbraPivot(ctx, imgs.abraGolemCannon, gx + (34 + cannonRecoilX) * scale, gy + gBobY - 32 * scale, 165 * scale, 118 * scale, 0.82, 0.28, cannonDeg);
}

// 6. Mermi 1: Girdaplı Abisal Su Küresi (360° Spin + Wobble + Parabolik Uçuş + Patlama)
function drawProjAbyssalOrb(ctx, orbImg, splashImg, startX, startY, targetX, targetY, arcH, size, p, t) {
  if (!orbImg || !orbImg.complete || orbImg.naturalWidth === 0 || p <= 0 || p >= 1) return;
  if (p < 0.82) {
    const fp = p / 0.82;
    const x = startX + (targetX - startX) * fp;
    const y = startY + (targetY - startY) * fp - Math.sin(fp * Math.PI) * arcH;
    for (let k = 2; k >= 1; k--) {
      const tp = Math.max(0, fp - k * 0.055);
      const tx = startX + (targetX - startX) * tp;
      const ty = startY + (targetY - startY) * tp - Math.sin(tp * Math.PI) * arcH;
      const ts = size * (1 - k * 0.25);
      drawAbraPivot(ctx, orbImg, tx, ty, ts, ts, 0.5, 0.5, -t * 420, 0.28 / k);
    }
    const grow = fp < 0.18 ? 0.45 + (fp / 0.18) * 0.55 : 1.0;
    const wobX = 1.0 + Math.sin(t * 20) * 0.13;
    const wobY = 1.0 + Math.cos(t * 20) * 0.13;
    drawAbraPivot(ctx, orbImg, x, y, size * grow * wobX, size * grow * wobY, 0.5, 0.5, -t * 520, 0.98);
  } else {
    const ip = (p - 0.82) / 0.18;
    const burst = 1.0 + ip * 0.85;
    drawAbraPivot(ctx, orbImg, targetX, targetY, size * burst, size * burst * 0.72, 0.5, 0.5, -t * 260, 1 - ip);
    if (splashImg && splashImg.complete) {
      drawAbraPivot(ctx, splashImg, targetX, targetY + 12, size * 1.9 * burst, size * 1.25 * (1 - ip * 0.3), 0.5, 0.88, 0, 1 - ip);
    }
  }
}

// 7. Mermi 2: Abisal Mercan Mızrağı (Teğet Açı Dönmesi + Wobble + Kıymık Patlaması)
function drawProjCoralLance(ctx, lanceImg, slamImg, startX, startY, targetX, targetY, arcH, w, h, p, t) {
  if (!lanceImg || !lanceImg.complete || lanceImg.naturalWidth === 0 || p <= 0 || p >= 1) return;
  if (p < 0.82) {
    const fp = p / 0.82;
    const x = startX + (targetX - startX) * fp;
    const y = startY + (targetY - startY) * fp - Math.sin(fp * Math.PI) * arcH;
    const vx = targetX - startX;
    const vy = targetY - startY - Math.cos(fp * Math.PI) * Math.PI * arcH;
    const tangentDeg = (Math.atan2(vy, vx) * 180) / Math.PI + 180;
    const wobY = 1.0 + Math.sin(t * 26) * 0.08;
    drawAbraPivot(ctx, lanceImg, x, y, w, h * wobY, 0.5, 0.5, tangentDeg, 0.98);
  } else {
    const ip = (p - 0.82) / 0.18;
    drawAbraPivot(ctx, lanceImg, targetX, targetY, w * 0.95, h * 0.95, 0.35, 0.5, -52 + Math.sin(ip * Math.PI * 5) * 4, 1 - ip);
    if (slamImg && slamImg.complete) {
      drawAbraPivot(ctx, slamImg, targetX, targetY + 8, w * (0.9 + ip * 0.7), h * 1.5, 0.5, 0.82, 0, 1 - ip);
    }
  }
}

// 8. Sönümlenen Tsunami Dalgası (Yarı Yolda Çöküp Köpüğe Dönüşür)
function drawVfxDissipatingTsunami(ctx, waveImg, startX, travelDist, baseY, maxW, maxH, p, t) {
  if (!waveImg || !waveImg.complete || waveImg.naturalWidth === 0 || p <= 0 || p >= 1) return;
  const easeP = 1 - Math.pow(1 - p, 1.45);
  const waveX = startX - easeP * travelDist;
  const scaleH = p < 0.15 ? 0.40 + (p / 0.15) * 0.65 : p < 0.45 ? 1.05 : Math.max(0.10, 1.05 * (1 - (p - 0.45) / 0.55));
  const scaleW = 0.85 + p * 0.55;
  const wobX = 1.0 + Math.sin(t * 11) * 0.06;
  const wobY = 1.0 + Math.cos(t * 13) * 0.07;
  const pitchDeg = -p * 18 + Math.sin(t * 9) * 2.5;
  const alpha = p < 0.12 ? p / 0.12 : p < 0.50 ? 0.96 : Math.max(0, 0.96 * (1 - (p - 0.50) / 0.50));
  const sinkY = p > 0.45 ? ((p - 0.45) / 0.55) * 32 : 0;
  drawAbraPivot(ctx, waveImg, waveX, baseY + sinkY, maxW * scaleW * wobX, maxH * scaleH * wobY, 0.5, 0.88, pitchDeg, alpha);
}

// 9. Stagger 3D Elips Yörüngeli Yıldız Halesi (`drawOrbitingStunStars`)
function drawOrbitingStunStars(ctx, cx, cy, t) {
  if (SHM_IMAGES.abraVfxStunHalo && SHM_IMAGES.abraVfxStunHalo.complete) {
    drawAbraPivot(ctx, SHM_IMAGES.abraVfxStunHalo, cx, cy, 185, 92, 0.5, 0.5, Math.sin(t * 3) * 8, 0.92);
  }
  const rx = 74;
  const ry = 22;
  for (let i = 0; i < 5; i++) {
    const a = t * 4.2 + (i * Math.PI * 2) / 5;
    const sx = cx + Math.cos(a) * rx;
    const sy = cy + Math.sin(a) * ry;
    const depthScale = 0.72 + (Math.sin(a) + 1) * 0.25;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(depthScale, depthScale);
    ctx.rotate(t * 5 + i);
    ctx.fillStyle = "#fde047";
    ctx.strokeStyle = "#1a120b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const r = p % 2 === 0 ? 11 : 5;
      const pa = (p * Math.PI) / 5;
      if (p === 0) ctx.moveTo(Math.cos(pa) * r, Math.sin(pa) * r);
      else ctx.lineTo(Math.cos(pa) * r, Math.sin(pa) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// 10. Aşama 1 & 2: 2 Parçalı Modüler Derin Deniz Karkinosu Çizimi
function drawModularKarkinos(ctx, e, rx, t, isActing, eProg) {
  const kx = e.x + rx;
  const ky = e.y - 54 + Math.sin(t * 2.8 + e.x * 0.01) * 3;
  let clawDeg = -6 + Math.sin(t * 2.6 + e.x * 0.02) * 7;
  if (isActing && e.state === "attack") {
    clawDeg = -18 + Math.sin(eProg * Math.PI * 2) * 36;
  } else if (isActing && e.state === "hit") {
    clawDeg = 22;
  }
  // 1. Ana Gövde (`mob_karkinos_body.webp`)
  drawAbraPivot(ctx, SHM_IMAGES.abraKarkinosBody, kx, ky, 152, 118, 0.5, 0.5, Math.sin(t * 1.8) * 1.5);
  // 2. Ön Kıskaç Kalkan Kolu (`mob_karkinos_claw.webp`, omuz pivotu px=0.90, py=0.50)
  drawAbraPivot(ctx, SHM_IMAGES.abraKarkinosClaw, kx - 22, ky + 6, 118, 86, 0.90, 0.50, clawDeg);
}

registerRaidPlugin("abra", {
  id: "abra",
  normalBadge: "ZİNDAN III · 4 AŞAMA",
  extremeBadge: "CEHENNEM · ZİNDAN III · 4 AŞAMA",
  normalStages: ABRA_NORMAL_STAGES,
  extremeStages: ABRA_NORMAL_STAGES,
  defaultPersona: "abra",
  lootSet: [
    {
      id: "abra_helm",
      name: "Abra Derin Derya Miğferi",
      slot: "hat",
      tier: 5,
      shardsNeeded: 3,
      fc: 2720,
      stats: "GÜÇ +26 · ÇEV +22 · DAY +28 · ZEK +24",
      passive: "+18% Su Direnci, +120 HP & Lumbuz Kritiği +%25",
      bonus: "+18% Su Direnci, +120 HP",
      icon: "img/abra/abra_head_only_roar.webp"
    },
    {
      id: "abra_armor",
      name: "Leviathan Pullu Kaptan Zırhı",
      slot: "armor",
      tier: 5,
      shardsNeeded: 3,
      fc: 3150,
      stats: "GÜÇ +30 · ÇEV +22 · DAY +34 · ZEK +26",
      passive: "+260 HP, -15% Boss Hasarı & Yıldırım Kalkanı",
      bonus: "+260 HP, -15% Boss Hasarı",
      icon: "img/abra/abra_neck_pillar_v2.webp"
    },
    {
      id: "abra_weapon",
      name: "Girdap Zıpkını & Mercan Topu",
      slot: "wpn",
      tier: 5,
      shardsNeeded: 3,
      fc: 3320,
      stats: "GÜÇ +38 · ÇEV +24 · DAY +22 · ZEK +28",
      passive: "+22% Topçu Hasarı, +10% Kritik & Yüksek Açı Bonusu",
      bonus: "+22% Topçu Hasarı, +10% Kritik",
      icon: "img/abra/proj_abyssal_coral_lance.webp"
    },
    {
      id: "abra_back",
      name: "Fosforlu Yüzgeç Pelerini",
      slot: "back",
      tier: 5,
      shardsNeeded: 3,
      fc: 2880,
      stats: "GÜÇ +26 · ÇEV +32 · DAY +26 · ZEK +30",
      passive: "+15 Hız, Dalga İtmesi -50% & Her Tur +30 Enerji",
      bonus: "+15 Hız, Dalga İtmesi -50%",
      icon: "img/abra/abra_tail_fin_v2.webp"
    },
    {
      id: "abra_talisman",
      name: "Batık Kadırga Pusulası",
      slot: "tal",
      tier: 5,
      shardsNeeded: 3,
      fc: 2680,
      stats: "GÜÇ +24 · ÇEV +28 · DAY +24 · ZEK +30",
      passive: "Rüzgâr Etkisi -40%, +15 POW & Tam Yörünge",
      bonus: "Rüzgâr Etkisi -40%, +15 POW",
      icon: "img/abra/proj_abyssal_water_orb.webp"
    },
    {
      id: "abra_face",
      name: "Abisal Solungaç Maskesi",
      slot: "face",
      tier: 5,
      shardsNeeded: 3,
      fc: 2540,
      stats: "GÜÇ +24 · ÇEV +26 · DAY +26 · ZEK +28",
      passive: "Sersemletme Bağışıklığı, +80 HP & +%15 Zayıf Nokta",
      bonus: "Sersemletme Bağışıklığı, +80 HP",
      icon: "img/abra/golem_coral_body.webp"
    }
  ],
  campaign: {
    id: "abra",
    badge: "ZİNDAN III",
    title: "BATIK DONANMA & DERYA YILANI ABRA",
    bossName: "DERYA YILANI ABRA",
    bossTitle: "Yeraltı Denizlerinin Kadim Leviathan'ı",
    closeupImg: "img/abra/abra_closeup_portrait_v2.webp",
    enrageImg: "img/abra/abra_head_only_roar.webp",
    ascendedImg: "img/abra/abra_head_only_roar.webp",
    chestImg: "img/sahmeran/loot_sahmeran_chest.webp",
    exChestImg: "img/extreme/loot_ex_chest.webp",
    lobbyBg: "img/abra/abra_sanctum_bg.webp",
    corridorBg: "img/abra/abra_dock_vault_bg.webp",
    nativeComicId: "abra_prolog",
    victoryComicId: "abra_zafer",
    stages: ABRA_NORMAL_STAGES,
    corridorPois: {
      steleLabel: "1. Demirhan'ın Saplanmış Kargısı & Seyir Defteri (İncele)",
      steleDone: "Seyir Defteri İncelendi (+%25 Kuyruk Yüzgeci Kritik)",
      steleMsg: "Demirhan'ın rıhtıma saplanmış kargısını ve seyir defterini inceledin: Abra'nın Fosforlu Kuyruk Yüzgeci zayıf noktasına +%25 ek kritik hasar!",
      brazierLabel: "2. Biyolüminesan Deniz Fenerini Ateşle (Yak)",
      brazierDone: "Deniz Feneri Yakıldı (+350 Maks HP & Su Kalkanı)",
      brazierMsg: "Yavru ejderhan biyolüminesan deniz fenerini ateşledi: Tüm aşamalar boyunca +350 Maksimum HP ve Tsunami Direnci kazanıldı!",
      gateLabel: "3. BATIK TERSANE DEMİR KAPISI (Mührü Kır & Aşama 1'e Gir)"
    },
    comics: [
      {
        act: "PERDE I · SİSLİ LİMAN & BATIK DONANMA",
        title: "Demirhan'ın İzinde Karadeniz'in Altındaki Derya",
        leftBg: "img/abra/abra_sanctum_bg.webp",
        rightBg: "img/abra/abra_dock_vault_bg.webp",
        leftArt: "img/npc-selin.webp",
        rightArt: "img/npc-demirhan.webp",
        leftSpeaker: "Haritacı Selin & Dede'nin Pusulası",
        leftSay: "“Dedenin pusulası kıyıdaki bu deniz mağarasını gösteriyor! Yüzyıllar önce batan Selçuklu kadırgaları akıntıyla bu yeraltı denizine sürüklenmiş!”",
        leftNarr: "Sisin içinden parçalanmış kadırga direkleri ve mavi-yeşil parlayan mercan resifleri yükseliyordu.",
        rightSpeaker: "Demirhan (Öncü Keşif İzi)",
        rightSay: "“Karabela ile fener kulesine indik ama deryanın altından yükselen dev bir gölge gemileri tek darbede ikiye biçti! Sırt zırhına ok da mızrak da işlemiyor!”",
        rightNarr: "Demirhan'ın rıhtım taşına saplı kalan yanık kargısı, içerideki tehlikenin boyutunu kanıtlıyordu."
      },
      {
        act: "PERDE II · MERCAN KIYISI & KARKİNOS KISKACI",
        title: "Aşama 1 & 2: Yüksek Açılı Aşırtma ve Hendek Girdabı",
        leftBg: "img/abra/abra_sanctum_bg.webp",
        rightBg: "img/abra/abra_sanctum_bg.webp",
        leftArt: "img/abra/mob_karkinos_body.webp",
        rightArt: "img/abra/fx_trench_vortex.webp",
        leftSpeaker: "Aşama 1 · Modüler Derin Deniz Karkinosu",
        leftSay: "“KLAK-KLAK! Alçak açılı (15°–35°) düz atışların dev kıskaç kalkanımdan sekecek!”",
        leftNarr: "Taktik: Karkinos'un kıskaç kalkanını aşmak için 55°–75° yüksek açılı (lob) atış yaparak sırt kabuğunu vur!",
        rightSpeaker: "Aşama 2 · Hendek Girdabı & Öncü Kuyruk Dalgası",
        rightSay: "“İki ada arasındaki Hendek Girdabı mermileri yukarı saptırır; 2 turda bir yükselen Abra kuyruğu ise adayı tsunamiyle süpürür!”",
        rightNarr: "İpucu: Dalga gelmeden önce Demir Çapa (⚓) butonuna basarak savrulmayı %75 azalt!"
      },
      {
        act: "PERDE III · BATIK TERSANE & DALGIÇ GOLEMİ",
        title: "Aşama 3 Ara-Boss: Modüler Dalgıç & Mercan Golemi",
        leftBg: "img/abra/abra_dock_vault_bg.webp",
        rightBg: "img/abra/abra_dock_vault_bg.webp",
        leftArt: "img/abra/golem_coral_body.webp",
        rightArt: "img/abra/golem_coral_arm_cannon.webp",
        leftSpeaker: "Modüler Dalgıç & Mercan Golemi (Ara-Boss)",
        leftSay: "“GÜÜÜM! Batık tersanenin demir çapası ve pirinç borda topuyla seni rıhtıma gömeceğim!”",
        leftNarr: "3 parçalı modüler Golem: Sol kolunda dev gemi çapası sallar, sağ kolundaki borda topundan basınçlı su küresi ateşler.",
        rightSpeaker: "Usta Kerim · Zayıf Nokta Analizi",
        rightSay: "“Gövde zırhına vurma! Başındaki pirinç dalgıç başlığının cam lumbuzunu hedef alırsan x2.0 Kritik alır ve top kolu tutukluk yapar!”",
        rightNarr: "Aşama 3'ü geçtiğinde Öncü Ganimet Çarkını çevirip Sefer Odasında soluklanabilirsin."
      },
      {
        act: "PERDE IV · ÜÇ PARÇALI KADIRGA & DERYA YILANI ABRA",
        title: "Aşama 4 Final Boss: Suya Dalış ve Fosforlu Yüzgeç",
        leftBg: "img/abra/abra_arena_bg_v2.webp",
        rightBg: "img/abra/abra_arena_bg_v2.webp",
        leftArt: "img/abra/abra_head_only_roar.webp",
        rightArt: "img/abra/abra_tail_fin_v2.webp",
        leftSpeaker: "Derya Yılanı ABRA (Final Boss)",
        leftSay: "“ŞŞŞAAAK! Kadırganın güvertesini yıldırımlı çenemle parçalayacağım, derin sulara dalıp altınızdan fışkıracağım!”",
        leftNarr: "Faz 2'de Abra suya dalar (vfx_water_dive_splash); güverte önünde su kaynadığında (vfx_water_telegraph_boil) o bölgeden uzaklaş!",
        rightSpeaker: "Zayıf Nokta · Fosforlu Kuyruk Yüzgeci",
        rightSay: "“Faz 3'te kıç kasarasının arkasından yükselen Fosforlu Kuyruk Yüzgecini 2 kez vurursan Abra 2 tur boyunca STAGGER (x2.0 Kritik) olur!”",
        rightNarr: "Abra sersemleyip başını güverteye düşürdüğünde (abra_head_stagger) tüm gücünle kafasını vur!"
      },
      {
        act: "FİNAL PERDESİ · DERYALARIN HÂKİMİ",
        title: "Ulu Kader Çarkı ve Leviathan Hazinesi",
        leftBg: "img/abra/abra_arena_bg_v2.webp",
        rightBg: "img/abra/abra_sanctum_bg.webp",
        leftArt: "img/abra/abra_head_stagger.webp",
        rightArt: "img/abra/abra_closeup_portrait_v2.webp",
        leftSpeaker: "Haritacı Selin & Demirhan",
        leftSay: "“İnanılmaz! Kuyruk yüzgecini vurup Abra'yı güverteye yıktın! Derya Yılanı gücünü kabul edip derinlere çekildi!”",
        leftNarr: "Sular durulurken batık amiral kadırgasının altın işlemeli hazine sandığı güverteye yükseldi.",
        rightSpeaker: "Derin Derya Leviathan Seti",
        rightSay: "“Abra Derin Derya Miğferi, Leviathan Pullu Zırh, Girdap Zıpkını ve Kadim Derya Yumurtası Ulu Kader Çarkında seni bekliyor!”",
        rightNarr: "Ödül: 6 parçalı Abra ekipman seti kalıpları ve Kadim Derya Soyu yumurtası!"
      }
    ]
  },
  personas: {
  sub_coral_golem: {
    id: "sub_coral_golem",
    npc: "coral-golem",
    closeNpc: "coral-golem",
    bg: "img/abra/abra_dock_vault_bg.webp",
    portrait: SHM_ASSETS_PATHS.abraGolemBody,
    title: "MODÜLER DALGIÇ & MERCAN GOLEMİ",
    sub: "Ara-Boss · Batık Tersanenin Zırhlı Dalgıç Muhafızı",
    entranceRoarLine: "GÜÜÜM! BATIK TERSANENİN DEMİR ÇAPASI VE PİRİNÇ BORDA TOPUYLA SENİ RIHTIMA GÖMECEĞİM!",
    entranceSfx: "ÇAPA GÜMBÜRTÜSÜ!!",
    taunts: [
      {
        sfx: "LÜMBÜZ PARILTI!",
        line: "GÖVDE ZIRHIMA İSTEDİĞİN KADAR VUR! PİRİNÇ DALGIÇ BAŞLIĞIMI TUTTURABİLİR MİSİN Kİ?!",
        replySay: "Cam lumbuzunun tam ortasına nişan aldım bile!",
        effectDesc: "Dalgıç Golemi göğsüne vurarak laf attı: Lumbuz Camı Zayıf Nokta Açığı (+%35 Kritik) ve +25 Öfke!"
      }
    ],
    attackLines: [
      "DEMİR ÇAPA İNİYOR! RIHTIM ÇATLAYACAK!",
      "BORDA TOPU ATEŞ! BASINÇLI SU KÜRESİ!"
    ],
    weakHitLines: [
      "ÇATIRR—! LUMBUZ CAMIM ÇATLADI! TOP KOLUM KİLİTLENDİ!",
      "PİRİNÇ BAŞLIĞIMA NASIL İSABET ETTİRDİN?!"
    ],
    missLines: [
      "GÜÜM! TAŞ RIHTIMI DÖVDÜN FANİ!",
      "MERCAN ZIRHIMA BİLE DEĞMEDİ!"
    ]
  },

  abra: {
    id: "abra",
    npc: "abra",
    closeNpc: "abra",
    divineNpc: "abra",
    bg: "img/abra/abra_arena_bg_v2.webp",
    divineBg: "img/abra/abra_arena_bg_v2.webp",
    portrait: SHM_ASSETS_PATHS.abraPortrait,
    title: "DERYA YILANI ABRA",
    sub: "Batık Donanma & Yeraltı Denizlerinin Kadim Leviathan'ı",
    entranceRoarLine: "ŞŞŞAAAK! YÜZYILLARDIR BU YERALTI DENİZİNE DÜŞEN HER KADIRGAYI İKİYE BİÇTİM! SIRA SENİN GEMİNDE!",
    entranceSfx: "DERYA KÜKRER!!",
    taunts: [
      {
        sfx: "DERYA KÜKRER!!",
        line: "SIRT PULLARIMA DEMİRHAN'IN KARGISI BİLE İŞLEMEDİ! FOSFORLU KUYRUK YÜZGEÇLERİMİ VURABİLECEK MİSİN FANİ?!",
        replySay: "Kıç kasarasının arkasındaki o parlayan yüzgecini iki atışta indireceğim!",
        effectDesc: "Derya Yılanı Abra dalgaların üstünde şahlanarak laf attı: Zayıf Nokta Açığı (+%35 Kritik) ve +25 POW Öfkesi!"
      },
      {
        sfx: "ABİSAL ÇAĞRI!",
        line: "SULARIMA DALDIĞIMDA GÜVERTENİN ALTINDAN FIŞKIRACAĞIM! ÇAPANI ATACAK VAKTİN OLACAK MI?!",
        replySay: "Demir Çapamız da ejderha ateşimiz de hazır Abra!",
        effectDesc: "Abra suya vurup alay etti: +30 POW Öfkesi ve +25 Enerji!"
      }
    ],
    attackLines: [
      "ABİSAL SU KÜRESİ! KADIRGANI BATIRACAĞIM!",
      "ÜÇLÜ MERCAN MIZRAĞI YAĞMURU!",
      "DERİN SUYA DALIŞ! ALTTAN GAYZER VE YILDIRIMLI ÇENE!"
    ],
    weakHitLines: [
      "ŞŞŞAAAK—!! KUYRUK YÜZGEÇLERİME NASIL ULAŞTIN?!",
      "GRRAAAH! BAŞIM DÖNÜYOR… GÜVERTEYE YIKILIYORUM!"
    ],
    missLines: [
      "ŞŞŞAAAK! SADECE DALGALARI DÖVDÜN FANİ!",
      " FIRTINA RÜZGÂRI ATIŞINI DENİZE GÖMDÜ!"
    ]
  }
  },
  dramaticAttacks: {
  sub_coral_golem_slam: {
    key: "sub_coral_golem_slam",
    title: "BATIK TERSANE ÇAPA DARBESİ & BORDA TOPU",
    ono: "ÇAPA GÜMBÜRTÜSÜ!!",
    line: "DEV DEMİR ÇAPAM RIHTIMI YARACAK! BORDA TOPU ATEŞ!",
    hint: "Pirinç dalgıç başlığı lumbuz camını vurarak x2.0 Kritik vur ve topu kilitle!",
    bg: SHM_ASSETS_PATHS.abraBgDockVault,
    poseImg: SHM_ASSETS_PATHS.abraGolemBody,
    glow: "#4deeea",
    el: "buz",
    vp: "64% 44%"
  },
  abra_tsunami: {
    key: "abra_tsunami",
    title: "DERYA KUYRUK ŞAMARI & TSUNAMİ DALGASI",
    ono: "TSUNAMİ!!",
    line: "KUYRUĞUMLA DENİZİ ŞAHLANDIRACAĞIM! GÜVERTEDEN SÜPÜRÜLECEKSİN!",
    hint: "Demir Çapa (⚓) kullanarak dalga savrulmasını %75 azalt!",
    bg: SHM_ASSETS_PATHS.abraBgArena,
    poseImg: SHM_ASSETS_PATHS.abraHeadRoar,
    glow: "#4deeea",
    el: "buz",
    vp: "64% 44%"
  },
  abra_dive: {
    key: "abra_dive",
    title: "ABİSAL SUYA DALIŞ & ALTTAN GAYZER PUSU",
    ono: "DERİN DALIŞ!!",
    line: "DERİN SULARA DALIYORUM! GÜVERTENİN ALTINDAN FIŞKIRACAĞIM!",
    hint: "Su kaynaması (Telegraph Boil) beliren güverte diliminden uzaklaş!",
    bg: SHM_ASSETS_PATHS.abraBgArena,
    poseImg: SHM_ASSETS_PATHS.abraHeadRoar,
    glow: "#00b4d8",
    el: "buz",
    vp: "64% 44%"
  },
  abra_lightning: {
    key: "abra_lightning",
    title: "ABİSAL YILDIRIMLI ÇENE & GÜVERTE DARBESİ",
    ono: "ABİSAL YILDIRIM!!",
    line: "YILDIRIMLI ÇENEMLE KADIRGANIN GÜVERTESİNİ PARÇALAYACAĞIM!",
    hint: "Fosforlu Kuyruk Yüzgecini 2 kez vurarak Abra'yı 2 tur STAGGER yap!",
    bg: SHM_ASSETS_PATHS.abraBgArena,
    poseImg: SHM_ASSETS_PATHS.abraHeadRoar,
    glow: "#4deeea",
    el: "firtina",
    vp: "64% 42%"
  },
  abra_emerge: {
    key: "abra_emerge",
    title: "ABİSAL GAYZER FIŞKIRMASI & YÜZEYE ÇIKIŞ",
    ono: "ALTTAN GAYZER!!",
    line: "SULARIN DİBİNDEN KOPUP GELDİM! GÜVERTE ÇÖKECEK!",
    hint: "Abra yeni bir mevkide yüzeye çıktı!",
    bg: SHM_ASSETS_PATHS.abraBgArena,
    poseImg: SHM_ASSETS_PATHS.abraHeadRoar,
    glow: "#38bdf8",
    el: "buz",
    vp: "64% 44%"
  }
  },

  bindAbraTerLoad(im) {
    if (im && !im._boundAbraReinit) {
      im._boundAbraReinit = true;
      im.onload = () => {
        if (SHM.open && SHM.screen === "battle" && SHM.raidId === "abra") {
          const plugin = RAID_PLUGINS.abra;
          if (plugin && typeof plugin.paintTerrain === "function" && SHM.terrainCtx && SHM.heightMap) {
            plugin.paintTerrain(SHM.terrainCtx, SHM.heightMap, SHM.WORLD_W, SHM.WORLD_H, "abra_boss");
          }
        }
      };
    }
  },

  fillFallbackSeaTerrain(tctx, hMap, W, H, color) {
    for (let x = 0; x < W; x++) {
      const topY = Math.round(hMap[x]);
      if (topY >= 1440) continue;
      tctx.fillStyle = color;
      tctx.fillRect(x, topY, 1, H - topY);
    }
  },

  modifyEnemyDamage(e, pr, dmg) {
    if (e.type === "karkinos") {
      const shotAng = pr.launchAngle != null ? pr.launchAngle : (SHM.lastShotAngle || 38);
      if (shotAng <= 38) {
        dmg = Math.max(15, Math.round(dmg * 0.40));
        e.clawDeflectTimer = 28;
        addFloatText(e.x, e.y - 126, "🛡️ KISKAÇ KALKANI! YÜKSEK AÇIYLA (55°+) AŞIRT!", "#38bdf8", 19, true);
      } else if (shotAng >= 52) {
        dmg = Math.round(dmg * 1.50);
        SHM.stats.crownHits = (SHM.stats.crownHits || 0) + 1;
        addFloatText(e.x, e.y - 126, `🎯 AŞIRTMA KABUK KRİTİĞİ! x1.5 (-${dmg})`, "#fde047", 21, true);
      }
    }
    return dmg;
  },

  renderBehindTerrain(ctx, W, tSec) {
    if (SHM.selectedStage === 1 || SHM.selectedStage === 2 || SHM.selectedStage === 4) {
      const camX = (SHM.cam && SHM.cam.x) || 0;
      const camZoom = (SHM.cam && SHM.cam.zoom) || 1;
      const vw = typeof document !== "undefined" && document.getElementById("shmCanvas") ? document.getElementById("shmCanvas").width / camZoom : W;
      drawUndulatingWaveBelt(ctx, SHM_IMAGES.abraSeaBelt, W, 1182, 195, tSec, -46, 12, 0.0042, 0.72, camX, vw);
    }
  },

  renderMidgroundFX(ctx, W, tSec) {
    if (SHM.selectedStage === 1 || SHM.selectedStage === 2 || SHM.selectedStage === 4) {
      const camX = (SHM.cam && SHM.cam.x) || 0;
      const camZoom = (SHM.cam && SHM.cam.zoom) || 1;
      const vw = typeof document !== "undefined" && document.getElementById("shmCanvas") ? document.getElementById("shmCanvas").width / camZoom : W;
      drawUndulatingWaveBelt(ctx, SHM_IMAGES.abraSeaBelt, W, 1212, 180, tSec + 1.8, -82, 15, 0.0052, 0.86, camX, vw);
    }
  },

  renderForegroundFX(ctx, W, p, tSec) {
  const dt = SHM._lastDt || 0.0166;
  const dtScale = dt * 60;

  if (Array.isArray(SHM.activeTsunamis) && SHM.activeTsunamis.length > 0) {
    for (const ts of SHM.activeTsunamis) {
      ts.timer = (ts.timer || 0) + dtScale;
      const pProg = Math.max(0.01, Math.min(0.99, ts.timer / (ts.maxTimer || 58)));
      drawVfxDissipatingTsunami(
        ctx,
        SHM_IMAGES.abraWaveTsunami,
        ts.startX,
        ts.travelDist,
        ts.baseY,
        ts.maxW,
        ts.maxH,
        pProg,
        tSec
      );

      // Görev 4.5: Dalganın o anki waveX'ine göre gerçek çarpışma
      const easeP = 1 - Math.pow(1 - pProg, 1.45);
      const waveX = ts.startX - easeP * ts.travelDist;
      const hitRadius = (ts.maxW || 360) * 0.35;
      if (!ts.hitIds) ts.hitIds = new Set();

      const candidateUnits = [];
      if (p && p.hp > 0) candidateUnits.push({ unit: p, id: "player", isPlayer: true });
      if (Array.isArray(SHM.coopUnits)) {
        SHM.coopUnits.forEach((cu, idx) => {
          if (cu && cu.hp > 0) candidateUnits.push({ unit: cu, id: cu.id || `coop_${idx}`, isPlayer: false });
        });
      }

      for (const cuEntry of candidateUnits) {
        const u = cuEntry.unit;
        if (!ts.hitIds.has(cuEntry.id) && Math.abs(u.x - waveX) <= hitRadius) {
          ts.hitIds.add(cuEntry.id);
          const baseDmg = ts.dmg || 150;
          if (cuEntry.isPlayer && u.anchorBraced) {
            u.anchorBraced = false;
            u.anchorAimBonus = 0.25;
            const pushX = -18;
            u.x = Math.max(180, Math.min(2420, u.x + pushX));
            const reducedDmg = Math.round(baseDmg * 0.35);
            u.hp = Math.max(0, u.hp - reducedDmg);
            settleUnitsOnTerrain();
            addFloatText(u.x, u.y - 115, `⚓ DEMİR ÇAPA TUTUNDU! DALGA İTMESİ -%75 & +%25 BONUS! (-${reducedDmg})`, "#5eead4", 19, true);
          } else {
            const pushX = cuEntry.isPlayer ? -78 : -45;
            u.x = Math.max(180, Math.min(2420, u.x + pushX));
            u.hp = Math.max(0, u.hp - baseDmg);
            u.hitFlash = 8;
            settleUnitsOnTerrain();
            const tag = cuEntry.isPlayer ? "🌊 TSUNAMİ DALGASI SAVURDU" : `🌊 ${u.name || "YOLDAŞ"} DALGAYA KAPILDI`;
            addFloatText(u.x, u.y - 108, `${tag} -${baseDmg}!`, "#38bdf8", 19, true);
          }
        }
      }
    }
    SHM.activeTsunamis = SHM.activeTsunamis.filter(ts => ts.timer < (ts.maxTimer || 58));
  }

  // ABRA PROSEDÜREL VFX EFEKTLERİ (`dive`, `boil`, `geyser`, `lightning`, `deck_slam`, `scale_hit`)
  if (Array.isArray(SHM.abraActiveVfx) && SHM.abraActiveVfx.length > 0) {
    for (const fx of SHM.abraActiveVfx) {
      fx.timer -= dtScale;
      const prog = Math.max(0, Math.min(1, 1 - fx.timer / Math.max(1, fx.maxTimer || 40)));
      const alpha = prog < 0.2 ? prog / 0.2 : Math.max(0, 1 - (prog - 0.2) / 0.8);
      if (fx.type === "dive") {
        drawAbraPivot(ctx, SHM_IMAGES.abraVfxDive, fx.x, fx.y, 260 * (0.8 + prog * 0.4), 210 * (0.85 + prog * 0.3), 0.5, 0.85, 0, alpha);
      } else if (fx.type === "boil") {
        drawAbraPivot(ctx, SHM_IMAGES.abraVfxBoil, fx.x, fx.y, 220 * (0.85 + Math.sin(tSec * 8) * 0.08), 88, 0.5, 0.5, tSec * 90, alpha);
      } else if (fx.type === "geyser") {
        const gScaleY = prog < 0.35 ? prog / 0.35 : Math.max(0.2, 1 - (prog - 0.35) / 0.65);
        drawAbraPivot(ctx, SHM_IMAGES.abraVfxGeyser, fx.x, fx.y, 230, 340 * gScaleY, 0.5, 0.92, 0, alpha);
      } else if (fx.type === "lightning") {
        const midX = (fx.x1 + fx.x2) * 0.5;
        const midY = (fx.y1 + fx.y2) * 0.5;
        const dist = Math.hypot(fx.x2 - fx.x1, fx.y2 - fx.y1);
        const deg = (Math.atan2(fx.y2 - fx.y1, fx.x2 - fx.x1) * 180) / Math.PI;
        drawAbraPivot(ctx, SHM_IMAGES.abraVfxLightning, midX, midY, Math.max(220, dist), 130, 0.5, 0.5, deg, alpha);
      } else if (fx.type === "deck_slam") {
        drawAbraPivot(ctx, SHM_IMAGES.abraVfxDeckSlam, fx.x, fx.y, 210 * (0.75 + prog * 0.45), 145, 0.5, 0.78, 0, alpha);
      } else if (fx.type === "scale_hit") {
        drawAbraPivot(ctx, SHM_IMAGES.abraVfxScaleHit, fx.x, fx.y, 175 * (0.7 + prog * 0.5), 175 * (0.7 + prog * 0.5), 0.5, 0.5, prog * 65, alpha);
      }
    }
    SHM.abraActiveVfx = SHM.abraActiveVfx.filter(fx => fx.timer > 0);
  }

  // ABRA ÖN KÖPÜKLÜ DALGA KUŞAĞI (`abra_sea_swell_belt.webp`)
  if (SHM.selectedStage === 1 || SHM.selectedStage === 2 || SHM.selectedStage === 4) {
    const camX = (SHM.cam && SHM.cam.x) || 0;
    const camZoom = (SHM.cam && SHM.cam.zoom) || 1;
    const vw = typeof document !== "undefined" && document.getElementById("shmCanvas") ? document.getElementById("shmCanvas").width / camZoom : W;
    drawUndulatingWaveBelt(ctx, SHM_IMAGES.abraSwellBelt, W, 1246, 165, tSec + 3.1, -125, 19, 0.0066, 0.92, camX, vw);
  }
  },

  renderCustomProjectile(ctx, pr, tSec) {
    if (pr.isAbyssalOrb && SHM_IMAGES.abraProjOrb && SHM_IMAGES.abraProjOrb.complete) {
      const pProg = Math.max(0.05, Math.min(0.80, pr.age / (pr.flightT || 72)));
      drawProjAbyssalOrb(
        ctx,
        SHM_IMAGES.abraProjOrb,
        SHM_IMAGES.abraVfxSplash,
        pr.startX || pr.x,
        pr.startY || pr.y,
        pr.x,
        pr.y,
        0,
        74,
        pProg,
        tSec
      );
      return true;
    }
    if (pr.isCoralLance && SHM_IMAGES.abraProjLance && SHM_IMAGES.abraProjLance.complete) {
      const deg = (Math.atan2(pr.vy, pr.vx) * 180) / Math.PI + 180;
      const wobY = 1.0 + Math.sin(tSec * 26) * 0.08;
      drawAbraPivot(ctx, SHM_IMAGES.abraProjLance, pr.x, pr.y, 128, 48 * wobY, 0.5, 0.5, deg, 0.98);
      return true;
    }
    return false;
  }
});
