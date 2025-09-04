
"use server";

import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";

const UpdateAwbStatusPayloadSchema = z.object({
  awbNumber: z.string(),
  awbDocId: z.string(),
});

const N8N_UPDATE_AWB_STATUS_URL = process.env.N8N_UPDATE_AWB_STATUS_URL;

export const updateAwbStatusTask = task({
  id: "update-awb-status",
  queue: {
    concurrencyLimit: 10,
  },
  run: async (payload: z.infer<typeof UpdateAwbStatusPayloadSchema>, { ctx }) => {
    logger.info(`Starting AWB status update task for AWB: ${payload.awbNumber}`);
    
    if (!N8N_UPDATE_AWB_STATUS_URL) {
        logger.error("N8N_UPDATE_AWB_STATUS_URL is not configured. Cannot update AWB status.");
        throw new Error("N8N_UPDATE_AWB_STATUS_URL is not configured.");
    }

    try {
        logger.info(`Sending payload to n8n for AWB ${payload.awbNumber}`, { payload });
        
        const response = await fetch(N8N_UPDATE_AWB_STATUS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseBody = await response.text();

        if (!response.ok) {
            logger.error("n8n update AWB status webhook call failed", { 
                status: response.status, 
                body: responseBody,
                awbNumber: payload.awbNumber,
            });
            throw new Error(`Webhook failed with status ${response.status}: ${responseBody}`);
        }

        logger.info(`Successfully called update AWB status webhook for AWB ${payload.awbNumber}`, { 
            response: responseBody 
        });

        return { success: true, awbNumber: payload.awbNumber, response: responseBody };

    } catch (error: any) {
        logger.error(`Error in update AWB status task for AWB ${payload.awbNumber}: ${error.message}`);
        throw error;
    }
  },
});
