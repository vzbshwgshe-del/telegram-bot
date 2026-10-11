export function registerCommands(bot) {
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

        const keyboard = [
            [
                { text: "Bind Info" },
                { text: "Bind Email" }
            ],
            [
                { text: "Unbind Email" },
                { text: "Change Email" }
            ],
            [
                { text: "Cancel Bind" },
                { text: "EAT to Token" }
            ],
            [
                { text: "Revoke Token" },
                { text: "How to Use" }
            ],
            [
                { text: "Update Bio" },
                { text: "Get EAT" }
            ],
            [
                { text: "Send Single Unsubscribe Otp" }
            ]
        ];

        await ctx.reply(message, {
            reply_markup: {
                keyboard,
                resize_keyboard: true
            }
        });
    });
}
