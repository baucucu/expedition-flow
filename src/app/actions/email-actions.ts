
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId, doc, getDoc, writeBatch } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk/v3";
import type { Recipient, Shipment, AWB } from "@/types";

const sendEmailToLogisticsActionInputSchema = z.object({
  recipientIds: z.array(z.string()),
});

const CHUNK_SIZE = 10; // Firestore 'in' query supports up to 30, we use 10 for safety.

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
        const allPayloads = [];

        // Process recipients in chunks
        for (let i = 0; i < recipientIds.length; i += CHUNK_SIZE) {
            const recipientIdChunk = recipientIds.slice(i, i + CHUNK_SIZE);
            if (recipientIdChunk.length === 0) continue;

            // 1. Fetch chunk of recipients to get unique shipment IDs
            const recipientsFromInputQuery = query(collection(db, "recipients"), where("id", "in", recipientIdChunk));
            const recipientsFromInputSnapshot = await getDocs(recipientsFromInputQuery);
            if (recipientsFromInputSnapshot.empty) {
                console.warn(`Could not find any recipients for chunk starting at index ${i}`);
                continue;
            }
            const inputRecipients = recipientsFromInputSnapshot.docs.map(doc => doc.data() as Recipient);
            const uniqueShipmentIdsInChunk = [...new Set(inputRecipients.map(r => r.shipmentId))];
            
            // Find and update AWBs for this chunk
            if (uniqueShipmentIdsInChunk.length > 0) {
                const awbsToUpdateQuery = query(collection(db, "awbs"), where("shipmentId", "in", uniqueShipmentIdsInChunk));
                const awbsToUpdateSnapshot = await getDocs(awbsToUpdateQuery);
                const awbDocsToUpdate = awbsToUpdateSnapshot.docs;
                if (awbDocsToUpdate.length > 0) {
                    const batch = writeBatch(db);
                    awbDocsToUpdate.forEach(awbDoc => {
                        batch.update(awbDoc.ref, { emailStatus: 'Queued' });
                    });
                    await batch.commit();
                }
            }
            
            // 2. Fetch all related data for the shipments in this chunk
            const shipmentsMap = new Map<string, Shipment>();
            const allShipmentRecipientsMap = new Map<string, Recipient[]>();
            const awbsMap = new Map<string, AWB>();

            if (uniqueShipmentIdsInChunk.length > 0) {
                const shipmentsQuery = query(collection(db, "shipments"), where(documentId(), "in", uniqueShipmentIdsInChunk));
                const shipmentsSnapshot = await getDocs(shipmentsQuery);
                shipmentsSnapshot.forEach(doc => shipmentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Shipment));
                
                const awbsQuery = query(collection(db, "awbs"), where("shipmentId", "in", uniqueShipmentIdsInChunk));
                const awbsSnapshot = await getDocs(awbsQuery);
                awbsSnapshot.forEach(doc => {
                    const awb = doc.data() as AWB;
                    awbsMap.set(awb.shipmentId, awb);
                });

                for (const shipmentId of uniqueShipmentIdsInChunk) {
                    const allRecipientsQuery = query(collection(db, "recipients"), where("shipmentId", "==", shipmentId));
                    const allRecipientsSnapshot = await getDocs(allRecipientsQuery);
                    if (!allRecipientsSnapshot.empty) {
                        allShipmentRecipientsMap.set(shipmentId, allRecipientsSnapshot.docs.map(doc => doc.data() as Recipient));
                    }
                }
            }

            // 3. Fetch static document IDs once (can be moved outside the loop)
            const inventoryDocRef = doc(db, "static_documents", "inventory");
            const instructionsDocRef = doc(db, "static_documents", "instructions");
            const [inventoryDocSnap, instructionsDocSnap] = await Promise.all([getDoc(inventoryDocRef), getDoc(instructionsDocRef)]);
            const inventoryDocumentId = inventoryDocSnap.exists() ? inventoryDocSnap.data().fileId : null;
            const instructionsDocumentId = instructionsDocSnap.exists() ? instructionsDocSnap.data().fileId : null;

            // 4. Prepare the payloads for this chunk
            for (const shipmentId of uniqueShipmentIdsInChunk) {
                const shipment = shipmentsMap.get(shipmentId);
                const allRecipientsForShipment = allShipmentRecipientsMap.get(shipmentId);
                const awbData = awbsMap.get(shipmentId);

                if (shipment && allRecipientsForShipment && awbData) {
                    allPayloads.push({
                        payload: {
                            logisticsEmail: process.env.EMAIL_DEPOZIT,
                            shipmentId: shipment.id,
                            awbNumber: awbData.awb_data?.awbNumber,
                            awbUrl: awbData?.awbUrl,
                            awbDocumentId: awbData.id,
                            awbNumberOfParcels: awbData.parcelCount,
                            inventoryDocumentId: inventoryDocumentId,
                            instructionsDocumentId: instructionsDocumentId,
                            recipients: allRecipientsForShipment.map(r => ({
                                recipientId: r.id,
                                numericId: r.numericId,
                                uuid: r.uuid,
                                name: r.name,
                                pvDocumentId: r.pvId || null,
                                pvUrl: r.pvUrl || null,
                            })),
                        },
                    });
                } else {
                    console.warn(`Could not construct full payload for shipment ${shipmentId} due to missing data.`);
                }
            }
        }
        
        // 5. Send all collected events to Trigger.dev.
        if (allPayloads.length > 0) {
             await tasks.batchTrigger("send-email", allPayloads);
        }

        return { 
            success: true, 
            message: `Successfully queued email jobs for ${allPayloads.length} shipment(s).`
        };

    } catch (error: any) {
        console.error("Error queueing email generation:", error);
        return { success: false, message: `Failed to queue email jobs: ${error.message}` };
    }
}
