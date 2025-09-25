
import { task, logger, wait } from "@trigger.dev/sdk";
import { z } from "zod";

const ReminderPayloadSchema = z.object({
  instructionsDocumentId: z.string(),
  pvUrl: z.string(),
  recipientEmail: z.string(),
  recipientName: z.string(),
  recipientId: z.string(),
  location: z.string(),
  awbMainRecipientName: z.string(),
  isAwbOwner: z.boolean(),
  parcels: z.number(),
});

const N8N_REMINDER_WEBHOOK_URL = process.env.N8N_REMINDER_WEBHOOK_URL;
const TRIGGER_CONCURRENCY = process.env.TRIGGER_CONCURRENCY ? parseInt(process.env.TRIGGER_CONCURRENCY, 10) : 5;
const TRIGGER_WAIT_TIME = process.env.TRIGGER_WAIT_TIME ? parseInt(process.env.TRIGGER_WAIT_TIME, 10) : 30;

export const sendReminderTask = task({
  id: "send-reminder",
  queue: {
    concurrencyLimit: TRIGGER_CONCURRENCY,
  },
  run: async (payload: z.infer<typeof ReminderPayloadSchema>, { ctx }) => {
    logger.info(`Starting reminder sending task for recipient: ${payload.recipientId}`);
    
    if (!N8N_REMINDER_WEBHOOK_URL) {
        logger.error("N8N_REMINDER_WEBHOOK_URL is not configured. Cannot send reminder.");
        throw new Error("N8N_REMINDER_WEBHOOK_URL is not configured.");
    }

    try {
        logger.info(`Sending payload to n8n for recipient document: ${payload.recipientId}`, { payload });
        
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
                instructionsDocumentId: payload.instructionsDocumentId,
            });
            throw new Error(`Webhook failed with status ${response.status}: ${responseBody}`);
        }

        logger.info(`Successfully called reminder webhook for recipient ${payload.recipientId}`, { 
            response: responseBody 
        });

        await wait.for({ seconds: TRIGGER_WAIT_TIME });
        return { success: true, instructionsDocumentId: payload.instructionsDocumentId, response: responseBody };

    } catch (error: any) {
        logger.error(`Error in reminder sending task for recipient ${payload.recipientId}: ${error.message}`);
        throw error;
    }
  },
});
