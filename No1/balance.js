"use strict";

// ═══════════════════════════════════════════════════════════════════════════════
//  BALANCE SOVEREIGN v1.0 — Carte de solde ultime
//  Auteur  : Christus
//  Canvas  : 1700 × 750  |  10 thèmes exclusifs  |  Zéro emoji, symboles purs
//  Photo   : Facebook Graph API (même méthode que rank.js)
// ═══════════════════════════════════════════════════════════════════════════════

let loadImage, createCanvas, registerFont;
let canvasAvailable = false;
try {
  const cv = require("canvas");
  loadImage = cv.loadImage; createCanvas = cv.createCanvas; registerFont = cv.registerFont;
  canvasAvailable = true;
} catch (e) { console.error("Canvas unavailable:", e.message); }

const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");
const moment = require("moment-timezone");

let fonts;
try { fonts = require("../../func/font.js"); } catch (_) {}

// ─── Fonts ────────────────────────────────────────────────────────────────────
if (canvasAvailable && registerFont) {
  const fd = path.join(__dirname, "assets", "font");
  [["BeVietnamPro-Bold.ttf","BF","bold"],["BeVietnamPro-Regular.ttf","BF","normal"],
   ["BeVietnamPro-SemiBold.ttf","BF","600"],["NotoSans-Bold.ttf","BF","bold"],
   ["NotoSans-Regular.ttf","BF","normal"]].forEach(([f,fam,w]) => {
    try { const fp = path.join(fd,f); if(fs.existsSync(fp)) registerFont(fp,{family:fam,weight:w}); } catch(_){}
  });
}

const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIG ÉCONOMIQUE
// ═══════════════════════════════════════════════════════════════════════════════
const ECONOMY = {
  currency: { sym: "$", name: "Dollar" },
  transfer: {
    min: 10, max: 1_000_000, dailyLimit: 500_000,
    taxRates: [
      {max:1000,rate:2},{max:10000,rate:5},{max:50000,rate:8},
      {max:100000,rate:10},{max:500000,rate:12},{max:1000000,rate:15}
    ]
  },
  daily: { base: 100, streakMult: 0.1, maxStreak: 30, resetHours: 21 },
  tiers: [
    { name:"Starter",  min:0,       max:999,     color:"#CD7F32", sym:"◈", mult:1.0 },
    { name:"Rookie",   min:1000,    max:4999,    color:"#C0C0C0", sym:"◇", mult:1.1 },
    { name:"Pro",      min:5000,    max:19999,   color:"#FFD700", sym:"◆", mult:1.2 },
    { name:"Elite",    min:20000,   max:49999,   color:"#E5E4E2", sym:"◉", mult:1.3 },
    { name:"Master",   min:50000,   max:99999,   color:"#00FFFF", sym:"▣", mult:1.5 },
    { name:"Legend",   min:100000,  max:499999,  color:"#FF00FF", sym:"▲", mult:2.0 },
    { name:"GOD",      min:500000,  max:Infinity,color:"#FF2020", sym:"◎", mult:3.0 },
  ]
};

// ─── Utilitaires économiques ─────────────────────────────────────────────────
function formatMoney(n) {
  if (!n || isNaN(n)) return `${ECONOMY.currency.sym}0`;
  n = Number(n);
  if (!isFinite(n)) return `${ECONOMY.currency.sym}∞`;
  const scales = [{v:1e18,s:"Qi"},{v:1e15,s:"Qa"},{v:1e12,s:"T"},{v:1e9,s:"B"},{v:1e6,s:"M"},{v:1e3,s:"K"}];
  const sc = scales.find(s => Math.abs(n) >= s.v);
  if (sc) {
    const val = (Math.abs(n)/sc.v).toFixed(2).replace(/\.00$/,"");
    return `${n<0?"-":""}${ECONOMY.currency.sym}${val}${sc.s}`;
  }
  const p = Math.abs(n).toFixed(2).split(".");
  p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g,",");
  return `${n<0?"-":""}${ECONOMY.currency.sym}${p.join(".")}`;
}

function getTier(balance) {
  const b = Number(balance)||0;
  const t = ECONOMY.tiers.find(t => b>=t.min && b<=t.max) || ECONOMY.tiers[0];
  const idx = ECONOMY.tiers.indexOf(t);
  const next = ECONOMY.tiers[idx+1]||null;
  const prog = t.max===Infinity ? 100 : Math.min(100,((b-t.min)/(t.max-t.min))*100);
  return { ...t, next, prog, idx };
}

function calcTax(amount) {
  let rate = ECONOMY.transfer.taxRates.at(-1).rate;
  for (const r of ECONOMY.transfer.taxRates) { if(amount<=r.max){rate=r.rate;break;} }
  const tax = Math.ceil((amount*rate)/100);
  return { rate, tax, total: amount+tax, net: amount };
}

