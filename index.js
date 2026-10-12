await bot.api.setMyCommands([
    { command: "start", description: "Open main menu" },
    { command: "admin", description: "Open admin panel" },
    { command: "clear", description: "Clear current action" }
]);
