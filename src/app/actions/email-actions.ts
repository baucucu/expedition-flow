
"use server";

import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { db } from "@/lib/firebase";
import { writeBatch, doc, collection, query, where, getDocs, getDoc } from "firebase/firestore";

const RecipientSchemaForEmail = z.object({
  recipientId: z.string(),
  numericId: z.string().optional(),
  uuid: z.string().optional(),
  name: z.string(),
  pvDocumentId: z.string().nullable().optional(),
  pvUrl: z.string().nullable().optional(),
});

const EmailPayloadSchema = z.object({
  shipmentId: z.string(),
  awbNumber: z.string().optional(),
  awbUrl: z.string().optional().nullable(),
  awbDocumentId: z.string().optional().nullable(),
  awbNumberOfParcels: z.number().optional(),
  inventoryDocumentId: z.string().nullable().optional(),
  instructionsDocumentId: z.string().nullable().optional(),
  recipients: z.array(RecipientSchemaForEmail),
});

const sendEmailToLogisticsActionInputSchema = z.object({
  payloads: z.array(EmailPayloadSchema),
});

const LOGISTICS_EMAIL = process.env.EMAIL_DEPOZIT;

export async function sendEmailToLogisticsAction(input: z.infer<typeof sendEmailToLogisticsActionInputSchema>) {
    const validatedInput = sendEmailToLogisticsActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, message: "Invalid input for sending email." };
    }

    if (!LOGISTICS_EMAIL) {
        throw new Error("EMAIL_DEPOZIT is not configured.");
    }

    const { payloads } = validatedInput.data;

    if (!payloads || payloads.length === 0) {
        return { success: false, message: "No email payloads to process." };
    }
    
    try {
        const shipmentIds = [...new Set(payloads.map(p => p.shipmentId))];
        if (shipmentIds.length === 0) {
            return { success: false, message: "No shipments to process." };
        }

        // Fetch emailSentCount for each awb
        const finalPayloads = new Map<string, any>();

        for (const originalPayload of payloads) {
            if (!finalPayloads.has(originalPayload.shipmentId)) {
                let emailSentCount = 0;
                if (originalPayload.awbDocumentId) {
                    const awbDocRef = doc(db, 'awbs', originalPayload.awbDocumentId);
                    const awbDocSnap = await getDoc(awbDocRef);
                    if (awbDocSnap.exists()) {
                        const awbData = awbDocSnap.data();
                        // Default to 0 if the field is null or doesn't exist
                        emailSentCount = awbData.emailSentCount || 0;
                    }
                }
                
                const recipientsQuery = query(collection(db, "recipients"), where("shipmentId", "==", originalPayload.shipmentId));
                const recipientsSnapshot = await getDocs(recipientsQuery);
                const allRecipients = recipientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const newPayload = {
                    ...originalPayload,
                    emailSentCount, // Add the count here
                    recipients: allRecipients.map(r => ({
                        recipientId: r.id,
                        numericId: r.numericId,
                        uuid: r.uuid,
                        name: r.name,
                        pvDocumentId: r.pvId || null,
                        pvUrl: r.pvUrl || null,
                    })),
                };
                finalPayloads.set(originalPayload.shipmentId, newPayload);
            }
        }

        const eventsToTrigger = Array.from(finalPayloads.values()).map(p => ({ 
            payload: {
                ...p,
                logisticsEmail: LOGISTICS_EMAIL
            } 
        }));
        
        await tasks.batchTrigger("send-email", eventsToTrigger);
        
        const batch = writeBatch(db);
        const awbIdsToUpdate = payloads
            .map(p => p.awbDocumentId)
            .filter((id): id is string => !!id);

        awbIdsToUpdate.forEach(awbId => {
            const awbRef = doc(db, "awbs", awbId);
            batch.update(awbRef, { emailStatus: 'Queued' });
        });
        await batch.commit();

        return { 
            success: true, 
            message: `Successfully queued email jobs for ${finalPayloads.size} shipment(s).`
        };

    } catch (error: any) {
        console.error("Error queueing email generation:", error);
        return { success: false, message: `Failed to queue email jobs: ${error.message}` };
    }
}
