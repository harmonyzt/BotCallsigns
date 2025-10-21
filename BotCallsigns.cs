using System.Reflection;
using BotCallsigns.Models;
using SPTarkov.DI.Annotations;
using SPTarkov.Server.Core.DI;
using SPTarkov.Server.Core.Helpers;
using SPTarkov.Server.Core.Models.Spt.Mod;
using SPTarkov.Server.Core.Models.Utils;
using SPTarkov.Server.Core.Services;

namespace BotCallsigns;

public record ModMetadata : AbstractModMetadata
{
    public override string ModGuid { get; init; } = "com.harmonyzt.botcallsigns";
    public override string Name { get; init; } = "Bot Callsigns";
    public override string Author { get; init; } = "harmony";
    public override List<string>? Contributors { get; init; } = ["yuyui.moe", "Helldiver"];
    public override SemanticVersioning.Version Version { get; init; } = new("2.0.0");
    public override SemanticVersioning.Range SptVersion { get; init; } = new("~4.0.0");
    public override List<string>? Incompatibilities { get; init; }
    public override Dictionary<string, SemanticVersioning.Range>? ModDependencies { get; init; }
    public override string? Url { get; init; }
    public override bool? IsBundleMod { get; init; }
    public override string License { get; init; } = "MIT";
}

[Injectable(TypePriority = OnLoadOrder.PostDBModLoader + 1)]
public class EditBotNames(ISptLogger<EditBotNames> logger, DatabaseService databaseService, ModHelper modHelper)
    : IOnLoad
{
    public Task OnLoad()
    {
        var namesPath = modHelper.GetAbsolutePathToModFolder(Assembly.GetExecutingAssembly());
        var currentNamesPath = Path.Combine(namesPath, "nameData/");
    
        // Assign our custom names from JSON
        var usecNames = modHelper.GetJsonDataFromFile<BotCallsignsNames>(currentNamesPath, "usec.json");
        var bearNames = modHelper.GetJsonDataFromFile<BotCallsignsNames>(currentNamesPath, "bear.json");
    
        // If our all names JSON file doesn't exist, create it along all the names there, otherwise skip if already exists
        CreateAllNames(currentNamesPath, usecNames, bearNames);
    
        // Apply names in SPT Database
        EditNames(usecNames.Names, bearNames.Names);
        logger.Success(
            $"[Bot Callsigns] Loaded {usecNames.Names.Count} USEC names and {bearNames.Names.Count} BEAR names");

        // Signal to Twitch Players that it is ready
        ModReadyTwitchPlayers();
        return Task.CompletedTask;
    }

    private void CreateAllNames(string namesPath, BotCallsignsNames usecNames, BotCallsignsNames bearNames)
    {
        try
        {
            var allNamesFilePath = Path.Combine(namesPath, "allNames.json");
            
            if (File.Exists(allNamesFilePath))
            {
                return;
            }
        
            // Combine the names
            var allNames = new List<string>();
            allNames.AddRange(usecNames.Names);
            allNames.AddRange(bearNames.Names);
            
            var allNamesData = new BotCallsignsNames { Names = allNames };
            
            var jsonContent = System.Text.Json.JsonSerializer.Serialize(allNamesData, new System.Text.Json.JsonSerializerOptions 
            { 
                WriteIndented = true 
            });
    
            // Save
            File.WriteAllText(allNamesFilePath, jsonContent);
    
            logger.Info($"[Bot Callsigns] Created allNames.json with {allNames.Count} total names");
        }
        catch (Exception ex)
        {
            logger.Warning($"[Bot Callsigns] Could not create allNames.json: {ex.Message}");
        }
    }

    private void EditNames(List<string> newUsecNames, List<string> newBearNames)
    {
        var botTypes = databaseService.GetBots().Types;
        var usecBots = botTypes.FirstOrDefault(v => v.Key == "usec").Value;
        var bearBots = botTypes.FirstOrDefault(v => v.Key == "bear").Value;
        usecBots!.FirstNames = newUsecNames;
        bearBots!.FirstNames = newBearNames;
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
                logger.Warning("[Bot Callsigns] Directory of TwitchPlayers mod could not be found.");
                return;
            }
            
            // Path to TwitchPlayers
            var pathToTwitchPlayers = Path.Combine(modsDirectory, "TwitchPlayers");
            
            if (!Directory.Exists(pathToTwitchPlayers))
            {
                logger.Warning("[Bot Callsigns] Directory of TwitchPlayers mod could not be found.");
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
            
            logger.Info("[Bot Callsigns] Synced with TwitchPlayers");
        }
        catch (Exception ex)
        {
            logger.Warning($"[Bot Callsigns] Could not send signal file for Twitch Players: {ex.Message}");
        }
    }
}