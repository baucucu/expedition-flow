
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk/v3";
import type { Recipient } from "@/types";

const sendEmailToLogisticsActionInputSchema = z.object({
  recipientIds: z.array(z.string()),
});

const CHUNK_SIZE = 500;

export async function sendEmailToLogisticsAction(input: z.infer<typeof sendEmailToLogisticsActionInputSchema>) {
    const validatedInput = sendEmailToLogisticsActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, message: "Invalid input for sending email." };
    }

    const { recipientIds } = validatedInput.data;

    if (!recipientIds || recipientIds.length === 0) {
        return { success: false, message: "No recipients selected." };
    }

    try {
        // 1. Fetch all selected recipients to find their unique shipment IDs
        const recipientsQuery = query(collection(db, "recipients"), where("id", "in", recipientIds));
        const recipientsSnapshot = await getDocs(recipientsQuery);
        
        if (recipientsSnapshot.empty) {
            return { success: false, message: "Could not find any of the selected recipients in the database." };
        }
        
        const recipients = recipientsSnapshot.docs.map(doc => doc.data() as Recipient);
        const uniqueShipmentIds = [...new Set(recipients.map(r => r.shipmentId))];

        // 2. Prepare the events for Trigger.dev for each unique shipment
        const payloads = uniqueShipmentIds.map(shipmentId => ({
            payload: { shipmentId },
        }));

        // 3. Send all events to Trigger.dev in chunks
        if (payloads.length > 0) {
            for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
                const chunk = payloads.slice(i, i + CHUNK_SIZE);
                // The first argument is the task ID, the second is an array of payloads.
                await tasks.batchTrigger("send-email-orchestrator", chunk);
            }
        }

        return { 
            success: true, 
            message: `Successfully queued email jobs for ${uniqueShipmentIds.length} shipment(s).`
        };

    } catch (error: any) {
        console.error("Error queueing email generation:", error);
        return { success: false, message: `Failed to queue email jobs: ${error.message}` };
    }
}
