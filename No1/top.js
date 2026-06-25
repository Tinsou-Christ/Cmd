"use strict";

// ═══════════════════════════════════════════════════════════════════════════════
//  TOP SOVEREIGN v3.0 — Classement visuel ultime
//  Auteur   : Christus
//  Canvas   : 1100 px wide × hauteur dynamique — pixel-perfect, rien ne déborde
//  Avatar   : Facebook Graph API (même méthode que rank.js & balance.js)
//  Symboles : zéro emoji — ◈ ◉ ◆ ◇ ▣ ▲ ◎ ◑ uniquement
//  10 thèmes exclusifs + podium Top 3 + liste 10 entrées + pagination onReply
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

// ─── Paliers ──────────────────────────────────────────────────────────────────
const TIERS = [
  { name: "Starter", min: 0,       max: 999,      color: "#CD7F32", sym: "◈" },
  { name: "Rookie",  min: 1_000,   max: 4_999,    color: "#C0C0C0", sym: "◇" },
  { name: "Pro",     min: 5_000,   max: 19_999,   color: "#FFD700", sym: "◆" },
  { name: "Elite",   min: 20_000,  max: 49_999,   color: "#E8E8FF", sym: "◉" },
  { name: "Master",  min: 50_000,  max: 99_999,   color: "#00FFFF", sym: "▣" },
  { name: "Legend",  min: 100_000, max: 499_999,  color: "#FF00FF", sym: "▲" },
  { name: "GOD",     min: 500_000, max: Infinity,  color: "#FF2020", sym: "◎" },
];
function getTier(balance) {
  const b = Number(balance) || 0;
  return TIERS.find(t => b >= t.min && b <= t.max) || TIERS[0];
}

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

