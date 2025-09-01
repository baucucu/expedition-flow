import { schemaTask, logger } from "@trigger.dev/sdk";
import { z } from "zod";

const N8N_GET_AWB_DATA_URL = "https://n8n.appy.agency/webhook/get-awb-data";

export const getAwbData = schemaTask({
  id: "get-awb-data",
  schema: z.object({
    shipmentId: z.string(),
  }),
  machine: {
    preset: "large-1x", // 4 vCPU, 8 GB RAM
  },
  run: async (payload) => {
    const { shipmentId } = payload;

    const url = new URL(N8N_GET_AWB_DATA_URL);
    url.searchParams.append("shipmentId", shipmentId);

    try {
      logger.info(`Fetching AWB data for shipment ${shipmentId} from n8n`, { url: url.toString() });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("n8n get awb data webhook call failed", { status: response.status, error: errorText });
        throw new Error(`Webhook failed with status ${response.status}: ${errorText}`);
      }
      
      if (response.status === 204 || response.headers.get("content-length") === "0") {
        logger.info(`No AWB found for shipmentId: ${shipmentId}`);
        return null;
      }

      const result = await response.json();
      logger.info("Received AWB data from n8n webhook", { result });

      return result;

    } catch (error: any) {
      logger.error("Error fetching AWB data from n8n", { shipmentId, error: error.message });
      throw error;
    }
  },
});
