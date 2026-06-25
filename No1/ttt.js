const { createCanvas } = require("canvas");
const Canvas = require("canvas");
const path = require("path");
const fs = require("fs");
const os = require("os");

let fonts;
try {
  fonts = require("../../func/font.js");
} catch {
  fonts = { bold: t => t, sansSerif: t => t, monospace: t => t };
}

Canvas.registerFont(path.join(__dirname, "assets/font/NotoSans-Bold.ttf"),     { family: "TTTFont", weight: "bold" });
Canvas.registerFont(path.join(__dirname, "assets/font/NotoSans-Regular.ttf"),  { family: "TTTFont", weight: "normal" });
Canvas.registerFont(path.join(__dirname, "assets/font/NotoSans-SemiBold.ttf"), { family: "TTTFont", weight: "600" });

// ─────────────────────────────────────────────
//  CONSTANTES
// ─────────────────────────────────────────────
const GAME_EXPIRE_TIME = 1000 * 60 * 20;
const BOT_DELAY        = 900;
const MARKS            = ["X", "O"];

// Mode etendu : plateau 5x5, aligner 4 pour gagner
const MODES = {
  classic: { size: 3, win: 3, label: "Classique 3x3" },
  extended:{ size: 5, win: 4, label: "Etendu 5x5 (aligner 4)" },
};

const activeGames = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────
//  CONFIG COMMANDE
// ─────────────────────────────────────────────
module.exports = {
  config: {
    name: "ttt",
    aliases: ["tictactoe", "tic"],
    version: "1.0",
    author: "Christus",
    countDown: 3,
    role: 0,
    description: {
      fr: "Morpion (TicTacToe) — plateau Canvas, bot IA minimax, 2 modes, paris."
    },
    category: "game",
    guide: {
      fr:
        `${fonts.sansSerif("MORPION ROYAL — TicTacToe")}\n\n` +
        `${fonts.bold("Modes de jeu :")}\n` +
        `• ${fonts.monospace("morpion bot")} : 1v1 contre le bot (plateau 3x3)\n` +
        `• ${fonts.monospace("morpion bot xl")} : 1v1 bot (plateau 5x5, aligner 4)\n` +
        `• ${fonts.monospace("morpion 1v1 @joueur")} : duel humain 3x3\n` +
        `• ${fonts.monospace("morpion 1v1 @joueur xl")} : duel humain 5x5\n\n` +
        `${fonts.bold("Paris :")}\n` +
        `• ${fonts.monospace("morpion bot 200")} : mise de 200$ contre le bot\n` +
        `• ${fonts.monospace("morpion 1v1 @joueur 500")} : mise de 500$ chacun\n\n` +
        `${fonts.bold("En jeu — jouer une case :")}\n` +
        `• Repondez le numero de la case (1-9 en 3x3, 1-25 en 5x5)\n` +
        `• Ou la position en format ligne-colonne : ${fonts.monospace("b2")}, ${fonts.monospace("c3")}, etc.\n\n` +
        `${fonts.bold("Gestion :")}\n` +
        `• ${fonts.monospace("morpion stop")} : terminer et rembourser\n` +
        `• ${fonts.monospace("morpion status")} : revoir le plateau\n\n` +
        `${fonts.bold("Regles :")}\n` +
        `• 3x3 : alignez 3 X ou O pour gagner.\n` +
        `• 5x5 : alignez 4 symboles pour gagner.\n` +
        `• Match nul si le plateau est plein sans gagnant.`
    }
  },

  onStart: async function ({ message, event, args, api, usersData, commandName }) {
    cleanupExpiredGames();
    const first = (args[0] || "").toLowerCase();

    if (!first || first === "help") return message.reply(this.config.guide.fr);

    if (first === "stop" || first === "end") {
      const ended = endGamesForThread(event.threadID, event.senderID, usersData);
      if (!ended) return message.reply(fonts.bold("Aucune partie de Morpion en cours pour vous ici."));
      return message.reply(fonts.bold(`${ended} partie(s) terminee(s). Paris rembourses.`));
    }

    if (first === "status") {
      for (const game of activeGames.values()) {
        if (game.threadID === event.threadID && game.players.some(p => p.id === event.senderID)) {
          await publishState(message, game, "Etat du plateau");
          return;
        }
      }
      return message.reply(fonts.bold("Aucune partie en cours pour vous ici."));
    }

    await handleStart({ message, event, args, api, usersData, commandName });
  },

  onReply: async function ({ message, event, Reply, api, usersData }) {
    cleanupExpiredGames();
    const game = activeGames.get(Reply.gameKey || Reply.threadID);
    if (!game || game.id !== Reply.gameID) return;

    if (game.replyMessageID && global.GoatBot?.onReply) {
      global.GoatBot.onReply.delete(game.replyMessageID);
    }

    const current = game.players[game.turnIndex];
    if (!current || current.bot) return;

    if (event.senderID !== current.id) {
      return message.reply({
        body: fonts.bold(`Ce n'est pas votre tour. C'est a ${current.name} (${current.mark}).`),
        mentions: [{ id: current.id, tag: current.name }]
      });
    }

    const input = (event.body || "").trim().toLowerCase();

    if (input === "stop" || input === "end") {
      await refundBets(game, usersData);
      endGame(game);
      return message.reply(fonts.bold("Partie terminee. Paris rembourses."));
    }

    const cell = parseInput(input, game.mode.size);
    if (cell === null) {
      await publishState(message, game,
        `Entree invalide. Jouez un numero (1-${game.mode.size ** 2}) ou une position (ex: b2).`
      );
      return;
    }
    if (game.board[cell] !== null) {
      await publishState(message, game, `Case ${cell + 1} deja occupee. Choisissez une autre case.`);
      return;
    }

    await playMove(message, game, current, cell, api, usersData);
  }
};

