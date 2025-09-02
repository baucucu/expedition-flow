
import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";

const RecipientSchema = z.object({
  recipientId: z.string(),
  numericId: z.string(),
  name: z.string(),
  pvDocumentId: z.string().nullable(),
  pvUrl: z.string().nullable(),
});

const SendEmailPayloadSchema = z.object({
  shipmentId: z.string(),
  awbNumber: z.string().optional(),
  awbDocumentId: z.string().optional().nullable(),
  awbNumberOfParcels: z.number().optional(),
  inventoryDocumentId: z.string().nullable(),
  instructionsDocumentId: z.string().nullable(),
  recipients: z.array(RecipientSchema),
});

const N8N_EMAIL_WEBHOOK_URL = process.env.N8N_EMAIL_WEBHOOK_URL;

export const sendEmailTask = task({
  id: "send-email",
  machine: {
    preset: "large-1x", // 4 vCPU, 8 GB RAM
  },
  run: async (payload: z.infer<typeof SendEmailPayloadSchema>, { ctx }) => {
    logger.info(`Starting email sending task for shipment: ${payload.shipmentId}`);
    
    if (!N8N_EMAIL_WEBHOOK_URL) {
        logger.error("N8N_EMAIL_WEBHOOK_URL is not configured. Cannot send email.");
        throw new Error("N8N_EMAIL_WEBHOOK_URL is not configured.");
    }

    try {
        logger.info(`Sending payload to n8n for shipment ${payload.shipmentId}`, { payload });
        
        const response = await fetch(N8N_EMAIL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseBody = await response.text();

        if (!response.ok) {
            logger.error("n8n email webhook call failed", { 
                status: response.status, 
                body: responseBody,
                shipmentId: payload.shipmentId,
            });
            throw new Error(`Webhook failed with status ${response.status}: ${responseBody}`);
        }

        logger.info(`Successfully called email webhook for shipment ${payload.shipmentId}`, { 
            response: responseBody 
        });

        return { success: true, shipmentId: payload.shipmentId, response: responseBody };

    } catch (error: any) {
        logger.error(`Error in email sending task for shipment ${payload.shipmentId}: ${error.message}`);
        throw error;
    }
  },
});
