"use strict";

// ═══════════════════════════════════════════════════════════════════════════════
//  GIVE SOVEREIGN v3.0 — Transfert d argent ultime
//  Auteur   : Christus
//  Canvas   : 1200 × 540 px — pixel-perfect, rien ne déborde
//  Avatar   : Facebook Graph API (même méthode que rank.js / balance.js / top.js)
//  Symboles : zéro emoji — ◈ ◉ ◆ ◇ ▣ ▲ ◎ ◑ uniquement
//  10 thèmes exclusifs avec fonds animés uniques
// ═══════════════════════════════════════════════════════════════════════════════

const fs    = require("fs-extra");
const path  = require("path");
const axios = require("axios");
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

let fonts;
try { fonts = require("../../func/font.js"); } catch (_) {}

// ─── Polices ──────────────────────────────────────────────────────────────────
if (canvasAvailable && registerFont) {
  const fd = path.join(__dirname, "assets", "font");
  [
    ["BeVietnamPro-Bold.ttf",    "BF", "bold"],
    ["BeVietnamPro-Regular.ttf", "BF", "normal"],
    ["BeVietnamPro-SemiBold.ttf","BF", "600"],
    ["NotoSans-Bold.ttf",        "BF", "bold"],
    ["NotoSans-Regular.ttf",     "BF", "normal"],
  ].forEach(([f, fam, w]) => {
    try {
      const fp = path.join(fd, f);
      if (fs.existsSync(fp)) registerFont(fp, { family: fam, weight: w });
    } catch (_) {}
  });
}

const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