// ─────────────────────────────────────────────
//  DEMARRAGE
// ─────────────────────────────────────────────
async function handleStart({ message, event, args, api, usersData, commandName }) {
  const threadID  = event.threadID;
  const senderID  = event.senderID;
  const argStr    = args.join(" ").toLowerCase();

  // Mode XL (5x5)
  const isXL   = argStr.includes("xl") || argStr.includes("5x5");
  const mode   = isXL ? MODES.extended : MODES.classic;

  // Bot ou humain
  const isBotGame = args[0]?.toLowerCase() === "bot";

  // Mise
  const betArg = args.find(a => /^\d+$/.test(a));
  const bet     = betArg ? Math.max(1, parseInt(betArg, 10)) : 0;

  // Joueurs
  const mentionedIDs = Object.keys(event.mentions || {}).filter(id => id !== senderID);
  const humanName    = await getUserName(api, usersData, senderID);

  const players = [{ id: senderID, name: humanName, bot: false, mark: MARKS[0] }];

  if (isBotGame) {
    players.push({ id: `bot_${Date.now()}`, name: "Morpion IA", bot: true, mark: MARKS[1] });
  } else {
    if (!mentionedIDs.length) return message.reply(fonts.bold("Mentionnez un adversaire ou utilisez 'morpion bot'."));
    const oppName = await getUserName(api, usersData, mentionedIDs[0]);
    players.push({ id: mentionedIDs[0], name: oppName, bot: false, mark: MARKS[1] });
  }

  // Verifier et prelever la mise
  if (bet > 0) {
    for (const p of players.filter(p => !p.bot)) {
      const ud = await usersData.get(p.id);
      if ((ud?.money || 0) < bet) {
        return message.reply(fonts.bold(
          `${p.name} n'a pas assez d'argent !\nMise : $${bet} | Balance : $${ud?.money || 0}`
        ));
      }
    }
    for (const p of players.filter(p => !p.bot)) {
      const ud = await usersData.get(p.id);
      await usersData.set(p.id, { money: (ud.money || 0) - bet });
    }
  }

  const game = createGame(threadID, players, commandName, mode, bet, isBotGame);
  activeGames.set(game.key, game);

  const betInfo = bet > 0 ? ` | Mise : $${bet} chacun` : "";
  await publishState(message, game, `Morpion demarre ! ${mode.label}${betInfo}. ${players[0].name} (X) commence.`);
  await runBots(message, game, api, usersData);
}

