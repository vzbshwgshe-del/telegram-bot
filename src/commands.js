import { InlineKeyboard } from "grammy";
import { pool } from "./database.js";

// Main Menu
export function mainMenu(isAdmin = false) {
  const keyboard = new InlineKeyboard()
    .text("🔍 Profile Checker", "player_stats")
    .row()
    .text("👤 Account Related", "account_tools")
    .row()
    .text("ℹ️ Help", "help");

  if (isAdmin) {
    keyboard.row().text("🛠️ Admin Panel", "admin_panel");
  }

  return keyboard;
}
// Account Related Menu
export function accountRelatedMenu() {
  return new InlineKeyboard()
    .text("📧 Bind Email", "bind_email")
    .row()
    .text("🔄 Change Bind Email", "change_bind_email")
    .row()
    .text("❌ Remove Bind Email", "remove_bind_email")
    .row()
    .text("🚫 Account Unban", "account_unban")
    .row()
    .text("🔒 Account Ban", "account_ban")
    .row()
    .text("🔑 FF Token Manager", "ff_token_manager")
    .row()
    .text("⬅️ Main Menu", "home");
}
// Check whether a user is an admin
async function isAdmin(userId) {
  try {
    const result = await pool.query(
      "SELECT telegram_id FROM bot_admins WHERE telegram_id = $1",
      [String(userId)]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error("Admin check failed:", error.message);
    return false;
  }
}
// Home / Main Menu
export async function handleHome(ctx) {
  const userId = ctx.from?.id;

  if (!userId) {
    return;
  }

  const admin = await isAdmin(userId);

  await ctx.reply(
    "🏠 Welcome!\n\nChoose an option below:",
    {
      reply_markup: mainMenu(admin),
    }
  );
}

// Profile Checker
export async function handlePlayerStats(ctx) {
  await ctx.reply(
    "🔍 Profile Checker\n\n" +
      "This feature is not configured yet.\n\n" +
      "To check player profiles, an authorized and supported stats API must be connected.\n\n" +
      "⚠️ No player statistics will be displayed until the API is configured.",
    {
      reply_markup: new InlineKeyboard()
        .text("⬅️ Main Menu", "home"),
    }
  );
}

// Account Related
export async function handleAccountTools(ctx) {
  await ctx.reply(
    "👤 Account Related\n\n" +
      "Choose an account-related option below.\n\n" +
      "Note: These actions are not automated yet.",
    {
      reply_markup: accountRelatedMenu(),
    }
  );
}

// Bind Email
export async function handleBindEmail(ctx) {
  await ctx.reply(
    "📧 Bind Email\n\n" +
      "To bind an email, open your game's official settings and follow its account-binding instructions.\n\n" +
      "🔐 Security Reminder:\n" +
      "Never share your password, OTP, or login token with anyone.",
    {
      reply_markup: new InlineKeyboard()
        .text("⬅️ Account Related", "account_tools")
        .row()
        .text("🏠 Main Menu", "home"),
    }
  );
}

// Change Bind Email
export async function handleChangeBindEmail(ctx) {
  await ctx.reply(
    "🔄 Change Bind Email\n\n" +
      "This feature is coming soon.\n\n" +
      "It requires a supported, authorized account-management API. Until then, use the game's official account settings or support service.",
    {
      reply_markup: new InlineKeyboard()
        .text("⬅️ Account Related", "account_tools")
        .row()
        .text("🏠 Main Menu", "home"),
    }
  );
}

// Remove Bind Email
export async function handleRemoveBindEmail(ctx) {
  await ctx.reply(
    "❌ Remove Bind Email\n\n" +
      "This feature is coming soon.\n\n" +
      "Email removal must be supported by the game's official account-management system. Please use the official settings or support service.",
    {
      reply_markup: new InlineKeyboard()
        .text("⬅️ Account Related", "account_tools")
        .row()
        .text("🏠 Main Menu", "home"),
    }
  );
}

// Account Unban
export async function handleAccountUnban(ctx) {
  await ctx.reply(
    "🚫 Account Unban\n\n" +
      "This feature is coming soon.\n\n" +
      "If your account has been banned, submit an appeal through the game's official support service.\n\n" +
      "⚠️ No unban action is performed by this bot.",
    {
      reply_markup: new InlineKeyboard()
        .text("⬅️ Account Related", "account_tools")
        .row()
        .text("🏠 Main Menu", "home"),
    }
  );
}

// Account Ban
export async function handleAccountBan(ctx) {
  await ctx.reply(
    "🔒 Account Ban\n\n" +
      "This feature is not implemented.\n\n" +
      "The bot cannot ban or modify game accounts.",
    {
      reply_markup: new InlineKeyboard()
        .text("⬅️ Account Related", "account_tools")
        .row()
        .text("🏠 Main Menu", "home"),
    }
  );
}

// Help
export async function handleHelp(ctx) {
  await ctx.reply(
    "ℹ️ Help\n\n" +
      "🔍 Profile Checker — Check player profiles when an authorized stats API is configured.\n\n" +
      "👤 Account Related — View email-binding and account-support options.\n\n" +
      "🛠️ Admin Panel — Available to authorized bot administrators.\n\n" +
      "🔐 Never share your passwords, OTPs, or login tokens.",
    {
      reply_markup: new InlineKeyboard()
        .text("🏠 Main Menu", "home"),
    }
  );
}
// FF Token Manager
const FF_OWNER_ID = "6683322520";
const pendingFFUid = new Set();

function ffTokenMenu() {
  return new InlineKeyboard()
    .text("💾 Save FF UID", "ff_save_uid")
    .row()
    .text("👁️ View Saved Account", "ff_view_account")
    .row()
    .text("🗑️ Delete Saved Account", "ff_delete_account")
    .row()
    .text("⬅️ Account Related", "account_tools");
}

async function handleFFTokenManager(ctx) {
  if (String(ctx.from.id) !== FF_OWNER_ID) {
    await ctx.reply("⛔ This feature is private.");
    return;
  }

  await ctx.reply("🔑 FF Token Manager\n\nChoose an option:", {
    reply_markup: ffTokenMenu()
  });
}

async function handleSaveFFUid(ctx) {
  if (String(ctx.from.id) !== FF_OWNER_ID) {
    await ctx.reply("⛔ This feature is private.");
    return;
  }

  pendingFFUid.add(ctx.from.id);

  await ctx.reply(
    "Enter your Free Fire UID.\n\n" +
    "Send /cancel to cancel."
  );
}

async function handleViewFFAccount(ctx) {
  if (String(ctx.from.id) !== FF_OWNER_ID) {
    await ctx.reply("⛔ This feature is private.");
    return;
  }

  try {
    const result = await pool.query(
      `SELECT ff_uid, updated_at
       FROM ff_accounts
       WHERE telegram_id = $1`,
      [String(ctx.from.id)]
    );

    if (result.rows.length === 0) {
      await ctx.reply("No saved Free Fire account found.", {
        reply_markup: ffTokenMenu()
      });
      return;
    }

    const account = result.rows[0];

    await ctx.reply(
      `👤 Saved Free Fire Account\n\n` +
      `UID: ${account.ff_uid}\n` +
      `Updated: ${new Date(account.updated_at).toLocaleString()}`,
      { reply_markup: ffTokenMenu() }
    );
  } catch (error) {
    console.error("FF account lookup failed:", error.message);
    await ctx.reply("❌ Could not retrieve your account.");
  }
}

async function handleDeleteFFAccount(ctx) {
  if (String(ctx.from.id) !== FF_OWNER_ID) {
    await ctx.reply("⛔ This feature is private.");
    return;
  }

  try {
    await pool.query(
      "DELETE FROM ff_accounts WHERE telegram_id = $1",
      [String(ctx.from.id)]
    );

    await ctx.reply("✅ Saved account record deleted.", {
      reply_markup: ffTokenMenu()
    });
  } catch (error) {
    console.error("FF account deletion failed:", error.message);
    await ctx.reply("❌ Could not delete the account.");
  }
}
// Register command and callback handlers
export function registerCommandHandlers(bot) {
  bot.command("start", handleHome);
  bot.command("menu", handleHome);

  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleHome(ctx);
  });

  bot.callbackQuery("player_stats", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handlePlayerStats(ctx);
  });

  bot.callbackQuery("account_tools", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAccountTools(ctx);
  });

  bot.callbackQuery("bind_email", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleBindEmail(ctx);
  });

  bot.callbackQuery("change_bind_email", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleChangeBindEmail(ctx);
  });

  bot.callbackQuery("remove_bind_email", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleRemoveBindEmail(ctx);
  });

  bot.callbackQuery("account_unban", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAccountUnban(ctx);
  });

  bot.callbackQuery("account_ban", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAccountBan(ctx);
  });

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleHelp(ctx);
  });
}
// Compatibility with index.js
export function registerCommands(bot) {
  registerCommandHandlers(bot);
    // Handle FF UID input
  bot.command("cancel", async (ctx) => {
    if (String(ctx.from.id) !== FF_OWNER_ID) return;

    pendingFFUid.delete(ctx.from.id);
    await ctx.reply("❌ Operation cancelled.");
  });

  bot.on("message:text", async (ctx, next) => {
    if (String(ctx.from.id) !== FF_OWNER_ID) {
      return next();
    }

    if (!pendingFFUid.has(ctx.from.id)) {
      return next();
    }

    const uid = ctx.message.text.trim();

    if (uid.startsWith("/")) {
      return next();
    }

    if (!/^\d{5,20}$/.test(uid)) {
      await ctx.reply(
        "❌ Invalid UID. Enter a numeric UID containing 5–20 digits, or send /cancel."
      );
      return;
    }

    pendingFFUid.delete(ctx.from.id);

    await ctx.reply(
      "✅ UID received: " + uid +
      "\n\nThe UID has been validated, but it has not been saved yet."
    );
  });
    // FF Token Manager callbacks
  bot.callbackQuery("ff_token_manager", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleFFTokenManager(ctx);
  });

  bot.callbackQuery("ff_save_uid", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleSaveFFUid(ctx);
  });

  bot.callbackQuery("ff_view_account", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleViewFFAccount(ctx);
  });

  bot.callbackQuery("ff_delete_account", async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleDeleteFFAccount(ctx);
  });
  // Admin Panel
