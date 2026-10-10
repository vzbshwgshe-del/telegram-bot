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
    .text("📧 Recovery Email", "recovery")
    .row()
    .text("🎮 Account Management", "account")
    .row()
    .text("ℹ️ Help", "help");

  if (isAdmin) keyboard.row().text("👑 Admin Panel", "admin_panel");

  return keyboard;
}

async function getAdmin(ctx) {
  if (isOwner(ctx)) {
    return {
      isAdmin: true,
      permissions: Object.fromEntries(
        Object.keys(PERMISSIONS).map((key) => [key, true])
      ),
    };
  }

  const result = await pool.query(
    "SELECT permissions FROM bot_admins WHERE telegram_id = $1",
    [String(ctx.from.id)]
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

    if (edit) {
      await ctx.editMessageText(message);
    } else {
      await ctx.reply(message);
    }

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
    await ctx.editMessageText(message, {
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(message, {
      reply_markup: keyboard,
    });
  }
}

function validTelegramId(value) {
  return /^\d{5,20}$/.test(value);
}

export function registerCommands(bot) {
  // Save Telegram users in PostgreSQL.
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
          ]
        );
      } catch (error) {
        console.error("[users] Save failed:", error.message);
      }
    }

    await next();
  });

  // Main menu.
  bot.command("start", async (ctx) => {
    const admin = await getAdmin(ctx);

    await ctx.reply(
      `🔥 FF ACCOUNT MANAGER 🔥\n\nWelcome, ${
        ctx.from.first_name || "Player"
      }!\n\nChoose an option below 👇`,
      {
        reply_markup: mainMenu(admin.isAdmin),
      }
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
        "🔐 Never share passwords, OTPs, or access tokens."
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
    await ctx.reply("✅ Action cancelled.");
  });

  // Open admin panel.
  bot.callbackQuery("admin_panel", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showAdminPanel(ctx, true);
  });

  // Dashboard.
  bot.callbackQuery("dashboard", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!(await allowed(ctx, "view_dashboard"))) {
      await ctx.reply("⛔ Dashboard permission required.");
      return;
    }

    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (
          WHERE first_seen >= CURRENT_DATE
        ) AS joined_today,
        COUNT(*) FILTER (
          WHERE last_seen >= CURRENT_DATE
        ) AS active_today
      FROM bot_users
    `);

    const admins = await pool.query(
      "SELECT COUNT(*) FROM bot_admins"
    );

    const stats = result.rows[0];

    await ctx.reply(
      "📊 ADVANCED DASHBOARD\n\n" +
        `👥 Total users: ${stats.total_users}\n` +
        `🆕 Joined today: ${stats.joined_today}\n` +
        `🟢 Active today: ${stats.active_today}\n` +
        `🛡️ Admins: ${admins.rows[0].count}`
    );
  });

  // Search user.
  bot.callbackQuery("user_search", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!(await allowed(ctx, "view_users"))) {
      await ctx.reply("⛔ User search permission required.");
      return;
    }

    pendingActions.set(ctx.from.id, "user_search");

    await ctx.reply(
      "👤 USER SEARCH\n\n" +
        "Send the user's numeric Telegram ID.\n\n" +
        "Send /cancel to stop."
    );
  });

  // Broadcast.
  bot.callbackQuery("broadcast", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!(await allowed(ctx, "broadcast"))) {
      await ctx.reply("⛔ Broadcast permission required.");
      return;
    }

    pendingActions.set(ctx.from.id, "broadcast");

    await ctx.reply(
      "📢 BROADCAST\n\n" +
        "Send the announcement text for registered users.\n\n" +
        "Send /cancel to stop."
    );
  });

  // Add admin.
  bot.callbackQuery("admin_add", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      await ctx.reply("⛔ Only the owner can add admins.");
      return;
    }

    pendingActions.set(ctx.from.id, "admin_add");

    await ctx.reply(
      "➕ Send the new admin's numeric Telegram ID.\n\n" +
        "Send /cancel to stop."
    );
  });

  // Remove admin.
  bot.callbackQuery("admin_remove", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      await ctx.reply("⛔ Only the owner can remove admins.");
      return;
    }

    pendingActions.set(ctx.from.id, "admin_remove");

    await ctx.reply(
      "➖ Send the admin's Telegram ID to remove.\n\n" +
        "Send /cancel to stop."
    );
  });

  // Change permissions.
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
        "view_dashboard\n" +
        "view_users\n" +
        "broadcast\n\n" +
        "Example: 123456789 broadcast off\n\n" +
        "Send /cancel to stop."
    );
  });

  // Admin list.
  bot.callbackQuery("admin_list", async (ctx) => {
    await ctx.answerCallbackQuery();

    if (!isOwner(ctx)) {
      await ctx.reply("⛔ Only the owner can view the admin list.");
      return;
    }

    const result = await pool.query(
      `SELECT telegram_id, permissions
       FROM bot_admins
       ORDER BY added_at DESC
       LIMIT 50`
    );

    if (!result.rowCount) {
      await ctx.reply("No admins have been added yet.");
      return;
    }

    const message = result.rows
      .map((admin) => {
        const enabled = Object.entries(
          admin.permissions || {}
        )
          .filter(([, value]) => value === true)
          .map(([key]) => key);

        return (
          `🛡️ ID: ${admin.telegram_id}\n` +
          `Permissions: ${enabled.join(", ") || "None"}`
        );
      })
      .join("\n\n");

    await ctx.reply("📋 ADMIN LIST\n\n" + message);
  });

  // Process pending text actions.
  bot.on("message:text", async (ctx, next) => {
    const action = pendingActions.get(ctx.from.id);

    if (!action || ctx.message.text.startsWith("/")) {
      await next();
      return;
    }

    // Owner-only actions.
    if (
      [
        "admin_add",
        "admin_remove",
        "admin_permissions",
      ].includes(action) &&
      !isOwner(ctx)
    ) {
      pendingActions.delete(ctx.from.id);
      await ctx.reply("⛔ Only the owner can perform this action.");
      return;
    }

    // Search registered user.
    if (action === "user_search") {
      if (!(await allowed(ctx, "view_users"))) {
        pendingActions.delete(ctx.from.id);
        await ctx.reply("⛔ Permission denied.");
        return;
      }

      const id = ctx.message.text.trim();

      if (!validTelegramId(id)) {
        await ctx.reply(
          "Enter a valid numeric Telegram ID, or /cancel."
        );
        return;
      }

      const result = await pool.query(
        `SELECT telegram_id, username, first_name, first_seen, last_seen
         FROM bot_users
         WHERE telegram_id = $1`,
        [id]
      );

      pendingActions.delete(ctx.from.id);

      if (!result.rowCount) {
        await ctx.reply("❌ User not found.");
        return;
      }

      const user = result.rows[0];

      await ctx.reply(
        "👤 USER INFORMATION\n\n" +
          `ID: ${user.telegram_id}\n` +
          `Name: ${user.first_name}\n` +
          `Username: ${
            user.username ? "@" + user.username : "Not set"
          }\n` +
          `First seen: ${new Date(
            user.first_seen
          ).toLocaleString()}\n` +
          `Last active: ${new Date(
            user.last_seen
          ).toLocaleString()}`
      );

      return;
    }

    // Add admin.
    if (action === "admin_add") {
      const id = ctx.message.text.trim();

      if (!validTelegramId(id)) {
        await ctx.reply(
          "Enter a valid numeric Telegram ID, or /cancel."
        );
        return;
      }

      if (id === OWNER_ID) {
        pendingActions.delete(ctx.from.id);
        await ctx.reply("The owner is already protected.");
        return;
      }

      const result = await pool.query(
        `INSERT INTO bot_admins (telegram_id, permissions)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (telegram_id) DO NOTHING
         RETURNING telegram_id`,
        [
          id,
          JSON.stringify({
            view_dashboard: true,
            view_users: true,
            broadcast: false,
          }),
        ]
      );

      pendingActions.delete(ctx.from.id);

      await ctx.reply(
        result.rowCount
          ? `✅ Admin ${id} added with default permissions.`
          : `ℹ️ ${id} is already an admin.`
      );

      return;
    }

    // Remove admin.
    if (action === "admin_remove") {
      const id = ctx.message.text.trim();

      if (!validTelegramId(id)) {
        await ctx.reply(
          "Enter a valid numeric Telegram ID, or /cancel."
        );
        return;
      }

      if (id === OWNER_ID) {
        pendingActions.delete(ctx.from.id);
        await ctx.reply("⛔ The owner cannot be removed.");
        return;
      }

      const result = await pool.query(
        `DELETE FROM bot_admins
         WHERE telegram_id = $1
         RETURNING telegram_id`,
        [id]
      );

      pendingActions.delete(ctx.from.id);

      await ctx.reply(
        result.rowCount
          ? `✅ Admin ${id} removed.`
          : "That ID is not an admin."
      );

      return;
    }

    // Update admin permission.
    if (action === "admin_permissions") {
      const [id, permission, value] =
        ctx.message.text.trim().split(/\s+/);

      if (
        !validTelegramId(id || "") ||
        !Object.hasOwn(PERMISSIONS, permission) ||
        !["on", "off"].includes(value)
      ) {
        await ctx.reply(
          "Invalid format.\n" +
            "Example: 123456789 broadcast off\n\n" +
            "Try again or /cancel."
        );
        return;
      }

      if (id === OWNER_ID) {
        pendingActions.delete(ctx.from.id);
        await ctx.reply(
          "⛔ Owner permissions cannot be changed."
        );
        return;
      }

      const existing = await pool.query(
        "SELECT permissions FROM bot_admins WHERE telegram_id = $1",
        [id]
      );

      if (!existing.rowCount) {
        await ctx.reply(
          "That ID is not an admin. Try again or /cancel."
        );
        return;
      }

      const permissions = {
        ...existing.rows[0].permissions,
        [permission]: value === "on",
      };

      await pool.query(
        `UPDATE bot_admins
         SET permissions = $1::jsonb
         WHERE telegram_id = $2`,
        [JSON.stringify(permissions), id]
      );

      pendingActions.delete(ctx.from.id);

      await ctx.reply(
        `✅ Permission updated.\nAdmin: ${id}\n${permission}: ${value}`
      );

      return;
    }

    // Send broadcast.
    if (action === "broadcast") {
      if (!(await allowed(ctx, "broadcast"))) {
        pendingActions.delete(ctx.from.id);
        await ctx.reply("⛔ Permission denied.");
        return;
      }

      const message = ctx.message.text.trim();

      if (!message) {
        await ctx.reply(
          "Message cannot be empty. Or /cancel."
        );
        return;
      }

      pendingActions.delete(ctx.from.id);

      const users = await pool.query(
        "SELECT telegram_id FROM bot_users"
      );

      let sent = 0;
      let failed = 0;

      await ctx.reply(
        `📢 Sending to ${users.rowCount} registered users...`
      );

      for (const user of users.rows) {
        try {
          await bot.api.sendMessage(
            user.telegram_id,
            message
          );
          sent++;
        } catch (error) {
          failed++;
          console.error(
            "[broadcast] Send failed:",
            user.telegram_id,
            error.message
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 50)
        );
      }

      await ctx.reply(
        "📢 BROADCAST COMPLETE\n\n" +
          `✅ Sent: ${sent}\n` +
          `❌ Failed: ${failed}`
      );

      return;
    }

    pendingActions.delete(ctx.from.id);
    await next();
  });

  // Recovery email.
  bot.callbackQuery("recovery", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📧 RECOVERY EMAIL\n\n" +
        "Manage your recovery email through the official game's settings.\n\n" +
        "🔐 Never share your password, OTP, or access token.",
      {
        reply_markup: new InlineKeyboard()
          .text("📖 Instructions", "instructions")
          .row()
          .text("⬅️ Main Menu", "home"),
      }
    );
  });

  // Instructions.
  bot.callbackQuery("instructions", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📖 INSTRUCTIONS\n\n" +
        "1. Open Free Fire.\n" +
        "2. Open Settings → Account & Basic.\n" +
        "3. Check the available recovery options.\n" +
        "4. Follow the official verification steps.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home"),
      }
    );
  });

  // Account management.
  bot.callbackQuery("account", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎮 ACCOUNT MANAGEMENT\n\n" +
        "Manage your account through official game settings.\n\n" +
        "This bot does not modify game account details.\n\n" +
        "🔐 Never share passwords, OTPs, or access tokens.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home"),
      }
    );
  });

  // Help menu.
  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "ℹ️ HELP\n\n" +
        "/start — Main menu\n" +
        "/help — Help\n" +
        "/ping — Bot status\n" +
        "/admin — Admin panel\n" +
        "/cancel — Cancel an active action\n\n" +
        "Never share passwords, OTPs, or access tokens.",
      {
        reply_markup: new InlineKeyboard()
          .text("⬅️ Main Menu", "home"),
      }
    );
  });

  // Return to main menu.
  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery();

    const admin = await getAdmin(ctx);

    await ctx.editMessageText(
      "🔥 FF ACCOUNT MANAGER 🔥\n\nChoose an option below 👇",
      {
        reply_markup: mainMenu(admin.isAdmin),
      }
    );
  });
  }  await pool.query(
        `INSERT INTO bot_admins (telegram_id, permissions)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (telegram_id) DO NOTHING`,
        [
          id,
          JSON.stringify({
            view_dashboard: true,
            view_users: true,
            broadcast: false,
          }),
        ]
      );

      pendingActions.delete(ctx.from.id);
      return ctx.reply(`✅ Admin ${id} added with default permissions.`);
    }

    if (action === "admin_remove") {
      const id = ctx.message.text.trim();

      if (!/^\d+$/.test(id)) {
        return ctx.reply("Enter a numeric Telegram ID, or /cancel.");
      }

      if (id === OWNER_ID) {
        pendingActions.delete(ctx.from.id);
        return ctx.reply("⛔ The owner cannot be removed.");
      }

      const result = await pool.query(
        "DELETE FROM bot_admins WHERE telegram_id = $1",
        [id]
      );

      pendingActions.delete(ctx.from.id);

      return ctx.reply(
        result.rowCount
          ? `✅ Admin ${id} removed.`
          : "That ID is not an admin."
      );
    }

    if (action === "admin_permissions") {
      const [id, permission, value] = ctx.message.text.trim().split(/\s+/);

      if (
        !/^\d+$/.test(id || "") ||
        !Object.hasOwn(PERMISSIONS, permission) ||
        !["on", "off"].includes(value)
      ) {
        return ctx.reply(
          "Invalid format.\nExample: 123456789 broadcast off\n\nOr /cancel."
        );
      }

      if (id === OWNER_ID) {
        pendingActions.delete(ctx.from.id);
        return ctx.reply("⛔ Owner permissions cannot be changed.");
      }

      const existing = await pool.query(
        "SELECT permissions FROM bot_admins WHERE telegram_id = $1",
        [id]
      );

      if (!existing.rowCount) {
        return ctx.reply("That ID is not an admin. Try again or /cancel.");
      }

      const permissions = {
        ...existing.rows[0].permissions,
        [permission]: value === "on",
      };

      await pool.query(
        "UPDATE bot_admins SET permissions = $1::jsonb WHERE telegram_id = $2",
        [JSON.stringify(permissions), id]
      );

      pendingActions.delete(ctx.from.id);

      return ctx.reply(
        `✅ Permission updated.\nAdmin: ${id}\n${permission}: ${value}`
      );
    }

    if (action === "broadcast") {
      if (!(await allowed(ctx, "broadcast"))) {
        pendingActions.delete(ctx.from.id);
        return ctx.reply("⛔ Permission denied.");
      }

      const message = ctx.message.text.trim();

      if (!message) {
        return ctx.reply("Message cannot be empty. Or /cancel.");
      }

      pendingActions.delete(ctx.from.id);

      const result = await pool.query(
        "SELECT telegram_id FROM bot_users"
      );

      let sent = 0;
      let failed = 0;

      await ctx.reply(`📢 Sending to ${result.rowCount} registered users...`);

      for (const user of result.rows) {
        try {
          await bot.api.sendMessage(user.telegram_id, message);
          sent++;
        } catch (error) {
          failed++;
          console.error(
            "[broadcast] Send failed for user:",
            user.telegram_id,
            error.message
          );
        }

        // Avoid sending too quickly.
        await new Promise((resolve) => setTimeout(resolve, 40));
      }

      return ctx.reply(
        "📢 BROADCAST COMPLETE\n\n" +
        `✅ Sent: ${sent}\n` +
        `❌ Failed: ${failed}`
      );
    }

    pendingActions.delete(ctx.from.id);
    return next();
  });

  // Recovery email instructions.
  bot.callbackQuery("recovery", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📧 RECOVERY EMAIL\n\n" +
      "Manage your recovery email through the official game's settings.\n\n" +
      "🔐 Never share your password, OTP, or access token.",
      {
        reply_markup: new InlineKeyboard()
          .text("📖 Instructions", "instructions")
          .row()
          .text("⬅️ Main Menu", "home"),
      }
    );
  });

  bot.callbackQuery("instructions", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📖 INSTRUCTIONS\n\n" +
      "1. Open Free Fire.\n" +
      "2. Open Settings → Account & Basic.\n" +
      "3. Look for the available recovery options.\n" +
      "4. Follow the official verification steps.",
      { reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home") }
    );
  });

  bot.callbackQuery("account", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎮 ACCOUNT MANAGEMENT\n\n" +
      "Manage your account through official game settings.\n\n" +
      "This bot does not modify game account details.\n\n" +
      "🔐 Never share passwords, OTPs, or access tokens.",
      { reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home") }
    );
  });

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "ℹ️ HELP\n\n" +
      "/start — Main menu\n" +
      "/help — Help\n" +
      "/ping — Bot status\n" +
      "/admin — Admin panel\n\n" +
      "Use /cancel to stop an active admin action.\n\n" +
      "Never share passwords, OTPs, or access tokens.",
      { reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home") }
    );
  });

  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery();

    const admin = await getAdmin(ctx);

    await ctx.editMessageText(
      "🔥 FF ACCOUNT MANAGER 🔥\n\nChoose an option below 👇",
      { reply_markup: mainMenu(ctx, admin.isAdmin) }
    );
  });
    }  await pool.query(
        `INSERT INTO bot_admins (telegram_id, permissions)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (telegram_id) DO NOTHING`,
        [
          id,
          JSON.stringify({
            view_dashboard: true,
            view_users: true,
            broadcast: false,
          }),
        ]
      );

      pendingActions.delete(ctx.from.id);
      return ctx.reply(`✅ Admin ${id} added with default permissions.`);
    }

    if (action === "admin_remove") {
      const id = ctx.message.text.trim();

      if (!/^\d+$/.test(id)) {
        return ctx.reply("Enter a numeric Telegram ID, or /cancel.");
      }

      if (id === OWNER_ID) {
        pendingActions.delete(ctx.from.id);
        return ctx.reply("⛔ The owner cannot be removed.");
      }

      const result = await pool.query(
        "DELETE FROM bot_admins WHERE telegram_id = $1",
        [id]
      );

      pendingActions.delete(ctx.from.id);

      return ctx.reply(
        result.rowCount
          ? `✅ Admin ${id} removed.`
          : "That ID is not an admin."
      );
    }

    if (action === "admin_permissions") {
      const [id, permission, value] = ctx.message.text.trim().split(/\s+/);

      if (
        !/^\d+$/.test(id || "") ||
        !Object.hasOwn(PERMISSIONS, permission) ||
        !["on", "off"].includes(value)
      ) {
        return ctx.reply(
          "Invalid format.\nExample: 123456789 broadcast off\n\nOr /cancel."
        );
      }

      if (id === OWNER_ID) {
        pendingActions.delete(ctx.from.id);
        return ctx.reply("⛔ Owner permissions cannot be changed.");
      }

      const existing = await pool.query(
        "SELECT permissions FROM bot_admins WHERE telegram_id = $1",
        [id]
      );

      if (!existing.rowCount) {
        return ctx.reply("That ID is not an admin. Try again or /cancel.");
      }

      const permissions = {
        ...existing.rows[0].permissions,
        [permission]: value === "on",
      };

      await pool.query(
        "UPDATE bot_admins SET permissions = $1::jsonb WHERE telegram_id = $2",
        [JSON.stringify(permissions), id]
      );

      pendingActions.delete(ctx.from.id);

      return ctx.reply(
        `✅ Permission updated.\nAdmin: ${id}\n${permission}: ${value}`
      );
    }

    if (action === "broadcast") {
      if (!(await allowed(ctx, "broadcast"))) {
        pendingActions.delete(ctx.from.id);
        return ctx.reply("⛔ Permission denied.");
      }

      const message = ctx.message.text.trim();

      if (!message) {
        return ctx.reply("Message cannot be empty. Or /cancel.");
      }

      pendingActions.delete(ctx.from.id);

      const result = await pool.query(
        "SELECT telegram_id FROM bot_users"
      );

      let sent = 0;
      let failed = 0;

      await ctx.reply(`📢 Sending to ${result.rowCount} registered users...`);

      for (const user of result.rows) {
        try {
          await bot.api.sendMessage(user.telegram_id, message);
          sent++;
        } catch (error) {
          failed++;
          console.error(
            "[broadcast] Send failed for user:",
            user.telegram_id,
            error.message
          );
        }

        // Avoid sending too quickly.
        await new Promise((resolve) => setTimeout(resolve, 40));
      }

      return ctx.reply(
        "📢 BROADCAST COMPLETE\n\n" +
        `✅ Sent: ${sent}\n` +
        `❌ Failed: ${failed}`
      );
    }

    pendingActions.delete(ctx.from.id);
    return next();
  });

  // Recovery email instructions.
  bot.callbackQuery("recovery", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📧 RECOVERY EMAIL\n\n" +
      "Manage your recovery email through the official game's settings.\n\n" +
      "🔐 Never share your password, OTP, or access token.",
      {
        reply_markup: new InlineKeyboard()
          .text("📖 Instructions", "instructions")
          .row()
          .text("⬅️ Main Menu", "home"),
      }
    );
  });

  bot.callbackQuery("instructions", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "📖 INSTRUCTIONS\n\n" +
      "1. Open Free Fire.\n" +
      "2. Open Settings → Account & Basic.\n" +
      "3. Look for the available recovery options.\n" +
      "4. Follow the official verification steps.",
      { reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home") }
    );
  });

  bot.callbackQuery("account", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "🎮 ACCOUNT MANAGEMENT\n\n" +
      "Manage your account through official game settings.\n\n" +
      "This bot does not modify game account details.\n\n" +
      "🔐 Never share passwords, OTPs, or access tokens.",
      { reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home") }
    );
  });

  bot.callbackQuery("help", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      "ℹ️ HELP\n\n" +
      "/start — Main menu\n" +
      "/help — Help\n" +
      "/ping — Bot status\n" +
      "/admin — Admin panel\n\n" +
      "Use /cancel to stop an active admin action.\n\n" +
      "Never share passwords, OTPs, or access tokens.",
      { reply_markup: new InlineKeyboard().text("⬅️ Main Menu", "home") }
    );
  });

  bot.callbackQuery("home", async (ctx) => {
    await ctx.answerCallbackQuery();

    const admin = await getAdmin(ctx);

    await ctx.editMessageText(
      "🔥 FF ACCOUNT MANAGER 🔥\n\nChoose an option below 👇",
      { reply_markup: mainMenu(ctx, admin.isAdmin) }
    );
  });
    }      "3. Look for the recovery email option.\n" +
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
