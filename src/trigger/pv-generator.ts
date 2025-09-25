
import { task, logger, wait } from "@trigger.dev/sdk"; 

const N8N_PV_WEBHOOK_URL = process.env.N8N_PV_WEBHOOK_URL;
const TRIGGER_CONCURRENCY = process.env.TRIGGER_CONCURRENCY ? parseInt(process.env.TRIGGER_CONCURRENCY, 10) : 5;
const TRIGGER_WAIT_TIME = process.env.TRIGGER_WAIT_TIME ? parseInt(process.env.TRIGGER_WAIT_TIME, 10) : 30;

const callN8nWebhook = async (recipient: { id: string; name: string, shipmentId: string, numericId?: string }): Promise<{ recipientId: string; pvUrl?: string; error?: string }> => {
  console.log("received recipient in calln8nwebhook: ", recipient)
  if (!N8N_PV_WEBHOOK_URL || N8N_PV_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
     const errorMessage = "n8n webhook URL is not configured.";
     logger.error(errorMessage);
     return { recipientId: recipient.id, error: errorMessage };
  }

  try {
    logger.info("Calling n8n webhook for PV generation", { recipient });
    const response = await fetch(N8N_PV_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: recipient.name,
        recipient_id: recipient.id,
        shipment_id: recipient.shipmentId,
        numeric_id: recipient.numericId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("n8n webhook call failed", { status: response.status, error: errorText });
      throw new Error(`Webhook failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    logger.info("Received response from n8n webhook", { result });

    return { recipientId: recipient.id, pvUrl: result?.webViewLink };

  } catch (error: any) {
    logger.error("Error processing n8n webhook call", { recipientId: recipient.id, error: error.message });
    return { recipientId: recipient.id, error: error.message };
  }
};

export const generateProcesVerbalTask = task({
    id: "generate-proces-verbal",
    // machine: {
    //   preset: "large-1x", // 4 vCPU, 8 GB RAM
    // },
    queue: {
      concurrencyLimit: TRIGGER_CONCURRENCY,
    },
    run: async (payload: {id: string, name: string, shipmentId: string, numericId?:string}, { ctx }) => {
      const { id, name, shipmentId, numericId } = payload;
      logger.info("recipient payload",{payload})
      logger.info(`Starting PV generation for recipient ${numericId} - ${name} in shipment ${shipmentId}`);
      const result = await callN8nWebhook({ id, name, shipmentId, numericId });
      if(result.error) {
        logger.error(`Failed to generate PV for recipient ${id}`, { error: result.error });
      } else {
        logger.info(`Successfully generated PV for recipient ${id}`, { url: result.pvUrl });
      }
      await wait.for({ seconds: TRIGGER_WAIT_TIME });
      return result;
    },
    retry: {
      maxAttempts: 1,
      minTimeoutInMs: 60000,
    },
  });
  