// ═══════════════════════════════════════════════════════════════════════════════
//  10 THÈMES
// ═══════════════════════════════════════════════════════════════════════════════
const THEMES = {

  obsidian_crown: {
    name:"Obsidian Crown", sym:"◈",
    bg(ctx,W,H){
      ctx.fillStyle="#060610"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(180,140,255,0.045)"; ctx.lineWidth=0.8;
      for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      [[W*.7,H*.25,"#7B2FFF",400],[W*.2,H*.6,"#FF2FB8",300]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"22");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      for(let i=0;i<60;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*1.2,0,Math.PI*2);ctx.fillStyle=`rgba(180,140,255,${Math.random()*.35})`;ctx.fill();}
    },
    primary:"#B87AFF",accent:"#FF6DD6",gold:"#FFD580",silver:"#D0B0FF",bronze:"#9960FF",
    text:"#FFFFFF",muted:"rgba(255,255,255,0.5)",
    barA:"#7B2FFF",barB:"#FF6DD6",
    card:"rgba(18,10,35,0.92)",border:"#7B2FFF",glow:"#9B50FF",
    row1:"rgba(60,30,100,0.35)",row2:"rgba(40,15,70,0.22)",
  },

  solar_throne: {
    name:"Solar Throne", sym:"◉",
    bg(ctx,W,H){
      ctx.fillStyle="#0C0400"; ctx.fillRect(0,0,W,H);
      [[W*.5,0,"#FF8C00",500],[W*.5,H,"#FF3A00",450]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"38");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      ctx.save();ctx.globalAlpha=0.035;
      for(let a=0;a<360;a+=20){
        const r=(a*Math.PI)/180;ctx.strokeStyle="#FFB347";ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(W*.5,H*.4);ctx.lineTo(W*.5+Math.cos(r)*800,H*.4+Math.sin(r)*800);ctx.stroke();
      }
      ctx.restore();
      for(let i=0;i<55;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*1.8,0,Math.PI*2);ctx.fillStyle=`rgba(255,${140+Math.random()*115},0,${Math.random()*.4})`;ctx.fill();}
    },
    primary:"#FF8C00",accent:"#FF3A00",gold:"#FFE066",silver:"#FFB347",bronze:"#FF6600",
    text:"#FFF5E0",muted:"rgba(255,245,224,0.5)",
    barA:"#FF3A00",barB:"#FFE066",
    card:"rgba(22,8,0,0.93)",border:"#FF6600",glow:"#FF8C00",
    row1:"rgba(90,35,0,0.35)",row2:"rgba(60,20,0,0.22)",
  },

  arctic_summit: {
    name:"Arctic Summit", sym:"◇",
    bg(ctx,W,H){
      ctx.fillStyle="#010C18"; ctx.fillRect(0,0,W,H);
      [[W*.3,H*.2,"#00BFFF",430],[W*.7,H*.4,"#00FFCC",360],[W*.5,H*.75,"#0066FF",380]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"2A");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      ctx.strokeStyle="rgba(0,191,255,0.06)"; ctx.lineWidth=0.6;
      for(let i=0;i<20;i++){
        const fx=Math.random()*W,fy=Math.random()*H,fs=10+Math.random()*22;
        for(let a=0;a<6;a++){const r=(a*60*Math.PI)/180;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+Math.cos(r)*fs,fy+Math.sin(r)*fs);ctx.stroke();}
      }
    },
    primary:"#00C8FF",accent:"#00FFCC",gold:"#80DFFF",silver:"#60CCEE",bronze:"#3399CC",
    text:"#E8F8FF",muted:"rgba(232,248,255,0.5)",
    barA:"#0066FF",barB:"#00FFCC",
    card:"rgba(1,12,24,0.94)",border:"#0099BB",glow:"#00C8FF",
    row1:"rgba(0,60,100,0.35)",row2:"rgba(0,35,65,0.22)",
  },

  crimson_empire: {
    name:"Crimson Empire", sym:"◆",
    bg(ctx,W,H){
      ctx.fillStyle="#0C0101"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(200,0,0,0.042)"; ctx.lineWidth=1;
      for(let i=0;i<W+H;i+=34){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(0,i);ctx.stroke();}
      [[W*.6,H*.35,"#CC0000",500],[W*.2,H*.65,"#FF4400",360]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"2C");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      for(let i=0;i<50;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*1.5,0,Math.PI*2);ctx.fillStyle=`rgba(255,215,0,${Math.random()*.22})`;ctx.fill();}
    },
    primary:"#FF2020",accent:"#FFD700",gold:"#FFA500",silver:"#FF6060",bronze:"#CC0000",
    text:"#FFE8E8",muted:"rgba(255,232,232,0.5)",
    barA:"#8B0000",barB:"#FF2020",
    card:"rgba(18,2,2,0.95)",border:"#CC0000",glow:"#FF2020",
    row1:"rgba(100,10,10,0.35)",row2:"rgba(65,5,5,0.22)",
  },

  void_matrix: {
    name:"Void Matrix", sym:"▣",
    bg(ctx,W,H){
      ctx.fillStyle="#000000"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,255,65,0.052)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      const g=ctx.createRadialGradient(W*.5,H*.4,0,W*.5,H*.4,520);
      g.addColorStop(0,"rgba(0,255,65,0.08)");g.addColorStop(1,"transparent");
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.save();
      for(let x=0;x<W;x+=20){
        const chars="01$€◈▣▲";const len=3+Math.floor(Math.random()*8);
        for(let j=0;j<len;j++){ctx.globalAlpha=(1-j/len)*.13;ctx.fillStyle="#00FF41";ctx.font="9px monospace";ctx.fillText(chars[Math.floor(Math.random()*chars.length)],x,14+j*14);}
      }
      ctx.restore();
    },
    primary:"#00FF41",accent:"#00CC33",gold:"#AAFF80",silver:"#66FF66",bronze:"#33AA33",
    text:"#CCFFCC",muted:"rgba(204,255,204,0.5)",
    barA:"#003300",barB:"#AAFF80",
    card:"rgba(0,8,0,0.97)",border:"#00AA22",glow:"#00FF41",
    row1:"rgba(0,50,10,0.35)",row2:"rgba(0,30,5,0.22)",
  },

  sakura_legend: {
    name:"Sakura Legend", sym:"▲",
    bg(ctx,W,H){
      const g=ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,"#180422");g.addColorStop(0.5,"#280A38");g.addColorStop(1,"#180422");
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      for(let i=0;i<18;i++){
        const px=Math.random()*W,py=Math.random()*H,pr=35+Math.random()*75;
        const pg=ctx.createRadialGradient(px,py,0,px,py,pr);
        pg.addColorStop(0,"rgba(255,120,200,0.09)");pg.addColorStop(1,"transparent");
        ctx.fillStyle=pg;ctx.fillRect(0,0,W,H);
      }
      [[W*.78,H*.25,"#FF69B4",420],[W*.2,H*.65,"#DA70D6",360]].forEach(([gx,gy,gc,gr])=>{
        const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        rg.addColorStop(0,gc+"22");rg.addColorStop(1,"transparent");
        ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
      });
    },
    primary:"#FF69B4",accent:"#DA70D6",gold:"#FFB3D9",silver:"#E080CC",bronze:"#AA3388",
    text:"#FFF0F8",muted:"rgba(255,240,248,0.5)",
    barA:"#8B0057",barB:"#FF69B4",
    card:"rgba(24,4,34,0.94)",border:"#CC3399",glow:"#FF69B4",
    row1:"rgba(80,10,60,0.35)",row2:"rgba(50,5,40,0.22)",
  },

  titan_forge: {
    name:"Titan Forge", sym:"◎",
    bg(ctx,W,H){
      ctx.fillStyle="#060606"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(255,140,0,0.036)"; ctx.lineWidth=1;
      for(let i=0;i<W+H;i+=28){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(0,i);ctx.stroke();}
      for(let i=0;i<80;i++){const bx=Math.random()*W,by=H*.5+Math.random()*H*.5;ctx.beginPath();ctx.arc(bx,by,Math.random()*2.5,0,Math.PI*2);ctx.fillStyle=`rgba(255,${70+Math.random()*100},0,${.32+Math.random()*.5})`;ctx.fill();}
      [[W*.5,H,"#FF4500",560],[W*.5,H*.5,"#FF8C00",330]].forEach(([gx,gy,gc,gr])=>{
        const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        rg.addColorStop(0,gc+"26");rg.addColorStop(1,"transparent");
        ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
      });
    },
    primary:"#FF6600",accent:"#FFB347",gold:"#FFD700",silver:"#FF9944",bronze:"#CC4400",
    text:"#FFF0E0",muted:"rgba(255,240,224,0.5)",
    barA:"#882200",barB:"#FFB347",
    card:"rgba(12,6,0,0.96)",border:"#BB3300",glow:"#FF6600",
    row1:"rgba(80,30,0,0.35)",row2:"rgba(50,15,0,0.22)",
  },

  hologram_league: {
    name:"Hologram League", sym:"◑",
    bg(ctx,W,H){
      ctx.fillStyle="#010810"; ctx.fillRect(0,0,W,H);
      for(let y=0;y<H;y+=3){ctx.fillStyle=`rgba(0,255,200,${.006+Math.random()*.009})`;ctx.fillRect(0,y,W,1.5);}
      [[W*.6,H*.35,"#00FFE0",500],[W*.18,H*.58,"#0088FF",380],[W*.8,H*.7,"#FF00AA",320]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"1A");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      ctx.strokeStyle="rgba(0,255,200,0.032)"; ctx.lineWidth=1;
      const vp={x:W/2,y:H/2};
      for(let x=0;x<W;x+=55){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(vp.x+(x-vp.x)*.25,vp.y);ctx.stroke();ctx.beginPath();ctx.moveTo(x,H);ctx.lineTo(vp.x+(x-vp.x)*.25,vp.y);ctx.stroke();}
    },
    primary:"#00FFE0",accent:"#0088FF",gold:"#80FFEE",silver:"#40CCCC",bronze:"#008888",
    text:"#E0FFFA",muted:"rgba(224,255,250,0.5)",
    barA:"#003344",barB:"#0088FF",
    card:"rgba(0,10,18,0.97)",border:"#00BBA0",glow:"#00FFE0",
    row1:"rgba(0,50,60,0.35)",row2:"rgba(0,28,36,0.22)",
  },

  phantom_wealth: {
    name:"Phantom Wealth", sym:"◐",
    bg(ctx,W,H){
      const g=ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,"#12032A");g.addColorStop(0.5,"#200840");g.addColorStop(1,"#12032A");
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      for(let i=0;i<16;i++){
        const px=Math.random()*W,py=Math.random()*H,pr=38+Math.random()*78;
        const pg=ctx.createRadialGradient(px,py,0,px,py,pr);
        pg.addColorStop(0,"rgba(200,100,255,0.085)");pg.addColorStop(1,"transparent");
        ctx.fillStyle=pg;ctx.fillRect(0,0,W,H);
      }
      [[W*.76,H*.28,"#CC44FF",420],[W*.18,H*.68,"#FF44CC",360]].forEach(([gx,gy,gc,gr])=>{
        const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        rg.addColorStop(0,gc+"22");rg.addColorStop(1,"transparent");
        ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
      });
    },
    primary:"#CC44FF",accent:"#FF44CC",gold:"#FFAAFF",silver:"#CC88EE",bronze:"#884499",
    text:"#F8EEFF",muted:"rgba(248,238,255,0.5)",
    barA:"#660088",barB:"#FF44CC",
    card:"rgba(16,2,34,0.96)",border:"#9922CC",glow:"#CC44FF",
    row1:"rgba(60,8,90,0.35)",row2:"rgba(38,4,58,0.22)",
  },

  jade_sovereign: {
    name:"Jade Sovereign", sym:"✦",
    bg(ctx,W,H){
      ctx.fillStyle="#010F06"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,200,100,0.04)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=46){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+20,H);ctx.stroke();}
      [[W*.42,H*.38,"#00CC66",490],[W*.74,H*.62,"#00FF99",370]].forEach(([gx,gy,gc,gr])=>{
        const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        rg.addColorStop(0,gc+"24");rg.addColorStop(1,"transparent");
        ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
      });
      for(let i=0;i<55;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*2,0,Math.PI*2);ctx.fillStyle=`rgba(0,255,150,${.08+Math.random()*.32})`;ctx.fill();}
    },
    primary:"#00FF88",accent:"#00CC66",gold:"#AAFFCC",silver:"#66DDAA",bronze:"#228855",
    text:"#E0FFE8",muted:"rgba(224,255,232,0.5)",
    barA:"#004422",barB:"#00FF88",
    card:"rgba(1,12,6,0.96)",border:"#008833",glow:"#00FF88",
    row1:"rgba(0,55,20,0.35)",row2:"rgba(0,32,10,0.22)",
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

