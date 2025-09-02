
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId, doc, getDoc, writeBatch } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk/v3";
import type { Recipient, Shipment, AWB } from "@/types";

const sendEmailToLogisticsActionInputSchema = z.object({
  recipientIds: z.array(z.string()),
});

const CHUNK_SIZE = 10; // Using a safe chunk size for Firestore 'in' queries.

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
        // 1. Fetch initial recipients to get unique shipment IDs
        const recipientsFromInputQuery = query(collection(db, "recipients"), where("id", "in", recipientIds));
        const recipientsFromInputSnapshot = await getDocs(recipientsFromInputQuery);
        if (recipientsFromInputSnapshot.empty) {
            return { success: false, message: "Could not find any of the selected recipients." };
        }
        const inputRecipients = recipientsFromInputSnapshot.docs.map(doc => doc.data() as Recipient);
        const uniqueShipmentIds = [...new Set(inputRecipients.map(r => r.shipmentId))];
        console.log("unique shipments selected: ", {uniqueShipmentIds})

        // Find AWBs to update
        const awbsToUpdateQuery = query(collection(db, "awbs"), where("shipmentId", "in", uniqueShipmentIds));
        const awbsToUpdateSnapshot = await getDocs(awbsToUpdateQuery);
        const awbDocsToUpdate = awbsToUpdateSnapshot.docs;
        
        // Update emailStatus to Queued
        if (awbDocsToUpdate.length > 0) {
            const batch = writeBatch(db);
            awbDocsToUpdate.forEach(awbDoc => {
                batch.update(awbDoc.ref, { emailStatus: 'Queued' });
            });
            await batch.commit();
        }


        // 2. Fetch all related data in chunks
        const shipmentsMap = new Map<string, Shipment>();
        const allShipmentRecipientsMap = new Map<string, Recipient[]>();
        const awbsMap = new Map<string, AWB>();

        for (let i = 0; i < uniqueShipmentIds.length; i += CHUNK_SIZE) {
            const chunk = uniqueShipmentIds.slice(i, i + CHUNK_SIZE);
            if (chunk.length === 0) continue;

            // Fetch shipments for the chunk
            const shipmentsQuery = query(collection(db, "shipments"), where(documentId(), "in", chunk));
            const shipmentsSnapshot = await getDocs(shipmentsQuery);
            shipmentsSnapshot.forEach(doc => shipmentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Shipment));
            
            // Fetch AWBs for the chunk
            const awbsQuery = query(collection(db, "awbs"), where("shipmentId", "in", chunk));
            const awbsSnapshot = await getDocs(awbsQuery);
            awbsSnapshot.forEach(doc => {
                const awb = doc.data() as AWB;
                awbsMap.set(awb.shipmentId, awb);
            });

            // Fetch all recipients for each shipment in the chunk
            for (const shipmentId of chunk) {
                const allRecipientsQuery = query(collection(db, "recipients"), where("shipmentId", "==", shipmentId));
                const allRecipientsSnapshot = await getDocs(allRecipientsQuery);
                if (!allRecipientsSnapshot.empty) {
                    allShipmentRecipientsMap.set(shipmentId, allRecipientsSnapshot.docs.map(doc => doc.data() as Recipient));
                }
            }
        }
        console.log("shipmentsMap: ", shipmentsMap)
        console.log("allShipmentRecipientsMap: ", allShipmentRecipientsMap)
        console.log("awbsMap: ", awbsMap)
        // 3. Fetch static document IDs once
        const inventoryDocRef = doc(db, "static_documents", "inventory");
        const instructionsDocRef = doc(db, "static_documents", "instructions");
        const [inventoryDocSnap, instructionsDocSnap] = await Promise.all([getDoc(inventoryDocRef), getDoc(instructionsDocRef)]);
        const inventoryDocumentId = inventoryDocSnap.exists() ? inventoryDocSnap.data().fileId : null;
        const instructionsDocumentId = instructionsDocSnap.exists() ? instructionsDocSnap.data().fileId : null;
        
        // 4. Prepare the final, self-contained payloads for Trigger.dev
        const payloads = [];
        for (const shipmentId of uniqueShipmentIds) {
            const shipment = shipmentsMap.get(shipmentId);
            const allRecipientsForShipment = allShipmentRecipientsMap.get(shipmentId);
            const awbData = awbsMap.get(shipmentId);

            if (shipment && allRecipientsForShipment && awbData) {
                payloads.push({
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
        console.log("payloads: ", payloads)
        // 5. Send all events to Trigger.dev.
        if (payloads.length > 0) {
             await tasks.batchTrigger("send-email", payloads);
        }

        return { 
            success: true, 
            message: `Successfully queued email jobs for ${payloads.length} shipment(s).`
        };

    } catch (error: any) {
        console.error("Error queueing email generation:", error);
        return { success: false, message: `Failed to queue email jobs: ${error.message}` };
    }
}