function txID() {
  return `TX${Date.now().toString(36)}${Math.random().toString(36).substr(2,5)}`.toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  10 THÈMES BALANCE SOVEREIGN
// ═══════════════════════════════════════════════════════════════════════════════
const THEMES = {

  // 1 — VAULT NOIR
  vault_noir: {
    name:"Vault Noir", sym:"◈",
    bg:(ctx,W,H)=>{
      ctx.fillStyle="#050508"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(255,215,0,0.04)"; ctx.lineWidth=1;
      for(let i=0;i<W+H;i+=32){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(0,i);ctx.stroke();}
      [[W*.6,H*.3,"#FFD700",500],[W*.15,H*.7,"#FFA500",350]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"22");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      for(let i=0;i<80;i++){const x=Math.random()*W,y=Math.random()*H;ctx.beginPath();ctx.arc(x,y,Math.random()*1.2,0,Math.PI*2);ctx.fillStyle=`rgba(255,215,0,${Math.random()*.3})`;ctx.fill();}
    },
    primary:"#FFD700",accent:"#FFA500",gold:"#FFE680",text:"#FFFFFF",muted:"rgba(255,255,255,0.5)",
    bar:["#8B6900","#FFD700","#FFE680"],card:"rgba(12,10,2,0.95)",border:"#CC9900",glow:"#FFD700",
  },

  // 2 — NEON BANKING
  neon_banking: {
    name:"Neon Banking", sym:"◉",
    bg:(ctx,W,H)=>{
      ctx.fillStyle="#020210"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,255,255,0.06)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      [[W*.5,H*.5,"#00FFFF",600],[W*.8,H*.2,"#FF00FF",400]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"20");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
    },
    primary:"#00FFFF",accent:"#FF00FF",gold:"#FFFF00",text:"#E0FFFF",muted:"rgba(224,255,255,0.5)",
    bar:["#004444","#00FFFF","#FF00FF"],card:"rgba(2,2,18,0.96)",border:"#00CCCC",glow:"#00FFFF",
  },

  // 3 — EMPIRE GOLD
  empire_gold: {
    name:"Empire Gold", sym:"◆",
    bg:(ctx,W,H)=>{
      const g=ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,"#1A0E00");g.addColorStop(0.5,"#2D1A00");g.addColorStop(1,"#1A0E00");
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(255,165,0,0.06)"; ctx.lineWidth=0.8;
      for(let i=0;i<W+H;i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i-H,H);ctx.stroke();}
      [[W*.7,H*.3,"#FFD700",500],[W*.2,H*.8,"#FF8C00",400]].forEach(([gx,gy,gc,gr])=>{
        const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        rg.addColorStop(0,gc+"28");rg.addColorStop(1,"transparent");
        ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
      });
      for(let i=0;i<60;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*1.5,0,Math.PI*2);ctx.fillStyle=`rgba(255,215,0,${Math.random()*.4})`;ctx.fill();}
    },
    primary:"#FFD700",accent:"#FF8C00",gold:"#FFEC80",text:"#FFF5D6",muted:"rgba(255,245,214,0.5)",
    bar:["#8B4500","#FFD700","#FFEC80"],card:"rgba(20,10,0,0.96)",border:"#CC8800",glow:"#FFD700",
  },

  // 4 — FROST CAPITAL
  frost_capital: {
    name:"Frost Capital", sym:"◇",
    bg:(ctx,W,H)=>{
      ctx.fillStyle="#010D1A"; ctx.fillRect(0,0,W,H);
      [[W*.3,H*.2,"#00C8FF",500],[W*.7,H*.5,"#00FFCC",400],[W*.5,H*.8,"#0066FF",380]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"2A");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      ctx.strokeStyle="rgba(0,200,255,0.06)"; ctx.lineWidth=0.7;
      for(let i=0;i<22;i++){
        const fx=Math.random()*W,fy=Math.random()*H,fs=12+Math.random()*25;
        for(let a=0;a<6;a++){const r=(a*60*Math.PI)/180;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+Math.cos(r)*fs,fy+Math.sin(r)*fs);ctx.stroke();}
      }
    },
    primary:"#00C8FF",accent:"#00FFCC",gold:"#80DFFF",text:"#E8FAFF",muted:"rgba(232,250,255,0.5)",
    bar:["#004466","#00C8FF","#00FFCC"],card:"rgba(1,12,24,0.95)",border:"#0099BB",glow:"#00C8FF",
  },

  // 5 — CRIMSON BANK
  crimson_bank: {
    name:"Crimson Bank", sym:"▣",
    bg:(ctx,W,H)=>{
      ctx.fillStyle="#0D0101"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(200,0,0,0.05)"; ctx.lineWidth=1;
      for(let i=0;i<W+H;i+=35){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(0,i);ctx.stroke();}
      [[W*.6,H*.4,"#CC0000",550],[W*.2,H*.6,"#FF4400",380]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"30");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      for(let i=0;i<50;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*2,0,Math.PI*2);ctx.fillStyle=`rgba(255,215,0,${Math.random()*.25})`;ctx.fill();}
    },
    primary:"#FF2020",accent:"#FFD700",gold:"#FFA500",text:"#FFE8E8",muted:"rgba(255,232,232,0.5)",
    bar:["#8B0000","#FF2020","#FFD700"],card:"rgba(18,2,2,0.96)",border:"#CC0000",glow:"#FF2020",
  },

  // 6 — QUANTUM VAULT
  quantum_vault: {
    name:"Quantum Vault", sym:"▲",
    bg:(ctx,W,H)=>{
      ctx.fillStyle="#000000"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,255,65,0.06)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=22){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      [[W*.5,H*.5,"#00FF41",550],[W*.8,H*.2,"#00CC33",350]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"18");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      ctx.save();ctx.font="9px monospace";
      for(let x=0;x<W;x+=22){
        const chars="01₿$€¥◈◆▣";const len=3+Math.floor(Math.random()*7);
        for(let j=0;j<len;j++){ctx.globalAlpha=(1-j/len)*.15;ctx.fillStyle="#00FF41";ctx.fillText(chars[Math.floor(Math.random()*chars.length)],x,15+j*14);}
      }
      ctx.restore();
    },
    primary:"#00FF41",accent:"#00CC33",gold:"#AAFF80",text:"#CCFFCC",muted:"rgba(204,255,204,0.5)",
    bar:["#003300","#00FF41","#AAFF80"],card:"rgba(0,8,0,0.97)",border:"#00AA22",glow:"#00FF41",
  },

  // 7 — PHANTOM WEALTH
  phantom_wealth: {
    name:"Phantom Wealth", sym:"◎",
    bg:(ctx,W,H)=>{
      const g=ctx.createLinearGradient(0,0,W,H);
      g.addColorStop(0,"#14042A");g.addColorStop(0.5,"#220840");g.addColorStop(1,"#14042A");
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      for(let i=0;i<18;i++){
        const px=Math.random()*W,py=Math.random()*H,pr=40+Math.random()*80;
        const pg=ctx.createRadialGradient(px,py,0,px,py,pr);
        pg.addColorStop(0,"rgba(200,100,255,0.1)");pg.addColorStop(1,"transparent");
        ctx.fillStyle=pg;ctx.fillRect(0,0,W,H);
      }
      [[W*.75,H*.3,"#CC44FF",450],[W*.2,H*.7,"#FF44CC",380]].forEach(([gx,gy,gc,gr])=>{
        const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        rg.addColorStop(0,gc+"25");rg.addColorStop(1,"transparent");
        ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
      });
    },
    primary:"#CC44FF",accent:"#FF44CC",gold:"#FFAAFF",text:"#F8EEFF",muted:"rgba(248,238,255,0.5)",
    bar:["#660088","#CC44FF","#FF44CC"],card:"rgba(18,2,36,0.96)",border:"#9922CC",glow:"#CC44FF",
  },

  // 8 — TITAN TREASURY
  titan_treasury: {
    name:"Titan Treasury", sym:"◑",
    bg:(ctx,W,H)=>{
      ctx.fillStyle="#060606"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(255,140,0,0.04)"; ctx.lineWidth=1;
      for(let i=0;i<W+H;i+=28){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(0,i);ctx.stroke();}
      for(let i=0;i<90;i++){const bx=Math.random()*W,by=H*.5+Math.random()*H*.5,br=Math.random()*3;ctx.beginPath();ctx.arc(bx,by,br,0,Math.PI*2);ctx.fillStyle=`rgba(255,${70+Math.random()*100},0,${.35+Math.random()*.5})`;ctx.fill();}
      [[W*.5,H,"#FF4500",600],[W*.5,H*.5,"#FF8C00",350]].forEach(([gx,gy,gc,gr])=>{
        const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        rg.addColorStop(0,gc+"28");rg.addColorStop(1,"transparent");
        ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
      });
    },
    primary:"#FF6600",accent:"#FFB347",gold:"#FFD700",text:"#FFF0E0",muted:"rgba(255,240,224,0.5)",
    bar:["#882200","#FF4500","#FFB347"],card:"rgba(12,6,0,0.96)",border:"#BB3300",glow:"#FF6600",
  },

  // 9 — HOLOGRAPHIC FUNDS
  holographic_funds: {
    name:"Holographic Funds", sym:"✦",
    bg:(ctx,W,H)=>{
      ctx.fillStyle="#010810"; ctx.fillRect(0,0,W,H);
      for(let y=0;y<H;y+=3){ctx.fillStyle=`rgba(0,255,200,${.008+Math.random()*.01})`;ctx.fillRect(0,y,W,1.5);}
      [[W*.6,H*.4,"#00FFE0",550],[W*.2,H*.6,"#0088FF",400],[W*.8,H*.7,"#FF00AA",350]].forEach(([gx,gy,gc,gr])=>{
        const g=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        g.addColorStop(0,gc+"1C");g.addColorStop(1,"transparent");
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      });
      ctx.strokeStyle="rgba(0,255,200,0.04)"; ctx.lineWidth=1;
      const vp={x:W/2,y:H/2};
      for(let x=0;x<W;x+=55){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(vp.x+(x-vp.x)*.2,vp.y);ctx.stroke();ctx.beginPath();ctx.moveTo(x,H);ctx.lineTo(vp.x+(x-vp.x)*.2,vp.y);ctx.stroke();}
    },
    primary:"#00FFE0",accent:"#0088FF",gold:"#80FFEE",text:"#E0FFFA",muted:"rgba(224,255,250,0.5)",
    bar:["#003344","#00FFE0","#0088FF"],card:"rgba(0,10,18,0.97)",border:"#00BBA0",glow:"#00FFE0",
  },

  // 10 — JADE FORTUNE
  jade_fortune: {
    name:"Jade Fortune", sym:"◐",
    bg:(ctx,W,H)=>{
      ctx.fillStyle="#010F06"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,200,100,0.04)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+22,H);ctx.stroke();}
      [[W*.4,H*.4,"#00CC66",520],[W*.75,H*.6,"#00FF99",380]].forEach(([gx,gy,gc,gr])=>{
        const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gr);
        rg.addColorStop(0,gc+"26");rg.addColorStop(1,"transparent");
        ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
      });
      for(let i=0;i<60;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*2,0,Math.PI*2);ctx.fillStyle=`rgba(0,255,150,${.1+Math.random()*.35})`;ctx.fill();}
    },
    primary:"#00FF88",accent:"#00CC66",gold:"#AAFFCC",text:"#E0FFE8",muted:"rgba(224,255,232,0.5)",
    bar:["#004422","#00CC66","#00FF88"],card:"rgba(1,12,6,0.96)",border:"#008833",glow:"#00FF88",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FONCTIONS CANVAS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── roundRect ───────────────────────────────────────────────────────────────
