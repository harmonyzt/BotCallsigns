using System.Reflection;
using System.Text.Json;
using BotCallsigns.Models;
using SPTarkov.Common.Models.Logging;
using SPTarkov.DI.Annotations;
using SPTarkov.Server.Core.DI;
using SPTarkov.Server.Core.Helpers.Server;
using SPTarkov.Server.Core.Models.Eft.Common.Tables;
using SPTarkov.Server.Core.Models.Spt.Mod;
using SPTarkov.Server.Core.Models.Spt.Tables;
using Path = System.IO.Path;
using Range = SemanticVersioning.Range;
using Version = SemanticVersioning.Version;

namespace BotCallsigns;

public sealed class BotCallsignsMetadata : IModMetadata
{
    public string ModGuid { get; init; } = "com.harmonyzt.botcallsigns";
    public string Name { get; init; } = "Bot Callsigns";
    public Range SptVersion { get; init; } = new("~4.1.1");
    public string Author { get; init; } = "harmony";
    public List<string>? Contributors { get; init; } = ["yuyui.moe", "Helldiver"];
    public Version Version { get; init; } = new("2.0.5");
    public bool HasPrepatcher { get; init; }
    public List<string>? Incompatibilities { get; init; }
    public Dictionary<string, SemanticVersioning.Range>? ModDependencies { get; init; }
    public string? Url { get; init; } = "https://github.com/harmonyzt/BotCallsigns";
    public bool? IsBundleMod { get; init; }
    public string License { get; init; } = "MIT";
}

