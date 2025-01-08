"use strict";
const fs = require('fs');

class BotNames {
    CFG = require("../config/config.json");

    constructor() {
        this.bearNames = this.CFG.useBEARCyrillicNames
            ? require("../names/bear_cyrillic.json")
            : require("../names/bear.json");
        this.usecNames = this.CFG.useUSECEnglishNames
            ? require("../names/usec_en.json")
            : require("../names/usec.json");
        this.scavNames = require("../config/scav_names.json");
    }

    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const db = container.resolve("DatabaseServer");
        const bot = db.getTables().bots.types;
        const config = this.CFG;

        const extraUSECNamesPath = "./user/mods/BotCallsigns/config/usec_extra_names.json";
        const extraBEARNamesPath = "./user/mods/BotCallsigns/config/bear_extra_names.json";

        // Check for extra name files and create them
        function createFileIfNotExists(path) {
            if (!fs.existsSync(path)) {
                const defaultStructure = { "Names": ["names_goes", "goes_here"] };
                try {
                    fs.writeFileSync(path, JSON.stringify(defaultStructure, null, 2));
                    logger.log(`[BotCallsigns] Created missing extra names file: ${path}`, "cyan");
                } catch (error) {
                    logger.log(`[BotCallsigns] Failed to create file: ${path}`, "red");
                }
            }
        }

        createFileIfNotExists(extraUSECNamesPath);
        createFileIfNotExists(extraBEARNamesPath);

        // Name validation
        function validateNames(names, type) {
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

        // Extra names loading
        function loadExtraNames(path, defaultNames, type) {
            if (fs.existsSync(path)) {
                try {
                    const fileContent = fs.readFileSync(path, "utf-8");
                    const extraNames = JSON.parse(fileContent).Names;
                    logger.log(`[BotCallsigns] Loaded extra ${type} names from ${path}`, "green");
                    return [...defaultNames, ...extraNames];
                } catch (error) {
                    logger.log(`[BotCallsigns] Failed to load extra ${type} names from ${path}`, "red");
                }
            }
            return defaultNames;
        }

        if(config.addExtraNames){
            this.bearNames.Names = loadExtraNames(extraBEARNamesPath, this.bearNames.Names, "BEAR", logger);
            this.usecNames.Names = loadExtraNames(extraUSECNamesPath, this.usecNames.Names, "USEC", logger);
        }

        // Name Validation if enabled in the config
        if (config.validateNames) {
            logger.log("[BotCallsigns] Validating BEAR and USEC names...", "green");
            const bearNames = validateNames(this.bearNames.Names, "BEAR", logger);
            const usecNames = validateNames(this.usecNames.Names, "USEC", logger);

            bot["bear"].firstName = bearNames;
            bot["usec"].firstName = usecNames;

            logger.log(`[BotCallsigns] Loaded ${bearNames.length} BEAR and ${usecNames.length} USEC names!`, "green");
        } else {
            bot["bear"].firstName = this.bearNames.Names;
            bot["usec"].firstName = this.usecNames.Names;

            logger.log(`[BotCallsigns] Loaded ${this.bearNames.Names.length} BEAR and ${this.usecNames.Names.length} USEC names!`, "green");
        }

        // Live Mode handling
        if (config.liveMode) {
            logger.log("[BotCallsigns | Live Mode] Live mode is ENABLED! Generating new file with names for Twitch Players.", "yellow");

            const pathToTTVPlayers = "./user/mods/TTV-Players";

            if (fs.existsSync(pathToTTVPlayers)) {
                const allNames = [...this.bearNames.Names, ...this.usecNames.Names];

                const pathToAllNames = "./user/mods/TTV-Players/temp/names_temp.json";
                fs.writeFile(pathToAllNames, JSON.stringify({ names: allNames }, null, 2), (err) => {
                    if (err) {
                        logger.log("[BotCallsigns | Live Mode] Failed to write names_temp.json.", "red");
                        return;
                    }
                    logger.log("[BotCallsigns | Live Mode] names_temp.json file was updated successfully!", "cyan");
                });
            } else {
                logger.log("[BotCallsigns | Live Mode] Twitch Players mod is not installed. Live Mode will not function.", "red");
                return;
            }
        }

        // If using SCAV names too
        if(config.useCustomScavNames) {
            if(config.validateNames) {
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