function MBAR(ctx, x,y,w,h, pct, colA, colB, glow) {
  ctx.save();ctx.fillStyle="rgba(0,0,0,0.35)";rr(ctx,x,y,w,h,h/2);ctx.fill();ctx.restore();
  const fw=Math.max(w*Math.min(pct,1),h);
  const pg=ctx.createLinearGradient(x,y,x+w,y);
  pg.addColorStop(0,colA);pg.addColorStop(1,colB);
  ctx.save();ctx.shadowColor=glow;ctx.shadowBlur=12;ctx.fillStyle=pg;rr(ctx,x,y,fw,h,h/2);ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha=.16;rr(ctx,x,y,fw,h/2,[h/2,h/2,0,0]);
  const sh=ctx.createLinearGradient(x,y,x,y+h/2);sh.addColorStop(0,"#FFF");sh.addColorStop(1,"transparent");
  ctx.fillStyle=sh;ctx.fill();ctx.restore();
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

async function AVATAR(ctx, avatarImg, cx, cy, R, t) {
  // Anneaux
  [0,1,2].forEach(i=>{
    const ri=R+9+i*8, op=[0.5,0.24,0.1][i];
    ctx.save();ctx.strokeStyle=t.primary+Math.round(op*255).toString(16).padStart(2,"0");
    ctx.lineWidth=[2.2,1.4,0.8][i];ctx.shadowColor=t.glow;ctx.shadowBlur=[18,9,4][i];
    ctx.beginPath();ctx.arc(cx,cy,ri,0,Math.PI*2);ctx.stroke();ctx.restore();
  });
  // Image
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();
  ctx.drawImage(avatarImg,cx-R,cy-R,R*2,R*2);ctx.restore();
  // Cercle primaire
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle=t.primary;ctx.lineWidth=2.5;ctx.shadowColor=t.glow;ctx.shadowBlur=18;ctx.stroke();ctx.restore();
  // Reflet
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();
  const sh=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R*.3);
  sh.addColorStop(0,"rgba(255,255,255,0.13)");sh.addColorStop(.5,"transparent");
  ctx.fillStyle=sh;ctx.fill();ctx.restore();
}

