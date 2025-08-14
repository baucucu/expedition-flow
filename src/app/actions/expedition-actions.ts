"use server";

import { documentContentGenerator, type DocumentContentGeneratorInput } from "@/ai/flows/document-content-generator";
import { z } from "zod";

const actionInputSchema = z.object({
    documentType: z.enum(['proces verbal de receptie', 'instructiuni pentru confirmarea primirii coletului', 'parcel inventory']),
    expeditionDetails: z.string(),
    existingContent: z.string().optional(),
});

export async function generateDocumentContentAction(input: DocumentContentGeneratorInput) {
    const validatedInput = actionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, error: "Invalid input." };
    }

    try {
        const output = await documentContentGenerator(validatedInput.data);
        return { success: true, data: output };
    } catch (error) {
        console.error("Error in documentContentGenerator flow:", error);
        return { success: false, error: "Failed to generate document content due to a server error." };
    }
}
