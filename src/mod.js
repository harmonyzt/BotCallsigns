"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const namesConfig = require("../config/config.jsonc");

class BotNames {
    bearCFG = require("../names/bear.json"); 
    usecCFG = require("../names/usec.json");
    postDBLoad(container) {
        // Get the logger from the server container.
        const logger = container.resolve("WinstonLogger");
        // Get database from server.
        const db = container.resolve("DatabaseServer");
        const bot = db.getTables().bots.types;
        const bearNames = this.bearCFG['Names'];
        const usecNames = this.usecCFG['Names'];
        bot["bear"].firstName = bot["bear"].firstName;
        bot["usec"].firstName = bot["bear"].firstName;
        logger.info("Bot names loaded!");
    }
}
module.exports = { mod: new BotNames() };
//# sourceMappingURL=mod.js.map