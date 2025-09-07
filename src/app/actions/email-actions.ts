
"use server";

import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { db } from "@/lib/firebase";
import { writeBatch, doc } from "firebase/firestore";

const RecipientSchemaForEmail = z.object({
  recipientId: z.string(),
  numericId: z.string().optional(),
  uuid: z.string().optional(),
  name: z.string(),
  pvDocumentId: z.string().nullable().optional(),
  pvUrl: z.string().nullable().optional(),
});

const EmailPayloadSchema = z.object({
  logisticsEmail: z.string().optional(),
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


export async function sendEmailToLogisticsAction(input: z.infer<typeof sendEmailToLogisticsActionInputSchema>) {
    const validatedInput = sendEmailToLogisticsActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, message: "Invalid input for sending email." };
    }

    const { payloads } = validatedInput.data;

    if (!payloads || payloads.length === 0) {
        return { success: false, message: "No email payloads to process." };
    }

    try {
        const eventsToTrigger = payloads.map(p => ({ payload: p }));
        
        await tasks.batchTrigger("send-email", eventsToTrigger);
        
        // After successfully queueing the tasks, update the emailStatus for the corresponding AWBs
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
            message: `Successfully queued email jobs for ${payloads.length} shipment(s).`
        };

    } catch (error: any) {
        console.error("Error queueing email generation:", error);
        return { success: false, message: `Failed to queue email jobs: ${error.message}` };
    }
}
