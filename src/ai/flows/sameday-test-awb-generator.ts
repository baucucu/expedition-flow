
'use server';

/**
 * @fileOverview A flow for testing Sameday AWB generation with static data.
 * 
 * - testSamedayAwbGeneration - A function that calls the Sameday API.
 * - SamedayTestAwbGeneratorOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SamedayTestAwbGeneratorOutputSchema = z.any().describe('The JSON response from the Sameday API.');
type SamedayTestAwbGeneratorOutput = z.infer<typeof SamedayTestAwbGeneratorOutputSchema>;

export async function testSamedayAwbGeneration(): Promise<SamedayTestAwbGeneratorOutput> {
  return testSamedayAwbGenerationFlow();
}

const SAMEDAY_API_URL = 'https://sameday-api.demo.zitec.com/api/awb';

const testSamedayAwbGenerationFlow = ai.defineFlow(
  {
    name: 'testSamedayAwbGenerationFlow',
    inputSchema: z.void(),
    outputSchema: SamedayTestAwbGeneratorOutputSchema,
  },
  async () => {
    
    const authToken = process.env.SAMEDAY_API_TOKEN;

    if (!authToken) {
      throw new Error("Sameday API token is not configured in environment variables.");
    }

    try {
        const body = new URLSearchParams();
        body.append('packageType', '0');
        body.append('clientInternalReference', '1234');
        body.append('cashOnDelivery', '0');
        body.append('insuredValue', '0');
        body.append('parcels', JSON.stringify({ "width": "30", "length": "30", "height": "30", "weight": "1" }));
        body.append('awbRecipient', JSON.stringify({ "name": "Alexandru Raduca", "address": "Ion Brezoianu 60, apt.27", "phoneNumber": "0754832167", "postalCode": "010139", "countyString": "Sector 4", "cityString": "Bucuresti", "email": "alexandru.raduca@gmail.com", "personType": "0" }));
        body.append('packageNumber', '1');
        body.append('pickupPoint', '4241');
        body.append('service', '7');
        body.append('contactPerson', '4833');
        body.append('deliveryInterval', '1');
        body.append('awbPayment', '1');
        body.append('thirdPartyPickup', '0');
        body.append('packageWeight', '1');
        
        const response = await fetch(SAMEDAY_API_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'X-Auth-Token': authToken,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("Sameday API Error:", responseData);
            throw new Error(`Sameday API request failed with status: ${response.status}.`);
        }

        return responseData;

    } catch (error: any) {
        console.error(`An unexpected error occurred: ${error.message}`);
        throw error;
    }
  }
);
