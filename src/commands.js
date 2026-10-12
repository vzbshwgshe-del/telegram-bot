import { pool } from "./database.js";

export function registerCommands(bot) {
    const sessions = new Map();

    const mainKeyboard = [
        [{ text: "Bind Info" }, { text: "Bind Email" }],
        [{ text: "Unbind Email" }, { text: "Change Email" }],
        [{ text: "Cancel Bind" }, { text: "EAT to Token" }],
        [{ text: "Revoke Token" }, { text: "How to Use" }],
        [{ text: "Update Bio" }, { text: "Get EAT" }],
        [{ text: "Send Single Unsubscribe Otp" }]
    ];

    const methodKeyboard = [
        [{ text: "Via OTP" }, { text: "Via Sec Code" }],
        [{ text: "Back Menu" }]
    ];

    function setSession(ctx, action, step) {
        sessions.set(ctx.from.id, { action, step });
    }

    function clearSession(ctx) {
        sessions.delete(ctx.from.id);
    }

    async function showMainMenu(ctx, message) {
        clearSession(ctx);

        await ctx.reply(message, {
            reply_markup: {
                keyboard: mainKeyboard,
                resize_keyboard: true
            }
        });
    }

    async function askForToken(ctx, action, title) {
        setSession(ctx, action, "token");

        await ctx.reply(
            `${title}\n\nSend your Access Token:\nOr type /clear`,
            {
                reply_markup: {
                    keyboard: [[{ text: "Back Menu" }]],
                    resize_keyboard: true
                }
            }
        );
    }

    // START
    bot.command("start", async (ctx) => {
        clearSession(ctx);

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

        await ctx.reply(message, {
            reply_markup: {
                keyboard: mainKeyboard,
                resize_keyboard: true
            }
        });
    });

    // CLEAR CURRENT ACTION
    bot.command("clear", async (ctx) => {
        await showMainMenu(ctx, "🧹 Current action cleared.");
    });

    // ADMIN PANEL — ADMIN IDS MUST BE CONFIGURED
    bot.command("admin", async (ctx) => {
        const configuredAdmins = (process.env.ADMIN_IDS || "")
            .split(",")
            .map(id => id.trim())
            .filter(Boolean);

        let databaseAdmin = false;

        try {
            const result = await pool.query(
                "SELECT 1 FROM bot_admins WHERE telegram_id = $1",
                [String(ctx.from.id)]
            );

            databaseAdmin = result.rowCount > 0;
        } catch (error) {
            console.error("Admin lookup failed:", error.message);
        }

        if (
            !configuredAdmins.includes(String(ctx.from.id)) &&
            !databaseAdmin
        ) {
            return ctx.reply(
                "⛔ You are not authorized to use this command."
            );
        }

        await ctx.reply(
            "👑 Admin Panel\n\n✅ Admin access verified."
        );
    });

    // BIND INFO
    bot.hears("Bind Info", ctx =>
        askForToken(ctx, "bind_info", "📊 Check Bind Information")
    );

    // BIND EMAIL
    bot.hears("Bind Email", ctx =>
        askForToken(ctx, "bind_email", "🔗 Bind Email to Account")
    );

    // UNBIND EMAIL
    bot.hears("Unbind Email", async (ctx) => {
        setSession(ctx, "unbind_email", "method");

        await ctx.reply(
            "🔓 Unbind Email\n\nSelect method below:",
            {
                reply_markup: {
                    keyboard: methodKeyboard,
                    resize_keyboard: true
                }
            }
        );
    });

    // CHANGE EMAIL
    bot.hears("Change Email", async (ctx) => {
        setSession(ctx, "change_email", "method");

        await ctx.reply(
            "🏆 Change Bind Email\n\nSelect method below:",
            {
                reply_markup: {
                    keyboard: methodKeyboard,
                    resize_keyboard: true
                }
            }
        );
    });

    // CANCEL BIND
    bot.hears("Cancel Bind", ctx =>
        askForToken(ctx, "cancel_bind", "⚠️ Cancel Bind Request")
    );

    // EAT TO TOKEN
    bot.hears("EAT to Token", async (ctx) => {
        setSession(ctx, "eat_to_token", "eat");

        await ctx.reply(
            "🐑 EAT to Token\n\nSend EAT or URL:\nOr type /clear",
            {
                reply_markup: {
                    keyboard: [[{ text: "Back Menu" }]],
                    resize_keyboard: true
                }
            }
        );
    });

    // REVOKE TOKEN
    bot.hears("Revoke Token", ctx =>
        askForToken(ctx, "revoke_token", "🚫 Revoke Token")
    );

    // UPDATE BIO
    bot.hears("Update Bio", ctx =>
        askForToken(ctx, "update_bio", "✨ Update Profile Bio")
    );

    // HOW TO USE
    bot.hears("How to Use", async (ctx) => {
        await ctx.reply(
            `✨ HOW TO USE

✨ 1: Get Token: Use "Get EAT" & "EAT to Token"
✨ 2: Check Info: Use "Bind Info"
✨ 3: Manage: Bind, Unbind, Change Email
✨ 4: Advanced: Revoke, Send Single Unsubscribe Otp, Update Bio`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: "Watch Tutorial",
                            url: "https://telegram.org/"
                        }
                    ]]
                }
            }
        );
    });

    // GET EAT
    bot.hears("Get EAT", async (ctx) => {
        await ctx.reply(
            `✨ GET EAT TOKEN

🐑 Method 1: From Game
Settings → Account → Copy Link

🐑 Method 2: From Website
Use the official game service to obtain your account link.

Next Step: Use "EAT to Token" button.`,
            {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: "Open official Garena website",
                            url: "https://www.garena.com/"
                        }
                    ]]
                }
            }
        );
    });

    // SEND SINGLE UNSUBSCRIBE OTP
    bot.hears("Send Single Unsubscribe Otp", async (ctx) => {
        setSession(ctx, "unsubscribe_otp", "email");

        await ctx.reply(
            "📧 Send Single Unsubscribe Otp\n\nSend email address:\nOr type /clear",
            {
                reply_markup: {
                    keyboard: [[{ text: "Back Menu" }]],
                    resize_keyboard: true
                }
            }
        );
    });

    // VIA OTP
    bot.hears("Via OTP", async (ctx) => {
        const session = sessions.get(ctx.from.id);

        if (!session || session.step !== "method") return;

        session.method = "otp";
        session.step = "token";

        await ctx.reply(
            "Send your Access Token:\nOr type /clear",
            {
                reply_markup: {
                    keyboard: [[{ text: "Back Menu" }]],
                    resize_keyboard: true
                }
            }
        );
    });

    // VIA SECURITY CODE
    bot.hears("Via Sec Code", async (ctx) => {
        const session = sessions.get(ctx.from.id);

        if (!session || session.step !== "method") return;

        session.method = "security_code";
        session.step = "token";

        await ctx.reply(
            "Send your Access Token:\nOr type /clear",
            {
                reply_markup: {
                    keyboard: [[{ text: "Back Menu" }]],
                    resize_keyboard: true
                }
            }
        );
    });

    // BACK TO MENU
    bot.hears("Back Menu", async (ctx) => {
        await showMainMenu(ctx, "↩️ Returned to main menu.");
    });

    // HANDLE TEXT INPUTS
    bot.on("message:text", async (ctx) => {
        const session = sessions.get(ctx.from.id);

        if (!session) return;

        const text = ctx.message.text.trim();

        // Commands have their own handlers.
        if (text.startsWith("/")) return;

        if (session.step === "method") {
            return ctx.reply(
                "Please select Via OTP or Via Sec Code."
            );
        }

        if (session.step === "email") {
            const validEmail =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

            if (!validEmail) {
                return ctx.reply(
                    "❌ Please enter a valid email address."
                );
            }

            session.email = text;
            session.step = "waiting_for_service";

            return ctx.reply(
                "📧 Email format accepted.\n\nAn authorized OTP service must be configured to continue. No OTP has been sent."
            );
        }

        if (session.step === "eat") {
            session.step = "waiting_for_service";

            return ctx.reply(
                "📥 Input received.\n\nAn authorized EAT conversion service must be configured to generate an access token."
            );
        }

        if (session.step === "token") {
            session.step = "waiting_for_service";

            return ctx.reply(
                "🔐 Input received.\n\nThe account operation cannot run until an authorized API is configured. No account changes have been made."
            );
        }
    });
            }
