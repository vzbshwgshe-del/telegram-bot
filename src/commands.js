import { InlineKeyboard } from "grammy";
import { pool } from "./database.js";

const OWNER_ID = 6683322520;

const PERMISSIONS = {
  view_users: "View users",
  view_recent: "View recent users",
  manage_content: "Manage bot content",
};

const mainMenu = new InlineKeyboard()
  .text("📧 Recovery Email", "recovery")
  .row()
  .text("🎮 Account Management", "account")
  .row()
  .text("ℹ️ Help", "help");

function isOwner(ctx) {
  return ctx.from?.id === OWNER_ID;
}

async function isAdmin(ctx) {
  if (isOwner(ctx)) return true;

  const result = await pool.query(
    "SELECT telegram_id FROM bot_admins WHERE telegram_id = $1",
    [String(ctx.from?.id)]
  );

  return result.rowCount > 0;
}

async function hasPermission(ctx, permission) {
  if (isOwner(ctx)) return true;

  const result = await pool.query(
    "SELECT permissions FROM bot_admins WHERE telegram_id = $1",
    [String(ctx.from?.id)]
  );

  return result.rowCount > 0 &&
    result.rows[0].permissions?.[permission] === true;
}

async function showAdminPanel(ctx, edit = false) {
  if (!(await isAdmin(ctx))) {
    const message = "⛔ You are not authorized to access the admin panel.";
    if (edit) await ctx.editMessageText(message);
    else await ctx.reply(message);
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("👥 Total Users", "admin_users")
    .row()
    .text("📋 Recent Users", "admin_recent");

  if (isOwner(ctx)) {
    keyboard
      .row()
      .text("➕ Add Admin", "admin_add")
      .row()
      .text("➖ Remove Admin", "admin_remove")
      .row()
      .text("🔐 Manage Permissions", "admin_permissions");
  }

  keyboard.row().text("⬅️ Main Menu", "home");

  const message = "👑 ADMIN PANEL\n\nChoose an option:";

  if (edit) await ctx.editMessageText(message, { reply_markup: keyboard });
  else await ctx.reply(message, { reply_markup: keyboard });
}

export function registerCommands(bot) {
  // Save each user's information in PostgreSQL.
  bot.use(async (ctx, next) => {
    if (ctx.from) {
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
          ]
        );
      } catch (error) {
        console.error("[users] Failed to save user:", error.message);
      }
    }

    await next();
  });

  bot.command("start", async (ctx) => {
    const keyboard = mainMenu.clone();

    if (await isAdmin(ctx)) {
      keyboard.row().text("👑 Admin Panel", "admin_panel");
    }

    await ctx.reply(
      `🔥 FF ACCOUNT MANAGER 🔥\n\nWelcome, ${ctx.from?.first_name || "Player"}!\n\nChoose an option below 👇`,
      { reply_markup: keyboard }
    );
  });

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

  bot.command("ping", async (ctx) => {
    await ctx.reply("✅ FF Account Manager is online!");
  });

  bot.command("admin", async (ctx) => {
    await showAdminPanel(ctx);
  });

  bot.callbackQuery("admin_panel", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showAdminPanel(ctx, true);
  });

  bot.callbackQuery("admin_users", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!(await hasPermission(ctx, "view_users"))) {
      return ctx.reply("⛔ You don't have permission to view users.");
    }

    const result = await pool.query("SELECT COUNT(*) FROM bot_users");
    await ctx.reply(`👥 Total recorded users: ${result.rows[0].count}`);
  });

  bot.callbackQuery("admin_recent", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!(await hasPermission(ctx, "view_recent"))) {
      return ctx.reply("⛔ You don't have permission to view recent users.");
    }

    const result = await pool.query(
      `SELECT telegram_id, username, first_name, last_seen
       FROM bot_users
       ORDER BY last_seen DESC
       LIMIT 10`
    );

    if (result.rowCount === 0) {
      return ctx.reply("No users have been recorded yet.");
    }

    const message = result.rows.map((user) =>
      `👤 ${user.first_name}\n` +
      `🆔 ${user.telegram_id}\n` +
      `Username: ${user.username ? "@" + user.username : "Not set"}\n` +
      `Last active: ${new Date(user.last_seen).toLocaleString()}`
    ).join("\n\n");

    await ctx.reply("📋 RECENT USERS\n\n" + message);
  });

  // Only the owner can add admins.
  bot.callbackQuery("admin_add", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      return ctx.reply("⛔ Only the owner can add admins.");
    }

    await ctx.reply(
      "➕ ADD ADMIN\n\nSend the Telegram numeric ID of the person to add.\n\n" +
      "Example: /addadmin 123456789"
    );
  });

  bot.command("addadmin", async (ctx) => {
    if (!isOwner(ctx)) {
      return ctx.reply("⛔ Only the owner can add admins.");
    }

    const id = ctx.match?.trim();

    if (!id || !/^\d+$/.test(id)) {
      return ctx.reply("Usage: /addadmin TELEGRAM_ID");
    }

    if (id === String(OWNER_ID)) {
      return ctx.reply("The owner is already permanently protected.");
    }

    await pool.query(
      `INSERT INTO bot_admins (telegram_id, permissions)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (telegram_id) DO NOTHING`,
      [
        id,
        JSON.stringify({
          view_users: true,
          view_recent: true,
          manage_content: false,
        }),
      ]
    );

    await ctx.reply(
      `✅ Admin ${id} has been added.\n\n` +
      "Default permissions: view users and recent users.\n" +
      "Use /permissions to see permission commands."
    );
  });

  // Only the owner can remove admins.
  bot.callbackQuery("admin_remove", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      return ctx.reply("⛔ Only the owner can remove admins.");
    }

    await ctx.reply(
      "➖ REMOVE ADMIN\n\nSend:\n/removeadmin TELEGRAM_ID"
    );
  });

  bot.command("removeadmin", async (ctx) => {
    if (!isOwner(ctx)) {
      return ctx.reply("⛔ Only the owner can remove admins.");
    }

    const id = ctx.match?.trim();

    if (!id || !/^\d+$/.test(id)) {
      return ctx.reply("Usage: /removeadmin TELEGRAM_ID");
    }

    if (id === String(OWNER_ID)) {
      return ctx.reply("⛔ The owner cannot be removed.");
    }

    const result = await pool.query(
      "DELETE FROM bot_admins WHERE telegram_id = $1",
      [id]
    );

    await ctx.reply(
      result.rowCount
        ? `✅ Admin ${id} has been removed.`
        : "That ID is not an admin."
    );
  });

  // Only the owner can change admin permissions.
  bot.callbackQuery("admin_permissions", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      return ctx.reply("⛔ Only the owner can change permissions.");
    }

    await ctx.reply(
      "🔐 PERMISSIONS\n\n" +
      "Use:\n/setpermission TELEGRAM_ID PERMISSION on|off\n\n" +
      "Permissions:\n" +
      Object.entries(PERMISSIONS)
        .map(([key, label]) => `${key} — ${label}`)
        .join("\n") +
      "\n\nExample:\n/setpermission 123456789 view_users off"
    );
  });

  bot.command("permissions", async (ctx) => {
    if (!isOwner(ctx)) {
      return ctx.reply("⛔ Only the owner can change permissions.");
    }

    await ctx.reply(
      "Permissions:\n" +
      Object.entries(PERMISSIONS)
        .map(([key, label]) => `${key} — ${label}`)
        .join("\n") +
      "\n\nExample:\n/setpermission 123456789 view_users off"
    );
  });

  bot.command("setpermission", async (ctx) => {
    if (!isOwner(ctx)) {
      return ctx.reply("⛔ Only the owner can change permissions.");
    }

    const parts = ctx.match?.trim().split(/\s+/) || [];
    const [id, permission, value] = parts;

    if (
      !id || !/^\d+$/.test(id) ||
      !Object.hasOwn(PERMISSIONS, permission) ||
      !["on", "off"].includes(value)
    ) {
      return ctx.reply(
        "Usage: /setpermission TELEGRAM_ID PERMISSION on|off\n\n" +
        "Example: /setpermission 123456789 view_users off"
      );
    }

    if (id === String(OWNER_ID)) {
      return ctx.reply("⛔ Owner permissions cannot be changed.");
    }

    const result = await pool.query(
      "SELECT permissions FROM bot_admins WHERE telegram_id = $1",
      [id]
    );

    if (!result.rowCount) {
      return ctx.reply("That ID is not an admin.");
    }

    const permissions = {
      ...result.rows[0].permissions,
      [permission]: value === "on",
    };

    await pool.query(
      "UPDATE bot_admins SET permissions = $1::jsonb WHERE telegram_id = $2",
      [JSON.stringify(permissions), id]
    );

    await ctx.reply(
      `✅ Permission updated.\nAdmin: ${id}\n${permission}: ${value}`
    );
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
          .text("⬅️ Main Menu", "home"),
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
      { reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home") }
    );
  });

  bot.callbackQuery("account", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "🎮 ACCOUNT MANAGEMENT\n\n" +
      "Use official Free Fire settings to manage your account.\n\n" +
      "This bot does not change account details automatically.\n\n" +
      "🔐 Never share passwords, OTPs, or access tokens.",
      { reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home") }
    );
  });

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "ℹ️ FF ACCOUNT MANAGER HELP\n\n" +
      "Use the buttons to explore available options.\n\n" +
      "Commands:\n/start - Main menu\n/help - Help information\n/ping - Check bot status\n\n" +
      "🔐 Never submit passwords, OTPs, or access tokens.",
      { reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home") }
    );
  });

  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery();

    const keyboard = mainMenu.clone();

    if (await isAdmin(ctx)) {
      keyboard.row().text("👑 Admin Panel", "admin_panel");
    }

    await ctx.editMessageText(
      "🔥 FF ACCOUNT MANAGER 🔥\n\nChoose an option to continue 👇",
      { reply_markup: keyboard }
    );
  });
}
