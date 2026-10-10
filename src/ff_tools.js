import { InlineKeyboard } from "grammy";

const sessions = new Map();

const SERVERS = [
  ["🇮🇳 India", "INDIA"],
  ["🇧🇷 Brazil", "BRAZIL"],
  ["🇮🇩 Indonesia", "INDONESIA"],
  ["🇹🇭 Thailand", "THAILAND"],
  ["🇻🇳 Vietnam", "VIETNAM"],
  ["🇲🇾 Malaysia", "MALAYSIA"],
  ["🇸🇬 Singapore", "SINGAPORE"],
  ["🇹🇼 Taiwan", "TAIWAN"],
  ["🌍 Other / Global", "GLOBAL"],
];

const SENSITIVITY = new InlineKeyboard()
  .text("🎯 General", "sens_general")
  .row()
  .text("🔴 Red Dot", "sens_red")
  .row()
  .text("🔭 2x Scope", "sens_2x")
  .row()
  .text("🔭 4x Scope", "sens_4x")
  .row()
  .text("🎮 HUD Guide", "hud_guide")
  .row()
  .text("📱 DPI Guide", "dpi_guide")
  .row()
  .text("⬅️ Back", "ff_tools");

const FF_MENU = new InlineKeyboard()
  .text("🎯 Sensitivity & HUD", "sensitivity")
  .row()
  .text("✨ Name & Symbols", "name_symbols")
  .row()
  .text("🎮 Gameplay Tips", "gameplay_tips")
  .row()
  .text("👤 Player Stats", "player_stats")
  .row()
  .text("⬅️ Main Menu", "home");

const ACCOUNT_MENU = new InlineKeyboard()
  .text("📧 Recovery Guide", "account_recovery")
  .row()
  .text("🔗 Binding Guide", "account_binding")
  .row()
  .text("🛡️ Security Tips", "account_security")
  .row()
  .text("🔧 Troubleshooting", "account_troubleshooting")
  .row()
  .text("⬅️ Main Menu", "home");

const BACK_TO_TOOLS = new InlineKeyboard()
  .text("⬅️ FF Tools", "ff_tools")
  .row()
  .text("🏠 Main Menu", "home");

function randomName() {
  const first = [
    "亗", "乂", "么", "『", "メ", "ツ",
  ];

  const second = [
    "Shadow", "Legend", "Hunter", "Ghost",
    "Dragon", "Blaze", "Phantom", "Rider",
    "Sniper", "Warrior",
  ];

  const third = [
    "亗", "乂", "ツ", "々", "★", "࿐",
  ];

  const a = first[Math.floor(Math.random() * first.length)];
  const b = second[Math.floor(Math.random() * second.length)];
  const c = third[Math.floor(Math.random() * third.length)];

  return `${a}${b}${c}`;
}

function nameMenu() {
  return new InlineKeyboard()
    .text("🎲 Generate Name", "generate_name")
    .row()
    .text("🎨 Symbols", "symbols")
    .row()
    .text("⬅️ Back", "ff_tools");
}

function statsServerMenu() {
  const keyboard = new InlineKeyboard();

  for (const [label, server] of SERVERS) {
    keyboard.text(label, `server_${server}`).row();
  }

  keyboard.text("⬅️ Back", "ff_tools");

  return keyboard;
}

