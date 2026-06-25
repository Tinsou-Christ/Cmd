module.exports = {
	config: {
		name: "count",
		version: "3.0",
		author: "Christus",
		countDown: 10,
		role: 0,
		description: {
			fr: "◈ Affiche le classement des messages en image (depuis l arrivée du bot dans le groupe) — 20 thèmes.",
			vi: "Xem bảng xếp hạng tin nhắn dưới dạng ảnh (từ lúc bot vào nhóm) — 20 chủ đề.",
			en: "View the message count leaderboard as an image (since the bot joined the group) — 20 themes."
		},
		category: "box chat",
		guide: {
			fr: "   {pn}: Affiche votre carte d activité."
				+ "\n   {pn} @tag: Affiche la carte d activité de la personne taguée."
				+ "\n   {pn} all: Affiche le classement de tous les membres."
				+ "\n   {pn} theme <1-20>: Choisir un thème d affichage."
				+ "\n   {pn} themes: Voir la liste des thèmes.",
			vi: "   {pn}: Xem thẻ hoạt động của bạn."
				+ "\n   {pn} @tag: Xem thẻ hoạt động của người được tag."
				+ "\n   {pn} all: Xem bảng xếp hạng của tất cả thành viên."
				+ "\n   {pn} theme <1-20>: Chọn chủ đề hiển thị."
				+ "\n   {pn} themes: Xem danh sách chủ đề.",
			en: "   {pn}: View your activity card."
				+ "\n   {pn} @tag: View the activity card of tagged users."
				+ "\n   {pn} all: View the leaderboard of all members."
				+ "\n   {pn} theme <1-20>: Choose a display theme."
				+ "\n   {pn} themes: List available themes."
		},
		envConfig: {
			"ACCESS_TOKEN": "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662"
		}
	},

	langs: {
		fr: {
			invalidPage: "Numéro de page invalide.",
			leaderboardTitle: "CLASSEMENT D ACTIVITÉ DU GROUPE",
			userCardTitle: "CARTE D ACTIVITÉ",
			page: "Page %1/%2",
			reply: "Répondez à ce message avec un numéro de page pour voir la suite.",
			totalMessages: "Total Messages",
			serverRank: "Rang Serveur",
			dailyActivity: "Activité des 7 Derniers Jours",
			messageBreakdown: "Répartition des Messages",
			busiestDay: "JOUR LE PLUS ACTIF",
			text: "Texte",
			sticker: "Autocollant",
			media: "Média",
			fallbackName: "Utilisateur Facebook",
			themeList: "LISTE DES THÈMES",
			themeSet: "Thème défini sur",
			themeInvalid: "Thème invalide. Utilisez : count themes"
		},
		vi: {
			invalidPage: "Số trang không hợp lệ.",
			leaderboardTitle: "BẢNG XẾP HẠNG HOẠT ĐỘNG NHÓM",
			userCardTitle: "THẺ HOẠT ĐỘNG",
			page: "Trang %1/%2",
			reply: "Phản hồi tin nhắn này kèm số trang để xem tiếp.",
			totalMessages: "Tổng Tin Nhắn",
			serverRank: "Hạng Server",
			dailyActivity: "Hoạt Động 7 Ngày Qua",
			messageBreakdown: "Phân Tích Tin Nhắn",
			busiestDay: "NGÀY BẬN RỘN NHẤT",
			text: "Văn Bản",
			sticker: "Nhãn Dán",
			media: "Tệp",
			fallbackName: "Người dùng Facebook",
			themeList: "DANH SÁCH CHỦ ĐỀ",
			themeSet: "Đã đặt chủ đề",
			themeInvalid: "Chủ đề không hợp lệ. Dùng: count themes"
		},
		en: {
			invalidPage: "Invalid page number.",
			leaderboardTitle: "GROUP ACTIVITY LEADERBOARD",
			userCardTitle: "ACTIVITY CARD",
			page: "Page %1/%2",
			reply: "Reply to this message with a page number to see more.",
			totalMessages: "Total Messages",
			serverRank: "Server Rank",
			dailyActivity: "Last 7 Days Activity",
			messageBreakdown: "Message Breakdown",
			busiestDay: "BUSIEST DAY",
			text: "Text",
			sticker: "Sticker",
			media: "Media",
			fallbackName: "Facebook User",
			themeList: "THEME LIST",
			themeSet: "Theme set to",
			themeInvalid: "Invalid theme. Use: count themes"
		}
	},

	onLoad: async function () {
		const { resolve } = require("path");
		const { existsSync, mkdirSync } = require("fs-extra");
		const { registerFont } = require("canvas");

		const assetsPath = resolve(__dirname, "assets", "count");
		if (!existsSync(assetsPath)) mkdirSync(assetsPath, { recursive: true });

		try {
			registerFont(resolve(assetsPath, "font.ttf"), { family: "BeVietnamPro" });
		} catch (e) {
			console.log("Could not load custom font for 'count' command, using sans-serif.");
		}
	},

	onChat: async function ({ event, threadsData, usersData }) {
		const { threadID, senderID } = event;
		const { resolve } = require("path");
		const { readJsonSync, writeJsonSync, ensureFileSync } = require("fs-extra");
		const moment = require("moment-timezone");

		try {
			const members = await threadsData.get(threadID, "members");
			const findMember = members.find(user => user.userID == senderID);
			if (!findMember) {
				members.push({
					userID: senderID,
					name: await usersData.getName(senderID),
					nickname: null,
					inGroup: true,
					count: 1
				});
			} else {
				findMember.count = (findMember.count || 0) + 1;
			}
			await threadsData.set(threadID, members, "members");
		} catch (err) {
			console.error("Failed to update compatible count data:", err);
		}

		const dataPath = resolve(__dirname, "cache", "count_activity.json");
		ensureFileSync(dataPath);

		let activityData = {};
		try {
			activityData = readJsonSync(dataPath);
		} catch { /* File is empty or corrupted */ }

		if (!activityData[threadID]) activityData[threadID] = {};
		if (!activityData[threadID][senderID]) {
			activityData[threadID][senderID] = {
				total: 0,
				types: { text: 0, sticker: 0, media: 0 },
				daily: {}
			};
		}

		const user = activityData[threadID][senderID];
		const today = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");

		user.total = (user.total || 0) + 1;
		user.daily[today] = (user.daily[today] || 0) + 1;

		if (event.attachments.some(att => att.type === 'sticker')) {
			user.types.sticker = (user.types.sticker || 0) + 1;
		} else if (event.attachments.length > 0) {
			user.types.media = (user.types.media || 0) + 1;
		} else {
			user.types.text = (user.types.text || 0) + 1;
		}

		const sortedDays = Object.keys(user.daily).sort((a, b) => new Date(b) - new Date(a));
		if (sortedDays.length > 7) {
			for (let i = 7; i < sortedDays.length; i++) delete user.daily[sortedDays[i]];
		}

		writeJsonSync(dataPath, activityData, { spaces: 2 });
	},

	onStart: async function ({ args, threadsData, message, event, api, getLang, envCommands, usersData }) {
		const { Canvas, loadImage } = require("canvas");
		const { resolve } = require("path");
		const { createWriteStream, readJsonSync, ensureFileSync } = require("fs-extra");
		const axios = require("axios");
		const moment = require("moment-timezone");
		const { threadID, senderID, mentions } = event;

		const ACCESS_TOKEN = envCommands.count.ACCESS_TOKEN;

		// ═══════════════════════════════════════════════════════════════════════
		//  20 THÈMES — chacun pilote la galaxie de fond + les couleurs UI
		// ═══════════════════════════════════════════════════════════════════════
		const THEMES = [
	{ name: "Inferno", primary: "#FF4500", secondary: "#FFB37A", bg1: "#090401", bg2: "#17110D", neb1: "255,69,0", neb2: "255,140,0", neb3: "255,200,100" },
	{ name: "Cyber Cyan", primary: "#00FFFF", secondary: "#7AFFFF", bg1: "#010409", bg2: "#0D1117", neb1: "0,200,255", neb2: "0,255,200", neb3: "150,255,255" },
	{ name: "Solar Flash", primary: "#F8F32B", secondary: "#FFF9A0", bg1: "#040109", bg2: "#170D11", neb1: "248,243,43", neb2: "255,200,0", neb3: "255,255,150" },
	{ name: "Magenta Pulse", primary: "#FF00FF", secondary: "#FF7AFF", bg1: "#090109", bg2: "#110D17", neb1: "255,0,255", neb2: "200,0,200", neb3: "255,150,255" },
	{ name: "Emerald Code", primary: "#00FF00", secondary: "#7AFF7A", bg1: "#010901", bg2: "#0D170D", neb1: "0,255,0", neb2: "0,200,80", neb3: "150,255,150" },
	{ name: "Royal Violet", primary: "#9B59FF", secondary: "#C9A8FF", bg1: "#080212", bg2: "#15091F", neb1: "155,89,255", neb2: "180,60,255", neb3: "200,160,255" },
	{ name: "Crimson Ember", primary: "#FF2040", secondary: "#FF8FA0", bg1: "#0E0203", bg2: "#1A050A", neb1: "255,32,64", neb2: "255,80,0", neb3: "255,160,180" },
	{ name: "Frost Azure", primary: "#00BFFF", secondary: "#A0E8FF", bg1: "#010A14", bg2: "#051826", neb1: "0,191,255", neb2: "0,255,220", neb3: "150,230,255" },
	{ name: "Golden Dynasty", primary: "#FFD700", secondary: "#FFEFA0", bg1: "#120E00", bg2: "#221A00", neb1: "255,215,0", neb2: "255,150,0", neb3: "255,240,180" },
	{ name: "Toxic Lime", primary: "#CCFF00", secondary: "#E8FF80", bg1: "#0A0F00", bg2: "#141F00", neb1: "204,255,0", neb2: "150,255,50", neb3: "230,255,150" },
	{ name: "Deep Ocean", primary: "#0080FF", secondary: "#80C0FF", bg1: "#000814", bg2: "#001428", neb1: "0,128,255", neb2: "0,200,255", neb3: "150,200,255" },
	{ name: "Phantom Rose", primary: "#FF66B2", secondary: "#FFC0DD", bg1: "#160210", bg2: "#260420", neb1: "255,102,178", neb2: "255,0,150", neb3: "255,200,220" },
	{ name: "Obsidian Gold", primary: "#FFB300", secondary: "#FFE5A0", bg1: "#0A0805", bg2: "#15100A", neb1: "255,179,0", neb2: "255,140,0", neb3: "255,220,150" },
	{ name: "Plasma Teal", primary: "#00FFB3", secondary: "#80FFE0", bg1: "#000F0C", bg2: "#001E18", neb1: "0,255,179", neb2: "0,200,255", neb3: "150,255,230" },
	{ name: "Blood Moon", primary: "#CC0000", secondary: "#FF8080", bg1: "#0E0000", bg2: "#1C0505", neb1: "204,0,0", neb2: "255,60,0", neb3: "255,160,160" },
	{ name: "Quantum Indigo", primary: "#5050FF", secondary: "#A0A0FF", bg1: "#040420", bg2: "#0A0A38", neb1: "80,80,255", neb2: "150,50,255", neb3: "180,180,255" },
	{ name: "Sunset Coral", primary: "#FF6F61", secondary: "#FFB3A8", bg1: "#150705", bg2: "#260D0A", neb1: "255,111,97", neb2: "255,170,0", neb3: "255,200,190" },
	{ name: "Mint Aurora", primary: "#3FFFA8", secondary: "#A0FFD8", bg1: "#001408", bg2: "#002814", neb1: "63,255,168", neb2: "0,255,220", neb3: "180,255,220" },
	{ name: "Voidwalker", primary: "#A800FF", secondary: "#D880FF", bg1: "#0C0014", bg2: "#180028", neb1: "168,0,255", neb2: "255,0,180", neb3: "220,150,255" },
	{ name: "Amber Vintage", primary: "#FFA500", secondary: "#FFD9A0", bg1: "#110A00", bg2: "#221400", neb1: "255,165,0", neb2: "255,80,0", neb3: "255,220,170" },
];

		// ─── Sélection / persistance du thème ────────────────────────────────────
		const cmd = args[0]?.toLowerCase();

		if (cmd === "themes" || cmd === "theme-list") {
			let txt = `◈  ${getLang("themeList")}\n${"─".repeat(26)}\n`;
			THEMES.forEach((t, i) => { txt += `${i + 1}. ◆ ${t.name}\n`; });
			txt += `\n◈  count theme <numéro / number>`;
			return message.reply(txt);
		}
		if (cmd === "theme") {
			const n = parseInt(args[1]);
			if (!isNaN(n) && n >= 1 && n <= THEMES.length) {
				const ud = await usersData.get(senderID);
				ud.countTheme = n - 1;
				await usersData.set(senderID, ud);
				return message.reply(`◈  ${getLang("themeSet")} : ${THEMES[n - 1].name}`);
			}
			return message.reply(`◆  ${getLang("themeInvalid")}`);
		}

		const senderUD = await usersData.get(senderID).catch(() => ({}));
		let themeIndex = (typeof senderUD?.countTheme === "number" && THEMES[senderUD.countTheme])
			? senderUD.countTheme
			: Math.floor(Math.random() * THEMES.length);
		const theme = THEMES[themeIndex];

		// ═══════════════════════════════════════════════════════════════════════
		//  FOND GALAXIE — paramétré par le thème actif
		// ═══════════════════════════════════════════════════════════════════════
		function drawGalaxyBackground(ctx, W, H, t) {
			// 1) Base
			const spaceGrad = ctx.createLinearGradient(0, 0, 0, H);
			spaceGrad.addColorStop(0, t.bg1);
			spaceGrad.addColorStop(0.5, t.bg2);
			spaceGrad.addColorStop(1, t.bg1);
			ctx.fillStyle = spaceGrad;
			ctx.fillRect(0, 0, W, H);

			function drawSparkle(kx, ky, size, color) {
				ctx.save();
				ctx.translate(kx, ky);
				ctx.beginPath();
				ctx.fillStyle = color;
				ctx.shadowColor = color;
				ctx.shadowBlur = size * 2;
				ctx.moveTo(0, -size);
				ctx.quadraticCurveTo(size / 4, -size / 4, size, 0);
				ctx.quadraticCurveTo(size / 4, size / 4, 0, size);
				ctx.quadraticCurveTo(-size / 4, size / 4, -size, 0);
				ctx.quadraticCurveTo(-size / 4, -size / 4, 0, -size);
				ctx.fill();
				ctx.restore();
			}

			// 2) Nébuleuses (couleurs du thème)
			ctx.save();
			ctx.globalCompositeOperation = "lighter";
			const nebula1 = ctx.createRadialGradient(W * 0.2, H * 0.3, 0, W * 0.2, H * 0.3, 700);
			nebula1.addColorStop(0, `rgba(${t.neb1}, 0.15)`);
			nebula1.addColorStop(1, "transparent");
			ctx.fillStyle = nebula1; ctx.fillRect(0, 0, W, H);

			const nebula2 = ctx.createRadialGradient(W * 0.8, H * 0.7, 0, W * 0.8, H * 0.7, 600);
			nebula2.addColorStop(0, `rgba(${t.neb2}, 0.12)`);
			nebula2.addColorStop(1, "transparent");
			ctx.fillStyle = nebula2; ctx.fillRect(0, 0, W, H);

			const nebula3 = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 800);
			nebula3.addColorStop(0, `rgba(${t.neb3}, 0.08)`);
			nebula3.addColorStop(1, "transparent");
			ctx.fillStyle = nebula3; ctx.fillRect(0, 0, W, H);
			ctx.restore();

			// 3) Petites étoiles blanches (seedées pour reproductibilité)
			ctx.save();
			const seed = (s) => () => { s = Math.sin(s) * 10000; return s - Math.floor(s); };
			const starRnd = seed(12345);
			for (let i = 0; i < 1500; i++) {
				const x = starRnd() * W, y = starRnd() * H;
				const radius = starRnd() * 1.5, alpha = starRnd() * 0.8 + 0.2;
				ctx.beginPath(); ctx.globalAlpha = alpha;
				ctx.fillStyle = (starRnd() > 0.9) ? "#aaddff" : "#ffffff";
				ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
			}
			ctx.restore();

			// 4) Grandes étoiles scintillantes (couleur primaire/secondaire du thème)
			ctx.save();
			ctx.globalCompositeOperation = "lighter";
			for (let i = 0; i < 60; i++) {
				const x = starRnd() * W, y = starRnd() * H;
				const sizeBoost = (Math.abs(x - W / 2) < 300 && Math.abs(y - H / 2) < 300) ? 2 : 0;
				const size = starRnd() * 4 + 2 + sizeBoost;
				let color = "#ffffff";
				if (i % 3 === 0) color = t.primary;
				if (i % 3 === 1) color = t.secondary;
				drawSparkle(x, y, size, color);
			}
			ctx.restore();

			// 5) Glow doux (couleurs thème)
			const g1 = ctx.createRadialGradient(W * 0.15, H * 0.2, 0, W * 0.15, H * 0.2, 600);
			g1.addColorStop(0, `rgba(${t.neb1}, 0.08)`); g1.addColorStop(1, `rgba(${t.neb1}, 0)`);
			ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

			const g2 = ctx.createRadialGradient(W * 0.9, H * 0.85, 0, W * 0.9, H * 0.85, 600);
			g2.addColorStop(0, `rgba(${t.neb2}, 0.06)`); g2.addColorStop(1, `rgba(${t.neb2}, 0)`);
			ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

			// 6) Vignette
			ctx.globalCompositeOperation = "multiply";
			const vignette = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) / 1.1);
			vignette.addColorStop(0, "rgba(0,0,0,0)");
			vignette.addColorStop(1, "rgba(0,0,0,0.6)");
			ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
			ctx.globalCompositeOperation = "source-over";
		}

		// ═══════════════════════════════════════════════════════════════════════
		//  HELPERS
		// ═══════════════════════════════════════════════════════════════════════
		const threadData = await threadsData.get(threadID);
		const dataPath = resolve(__dirname, "cache", "count_activity.json");
		ensureFileSync(dataPath);
		let activityData = {};
		try { activityData = readJsonSync(dataPath)[threadID] || {}; } catch { /* empty */ }

		const usersInGroup = (await api.getThreadInfo(threadID)).participantIDs;
		let combinedData = [];

		for (const user of threadData.members) {
			if (!usersInGroup.includes(user.userID)) continue;
			const activity = activityData[user.userID] || {
				total: user.count || 0,
				types: { text: 0, sticker: 0, media: 0 },
				daily: {}
			};
			combinedData.push({
				uid: user.userID,
				name: user.name || getLang("fallbackName"),
				count: user.count || 0,
				activity
			});
		}
		combinedData.sort((a, b) => b.count - a.count);
		combinedData.forEach((user, index) => user.rank = index + 1);

		const getAvatar = async (uid, name) => {
			try {
				const url = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${ACCESS_TOKEN}`;
				const response = await axios.get(url, { responseType: 'arraybuffer' });
				return await loadImage(response.data);
			} catch (error) {
				const canvas = new Canvas(512, 512);
				const ctx = canvas.getContext('2d');
				const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
				const bgColor = colors[parseInt(uid) % colors.length];
				ctx.fillStyle = bgColor;
				ctx.fillRect(0, 0, 512, 512);
				ctx.fillStyle = '#FFFFFF';
				ctx.font = '256px sans-serif';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText((name || "?").charAt(0).toUpperCase(), 256, 256);
				return await loadImage(canvas.toBuffer());
			}
		};
		const drawGlowingText = (ctx, text, x, y, color, size, blur = 15) => {
			ctx.font = `bold ${size}px "BeVietnamPro", "sans-serif"`;
			ctx.shadowColor = color;
			ctx.shadowBlur = blur;
			ctx.fillStyle = color;
			ctx.fillText(text, x, y);
			ctx.shadowBlur = 0;
		};
		const fitText = (ctx, text, maxWidth) => {
			let currentText = text;
			if (ctx.measureText(currentText).width > maxWidth) {
				while (ctx.measureText(currentText + '...').width > maxWidth && currentText.length > 1) {
					currentText = currentText.slice(0, -1);
				}
				return currentText + '...';
			}
			return currentText;
		};
		const drawCircularAvatar = (ctx, avatar, x, y, radius) => {
			ctx.save();
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.clip();
			ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2);
			ctx.restore();
		};

		// ═══════════════════════════════════════════════════════════════════════
		//  LEADERBOARD — Canvas 1200 × 1700, layout pixel-perfect
		// ═══════════════════════════════════════════════════════════════════════
		if (args[0]?.toLowerCase() === 'all') {
			const usersPerPage = 10;
			const leaderboardUsers = combinedData.filter(u => u.rank > 3);
			const totalPages = Math.ceil(leaderboardUsers.length / usersPerPage) || 1;
			let page = parseInt(args[1]) || 1;
			if (page < 1 || page > totalPages) page = 1;

			const startIndex = (page - 1) * usersPerPage;
			const pageUsers = leaderboardUsers.slice(startIndex, startIndex + usersPerPage);

			const LB_W = 1200, LB_H = 1700;
			const canvas = new Canvas(LB_W, LB_H);
			const ctx = canvas.getContext('2d');

			drawGalaxyBackground(ctx, LB_W, LB_H, theme);

			ctx.textAlign = 'center';
			drawGlowingText(ctx, getLang("leaderboardTitle"), 600, 95, theme.primary, 56);
			// Sous-titre thème actif
			ctx.font = `normal 20px "BeVietnamPro", "sans-serif"`;
			ctx.fillStyle = theme.secondary;
			ctx.fillText(`◈  ${theme.name}  ◈`, 600, 135);

			// ── PODIUM TOP 3 ──────────────────────────────────────────────────────
			const top3 = combinedData.slice(0, 3);
			const podColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
			const podPositions = [
				{ x: 600, y: 320, r: 95 },
				{ x: 260, y: 345, r: 75 },
				{ x: 940, y: 345, r: 75 },
			];
			const rankOrder = [1, 0, 2];

			for (const i of rankOrder) {
				const user = top3[i];
				if (!user) continue;
				const pos = podPositions[i];
				ctx.strokeStyle = podColors[i];
				ctx.lineWidth = 5;
				ctx.shadowColor = podColors[i];
				ctx.shadowBlur = 20;
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, pos.r + 5, 0, Math.PI * 2);
				ctx.stroke();
				ctx.shadowBlur = 0;

				const avatar = await getAvatar(user.uid, user.name);
				drawCircularAvatar(ctx, avatar, pos.x, pos.y, pos.r);

				ctx.textAlign = 'center';
				ctx.font = `bold ${Math.round(pos.r * 0.3)}px "BeVietnamPro", "sans-serif"`;
				ctx.fillStyle = '#FFFFFF';
				ctx.fillText(fitText(ctx, user.name, pos.r * 2.3), pos.x, pos.y + pos.r + 40);

				ctx.font = `normal ${Math.round(pos.r * 0.24)}px "BeVietnamPro", "sans-serif"`;
				ctx.fillStyle = theme.secondary;
				ctx.fillText(`${user.count} msgs`, pos.x, pos.y + pos.r + 72);

				ctx.fillStyle = podColors[i];
				ctx.beginPath();
				ctx.arc(pos.x, pos.y - pos.r + 8, 25, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = '#000000';
				ctx.font = `bold 28px "BeVietnamPro", "sans-serif"`;
				ctx.fillText(`#${user.rank}`, pos.x, pos.y - pos.r + 18);
			}

			// ── SÉPARATEUR ────────────────────────────────────────────────────────
			const SEP_Y = 500;
			ctx.save();
			const sepGrad = ctx.createLinearGradient(60, SEP_Y, 1140, SEP_Y);
			sepGrad.addColorStop(0, "transparent");
			sepGrad.addColorStop(0.5, theme.primary + "80");
			sepGrad.addColorStop(1, "transparent");
			ctx.strokeStyle = sepGrad; ctx.lineWidth = 1.5;
			ctx.beginPath(); ctx.moveTo(60, SEP_Y); ctx.lineTo(1140, SEP_Y); ctx.stroke();
			ctx.restore();

			// ── LISTE (10 lignes, layout corrigé sans débordement) ─────────────────
			// Colonnes : rang(60) | avatar(160) | nom(210→590) | barre(630→980) | count(1140, right-aligned)
			const ROW_H = 90;
			const ROW_GAP = 15;
			const LIST_Y_START = 545;
			const NAME_X = 210, NAME_MAX = 380;
			const BAR_X = 630, BAR_W = 350;
			const COUNT_X = 1140;

			let currentY = LIST_Y_START;
			for (const user of pageUsers) {
				ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
				ctx.fillRect(50, currentY, 1100, ROW_H);

				ctx.textAlign = 'left';
				ctx.font = `bold 28px "BeVietnamPro", "sans-serif"`;
				ctx.fillStyle = theme.secondary;
				ctx.fillText(`#${user.rank}`, 60, currentY + 56);

				const avatar = await getAvatar(user.uid, user.name);
				drawCircularAvatar(ctx, avatar, 160, currentY + 45, 30);

				ctx.fillStyle = '#FFFFFF';
				ctx.font = `bold 28px "BeVietnamPro", "sans-serif"`;
				ctx.fillText(fitText(ctx, user.name, NAME_MAX), NAME_X, currentY + 56);

				const progress = (user.count / (top3[0]?.count || user.count || 1)) * BAR_W;
				ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
				ctx.fillRect(BAR_X, currentY + 35, BAR_W, 20);
				ctx.fillStyle = theme.primary;
				ctx.fillRect(BAR_X, currentY + 35, Math.max(progress, 4), 20);

				ctx.textAlign = 'right';
				ctx.font = `bold 28px "BeVietnamPro", "sans-serif"`;
				ctx.fillStyle = theme.primary;
				ctx.fillText(String(user.count), COUNT_X, currentY + 56);

				currentY += ROW_H + ROW_GAP;
			}

			// ── FOOTER (toujours sous la dernière ligne, jamais chevauché) ─────────
			const FOOTER_Y = currentY + 25;
			ctx.textAlign = 'center';
			ctx.fillStyle = theme.secondary;
			ctx.font = `normal 22px "BeVietnamPro", "sans-serif"`;
			ctx.fillText(getLang("page", page, totalPages), 600, FOOTER_Y);
			ctx.font = `normal 18px "BeVietnamPro", "sans-serif"`;
			ctx.fillText(getLang("reply"), 600, FOOTER_Y + 28);

			const outPath = resolve(__dirname, 'cache', `leaderboard_${threadID}.png`);
			const out = createWriteStream(outPath);
			const stream = canvas.createPNGStream();
			stream.pipe(out);
			out.on('finish', () => {
				message.reply({
					attachment: require('fs').createReadStream(outPath)
				}, (err, info) => {
					if (err) return console.error(err);
					global.GoatBot.onReply.set(info.messageID, {
						commandName: this.config.name,
						messageID: info.messageID,
						author: senderID,
						threadID: threadID,
						type: 'leaderboard',
						themeIndex
					});
				});
			});
		}

		// ═══════════════════════════════════════════════════════════════════════
		//  CARTE UTILISATEUR — Canvas 800 × 1200, layout pixel-perfect
		// ═══════════════════════════════════════════════════════════════════════
		else {
			const targetUsers = Object.keys(mentions).length > 0 ? Object.keys(mentions) : [senderID];

			for (const uid of targetUsers) {
				const user = combinedData.find(u => u.uid == uid);
				if (!user) continue;

				const UC_W = 800, UC_H = 1200;
				const canvas = new Canvas(UC_W, UC_H);
				const ctx = canvas.getContext('2d');

				drawGalaxyBackground(ctx, UC_W, UC_H, theme);

				ctx.textAlign = 'center';
				drawGlowingText(ctx, getLang("userCardTitle"), 400, 65, theme.primary, 42);
				ctx.font = `normal 18px "BeVietnamPro", "sans-serif"`;
				ctx.fillStyle = theme.secondary;
				ctx.fillText(`◈  ${theme.name}  ◈`, 400, 98);

				// Avatar
				ctx.shadowColor = theme.primary;
				ctx.shadowBlur = 30;
				const avatar = await getAvatar(user.uid, user.name);
				drawCircularAvatar(ctx, avatar, 400, 210, 95);
				ctx.shadowBlur = 0;

				ctx.textAlign = 'center';
				ctx.font = `bold 38px "BeVietnamPro", "sans-serif"`;
				ctx.fillStyle = '#FFFFFF';
				ctx.fillText(fitText(ctx, user.name, 600), 400, 340);

				// ── Bloc rang / total ────────────────────────────────────────────────
				const STAT_Y = 390;
				ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
				ctx.fillRect(50, STAT_Y, 700, 120);

				ctx.beginPath();
				ctx.moveTo(400, STAT_Y + 15);
				ctx.lineTo(400, STAT_Y + 105);
				ctx.strokeStyle = theme.primary;
				ctx.lineWidth = 1;
				ctx.shadowColor = theme.primary;
				ctx.shadowBlur = 10;
				ctx.stroke();
				ctx.shadowBlur = 0;

				ctx.fillStyle = theme.secondary;
				ctx.font = `bold 22px "BeVietnamPro", "sans-serif"`;
				ctx.fillText(getLang("serverRank"), 225, STAT_Y + 30);
				ctx.fillText(getLang("totalMessages"), 575, STAT_Y + 30);

				ctx.fillStyle = theme.primary;
				ctx.font = `bold 46px "BeVietnamPro", "sans-serif"`;
				ctx.fillText(`#${user.rank}`, 225, STAT_Y + 80);
				ctx.fillText(String(user.count), 575, STAT_Y + 80);

				// ── Jour le plus actif ───────────────────────────────────────────────
				const dailyData = user.activity.daily;
				const days = [];
				for (let i = 6; i >= 0; i--) {
					const day = moment().tz("Asia/Ho_Chi_Minh").subtract(i, 'days');
					days.push({
						label: day.format('dddd'),
						shortLabel: day.format('ddd'),
						key: day.format('YYYY-MM-DD'),
						count: dailyData[day.format('YYYY-MM-DD')] || 0
					});
				}
				const busiestDay = days.reduce((prev, current) => (prev.count > current.count) ? prev : current, { count: -1 });

				const BUSY_Y = 565;
				ctx.textAlign = 'center';
				ctx.fillStyle = theme.secondary;
				ctx.font = `bold 22px "BeVietnamPro", "sans-serif"`;
				ctx.fillText(getLang("busiestDay"), 400, BUSY_Y);

				ctx.fillStyle = '#FFFFFF';
				ctx.font = `bold 30px "BeVietnamPro", "sans-serif"`;
				ctx.fillText(busiestDay.count > 0 ? `${busiestDay.label} - ${busiestDay.count} msgs` : 'N/A', 400, BUSY_Y + 42);

				// ── Graphique 7 jours ─────────────────────────────────────────────────
				const GRAPH_LABEL_Y = 665;
				ctx.textAlign = 'left';
				ctx.fillStyle = theme.secondary;
				ctx.font = `bold 22px "BeVietnamPro", "sans-serif"`;
				ctx.fillText(getLang("dailyActivity"), 50, GRAPH_LABEL_Y);

				const graphX = 80, graphW = 640, graphH = 110;
				const graphY = 800; // bas du graphique

				ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
				ctx.lineWidth = 1;
				ctx.strokeRect(graphX, graphY - graphH, graphW, graphH);

				const maxCount = Math.max(...days.map(d => d.count), 1);

				ctx.beginPath();
				ctx.moveTo(graphX, graphY - (days[0].count / maxCount * graphH));
				ctx.strokeStyle = theme.primary;
				ctx.lineWidth = 3;
				days.forEach((day, i) => {
					const x = graphX + (i / 6) * graphW;
					const y = graphY - (day.count / maxCount * graphH);
					ctx.lineTo(x, y);

					ctx.textAlign = 'center';
					ctx.fillStyle = theme.secondary;
					ctx.font = '16px "BeVietnamPro", "sans-serif"';
					ctx.fillText(day.shortLabel, x, graphY + 24);
				});
				ctx.stroke();

				// Points sur la courbe
				days.forEach((day, i) => {
					const x = graphX + (i / 6) * graphW;
					const y = graphY - (day.count / maxCount * graphH);
					ctx.beginPath();
					ctx.fillStyle = theme.primary;
					ctx.shadowColor = theme.primary;
					ctx.shadowBlur = 8;
					ctx.arc(x, y, 4, 0, Math.PI * 2);
					ctx.fill();
					ctx.shadowBlur = 0;
				});

				// ── Répartition des messages ─────────────────────────────────────────
				const BREAK_LABEL_Y = 880;
				ctx.textAlign = 'left';
				ctx.fillStyle = theme.secondary;
				ctx.font = `bold 22px "BeVietnamPro", "sans-serif"`;
				ctx.fillText(getLang("messageBreakdown"), 50, BREAK_LABEL_Y);

				const types = user.activity.types;
				const totalTypes = types.text + types.sticker + types.media;
				const breakdownData = [
					{ label: getLang("text"), value: types.text, color: theme.primary },
					{ label: getLang("sticker"), value: types.sticker, color: '#3FBAC2' },
					{ label: getLang("media"), value: types.media, color: '#F4E409' }
				];

				// Donut repositionné pour ne jamais déborder (centre + rayon < canvas - marge)
				const donutY = 990, donutR = 55, donutX = 195;
				let startAngle = -0.5 * Math.PI;

				if (totalTypes > 0) {
					breakdownData.forEach(item => {
						const sliceAngle = (item.value / totalTypes) * 2 * Math.PI;
						ctx.beginPath();
						ctx.moveTo(donutX, donutY);
						ctx.arc(donutX, donutY, donutR, startAngle, startAngle + sliceAngle);
						ctx.closePath();
						ctx.fillStyle = item.color;
						ctx.fill();
						startAngle += sliceAngle;
					});
				} else {
					ctx.beginPath();
					ctx.arc(donutX, donutY, donutR, 0, 2 * Math.PI);
					ctx.fillStyle = theme.secondary;
					ctx.fill();
				}

				// Légende — alignée avec le donut, jamais en dessous du canvas
				let legendY = 940;
				breakdownData.forEach(item => {
					const percentage = totalTypes > 0 ? (item.value / totalTypes * 100).toFixed(1) : 0;
					ctx.fillStyle = item.color;
					ctx.fillRect(345, legendY, 20, 20);
					ctx.fillStyle = '#FFFFFF';
					ctx.font = `bold 20px "BeVietnamPro", "sans-serif"`;
					ctx.textAlign = 'left';
					ctx.fillText(item.label, 375, legendY + 16);
					ctx.fillStyle = theme.secondary;
					ctx.textAlign = 'right';
					ctx.fillText(`${percentage}% (${item.value})`, 745, legendY + 16);
					legendY += 42;
				});

				// ── Pied de page ──────────────────────────────────────────────────────
				ctx.textAlign = 'center';
				ctx.fillStyle = theme.secondary;
				ctx.font = `normal 14px "BeVietnamPro", "sans-serif"`;
				const now = moment().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm");
				ctx.fillText(`◈  ${now}  ·  Christus  ◈`, 400, UC_H - 25);

				const outPath = resolve(__dirname, 'cache', `usercard_${uid}.png`);
				const out = createWriteStream(outPath);
				const stream = canvas.createPNGStream();
				stream.pipe(out);
				out.on('finish', () => {
					message.reply({ attachment: require('fs').createReadStream(outPath) });
				});
			}
		}
	},

	onReply: async function ({ event, Reply, message, getLang }) {
		if (event.senderID !== Reply.author || Reply.type !== 'leaderboard') return;

		const page = parseInt(event.body);
		if (isNaN(page)) return;

		try {
			message.unsend(Reply.messageID);
			const newArgs = ['all', page.toString()];
			await this.onStart({
				...arguments[0],
				args: newArgs,
				event: { ...arguments[0].event, body: `/count ${newArgs.join(' ')}` }
			});
		} catch (e) {
			console.error("Error during pagination reply:", e);
			message.reply(getLang("invalidPage"));
		}
	}

};
