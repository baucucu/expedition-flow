
"use server";

import { sendReminderTask } from "@/trigger/email/send-reminder";
import { addNoteToAwbAction } from "./awb-actions";
import { z } from "zod";

const ReminderRecipientSchema = z.object({
  documentId: z.string(),
  recipientEmail: z.string(),
  awbId: z.string(),
  recipientName: z.string(),
});

const sendReminderParams = z.object({
  recipients: z.array(ReminderRecipientSchema),
  user: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export async function sendReminder(
  params: z.infer<typeof sendReminderParams>
) {
  const parsedParams = sendReminderParams.parse(params);
  const { recipients, user } = parsedParams;

  // 1. Trigger the reminder tasks
  const runs = await Promise.all(
    recipients.map((recipient) =>
      sendReminderTask.trigger({
        documentId: recipient.documentId,
        recipientEmail: recipient.recipientEmail,
      })
    )
  );

  // 2. Create a note for each
  const notePromises = recipients.map((recipient) => {
    const noteData = {
      awbId: recipient.awbId,
      noteText: "Email reminder sent",
      userId: user.id,
      userName: user.name,
      recipientId: recipient.documentId,
      recipientName: recipient.recipientName,
      createdAt: new Date().toISOString(),
    };
    return addNoteToAwbAction(noteData);
  });

  await Promise.all(notePromises);

  return {
    success: true,
    message: "Reminders sent and notes created successfully",
    runs: runs.map((run) => run.id),
  };
}
