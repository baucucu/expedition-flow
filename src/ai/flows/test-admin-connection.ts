'use server';

/**
 * @fileOverview A flow for testing the Firebase Admin SDK connection.
 *
 * Exports:
 * - testAdminConnection: function entrypoint
 * - TestAdminConnectionOutput: typed return result
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { auth } from '@/lib/firebase-admin';

//
// 🔹 Schema & Types
//
const TestAdminConnectionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
});
export type TestAdminConnectionOutput = z.infer<typeof TestAdminConnectionOutputSchema>;

//
// 🔹 Core connectivity check
//
async function runFirebaseAdminCheck(): Promise<TestAdminConnectionOutput> {
  try {
    // Minimal authenticated read
    const { users } = await auth.listUsers(1);

    const message = `✅ Firebase Admin connected. Retrieved ${users.length} user(s).`;
    console.log(message);

    return { success: true, message };
  } catch (err) {
    const error =
      err instanceof Error ? err : new Error(String(err));

    console.error('❌ Firebase Admin connection test failed:', error);

    return {
      success: false,
      message: 'Firebase Admin connection test failed.',
      error: error.message,
    };
  }
}

//
// 🔹 Flow wrapper (for Genkit / AI orchestration)
//
const testAdminConnectionFlow = ai.defineFlow(
  {
    name: 'testAdminConnectionFlow',
    inputSchema: z.void(),
    outputSchema: TestAdminConnectionOutputSchema,
  },
  async () => runFirebaseAdminCheck()
);

//
// 🔹 Public API
//
export async function testAdminConnection(): Promise<TestAdminConnectionOutput> {
  return testAdminConnectionFlow();
}
