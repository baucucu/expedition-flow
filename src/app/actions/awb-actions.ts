
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk/v3";
import type { AWB } from "@/types";

const queueShipmentAwbGenerationActionInputSchema = z.object({
  awbsToQueue: z.array(z.object({
    shipmentId: z.string(),
    awbId: z.string(),
  })),
});

export async function queueShipmentAwbGenerationAction(input: z.infer<typeof queueShipmentAwbGenerationActionInputSchema>) {
    const validatedInput = queueShipmentAwbGenerationActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, message: "Invalid input for queuing AWB generation." };
    }

    const { awbsToQueue } = validatedInput.data;

    if (!awbsToQueue || awbsToQueue.length === 0) {
        return { success: false, message: "No AWBs to queue." };
    }

    try {
        const payloads = awbsToQueue.map(({ shipmentId, awbId }) => ({
            payload: { shipmentId, awbId },
        }));

        await tasks.batchTrigger("generate-awb", payloads);

        return {
            success: true,
            message: `Successfully queued AWB generation for ${payloads.length} shipment(s).`,
        };
    } catch (error: any) {
        console.error("Error queueing AWB generation:", error);
        return { success: false, message: `Failed to queue AWB generation jobs: ${error.message}` };
    }
}

const updateAwbStatusActionInputSchema = z.object({
  awbIds: z.array(z.string()),
});

const CHUNK_SIZE = 30;

export async function updateAwbStatusAction(input: z.infer<typeof updateAwbStatusActionInputSchema>) {
    const validatedInput = updateAwbStatusActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, message: "Invalid input for updating AWB status." };
    }

    const { awbIds } = validatedInput.data;

    if (!awbIds || awbIds.length === 0) {
        return { success: false, message: "No AWBs selected." };
    }

    try {
        const allPayloads = [];

        for (let i = 0; i < awbIds.length; i += CHUNK_SIZE) {
            const awbIdChunk = awbIds.slice(i, i + CHUNK_SIZE);
            if (awbIdChunk.length === 0) continue;

            const awbsQuery = query(collection(db, "awbs"), where(documentId(), "in", awbIdChunk));
            const awbsSnapshot = await getDocs(awbsQuery);
            if (awbsSnapshot.empty) {
                console.warn(`Could not find any AWBs for chunk starting at index ${i}`);
                continue;
            }

            const awbs = awbsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id }) as AWB);

            for (const awb of awbs) {
                if (awb.awb_data?.awbNumber) {
                    allPayloads.push({
                        payload: {
                            awbNumber: awb.awb_data.awbNumber,
                            awbDocId: awb.id,
                        },
                    });
                }
            }
        }
        
        if (allPayloads.length > 0) {
             await tasks.batchTrigger("update-awb-status", allPayloads);
        }

        return { 
            success: true, 
            message: `Successfully queued AWB status update jobs for ${allPayloads.length} AWB(s).`
        };

    } catch (error: any) {
        console.error("Error queueing AWB status update:", error);
        return { success: false, message: `Failed to queue AWB status update jobs: ${error.message}` };
    }
}