export function registerFFTools(bot) {
  // Public FF Tools menu.
  bot.callbackQuery("ff_tools", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🧰 FREE FIRE TOOLS\n\n" +
      "Choose a tool below:\n\n" +
      "🎯 Sensitivity, HUD & DPI\n" +
      "✨ Stylish Names & Symbols\n" +
      "🎮 Gameplay Tips\n" +
      "👤 Player Stats",
      { reply_markup: FF_MENU }
    );
  });

  // Public account tools menu.
  bot.callbackQuery("account_tools", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🔐 ACCOUNT TOOLS\n\n" +
      "Choose an account-help option.\n\n" +
      "This bot never needs your password, OTP, " +
      "or account access token.",
      { reply_markup: ACCOUNT_MENU }
    );
  });

  // Sensitivity submenu.
  bot.callbackQuery("sensitivity", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎯 SENSITIVITY & DEVICE SETTINGS\n\n" +
      "Choose a topic.\n\n" +
      "Settings vary by device and play style. " +
      "Treat suggestions as starting points.",
      { reply_markup: SENSITIVITY }
    );
  });

  const sensitivityGuides = {
    sens_general:
      "🎯 GENERAL SENSITIVITY\n\n" +
      "Start with a medium-high General setting.\n" +
      "Test in Training Mode and adjust gradually.\n" +
      "Increase it if turning feels slow; reduce it " +
      "if your aim moves too far.",

    sens_red:
      "🔴 RED DOT SENSITIVITY\n\n" +
      "Try a medium-high setting as a starting point.\n" +
      "Practice tracking moving targets and drag shots.\n" +
      "Change it gradually to find comfortable control.",

    sens_2x:
      "🔭 2x SCOPE\n\n" +
      "Start around the middle of the slider.\n" +
      "Increase it if tracking feels slow.\n" +
      "Lower it if your aim becomes unstable.",

    sens_4x:
      "🔭 4x SCOPE\n\n" +
      "Try a medium setting first.\n" +
      "Practice controlled movement at long range.\n" +
      "Adjust slowly based on your device.",

    hud_guide:
      "🎮 CUSTOM HUD GUIDE\n\n" +
      "• Place fire buttons where your fingers reach easily.\n" +
      "• Keep important controls easy to see.\n" +
      "• Avoid placing buttons too close together.\n" +
      "• Practise the layout before ranked matches.\n" +
      "• Save a screenshot of a layout you like.",

    dpi_guide:
      "📱 DPI GUIDE\n\n" +
      "DPI changes display scaling and can affect " +
      "how controls feel on some devices.\n\n" +
      "• There is no single best DPI for everyone.\n" +
      "• Record your original settings before changes.\n" +
      "• Avoid unknown apps that promise unfair advantages.\n" +
      "• Test changes carefully and restore settings " +
      "if the interface becomes difficult to use.",
  };

  for (const [callback, message] of Object.entries(sensitivityGuides)) {
    bot.callbackQuery(callback, async (ctx) => {
      await ctx.answerCallbackQuery();

      await ctx.editMessageText(message, {
        reply_markup: BACK_TO_TOOLS,
      });
    });
  }

  // Name and symbols menu.
  bot.callbackQuery("name_symbols", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "✨ NAME & SYMBOL GENERATOR\n\n" +
      "Generate a gaming name or browse symbols.",
      { reply_markup: nameMenu() }
    );
  });

  bot.callbackQuery("generate_name", async (ctx) => {
    await ctx.answerCallbackQuery();

    const names = Array.from(
      { length: 8 },
      () => randomName()
    );

    await ctx.reply(
      "✨ SUGGESTED GAMING NAMES\n\n" +
      names.map((name, i) => `${i + 1}. ${name}`).join("\n") +
      "\n\nTap and hold a name to copy it."
    );
  });

  bot.callbackQuery("symbols", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.reply(
      "🎨 COPYABLE SYMBOLS\n\n" +
      "亗  乂  么  ツ  々  ࿐\n" +
      "★  ☆  ♛  ♚  ⚡  〆\n" +
      "『  』  【  】  ×  •\n\n" +
      "Tap and hold to copy a symbol.\n" +
      "Some symbols may not be accepted by the game."
    );
  });

  // Gameplay tips.
  bot.callbackQuery("gameplay_tips", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎮 GAMEPLAY TIPS\n\n" +
      "🎯 Aim: Practise short, controlled movements.\n" +
      "🏃 Movement: Keep moving while fighting.\n" +
      "🧱 Cover: Use cover instead of standing still.\n" +
      "🎧 Awareness: Listen for nearby footsteps.\n" +
      "🛠️ Practice: Test settings in Training Mode.\n" +
      "🤝 Teamwork: Communicate with teammates.",
      { reply_markup: BACK_TO_TOOLS }
    );
  });

  // Public player stats flow.
  bot.callbackQuery("player_stats", async (ctx) => {
    await ctx.answerCallbackQuery();

    sessions.set(ctx.from.id, { action: "player_uid" });

    await ctx.reply(
      "👤 PLAYER STATS\n\n" +
      "Send the player's numeric Free Fire UID.\n\n" +
      "Do not send a password or access token.\n" +
      "Send /cancel to stop."
    );
  });

  // Account recovery guide.
  bot.callbackQuery("account_recovery", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📧 ACCOUNT RECOVERY GUIDE\n\n" +
      "1. Open the official Free Fire game.\n" +
      "2. Follow the official account recovery process.\n" +
      "3. Use the recovery options provided by the game.\n" +
      "4. Contact official support if recovery fails.\n\n" +
      "Never give your password or OTP to another person.",
      { reply_markup: BACK_TO_TOOLS }
    );
  });

  // Account binding guide.
  bot.callbackQuery("account_binding", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🔗 ACCOUNT BINDING GUIDE\n\n" +
      "Use only the account-binding options shown " +
      "inside the official game.\n\n" +
      "Before changing bindings, check the official " +
      "instructions and understand whether the change " +
      "can be reversed.",
      { reply_markup: BACK_TO_TOOLS }
    );
  });

  // Account security.
  bot.callbackQuery("account_security", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🛡️ ACCOUNT SECURITY\n\n" +
      "• Never share your password or OTP.\n" +
      "• Never paste an account access token into this bot.\n" +
      "• Avoid unofficial login pages and suspicious apps.\n" +
      "• Secure the email or social account linked to the game.\n" +
      "• Contact official support if you suspect account theft.",
      { reply_markup: BACK_TO_TOOLS }
    );
  });

  // Account troubleshooting.
  bot.callbackQuery("account_troubleshooting", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🔧 ACCOUNT TROUBLESHOOTING\n\n" +
      "• Check your internet connection.\n" +
      "• Update the game from an official store.\n" +
      "• Check the game's official service announcements.\n" +
      "• Follow official recovery instructions for login issues.\n" +
      "• Contact official support if the issue continues.",
      { reply_markup: BACK_TO_TOOLS }
    );
  });

  // Server selection after UID input.
  bot.on("message:text", async (ctx, next) => {
    const session = sessions.get(ctx.from.id);
    const text = ctx.message.text.trim();

    if (text.startsWith("/")) {
      if (text === "/cancel") {
        sessions.delete(ctx.from.id);
        await ctx.reply("✅ Action cancelled.");
        return;
      }

      await next();
      return;
    }

    if (!session || session.action !== "player_uid") {
      await next();
      return;
    }

    if (!/^\d{5,20}$/.test(text)) {
      await ctx.reply(
        "❌ Invalid UID format.\n" +
        "Send a numeric UID or /cancel."
      );
      return;
    }

    sessions.set(ctx.from.id, {
      action: "player_server",
      uid: text,
    });

    await ctx.reply(
      `👤 UID received: ${text}\n\n` +
      "🌍 Choose the player's server:",
      { reply_markup: statsServerMenu() }
    );
  });

  for (const [, server] of SERVERS) {
    bot.callbackQuery(`server_${server}`, async (ctx) => {
      await ctx.answerCallbackQuery();

      const session = sessions.get(ctx.from.id);

      if (!session || session.action !== "player_server") {
        await ctx.reply("Start again from Player Stats.");
        return;
      }

      sessions.delete(ctx.from.id);

      await ctx.reply(
        "🔎 PLAYER STATS REQUEST\n\n" +
        `UID: ${session.uid}\n` +
        `Server: ${server}\n\n` +
        "⚠️ Live player statistics are not connected yet.\n" +
        "A compatible, legitimate stats API must be configured " +
        "before the bot can retrieve actual game data."
      );
    });
  }
    }
