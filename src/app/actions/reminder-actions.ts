
"use server";

import { sendReminderTask } from "@/trigger/email/send-reminder";
import { addNoteToAwbAction } from "./awb-actions";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";

const ReminderRecipientSchema = z.object({
  instructionsDocumentId: z.string(),
  pvUrl: z.string(),
  recipientEmail: z.string(),
  awbId: z.string(),
  recipientName: z.string(),
  recipientId: z.string(),
  location: z.string(),
  awbMainRecipientName: z.string(),
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

  if (recipients.length === 0) {
    return {
      success: false,
      message: "No recipients to process.",
    };
  }

  // 1. Trigger the reminder tasks in a batch
  const events = recipients.map((recipient) => ({
    payload: {
      instructionsDocumentId: recipient.instructionsDocumentId,
      pvUrl: recipient.pvUrl,
      recipientEmail: recipient.recipientEmail,
      recipientName: recipient.recipientName,
      recipientId: recipient.recipientId,
      location: recipient.location,
      awbMainRecipientName: recipient.awbMainRecipientName,
    },
  }));
  
  const runs = await tasks.batchTrigger("send-reminder", events);

  // 2. Create a note for each
  const notePromises = recipients.map((recipient) => {
    const noteData = {
      awbId: recipient.awbId,
      noteText: "Email reminder sent",
      userId: user.id,
      userName: user.name,
      recipientId: recipient.recipientId,
      recipientName: recipient.recipientName,
      createdAt: new Date(),
    };
    return addNoteToAwbAction(noteData);
  });

  await Promise.all(notePromises);

  return {
    success: true,
    message: "Reminder tasks have been successfully queued.",
  };
}
