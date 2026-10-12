import { pool } from "./database.js";

export function registerCommands(bot) {
    const sessions = new Map();

    // MAIN MENU
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

    // GAR​ENA OAUTH LINKS
    const facebookOAuthUrl =
        "https://auth.garena.com/universal/oauth?platform=8&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/";

    const googleOAuthUrl =
        "https://auth.garena.com/universal/oauth?platform=3&response_type=code&locale=en-SG&client_id=100067&redirect_uri=https://api.ff.garena.co.id/auth/auth/callback_n?site=https://api-discountstore.kiosgamer.gameid.garena.co.id/oauth/callback_redirect/";

    // SESSION HELPERS
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

    // ADMIN PANEL
    bot.command("admin", async (ctx) => {
        const configuredAdmins = (process.env.ADMIN_IDS || "")
            .split(",")
            .map((id) => id.trim())
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
            await ctx.reply(
                "⛔ You are not authorized to use this command."
            );
            return;
        }

        await ctx.reply(
            "👑 Admin Panel\n\n✅ Admin access verified."
        );
    });

    // BIND INFO
    bot.hears("Bind Info", async (ctx) => {
        await askForToken(
            ctx,
            "bind_info",
            "📊 Check Bind Information"
        );
    });

    // BIND EMAIL
    bot.hears("Bind Email", async (ctx) => {
        await askForToken(
            ctx,
            "bind_email",
            "🔗 Bind Email to Account"
        );
    });

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
    bot.hears("Cancel Bind", async (ctx) => {
        await askForToken(
            ctx,
            "cancel_bind",
            "⚠️ Cancel Bind Request"
        );
    });

    // EAT TO TOKEN
    bot.hears("EAT to Token", async (ctx) => {
        setSession(ctx, "eat_to_token", "eat");

        await ctx.reply(
            "🎁 EAT to Token\n\nSend your EAT or supported URL:\nOr type /clear",
            {
                reply_markup: {
                    keyboard: [[{ text: "Back Menu" }]],
                    resize_keyboard: true
                }
            }
        );
    });

    // REVOKE TOKEN
    bot.hears("Revoke Token", async (ctx) => {
        await askForToken(
            ctx,
            "revoke_token",
            "🚫 Revoke Token"
        );
    });

    // UPDATE BIO
    bot.hears("Update Bio", async (ctx) => {
        await askForToken(
            ctx,
            "update_bio",
            "✨ Update Profile Bio"
        );
    });

    // HOW TO USE
    bot.hears("How to Use", async (ctx) => {
        await ctx.reply(
            `✨ HOW TO USE

✨ 1: Get EAT: Select "Get EAT" and choose a login method.
✨ 2: Convert: Use "EAT to Token" with a supported input.
✨ 3: Check Info: Use "Bind Info".
✨ 4: Manage: Bind, Unbind, or Change Email.
✨ 5: Advanced: Revoke Token, Send Single Unsubscribe Otp, or Update Bio.

⚠️ Account operations require an authorized service.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Official Garena Website",
                                url: "https://www.garena.com/"
                            }
                        ]
                    ]
                }
            }
        );
    });

    // GET EAT
    bot.hears("Get EAT", async (ctx) => {
        clearSession(ctx);

        await ctx.reply(
            `✨ GET EAT TOKEN

📘 HOW TO USE

1. Choose Facebook or Google below.
2. Complete the sign-in process on the login page.
3. Follow the service's instructions.

⚠️ Never send your password, OTP, or session cookies to this bot.
⚠️ Automatic EAT retrieval is not configured.

👇 SELECT YOUR LOGIN METHOD`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📘 Facebook",
                                url: facebookOAuthUrl
                            },
                            {
                                text: "🌐 Google",
                                url: googleOAuthUrl
                            }
                        ],
                        [
                            {
                                text: "🔙 Back to Menu",
                                callback_data: "eat_back"
                            }
                        ]
                    ]
                }
            }
        );
    });

    // GET EAT — BACK TO MENU
    bot.callbackQuery("eat_back", async (ctx) => {
        await ctx.answerCallbackQuery();

        await showMainMenu(
            ctx,
            "↩️ Returned to main menu."
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

        if (!session || session.step !== "method") {
            return;
        }

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

        if (!session || session.step !== "method") {
            return;
        }

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
        await showMainMenu(
            ctx,
            "↩️ Returned to main menu."
        );
    });

    // HANDLE TEXT INPUTS
    bot.on("message:text", async (ctx) => {
        const session = sessions.get(ctx.from.id);

        if (!session) {
            return;
        }

        const input = ctx.message.text.trim();

        // Allow command handlers to handle commands.
        if (input.startsWith("/")) {
            return;
        }

        // Method selection
        if (session.step === "method") {
            await ctx.reply(
                "Please select Via OTP or Via Sec Code."
            );
            return;
        }

        // Email input
        if (session.step === "email") {
            const validEmail =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

            if (!validEmail) {
                await ctx.reply(
                    "❌ Please enter a valid email address."
                );
                return;
            }

            session.email = input;
            session.step = "waiting_for_service";

            await ctx.reply(
                "📧 Email format accepted.\n\nAn authorized OTP service must be configured to continue. No OTP has been sent."
            );
            return;
        }

        // EAT input
        if (session.step === "eat") {
            session.step = "waiting_for_service";

            await ctx.reply(
                "📥 Input received.\n\nAn authorized EAT conversion service must be configured to generate an access token. No conversion was performed."
            );
            return;
        }

        // Token input
        if (session.step === "token") {
            session.step = "waiting_for_service";

            await ctx.reply(
                "🔐 Input received.\n\nAn authorized API must be configured before this account operation can run. No account changes have been made."
            );
        }
    });
                        }   );
    });

    // HANDLE TEXT INPUTS
    bot.on("message:text", async (ctx) => {
        const session = sessions.get(ctx.from.id);

        if (!session) {
            return;
        }

        const input = ctx.message.text.trim();

        // Let command handlers process commands.
        if (input.startsWith("/")) {
            return;
        }

        // Method selection
        if (session.step === "method") {
            return ctx.reply(
                "Please select Via OTP or Via Sec Code."
            );
        }

        // Email input
        if (session.step === "email") {
            const validEmail =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

            if (!validEmail) {
                return ctx.reply(
                    "❌ Please enter a valid email address."
                );
            }

            session.email = input;
            session.step = "waiting_for_service";

            return ctx.reply(
                "📧 Email format accepted.\n\nAn authorized OTP service must be configured to continue. No OTP has been sent."
            );
        }

        // EAT input
        if (session.step === "eat") {
            session.step = "waiting_for_service";

            return ctx.reply(
                "📥 Input received.\n\nAn authorized EAT conversion service must be configured to generate an access token. No conversion was performed."
            );
        }

        // Token input
        if (session.step === "token") {
            session.step = "waiting_for_service";

            return ctx.reply(
                "🔐 Input received.\n\nAn authorized API must be configured before this account operation can run. No account changes have been made."
            );
        }
    });
                    }: [[{ text: "Back Menu" }]],
                    resize_keyboard: true
                }
            }
        );
    });

    // BACK TO MENU
    bot.hears("Back Menu", async (ctx) => {
        await showMainMenu(
            ctx,
            "↩️ Returned to main menu."
        );
    });

    // HANDLE TEXT INPUTS
    bot.on("message:text", async (ctx) => {
        const session = sessions.get(ctx.from.id);

        if (!session) {
            return;
        }

        const input = ctx.message.text.trim();

        // Let command handlers process commands.
        if (input.startsWith("/")) {
            return;
        }

        // Method selection
        if (session.step === "method") {
            return ctx.reply(
                "Please select Via OTP or Via Sec Code."
            );
        }

        // Email input
        if (session.step === "email") {
            const validEmail =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

            if (!validEmail) {
                return ctx.reply(
                    "❌ Please enter a valid email address."
                );
            }

            session.email = input;
            session.step = "waiting_for_service";

            return ctx.reply(
                "📧 Email format accepted.\n\nAn authorized OTP service must be configured to continue. No OTP has been sent."
            );
        }

        // EAT input
        if (session.step === "eat") {
            session.step = "waiting_for_service";

            return ctx.reply(
                "📥 Input received.\n\nAn authorized EAT conversion service must be configured to generate an access token. No conversion was performed."
            );
        }

        // Token input
        if (session.step === "token") {
            session.step = "waiting_for_service";

            return ctx.reply(
                "🔐 Input received.\n\nAn authorized API must be configured before this account operation can run. No account changes have been made."
            );
        }
    });
            }
