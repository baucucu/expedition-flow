"use server";

import { documentContentGenerator, type DocumentContentGeneratorInput } from "@/ai/flows/document-content-generator";
import { mapFields, type FieldMapperInput } from "@/ai/flows/field-mapper";
import { z } from "zod";

const generateActionInputSchema = z.object({
    documentType: z.enum(['proces verbal de receptie', 'instructiuni pentru confirmarea primirii coletului', 'parcel inventory']),
    expeditionDetails: z.string(),
    existingContent: z.string().optional(),
});

export async function generateDocumentContentAction(input: DocumentContentGeneratorInput) {
    const validatedInput = generateActionInputSchema.safeParse(input);
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


const mapFieldsActionInputSchema = z.object({
  fileColumns: z.array(z.string()),
  appFields: z.array(z.object({ value: z.string(), label: z.string() })),
});

export async function mapFieldsAction(input: FieldMapperInput) {
    const validatedInput = mapFieldsActionInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { success: false, error: "Invalid input for field mapping." };
    }

    try {
        const output = await mapFields(validatedInput.data);
        return { success: true, data: output };
    } catch (error) {
        console.error("Error in mapFields flow:", error);
        return { success: false, error: "Failed to suggest field mapping due to a server error." };
    }
}
