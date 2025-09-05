
"use server";

import { z } from "zod";
import { formatPvSemnatTask } from "@/trigger/pv-semnat/format-pv-semnat";

const formatPvSemnatSchema = z.object({
    recipientDocId: z.string(),
    pvSemnatUrl: z.string(),
});

export async function formatPvSemnatAction(input: z.infer<typeof formatPvSemnatSchema>) {
    const validation = formatPvSemnatSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: "Invalid input for formatting PV Semnat." };
    }

    try {
        const { recipientDocId, pvSemnatUrl } = validation.data;
        const run = await formatPvSemnatTask.trigger({
            recipientDocId,
            pvSemnatUrl,
        });

        return { success: true, message: "Successfully queued PV Semnat formatting.", runId: run.id };
    } catch (error: any) {
        console.error("Error triggering format-pv-semnat task:", error);
        return { success: false, message: `Failed to queue PV Semnat formatting: ${error.message}` };
    }
}
