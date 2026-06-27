"use strict";

// ═══════════════════════════════════════════════════════════════════════════════
//  TOP EXCHANGE v4.0 — Terminal de cotation boursière, design entièrement repensé
//  Auteur   : Christus
//  Concept  : chaque membre devient une "action" avec ticker, cours, variation,
//             mini-graphique en chandeliers — totalement différent des versions
//             précédentes (galaxie/médailles, sismographe organique)
//  Canvas   : 1300 × dynamique
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
      ["JetBrainsMono-Bold.ttf",    "Mono", "bold"],
      ["JetBrainsMono-Regular.ttf", "Mono", "normal"],
      ["RobotoMono-Bold.ttf",       "Mono", "bold"],
      ["RobotoMono-Regular.ttf",    "Mono", "normal"],
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

// ─── Formatage monnaie façon cours boursier ──────────────────────────────────
function fmt(n) {
  if (n == null || isNaN(n)) return "$0.00";
  n = Number(n);
  if (!isFinite(n)) return "$∞";
  const S = [{v:1e12,s:"T"},{v:1e9,s:"B"},{v:1e6,s:"M"},{v:1e3,s:"K"}];
  const sc = S.find(s => Math.abs(n) >= s.v);
  if (sc) return `$${(Math.abs(n)/sc.v).toFixed(2)}${sc.s}`;
  return `$${n.toFixed(2)}`;
}
function fmtVolume(n) {
  if (!n) return "0";
  const S = [{v:1e9,s:"B"},{v:1e6,s:"M"},{v:1e3,s:"K"}];
  const sc = S.find(s => Math.abs(n) >= s.v);
  if (sc) return `${(Math.abs(n)/sc.v).toFixed(1)}${sc.s}`;
  return String(Math.round(n));
}

