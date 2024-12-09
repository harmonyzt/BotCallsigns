"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

class BotNames {
    CFG = require("../config/config.json");
    bearNames = require("../names/bear.json"); 
    usecNames = require("../names/usec.json");
    scavNames = require("../names/scav.json");

    postDBLoad(container) {
        // Get the logger from the server container.
        const logger = container.resolve("WinstonLogger");
        // Get database from server.
        const db = container.resolve("DatabaseServer");
        const bot = db.getTables().bots.types;
        const bearNames = this.bearNames['Names'];
        const usecNames = this.usecNames['Names'];
        bot["bear"].firstName = bearNames;
        bot["usec"].firstName = usecNames;

        // If we should use custom SCAV names too.
        if(this.CFG.useCustomScavNames){
            const scavFirstNames = this.scavNames['firstNames'];
            const scavLastNames = this.scavNames['lastNames'];
            bot["assault"].firstName = scavFirstNames;
            bot["assault"].lastName = scavLastNames;
            logger.info("Custom SCAV names loaded!");
        }

        logger.info("Custom PMC names loaded!");
    }
}
module.exports = { mod: new BotNames() };
//# sourceMappingURL=mod.js.map