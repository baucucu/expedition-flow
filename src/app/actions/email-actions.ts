
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { tasks } from "@trigger.dev/sdk/v3";
import type { Recipient, Shipment } from "@/types";

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
        // 1. Fetch the recipient documents for the given IDs to find their shipment IDs.
        const recipientsFromInputQuery = query(collection(db, "recipients"), where("id", "in", recipientIds));
        const recipientsFromInputSnapshot = await getDocs(recipientsFromInputQuery);
        
        if (recipientsFromInputSnapshot.empty) {
            return { success: false, message: "Could not find any of the selected recipients in the database." };
        }
        
        const inputRecipients = recipientsFromInputSnapshot.docs.map(doc => doc.data() as Recipient);
        const uniqueShipmentIds = [...new Set(inputRecipients.map(r => r.shipmentId))];

        // 2. Fetch the full shipment documents for each unique shipment ID.
        const shipmentsMap = new Map<string, Shipment>();
        for (let i = 0; i < uniqueShipmentIds.length; i += CHUNK_SIZE) {
            const chunk = uniqueShipmentIds.slice(i, i + CHUNK_SIZE);
            if (chunk.length > 0) {
                const shipmentsQuery = query(collection(db, "shipments"), where(documentId(), "in", chunk));
                const shipmentsSnapshot = await getDocs(shipmentsQuery);
                shipmentsSnapshot.forEach(doc => {
                    shipmentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Shipment);
                });
            }
        }
        
        // 3. For each unique shipment, fetch ALL of its associated recipients.
        const allShipmentRecipientsMap = new Map<string, Recipient[]>();
        for (const shipmentId of uniqueShipmentIds) {
            const allRecipientsQuery = query(collection(db, "recipients"), where("shipmentId", "==", shipmentId));
            const allRecipientsSnapshot = await getDocs(allRecipientsQuery);
            if (!allRecipientsSnapshot.empty) {
                allShipmentRecipientsMap.set(shipmentId, allRecipientsSnapshot.docs.map(doc => doc.data() as Recipient));
            }
        }

        // 4. Prepare the final payloads for Trigger.dev.
        const payloads = [];
        for (const shipmentId of uniqueShipmentIds) {
            const shipment = shipmentsMap.get(shipmentId);
            const allRecipientsForShipment = allShipmentRecipientsMap.get(shipmentId);

            if (shipment && allRecipientsForShipment) {
                payloads.push({
                    payload: {
                        shipmentId: shipment.id,
                        awbDocumentId: shipment.awbDocumentId,
                        awbNumberOfParcels: shipment.awbNumberOfParcels,
                        inventoryDocumentId: shipment.inventoryDocumentId,
                        instructionsDocumentId: shipment.instructionsDocumentId,
                        recipients: allRecipientsForShipment.map(r => ({
                            recipientId: r.id,
                            name: r.name,
                            pvDocumentId: r.pvId || "",
                            pvUrl: r.pvUrl || "",
                        })),
                    },
                });
            } else {
                 console.warn(`Could not construct full payload for shipment ${shipmentId} due to missing data.`);
            }
        }

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
