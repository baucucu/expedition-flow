
'use server';

/**
 * @fileOverview A flow for generating "Proces Verbal" documents by calling an n8n webhook.
 * 
 * - generateProcesVerbal - A function that triggers the PV generation for multiple recipients.
 * - ProcesVerbalGeneratorInput - The input type for the function.
 * - ProcesVerbalGeneratorOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { Recipient } from "@/types";

const PVRecipientSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const ProcesVerbalGeneratorInputSchema = z.object({
  recipients: z.array(PVRecipientSchema).describe('An array of recipient objects to generate PVs for.'),
});
export type ProcesVerbalGeneratorInput = z.infer<typeof ProcesVerbalGeneratorInputSchema>;

const ProcesVerbalGeneratorOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    details: z.object({
        total: z.number(),
        successCount: z.number(),
        failCount: z.number(),
        errors: z.array(z.string()).optional(),
    }).optional(),
});
export type ProcesVerbalGeneratorOutput = z.infer<typeof ProcesVerbalGeneratorOutputSchema>;

export async function generateProcesVerbal(input: ProcesVerbalGeneratorInput): Promise<ProcesVerbalGeneratorOutput> {
  return generateProcesVerbalFlow(input);
}

const N8N_WEBHOOK_URL = process.env.N8N_PV_WEBHOOK_URL;
const CONCURRENT_LIMIT = 20;

async function callN8nWebhook(recipient: z.infer<typeof PVRecipientSchema>): Promise<{ recipientId: string; pvUrl?: string; error?: string }> {
    if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
         return { recipientId: recipient.id, error: 'n8n webhook URL is not configured.' };
    }
    
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: recipient.name,
                recipient_id: recipient.id,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { recipientId: recipient.id, error: `Webhook failed with status ${response.status}: ${errorText}` };
        }

        const result = await response.json();
        
        // The webhook returns an array with one file object.
        const driveFile = Array.isArray(result) ? result[0] : null;
        const docId = driveFile?.id;

        if (!docId) {
            return { recipientId: recipient.id, error: 'Webhook response did not include a document ID.' };
        }
        
        // Construct the Google Drive URL for embedding/preview
        const pvUrl = `https://drive.google.com/file/d/${docId}/preview`;
        
        // Update Firestore
        const recipientRef = doc(db, "recipients", recipient.id);
        await updateDoc(recipientRef, { pvUrl: pvUrl });

        return { recipientId: recipient.id, pvUrl: pvUrl };

    } catch (error: any) {
        return { recipientId: recipient.id, error: error.message };
    }
}


const generateProcesVerbalFlow = ai.defineFlow(
  {
    name: 'generateProcesVerbalFlow',
    inputSchema: ProcesVerbalGeneratorInputSchema,
    outputSchema: ProcesVerbalGeneratorOutputSchema,
  },
  async ({ recipients }) => {
    
    if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
      return { success: false, message: "Proces Verbal webhook URL is not configured in environment variables." };
    }
      
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Process recipients in chunks of CONCURRENT_LIMIT
    for (let i = 0; i < recipients.length; i += CONCURRENT_LIMIT) {
        const chunk = recipients.slice(i, i + CONCURRENT_LIMIT);
        
        const promises = chunk.map(recipient => callN8nWebhook(recipient));
        const results = await Promise.all(promises);

        for (const result of results) {
            if (result.pvUrl) {
                successCount++;
            } else {
                failCount++;
                errors.push(`Recipient ${result.recipientId}: ${result.error}`);
            }
        }
    }

    return {
        success: failCount === 0,
        message: `PV generation process completed. Success: ${successCount}, Failed: ${failCount}.`,
        details: {
            total: recipients.length,
            successCount,
            failCount,
            errors
        }
    };
  }
);
