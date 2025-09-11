
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
        const shipmentIds = [...new Set(awbsToQueue.map(awb => awb.shipmentId))];

        const payloads = shipmentIds.map(shipmentId => ({
            payload: { shipmentId },
        }));

        if (payloads.length > 0) {
            await tasks.batchTrigger("generate-awb", payloads);
        }

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
    createdAt: z.date(),
});

export async function addNoteToAwbAction(input: z.infer<typeof addNoteToAwbActionInputSchema>) {
    const validation = addNoteToAwbActionInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("Invalid input for adding note:", validation.error);
        return { success: false, message: "Invalid input for adding note." };
    }
    const { awbId, ...noteData } = validation.data;

    try {
        const awbRef = doc(db, "awbs", awbId);
        
        const newNote = {
            ...noteData,
            id: randomUUID(),
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

const regenerateAwbActionSchema = z.object({
    awbIds: z.array(z.string()),
});

export async function regenerateAwbAction(input: z.infer<typeof regenerateAwbActionSchema>) {
    const validation = regenerateAwbActionSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: "Invalid input for regenerating AWBs." };
    }
    const { awbIds } = validation.data;

    try {
        const newShipmentsToQueue = [];

        for (const awbId of awbIds) {
            const batch = writeBatch(db);

            // 1. Fetch original documents
            const originalAwbRef = doc(db, "awbs", awbId);
            const originalAwbSnap = await getDocs(query(collection(db, "awbs"), where(documentId(), "==", awbId)));
            if (originalAwbSnap.empty) continue;
            const originalAwb = originalAwbSnap.docs[0].data() as AWB;

            const originalShipmentRef = doc(db, "shipments", originalAwb.shipmentId);
            const originalShipmentSnap = await getDocs(query(collection(db, "shipments"), where(documentId(), "==", originalAwb.shipmentId)));
            if (originalShipmentSnap.empty) continue;
            const originalShipment = originalShipmentSnap.docs[0].data();

            const recipientsQuery = query(collection(db, "recipients"), where("awbId", "==", awbId));
            const originalRecipientsSnap = await getDocs(recipientsQuery);
            const originalRecipients = originalRecipientsSnap.docs.map(d => d.data());

            // 2. Determine new shipment ID
            let counter = 1;
            let newShipmentId = `${originalAwb.shipmentId}_${counter}`;
            while(true) {
                const existingShipment = await getDocs(query(collection(db, "shipments"), where(documentId(), "==", newShipmentId)));
                if (existingShipment.empty) break;
                counter++;
                newShipmentId = `${originalAwb.shipmentId}_${counter}`;
            }

            // 3. Clone Shipment
            const newShipmentRef = doc(db, "shipments", newShipmentId);
            batch.set(newShipmentRef, {
                ...originalShipment,
                id: newShipmentId,
                status: "Ready for AWB",
                createdAt: serverTimestamp(),
            });

            // 4. Clone AWB
            const { awb_data, awbStatusHistory, expeditionStatus, ...restOfAwb } = originalAwb;
            const newAwbRef = doc(collection(db, "awbs"));
            const newAwbId = newAwbRef.id;
            batch.set(newAwbRef, {
                ...restOfAwb,
                id: newAwbId,
                shipmentId: newShipmentId,
                status: "New",
                originalShipmentId: originalAwb.shipmentId,
                awbUrl: null,
                awbFileId: null,
                emailStatus: null,
                emailId: null,
                emailSentCount: 0,
            });

            // 5. Clone Recipients
            originalRecipients.forEach(rcp => {
                const newRecipientRef = doc(collection(db, "recipients"));
                batch.set(newRecipientRef, {
                    ...rcp,
                    id: newRecipientRef.id,
                    shipmentId: newShipmentId,
                    awbId: newAwbId,
                    status: "New",
                    pvStatus: "Not Generated",
                    pvUrl: null,
                    pvId: null,
                    pvSemnatUrl: null,
                    awbUrl: null,
                    awbStatus: "Not Generated",
                });
            });

            await batch.commit();

            newShipmentsToQueue.push({ shipmentId: newShipmentId, awbId: newAwbId });
        }

        return { success: true, message: `Cloned ${awbIds.length} AWB(s) successfully.`, newData: newShipmentsToQueue };

    } catch (error: any) {
        console.error("Error regenerating AWBs:", error);
        return { success: false, message: `Failed to regenerate AWBs: ${error.message}` };
    }
}
