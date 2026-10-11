module.exports = function (bot) {
    bot.command("start", async (ctx) => {
        const user = ctx.from.username
            ? "@" + ctx.from.username
            : ctx.from.first_name;

        const message = `✨ 🌟 WELCOME TO FF ALL IN ONE BOT ✨

😎 User: ${user}
👑 ID: ${ctx.from.id}

🚀 Features:
• 📊 Check Bind Information
• 🔗 Bind Email to Account
• 🔓 Unbind Email
• 🔄 Change Bind Email
• ⚠️ Cancel Bind Request
• 🎁 Convert EAT to Access Token
• 🚫 Revoke Token
• 📧 Send Single Unsubscribe Otp
• ✨ Update Bio Profile

❤️ Premium & Secure Tool

👇 Select an option from below:`;

        await ctx.reply(message);
    });
};FFUid(ctx);
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