// ─── Chargement avatar FB ─────────────────────────────────────────────────────
async function loadAvatar(uid, name) {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/${uid}/picture?width=200&height=200&access_token=${FB_TOKEN}`,
      { responseType: "arraybuffer", timeout: 8000 }
    );
    return await loadImage(Buffer.from(res.data));
  } catch (_) {
    // Fallback : carré coloré avec initiale
    const cv  = createCanvas(200, 200);
    const ctx = cv.getContext("2d");
    const colors = ["#7B2FFF","#FF6600","#00C8FF","#FF2020","#00FF88","#CC44FF","#FFD700"];
    ctx.fillStyle = colors[parseInt(uid || "0") % colors.length];
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 80px BF, Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText((name || "?").charAt(0).toUpperCase(), 100, 100);
    return await loadImage(cv.toBuffer());
  }
}

// ─── Troncature intelligente du texte ────────────────────────────────────────
function fitText(ctx, text, maxW, sz) {
  ctx.font = `bold ${sz}px BF, Arial`;
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (ctx.measureText(t + "…").width > maxW && t.length > 1) t = t.slice(0,-1);
  return t + "…";
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CANVAS BUILDER — 1100 × dynamique
// ═══════════════════════════════════════════════════════════════════════════════
// Constantes de layout (TOUT est dérivé de ces valeurs, rien ne déborde)
const CW      = 1100;
const PAD     = 30;
const HEADER_H = 100;
// Podium Top 3
const POD_Y    = PAD + HEADER_H + 24;
const POD_CW   = Math.floor((CW - PAD * 2 - 24) / 3);  // 336
const POD_CH   = 220;
// Liste
const LIST_Y   = POD_Y + POD_CH + 52;
const ROW_H    = 82;
const ROW_GAP  = 8;
// Footer
const FOOT_H   = 88;
// Canvas height  (calculé à partir du nombre de lignes réel)
function canvasH(rowCount) {
  return LIST_Y + rowCount * (ROW_H + ROW_GAP) + FOOT_H + PAD;
}
// Colonnes ligne
const COL_RANK  = PAD;
const COL_AV_CX = PAD + 62 + 28;            // 120
const COL_NAME  = PAD + 62 + 28*2 + 14;     // 162
const NAME_MAX  = 260;
const COL_TIER  = COL_NAME + NAME_MAX + 16;  // 438
const COL_BAR   = COL_TIER + 160;            // 598
const BAR_W     = 210;
const COL_MONEY = CW - PAD;                  // 1070 (right-aligned)

async function buildCanvas(richList, pageUsers, startIndex, page, totalPages, senderRank, theme) {
  const rowCount = pageUsers.length;
  const CH = canvasH(rowCount);
  const canvas = createCanvas(CW, CH);
  const ctx    = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";

  // ── 1. Fond ────────────────────────────────────────────────────────────────
  theme.bg(ctx, CW, CH);

  // ── 2. Carte principale ───────────────────────────────────────────────────
  ctx.save();ctx.shadowColor="rgba(0,0,0,0.7)";ctx.shadowBlur=50;ctx.shadowOffsetY=5;
  ctx.fillStyle=theme.card;rr(ctx,18,18,CW-36,CH-36,26);ctx.fill();ctx.restore();

  // ── 3. Bordure ────────────────────────────────────────────────────────────
  MBORDER(ctx, CW, CH, theme);

  // ── 4. HEADER ────────────────────────────────────────────────────────────
  // Fond header
  ctx.save();ctx.fillStyle=theme.primary+"18";rr(ctx,PAD,PAD,CW-PAD*2,HEADER_H,18);ctx.fill();
  ctx.strokeStyle=theme.border+"55";ctx.lineWidth=1;rr(ctx,PAD,PAD,CW-PAD*2,HEADER_H,18);ctx.stroke();ctx.restore();
  // Titre principal
  ctx.save();
  const tg=ctx.createLinearGradient(PAD,PAD,CW-PAD,PAD+HEADER_H);
  tg.addColorStop(0,theme.primary);tg.addColorStop(0.5,theme.gold);tg.addColorStop(1,theme.accent);
  ctx.font="bold 44px BF, Arial";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.shadowColor=theme.glow;ctx.shadowBlur=22;ctx.fillStyle=tg;
  ctx.fillText("◈  CLASSEMENT DES RICHES  ◈",CW/2,PAD+HEADER_H/2);ctx.restore();
  // Infos droite du header
  T(ctx,`Page ${page} / ${totalPages}`,CW-PAD-10,PAD+HEADER_H/2-12,15,theme.muted,{align:"right",weight:"600"});
  T(ctx,`${richList.length} membres`,CW-PAD-10,PAD+HEADER_H/2+12,13,theme.muted,{align:"right",weight:"normal"});

  // ── 5. SECTION TITRE PODIUM ───────────────────────────────────────────────
  const POD_LABEL_Y = POD_Y - 18;
  T(ctx,"◆  TOP 3  ◆",PAD,POD_LABEL_Y,16,theme.muted,{weight:"600"});

  // ── 6. PODIUM TOP 3 ───────────────────────────────────────────────────────
  const podium = richList.slice(0, 3);
  const MEDALS = [
    { rank:"I",   color: theme.gold,   glow: theme.gold },
    { rank:"II",  color: theme.silver, glow: theme.silver },
    { rank:"III", color: theme.bronze, glow: theme.bronze },
  ];

  for (let i = 0; i < 3; i++) {
    const user = podium[i];
    const med  = MEDALS[i];
    const cx   = PAD + i * (POD_CW + 12) + POD_CW / 2;
    const cy   = POD_Y;

    // Fond carte podium
    ctx.save();ctx.shadowColor=med.color+"66";ctx.shadowBlur=20;
    ctx.fillStyle=theme.card;rr(ctx,PAD+i*(POD_CW+12),cy,POD_CW,POD_CH,18);ctx.fill();
    ctx.strokeStyle=med.color+"AA";ctx.lineWidth=1.8;rr(ctx,PAD+i*(POD_CW+12),cy,POD_CW,POD_CH,18);ctx.stroke();ctx.restore();

    // Médaille coin haut gauche
    const mx=PAD+i*(POD_CW+12)+16, my=cy+14;
    ctx.save();ctx.shadowColor=med.color;ctx.shadowBlur=14;
    ctx.fillStyle=med.color;rr(ctx,mx,my,56,28,14);ctx.fill();ctx.restore();
    T(ctx,med.rank,mx+28,my+14,15,"#000",{align:"center"});

    if (!user) continue;

    // Avatar
    const avImg = await loadAvatar(user.userID, user.name);
    const avCY  = cy + 90;
    await AVATAR(ctx, avImg, cx, avCY, 46, {...theme, primary: med.color, glow: med.color});

    // Nom
    ctx.font = "bold 20px BF, Arial";
    const dispName = fitText(ctx, user.name || "Inconnu", POD_CW - 20, 20);
    T(ctx, dispName, cx, cy + 158, 20, theme.text, { align: "center" });

    // Solde
    const tier = getTier(user.money || 0);
    ctx.save();
    const sg=ctx.createLinearGradient(cx-80,cy+188,cx+80,cy+188);
    sg.addColorStop(0,theme.primary);sg.addColorStop(1,theme.accent);
    ctx.font="bold 22px BF, Arial";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.shadowColor=theme.glow;ctx.shadowBlur=12;ctx.fillStyle=sg;
    ctx.fillText(fmt(user.money||0),cx,cy+185);ctx.restore();

    // Palier
    T(ctx,`${tier.sym}  ${tier.name}`,cx,cy+208,13,tier.color,{align:"center",weight:"600",glow:tier.color});
  }

  // ── 7. SÉPARATEUR ─────────────────────────────────────────────────────────
  const SEP_Y = LIST_Y - 26;
  GL(ctx, PAD, SEP_Y, CW-PAD, SEP_Y, theme.border, 1.2);
  T(ctx,"▣  CLASSEMENT COMPLET  ▣",PAD,SEP_Y-14,15,theme.muted,{weight:"600"});

  // ── 8. LISTE ──────────────────────────────────────────────────────────────
  const maxMoney = richList[0]?.money || 1;

  for (let i = 0; i < pageUsers.length; i++) {
    const user    = pageUsers[i];
    const gRank   = startIndex + i + 1;
    const rowY    = LIST_Y + i * (ROW_H + ROW_GAP);
    const isTop3  = gRank <= 3;
    const isSender = user.userID && false; // marqué côté onReply si besoin

    // Fond ligne
    ctx.save();ctx.fillStyle=i%2===0?theme.row1:theme.row2;
    rr(ctx,PAD,rowY,CW-PAD*2,ROW_H,14);ctx.fill();ctx.restore();
    if (isTop3) {
      ctx.save();ctx.strokeStyle=MEDALS[gRank-1].color+"66";ctx.lineWidth=1.2;
      rr(ctx,PAD,rowY,CW-PAD*2,ROW_H,14);ctx.stroke();ctx.restore();
    }

    // Rang
    const rankLabel = gRank===1?"[ I ]":gRank===2?"[ II ]":gRank===3?"[ III ]":`#${gRank}`;
    const rankColor = gRank===1?theme.gold:gRank===2?theme.silver:gRank===3?theme.bronze:theme.muted;
    T(ctx,rankLabel,COL_RANK+32,rowY+ROW_H/2,gRank<=3?16:14,rankColor,{align:"center",glow:gRank<=3?rankColor:null});

    // Avatar
    const avImg = await loadAvatar(user.userID, user.name);
    await AVATAR(ctx, avImg, COL_AV_CX, rowY+ROW_H/2, 26, {...theme, primary: isTop3?MEDALS[gRank-1].color:theme.primary, glow:isTop3?MEDALS[gRank-1].color:theme.glow});

    // Nom
    ctx.font = "bold 20px BF, Arial";
    const dn = fitText(ctx, user.name || "Inconnu", NAME_MAX, 20);
    T(ctx, dn, COL_NAME, rowY+ROW_H/2-8, 20, theme.text);

    // Palier
    const tier = getTier(user.money || 0);
    T(ctx, `${tier.sym} ${tier.name}`, COL_NAME, rowY+ROW_H/2+14, 13, tier.color, {weight:"600"});

    // Barre relative au top 1
    const pct = (user.money || 0) / maxMoney;
    MBAR(ctx, COL_BAR, rowY+ROW_H/2-10, BAR_W, 20, pct, theme.barA, theme.barB, theme.glow);
    T(ctx,`${(pct*100).toFixed(1)}%`,COL_BAR+BAR_W+8,rowY+ROW_H/2-10,11,theme.muted,{weight:"600"});

    // Solde (right-aligned)
    T(ctx, fmt(user.money||0), COL_MONEY, rowY+ROW_H/2, 22, theme.primary, {align:"right", glow:theme.glow});
  }

  // ── 9. FOOTER ─────────────────────────────────────────────────────────────
  const FT_Y = LIST_Y + pageUsers.length * (ROW_H + ROW_GAP) + 10;
  GL(ctx, PAD, FT_Y, CW-PAD, FT_Y, theme.border, 1);

  // Rang du sender
  if (senderRank > 0) {
    T(ctx,`◈  Votre position : #${senderRank} sur ${richList.length}`,
      CW/2, FT_Y+22, 16, theme.accent, {align:"center",glow:theme.glow});
  }
  // Navigation
  T(ctx,"◆  Répondez avec un numéro de page pour naviguer  ◆",
    CW/2, FT_Y+46, 14, theme.muted, {align:"center",weight:"600"});
  // Timestamp + thème
  const now = moment().tz("Asia/Dhaka").format("DD/MM/YYYY  HH:mm");
  T(ctx,`${theme.sym}  ${now}  ·  Christus  ${theme.sym}`,
    CW/2, FT_Y+68, 13, theme.muted, {align:"center",weight:"600"});

  return canvas;
}

