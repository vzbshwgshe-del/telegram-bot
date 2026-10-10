import { InlineKeyboard } from "grammy";

const ADMIN_ID = 6683322520;
const users = new Map();

export function registerCommands(bot) {
  // Main menu
  const mainMenu = new InlineKeyboard()
    .text("📧 Recovery Email", "recovery")
    .row()
    .text("🎮 Account Management", "account")
    .row()
    .text("ℹ️ Help", "help");

  // Record basic Telegram user information in memory
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      const id = ctx.from.id;
      const previous = users.get(id) || {};

      users.set(id, {
        id,
        username: ctx.from.username || "No username",
        firstName: ctx.from.first_name || "Unknown",
        firstSeen: previous.firstSeen || new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    }

    await next();
  });

  // Start command
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🔥 FF ACCOUNT MANAGER 🔥\n\n" +
      `Welcome, ${ctx.from?.first_name || "Player"}!\n\n` +
      "Manage your account with the options below.\n\n" +
      "Choose an option to continue 👇",
      { reply_markup: mainMenu }
    );
  });

  // Help command
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "ℹ️ HELP MENU\n\n" +
      "/start - Open the main menu\n" +
      "/help - Show help\n" +
      "/ping - Check bot status\n" +
      "/admin - Open the admin panel\n\n" +
      "🔐 Never share passwords, OTPs, or access tokens."
    );
  });

  // Ping command
  bot.command("ping", async (ctx) => {
    await ctx.reply("✅ FF Account Manager is online!");
  });

  // Admin panel
  bot.command("admin", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) {
      await ctx.reply(
        "⛔ You are not authorized to access the admin panel."
      );
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("👥 Total Users", "admin_users")
      .row()
      .text("📋 Recent Users", "admin_recent");

    await ctx.reply(
      "👑 ADMIN PANEL\n\nChoose an option:",
      { reply_markup: keyboard }
    );
  });

  // Admin panel buttons
  bot.callbackQuery(
    ["admin_users", "admin_recent"],
    async (ctx) => {
      await ctx.answerCallbackQuery();

      if (ctx.from?.id !== ADMIN_ID) {
        await ctx.reply("⛔ Access denied.");
        return;
      }

      const allUsers = [...users.values()];

      if (ctx.callbackQuery.data === "admin_users") {
        await ctx.reply(
          `👥 Total recorded users: ${allUsers.length}`
        );
        return;
      }

      const recent = allUsers
        .sort((a, b) =>
          new Date(b.lastSeen) - new Date(a.lastSeen)
        )
        .slice(0, 10);

      if (recent.length === 0) {
        await ctx.reply("No users have been recorded yet.");
        return;
      }

      const message = recent.map((user) =>
        `👤 ${user.firstName}\n` +
        `🆔 ${user.id}\n` +
        `Username: @${user.username}\n` +
        `Last active: ${user.lastSeen}`
      ).join("\n\n");

      await ctx.reply("📋 RECENT USERS\n\n" + message);
    }
  );

  // Recovery Email button
  bot.callbackQuery("recovery", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📧 RECOVERY EMAIL\n\n" +
      "Use the official Free Fire game settings to manage " +
      "your recovery email.\n\n" +
      "🔐 Never share your password, access token, or OTP " +
      "with unofficial bots.",
      {
        reply_markup: new InlineKeyboard()
          .text("📖 View Instructions", "instructions")
          .row()
          .text("⬅️ Main Menu", "home")
      }
    );
  });

  // Recovery instructions button
  bot.callbackQuery("instructions", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📖 RECOVERY EMAIL INSTRUCTIONS\n\n" +
      "1. Open Free Fire.\n" +
      "2. Open Settings → Account & Basic.\n" +
      "3. Look for the recovery email option.\n" +
      "4. Follow the verification steps shown in the game.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home")
      }
    );
  });

  // Account Management button
  bot.callbackQuery("account", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎮 ACCOUNT MANAGEMENT\n\n" +
      "Use official Free Fire settings to manage your account.\n\n" +
      "This bot does not change account details automatically.\n\n" +
      "🔐 Never share passwords, OTPs, or access tokens.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home")
      }
    );
  });

  // Help button
  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "ℹ️ FF ACCOUNT MANAGER HELP\n\n" +
      "Use the buttons to explore available options.\n\n" +
      "Commands:\n" +
      "/start - Main menu\n" +
      "/help - Help information\n" +
      "/ping - Check bot status\n\n" +
      "🔐 Never submit passwords, OTPs, or access tokens.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home")
      }
    );
  });

  // Return to main menu
  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🔥 FF ACCOUNT MANAGER 🔥\n\n" +
      "Choose an option to continue 👇",
      { reply_markup: mainMenu }
    );
  });
}
