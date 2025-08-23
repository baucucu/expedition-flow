
'use server';

/**
 * @fileOverview AWB generation flow for SelfAWB.
 * 
 * - generateAwb - A function that generates AWBs for shipments.
 * - AwbGeneratorInput - The input type for the generateAwb function.
 * - AwbGeneratorOutput - The return type for the generateAwb function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import type { Expedition, AWB, Recipient } from "@/types";

const AwbGeneratorInputSchema = z.object({
  shipmentIds: z.array(z.string()).describe('An array of shipment IDs to generate AWBs for.'),
});
type AwbGeneratorInput = z.infer<typeof AwbGeneratorInputSchema>;

const AwbGeneratorOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    details: z.array(z.object({
        shipmentId: z.string(),
        status: z.string(),
        awbNumber: z.string().optional(),
        error: z.string().optional(),
    })).optional(),
});
type AwbGeneratorOutput = z.infer<typeof AwbGeneratorOutputSchema>;

export async function generateAwb(input: AwbGeneratorInput): Promise<AwbGeneratorOutput> {
  return generateAwbFlow(input);
}

const SELFAWB_API_URL = 'https://www.selfawb.ro/import_awb_integrat.php';

const generateAwbFlow = ai.defineFlow(
  {
    name: 'generateAwbFlow',
    inputSchema: AwbGeneratorInputSchema,
    outputSchema: AwbGeneratorOutputSchema,
  },
  async ({ shipmentIds }) => {
    
    const username = process.env.SELFAWB_USERNAME;
    const clientId = process.env.SELFAWB_CLIENT_ID;
    const userPass = process.env.SELFAWB_USER_PASS;

    if (!username || !clientId || !userPass) {
      return { success: false, message: "AWB API credentials are not configured in environment variables." };
    }

    try {
        // 1. Fetch all AWBs and their associated recipients for the given shipments
        const awbsQuery = query(collection(db, "awbs"), where("shipmentId", "in", shipmentIds));
        const awbsSnapshot = await getDocs(awbsQuery);
        const awbs = awbsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AWB));

        if (awbs.length === 0) {
            return { success: false, message: "No AWBs found for the selected shipments." };
        }
        
        const allRecipientIds: string[] = [];
        const awbRecipientMap = new Map<string, Recipient[]>();

        const recipientsQuery = query(collection(db, "recipients"), where("shipmentId", "in", shipmentIds));
        const recipientsSnapshot = await getDocs(recipientsQuery);
        const allRecipients = recipientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipient));

        allRecipients.forEach(recipient => {
            if (!awbRecipientMap.has(recipient.awbId)) {
                awbRecipientMap.set(recipient.awbId, []);
            }
            awbRecipientMap.get(recipient.awbId)!.push(recipient);
        });

        // 2. Build the 'fisier' string
        // This header must match the SelfAWB API documentation exactly.
        const header = "Destinatar|Adresa|Oras|Judet|Persoana_contact|Telefon|Email|Observatii|Continut|Plic|Colet|Valoare_declarata|Ramburs|Platitor_expeditie|Serviciu";
        
        const awbPayloads = awbs.map(awb => {
            // For each AWB, we use the main recipient's details.
            // The parcels are consolidated via the 'Colet' field.
            const recipient = awbRecipientMap.get(awb.id)?.[0];
            if (!recipient) return null; // Should not happen if data is consistent

            const row = [
                awb.mainRecipientName, // Destinatar
                recipient.address, // Adresa
                recipient.city, // Oras
                recipient.county, // Judet
                awb.mainRecipientName, // Persoana_contact
                awb.mainRecipientTelephone, // Telefon
                recipient.email, // Email
                "", // Observatii
                "Materiale educationale", // Continut
                0, // Plic
                awb.parcelCount, // Colet
                0, // Valoare_declarata
                0, // Ramburs
                "expeditor", // Platitor_expeditie
                "Standard" // Serviciu
            ];
            return row.join('|');
        }).filter(Boolean);


        const fisier = [header, ...awbPayloads].join('\n');
        
        // 3. Make the API call
        const body = new URLSearchParams();
        body.append('username', username);
        body.append('client_id', clientId);
        body.append('user_pass', userPass);
        body.append('fisier', fisier);
        
        const response = await fetch(SELFAWB_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            return { success: false, message: `AWB API request failed with status: ${response.status}` };
        }

        const responseText = await response.text();
        const responseLines = responseText.trim().split('\n');

        // 4. Process the response and update the database
        const batch = writeBatch(db);
        const results = [];

        for (let i = 0; i < responseLines.length; i++) {
            const line = responseLines[i].trim();
            const awbToUpdate = awbs[i]; // Assumes response order matches request order
            const shipmentId = awbToUpdate.shipmentId;
            const awbRef = doc(db, "awbs", awbToUpdate.id);
            const shipmentRef = doc(db, "shipments", shipmentId);
            
            if (line.startsWith('OK|')) {
                const newAwbNumber = line.split('|')[1];
                batch.update(awbRef, { awbNumber: newAwbNumber });
                batch.update(shipmentRef, { status: 'AWB Generated' });
                results.push({ shipmentId, status: 'Success', awbNumber: newAwbNumber });
            } else {
                const errorReason = line.startsWith('ERROR|') ? line.substring(6) : line;
                batch.update(shipmentRef, { status: 'AWB Generation Failed', error: errorReason });
                results.push({ shipmentId, status: 'Failed', error: errorReason });
            }
        }
        
        await batch.commit();

        return { 
            success: true, 
            message: 'AWB generation process completed.',
            details: results
        };

    } catch (error: any) {
        return { success: false, message: `An unexpected error occurred: ${error.message}` };
    }
  }
);