// ─────────────────────────────────────────────
//  CREATION DE PARTIE
// ─────────────────────────────────────────────
function createGame(threadID, players, commandName, mode, bet, botGame) {
  const size  = mode.size;
  const key   = botGame ? `${threadID}:${players[0].id}` : threadID;
  return {
    id:         `${threadID}_${Date.now()}`,
    key, threadID, commandName, botGame,
    players,
    mode,
    board:      Array(size * size).fill(null),
    turnIndex:  0,
    moveCount:  0,
    log:        [],
    bet,
    pot:        bet * players.filter(p => !p.bot).length,
    winner:     null,
    draw:       false,
    winLine:    [],             // indices des cases gagnantes
    replyMessageID: null,
    startedAt:  Date.now(),
    updatedAt:  Date.now(),
  };
}

// ─────────────────────────────────────────────
//  JOUER UN COUP
// ─────────────────────────────────────────────
async function playMove(message, game, player, cell, api, usersData) {
  game.board[cell] = player.mark;
  game.moveCount++;
  game.log.unshift(`${player.name} (${player.mark}) joue la case ${cell + 1}.`);

  const winLine = checkWin(game.board, game.mode.size, game.mode.win);
  if (winLine) {
    game.winner  = player;
    game.winLine = winLine;
    await payoutWinner(game, usersData);
    const winMsg = buildEndMessage(game);
    endGame(game);
    await publishState(message, game, winMsg);
    return;
  }

  if (game.board.every(c => c !== null)) {
    game.draw = true;
    if (game.bet > 0) await refundBets(game, usersData);
    const drawMsg = buildEndMessage(game);
    endGame(game);
    await publishState(message, game, drawMsg);
    return;
  }

  game.turnIndex = (game.turnIndex + 1) % game.players.length;
  const next = game.players[game.turnIndex];
  await publishState(message, game, `${player.name} joue en ${cell + 1}. A ${next.name} (${next.mark}) !`);
  await runBots(message, game, api, usersData);
}

// ─────────────────────────────────────────────
//  BOT IA — MINIMAX
// ─────────────────────────────────────────────
async function runBots(message, game, api, usersData) {
  while (
    activeGames.get(game.key) === game &&
    game.players[game.turnIndex]?.bot &&
    !game.winner && !game.draw
  ) {
    await sleep(BOT_DELAY);
    const bot  = game.players[game.turnIndex];
    const cell = getBotMove(game);
    await playMove(message, game, bot, cell, api, usersData);
    return;
  }

  if (activeGames.get(game.key) === game && !game.winner && !game.draw) {
    const current = game.players[game.turnIndex];
    if (!current.bot) {
      const size = game.mode.size;
      await publishState(message, game,
        `A vous, ${current.name} (${current.mark}). Jouez un numero de case (1-${size * size}).`
      );
    }
  }
}

function getBotMove(game) {
  const size  = game.mode.size;
  const board = game.board;
  const bot   = game.players[game.turnIndex];
  const opp   = game.players[(game.turnIndex + 1) % 2];

  // En 5x5 : minimax trop lent, on utilise une heuristique
  if (size === 5) return heuristicMove(game, bot.mark, opp.mark);

  // 3x3 : minimax complet
  let bestScore = -Infinity, bestCell = -1;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;
    board[i] = bot.mark;
    const score = minimax(board, size, game.mode.win, 0, false, bot.mark, opp.mark, -Infinity, Infinity);
    board[i] = null;
    if (score > bestScore) { bestScore = score; bestCell = i; }
  }
  return bestCell;
}

function minimax(board, size, winLen, depth, isMax, botMark, oppMark, alpha, beta) {
  const line = checkWin(board, size, winLen);
  if (line) {
    const winner = board[line[0]];
    return winner === botMark ? 10 - depth : depth - 10;
  }
  if (board.every(c => c !== null)) return 0;
  if (depth >= 7) return 0; // Limite de profondeur

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== null) continue;
      board[i] = botMark;
      best = Math.max(best, minimax(board, size, winLen, depth + 1, false, botMark, oppMark, alpha, beta));
      board[i] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== null) continue;
      board[i] = oppMark;
      best = Math.min(best, minimax(board, size, winLen, depth + 1, true, botMark, oppMark, alpha, beta));
      board[i] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// Heuristique pour 5x5 : score chaque case libre
