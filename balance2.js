"use strict";

// ═══════════════════════════════════════════════════════════════════════════════
//  BALANCE VAULT v11.0 — Coffre-fort mécanique, design entièrement repensé
//  Auteur   : Christus
//  Concept  : le solde devient un coffre-fort à roulettes mécaniques (odomètre),
//             entouré d'un cadran de combinaison qui pointe vers le palier actuel
//  Canvas   : 1600 × 700 px — totalement différent de la v10 (galaxie/passeport)
// ═══════════════════════════════════════════════════════════════════════════════

const fs     = require("fs-extra");
const path   = require("path");
const axios  = require("axios");
const moment = require("moment-timezone");

let loadImage, createCanvas, registerFont;
let canvasAvailable = false;
try {
  const cv = require("canvas");
  loadImage    = cv.loadImage;
  createCanvas = cv.createCanvas;
  registerFont = cv.registerFont;
  canvasAvailable = true;
} catch (e) { console.error("Canvas indisponible :", e.message); }

let fontsLoaded = false;
function ensureFonts() {
  if (fontsLoaded || !canvasAvailable || !registerFont) return;
  fontsLoaded = true;
  try {
    if (typeof __dirname !== "string") return;
    const fd = path.join(__dirname, "assets", "font");
    if (!fs.existsSync(fd)) return;
    const fontFiles = [
      ["BeVietnamPro-Bold.ttf",    "BF", "bold"],
      ["BeVietnamPro-Regular.ttf", "BF", "normal"],
      ["BeVietnamPro-SemiBold.ttf","BF", "600"],
      ["NotoSans-Bold.ttf",        "BF", "bold"],
      ["NotoSans-Regular.ttf",     "BF", "normal"],
    ];
    for (const [f, fam, w] of fontFiles) {
      try {
        if (typeof f !== "string") continue;
        const fp = path.join(fd, f);
        if (fs.existsSync(fp)) registerFont(fp, { family: fam, weight: w });
      } catch (_) {}
    }
  } catch (_) {}
}

const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIGURATION ECONOMIQUE (identique à la v10 — logique métier conservée)
// ═══════════════════════════════════════════════════════════════════════════════
const ECONOMY = {
  currency: { sym: "$" },
  transfer: {
    min: 10, max: 1_000_000,
    taxes: [
      { max: 1_000,   rate: 2  },
      { max: 10_000,  rate: 5  },
      { max: 50_000,  rate: 8  },
      { max: 100_000, rate: 10 },
      { max: 500_000, rate: 12 },
      { max: Infinity,rate: 15 },
    ],
  },
  daily: { base: 100, streakMult: 0.1, resetHours: 21 },
  tiers: [
    { name: "Starter", min: 0,       max: 999,      color: "#CD7F32", sym: "◈", mult: 1.0 },
    { name: "Rookie",  min: 1_000,   max: 4_999,    color: "#C0C0C0", sym: "◇", mult: 1.1 },
    { name: "Pro",     min: 5_000,   max: 19_999,   color: "#FFD700", sym: "◆", mult: 1.2 },
    { name: "Elite",   min: 20_000,  max: 49_999,   color: "#E8E8FF", sym: "◉", mult: 1.3 },
    { name: "Master",  min: 50_000,  max: 99_999,   color: "#00FFFF", sym: "▣", mult: 1.5 },
    { name: "Legend",  min: 100_000, max: 499_999,  color: "#FF00FF", sym: "▲", mult: 2.0 },
    { name: "GOD",     min: 500_000, max: Infinity,  color: "#FF2020", sym: "◎", mult: 3.0 },
  ],
};

