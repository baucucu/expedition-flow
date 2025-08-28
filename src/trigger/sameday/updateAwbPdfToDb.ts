import { task } from "@trigger.dev/sdk";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const updateAwbPdfToDb = task({
    id: "update-awb-pdf-to-db",
    run: async (payload: {
        "shipmentId": string;
        "awbNumber": string;
        "results": {
            "recipientId": string;
            "success": boolean;
            "response"?: any;
            "error"?: string;
        }[]
    }) => {
        console.log("Updating database");
        const { shipmentId, awbNumber, results } = payload;

        // 1. Query the "recipients" collection for this shipmentId
        const q = query(collection(db, "recipients"), where("shipmentId", "==", shipmentId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error(`No recipients found for shipmentId=${shipmentId}`);
        }

        // 2. Iterate recipients
        const successfulResults = results.filter((result) => result.success);
        for (const result of successfulResults) {
            const recipientId = result.recipientId;
            const recipientDoc = snapshot.docs.find((docSnap) => docSnap.id === recipientId);

            if (!recipientDoc) {
                throw new Error(`No recipient found with id=${recipientId}`);
            }
          await updateDoc(recipientDoc.ref, {
                awbPdfFileId: result.response?.fileId,
                awbWebviewUrl: result.response?.webviewUrl
            });
        }

        // 3. Handle unsuccessful results
        const unsuccessfulResults = results.filter((result) => !result.success);
        for (const result of unsuccessfulResults) {
            console.error(`Failed to update recipient ${result.recipientId}: ${result.error}`);
        }

    }

})