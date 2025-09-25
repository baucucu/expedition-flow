
import { task, logger, wait } from "@trigger.dev/sdk";
import { z } from "zod";

const FormatPvSemnatPayloadSchema = z.object({
  recipientDocId: z.string(),
  pvSemnatUrl: z.string(),
});

const N8N_FORMAT_IMAGE_URL = process.env.N8N_FORMAT_IMAGE_URL;
const TRIGGER_CONCURRENCY = process.env.TRIGGER_CONCURRENCY ? parseInt(process.env.TRIGGER_CONCURRENCY, 10) : 5;
const TRIGGER_WAIT_TIME = process.env.TRIGGER_WAIT_TIME ? parseInt(process.env.TRIGGER_WAIT_TIME, 10) : 30;

export const formatPvSemnatTask = task({
  id: "format-pv-semnat",
  queue: {
    concurrencyLimit: TRIGGER_CONCURRENCY,
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

        await wait.for({ seconds: TRIGGER_WAIT_TIME });
        return { success: true, recipientDocId: payload.recipientDocId, response: responseBody };

    } catch (error: any) {
        logger.error(`Error in format PV Semnat task for recipient ${payload.recipientDocId}: ${error.message}`);
        throw error;
    }
  },
});
