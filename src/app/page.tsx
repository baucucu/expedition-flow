
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Expedition, ExpeditionStatus, Recipient, AWB } from "@/types";
import { ExpeditionDashboard } from "@/components/expedition-dashboard";
import { ScorecardGrid, type ScorecardData } from "@/components/scorecard-grid";
import { AppHeader } from "@/components/header";
import { Box } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export type FilterStatus = ExpeditionStatus | 'Total' | 'Issues' | 'CompletedRecipients' | 'Delivered' | 'PV' | 'Inventory' | 'Instructions' | 'DocsFailed' | 'AwbFailed' | 'EmailFailed' | 'NewRecipient' | 'Returned' | null;

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('Total');
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [awbs, setAwbs] = useState<AWB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const shipmentsQuery = query(collection(db, "shipments"));
    const shipmentsUnsubscribe = onSnapshot(shipmentsQuery, (querySnapshot) => {
        const shipmentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expedition));
        setExpeditions(shipmentsData);
    });

    const recipientsQuery = query(collection(db, "recipients"));
    const recipientsUnsubscribe = onSnapshot(recipientsQuery, (querySnapshot) => {
        const recipientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipient));
        setRecipients(recipientsData);
    });

    const awbsQuery = query(collection(db, "awbs"));
    const awbsUnsubscribe = onSnapshot(awbsQuery, (querySnapshot) => {
        const awbsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AWB));
        setAwbs(awbsData);
    });
    
    setLoading(false);

    return () => {
        shipmentsUnsubscribe();
        recipientsUnsubscribe();
        awbsUnsubscribe();
    };
  }, [user]);
  

  const allRecipientsWithFullData = useMemo(() => {
    if (!recipients.length || !expeditions.length || !awbs.length) return [];
    
    const expeditionsMap = new Map(expeditions.map(exp => [exp.id, exp]));
    const awbsMap = new Map(awbs.map(awb => [awb.id, awb]));

    return recipients.map(rec => {
        const expedition = expeditionsMap.get(rec.shipmentId!);
        const awb = awbsMap.get(rec.awbId);
        return {
            ...rec,
            expeditionId: expedition?.id || rec.shipmentId,
            expeditionStatus: expedition?.status || 'New',
            awb: awb
        };
    });
  }, [recipients, expeditions, awbs]);

  const scorecardCounts: ScorecardData = useMemo(() => {
    const recipientsWithFailedDocs = allRecipientsWithFullData.filter(r => 
        r.documents && Object.values(r.documents).some(d => d.status === 'Failed')
    );

    const awbGenerationFailedCount = expeditions.filter(e => e.status === 'AWB Generation Failed').length;
    const emailSendFailedCount = expeditions.filter(e => e.status === 'Email Send Failed').length;

    const issuesCount = expeditions.filter(e => ['Canceled', 'Lost or Damaged'].includes(e.status)).length 
                + recipientsWithFailedDocs.length
                + awbGenerationFailedCount
                + emailSendFailedCount;
    
    const pvGeneratedCount = allRecipientsWithFullData.filter(r => !!r.pvUrl).length;
    const instructionsGeneratedCount = allRecipientsWithFullData.filter(r => r.documents?.['instructiuni pentru confirmarea primirii coletului']?.status === 'Generated').length;
    const inventoryGeneratedCount = allRecipientsWithFullData.filter(r => r.documents?.['parcel inventory']?.status === 'Generated').length;
    const awbGeneratedCount = awbs.filter(awb => !!awb.awbNumber).length;

    
    return {
        totalExpeditions: {
            value: expeditions.length,
            footerText: `${allRecipientsWithFullData.length} recipients`
        },
        docsGenerated: {
            kpis: [
                { value: pvGeneratedCount, label: 'PVs' },
                { value: inventoryGeneratedCount, label: 'Inventories' },
                { value: instructionsGeneratedCount, label: 'Instructions' },
            ]
        },
        awbGenerated: {
            value: awbGeneratedCount,
            footerText: `${awbGenerationFailedCount} errors`,
            errorCount: awbGenerationFailedCount
        },
        sentToLogistics: {
            value: expeditions.filter(e => e.status === 'Sent to Logistics').length,
            footerText: `${emailSendFailedCount} errors`,
            errorCount: emailSendFailedCount
        },
        inTransit: {
            value: expeditions.filter(e => e.status === 'In Transit').length,
        },
        delivered: {
            value: allRecipientsWithFullData.filter(r => r.status === 'Delivered').length,
        },
        issues: {
            value: issuesCount,
        },
        completed: {
            value: allRecipientsWithFullData.filter(r => r.status === 'Completed').length,
        }
    }
  }, [allRecipientsWithFullData, expeditions, awbs]);

  const filteredRecipients = useMemo(() => {
    if (!activeFilter || activeFilter === 'Total') return allRecipientsWithFullData;
    
    if (activeFilter === 'PV') {
        return allRecipientsWithFullData.filter(r => !!r.pvUrl);
    }
    if (activeFilter === 'Inventory') {
        return allRecipientsWithFullData.filter(r => r.documents?.['parcel inventory']?.status === 'Generated');
    }
    if (activeFilter === 'Instructions') {
        return allRecipientsWithFullData.filter(r => r.documents?.['instructiuni pentru confirmarea primirii coletului']?.status === 'Generated');
    }

    if (activeFilter === 'DocsFailed') {
        return allRecipientsWithFullData.filter(r => 
            r.documents && Object.values(r.documents).some(d => d.status === 'Failed')
        );
    }

    if (activeFilter === 'AwbFailed') {
        const expeditionIds = expeditions.filter(e => e.status === 'AWB Generation Failed').map(e => e.id);
        return allRecipientsWithFullData.filter(r => expeditionIds.includes(r.expeditionId!));
    }

    if (activeFilter === 'EmailFailed') {
        const expeditionIds = expeditions.filter(e => e.status === 'Email Send Failed').map(e => e.id);
        return allRecipientsWithFullData.filter(r => expeditionIds.includes(r.expeditionId!));
    }

    if (activeFilter === 'Issues') {
        const issueExpeditionIds = expeditions
            .filter(e => ['Canceled', 'Lost or Damaged', 'AWB Generation Failed', 'Email Send Failed'].includes(e.status))
            .map(e => e.id);
        
        const issueRecipientIds = allRecipientsWithFullData
            .filter(r => r.documents && Object.values(r.documents).some(d => d.status === 'Failed'))
            .map(r => r.id);
        
        return allRecipientsWithFullData.filter(r => issueExpeditionIds.includes(r.expeditionId!) || issueRecipientIds.includes(r.id));
    }

    if (['NewRecipient', 'CompletedRecipients', 'Delivered', 'Returned'].includes(activeFilter)) {
        const statusMap = {
            'NewRecipient': 'New',
            'CompletedRecipients': 'Completed',
            'Delivered': 'Delivered',
            'Returned': 'Returned'
        };
        const recipientStatus = statusMap[activeFilter as keyof typeof statusMap];
        return allRecipientsWithFullData.filter(r => r.status === recipientStatus);
    }

    if (activeFilter === 'AWB Generated') {
        const generatedAwbIds = new Set(awbs.filter(awb => !!awb.awbNumber).map(awb => awb.id));
        return allRecipientsWithFullData.filter(r => generatedAwbIds.has(r.awbId));
    }

    const expeditionFilteredIds = expeditions.filter(e => e.status === activeFilter).map(e => e.id);
    return allRecipientsWithFullData.filter(r => expeditionFilteredIds.includes(r.expeditionId!));
  }, [activeFilter, allRecipientsWithFullData, expeditions, awbs]);

  if (authLoading || loading || !user) {
    return (
       <div className="min-h-screen w-full bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">Expedition Manager</h1>
          </div>
        </header>
        <main className="flex flex-1 flex-col p-4 md:p-6">
             <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 mb-6">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
            </div>
            <div className="w-full">
                <div className="flex items-center py-4">
                    <Skeleton className="h-10 w-[250px]" />
                </div>
                <div className="rounded-md border">
                    <div className="p-4">
                        <Skeleton className="h-8 w-full mb-4" />
                        <Skeleton className="h-8 w-full mb-4" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                </div>
            </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6 gap-6">
        <ScorecardGrid
          counts={scorecardCounts}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
        <ExpeditionDashboard 
            initialData={filteredRecipients} 
            expeditions={expeditions}
        />
      </main>
    </div>
  );
}
