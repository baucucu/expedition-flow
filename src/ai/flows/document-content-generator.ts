'use server';

/**
 * @fileOverview AI-powered document content generator flow.
 *
 * - documentContentGenerator - A function that generates document content using AI.
 * - DocumentContentGeneratorInput - The input type for the documentContentGenerator function.
 * - DocumentContentGeneratorOutput - The return type for the documentContentGenerator function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DocumentContentGeneratorInputSchema = z.object({
  expeditionDetails: z
    .string()
    .describe('Details about the expedition, including origin, destination, items, and dates.'),
  documentType: z
    .enum(['proces verbal de receptie', 'instructiuni pentru confirmarea primirii coletului', 'parcel inventory'])
    .describe('The type of document to generate content for.'),
  existingContent: z.string().optional().describe('The existing content of the document, if any.'),
});
export type DocumentContentGeneratorInput = z.infer<typeof DocumentContentGeneratorInputSchema>;

const DocumentContentGeneratorOutputSchema = z.object({
  content: z.string().describe('The generated content for the document.'),
});
export type DocumentContentGeneratorOutput = z.infer<typeof DocumentContentGeneratorOutputSchema>;

export async function documentContentGenerator(input: DocumentContentGeneratorInput): Promise<DocumentContentGeneratorOutput> {
  return documentContentGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'documentContentGeneratorPrompt',
  input: {schema: DocumentContentGeneratorInputSchema},
  output: {schema: DocumentContentGeneratorOutputSchema},
  prompt: `You are an AI assistant specialized in generating content for expedition documents.

You will receive details about an expedition and the type of document to generate content for. Based on this information, generate relevant and informative content for the document.

IMPORTANT: If the documentType is 'instructiuni pentru confirmarea primirii coletului', you MUST return the following static text, ignoring the other expedition details:
"Stimate partener,
Vă mulțumim pentru colaborare.
Pentru o bună desfășurare a activităților, vă rugăm să parcurgeți cu atenție instrucțiunile de mai jos:
1. Recepționați coletul de la curier.
2. Realizați inventarul produselor primite, conform documentului de însoțire (proces verbal de predare-primire).
3. Semnați și ștampilați procesul verbal de predare-primire.
4. Încărcați procesul verbal semnat și ștampilați în platforma noastră, scanând codul QR de pe colet.
Vă mulțumim!"

For all other document types, use the provided details to generate the content.

Expedition Details: {{{expeditionDetails}}}
Document Type: {{{documentType}}}
Existing Content: {{{existingContent}}}

Content:`,
});

const documentContentGeneratorFlow = ai.defineFlow(
  {
    name: 'documentContentGeneratorFlow',
    inputSchema: DocumentContentGeneratorInputSchema,
    outputSchema: DocumentContentGeneratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