function heuristicMove(game, botMark, oppMark) {
  const board = game.board;
  const size  = game.mode.size;
  const win   = game.mode.win;
  let bestScore = -Infinity, bestCell = -1;

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== null) continue;

    // Tester si on gagne
    board[i] = botMark;
    if (checkWin(board, size, win)) { board[i] = null; return i; }
    board[i] = null;

    // Tester si on bloque l'adversaire
    board[i] = oppMark;
    if (checkWin(board, size, win)) { board[i] = null; bestCell = i; bestScore = 999; continue; }
    board[i] = null;

    // Score positionnel : centre > bords > coins
    const row = Math.floor(i / size), col = i % size;
    const center = (size - 1) / 2;
    const dist = Math.abs(row - center) + Math.abs(col - center);
    const pos  = (size * 2) - dist;

    // Score de sequence
    board[i] = botMark;
    const seq = scoreSequences(board, size, win, botMark);
    board[i] = null;

    const total = pos + seq * 3;
    if (total > bestScore) { bestScore = total; bestCell = i; }
  }

  // Fallback : case vide au centre puis aleatoire
  if (bestCell === -1) {
    const center = Math.floor(board.length / 2);
    if (board[center] === null) return center;
    const empties = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
    return empties[Math.floor(Math.random() * empties.length)];
  }
  return bestCell;
}

function scoreSequences(board, size, win, mark) {
  let score = 0;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const [dr, dc] of dirs) {
        let count = 0, open = 0;
        for (let k = 0; k < win; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) { open = -1; break; }
          const cell = board[nr * size + nc];
          if (cell === mark) count++;
          else if (cell === null) open++;
          else { open = -1; break; }
        }
        if (open >= 0) score += count * count;
      }
    }
  }
  return score;
}

// ─────────────────────────────────────────────
//  DETECTION DE VICTOIRE
// ─────────────────────────────────────────────
function checkWin(board, size, win) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const mark = board[r * size + c];
      if (!mark) continue;
      for (const [dr, dc] of dirs) {
        const line = [];
        for (let k = 0; k < win; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
          if (board[nr * size + nc] !== mark) break;
          line.push(nr * size + nc);
        }
        if (line.length === win) return line;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────
//  PARSE ENTREE JOUEUR
// ─────────────────────────────────────────────
function parseInput(input, size) {
  // Numero direct : "5", "12"
  const num = parseInt(input, 10);
  if (!isNaN(num) && num >= 1 && num <= size * size) return num - 1;

  // Format lettre+chiffre : "b2", "c3", "a1"
  const match = input.match(/^([a-e])([1-5])$/);
  if (match) {
    const row = match[1].charCodeAt(0) - "a".charCodeAt(0);
    const col = parseInt(match[2], 10) - 1;
    if (row < size && col < size) return row * size + col;
  }

  return null;
}

// ─────────────────────────────────────────────
//  MESSAGES DE FIN
// ─────────────────────────────────────────────
function buildEndMessage(game) {
  if (game.draw) {
    return `Match nul ! Le plateau est plein. Personne ne gagne.${game.bet > 0 ? " Paris rembourses." : ""}`;
  }
  const w = game.winner;
  let msg = `VICTOIRE ! ${w.name} (${w.mark}) remporte le Morpion en ${game.moveCount} coups !`;
  if (game.bet > 0 && !w.bot) msg += `\n+$${game.pot.toLocaleString()} remportes !`;
  return msg;
}

// ─────────────────────────────────────────────
//  PARIS / FIN DE PARTIE
// ─────────────────────────────────────────────
async function payoutWinner(game, usersData) {
  const winner = game.winner;
  if (!game.bet || !winner || winner.bot || !usersData) return;
  try {
    const ud = await usersData.get(winner.id);
    await usersData.set(winner.id, { money: (ud.money || 0) + game.pot });
  } catch (e) { console.error("[Morpion] Paiement:", e); }
}

async function refundBets(game, usersData) {
  if (!game.bet || !usersData) return;
  for (const p of game.players.filter(p => !p.bot)) {
    try {
      const ud = await usersData.get(p.id);
      await usersData.set(p.id, { money: (ud.money || 0) + game.bet });
    } catch (e) { console.error("[Morpion] Remboursement:", e); }
  }
}

function cleanupExpiredGames() {
  const now = Date.now();
  for (const game of activeGames.values()) {
    if (now - game.updatedAt > GAME_EXPIRE_TIME) endGame(game);
  }
}

function endGame(game) {
  activeGames.delete(game.key);
  if (game.replyMessageID && global.GoatBot?.onReply) {
    global.GoatBot.onReply.delete(game.replyMessageID);
  }
}

function endGamesForThread(threadID, senderID, usersData) {
  let count = 0;
  for (const game of [...activeGames.values()]) {
    if (game.threadID === threadID && game.players.some(p => p.id === senderID)) {
      refundBets(game, usersData);
      endGame(game);
      count++;
    }
  }
  return count;
}

async function getUserName(api, usersData, userID) {
  try {
    if (usersData?.getName) return await usersData.getName(userID);
    const info = await api.getUserInfo(userID);
    return info[userID]?.name || "Joueur";
  } catch { return "Joueur"; }
}

// ─────────────────────────────────────────────
//  PUBLICATION D'ETAT
// ─────────────────────────────────────────────
async function publishState(message, game, body) {
  game.updatedAt = Date.now();
  const current = game.players[game.turnIndex] || null;

  if (game.replyMessageID && global.GoatBot?.onReply) {
    global.GoatBot.onReply.delete(game.replyMessageID);
  }

  const tmpPath = path.join(os.tmpdir(), `ttt_${game.id}_${Date.now()}.png`);
  try {
    const canvas = renderGame(game, body);
    fs.writeFileSync(tmpPath, canvas.toBuffer("image/png"));
  } catch (err) {
    console.error("[Morpion] Canvas:", err);
    return message.reply(fonts.bold(body));
  }

  const details  = formatDetails(game, body);
  const mentions = current && !current.bot ? [{ id: current.id, tag: current.name }] : [];

  return new Promise(resolve => {
    message.reply({ body: details, attachment: fs.createReadStream(tmpPath), mentions }, (err, info) => {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      if (err) { console.error("[Morpion] Envoi:", err); resolve(); return; }
      game.replyMessageID = info.messageID;
      if (activeGames.get(game.key) === game && current && !current.bot && global.GoatBot?.onReply) {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: game.commandName,
          messageID:   info.messageID,
          author:      current.id,
          threadID:    game.threadID,
          gameKey:     game.key,
          gameID:      game.id,
        });
      }
      resolve();
    });
  });
}

