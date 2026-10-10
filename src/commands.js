import { InlineKeyboard } from "grammy";

const ADMIN_ID = 6683322520;
const users = new Map();

export function registerCommands(bot) {
  const mainMenu = new InlineKeyboard()
    .text("📧 Recovery Email", "recovery")
    .row()
    .text("🎮 Account Management", "account")
    .row()
    .text("ℹ️ Help", "help");

  bot.use(async (ctx, next) => {
    if (ctx.from) {
      const id = ctx.from.id;
      const old = users.get(id) || {};

      users.set(id, {
        id,
        username: ctx.from.username || "No username",
        firstName: ctx.from.first_name || "Unknown",
        firstSeen: old.firstSeen || new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    }

    await next();
  });

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🔥 FF ACCOUNT MANAGER 🔥\n\n" +
      `Welcome, ${ctx.from?.first_name || "Player"}!\n\n` +
      "Manage your account with the options below.\n\n" +
      "Choose an option to continue 👇",
      { reply_markup: mainMenu }
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "ℹ️ HELP MENU\n\n" +
      "/start - Open the main menu\n" +
      "/help - Show help\n" +
      "/ping - Check bot status\n" +
      "/admin - Open the admin panel (authorized admin only)"
    );
  });

  bot.command("ping", async (ctx) => {
    await ctx.reply("✅ FF Account Manager is online!");
  });

  bot.command("admin", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) {
      await ctx.reply("⛔ You are not authorized to access the admin panel.");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("👥 Total Users", "admin_users")
      .row()
      .text("📋 Recent Users", "admin_recent");

    await ctx.reply("👑 ADMIN PANEL\n\nChoose an option:", {
      reply_markup: keyboard
    });
  });

  bot.callbackQuery(["admin_users", "admin_recent"], async (ctx) => {
    await ctx.answerCallbackQuery();

    if (ctx.from?.id !== ADMIN_ID) {
      await ctx.reply("⛔ Access denied.");
      return;
    }

    const allUsers = [...users.values()];

    if (ctx.callbackQuery.data === "admin_users") {
      await ctx.reply(`👥 Total registered users: ${allUsers.length}`);
      return;
    }

    const recent = allUsers.slice(-10).reverse();

    if (!recent.length) {
      await ctx.reply("No users have been recorded yet.");
      return;
    }

    const message = recent.map((u) =>
      `👤 ${u.firstName}\n` +
      `🆔 ${u.id}\n` +
      `Username: @${u.username}\n` +
      `Last active: ${u.lastSeen}`
    ).join("\n\n");

    await ctx.reply("📋 RECENT USERS\n\n" + message);
  });

  bot.callbackQuery("recovery", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📧 RECOVERY EMAIL\n\n" +
      "Use the official Free Fire game settings to manage your recovery email.\n\n" +
      "🔐 Never share your password, access token, or OTP with unofficial bots.",
      {
        reply_markup: new InlineKeyboard()
          .text("📖 View Instructions", "instructions")
          .row()
          .text("⬅️ Main Menu", "home")
      }
    );
  });

  bot.callbackQuery("instructions", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📖 RECOVERY EMAIL INSTRUCTIONS\n\n" +
      "1. Open Free Fire.\n" +
      "2. Open Settings → Account & Basic.\n" +
      "3. Look for the recovery email option.\n" +
      "4. Follow the verification steps shown in the game.",
      {
        reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home")
      }
    );
  });

  bot.callbackQuery("account", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎮 ACCOUNT MANAGEMENT\n\n" +
      "Use official Free Fire settings to manage your account.\n\n" +
      "This bot does not change account details automatically.",
      {
        reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home")
      }
    );
  });

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "ℹ️ FF ACCOUNT MANAGER HELP\n\n" +
      "Use the buttons to explore available options.\n\n" +
      "🔐 Never submit