// ─── Générateur de symbole ticker à 4 lettres depuis le nom ──────────────────
function generateTicker(name, uid) {
  if (!name) name = "ANON";
  const clean = name.toUpperCase().replace(/[^A-Z\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  let ticker = "";
  if (words.length >= 2) {
    // Première lettre de chaque mot, complété par les lettres du dernier mot
    ticker = words.map(w => w[0]).join("").slice(0, 4);
    if (ticker.length < 4) ticker += words[words.length - 1].slice(1, 1 + (4 - ticker.length));
  } else if (words.length === 1) {
    ticker = words[0].slice(0, 4);
  }
  ticker = ticker.padEnd(4, "X").slice(0, 4);
  if (!/^[A-Z]{2,4}$/.test(ticker)) {
    // Repli déterministe basé sur l'UID
    const seed = String(uid || "0000");
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    ticker = Array.from({length:4}, (_, i) => letters[(seed.charCodeAt(i % seed.length) + i*7) % 26]).join("");
  }
  return ticker;
}

// ─── Pseudo-aléatoire seedé (déterministe par utilisateur, stable entre rendus) ─
function seededRandom(seedStr) {
  let s = 0;
  for (const c of String(seedStr)) s = (s * 31 + c.charCodeAt(0)) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  10 PALETTES DE MARCHÉ — terminal de cotation, sobre, façon Bloomberg/Reuters
// ═══════════════════════════════════════════════════════════════════════════════
const PALETTES = {
  wall_street:    { name:"Wall Street",    bg1:"#0A0E14", bg2:"#10151D", up:"#00D67E", down:"#FF3B5C", amber:"#FFB627", text:"#E8ECEF" },
  tokyo_exchange: { name:"Tokyo Exchange",  bg1:"#0C0A14", bg2:"#161020", up:"#4D9FFF", down:"#FF4D6A", amber:"#FFD93D", text:"#F0EAFF" },
  london_floor:   { name:"London Floor",    bg1:"#0A0E10", bg2:"#121A1E", up:"#3FBF7F", down:"#E8553D", amber:"#D4A93D", text:"#E8EEF0" },
  crypto_dark:    { name:"Crypto Dark",     bg1:"#06080C", bg2:"#0E1218", up:"#00FFA3", down:"#FF0080", amber:"#FFC700", text:"#D0F0E8" },
  hk_harbour:     { name:"HK Harbour",      bg1:"#0C0808", bg2:"#1A1010", up:"#3DBFA8", down:"#E63950", amber:"#E8B83D", text:"#F0E4E0" },
  zurich_vault:   { name:"Zurich Vault",    bg1:"#0A0C0E", bg2:"#141A1E", up:"#5FB8E8", down:"#D4554D", amber:"#D4C45F", text:"#E8EEF2" },
  singapore_pit:  { name:"Singapore Pit",   bg1:"#08100C", bg2:"#101E14", up:"#3DDC84", down:"#FF5C5C", amber:"#FFD15C", text:"#E4F4EA" },
  frankfurt_dax:  { name:"Frankfurt DAX",   bg1:"#0A0A0E", bg2:"#161620", up:"#4DD0E1", down:"#FF6B6B", amber:"#FFCA28", text:"#EAEAF0" },
  shanghai_belt:  { name:"Shanghai Belt",   bg1:"#100808", bg2:"#1E1010", up:"#4DA8FF", down:"#FF6B4D", amber:"#FFD23D", text:"#F4E8E0" },
  midnight_otc:   { name:"Midnight OTC",    bg1:"#050608", bg2:"#0C0E12", up:"#8FFF6B", down:"#FF6B8F", amber:"#6BCFFF", text:"#DCE4E8" },
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
  ctx.font=`${weight} ${sz}px Mono, "Courier New", monospace`;
  ctx.textAlign=align; ctx.textBaseline="middle";
  if(glow){ctx.shadowColor=glow;ctx.shadowBlur=10;}
  ctx.fillStyle=color; ctx.fillText(s,x,y); ctx.restore();
}

function fitText(ctx, text, maxWidth, size) {
  ctx.font = `600 ${size}px Mono, "Courier New", monospace`;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (ctx.measureText(t + "…").width > maxWidth && t.length > 1) t = t.slice(0, -1);
  return t + "…";
}

// ─── Fond terminal : dégradé sobre + grille fine + scanlines subtiles ────────
function drawTerminalBg(ctx, W, H, p) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.bg1); g.addColorStop(1, p.bg2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Grille très fine façon papier graphique de trading
  ctx.save();
  ctx.strokeStyle = p.text; ctx.globalAlpha = 0.025; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();

  // Scanlines horizontales très légères (effet écran CRT de salle de marché)
  ctx.save();
  ctx.globalAlpha = 0.02;
  for (let y = 0; y < H; y += 3) { ctx.fillStyle = "#000"; ctx.fillRect(0, y, W, 1); }
  ctx.restore();
}

// ─── Bandeau ticker défilant (snapshot statique de plusieurs cotations) ─────
function drawTickerTape(ctx, W, y, h, entries, p) {
  ctx.save();
  ctx.fillStyle = p.bg2; ctx.fillRect(0, y, W, h);
  ctx.strokeStyle = p.text; ctx.globalAlpha = 0.15; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, y+h); ctx.lineTo(W, y+h); ctx.stroke();
  ctx.restore();

  let x = 24;
  const midY = y + h/2;
  for (const e of entries) {
    const color = e.change >= 0 ? p.up : p.down;
    const arrow = e.change >= 0 ? "▲" : "▼";
    T(ctx, e.ticker, x, midY, 14, p.text, { weight:"700" });
    x += ctx.measureText(e.ticker).width + 10;
    T(ctx, `${arrow}${Math.abs(e.change).toFixed(1)}%`, x, midY, 13, color, { weight:"600" });
    x += 70;
    T(ctx, "│", x, midY, 13, p.text, { alpha:0.25 });
    x += 28;
    if (x > W - 100) break;
  }
}

// ─── Mini-graphique en chandeliers japonais (déterministe, basé sur seed) ───
function drawCandlestick(ctx, x, y, w, h, seed, trendUp, p) {
  const rnd = seededRandom(seed);
  const candles = 14;
  const cw = w / candles;
  let level = h * 0.5;
  const points = [];

  for (let i = 0; i < candles; i++) {
    const drift = trendUp ? -0.08 : 0.08;
    const delta = (rnd() - 0.5 + drift) * h * 0.22;
    const open = level;
    level = Math.max(4, Math.min(h - 4, level + delta));
    const close = level;
    const high = Math.min(open, close) - rnd() * h * 0.08;
    const low  = Math.max(open, close) + rnd() * h * 0.08;
    const isUp = close < open; // y plus petit = plus haut = hausse
    const color = isUp ? p.up : p.down;
    const cx = x + i * cw + cw/2;

    // Mèche
    ctx.save();
    ctx.strokeStyle = color; ctx.globalAlpha = 0.7; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, y + Math.max(4, high)); ctx.lineTo(cx, y + Math.min(h-4, low)); ctx.stroke();
    ctx.restore();

    // Corps
    const bodyTop = y + Math.min(open, close);
    const bodyH = Math.max(2, Math.abs(close - open));
    ctx.fillStyle = color;
    ctx.fillRect(cx - cw*0.3, bodyTop, cw*0.6, bodyH);

    points.push({x: cx, y: y + close});
  }
  return points;
}

