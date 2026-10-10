import { InlineKeyboard } from "grammy";

export function registerCommands(bot) {
  const mainMenu = new InlineKeyboard()
    .text("📧 Recovery Email", "recovery")
    .row()
    .text("🎮 Account Management", "account")
    .row()
    .text("ℹ️ Help", "help");

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🔥 FF ACCOUNT MANAGER 🔥\n\n" +
      "Welcome, " + (ctx.from?.first_name || "Player") + "!\n\n" +
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
      "/ping - Check bot status\n\n" +
      "Select an option from the main menu to get started."
    );
  });

  bot.command("ping", async (ctx) => {
    await ctx.reply("✅ FF Account Manager is online!");
  });

  bot.callbackQuery("recovery", async (ctx) => {
    await ctx.answerCallbackQuery();

    const keyboard = new InlineKeyboard()
      .text("📖 View Instructions", "instructions")
      .row()
      .text("⬅️ Main Menu", "home");

    await ctx.editMessageText(
      "📧 RECOVERY EMAIL\n\n" +
      "Use the official Free Fire game settings to change your recovery email.\n\n" +
      "🔐 Never share your password, access token, or OTP with unofficial bots.",
      { reply_markup: keyboard }
    );
  });

  bot.callbackQuery("instructions", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📖 RECOVERY EMAIL INSTRUCTIONS\n\n" +
      "1. Open Free Fire.\n" +
      "2. Open Settings → Account & Basic.\n" +
      "3. Tap Change beside Recovery Email.\n" +
      "4. Complete the verification steps shown in the game.\n\n" +
      "Your account must complete the verification required by Garena.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home")
      }
    );
  });

  bot.callbackQuery("account", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎮 ACCOUNT MANAGEMENT\n\n" +
      "Use the official Free Fire settings to manage your account.\n\n" +
      "This version provides account-management guidance and does not change account details automatically.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home")
      }
    );
  });

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "ℹ️ FF ACCOUNT MANAGER HELP\n\n" +
      "Use the buttons to explore the available options.\n\n" +
      "🔐 Do not submit your Free Fire access token, password, or OTP.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home")
      }
    );
  });

  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🔥 FF ACCOUNT MANAGER 🔥\n\n" +
      "Welcome back!\n\nChoose an option below 👇",
      { reply_markup: mainMenu }
    );
  });

  // Ignore ordinary text messages instead of echoing them.
  bot.on("message:text", async (ctx) => {
    if (!ctx.message.text.startsWith("/")) {
      await ctx.reply(
        "Please choose an option from the menu.\n\nSend /start to open it."
      );
    }
  });
        }
