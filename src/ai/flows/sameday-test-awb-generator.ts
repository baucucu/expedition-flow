
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
        body.append('clientInternalReference', '12345');
        body.append('cashOnDelivery', '0');
        body.append('insuredValue', '0');
        body.append('packageNumber', '1');
        body.append('pickupPoint', '4241');
        body.append('service', '7');
        body.append('contactPerson', '4833');
        body.append('deliveryInterval', '1');
        body.append('awbPayment', '1');
        body.append('thirdPartyPickup', '0');
        body.append('packageWeight', '1');

        // optional but sometimes required
        body.append('orderNumber', '12345-1');
        body.append('observation', 'A');
        body.append('priceObservation', 'B');
        body.append('clientObservation', 'C');
        
        // Flatten parcels
        body.append('parcels[0][width]', '30');
        body.append('parcels[0][length]', '30');
        body.append('parcels[0][height]', '30');
        body.append('parcels[0][weight]', '1');

        // Flatten awbRecipient
        body.append('awbRecipient[county]', '14');
        body.append('awbRecipient[city]', '5479');
        body.append('awbRecipient[name]', 'Alexandru Raduca');
        body.append('awbRecipient[address]', 'Ion Brezoianu 60, apt.27');
        body.append('awbRecipient[phoneNumber]', '0754832167');
        body.append('awbRecipient[postalCode]', '077005');
        body.append('awbRecipient[email]', 'alexandru.raduca@gmail.com');
        body.append('awbRecipient[personType]', '0');

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