// ─── Carte podium (action vedette) ───────────────────────────────────────────
function drawPodiumCard(ctx, x, y, w, h, user, rank, p, rankColor) {
  ctx.save();
  ctx.shadowColor = rankColor; ctx.shadowBlur = 18;
  ctx.fillStyle = p.bg2; rr(ctx, x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = rankColor; ctx.lineWidth = 1.6; rr(ctx, x, y, w, h, 6); ctx.stroke();
  ctx.restore();

  // Bandeau de rang en haut
  ctx.save();
  ctx.fillStyle = rankColor;
  rr(ctx, x, y, w, 26, [6,6,0,0]); ctx.fill();
  ctx.restore();
  T(ctx, `RANG #${rank}`, x + w/2, y + 13, 12, p.bg1, { align:"center", weight:"800" });

  // Ticker + nom
  const tickerY = y + 56;
  T(ctx, user.ticker, x + 18, tickerY, 26, rankColor, { weight:"800", glow: rankColor });
  T(ctx, fitText(ctx, user.name, w - 36, 13), x + 18, tickerY + 22, 13, p.text, { weight:"500" });

  // Avatar (cercle, coin haut droit)
  if (user.avatarImg) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x + w - 38, y + 50, 26, 0, Math.PI*2);
    ctx.strokeStyle = rankColor; ctx.lineWidth = 2; ctx.stroke();
    ctx.clip();
    ctx.drawImage(user.avatarImg, x + w - 64, y + 24, 52, 52);
    ctx.restore();
  }

  // Cours (montant)
  const priceY = y + 110;
  T(ctx, fmt(user.money), x + 18, priceY, 30, p.text, { weight:"800" });
  const arrow = user.change >= 0 ? "▲" : "▼";
  const changeColor = user.change >= 0 ? p.up : p.down;
  T(ctx, `${arrow} ${Math.abs(user.change).toFixed(1)}%`, x + 18, priceY + 26, 15, changeColor, { weight:"700" });

  // Mini chandeliers
  const chartY = y + 152;
  const chartH = h - 152 - 20;
  drawCandlestick(ctx, x + 18, chartY, w - 36, chartH, user.uid + "_pod", user.change >= 0, p);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CANVAS PRINCIPAL — Terminal de cotation, 1300 × dynamique
// ═══════════════════════════════════════════════════════════════════════════════
const CW = 1300;
const PAD = 40;
const TICKER_H = 50;
const TITLE_H = 90;
const PODIUM_GAP = 16;

