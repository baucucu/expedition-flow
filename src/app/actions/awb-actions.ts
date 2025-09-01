
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { writeBatch, doc } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk/v3";


// Action for Queuing Shipment AWB Generation with Trigger.dev
const queueShipmentAwbGenerationActionInputSchema = z.object({
  awbsToQueue: z.array(z.object({
    shipmentId: z.string(),
    awbId: z.string(),
  })),
});

const CHUNK_SIZE = 500;

export async function queueShipmentAwbGenerationAction(input: z.infer<typeof queueShipmentAwbGenerationActionInputSchema>) {
    const validatedInput = queueShipmentAwbGenerationActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, message: "Invalid input for queueing AWB generation." };
    }

    const { awbsToQueue } = validatedInput.data;

    if (!awbsToQueue || !Array.isArray(awbsToQueue)) {
        return { success: false, message: "Internal error: awbsToQueue is not a valid array." };
    }
    
    // Get unique shipment IDs
    const shipmentIds = [...new Set(awbsToQueue.map(item => item.shipmentId))];

    try {
        // 1. Mark all relevant AWBs as 'Queued' in Firestore in a single batch
        const batch = writeBatch(db);
        for (const item of awbsToQueue) {
            const awbRef = doc(db, "awbs", item.awbId);
            batch.update(awbRef, { status: "Queued" });
        }
        await batch.commit();


        // 2. Prepare the events for Trigger.dev for each unique shipment
        const payloads = shipmentIds.map(shipmentId => ({
            payload: { shipmentId },
        }));

        // 3. Send all events to Trigger.dev in chunks
        if (payloads.length > 0) {
            for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
                const chunk = payloads.slice(i, i + CHUNK_SIZE);
                // The first argument is the task ID, the second is an array of payloads.
                await tasks.batchTrigger("awb-generator", chunk);
            }
        }

        return { 
            success: true, 
            message: `Successfully queued ${shipmentIds.length} shipment(s) for AWB generation.`
        };

    } catch (error: any) {
        console.error("Error queueing AWB generation:", error);
        return { success: false, message: `Failed to queue jobs: ${error.message}` };
    }
}