// ─── Formatage monnaie ────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null || isNaN(n)) return "$0";
  n = Number(n);
  if (!isFinite(n)) return "$∞";
  const S = [{v:1e18,s:"Qi"},{v:1e15,s:"Qa"},{v:1e12,s:"T"},{v:1e9,s:"B"},{v:1e6,s:"M"},{v:1e3,s:"K"}];
  const sc = S.find(s => Math.abs(n) >= s.v);
  if (sc) return `${n<0?"-":""}$${(Math.abs(n)/sc.v).toFixed(2).replace(/\.00$/,"")}${sc.s}`;
  const p = Math.abs(n).toFixed(2).split(".");
  p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n<0?"-":""}$${p.join(".")}`;
}

// ─── Parsing montant (ex : 1k, 2.5m, 1b) ─────────────────────────────────────
const SUFFIXES = { k:1e3, m:1e6, b:1e9, t:1e12, q:1e15, Q:1e18 };
function parseAmount(input) {
  if (!input || typeof input !== "string") return NaN;
  const m = input.trim().toLowerCase().match(/^([\d,.]+)\s*([kmbtq]?)$/i);
  if (!m) return NaN;
  let v = parseFloat(m[1].replace(/,/g, "."));
  if (m[2] && SUFFIXES[m[2]]) v *= SUFFIXES[m[2]];
  return isNaN(v) ? NaN : Math.floor(v);
}

// ─── Paliers ──────────────────────────────────────────────────────────────────
const TIERS = [
  { name:"Starter", min:0,       max:999,      color:"#CD7F32", sym:"◈" },
  { name:"Rookie",  min:1_000,   max:4_999,    color:"#C0C0C0", sym:"◇" },
  { name:"Pro",     min:5_000,   max:19_999,   color:"#FFD700", sym:"◆" },
  { name:"Elite",   min:20_000,  max:49_999,   color:"#E8E8FF", sym:"◉" },
  { name:"Master",  min:50_000,  max:99_999,   color:"#00FFFF", sym:"▣" },
  { name:"Legend",  min:100_000, max:499_999,  color:"#FF00FF", sym:"▲" },
  { name:"GOD",     min:500_000, max:Infinity,  color:"#FF2020", sym:"◎" },
];
function getTier(b) { return TIERS.find(t => (b||0)>=t.min && (b||0)<=t.max) || TIERS[0]; }

// ═══════════════════════════════════════════════════════════════════════════════
//  10 THÈMES
// ═══════════════════════════════════════════════════════════════════════════════
const THEMES = {

  obsidian_gift: {
    name:"Obsidian Gift", sym:"◈",
    bg(ctx,W,H){
      ctx.fillStyle="#050510"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(180,140,255,0.042)"; ctx.lineWidth=0.8;
      for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      [[W*.65,H*.4,"#7B2FFF",380],[W*.2,H*.6,"#FF2FB8",300]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"22");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      for(let i=0;i<55;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*1.2,0,Math.PI*2);ctx.fillStyle=`rgba(180,140,255,${Math.random()*.32})`;ctx.fill();}
    },
    primary:"#B87AFF",accent:"#FF6DD6",gold:"#FFD580",
    text:"#FFFFFF",muted:"rgba(255,255,255,0.5)",
    card:"rgba(18,10,35,0.93)",border:"#7B2FFF",glow:"#9B50FF",
    arrowColor:"#B87AFF",
  },

  solar_gift: {
    name:"Solar Gift", sym:"◉",
    bg(ctx,W,H){
      ctx.fillStyle="#0C0400"; ctx.fillRect(0,0,W,H);
      [[W*.5,0,"#FF8C00",480],[W*.5,H,"#FF3A00",420]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"36");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      ctx.save();ctx.globalAlpha=0.032;
      for(let a=0;a<360;a+=20){const r=(a*Math.PI)/180;ctx.strokeStyle="#FFB347";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W*.5,H*.5);ctx.lineTo(W*.5+Math.cos(r)*700,H*.5+Math.sin(r)*700);ctx.stroke();}
      ctx.restore();
      for(let i=0;i<50;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*1.8,0,Math.PI*2);ctx.fillStyle=`rgba(255,${140+Math.random()*115},0,${Math.random()*.38})`;ctx.fill();}
    },
    primary:"#FF8C00",accent:"#FFE066",gold:"#FFD700",
    text:"#FFF5E0",muted:"rgba(255,245,224,0.5)",
    card:"rgba(22,8,0,0.93)",border:"#FF6600",glow:"#FF8C00",
    arrowColor:"#FFE066",
  },

  arctic_gift: {
    name:"Arctic Gift", sym:"◇",
    bg(ctx,W,H){
      ctx.fillStyle="#010C18"; ctx.fillRect(0,0,W,H);
      [[W*.3,H*.2,"#00BFFF",420],[W*.7,H*.5,"#00FFCC",370],[W*.5,H*.8,"#0066FF",360]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"2A");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      ctx.strokeStyle="rgba(0,191,255,0.06)"; ctx.lineWidth=0.6;
      for(let i=0;i<18;i++){const fx=Math.random()*W,fy=Math.random()*H,fs=10+Math.random()*22;for(let a=0;a<6;a++){const r=(a*60*Math.PI)/180;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+Math.cos(r)*fs,fy+Math.sin(r)*fs);ctx.stroke();}}
    },
    primary:"#00C8FF",accent:"#00FFCC",gold:"#80DFFF",
    text:"#E8F8FF",muted:"rgba(232,248,255,0.5)",
    card:"rgba(1,12,24,0.94)",border:"#0099BB",glow:"#00C8FF",
    arrowColor:"#00FFCC",
  },

  crimson_gift: {
    name:"Crimson Gift", sym:"◆",
    bg(ctx,W,H){
      ctx.fillStyle="#0C0101"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(200,0,0,0.04)"; ctx.lineWidth=1;
      for(let i=0;i<W+H;i+=34){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(0,i);ctx.stroke();}
      [[W*.62,H*.38,"#CC0000",480],[W*.18,H*.62,"#FF4400",350]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"2C");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      for(let i=0;i<45;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*1.5,0,Math.PI*2);ctx.fillStyle=`rgba(255,215,0,${Math.random()*.2})`;ctx.fill();}
    },
    primary:"#FF2020",accent:"#FFD700",gold:"#FFA500",
    text:"#FFE8E8",muted:"rgba(255,232,232,0.5)",
    card:"rgba(18,2,2,0.95)",border:"#CC0000",glow:"#FF2020",
    arrowColor:"#FFD700",
  },

  void_gift: {
    name:"Void Gift", sym:"▣",
    bg(ctx,W,H){
      ctx.fillStyle="#000000"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,255,65,0.05)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=22){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      const g=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,500);
      g.addColorStop(0,"rgba(0,255,65,0.09)");g.addColorStop(1,"transparent");
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.save();for(let x=0;x<W;x+=22){const chars="01$€◈▣";const len=2+Math.floor(Math.random()*7);for(let j=0;j<len;j++){ctx.globalAlpha=(1-j/len)*.12;ctx.fillStyle="#00FF41";ctx.font="9px monospace";ctx.fillText(chars[Math.floor(Math.random()*chars.length)],x,12+j*14);}}ctx.restore();
    },
    primary:"#00FF41",accent:"#AAFF80",gold:"#66FF66",
    text:"#CCFFCC",muted:"rgba(204,255,204,0.5)",
    card:"rgba(0,8,0,0.97)",border:"#00AA22",glow:"#00FF41",
    arrowColor:"#AAFF80",
  },

  sakura_gift: {
    name:"Sakura Gift", sym:"▲",
    bg(ctx,W,H){
      const g=ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,"#180422");g.addColorStop(0.5,"#280A38");g.addColorStop(1,"#180422");
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      for(let i=0;i<16;i++){const px=Math.random()*W,py=Math.random()*H,pr=35+Math.random()*75;const pg=ctx.createRadialGradient(px,py,0,px,py,pr);pg.addColorStop(0,"rgba(255,120,200,0.09)");pg.addColorStop(1,"transparent");ctx.fillStyle=pg;ctx.fillRect(0,0,W,H);}
      [[W*.78,H*.28,"#FF69B4",400],[W*.18,H*.68,"#DA70D6",340]].forEach(([gx,gy,gc,gr])=>{const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);rg.addColorStop(0,gc+"22");rg.addColorStop(1,"transparent");ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);});
    },
    primary:"#FF69B4",accent:"#DA70D6",gold:"#FFB3D9",
    text:"#FFF0F8",muted:"rgba(255,240,248,0.5)",
    card:"rgba(24,4,34,0.94)",border:"#CC3399",glow:"#FF69B4",
    arrowColor:"#DA70D6",
  },

  titan_gift: {
    name:"Titan Gift", sym:"◎",
    bg(ctx,W,H){
      ctx.fillStyle="#060606"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(255,140,0,0.036)"; ctx.lineWidth=1;
      for(let i=0;i<W+H;i+=28){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(0,i);ctx.stroke();}
      for(let i=0;i<80;i++){const bx=Math.random()*W,by=H*.5+Math.random()*H*.5;ctx.beginPath();ctx.arc(bx,by,Math.random()*2.5,0,Math.PI*2);ctx.fillStyle=`rgba(255,${70+Math.random()*100},0,${.32+Math.random()*.5})`;ctx.fill();}
      [[W*.5,H,"#FF4500",540],[W*.5,H*.5,"#FF8C00",320]].forEach(([gx,gy,gc,gr])=>{const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);rg.addColorStop(0,gc+"25");rg.addColorStop(1,"transparent");ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);});
    },
    primary:"#FF6600",accent:"#FFB347",gold:"#FFD700",
    text:"#FFF0E0",muted:"rgba(255,240,224,0.5)",
    card:"rgba(12,6,0,0.96)",border:"#BB3300",glow:"#FF6600",
    arrowColor:"#FFB347",
  },

  hologram_gift: {
    name:"Hologram Gift", sym:"◑",
    bg(ctx,W,H){
      ctx.fillStyle="#010810"; ctx.fillRect(0,0,W,H);
      for(let y=0;y<H;y+=3){ctx.fillStyle=`rgba(0,255,200,${.006+Math.random()*.009})`;ctx.fillRect(0,y,W,1.5);}
      [[W*.6,H*.4,"#00FFE0",480],[W*.18,H*.6,"#0088FF",360],[W*.8,H*.7,"#FF00AA",300]].forEach(([gx,gy,gc,gr])=>{const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);g.addColorStop(0,gc+"1A");g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);});
      const vp={x:W/2,y:H/2};ctx.strokeStyle="rgba(0,255,200,0.032)";ctx.lineWidth=1;
      for(let x=0;x<W;x+=55){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(vp.x+(x-vp.x)*.25,vp.y);ctx.stroke();ctx.beginPath();ctx.moveTo(x,H);ctx.lineTo(vp.x+(x-vp.x)*.25,vp.y);ctx.stroke();}
    },
    primary:"#00FFE0",accent:"#0088FF",gold:"#80FFEE",
    text:"#E0FFFA",muted:"rgba(224,255,250,0.5)",
    card:"rgba(0,10,18,0.97)",border:"#00BBA0",glow:"#00FFE0",
    arrowColor:"#0088FF",
  },

  phantom_gift: {
    name:"Phantom Gift", sym:"◐",
    bg(ctx,W,H){
      const g=ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,"#12032A");g.addColorStop(0.5,"#200840");g.addColorStop(1,"#12032A");
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      for(let i=0;i<15;i++){const px=Math.random()*W,py=Math.random()*H,pr=38+Math.random()*78;const pg=ctx.createRadialGradient(px,py,0,px,py,pr);pg.addColorStop(0,"rgba(200,100,255,0.085)");pg.addColorStop(1,"transparent");ctx.fillStyle=pg;ctx.fillRect(0,0,W,H);}
      [[W*.76,H*.28,"#CC44FF",400],[W*.18,H*.68,"#FF44CC",340]].forEach(([gx,gy,gc,gr])=>{const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);rg.addColorStop(0,gc+"22");rg.addColorStop(1,"transparent");ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);});
    },
    primary:"#CC44FF",accent:"#FF44CC",gold:"#FFAAFF",
    text:"#F8EEFF",muted:"rgba(248,238,255,0.5)",
    card:"rgba(16,2,34,0.96)",border:"#9922CC",glow:"#CC44FF",
    arrowColor:"#FF44CC",
  },

  jade_gift: {
    name:"Jade Gift", sym:"✦",
    bg(ctx,W,H){
      ctx.fillStyle="#010F06"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,200,100,0.04)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=46){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+20,H);ctx.stroke();}
      [[W*.42,H*.38,"#00CC66",480],[W*.74,H*.62,"#00FF99",360]].forEach(([gx,gy,gc,gr])=>{const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);rg.addColorStop(0,gc+"24");rg.addColorStop(1,"transparent");ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);});
      for(let i=0;i<55;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*2,0,Math.PI*2);ctx.fillStyle=`rgba(0,255,150,${.08+Math.random()*.32})`;ctx.fill();}
    },
    primary:"#00FF88",accent:"#00CC66",gold:"#AAFFCC",
    text:"#E0FFE8",muted:"rgba(224,255,232,0.5)",
    card:"rgba(1,12,6,0.96)",border:"#008833",glow:"#00FF88",
    arrowColor:"#00CC66",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PRIMITIVES CANVAS
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
  if(glow){ctx.shadowColor=glow;ctx.shadowBlur=18;}
  ctx.fillStyle=color; ctx.fillText(s,x,y); ctx.restore();
}

function GL(ctx, x1,y1,x2,y2, color, w=1.5) {
  const g=ctx.createLinearGradient(x1,y1,x2,y2);
  g.addColorStop(0,"transparent");g.addColorStop(.5,color);g.addColorStop(1,"transparent");
  ctx.save();ctx.strokeStyle=g;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
}

function MBORDER(ctx, W, H, t) {
  const P=18;
  ctx.save();ctx.shadowColor=t.glow;ctx.shadowBlur=28;ctx.strokeStyle=t.border;ctx.lineWidth=2.2;rr(ctx,P,P,W-P*2,H-P*2,26);ctx.stroke();ctx.restore();
  ctx.save();ctx.strokeStyle=t.accent+"30";ctx.lineWidth=1;rr(ctx,P+5,P+5,W-P*2-10,H-P*2-10,22);ctx.stroke();ctx.restore();
  const L=38;
  [[P,P,1,1],[W-P,P,-1,1],[P,H-P,1,-1],[W-P,H-P,-1,-1]].forEach(([cx,cy,dx,dy])=>{
    ctx.save();ctx.strokeStyle=t.gold;ctx.lineWidth=2.8;ctx.shadowColor=t.gold;ctx.shadowBlur=10;
    ctx.beginPath();ctx.moveTo(cx,cy+dy*L);ctx.lineTo(cx,cy);ctx.lineTo(cx+dx*L,cy);ctx.stroke();ctx.restore();
  });
}

async function AVATAR(ctx, imgBuf, cx, cy, R, t) {
  for(let i=0;i<3;i++){
    const ri=R+10+i*9,op=[0.5,0.24,0.1][i];
    ctx.save();ctx.strokeStyle=t.primary+Math.round(op*255).toString(16).padStart(2,"0");
    ctx.lineWidth=[2.2,1.4,0.8][i];ctx.shadowColor=t.glow;ctx.shadowBlur=[18,9,4][i];
    ctx.beginPath();ctx.arc(cx,cy,ri,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();
  ctx.drawImage(imgBuf,cx-R,cy-R,R*2,R*2);ctx.restore();
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle=t.primary;ctx.lineWidth=2.5;ctx.shadowColor=t.glow;ctx.shadowBlur=18;ctx.stroke();ctx.restore();
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();
  const sh=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R*.3);
  sh.addColorStop(0,"rgba(255,255,255,0.13)");sh.addColorStop(.5,"transparent");
  ctx.fillStyle=sh;ctx.fill();ctx.restore();
}

async function loadAvatar(uid, name) {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/${uid}/picture?width=300&height=300&access_token=${FB_TOKEN}`,
      { responseType:"arraybuffer", timeout:8000 }
    );
    return await loadImage(Buffer.from(res.data));
  } catch (_) {
    const cv  = createCanvas(300,300);
    const ctx = cv.getContext("2d");
    const colors = ["#7B2FFF","#FF6600","#00C8FF","#FF2020","#00FF88","#CC44FF","#FFD700"];
    ctx.fillStyle = colors[parseInt(uid||"0") % colors.length];
    ctx.fillRect(0,0,300,300);
    ctx.fillStyle="#FFF"; ctx.font="bold 120px BF, Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText((name||"?").charAt(0).toUpperCase(),150,150);
    return await loadImage(cv.toBuffer());
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CANVAS PRINCIPAL — 1200 × 540
//  Layout :  [AVATAR_SENDER]  ←———  montant  ———→  [AVATAR_RECEIVER]
// ═══════════════════════════════════════════════════════════════════════════════
const CW = 1200, CH = 540;
const PAD     = 30;
const AV_Y    = 196;   // centre vertical des avatars
const AV_R    = 90;    // rayon avatar
const LEFT_X  = 280;   // centre avatar sender
const RIGHT_X = 920;   // centre avatar receiver
const MID_X   = CW / 2; // 600 — milieu pour l arrow + montant

async function buildCanvas(sData, rData, amount, theme) {
  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

  // ── 1. Fond ────────────────────────────────────────────────────────────────
  theme.bg(ctx, CW, CH);

  // ── 2. Carte principale ───────────────────────────────────────────────────
  ctx.save();ctx.shadowColor="rgba(0,0,0,0.72)";ctx.shadowBlur=52;ctx.shadowOffsetY=5;
  ctx.fillStyle=theme.card;rr(ctx,18,18,CW-36,CH-36,26);ctx.fill();ctx.restore();

  // ── 3. Bordure maîtresse ─────────────────────────────────────────────────
  MBORDER(ctx, CW, CH, theme);

  // ── 4. HEADER ─────────────────────────────────────────────────────────────
  const HDR_Y = PAD + 46;
  ctx.save();
  const hg=ctx.createLinearGradient(PAD,HDR_Y-20,CW-PAD,HDR_Y+20);
  hg.addColorStop(0,theme.primary);hg.addColorStop(0.5,theme.gold);hg.addColorStop(1,theme.accent);
  ctx.font="bold 38px BF, Arial";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.shadowColor=theme.glow;ctx.shadowBlur=22;ctx.fillStyle=hg;
  ctx.fillText("◈  TRANSFERT REUSSI  ◈",MID_X,HDR_Y);ctx.restore();

  // Ligne sous le header
  GL(ctx, PAD+20, HDR_Y+32, CW-PAD-20, HDR_Y+32, theme.border, 1.2);

  // ── 5. AVATARS + NOMS + PALIERS ────────────────────────────────────────────
  // Sender (gauche)
  const sImg = await loadAvatar(sData.uid, sData.name);
  await AVATAR(ctx, sImg, LEFT_X, AV_Y, AV_R, theme);

  // Receiver (droite)
  const rImg = await loadAvatar(rData.uid, rData.name);
  await AVATAR(ctx, rImg, RIGHT_X, AV_Y, AV_R, theme);

  // Noms
  const sDisplayName = sData.name.length > 16 ? sData.name.slice(0,14)+"…" : sData.name;
  const rDisplayName = rData.name.length > 16 ? rData.name.slice(0,14)+"…" : rData.name;
  T(ctx, sDisplayName, LEFT_X,  AV_Y+AV_R+24, 22, theme.text,   {align:"center"});
  T(ctx, rDisplayName, RIGHT_X, AV_Y+AV_R+24, 22, theme.text,   {align:"center"});

  // Paliers
  const sTier = getTier(sData.newBalance);
  const rTier = getTier(rData.newBalance);
  T(ctx,`${sTier.sym} ${sTier.name}`, LEFT_X,  AV_Y+AV_R+50, 15, sTier.color, {align:"center",glow:sTier.color});
  T(ctx,`${rTier.sym} ${rTier.name}`, RIGHT_X, AV_Y+AV_R+50, 15, rTier.color, {align:"center",glow:rTier.color});

  // Labels "ENVOYEUR" / "RECEVEUR"
  T(ctx,"◈  ENVOYEUR",  LEFT_X,  AV_Y-AV_R-22, 14, theme.muted, {align:"center",weight:"600"});
  T(ctx,"◈  RECEVEUR",  RIGHT_X, AV_Y-AV_R-22, 14, theme.muted, {align:"center",weight:"600"});

  // ── 6. FLÈCHE CENTRALE ────────────────────────────────────────────────────
  // Ligne pointillée de gauche (avatar sender) vers droite (avatar receiver)
  const ARR_Y  = AV_Y;
  const ARR_X1 = LEFT_X  + AV_R + 32;
  const ARR_X2 = RIGHT_X - AV_R - 32;
  // Ligne tirets
  ctx.save();
  ctx.strokeStyle = theme.arrowColor + "AA"; ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 7]);
  ctx.shadowColor = theme.glow; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(ARR_X1, ARR_Y); ctx.lineTo(ARR_X2 - 16, ARR_Y); ctx.stroke();
  ctx.restore();
  // Tête de flèche
  ctx.save();
  ctx.fillStyle = theme.arrowColor; ctx.shadowColor = theme.glow; ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(ARR_X2,      ARR_Y);
  ctx.lineTo(ARR_X2 - 24, ARR_Y - 14);
  ctx.lineTo(ARR_X2 - 24, ARR_Y + 14);
  ctx.closePath(); ctx.fill(); ctx.restore();

  // ── 7. MONTANT CENTRAL ────────────────────────────────────────────────────
  // Fond pilule derrière le montant
  const amtStr = fmt(amount);
  ctx.font = "bold 40px BF, Arial";
  const amtW = ctx.measureText(amtStr).width + 50;
  const amtH = 58;
  const amtX = MID_X - amtW / 2;
  const amtBoxY = ARR_Y - amtH / 2 - 2;
  ctx.save();
  ctx.shadowColor=theme.glow; ctx.shadowBlur=22;
  ctx.fillStyle=theme.primary+"25"; rr(ctx,amtX,amtBoxY,amtW,amtH,amtH/2); ctx.fill();
  ctx.strokeStyle=theme.primary+"88"; ctx.lineWidth=1.8;
  rr(ctx,amtX,amtBoxY,amtW,amtH,amtH/2); ctx.stroke(); ctx.restore();
  // Texte montant
  ctx.save();
  const mg=ctx.createLinearGradient(amtX,0,amtX+amtW,0);
  mg.addColorStop(0,theme.primary); mg.addColorStop(0.5,theme.gold); mg.addColorStop(1,theme.accent);
  ctx.font="bold 40px BF, Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.shadowColor=theme.glow; ctx.shadowBlur=24;
  ctx.fillStyle=mg; ctx.fillText(amtStr, MID_X, ARR_Y); ctx.restore();

  // ── 8. SOLDES APRÈS TRANSFERT ─────────────────────────────────────────────
  const STAT_Y = CH - PAD - 28;
  GL(ctx, PAD+20, STAT_Y-20, CW-PAD-20, STAT_Y-20, theme.border, 1);

  // Sender solde
  ctx.save();
  ctx.fillStyle=theme.card; rr(ctx, PAD+20, STAT_Y-14, 380, 36, 10); ctx.fill();
  ctx.strokeStyle=theme.border+"50"; ctx.lineWidth=1; rr(ctx,PAD+20,STAT_Y-14,380,36,10); ctx.stroke();
  ctx.restore();
  T(ctx,"◈",          PAD+36,   STAT_Y+4, 14, theme.accent);
  T(ctx,sData.name.length>14?sData.name.slice(0,12)+"…":sData.name,
        PAD+56, STAT_Y+4, 14, theme.muted, {weight:"600"});
  T(ctx,fmt(sData.newBalance), PAD+390, STAT_Y+4, 16, theme.primary, {align:"right",glow:theme.glow});

  // Receiver solde
  const RB_X = CW - PAD - 20 - 380;
  ctx.save();
  ctx.fillStyle=theme.card; rr(ctx,RB_X,STAT_Y-14,380,36,10); ctx.fill();
  ctx.strokeStyle=theme.border+"50"; ctx.lineWidth=1; rr(ctx,RB_X,STAT_Y-14,380,36,10); ctx.stroke();
  ctx.restore();
  T(ctx,"◈",      RB_X+16,      STAT_Y+4, 14, theme.accent);
  T(ctx,rData.name.length>14?rData.name.slice(0,12)+"…":rData.name,
        RB_X+36, STAT_Y+4, 14, theme.muted, {weight:"600"});
  T(ctx,fmt(rData.newBalance), RB_X+374, STAT_Y+4, 16, theme.primary, {align:"right",glow:theme.glow});

  // ── 9. PIED DE PAGE ───────────────────────────────────────────────────────
  const now = moment().tz("Asia/Dhaka").format("DD/MM/YYYY  HH:mm");
  T(ctx,`${theme.sym}  ${now}  ·  Christus  ${theme.sym}`,
    MID_X, CH-PAD+2, 13, theme.muted, {align:"center",weight:"600"});

  return canvas;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name:        "give",
    aliases:     ["gift","donate","don"],
    version:     "3.0",
    author:      "Christus",
    countDown:   5,
    role:        0,
    description: { fr: "◈ Give Sovereign v3 — Transfert d argent ultime, 10 thèmes, pixel-perfect." },
    category:    "economy",
    guide: {
      fr: [
        "◈  GIVE SOVEREIGN",
        "",
        "  give @user <montant>  — Donner de l argent",
        "  give @user 500",
        "  give @user 1k",
        "  give @user 2.5m",
        "  give @user 1b",
        "",
        "  give themes           — Liste des thèmes",
        "  give theme <1-10>     — Choisir un thème",
        "",
        "  Suffixes : k=1000  m=million  b=milliard  t=trillion",
        "  Aucune taxe  ·  Transfert instantané",
      ].join("\n"),
    },
  },

  onStart: async function ({ message, event, args, usersData, api }) {
    const { senderID, mentions, messageReply } = event;
    const cmd = args[0]?.toLowerCase();

    // ─── THEMES ────────────────────────────────────────────────────────────────
    if (cmd === "themes" || cmd === "theme") {
      const keys = Object.keys(THEMES);
      if (args[1]) {
        const n   = parseInt(args[1]);
        const key = (!isNaN(n) && n >= 1 && n <= keys.length)
          ? keys[n - 1] : args[1].toLowerCase();
        if (THEMES[key]) {
          const ud = await usersData.get(senderID);
          ud.giveTheme = key;
          await usersData.set(senderID, ud);
          return message.reply(`◈  Thème appliqué : ${THEMES[key].sym}  ${THEMES[key].name}`);
        }
        return message.reply("◆  Thème introuvable. Tapez give themes pour la liste.");
      }
      let txt = `◈  THÈMES GIVE SOVEREIGN\n${"─".repeat(26)}\n`;
      keys.forEach((k, i) => { txt += `${i+1}. ${THEMES[k].sym}  ${THEMES[k].name}\n`; });
      txt += `\n◆  give theme <numéro> pour appliquer.`;
      return message.reply(txt);
    }

    // ─── Détermination de la cible ────────────────────────────────────────────
    let targetID = Object.keys(mentions)[0] || messageReply?.senderID;
    // Cherche l arg montant (nombre + suffixe optionnel)
    const amountArg = args.find(a => /^[\d,.]+[kmbtqQ]?$/i.test(a));
    const amount    = parseAmount(amountArg);

    // ─── Validations ──────────────────────────────────────────────────────────
    if (!targetID) {
      return message.reply(
        `◆  UTILISATION INCORRECTE\n${"─".repeat(22)}\n` +
        `give @utilisateur <montant>\n\n` +
        `Exemples :\n` +
        `  give @Jean 500\n` +
        `  give @Marie 1k\n` +
        `  give @Paul 2.5m`
      );
    }
    if (isNaN(amount) || amount <= 0) {
      return message.reply(
        `◆  MONTANT INVALIDE\n${"─".repeat(20)}\n` +
        `Utilisez un nombre positif.\n` +
        `Exemples : 500  ·  1k  ·  2.5m  ·  1b`
      );
    }
    if (targetID === senderID) {
      return message.reply("◆  Vous ne pouvez pas vous donner de l argent à vous-même.");
    }

    // ─── Données ──────────────────────────────────────────────────────────────
    const [senderData, receiverData] = await Promise.all([
      usersData.get(senderID),
      usersData.get(targetID),
    ]);
    if (!receiverData) return message.reply("◆  Utilisateur destinataire introuvable.");

    const sMoney = senderData.money || 0;
    if (sMoney < amount) {
      return message.reply(
        `◆  FONDS INSUFFISANTS\n${"─".repeat(22)}\n` +
        `◈  Votre solde   : ${fmt(sMoney)}\n` +
        `◉  Montant voulu : ${fmt(amount)}\n` +
        `◆  Manque        : ${fmt(amount - sMoney)}`
      );
    }

    // ─── Transaction ──────────────────────────────────────────────────────────
    const newSMoney = sMoney - amount;
    const newRMoney = (receiverData.money || 0) + amount;
    await Promise.all([
      usersData.set(senderID, { money: newSMoney }),
      usersData.set(targetID, { money: newRMoney }),
    ]);

    // Noms
    let senderName = senderData.name || `User_${senderID}`;
    let receiverName = receiverData.name || `User_${targetID}`;
    try {
      const fbInfo = await api.getUserInfo([senderID, targetID]);
      senderName   = fbInfo[senderID]?.name   || senderName;
      receiverName = fbInfo[targetID]?.name    || receiverName;
    } catch (_) {}

    // ─── Fallback texte si canvas indisponible ────────────────────────────────
    if (!canvasAvailable) {
      return message.reply(
        `◈  TRANSFERT REUSSI\n${"─".repeat(24)}\n` +
        `◆  De        : ${senderName}\n` +
        `◉  Vers      : ${receiverName}\n` +
        `▣  Montant   : ${fmt(amount)}\n${"─".repeat(24)}\n` +
        `◈  Solde ${senderName.slice(0,10)} : ${fmt(newSMoney)}\n` +
        `◈  Solde ${receiverName.slice(0,10)}: ${fmt(newRMoney)}`
      );
    }

    // ─── Thème ────────────────────────────────────────────────────────────────
    const themeKeys = Object.keys(THEMES);
    const senderUD  = await usersData.get(senderID).catch(() => ({}));
    let themeKey    = senderUD?.giveTheme && THEMES[senderUD.giveTheme]
      ? senderUD.giveTheme
      : themeKeys[Math.floor(Math.random() * themeKeys.length)];
    for (const a of args) {
      const n = parseInt(a);
      if (!isNaN(n) && n >= 1 && n <= themeKeys.length) { themeKey = themeKeys[n-1]; break; }
      if (themeKeys.includes(a.toLowerCase())) { themeKey = a.toLowerCase(); break; }
    }
    const theme = THEMES[themeKey];

    // ─── Rendu Canvas ─────────────────────────────────────────────────────────
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
    const outPath = path.join(cacheDir, `give_${senderID}_${Date.now()}.png`);

    const cvs = await buildCanvas(
      { uid: senderID,   name: senderName,   newBalance: newSMoney },
      { uid: targetID,   name: receiverName, newBalance: newRMoney },
      amount,
      theme
    );
    fs.writeFileSync(outPath, cvs.toBuffer("image/png"));

    const sTier = getTier(newSMoney);
    const rTier = getTier(newRMoney);
    const body  = [
      `◈  TRANSFERT REUSSI`,
      `${"─".repeat(26)}`,
      `◆  De          : ${senderName}`,
      `◉  Vers        : ${receiverName}`,
      `▣  Montant     : ${fmt(amount)}`,
      `${"─".repeat(26)}`,
      `◈  ${senderName.slice(0,14)} : ${fmt(newSMoney)}  (${sTier.sym} ${sTier.name})`,
      `◈  ${receiverName.slice(0,14)}: ${fmt(newRMoney)}  (${rTier.sym} ${rTier.name})`,
      `◎  Thème       : ${theme.sym} ${theme.name}`,
    ].join("\n");

    await message.reply({ body, attachment: fs.createReadStream(outPath) });
    setTimeout(() => { try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {} }, 30_000);
  },
};
