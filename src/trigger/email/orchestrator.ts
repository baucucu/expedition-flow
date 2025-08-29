
import { task, runs, logger } from "@trigger.dev/sdk";
import { sendEmailTask } from "./send-email";
import { updateEmailDbTask } from "./update-db";
import { z } from "zod";

const SendEmailOrchestratorPayloadSchema = z.object({
  shipmentId: z.string(),
});

export const sendEmailOrchestrator = task({
  id: "send-email-orchestrator",
  run: async (payload: z.infer<typeof SendEmailOrchestratorPayloadSchema>, { ctx }) => {
    logger.info(`Starting email orchestration for shipment: ${payload.shipmentId}`);
    
    try {
      // Step 1: Send the email via n8n
      const sendRun = await sendEmailTask.trigger({ shipmentId: payload.shipmentId });
      const sendRunDetails = await runs.retrieve(sendRun.id);
      logger.info(`Email sending task completed for shipment ${payload.shipmentId}`, { result: sendRunDetails.output });

      // Step 2: Update the database
      const updateRun = await updateEmailDbTask.trigger({ shipmentId: payload.shipmentId });
      const updateRunDetails = await runs.retrieve(updateRun.id);
      logger.info(`Database update task completed for shipment ${payload.shipmentId}`, { result: updateRunDetails.output });

      return { success: true, shipmentId: payload.shipmentId };

    } catch (error: any) {
      logger.error(`Orchestration failed for shipment ${payload.shipmentId}`, { error: error.message });
      // Optionally, you could add a task here to mark the shipment as 'Email Send Failed'
      return { success: false, shipmentId: payload.shipmentId, error: error.message };
    }
  },
});
