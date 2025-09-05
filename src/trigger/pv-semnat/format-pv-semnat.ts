
import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";

const FormatPvSemnatPayloadSchema = z.object({
  recipientDocId: z.string(),
  pvSemnatUrl: z.string(),
});

const N8N_FORMAT_IMAGE_URL = process.env.N8N_FORMAT_IMAGE_URL;

export const formatPvSemnatTask = task({
  id: "format-pv-semnat",
  queue: {
    concurrencyLimit: 10,
  },
  run: async (payload: z.infer<typeof FormatPvSemnatPayloadSchema>, { ctx }) => {
    logger.info(`Starting format PV Semnat task for recipient: ${payload.recipientDocId}`);
    
    if (!N8N_FORMAT_IMAGE_URL) {
        logger.error("N8N_FORMAT_IMAGE_URL is not configured. Cannot format PV Semnat.");
        throw new Error("N8N_FORMAT_IMAGE_URL is not configured.");
    }

    try {
        logger.info(`Sending payload to n8n for recipient ${payload.recipientDocId}`, { payload });
        
        const response = await fetch(N8N_FORMAT_IMAGE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseBody = await response.text();

        if (!response.ok) {
            logger.error("n8n format image webhook call failed", { 
                status: response.status, 
                body: responseBody,
                recipientDocId: payload.recipientDocId,
            });
            throw new Error(`Webhook failed with status ${response.status}: ${responseBody}`);
        }

        logger.info(`Successfully called format image webhook for recipient ${payload.recipientDocId}`, { 
            response: responseBody 
        });

        return { success: true, recipientDocId: payload.recipientDocId, response: responseBody };

    } catch (error: any) {
        logger.error(`Error in format PV Semnat task for recipient ${payload.recipientDocId}: ${error.message}`);
        throw error;
    }
  },
});
