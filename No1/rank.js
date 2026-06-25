"use strict";

// ═══════════════════════════════════════════════════════════════════════════════
//  RANK SOVEREIGN — Carte de rang ultime, architecture Canvas repensée
//  Auteur : Christus
//  10 thèmes visuels exclusifs + photo utilisateur intégrée + layout cinématique
// ═══════════════════════════════════════════════════════════════════════════════

let loadImage, createCanvas, registerFont;
let canvasAvailable = false;
try {
  const canvas  = require("canvas");
  loadImage     = canvas.loadImage;
  createCanvas  = canvas.createCanvas;
  registerFont  = canvas.registerFont;
  canvasAvailable = true;
} catch (e) { console.error("Canvas not available:", e.message); }

const axios   = require("axios");
const fs      = require("fs-extra");
const path    = require("path");
const moment  = require("moment-timezone");

let fonts;
try {
  fonts = require("../../func/font.js");
} catch (_) {
  fonts = { bold: t => t, sansSerif: t => t, monospace: t => t };
}

// ─── Fonts ────────────────────────────────────────────────────────────────────
if (canvasAvailable && registerFont) {
  const fontDir = path.join(__dirname, "assets", "font");
  const fontFiles = [
    ["BeVietnamPro-Bold.ttf",    "RankFont", "bold"],
    ["BeVietnamPro-Regular.ttf", "RankFont", "normal"],
    ["BeVietnamPro-SemiBold.ttf","RankFont", "600"],
    ["NotoSans-Bold.ttf",        "RankFont", "bold"],
    ["NotoSans-Regular.ttf",     "RankFont", "normal"],
  ];
  for (const [file, family, weight] of fontFiles) {
    try {
      const fp = path.join(fontDir, file);
      if (fs.existsSync(fp)) registerFont(fp, { family, weight });
    } catch (_) {}
  }
}

