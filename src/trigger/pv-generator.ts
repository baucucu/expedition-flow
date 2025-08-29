import { task, logger } from "@trigger.dev/sdk"; // v4 uses this import
import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

const N8N_PV_WEBHOOK_URL = process.env.N8N_PV_WEBHOOK_URL;

const callN8nWebhook = async (recipient: { id: string; name: string, shipmentId: string }): Promise<{ recipientId: string; pvUrl?: string; error?: string }> => {
  if (!N8N_PV_WEBHOOK_URL || N8N_PV_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
     logger.error("n8n webhook URL is not configured.");
     return { recipientId: recipient.id, error: 'n8n webhook URL is not configured.' };
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("n8n webhook call failed", { status: response.status, error: errorText });
      throw new Error(`Webhook failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    logger.info("Received response from n8n webhook", { result });

    const docId = result?.id;
    const webViewLink = result?.webViewLink;

    if (!docId || !webViewLink) {
      throw new Error('Webhook response did not include a document ID or webViewLink.');
    }

    // Update Firestore
    const recipientRef = doc(db, "recipients", recipient.id);
    await updateDoc(recipientRef, {
      pvId: docId,
      pvUrl: webViewLink,
      'documents.proces verbal de receptie.status': 'Generated',
      'documents.proces verbal de receptie.url': webViewLink,
      'documents.proces verbal de receptie.fileId': docId,
    });

    return { recipientId: recipient.id, pvUrl: webViewLink };

  } catch (error: any) {
    logger.error("Error processing n8n webhook call or updating Firestore", { recipientId: recipient.id, error: error.message });
    // Update status to failed in Firestore
    try {
        const recipientRef = doc(db, "recipients", recipient.id);
        await updateDoc(recipientRef, {
        'documents.proces verbal de receptie.status': 'Failed',
        'documents.proces verbal de receptie.error': error.message
        });
    } catch (firestoreError: any) {
        logger.error("Failed to update recipient status to 'Failed' in Firestore", { recipientId: recipient.id, error: firestoreError.message });
    }
    return { recipientId: recipient.id, error: error.message };
  }
};

export const generateProcesVerbalTask = task({
    id: "generate-proces-verbal",
    run: async (payload: {id: string, name: string, shipmentId: string}, { ctx }) => {
      const { id, name, shipmentId } = payload;
      logger.info(`Starting PV generation for recipient ${id} - ${name} in shipment ${shipmentId}`);
      const result = await callN8nWebhook({ id, name, shipmentId });
      if(result.error) {
        logger.error(`Failed to generate PV for recipient ${id}`, { error: result.error });
      } else {
        logger.info(`Successfully generated PV for recipient ${id}`, { url: result.pvUrl });
      }
      return result;
    },
    retry: {
      maxAttempts: 1,
      minTimeoutInMs: 60000,
    },
  });
  
