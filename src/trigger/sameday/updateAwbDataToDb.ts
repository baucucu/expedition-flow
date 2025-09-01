import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";

const UpdateAwbPayloadSchema = z.object({
  shipmentId: z.string(),
  awbData: z.object({
    awbNumber: z.string(),
    awbCost: z.number(),
    parcels: z.array(z.object({ position: z.number(), awbNumber: z.string() })),
    pdfLink: z.string(),
    pickupLogisticLocation: z.string(),
    deliveryLogisticLocation: z.string(),
    deliveryLogisticCircle: z.string(),
    sortingHub: z.string(),
    sortingHubId: z.number(),
    deliveryLogisticLocationId: z.number(),
    pickupLogisticLocationId: z.number(),
  }),
});

export const updateAwbDataToDb = task({
  id: "update-awb-data-to-db",
  machine: {
    preset: "large-1x", // 4 vCPU, 8 GB RAM
  },
  run: async (payload: z.infer<typeof UpdateAwbPayloadSchema>) => {
    logger.info("Updating database via n8n webhook");
    const { shipmentId, awbData } = payload;

    try {
      const response = await fetch(process.env.N8N_UPDATE_AWB_DATA_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId, awbData }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("n8n update awb data webhook call failed", { status: response.status, error: errorText });
        throw new Error(`Webhook failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      logger.info("Received response from n8n update awb data webhook", { result });

      return result;

    } catch (error: any) {
      logger.error("Error updating AWB data via n8n", { shipmentId, error: error.message });
      throw error;
    }
  },
});
