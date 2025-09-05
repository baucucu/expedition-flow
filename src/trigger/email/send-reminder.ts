
import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";

const ReminderPayloadSchema = z.object({
  documentId: z.string(),
  recipientEmail: z.string(),
});

const N8N_REMINDER_WEBHOOK_URL = process.env.N8N_REMINDER_WEBHOOK_URL;

export const sendReminderTask = task({
  id: "send-reminder",
  queue: {
    concurrencyLimit: 10,
  },
  run: async (payload: z.infer<typeof ReminderPayloadSchema>, { ctx }) => {
    logger.info(`Starting reminder sending task for document: ${payload.documentId}`);
    
    if (!N8N_REMINDER_WEBHOOK_URL) {
        logger.error("N8N_REMINDER_WEBHOOK_URL is not configured. Cannot send reminder.");
        throw new Error("N8N_REMINDER_WEBHOOK_URL is not configured.");
    }

    try {
        logger.info(`Sending payload to n8n for document ${payload.documentId}`, { payload });
        
        const response = await fetch(N8N_REMINDER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseBody = await response.text();

        if (!response.ok) {
            logger.error("n8n reminder webhook call failed", { 
                status: response.status, 
                body: responseBody,
                documentId: payload.documentId,
            });
            throw new Error(`Webhook failed with status ${response.status}: ${responseBody}`);
        }

        logger.info(`Successfully called reminder webhook for document ${payload.documentId}`, { 
            response: responseBody 
        });

        return { success: true, documentId: payload.documentId, response: responseBody };

    } catch (error: any) {
        logger.error(`Error in reminder sending task for document ${payload.documentId}: ${error.message}`);
        throw error;
    }
  },
});
