import { InlineKeyboard } from "grammy";
import { pool } from "./database.js";

const OWNER_ID = "6683322520";

const PERMISSIONS = {
  view_dashboard: "View dashboard",
  view_users: "View user information",
  broadcast: "Send broadcasts",
};

const pendingActions = new Map();

function isOwner(ctx) {
  return String(ctx.from?.id) === OWNER_ID;
}

function mainMenu(isAdmin = false) {
  const keyboard = new InlineKeyboard()
    .text("🧰 FF Tools", "ff_tools")
    .row()
    .text("👤 Player Stats", "player_stats")
    .row()
    .text("🔐 Account Tools", "account_tools")
    .row()
    .text("🎫 Developer Support", "support")
    .row()
    .text("ℹ️ Help", "help");

  if (isAdmin) {
    keyboard.row().text("👑 Admin Panel", "admin_panel");
  }

  return keyboard;
}

function backMenu() {
  return new InlineKeyboard().text("⬅️ Main Menu", "home");
}

async function getAdmin(ctx) {
  if (isOwner(ctx)) {
    return {
      isAdmin: true,
      permissions: Object.fromEntries(
        Object.keys(PERMISSIONS).map((key) => [key, true]),
      ),
    };
  }

  const result = await pool.query(
    "SELECT permissions FROM bot_admins WHERE telegram_id = $1",
    [String(ctx.from.id)],
  );

  if (!result.rowCount) {
    return { isAdmin: false, permissions: {} };
  }

  return {
    isAdmin: true,
    permissions: result.rows[0].permissions || {},
  };
}

async function allowed(ctx, permission) {
  const admin = await getAdmin(ctx);
  return admin.isAdmin && admin.permissions[permission] === true;
}

async function showAdminPanel(ctx, edit = false) {
  const admin = await getAdmin(ctx);

  if (!admin.isAdmin) {
    const message = "⛔ You are not authorized.";
    if (edit) await ctx.editMessageText(message);
    else await ctx.reply(message);
    return;
  }

  const keyboard = new InlineKeyboard();

  if (admin.permissions.view_dashboard) {
    keyboard.text("📊 Dashboard", "dashboard");
  }

  if (admin.permissions.view_users) {
    keyboard.text("👤 Search User", "user_search");
  }

  if (admin.permissions.broadcast) {
    keyboard.row().text("📢 Broadcast", "broadcast");
  }

  if (isOwner(ctx)) {
    keyboard
      .row()
      .text("➕ Add Admin", "admin_add")
      .text("➖ Remove Admin", "admin_remove")
      .row()
      .text("🔐 Permissions", "admin_permissions")
      .row()
      .text("📋 Admin List", "admin_list");
  }

  keyboard.row().text("⬅️ Main Menu", "home");

  const message = "👑 ADMIN PANEL\n\nSelect an option:";

  if (edit) {
    await ctx.editMessageText(message, { reply_markup: keyboard });
  } else {
    await ctx.reply(message, { reply_markup: keyboard });
  }
}

function validTelegramId(value) {
  return /^\d{5,20}$/.test(value);
}

function ffToolsMenu() {
  return new InlineKeyboard()
    .text("🎯 Sensitivity Settings", "sensitivity")
    .row()
    .text("📱 Custom HUD Guide", "hud")
    .row()
    .text("⚙️ DPI Guide", "dpi")
    .row()
    .text("🏆 Rank Push Guide", "rank_push")
    .row()
    .text("✨ Name & Symbols", "name_symbols")
    .row()
    .text("🎮 Gameplay Tips", "gameplay")
    .row()
    .text("⬅️ Main Menu", "home");
}

function accountToolsMenu() {
  return new InlineKeyboard()
    .text("📧 Recovery Email", "recovery")
    .row()
    .text("🔗 Account Binding", "binding")
    .row()
    .text("🛡️ Account Security", "security")
    .row()
    .text("🔧 Troubleshooting", "troubleshooting")
    .row()
    .text("🔐 Authorization & Privacy", "authorization")
    .row()
    .text("⬅️ Main Menu", "home");
}

