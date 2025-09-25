
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";

const updateRecipientVerificationSchema = z.object({
  recipientId: z.string(),
  verified: z.boolean(),
});

export async function updateRecipientVerificationAction(
  input: z.infer<typeof updateRecipientVerificationSchema>
) {
  const validation = updateRecipientVerificationSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: "Invalid input." };
  }

  const { recipientId, verified } = validation.data;

  try {
    const recipientRef = doc(db, "recipients", recipientId);
    await updateDoc(recipientRef, { verified });
    return { success: true, message: "Verification status updated." };
  } catch (error: any) {
    console.error("Error updating recipient verification:", error);
    return { success: false, error: `An unexpected error occurred: ${error.message}` };
  }
}


const overwriteRecipientIdsActionSchema = z.object({
    data: z.array(z.object({
        current_recipient_id: z.any(),
        shipment_id: z.any(),
        new_recipient_id: z.any(),
    })),
});

export async function overwriteRecipientIdsAction(input: z.infer<typeof overwriteRecipientIdsActionSchema>) {
    const validation = overwriteRecipientIdsActionSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Invalid input for overwriting recipient IDs." };
    }

    const { data } = validation.data;
    let updatedCount = 0;
    const notFound: any[] = [];
    
    try {
        const recipientsRef = collection(db, "recipients");

        // Process in chunks to avoid overwhelming Firestore query limits if the file is huge
        const chunkSize = 25; // Firestore 'in' query supports up to 30 values
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            
            // Create a map to quickly find the new ID for a given currentId+shipmentId
            const updateMap = new Map(chunk.map(row => [`${String(row.current_recipient_id)}-${String(row.shipment_id)}`, String(row.new_recipient_id)]));
            
            const currentIds = chunk.map(row => String(row.current_recipient_id));
            
            if (currentIds.length === 0) continue;

            // Create a new batch for each chunk
            const batch = writeBatch(db);

            // Query for documents that match the current IDs in the chunk
            const q = query(recipientsRef, where("numericId", "in", currentIds));
            const querySnapshot = await getDocs(q);

            const foundDocs = new Set<string>();

            querySnapshot.forEach(docSnap => {
                const recipient = docSnap.data();
                const key = `${recipient.numericId}-${recipient.shipmentId}`;
                
                if (updateMap.has(key)) {
                    const newNumericId = updateMap.get(key)!;
                    batch.update(docSnap.ref, { numericId: newNumericId });
                    updatedCount++;
                    foundDocs.add(key);
                }
            });
            
            // Commit the batch for the current chunk
            await batch.commit();

            // Check for records from the file that were not found in the database
            for (const row of chunk) {
                const key = `${String(row.current_recipient_id)}-${String(row.shipment_id)}`;
                if (!foundDocs.has(key)) {
                    notFound.push(row);
                }
            }
        }
        
        const message = `Successfully updated ${updatedCount} recipient(s).`;
        const details = notFound.length > 0 ? ` Could not find ${notFound.length} records.` : '';

        return { 
            success: true, 
            message: message + details,
            data: {
                updatedCount,
                notFoundCount: notFound.length,
                notFoundDetails: notFound,
            }
        };

    } catch (error: any) {
        console.error("Error overwriting recipient IDs:", error);
        return { success: false, error: `An unexpected error occurred: ${error.message}` };
    }
}
