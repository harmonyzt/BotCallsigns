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
public class EditBotNames(
    ISptLogger<EditBotNames> logger,
    DatabaseService databaseService,
    ModHelper modHelper)
    : IOnLoad
{

    public Task OnLoad()
    {
        var namesPath = modHelper.GetAbsolutePathToModFolder(Assembly.GetExecutingAssembly());
        var currentPath = Path.Combine(namesPath, "nameData/");
        
        var usecNames = modHelper.GetJsonDataFromFile<BotCallsignsNames>(currentPath, "usec.json");
        var bearNames = modHelper.GetJsonDataFromFile<BotCallsignsNames>(currentPath, "bear.json");

        EditNames(usecNames.Names, bearNames.Names);

        logger.Success($"[Bot Callsigns] Loaded {usecNames.Names.Count()} USEC names and {bearNames.Names.Count()} BEAR names");

        return Task.CompletedTask;
    }

    private void EditNames( List<string> newUsecNames, List<string> newBearNames )
    {
        var botTypes = databaseService.GetBots().Types;
        var usecBots = botTypes.FirstOrDefault(v => v.Key == "usec").Value;
        var bearBots = botTypes.FirstOrDefault(v => v.Key == "bear").Value;
        
        usecBots!.FirstNames = newUsecNames;
        bearBots!.FirstNames = newBearNames;
    }
}