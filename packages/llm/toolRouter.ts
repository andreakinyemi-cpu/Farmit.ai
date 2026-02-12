import { z } from "zod";
import { webSearch } from "../tools/webSearch";
import { getWeather } from "../tools/weather";

const WebSearchSchema = z.object({
  query: z.string().min(1),
  max_results: z.number().int().min(1).max(10).default(5),
});

const WeatherSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  timestamp: z.string().optional(),
});

export const toolSchemas = [
  {
    name: "web_search",
    description: "Search the web for up-to-date information. Returns results with URLs.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        max_results: { type: "integer", default: 5 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_weather",
    description: "Get historical or current weather for a lat/lon and optional timestamp.",
    input_schema: {
      type: "object",
      properties: {
        lat: { type: "number" },
        lon: { type: "number" },
        timestamp: { type: "string" },
      },
      required: ["lat", "lon"],
      additionalProperties: false,
    },
  },
];

export async function runTool(name: string, rawArgs: unknown) {
  switch (name) {
    case "web_search": {
      const args = WebSearchSchema.parse(rawArgs);
      return webSearch(args.query, args.max_results);
    }
    case "get_weather": {
      const args = WeatherSchema.parse(rawArgs);
      return getWeather(args.lat, args.lon, args.timestamp);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