[Injectable(TypePriority = OnLoadOrder.PostLoad + 1)]
public class EditBotNames(ISptLogger<EditBotNames> logger, BotTable botTable, ModHelper modHelper)
    : IOnLoad
{
    private UserDefinedBotCallsignNames? _userDefinedBotCallsignNames;
    private static readonly JsonSerializerOptions JsonSerializerOptions = new() { WriteIndented = true };
    private static readonly TimeSpan AllNamesUpdateInterval = TimeSpan.FromHours(100);
    
    // Config
    private ModConfig? _config;
    
    public Task OnLoadAsync(CancellationToken cancellationToken)
    {
        var modPath = modHelper.GetAbsolutePathToModFolder(Assembly.GetExecutingAssembly());
        var currentNamesPath = Path.Combine(modPath, "nameData/");
        _config = LoadOrCreateConfig(modPath);

        // Assign our names
        BotCallsignsNames usecNames = new BotCallsignsNames();
        BotCallsignsNames bearNames = new BotCallsignsNames();
        
        usecNames = modHelper.GetJsonDataFromFile<BotCallsignsNames>(currentNamesPath, "usec_new.json");
        bearNames = modHelper.GetJsonDataFromFile<BotCallsignsNames>(currentNamesPath, "bear_new.json");
        
        // Log how many names were loaded from files
        logger.Info($"[Bot Callsigns] Loaded {usecNames.Names.Count} USEC names from file");
        logger.Info($"[Bot Callsigns] Loaded {bearNames.Names.Count} BEAR names from file");
        
        // Custom names
        if (_config.EnableUserDefinedNames)
        {
            _userDefinedBotCallsignNames = FetchOrCreateUserDefinedNames(currentNamesPath);
            logger.Info($"[Bot Callsigns] User defined names: {_userDefinedBotCallsignNames?.UsecNames?.Count ?? 0} USEC, {_userDefinedBotCallsignNames?.BearNames?.Count ?? 0} BEAR");
        }
        
        // If our all names JSON file doesn't exist, create it along all the names there
        if (_config.AutoGenerateAllNames)
        {
            CreateAllNames(currentNamesPath, usecNames, bearNames);
        }

        var botTypes = botTable.Types;
        botTypes.TryGetValue("usec", out var usecBots);
        botTypes.TryGetValue("bear", out var bearBots);
        
        if (usecBots != null)
        {
            PushCallsignsToBotType(usecBots, usecNames.Names, _userDefinedBotCallsignNames?.UsecNames);
        }
        
        if (bearBots != null)
        {
            PushCallsignsToBotType(bearBots, bearNames.Names, _userDefinedBotCallsignNames?.BearNames);
        }
        
        logger.Success($"[Bot Callsigns] Added {usecNames.Names.Count + (_userDefinedBotCallsignNames?.UsecNames?.Count ?? 0)} USEC names and {bearNames.Names.Count + (_userDefinedBotCallsignNames?.BearNames?.Count ?? 0)} BEAR names");

        // Signal to Twitch Players that it is ready
        ModReadyTwitchPlayers();
        return Task.CompletedTask;
    }
    
    private ModConfig LoadOrCreateConfig(string modPath)
    {
        var configPath = Path.Combine(modPath, "config.json");
        
        try
        {
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                var config = JsonSerializer.Deserialize<ModConfig>(json, JsonSerializerOptions);
                if (config != null)
                {
                    return config;
                }
            }
            
            var defaultConfig = new ModConfig();
            var defaultJson = JsonSerializer.Serialize(defaultConfig, JsonSerializerOptions);
            File.WriteAllText(configPath, defaultJson);
            
            logger.Success($"[Bot Callsigns] Created default config file at {configPath}");
            
            return defaultConfig;
        }
        catch (Exception ex)
        {
            logger.Error($"[Bot Callsigns] Error loading config: {ex.Message}. Using defaults.");
            return new ModConfig(); // fallback to default config
        }
    }

    private UserDefinedBotCallsignNames FetchOrCreateUserDefinedNames(string path)
    {
        if (File.Exists($"{path}/userDefinedNames.json"))
        {
            return modHelper.GetJsonDataFromFile<UserDefinedBotCallsignNames>(path, "userDefinedNames.json");
        }
        var json = JsonSerializer.Serialize(new UserDefinedBotCallsignNames(), JsonSerializerOptions);
        File.WriteAllText($"{path}/userDefinedNames.json", json);
        return modHelper.GetJsonDataFromFile<UserDefinedBotCallsignNames>(path, "userDefinedNames.json");
    }

    private void CreateAllNames(string namesPath, BotCallsignsNames usecNames, BotCallsignsNames bearNames)
    {
        try
        {
            var allNamesFilePath = Path.Combine(namesPath, "allNames.json");
            
            bool shouldUpdate = true;
            
            if (File.Exists(allNamesFilePath))
            {
                var fileInfo = new FileInfo(allNamesFilePath);
                var timeSinceLastUpdate = DateTime.Now - fileInfo.LastWriteTime;
                
                if (timeSinceLastUpdate < AllNamesUpdateInterval)
                {
                    shouldUpdate = false;
                    //logger.Info($"[Bot Callsigns] allNames.json was updated {timeSinceLastUpdate.TotalHours:F1} hours ago, skipping update.");
                }
            }
            
            if (!shouldUpdate)
            {
                return;
            }
        
            // Combine the names
            var allNames = new List<string>();
            allNames.AddRange(usecNames.Names);
            allNames.AddRange(bearNames.Names);
            
            // And also user custom names
            if (_userDefinedBotCallsignNames?.UsecNames != null)
                allNames.AddRange(_userDefinedBotCallsignNames.UsecNames);
            
            if (_userDefinedBotCallsignNames?.BearNames != null)
                allNames.AddRange(_userDefinedBotCallsignNames.BearNames);
            
            allNames = allNames.Distinct().ToList();
            
            var allNamesData = new BotCallsignsNames { Names = allNames };
            
            var jsonContent = JsonSerializer.Serialize(allNamesData, JsonSerializerOptions);

            File.WriteAllText(allNamesFilePath, jsonContent);

            logger.Info($"[Bot Callsigns] Created/Updated allNames.json with {allNames.Count} total names");
        }
        catch (Exception ex)
        {
            logger.Warning($"[Bot Callsigns] Could not create/update allNames.json: {ex.Message}");
        }
    }

    private void PushCallsignsToBotType(BotType botType, List<string> defaultCallsigns, List<string>? userDefinedCallsigns)
    {
        var firstNames = botType.FirstNames;
        
        if (!_config.IncludeDefaultNames)
        {
            firstNames.Clear();
        }
        
        if (defaultCallsigns != null)
        {
            foreach (var callsign in defaultCallsigns)
            {
                if (firstNames.Contains(callsign)) continue;
                firstNames.Add(callsign);
            }
        }
        
        if (_config.EnableUserDefinedNames && userDefinedCallsigns != null)
        {
            foreach (var callsign in userDefinedCallsigns)
            {
                if (firstNames.Contains(callsign)) continue;
                firstNames.Add(callsign);
            }
        }
    }

    // Send a signal file to TwitchPlayers if that exists
    private void ModReadyTwitchPlayers()
    {
        try
        {
            // Get TwitchPlayers mod Directory
            var currentModPath = modHelper.GetAbsolutePathToModFolder(Assembly.GetExecutingAssembly());

            // Check if directory of TwitchPlayers Exist
            var modsDirectory = Directory.GetParent(currentModPath)?.FullName;
            
            if (modsDirectory == null)
            {
                // Do nothing - otherwise proceed
                // logger.Warning("[Bot Callsigns] Directory of TwitchPlayers mod could not be found.");
                return;
            }
            
            // Path to TwitchPlayers
            var pathToTwitchPlayers = Path.Combine(modsDirectory, "TwitchPlayers");
            
            if (!Directory.Exists(pathToTwitchPlayers))
            {
                // logger.Warning("[Bot Callsigns] Directory of TwitchPlayers mod could not be found.");
                return;
            }
        
            var tempDir = Path.Combine(pathToTwitchPlayers, "Temp/");

            // Create directory inside Twitch Players
            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }

            var pathToFlag = Path.Combine(tempDir, "mod.ready");

            if (File.Exists(pathToFlag))
            {
                logger.Warning("[Bot Callsigns] Flag for Twitch Players already exists, skipping...");
                return;
            }
            else
            {
                // Write mod.ready to twitch players to pick it up
                File.WriteAllText(pathToFlag, string.Empty);
            }
            
            logger.Success("[Bot Callsigns] Synced with TwitchPlayers!");
        }
        catch (Exception ex)
        {
            logger.Error($"[Bot Callsigns] Could not send signal file for Twitch Players: {ex.Message}");
        }
    }
}