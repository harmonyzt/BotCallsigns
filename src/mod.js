"use strict";
const fs = require('fs');

class BotNames {
    CFG = require("../config/config.json");
    bearNames = require("../names/bear.json");
    usecNames = require("../names/usec.json");
    scavNames = require("../names/scav.json");

    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const db = container.resolve("DatabaseServer");
        const bot = db.getTables().bots.types;

        const bearNames = this.bearNames['Names'];
        const usecNames = this.usecNames['Names'];
        bot["bear"].firstName = bearNames;
        bot["usec"].firstName = usecNames;

        // Handle live mode functionality.
        if (this.CFG.liveMode) {
            logger.log("[BotCallsigns | LIVE MODE] Live mode is ENABLED! This will generate a new file with all names for TTV Players every server start up. Be careful!", "yellow");

            const pathToTTVPlayers = "./user/mods/TTV-Players";
            if (fs.existsSync(pathToTTVPlayers)) {
                const allNames = [...bearNames, ...usecNames];

                const pathToAllNames = "./user/mods/TTV-Players/names/names.json";
                fs.writeFile(pathToAllNames, JSON.stringify({ names: allNames }, null, 2), (err) => {
                    if (err) {
                        logger.error(`[BotCallsigns | LIVE MODE] Failed to write names.json: ${err.message}`);
                        return;
                    }
                    logger.log("[BotCallsigns | LIVE MODE] names.json for TTV Players mod was updated successfully!", "yellow");
                });
            } else {
                logger.log("[BotCallsigns | LIVE MODE] Could not find TTV Players mod while live mode is enabled! Stopping the mod...", "red");
                return;
            }
        }

        // Load custom SCAV names if enabled.
        if (this.CFG.useCustomScavNames) {
            const scavFirstNames = this.scavNames['firstNames'];
            const scavLastNames = this.scavNames['lastNames'];
            bot["assault"].firstName = scavFirstNames;
            bot["assault"].lastName = scavLastNames;
            logger.info("[BotCallsigns] Custom SCAV names loaded!");
        }

        logger.info("[BotCallsigns] Custom PMC names loaded!");
    }
}

module.exports = { mod: new BotNames() };