function formatDetails(game, body) {
  const size    = game.mode.size;
  const elapsed = Math.floor((Date.now() - game.startedAt) / 60000);
  const current = game.players[game.turnIndex];
  const lines   = [];

  lines.push("MORPION ROYAL");
  lines.push(`${game.mode.label}  |  Tour ${game.moveCount}  |  ${elapsed}m`);
  if (game.bet > 0) lines.push(`Mise : $${game.bet} | Cagnotte : $${game.pot}`);
  lines.push("────────────────────────");

  // Plateau texte
  const colLabels = "ABCDE".slice(0, size);
  lines.push(`  ${[...colLabels].join("   ")}`);
  for (let r = 0; r < size; r++) {
    let row = `${r + 1} `;
    for (let c = 0; c < size; c++) {
      const cell = game.board[r * size + c];
      row += ` ${cell || (r * size + c + 1)}  `;
    }
    lines.push(row);
  }
  lines.push("────────────────────────");

  game.players.forEach((p, i) => {
    const arrow = i === game.turnIndex && !game.winner && !game.draw ? " << TON TOUR" : "";
    lines.push(`${p.mark}  ${p.name}${p.bot ? " [BOT]" : ""}${arrow}`);
  });

  lines.push("────────────────────────");
  if (!game.winner && !game.draw && current && !current.bot) {
    lines.push(`Jouez un numero (1-${size * size}) ou une position (ex: b2)`);
  }
  if (game.log.length > 0) {
    game.log.slice(0, 3).forEach(l => lines.push("  " + l.slice(0, 80)));
  }
  lines.push("────────────────────────");
  lines.push(body);
  return lines.join("\n");
}

