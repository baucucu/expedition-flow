
'use server';

/**
 * @fileOverview A flow for testing the Firebase Admin SDK connection.
 * 
 * - testAdminConnection - A function that attempts a basic authenticated read.
 * - TestAdminConnectionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { adminApp } from "@/lib/firebase-admin";

const TestAdminConnectionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});
export type TestAdminConnectionOutput = z.infer<typeof TestAdminConnectionOutputSchema>;

export async function testAdminConnection(): Promise<TestAdminConnectionOutput> {
  return testAdminConnectionFlow();
}

const testAdminConnectionFlow = ai.defineFlow(
  {
    name: 'testAdminConnectionFlow',
    inputSchema: z.void(),
    outputSchema: TestAdminConnectionOutputSchema,
  },
  async () => {
    try {
      // A simple read operation that requires authentication.
      const userRecords = await adminApp.auth().listUsers(1);
      const message = `Successfully connected to Firebase and fetched ${userRecords.users.length} user(s). Authentication is working.`;
      
      console.log(message); // Log success to the server console.

      return { 
        success: true, 
        message: message,
      };

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage = `Failed to connect to Firebase Admin. Error: ${error.message}`;
      
      console.error("Firebase Admin connection test failed:", error);

      return { 
        success: false, 
        message: "Firebase Admin connection test failed.",
        error: errorMessage,
      };
    }
  }
);