bot.callbackQuery("admin_panel", async (ctx) => {
  await ctx.answerCallbackQuery();

  const admin = await isAdmin(ctx.from.id);

  if (!admin) {
    await ctx.reply("⛔ You are not authorized to access the Admin Panel.");
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("👥 Total Users", "admin_total_users")
    .row()
    .text("🕒 Recent Users", "admin_recent_users")
    .row()
    .text("⬅️ Main Menu", "home");

  await ctx.reply("🛠️ Admin Panel\n\nSelect an option:", {
    reply_markup: keyboard
  });
});

// Total Users
bot.callbackQuery("admin_total_users", async (ctx) => {
  await ctx.answerCallbackQuery();

  if (!(await isAdmin(ctx.from.id))) {
    await ctx.reply("⛔ Access denied.");
    return;
  }

  try {
    const result = await pool.query(
      "SELECT COUNT(*) AS total FROM bot_users"
    );

    await ctx.reply(`👥 Total registered users: ${result.rows[0].total}`);
  } catch (error) {
    console.error("Total users error:", error.message);
    await ctx.reply("❌ Could not retrieve the user count.");
  }
});

// Recent Users
bot.callbackQuery("admin_recent_users", async (ctx) => {
  await ctx.answerCallbackQuery();

  if (!(await isAdmin(ctx.from.id))) {
    await ctx.reply("⛔ Access denied.");
    return;
  }

  try {
    const result = await pool.query(
      `SELECT telegram_id, username, first_name, last_seen
       FROM bot_users
       ORDER BY last_seen DESC
       LIMIT 10`
    );

    if (result.rows.length === 0) {
      await ctx.reply("No users have been registered yet.");
      return;
    }

    const list = result.rows.map((user, index) => {
      const username = user.username ? `@${user.username}` : user.first_name;
      return `${index + 1}. ${username} — ${new Date(user.last_seen).toLocaleString()}`;
    });

    await ctx.reply("🕒 Recent Users\n\n" + list.join("\n"));
  } catch (error) {
    console.error("Recent users error:", error.message);
    await ctx.reply("❌ Could not retrieve recent users.");
  }
});
}