// ─────────────────────────────────────────────
//  RENDU CANVAS
// ─────────────────────────────────────────────
function renderGame(game, banner) {
  const size   = game.mode.size;
  const CELL   = size === 3 ? 200 : 140;
  const BOARD_W = CELL * size;
  const BOARD_H = CELL * size;
  const PAD    = 60;
  const W      = BOARD_W + PAD * 2 + 20;
  const HEADER = 180;
  const FOOTER = 340;
  const H      = HEADER + BOARD_H + FOOTER + PAD;

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  drawBg(ctx, W, H);
  drawBorderGlow(ctx, W, H);
  drawHeader(ctx, game, W, HEADER);
  drawBoard(ctx, game, PAD, HEADER, CELL, size, BOARD_W, BOARD_H);
  drawPlayerCards(ctx, game, W, HEADER + BOARD_H + PAD + 20);
  drawLogStrip(ctx, game, W, H - 105);
  drawBannerStrip(ctx, banner, W, H - 68);

  return canvas;
}

function drawBg(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0,   "#0f0c1e");
  g.addColorStop(0.5, "#150f2a");
  g.addColorStop(1,   "#0a0814");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Points decoratifs
  ctx.save();
  ctx.globalAlpha = 0.035;
  for (let x = 25; x < W; x += 32) {
    for (let y = 25; y < H; y += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBorderGlow(ctx, W, H) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0,    "#7c3aed");
  g.addColorStop(0.33, "#4f46e5");
  g.addColorStop(0.66, "#7c3aed");
  g.addColorStop(1,    "#c026d3");
  ctx.strokeStyle = g;
  ctx.lineWidth   = 10;
  ctx.shadowColor = "#7c3aed";
  ctx.shadowBlur  = 28;
  roundRectPath(ctx, 7, 7, W - 14, H - 14, 34);
  ctx.stroke();
  ctx.lineWidth   = 2;
  ctx.strokeStyle = "#a78bfa44";
  ctx.shadowBlur  = 0;
  roundRectPath(ctx, 17, 17, W - 34, H - 34, 28);
  ctx.stroke();
  ctx.restore();
}

function drawHeader(ctx, game, W, HEADER) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 26, 0, HEADER);
  g.addColorStop(0, "#1e1a3a");
  g.addColorStop(1, "#120e26");
  roundRect(ctx, 32, 26, W - 64, HEADER - 36, 20, g, "#7c3aed44", 1.5);

  // Titre
  const tg = ctx.createLinearGradient(52, 52, W - 52, 110);
  tg.addColorStop(0,   "#a78bfa");
  tg.addColorStop(0.5, "#ffffff");
  tg.addColorStop(1,   "#c4b5fd");
  ctx.font      = "bold 52px TTTFont";
  ctx.fillStyle = tg;
  ctx.shadowColor = "#7c3aed";
  ctx.shadowBlur  = 20;
  ctx.fillText("MORPION ROYAL", 52, 100);
  ctx.shadowBlur  = 0;

  // Mode + stats
  const elapsed = Math.floor((Date.now() - game.startedAt) / 60000);
  ctx.font      = "bold 20px TTTFont";
  ctx.fillStyle = "#6d28d9";
  ctx.fillText(`${game.mode.label}  |  Tour ${game.moveCount}  |  ${elapsed} min`, 54, 136);

  // Cagnotte
  if (game.bet > 0) {
    ctx.font      = "bold 20px TTTFont";
    ctx.fillStyle = "#a78bfa";
    ctx.textAlign = "right";
    ctx.fillText(`Cagnotte : $${game.pot.toLocaleString()}`, W - 48, 136);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

function drawBoard(ctx, game, bx, by, CELL, size, BW, BH) {
  // Fond du plateau
  ctx.save();
  ctx.shadowColor   = "#7c3aed66";
  ctx.shadowBlur    = 40;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, bx - 10, by, BW + 20, BH, 18, "#1a1535", "#4c1d95", 3);
  ctx.restore();

  // Lignes de grille
  ctx.save();
  for (let i = 1; i < size; i++) {
    // Verticals
    ctx.beginPath();
    ctx.moveTo(bx + i * CELL, by + 8);
    ctx.lineTo(bx + i * CELL, by + BH - 8);
    const vg = ctx.createLinearGradient(0, by, 0, by + BH);
    vg.addColorStop(0,   "#7c3aed00");
    vg.addColorStop(0.2, "#7c3aedcc");
    vg.addColorStop(0.8, "#7c3aedcc");
    vg.addColorStop(1,   "#7c3aed00");
    ctx.strokeStyle = vg;
    ctx.lineWidth   = 3;
    ctx.shadowColor = "#7c3aed";
    ctx.shadowBlur  = 12;
    ctx.stroke();

    // Horizontals
    ctx.beginPath();
    ctx.moveTo(bx + 8,      by + i * CELL);
    ctx.lineTo(bx + BW - 8, by + i * CELL);
    const hg = ctx.createLinearGradient(bx, 0, bx + BW, 0);
    hg.addColorStop(0,   "#7c3aed00");
    hg.addColorStop(0.2, "#7c3aedcc");
    hg.addColorStop(0.8, "#7c3aedcc");
    hg.addColorStop(1,   "#7c3aed00");
    ctx.strokeStyle = hg;
    ctx.stroke();
  }
  ctx.restore();

  // Numeros des cases vides + marques
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx  = r * size + c;
      const cx   = bx + c * CELL + CELL / 2;
      const cy   = by + r * CELL + CELL / 2;
      const mark = game.board[idx];
      const isWin = game.winLine.includes(idx);

      if (!mark) {
        // Numero de case
        ctx.save();
        ctx.font         = `bold ${CELL * 0.22}px TTTFont`;
        ctx.fillStyle    = "#2d2550";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(idx + 1), cx, cy);
        ctx.restore();
      } else {
        drawMark(ctx, mark, cx, cy, CELL, isWin);
      }
    }
  }

  // Surligner la ligne gagnante
  if (game.winLine.length > 0) {
    const first = game.winLine[0];
    const last  = game.winLine[game.winLine.length - 1];
    const r1 = Math.floor(first / size), c1 = first % size;
    const r2 = Math.floor(last  / size), c2 = last  % size;
    const x1 = bx + c1 * CELL + CELL / 2;
    const y1 = by + r1 * CELL + CELL / 2;
    const x2 = bx + c2 * CELL + CELL / 2;
    const y2 = by + r2 * CELL + CELL / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth   = CELL * 0.1;
    ctx.lineCap     = "round";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur  = 30;
    ctx.globalAlpha = 0.75;
    ctx.stroke();
    ctx.restore();
  }
}

