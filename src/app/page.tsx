

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
import { RecipientRow } from "@/components/expedition-dashboard/types";

export type FilterStatus = ExpeditionStatus | 'Total' | 'Issues' | 'Completed' | 'Delivered' | 'DeliveredParcels' | 'PVGenerated' | 'PVQueued' | 'PVNew' | 'Inventory' | 'Instructions' | 'DocsFailed' | 'AwbFailed' | 'EmailFailed' | 'NewRecipient' | 'Returned' | 'Sent' | 'EmailQueued' | 'LogisticsNotReady' | 'LogisticsReady' | 'AwbNew' | 'AwbQueued' | 'AwbGenerated' | 'AwbRegenerated' | 'AwbNeedsUpdate' | 'Recipients' | 'Shipments' | 'Avizat' | 'Ridicare ulterioara' | 'AwbEmis' | 'AlocataRidicare' | 'RidicataClient' | 'IntrareSorter' | 'IesireHub' | 'IntrareInHUB' | 'IntrareAgentie' | 'IesireAgentie' | 'InLivrare' | 'RedirectionareHome' | 'RedirectOOH' | 'IncarcatInOOH' | 'Depozitare' | 'NotDelivered' | 'IntrareHub' | 'NotCompleted' | 'IntrareSorterAgentie' | 'Verified' | 'NotVerified' | 'Returns' | 'InTransit' | 'OriginalRecipients' | 'RegenRecipients' | 'OriginalShipments' | 'RegenShipments' | 'OriginalAwbs' | 'RegenAwbs' | null;

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('Total');
  const [pvFilter, setPvFilter] = useState<'all' | 'has_pv' | 'no_pv'>('all');
  const [emailFilter, setEmailFilter] = useState<'all' | 'sent' | 'not_sent'>('all');
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [awbs, setAwbs] = useState<AWB[]>([]);
  const [loading, setLoading] = useState(true);
  const [gdprMode, setGdprMode] = useState(false);

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

    // Find all regenerated shipments and map them to their original ID
    const regeneratedShipmentsMap = new Map<string, string>();
    expeditions.forEach(exp => {
        if (exp.originalShipmentId) {
            // In case of multiple regenerations, we might want to store an array
            // For now, we'll just store the latest one found.
            regeneratedShipmentsMap.set(exp.originalShipmentId, exp.id);
        }
    });

    return recipients.map(rec => {
        const expedition = expeditionsMap.get(rec.shipmentId!);
        const awb = awbsMap.get(rec.awbId);
        
        let awbStatus: DocumentStatus = 'Not Generated';
        if (awb?.status === 'Generated' || awb?.status === 'AWB_CREATED') {
            awbStatus = 'Generated';
        } else if (awb?.status === 'Failed') {
            awbStatus = 'Failed';
        }

        const recipientRow: RecipientRow = {
            ...rec,
            expeditionId: expedition?.id || rec.shipmentId,
            expeditionStatus: awb?.expeditionStatus,
            awb: awb,
            awbUrl: awb?.awb_data?.pdfLink,
            awbStatus: awbStatus,
            emailStatus: awb?.emailStatus,
            emailId: awb?.emailId,
            originalShipmentId: expedition?.originalShipmentId,
            regeneratedShipmentId: regeneratedShipmentsMap.get(rec.shipmentId),
        };
        return recipientRow;
    });
  }, [recipients, expeditions, awbs]);

  const scorecardCounts: ScorecardData = useMemo(() => {
    const awbNewCount = awbs.filter(e => e.status === 'New').length;
    const awbQueuedCount = awbs.filter(e => e.status === 'Queued').length;
    
    const emailQueuedCount = awbs.filter(e => e.emailStatus === 'Queued').length;
    const emailSentCount = awbs.filter(awb => awb.emailStatus === 'Sent').length;
    
    const awbsToBeUpdatedCount = awbs.filter(awb => awb.awb_data && !awb.expeditionStatus).length;
    
    const pvGeneratedCount = allRecipientsWithFullData.filter(r => !!r.pvUrl).length;
    const pvQueuedCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Queued').length;
    const pvNewCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Not Generated').length;
    const instructionsGeneratedCount = allRecipientsWithFullData.filter(r => r.instructionsStatus === 'Generated').length;
    const inventoryGeneratedCount = allRecipientsWithFullData.filter(r => r.inventoryStatus === 'Generated').length;
    
    const awbGeneratedCount = awbs.filter(awb => !!awb.awb_data?.awbNumber && !awb.originalShipmentId).length;
    const awbRegeneratedCount = awbs.filter(awb => !!awb.awb_data?.awbNumber && !!awb.originalShipmentId).length;
    
    const deliveredAwbs = awbs.filter(awb => awb.expeditionStatus?.status === "Livrata cu succes");
    const deliveredAwbIds = new Set(deliveredAwbs.map(awb => awb.id));

    const deliveredRecipients = allRecipientsWithFullData.filter(r => deliveredAwbIds.has(r.awbId));
    const deliveredParcelsCount = deliveredRecipients.length;

    const completedRecipients = deliveredRecipients.filter(r => !!r.pvSemnatUrl);
    const completedCount = completedRecipients.length;
    
    const notCompletedRecipients = deliveredRecipients.filter(r => !r.pvSemnatUrl);
    const notCompletedCount = notCompletedRecipients.length;
    
    const verifiedCount = allRecipientsWithFullData.filter(r => r.verified === true).length;
    const notVerifiedCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Complet' && r.verified !== true).length;
    
    const readyForLogisticsCount = awbs.filter(awb => 
        !!awb.awb_data?.awbNumber && 
        awb.emailStatus !== 'Queued' && 
        awb.emailStatus !== 'Sent'
    ).length;

    const finalStatuses = ["Livrata cu succes"];
    const returnStatuses = awbs.filter(awb => !!awb.expeditionStatus?.inReturn).map(awb => awb.expeditionStatus!.status);
    const excludedStatuses = new Set([...finalStatuses, ...returnStatuses, undefined, null]);

    const recipientsWithIssues = allRecipientsWithFullData.filter(r => r.issues);
    
    const recipientsInTransit = allRecipientsWithFullData.filter(r => {
        const status = r.awb?.expeditionStatus?.status;
        return !r.issues && status && !excludedStatuses.has(status);
    });

    const awbsInTransitByStatus = recipientsInTransit.reduce((acc, r) => {
        const status = r.awb?.expeditionStatus?.status;
        if (status) {
            if (!acc[status]) acc[status] = 0;
            acc[status]++;
        }
        return acc;
    }, {} as Record<string, number>);
    
    const dynamicInTransitCounts = Object.entries(awbsInTransitByStatus)
        .map(([status, recipientCount]) => ({
            label: status,
            value: recipientCount,
            color: 'yellow',
        }))
        .sort((a, b) => b.value - a.value);

    const totalRecipientsInTransit = recipientsInTransit.length;
    const totalAwbsInTransit = new Set(recipientsInTransit.map(r => r.awbId)).size;


    const issuesByAwbStatus = recipientsWithIssues.reduce((acc, r) => {
        const status = r.awb?.expeditionStatus?.status || 'Unknown';
        if (!acc[status]) acc[status] = 0;
        acc[status]++;
        return acc;
    }, {} as Record<string, number>);

    const dynamicIssueCounts = Object.entries(issuesByAwbStatus)
        .map(([status, recipientCount]) => ({
            label: status,
            value: recipientCount,
            color: 'red',
        }))
        .sort((a, b) => b.value - a.value);

    const totalRecipientsWithIssues = recipientsWithIssues.length;
    const totalAwbsWithIssues = new Set(recipientsWithIssues.map(r => r.awbId)).size;

    const originalExpeditions = expeditions.filter(e => !e.originalShipmentId);
    const regeneratedExpeditions = expeditions.filter(e => e.originalShipmentId);
    
    const originalExpeditionIds = new Set(originalExpeditions.map(e => e.id));
    const regeneratedExpeditionIds = new Set(regeneratedExpeditions.map(e => e.id));

    const originalRecipients = allRecipientsWithFullData.filter(r => originalExpeditionIds.has(r.shipmentId));
    const regeneratedRecipients = allRecipientsWithFullData.filter(r => regeneratedExpeditionIds.has(r.shipmentId!));
    
    const originalAwbs = awbs.filter(awb => originalExpeditionIds.has(awb.shipmentId));
    const regeneratedAwbs = awbs.filter(awb => regeneratedExpeditionIds.has(awb.shipmentId));

    return {
        overview: {
            kpis: [
                { value: originalRecipients.length, label: 'Orig. Recip.' },
                { value: regeneratedRecipients.length, label: 'Regen. Recip.' },
                { value: originalExpeditions.length, label: 'Orig. Ship.' },
                { value: regeneratedExpeditions.length, label: 'Regen. Ship.' },
            ]
        },
        documentStatus: {
             kpis: [
                { value: pvNewCount, label: 'PV New' },
                { value: pvQueuedCount, label: 'PV Queued' },
                { value: pvGeneratedCount, label: 'PV Generated' },
                { value: inventoryGeneratedCount, label: 'Inventory' },
                { value: instructionsGeneratedCount, label: 'Instructions' },
            ]
        },
        awbStatus: {
            kpis: [
                { value: awbNewCount, label: 'New' },
                { value: awbQueuedCount, label: 'Queued' },
                { value: awbGeneratedCount, label: 'Generated' },
                { value: awbRegeneratedCount, label: 'Regenerated' },
            ]
        },
        logisticsStatus: {
            kpis: [
                { value: readyForLogisticsCount, label: 'Ready' },
                { value: emailQueuedCount, label: 'Queued' },
                { value: emailSentCount, label: 'Sent' },
                { value: awbsToBeUpdatedCount, label: 'To be updated' },
            ]
        },
        inTransit: {
            value: totalAwbsInTransit,
            secondaryValue: totalRecipientsInTransit,
            kpis: dynamicInTransitCounts,
        },
        issues: {
            value: totalAwbsWithIssues,
            secondaryValue: totalRecipientsWithIssues,
            kpis: dynamicIssueCounts,
        },
        deliveredAndCompleted: {
            kpis: [
                { value: deliveredParcelsCount, label: 'Delivered Parcels' },
                { value: notCompletedCount, label: 'Not Completed' },
                { value: completedCount, label: 'Completed' },
                { value: notVerifiedCount, label: 'Not Verified'},
                { value: verifiedCount, label: 'Verified' },
            ],
        },
    }
  }, [allRecipientsWithFullData, expeditions, awbs]);

  const filteredRecipients = useMemo(() => {
    let filteredData = allRecipientsWithFullData;
    
    const originalExpeditionIds = new Set(expeditions.filter(e => !e.originalShipmentId).map(e => e.id));
    const regeneratedExpeditionIds = new Set(expeditions.filter(e => e.originalShipmentId).map(e => e.id));

    // Main scorecard filter
    if (activeFilter && activeFilter !== 'Total' && activeFilter !== 'Recipients' && activeFilter !== 'Shipments') {
        const filterByAwbStatus = (status: string) => {
            return filteredData.filter(r => r.awb?.expeditionStatus?.status === status);
        };

        const finalStatuses = ["Livrata cu succes"];
        const returnStatuses = awbs.filter(awb => !!awb.expeditionStatus?.inReturn).map(awb => awb.expeditionStatus!.status);
        const excludedStatuses = new Set([...finalStatuses, ...returnStatuses, undefined, null]);
        
        const allInTransitStatuses = Object.keys(allRecipientsWithFullData
            .filter(r => !r.issues) // Exclude issues from in-transit
            .reduce((acc, r) => {
                const status = r.awb?.expeditionStatus?.status;
                if (status && !excludedStatuses.has(status)) {
                    acc[status] = true;
                }
                return acc;
            }, {} as Record<string, boolean>));

        const allIssueStatuses = Object.keys(allRecipientsWithFullData
            .filter(r => r.issues)
            .reduce((acc, r) => {
                const status = r.awb?.expeditionStatus?.status || 'Unknown';
                acc[status] = true;
                return acc;
            }, {} as Record<string, boolean>));


        if (activeFilter === 'OriginalRecipients') {
            filteredData = filteredData.filter(r => originalExpeditionIds.has(r.shipmentId));
        } else if (activeFilter === 'RegenRecipients') {
            filteredData = filteredData.filter(r => regeneratedExpeditionIds.has(r.shipmentId));
        } else if (activeFilter === 'OriginalShipments') {
            const originalAwbIds = new Set(awbs.filter(awb => originalExpeditionIds.has(awb.shipmentId)).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && originalAwbIds.has(r.awbId));
        } else if (activeFilter === 'RegenShipments') {
            const regenAwbIds = new Set(awbs.filter(awb => regeneratedExpeditionIds.has(awb.shipmentId)).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && regenAwbIds.has(r.awbId));
        } else if (activeFilter === 'InTransit') {
            filteredData = filteredData.filter(r => !r.issues && r.awb?.expeditionStatus?.status && allInTransitStatuses.includes(r.awb.expeditionStatus.status));
        } else if (allInTransitStatuses.includes(activeFilter)) {
            filteredData = filteredData.filter(r => !r.issues && r.awb?.expeditionStatus?.status === activeFilter);
        } else if (activeFilter === 'Issues') {
            filteredData = filteredData.filter(r => r.issues);
        } else if (allIssueStatuses.includes(activeFilter)) {
            filteredData = filteredData.filter(r => r.issues && (r.awb?.expeditionStatus?.status || 'Unknown') === activeFilter);
        } else if (activeFilter === 'NotCompleted') {
            const deliveredAwbs = awbs.filter(awb => awb.expeditionStatus?.status === "Livrata cu succes");
            const deliveredAwbIds = new Set(deliveredAwbs.map(awb => awb.id));
            filteredData = allRecipientsWithFullData.filter(r => deliveredAwbIds.has(r.awbId) && !r.pvSemnatUrl);
        } else if (activeFilter === 'Verified') {
            filteredData = filteredData.filter(r => r.verified === true);
        } else if (activeFilter === 'NotVerified') {
            filteredData = filteredData.filter(r => r.pvStatus === 'Complet' && r.verified !== true);
        } else if (activeFilter === 'PVGenerated') {
            filteredData = filteredData.filter(r => !!r.pvUrl);
        } else if (activeFilter === 'PVQueued') {
            filteredData = filteredData.filter(r => r.pvStatus === 'Queued');
        } else if (activeFilter === 'PVNew') {
            filteredData = filteredData.filter(r => r.pvStatus === 'Not Generated');
        } else if (activeFilter === 'Inventory') {
            filteredData = filteredData.filter(r => r.inventoryStatus === 'Generated');
        } else if (activeFilter === 'Instructions') {
            filteredData = filteredData.filter(r => r.instructionsStatus === 'Generated');
        } else if (activeFilter === 'DocsFailed') {
            filteredData = filteredData.filter(r => r.pvStatus === 'Failed' || r.inventoryStatus === 'Failed' || r.instructionsStatus === 'Failed');
        } else if (['AwbFailed', 'AwbNew', 'AwbQueued'].includes(activeFilter)) {
            const statusMap = { 'AwbFailed': 'Failed', 'AwbNew': 'New', 'AwbQueued': 'Queued' };
            const awbStatus = statusMap[activeFilter as keyof typeof statusMap];
            const targetAwbIds = new Set(awbs.filter(awb => awb.status === awbStatus).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (activeFilter === 'AwbGenerated') {
            const targetAwbIds = new Set(awbs.filter(awb => !!awb.awb_data?.awbNumber && !awb.originalShipmentId).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (activeFilter === 'AwbRegenerated') {
            const targetAwbIds = new Set(awbs.filter(awb => !!awb.awb_data?.awbNumber && !!awb.originalShipmentId).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (activeFilter === 'AwbNeedsUpdate') {
            const targetAwbIds = new Set(awbs.filter(awb => awb.awb_data && !awb.expeditionStatus).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (['EmailQueued', 'Sent', 'EmailFailed'].includes(activeFilter)) {
            const statusMap = { 'EmailQueued': 'Queued', 'Sent': 'Sent', 'EmailFailed': 'Failed' };
            const emailStatus = statusMap[activeFilter as keyof typeof statusMap];
            const targetAwbIds = new Set(awbs.filter(awb => awb.emailStatus === emailStatus).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (activeFilter === 'LogisticsReady') {
             const targetAwbIds = new Set(awbs.filter(awb => 
                !!awb.awb_data?.awbNumber && 
                awb.emailStatus !== 'Queued' && 
                awb.emailStatus !== 'Sent'
            ).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (activeFilter === 'Delivered' || activeFilter === 'DeliveredParcels') {
            filteredData = filterByAwbStatus("Livrata cu succes");
        } else if (['NewRecipient', 'Returned'].includes(activeFilter)) {
            const statusMap = { 'NewRecipient': 'New', 'Returned': 'Returned' };
            const recipientStatus = statusMap[activeFilter as keyof typeof statusMap];
            filteredData = filteredData.filter(r => r.status === recipientStatus);
        } else if (activeFilter === 'Completed') {
            const deliveredAwbs = awbs.filter(awb => awb.expeditionStatus?.status === "Livrata cu succes");
            const deliveredAwbIds = new Set(deliveredAwbs.map(awb => awb.id));
            filteredData = allRecipientsWithFullData.filter(r => deliveredAwbIds.has(r.awbId) && !!r.pvSemnatUrl);
        } else {
            const expeditionFilteredIds = expeditions.filter(e => e.status === activeFilter).map(e => e.id);
            filteredData = filteredData.filter(r => expeditionFilteredIds.includes(r.expeditionId!));
        }
    }

    // Toolbar filters
    if (pvFilter === 'has_pv') {
        filteredData = filteredData.filter(r => r.pvUrl);
    } else if (pvFilter === 'no_pv') {
        filteredData = filteredData.filter(r => !r.pvUrl);
    }

    if (emailFilter === 'sent') {
        filteredData = filteredData.filter(r => r.emailStatus === 'Sent');
    } else if (emailFilter === 'not_sent') {
        filteredData = filteredData.filter(r => r.emailStatus !== 'Sent');
    }

    return filteredData;
  }, [activeFilter, pvFilter, emailFilter, allRecipientsWithFullData, expeditions, awbs]);

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
      <AppHeader gdprMode={gdprMode} onGdprModeChange={setGdprMode} />
      <main className="flex flex-1 flex-col p-4 md:p-6 gap-6">
        <ScorecardGrid
          counts={scorecardCounts}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
        <ExpeditionDashboard 
            initialData={filteredRecipients} 
            expeditions={expeditions}
            gdprMode={gdprMode}
            pvFilter={pvFilter}
            setPvFilter={setPvFilter}
            emailFilter={emailFilter}
            setEmailFilter={setEmailFilter}
        />
      </main>
    </div>
  );
}
