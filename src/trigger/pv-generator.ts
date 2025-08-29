import { task } from "@trigger.dev/sdk";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

const N8N_WEBHOOK_URL = process.env.N8N_PV_WEBHOOK_URL;

const callN8nWebhook = async (recipient: { id: string; name: string }): Promise<{ recipientId: string; pvUrl?: string; error?: string }> => {
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

        const docId = result?.id;
        const webViewLink = result?.webViewLink;


        if (!docId || !webViewLink) {
            return { recipientId: recipient.id, error: 'Webhook response did not include a document ID or webViewLink.' };
        }

        // Update Firestore
        const recipientRef = doc(db, "recipients", recipient.id);
        await updateDoc(recipientRef, {
            pvId: docId,
            pvUrl: webViewLink
        });

        return { recipientId: recipient.id, pvUrl: webViewLink };

    } catch (error: any) {
        return { recipientId: recipient.id, error: error.message };
    }
};


export const generateProcesVerbalTask = task({
  id: "generate-proces-verbal",
  name: "Generate Proces Verbal",
  description: "Generates a Proces Verbal document for a single recipient by calling an n8n webhook.",
  run: async (payload: { id: string; name: string }) => {
    return callN8nWebhook(payload);
  },
  input: z.object({
    id: z.string(),
    name: z.string(),
  }),
  output: z.object({
    recipientId: z.string(),
    pvUrl: z.string().optional(),
    error: z.string().optional(),
  }),
  retry: {
    maxAttempts: 5,
    minBackoffInSeconds: 60,
  },
  rateLimit: {
    limit: 6,
    interval: "10s", // Example interval, adjust as needed
  }
});