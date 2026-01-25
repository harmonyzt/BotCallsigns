using System.Text.Json.Serialization;

namespace BotCallsigns.Models;

public record BotCallsignsNames()
{
    [JsonPropertyName("Names")]
    public List<string> Names { get; set; }
}

public class ModConfig
{
    public bool IncludeDefaultNames { get; set; } = true;
    public bool AutoGenerateAllNames { get; set; } = true;
    public bool EnableUserDefinedNames { get; set; } = true;
}