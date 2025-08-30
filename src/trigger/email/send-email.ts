
import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import type { Recipient, AWB } from "@/types";

const SendEmailPayloadSchema = z.object({
  shipmentId: z.string(),
});

const N8N_EMAIL_WEBHOOK_URL = process.env.N8N_EMAIL_WEBHOOK_URL || "https://n8n.appy.agency/webhook/send-email";

export const sendEmailTask = task({
  id: "send-email",
  run: async (payload: z.infer<typeof SendEmailPayloadSchema>, { ctx }) => {
    logger.info(`Starting email sending task for shipment: ${payload.shipmentId}`);
    const { shipmentId } = payload;

    if (!N8N_EMAIL_WEBHOOK_URL) {
        logger.error("n8n email webhook URL is not configured.");
        throw new Error("N8N_EMAIL_WEBHOOK_URL is not configured.");
    }

    try {
        // 1. Fetch the AWB for this shipment to get parcel count and other details
        const awbQuery = query(collection(db, "awbs"), where("shipmentId", "==", shipmentId));
        const awbSnapshot = await getDocs(awbQuery);
        if (awbSnapshot.empty) {
            throw new Error(`No AWB found for shipment ID: ${shipmentId}`);
        }
        const awbData = awbSnapshot.docs[0].data() as AWB;
        const awbId = awbSnapshot.docs[0].id;

        // 2. Fetch all recipients for this shipment
        const recipientsQuery = query(collection(db, "recipients"), where("shipmentId", "==", shipmentId));
        const recipientsSnapshot = await getDocs(recipientsQuery);
        const recipients = recipientsSnapshot.docs.map(doc => doc.data() as Recipient);
        
        const recipientList = recipients.map(r => ({
            recipientId: r.id,
            name: r.name,
            pvDocumentId: r.pvId,
        }));

        // 3. Fetch static document IDs
        const inventoryDocRef = doc(db, "static_documents", "inventory");
        const instructionsDocRef = doc(db, "static_documents", "instructions");
        
        const inventoryDocSnap = await getDoc(inventoryDocRef);
        const instructionsDocSnap = await getDoc(instructionsDocRef);

        const inventoryDocumentId = inventoryDocSnap.exists() ? inventoryDocSnap.data().fileId : null;
        const instructionsDocumentId = instructionsDocSnap.exists() ? instructionsDocSnap.data().fileId : null;

        // 4. Construct the webhook payload
        const webhookPayload = {
            shipmentId: shipmentId,
            awbNumber: awbData.awb_data?.awbNumber,
            awbDocumentId: awbData.awb_data?.pdfLink, // Using pdfLink from awb_data
            awbNumberOfParcels: awbData.parcelCount,
            inventoryDocumentId: inventoryDocumentId,
            instructionsDocumentId: instructionsDocumentId,
            recipients: recipientList,
        };

        logger.info(`Sending payload to n8n for shipment ${shipmentId}`, { payload: webhookPayload });
        
        // 5. Call the n8n webhook
        const response = await fetch(N8N_EMAIL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
        });

        const responseBody = await response.text();
        if (!response.ok) {
            logger.error("n8n email webhook call failed", { status: response.status, body: responseBody });
            throw new Error(`Webhook failed with status ${response.status}: ${responseBody}`);
        }

        logger.info(`Successfully called email webhook for shipment ${shipmentId}`, { response: responseBody });

        return { success: true, shipmentId, response: responseBody };

    } catch (error: any) {
        logger.error(`Error in email sending task for shipment ${shipmentId}: ${error.message}`);
        // Here you could update the shipment to 'Email Send Failed' status
        throw error; // Rethrow to let the orchestrator know it failed
    }
  },
});