// ─── Constante MEDALS accessible partout ─────────────────────────────────────
const MEDALS = [
  { rank:"I",   color: "#FFD700" },
  { rank:"II",  color: "#C0C0C0" },
  { rank:"III", color: "#CD7F32" },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name:        "top",
    aliases:     [],
    version:     "3.0",
    author:      "Christus",
    countDown:   5,
    role:        0,
    description: { fr: "◈ Top Sovereign v3 — Classement des riches, 10 thèmes, pixel-perfect." },
    category:    "economy",
    guide: {
      fr: [
        "◈  TOP SOVEREIGN",
        "",
        "  top [page]         — Classement des riches",
        "  top <1-10>         — Choisir un thème",
        "  top themes         — Liste des thèmes",
        "",
        "  Répondez avec un numéro de page pour naviguer.",
      ].join("\n"),
    },
  },

  // ─── Commande principale ────────────────────────────────────────────────────
  onStart: async function ({ message, event, args, usersData, api }) {
    const { senderID, threadID } = event;
    const PER_PAGE = 10;

    // Thème
    if (args[0]?.toLowerCase() === "themes") {
      const keys = Object.keys(THEMES);
      let txt = `◈  THÈMES TOP SOVEREIGN\n${"─".repeat(26)}\n`;
      keys.forEach((k, i) => { txt += `${i+1}. ${THEMES[k].sym}  ${THEMES[k].name}\n`; });
      txt += `\n◆  top theme <numéro> pour appliquer.`;
      return message.reply(txt);
    }

    // Choisir thème depuis args
    const themeKeys = Object.keys(THEMES);
    const senderUD  = await usersData.get(senderID).catch(() => ({}));
    let themeKey    = senderUD?.topTheme && THEMES[senderUD.topTheme]
      ? senderUD.topTheme
      : themeKeys[Math.floor(Math.random() * themeKeys.length)];
    let page = 1;
    for (const a of args) {
      const n = parseInt(a);
      if (!isNaN(n) && n >= 1 && n <= themeKeys.length) { themeKey = themeKeys[n-1]; continue; }
      if (themeKeys.includes(a.toLowerCase())) { themeKey = a.toLowerCase(); continue; }
      if (!isNaN(n) && n > 0) page = n;
    }
    const theme = THEMES[themeKey];

    // Données
    const allUsers   = await usersData.getAll();
    const richList   = allUsers.filter(u => (u.money||0) > 0).sort((a,b) => (b.money||0)-(a.money||0));
    const totalPages = Math.max(1, Math.ceil(richList.length / PER_PAGE));
    page = Math.max(1, Math.min(page, totalPages));

    const startIndex = (page - 1) * PER_PAGE;
    const pageUsers  = richList.slice(startIndex, startIndex + PER_PAGE);
    const senderRank = richList.findIndex(u => u.userID === senderID) + 1;

    if (!pageUsers.length) {
      return message.reply("◆  Aucun utilisateur fortuné trouvé.");
    }

    if (!canvasAvailable) {
      const MEDALS_TXT = ["[ I ]","[ II ]","[ III ]"];
      let txt = `◈  CLASSEMENT DES RICHES — Page ${page}/${totalPages}\n${"─".repeat(32)}\n`;
      pageUsers.forEach((u, i) => {
        const gr   = startIndex + i + 1;
        const tier = getTier(u.money||0);
        txt += `${MEDALS_TXT[gr-1]||`#${gr}`}  ${u.name||"Inconnu"}\n`;
        txt += `   ${tier.sym} ${tier.name}  ·  ${fmt(u.money||0)}\n`;
      });
      if (senderRank > 0) txt += `\n◈  Votre position : #${senderRank}`;
      return message.reply(txt);
    }

    // Canvas
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
    const outPath = path.join(cacheDir, `top_${threadID}_${Date.now()}.png`);

    const canvas = await buildCanvas(richList, pageUsers, startIndex, page, totalPages, senderRank, theme);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));

    const sent = await message.reply({
      body:       `◈  CLASSEMENT — Page ${page}/${totalPages}\n◆  Thème : ${theme.sym} ${theme.name}`,
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
      return message.reply(`◆  Page invalide. Entrez un numéro entre 1 et ${Reply.totalPages}.`);
    }

    const PER_PAGE = 10;
    const theme    = THEMES[Reply.themeKey] || THEMES[Object.keys(THEMES)[0]];

    const allUsers   = await usersData.getAll();
    const richList   = allUsers.filter(u => (u.money||0) > 0).sort((a,b) => (b.money||0)-(a.money||0));
    const startIndex = (page - 1) * PER_PAGE;
    const pageUsers  = richList.slice(startIndex, startIndex + PER_PAGE);
    const senderRank = richList.findIndex(u => u.userID === event.senderID) + 1;

    if (!pageUsers.length) return message.reply("◆  Aucun utilisateur sur cette page.");

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
    const outPath = path.join(cacheDir, `top_${Reply.threadID}_${Date.now()}.png`);

    const canvas = await buildCanvas(richList, pageUsers, startIndex, page, Reply.totalPages, senderRank, theme);
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));

    await message.reply({
      body:       `◈  CLASSEMENT — Page ${page}/${Reply.totalPages}`,
      attachment: fs.createReadStream(outPath),
    });

    setTimeout(() => { try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {} }, 60_000);
    global.GoatBot.onReply.delete(Reply.messageID);
  },
};