export function registerCommands(bot) {
  // Save normal Telegram user information only.
  bot.use(async (ctx, next) => {
    if (ctx.from && !ctx.from.is_bot) {
      try {
        await pool.query(
          `INSERT INTO bot_users
            (telegram_id, username, first_name, first_seen, last_seen)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (telegram_id)
           DO UPDATE SET
             username = EXCLUDED.username,
             first_name = EXCLUDED.first_name,
             last_seen = NOW()`,
          [
            String(ctx.from.id),
            ctx.from.username || null,
            ctx.from.first_name || "Unknown",
          ],
        );
      } catch (error) {
        console.error("[users] Save failed:", error.message);
      }
    }

    await next();
  });

  // Basic commands
  bot.command("start", async (ctx) => {
    const admin = await getAdmin(ctx);

    await ctx.reply(
      `🔥 FF ACCOUNT MANAGER 🔥\n\nWelcome, ${
        ctx.from.first_name || "Player"
      }!\n\nChoose an option below 👇`,
      { reply_markup: mainMenu(admin.isAdmin) },
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "ℹ️ HELP\n\n" +
        "/start — Main menu\n" +
        "/help — Help\n" +
        "/ping — Bot status\n" +
        "/admin — Admin panel\n" +
        "/cancel — Cancel an active action\n\n" +
        "🔐 Never share passwords, OTPs, or access tokens.",
      { reply_markup: backMenu() },
    );
  });

  bot.command("ping", async (ctx) => {
    await ctx.reply("✅ FF Account Manager is online!");
  });

  bot.command("admin", async (ctx) => {
    await showAdminPanel(ctx);
  });

  bot.command("cancel", async (ctx) => {
    pendingActions.delete(ctx.from.id);
    await ctx.reply("✅ Action cancelled.", {
      reply_markup: backMenu(),
    });
  });

  // Main menu
  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery();

    pendingActions.delete(ctx.from.id);

    const admin = await getAdmin(ctx);

    await ctx.editMessageText(
      "🔥 FF ACCOUNT MANAGER 🔥\n\nChoose an option below 👇",
      { reply_markup: mainMenu(admin.isAdmin) },
    );
  });

  // FF Tools
  bot.callbackQuery("ff_tools", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🧰 FREE FIRE TOOLS\n\nChoose a tool:",
      { reply_markup: ffToolsMenu() },
    );
  });

  bot.callbackQuery("sensitivity", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎯 SENSITIVITY SETTINGS\n\n" +
        "Try these as starting values, then adjust for your device:\n\n" +
        "General: 90–100\n" +
        "Red Dot: 85–95\n" +
        "2x Scope: 75–85\n" +
        "4x Scope: 65–80\n" +
        "Sniper Scope: 30–50\n" +
        "Free Look: 70–85\n\n" +
        "These are suggested starting ranges, not guaranteed best settings.",
      { reply_markup: ffToolsMenu() },
    );
  });

  bot.callbackQuery("hud", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📱 CUSTOM HUD GUIDE\n\n" +
        "1. Open Free Fire Settings.\n" +
        "2. Select Controls and Custom HUD.\n" +
        "3. Place the fire button where your thumb can reach it easily.\n" +
        "4. Keep jump, crouch, and prone buttons comfortably accessible.\n" +
        "5. Adjust button size and transparency.\n" +
        "6. Practise in Training Mode before ranked matches.\n\n" +
        "Tip: Change one setting at a time.",
      { reply_markup: ffToolsMenu() },
    );
  });

  bot.callbackQuery("dpi", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "⚙️ DPI GUIDE\n\n" +
        "DPI affects the Android interface and touch feel; it is not a universal Free Fire sensitivity setting.\n\n" +
        "• Keep your current DPI if your phone works well.\n" +
        "• Changing DPI may make text and interface elements smaller.\n" +
        "• Record your original setting before changing it.\n" +
        "• Avoid extreme values and use your phone's supported settings.\n\n" +
        "You do not need to change DPI to improve your aim.",
      { reply_markup: ffToolsMenu() },
    );
  });

  bot.callbackQuery("rank_push", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🏆 RANK PUSH GUIDE\n\n" +
        "1. Play with teammates you trust.\n" +
        "2. Choose landing locations based on your skill level.\n" +
        "3. Collect supplies before taking unnecessary fights.\n" +
        "4. Use cover and communicate enemy positions.\n" +
        "5. Avoid rushing alone.\n" +
        "6. Review mistakes after each match.\n" +
        "7. Take a break after several frustrating losses.\n\n" +
        "Play fairly and never use cheats or account exploits.",
      { reply_markup: ffToolsMenu() },
    );
  });

  bot.callbackQuery("name_symbols", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "✨ NAME & SYMBOLS GENERATOR\n\n" +
        "Choose a sample style, or send /name followed by your name.\n\n" +
        "Examples:\n" +
        "亗Shadow亗\n" +
        "꧁༒King༒꧂\n" +
        "乂Legend乂\n" +
        "『Pro』Player\n" +
        "★彡Sniper彡★\n\n" +
        "Copy a style and replace the sample name.\n\n" +
        "Symbols:\n" +
        "亗 乂 ꧁ ꧂ 『 』 彡 ★ ☆ 么 ツ 々",
      { reply_markup: new InlineKeyboard()
        .text("✍️ Generate My Name", "generate_name")
        .row()
        .text("⬅️ FF Tools", "ff_tools")
      },
    );
  });

  bot.callbackQuery("generate_name", async (ctx) => {
    await ctx.answerCallbackQuery();
    pendingActions.set(ctx.from.id, "generate_name");

    await ctx.reply(
      "✍️ Send the name you want to style.\n\nSend /cancel to stop.",
    );
  });

  bot.callbackQuery("gameplay", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎮 GAMEPLAY TIPS\n\n" +
        "• Practise tracking and flicking in Training Mode.\n" +
        "• Use headphones to identify nearby sounds.\n" +
        "• Learn when to use cover instead of open ground.\n" +
        "• Keep sensitivity comfortable and consistent.\n" +
        "• Communicate with your squad.\n" +
        "• Avoid unofficial tools that request account credentials.",
      { reply_markup: ffToolsMenu() },
    );
  });

  // Player Stats
  bot.callbackQuery("player_stats", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "👤 PLAYER STATS\n\n" +
        "Choose your Free Fire server.\n\n" +
        "Note: Live statistics require a compatible, legitimate stats API. " +
        "This bot will not invent player statistics.",
      {
        reply_markup: new InlineKeyboard()
          .text("🇮🇳 India", "server_india")
          .text("🇧🇷 Brazil", "server_brazil")
          .row()
          .text("🇮🇩 Indonesia", "server_indonesia")
          .text("🇹🇭 Thailand", "server_thailand")
          .row()
          .text("🇻🇳 Vietnam", "server_vietnam")
          .text("🇲🇾 Malaysia", "server_malaysia")
          .row()
          .text("🇸🇬 Singapore", "server_singapore")
          .text("🇹🇼 Taiwan", "server_taiwan")
          .row()
          .text("🇷🇺 Russia", "server_russia")
          .row()
          .text("🌐 Other / Global", "server_global")
          .row()
          .text("⬅️ Main Menu", "home"),
      },
    );
  });

  const servers = [
    "india",
    "brazil",
    "indonesia",
    "thailand",
    "vietnam",
    "malaysia",
    "singapore",
    "taiwan",
    "russia",
    "global",
  ];

  for (const server of servers) {
    bot.callbackQuery(`server_${server}`, async (ctx) => {
      await ctx.answerCallbackQuery();

      pendingActions.set(ctx.from.id, `player_uid:${server}`);

      await ctx.reply(
        `👤 PLAYER STATS — ${server.toUpperCase()}\n\n` +
          "Send the player's numeric Free Fire UID.\n\n" +
          "No live stats API is configured in this version, so the bot will collect the UID but will not fabricate statistics.\n\n" +
          "Send /cancel to stop.",
      );
    });
  }

  // Account Tools
  bot.callbackQuery("account_tools", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🔐 ACCOUNT TOOLS\n\nChoose the help you need:",
      { reply_markup: accountToolsMenu() },
    );
  });

  bot.callbackQuery("recovery", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📧 RECOVERY EMAIL HELP\n\n" +
        "Use the official game account settings and recovery process.\n\n" +
        "1. Open the game.\n" +
        "2. Open Settings → Account.\n" +
        "3. Review available binding and recovery options.\n" +
        "4. Follow official verification instructions.\n\n" +
        "Never share your password, OTP, or access token.",
      { reply_markup: accountToolsMenu() },
    );
  });

  bot.callbackQuery("binding", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🔗 ACCOUNT BINDING GUIDE\n\n" +
        "• Open the game's official account settings.\n" +
        "• Review the available linked-account options.\n" +
        "• Bind only accounts that you own and control.\n" +
        "• Never give a third party your login credentials.\n" +
        "• Contact official support if binding fails.",
      { reply_markup: accountToolsMenu() },
    );
  });

  bot.callbackQuery("security", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🛡️ ACCOUNT SECURITY\n\n" +
        "• Never share passwords or OTPs.\n" +
        "• Do not paste access tokens into public chats.\n" +
        "• Use strong security on linked accounts.\n" +
        "• Review account activity when possible.\n" +
        "• Avoid unofficial login pages and suspicious apps.\n" +
        "• Contact official support if you suspect compromise.",
      { reply_markup: accountToolsMenu() },
    );
  });

  bot.callbackQuery("troubleshooting", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🔧 ACCOUNT TROUBLESHOOTING\n\n" +
        "For faster help, note:\n" +
        "1. Your Free Fire UID.\n" +
        "2. Your server or region.\n" +
        "3. The exact error message.\n" +
        "4. When the problem began.\n" +
        "5. What troubleshooting steps you tried.\n\n" +
        "Do not send passwords, OTPs, or raw access tokens.",
      { reply_markup: accountToolsMenu() },
    );
  });

  bot.callbackQuery("authorization", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🔐 AUTHORIZATION & PRIVACY NOTICE\n\n" +
        "Some account support features may require an official authorization method.\n\n" +
        "• Your consent must be explicit.\n" +
        "• Do not submit passwords, OTPs, or raw access tokens to this bot.\n" +
        "• Diagnostic records may be retained for up to 30 days when needed for support.\n" +
        "• Diagnostic records should exclude secret credentials.\n" +
        "• You may cancel before submitting information.\n\n" +
        "This version does not collect or store raw access tokens.",
      { reply_markup: accountToolsMenu() },
    );
  });

  // Developer support: collect non-secret diagnostic details only.
  bot.callbackQuery("support", async (ctx) => {
    await ctx.answerCallbackQuery();

    pendingActions.set(ctx.from.id, "support");

    await ctx.reply(
      "🎫 DEVELOPER SUPPORT\n\n" +
        "Describe your issue, including the error message if possible.\n\n" +
        "Do not include passwords, OTPs, or access tokens.\n\n" +
        "Send /cancel to stop.",
    );
  });

  // Admin dashboard
  bot.callbackQuery("admin_panel", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showAdminPanel(ctx, true);
  });

  bot.callbackQuery("dashboard", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!(await allowed(ctx, "view_dashboard"))) {
      await ctx.reply("⛔ Dashboard permission required.");
      return;
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE first_seen >= CURRENT_DATE) AS joined_today,
        COUNT(*) FILTER (WHERE last_seen >= CURRENT_DATE) AS active_today
      FROM bot_users
    `);

    const admins = await pool.query("SELECT COUNT(*) FROM bot_admins");
    const stats = result.rows[0];

    await ctx.reply(
      "📊 ADVANCED DASHBOARD\n\n" +
        `👥 Total users: ${stats.total_users}\n` +
        `🆕 Joined today: ${stats.joined_today}\n` +
        `🟢 Active today: ${stats.active_today}\n` +
        `🛡️ Admins: ${admins.rows[0].count}`,
    );
  });

  bot.callbackQuery("user_search", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!(await allowed(ctx, "view_users"))) {
      await ctx.reply("⛔ User search permission required.");
      return;
    }

    pendingActions.set(ctx.from.id, "user_search");

    await ctx.reply(
      "👤 USER SEARCH\n\nSend the user's numeric Telegram ID.\n\nSend /cancel to stop.",
    );
  });

  bot.callbackQuery("broadcast", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!(await allowed(ctx, "broadcast"))) {
      await ctx.reply("⛔ Broadcast permission required.");
      return;
    }

    pendingActions.set(ctx.from.id, "broadcast");

    await ctx.reply(
      "📢 BROADCAST\n\nSend the announcement text.\n\nSend /cancel to stop.",
    );
  });

  bot.callbackQuery("admin_add", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      await ctx.reply("⛔ Only the owner can add admins.");
      return;
    }

    pendingActions.set(ctx.from.id, "admin_add");

    await ctx.reply("➕ Send the new admin's numeric Telegram ID.");
  });

  bot.callbackQuery("admin_remove", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      await ctx.reply("⛔ Only the owner can remove admins.");
      return;
    }

    pendingActions.set(ctx.from.id, "admin_remove");

    await ctx.reply("➖ Send the admin's Telegram ID to remove.");
  });

  bot.callbackQuery("admin_permissions", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      await ctx.reply("⛔ Only the owner can change permissions.");
      return;
    }

    pendingActions.set(ctx.from.id, "admin_permissions");

    await ctx.reply(
      "🔐 CHANGE PERMISSIONS\n\n" +
        "Send: TELEGRAM_ID PERMISSION on|off\n\n" +
        "Available permissions:\n" +
        "view_dashboard\nview_users\nbroadcast\n\n" +
        "Example: 123456789 broadcast off",
    );
  });

  bot.callbackQuery("admin_list", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      await ctx.reply("⛔ Only the owner can view the admin list.");
      return;
    }

    const result = await pool.query(
      "SELECT telegram_id, permissions FROM bot_admins ORDER BY added_at DESC LIMIT 50",
    );

    if (!result.rowCount) {
      await ctx.reply("No admins have been added yet.");
      return;
    }

    const message = result.rows
      .map((admin) => {
        const enabled = Object.entries(admin.permissions || {})
          .filter(([, value]) => value === true)
          .map(([key]) => key);

        return `🛡️ ID: ${admin.telegram_id}\nPermissions: ${
          enabled.join(", ") || "None"
        }`;
      })
      .join("\n\n");

    await ctx.reply("📋 ADMIN LIST\n\n" + message);
  });

  // Text input handler
  bot.on("message:text", async (ctx, next) => {
    const action = pendingActions.get(ctx.from.id);
    const message = ctx.message.text.trim();

    if (!action || message.startsWith("/")) {
      await next();
      return;
    }

    if (
      ["admin_add", "admin_remove", "admin_permissions"].includes(action) &&
      !isOwner(ctx)
    ) {
      pendingActions.delete(ctx.from.id);
      await ctx.reply("⛔ Only the owner can perform this action.");
      return;
    }

    if (action === "generate_name") {
      pendingActions.delete(ctx.from.id);

      const name = message.slice(0, 20);

      await ctx.reply(
        "✨ NAME STYLES\n\n" +
          `亗${name}亗\n` +
          `꧁༒${name}༒꧂\n` +
          `乂${name}乂\n` +
          `『${name}』\n` +
          `★彡${name}彡★\n\n` +
          "Some symbols may not be accepted by the game.",
