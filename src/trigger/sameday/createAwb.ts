import {schemaTask, logger} from "@trigger.dev/sdk"
import {z} from "zod"

const ShipmentSchema = z.object({
    packageSize: z.string(), // e.g. "L"
    county: z.string(), // e.g. "Alba"
    shipmentId: z.string(), // numeric string, but kept as string
    mainRecipientEmail: z.string().email(),
    mainRecipientName: z.string(),
    city: z.string(),
    address: z.string(),
    mainRecipientTelephone: z.string().regex(/^\d+$/, "Must be numeric"),
    postalCode: z.string(), // could also regex: /^\d{6}$/
    status: z.enum(["New", "Pending", "Delivered", "Cancelled", "Queued", "AWB_CREATED"]).default("New"),
    id: z.string(),
    parcelCount: z.number(),
    countyId: z.string(), // could be number but sample shows string
    cityId: z.string(),
    name: z.string(),
  });

export const createAwb = schemaTask({
    id: "create-awb",
    schema: ShipmentSchema,
    run: async (payload) => {
        
        const body = new URLSearchParams();
        body.append('packageType', '0');
        body.append('clientInternalReference', payload.shipmentId);
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
        body.append('orderNumber', payload.shipmentId);
        // body.append('observation', 'A');
        // body.append('priceObservation', 'B');
        // body.append('clientObservation', 'C');
        if(payload.packageSize === "S") {
            // Flatten parcels
            body.append('parcels[0][width]', '30');
            body.append('parcels[0][length]', '20');
            body.append('parcels[0][height]', '15');
            body.append('parcels[0][weight]', '1');
        }
        if(payload.packageSize === "M") {
            // Flatten parcels
            body.append('parcels[0][width]', '40');
            body.append('parcels[0][length]', '30');
            body.append('parcels[0][height]', '20');
            body.append('parcels[0][weight]', '1');
        }
        if(payload.packageSize === "L") {
            // Flatten parcels
            body.append('parcels[0][width]', '55');
            body.append('parcels[0][length]', '40');
            body.append('parcels[0][height]', '30');
            body.append('parcels[0][weight]', '2');
        }

        // Flatten awbRecipient
        body.append('awbRecipient[county]', payload.countyId);
        body.append('awbRecipient[city]', payload.cityId);
        body.append('awbRecipient[name]', payload.mainRecipientName);
        body.append('awbRecipient[address]', payload.address);
        body.append('awbRecipient[phoneNumber]', payload.mainRecipientTelephone);
        body.append('awbRecipient[postalCode]', payload.postalCode);
        body.append('awbRecipient[email]', payload.mainRecipientEmail);
        body.append('awbRecipient[personType]', '0');

        

        try {
            const authToken = process.env.SAMEDAY_API_TOKEN;
            const api_url = process.env.SAMEDAY_API_URL;

            if (!authToken) {
                throw new Error("Sameday API token is not configured in environment variables.");
            }
            if(!api_url) {
                throw new Error("Sameday API URL is not configured in environment variables.");
            }
            console.log({body})
            const response = await fetch(api_url+"/awb", {
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
                console.error("Sameday API Error:", {...responseData});
                throw new Error(`Sameday API request failed with status: ${response.status}.`);
            }
    
            return responseData;
    
        } catch (error: any) {
            console.error(`An unexpected error occurred: ${error.message}`);
            throw error;
        }

    }
})