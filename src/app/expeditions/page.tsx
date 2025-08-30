import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ExpeditionDashboard } from "@/components/expedition-dashboard";
import { Recipient, Expedition, AWB, ExpeditionStatus } from "@/types";
import { RecipientRow } from "@/components/expedition-dashboard/types";
import { unstable_noStore as noStore } from 'next/cache';


async function getExpeditionsData() {
  noStore();
  try {
    const recipientsSnapshot = await getDocs(collection(db, "recipients"));
    const recipients = recipientsSnapshot.docs.map(doc => doc.data() as Recipient);

    const expeditionsSnapshot = await getDocs(collection(db, "shipments"));
    const expeditions = expeditionsSnapshot.docs.map(doc => doc.data() as Expedition);
    const expeditionsMap = new Map(expeditions.map(exp => [exp.id, exp]));

    const awbsSnapshot = await getDocs(collection(db, "awbs"));
    const awbs = awbsSnapshot.docs.map(doc => doc.data() as AWB);
    const awbsMap = new Map(awbs.map(awb => [awb.id, awb]));

    const data: RecipientRow[] = recipients.map(recipient => {
      const expedition = expeditionsMap.get(recipient.shipmentId);
      const awb = recipient.awbId ? awbsMap.get(recipient.awbId) : undefined;
      
      return {
        ...recipient,
        expeditionId: recipient.shipmentId,
        expeditionStatus: expedition ? expedition.status : 'New',
        awb: awb,
        awbUrl: awb?.awbUrl,
      };
    });
    console.log(JSON.stringify(data[0]))
    return { data, expeditions };
  } catch (error) {
    console.error("Failed to fetch expeditions data:", error);
    return { data: [], expeditions: [] };
  }
}

export default async function ExpeditionsPage() {
  const { data, expeditions } = await getExpeditionsData();
  
  return (
    <div className="h-full px-4 py-6 lg:px-8">
      <div className="h-full">
        <ExpeditionDashboard initialData={data} expeditions={expeditions} />
      </div>
    </div>
  );
}