function rr(ctx,x,y,w,h,r){
  if(typeof r==="number")r=[r,r,r,r];
  const[tl,tr,br,bl]=r;
  ctx.beginPath();
  ctx.moveTo(x+tl,y);ctx.lineTo(x+w-tr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+tr);
  ctx.lineTo(x+w,y+h-br);ctx.quadraticCurveTo(x+w,y+h,x+w-br,y+h);
  ctx.lineTo(x+bl,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-bl);
  ctx.lineTo(x,y+tl);ctx.quadraticCurveTo(x,y,x+tl,y);ctx.closePath();
}

// ─── Texte ────────────────────────────────────────────────────────────────────
function T(ctx,s,x,y,sz,color,{align="left",weight="bold",glow=null,alpha=1}={}){
  ctx.save();ctx.globalAlpha=alpha;
  ctx.font=`${weight} ${sz}px BF, Arial`;
  ctx.textAlign=align;ctx.textBaseline="middle";
  if(glow){ctx.shadowColor=glow;ctx.shadowBlur=18;}
  ctx.fillStyle=color;ctx.fillText(s,x,y);ctx.restore();
}

// ─── Ligne en dégradé ─────────────────────────────────────────────────────────
function GL(ctx,x1,y1,x2,y2,color,w=1.5){
  const g=ctx.createLinearGradient(x1,y1,x2,y2);
  g.addColorStop(0,"transparent");g.addColorStop(.5,color);g.addColorStop(1,"transparent");
  ctx.save();ctx.strokeStyle=g;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
}

