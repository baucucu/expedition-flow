'use server';

/**
 * @fileOverview An AI flow for suggesting mappings between file columns and application fields.
 * 
 * - mapFields - A function that suggests mappings.
 * - FieldMapperInput - The input type for the mapFields function.
 * - FieldMapperOutput - The return type for the mapFields function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AppFieldSchema = z.object({
    value: z.string(),
    label: z.string(),
});

const FieldMapperInputSchema = z.object({
  fileColumns: z.array(z.string()).describe('The column headers extracted from the user\'s uploaded file.'),
  appFields: z.array(AppFieldSchema).describe('The available fields in the application that can be mapped to.'),
});
export type FieldMapperInput = z.infer<typeof FieldMapperInputSchema>;

const FieldMapperOutputSchema = z.record(z.string()).describe('A mapping from each file column to a corresponding application field value. If a column cannot be mapped, its value should be "ignore".');
export type FieldMapperOutput = z.infer<typeof FieldMapperOutputSchema>;

export async function mapFields(input: FieldMapperInput): Promise<FieldMapperOutput> {
  return mapFieldsFlow(input);
}

const prompt = ai.definePrompt({
    name: 'fieldMapperPrompt',
    input: { schema: FieldMapperInputSchema },
    output: { schema: FieldMapperOutputSchema },
    prompt: `You are an expert data mapping assistant. Your task is to map column headers from an imported file to the defined fields of an application.

File Columns:
{{#each fileColumns}}
- {{{this}}}
{{/each}}

Application Fields:
{{#each appFields}}
- value: {{{value}}}, label: {{{label}}}
{{/each}}

Based on the file columns and the available application fields, provide the best mapping. The output should be a JSON object where the keys are the file column headers and the values are the corresponding application field 'value'.

Consider common naming conventions, abbreviations, and different languages (e.g., Romanian 'nume' should map to 'name'). If a file column does not have a clear corresponding application field, map it to the value "ignore".`,
});


const mapFieldsFlow = ai.defineFlow(
  {
    name: 'mapFieldsFlow',
    inputSchema: FieldMapperInputSchema,
    outputSchema: FieldMapperOutputSchema,
  },
  async (input) => {
    // Dynamically create the output schema based on the input file columns
    const dynamicOutputProperties: Record<string, z.ZodString> = {};
    input.fileColumns.forEach(column => {
      dynamicOutputProperties[column] = z.string();
    });
    const dynamicOutputSchema = z.object(dynamicOutputProperties);

    // Call the prompt with the dynamically generated output schema
    const { output } = await prompt(input, { output: { schema: dynamicOutputSchema }});
    return output!;
  }
);
