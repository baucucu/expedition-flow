import { schemaTask, logger } from "@trigger.dev/sdk";
import { z } from "zod";

// Define the input schema for searchSamedayCity task
const SearchCityInputSchema = z.object({
  cityName: z.string(),
  countyId: z.string(),
});

// Define the output schema for searchSamedayCity task
const SearchCityOutputSchema = z.object({
  cityId: z.string(),
  name: z.string(),
  postalCode: z.string().nullable(), // Postal code can be null/optional
});

export const searchCity = schemaTask({
  id: "search-sameday-city",
  // machine: {
  //   preset: "large-1x", // 4 vCPU, 8 GB RAM
  // },
  schema: SearchCityInputSchema,
  run: async (payload: z.infer<typeof SearchCityInputSchema>): Promise<z.infer<typeof SearchCityOutputSchema>> => {
    const { cityName, countyId } = payload;
    const samedayApiUrl = process.env.SAMEDAY_API_URL;
    const samedayApiToken = process.env.SAMEDAY_API_TOKEN;

    if (!samedayApiUrl) {
      logger.error("SAMEDAY_API_URL environment variable is not set.");
      throw new Error("Sameday API URL is not configured.");
    }

    if (!samedayApiToken) {
      logger.error("SAMEDAY_API_TOKEN environment variable is not set.");
      throw new Error("Sameday API token is not configured.");
    }

    const endpoint = "/geolocation/city";
    const url = new URL(`${samedayApiUrl}${endpoint}`);
    url.searchParams.append("name", cityName);
    url.searchParams.append("county", String(countyId));

    logger.info(`Searching for city: ${cityName} in county ID: ${countyId}`, {
      url: url.toString(),
    });

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-Auth-Token": samedayApiToken,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.message || JSON.stringify(data);
        logger.error(`Sameday API Error at ${endpoint}`, {
          status: response.status,
          body: data,
        });
        throw new Error(`Sameday API Error at ${endpoint}: ${errorMessage}`);
      }

      const body = data;
      if (!body || !Array.isArray(body.data) || body.data.length === 0 || !body.data[0].id) {
        logger.error("City not found or unexpected API response", {
          cityName: cityName,
          countyId: countyId,
          responseBody: body,
        });
        throw new Error(
          `Failed to find city \'${cityName}\' in county ${countyId}.`
        );
      }
      
      const cityId = body.data[0].id.toString();
      const foundCityName = body.data[0].name;
      const postalCode = body.data[0].postalCode || null; // Handle potential null postalCode
      logger.info(`Found city ID: ${cityId}`, { cityName: foundCityName, countyId: countyId });

      return {
        cityId: cityId,
        name: foundCityName,
        postalCode: postalCode
      };

    } catch (error: any) {
      logger.error(`Error during Sameday city search: ${error.message}`, {
        error: error,
      });
      throw new Error(`Failed to search for city: ${error.message}`);
    }
  },
});