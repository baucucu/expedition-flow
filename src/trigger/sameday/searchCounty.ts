import { schemaTask, logger } from "@trigger.dev/sdk";
import { z } from "zod";

// Define the input schema for searchSamedayCounty task
const SearchCountyInputSchema = z.object({
  countyName: z.string(),
});

// Define the output schema for searchSamedayCounty task
const SearchCountyOutputSchema = z.object({
  countyId: z.string(),
});

export const searchCounty = schemaTask({
  id: "search-sameday-county",
  machine: {
    preset: "large-1x", // 4 vCPU, 8 GB RAM
  },
  schema: SearchCountyInputSchema,
  run: async (payload: z.infer<typeof SearchCountyInputSchema>): Promise<z.infer<typeof SearchCountyOutputSchema>> => {
    const { countyName } = payload;

    logger.info("Searching for Sameday county", { countyName });

    const apiUrl = process.env.SAMEDAY_API_URL;
    const apiToken = process.env.SAMEDAY_API_TOKEN;

    if (!apiUrl || !apiToken) {
      const error = new Error("Sameday API URL or Token is not configured.");
      logger.error("Configuration error", { error });
      throw error;
    }

    const endpoint = `${apiUrl}/geolocation/county?name=${encodeURIComponent(countyName)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Auth-Token": apiToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Sameday API error: ${response.status} - ${errorText}`);
      logger.error("API request failed", { error });
      throw error;
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.data) || data.data.length === 0 || !data.data[0].id) {
      const error = new Error(`County \"${countyName}\" not found or unexpected API response.`);
      logger.warn("County not found", { countyName, responseData: data });
      throw error;
    }

    const countyId = data.data[0].id.toString();
    logger.info("Sameday county search result", { countyId });

    return countyId;
  },
});