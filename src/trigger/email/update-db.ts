
import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";

const UpdateDbPayloadSchema = z.object({
  shipmentId: z.string(),
});

export const updateEmailDbTask = task({
  id: "email-update-db",
  run: async (payload: z.infer<typeof UpdateDbPayloadSchema>, { ctx }) => {
    logger.info(`Starting DB update for shipment: ${payload.shipmentId}`);
    const { shipmentId } = payload;

    try {
        const awbsQuery = query(collection(db, "awbs"), where("shipmentId", "==", shipmentId));
        const awbSnapshot = await getDocs(awbsQuery);
        
        if (awbSnapshot.empty) {
            throw new Error(`No AWBs found for shipment ID: ${shipmentId} to update status.`);
        }

        const batch = writeBatch(db);

        awbSnapshot.docs.forEach(doc => {
            // Update the AWB status to indicate email has been sent.
            // Note: We don't have a specific status for this on the AWB model,
            // so we'll update the parent *shipment* status.
            // A better approach might be to add an 'emailStatus' to the AWB.
            // For now, we update the main shipment.
        });

        // Update the main shipment/expedition status
        const shipmentRef = doc(db, "shipments", shipmentId);
        batch.update(shipmentRef, { status: "Sent to Logistics" });

        await batch.commit();

        logger.info(`Successfully updated shipment ${shipmentId} status to 'Sent to Logistics'.`);
        return { success: true, shipmentId };

    } catch (error: any) {
        logger.error(`Failed to update database for shipment ${shipmentId}`, { error: error.message });
        throw error; // Rethrow to fail the task and let the orchestrator know
    }
  },
});
