import { db } from "@/lib/firebase";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const getAwbData = schemaTask({
  id: "get-awb-data",
  schema: z.object({
    shipmentId: z.string(),
  }),
  run: async (payload) => {
    const { shipmentId } = payload;

    const q = query(
      collection(db, "awbs"),
      where("shipmentId", "==", shipmentId),
      limit(1)
    );
    const awbQuerySnapshot = await getDocs(q);    

    if (awbQuerySnapshot.empty) {
      console.log(`No AWB found for shipmentId: ${shipmentId}`);
      return null; // Or handle the case where no AWB is found as appropriate
    }

    const awbDoc = awbQuerySnapshot.docs[0];
    const awbData = awbDoc.data();

    // You can process awbData further here if needed
    console.log("Retrieved AWB data:", awbData);

    return awbData;
  },
});