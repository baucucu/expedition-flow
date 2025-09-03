"use server";

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";

interface UpdatePayload {
    address?: string;
    city?: string;
    county?: string;
}

export async function updateShipmentDetails(shipmentId: string, updates: UpdatePayload) {
    console.log(`Updating shipment ${shipmentId} with`, updates);

    try {
        const recipientsRef = collection(db, "recipients");
        const q = query(recipientsRef, where("shipmentId", "==", shipmentId));
        const recipientDocs = await getDocs(q);

        if (recipientDocs.empty) {
            return { success: false, message: "No recipients found for this shipment." };
        }

        const batch = writeBatch(db);
        const awbIds = new Set<string>();

        // Update recipient documents and gather unique AWB IDs
        recipientDocs.forEach((recipientDoc) => {
            const recipientData = recipientDoc.data();
            if (recipientData.awbId) {
                awbIds.add(recipientData.awbId);
            }
            
            // Update the denormalized data on the recipient
            const currentAwbData = recipientData.awb || {};
            const updatedAwb = { ...currentAwbData, ...updates };
            batch.update(recipientDoc.ref, { awb: updatedAwb });
        });

        // Update the canonical AWB documents
        awbIds.forEach((awbId) => {
            const awbRef = doc(db, "awbs", awbId);
            batch.update(awbRef, updates);
        });

        await batch.commit();

        console.log(`Successfully updated ${recipientDocs.size} recipients and ${awbIds.size} AWBs for shipment ${shipmentId}.`);
        return { success: true, message: `Successfully updated ${recipientDocs.size} recipients and associated AWBs.` };
    } catch (error) {
        console.error("Error updating shipment details:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `Failed to update shipment details: ${errorMessage}` };
    }
}
