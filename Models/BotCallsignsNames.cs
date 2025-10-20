using System.Text.Json.Serialization;

namespace BotCallsigns.Models;

public record BotCallsignsNames()
{
    [JsonPropertyName("Names")]
    public List<string> Names { get; set; }
}