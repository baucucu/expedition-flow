
"use server";

import { renamePvSemnatFiles } from "@/trigger/admin/rename-pv-semnat-files";

export async function startPvSemnatRenameAction() {
    try {
        const run = await renamePvSemnatFiles.trigger();
        return { success: true, message: `Successfully started file renaming process. Run ID: ${run.id}` };
    } catch (error: any) {
        console.error("Error triggering file renaming task:", error);
        return { success: false, error: `Failed to start renaming process: ${error.message}` };
    }
}

