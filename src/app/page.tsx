
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Expedition, ExpeditionStatus, Recipient, AWB, DocumentStatus, EmailStatus, ExpeditionStatusInfo } from "@/types";
import { ExpeditionDashboard } from "@/components/expedition-dashboard/index";
import { ScorecardGrid, type ScorecardData } from "@/components/scorecard-grid";
import { AppHeader } from "@/components/header";
import { Box } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export type FilterStatus = ExpeditionStatus | 'Total' | 'Issues' | 'Completed' | 'Delivered' | 'PVGenerated' | 'PVQueued' | 'PVNew' | 'Inventory' | 'Instructions' | 'DocsFailed' | 'AwbFailed' | 'EmailFailed' | 'NewRecipient' | 'Returned' | 'Sent' | 'EmailQueued' | 'LogisticsNotReady' | 'LogisticsReady' | 'AwbNew' | 'AwbQueued' | 'AwbGenerated' | 'Recipients' | 'Shipments' | 'Avizat' | 'Ridicare ulterioara' | 'AwbEmis' | 'AlocataRidicare' | 'IntrareSorter' | 'IesireHub' | 'IntrareAgentie' | 'InLivrare' | 'RedirectionareHome' | 'RedirectOOH' | null;

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
        
        let awbStatus: DocumentStatus = 'Not Generated';
        if (awb?.status === 'Generated' || awb?.status === 'AWB_CREATED') {
            awbStatus = 'Generated';
        } else if (awb?.status === 'Failed') {
            awbStatus = 'Failed';
        }

        return {
            ...rec,
            expeditionId: expedition?.id || rec.shipmentId,
            expeditionStatus: awb?.expeditionStatus || 'New',
            awb: awb,
            awbUrl: awb?.awb_data?.pdfLink,
            awbStatus: awbStatus,
            emailStatus: awb?.emailStatus,
            emailId: awb?.emailId
        };
    });
  }, [recipients, expeditions, awbs]);

  const scorecardCounts: ScorecardData = useMemo(() => {
    const recipientsWithFailedDocs = allRecipientsWithFullData.filter(r => 
        r.pvStatus === 'Failed' || r.inventoryStatus === 'Failed' || r.instructionsStatus === 'Failed'
    );

    const awbNewCount = awbs.filter(e => e.status === 'New').length;
    const awbQueuedCount = awbs.filter(e => e.status === 'Queued').length;
    const awbGenerationFailedCount = awbs.filter(e => e.status === 'Failed').length;
    
    const emailQueuedCount = awbs.filter(e => e.emailStatus === 'Queued').length;
    const emailSentCount = awbs.filter(awb => awb.emailStatus === 'Sent').length;
    const emailSendFailedCount = awbs.filter(e => e.emailStatus === 'Failed').length;

    const avizatCount = awbs.filter(awb => awb.expeditionStatus?.status === "Avizat").length;
    const ridicareUlterioaraCount = awbs.filter(awb => awb.expeditionStatus?.status === "Ridicare ulterioara").length;

    const issuesCount = expeditions.filter(e => ['Canceled', 'Lost or Damaged'].includes(e.status)).length 
                + recipientsWithFailedDocs.length
                + awbGenerationFailedCount
                + emailSendFailedCount
                + avizatCount
                + ridicareUlterioaraCount;
    
    const pvGeneratedCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Generated').length;
    const pvQueuedCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Queued').length;
    const pvNewCount = allRecipientsWithFullData.filter(r => r.pvStatus !== 'Generated' && r.pvStatus !== 'Queued').length;
    const instructionsGeneratedCount = allRecipientsWithFullData.filter(r => r.instructionsStatus === 'Generated').length;
    const inventoryGeneratedCount = allRecipientsWithFullData.filter(r => r.inventoryStatus === 'Generated').length;
    const awbGeneratedCount = awbs.filter(awb => !!awb.awb_data?.awbNumber).length;
    const completedCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Complet').length;

    const recipientsByShipment = allRecipientsWithFullData.reduce((acc, recipient) => {
        if (!acc[recipient.shipmentId]) {
            acc[recipient.shipmentId] = [];
        }
        acc[recipient.shipmentId].push(recipient);
        return acc;
    }, {} as Record<string, typeof allRecipientsWithFullData>);

    const awbsByShipment = awbs.reduce((acc, awb) => {
        acc[awb.shipmentId] = awb;
        return acc;
    }, {} as Record<string, AWB>);

    let readyForLogisticsCount = 0;
    const shipmentsWithEmailStatus = new Set(awbs.filter(a => a.emailStatus === 'Queued' || a.emailStatus === 'Sent').map(a => a.shipmentId));

    expeditions.forEach(expedition => {
        if (shipmentsWithEmailStatus.has(expedition.id)) return;

        const shipmentRecipients = recipientsByShipment[expedition.id] || [];
        const shipmentAwb = awbsByShipment[expedition.id];

        const allPvsGenerated = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.pvStatus === 'Generated');
        const allInstructionsSynced = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.instructionsStatus === 'Generated');
        const allInventoriesSynced = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.inventoryStatus === 'Generated');
        const awbIsGenerated = !!shipmentAwb?.awb_data?.awbNumber;
        
        if (allPvsGenerated && allInstructionsSynced && allInventoriesSynced && awbIsGenerated) {
            readyForLogisticsCount++;
        }
    });

    const notReadyForLogisticsCount = expeditions.length - readyForLogisticsCount - emailQueuedCount - emailSentCount;

    const deliveredCount = awbs.filter(awb => awb.expeditionStatus?.status === "Livrata cu succes").length;
    
    // In Transit Statuses
    const inTransitStatuses = [
        "AWB Emis",
        "Alocata pentru ridicare",
        "Intrare sorter",
        "Iesire din hub",
        "Intrare in agentie",
        "In livrare la curier",
        "Redirectionare Home Delivery",
        "Redirect Home to OOH",
    ];
    
    const inTransitCounts = inTransitStatuses.map(status => ({
        label: status,
        value: awbs.filter(awb => awb.expeditionStatus?.status === status).length,
    }));
    
    const totalInTransit = inTransitCounts.reduce((acc, curr) => acc + curr.value, 0);

    return {
        overview: {
            kpis: [
                { value: allRecipientsWithFullData.length, label: 'Recipients' },
                { value: expeditions.length, label: 'Shipments' },
                { value: inventoryGeneratedCount, label: 'Inventories' },
                { value: instructionsGeneratedCount, label: 'Instructions' },
            ]
        },
        pvStatus: {
            kpis: [
                { value: pvNewCount, label: 'New' },
                { value: pvQueuedCount, label: 'Queued' },
                { value: pvGeneratedCount, label: 'Generated' },
            ]
        },
        awbStatus: {
            kpis: [
                { value: awbNewCount, label: 'New' },
                { value: awbQueuedCount, label: 'Queued' },
                { value: awbGeneratedCount, label: 'Generated' },
            ]
        },
        logisticsStatus: {
            kpis: [
                { value: notReadyForLogisticsCount, label: 'Not Ready' },
                { value: readyForLogisticsCount, label: 'Ready' },
                { value: emailQueuedCount, label: 'Queued' },
                { value: emailSentCount, label: 'Sent' },
            ]
        },
        inTransit: {
            value: totalInTransit,
            kpis: inTransitCounts,
        },
        delivered: {
            value: deliveredCount,
        },
        issues: {
            value: issuesCount,
             kpis: [
                { value: avizatCount, label: 'Avizat' },
                { value: ridicareUlterioaraCount, label: 'Ridicare ulterioara' },
            ]
        },
        completed: {
            value: completedCount,
        }
    }
  }, [allRecipientsWithFullData, expeditions, awbs]);

  const filteredRecipients = useMemo(() => {
    if (!activeFilter || activeFilter === 'Total' || activeFilter === 'Recipients' || activeFilter === 'Shipments') return allRecipientsWithFullData;
    
    const filterByAwbStatus = (status: string) => {
        const targetAwbIds = new Set(awbs.filter(awb => awb.expeditionStatus?.status === status).map(awb => awb.id));
        return allRecipientsWithFullData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
    };

    if (activeFilter === 'AwbEmis') return filterByAwbStatus("AWB Emis");
    if (activeFilter === 'AlocataRidicare') return filterByAwbStatus("Alocata pentru ridicare");
    if (activeFilter === 'IntrareSorter') return filterByAwbStatus("Intrare sorter");
    if (activeFilter === 'IesireHub') return filterByAwbStatus("Iesire din hub");
    if (activeFilter === 'IntrareAgentie') return filterByAwbStatus("Intrare in agentie");
    if (activeFilter === 'InLivrare') return filterByAwbStatus("In livrare la curier");
    if (activeFilter === 'RedirectionareHome') return filterByAwbStatus("Redirectionare Home Delivery");
    if (activeFilter === 'RedirectOOH') return filterByAwbStatus("Redirect Home to OOH");

    if (activeFilter === 'PVGenerated') return allRecipientsWithFullData.filter(r => r.pvStatus === 'Generated');
    if (activeFilter === 'PVQueued') return allRecipientsWithFullData.filter(r => r.pvStatus === 'Queued');
    if(activeFilter === 'PVNew') return allRecipientsWithFullData.filter(r => r.pvStatus !== 'Generated' && r.pvStatus !== 'Queued');
    if (activeFilter === 'Inventory') return allRecipientsWithFullData.filter(r => r.inventoryStatus === 'Generated');
    if (activeFilter === 'Instructions') return allRecipientsWithFullData.filter(r => r.instructionsStatus === 'Generated');

    if (activeFilter === 'DocsFailed') {
         return allRecipientsWithFullData.filter(r => 
            r.pvStatus === 'Failed' || r.inventoryStatus === 'Failed' || r.instructionsStatus === 'Failed'
        );
    }

    if (['AwbFailed', 'AwbNew', 'AwbQueued', 'AwbGenerated'].includes(activeFilter)) {
        const statusMap = { 'AwbFailed': 'Failed', 'AwbNew': 'New', 'AwbQueued': 'Queued', 'AwbGenerated': 'Generated' };
        const awbStatus = statusMap[activeFilter as keyof typeof statusMap];

        if (awbStatus === 'Generated') {
            const generatedAwbIds = new Set(awbs.filter(awb => !!awb.awb_data?.awbNumber).map(awb => awb.id));
            return allRecipientsWithFullData.filter(r => r.awbId && generatedAwbIds.has(r.awbId));
        }

        const targetAwbIds = new Set(awbs.filter(awb => awb.status === awbStatus).map(awb => awb.id));
        return allRecipientsWithFullData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
    }

    if (['EmailQueued', 'Sent', 'EmailFailed'].includes(activeFilter)) {
        const statusMap = { 'EmailQueued': 'Queued', 'Sent': 'Sent', 'EmailFailed': 'Failed' };
        const emailStatus = statusMap[activeFilter as keyof typeof statusMap];
        const targetAwbIds = new Set(awbs.filter(awb => awb.emailStatus === emailStatus).map(awb => awb.id));
        return allRecipientsWithFullData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
    }
    
    if (activeFilter === 'LogisticsReady' || activeFilter === 'LogisticsNotReady') {
        const recipientsByShipment = allRecipientsWithFullData.reduce((acc, recipient) => {
            if (!acc[recipient.shipmentId]) acc[recipient.shipmentId] = [];
            acc[recipient.shipmentId].push(recipient);
            return acc;
        }, {} as Record<string, typeof allRecipientsWithFullData>);
        const awbsByShipment = awbs.reduce((acc, awb) => {
            acc[awb.shipmentId] = awb;
            return acc;
        }, {} as Record<string, AWB>);
        const shipmentsWithEmailStatus = new Set(awbs.filter(a => a.emailStatus === 'Queued' || a.emailStatus === 'Sent').map(a => a.shipmentId));

        const targetShipmentIds = expeditions.filter(expedition => {
            if (shipmentsWithEmailStatus.has(expedition.id)) return false;
            
            const shipmentRecipients = recipientsByShipment[expedition.id] || [];
            const shipmentAwb = awbsByShipment[expedition.id];
            
            const allPvsGenerated = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.pvStatus === 'Generated');
            const allInstructionsSynced = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.instructionsStatus === 'Generated');
            const allInventoriesSynced = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.inventoryStatus === 'Generated');
            const awbIsGenerated = !!shipmentAwb?.awb_data?.awbNumber;
            
            const isReady = allPvsGenerated && allInstructionsSynced && allInventoriesSynced && awbIsGenerated;
            return activeFilter === 'LogisticsReady' ? isReady : !isReady;
        }).map(exp => exp.id);

        return allRecipientsWithFullData.filter(r => targetShipmentIds.includes(r.shipmentId));
    }


    if (activeFilter === 'Issues' || activeFilter === 'Avizat' || activeFilter === 'Ridicare ulterioara') {
        const issueExpeditionIds = expeditions.filter(e => ['Canceled', 'Lost or Damaged'].includes(e.status)).map(e => e.id);
        const issueRecipientIds = allRecipientsWithFullData.filter(r => r.pvStatus === 'Failed' || r.inventoryStatus === 'Failed' || r.instructionsStatus === 'Failed').map(r => r.id);
        const failedAwbIds = new Set(awbs.filter(awb => awb.status === 'Failed').map(awb => awb.id));
        const failedEmailAwbIds = new Set(awbs.filter(awb => awb.emailStatus === 'Failed').map(awb => awb.id));
        
        let issueRecipients = allRecipientsWithFullData.filter(r => 
            issueExpeditionIds.includes(r.expeditionId!) || 
            issueRecipientIds.includes(r.id) ||
            (r.awbId && failedAwbIds.has(r.awbId)) ||
            (r.awbId && failedEmailAwbIds.has(r.awbId))
        );

        if (activeFilter === 'Avizat') {
            const targetAwbIds = new Set(awbs.filter(awb => awb.expeditionStatus?.status === 'Avizat').map(awb => awb.id));
            return allRecipientsWithFullData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        }
        if (activeFilter === 'Ridicare ulterioara') {
            const targetAwbIds = new Set(awbs.filter(awb => awb.expeditionStatus?.status === 'Ridicare ulterioara').map(awb => awb.id));
            return allRecipientsWithFullData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        }
        // For general 'Issues' filter, we also include the new statuses
        const avizatAwbIds = new Set(awbs.filter(awb => awb.expeditionStatus?.status === 'Avizat').map(awb => awb.id));
        const ridicareAwbIds = new Set(awbs.filter(awb => awb.expeditionStatus?.status === 'Ridicare ulterioara').map(awb => awb.id));
        
        const additionalIssueRecipients = allRecipientsWithFullData.filter(r => r.awbId && (avizatAwbIds.has(r.awbId) || ridicareAwbIds.has(r.awbId)));

        return [...issueRecipients, ...additionalIssueRecipients];
    }

    if (activeFilter === 'Delivered') {
        const deliveredAwbIds = new Set(awbs.filter(awb => awb.expeditionStatus?.status === "Livrata cu succes").map(awb => awb.id));
        return allRecipientsWithFullData.filter(r => r.awbId && deliveredAwbIds.has(r.awbId));
    }


    if (['NewRecipient', 'Returned'].includes(activeFilter)) {
        const statusMap = { 'NewRecipient': 'New', 'Returned': 'Returned' };
        const recipientStatus = statusMap[activeFilter as keyof typeof statusMap];
        return allRecipientsWithFullData.filter(r => r.status === recipientStatus);
    }
    
    if (activeFilter === 'Completed') {
        return allRecipientsWithFullData.filter(r => r.pvStatus === 'Complet');
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

    

    
