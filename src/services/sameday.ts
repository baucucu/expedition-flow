
import { z } from 'zod';
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { AWB, Recipient } from "@/types";

const SAMEDAY_API_URL = process.env.SAMEDAY_API_URL || 'https://sameday-api.demo.zitec.com/api';
const SAMEDAY_API_TOKEN = process.env.SAMEDAY_API_TOKEN;

// --- API Client ---

async function samedayApiPost<T>(endpoint: string, body: URLSearchParams): Promise<T> {
    if (!SAMEDAY_API_TOKEN) {
        throw new Error('Sameday API token is not configured.');
    }

    const response = await fetch(`${SAMEDAY_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'X-Auth-Token': SAMEDAY_API_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        // Sameday errors are often in data.message or can be the whole object
        const errorMessage = data?.message || JSON.stringify(data);
        throw new Error(`Sameday API Error at ${endpoint}: ${errorMessage}`);
    }

    return data as T;
}


// --- API Methods ---

// Placeholder - to be implemented with the correct API endpoint and payload
export async function getCountyId(countyName: string): Promise<number> {
    // const body = new URLSearchParams();
    // body.append('name', countyName);
    // const response = await samedayApiPost<{ data: { id: number }[] }>('/counties', body);
    // if (!response.data || response.data.length === 0) {
    //     throw new Error(`County '${countyName}' not found.`);
    // }
    // return response.data[0].id;
    console.log(`DEV: Simulating county lookup for "${countyName}". Returning placeholder ID.`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
    // This is a placeholder. Replace with a real ID from your tests.
    if (countyName.toLowerCase().includes('bucuresti')) return 14; 
    return 99; // Placeholder
}

// Placeholder - to be implemented with the correct API endpoint and payload
export async function getCityId(cityName: string, countyId: number): Promise<number> {
    // const body = new URLSearchParams();
    // body.append('name', cityName);
    // body.append('county', String(countyId));
    // const response = await samedayApiPost<{ data: { id: number }[] }>('/cities', body);
    // if (!response.data || response.data.length === 0) {
    //     throw new Error(`City '${cityName}' in county '${countyId}' not found.`);
    // }
    // return response.data[0].id;
     console.log(`DEV: Simulating city lookup for "${cityName}". Returning placeholder ID.`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
    // This is a placeholder. Replace with a real ID from your tests.
    if (cityName.toLowerCase().includes('bucuresti')) return 5479;
    return 999; // Placeholder
}


const SamedayAwbRequestSchema = z.object({
    packageType: z.number().default(0),
    clientInternalReference: z.string().optional(),
    cashOnDelivery: z.number().default(0),
    insuredValue: z.number().default(0),
    packageNumber: z.number().default(1),
    pickupPoint: z.number(), // This is a required field, needs a default or logic
    service: z.number(), // This is a required field, needs a default or logic
    contactPerson: z.string(), // This is a required field, needs a default or logic
    deliveryInterval: z.number().optional(),
    awbPayment: z.number().default(1),
    thirdPartyPickup: z.number().default(0),
    packageWeight: z.number().default(1),
    observation: z.string().optional(),
    parcels: z.array(z.object({
        width: z.number(),
        length: z.number(),
        height: z.number(),
        weight: z.number(),
    })),
    awbRecipient: z.object({
        county: z.number(),
        city: z.number(),
        name: z.string(),
        address: z.string(),
        phoneNumber: z.string(),
        postalCode: z.string().optional(),
        email: z.string().optional(),
        personType: z.number().default(0),
    }),
});

const SamedayAwbResponseSchema = z.object({
    awbNumber: z.string(),
    parcels: z.record(z.string(), z.object({
        position: z.number(),
        awbNumber: z.string(),
    })),
    awbCost: z.number(),
});


export async function createAwb(awbId: string): Promise<z.infer<typeof SamedayAwbResponseSchema>> {
    // 1. Fetch data from Firestore
    const awbRef = doc(db, "awbs", awbId);
    const awbSnap = await getDoc(awbRef);
    if (!awbSnap.exists()) {
        throw new Error(`AWB with ID ${awbId} not found.`);
    }
    const awbData = awbSnap.data() as AWB;

    const recipientsQuery = query(collection(db, "recipients"), where("awbId", "==", awbId));
    const recipientsSnapshot = await getDocs(recipientsQuery);
     if (recipientsSnapshot.empty) {
        throw new Error(`No recipients found for AWB ID ${awbId}.`);
    }
    // We assume the first recipient holds the primary address info for the AWB.
    const recipientData = recipientsSnapshot.docs[0].data() as Recipient;

    // 2. Get County & City IDs
    const countyId = await getCountyId(recipientData.county || 'Bucuresti'); // Default for safety
    const cityId = await getCityId(recipientData.city || 'Bucuresti', countyId);

    // 3. Build the request payload
    // Using hardcoded values from your example for now.
    // These should ideally come from configuration or the expedition data.
    const requestData: z.infer<typeof SamedayAwbRequestSchema> = {
        packageType: 0,
        clientInternalReference: recipientData.id,
        cashOnDelivery: 0,
        insuredValue: 0,
        packageNumber: awbData.parcelCount || 1,
        pickupPoint: 4241, // TODO: Make dynamic
        service: 7, // TODO: Make dynamic
        contactPerson: "Alexandru Raduca", // TODO: This should be sender contact
        awbPayment: 1,
        thirdPartyPickup: 0,
        packageWeight: 1, // TODO: Calculate from parcels
        parcels: Array.from({ length: awbData.parcelCount || 1 }).map(() => ({
            width: 30, // TODO: Make dynamic
            length: 30, // TODO: Make dynamic
            height: 30, // TODO: Make dynamic
            weight: 1, // TODO: Make dynamic
        })),
        awbRecipient: {
            county: countyId,
            city: cityId,
            name: recipientData.name,
            address: recipientData.address,
            phoneNumber: recipientData.telephone || '0000000000',
            postalCode: recipientData.postalCode,
            email: recipientData.email,
            personType: 0,
        },
    };

    // 4. Flatten the object into URLSearchParams
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(requestData)) {
        if (value === undefined || value === null) continue;

        if (key === 'parcels' && Array.isArray(value)) {
            value.forEach((parcel, index) => {
                for (const [pKey, pValue] of Object.entries(parcel)) {
                    body.append(`parcels[${index}][${pKey}]`, String(pValue));
                }
            });
        } else if (key === 'awbRecipient' && typeof value === 'object') {
             for (const [rKey, rValue] of Object.entries(value)) {
                 if (rValue !== undefined && rValue !== null) {
                    body.append(`awbRecipient[${rKey}]`, String(rValue));
                 }
            }
        } else {
            body.append(key, String(value));
        }
    }
    
    // 5. Make the API call
    return await samedayApiPost<z.infer<typeof SamedayAwbResponseSchema>>('/awb', body);
}
