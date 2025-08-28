
"use server";

import { testAdminConnection } from "@/ai/flows/test-admin-connection";

// Action for testing the Firebase Admin connection
export async function testAdminConnectionAction() {
    try {
        const output = await testAdminConnection();
        return output;
    } catch (error: any) {
        console.error("Error in testAdminConnection flow:", error);
        return { success: false, message: 'Flow execution failed', error: `Failed to call test flow: ${error.message}` };
    }
}
