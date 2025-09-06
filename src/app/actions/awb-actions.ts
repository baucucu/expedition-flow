
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId, doc, updateDoc, arrayUnion, serverTimestamp, writeBatch } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk/v3";
import type { AWB } from "@/types";
import { randomUUID } from "crypto";

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

        const batch = writeBatch(db);
        awbsToQueue.forEach(({ awbId }) => {
            const awbRef = doc(db, "awbs", awbId);
            batch.update(awbRef, { status: "Queued" });
        });
        await batch.commit();

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


const addNoteToAwbActionInputSchema = z.object({
    awbId: z.string(),
    noteText: z.string().min(1),
    userId: z.string(),
    userName: z.string(),
    recipientId: z.string(),
    recipientName: z.string(),
    createdAt: z.string(), // Expecting ISO string from client
});

export async function addNoteToAwbAction(input: z.infer<typeof addNoteToAwbActionInputSchema>) {
    const validation = addNoteToAwbActionInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: "Invalid input for adding note." };
    }
    const { awbId, ...noteData } = validation.data;

    try {
        const awbRef = doc(db, "awbs", awbId);
        
        const newNote = {
            ...noteData,
            id: randomUUID(),
            createdAt: serverTimestamp(), // Use server timestamp for consistency
        };

        await updateDoc(awbRef, {
            notes: arrayUnion(newNote)
        });

        return { success: true, message: "Note added successfully." };
    } catch (error: any) {
        console.error("Error adding note to AWB:", error);
        return { success: false, message: `Failed to add note: ${error.message}` };
    }
}
