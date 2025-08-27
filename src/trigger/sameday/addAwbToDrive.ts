import { task } from "@trigger.dev/sdk";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type UpdateAwbPayload = {
  shipmentId: string;
  awbNumber: string;
};

export const addAwbToDrive = task({
  id: "add-awb-to-drive",
  run: async (payload: UpdateAwbPayload) => {
    console.log("Updating database");
    const { shipmentId, awbNumber } = payload;

    // 1. Query the "recipients" collection for this shipmentId
    const q = query(collection(db, "recipients"), where("shipmentId", "==", shipmentId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error(`No recipients found for shipmentId=${shipmentId}`);
    }

    // 2. Prepare webhook URL
    const webhookUrl = process.env.N8N_SAVE_AWB_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("N8N_SAVE_AWB_WEBHOOK_URL not set");

    // 3. Iterate recipients and call webhook
    const results = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const recipientId = docSnap.id;

        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ awbNumber, recipientId }),
          });

          if (!res.ok) {
            throw new Error(`Webhook call failed: ${res.status} ${res.statusText}`);
          }

          const data = await res.json().catch(() => ({}));
          return { recipientId, success: true, response: data };
        } catch (err: any) {
          console.error(`Error sending webhook for recipient ${recipientId}`, err);
          return { recipientId, success: false, error: err.message };
        }
      })
    );

    // 4. Return summary
    return {
      shipmentId,
      awbNumber,
      results,
    };
  },
});
