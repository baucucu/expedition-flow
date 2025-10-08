
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

const updateRecipientAuditStatusSchema = z.object({
  recipientId: z.string(),
  audited: z.boolean(),
});

export async function updateRecipientAuditStatusAction(
  input: z.infer<typeof updateRecipientAuditStatusSchema>
) {
  const validation = updateRecipientAuditStatusSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: "Invalid input." };
  }

  const { recipientId, audited } = validation.data;

  try {
    const recipientRef = doc(db, "recipients", recipientId);
    await updateDoc(recipientRef, { audited });
    return { success: true, message: "Audit status updated." };
  } catch (error: any) {
    console.error("Error updating recipient audit status:", error);
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
    
    // Process in chunks to avoid overwhelming Firestore query limits if the file is huge
    const chunkSize = 25; 

    try {
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            
            const updateMap = new Map(chunk.map(row => [`${String(row.current_recipient_id)}-${String(row.shipment_id)}`, String(row.new_recipient_id)]));
            
            const currentIds = chunk.map(row => String(row.current_recipient_id)).filter(id => id);
            
            if (currentIds.length === 0) continue;

            const batch = writeBatch(db);
            const recipientsRef = collection(db, "recipients");
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
            
            await batch.commit();

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

const updateShipmentIssuesStatusSchema = z.object({
  shipmentId: z.string(),
  status: z.boolean(),
});

export async function updateShipmentIssuesStatusAction(
  input: z.infer<typeof updateShipmentIssuesStatusSchema>
) {
  const validation = updateShipmentIssuesStatusSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: "Invalid input." };
  }

  const { shipmentId, status } = validation.data;

  try {
    const recipientsQuery = query(collection(db, "recipients"), where("shipmentId", "==", shipmentId));
    const querySnapshot = await getDocs(recipientsQuery);
    
    if (querySnapshot.empty) {
        return { success: false, error: "No recipients found for this shipment." };
    }

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(docSnap => {
      batch.update(docSnap.ref, { issues: status });
    });

    await batch.commit();
    return { success: true, message: `Updated issues status for ${querySnapshot.size} recipient(s).` };
  } catch (error: any) {
    console.error("Error updating shipment issues status:", error);
    return { success: false, error: `An unexpected error occurred: ${error.message}` };
  }
}
