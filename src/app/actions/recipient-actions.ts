
"use server";

import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

const updateRecipientVerificationSchema = z.object({
  recipientId: z.string(),
  verified: z.boolean(),
});

export async function updateRecipientVerificationAction(
  input: z.infer<typeof updateRecipientVerificationSchema>
) {
  const validation = updateRecipientVerificationSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: "Invalid input." };
  }

  const { recipientId, verified } = validation.data;

  try {
    const recipientRef = doc(db, "recipients", recipientId);
    await updateDoc(recipientRef, { verified });
    return { success: true, message: "Verification status updated." };
  } catch (error: any) {
    console.error("Error updating recipient verification:", error);
    return { success: false, error: `An unexpected error occurred: ${error.message}` };
  }
}