function drawMark(ctx, mark, cx, cy, CELL, isWin) {
  ctx.save();
  const r = CELL * 0.3;

  if (isWin) {
    ctx.shadowColor = mark === "X" ? "#f87171" : "#60a5fa";
    ctx.shadowBlur  = 40;
  }

  if (mark === "X") {
    // Croix
    const off = r * 0.72;
    const lw  = CELL * 0.1;
    const xColor = isWin ? "#fca5a5" : "#f87171";
    const xGrad  = ctx.createLinearGradient(cx - off, cy - off, cx + off, cy + off);
    xGrad.addColorStop(0,   isWin ? "#ff6b6b" : "#dc2626");
    xGrad.addColorStop(0.5, xColor);
    xGrad.addColorStop(1,   isWin ? "#ff6b6b" : "#dc2626");

    ctx.strokeStyle = xGrad;
    ctx.lineWidth   = lw;
    ctx.lineCap     = "round";

    ctx.beginPath();
    ctx.moveTo(cx - off, cy - off);
    ctx.lineTo(cx + off, cy + off);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + off, cy - off);
    ctx.lineTo(cx - off, cy + off);
    ctx.stroke();

  } else {
    // Cercle
    const oColor = isWin ? "#93c5fd" : "#3b82f6";
    const oGrad  = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    oGrad.addColorStop(0,   isWin ? "#60a5fa" : "#2563eb");
    oGrad.addColorStop(0.5, oColor);
    oGrad.addColorStop(1,   isWin ? "#60a5fa" : "#2563eb");

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = oGrad;
    ctx.lineWidth   = CELL * 0.1;
    ctx.stroke();

    // Point central
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = oColor;
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayerCards(ctx, game, W, startY) {
  const cardW = Math.floor((W - 80) / 2) - 8;
  const cardH = 120;

  game.players.forEach((p, i) => {
    const cx       = 36 + i * (cardW + 16);
    const isCurrent = i === game.turnIndex && !game.winner && !game.draw;
    const markColor = p.mark === "X" ? "#f87171" : "#60a5fa";

    ctx.save();
    if (isCurrent) { ctx.shadowColor = markColor; ctx.shadowBlur = 24; }

    const bg = ctx.createLinearGradient(cx, startY, cx + cardW, startY + cardH);
    bg.addColorStop(0, isCurrent ? "#1f1535" : "#120e24");
    bg.addColorStop(1, "#0a0814");
    roundRect(ctx, cx, startY, cardW, cardH, 16, bg, isCurrent ? markColor : "#2d1f4e", isCurrent ? 3 : 1.5);

    // Barre laterale couleur marque
    ctx.fillStyle = markColor;
    ctx.fillRect(cx, startY, 6, cardH);

    ctx.shadowBlur = 0;

    // Grande marque
    ctx.font         = `bold 54px TTTFont`;
    ctx.fillStyle    = markColor;
    ctx.textAlign    = "left";
    ctx.textBaseline = "middle";
    ctx.shadowColor  = markColor;
    ctx.shadowBlur   = isCurrent ? 18 : 0;
    ctx.fillText(p.mark, cx + 22, startY + cardH / 2);
    ctx.shadowBlur = 0;

    // Nom
    ctx.font         = "bold 22px TTTFont";
    ctx.fillStyle    = isCurrent ? "#f1f5f9" : "#94a3b8";
    ctx.textAlign    = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
      `${p.name.slice(0, 18)}${p.name.length > 18 ? "..." : ""}${p.bot ? " [BOT]" : ""}`,
      cx + 68, startY + 18
    );

    // Statut
    ctx.font      = "bold 18px TTTFont";
    if (game.winner === p) {
      ctx.fillStyle = "#fbbf24";
      ctx.fillText("GAGNANT !", cx + 68, startY + 52);
    } else if (isCurrent) {
      ctx.fillStyle = markColor;
      ctx.fillText("TON TOUR >>", cx + 68, startY + 52);
    } else if (game.draw) {
      ctx.fillStyle = "#6b7280";
      ctx.fillText("Match nul", cx + 68, startY + 52);
    } else {
      ctx.fillStyle = "#4b5563";
      ctx.fillText("En attente...", cx + 68, startY + 52);
    }

    // Mise
    if (game.bet > 0 && !p.bot) {
      ctx.font      = "16px TTTFont";
      ctx.fillStyle = "#6d28d9";
      ctx.fillText(`Mise : $${game.bet}`, cx + 68, startY + 82);
    }
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  });
}

