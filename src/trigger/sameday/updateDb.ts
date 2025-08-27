import { task } from "@trigger.dev/sdk"
import { getFirestore, collection, query, where, limit, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type UpdateAwbPayload = {
    shipmentId: string;
    awbData: {
        awbNumber: string;
        awbCost: number;
        parcels: { position: number; awbNumber: string }[];
        pdfLink: string;
        pickupLogisticLocation: string;
        deliveryLogisticLocation: string;
        deliveryLogisticCircle: string;
        sortingHub: string;
        sortingHubId: number;
        deliveryLogisticLocationId: number;
        pickupLogisticLocationId: number;
    };
};

export const updateDb = task({
    id: "update-db",
    run: async (payload: UpdateAwbPayload) => {
        console.log("Updating database")
        const { shipmentId, awbData } = payload;

        // 1. Query the "awbs" collection for the document with this shipmentId
        const q = query(
            collection(db, "awbs"),
            where("shipmentId", "==", shipmentId),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error(`No AWB document found for shipmentId=${shipmentId}`);
        }

        // 2. Get the document ref
        const awbDoc = snapshot.docs[0];
        const awbRef = doc(db, "awbs", awbDoc.id);

        // 3. Update the document with AWB API data
        await updateDoc(awbRef, {
            awbNumber: awbData.awbNumber,
            awbCost: awbData.awbCost,
            parcels: awbData.parcels,
            pdfLink: awbData.pdfLink,
            pickupLogisticLocation: awbData.pickupLogisticLocation,
            deliveryLogisticLocation: awbData.deliveryLogisticLocation,
            deliveryLogisticCircle: awbData.deliveryLogisticCircle,
            sortingHub: awbData.sortingHub,
            sortingHubId: awbData.sortingHubId,
            deliveryLogisticLocationId: awbData.deliveryLogisticLocationId,
            pickupLogisticLocationId: awbData.pickupLogisticLocationId,
            status: "AWB_CREATED", // optional: update status
            updatedAt: new Date(),
        });

        return {
            updatedId: awbDoc.id,
            shipmentId,
            awbNumber: awbData.awbNumber,
        };
    }
})