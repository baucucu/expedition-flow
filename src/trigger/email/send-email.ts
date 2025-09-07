
"use server";

import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";

const RecipientSchema = z.object({
  recipientId: z.string(),
  numericId: z.string().optional(),
  uuid: z.string().optional(),
  name: z.string(),
  pvDocumentId: z.string().nullable().optional(),
  pvUrl: z.string().nullable().optional(),
});

const SendEmailPayloadSchema = z.object({
  logisticsEmail: z.string().optional(),
  shipmentId: z.string(),
  awbNumber: z.string().optional(),
  awbUrl: z.string().optional().nullable(),
  awbDocumentId: z.string().optional().nullable(),
  awbNumberOfParcels: z.number().optional(),
  inventoryDocumentId: z.string().nullable().optional(),
  instructionsDocumentId: z.string().nullable().optional(),
  recipients: z.array(RecipientSchema),
});

const N8N_EMAIL_WEBHOOK_URL = process.env.N8N_EMAIL_WEBHOOK_URL;
const LOGISTICS_EMAIL = process.env.EMAIL_DEPOZIT;

export const sendEmailTask = task({
  id: "send-email",
  queue: {
    concurrencyLimit: 10,
  },
  run: async (payload: z.infer<typeof SendEmailPayloadSchema>, { ctx }) => {
    logger.info(`Starting email sending task for shipment: ${payload.shipmentId}`);
    
    if (!N8N_EMAIL_WEBHOOK_URL) {
        logger.error("N8N_EMAIL_WEBHOOK_URL is not configured. Cannot send email.");
        throw new Error("N8N_EMAIL_WEBHOOK_URL is not configured.");
    }
    
    if (!LOGISTICS_EMAIL) {
        logger.error("EMAIL_DEPOZIT is not configured in environment variables.");
        throw new Error("EMAIL_DEPOZIT is not configured.");
    }

    try {
        const payloadForN8n = {
            ...payload,
            logisticsEmail: LOGISTICS_EMAIL,
        };

        logger.info(`Sending payload to n8n for shipment ${payload.shipmentId}`, { payload: payloadForN8n });
        
        const response = await fetch(N8N_EMAIL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadForN8n),
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
