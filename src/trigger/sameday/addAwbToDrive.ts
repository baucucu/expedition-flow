import { task } from "@trigger.dev/sdk";

type UpdateAwbPayload = {
  shipmentId: string;
  awbNumber: string;
};

export const addAwbToDrive = task({
  id: "add-awb-to-drive",
  run: async (payload: UpdateAwbPayload) => {
    console.log("Adding AWB to drive");
    const { shipmentId, awbNumber } = payload;

    // 1. Prepare webhook URL
    const webhookUrl = process.env.N8N_SAVE_AWB_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("N8N_SAVE_AWB_WEBHOOK_URL not set");

    let result;

    // 2. Call the webhook
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awbNumber, shipmentId }),
      });

      if (!res.ok) {
        throw new Error(`Webhook call failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json().catch(() => ({}));
      result = { shipmentId, success: true, response: data };
    } catch (err: any) {
      console.error(`Error sending webhook for shipment ${shipmentId}`, err);
      result = { shipmentId, success: false, error: err.message };
    }

    // 3. Return summary
    return {
      shipmentId,
      awbNumber,
      result,
    };
  },
});
