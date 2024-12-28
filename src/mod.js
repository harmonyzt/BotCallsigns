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
            const validNamePattern = /^[\p{L}\p{N}\-_!@ #]+(?:\.[\p{L}\p{N}\-_!@ ]+)*$/u;
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
                logger.log(`[BotCallsigns] ${type} names contain invalid name(s): ${invalidNames.join(", ")} | The mod will not use them. You can either fix, or ignore this.`, "yellow");
            } else {
                logger.log(`[BotCallsigns] ${type} names passed name validation`, "green");
            }

            return validNames;
        }

        // Let's load these bad boys in.
        if(config.validateNames){
            logger.log("[BotCallsigns] Validating BEAR and USEC names...", "green");
            const bearNames = validateNames(this.bearNames['Names'], "BEAR", logger);
            const usecNames = validateNames(this.usecNames['Names'], "USEC", logger);

            bot["bear"].firstName = bearNames;
            bot["usec"].firstName = usecNames;

            logger.log(`[BotCallsigns] Loaded ${bearNames.length} BEAR and ${usecNames.length} USEC names!`, "green");
        } else {
            const bearNames = this.bearNames['Names'];
            const usecNames = this.usecNames['Names'];

            bot["bear"].firstName = bearNames;
            bot["usec"].firstName = usecNames;

            logger.log(`[BotCallsigns] Loaded ${bearNames.length} BEAR and ${usecNames.length} USEC names!`, "green");
        }

        // Sanity check if names.ready already exists (should never happen), notifying the user that LiveMode wasn't enabled for Twitch Players
        const pathToFlag = "./user/mods/TTV-Players/temp/names.ready";
        if (fs.existsSync(pathToFlag)) {
            fs.unlinkSync(pathToFlag);
            logger.log("[BotCallsigns] Detected flag file still existing in the Twitch Players temp directory. Enable Live Mode for Twitch Players mod as well otherwise the mod will NOT work properly.", "red");
        }

        // Live Mode. Creating a file for Twitch Players mod (unfiltered).
        if (config.liveMode) {
            logger.log("[BotCallsigns | LIVE MODE] Live mode is ENABLED! Generating new file with names for Twitch Players. Mod will do this every server start up. Be careful as it will take longer for SPT Server to boot!", "yellow");

            const pathToTTVPlayers = "./user/mods/TTV-Players";
            if (fs.existsSync(pathToTTVPlayers)) {
                const allNames = [...this.bearNames['Names'], ...this.usecNames['Names']];

                const pathToAllNames = "./user/mods/TTV-Players/temp/names_temp.json";
                fs.writeFile(pathToAllNames, JSON.stringify({ names: allNames }, null, 2), (err) => {
                    if (err) {
                        logger.log("[BotCallsigns | LIVE MODE] Failed to write names_temp.json. Make sure Live Mode is also enabled for BotCallsigns", "red");
                        return;
                    }
                    logger.log("[BotCallsigns | LIVE MODE] names_temp.json file for Twitch Players mod was updated successfully!", "green");
                    fs.writeFile(pathToFlag, '', (err) => {
                        if (err) {
                            logger.log("[BotCallsigns | LIVE MODE] Error creating names.ready file for Twitch Players mod. Report this error to the developer!", "red");
                            return;
                        } else {
                          logger.log("[BotCallsigns | LIVE MODE] Created flag for Twitch Players mod. Our file is ready!", "green");
                        }
                      });
                });
            } else {
                logger.log("[BotCallsigns | LIVE MODE] Couldn't find Twitch Players mod installed. BotCallsings will NOT work with Live Mode enabled. DISABLE it in the config or INSTALL Twitch Players mod!", "red");
                return;
            }
        }

        // Load custom SCAV names if enabled.
        if (config.useCustomScavNames) {

            if(config.validateNames){
                logger.log("[BotCallsigns] Validating SCAV names...", "green");
                const scavFirstNames = validateNames(this.scavNames['firstNames'], "SCAV First Names", logger);
                const scavLastNames = validateNames(this.scavNames['lastNames'], "SCAV Last Names", logger);

                Object.assign(bot["assault"], {
                    firstName: scavFirstNames,
                    lastName: scavLastNames
                });

                logger.log(`[BotCallsigns] Loaded ${scavFirstNames.length} SCAV first names and ${scavLastNames.length} last names`, "green");
            } else {
                const scavFirstNames = this.scavNames['firstNames'];
                const scavLastNames = this.scavNames['lastNames'];

                Object.assign(bot["assault"], {
                    firstName: scavFirstNames,
                    lastName: scavLastNames
                });

                logger.log(`[BotCallsigns] Loaded ${scavFirstNames.length} SCAV first names and ${scavLastNames.length} last names`, "green");
            }
        }
    }
}

module.exports = { mod: new BotNames() };
