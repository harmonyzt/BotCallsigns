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
        const config = this.CFG;

        // Check for invalid names in the file.
        function validateNames(names, type, logger) {
            // A child of pure cruelty.. Madness. Tested by fire and wielded by the satan himself. God forgive me for this, it shall validate.
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

            if (invalidNames.length > 0 && config.logInvalidNames) {
                logger.log(`[BotCallsigns] ${type}: Found incorrect names!: ${invalidNames.join(", ")} | But that's okay! We skipped them!`, "yellow");
            }

            return validNames;
        }

        // Let's load these bad boys in.
        const bearNames = validateNames(this.bearNames['Names'], "BEAR", logger);
        const usecNames = validateNames(this.usecNames['Names'], "USEC", logger);
        bot["bear"].firstName = bearNames;
        bot["usec"].firstName = usecNames;

        // Live Mode for TTV Players mod.
        if (config.liveMode) {
            logger.log("[BotCallsigns | LIVE MODE] Live mode is ENABLED! This will generate a new file with all names for TTV Players every server start up. Be careful as it will take longer for SPT Server to boot!", "yellow");

            const pathToTTVPlayers = "./user/mods/TTV-Players";
            if (fs.existsSync(pathToTTVPlayers)) {
                const allNames = [...bearNames, ...usecNames];

                const pathToAllNames = "./user/mods/TTV-Players/temp/names_temp.json";
                const pathToFlag = "./user/mods/TTV-Players/temp/names.ready";
                fs.writeFile(pathToAllNames, JSON.stringify({ names: allNames }, null, 2), (err) => {
                    if (err) {
                        logger.log(`[BotCallsigns | LIVE MODE] Failed to write names_temp.json. Make sure Live mode is also enabled for BotCallsigns`, "red");
                        return;
                    }
                    logger.log("[BotCallsigns | LIVE MODE] names_temp.json file for TTV Players mod was updated successfully!", "green");
                    fs.writeFile(pathToFlag, '', (err) => {
                        if (err) {
                            logger.log("[BotCallsigns | LIVE MODE] Error creating names.ready file for TTV Players. Report this error to the developer!", "red");
                            return;
                        } else {
                          logger.log("[BotCallsigns | LIVE MODE] Created flag for TTV Players that the file is ready!", "yellow");
                        }
                      });
                });
            } else {
                logger.log("[BotCallsigns | LIVE MODE] Couldn't find TTV Players mod installed. BotCallsings will NOT work with Live Mode enabled. DISABLE it in the config or INSTALL TTV Players mod!", "red");
                return;
            }
        }

        // Load custom SCAV names if enabled.
        if (config.useCustomScavNames) {
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