// ─── Barre de progression ─────────────────────────────────────────────────────
function BAR(ctx,x,y,w,h,pct,colors,glow){
  ctx.save();ctx.fillStyle="rgba(0,0,0,0.4)";rr(ctx,x,y,w,h,h/2);ctx.fill();ctx.restore();
  const fw=Math.max(w*Math.min(pct,1),h);
  const pg=ctx.createLinearGradient(x,y,x+w,y);
  pg.addColorStop(0,colors[0]);pg.addColorStop(.5,colors[1]);pg.addColorStop(1,colors[2]);
  ctx.save();ctx.shadowColor=glow;ctx.shadowBlur=16;ctx.fillStyle=pg;rr(ctx,x,y,Math.min(fw,w),h,h/2);ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha=.18;rr(ctx,x,y,Math.min(fw,w),h/2,[h/2,h/2,0,0]);
  const sh=ctx.createLinearGradient(x,y,x,y+h/2);sh.addColorStop(0,"#FFF");sh.addColorStop(1,"transparent");
  ctx.fillStyle=sh;ctx.fill();ctx.restore();
}

// ─── Carte info ───────────────────────────────────────────────────────────────
function CARD(ctx,x,y,w,h,sym,label,val,t){
  ctx.save();ctx.shadowColor=t.glow+"44";ctx.shadowBlur=14;
  ctx.fillStyle=t.card;rr(ctx,x,y,w,h,14);ctx.fill();ctx.restore();
  ctx.save();ctx.strokeStyle=t.border+"70";ctx.lineWidth=1.2;rr(ctx,x,y,w,h,14);ctx.stroke();ctx.restore();
  T(ctx,sym,       x+16,   y+h/2-9,  16, t.accent, {glow:t.glow});
  T(ctx,label,     x+14,   y+h/2+12, 12, t.muted,  {weight:"600"});
  T(ctx,val,       x+w-12, y+h/2,    20, t.primary, {align:"right",glow:t.glow});
}

