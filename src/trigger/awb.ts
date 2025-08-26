
import { task, logger } from "@trigger.dev/sdk";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { createAwb } from "@/services/sameday";

export const generateSamedayAwb = task({
  id: "generate-sameday-awb",
  // Optional: Set a timeout to prevent tasks from running indefinitely
  maxDuration: 300, // 5 minutes
  // Optional: Configure retries for transient errors
  retries: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  // The payload schema, ensures type safety
  payload: z.object({
    awbId: z.string(),
  }),

  run: async (payload, { ctx }) => {
    const { awbId } = payload;
    logger.log(`Starting AWB generation for awbId: ${awbId}`, { awbId });

    const awbRef = doc(db, "awbs", awbId);

    try {
      // The createAwb service function now contains all the logic
      const result = await createAwb(awbId);
      
      const newAwbNumber = result.awbNumber;

      // Success: Update Firestore with the new AWB number and status
      await updateDoc(awbRef, {
        awbNumber: newAwbNumber,
        status: "Generated",
        error: null, // Clear any previous errors
      });

      logger.info(`Successfully generated AWB ${newAwbNumber} for awbId: ${awbId}`, { awbId, newAwbNumber });
      
      return { success: true, awbNumber: newAwbNumber };

    } catch (error: any) {
      logger.error(`Failed to generate AWB for awbId: ${awbId}`, { 
        awbId, 
        error: error.message,
        stack: error.stack 
      });

      // Failure: Update Firestore with the failed status and error message
      await updateDoc(awbRef, {
        status: "Failed",
        error: error.message || "An unknown error occurred during AWB generation.",
      });
      
      // We re-throw the error to ensure Trigger.dev marks the run as failed
      // and initiates the retry logic if configured.
      throw error;
    }
  },
});
