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
    }

    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const db = container.resolve("DatabaseServer");
        const bot = db.getTables().bots.types;
        const config = this.CFG;

        const extraUSECNamesPath = "./user/mods/BotCallsigns/config/usec_extra_names.json";
        const extraBEARNamesPath = "./user/mods/BotCallsigns/config/bear_extra_names.json";
        const scavNames = "./user/mods/BotCallsigns/config/scav_names.json";
        const pathToTwitchPlayers = "./user/mods/TwitchPlayers";

        // Check for extra name files and create them
        function createFileIfNotExists(path, scavFile = false, ModReady = false) {

            if (!fs.existsSync(path) && scavFile == false) {
                const defaultStructure = { "Names": ["extra", "names", "go", "here"] };

                try {
                    fs.writeFileSync(path, JSON.stringify(defaultStructure, null, 2));
                    logger.log(`[BotCallsigns] Created missing extra names file: ${path}`, "cyan");
                } catch (error) {
                    logger.log(`[BotCallsigns] Failed to create file: ${path} $`, "red");
                }
            } else if (!fs.existsSync(path) && scavFile == true) {
                const defaultStructure = { "firstNames": ["put", "your", "first names", "here", "or", "add", "more"], "lastNames": ["put", "your", "last names", "here", "or", "add", "more"] };
                try {
                    fs.writeFileSync(path, JSON.stringify(defaultStructure, null, 2));
                    logger.log(`[BotCallsigns] Created missing extra names file: ${path}`, "cyan");
                } catch (error) {
                    logger.log(`[BotCallsigns] Failed to create file: ${path} $`, "red");
                }
            }

            // Create mod.ready file for Twitch Players signaling that we're done with file creation
            if (ModReady == true) {
                modReadyTTV();
            }
        }

        createFileIfNotExists(extraUSECNamesPath, false, false);
        createFileIfNotExists(extraBEARNamesPath, false, false);
        createFileIfNotExists(scavNames, true, true);

        // Mod is ready to work with Twitch Players
        function modReadyTTV() {
            if(fs.existsSync(pathToTwitchPlayers)){
                const pathToFlag = "./user/mods/TwitchPlayers/temp/mod.ready";
                fs.writeFileSync(pathToFlag, '', 'utf-8');
            }
        }

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
                if (!config.junklessLogging)
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

        if (config.addExtraNames) {
            this.bearNames.Names = loadExtraNames(extraBEARNamesPath, this.bearNames.Names, "BEAR", logger);
            this.usecNames.Names = loadExtraNames(extraUSECNamesPath, this.usecNames.Names, "USEC", logger);
        }

        // Name Validation if enabled in the config
        if (config.validateNames) {
            if (!config.junklessLogging)
                logger.log("[BotCallsigns] Validating BEAR and USEC names...", "green");

            const bearNames = validateNames(this.bearNames.Names, "BEAR", logger);
            const usecNames = validateNames(this.usecNames.Names, "USEC", logger);

            bot["bear"].firstName = bearNames;
            bot["usec"].firstName = usecNames;

            if (!config.junklessLogging)
                logger.log(`[BotCallsigns] Loaded ${bearNames.length} BEAR and ${usecNames.length} USEC names!`, "green");
        } else {
            bot["bear"].firstName = this.bearNames.Names;
            bot["usec"].firstName = this.usecNames.Names;

            if (!config.junklessLogging)
                logger.log(`[BotCallsigns] Loaded ${this.bearNames.Names.length} BEAR and ${this.usecNames.Names.length} USEC names!`, "green");
        }

        // If using SCAV names too
        if (config.useCustomScavNames) {
            if (config.validateNames) {
                if (!config.junklessLogging)
                    logger.log("[BotCallsigns] Validating SCAV names...", "green");

                this.scavNames = require("../config/scav_names.json");

                const scavFirstNames = validateNames(this.scavNames['firstNames'], "SCAV First Names", logger);
                const scavLastNames = validateNames(this.scavNames['lastNames'], "SCAV Last Names", logger);

                Object.assign(bot["assault"], {
                    firstName: scavFirstNames,
                    lastName: scavLastNames
                });

                if (!config.junklessLogging)
                    logger.log(`[BotCallsigns] Loaded ${scavFirstNames.length} SCAV first names and ${scavLastNames.length} last names`, "green");
            } else {
                const scavFirstNames = this.scavNames['firstNames'];
                const scavLastNames = this.scavNames['lastNames'];

                Object.assign(bot["assault"], {
                    firstName: scavFirstNames,
                    lastName: scavLastNames
                });

                if (!config.junklessLogging)
                    logger.log(`[BotCallsigns] Loaded ${scavFirstNames.length} SCAV first names and ${scavLastNames.length} last names`, "green");
            }
        }
    }
}

module.exports = { mod: new BotNames() };