// ─── roundRect polyfill ───────────────────────────────────────────────────────
function rrect(ctx, x, y, w, h, r) {
  if (typeof r === "number") r = [r, r, r, r];
  const [tl, tr, br, bl] = r;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y,       x + w, y + tr);
  ctx.lineTo(x + w,     y + h - br);
  ctx.quadraticCurveTo(x + w, y + h,   x + w - br, y + h);
  ctx.lineTo(x + bl,    y + h);
  ctx.quadraticCurveTo(x,     y + h,   x, y + h - bl);
  ctx.lineTo(x,         y + tl);
  ctx.quadraticCurveTo(x,     y,       x + tl, y);
  ctx.closePath();
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function expToLevel(exp) {
  return Math.floor((1 + Math.sqrt(1 + (8 * exp) / 5)) / 2);
}
function levelToExp(level) {
  return Math.floor(((level ** 2 - level) * 5) / 2);
}
function formatNumber(num) {
  if (!num || isNaN(num) || !Number.isFinite(num)) return "0";
  const abs = Math.abs(num), sign = num < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${Math.round(abs)}`;
}

const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

// ═══════════════════════════════════════════════════════════════════════════════
//  10 THÈMES RANK SOUVERAINS
// ═══════════════════════════════════════════════════════════════════════════════
const THEMES = {

  // ── 1. OBSIDIAN EMPEROR ────────────────────────────────────────────────────
  obsidian_emperor: {
    name: "Obsidian Emperor",
    symbol: "◈",
    bg: (ctx, W, H) => {
      ctx.fillStyle = "#08080F"; ctx.fillRect(0, 0, W, H);
      // Grille hexagonale subtile
      ctx.strokeStyle = "rgba(180,140,255,0.05)"; ctx.lineWidth = 0.8;
      for (let x = 0; x < W; x += 35) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 35) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      // Halo central impérial
      [[W * 0.72, H * 0.5, "#7B2FFF", 500], [W * 0.15, H * 0.5, "#FF2FB8", 350]].forEach(([gx, gy, gc, gr]) => {
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, gc + "2A"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      // Ligne lumineuse diagonale
      const lg = ctx.createLinearGradient(0, 0, W, H);
      lg.addColorStop(0, "transparent"); lg.addColorStop(0.4, "rgba(123,47,255,0.06)");
      lg.addColorStop(0.6, "rgba(255,47,184,0.04)"); lg.addColorStop(1, "transparent");
      ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    },
    primary: "#B87AFF",
    accent:  "#FF6DD6",
    gold:    "#FFD580",
    text:    "#FFFFFF",
    muted:   "rgba(255,255,255,0.55)",
    bar:     ["#7B2FFF", "#B87AFF", "#FF6DD6"],
    card:    "rgba(20,12,38,0.92)",
    border:  "#7B2FFF",
    glow:    "#9B50FF",
  },

  // ── 2. SOLAR FLARE ─────────────────────────────────────────────────────────
  solar_flare: {
    name: "Solar Flare",
    symbol: "◉",
    bg: (ctx, W, H) => {
      ctx.fillStyle = "#0F0500"; ctx.fillRect(0, 0, W, H);
      // Couronne solaire
      [[W * 0.5, 0, "#FF8C00", 600], [W * 0.5, H, "#FF3A00", 500]].forEach(([gx, gy, gc, gr]) => {
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, gc + "40"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      // Rayons solaires
      ctx.save(); ctx.globalAlpha = 0.04;
      for (let a = 0; a < 360; a += 18) {
        const rad = (a * Math.PI) / 180;
        ctx.strokeStyle = "#FFB347"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W * 0.5, H * 0.5);
        ctx.lineTo(W * 0.5 + Math.cos(rad) * 900, H * 0.5 + Math.sin(rad) * 900);
        ctx.stroke();
      }
      ctx.restore();
      // Particules ignées
      for (let i = 0; i < 50; i++) {
        const px = Math.random() * W, py = Math.random() * H;
        const pr = Math.random() * 2;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${150 + Math.random() * 105},0,${0.3 + Math.random() * 0.5})`;
        ctx.fill();
      }
    },
    primary: "#FF8C00",
    accent:  "#FF3A00",
    gold:    "#FFE066",
    text:    "#FFF5E0",
    muted:   "rgba(255,245,224,0.55)",
    bar:     ["#FF3A00", "#FF8C00", "#FFE066"],
    card:    "rgba(25,10,0,0.93)",
    border:  "#FF6600",
    glow:    "#FF8C00",
  },

  // ── 3. ARCTIC PROTOCOL ─────────────────────────────────────────────────────
  arctic_protocol: {
    name: "Arctic Protocol",
    symbol: "◇",
    bg: (ctx, W, H) => {
      ctx.fillStyle = "#020C18"; ctx.fillRect(0, 0, W, H);
      // Aurore polaire
      [[W * 0.3, H * 0.2, "#00BFFF", 450], [W * 0.7, H * 0.3, "#00FFCC", 380], [W * 0.5, H * 0.7, "#0066FF", 400]].forEach(([gx, gy, gc, gr]) => {
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, gc + "33"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      // Flocons cristallins
      ctx.strokeStyle = "rgba(0,191,255,0.08)"; ctx.lineWidth = 0.5;
      for (let i = 0; i < 30; i++) {
        const fx = Math.random() * W, fy = Math.random() * H;
        const fs = 8 + Math.random() * 20;
        for (let a = 0; a < 6; a++) {
          const rad = (a * 60 * Math.PI) / 180;
          ctx.beginPath(); ctx.moveTo(fx, fy);
          ctx.lineTo(fx + Math.cos(rad) * fs, fy + Math.sin(rad) * fs); ctx.stroke();
        }
      }
    },
    primary: "#00C8FF",
    accent:  "#00FFCC",
    gold:    "#80DFFF",
    text:    "#E8F8FF",
    muted:   "rgba(232,248,255,0.55)",
    bar:     ["#0066FF", "#00C8FF", "#00FFCC"],
    card:    "rgba(2,15,30,0.94)",
    border:  "#00A0CC",
    glow:    "#00C8FF",
  },

  // ── 4. CRIMSON DYNASTY ─────────────────────────────────────────────────────
  crimson_dynasty: {
    name: "Crimson Dynasty",
    symbol: "◆",
    bg: (ctx, W, H) => {
      ctx.fillStyle = "#0E0202"; ctx.fillRect(0, 0, W, H);
      // Motif tissu rouge impérial
      ctx.strokeStyle = "rgba(200,0,0,0.05)"; ctx.lineWidth = 1;
      for (let i = 0; i < W + H; i += 30) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(0, i); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(W, i - H); ctx.stroke();
      }
      [[W * 0.5, H * 0.5, "#CC0000", 550], [W * 0.1, H * 0.8, "#FF4400", 300]].forEach(([gx, gy, gc, gr]) => {
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, gc + "35"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
      // Éclats dorés
      for (let i = 0; i < 40; i++) {
        const px = Math.random() * W, py = Math.random() * H;
        ctx.beginPath(); ctx.arc(px, py, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${0.1 + Math.random() * 0.3})`; ctx.fill();
      }
    },
    primary: "#FF2020",
    accent:  "#FFD700",
    gold:    "#FFA500",
    text:    "#FFE8E8",
    muted:   "rgba(255,232,232,0.55)",
    bar:     ["#8B0000", "#FF2020", "#FFD700"],
    card:    "rgba(20,3,3,0.94)",
    border:  "#CC0000",
    glow:    "#FF2020",
  },

  // ── 5. VOID MATRIX ─────────────────────────────────────────────────────────
  void_matrix: {
    name: "Void Matrix",
    symbol: "▣",
    bg: (ctx, W, H) => {
      ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, W, H);
      // Grille matrix
      ctx.strokeStyle = "rgba(0,255,65,0.07)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      // Pluie de code (colonnes vertes)
      ctx.save(); ctx.font = "10px monospace"; ctx.fillStyle = "rgba(0,255,65,0.15)";
      for (let x = 0; x < W; x += 20) {
        const chars = "01アイウエオカキクケコ";
        const len = 4 + Math.floor(Math.random() * 8);
        for (let j = 0; j < len; j++) {
          ctx.globalAlpha = (1 - j / len) * 0.2;
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, 20 + j * 15);
        }
      }
      ctx.restore();
      // Glow central
      const g = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, 600);
      g.addColorStop(0, "rgba(0,255,65,0.08)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    primary: "#00FF41",
    accent:  "#00CC33",
    gold:    "#AAFF80",
    text:    "#CCFFCC",
    muted:   "rgba(204,255,204,0.55)",
    bar:     ["#003300", "#00FF41", "#AAFF80"],
    card:    "rgba(0,10,0,0.96)",
    border:  "#00CC33",
    glow:    "#00FF41",
  },

  // ── 6. SAKURA PHANTOM ──────────────────────────────────────────────────────
  sakura_phantom: {
    name: "Sakura Phantom",
    symbol: "✦",
    bg: (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1A0522"); g.addColorStop(0.4, "#2D0A35"); g.addColorStop(1, "#1A0522");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // Pétales fantômes
      for (let i = 0; i < 25; i++) {
        const px = Math.random() * W, py = Math.random() * H;
        const pr = 30 + Math.random() * 60;
        const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
        pg.addColorStop(0, "rgba(255,120,200,0.12)"); pg.addColorStop(1, "transparent");
        ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);
      }
      [[W * 0.8, H * 0.2, "#FF69B4", 400], [W * 0.2, H * 0.7, "#DA70D6", 350]].forEach(([gx, gy, gc, gr]) => {
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        rg.addColorStop(0, gc + "22"); rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      });
    },
    primary: "#FF69B4",
    accent:  "#DA70D6",
    gold:    "#FFB3D9",
    text:    "#FFF0F8",
    muted:   "rgba(255,240,248,0.55)",
    bar:     ["#8B0057", "#FF69B4", "#DA70D6"],
    card:    "rgba(26,5,34,0.93)",
    border:  "#CC3399",
    glow:    "#FF69B4",
  },

  // ── 7. TITAN FORGE ─────────────────────────────────────────────────────────
  titan_forge: {
    name: "Titan Forge",
    symbol: "◎",
    bg: (ctx, W, H) => {
      ctx.fillStyle = "#080808"; ctx.fillRect(0, 0, W, H);
      // Texture métal fondu
      ctx.strokeStyle = "rgba(255,140,0,0.04)"; ctx.lineWidth = 1;
      for (let i = 0; i < W + H; i += 25) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(0, i); ctx.stroke();
      }
      // Braises
      for (let i = 0; i < 80; i++) {
        const bx = Math.random() * W, by = H * 0.6 + Math.random() * H * 0.4;
        const br = Math.random() * 3;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${80 + Math.random() * 100},0,${0.4 + Math.random() * 0.5})`;
        ctx.fill();
      }
      [[W * 0.5, H, "#FF4500", 550], [W * 0.5, H * 0.5, "#FF8C00", 300]].forEach(([gx, gy, gc, gr]) => {
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        rg.addColorStop(0, gc + "30"); rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      });
    },
    primary: "#FF6600",
    accent:  "#FFB347",
    gold:    "#FFD700",
    text:    "#FFF0E0",
    muted:   "rgba(255,240,224,0.55)",
    bar:     ["#8B2500", "#FF4500", "#FFB347"],
    card:    "rgba(15,8,0,0.95)",
    border:  "#CC4400",
    glow:    "#FF6600",
  },

  // ── 8. HOLOGRAM ────────────────────────────────────────────────────────────
  hologram: {
    name: "Hologram",
    symbol: "◈",
    bg: (ctx, W, H) => {
      ctx.fillStyle = "#010A10"; ctx.fillRect(0, 0, W, H);
      // Scanlines holographiques
      for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = `rgba(0,255,200,${0.01 + Math.random() * 0.015})`;
        ctx.fillRect(0, y, W, 2);
      }
      // Grille 3D perspective
      ctx.strokeStyle = "rgba(0,200,255,0.05)"; ctx.lineWidth = 1;
      const vp = { x: W / 2, y: H * 0.5 };
      for (let x = 0; x < W; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(vp.x + (x - vp.x) * 0.3, vp.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(vp.x + (x - vp.x) * 0.3, vp.y); ctx.stroke();
      }
      // Halos teal-cyan
      [[W * 0.6, H * 0.4, "#00FFE0", 500], [W * 0.2, H * 0.6, "#0080FF", 350]].forEach(([gx, gy, gc, gr]) => {
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        rg.addColorStop(0, gc + "20"); rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      });
    },
    primary: "#00FFE0",
    accent:  "#0088FF",
    gold:    "#80FFEE",
    text:    "#E0FFFA",
    muted:   "rgba(224,255,250,0.55)",
    bar:     ["#003344", "#00FFE0", "#0088FF"],
    card:    "rgba(0,12,20,0.96)",
    border:  "#00CCA0",
    glow:    "#00FFE0",
  },

  // ── 9. MIDNIGHT RAVEN ──────────────────────────────────────────────────────
  midnight_raven: {
    name: "Midnight Raven",
    symbol: "▲",
    bg: (ctx, W, H) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#050510"); g.addColorStop(0.5, "#0A0A20"); g.addColorStop(1, "#05050F");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // Toile d'araignée cosmique
      ctx.strokeStyle = "rgba(100,100,200,0.06)"; ctx.lineWidth = 0.8;
      const cx = W * 0.5, cy = H * 0.5;
      for (let a = 0; a < 360; a += 30) {
        const rad = (a * Math.PI) / 180;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rad) * 700, cy + Math.sin(rad) * 700); ctx.stroke();
      }
      for (let r = 80; r < 700; r += 100) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      }
      // Étoiles bleues
      for (let i = 0; i < 120; i++) {
        const sx = Math.random() * W, sy = Math.random() * H;
        const sr = Math.random() * 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,180,255,${0.2 + Math.random() * 0.6})`; ctx.fill();
      }
    },
    primary: "#8888FF",
    accent:  "#AACCFF",
    gold:    "#C0C0FF",
    text:    "#EEEEFF",
    muted:   "rgba(238,238,255,0.55)",
    bar:     ["#2200AA", "#6644FF", "#AACCFF"],
    card:    "rgba(5,5,20,0.95)",
    border:  "#5544CC",
    glow:    "#8888FF",
  },

  // ── 10. JADE SOVEREIGN ─────────────────────────────────────────────────────
  jade_sovereign: {
    name: "Jade Sovereign",
    symbol: "◑",
    bg: (ctx, W, H) => {
      ctx.fillStyle = "#011008"; ctx.fillRect(0, 0, W, H);
      // Motif bambou/jade
      ctx.strokeStyle = "rgba(0,200,100,0.05)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 45) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 20, H); ctx.stroke();
      }
      [[W * 0.4, H * 0.4, "#00CC66", 500], [W * 0.75, H * 0.65, "#00FF99", 350]].forEach(([gx, gy, gc, gr]) => {
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        rg.addColorStop(0, gc + "2A"); rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      });
      // Paillettes jade
      for (let i = 0; i < 50; i++) {
        const px = Math.random() * W, py = Math.random() * H;
        ctx.beginPath(); ctx.arc(px, py, Math.random() * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,150,${0.1 + Math.random() * 0.4})`; ctx.fill();
      }
    },
    primary: "#00FF88",
    accent:  "#00CC66",
    gold:    "#AAFFCC",
    text:    "#E0FFE8",
    muted:   "rgba(224,255,232,0.55)",
    bar:     ["#004422", "#00CC66", "#00FF88"],
    card:    "rgba(1,15,8,0.95)",
    border:  "#009944",
    glow:    "#00FF88",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DESSIN — Fonctions modulaires
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Texte avec ombre douce ───────────────────────────────────────────────────
function drawText(ctx, txt, x, y, size, color, { align = "left", glow = null, alpha = 1, weight = "bold" } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px RankFont, "Arial"`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 20; }
  ctx.fillStyle = color;
  ctx.fillText(txt, x, y);
  ctx.restore();
}

// ─── Ligne décorative ─────────────────────────────────────────────────────────
function drawLine(ctx, x1, y1, x2, y2, color, { width = 1.5, glow = null } = {}) {
  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 12; }
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, "transparent"); g.addColorStop(0.5, color); g.addColorStop(1, "transparent");
  ctx.strokeStyle = g; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

// ─── Barre de progression ────────────────────────────────────────────────────
function drawBar(ctx, x, y, w, h, pct, colors, { radius = 12, glow = null } = {}) {
  // Fond
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  rrect(ctx, x, y, w, h, radius); ctx.fill();
  ctx.restore();
  // Remplissage
  const fill = Math.max(w * pct, h);
  const pg = ctx.createLinearGradient(x, y, x + w, y);
  pg.addColorStop(0, colors[0]); pg.addColorStop(0.5, colors[1]); pg.addColorStop(1, colors[2]);
  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 18; }
  ctx.fillStyle = pg;
  rrect(ctx, x, y, fill, h, radius); ctx.fill();
  ctx.restore();
  // Reflet
  ctx.save(); ctx.globalAlpha = 0.2;
  rrect(ctx, x, y, fill, h / 2, [radius, radius, 0, 0]);
  const shine = ctx.createLinearGradient(x, y, x, y + h / 2);
  shine.addColorStop(0, "#FFFFFF"); shine.addColorStop(1, "transparent");
  ctx.fillStyle = shine; ctx.fill();
  ctx.restore();
}

// ─── Carte statistique ───────────────────────────────────────────────────────
function drawStatCard(ctx, x, y, w, h, label, value, symbol, theme) {
  ctx.save();
  ctx.shadowColor = theme.primary + "55"; ctx.shadowBlur = 18;
  ctx.fillStyle = theme.card;
  rrect(ctx, x, y, w, h, 16); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.border + "80"; ctx.lineWidth = 1.5;
  rrect(ctx, x, y, w, h, 16); ctx.stroke();
  ctx.restore();
  // Symbole accent
  drawText(ctx, symbol, x + 22, y + h / 2 - 8, 18, theme.accent, { align: "left", glow: theme.glow });
  // Label
  drawText(ctx, label, x + 18, y + h / 2 + 14, 13, theme.muted, { align: "left", weight: "600" });
  // Valeur
  drawText(ctx, value, x + w - 14, y + h / 2, 22, theme.primary, { align: "right", glow: theme.glow });
}

// ─── Bordure externe de la carte maîtresse ───────────────────────────────────
function drawMasterBorder(ctx, W, H, theme) {
  ctx.save();
  ctx.shadowColor = theme.glow; ctx.shadowBlur = 35;
  ctx.strokeStyle = theme.border; ctx.lineWidth = 2.5;
  rrect(ctx, 24, 24, W - 48, H - 48, 32); ctx.stroke();
  ctx.restore();
  // Double bordure intérieure
  ctx.save();
  ctx.strokeStyle = theme.accent + "40"; ctx.lineWidth = 1;
  rrect(ctx, 30, 30, W - 60, H - 60, 28); ctx.stroke();
  ctx.restore();
  // Accents de coins
  const corners = [
    [24, 24, 1, 1], [W - 24, 24, -1, 1],
    [24, H - 24, 1, -1], [W - 24, H - 24, -1, -1],
  ];
  ctx.save(); ctx.strokeStyle = theme.gold; ctx.lineWidth = 3;
  ctx.shadowColor = theme.gold; ctx.shadowBlur = 14;
  corners.forEach(([cx, cy, dx, dy]) => {
    const L = 40;
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * L, cy);
    ctx.stroke();
  });
  ctx.restore();
}

// ─── Cercle avatar avec photo ────────────────────────────────────────────────
async function drawAvatar(ctx, img, cx, cy, R, theme) {
  // Anneaux orbitaux
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const ri = R + 12 + i * 10;
    const opacity = [0.5, 0.25, 0.12][i];
    ctx.strokeStyle = theme.primary + Math.round(opacity * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = [2.5, 1.5, 1][i];
    ctx.shadowColor = theme.glow; ctx.shadowBlur = [20, 10, 5][i];
    ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // Photo
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(img, cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
  // Halo interne
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = theme.primary; ctx.lineWidth = 3;
  ctx.shadowColor = theme.glow; ctx.shadowBlur = 25;
  ctx.stroke();
  ctx.restore();
  // Reflet en dégradé sur l'avatar
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
  const shine = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R * 0.3);
  shine.addColorStop(0, "rgba(255,255,255,0.14)"); shine.addColorStop(0.5, "transparent");
  ctx.fillStyle = shine; ctx.fill();
  ctx.restore();
}

function drawFallbackAvatar(ctx, cx, cy, R, initial, theme) {
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  bg.addColorStop(0, theme.primary + "AA"); bg.addColorStop(1, theme.accent + "55");
  ctx.save();
  ctx.shadowColor = theme.glow; ctx.shadowBlur = 30;
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  drawText(ctx, initial.toUpperCase(), cx, cy, 80, "#FFFFFF", { glow: "#FFFFFF" });
}

// ─── Badge de rang ────────────────────────────────────────────────────────────
function drawRankBadge(ctx, cx, cy, rank, theme) {
  const medals = { 1: { color: "#FFD700", border: "#FFA500", label: "I" },
                   2: { color: "#C0C0C0", border: "#A0A0A0", label: "II" },
                   3: { color: "#CD7F32", border: "#A05000", label: "III" } };
  const m = medals[rank];
  const R = 32;
  ctx.save();
  ctx.shadowColor = m ? m.color : theme.primary; ctx.shadowBlur = 25;
  ctx.fillStyle = m ? m.color : theme.card;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = m ? m.border : theme.border; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  drawText(ctx, m ? m.label : `#${rank}`, cx, cy, m ? 18 : 14, m ? "#0A0A0A" : theme.text, { glow: m ? m.border : theme.glow });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CANVAS PRINCIPAL — Layout pixel-perfect 1600 × 720
// ═══════════════════════════════════════════════════════════════════════════════
// ── Constantes de layout (tout est déduit de ces valeurs) ─────────────────────
const CW = 1700, CH = 750;   // dimensions Canvas
const PAD  = 20;             // padding global
const BAND = 310;            // largeur bande avatar
const SEP  = PAD + BAND;    // x du séparateur vertical
const RX   = SEP + 28;      // x départ zone droite
// Panneau rang global fixé à droite
const RNK_W = 240;
const RNK_X = CW - PAD - RNK_W - 10;
// Zone centrale (entre RX et le panneau rang)
const CNT_W = RNK_X - RX - 16;
// Alias rétrocompat
const W = CW, H = CH;

async function buildCanvas(data, theme, avatarPath) {
  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // ── 1. Fond thématique ────────────────────────────────────────────────────
  theme.bg(ctx, CW, CH);

  // ── 2. Carte principale ───────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 48; ctx.shadowOffsetY = 6;
  ctx.fillStyle = theme.card;
  rrect(ctx, PAD, PAD, CW - PAD * 2, CH - PAD * 2, 28); ctx.fill();
  ctx.restore();

  // ── 3. Bordure maîtresse ─────────────────────────────────────────────────
  drawMasterBorder(ctx, CW, CH, theme);

  // ── 4. Bande gauche ───────────────────────────────────────────────────────
  ctx.save();
  const bandG = ctx.createLinearGradient(PAD, PAD, SEP, CH - PAD);
  bandG.addColorStop(0, theme.primary + "1A"); bandG.addColorStop(1, theme.accent + "08");
  ctx.fillStyle = bandG;
  rrect(ctx, PAD + 1, PAD + 1, BAND - 1, CH - PAD * 2 - 2, [26, 0, 0, 26]); ctx.fill();
  ctx.restore();
  // Séparateur vertical
  drawLine(ctx, SEP, PAD + 22, SEP, CH - PAD - 22, theme.border, { width: 1.5, glow: theme.glow });

  // ── 5. Avatar ─────────────────────────────────────────────────────────────
  const avCX = PAD + BAND / 2;
  const avCY = CH / 2 - 24;
  const avR  = 108;
  if (avatarPath) {
    try {
      const img = await loadImage(avatarPath);
      await drawAvatar(ctx, img, avCX, avCY, avR, theme);
    } catch (_) { drawFallbackAvatar(ctx, avCX, avCY, avR, data.name[0] || "?", theme); }
  } else {
    drawFallbackAvatar(ctx, avCX, avCY, avR, data.name[0] || "?", theme);
  }

  // Badge rang (dessous avatar)
  drawRankBadge(ctx, avCX, avCY + avR + 36, data.expRank, theme);

  // Thème label (tout en bas de la bande)
  drawText(ctx, `${theme.symbol}  ${theme.name}  ${theme.symbol}`, avCX, CH - PAD - 26, 13, theme.muted, { weight: "600" });

  // ── 6. NOM utilisateur ────────────────────────────────────────────────────
  const NAME_Y = PAD + 72;
  ctx.save();
  const nameG = ctx.createLinearGradient(RX, NAME_Y - 22, RX + CNT_W, NAME_Y + 22);
  nameG.addColorStop(0, theme.primary); nameG.addColorStop(0.5, theme.gold); nameG.addColorStop(1, theme.accent);
  ctx.font = "bold 50px RankFont, Arial";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.shadowColor = theme.glow; ctx.shadowBlur = 20;
  ctx.fillStyle = nameG;
  ctx.fillText(data.name.length > 22 ? data.name.substring(0, 20) + "…" : data.name, RX, NAME_Y);
  ctx.restore();

  // Ligne séparatrice sous le nom
  drawLine(ctx, RX, NAME_Y + 36, RX + CNT_W, NAME_Y + 36, theme.primary, { glow: theme.glow });

  // ── 7. Métadonnées (3 colonnes équilibrées) ───────────────────────────────
  const META_Y = NAME_Y + 66;
  const genderLabel = (() => {
    const g = data.gender;
    const n = typeof g === "string" ? g.toUpperCase() : g;
    if (n === 1 || n === "FEMALE") return "[ Femme ]";
    if (n === 2 || n === "MALE")   return "[ Homme ]";
    return "[ - ]";
  })();
  const metaItems = [
    { sym: "◈", val: `@${data.username.substring(0, 20)}` },
    { sym: "◉", val: `Niveau ${data.level}` },
    { sym: "◆", val: genderLabel },
  ];
  const metaColW = Math.floor(CNT_W / 3);
  metaItems.forEach(({ sym, val }, i) => {
    const mx = RX + i * metaColW;
    drawText(ctx, `${sym}  ${val}`, mx, META_Y, 16,
      i === 0 ? theme.muted : theme.accent,
      { align: "left", weight: i === 0 ? "normal" : "600" });
  });

  // ── 8. Barre XP ───────────────────────────────────────────────────────────
  const BAR_Y = META_Y + 42;
  const BAR_H = 32;
  const pct   = Math.min(data.exp / data.neededExp, 1);
  drawBar(ctx, RX, BAR_Y, CNT_W, BAR_H, pct, theme.bar, { glow: theme.glow });
  // Labels XP — tout contenu dans le Canvas
  drawText(ctx, `${formatNumber(data.exp)} / ${formatNumber(data.neededExp)} XP  ·  ${(pct * 100).toFixed(1)}%`,
    RX + CNT_W / 2, BAR_Y + BAR_H / 2, 13, "#FFFFFF", {});
  drawText(ctx, `LVL ${data.level}`,     RX,          BAR_Y - 15, 12, theme.muted, { align: "left",  weight: "600" });
  drawText(ctx, `LVL ${data.level + 1}`, RX + CNT_W, BAR_Y - 15, 12, theme.muted, { align: "right", weight: "600" });

  // ── 9. Grille statistiques 3 × 2 ─────────────────────────────────────────
  const GRID_Y = BAR_Y + BAR_H + 18;
  const COLS   = 3;
  const GAP    = 12;
  const sW     = Math.floor((CNT_W - GAP * (COLS - 1)) / COLS);
  const sH     = 80;
  const stats  = [
    { sym: "◈", label: "XP Total",    value: formatNumber(data.totalExp) },
    { sym: "◉", label: "Argent",       value: formatNumber(data.money) },
    { sym: "◆", label: "Messages",     value: formatNumber(data.totalMessages) },
    { sym: "◇", label: "XP / Jour",    value: formatNumber(data.expPerDay) },
    { sym: "▣", label: "Rang Argent",  value: `#${data.moneyRank}` },
    { sym: "▲", label: "Top",          value: `${(((data.totalUsers - data.expRank + 1) / data.totalUsers) * 100).toFixed(1)}%` },
  ];
  stats.forEach((s, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    drawStatCard(ctx, RX + col * (sW + GAP), GRID_Y + row * (sH + GAP), sW, sH, s.label, s.value, s.sym, theme);
  });

  // ── 10. Panneau RANG GLOBAL ───────────────────────────────────────────────
  const RP_Y = NAME_Y - 8;
  const RP_H = GRID_Y + 2 * (sH + GAP) - GAP - RP_Y;
  ctx.save();
  ctx.shadowColor = theme.primary + "55"; ctx.shadowBlur = 28;
  ctx.fillStyle = theme.card;
  rrect(ctx, RNK_X, RP_Y, RNK_W, RP_H, 20); ctx.fill();
  ctx.strokeStyle = theme.border; ctx.lineWidth = 1.5;
  rrect(ctx, RNK_X, RP_Y, RNK_W, RP_H, 20); ctx.stroke();
  ctx.restore();

  drawText(ctx, "◈  RANG GLOBAL", RNK_X + RNK_W / 2, RP_Y + 26, 14, theme.muted, { weight: "600" });
  drawLine(ctx, RNK_X + 18, RP_Y + 46, RNK_X + RNK_W - 18, RP_Y + 46, theme.border, { width: 1 });

  // Grand numéro
  ctx.save();
  const rankNG = ctx.createLinearGradient(RNK_X, RP_Y + 55, RNK_X + RNK_W, RP_Y + 130);
  rankNG.addColorStop(0, theme.primary); rankNG.addColorStop(1, theme.gold);
  ctx.font = "bold 82px RankFont, Arial";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = theme.glow; ctx.shadowBlur = 32;
  ctx.fillStyle = rankNG;
  ctx.fillText(`#${data.expRank}`, RNK_X + RNK_W / 2, RP_Y + 106);
  ctx.restore();

  drawLine(ctx, RNK_X + 18, RP_Y + 158, RNK_X + RNK_W - 18, RP_Y + 158, theme.border, { width: 1 });

  const rpDetails = [
    ["Argent",       `#${data.moneyRank}`],
    ["Utilisateurs", formatNumber(data.totalUsers)],
    ["Top",          `${(((data.totalUsers - data.expRank + 1) / data.totalUsers) * 100).toFixed(1)}%`],
  ];
  rpDetails.forEach(([lbl, val], i) => {
    const yy = RP_Y + 180 + i * 38;
    drawText(ctx, lbl, RNK_X + 16, yy, 13, theme.muted, { align: "left", weight: "600" });
    drawText(ctx, val, RNK_X + RNK_W - 14, yy, 15, theme.primary, { align: "right", glow: theme.glow });
  });

  // ── 11. Pied de page ─────────────────────────────────────────────────────
  const FT_Y = CH - PAD - 24;
  drawLine(ctx, SEP + 14, FT_Y - 16, CW - PAD - 12, FT_Y - 16, theme.border, { width: 1 });
  const bdtTime = moment().tz("Asia/Dhaka").format("DD/MM/YYYY  HH:mm");
  drawText(ctx, `◈  ${bdtTime}   ◆   Christus   ◈`, CW / 2, FT_Y, 14, theme.muted, { weight: "600" });

  return canvas;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name: "rank",
    aliases: ["rk", "classement"],
    version: "13.0",
    author: "Christus",
    countDown: 5,
    role: 0,
    description: {
      fr: "◈ Rank Sovereign — Carte de rang ultime avec 10 themes exclusifs et photo Canvas.",
    },
    category: "info",
    guide: {
      fr:
        `◈  COMMANDE RANK SOVEREIGN\n\n` +
        `Utilisation :\n` +
        `  rank              — Votre carte de rang\n` +
        `  rank @mention     — Carte d un autre membre\n` +
        `  rank <uid>        — Par ID utilisateur\n` +
        `  rank <1-10>       — Choisir un theme\n\n` +
        `Commandes speciales :\n` +
        `  rank themes       — Liste des themes\n` +
        `  rank setbg        — Fond personnalise (repondre a une image)\n` +
        `  rank removebg     — Supprimer le fond personnalise\n\n` +
        `Themes disponibles :\n` +
        Object.entries(THEMES).map(([k, v], i) => `  ${i + 1}. ${v.name}  ${v.symbol}`).join("\n"),
    },
  },

  onStart: async function ({ message, event, args, usersData, threadsData, api }) {
    if (!canvasAvailable) {
      return message.reply("◈  Canvas non installe. Executez : npm install canvas");
    }

    const { senderID, threadID, mentions, messageReply } = event;
    const command = args[0]?.toLowerCase();

    // ── Commande : themes ──
    if (command === "themes" || command === "list") {
      let txt = `◈  THEMES RANK SOVEREIGN\n${"─".repeat(30)}\n`;
      Object.entries(THEMES).forEach(([k, v], i) => {
        txt += `${i + 1}. ${v.symbol}  ${v.name}\n`;
      });
      txt += `\n◆  Utilisez : rank <numero> pour appliquer un theme.`;
      return message.reply(txt);
    }

    // ── Commande : setbg ──
    if (command === "setbg" || command === "background") {
      if (!messageReply?.attachments?.[0]) {
        return message.reply("◆  Repondez a un message contenant une image.");
      }
      if (messageReply.attachments[0].type !== "photo") {
        return message.reply("◆  Le fichier doit etre une photo.");
      }
      try {
        const ud = await usersData.get(senderID);
        ud.rankBackground = messageReply.attachments[0].url;
        await usersData.set(senderID, ud);
        return message.reply("◈  Fond personnalise defini avec succes.");
      } catch (_) {
        return message.reply("◆  Echec de la definition du fond.");
      }
    }

    // ── Commande : removebg ──
    if (command === "removebg" || command === "deletebg") {
      try {
        const ud = await usersData.get(senderID);
        if (ud.rankBackground) {
          delete ud.rankBackground;
          await usersData.set(senderID, ud);
          return message.reply("◈  Fond supprime.");
        }
        return message.reply("◆  Aucun fond personnalise trouve.");
      } catch (_) {
        return message.reply("◆  Echec de la suppression.");
      }
    }

    // ── Cible ──
    let targetID = senderID;
    if (messageReply) {
      targetID = messageReply.senderID;
    } else if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (args[0] && !isNaN(args[0]) && parseInt(args[0]) > 1000) {
      targetID = args[0];
    }

    // ── Thème ──
    const themeKeys = Object.keys(THEMES);
    let themeKey    = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    for (const a of args) {
      const n = parseInt(a);
      if (!isNaN(n) && n >= 1 && n <= themeKeys.length) {
        themeKey = themeKeys[n - 1]; break;
      }
      if (themeKeys.includes(a.toLowerCase())) {
        themeKey = a.toLowerCase(); break;
      }
    }
    const theme = THEMES[themeKey];

    // ── Données utilisateur ──
    const [userData, threadData, allUsersData] = await Promise.all([
      usersData.get(targetID).catch(() => null),
      threadsData.get(threadID).catch(() => ({})),
      usersData.getAll().catch(() => []),
    ]);
    if (!userData) return message.reply("◆  Utilisateur introuvable dans la base de donnees.");

    let userInfo = {};
    try {
      const fb = await api.getUserInfo(targetID);
      userInfo = fb[targetID] || {};
    } catch (_) {
      userInfo = { name: userData.name || `User_${targetID}`, gender: 0, vanity: targetID };
    }

    const sortedExp   = [...allUsersData].filter(u => u?.exp > 0).sort((a, b) => (b.exp || 0) - (a.exp || 0));
    const expRank     = sortedExp.findIndex(u => u.userID === targetID) + 1 || allUsersData.length;
    const sortedMoney = [...allUsersData].filter(u => u?.money > 0).sort((a, b) => (b.money || 0) - (a.money || 0));
    const moneyRank   = sortedMoney.findIndex(u => u.userID === targetID) + 1 || allUsersData.length;

    const threadMembers = threadData?.members || [];
    const threadMember  = threadMembers.find(m => m?.userID === targetID) || {};

    const exp            = userData.exp || 0;
    const level          = expToLevel(exp);
    const currentLevelExp = levelToExp(level);
    const nextLevelExp    = levelToExp(level + 1);
    const progressExp     = Math.max(0, exp - currentLevelExp);
    const neededExp       = Math.max(1, nextLevelExp - currentLevelExp);
    const expPerDay       = userData.lastActive && (Date.now() - userData.lastActive < 30 * 86400000)
      ? Math.round(exp / 30) : 0;

    const renderData = {
      uid:           targetID,
      name:          userInfo.name || userData.name || "Utilisateur",
      username:      (userInfo.vanity && !userInfo.vanity.includes("profile.php") ? userInfo.vanity : targetID),
      gender:        userInfo.gender || userData.gender || 0,
      level,
      exp:           progressExp,
      neededExp,
      totalExp:      exp,
      money:         userData.money || 0,
      totalMessages: threadMember.count || 0,
      expPerDay,
      expRank,
      moneyRank,
      totalUsers:    sortedExp.length || allUsersData.length,
      customBg:      userData.rankBackground,
    };

    // ── Avatar (même méthode que pair.js) ──
    const cacheDir   = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
    const avatarPath = path.join(cacheDir, `rank_av_${Date.now()}.png`);
    const outPath    = path.join(cacheDir, `rank_out_${Date.now()}.png`);

    let avatarOK = false;
    if (renderData.customBg) {
      // fond custom géré dans buildCanvas
    }
    try {
      const res = await axios.get(
        `https://graph.facebook.com/${targetID}/picture?width=500&height=500&access_token=${FB_TOKEN}`,
        { responseType: "arraybuffer", timeout: 10000 }
      );
      fs.writeFileSync(avatarPath, Buffer.from(res.data));
      avatarOK = true;
    } catch (_) {}

    // ── Rendu Canvas ──
    const canvas = await buildCanvas(renderData, theme, avatarOK ? avatarPath : null);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
    if (avatarOK) try { fs.unlinkSync(avatarPath); } catch (_) {}

    // ── Réponse texte ──
    const isSelf     = targetID === senderID;
    const topPercent = ((renderData.totalUsers - expRank + 1) / renderData.totalUsers * 100).toFixed(1);
    const rankMedal  = expRank === 1 ? "[ I ]" : expRank === 2 ? "[ II ]" : expRank === 3 ? "[ III ]" : `#${expRank}`;

    const responseText = [
      isSelf ? "◈  VOTRE CARTE DE RANG" : `◈  CARTE DE RANG — ${renderData.name}`,
      `${"─".repeat(28)}`,
      `◆  Rang global   : ${rankMedal}  (Top ${topPercent}%)`,
      `◈  Niveau        : ${level}`,
      `◉  XP total      : ${formatNumber(renderData.totalExp)}`,
      `▣  Progression   : ${((progressExp / neededExp) * 100).toFixed(1)}%`,
      `◇  Argent        : ${formatNumber(renderData.money)}`,
      `▲  Messages      : ${formatNumber(renderData.totalMessages)}`,
      `◎  Theme         : ${theme.symbol} ${theme.name}`,
    ].join("\n");

    await message.reply({
      body:       responseText,
      attachment: fs.createReadStream(outPath),
    });

    setTimeout(() => {
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
    }, 30000);
  },
};