function drawLogStrip(ctx, game, W, y) {
  ctx.save();
  roundRect(ctx, 32, y, W - 64, 80, 12, "#0d0b1acc", "#1e1b3a", 1.5);
  ctx.font      = "bold 15px TTTFont";
  ctx.fillStyle = "#4c1d95";
  ctx.fillText("JOURNAL", 52, y + 20);
  ctx.font      = "17px TTTFont";
  game.log.slice(0, 3).forEach((l, i) => {
    ctx.fillStyle = i === 0 ? "#c4b5fd" : "#4b5563";
    ctx.fillText(("  " + l.replace(/[^\x20-\x7E]/g, "")).slice(0, 80), 50, y + 38 + i * 18);
  });
  ctx.restore();
}

function drawBannerStrip(ctx, text, W, y) {
  ctx.save();
  const g = ctx.createLinearGradient(32, y, W - 32, y);
  g.addColorStop(0,   "#1e1a3a");
  g.addColorStop(0.5, "#2d1f4e");
  g.addColorStop(1,   "#1e1a3a");
  roundRect(ctx, 32, y, W - 64, 54, 14, g, "#7c3aed", 2);
  ctx.font         = "bold 22px TTTFont";
  ctx.fillStyle    = "#c4b5fd";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor  = "#7c3aed";
  ctx.shadowBlur   = 14;
  ctx.fillText(
    text.replace(/[^\x20-\x7E]/g, "").trim().slice(0, 80),
    W / 2, y + 27
  );
  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowBlur   = 0;
  ctx.restore();
}

// ─────────────────────────────────────────────
//  UTILITAIRES CANVAS
// ─────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r, fill, stroke, lw) {
  roundRectPath(ctx, x, y, w, h, r);
  if (fill)         { ctx.fillStyle   = fill;   ctx.fill();   }
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
