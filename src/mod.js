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

        // Check for invalid names in the file.
        function validateNames(names, type, logger) {
            const validNamePattern = /^[\p{L}\p{N}\-_!@ ]+(?:\.[\p{L}\p{N}\-_!@ ]+)*$/u;
            const validNames = [];
            const invalidNames = [];

            names.forEach(name => {
                if (validNamePattern.test(name)) {
                    validNames.push(name);
                } else {
                    invalidNames.push(name);
                }
            });

            if (invalidNames.length > 0) {
                logger.log(`[BotCallsigns] ${type}: Found incorrect names!: ${invalidNames.join(", ")}`, "yellow");
            }

            return validNames;
        }

        // Let's load these bad boys in.
        const bearNames = validateNames(this.bearNames['Names'], "BEAR", logger);
        const usecNames = validateNames(this.usecNames['Names'], "USEC", logger);
        bot["bear"].firstName = bearNames;
        bot["usec"].firstName = usecNames;

        // Live Mode for TTV Players mod.
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
                    logger.log("[BotCallsigns | LIVE MODE] names.json file for TTV Players mod was updated successfully!", "green");
                });
            } else {
                logger.log("[BotCallsigns | LIVE MODE] Couldn't find TTV Players mod installed. BotCallsings will NOT work. DISABLE LIVE MODE FOR THIS MOD IN CONFIG.JSON!", "red");
                return;
            }
        }

        // Load custom SCAV names if enabled.
        if (this.CFG.useCustomScavNames) {
            const scavFirstNames = validateNames(this.scavNames['firstNames'], "SCAV First Names", logger);
            const scavLastNames = validateNames(this.scavNames['lastNames'], "SCAV Last Names", logger);

            Object.assign(bot["assault"], {
                firstName: scavFirstNames,
                lastName: scavLastNames
            });

            logger.log(`[BotCallsigns] Loaded ${scavFirstNames.length} SCAV first names and ${scavLastNames.length} last names`, "green");
        }

        logger.log(`[BotCallsigns] Loaded ${bearNames.length} BEAR and ${usecNames.length} USEC names!`, "green");
    }
}

module.exports = { mod: new BotNames() };
