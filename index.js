import "dotenv/config";
import { Bot } from "grammy";
import { pool, initializeDatabase } from "./src/database.js";
import { registerCommands } from "./src/commands.js";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

bot.catch((error) => {
  console.error("[BOT ERROR]", error.error);
});

async function start() {
  await initializeDatabase();

  registerCommands(bot);

  await bot.api.setMyCommands([
    { command: "start", description: "Open main menu" },
    { command: "help", description: "Get help" },
    { command: "ping", description: "Check bot status" },
    { command: "admin", description: "Open admin panel" },
    { command: "cancel", description: "Cancel current action" }
  ]);

  await bot.start({
    onStart: (info) => {
      console.log(`Bot started: @${info.username}`);
    }
  });
}

start().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});

async function shutdown() {
  console.log("Shutting down...");
  await bot.stop();
  await pool.end();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
// Compatibility with index.js
export async function registerCommands(bot) {
  registerCommandHandlers(bot);
}
