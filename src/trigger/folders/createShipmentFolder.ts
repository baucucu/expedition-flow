
import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";

const N8N_SHIPMENT_FOLDER_WEBHOOK_URL = process.env.N8N_SHIPMENT_FOLDER_WEBHOOK_URL;

export const sendEmailTask = task({
  id: "create-shipment-folder",
  run: async (payload: {shipmentId: string}, { ctx }) => {
    
  },
});