async function loadAvatarImg(uid, name) {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/${uid}/picture?width=200&height=200&access_token=${FB_TOKEN}`,
      { responseType: "arraybuffer", timeout: 8000 }
    );
    return await loadImage(Buffer.from(res.data));
  } catch (_) {
    const cv = createCanvas(200, 200);
    const c = cv.getContext("2d");
    const colors = ["#00D67E","#FF3B5C","#FFB627","#4D9FFF","#FF4D6A"];
    c.fillStyle = colors[parseInt(uid || "0") % colors.length];
    c.fillRect(0,0,200,200);
    c.fillStyle = "#0A0E14"; c.font = "bold 80px monospace";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText((name||"?").charAt(0).toUpperCase(), 100, 100);
    return await loadImage(cv.toBuffer());
  }
}

async function buildCanvas(richList, pageUsers, startIndex, page, totalPages, senderRank, palette) {
  ensureFonts();
  const p = palette;

  const PODIUM_Y = TICKER_H + TITLE_H + 26;
  const PODIUM_H = 260;
  const PODIUM_CARD_W = Math.floor((CW - PAD*2 - PODIUM_GAP*2) / 3);

  const TABLE_HEAD_Y = PODIUM_Y + PODIUM_H + 46;
  const TABLE_HEAD_H = 36;
  const ROW_Y = TABLE_HEAD_Y + TABLE_HEAD_H + 8;
  const ROW_H = 76, ROW_GAP = 6;
  const FOOTER_H = 70;
  const CH = ROW_Y + pageUsers.length * (ROW_H + ROW_GAP) + FOOTER_H;

  const canvas = createCanvas(CW, CH);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

  // ── 1. Fond terminal ──────────────────────────────────────────────────────
  drawTerminalBg(ctx, CW, CH, p);

  // ── 2. Bandeau ticker tape (échantillon de tous les utilisateurs) ────────
  const tickerSample = richList.slice(0, 12).map(u => ({
    ticker: generateTicker(u.name, u.userID),
    change: (seededRandom(u.userID + "_chg")() - 0.45) * 14,
  }));
  drawTickerTape(ctx, CW, 0, TICKER_H, tickerSample, p);

  // ── 3. Titre ──────────────────────────────────────────────────────────────
  const TITLE_Y = TICKER_H + 50;
  T(ctx, "BOURSE DES FORTUNES", PAD, TITLE_Y, 40, p.text, { weight:"800" });
  T(ctx, `MARCHÉ : ${p.name.toUpperCase()}  ·  ${richList.length} VALEURS COTÉES`, PAD, TITLE_Y + 28, 14, p.amber, { weight:"600" });
  T(ctx, `SÉANCE ${page}/${totalPages}`, CW - PAD, TITLE_Y, 18, p.text, { align:"right", weight:"700" });
  const now = moment().tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm");
  T(ctx, now, CW - PAD, TITLE_Y + 24, 13, p.text, { align:"right", alpha:0.5, weight:"500" });

  // ── 4. PODIUM — 3 valeurs vedettes ────────────────────────────────────────
  const top3 = richList.slice(0, 3);
  const rankColors = [p.amber, "#C0C8D0", "#CD7F32"];
  const order = [1, 0, 2]; // affiche #2, #1, #3 (le #1 au centre, légèrement avant)
  for (const idx of order) {
    const user = top3[idx];
    if (!user) continue;
    const cardX = PAD + idx * (PODIUM_CARD_W + PODIUM_GAP);
    const avatarImg = await loadAvatarImg(user.userID, user.name);
    const rnd = seededRandom(user.userID + "_chg");
    const change = (rnd() - 0.45) * 14;
    drawPodiumCard(ctx, cardX, PODIUM_Y, PODIUM_CARD_W, PODIUM_H, {
      uid: user.userID, name: user.name || "Inconnu",
      ticker: generateTicker(user.name, user.userID),
      money: user.money || 0, change, avatarImg,
    }, idx + 1, p, rankColors[idx]);
  }

  // ── 5. EN-TÊTE DE TABLEAU ────────────────────────────────────────────────
  ctx.save();
  ctx.fillStyle = p.bg2; ctx.globalAlpha = 0.6;
  ctx.fillRect(PAD, TABLE_HEAD_Y, CW - PAD*2, TABLE_HEAD_H);
  ctx.restore();

  const RANK_X = PAD + 14;
  const TICKER_X = PAD + 70;
  const NAME_X = TICKER_X + 90;
  const NAME_MAX = 260;
  const PRICE_X = NAME_X + NAME_MAX + 20;
  const PRICE_MAX = 140;
  const CHANGE_X = PRICE_X + PRICE_MAX + 20;
  const CHANGE_MAX = 90;
  const CHART_X = CHANGE_X + CHANGE_MAX + 20;
  const CHART_W = 220;
  const VOL_X = CW - PAD - 14;

  const headY = TABLE_HEAD_Y + TABLE_HEAD_H/2;
  T(ctx, "RANG",     RANK_X,   headY, 11, p.text, { alpha:0.5, weight:"700" });
  T(ctx, "TICKER",   TICKER_X, headY, 11, p.text, { alpha:0.5, weight:"700" });
  T(ctx, "NOM",       NAME_X,   headY, 11, p.text, { alpha:0.5, weight:"700" });
  T(ctx, "COURS",     PRICE_X,  headY, 11, p.text, { alpha:0.5, weight:"700" });
  T(ctx, "VAR. 24H", CHANGE_X, headY, 11, p.text, { alpha:0.5, weight:"700" });
  T(ctx, "GRAPHIQUE", CHART_X, headY, 11, p.text, { alpha:0.5, weight:"700" });
  T(ctx, "VOLUME",   VOL_X,    headY, 11, p.text, { align:"right", alpha:0.5, weight:"700" });

  // ── 6. LISTE — tableau de cotation ────────────────────────────────────────
  let y = ROW_Y;
  for (const user of pageUsers) {
    const gRank = startIndex + pageUsers.indexOf(user) + 1;
    const rnd = seededRandom(user.userID + "_chg");
    const change = (rnd() - 0.45) * 14;
    const isUp = change >= 0;
    const color = isUp ? p.up : p.down;

    // Bande de fond alternée
    ctx.save();
    ctx.fillStyle = p.text; ctx.globalAlpha = (pageUsers.indexOf(user) % 2 === 0) ? 0.02 : 0.0;
    ctx.fillRect(PAD, y, CW - PAD*2, ROW_H);
    ctx.restore();

    // Liseré de couleur à gauche selon variation
    ctx.fillStyle = color; ctx.globalAlpha = 0.7;
    ctx.fillRect(PAD, y + 6, 3, ROW_H - 12);
    ctx.globalAlpha = 1;

    const midY = y + ROW_H/2;
    T(ctx, `#${gRank}`, RANK_X, midY, 16, p.text, { weight:"700", alpha:0.7 });

    const ticker = generateTicker(user.name, user.userID);
    T(ctx, ticker, TICKER_X, midY, 18, color, { weight:"800" });

    T(ctx, fitText(ctx, user.name || "Inconnu", NAME_MAX, 17), NAME_X, midY, 17, p.text, { weight:"600" });

    T(ctx, fmt(user.money || 0), PRICE_X, midY, 18, p.text, { weight:"700" });

    const arrow = isUp ? "▲" : "▼";
    T(ctx, `${arrow}${Math.abs(change).toFixed(1)}%`, CHANGE_X, midY, 15, color, { weight:"700" });

    drawCandlestick(ctx, CHART_X, y + 12, CHART_W, ROW_H - 24, user.userID, isUp, p);

    const volume = Math.round((user.money || 1) * (0.3 + rnd() * 0.6));
    T(ctx, fmtVolume(volume), VOL_X, midY, 14, p.text, { align:"right", alpha:0.6, weight:"600" });

    y += ROW_H + ROW_GAP;
  }

  // ── 7. PIED DE PAGE ───────────────────────────────────────────────────────
  const FT_Y = y + 22;
  ctx.save();
  ctx.strokeStyle = p.text; ctx.globalAlpha = 0.12; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, FT_Y - 14); ctx.lineTo(CW - PAD, FT_Y - 14); ctx.stroke();
  ctx.restore();

  if (senderRank > 0) {
    T(ctx, `VOTRE POSITION : #${senderRank} SUR ${richList.length}`, CW/2, FT_Y, 15, p.amber, { align:"center", weight:"700" });
  }
  T(ctx, "RÉPONDEZ AVEC UN NUMÉRO DE SÉANCE POUR NAVIGUER", CW/2, FT_Y + 24, 12, p.text, { align:"center", alpha:0.5, weight:"600" });
  T(ctx, `${p.name.toUpperCase()}  ·  CHRISTUS TERMINAL`, CW/2, FT_Y + 44, 11, p.text, { align:"center", alpha:0.35, weight:"600" });

  return canvas;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name:        "top",
    aliases:     ["leaderboard","lb","classement","bourse"],
    version:     "4.0",
    author:      "Christus",
    countDown:   5,
    role:        0,
    description: { fr: "◈ Top Exchange v4 — Terminal de cotation boursière, 10 marchés, design unique." },
    category:    "economy",
    guide: {
      fr: [
        "BOURSE DES FORTUNES",
        "",
        "  top [page]         — Classement des riches",
        "  top <1-10>         — Choisir un marché (palette)",
        "  top themes         — Liste des marchés",
        "",
        "  Chaque membre devient une action avec son propre ticker.",
        "  Répondez avec un numéro de page pour naviguer.",
      ].join("\n"),
    },
  },

  // ─── Commande principale ────────────────────────────────────────────────────
  onStart: async function ({ message, event, args, usersData, api }) {
    const { senderID, threadID } = event;
    const PER_PAGE = 10;

    if (args[0]?.toLowerCase() === "themes") {
      const keys = Object.keys(PALETTES);
      let txt = `BOURSE DES FORTUNES — MARCHÉS DISPONIBLES\n${"─".repeat(38)}\n`;
      keys.forEach((k, i) => { txt += `${i+1}. ${PALETTES[k].name}\n`; });
      txt += `\ntop theme <numéro> pour appliquer.`;
      return message.reply(txt);
    }

    const themeKeys = Object.keys(PALETTES);
    const senderUD  = await usersData.get(senderID).catch(() => ({}));
    let themeKey    = senderUD?.topMarket && PALETTES[senderUD.topMarket]
      ? senderUD.topMarket
      : themeKeys[Math.floor(Math.random() * themeKeys.length)];
    let page = 1;
    for (const a of args) {
      const n = parseInt(a);
      if (!isNaN(n) && n >= 1 && n <= themeKeys.length) { themeKey = themeKeys[n-1]; continue; }
      if (themeKeys.includes(a.toLowerCase())) { themeKey = a.toLowerCase(); continue; }
      if (!isNaN(n) && n > 0) page = n;
    }
    if (args[0]?.toLowerCase() === "theme") {
      const ud = await usersData.get(senderID);
      ud.topMarket = themeKey;
      await usersData.set(senderID, ud);
      return message.reply(`Marché changé pour : ${PALETTES[themeKey].name}`);
    }
    const palette = PALETTES[themeKey];

    const allUsers   = await usersData.getAll();
    const richList   = allUsers.filter(u => (u.money||0) > 0).sort((a,b) => (b.money||0)-(a.money||0));
    const totalPages = Math.max(1, Math.ceil(richList.length / PER_PAGE));
    page = Math.max(1, Math.min(page, totalPages));

    const startIndex = (page - 1) * PER_PAGE;
    const pageUsers  = richList.slice(startIndex, startIndex + PER_PAGE);
    const senderRank = richList.findIndex(u => u.userID === senderID) + 1;

    if (!pageUsers.length) {
      return message.reply("Aucune valeur cotée sur ce marché pour l'instant.");
    }

    if (!canvasAvailable) {
      let txt = `BOURSE DES FORTUNES — Séance ${page}/${totalPages}\n${"─".repeat(34)}\n`;
      pageUsers.forEach((u, i) => {
        const gr = startIndex + i + 1;
        const ticker = generateTicker(u.name, u.userID);
        txt += `#${gr}  ${ticker}  ${u.name||"Inconnu"}  ·  ${fmt(u.money||0)}\n`;
      });
      if (senderRank > 0) txt += `\nVotre position : #${senderRank}`;
      return message.reply(txt);
    }

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
    const outPath = path.join(cacheDir, `top_${threadID}_${Date.now()}.png`);

    const canvas = await buildCanvas(richList, pageUsers, startIndex, page, totalPages, senderRank, palette);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));

    const sent = await message.reply({
      body:       `BOURSE DES FORTUNES — Séance ${page}/${totalPages}\nMarché : ${palette.name}`,
      attachment: fs.createReadStream(outPath),
    });

    setTimeout(() => { try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {} }, 60_000);

    global.GoatBot.onReply.set(sent.messageID, {
      commandName: this.config.name,
      author:      senderID,
      type:        "top_nav",
      totalPages,
      threadID,
      themeKey,
    });
  },

  // ─── Navigation pagination ──────────────────────────────────────────────────
  onReply: async function ({ message, event, Reply, usersData }) {
    if (Reply.author !== event.senderID) return;
    if (Reply.type  !== "top_nav") return;

    const page = parseInt(event.body);
    if (isNaN(page) || page < 1 || page > Reply.totalPages) {
      return message.reply(`Page invalide. Entrez un numéro entre 1 et ${Reply.totalPages}.`);
    }

    const PER_PAGE = 10;
    const palette  = PALETTES[Reply.themeKey] || PALETTES[Object.keys(PALETTES)[0]];

    const allUsers   = await usersData.getAll();
    const richList   = allUsers.filter(u => (u.money||0) > 0).sort((a,b) => (b.money||0)-(a.money||0));
    const startIndex = (page - 1) * PER_PAGE;
    const pageUsers  = richList.slice(startIndex, startIndex + PER_PAGE);
    const senderRank = richList.findIndex(u => u.userID === event.senderID) + 1;

    if (!pageUsers.length) return message.reply("Aucune valeur cotée sur cette page.");

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
    const outPath = path.join(cacheDir, `top_${Reply.threadID}_${Date.now()}.png`);

    const canvas = await buildCanvas(richList, pageUsers, startIndex, page, Reply.totalPages, senderRank, palette);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));

    await message.reply({
      body:       `BOURSE DES FORTUNES — Séance ${page}/${Reply.totalPages}`,
      attachment: fs.createReadStream(outPath),
    });

    setTimeout(() => { try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {} }, 60_000);
    global.GoatBot.onReply.delete(Reply.messageID);
  },
};
