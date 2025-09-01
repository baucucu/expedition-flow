
'use server';

/**
 * @fileOverview A flow for generating "Proces Verbal" documents by batch-triggering a Trigger.dev task.
 * 
 * - generateProcesVerbal - A function that triggers the PV generation for multiple recipients.
 * - ProcesVerbalGeneratorInput - The input type for the function.
 * - ProcesVerbalGeneratorOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateProcesVerbalTask } from '@/trigger/pv-generator';

const PVRecipientSchema = z.object({
  id: z.string(),
  name: z.string(),
  shipmentId: z.string(),
  uuid: z.string().optional(),
});

const ProcesVerbalGeneratorInputSchema = z.object({
  recipients: z.array(PVRecipientSchema).describe('An array of recipient objects to generate PVs for.'),
});
export type ProcesVerbalGeneratorInput = z.infer<typeof ProcesVerbalGeneratorInputSchema>;

const ProcesVerbalGeneratorOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    details: z.object({
        triggeredJobs: z.number(),
    }).optional(),
});
export type ProcesVerbalGeneratorOutput = z.infer<typeof ProcesVerbalGeneratorOutputSchema>;

export async function generateProcesVerbal(input: ProcesVerbalGeneratorInput): Promise<ProcesVerbalGeneratorOutput> {
  return generateProcesVerbalFlow(input);
}

const BATCH_SIZE = 500;

const generateProcesVerbalFlow = ai.defineFlow(
  {
    name: 'generateProcesVerbalFlow',
    inputSchema: ProcesVerbalGeneratorInputSchema,
    outputSchema: ProcesVerbalGeneratorOutputSchema,
  },
  async ({ recipients }) => {
    
    if (!process.env.N8N_PV_WEBHOOK_URL) {
      return { success: false, message: "Proces Verbal webhook URL is not configured in environment variables." };
    }
    
    let totalTriggered = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const chunk = recipients.slice(i, i + BATCH_SIZE);
        
        // Prepare the events for Trigger.dev for each recipient in the chunk
        const events = chunk.map(recipient => ({
            name: "generate.proces.verbal", // Event name, can be anything
            payload: { 
                id: recipient.id,
                name: recipient.name,
                shipmentId: recipient.shipmentId,
                uuid: recipient.uuid,
            },
        }));
        console.log("Starting pv generation for ", events.length, " recipients")
        // The first argument is the task, the second is an array of event payloads.
        await generateProcesVerbalTask.batchTrigger(events);
        totalTriggered += chunk.length;
    }

    return {
        success: true,
        message: `Successfully queued PV generation for ${totalTriggered} recipient(s).`,
        details: {
            triggeredJobs: totalTriggered,
        }
    };
  }
);