function formatMoney(n) {
  if (n == null || isNaN(n)) return `${ECONOMY.currency.sym}0`;
  n = Number(n);
  if (!isFinite(n)) return `${ECONOMY.currency.sym}∞`;
  const SCALES = [
    { v: 1e18, s: "Qi" }, { v: 1e15, s: "Qa" }, { v: 1e12, s: "T" },
    { v: 1e9,  s: "B"  }, { v: 1e6,  s: "M"  }, { v: 1e3,  s: "K" },
  ];
  const sc = SCALES.find(s => Math.abs(n) >= s.v);
  if (sc) {
    const v = (Math.abs(n) / sc.v).toFixed(2).replace(/\.00$/, "");
    return `${n < 0 ? "-" : ""}${ECONOMY.currency.sym}${v}${sc.s}`;
  }
  const p = Math.abs(n).toFixed(2).split(".");
  p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${ECONOMY.currency.sym}${p.join(".")}`;
}

function getTier(balance) {
  const b = Number(balance) || 0;
  const t = ECONOMY.tiers.find(t => b >= t.min && b <= t.max) || ECONOMY.tiers[0];
  const idx  = ECONOMY.tiers.indexOf(t);
  const next = ECONOMY.tiers[idx + 1] || null;
  const prog = t.max === Infinity ? 100 : Math.min(100, ((b - t.min) / (t.max - t.min)) * 100);
  return { ...t, next, prog, idx };
}

function calcTax(amount) {
  const { rate } = ECONOMY.transfer.taxes.find(r => amount <= r.max) || ECONOMY.transfer.taxes.at(-1);
  const tax = Math.ceil((amount * rate) / 100);
  return { rate, tax, total: amount + tax };
}

function txID() {
  return ("TX" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  10 THÈMES — finitions de coffre-fort (matériaux, pas de néon)
// ═══════════════════════════════════════════════════════════════════════════════
const THEMES = {
  acier_brosse:    { name: "Acier Brossé",     metal: "#8A9099", metalDark: "#454A52", brass: "#D4AF37", brassDark: "#8A6D1C", bg1: "#0E1013", bg2: "#181B1F", text: "#F2EFE6", glow: "#D4AF37" },
  laiton_imperial: { name: "Laiton Impérial",  metal: "#D4AF37", metalDark: "#8A6D1C", brass: "#FFE680", brassDark: "#B8860B", bg1: "#120E05", bg2: "#1E1608", text: "#FFF3D6", glow: "#FFD700" },
  bronze_archive:  { name: "Bronze d'Archive", metal: "#A77B4D", metalDark: "#5E3F22", brass: "#D4A24C", brassDark: "#8A6230", bg1: "#100A05", bg2: "#1C130A", text: "#F2E6D4", glow: "#D4A24C" },
  cuivre_oxyde:    { name: "Cuivre Oxydé",     metal: "#5C8A7A", metalDark: "#2E4A40", brass: "#7FBFA8", brassDark: "#3E6E5C", bg1: "#06120D", bg2: "#0E2018", text: "#E0F2EC", glow: "#7FBFA8" },
  fer_forge:       { name: "Fer Forgé",        metal: "#6A6E76", metalDark: "#36383C", brass: "#B0392B", brassDark: "#6E1F16", bg1: "#0C0C0E", bg2: "#161618", text: "#EDEDEF", glow: "#B0392B" },
  argent_massif:   { name: "Argent Massif",    metal: "#C8CCD2", metalDark: "#6E7278", brass: "#9FB3C8", brassDark: "#566678", bg1: "#0A0C0E", bg2: "#161A1E", text: "#F4F6F8", glow: "#9FB3C8" },
  obsidienne_bank: { name: "Obsidienne Bank",  metal: "#3A3450", metalDark: "#1C1830", brass: "#9B59FF", brassDark: "#5A2E9A", bg1: "#08060F", bg2: "#120E1E", text: "#EDE6FF", glow: "#9B59FF" },
  emeraude_coffre: { name: "Émeraude Coffre",  metal: "#3F8A5F", metalDark: "#1E4A30", brass: "#4ECDA0", brassDark: "#226B4E", bg1: "#04140A", bg2: "#0A2014", text: "#E0FFE8", glow: "#4ECDA0" },
  rubis_securite:  { name: "Rubis Sécurité",   metal: "#8A2F3A", metalDark: "#4A1620", brass: "#E04050", brassDark: "#8A1F2A", bg1: "#100406", bg2: "#1E0A0C", text: "#FFE0E4", glow: "#E04050" },
  platine_vault:   { name: "Platine Vault",    metal: "#D8D8D8", metalDark: "#8A8A8A", brass: "#E8E8E8", brassDark: "#A0A0A0", bg1: "#0C0C0C", bg2: "#1A1A1A", text: "#FAFAFA", glow: "#E8E8E8" },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PRIMITIVES DE DESSIN
// ═══════════════════════════════════════════════════════════════════════════════
function rr(ctx, x, y, w, h, r) {
  if (typeof r === "number") r = [r,r,r,r];
  const [tl,tr,br,bl] = r;
  ctx.beginPath();
  ctx.moveTo(x+tl,y); ctx.lineTo(x+w-tr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+tr);
  ctx.lineTo(x+w,y+h-br); ctx.quadraticCurveTo(x+w,y+h,x+w-br,y+h);
  ctx.lineTo(x+bl,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-bl);
  ctx.lineTo(x,y+tl); ctx.quadraticCurveTo(x,y,x+tl,y); ctx.closePath();
}

function T(ctx, s, x, y, sz, color, {align="left",weight="bold",glow=null,alpha=1}={}) {
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.font=`${weight} ${sz}px BF, Arial`;
  ctx.textAlign=align; ctx.textBaseline="middle";
  if(glow){ctx.shadowColor=glow;ctx.shadowBlur=14;}
  ctx.fillStyle=color; ctx.fillText(s,x,y); ctx.restore();
}

function GL(ctx, x1,y1,x2,y2, color, w=1.5) {
  const g=ctx.createLinearGradient(x1,y1,x2,y2);
  g.addColorStop(0,"transparent");g.addColorStop(.5,color);g.addColorStop(1,"transparent");
  ctx.save();ctx.strokeStyle=g;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
}

// ─── Fond acier brossé avec texture horizontale ──────────────────────────────
function drawVaultBg(ctx, W, H, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, t.bg1); g.addColorStop(0.5, t.bg2); g.addColorStop(1, t.bg1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Texture "brossée" : fines lignes horizontales irrégulières
  ctx.save();
  ctx.strokeStyle = t.metal; ctx.globalAlpha = 0.035;
  for (let y = 0; y < H; y += 2) {
    ctx.lineWidth = Math.random() * 0.8 + 0.2;
    ctx.beginPath(); ctx.moveTo(0, y + (Math.random()-0.5)*1.5); ctx.lineTo(W, y + (Math.random()-0.5)*1.5); ctx.stroke();
  }
  ctx.restore();

  // Vignette
  const vg = ctx.createRadialGradient(W/2, H/2, Math.max(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // Lueur ambiante laiton
  const ag = ctx.createRadialGradient(W*0.75, H*0.3, 0, W*0.75, H*0.3, 500);
  ag.addColorStop(0, t.brass + "14"); ag.addColorStop(1, "transparent");
  ctx.fillStyle = ag; ctx.fillRect(0, 0, W, H);
}

// ─── Rivet métallique décoratif ──────────────────────────────────────────────
function drawRivet(ctx, x, y, r, t) {
  const g = ctx.createRadialGradient(x - r*0.3, y - r*0.3, 0, x, y, r);
  g.addColorStop(0, t.metal); g.addColorStop(0.6, t.metalDark); g.addColorStop(1, "#000");
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

// ─── Bordure de coffre-fort avec rivets aux coins et au centre des bords ─────
function drawVaultFrame(ctx, W, H, t) {
  const P = 18;
  ctx.save();
  ctx.shadowColor = t.glow; ctx.shadowBlur = 22;
  ctx.strokeStyle = t.brass; ctx.lineWidth = 3;
  rr(ctx, P, P, W-P*2, H-P*2, 10); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = t.metalDark; ctx.lineWidth = 1;
  rr(ctx, P+6, P+6, W-P*2-12, H-P*2-12, 8); ctx.stroke();
  ctx.restore();

  // Rivets aux 4 coins + milieux des bords
  const positions = [
    [P+14, P+14], [W-P-14, P+14], [P+14, H-P-14], [W-P-14, H-P-14],
    [W/2, P+14], [W/2, H-P-14],
  ];
  positions.forEach(([x,y]) => drawRivet(ctx, x, y, 6, t));
}

// ─── Cadran de combinaison (anneau gradué autour de l'avatar) ────────────────
function drawCombinationDial(ctx, cx, cy, R, tier, allTiers, t) {
  // Anneau de fond métallique
  ctx.save();
  const ringG = ctx.createRadialGradient(cx, cy, R-20, cx, cy, R+20);
  ringG.addColorStop(0, t.metalDark); ringG.addColorStop(1, t.metal);
  ctx.strokeStyle = ringG; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.stroke();
  ctx.restore();

  // Graduations (1 par palier)
  const tierIdx = allTiers.findIndex(tt => tt.name === tier.name);
  const totalTicks = allTiers.length;
  for (let i = 0; i < totalTicks; i++) {
    const angle = (i / totalTicks) * Math.PI * 2 - Math.PI/2;
    const isActive = i <= tierIdx;
    const tx1 = cx + Math.cos(angle) * (R - 8);
    const ty1 = cy + Math.sin(angle) * (R - 8);
    const tx2 = cx + Math.cos(angle) * (R + 8);
    const ty2 = cy + Math.sin(angle) * (R + 8);
    ctx.save();
    ctx.strokeStyle = isActive ? t.brass : t.metalDark;
    ctx.lineWidth = isActive ? 3 : 2;
    if (isActive) { ctx.shadowColor = t.glow; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx2, ty2); ctx.stroke();
    ctx.restore();
  }

  // Aiguille pointant vers le palier actuel
  const needleAngle = (tierIdx / totalTicks) * Math.PI * 2 - Math.PI/2 + (Math.PI/totalTicks);
  const needleLen = R - 26;
  ctx.save();
  ctx.strokeStyle = t.glow; ctx.lineWidth = 3;
  ctx.shadowColor = t.glow; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(needleAngle)*needleLen, cy + Math.sin(needleAngle)*needleLen); ctx.stroke();
  ctx.restore();
  // Pivot central de l'aiguille
  ctx.save();
  ctx.fillStyle = t.brass; ctx.shadowColor = t.glow; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // Vis décoratives sur l'anneau (haut, bas, gauche, droite)
  [0, Math.PI/2, Math.PI, -Math.PI/2].forEach(a => {
    const vx = cx + Math.cos(a) * R;
    const vy = cy + Math.sin(a) * R;
    drawRivet(ctx, vx, vy, 7, t);
  });
}

// ─── Avatar circulaire avec halo ─────────────────────────────────────────────
async function drawVaultAvatar(ctx, avatarPath, cx, cy, R, t) {
  if (avatarPath) {
    try {
      const img = await loadImage(avatarPath);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(img, cx-R, cy-R, R*2, R*2);
      ctx.restore();
    } catch (_) { drawAvatarFallback(ctx, cx, cy, R, "?", t); }
  } else {
    drawAvatarFallback(ctx, cx, cy, R, "?", t);
  }
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
  ctx.strokeStyle = t.brass; ctx.lineWidth = 4;
  ctx.shadowColor = t.glow; ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.restore();
}
function drawAvatarFallback(ctx, cx, cy, R, init, t) {
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  bg.addColorStop(0, t.brass + "AA"); bg.addColorStop(1, t.metalDark + "AA");
  ctx.fillStyle = bg; ctx.fillRect(cx-R, cy-R, R*2, R*2);
  T(ctx, init.toUpperCase(), cx, cy, R*0.7, t.text, { align:"center" });
}

// ─── Odomètre : roulettes numériques empilées horizontalement ───────────────
// Affiche le montant chiffre par chiffre dans des "fenêtres" mécaniques séparées
function drawOdometer(ctx, x, y, digitStr, digitW, digitH, t) {
  const chars = digitStr.split("");
  let cx = x;
  chars.forEach(ch => {
    if (ch === "," || ch === "." ) {
      // Séparateur — pas de fenêtre mécanique, juste le symbole
      T(ctx, ch, cx + 6, y + digitH/2, digitH*0.6, t.text, { align:"center" });
      cx += digitW * 0.45;
      return;
    }
    // Fenêtre mécanique (cadre métallique + fond sombre)
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    rr(ctx, cx, y, digitW, digitH, 5); ctx.fill();
    ctx.strokeStyle = t.metal; ctx.lineWidth = 2;
    rr(ctx, cx, y, digitW, digitH, 5); ctx.stroke();
    ctx.restore();

    // Ligne médiane (jointure du rouleau)
    ctx.save();
    ctx.strokeStyle = t.metalDark; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx+4, y + digitH/2); ctx.lineTo(cx+digitW-4, y + digitH/2); ctx.stroke();
    ctx.restore();

    // Chiffre
    T(ctx, ch, cx + digitW/2, y + digitH/2, digitH*0.62, t.brass, { align:"center", glow: t.glow });

    cx += digitW + 4;
  });
  return cx - x; // largeur totale utilisée
}

// ─── Carte statistique compacte ──────────────────────────────────────────────
function statTile(ctx, x, y, w, h, sym, label, val, t) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.3)"; rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = t.metal + "60"; ctx.lineWidth = 1; rr(ctx, x, y, w, h, 8); ctx.stroke();
  ctx.restore();
  T(ctx, sym, x+14, y+h/2-9, 14, t.brass, {});
  T(ctx, label, x+14, y+h/2+11, 11, t.text, { alpha:0.5, weight:"600" });
  T(ctx, val, x+w-12, y+h/2, 18, t.brass, { align:"right", glow: t.glow });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CANVAS PRINCIPAL — 1600 × 700, layout "COFFRE-FORT MÉCANIQUE"
//  Totalement différent : cadran de combinaison + odomètre à roulettes
// ═══════════════════════════════════════════════════════════════════════════════
const CW = 1600, CH = 700;
const PAD = 30;
const DIAL_CX = PAD + 170;
const DIAL_CY = CH / 2;
const DIAL_R = 150;
const SEP_X = PAD + 360;
const CONTENT_X = SEP_X + 50;
const CONTENT_W = CW - CONTENT_X - PAD - 20;

async function buildCanvas(data, theme, avatarPath) {
  ensureFonts();
  const canvas = createCanvas(CW, CH);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

  // ── 1. Fond acier ─────────────────────────────────────────────────────────
  drawVaultBg(ctx, CW, CH, theme);

  // ── 2. Carte / panneau principal ──────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 45; ctx.shadowOffsetY = 6;
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  rr(ctx, PAD, PAD, CW - PAD*2, CH - PAD*2, 14);
  ctx.fill(); ctx.restore();

  // ── 3. Cadre coffre-fort avec rivets ──────────────────────────────────────
  drawVaultFrame(ctx, CW, CH, theme);

  // ── 4. Séparateur vertical ────────────────────────────────────────────────
  GL(ctx, SEP_X, PAD + 30, SEP_X, CH - PAD - 30, theme.brass, 1.5);

  // ── 5. Cadran de combinaison + avatar ─────────────────────────────────────
  const tier = getTier(data.balance);
  drawCombinationDial(ctx, DIAL_CX, DIAL_CY, DIAL_R, tier, ECONOMY.tiers, theme);
  await drawVaultAvatar(ctx, avatarPath, DIAL_CX, DIAL_CY, DIAL_R - 38, theme);

  // Badge palier sous le cadran
  ctx.save();
  ctx.fillStyle = theme.brass; ctx.shadowColor = theme.glow; ctx.shadowBlur = 14;
  rr(ctx, DIAL_CX - 64, DIAL_CY + DIAL_R + 16, 128, 32, 16); ctx.fill();
  ctx.restore();
  T(ctx, `${tier.sym}  ${tier.name.toUpperCase()}`, DIAL_CX, DIAL_CY + DIAL_R + 32, 14, theme.bg1, { align:"center" });

  // Multiplicateur sous le badge
  T(ctx, `MULTIPLICATEUR ${tier.mult}x`, DIAL_CX, DIAL_CY + DIAL_R + 60, 12, theme.text, { align:"center", alpha:0.55, weight:"600" });

  // Thème en haut de la zone gauche
  T(ctx, `${theme.name.toUpperCase()}`, DIAL_CX, PAD + 36, 13, theme.text, { align:"center", alpha:0.45, weight:"600" });

  // ── 6. Titre zone droite ──────────────────────────────────────────────────
  T(ctx, "◈  COFFRE-FORT PERSONNEL  ◈", CONTENT_X, PAD + 36, 14, theme.text, { alpha:0.55, weight:"600" });

  // ── 7. ODOMÈTRE — affichage mécanique du solde ────────────────────────────
  const ODO_Y = PAD + 70;
  const balanceDisplay = formatMoney(data.balance);
  const ODO_DW = 52, ODO_DH = 76;
  ctx.save();
  T(ctx, "$", CONTENT_X, ODO_Y + ODO_DH/2, ODO_DH*0.5, theme.text, { alpha:0.4 });
  ctx.restore();
  drawOdometer(ctx, CONTENT_X + 36, ODO_Y, balanceDisplay.replace(/^\$/, ""), ODO_DW, ODO_DH, theme);

  T(ctx, "SOLDE ACTUEL EN ROULETTES", CONTENT_X, ODO_Y + ODO_DH + 22, 12, theme.text, { alpha:0.45, weight:"600" });

  // ── 8. Identité ───────────────────────────────────────────────────────────
  const META_Y = ODO_Y + ODO_DH + 56;
  const username = (data.vanity && !data.vanity.includes("profile.php")) ? `@${data.vanity}` : `ID ${data.uid}`;
  T(ctx, data.name.length > 26 ? data.name.slice(0,24)+"…" : data.name, CONTENT_X, META_Y, 24, theme.text, { weight:"700" });
  T(ctx, `${username}   ·   Rang #${data.globalRank}   ·   Top ${data.topPct}%`, CONTENT_X, META_Y + 26, 14.5, theme.text, { alpha:0.6, weight:"600" });

  GL(ctx, CONTENT_X, META_Y + 46, CONTENT_X + CONTENT_W, META_Y + 46, theme.brass, 1.2);

  // ── 9. Barre de progression vers le prochain palier ───────────────────────
  const BAR_Y = META_Y + 68;
  const BAR_H = 22;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.4)"; rr(ctx, CONTENT_X, BAR_Y, CONTENT_W, BAR_H, 11); ctx.fill();
  ctx.restore();
  ctx.save();
  const pg = ctx.createLinearGradient(CONTENT_X, BAR_Y, CONTENT_X + CONTENT_W, BAR_Y);
  pg.addColorStop(0, theme.brassDark); pg.addColorStop(1, theme.brass);
  ctx.shadowColor = theme.glow; ctx.shadowBlur = 10; ctx.fillStyle = pg;
  rr(ctx, CONTENT_X, BAR_Y, Math.max(CONTENT_W * (tier.prog/100), 18), BAR_H, 11); ctx.fill();
  ctx.restore();
  const progLabel = tier.next
    ? `${tier.prog.toFixed(1)}%  vers  ${tier.next.name}`
    : `${tier.sym}  PALIER MAXIMUM`;
  T(ctx, progLabel, CONTENT_X + CONTENT_W/2, BAR_Y + BAR_H/2, 12, theme.bg1, { align:"center" });

  // ── 10. Grille de stat-tiles 3×2 ──────────────────────────────────────────
  const GRID_Y = BAR_Y + BAR_H + 24;
  const GCOLS = 3, GGAP = 14;
  const TILE_W = Math.floor((CONTENT_W - GGAP*(GCOLS-1)) / GCOLS);
  const TILE_H = 72;
  const stats = [
    { sym:"◈", label:"Rang global",     val:`#${data.globalRank}` },
    { sym:"◉", label:"Membres",          val:String(data.totalUsers) },
    { sym:"◆", label:"Top",              val:`${data.topPct}%` },
    { sym:"◇", label:"Palier",           val:tier.name },
    { sym:"▣", label:"Prochain palier",  val:tier.next ? formatMoney(tier.next.min - data.balance) : "MAX" },
    { sym:"▲", label:"Streak daily",     val:`${data.streak} j` },
  ];
  stats.forEach((s, i) => {
    const col = i % GCOLS, row = Math.floor(i / GCOLS);
    statTile(ctx, CONTENT_X + col*(TILE_W+GGAP), GRID_Y + row*(TILE_H+GGAP), TILE_W, TILE_H, s.sym, s.label, s.val, theme);
  });

  // ── 11. Pied de page ──────────────────────────────────────────────────────
  const FOOT_Y = CH - PAD - 22;
  GL(ctx, CONTENT_X, FOOT_Y - 16, CONTENT_X + CONTENT_W, FOOT_Y - 16, theme.brass, 1);
  const now = moment().tz("Asia/Dhaka").format("DD/MM/YYYY  HH:mm");
  T(ctx, `${theme.name}  ·  Christus  ·  ${now}`, CONTENT_X, FOOT_Y, 12, theme.text, { alpha:0.4, weight:"600" });

  return canvas;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name:        "balance",
    aliases:     ["bal", "$", "cash", "solde", "coffre"],
    version:     "11.0",
    author:      "Christus",
    countDown:   3,
    role:        0,
    description: { fr: "◈ Balance Vault v11 — Coffre-fort mécanique, 10 finitions, pixel-perfect." },
    category:    "economy",
    guide: {
      fr: [
        "◈  BALANCE VAULT",
        "",
        "  bal                   — Votre coffre-fort",
        "  bal @mention          — Coffre d un autre membre",
        "  bal <uid>             — Par identifiant",
        "  bal <1-10>            — Choisir une finition",
        "  bal daily             — Bonus quotidien",
        "  bal t @mention <mnt>  — Virement d argent",
        "  bal top [page]        — Classement des riches",
        "  bal rank              — Votre rang détaillé",
        "  bal themes            — Liste des finitions",
        "",
        "Taxes de virement :",
        "  ≤ $1K: 2%  ≤ $10K: 5%  ≤ $50K: 8%",
        "  ≤ $100K: 10%  ≤ $500K: 12%  > $500K: 15%",
      ].join("\n"),
    },
  },

  onStart: async function ({ message, event, args, usersData, api }) {
    const { senderID, mentions, messageReply } = event;
    const cmd = args[0]?.toLowerCase();

    // ─── DAILY ───────────────────────────────────────────────────────────────
    if (cmd === "daily") {
      const ud    = await usersData.get(senderID);
      const now   = Date.now();
      const hours = (now - (ud.lastDaily || 0)) / 3_600_000;
      const streak = ud.dailyStreak || 0;

      if (hours < ECONOMY.daily.resetHours) {
        const left = Math.ceil(ECONOMY.daily.resetHours - hours);
        return message.reply(
          `◈  BONUS QUOTIDIEN\n${"─".repeat(24)}\n` +
          `◆  Déjà réclamé aujourd hui !\n` +
          `◉  Prochain bonus dans : ${left}h\n` +
          `▣  Streak actuel : ${streak} jours`
        );
      }
      const base   = ECONOMY.daily.base;
      const sBonus = Math.min(streak * ECONOMY.daily.streakMult * base, base * 5);
      const total  = Math.round(base + sBonus);
      const newStr = hours < ECONOMY.daily.resetHours * 2 ? streak + 1 : 1;
      await usersData.set(senderID, { money: (ud.money || 0) + total, lastDaily: now, dailyStreak: newStr });
      return message.reply(
        `◈  BONUS QUOTIDIEN RECU !\n${"─".repeat(24)}\n` +
        `◆  Bonus de base  : ${formatMoney(base)}\n` +
        `◉  Bonus streak   : ${formatMoney(sBonus)}\n` +
        `▣  Total recu     : ${formatMoney(total)}\n` +
        `▲  Nouveau streak : ${newStr} jour${newStr > 1 ? "s" : ""}\n` +
        `◈  Nouveau solde  : ${formatMoney((ud.money || 0) + total)}`
      );
    }

    // ─── RANK ────────────────────────────────────────────────────────────────
    if (cmd === "rank") {
      const ud      = await usersData.get(senderID);
      const balance = ud.money || 0;
      const tier    = getTier(balance);
      const all     = await usersData.getAll();
      const sorted  = [...all].sort((a, b) => (b.money || 0) - (a.money || 0));
      const rank    = sorted.findIndex(u => u.userID === senderID) + 1;
      const top     = (((sorted.length - rank + 1) / sorted.length) * 100).toFixed(1);
      return message.reply(
        `◈  RANG FINANCIER\n${"─".repeat(24)}\n` +
        `◆  Joueur         : ${ud.name || "Utilisateur"}\n` +
        `◉  Solde          : ${formatMoney(balance)}\n` +
        `▣  Palier         : ${tier.sym} ${tier.name}\n` +
        `▲  Classement     : #${rank} sur ${sorted.length}\n` +
        `◇  Top            : ${top}%\n` +
        `◎  Progression    : ${tier.prog.toFixed(1)}% vers ${tier.next?.name || "MAX"}\n` +
        `◑  Multiplicateur : ${tier.mult}x\n` +
        `◈  Nécessaire     : ${tier.next ? formatMoney(tier.next.min - balance) : "N/A"}`
      );
    }

    // ─── TOP ─────────────────────────────────────────────────────────────────
    if (cmd === "top") {
      const page  = parseInt(args[1]) || 1;
      const PER   = 10;
      const all   = await usersData.getAll();
      const rich  = [...all].filter(u => (u.money || 0) > 0).sort((a, b) => (b.money || 0) - (a.money || 0));
      const total = Math.ceil(rich.length / PER);
      const slice = rich.slice((page - 1) * PER, page * PER);
      if (!slice.length) return message.reply("◆  Aucun utilisateur sur cette page.");
      const MEDALS = ["[ I ]", "[ II ]", "[ III ]"];
      let txt = `◈  CLASSEMENT DES RICHES — Page ${page}/${total}\n${"─".repeat(30)}\n`;
      slice.forEach((u, i) => {
        const gr   = (page - 1) * PER + i + 1;
        const tier = getTier(u.money || 0);
        txt += `${MEDALS[gr - 1] || `#${gr}`}  ${u.name || "Inconnu"}\n`;
        txt += `   ${tier.sym} ${tier.name}  ·  ${formatMoney(u.money || 0)}\n`;
      });
      txt += `\n◆  Votre position : #${rich.findIndex(u => u.userID === senderID) + 1}`;
      return message.reply(txt);
    }

    // ─── TRANSFER ────────────────────────────────────────────────────────────
    if (["transfer", "send", "pay", "t", "virement"].includes(cmd)) {
      const targetID = Object.keys(mentions)[0] || messageReply?.senderID || args[1];
      const amount   = parseFloat(args.find(a => !isNaN(parseFloat(a)) && parseFloat(a) > 0));

      if (!targetID || isNaN(amount)) {
        return message.reply(
          `◈  VIREMENT D ARGENT\n${"─".repeat(24)}\n` +
          `Usage : bal t @utilisateur montant\n\n` +
          `Taxes applicables :\n` +
          ECONOMY.transfer.taxes.slice(0, -1)
            .map(r => `  ≤ ${formatMoney(r.max)} : ${r.rate}%`).join("\n") +
          `\n  > $500K : 15%`
        );
      }
      if (targetID === senderID)   return message.reply("◆  Vous ne pouvez pas vous envoyer de l argent.");
      if (amount < ECONOMY.transfer.min) return message.reply(`◆  Minimum : ${formatMoney(ECONOMY.transfer.min)}`);
      if (amount > ECONOMY.transfer.max) return message.reply(`◆  Maximum : ${formatMoney(ECONOMY.transfer.max)}`);

      const [sender, receiver] = await Promise.all([usersData.get(senderID), usersData.get(targetID)]);
      if (!receiver) return message.reply("◆  Destinataire introuvable.");

      const tax = calcTax(amount);
      if ((sender.money || 0) < tax.total) {
        return message.reply(
          `◆  FONDS INSUFFISANTS\n${"─".repeat(24)}\n` +
          `◈  A envoyer      : ${formatMoney(amount)}\n` +
          `◉  Taxe (${tax.rate}%)   : ${formatMoney(tax.tax)}\n` +
          `◆  Total nécessaire: ${formatMoney(tax.total)}\n` +
          `▣  Votre solde    : ${formatMoney(sender.money || 0)}\n` +
          `▲  Manque         : ${formatMoney(tax.total - (sender.money || 0))}`
        );
      }
      await Promise.all([
        usersData.set(senderID, { money: (sender.money || 0) - tax.total }),
        usersData.set(targetID, { money: (receiver.money || 0) + amount }),
      ]);
      const [sName, rName] = await Promise.all([
        usersData.getName(senderID),
        usersData.getName(targetID),
      ]);
      return message.reply(
        `◈  VIREMENT REUSSI\n${"─".repeat(28)}\n` +
        `◆  ID            : ${txID()}\n` +
        `◉  De            : ${sName}\n` +
        `▣  Vers          : ${rName}\n${"─".repeat(28)}\n` +
        `◈  Montant       : ${formatMoney(amount)}\n` +
        `◉  Taxe (${tax.rate}%)    : ${formatMoney(tax.tax)}\n` +
        `◆  Total débité  : ${formatMoney(tax.total)}\n${"─".repeat(28)}\n` +
        `▲  Solde envoyeur: ${formatMoney((sender.money || 0) - tax.total)}\n` +
        `◎  Solde receveur: ${formatMoney((receiver.money || 0) + amount)}\n` +
        `◑  Statut        : Vérifié et sécurisé`
      );
    }

    // ─── THEMES ──────────────────────────────────────────────────────────────
    if (cmd === "themes" || cmd === "theme") {
      const keys = Object.keys(THEMES);
      if (args[1]) {
        const n   = parseInt(args[1]);
        const key = (!isNaN(n) && n >= 1 && n <= keys.length)
          ? keys[n - 1] : args[1].toLowerCase();
        if (THEMES[key]) {
          const ud = await usersData.get(senderID);
          ud.balTheme = key;
          await usersData.set(senderID, ud);
          return message.reply(`◈  Finition appliquée : ${THEMES[key].name}`);
        }
        return message.reply("◆  Finition introuvable. Tapez bal themes pour la liste.");
      }
      let txt = `◈  FINITIONS BALANCE VAULT\n${"─".repeat(28)}\n`;
      keys.forEach((k, i) => { txt += `${i + 1}. ${THEMES[k].name}\n`; });
      txt += `\n◆  bal theme <numéro> pour appliquer.`;
      return message.reply(txt);
    }

    // ─── CARTE BALANCE (commande principale) ──────────────────────────────────
    if (!canvasAvailable) {
      let tid = senderID;
      if (Object.keys(mentions).length > 0) tid = Object.keys(mentions)[0];
      else if (messageReply) tid = messageReply.senderID;
      const ud  = await usersData.get(tid);
      const bal = ud?.money || 0;
      const t   = getTier(bal);
      const all = await usersData.getAll();
      const sorted = [...all].sort((a, b) => (b.money || 0) - (a.money || 0));
      const rank   = sorted.findIndex(u => u.userID === tid) + 1;
      return message.reply(
        `◈  SOLDE — ${ud?.name || "Utilisateur"}\n${"─".repeat(22)}\n` +
        `◆  Solde      : ${formatMoney(bal)}\n` +
        `◉  Palier     : ${t.sym} ${t.name}\n` +
        `▣  Classement : #${rank} sur ${sorted.length}\n` +
        `▲  Progression: ${t.prog.toFixed(1)}% vers ${t.next?.name || "MAX"}`
      );
    }

    let targetID = senderID;
    if (Object.keys(mentions).length > 0)           targetID = Object.keys(mentions)[0];
    else if (messageReply)                           targetID = messageReply.senderID;
    else if (args[0] && !isNaN(args[0]) && parseInt(args[0]) > 10_000) targetID = args[0];

    const senderUD  = await usersData.get(senderID);
    const themeKeys = Object.keys(THEMES);
    let themeKey    = senderUD?.balTheme && THEMES[senderUD.balTheme]
      ? senderUD.balTheme
      : themeKeys[Math.floor(Math.random() * themeKeys.length)];
    for (const a of args) {
      const n = parseInt(a);
      if (!isNaN(n) && n >= 1 && n <= themeKeys.length) { themeKey = themeKeys[n - 1]; break; }
      if (themeKeys.includes(a.toLowerCase())) { themeKey = a.toLowerCase(); break; }
    }
    const theme = THEMES[themeKey];

    const [userData, allUsers] = await Promise.all([
      usersData.get(targetID).catch(() => null),
      usersData.getAll().catch(() => []),
    ]);
    if (!userData) return message.reply("◆  Utilisateur introuvable.");

    let userInfo = {};
    try {
      const fb = await api.getUserInfo(targetID);
      userInfo  = fb[targetID] || {};
    } catch (_) {
      userInfo = { name: userData.name || `User_${targetID}`, vanity: "" };
    }

    const sorted    = [...allUsers].sort((a, b) => (b.money || 0) - (a.money || 0));
    const globalRank = sorted.findIndex(u => u.userID === targetID) + 1 || sorted.length;
    const topPct     = (((sorted.length - globalRank + 1) / sorted.length) * 100).toFixed(1);

    const renderData = {
      uid:        targetID,
      name:       userInfo.name   || userData.name || "Utilisateur",
      vanity:     userInfo.vanity || "",
      balance:    userData.money  || 0,
      globalRank,
      topPct,
      totalUsers: sorted.length,
      streak:     userData.dailyStreak || 0,
    };

    let cacheDir, avPath, outPath;
    try {
      cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
      avPath  = path.join(cacheDir, `bal_av_${Date.now()}.png`);
      outPath = path.join(cacheDir, `bal_out_${Date.now()}.png`);
    } catch (err) {
      return message.reply(`◆  Erreur d acces au dossier cache : ${err.message}`);
    }

    let effectiveAv = null;
    try {
      const res = await axios.get(
        `https://graph.facebook.com/${targetID}/picture?width=500&height=500&access_token=${FB_TOKEN}`,
        { responseType: "arraybuffer", timeout: 10_000 }
      );
      fs.writeFileSync(avPath, Buffer.from(res.data));
      effectiveAv = avPath;
    } catch (_) {}

    const cvs = await buildCanvas(renderData, theme, effectiveAv);
    fs.writeFileSync(outPath, cvs.toBuffer("image/png"));
    try { if (fs.existsSync(avPath)) fs.unlinkSync(avPath); } catch (_) {}

    const tier   = getTier(renderData.balance);
    const isSelf = targetID === senderID;
    const body   = [
      isSelf ? "◈  VOTRE COFFRE-FORT" : `◈  COFFRE DE ${renderData.name}`,
      "─".repeat(28),
      `◆  Solde      : ${formatMoney(renderData.balance)}`,
      `◉  Palier     : ${tier.sym} ${tier.name}`,
      `▣  Classement : #${globalRank}  (Top ${topPct}%)`,
      `▲  Vers palier: ${tier.prog.toFixed(1)}% → ${tier.next?.name || "MAX"}`,
      `◎  Finition   : ${theme.name}`,
    ].join("\n");

    await message.reply({ body, attachment: fs.createReadStream(outPath) });
    setTimeout(() => {
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
    }, 30_000);
  },
};