// ─── Bordure maîtresse ────────────────────────────────────────────────────────
function BORDER(ctx,W,H,t){
  const P=20;
  ctx.save();ctx.shadowColor=t.glow;ctx.shadowBlur=32;ctx.strokeStyle=t.border;ctx.lineWidth=2.5;rr(ctx,P,P,W-P*2,H-P*2,28);ctx.stroke();ctx.restore();
  ctx.save();ctx.strokeStyle=t.accent+"35";ctx.lineWidth=1;rr(ctx,P+5,P+5,W-P*2-10,H-P*2-10,24);ctx.stroke();ctx.restore();
  const L=44,corners=[[P,P,1,1],[W-P,P,-1,1],[P,H-P,1,-1],[W-P,H-P,-1,-1]];
  ctx.save();ctx.strokeStyle=t.gold;ctx.lineWidth=3;ctx.shadowColor=t.gold;ctx.shadowBlur=12;
  corners.forEach(([cx,cy,dx,dy])=>{ctx.beginPath();ctx.moveTo(cx,cy+dy*L);ctx.lineTo(cx,cy);ctx.lineTo(cx+dx*L,cy);ctx.stroke();});
  ctx.restore();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
async function AVATAR(ctx,avatarPath,cx,cy,R,t){
  for(let i=0;i<3;i++){
    const ri=R+12+i*10,op=[0.55,0.28,0.12][i];
    ctx.save();ctx.strokeStyle=t.primary+Math.round(op*255).toString(16).padStart(2,"0");
    ctx.lineWidth=[2.5,1.5,1][i];ctx.shadowColor=t.glow;ctx.shadowBlur=[22,12,5][i];
    ctx.beginPath();ctx.arc(cx,cy,ri,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(avatarPath){
    try{
      const img=await loadImage(avatarPath);
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();
      ctx.drawImage(img,cx-R,cy-R,R*2,R*2);ctx.restore();
    }catch(_){AVFB(ctx,cx,cy,R,"?",t);}
  }else AVFB(ctx,cx,cy,R,"?",t);
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle=t.primary;ctx.lineWidth=3;ctx.shadowColor=t.glow;ctx.shadowBlur=22;ctx.stroke();ctx.restore();
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();
  const sh=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R*.35);
  sh.addColorStop(0,"rgba(255,255,255,0.14)");sh.addColorStop(.5,"transparent");
  ctx.fillStyle=sh;ctx.fill();ctx.restore();
}
function AVFB(ctx,cx,cy,R,init,t){
  const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,R);
  bg.addColorStop(0,t.primary+"AA");bg.addColorStop(1,t.accent+"55");
  ctx.save();ctx.shadowColor=t.glow;ctx.shadowBlur=28;ctx.fillStyle=bg;
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fill();ctx.restore();
  T(ctx,init.toUpperCase(),cx,cy,R*.7,"#FFF",{align:"center",glow:"#FFF"});
}

// ─── Badge de rang monétaire ──────────────────────────────────────────────────
function TIERBADGE(ctx,cx,cy,tier){
  const R=34;
  ctx.save();ctx.shadowColor=tier.color;ctx.shadowBlur=24;
  ctx.fillStyle=tier.color+"33";ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=tier.color;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();ctx.restore();
  T(ctx,tier.sym,cx,cy,22,tier.color,{align:"center",glow:tier.color});
}

// ─── Mini billets décoratifs ──────────────────────────────────────────────────
function BANKNOTES(ctx,x,y,balance,t){
  const denoms=[{v:1000,lbl:"1K"},{v:100,lbl:"100"},{v:10,lbl:"10"},{v:1,lbl:"1"}];
  let bx=x;
  for(const d of denoms){
    const count=Math.floor(balance/d.v);
    if(count<=0||bx>x+320) continue;
    const bw=68,bh=36,br=6;
    ctx.save();ctx.shadowColor=t.glow+"55";ctx.shadowBlur=8;
    ctx.fillStyle=t.primary+"18";rr(ctx,bx,y,bw,bh,br);ctx.fill();
    ctx.strokeStyle=t.primary+"60";ctx.lineWidth=1;rr(ctx,bx,y,bw,bh,br);ctx.stroke();ctx.restore();
    T(ctx,t.sym,     bx+10,  y+bh/2-6, 10, t.accent);
    T(ctx,d.lbl,     bx+bw/2,y+bh/2,   13, t.primary, {align:"center",glow:t.glow});
    T(ctx,`×${count<999?count:"999+"}`, bx+bw-6, y+bh-8, 9, t.muted, {align:"right"});
    bx+=bw+8;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CANVAS PRINCIPAL — 1700 × 750
// ═══════════════════════════════════════════════════════════════════════════════
const CW=1700, CH=750;
const PAD=20;
const BAND=320;           // bande gauche avatar
const SEP=PAD+BAND;       // x séparateur
const RX=SEP+30;          // x départ zone droite
const RNK_W=250;          // panneau rang/tier
const RNK_X=CW-PAD-RNK_W-10;
const CNT_W=RNK_X-RX-16; // largeur zone centrale

async function buildCanvas(data,theme,avatarPath){
  const canvas=createCanvas(CW,CH);
  const ctx=canvas.getContext("2d");
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality="high";

  // 1 — Fond
  theme.bg(ctx,CW,CH);

  // 2 — Carte principale
  ctx.save();ctx.shadowColor="rgba(0,0,0,0.7)";ctx.shadowBlur=50;ctx.shadowOffsetY=6;
  ctx.fillStyle=theme.card;rr(ctx,PAD,PAD,CW-PAD*2,CH-PAD*2,28);ctx.fill();ctx.restore();

  // 3 — Bordure maîtresse
  BORDER(ctx,CW,CH,theme);

  // 4 — Bande gauche
  ctx.save();
  const bg2=ctx.createLinearGradient(PAD,PAD,SEP,CH-PAD);
  bg2.addColorStop(0,theme.primary+"18");bg2.addColorStop(1,theme.accent+"08");
  ctx.fillStyle=bg2;rr(ctx,PAD+1,PAD+1,BAND-1,CH-PAD*2-2,[27,0,0,27]);ctx.fill();ctx.restore();
  GL(ctx,SEP,PAD+22,SEP,CH-PAD-22,theme.border,1.5);

  // 5 — Avatar
  const avCX=PAD+BAND/2, avCY=CH/2-40, avR=110;
  await AVATAR(ctx,avatarPath,avCX,avCY,avR,theme);

  // Badge tier sous l'avatar
  const tier=getTier(data.balance);
  TIERBADGE(ctx,avCX,avCY+avR+38,tier);

  // Nom du tier + multiplicateur
  T(ctx,`${tier.name}  ·  ${tier.mult}x`,avCX,avCY+avR+90,15,tier.color,{align:"center",glow:tier.color});

  // Thème label en bas de bande
  T(ctx,`${theme.sym}  ${theme.name}  ${theme.sym}`,avCX,CH-PAD-28,13,theme.muted,{align:"center",weight:"600"});

  // 6 — Titre + solde (zone centrale haute)
  const TITLE_Y=PAD+50;
  T(ctx,"◈  PASSEPORT FINANCIER",RX,TITLE_Y,16,theme.muted,{weight:"600"});

  // Grand solde en dégradé
  const BAL_Y=TITLE_Y+68;
  ctx.save();
  const ng=ctx.createLinearGradient(RX,BAL_Y-30,RX+CNT_W,BAL_Y+30);
  ng.addColorStop(0,theme.primary);ng.addColorStop(0.5,theme.gold);ng.addColorStop(1,theme.accent);
  ctx.font="bold 68px BF, Arial";ctx.textAlign="left";ctx.textBaseline="middle";
  ctx.shadowColor=theme.glow;ctx.shadowBlur=28;ctx.fillStyle=ng;
  ctx.fillText(formatMoney(data.balance),RX,BAL_Y);
  ctx.restore();

  // Ligne séparatrice
  GL(ctx,RX,BAL_Y+46,RX+CNT_W,BAL_Y+46,theme.primary,1.5);

  // 7 — Métadonnées (ligne d'identité)
  const META_Y=BAL_Y+80;
  const username = (data.vanity && !data.vanity.includes("profile.php")) ? `@${data.vanity}` : `#${data.uid}`;
  const metaItems=[
    {sym:"◈", val: data.name.length>22 ? data.name.substring(0,20)+"…" : data.name},
    {sym:"◉", val: username},
    {sym:"◆", val: `Rang  #${data.globalRank}`},
  ];
  const metaColW=Math.floor(CNT_W/3);
  metaItems.forEach(({sym,val},i)=>{
    T(ctx,`${sym}  ${val}`,RX+i*metaColW,META_Y,16,i===0?theme.text:theme.accent,{weight:i===0?"600":"bold"});
  });

  // 8 — Barre de progression vers le prochain palier
  const BAR_Y=META_Y+44;
  const BAR_H=30;
  BAR(ctx,RX,BAR_Y,CNT_W,BAR_H,tier.prog/100,theme.bar,theme.glow);
  const progLabel=tier.next
    ? `${tier.prog.toFixed(1)}%  vers  ${tier.next.name}  ·  ${formatMoney(Math.max(0,tier.next.min-data.balance))} restant`
    : `${tier.sym}  PALIER MAXIMUM ATTEINT  ${tier.sym}`;
  T(ctx,progLabel,RX+CNT_W/2,BAR_Y+BAR_H/2,12,"#FFF",{align:"center"});
  T(ctx,tier.name,     RX,          BAR_Y-14,11,theme.muted,{weight:"600"});
  T(ctx,tier.next?.name||"MAX",RX+CNT_W,BAR_Y-14,11,theme.muted,{align:"right",weight:"600"});

  // 9 — Grille stats 4 × 2
  const GRID_Y=BAR_Y+BAR_H+18;
  const COLS=4, GAP=10;
  const sW=Math.floor((CNT_W-GAP*(COLS-1))/COLS);
  const sH=78;
  const stats=[
    {sym:"◈",label:"Solde actuel",    val:formatMoney(data.balance)},
    {sym:"◉",label:"Rang global",     val:`#${data.globalRank}`},
    {sym:"◆",label:"Top",             val:`${data.topPercent}%`},
    {sym:"◇",label:"Palier",          val:tier.name},
    {sym:"▣",label:"Multiplicateur",  val:`${tier.mult}x`},
    {sym:"▲",label:"Prochain palier", val:tier.next?formatMoney(tier.next.min-data.balance):"MAX"},
    {sym:"◎",label:"Total membres",   val:`${data.totalUsers}`},
    {sym:"◑",label:"Bonus daily",     val:`${data.streak||0} j`},
  ];
  stats.forEach((s,i)=>{
    const col=i%COLS,row=Math.floor(i/COLS);
    CARD(ctx,RX+col*(sW+GAP),GRID_Y+row*(sH+GAP),sW,sH,s.sym,s.label,s.val,theme);
  });

  // 10 — Mini billets décoratifs (sous la grille)
  const NOTE_Y=GRID_Y+2*(sH+GAP)+8;
  if(NOTE_Y+44<CH-PAD-40){
    BANKNOTES(ctx,RX,NOTE_Y,data.balance,theme);
  }

  // 11 — Panneau rang/tier (droite)
  const RP_Y=BAL_Y-28;
  const RP_H=GRID_Y+2*(sH+GAP)-GAP-RP_Y;
  ctx.save();ctx.shadowColor=theme.primary+"55";ctx.shadowBlur=28;
  ctx.fillStyle=theme.card;rr(ctx,RNK_X,RP_Y,RNK_W,RP_H,20);ctx.fill();
  ctx.strokeStyle=theme.border;ctx.lineWidth=1.5;rr(ctx,RNK_X,RP_Y,RNK_W,RP_H,20);ctx.stroke();ctx.restore();

  T(ctx,"◈  CLASSEMENT",RNK_X+RNK_W/2,RP_Y+26,14,theme.muted,{align:"center",weight:"600"});
  GL(ctx,RNK_X+18,RP_Y+46,RNK_X+RNK_W-18,RP_Y+46,theme.border,1);

  // Grand rang numéro
  ctx.save();
  const rng=ctx.createLinearGradient(RNK_X,RP_Y+55,RNK_X+RNK_W,RP_Y+135);
  rng.addColorStop(0,theme.primary);rng.addColorStop(1,theme.gold);
  ctx.font="bold 80px BF, Arial";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.shadowColor=theme.glow;ctx.shadowBlur=32;ctx.fillStyle=rng;
  ctx.fillText(`#${data.globalRank}`,RNK_X+RNK_W/2,RP_Y+108);ctx.restore();

  GL(ctx,RNK_X+18,RP_Y+158,RNK_X+RNK_W-18,RP_Y+158,theme.border,1);

  // Détails panneau
  const rpData=[
    ["Palier",      `${tier.sym}  ${tier.name}`],
    ["Top",         `${data.topPercent}%`],
    ["Multiplicateur",`${tier.mult}x`],
    ["Membres",     `${data.totalUsers}`],
  ];
  rpData.forEach(([lbl,val],i)=>{
    const yy=RP_Y+178+i*38;
    T(ctx,lbl,   RNK_X+16,     yy,12,theme.muted,  {weight:"600"});
    T(ctx,val,   RNK_X+RNK_W-14,yy,14,theme.primary,{align:"right",glow:theme.glow});
  });

  // 12 — Pied de page
  const FT_Y=CH-PAD-26;
  GL(ctx,SEP+14,FT_Y-16,CW-PAD-12,FT_Y-16,theme.border,1);
  const now=moment().tz("Asia/Dhaka").format("DD/MM/YYYY  HH:mm");
  T(ctx,`◈  ${now}   ◆   Christus   ◈`,CW/2,FT_Y,14,theme.muted,{align:"center",weight:"600"});

  return canvas;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
  config: {
    name:        "balance",
    aliases:     ["bal","$","cash","solde"],
    version:     "10.0",
    author:      "Christus",
    countDown:   3,
    role:        0,
    description: { fr:"◈ Balance Sovereign — Carte de solde ultime, 10 themes, layout pixel-perfect." },
    category:    "economy",
    guide: {
      fr:
`◈  BALANCE SOVEREIGN

  bal / balance         — Votre carte de solde
  bal @mention          — Solde d un autre membre
  bal <uid>             — Par ID utilisateur
  bal <1-10>            — Choisir un theme

  bal daily             — Bonus quotidien
  bal t @mention <montant> — Transfert d argent
  bal top [page]        — Classement des riches
  bal rank              — Votre rang detaille
  bal themes            — Liste des themes

Taxes de transfert :
  ≤ $1,000   : 2%  |  ≤ $10,000  : 5%  |  ≤ $50,000 : 8%
  ≤ $100,000 : 10% |  ≤ $500,000 : 12% |  > $500,000 : 15%`,
    },
  },

  onStart: async function ({ message, event, args, usersData, api }) {
    const { senderID, mentions, messageReply, threadID } = event;
    const command = args[0]?.toLowerCase();

    // ── DAILY ──────────────────────────────────────────────────────────────────
    if (command === "daily") {
      const ud = await usersData.get(senderID);
      const now = Date.now();
      const lastDaily = ud.lastDaily || 0;
      const streak = ud.dailyStreak || 0;
      const hours = (now - lastDaily) / 3_600_000;
      if (hours < ECONOMY.daily.resetHours) {
        const left = Math.ceil(ECONOMY.daily.resetHours - hours);
        return message.reply(
          `◈  BONUS QUOTIDIEN\n${"─".repeat(24)}\n` +
          `◆  Deja reclamé aujourd hui !\n` +
          `◉  Prochain bonus dans : ${left}h\n` +
          `▣  Streak actuel : ${streak} jours`
        );
      }
      const base = ECONOMY.daily.base;
      const streakBonus = Math.min(streak * ECONOMY.daily.streakMult * base, base * 5);
      const total = Math.round(base + streakBonus);
      const newStreak = hours < ECONOMY.daily.resetHours * 2 ? streak + 1 : 1;
      await usersData.set(senderID, { money: (ud.money||0)+total, lastDaily: now, dailyStreak: newStreak });
      return message.reply(
        `◈  BONUS QUOTIDIEN RECU !\n${"─".repeat(24)}\n` +
        `◆  Bonus de base  : ${formatMoney(base)}\n` +
        `◉  Bonus streak   : ${formatMoney(streakBonus)}\n` +
        `▣  Total recu     : ${formatMoney(total)}\n` +
        `▲  Nouveau streak : ${newStreak} jour${newStreak>1?"s":""}\n` +
        `◈  Nouveau solde  : ${formatMoney((ud.money||0)+total)}`
      );
    }

    // ── RANK ───────────────────────────────────────────────────────────────────
    if (command === "rank") {
      const ud = await usersData.get(senderID);
      const balance = ud.money||0;
      const tier = getTier(balance);
      const all = await usersData.getAll();
      const sorted = all.sort((a,b)=>(b.money||0)-(a.money||0));
      const rank = sorted.findIndex(u=>u.userID===senderID)+1;
      return message.reply(
        `◈  RANG FINANCIER\n${"─".repeat(24)}\n` +
        `◆  Joueur     : ${ud.name||"Utilisateur"}\n` +
        `◉  Solde      : ${formatMoney(balance)}\n` +
        `▣  Palier     : ${tier.sym} ${tier.name}\n` +
        `▲  Classement : #${rank} sur ${sorted.length}\n` +
        `◇  Top        : ${(((sorted.length-rank+1)/sorted.length)*100).toFixed(1)}%\n` +
        `◎  Progress   : ${tier.prog.toFixed(1)}% vers ${tier.next?.name||"MAX"}\n` +
        `◈  Mult.      : ${tier.mult}x\n` +
        `◑  Nécessaire : ${tier.next?formatMoney(tier.next.min-balance):"N/A"}`
      );
    }

    // ── TOP ────────────────────────────────────────────────────────────────────
    if (command === "top") {
      const page = parseInt(args[1])||1;
      const PER = 10;
      const all = await usersData.getAll();
      const rich = all.filter(u=>u.money>0).sort((a,b)=>(b.money||0)-(a.money||0));
      const total = Math.ceil(rich.length/PER);
      const slice = rich.slice((page-1)*PER, page*PER);
      if (!slice.length) return message.reply("◆  Aucun utilisateur sur cette page.");
      const medals = ["[ I ]","[ II ]","[ III ]"];
      let txt = `◈  CLASSEMENT — Page ${page}/${total}\n${"─".repeat(28)}\n`;
      slice.forEach((u,i) => {
        const gr = (page-1)*PER+i+1;
        const tier = getTier(u.money||0);
        txt += `${medals[gr-1]||`#${gr}`}  ${u.name||"Inconnu"}\n`;
        txt += `   ${tier.sym} ${tier.name}  ·  ${formatMoney(u.money||0)}\n`;
      });
      txt += `\n◆  Votre position : #${rich.findIndex(u=>u.userID===senderID)+1}`;
      return message.reply(txt);
    }

    // ── TRANSFER ───────────────────────────────────────────────────────────────
    if (["transfer","send","pay","t","virement"].includes(command)) {
      let targetID = Object.keys(mentions)[0] || messageReply?.senderID || args[1];
      const amount = parseFloat(args.find(a=>!isNaN(parseFloat(a))&&parseFloat(a)>0));
      if (!targetID||isNaN(amount)) {
        return message.reply(
          `◈  TRANSFERT D ARGENT\n${"─".repeat(24)}\n` +
          `Usage : bal t @utilisateur montant\n\n` +
          `Taxes :\n` +
          ECONOMY.transfer.taxRates.map(r=>`  ≤ ${formatMoney(r.max)} : ${r.rate}%`).join("\n")
        );
      }
      if (targetID===senderID) return message.reply("◆  Vous ne pouvez pas vous envoyer de l argent.");
      if (amount<ECONOMY.transfer.min) return message.reply(`◆  Montant minimum : ${formatMoney(ECONOMY.transfer.min)}`);
      if (amount>ECONOMY.transfer.max) return message.reply(`◆  Montant maximum : ${formatMoney(ECONOMY.transfer.max)}`);
      const [sender,receiver] = await Promise.all([usersData.get(senderID),usersData.get(targetID)]);
      if (!receiver) return message.reply("◆  Destinataire introuvable.");
      const tax = calcTax(amount);
      if ((sender.money||0)<tax.total) {
        return message.reply(
          `◆  FONDS INSUFFISANTS\n${"─".repeat(24)}\n` +
          `◈  A envoyer  : ${formatMoney(amount)}\n` +
          `◉  Taxe (${tax.rate}%) : ${formatMoney(tax.tax)}\n` +
          `◆  Total      : ${formatMoney(tax.total)}\n` +
          `▣  Votre solde: ${formatMoney(sender.money||0)}\n` +
          `▲  Manque     : ${formatMoney(tax.total-(sender.money||0))}`
        );
      }
      await Promise.all([
        usersData.set(senderID, { money: (sender.money||0)-tax.total }),
        usersData.set(targetID, { money: (receiver.money||0)+amount }),
      ]);
      const [sName,rName] = await Promise.all([usersData.getName(senderID),usersData.getName(targetID)]);
      return message.reply(
        `◈  TRANSFERT REUSSI\n${"─".repeat(28)}\n` +
        `◆  ID : ${txID()}\n` +
        `◉  De : ${sName}\n` +
        `▣  Vers : ${rName}\n${"─".repeat(28)}\n` +
        `◈  Montant : ${formatMoney(amount)}\n` +
        `◉  Taxe (${tax.rate}%) : ${formatMoney(tax.tax)}\n` +
        `◆  Debité : ${formatMoney(tax.total)}\n${"─".repeat(28)}\n` +
        `▲  Solde envoyeur : ${formatMoney((sender.money||0)-tax.total)}\n` +
        `◎  Solde receveur : ${formatMoney((receiver.money||0)+amount)}\n` +
        `◑  Statut : Verifié et sécurisé`
      );
    }

    // ── THEMES ─────────────────────────────────────────────────────────────────
    if (command === "themes" || command === "theme") {
      const keys = Object.keys(THEMES);
      if (args[1]) {
        const n = parseInt(args[1]);
        const key = (!isNaN(n)&&n>=1&&n<=keys.length) ? keys[n-1] : args[1].toLowerCase();
        if (THEMES[key]) {
          const ud = await usersData.get(senderID);
          ud.balTheme = key;
          await usersData.set(senderID, ud);
          return message.reply(`◈  Theme défini : ${THEMES[key].sym}  ${THEMES[key].name}`);
        }
      }
      let txt = `◈  THEMES BALANCE SOVEREIGN\n${"─".repeat(28)}\n`;
      keys.forEach((k,i)=>{ txt+=`${i+1}. ${THEMES[k].sym}  ${THEMES[k].name}\n`; });
      txt += `\n◆  bal theme <numero> pour appliquer.`;
      return message.reply(txt);
    }

    // ── CARTE BALANCE (commande principale) ────────────────────────────────────
    if (!canvasAvailable) {
      let targetID2 = senderID;
      if (Object.keys(mentions).length>0) targetID2=Object.keys(mentions)[0];
      else if (messageReply) targetID2=messageReply.senderID;
      const ud = await usersData.get(targetID2);
      const balance = ud?.money||0;
      const tier = getTier(balance);
      const all = await usersData.getAll();
      const sorted = all.sort((a,b)=>(b.money||0)-(a.money||0));
      const rank = sorted.findIndex(u=>u.userID===targetID2)+1;
      return message.reply(
        `◈  SOLDE — ${ud?.name||"Utilisateur"}\n${"─".repeat(22)}\n` +
        `◆  Solde      : ${formatMoney(balance)}\n` +
        `◉  Palier     : ${tier.sym} ${tier.name}\n` +
        `▣  Classement : #${rank} sur ${sorted.length}\n` +
        `▲  Progression: ${tier.prog.toFixed(1)}% vers ${tier.next?.name||"MAX"}`
      );
    }

    // Cible
    let targetID = senderID;
    if (Object.keys(mentions).length>0) targetID=Object.keys(mentions)[0];
    else if (messageReply) targetID=messageReply.senderID;
    else if (args[0] && !isNaN(args[0]) && parseInt(args[0])>10000) targetID=args[0];

    // Thème
    const themeKeys = Object.keys(THEMES);
    const userDataRaw = await usersData.get(targetID===senderID?senderID:senderID);
    let themeKey = userDataRaw?.balTheme || themeKeys[Math.floor(Math.random()*themeKeys.length)];
    for (const a of args) {
      const n=parseInt(a);
      if (!isNaN(n)&&n>=1&&n<=themeKeys.length){themeKey=themeKeys[n-1];break;}
      if (themeKeys.includes(a.toLowerCase())){themeKey=a.toLowerCase();break;}
    }
    const theme = THEMES[themeKey];

    // Données
    const [userData, allUsers] = await Promise.all([
      usersData.get(targetID).catch(()=>null),
      usersData.getAll().catch(()=>[]),
    ]);
    if (!userData) return message.reply("◆  Utilisateur introuvable.");

    let userInfo = {};
    try { const fb = await api.getUserInfo(targetID); userInfo = fb[targetID]||{}; }
    catch (_) { userInfo = { name: userData.name||`User_${targetID}`, vanity: targetID }; }

    const sorted = [...allUsers].filter(u=>u?.money>=0).sort((a,b)=>(b.money||0)-(a.money||0));
    const globalRank = sorted.findIndex(u=>u.userID===targetID)+1 || sorted.length;
    const topPercent = (((sorted.length-globalRank+1)/sorted.length)*100).toFixed(1);
    const streak = userData.dailyStreak||0;

    const renderData = {
      uid:         targetID,
      name:        userInfo.name||userData.name||"Utilisateur",
      vanity:      userInfo.vanity||"",
      balance:     userData.money||0,
      globalRank,
      topPercent,
      totalUsers:  sorted.length,
      streak,
    };

    // Avatar via FB Graph
    const cacheDir = path.join(__dirname,"cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
    const avPath  = path.join(cacheDir,`bal_av_${Date.now()}.png`);
    const outPath = path.join(cacheDir,`bal_out_${Date.now()}.png`);
    let effectiveAv = null;
    try {
      const res = await axios.get(
        `https://graph.facebook.com/${targetID}/picture?width=500&height=500&access_token=${FB_TOKEN}`,
        {responseType:"arraybuffer",timeout:10000}
      );
      fs.writeFileSync(avPath,Buffer.from(res.data));
      effectiveAv = avPath;
    } catch(_){}

    const cvs = await buildCanvas(renderData,theme,effectiveAv);
    fs.writeFileSync(outPath,cvs.toBuffer("image/png"));
    try { if(fs.existsSync(avPath)) fs.unlinkSync(avPath); } catch(_){}

    const tier = getTier(renderData.balance);
    const isSelf = targetID===senderID;
    const body = [
      isSelf?"◈  VOTRE CARTE DE SOLDE":`◈  SOLDE DE ${renderData.name}`,
      "─".repeat(26),
      `◆  Solde      : ${formatMoney(renderData.balance)}`,
      `◉  Palier     : ${tier.sym} ${tier.name}`,
      `▣  Classement : #${globalRank}  (Top ${topPercent}%)`,
      `▲  Progression: ${tier.prog.toFixed(1)}% vers ${tier.next?.name||"MAX"}`,
      `◎  Theme      : ${theme.sym} ${theme.name}`,
    ].join("\n");

    await message.reply({ body, attachment: fs.createReadStream(outPath) });
    setTimeout(()=>{ try{if(fs.existsSync(outPath))fs.unlinkSync(outPath);}catch(_){} },30000);
  },
};
