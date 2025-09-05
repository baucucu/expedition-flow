
"use server";

import { sendReminderTask } from "@/trigger/email/send-reminder";
import { z } from "zod";

const RecipientSchema = z.object({
  documentId: z.string(),
  recipientEmail: z.string(),
});

const sendReminderParams = z.array(RecipientSchema);

export async function sendReminder(
  recipients: z.infer<typeof sendReminderParams>
) {
  const parsedRecipients = sendReminderParams.parse(recipients);

  const runs = await Promise.all(
    parsedRecipients.map((recipient) =>
      sendReminderTask.trigger({
        documentId: recipient.documentId,
        recipientEmail: recipient.recipientEmail,
      })
    )
  );

  return {
    success: true,
    message: "Reminders sent successfully",
    runs: runs.map((run) => run.id),
  };
}
